import json
from pathlib import Path
import numpy as np,rasterio
from rasterio.warp import reproject,Resampling
B=Path(__file__).resolve().parent
v=json.load(open(B/'validation.json'));assert len(v['files'])==408 and not v['failed'] and not any(r['errors'] for r in v['files'])
rows=v['files'];by={(r['especie'],r['cenario'],Path(r['arquivo']).stem.rsplit('_',1)[1],r['recorte']):r for r in rows};seen=set();checks=[]
for r in rows:
    if r['recorte']!='rs_250m':continue
    nat=by[(r['especie'],r['cenario'],Path(r['arquivo']).stem.rsplit('_',1)[1],'nacional_1km')]
    with rasterio.open(r['old_path']) as old:oldmask=np.isfinite(old.read(1))
    import hashlib
    oldmaskhash=hashlib.sha256(oldmask.tobytes()).hexdigest()
    sig=(oldmaskhash,r['mask_sha256'],nat['mask_sha256'])
    if sig in seen:continue
    seen.add(sig)
    with rasterio.open(B/'drive-files'/r['arquivo']) as rs,rasterio.open(B/'drive-files'/nat['arquivo']) as national:
        rs_mask=np.isfinite(rs.read(1));nat_mask=np.isfinite(national.read(1)).astype('uint8');projected=np.zeros(rs.shape,dtype='uint8')
        reproject(nat_mask,projected,src_transform=national.transform,src_crs=national.crs,dst_transform=rs.transform,dst_crs=rs.crs,resampling=Resampling.nearest)
        removed=oldmask&~rs_mask;covered=removed&projected.astype(bool);remaining=removed&~projected.astype(bool)
        # Measure penetration from the fine RS boundary. One national pixel = four RS pixels.
        # Eroding the coarse national mask instead misclassifies narrow RS boundary features.
        interior=rs_mask.copy()
        for _ in range(round(national.res[0]/rs.res[0])):
            padded=np.pad(interior,1);interior=np.ones(rs.shape,dtype=bool)
            for dy in range(3):
                for dx in range(3):interior &= padded[dy:dy+rs.height,dx:dx+rs.width]
        checks.append({'example':r['arquivo'],'removed_rs_pixels':int(removed.sum()),'covered_by_national':int(covered.sum()),'not_covered_by_national_at_cell_centers':int(remaining.sum()),'coverage_percent':float(100*covered.sum()/removed.sum()),'overlap_rs_cells':int((rs_mask&projected.astype(bool)).sum()),'deep_national_rs_overlap':int((interior&projected.astype(bool)).sum()),'overlap_tolerance_rs_cells':round(national.res[0]/rs.res[0])})
summary={'unique_mask_checks':checks,'point_samples':[{k:r[k] for k in ['arquivo','recorte','point_samples']} for r in rows if r['cenario']=='anual_2015_2024' and r['arquivo'].endswith('_adequabilidade.tif')]}
(B/'coverage-checks.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
assert all(x['coverage_percent']>99.9 and x['deep_national_rs_overlap']==0 for x in checks)
