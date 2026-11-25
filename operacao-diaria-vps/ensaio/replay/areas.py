from pathlib import Path
import json,requests,rasterio,numpy as np
from rasterio.warp import transform_geom
from rasterio.features import geometry_mask
from shapely.geometry import box,mapping
from pyproj import Transformer
root=Path(__file__).parent
e={l.partition('=')[0]:l.partition('=')[2].strip().strip('"\'') for l in (Path.home()/'projects/acolite_application/.env').read_text().splitlines() if '=' in l}
proof=json.loads((root.parent.parent/'worker-phyto/historico.json').read_text());out={}
for i in ['165','541','542']:
 r=requests.get(e['SIAPESQ_BASE_API'].rstrip('/')+'/v1/phytoBloom/reservatorios/'+i,headers={'x-api-key':e['SIAPESQ_API_KEY']},timeout=30);r.raise_for_status()
 areas=r.json()['areas_alertas'];counts=[]
 with rasterio.open(next((root/('run-'+i)/'out').glob('*_NDCI.tif'))) as ds:
  for area in areas:
   pos=area['regiao_alerta']; geo=box(min(float(p['longitude']) for p in pos),min(float(p['latitude']) for p in pos),max(float(p['longitude']) for p in pos),max(float(p['latitude']) for p in pos))
   rec=next(v['request'] for v in proof['alerts'].values() if v['request']['aoi_id']==i and v['request']['area_id']==str(area['id']));s,w,n,ee=rec['bbox']
   tr=Transformer.from_crs('EPSG:4326','EPSG:32722',always_xy=True);a,b=tr.transform(w,s);c,d=tr.transform(ee,n)
   def count(geom):return int(geometry_mask([geom],out_shape=ds.shape,transform=ds.transform,invert=True).sum())
   counts.append({'area':area['id'],'old_inside':count(mapping(box(a,b,c,d))),'old_selected':ds.width*ds.height-count(mapping(box(a,b,c,d))),'correct_inside':count(transform_geom('EPSG:4326',ds.crs,mapping(geo)))})
  out[i]={'epsg':ds.crs.to_epsg(),'total_pixels':ds.width*ds.height,'areas':counts}
(root/'auditoria-areas.json').write_text(json.dumps(out,indent=2))
for k,d in out.items():print(k,d['total_pixels'],[(x['old_selected'],x['correct_inside']) for x in d['areas']])
