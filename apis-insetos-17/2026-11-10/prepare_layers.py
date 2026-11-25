from pathlib import Path
import sys,json,rasterio,numpy as np
BASE=Path(__file__).resolve().parent
ROOT=BASE/'repo'
sys.path.insert(0,str(ROOT/'03_environmental_processing'))
import gerar_amplitudes_sazonais as amp
result={}
for var in amp.VARS:
 p=amp.gerar(var)
 if p is None: raise RuntimeError('Missing monthly sources: '+var)
 with rasterio.open(p) as ds:
  d=ds.read(1,masked=True);vals=d.compressed()
  assert vals.size>0 and np.isfinite(vals).all() and vals.min()>=0
  result[var]={'path':str(p),'valid_cells':int(vals.size),'min':float(vals.min()),'max':float(vals.max())}
import montar_predict_variables as mount
mount.PREDITORES=['t2m','e','tp','ndvi','altitude','awc','ocup_solo_mapbiomas']
mount.ESTATICAS=['altitude','awc','ocup_solo_mapbiomas']
ready,missing=mount.montar(mount.SAIDA,[],False)
assert len(ready)==17 and not missing
(BASE/'layers_ready.json').write_text(json.dumps({'amplitudes':result,'scenarios':ready,'missing':missing},indent=2))
print('READY: 17 scenarios with 11 predictors',flush=True)
