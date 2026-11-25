"""Read-only completion audit and local reporting; never starts or extends EC2."""
from pathlib import Path
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import datetime, json, os, subprocess, sys, time
import boto3

BASE = Path(__file__).resolve().parent
CFG = json.loads((BASE / 'config.json').read_text())
S3 = boto3.client('s3', region_name=CFG['output_region'])
EC2 = boto3.client('ec2', region_name=CFG['region'])
ENV = {**os.environ, 'WATCH_CONTINUE_ON_ITEM_FAILURE': '1'}

def instance_state():
    return EC2.describe_instances(InstanceIds=[CFG['instance_id']])['Reservations'][0]['Instances'][0]['State']['Name']

cutoff = datetime.datetime.fromisoformat(CFG['budget_cutoff_utc']) + datetime.timedelta(minutes=10)
while True:
    rc = subprocess.run([sys.executable, '-u', str(BASE / 'watch_completion.py')], env=ENV).returncode
    if rc == 0:
        subprocess.run([sys.executable, str(BASE / 'report_final.py')], check=True)
        print('COMPLETE: final audited report written', flush=True)
        break
    state = instance_state()
    if state in ('stopped', 'terminated') or datetime.datetime.now(datetime.timezone.utc) >= cutoff:
        keys = [x['Key'] for p in S3.get_paginator('list_objects_v2').paginate(Bucket=CFG['bucket'], Prefix=CFG['prefix']+'/')
                for x in p.get('Contents', []) if x['Key'].endswith('/complete.json')]
        def verify(key):
            marker = json.loads(S3.get_object(Bucket=CFG['bucket'],Key=key)['Body'].read())
            assert marker['status']=='complete' and len(marker['files'])==5
            train=marker['methodology']
            assert train['class_counts']['0']==train['class_counts']['1']>0
            assert train['code_manifest_sha256'] in CFG['accepted_code_manifest_sha256']
            assert train['prediction_driver_sha256']==CFG['prediction_driver_sha256']
            assert marker['model_sha256']==train['model_sha256']
            assert train['perfil']==next(x['perfil'] for x in CFG['species'] if x['species']==marker['species'])
            assert marker['scenario'] in CFG['scenarios']
            assert key==f"{CFG['prefix']}/{marker['species']}/{marker['scenario']}/complete.json"
            for item in marker['files']:
                head=S3.head_object(Bucket=CFG['bucket'],Key=item['key'])
                assert head['ContentLength']==item['bytes']>0 and head.get('Metadata',{}).get('sha256')==item['sha256']
            return marker
        with ThreadPoolExecutor(max_workers=8) as pool:
            markers=list(pool.map(verify,keys))
        counts=Counter(m['species'] for m in markers)
        audit={'status':'incomplete','checked_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'instance_state':state,'markers_verified':len(markers),'expected':102,
               'by_species':{x['species']:counts[x['species']] for x in CFG['species']},'markers':markers}
        (BASE/'auditoria_parcial.json').write_text(json.dumps(audit,indent=2))
        lines=['# Rodada incompleta', '',
               'As quatro exclusivas de RS terminaram: 68/68 cenários, com auditoria própria.',
               f"Das seis comuns, foram verificados {len(markers)}/102 cenários. Estado da EC2: {state}.",
               'O limite absoluto de oito horas foi preservado. Nenhuma ampliação de gasto ou nova instância foi iniciada.', '']
        lines += [f"- {sp.replace('_',' ')}: {n}/17" for sp,n in audit['by_species'].items()]
        lines += ['', 'Resultados já concluídos e caches foram preservados. Consulte summary_attention.json, early_errors.json e finalization.log para distinguir falha de execução e limite de tempo.',
                  f"Resultados: s3://{CFG['bucket']}/{CFG['prefix']}/"]
        (BASE/'RELATORIO_PARCIAL.md').write_text('\n'.join(lines)+'\n')
        print('INCOMPLETE: partial audited report written',flush=True)
        break
    print('Monitor retry; EC2 state:',state,flush=True)
    time.sleep(45)
