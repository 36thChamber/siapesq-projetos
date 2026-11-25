from pathlib import Path
import json,os
import numpy as np,pandas as pd,xarray as xr
BASE=Path(__file__).resolve().parent
cache=BASE/'repo/dados_saida/pred_marinho_cache/2015-2024'
expected=set(pd.period_range('2015-01','2024-12',freq='M'));report={}
for kind in ['phy','chl']:
    path=cache/f'{kind}_2015-2024.nc'
    with xr.open_dataset(path,chunks={}) as source:
        months=set(pd.DatetimeIndex(source.time.values).to_period('M'))
        if months != expected:
            assert expected-months=={pd.Period('2015-01',freq='M')}
            with xr.open_dataset(BASE/'january'/f'{kind}_2015_jan_verified_trimmed.nc',chunks={}) as january:
                selected=january
                for coord in ['latitude','longitude','depth']:
                    if coord in source.coords:
                        selected=selected.sel({coord:source[coord]},method='nearest')
                        assert np.allclose(selected[coord].values,source[coord].values,rtol=1e-6,atol=1e-5)
                        selected=selected.assign_coords({coord:source[coord]})
                full=xr.concat([selected,source],dim='time',join='exact',coords='minimal',compat='override').sortby('time')
                assert len(full.time)==120 and set(pd.DatetimeIndex(full.time.values).to_period('M'))==expected
                tmp=path.with_suffix('.complete.nc')
                full.to_netcdf(tmp,encoding={v:{'zlib':True,'complevel':4,'dtype':'float32','_FillValue':np.nan,
                    'chunksizes':tuple(1 if dim in ['time','depth'] else min(full.sizes[dim],256) for dim in full[v].dims)} for v in full.data_vars})
            os.replace(tmp,path)
    with xr.open_dataset(path) as complete:
        assert len(complete.time)==120 and set(pd.DatetimeIndex(complete.time.values).to_period('M'))==expected
        report[kind]={'months':120,'first':str(complete.time.values[0]),'last':str(complete.time.values[-1]),'sizes':dict(complete.sizes)}
(BASE/'monthly_cache_verified.json').write_text(json.dumps(report,indent=2))
print('Monthly physical/chlorophyll cache: all 120 months verified',flush=True)
