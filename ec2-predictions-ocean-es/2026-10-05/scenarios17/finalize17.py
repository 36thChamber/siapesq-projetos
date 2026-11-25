from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import boto3,datetime,hashlib,json,time,traceback
from botocore.exceptions import ClientError
BASE=Path(__file__).resolve().parent;C=json.loads((BASE/'config.json').read_text());S=boto3.client('s3',region_name=C['output_region']);E=boto3.client('ec2',region_name=C['region'])
def now():return datetime.datetime.now(datetime.timezone.utc)
def read(key):
    try:return json.loads(S.get_object(Bucket=C['bucket'],Key=C['prefix']+'/'+key)['Body'].read())
    except ClientError as e:
        if e.response['Error']['Code'] in ['NoSuchKey','404']:return None
        raise
deadline=datetime.datetime.fromisoformat(C['budget_cutoff_utc'])
while True:
    try:
        state=E.describe_instances(InstanceIds=[C['instance_id']])['Reservations'][0]['Instances'][0]['State']['Name']
        summary=read('_run/summary.json');records=[read('_run/'+s['species']+'.json') for s in C['species']]
        (BASE/'progress.json').write_text(json.dumps({'checked_utc':now().isoformat(),'instance_state':state,'summary':summary,'records':records},indent=2))
        if now()>=deadline and state in ['pending','running']:E.stop_instances(InstanceIds=[C['instance_id']])
        if state=='stopped':stopped=now();break
    except Exception:print(traceback.format_exc(),flush=True)
    time.sleep(45)

markers=[]
for page in S.get_paginator('list_objects_v2').paginate(Bucket=C['bucket'],Prefix=C['prefix']+'/'):
    for obj in page.get('Contents',[]):
        if obj['Key'].endswith('/complete.json'):markers.append(json.loads(S.get_object(Bucket=C['bucket'],Key=obj['Key'])['Body'].read()))
def verify(f):
    obj=S.get_object(Bucket=C['bucket'],Key=f['key']);digest=hashlib.sha256();size=0
    for chunk in obj['Body'].iter_chunks(1024*1024):digest.update(chunk);size+=len(chunk)
    assert size==f['bytes'] and digest.hexdigest()==f['sha256'],f['key']
    return f
files=[f for m in markers for f in m['files']]
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(verify,files))
counts={s['species']:sum(m['species'].replace(' ','_')==s['species'] for m in markers) for s in C['species']}
previous=json.loads((BASE.parent/'audit_final.json').read_text())['compute_cost_upper_estimate_usd']
cost=(stopped-datetime.datetime.fromisoformat(C['started_utc'])).total_seconds()/3600*C['hourly_usd']
audit={'status':'complete' if len(markers)==68 and all(v==17 for v in counts.values()) else 'partial','expected_scenarios':68,'verified_scenarios':len(markers),'verified_files':len(files),'verified_tiffs':sum(f['key'].endswith('.tif') for f in files),'species_counts':counts,'instance_state':'stopped','verified_utc':now().isoformat(),'new_compute_upper_usd':cost,'total_compute_upper_usd':cost+previous,'markers':markers}
(BASE/'audit_final.json').write_text(json.dumps(audit,indent=2))
report=['# 17 cenários marinhos ES','',f"Estado: {audit['status']}. Cenários: {len(markers)}/68. TIFFs verificados: {audit['verified_tiffs']}. EC2 desligada.",'','| Espécie | Cenários verificados |','|---|---|']
report += [f'| {sp.replace("_"," ")} | {n}/17 |' for sp,n in counts.items()]
report += ['',f'Computação estimada desta rodada: US${cost:.2f}; total com a rodada anual e sua correção: US${cost+previous:.2f}. Exclui armazenamento e transferência.',
           '', 'Fontes: CMEMS 2015–2024 e CMIP6 GFDL-ESM4 r1i1p1f1 gr v20180701; 2050=2041–2060, 2100=2081–2100. SST e salinidade por diferença, CHL por razão. Um GCM; não há ensemble climático.',
           '', 'Disp ersão entre árvores RF não é intervalo de confiança climático ou de modelos bootstrap. Máscara marinha e extrapolação não constituem aprovação ecológica. O modelo diário é projetado em agregados temporais.',
           '', 'Destino: s3://'+C['bucket']+'/'+C['prefix']+'/']
(BASE/'RELATORIO_FINAL.md').write_text('\n'.join(report).replace('Disp ersão','Dispersão')+'\n')
for name in ['audit_final.json','RELATORIO_FINAL.md']:S.upload_file(str(BASE/name),C['bucket'],C['prefix']+'/_run/'+name)
print('MARINE_17_FINAL',audit['status'],len(markers),audit['verified_tiffs'],flush=True)
