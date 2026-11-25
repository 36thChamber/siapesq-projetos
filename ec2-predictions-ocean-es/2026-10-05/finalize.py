from pathlib import Path
import datetime,hashlib,json,time,traceback
import boto3
from botocore.exceptions import ClientError

BASE=Path(__file__).resolve().parent;CFG=json.loads((BASE/'config.json').read_text())
S3=boto3.client('s3',region_name=CFG['output_region']);EC2=boto3.client('ec2',region_name=CFG['region'])
def now():return datetime.datetime.now(datetime.timezone.utc)
def read(key):
    try:return json.loads(S3.get_object(Bucket=CFG['bucket'],Key=key)['Body'].read())
    except ClientError as e:
        if e.response['Error']['Code'] in ['NoSuchKey','404']:return None
        raise
def state():return EC2.describe_instances(InstanceIds=[CFG['instance_id']])['Reservations'][0]['Instances'][0]['State']['Name']
deadline=datetime.datetime.fromisoformat(CFG['budget_cutoff_utc'])
while True:
    try:
        summary=read(CFG['prefix']+'/_run/summary.json')
        records=[read(CFG['prefix']+'/_run/'+s['species']+'.json') for s in CFG['species']]
        machine=state()
        snapshot={'checked_utc':now().isoformat(),'instance_state':machine,'summary':summary,'records':records}
        (BASE/'progress.json').write_text(json.dumps(snapshot,indent=2))
        if now()>=deadline and machine in ['running','pending']:
            EC2.stop_instances(InstanceIds=[CFG['instance_id']])
            print('Budget cutoff: stop requested',flush=True)
        if machine=='stopped':break
    except Exception:print(traceback.format_exc(),flush=True)
    time.sleep(45)

audit={'verified_utc':now().isoformat(),'instance_state':'stopped','annual_only':True,'expected_species':4,'species':[]}
lines=['# Rodada marinha ES — relatório final','',
       'Uma predição anual 2015–2024 por espécie, com Python e R. Os 17 cenários marinhos ainda não estão implementados.',
       '', '| Espécie | Execução | QC marinho | AUC Python | TSS Python | AUC R | TSS R |',
       '|---|---|---|---|---|---|---|']
for item in CFG['species']:
    sp=item['species'];key=CFG['prefix']+'/'+sp+'/anual_2015_2024/complete.json'
    marker=read(key);status=read(CFG['prefix']+'/_run/'+sp+'.json')
    if not marker:
        audit['species'].append({'species':sp,'status':status or {'status':'not_started'},'verified_files':0})
        lines.append('| '+sp.replace('_',' ')+' | '+(status or {}).get('status','não iniciado')+' | — | — | — | — | — |')
        if status and status.get('error'):lines+=['',sp+':', '```',status['error'],'```']
        continue
    assert marker['status']=='complete' and marker['class_counts']['0']==marker['class_counts']['1']>0
    assert len(marker['files'])==7
    for f in marker['files']:
        obj=S3.get_object(Bucket=CFG['bucket'],Key=f['key']);digest=hashlib.sha256();size=0
        for chunk in obj['Body'].iter_chunks(1024*1024):digest.update(chunk);size+=len(chunk)
        assert size==f['bytes'] and digest.hexdigest()==f['sha256'],f['key']
    ev=marker['evaluation'];p=ev['python'];r=ev['R'];qc=ev['qc']
    audit['species'].append({'species':sp,'status':'complete','verified_files':7,'marker':marker})
    lines.append('| '+sp.replace('_',' ')+' | concluído e S3 verificado | '+str(qc.get('veredito'))+' | '+str(p.get('auc_teste'))+' | '+str(p.get('tss_max_teste'))+' | '+str(r.get('auc_teste'))+' | '+str(r.get('tss_max_teste'))+' |')
audit['completed_species']=sum(x['status']=='complete' for x in audit['species'])
audit['status']='complete' if audit['completed_species']==4 else 'partial'
sessions_path=BASE/'compute_sessions.json'
sessions=json.loads(sessions_path.read_text()) if sessions_path.exists() else [{'started_utc':CFG['started_utc']}]
elapsed=sum(((datetime.datetime.fromisoformat(session['ended_utc']) if session.get('ended_utc') else now())-datetime.datetime.fromisoformat(session['started_utc'])).total_seconds() for session in sessions)/3600
audit['compute_sessions']=sessions
audit['compute_cost_upper_estimate_usd']=min(elapsed,CFG['max_hours'])*CFG['hourly_usd']
lines+=['','Concluídas: '+str(audit['completed_species'])+'/4. EC2 desligada.',
        '',f"Estimativa superior de computação: US${audit['compute_cost_upper_estimate_usd']:.2f}; não é uma fatura e exclui armazenamento e transferência.",
        '', 'APTO/REVISAR se referem ao QC dos dados marinhos. AUC/TSS usam teste aleatório; não constituem validação espacial ou aprovação ecológica.',
        '', 'Os modelos usam dados diários e são projetados em médias anuais: esta projeção experimental não equivale à média das previsões diárias.',
        '', 'Resultados: s3://'+CFG['bucket']+'/'+CFG['prefix']+'/']
(BASE/'audit_final.json').write_text(json.dumps(audit,indent=2))
(BASE/'RELATORIO_FINAL.md').write_text('\n'.join(lines)+'\n')
for name in ['audit_final.json','RELATORIO_FINAL.md']:
    S3.upload_file(str(BASE/name),CFG['bucket'],CFG['prefix']+'/_run/'+name)
print('FINAL_REPORT',audit['status'],audit['completed_species'],flush=True)
