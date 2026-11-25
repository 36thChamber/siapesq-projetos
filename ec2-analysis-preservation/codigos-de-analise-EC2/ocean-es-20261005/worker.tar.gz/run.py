from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import datetime, json, os, subprocess, sys, time, traceback, hashlib
import boto3
import numpy as np
import pandas as pd
import rasterio

BASE=Path(__file__).resolve().parent; REPO=BASE/'repo'
CFG=json.loads((BASE/'config.json').read_text())
S3=boto3.client('s3',region_name=CFG['output_region'])
ENV={**os.environ,'OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','MKL_NUM_THREADS':'1','MPLBACKEND':'Agg','PYTHONUNBUFFERED':'1'}
sys.path.insert(0,str(REPO));import naming
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def json_out(key,value):S3.put_object(Bucket=CFG['bucket'],Key=key,Body=json.dumps(value,indent=2).encode(),ContentType='application/json')
def status(sp,value):
    (BASE/'status').mkdir(exist_ok=True)
    (BASE/'status'/f'{sp}.json').write_text(json.dumps(value,indent=2))
    json_out(CFG['prefix']+'/_run/'+sp+'.json',value)
def upload(p,key):
    digest=sha(p)
    S3.upload_file(str(p),CFG['bucket'],key,ExtraArgs={'Metadata':{'sha256':digest}})
    h=S3.head_object(Bucket=CFG['bucket'],Key=key)
    assert h['ContentLength']==p.stat().st_size and h.get('Metadata',{}).get('sha256')==digest
    return {'key':key,'bytes':p.stat().st_size,'sha256':digest}
def variables(dest):
    files=[p for p in dest.rglob('Variables_*.csv') if 'marinho' in p.parent.name]
    assert files,'Marine variables CSV missing'
    return max(files,key=lambda p:p.stat().st_mtime)
def validate_stage(stage,dest,sp):
    if stage in ('occ','pseudo'):assert naming.achar('occurrence' if stage=='occ' else 'pseudoabsence',dest)
    if stage=='captura':variables(dest)
    if stage=='qc':
        q=list(dest.rglob('QCVeredito_*.json'));assert q
        d=json.loads(max(q,key=lambda p:p.stat().st_mtime).read_text());assert d['veredito'] in ['APTO','REVISAR']
    if stage in ('modelo','predicao'):
        model=dest/'modelo_rf_marinho';m=json.loads((model/f'rf_{sp}_marinho_eval.json').read_text())
        assert m['balanceamento']['proporcao']=='1:1' and m['seed']==CFG['seed']
        assert m['n_presencas']==m['n_pseudo']>0
        for k in ['classes_treino','classes_teste']:assert m[k]['0']==m[k]['1']>0
        split=pd.read_csv(model/f'rf_{sp}_marinho_dados_split.csv')
        for part in ['treino','teste']:
            g=split[split['split']==part];assert (g.sp==0).sum()==(g.sp==1).sum()>0
        assert (model/f'rf_{sp}_marinho_R.rds').is_file()
        assert (model/f'rf_{sp}_marinho_R_eval.json').is_file()

def run_species(item):
    sp=item['species'];dest=REPO/'07 Executado por espécie'/sp/CFG['round_name']
    dest.mkdir(parents=True,exist_ok=True);(BASE/'logs').mkdir(exist_ok=True)
    logpath=BASE/'logs'/f'{sp}.log'
    stages=['qc','modelo','predicao'] if item.get('reuse_variables') else ['occ','pseudo','captura','qc','modelo','predicao']
    state={'species':sp,'perfil':item['perfil'],'status':'running','started_utc':utc(),'stages_completed':[]}
    status(sp,state)
    try:
        with logpath.open('a',buffering=1) as log:
            for stage in stages:
                checkpoint=dest/f'.stage_{stage}.json'
                if checkpoint.exists():
                    saved=json.loads(checkpoint.read_text());assert saved['code_manifest_sha256']==CFG['code_manifest_sha256']
                    validate_stage(stage,dest,sp)
                else:
                    state['stage']=stage;status(sp,state);print(utc(),sp,stage,'starting',flush=True)
                    cmd=[sys.executable,str(REPO/'run_pipeline_ocean.py'),'--especie',sp.replace('_',' '),
                         '--perfil',item['perfil'],'--ratio','1.0','--seed',str(CFG['seed']),
                         '--engine','ambos','--outdir',str(dest),'--start',stage,'--stop',stage,
                         '--max_workers',str(CFG['download_workers_each']),
                         '--data_dir',str(BASE/'daily_cache'/sp),'--janela',CFG['window']]
                    if stage=='occ':cmd+=['--occ_csv',str(BASE/'inputs'/item['occurrence_file'])]
                    state['command']=cmd;status(sp,state)
                    subprocess.run(cmd,cwd=REPO,env=ENV,stdout=log,stderr=subprocess.STDOUT,check=True)
                    validate_stage(stage,dest,sp)
                    checkpoint.write_text(json.dumps({'code_manifest_sha256':CFG['code_manifest_sha256'],'finished_utc':utc()}))
                state['stages_completed'].append(stage);status(sp,state)
        model=dest/'modelo_rf_marinho';prefix=f"{CFG['prefix']}/{sp}/anual_{CFG['window'].replace('-','_')}/"
        files=[]
        for filename in [f'pred_{sp}_media{CFG["window"]}_adequabilidade.tif',
                         f'pred_{sp}_media{CFG["window"]}_adequabilidade_R.tif',
                         f'pred_{sp}_media{CFG["window"]}_resumo.json',
                         f'rf_{sp}_marinho_eval.json',f'rf_{sp}_marinho_R_eval.json',
                         f'comparacao_py_r_{sp}.json']:
            p=model/filename;assert p.is_file()
            if p.suffix=='.tif':
                total=0
                with rasterio.open(p) as raster:
                    assert raster.crs and raster.count==1
                    for _,win in raster.block_windows(1):
                        values=raster.read(1,window=win,masked=True).compressed()
                        assert np.isfinite(values).all()
                        if len(values):assert values.min()>=0 and values.max()<=1
                        total+=len(values)
                assert total>0
            files.append(upload(p,prefix+filename))
        q=max(dest.rglob('QCVeredito_*.json'),key=lambda p:p.stat().st_mtime)
        files.append(upload(q,prefix+'qc_marinho.json'))
        meta=json.loads((dest/'metodologia_perfil.json').read_text())
        assert meta['perfil']==item['perfil'] and meta['pipeline']=='run_pipeline_ocean.py'
        assert meta['parametros']['ratio']==1 and meta['parametros']['num_absences']==0
        py=json.loads((model/f'rf_{sp}_marinho_eval.json').read_text());r=json.loads((model/f'rf_{sp}_marinho_R_eval.json').read_text())
        marker={'status':'complete','species':sp,'scenario':'anual_2015_2024','finished_utc':utc(),
                'methodology':meta,'code_manifest_sha256':CFG['code_manifest_sha256'],
                'source':item,'class_counts':{'0':py['n_pseudo'],'1':py['n_presencas']},
                'model_hashes':{'python':sha(model/f'rf_{sp}_marinho.joblib'),'R':sha(model/f'rf_{sp}_marinho_R.rds')},
                'evaluation':{'python':py,'R':r,'qc':json.loads(q.read_text())},'files':files}
        json_out(prefix+'complete.json',marker)
        state.update(status='complete',finished_utc=utc(),evaluation={'python_auc':py['auc_teste'],'python_tss':py['tss_max_teste'],'R_auc':r['auc_teste'],'R_tss':r['tss_max_teste']})
    except Exception:
        state.update(status='failed',finished_utc=utc(),error=traceback.format_exc())
        with logpath.open('a') as log:log.write(state['error'])
    status(sp,state)
    if logpath.exists():upload(logpath,CFG['prefix']+'/_run/'+sp+'.log')
    print(utc(),sp,state['status'],flush=True)
    return state

started=utc();summary={'status':'running','started_utc':started,'expected_species':4,'records':[],'annual_only':True}
(BASE/'summary.json').write_text(json.dumps(summary,indent=2));json_out(CFG['prefix']+'/_run/summary.json',summary)
with ThreadPoolExecutor(max_workers=CFG['parallel_species']) as pool:
    for future in as_completed([pool.submit(run_species,s) for s in CFG['species']]):
        try:summary['records'].append(future.result())
        except Exception:summary['records'].append({'status':'failed','error':traceback.format_exc()})
        (BASE/'summary.json').write_text(json.dumps(summary,indent=2));json_out(CFG['prefix']+'/_run/summary.json',summary)
summary.update(status='complete' if len(summary['records'])==4 and all(r['status']=='complete' for r in summary['records']) else 'finished_with_failures',finished_utc=utc())
(BASE/'summary.json').write_text(json.dumps(summary,indent=2));json_out(CFG['prefix']+'/_run/summary.json',summary)
print(summary['status'],flush=True)
