#!/usr/bin/env python3
"""Run 17 genuine marine scenarios from an existing balanced Python/R RF model."""
from __future__ import annotations
import argparse,json,os,shutil,subprocess,sys,time,uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import joblib,numpy as np,pandas as pd,rasterio
from rasterio.transform import from_origin
import xarray as xr
from marine_scenarios import MarineLayers,scenarios,sha,atomic_json,PREDICTORS,ROOT
from perfil import selecionar_perfil,carregar_perfil
from prediction_state import ScenarioState,prepare_existing
import naming

def forest_moments(forest,X,jobs=4):
    if list(forest.classes_)!=[0,1]:raise ValueError('Modelo deve ter classes 0/1')
    total=np.zeros(len(X),dtype=np.float64);second=np.zeros(len(X),dtype=np.float64)
    def predict(tree):return tree.predict_proba(X)[:,1]
    with ThreadPoolExecutor(max_workers=jobs) as pool:
        for values in pool.map(predict,forest.estimators_):total+=values;second+=values*values
    mean=total/len(forest.estimators_)
    return mean,np.sqrt(np.maximum(0,second/len(forest.estimators_)-mean*mean))

def write_tif(path,values,lat,lon):
    path=Path(path);tmp=path.with_name(path.stem+'.partial.tif')
    array=np.asarray(values,dtype=np.float32)
    if lat[0]<lat[-1]:array=array[::-1]
    dx=float(lon[1]-lon[0]);dy=float(abs(lat[1]-lat[0]))
    with rasterio.open(tmp,'w',driver='GTiff',height=len(lat),width=len(lon),count=1,dtype='float32',crs='EPSG:4326',nodata=np.nan,
                       transform=from_origin(float(min(lon)-dx/2),float(max(lat)+dy/2),dx,dy),compress='deflate',predictor=3,tiled=True,blockxsize=256,blockysize=256) as r:r.write(array,1)
    validate_map(tmp);os.replace(tmp,path)

def validate_map(path):
    total=0
    with rasterio.open(path) as r:
        if r.count!=1 or not r.crs or r.nodata is None:raise ValueError(f'TIFF sem CRS/NoData: {path}')
        for _,w in r.block_windows(1):
            values=r.read(1,window=w,masked=True).compressed()
            if not np.isfinite(values).all() or (len(values) and (values.min()<0 or values.max()>1)):raise ValueError(f'TIFF com valores inválidos: {path}')
            total+=len(values)
    if not total:raise ValueError(f'TIFF sem células válidas: {path}')
    return total

def find_model(species,explicit=None):
    slug=naming.slug_especie(species)
    if explicit:folder=Path(explicit)
    else:
        candidates=list((ROOT/'07 Executado por espécie'/slug).rglob(f'rf_{slug}_marinho.joblib'))
        if not candidates:raise ValueError(f'Modelo marinho inexistente para {species}; rode run_pipeline_ocean.py primeiro')
        folder=max(candidates,key=lambda p:p.stat().st_mtime).parent
    model=folder/f'rf_{slug}_marinho.joblib';evaluation=folder/f'rf_{slug}_marinho_eval.json'
    d=json.loads(evaluation.read_text())
    if d.get('balanceamento',{}).get('proporcao')!='1:1' or d.get('n_presencas')!=d.get('n_pseudo') or not d.get('n_presencas'):raise ValueError('Modelo sem treino comprovado em 1:1')
    for split in ['classes_treino','classes_teste']:
        if d.get(split,{}).get('0')!=d.get(split,{}).get('1') or not d.get(split,{}).get('0'):raise ValueError('Split do modelo sem classes em 1:1')
    return folder,model,d

def state_for(slug,scenario,outdir):
    folder=outdir/scenario.name;prefix=f'{slug}_{scenario.name}'
    files=[p for p in folder.glob(prefix+'*') if p.is_file()]+[folder/'complete.json']
    files=[p for p in files if p.exists()];corrupt={}
    for p in files:
        if p.suffix=='.tif':
            try:validate_map(p)
            except Exception as e:corrupt[p]=str(e)
    return ScenarioState(scenario.name,folder/(prefix+'_adequabilidade.tif'),folder/(prefix+'_incerteza.tif'),files,corrupt,0)

def complete_marker(folder,signature):
    path=folder/'complete.json'
    if not path.exists():return False
    d=json.loads(path.read_text())
    if d.get('signature')!=signature:raise ValueError(f'Cenário existente tem outro modelo/camadas/configuração: {folder}; use overwrite explicitamente')
    for f in d['files']:
        p=folder/f['name']
        if not p.is_file() or p.stat().st_size!=f['bytes'] or sha(p)!=f['sha256']:return False
        if p.suffix=='.tif':validate_map(p)
    return d

def run_scenario(species,model,evaluation,scenario,layers,outdir,engine='ambos',rscript='Rscript',jobs=4,existing='retomar'):
    slug=naming.slug_especie(species);folder=outdir/scenario.name;folder.mkdir(parents=True,exist_ok=True)
    input_path,provenance=layers.build(scenario)
    rmodel=model.with_name(model.stem+'_R.rds')
    signature={'schema':1,'model_sha256':sha(model),'layers_sha256':sha(input_path),'engine':engine,'R_model_sha256':sha(rmodel) if engine in ['r','ambos'] else None,
               'uncertainty':'standard deviation of RF tree probabilities; not a bootstrap-model or climate confidence interval'}
    if existing!='overwrite' and complete_marker(folder,signature):return {'scenario':scenario.name,'status':'complete','reused':True}
    previous=[p for p in folder.iterdir() if p.is_file() and (p.name.startswith(slug+'_'+scenario.name) or p.name in ['complete.json','gridX.csv','gridX_R.csv'])]
    if previous:
        backup=outdir/'_backups'/uuid.uuid4().hex;backup.mkdir(parents=True)
        for p in previous:shutil.copy2(p,backup/p.name)
        atomic_json(backup/'manifest.json',{'original_folder':str(folder),'files':[p.name for p in previous]})
    bundle=joblib.load(model);forest=bundle['modelo'];predictors=bundle['preditores']
    if set(predictors)!=set(PREDICTORS):raise ValueError(f'Preditores marinhos incompatíveis: {predictors}')
    with xr.open_dataset(input_path) as ds:
        ds=ds.load();lat=ds.lat.values;lon=ds.lon.values
        X=np.column_stack([ds[v].transpose('lat','lon').values.ravel() for v in predictors])
        depth=ds.profundidade.transpose('lat','lon').values.ravel()
        valid=np.all(np.isfinite(X),axis=1)&(depth<0);ids=np.flatnonzero(valid)
        if not len(ids):raise ValueError('Nenhuma célula oceânica com todos os preditores')
        mean=np.full(len(X),np.nan);sd=np.full(len(X),np.nan);extrap=np.full(len(X),np.nan)
        ranges=bundle.get('faixa_treino',evaluation.get('faixa_treino'))
        if not ranges or set(predictors)-set(ranges):raise ValueError('Modelo sem faixas de treino para diagnóstico de extrapolação')
        for start in range(0,len(ids),16384):
            selection=ids[start:start+16384];features=np.asarray(X[selection],dtype=np.float32)
            mean[selection],sd[selection]=forest_moments(forest,features,jobs)
            extrap[selection]=np.any(np.column_stack([(features[:,i]<ranges[v][0])|(features[:,i]>ranges[v][1]) for i,v in enumerate(predictors)]),axis=1)
        prefix=f'{slug}_{scenario.name}';shape=(len(lat),len(lon));outputs=[]
        for suffix,array in [('adequabilidade',mean),('incerteza',sd),('extrapolacao',extrap)]:
            p=folder/f'{prefix}_{suffix}.tif';write_tif(p,array.reshape(shape),lat,lon);outputs.append(p)
        comparison=None
        if engine in ['ambos','r']:
            LAT,LON=np.meshgrid(lat,lon,indexing='ij');gx=pd.DataFrame({'lat':LAT.ravel()[valid],'lon':LON.ravel()[valid]})
            for i,v in enumerate(predictors):gx[v]=X[valid,i]
            gx['adeq_py']=mean[valid];csv=folder/'gridX.csv';gx.to_csv(csv,index=False)
            r_csv=folder/'gridX_R.csv';r_tif=folder/f'{prefix}_adequabilidade_R.tif'
            subprocess.run([rscript,str(ROOT/'04_modeling/predizer_marinho.R'),str(csv),str(rmodel),str(r_csv),str(folder/f'{prefix}_adequabilidade.tif'),str(r_tif)],cwd=ROOT,check=True)
            validate_map(r_tif);outputs.append(r_tif)
            other=pd.read_csv(r_csv)
            if len(other)!=len(gx) or not np.allclose(other[['lat','lon']],gx[['lat','lon']]):raise ValueError('Grade R diferente da grade Python')
            r_values=other.adeq_R.to_numpy();difference=mean[valid]-r_values
            comparison={'mean_absolute_difference':float(np.mean(np.abs(difference))),
                        'correlation':float(np.corrcoef(mean[valid],r_values)[0,1]) if np.std(mean[valid]) and np.std(r_values) else None}
        report={'species':species,'scenario':scenario.name,'annual_model_projected_on_temporal_aggregate':True,
                'methodology':provenance,'valid_ocean_cells':int(valid.sum()),'land_cells_predicted':0,
                'extrapolation_fraction':float(np.mean(extrap[valid])),'RF_uncertainty':signature['uncertainty'],
                'framework_comparison':comparison,'training_evaluation':evaluation,
                'validation':'Statistical test split is random, not spatial; marine mask QA and extrapolation are not ecological approval.'}
        p=folder/f'{prefix}_avaliacao.json';atomic_json(p,report);outputs.append(p)
        # Completion is written only after every artifact passes validation.
        marker={'status':'complete','species':species,'scenario':scenario.name,'signature':signature,
                'files':[{'name':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in outputs]}
        atomic_json(folder/'complete.json',marker)
        return {'scenario':scenario.name,'status':'complete','reused':False,'extrapolation_fraction':report['extrapolation_fraction']}

def main(argv=None):
    p=argparse.ArgumentParser(description='17 cenários marinhos: anual, 12 meses, 2050/2100 × SSP245/585')
    p.add_argument('--especie',required=True);p.add_argument('--perfil');p.add_argument('--model_dir');p.add_argument('--outdir')
    p.add_argument('--grupos',default='');p.add_argument('--engine',choices=['python','r','ambos'],default='ambos');p.add_argument('--rscript',default='Rscript')
    p.add_argument('--existentes',choices=['perguntar','retomar','overwrite','cancelar'],default='perguntar');p.add_argument('--dry_run',action='store_true')
    p.add_argument('--janela',default='2015-2024');p.add_argument('--bbox',type=float,nargs=4,default=[-70,-60,20,15]);p.add_argument('--resolucao',type=float,default=.1)
    p.add_argument('--cache');p.add_argument('--cmems_cache');p.add_argument('--batimetria');p.add_argument('--cmip6_catalog');p.add_argument('--jobs',type=int,default=4)
    a=p.parse_args(argv)
    try:
        profile=selecionar_perfil(a.especie,a.perfil)
        if carregar_perfil(profile).get('pipeline')!='ocean':raise ValueError('Espécie/perfil não oceânicos')
        plan=scenarios(a.janela,[s.strip() for s in a.grupos.split(',') if s.strip()])
        if not 1<=a.jobs<=64:raise ValueError('jobs deve ser 1..64')
        slug=naming.slug_especie(a.especie);outdir=Path(a.outdir or ROOT/'07 Executado por espécie'/slug/'predicoes_cenarios_ocean')
        print(f'[perfil] {profile} | {len(plan)} cenários marinhos | treino existente 1:1',flush=True)
        for i,s in enumerate(plan,1):print(f'[{i}/{len(plan)}] {s.name}',flush=True)
        if a.dry_run:
            print('[dry-run] Sem downloads, sem alterações e sem processamento.');return 0
        folder,model,evaluation=find_model(a.especie,a.model_dir)
        methodology_path=folder.parent/'metodologia_perfil.json'
        if not methodology_path.exists():raise ValueError('Modelo sem metodologia/perfil registrados; execute run_pipeline_ocean.py com o perfil da espécie')
        methodology=json.loads(methodology_path.read_text())
        if methodology.get('perfil')!=profile or methodology.get('pipeline')!='run_pipeline_ocean.py':raise ValueError('Perfil do modelo não corresponde à espécie/pipeline oceânico')
        if a.engine in ['r','ambos'] and not model.with_name(model.stem+'_R.rds').exists():raise ValueError('Modelo R inexistente')
        states=[state_for(slug,s,outdir) for s in plan]
        if not prepare_existing(states,outdir,a.existentes,False):return 1
        layers=MarineLayers(a.bbox,a.janela,a.resolucao,a.cache,a.cmems_cache,a.batimetria,a.cmip6_catalog)
        records=[];started=time.monotonic()
        for i,s in enumerate(plan,1):
            print(f'[ATUAL {i}/{len(plan)}] {a.especie}: {s.name}',flush=True)
            try:records.append(run_scenario(a.especie,model,evaluation,s,layers,outdir,a.engine,a.rscript,a.jobs,a.existentes))
            except Exception as e:
                records.append({'scenario':s.name,'status':'failed','error':f'{type(e).__name__}: {e}'});print(records[-1],flush=True)
            atomic_json(outdir/'summary.json',{'species':a.especie,'expected_scenarios':len(plan),'records':records,'seconds':time.monotonic()-started})
            print(f'[FINALIZADA {i}/{len(plan)}] {s.name}: {records[-1]["status"]}',flush=True)
        failures=sum(r['status']!='complete' for r in records)
        print(f'[LOTE] {len(records)-failures}/{len(plan)} concluídos; {failures} falhas',flush=True)
        return 1 if failures else 0
    except (ValueError,OSError) as e:p.error(str(e))

if __name__=='__main__':raise SystemExit(main())
