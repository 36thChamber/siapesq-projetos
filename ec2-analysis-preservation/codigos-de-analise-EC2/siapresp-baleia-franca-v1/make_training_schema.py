#!/usr/bin/env python3
"""Create explicit schema from USER-VERIFIED existing cache layout, no downloads."""
import argparse,json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--old-run',required=True);p.add_argument('--depth',required=True);p.add_argument('--out',required=True)
a=p.parse_args();base=Path(a.old_run).resolve()/'cmems/annual-2015-2024'
phy={'path':str(base/'phy_2015-2024.nc'),'lat':'latitude','lon':'longitude','time':'time',
     'select':{'depth':0},'selected_values':{'depth':0.494025}}
schema={'sst':dict(phy,variable='thetao',units='degrees_C'),
 'sss':dict(phy,variable='so',units='1e-3'),
 'chl':{'path':str(base/'chl_2015-2024.nc'),'variable':'CHL','lat':'latitude','lon':'longitude','time':'time','units':'milligram m-3'},
 'profundidade':{'path':str(Path(a.depth).resolve()),'variable':'__xarray_dataarray_variable__','lat':'y','lon':'x',
 'select':{'band':0},'units':'m','units_assumption':'m; deployed static negative-ocean convention'}}
out=Path(a.out)
with out.open('x') as f:json.dump(schema,f,indent=2)
print(out)
