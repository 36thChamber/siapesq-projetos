"""Confronta a leitura em janela com uma máscara independente sobre a cena integral."""
from pathlib import Path
import json,sys
import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom
from shapely.geometry import box,mapping
root=Path(__file__).resolve().parent
sys.path.insert(0,str(root.parent/'phyto'))
from image_processor.alertas import ClassificacaoAlertas
proof=json.loads((root.parent.parent/'worker-phyto/historico.json').read_text())
audit=json.loads((root/'auditoria-areas.json').read_text())
thresholds={'ndvi':{'algas':[.15,.35,.65]},'ndvi2':{'macrofitas':[.3,.6,np.inf]},'ndci':{'ndci':[-.0333,.1334,.3,np.inf],'tsi':[-.112,-.0402,.0316,.1034,.17525]}}
sys.path.insert(0,str(root.parent.parent/'worker-phyto'))
from areas import limites
env={l.partition('=')[0]:l.partition('=')[2].strip().strip(chr(34)+chr(39)) for l in (Path.home()/'projects/acolite_application/.env').read_text().splitlines() if '=' in l}
bounds=limites(env['SIAPESQ_BASE_API'], env['SIAPESQ_API_KEY'], ['165','541','542'])
rows=[]
for rec in proof['alerts'].values():
    req=rec['request']; i=req['aoi_id']; kind=req['product']
    path=next((root/('run-'+i)/'out').glob('*_'+kind.upper()+'.tif'))
    bbox=bounds[(i,req['area_id'])];s,w,n,e=bbox
    assert [round(x,6) for x in bbox]==req['bbox']
    with rasterio.open(path) as ds:
        geom=transform_geom('EPSG:4326',ds.crs,mapping(box(w,s,e,n)))
        mask=geometry_mask([geom],out_shape=ds.shape,transform=ds.transform,invert=True)
        geom_pixels=int(mask.sum())
        catalog_pixels=next(x['correct_inside'] for x in audit[i]['areas'] if str(x['area'])==req['area_id'])
        assert geom_pixels==catalog_pixels
        vals=ds.read(1,masked=True)[mask].compressed().astype('float64')
    c=ClassificacaoAlertas();c.separar_area_alerta(path,bbox,kind)
    for name,limits in thresholds[kind].items():
        previous=-np.inf;counts=[]
        for end in limits:
            counts.append(int(np.count_nonzero((vals>previous)&(vals<=end))))
            previous=end
        assert counts==getattr(c,'pixels_analise_'+name)
    rows.append({'aoi':i,'area':req['area_id'],'produto':kind,'pixels_na_area':geom_pixels,'finitos':int(np.isfinite(vals).sum())})
assert len(rows)==39
(root/'classificacao-validada.json').write_text(json.dumps(rows,indent=2))
print(len(rows),'comparações exatas')
