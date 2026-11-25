from pathlib import Path
import hashlib,json,shutil
import numpy as np,pandas as pd,rasterio
from rasterio.transform import rowcol
BASE=Path(__file__).resolve().parent;CFG=json.loads((BASE/'config.json').read_text());report=[]
for item in CFG['species']:
    sp=item['species'];folder=BASE/'repo/07 Executado por espécie'/sp/CFG['round_name']/'modelo_rf_marinho'
    for engine,suffix,value_col in [('python','','adeq_py'),('R','_R','adeq_R')]:
        stem=f'pred_{sp}_media{CFG["window"]}'
        path=folder/(stem+'_adequabilidade'+suffix+'.tif')
        if not path.exists():continue
        grid=pd.read_csv(folder/(stem+'_gridX'+suffix+'.csv'))
        with rasterio.open(path) as r:
            data=r.read(1);finite=np.isfinite(data)
            assert not np.isinf(data).any() and finite.sum()==len(grid)>0
            rows,cols=rowcol(r.transform,grid.lon.to_numpy(),grid.lat.to_numpy())
            assert len(set(zip(rows,cols)))==len(grid)
            assert np.allclose(data[rows,cols],grid[value_col],rtol=1e-6,atol=1e-7)
            before_nodata=str(r.nodata)
        with path.open('rb') as f:before=hashlib.file_digest(f,'sha256').hexdigest()
        backup=path.with_suffix('.tif.before-nodata-repair')
        if not backup.exists():shutil.copy2(path,backup)
        with rasterio.open(path,'r+') as r:r.nodata=float('nan')
        with rasterio.open(path) as r:
            masked=r.read(1,masked=True)
            assert np.array_equal(masked.mask,~finite)
            assert np.array_equal(r.read(1)[finite],data[finite])
            valid=masked.compressed();assert np.isfinite(valid).all() and valid.min()>=0 and valid.max()<=1
        report.append({'species':sp,'engine':engine,'valid_cells':int(finite.sum()),'masked_cells':int((~finite).sum()),'previous_nodata':before_nodata,'previous_sha256':before,'probabilities_unchanged':True})
(BASE/'nodata_repair_audit.json').write_text(json.dumps(report,indent=2))
print('Existing TIFFs verified against prediction CSVs; NoData repaired:',len(report),flush=True)
