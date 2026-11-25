from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import datetime,json,os,subprocess,hashlib,time,threading,traceback
import boto3
from boto3.s3.transfer import TransferConfig
from drive_download import download
from prediction_state import inspect_scenario,prepare_existing,validate_tif

BASE=Path(__file__).resolve().parent
CFG=json.loads((BASE/'config.json').read_text())
CLIENT=boto3.client('s3',region_name=CFG['output_region'])
TRANSFER=TransferConfig(max_concurrency=2,multipart_chunksize=8*1024*1024)
ENV={**os.environ,'PREDICT_CORES':str(CFG['workers_each']),'OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','MKL_NUM_THREADS':'1','GDAL_NUM_THREADS':'1'}
(BASE/'logs').mkdir(exist_ok=True)
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def key(sp,scenario,name):return f"{CFG['prefix']}/{sp}/{scenario}/{name}"
def put_json(k,data):CLIENT.put_object(Bucket=CFG['bucket'],Key=k,Body=json.dumps(data,indent=2).encode(),ContentType='application/json')
def digest(path):
    with path.open('rb') as source:return hashlib.file_digest(source,'sha256').hexdigest()
def existing(sp,scenario,model_hash):
    marker=key(sp,scenario,'complete.json')
    listed=CLIENT.list_objects_v2(Bucket=CFG['bucket'],Prefix=marker,MaxKeys=1).get('Contents',[])
    if not any(x['Key']==marker for x in listed):return None
    try:
        data=json.loads(CLIENT.get_object(Bucket=CFG['bucket'],Key=key(sp,scenario,'complete.json'))['Body'].read())
    except CLIENT.exceptions.ClientError as e:
        if e.response['Error']['Code'] in ['NoSuchKey','404','NotFound']:return None
        raise
    if data['model_sha256']!=model_hash:raise RuntimeError('Existing prediction has a different model hash')
    for f in data['files']:
        head=CLIENT.head_object(Bucket=CFG['bucket'],Key=f['key'])
        if head['ContentLength']!=f['bytes'] or head.get('Metadata',{}).get('sha256')!=f['sha256']:
            raise RuntimeError('Existing S3 prediction failed metadata verification: '+f['key'])
    return data
def upload(path,k):
    sha=digest(path)
    listed=CLIENT.list_objects_v2(Bucket=CFG['bucket'],Prefix=k,MaxKeys=1).get('Contents',[])
    if any(x['Key']==k for x in listed):
        head=CLIENT.head_object(Bucket=CFG['bucket'],Key=k)
        if head['ContentLength']==path.stat().st_size and head.get('Metadata',{}).get('sha256')==sha:
            return {'key':k,'bytes':path.stat().st_size,'sha256':sha}
        raise RuntimeError('Conflicting published output: '+k)
    CLIENT.upload_file(str(path),CFG['bucket'],k,ExtraArgs={'Metadata':{'sha256':sha},'ContentType':'image/tiff' if path.suffix=='.tif' else 'application/json'},Config=TRANSFER)
    head=CLIENT.head_object(Bucket=CFG['bucket'],Key=k)
    if head['ContentLength']!=path.stat().st_size or head['Metadata']['sha256']!=sha:raise RuntimeError('Upload verification failed')
    return {'key':k,'bytes':path.stat().st_size,'sha256':sha}
def run_species(model):
    sp=model['species'];log_path=BASE/'logs'/f'{sp}.log';model_dir=BASE/'models'/sp
    model_hash=next(f['sha256'] for f in model['files'] if f['name'].endswith('.sdm'))
    results=[];downloaded=False
    with log_path.open('a',buffering=1) as log:
        for scenario in CFG['scenarios']:
            started=time.monotonic();report={'species':sp,'scenario':scenario,'started_utc':utc()}
            print(utc(),sp,scenario,'starting',flush=True)
            try:
                previous=existing(sp,scenario,model_hash)
                if previous:
                    report.update(status='reused',coherence=previous['coherence']['veredito'])
                else:
                    if not downloaded:
                        for meta in model['files']:
                            name='predictor_climatologico.csv' if meta['name'].endswith('.csv') else f'rf_{sp}_clima.sdm'
                            path=model_dir/name
                            # Reuse the benchmark model if the exact bytes match.
                            old=Path('/workspace/benchmark/models')/sp/name
                            if not path.exists() and old.exists() and old.stat().st_size==meta['size'] and digest(old)==meta['sha256']:
                                path.parent.mkdir(parents=True,exist_ok=True);os.link(old,path)
                            download(meta,path)
                            if digest(path)!=meta['sha256']:raise RuntimeError('Model/input checksum differs from the verified local source')
                        downloaded=True
                    destination=BASE/'results'/sp/scenario;destination.mkdir(parents=True,exist_ok=True)
                    prefix=f'{sp}_{scenario}';mean=destination/f'{prefix}_adequabilidade.tif';sd=destination/f'{prefix}_incerteza.tif'
                    state=inspect_scenario(sp,scenario,BASE/'results'/sp,model_dir)
                    prepare_existing([state],BASE/'results'/sp,'retomar',False,lambda x:print(x,file=log))
                    subprocess.run(['Rscript',str(BASE/'predict.R'),str(model_dir),f'rf_{sp}_clima',str(BASE/'scenarios'/scenario),str(mean),str(sd)],env=ENV,stdout=log,stderr=subprocess.STDOUT,check=True)
                    subprocess.run(['python3',str(BASE/'mapa_extrapolacao.py'),'--cenario',str(BASE/'scenarios'/scenario),'--treino',str(model_dir/'predictor_climatologico.csv'),'--outdir',str(destination),'--prefixo',prefix+'_'],env=ENV,stdout=log,stderr=subprocess.STDOUT,check=True)
                    qa=destination/f'{prefix}_coerencia.json'
                    qc=subprocess.run(['python3',str(BASE/'teste_coerencia_ecologica.py'),'--mapa',str(mean),'--treino',str(model_dir/'predictor_climatologico.csv'),'--json',str(qa)],env=ENV,stdout=log,stderr=subprocess.STDOUT)
                    if qc.returncode not in (0,3):raise RuntimeError('Coherence test failed to execute')
                    quality=json.loads(qa.read_text());files=[]
                    for suffix in ['adequabilidade.tif','incerteza.tif','extrapolacao.tif','extrapolacao.json','coerencia.json']:
                        path=destination/f'{prefix}_{suffix}'
                        if path.suffix=='.tif':
                            error=validate_tif(path)
                            if error:raise RuntimeError(error)
                        files.append(upload(path,key(sp,scenario,path.name)))
                    put_json(key(sp,scenario,'complete.json'),{'species':sp,'scenario':scenario,'status':'complete','model_sha256':model_hash,'files':files,'coherence':quality,'finished_utc':utc()})
                    report.update(status='generated_and_uploaded',coherence=quality['veredito'])
            except Exception:
                report.update(status='failed',error=traceback.format_exc())
                print(report['error'],file=log)
            report.update(seconds=time.monotonic()-started,finished_utc=utc());results.append(report)
            (BASE/'logs'/f'{sp}_status.json').write_text(json.dumps(results,indent=2))
            put_json(f"{CFG['prefix']}/_run/{sp}.json",results)
            print(utc(),sp,scenario,report['status'],flush=True)
    CLIENT.upload_file(str(log_path),CFG['bucket'],f"{CFG['prefix']}/_run/{sp}.log")
    return results
started=utc();reports=[]
put_json(f"{CFG['prefix']}/_run/run.json",{'status':'running','started_utc':started,'instance':CFG['instance_id'],'hourly_usd':CFG['hourly_usd'],'species':len(CFG['species']),'scenarios_per_species':17,'parallel_species':CFG['parallel_species'],'workers_each':CFG['workers_each'],'max_hours':CFG['max_hours']})
with ThreadPoolExecutor(max_workers=CFG['parallel_species']) as pool:
    for future in as_completed([pool.submit(run_species,m) for m in CFG['species']]):
        try:reports.extend(future.result())
        except Exception:reports.append({'status':'failed','error':traceback.format_exc()})
failures=[r for r in reports if r['status']=='failed']
summary={'status':'complete' if len(reports)==442 and not failures else 'finished_with_failures','started_utc':started,'finished_utc':utc(),'records':reports,'failures':len(failures)}
(BASE/'summary.json').write_text(json.dumps(summary,indent=2))
put_json(f"{CFG['prefix']}/_run/summary.json",summary)
print(summary['status'],'records',len(reports),'failures',len(failures),flush=True)
