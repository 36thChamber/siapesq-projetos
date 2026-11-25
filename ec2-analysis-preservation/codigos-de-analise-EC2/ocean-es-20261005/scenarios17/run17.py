from pathlib import Path
import datetime,json,multiprocessing,os,subprocess,sys,traceback
from concurrent.futures import ProcessPoolExecutor,as_completed
import boto3
from botocore.exceptions import ClientError

BASE=Path(__file__).resolve().parent;CFG=json.loads((BASE/'config.json').read_text());REPO=BASE.parent/'repo'
sys.path.insert(0,str(REPO))
from marine_scenarios import MarineLayers,scenarios,sha,atomic_json
from run_predicoes_cenarios_ocean import find_model,run_scenario
S3=boto3.client('s3',region_name=CFG['output_region'])
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def put(key,value):S3.put_object(Bucket=CFG['bucket'],Key=CFG['prefix']+'/'+key,Body=json.dumps(value,indent=2).encode(),ContentType='application/json')
def upload(p,key):
    digest=sha(p)
    try:
        h=S3.head_object(Bucket=CFG['bucket'],Key=key)
        assert h['Metadata'].get('sha256')==digest and h['ContentLength']==p.stat().st_size,'S3 object conflict: '+key
    except ClientError as e:
        if e.response['Error']['Code'] not in ['NoSuchKey','404']:raise
        S3.upload_file(str(p),CFG['bucket'],key,ExtraArgs={'Metadata':{'sha256':digest}})
    h=S3.head_object(Bucket=CFG['bucket'],Key=key);assert h['ContentLength']==p.stat().st_size and h['Metadata']['sha256']==digest
    return {'key':key,'bytes':p.stat().st_size,'sha256':digest}
def layers():return MarineLayers(cache=BASE/'layers',cmems_cache=REPO/'dados_saida/pred_marinho_cache/2015-2024',bathymetry=REPO/'dados_entrada/ocean_depth.nc',catalog=BASE/'marine_cmip6_catalog.csv')
def species(item,available):
    global S3
    S3=boto3.client('s3',region_name=CFG['output_region'])
    sp=item['species'];directory=REPO/'07 Executado por espécie'/sp/'2026-10-05'/'modelo_rf_marinho';out=BASE/'outputs'/sp
    state={'species':sp,'perfil':item['perfil'],'status':'running','records':[],'started_utc':utc()};put('_run/'+sp+'.json',state)
    try:
        folder,model,evaluation=find_model(sp,directory)
        methodology=json.loads((folder.parent/'metodologia_perfil.json').read_text());assert methodology['perfil']==item['perfil']
        source=layers()
        for i,sc in enumerate(scenarios(),1):
            state['current_scenario']=sc.name;put('_run/'+sp+'.json',state);print(utc(),sp,f'{i}/17',sc.name,flush=True)
            try:
                if sc.name not in available:raise ValueError('Scenario layers unavailable: '+sc.name)
                result=run_scenario(sp.replace('_',' '),model,evaluation,sc,source,out,'ambos',jobs=4)
                local=json.loads((out/sc.name/'complete.json').read_text());key=CFG['prefix']+'/'+sp+'/'+sc.name+'/'
                published=[upload(out/sc.name/f['name'],key+f['name']) for f in local['files']]
                marker={**local,'files':published,'finished_utc':utc(),'training_methodology':methodology,'code_manifest_sha256':CFG['code_manifest_sha256']}
                put(sp+'/'+sc.name+'/complete.json',marker);state['records'].append(result)
            except Exception:state['records'].append({'scenario':sc.name,'status':'failed','error':traceback.format_exc()});print(state['records'][-1],flush=True)
            atomic_json(out/'summary.json',state);put('_run/'+sp+'.json',state)
        state['status']='complete' if len(state['records'])==17 and all(r['status']=='complete' for r in state['records']) else 'finished_with_failures'
    except Exception:state.update(status='failed',error=traceback.format_exc())
    state['finished_utc']=utc();put('_run/'+sp+'.json',state);return state

def main():
    summary={'status':'preparing_layers','started_utc':utc(),'expected_scenarios':68,'annual_monthly_future':True,'records':[]}
    atomic_json(BASE/'summary.json',summary);put('_run/summary.json',summary)
    prepared=[];failures=[];source=layers()
    for sc in scenarios():
        summary['current_layer_scenario']=sc.name;put('_run/summary.json',summary)
        try:
            path,metadata=source.build(sc);prepared.append(sc.name)
            print(utc(),'LAYERS_READY',sc.name,flush=True)
        except Exception:
            failures.append({'scenario':sc.name,'error':traceback.format_exc()});print(failures[-1],flush=True)
    atomic_json(BASE/'layers_preparation.json',{'available':prepared,'failures':failures});put('_run/layers_preparation.json',{'available':prepared,'failures':failures})
    summary.update(status='running',prepared_scenarios=len(prepared),layer_failures=failures)
    atomic_json(BASE/'summary.json',summary);put('_run/summary.json',summary)
    with ProcessPoolExecutor(max_workers=2,mp_context=multiprocessing.get_context('spawn')) as pool:
        for f in as_completed([pool.submit(species,s,prepared) for s in CFG['species']]):
            try:summary['records'].append(f.result())
            except Exception:summary['records'].append({'status':'failed','error':traceback.format_exc()})
            summary['completed_scenarios']=sum(sum(r['status']=='complete' for r in s.get('records',[])) for s in summary['records'])
            atomic_json(BASE/'summary.json',summary);put('_run/summary.json',summary)
    summary.update(status='complete' if len(summary['records'])==4 and all(s['status']=='complete' for s in summary['records']) else 'finished_with_failures',finished_utc=utc())
    atomic_json(BASE/'summary.json',summary);put('_run/summary.json',summary)
    log=BASE/'run.log'
    if log.exists():S3.upload_file(str(log),CFG['bucket'],CFG['prefix']+'/_run/run.log')

if __name__=='__main__':main()
