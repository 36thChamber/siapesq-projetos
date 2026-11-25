from remoto import *
import hashlib
h=Path.home();p=D/'manifesto-atual.json'; pairs=json.loads((D/'pares.json').read_bytes())
old=h/'projects/siapesq-integracao-frontend/config/cog-manifest.json'
raw_hash=hashlib.sha256(old.read_bytes()).hexdigest()
new_hash=hashlib.sha256(p.read_bytes()).hexdigest()
change=[[r['old'],r['new'] if r['keep_address'] else None] for r in pairs]
payload=literal(change).replace('\n','')
js="""const fs=require('fs'),zlib=require('zlib'),crypto=require('crypto');
const original='BASE',updated='NOVA',file='/app/config/cog-manifest.json';
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const buf=fs.readFileSync(file);
if(hash(buf)!==updated){
 if(hash(buf)!==original)throw Error('Versão de origem do catálogo divergente');
 const changes=new Map(JSON.parse(zlib.gunzipSync(Buffer.from('PAYLOAD','base64'))));
 const m=JSON.parse(buf), byKey=new Map(m.files.map(r=>[r.source_key,r]));
 const files=[];
 for(const entry of m.files){
  if(!changes.has(entry.source_key)){files.push(entry);continue}
  const canonical=changes.get(entry.source_key);
  if(canonical){const target=byKey.get(canonical);if(!target)throw Error('Destino ausente');files.push({...target,source_key:entry.source_key});}
 }
 const result=JSON.stringify({...m,files})+'\\n';
 if(hash(result)!==updated)throw Error('Integridade do catálogo divergente');
 const tmp=file+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,result,{flag:'wx'});fs.renameSync(tmp,file);
}
console.log('CATALOGO_ATUAL',hash(fs.readFileSync(file)));
""".replace('BASE',raw_hash).replace('NOVA',new_hash).replace('PAYLOAD',payload)
# Use short lines for transport over a terminal.
js=js.replace("'"+payload+"'","[\n"+",\n".join(repr(x) for x in textwrap.wrap(payload,180))+"\n].join('')")
(D/'atualizar-catalogo.cjs').write_text(js)
print(len(js),raw_hash,new_hash)
