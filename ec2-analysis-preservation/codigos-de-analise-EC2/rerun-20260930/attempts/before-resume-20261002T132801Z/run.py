from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import datetime,json,os,subprocess,hashlib,time,traceback,sys
import boto3
from boto3.s3.transfer import TransferConfig
from prediction_state import inspect_scenario,prepare_existing,validate_tif

BASE=Path(__file__).resolve().parent
REPO=BASE/'repo'
sys.path.insert(0,str(REPO))
from balanceamento import validar_csv_treino
from perfil import carregar_perfil

CFG=json.loads((BASE/'config.json').read_text())
CLIENT=boto3.client('s3',region_name=CFG['output_region'])
TRANSFER=TransferConfig(max_concurrency=2,multipart_chunksize=8*1024*1024)
ENV={**os.environ,'PREDICT_CORES':str(CFG['workers_each']),'OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','MKL_NUM_THREADS':'1','GDAL_NUM_THREADS':'1','MPLBACKEND':'Agg','PYTHONUNBUFFERED':'1'}
(BASE/'logs').mkdir(exist_ok=True)
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def key(sp,scenario,name):return f"{CFG['prefix']}/{sp}/{scenario}/{name}"
def put_json(k,data):CLIENT.put_object(Bucket=CFG['bucket'],Key=k,Body=json.dumps(data,indent=2).encode(),ContentType='application/json')
def digest(path):
    with path.open('rb') as source:return hashlib.file_digest(source,'sha256').hexdigest()
def contains(k):
    listed=CLIENT.list_objects_v2(Bucket=CFG['bucket'],Prefix=k,MaxKeys=1).get('Contents',[])
    return any(x['Key']==k for x in listed)
def existing(sp,scenario,model_hash):
    marker=key(sp,scenario,'complete.json')
    if not contains(marker):return None
    data=json.loads(CLIENT.get_object(Bucket=CFG['bucket'],Key=marker)['Body'].read())
    if data['model_sha256']!=model_hash:raise RuntimeError('Existing result has a different model hash')
    for f in data['files']:
        head=CLIENT.head_object(Bucket=CFG['bucket'],Key=f['key'])
        if head['ContentLength']!=f['bytes'] or head.get('Metadata',{}).get('sha256')!=f['sha256']:
            raise RuntimeError('Existing S3 output failed verification '+f['key'])
    return data
def upload(path,k):
    sha=digest(path)
    if contains(k):
        head=CLIENT.head_object(Bucket=CFG['bucket'],Key=k)
        if head['ContentLength']==path.stat().st_size and head.get('Metadata',{}).get('sha256')==sha:
            return {'key':k,'bytes':path.stat().st_size,'sha256':sha}
        raise RuntimeError('Conflicting existing output '+k)
    CLIENT.upload_file(str(path),CFG['bucket'],k,ExtraArgs={'Metadata':{'sha256':sha},'ContentType':'image/tiff' if path.suffix=='.tif' else 'application/json'},Config=TRANSFER)
    head=CLIENT.head_object(Bucket=CFG['bucket'],Key=k)
    if head['ContentLength']!=path.stat().st_size or head['Metadata']['sha256']!=sha:raise RuntimeError('Upload verification failed')
    return {'key':k,'bytes':path.stat().st_size,'sha256':sha}
def training(model,log):
    sp=model['species'];profile=model['perfil'];dest=BASE/'rounds'/sp/'2026-09-30-perfil-1x1'
    model_dir=dest/'modelo_rf_climatologico';model_file=model_dir/f'rf_{sp}_clima.sdm';state=dest/'trained.json'
    if state.exists():
        data=json.loads(state.read_text())
        if (data['code_manifest_sha256']!=CFG['code_manifest_sha256'] or data['perfil']!=profile
            or data['model_sha256']!=digest(model_file)):
            raise RuntimeError('Existing trained checkpoint has different code/profile/model; preserve it for review')
    else:
        cmd=[sys.executable,str(REPO/'run_pipeline.py'),'--especie',sp.replace('_',' '),'--perfil',profile,
             '--outdir',str(dest),'--stop','modelagem','--seed',str(CFG['seed']),'--n_reps',str(CFG['n_reps'])]
        put_json(f"{CFG['prefix']}/_run/{sp}_training.json",{'status':'training','started_utc':utc(),'command':cmd,'source_negative':model['source_negative']})
        print(utc(),sp,'training with profile',profile,'and 1:1',flush=True)
        subprocess.run(cmd,cwd=REPO,env=ENV,stdout=log,stderr=subprocess.STDOUT,check=True)
        if not model_file.is_file():raise RuntimeError('Training returned without model')
        data={'status':'trained','species':sp,'perfil':profile,'seed':CFG['seed'],'n_reps':CFG['n_reps'],
              'source_negative':model['source_negative'],'model_sha256':digest(model_file),
              'code_manifest_sha256':CFG['code_manifest_sha256'],'finished_utc':utc()}
    extras=['t2m_amp','e_amp','tp_amp','ndvi_amp'] if carregar_perfil(profile).get('flags',{}).get('com_amplitudes') else []
    csv=model_dir/'predictor_climatologico.csv';preds=validar_csv_treino(csv,extras)
    import pandas as pd
    d=pd.read_csv(csv);data['class_counts']={str(v):int((d['sp']==v).sum()) for v in [0,1]};data['predictors']=preds
    for scenario in CFG['scenarios']:
        missing=[p for p in preds if not (REPO/'predict variables'/scenario/(p+'.tif')).is_file()]
        if missing:raise RuntimeError('Scenario missing predictors: '+scenario+' '+str(missing))
    state.write_text(json.dumps(data,indent=2));put_json(f"{CFG['prefix']}/_run/{sp}_training.json",data)
    return model_dir,data
def run_species(model):
    sp=model['species'];log_path=BASE/'logs'/f'{sp}.log';results=[]
    with log_path.open('a',buffering=1) as log:
        try:model_dir,trained=training(model,log)
        except Exception:
            failure={'species':sp,'stage':'training','status':'failed','error':traceback.format_exc(),'finished_utc':utc()}
            print(failure['error'],file=log);put_json(f"{CFG['prefix']}/_run/{sp}_training.json",failure)
            CLIENT.upload_file(str(log_path),CFG['bucket'],f"{CFG['prefix']}/_run/{sp}.log")
            return [failure]
        model_hash=trained['model_sha256']
        for scenario in CFG['scenarios']:
            started=time.monotonic();report={'species':sp,'scenario':scenario,'started_utc':utc()}
            print(utc(),sp,scenario,'starting',flush=True)
            try:
                previous=existing(sp,scenario,model_hash)
                if previous:report.update(status='reused_new_run',coherence=previous['coherence']['veredito'])
                else:
                    destination=BASE/'results'/sp/scenario;destination.mkdir(parents=True,exist_ok=True)
                    prefix=f'{sp}_{scenario}';mean=destination/f'{prefix}_adequabilidade.tif';sd=destination/f'{prefix}_incerteza.tif'
                    state=inspect_scenario(sp,scenario,BASE/'results'/sp,model_dir)
                    prepare_existing([state],BASE/'results'/sp,'retomar',False,lambda x:print(x,file=log))
                    layer_dir=REPO/'predict variables'/scenario
                    subprocess.run(['Rscript',str(BASE/'predict.R'),str(model_dir),f'rf_{sp}_clima',str(layer_dir),str(mean),str(sd)],env=ENV,stdout=log,stderr=subprocess.STDOUT,check=True)
                    subprocess.run([sys.executable,str(REPO/'04_modeling/mapa_extrapolacao.py'),'--cenario',str(layer_dir),'--treino',str(model_dir/'predictor_climatologico.csv'),'--outdir',str(destination),'--prefixo',prefix+'_'],env=ENV,stdout=log,stderr=subprocess.STDOUT,check=True)
                    qa=destination/f'{prefix}_coerencia.json'
                    qc=subprocess.run([sys.executable,str(REPO/'04_modeling/teste_coerencia_ecologica.py'),'--mapa',str(mean),'--treino',str(model_dir/'predictor_climatologico.csv'),'--json',str(qa)],env=ENV,stdout=log,stderr=subprocess.STDOUT)
                    if qc.returncode not in (0,3):raise RuntimeError('Coherence evaluation failed to execute')
                    quality=json.loads(qa.read_text());files=[]
                    for suffix in ['adequabilidade.tif','incerteza.tif','extrapolacao.tif','extrapolacao.json','coerencia.json']:
                        path=destination/f'{prefix}_{suffix}'
                        if path.suffix=='.tif':
                            error=validate_tif(path)
                            if error:raise RuntimeError(error)
                        files.append(upload(path,key(sp,scenario,path.name)))
                    put_json(key(sp,scenario,'complete.json'),{'species':sp,'scenario':scenario,'status':'complete','model_sha256':model_hash,'methodology':trained,'files':files,'coherence':quality,'finished_utc':utc()})
                    report.update(status='generated_and_uploaded',coherence=quality['veredito'])
            except Exception:
                report.update(status='failed',error=traceback.format_exc());print(report['error'],file=log)
            report.update(seconds=time.monotonic()-started,finished_utc=utc());results.append(report)
            (BASE/'logs'/f'{sp}_status.json').write_text(json.dumps(results,indent=2))
            put_json(f"{CFG['prefix']}/_run/{sp}.json",results)
            print(utc(),sp,scenario,report['status'],flush=True)
    CLIENT.upload_file(str(log_path),CFG['bucket'],f"{CFG['prefix']}/_run/{sp}.log")
    return results

selection=json.loads((BASE/'selection.json').read_text())
eligible={r['species'] for r in selection if r['total']==17 and r['negative']>=9}
assert {m['species'] for m in CFG['species']}==eligible
assert len(CFG['scenarios'])==17
started=utc();reports=[]
put_json(f"{CFG['prefix']}/_run/summary.json",{'status':'running','started_utc':started,'expected_scenarios':len(CFG['species'])*17,'records':[],'failures':0})
put_json(f"{CFG['prefix']}/_run/run.json",{'status':'running','started_utc':started,'instance':CFG['instance_id'],'hourly_usd':CFG['hourly_usd'],'species':len(CFG['species']),'scenarios_per_species':17,'parallel_species':CFG['parallel_species'],'workers_each':CFG['workers_each'],'max_hours':CFG['max_hours'],'rule':'REPROVADO >=9 of 17','selection':[{k:v for k,v in r.items() if k!='scenarios'} for r in selection]})
with ThreadPoolExecutor(max_workers=CFG['parallel_species']) as pool:
    for future in as_completed([pool.submit(run_species,m) for m in CFG['species']]):
        try:reports.extend(future.result())
        except Exception:reports.append({'status':'failed','error':traceback.format_exc()})
failures=[r for r in reports if r['status']=='failed']
expected=len(CFG['species'])*17
summary={'status':'complete' if len(reports)==expected and not failures else 'finished_with_failures','started_utc':started,'finished_utc':utc(),'expected_scenarios':expected,'records':reports,'failures':len(failures)}
(BASE/'summary.json').write_text(json.dumps(summary,indent=2));put_json(f"{CFG['prefix']}/_run/summary.json",summary)
print(summary['status'],'records',len(reports),'failures',len(failures),flush=True)
