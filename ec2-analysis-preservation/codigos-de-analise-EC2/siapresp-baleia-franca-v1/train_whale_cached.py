#!/usr/bin/env python3
"""Draft: date-matched MONTHLY marine training, not original DAILY training.
No environmental network client. Requires reviewed explicit schema JSON.
Commands: inspect (read only), train (new output directory only).
Schema keys sst,sss,chl,profundidade each {path,variable,lat,lon,units};
monthly additionally time; optional select={dimension:index} must be explicit.
profundidade is negative elevation in m, never silently sign-flipped.
"""
import argparse
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import xarray as xr
from scipy.spatial import cKDTree

FEATURES = ['sst', 'sss', 'chl_log10', 'profundidade']
CANONICAL_UNITS = {
 'sst': {'degrees_C', 'degree_Celsius', 'degrees_Celsius', 'degC', 'degree_C'},
 'sss': {'1e-3', '0.001', 'psu', 'PSU', 'g kg-1'},
 'chl': {'mg m-3', 'mg/m^3', 'mg m^-3', 'milligram m-3'},
 'profundidade': {'m', 'meters', 'metres'},
}


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1024*1024), b''): h.update(b)
    return h.hexdigest()


def inspect(paths):
    result = {}
    for path in paths:
        with xr.open_dataset(path) as ds:
            result[str(path)] = {
                'sizes': dict(ds.sizes),
                'variables': {k: {'dims': list(v.dims), 'attrs': dict(v.attrs)} for k,v in ds.data_vars.items()},
                'coords': {k: {'dims':list(v.dims), 'size':v.size, 'dtype':str(v.dtype),
                    'first':str(v.values.ravel()[0]), 'last':str(v.values.ravel()[-1]),
                    'attrs':dict(v.attrs)} for k,v in ds.coords.items()},
            }
    return result


class MonthlyCache:
    def __init__(self, schema):
        self.schema, self.datasets, self.arrays, self.month_indices = schema, [], {}, {}
        for feature in ('sst','sss','chl','profundidade'):
            spec = schema[feature]
            path = Path(spec['path']).resolve()
            if not path.is_file(): raise ValueError(f'Missing cache: {path}')
            ds = xr.open_dataset(path)
            self.datasets.append(ds)
            a = ds[spec['variable']]
            raw_units=a.attrs.get('units')
            units = str(raw_units or '')
            # Legacy deployed static depth lacks units; opt-in explicit documented convention only.
            if feature=='profundidade' and raw_units is None and spec.get('units_assumption')=='m; deployed static negative-ocean convention':
                units='m'
            if units != spec['units'] or units not in CANONICAL_UNITS[feature]:
                raise ValueError(f'Unsupported/mismatched units {feature}: {units!r}')
            for dim, index in spec.get('select', {}).items():
                if dim not in a.dims: raise ValueError(f'Unknown selected dimension {dim}')
                if dim in spec.get('selected_values',{}):
                    actual=float(a[dim].isel({dim:int(index)}))
                    if not np.isclose(actual,float(spec['selected_values'][dim]),rtol=0,atol=1e-5):
                        raise ValueError(f'Selected coordinate changed: {dim}={actual}')
                a = a.isel({dim:int(index)})
            lat, lon = spec['lat'], spec['lon']
            for coord, lo, hi in ((lat,-90,90),(lon,-180,180)):
                v = a[coord]
                values = np.asarray(v.values,float)
                if v.dims != (coord,) or len(values)<2 or not np.isfinite(values).all():
                    raise ValueError(f'Unsupported rectilinear coordinate: {coord}')
                if values.min()<lo or values.max()>hi: raise ValueError(f'Coordinate domain: {coord}')
                if not (np.all(np.diff(values)>0) or np.all(np.diff(values)<0)):
                    raise ValueError(f'Nonmonotonic coordinate: {coord}')
            expected = {lat,lon}
            if feature != 'profundidade':
                time = spec['time']; expected.add(time)
                if not np.issubdtype(a[time].dtype,np.datetime64):
                    raise ValueError('Only decoded Gregorian datetime64 monthly time supported')
                dates = pd.DatetimeIndex(a[time].values)
                months = list(zip(dates.year, dates.month))
                if len(set(months)) != len(months): raise ValueError('Not exactly one value per month')
                required = {(y,m) for y in range(2015,2025) for m in range(1,13)}
                if not required.issubset(months): raise ValueError(f'Missing 2015-2024 months: {feature}')
                self.month_indices[feature] = {ym:i for i,ym in enumerate(months)}
            if set(a.dims) != expected: raise ValueError(f'Unselected dimensions for {feature}: {a.dims}')
            self.arrays[feature] = a.sortby(lat).sortby(lon)

    def close(self):
        for ds in self.datasets: ds.close()

    def sample_feature(self, feature, frame):
        spec, a = self.schema[feature], self.arrays[feature]
        lat, lon = spec['lat'], spec['lon']
        result = np.full(len(frame),np.nan)
        # No nearest-ocean snapping: avoid relocating coastal whale observations.
        groups = [(None,np.arange(len(frame)))] if feature=='profundidade' else frame.groupby(['year','month']).indices.items()
        for ym, indices in groups:
            grid = a
            if ym is not None:
                if tuple(ym) not in self.month_indices[feature]: raise ValueError(f'Uncached month: {ym}')
                grid = a.isel({spec['time']:self.month_indices[feature][tuple(ym)]})
            points = frame.iloc[indices]
            result[indices] = grid.interp({lat:xr.DataArray(points.decimalLatitude.to_numpy(),dims='point'),
                lon:xr.DataArray(points.decimalLongitude.to_numpy(),dims='point')},method='linear').values
        return result

    def sample(self, frame):
        frame = frame.copy().reset_index(drop=True)
        for f in ('sst','sss','chl','profundidade'): frame[f] = self.sample_feature(f,frame)
        frame['chl_log10'] = np.log10(frame.chl.where(frame.chl>0))
        return frame


def xyz(lat,lon):
    lat,lon = np.radians(lat),np.radians(lon)
    return np.column_stack((np.cos(lat)*np.cos(lon), np.cos(lat)*np.sin(lon), np.sin(lat)))


def cell_keys(frame, cache):
    spec=cache.schema['sst'];grid=cache.arrays['sst']
    lat=np.asarray(grid[spec['lat']]);lon=np.asarray(grid[spec['lon']])
    # nearest raw physics grid cell, used only to prevent opposite labels.
    def nearest(values, points):
        right=np.clip(np.searchsorted(values,points),1,len(values)-1)
        return np.where(abs(points-values[right-1])<=abs(points-values[right]),right-1,right)
    yi=nearest(lat,frame.decimalLatitude.to_numpy());xi=nearest(lon,frame.decimalLongitude.to_numpy())
    return list(zip(frame.year.astype(int),frame.month.astype(int),yi,xi))


def pseudoabsence(presences, cache, bbox, radius_km, seed=42, max_draws=1000000):
    """Original-family policy: uniform lon/lat, ocean, observed depth range,
    minimum great-circle distance from every retained presence, 1:1. Dates
    permuted without replacement (explicit improvement: EXACT date frequencies).
    Rejection sampling bounded; never returns silently incomplete background.
    """
    w,s,e,n = bbox
    if not (-180<=w<e<=180 and -90<=s<n<=90): raise ValueError('Invalid bbox')
    if not 0<radius_km<20000: raise ValueError('Explicit positive radius required')
    occupied=set(cell_keys(presences,cache))
    tree = cKDTree(xyz(presences.decimalLatitude,presences.decimalLongitude))
    threshold = 2*np.sin(radius_km/(2*6371.0088))
    rng = np.random.default_rng(seed)
    dates = presences[['year','month','day']].iloc[rng.permutation(len(presences))].sort_values(['year','month'],kind='stable').reset_index(drop=True)
    accepted, draws = [], 0
    dmin,dmax = presences.profundidade.min(),presences.profundidade.max()
    while len(accepted)<len(presences) and draws<max_draws:
        # Each target date retained until a valid environmental candidate is found.
        k = len(accepted)
        target=dates.iloc[k]
        remaining=int(((dates.iloc[k:].year==target.year)&(dates.iloc[k:].month==target.month)).sum())
        count=min(max(256,min(4096,remaining*4)),max_draws-draws); draws+=count
        candidates = pd.DataFrame({'decimalLongitude':rng.uniform(w,e,count),
                                  'decimalLatitude':rng.uniform(s,n,count)})
        for col in ('year','month','day'): candidates[col] = dates.iloc[k][col]
        distances,_ = tree.query(xyz(candidates.decimalLatitude,candidates.decimalLongitude))
        candidates = candidates.loc[distances>=threshold].reset_index(drop=True)
        if candidates.empty: continue
        keys=cell_keys(candidates,cache)
        candidates=candidates.loc[[key not in occupied for key in keys]].reset_index(drop=True)
        if candidates.empty: continue
        candidates = cache.sample(candidates)
        good = np.isfinite(candidates[FEATURES]).all(axis=1) & candidates.profundidade.between(dmin,dmax) & (candidates.profundidade<0)
        if good.any():
            chosen=candidates.loc[good].head(remaining).copy()
            for j,(_,row) in enumerate(chosen.iterrows()):
                for col in ('year','month','day'):row[col]=dates.iloc[k+j][col]
                accepted.append(row.to_dict())
    if len(accepted)!=len(presences): raise ValueError(f'Insufficient background: {len(accepted)}/{len(presences)} after {draws} draws')
    result=pd.DataFrame(accepted); result['sp']=0; result['provider']='pseudoabsence-generated'
    return result, {'draws':draws,'ratio':1,'radius_km':radius_km,'depth_range_m':[dmin,dmax],
        'spatial_sampling':'uniform longitude/latitude, not equal-area',
        'dates':'permutation of retained presence dates without replacement',
        'distance':'great circle from all retained presences','seed':seed,
        'cell_conflicts':'reject presence-occupied raw physics nearest cell in same year/month'}


def train(args):
    def deny_network(event, arguments):
        if event in {'socket.connect','socket.connect_ex','socket.getaddrinfo','socket.sendto'}:
            raise RuntimeError('Training is offline: network operation blocked')
    sys.addaudithook(deny_network)
    schema=json.loads(Path(args.schema).read_text())
    out=Path(args.out).resolve(); ste=Path(args.ste).resolve()
    if out==ste or ste in out.parents: raise ValueError('Output must be outside deployed STE')
    if out.exists(): raise ValueError('Output directory must not exist; no overwrite')
    occurrence_path=Path(args.occurrences)
    complete=json.loads((occurrence_path.parent/'COMPLETE.json').read_text())
    if complete.get('csv_sha256')!=digest(occurrence_path):raise ValueError('Acquisition completion hash mismatch')
    df=pd.read_csv(occurrence_path)
    if 'species' not in df or not df.species.eq('Eubalaena australis').all():raise ValueError('Species identity mismatch')
    required=['decimalLatitude','decimalLongitude','year','month','day']
    if any(c not in df for c in required): raise ValueError('Missing occurrence columns')
    if df.empty or not np.isfinite(df[[c for c in required if c!='day']].to_numpy(float)).all(): raise ValueError('Invalid occurrence values')
    # Unknown day stays unknown in output; day1 only validates year/month for monthly sampling.
    dates=pd.to_datetime(df[['year','month','day']].fillna({'day':1}),errors='raise')
    if not dates.dt.year.between(2015,2024).all(): raise ValueError('Occurrence outside 2015-2024')
    w,s,e,n=args.bbox
    if not (df.decimalLatitude.between(s,n)&df.decimalLongitude.between(w,e)).all(): raise ValueError('Occurrences outside requested bbox')
    if df.duplicated(required).any(): raise ValueError('Deduplicate location/date before training')
    cache=MonthlyCache(schema)
    try:
        sampled=cache.sample(df)
        valid=np.isfinite(sampled[FEATURES]).all(axis=1)&(sampled.profundidade<0)
        pres=sampled.loc[valid].copy().reset_index(drop=True); pres['sp']=1
        if len(pres)<10: raise ValueError(f'Fewer than deployed software minimum10 complete ocean presences: {len(pres)}')
        pseudo,policy=pseudoabsence(pres,cache,args.bbox,args.radius_km,args.seed,args.max_draws)
    finally: cache.close()
    data=pd.concat([pres,pseudo],ignore_index=True)
    if not np.isfinite(data[FEATURES]).all().all(): raise ValueError('Nonfinite model inputs')
    out.mkdir(parents=True,exist_ok=False)
    sampled.assign(retained=valid).to_csv(out/'presence_coverage.csv',index=False)
    data.to_csv(out/'Variables_Eubalaena_australis_monthly.csv',index=False)
    trainer=ste/'04_modeling/modelo_marinho.py'
    metadata={'species':'Eubalaena australis','training_environment':'date-matched monthly2015-2024; NOT original daily',
      'environment_downloads':False,'nearest_ocean_snap':False,'bbox':args.bbox,'pseudoabsence_policy':policy,
      'occurrences_input':str(Path(args.occurrences).resolve()),'occurrences_sha256':digest(args.occurrences),
      'schema':schema,'trainer':str(trainer),'trainer_sha256':digest(trainer),
      'constant_predictor_warnings':[c for c in FEATURES if data[c].nunique()<2],
      'n_unknown_day':int(df.day.isna().sum()),'unknown_day_policy':'retained for date-matched monthly extraction; day not imputed in saved records',
      'n_input':len(df),'n_retained':len(pres),'n_excluded_missing_or_land':int((~valid).sum()),
      'retained_by_year_month':[{'year':int(y),'month':int(m),'n':int(n)} for (y,m),n in pres.groupby(['year','month']).size().items()],
      'depth_sha256':digest(schema['profundidade']['path']),
      'cache_files':{f:{'path':v['path'],'size_bytes':Path(v['path']).stat().st_size,'mtime_ns':Path(v['path']).stat().st_mtime_ns} for f,v in schema.items()},
      'validation':'deployed random split exploratory, not spatial; test-selected threshold optimistic',
      'status':'prepared; training not yet complete'}
    (out/'training_provenance.json').write_text(json.dumps(metadata,indent=2))
    sys.path.insert(0,str(ste))
    spec=importlib.util.spec_from_file_location('deployed_marine_trainer',trainer)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    if list(module.PREDITORES)!=FEATURES: raise ValueError('Deployed predictor contract changed')
    model=module.treinar(out/'Variables_Eubalaena_australis_monthly.csv',out/'modelo_rf_marinho',
                        'Eubalaena australis',seed=args.seed,n_estimators=500,ano=None)
    metadata.update(status='training_complete',model=str(model))
    profile={'especie':'Eubalaena australis','perfil':'oceano_operacional_historico',
      'pipeline':'run_pipeline_ocean.py','pipeline_field_role':'legacy inference compatibility identifier only; pipeline NOT executed',
      'actual_entrypoint':'04_modeling/modelo_marinho.py:treinar',
      'custom_training_method':'date-matched monthly2015-2024 from existing cache; not original daily extraction',
      'provenance_file':'training_provenance.json','validation':'random exploratory, not spatial'}
    (out/'metodologia_perfil.json').write_text(json.dumps(profile,indent=2))
    (out/'training_provenance.json').write_text(json.dumps(metadata,indent=2))
    print(json.dumps(metadata,indent=2))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    sub=p.add_subparsers(dest='command',required=True)
    a=sub.add_parser('inspect');a.add_argument('files',nargs='+')
    a=sub.add_parser('validate');a.add_argument('--schema',required=True)
    a=sub.add_parser('train')
    for flag in ('schema','occurrences','ste','out'): a.add_argument('--'+flag,required=True)
    a.add_argument('--bbox',type=float,nargs=4,required=True)
    a.add_argument('--radius-km',type=float,required=True,help='Original pipeline default10km; must choose explicitly')
    a.add_argument('--seed',type=int,default=42);a.add_argument('--max-draws',type=int,default=1000000)
    args=p.parse_args()
    if args.command=='inspect': print(json.dumps(inspect(args.files),indent=2,default=str))
    elif args.command=='validate':
        cache=MonthlyCache(json.loads(Path(args.schema).read_text()))
        try:print(json.dumps({'status':'cache_schema_valid','features':list(cache.arrays),'monthly_period':'2015-2024','no_environment_downloads':True}))
        finally:cache.close()
    else: train(args)

if __name__=='__main__': main()
