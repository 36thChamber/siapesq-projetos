import importlib.util
from pathlib import Path
import sys
from dotenv import load_dotenv
from datetime import date
import xarray as xr
root=Path('/workspace/tools-train-models')
out=Path(__file__).parent
load_dotenv(root/'.env')
sys.path.insert(0,str(root/'05_utils'))
import batimetria
bath=out/'depth.nc'
if not bath.exists():
    da=batimetria._abrir(root/'dados_entrada/ocean_depth.nc')
    da=da.sel(lat=slice(-35,-27),lon=slice(-55,-47)).load()
    da.name='depth';da.attrs['units']='m';da.to_dataset().to_netcdf(bath)
path=Path('/workspace/models/scripts/download_daily_predictors.py')
spec=importlib.util.spec_from_file_location('siapresp_download',path)
mod=importlib.util.module_from_spec(spec);sys.modules[spec.name]=mod;spec.loader.exec_module(mod)
mod.configure_legacy_credentials()
for day in [date(2026,10,12),date(2026,10,11),date(2026,10,10)]:
    try:
        result=mod.download_date(data_date=day,bbox=mod.BoundingBox(-54.2,-47.8,-34.2,-27.8),depth_file=bath,output_root=out/'daily',thetao_dataset=mod.DEFAULT_THETAO_DATASET,so_dataset=mod.DEFAULT_SO_DATASET,chl_dataset=mod.DEFAULT_CHL_DATASET,retries=1,force=False)
        print('Daily inputs:',result,flush=True);break
    except Exception as exc:
        print(type(exc).__name__,str(exc)[:300],flush=True)
else:
    raise SystemExit('Nenhuma data diária disponível')
