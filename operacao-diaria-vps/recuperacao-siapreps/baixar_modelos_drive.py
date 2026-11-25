from buscar_drive import base,s,v3
import json,hashlib,time
files=json.loads((base/'drive-modelagem-arquivos.json').read_text())
folder=base/'drive-modelagem'
proof=[]
for group, entries in files.items():
    dest=folder/group/'modelo_rf_marinho'
    dest.mkdir(exist_ok=True,parents=True)
    for f in entries:
        u=v3+'/files/'+f['id'];path=dest/f['name']
        def get(params):
            for delay in (1,2,4,8,15,30,45,60):
                r=s.get(u,params=params,timeout=70)
                if r.ok:return r
                if r.status_code not in (403,429,500,502,503):r.raise_for_status()
                time.sleep(delay)
            r.raise_for_status()
        meta=get({'fields':'size,md5Checksum,sha256Checksum,name'}).json()
        assert meta['name']==path.name and meta['size']==f['size']
        buf=get({'alt':'media'}).content
        h=hashlib.sha256(buf).hexdigest()
        assert len(buf)==int(meta['size']) and h==meta['sha256Checksum']
        tmp=path.with_suffix('.part');tmp.write_bytes(buf);tmp.replace(path)
        proof.append({**f,'species_id':group,'sha256':h})
    print(group,'conferido',flush=True)
(folder/'origem.json').write_text(json.dumps(proof,indent=2))
