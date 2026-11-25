"""Reconstrução isolada a partir de insumos e transformações SHA-256 da versão anterior."""
from pathlib import Path
import hashlib, json, importlib.util, os, sys
import numpy as np, pandas as pd
base=Path(__file__).resolve().parent; projects=base.parents[1]
manifest=json.loads(next(projects.glob('ec2-analysis-preserv*/s3-novos.complete.json')).read_text())
expected={f['name']:f['sha256'] for f in manifest['files']}
registry=json.loads((projects/'siapresp-ste-integration/2026-10-15/production/training-summary-s3.json').read_text())
ste=base.parent/'ensaio/ste'
def sha(path):
 with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
for item in ['04_modeling/modelo_marinho.py','balanceamento.py','naming.py']:
 assert sha(ste/item)==expected['ste/'+item],item
sys.path.insert(0,str(ste))
spec=importlib.util.spec_from_file_location('trainer',ste/'04_modeling/modelo_marinho.py')
trainer=importlib.util.module_from_spec(spec);spec.loader.exec_module(trainer)
out=base/'reconstrucao-2026-11-23-v1'
out.mkdir(exist_ok=True)
for r in registry['records']:
 sid=r['species_id']
 sources=[p for p in [base/'fontes-originais'/sid/'original.csv',base/'exportacao-sdm'/sid/'original.csv'] if p.exists() and sha(p)==r.get('source_sha256')]
 if not sources:continue
 folder=out/sid
 folder.mkdir(exist_ok=True)
 receipt=folder/'reconstrucao.json'
 if receipt.exists():continue
 raw=pd.read_csv(sources[0])
 if sid in {'engraulis_anchoita','merluccius_merluccius'}:
  raw=raw.rename(columns={'Surface.Temperature.Mean':'sst','Surface.Salinity.Mean':'sss','MS_bathymetry':'profundidade'})
 else:
  raw=raw.rename(columns={'thetao':'sst','so':'sss','depth':'profundidade'})
  raw['chl_log10']=np.log10(pd.to_numeric(raw.CHL,errors='coerce').where(lambda a:a>0))
 raw['sst']=pd.to_numeric(raw.sst,errors='coerce').where(lambda a:a.between(-5,50))
 raw['sss']=pd.to_numeric(raw.sss,errors='coerce').where(lambda a:a>=0)
 if 'profundidade' in raw:
  raw=raw.loc[pd.to_numeric(raw.profundidade,errors='coerce')<0].copy()
 sample=folder/'training-ste.csv';raw.to_csv(sample,index=False)
 training_identical=sha(sample)==expected['training/'+sid+'/training-ste.csv']
 f=trainer.treinar(sample,folder/'modelo_rf_marinho',sid.replace('_',' ').capitalize(),seed=42,n_estimators=500)
 k='training/'+sid+'/modelo_rf_marinho/'+f.name
 files={'modelo':f,'split':f.with_name(f.stem+'_dados_split.csv')}
 hashes={n:sha(p) for n,p in files.items()}
 pred=r['preditores']
 info=json.loads(f.with_name(f.stem+'_eval.json').read_text())
 assert info['preditores']==pred and info['n_presencas']==r['presence'] and info['n_pseudo']==r['pseudoabsence']
 receipt.write_text(json.dumps({'especie':sid,'versao':out.name,'fonte':str(sources[0]),'sha256_fonte':sha(sources[0]),'sha256_treino':sha(sample),'treino_identico':training_identical,'sha256_modelo':hashes['modelo'],'original':expected[k],'identico':hashes['modelo']==expected[k],'split_identico':hashes['split']==expected[k.replace('.joblib','_dados_split.csv')],'preditores':pred},indent=2))
 print('CONCLUIDO',sid,hashes['modelo']==expected[k],flush=True)
