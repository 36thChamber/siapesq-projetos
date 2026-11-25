import boto3,json,re,hashlib,csv,io,datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from botocore.exceptions import ClientError
P=Path(__file__).parent; B='example-bucket';s=boto3.client('s3',region_name='sa-east-1')
objects=[x for page in s.get_paginator('list_objects_v2').paginate(Bucket=B) for x in page.get('Contents',[])]
keys={x['Key'] for x in objects}; folders={x['Key'].rsplit('/',1)[0] for x in objects if x['Key'].endswith('.tif') and x['Key'].startswith(('predictions/','predicoes_cenarios/'))}
alias={'caraya':'caraya','guariba':'guariba','nigritus':'nigritus','aranha':'aranha','primatas_grupo':'aranha'}
plan=[]; missing=[]
for folder in sorted(folders):
 parts=folder.split('/')
 if parts[0]=='predictions' and parts[1] in alias:
  source='species-table/'+alias[parts[1]]+'.csv'
 else:
  species=parts[2] if parts[0]=='predicoes_cenarios' else {'araucaria':'Araucaria_angustifolia'}.get(parts[1],parts[1])
  matches=[]
  for key in keys:
   m=re.fullmatch(r'species-table/Occurrence_'+re.escape(species)+r'_(\d{2})_(\d{2})_(\d{2})(?: \(\d+\))?\.csv',key,re.I)
   if m:matches.append((datetime.datetime.strptime('_'.join(m.groups()),'%d_%m_%y'),not bool(re.search(r' \(\d+\)',key)),key))
  if not matches:missing.append({'folder':folder,'species':species});continue
  source=max(matches)[2]
 assert source in keys,source
 plan.append({'source':source,'destination':folder+'/'+source.rsplit('/',1)[1]})
(P/'plan.json').write_text(json.dumps({'copies':plan,'missing':missing},indent=2))
assert not missing,missing
sources={}
for key in sorted({x['source'] for x in plan}):
 data=s.get_object(Bucket=B,Key=key)['Body'].read();reader=csv.reader(io.StringIO(data.decode('utf-8-sig')));header=next(reader);assert next(reader,None) is not None,key
 sources[key]={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'header':header}
print(f'Plan: {len(plan)} copies; {len(sources)} source CSVs; {len(folders)} TIFF folders',flush=True)
(P/'sources.json').write_text(json.dumps(sources,indent=2))
def run(x):
 expected=sources[x['source']];dest=x['destination']
 try:head=s.head_object(Bucket=B,Key=dest)
 except ClientError as e:
  if e.response['Error']['Code'] not in ['404','NoSuchKey','NotFound']:raise
  head=None
 if head is None:
  sourcehead=s.head_object(Bucket=B,Key=x['source'])
  s.copy_object(Bucket=B,Key=dest,CopySource={'Bucket':B,'Key':x['source']},CopySourceIfMatch=sourcehead['ETag'],MetadataDirective='REPLACE',ContentType='text/csv',Metadata={'sha256':expected['sha256'],'source_key':x['source'],**({'source_drive_id':sourcehead['Metadata']['source_drive_id']} if 'source_drive_id' in sourcehead.get('Metadata',{}) else {})})
 response=s.get_object(Bucket=B,Key=dest);h=hashlib.sha256();size=0
 for chunk in response['Body'].iter_chunks(chunk_size=1024*1024):h.update(chunk);size+=len(chunk)
 assert size==expected['bytes'] and h.hexdigest()==expected['sha256'],dest
 assert response['ContentType'].startswith('text/csv'),dest
 return {**x,'bytes':size,'sha256':h.hexdigest(),'status':'verified','created':head is None}
results=[]
with ThreadPoolExecutor(max_workers=8) as pool:
 futures=[pool.submit(run,x) for x in plan]
 for future in as_completed(futures):
  r=future.result();results.append(r)
  with (P/'journal.jsonl').open('a') as f:f.write(json.dumps(r)+'\n')
  if len(results)%100==0:print(f'Verified {len(results)}/{len(plan)}',flush=True)
assert len(results)==len(plan)
(P/'complete.json').write_text(json.dumps({'bucket':B,'copies':len(results),'source_csvs':len(sources),'folders':len(folders),'verified':True,'objects':results},indent=2))
print('COMPLETE',len(results),'copies verified via full SHA256 readback',flush=True)
