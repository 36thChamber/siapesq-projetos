#!/usr/bin/env python3
"""Monthly 2025 and annual 2015-2024 input-aggregate projections; no retraining."""
import argparse, ast, fcntl, hashlib, importlib.metadata, json, os
from pathlib import Path
import signal, sys, time, traceback, zipfile, shutil
sys.dont_write_bytecode = True
RELEASE = Path('/workspace/ste-ocean-daily/releases/2026-10-15-all19')
STE = RELEASE / 'ste'
DEPTH = Path('/workspace/models/data/static/depth.nc')
RUN = Path('/workspace/ste-ocean-daily/manual-runs/two-species-monthly2025-annual2015-2024-v1')
SPECIES = ('Thunnus obesus', 'Micropogonias furnieri')
PROFILE = 'oceano_operacional_historico'
BBOX = [-90, -60, 55, 40]
MONTHS = [f'mensal_{i:02d}_{n}' for i,n in enumerate('jan fev mar abr mai jun jul ago set out nov dez'.split(),1)]

TASKS = [
    {'name':'monthly-2025','window':'2025-2025','group':'mensal','scenarios':MONTHS,'input_months':12},
    {'name':'annual-2015-2024','window':'2015-2024','group':'anual','scenarios':['anual_2015_2024'],'input_months':120},
]

def need(ok, message):
    if not ok: raise RuntimeError(message)

def sha(path):
    with Path(path).open('rb') as f: return hashlib.file_digest(f, 'sha256').hexdigest()

def atomic(path, data):
    path = Path(path)
    tmp = path.with_name(path.name+'.partial')
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n')
    os.replace(tmp, path)

def status(phase, **extra):
    data = {'phase':phase, 'updated_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()), **extra}
    atomic(RUN/'status.json',data)
    print(json.dumps(data, ensure_ascii=False),flush=True)

def setup():
    import numpy as np
    import pandas as pd
    import rasterio
    import xarray as xr
    import joblib, sklearn, dotenv, copernicusmarine, dask.array, netCDF4
    dask.config.set(scheduler='synchronous')  # Lower concurrent memory pressure; no memory guarantee.
    sys.path.insert(0,str(STE))
    import marine_scenarios as marine
    import run_predicoes_cenarios_ocean as runner
    tree = ast.parse((STE/'run_predicoes_diarias_ocean.py').read_text())
    nodes = [n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='read_field']
    need(len(nodes)==1,'Expected exactly one deployed read_field function')
    namespace={'np':np,'pd':pd,'rasterio':rasterio,'xr':xr,'surface':marine.surface,'UNITS':{}}
    exec(compile(ast.Module(body=nodes,type_ignores=[]),'<deployed-read_field>','exec'),namespace)
    def depth(self):
        if self._depth is None:
            a = namespace['read_field'](self.bathymetry,'depth')
            for coord,target in [('lat',self.lat),('lon',self.lon)]:
                v=a[coord].values
                need(len(v)>1 and np.isfinite(v).all() and (np.diff(v)>0).all(),f'Invalid depth coordinate {coord}')
                need(float(target.min())>=float(v.min())-1e-8 and float(target.max())<=float(v.max())+1e-8,f'Depth coverage missing: {coord}')
            self._depth=a.sel(lat=self.lat,lon=self.lon,method='nearest').assign_coords(lat=self.lat.values,lon=self.lon.values).load()
        return self._depth
    marine.MarineLayers.depth=depth
    for task in TASKS:
        need([s.name for s in marine.scenarios(task['window'],[task['group']])]==task['scenarios'],f"Scenario plan changed: {task['name']}")
    need(runner.carregar_perfil(PROFILE).get('pipeline')=='ocean','Profile is not ocean')
    models={}
    for species in SPECIES:
        matches=[]
        for p in (RELEASE/'training').rglob('*_eval.json'):
            try: d=json.loads(p.read_text())
            except (OSError,ValueError): continue
            if d.get('especie')==species: matches.append(p)
        need(len(matches)==1,f'{species}: expected one evaluation metadata file, found {[str(p) for p in matches]}')
        folder,model,evaluation=runner.find_model(species,str(matches[0].parent))
        need(model.is_file() and model.stat().st_size>0,f'{species}: trained model missing')
        need(evaluation.get('especie')==species and set(evaluation.get('preditores',[]))==set(marine.PREDICTORS),f'{species}: evaluation predictors mismatch')
        methodpath=folder.parent/'metodologia_perfil.json'
        method=json.loads(methodpath.read_text())
        need(method.get('especie')==species and method.get('perfil')==PROFILE and method.get('pipeline')=='run_pipeline_ocean.py',f'{species}: methodology/profile mismatch')
        bundle=joblib.load(model)
        predictors=bundle['preditores']; forest=bundle['modelo']
        need(len(predictors)==len(marine.PREDICTORS) and set(predictors)==set(marine.PREDICTORS),f'{species}: model predictors mismatch')
        need(set(forest.classes_)=={0,1} and forest.n_features_in_==len(predictors),f'{species}: incompatible classifier')
        ranges=bundle.get('faixa_treino',evaluation.get('faixa_treino'))
        need(isinstance(ranges,dict),f'{species}: training ranges missing')
        for v in predictors:
            bounds=np.asarray(ranges.get(v,[]),dtype=float)
            need(bounds.shape==(2,) and np.isfinite(bounds).all() and bounds[0]<=bounds[1],f'{species}: invalid range {v}')
        models[species]={'folder':str(folder),'model':str(model),'model_sha256':sha(model),'evaluation_sha256':sha(matches[0]),'methodology_sha256':sha(methodpath),'slug':runner.naming.slug_especie(species)}
        del forest,bundle
    layers=marine.MarineLayers(bbox=BBOX,window='2025-2025',resolution=.1,bathymetry=DEPTH)
    a=layers.depth()
    negative=int((np.isfinite(a)&(a<0)).sum())
    need(tuple(a.shape)==(1001,1451) and negative>0,'Invalid bathymetry grid')
    versions={p:importlib.metadata.version(p) for p in ('numpy','scipy','scikit-learn','joblib','pandas','xarray','rasterio','netCDF4','copernicusmarine','python-dotenv','dask')}
    contract={'schema':1,'species':list(SPECIES),'tasks':TASKS,'bbox':BBOX,'resolution':.1,'profile':PROFILE,'engine':'python','jobs':1,'method':'Predict monthly 2025 environmental aggregates and annual 2015-2024 environmental means; NOT averages of prediction maps; log10 after CHL aggregation','models':models,'depth_sha256':sha(DEPTH),'versions':versions,'runner_sha256':sha(__file__),'deployed_sources':{n:sha(STE/n) for n in ('marine_scenarios.py','run_predicoes_cenarios_ocean.py','run_predicoes_diarias_ocean.py','prediction_state.py')}}
    print(json.dumps({'preflight':'passed','species':SPECIES,'maps':26,'negative_depth_cells':negative,'models':models,'versions':versions},indent=2),flush=True)
    return runner,contract

def verify(contract):
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin
    records=[]; files=[]
    for task in TASKS:
        for species,model in contract['models'].items():
            root=RUN/'outputs'/task['name']/model['slug']
            markers=list(root.glob('*/complete.json'))
            need({p.parent.name for p in markers}==set(task['scenarios']),f'{species}: unexpected scenario markers')
            for month in task['scenarios']:
                folder=root/month; marker=folder/'complete.json'; d=json.loads(marker.read_text())
                need((d.get('status'),d.get('species'),d.get('scenario'))==('complete',species,month),f'{folder}: marker mismatch')
                need(d.get('signature',{}).get('model_sha256')==model['model_sha256'] and d['signature'].get('engine')=='python',f'{folder}: model/engine signature mismatch')
                entries=d['files'];names=[e['name'] for e in entries]
                need(len(names)==len(set(names)),f'{folder}: duplicate manifest entry')
                for e in entries:
                    need(Path(e['name']).name==e['name'],f'{folder}: invalid manifest path')
                    p=folder/e['name']
                    need(p.is_file() and p.stat().st_size==e['bytes'] and sha(p)==e['sha256'],f'{p}: size/hash mismatch')
                    files.append(p)
                    if p.suffix=='.tif':
                        with rasterio.open(p) as r:
                            need(r.count==1 and (r.height,r.width)==(1001,1451) and r.crs and r.crs.to_epsg()==4326 and r.nodata is not None,f'{p}: bands/shape/CRS/NoData mismatch')
                            need(r.transform.almost_equals(from_origin(-90.05,40.05,.1,.1)),f'{p}: grid transform mismatch')
                            v=r.read(1,masked=True).compressed()
                            need(v.size>0 and np.isfinite(v).all() and v.min()>=0 and v.max()<=1,f'{p}: invalid cells/range')
                need(len([n for n in names if n.endswith('_incerteza.tif')])==1 and len([n for n in names if n.endswith('_extrapolacao.tif')])==1,f'{folder}: uncertainty/extrapolation map missing')
                primary=[folder/n for n in names if n.endswith('_adequabilidade.tif')]
                reports=[folder/n for n in names if n.endswith('_avaliacao.json')]
                need(len(primary)==len(reports)==1,f'{folder}: expected one primary map and report')
                report=json.loads(reports[0].read_text())
                with rasterio.open(primary[0]) as r: v=r.read(1,masked=True).compressed()
                need(report.get('species')==species and report.get('scenario')==month and report.get('valid_ocean_cells')==int(v.size) and report.get('land_cells_predicted')==0,f'{folder}: report/count mismatch')
                extrap=report.get('extrapolation_fraction')
                need(isinstance(extrap,(int,float)) and np.isfinite(extrap) and 0<=extrap<=1,f'{folder}: invalid extrapolation fraction')
                records.append({'species':species,'group':task['name'],'scenario':month,'valid_cells':int(v.size),'minimum':float(v.min()),'maximum':float(v.max()),'extrapolation_fraction':extrap})
                files.append(marker)
            summary=root/'summary.json'
            if summary.is_file():files.append(summary)
    need(len(records)==26,'Expected 26 validated primary maps')
    atomic(RUN/'qa.json',{'status':'passed','primary_maps':26,'records':records,'note':'Integrity checks are not ecological validation; random training split, not spatial.'})
    return files

def package(files):
    export=RUN/'export';export.mkdir(exist_ok=True)
    readme=RUN/'README.txt'
    readme.write_text('26 primary suitability GeoTIFFs: Thunnus obesus and Micropogonias furnieri. Each has 12 monthly 2025 maps and 1 annual 2015-2024 map.\nEPSG:4326, 0.1 degrees. Monthly 2025 environmental-input projections plus annual 2015-2024 environmental-mean projections; NOT averages of prediction maps.\nThe annual window is interpreted as 2015 THROUGH 2024, not two separate annual years.\nAnnual environmental means use equal-weight monthly timesteps with skipna, not weighting by days per month.\nOutputs also include RF tree-probability standard deviations and extrapolation masks.\nUncertainty is not a climate confidence interval. Random training split is not spatial validation.\nNo ecological approval is implied. See qa.json for coverage and extrapolation per month.\n')
    files=sorted(set(files+[RUN/'contract.json',RUN/'qa.json',readme]))
    manifest=RUN/'SHA256SUMS.txt'
    manifest.write_text(''.join(f'{sha(p)}  {p.relative_to(RUN).as_posix()}\n' for p in files))
    files.append(manifest)
    target=export/'siapresp-two-species-monthly2025-annual2015-2024.zip';tmp=target.with_suffix('.zip.partial')
    with zipfile.ZipFile(tmp,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=4) as z:
        for p in files:z.write(p,p.relative_to(RUN).as_posix())
    with zipfile.ZipFile(tmp) as z: need(z.testzip() is None,'Archive CRC verification failed')
    os.replace(tmp,target)
    checksum=target.with_suffix('.zip.sha256')
    checksum.write_text(f'{sha(target)}  {target.name}\n')
    return {'zip':str(target),'sha256':sha(target),'bytes':target.stat().st_size,'checksum':str(checksum)}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run',action='store_true')
    args=parser.parse_args()
    if not args.run:
        setup();print('Offline preflight only. No remote download or prediction launched.');return 0
    RUN.mkdir(parents=True,exist_ok=True)
    with (RUN/'run.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:raise SystemExit('Another copy is running; not launching a duplicate.')
        def terminate(signum,frame):raise RuntimeError(f'Interrupted by signal {signum}; safe to resume with same command')
        signal.signal(signal.SIGTERM,terminate)
        try:
            status('preflight')
            runner,contract=setup()
            cp=RUN/'contract.json'
            if cp.exists():need(json.loads(cp.read_text())==contract,'Run contract changed; do not overwrite. Inspect before preparing a new run directory.')
            else:
                need(not any((RUN/'outputs').glob('*')) and not (RUN/'cmems').exists(),'Existing untracked outputs/cache; inspect before proceeding')
                atomic(cp,contract)
            results={}
            for task in TASKS:
                cache=RUN/'cmems'/task['name']
                complete_inputs=all((cache/f"{kind}_{task['window']}.nc").is_file() for kind in ('phy','chl'))
                free=shutil.disk_usage(RUN).free
                minimum_gib=5 if complete_inputs else (30 if task['input_months']==120 else 10)
                need(free>=minimum_gib*1024**3,f"Insufficient free disk for {task['name']}: {free/1024**3:.1f}GiB available; conservative guard requires {minimum_gib}GiB. This is not a download-size estimate.")
                for species,model in contract['models'].items():
                    key=task['name']+' / '+species
                    status('predicting',group=task['name'],species=species,completed=results,free_disk_gib=round(free/1024**3,1))
                    argv=['--especie',species,'--perfil',PROFILE,'--model_dir',model['folder'],'--grupos',task['group'],'--janela',task['window'],'--engine','python','--jobs','1','--resolucao','0.1','--bbox',*map(str,BBOX),'--batimetria',str(DEPTH),'--outdir',str(RUN/'outputs'/task['name']/model['slug']),'--cache',str(RUN/'layers'/task['name']),'--cmems_cache',str(cache),'--existentes','retomar']
                    try:results[key]=int(runner.main(argv) or 0)
                    except SystemExit as e:results[key]=int(e.code or 0)
                    status('species_finished',group=task['name'],species=species,exit_codes=results)
            need(all(v==0 for v in results.values()),f'Prediction failures: {results}; rerun unchanged to resume')
            status('verifying');files=verify(contract)
            status('packaging');artifact=package(files)
            status('complete',primary_maps=26,artifact=artifact)
            return 0
        except BaseException as e:
            status('failed',error=f'{type(e).__name__}: {e}',resume='Run the same launch command after resolving the cause; valid outputs are preserved.')
            traceback.print_exc();return 1
if __name__=='__main__':raise SystemExit(main())
