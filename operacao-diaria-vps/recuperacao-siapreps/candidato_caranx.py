"""Versão experimental a partir do SDM que o código legado da plataforma publicou sob 'caranx_rf'."""
from pathlib import Path
import json,hashlib,subprocess,sys,csv
import numpy as np,pandas as pd
base=Path(__file__).resolve().parent;project=base.parents[1]
sdm=project/'Modelos-R/caranx/Modelo_Caranx_rf.sdm'
dest=base/'candidato-caranx-sdm-2026-11-23-v1/caranx_all';dest.mkdir(exist_ok=True,parents=True)
tmp=dest/'fonte-sdm.csv'
subprocess.run(['Rscript',str(base/'candidato_caranx.R'),str(sdm),str(tmp)],check=True)
df=pd.read_csv(tmp).rename(columns={'MS_bathymetry':'profundidade','Surface.Chlorophyll.Mean':'CHL','Surface.Salinity.Mean':'sss','Surface.Temperature.Mean':'sst'})
df=df.loc[(df.profundidade<0)&df.sst.between(-5,50)&(df.sss>=0)&(df.CHL>0)&df.sp.isin([0,1])].copy()
df['chl_log10']=np.log10(df.CHL)
training=dest/'training-ste.csv';df.to_csv(training,index=False)
trainer=base.parent/'ensaio/ste/04_modeling/modelo_marinho.py'
subprocess.run([sys.executable,str(trainer),'--especie','Caranx all','--csv',str(training),'--outdir',str(dest/'modelo_rf_marinho'),'--seed','42','--n_estimators','500'],check=True)
meta={'especie':'Caranx all','pipeline':'run_pipeline_ocean.py','perfil':'oceano_operacional_historico','versao':dest.parent.name,'source':str(sdm),'source_sha256':hashlib.sha256(sdm.read_bytes()).hexdigest(),'referencia':'Modelos-R/all_preditors/all_predictors.R:237','limitacao':'O SDM anterior do grupo Caranx identifica a resposta como species, sem registrar os integrantes taxonômicos; os campos são médias ambientais e a comparação exige revisão científica.','contagens_originais':df.sp.value_counts().to_dict()}
(dest/'metodologia_perfil.json').write_text(json.dumps(meta,indent=2))
with (dest.parent/'modelos.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['species','species_id','profile','model_dir']);w.writerow(['Caranx all','caranx_all',meta['perfil'],str(dest/'modelo_rf_marinho')])
