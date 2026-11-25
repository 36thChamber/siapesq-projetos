import boto3, hashlib, json
from pathlib import Path
from botocore.config import Config
plan=json.loads(Path('/mnt/a/apis-insetos-17/2026-11-10/publicacao_ste_2026-11-11/plan.json').read_text())
item=next(x for x in plan['objects'] if x['key'].endswith('Apis_mellifera_futuro_2100_ssp245_adequabilidade.tif'))
s3=boto3.client('s3',region_name='sa-east-1')
r=s3.get_object(Bucket=plan['bucket'],Key=item['key'])
print(json.dumps({k:r.get(k) for k in ('ContentLength','ContentType','ChecksumType','ChecksumSHA256')}),flush=True)
h=hashlib.sha256(); n=0
try:
    for block in r['Body'].iter_chunks(chunk_size=1024*1024):
        h.update(block); n+=len(block)
    print(json.dumps({'bytes':n,'sha256':h.hexdigest(),'expected_sha256':item['sha256'],'match':h.hexdigest()==item['sha256']}),flush=True)
except Exception as e:
    print(json.dumps({'error_type':type(e).__name__,'error':str(e),'bytes_received':n,'expected_bytes':item['bytes']}),flush=True)
    raise
