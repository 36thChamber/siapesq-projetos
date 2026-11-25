import json
from pathlib import Path
import numpy as np,rasterio
from rasterio.warp import reproject, Resampling
from rasterio.windows import from_bounds

B=Path(__file__).resolve().parent
rows=json.load(open(B/'validation.json'))['files'];results=[]
seen=set()
for r in rows:
    if r['recorte']!='nacional_1km':continue
    group=[next(x for x in rows if x['especie']==r['especie'] and x['cenario']==r['cenario'] and x['produto']==r['produto'] and x['recorte']==region) for region in ['nacional_1km','rs_250m','poligono_30m']]
    sig=tuple(x['mask_sha256'] for x in group)
    if sig in seen:continue
    seen.add(sig)
    with rasterio.open(B/'drive-files'/group[0]['arquivo']) as nat,rasterio.open(B/'drive-files'/group[1]['arquivo']) as rs,rasterio.open(B/'drive-files'/group[2]['arquivo']) as poly:
        n=nat.read(1,window=from_bounds(*rs.bounds,transform=nat.transform));inside_national=int(np.isfinite(n).sum())
        pmask=np.isfinite(poly.read(1)).astype('uint8'); rmask=np.isfinite(rs.read(1))
        projected=np.zeros(rs.shape,dtype='uint8')
        reproject(pmask,projected,src_transform=poly.transform,src_crs=poly.crs,dst_transform=rs.transform,dst_crs=rs.crs,resampling=Resampling.nearest)
        # Erode the projected polygon one RS pixel: overlap may only exist at its boundary.
        interior=projected.astype(bool)
        for dy in [-1,0,1]:
            for dx in [-1,0,1]:interior &= np.roll(np.roll(projected,dy,axis=0),dx,axis=1).astype(bool)
        interior[0,:]=False;interior[-1,:]=False;interior[:,0]=False;interior[:,-1]=False
        overlap=int((rmask & projected.astype(bool)).sum());deep=int((rmask & interior).sum())
        results.append({'example':r['arquivo'],'national_valid_inside_rs_window':inside_national,'rs_polygon_overlap_pixels':overlap,'rs_polygon_overlap_beyond_one_rs_cell':deep,'mask_signature':sig})
(B/'mask-checks.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
assert all(x['national_valid_inside_rs_window']==0 and x['rs_polygon_overlap_beyond_one_rs_cell']==0 for x in results)
