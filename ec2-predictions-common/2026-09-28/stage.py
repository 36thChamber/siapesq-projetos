from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import json,hashlib,boto3
from boto3.s3.transfer import TransferConfig
BASE=Path(__file__).resolve().parent
c=json.loads((BASE/'config.json').read_text())
out=boto3.client('s3',region_name=c['output_region']);stage=boto3.client('s3',region_name=c['region'])
transfer=TransferConfig(multipart_threshold=8*1024*1024,multipart_chunksize=8*1024*1024,max_concurrency=4)
def upload_file(path,key):
    digest=hashlib.file_digest(path.open('rb'),'sha256').hexdigest()
    try:
        head=out.head_object(Bucket=c['bucket'],Key=key)
        if head['ContentLength']==path.stat().st_size and head.get('Metadata',{}).get('sha256')==digest:
            return {'key':key,'bytes':path.stat().st_size,'sha256':digest}
        raise RuntimeError('Conflicting existing output: '+key)
    except out.exceptions.ClientError as e:
        if e.response['Error']['Code'] not in ['404','NoSuchKey','NotFound']:raise
    out.upload_file(str(path),c['bucket'],key,ExtraArgs={'Metadata':{'sha256':digest},'ContentType':'image/tiff' if path.suffix=='.tif' else 'application/json'},Config=transfer)
    head=out.head_object(Bucket=c['bucket'],Key=key)
    assert head['ContentLength']==path.stat().st_size and head['Metadata']['sha256']==digest
    return {'key':key,'bytes':path.stat().st_size,'sha256':digest}
def reuse(item):
    d=Path(item['source']);sp=item['species'];scenario=item['scenario'];prefix=f'{sp}_{scenario}'
    files=[]
    for suffix in ['adequabilidade.tif','incerteza.tif','extrapolacao.tif','extrapolacao.json','coerencia.json']:
        path=d/f'{prefix}_{suffix}'
        if suffix=='coerencia.json' and not path.exists():path=d/'coerencia.json'
        if not path.exists():raise RuntimeError('Missing reusable artifact '+str(path))
        files.append(upload_file(path,f"{c['prefix']}/{sp}/{scenario}/{prefix}_{suffix}"))
    quality=json.loads((d/f'{prefix}_coerencia.json' if (d/f'{prefix}_coerencia.json').exists() else d/'coerencia.json').read_text())
    model=next(m for m in c['species'] if m['species']==sp)
    marker={'species':sp,'scenario':scenario,'status':'complete','reused_local':True,'coherence':quality,'model_sha256':next(f['sha256'] for f in model['files'] if f['name'].endswith('.sdm')),'files':files}
    out.put_object(Bucket=c['bucket'],Key=f"{c['prefix']}/{sp}/{scenario}/complete.json",Body=json.dumps(marker).encode(),ContentType='application/json')
    print('Reusable scenario uploaded and checked:',sp,scenario,flush=True)
print('Uploading inputs before starting EC2.',flush=True)
stage.upload_file(str(BASE/'inputs.tar.gz'),c['staging_bucket'],'inputs.tar.gz',Config=TransferConfig(max_concurrency=16,multipart_chunksize=8*1024*1024))
stage.upload_file(str(BASE/'payload.tar.gz'),c['staging_bucket'],'payload.tar.gz')
items=json.loads((BASE/'reuse.json').read_text())
with ThreadPoolExecutor(max_workers=4) as pool:
    for f in as_completed([pool.submit(reuse,item) for item in items]):f.result()
(BASE/'STAGING_READY').write_text('Inputs and reusable predictions uploaded and verified.\n')
print('STAGING_READY',flush=True)
