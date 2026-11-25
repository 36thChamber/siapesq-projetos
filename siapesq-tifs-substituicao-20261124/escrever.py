from remoto import *
import sys
mode=sys.argv[1]
assert mode in ('substituir','remover')
pairs=json.loads((D/'pares.json').read_bytes())
assert (D/'verificado-antes.txt').is_file()
if mode=='remover':
 assert (D/'verificado-copiado.txt').is_file() and (D/'manifestos-verificados.txt').is_file()
rows=[(r['old'],r['new'],*r['etags'][:2]) for r in pairs if r['keep_address']] if mode=='substituir' else [(k,r['new_cog'],e,r['etags'][3]) for r in pairs for k,e in [(r['old_cog'],r['etags'][2])]+([] if r['keep_address'] else [(r['old'],r['etags'][0])])]
assert len(rows)==(102 if mode=='substituir' else 174)
common=r'''set -eu
bucket=http://127.0.0.1:9000/siapesq-cog-vps
api(){ curl -sS --max-time 90 --aws-sigv4 'aws:amz:us-east-1:s3' --config - "$@" <<CRED
user = "$MINIO_ROOT_USER:$MINIO_ROOT_PASSWORD"
CRED
}
v=$(api --fail "$bucket?versioning")
case "$v" in *'<Status>'*) echo 'Versionamento requer tratamento específico'; exit 4;; *'</VersioningConfiguration>'*) :;; *) exit 5;; esac
tmp=$(mktemp); hdr=$(mktemp)
trap 'unlink "$tmp"; unlink "$hdr"' EXIT
gettag(){
 tag=''; sha=''
 code=$(api -I -o "$hdr" -w '%{http_code}' "$bucket/$1")
 while IFS= read -r line; do
  line=${line%$'\r'}
  case "$line" in
   ETag:*|Etag:*) tag=${line#* \"}; tag=${tag%\"};;
   x-amz-meta-sha256:*) sha=${line#* };;
  esac
 done < "$hdr"
}
while IFS=' ' read -r old new expected current; do
 gettag "$new"; test "$code" = 200 && test "$tag" = "$current" && test "${#sha}" = 64 || exit 10
 goodsha=$sha
 gettag "$old"
'''
write=r''' if [ "$code" = 200 ] && [ "$tag" = "$current" ] && [ "$sha" = "$goodsha" ]; then continue; fi
 test "$code" = 200 && test "$tag" = "$expected" || exit 11
 api --fail -o "$tmp" -H "If-Match: \"$current\"" "$bucket/$new"
 read -r digest rest < <(sha256sum "$tmp"); test "$digest" = "$goodsha" || exit 12
 read -r digest rest < <(md5sum "$tmp"); test "$digest" = "$current" || exit 13
 api --fail -o /dev/null -T "$tmp" -H "If-Match: \"$expected\"" -H "Content-Type: image/tiff" -H "x-amz-content-sha256: $goodsha" -H "x-amz-meta-sha256: $goodsha" -H "x-amz-meta-content-md5: $current" -H "x-amz-meta-origin-etag: $current" "$bucket/$old"
 gettag "$old"; test "$code" = 200 && test "$tag" = "$current" && test "$sha" = "$goodsha" || exit 14
'''
delete=r''' if [ "$code" = 404 ]; then continue; fi
 test "$code" = 200 && test "$tag" = "$expected" || exit 21
 code=$(api --fail -o /dev/null -w '%{http_code}' -X DELETE -H "If-Match: \"$expected\"" "$bucket/$old"); test "$code" = 204 || exit 22
 gettag "$old"; test "$code" = 404 || exit 23
'''
for i in range(0,len(rows),12):
 subset=rows[i:i+12];batch=common+(write if mode=='substituir' else delete)+"done <<'ARQUIVOS'\n"+'\n'.join(' '.join(x) for x in subset)+"\nARQUIVOS\necho LOTE_CONFIRMADO\n"
 out=run('minio-minio-n0msvo',batch)
 assert 'LOTE_CONFIRMADO' in out
 print(mode,i+len(subset),'/',len(rows),flush=True)
