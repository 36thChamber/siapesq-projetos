import boto3,json,re,hashlib,base64,gzip,threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from collections import Counter,defaultdict
from botocore.config import Config
P=Path(__file__).parent;B='example-bucket';A='migration-backups/padronizacao-meses-2026-10-16/'
S=boto3.client('s3',region_name='sa-east-1',config=Config(max_pool_connections=40,retries={'max_attempts':5,'mode':'adaptive'}))
FULL=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
SHORT=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
PAT=re.compile(r'mensal_(\d{2})_([a-z]+)(?=_|\.|/|$)')
lock=threading.Lock()
def rename(text):
 def one(m):
  i=int(m[1])-1;assert 0<=i<12 and m[2] in (FULL[i],SHORT[i]),text
  return 'mensal_'+m[1]+'_'+FULL[i]
 return PAT.sub(one,text)
def sha(data):return hashlib.sha256(data).hexdigest()
def enc(hexdigest):return base64.b64encode(bytes.fromhex(hexdigest)).decode()
def dump(name,data): (P/name).write_text(json.dumps(data,ensure_ascii=False,indent=2,default=str))
def parallel(fn,items,label):
 out=[]
 with ThreadPoolExecutor(max_workers=24) as pool:
  for future in as_completed([pool.submit(fn,x) for x in items]):
   out.append(future.result())
   if len(out)%100==0:print(label,len(out),'/',len(items),flush=True)
 return out
def inventory():return [x for page in S.get_paginator('list_objects_v2').paginate(Bucket=B,Prefix='predicoes_cenarios/') for x in page.get('Contents',[])]
def check(key,n,digest):
 h=S.head_object(Bucket=B,Key=key,ChecksumMode='ENABLED')
 assert h['ContentLength']==n and h.get('ChecksumSHA256')==enc(digest),(key,'checksum mismatch')
 assert h.get('ChecksumType','FULL_OBJECT')=='FULL_OBJECT',key
 return h
def put(key,raw,content_type='application/json',match=None):
 opts={'IfMatch':match} if match else {'IfNoneMatch':'*'}
 S.put_object(Bucket=B,Key=key,Body=raw,ContentType=content_type,ChecksumSHA256=enc(sha(raw)),Metadata={'sha256':sha(raw)},**opts)
 check(key,len(raw),sha(raw))
def transform(value,field=''):
 if field=='consolidation':return value # Immutable references to archived originals remain truthful.
 if isinstance(value,list):return [transform(x,field) for x in value]
 if isinstance(value,dict):return {k:transform(v,k) for k,v in value.items()}
 if isinstance(value,str):
  if value.startswith(('migration-backups/','/home/','/tmp/')):return value
  if value.startswith('predicoes_cenarios/') and not value.startswith(('predicoes_cenarios/comuns-rs-es/','predicoes_cenarios/exclusivas-rs/','predicoes_cenarios/exclusivas-es-ocean/')):return value
  return rename(value)
 return value

objects=inventory();dump('inventory-before.json',objects);bykey={o['Key']:o for o in objects}
moves=[{'source':o['Key'],'destination':rename(o['Key']),'bytes':o['Size'],'etag':o['ETag']} for o in objects if rename(o['Key'])!=o['Key']]
assert len(moves)==336,len(moves)
assert all(x['destination'] not in bykey for x in moves),'Destination already exists; refusing overwrite'
assert len({x['destination'] for x in moves})==len(moves)
index_key='predicoes_cenarios/exclusivas-es-ocean/_run/consolidation.json'
jsonkeys=[x['source'] for x in moves if x['source'].endswith('.json')]+[index_key]
raws={};heads={};data={}
def load(key):
 h=S.head_object(Bucket=B,Key=key,ChecksumMode='ENABLED');r=S.get_object(Bucket=B,Key=key,IfMatch=h['ETag']);raw=r['Body'].read()
 assert h['ChecksumSHA256']==enc(sha(raw)),key
 return key,h,raw,json.loads(raw)
for key,h,raw,d in parallel(load,jsonkeys,'Read JSON'):
 heads[key]=h;raws[key]=raw;data[key]=d
# Convert auxiliary JSON first so complete.json references their new sizes and hashes.
payloads={k:json.dumps(transform(v),ensure_ascii=False,indent=2).encode() for k,v in data.items() if not k.endswith('/complete.json')}
for key,d in data.items():
 if not key.endswith('/complete.json'):continue
 new=transform(d)
 for f in new.get('files',[]):
  old=next((x['source'] for x in moves if x['destination']==f['key']),None)
  if old in payloads:f['bytes']=len(payloads[old]);f['sha256']=sha(payloads[old])
 new['monthly_name_normalization']={'date':'2026-10-16','previous_scenario':d.get('scenario'),'original_manifest_backup':A+'json-originais/'+key}
 payloads[key]=json.dumps(new,ensure_ascii=False,indent=2).encode()
# Add a current-path index while preserving the original source folders as lineage.
idx=json.loads(payloads[index_key]);idx['monthly_name_normalization']={'date':'2026-10-16','mapping':{f'mensal_{i+1:02d}_{s}':f'mensal_{i+1:02d}_{FULL[i]}' for i,s in enumerate(SHORT)}}
payloads[index_key]=json.dumps(idx,ensure_ascii=False,indent=2).encode()
plan={'bucket':B,'archive':A,'moves':moves,'json_backups':jsonkeys,'monthly_scenarios':48}
dump('plan.json',plan)
put(A+'plan.json.gz',gzip.compress((P/'plan.json').read_bytes(),mtime=0),'application/gzip')
def backup(key):
 raw=raws[key];put(A+'json-originais/'+key,raw);return key
parallel(backup,jsonkeys,'Backed up JSON')
print('Backups verified; moving 336 objects for 48 monthly scenarios.',flush=True)
def move(x):
 source=x['source'];dest=x['destination']
 if source in payloads:
  raw=payloads[source];put(dest,raw);digest=sha(raw);n=len(raw)
 else:
  h=S.head_object(Bucket=B,Key=source,ChecksumMode='ENABLED');assert h['ETag']==x['etag'],source
  digest=base64.b64decode(h['ChecksumSHA256']).hex();n=h['ContentLength'];assert n==x['bytes']
  S.copy_object(Bucket=B,Key=dest,CopySource={'Bucket':B,'Key':source},CopySourceIfMatch=x['etag'],ChecksumAlgorithm='SHA256',MetadataDirective='COPY')
  check(dest,n,digest)
 record={**x,'destination_bytes':n,'destination_sha256':digest}
 with lock:
  with (P/'journal.jsonl').open('a') as f:f.write(json.dumps(record)+'\n')
 return record
records=parallel(move,moves,'Verified destinations');dump('objects.json',records)
put(index_key,payloads[index_key],match=heads[index_key]['ETag'])
# Validate every new complete manifest against the current actual destinations.
def validate_marker(key):
 newkey=rename(key);r=S.get_object(Bucket=B,Key=newkey);d=json.loads(r['Body'].read());assert d['scenario']==newkey.split('/')[-2]
 for f in d['files']:check(f['key'],f['bytes'],f['sha256'])
 return newkey
parallel(validate_marker,[k for k in jsonkeys if k.endswith('/complete.json')],'Validated manifests')
put(A+'objects.json.gz',gzip.compress((P/'objects.json').read_bytes(),mtime=0),'application/gzip')
print('All destinations and manifests verified; removing abbreviated originals.',flush=True)
def remove(x):
 S.delete_object(Bucket=B,Key=x['source'],IfMatch=x['etag']);return x['source']
parallel(remove,moves,'Removed abbreviated keys')
final=inventory();dump('inventory-after.json',final)
assert not any(rename(x['Key'])!=x['Key'] for x in final),'Abbreviated active keys remain'
assert sum(x['Key'].endswith('.tif') for x in final)==1802
assert sum(x['Key'].endswith('/complete.json') for x in final)==578
assert sum('/mensal_' in x['Key'] and x['Key'].endswith('/complete.json') for x in final)==408
new={x['Key']:x for x in final};changed={x['source'] for x in moves}|{index_key}
for key,o in bykey.items():
 if key not in changed:assert key in new and new[key]['ETag']==o['ETag'] and new[key]['Size']==o['Size'],key
result={'status':'complete','renamed_objects':len(moves),'renamed_monthly_scenarios':48,'renamed_tiffs':sum(x['source'].endswith('.tif') for x in moves),'active_species':34,'active_scenarios':578,'active_monthly_scenarios':408,'active_tiffs':1802,'all_months':FULL,'archive':A,'unchanged_objects_verified':len(bykey)-len(changed)}
dump('complete.json',result);put(A+'complete.json',(P/'complete.json').read_bytes());print(json.dumps(result),flush=True)
