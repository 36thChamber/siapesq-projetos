#!/usr/bin/env python3
"""Sample each Caretta record from its year-month CMEMS field (2015-2024)."""

from pathlib import Path
import sys

import numpy as np
import pandas as pd
import xarray as xr

REPO = Path('/workspace/ocean-es-20261005/repo')
sys.path.insert(0, str(REPO / '03_environmental_processing'))
from captura_marinha import _amostra_snap  # noqa: E402
sys.path.insert(0, str(REPO / '05_utils'))
import batimetria  # noqa: E402

FIELDS = REPO / 'dados_saida/pred_marinho_cache/2015-2024'


def build(source: Path, target: Path) -> None:
    data = pd.read_csv(source, low_memory=False)
    data['year'] = pd.to_numeric(data['year'], errors='coerce')
    data['month'] = pd.to_numeric(data['month'], errors='coerce')
    data = data.loc[data.year.between(2015, 2024) & data.month.between(1, 12)].copy()
    assert len(data) > 0
    if 'profundidade' not in data:
        data['profundidade'] = batimetria.profundidade_pontos(
            data.decimalLatitude, data.decimalLongitude,
            REPO / 'dados_entrada/ocean_depth.nc')
    for col in ('sst', 'sss', 'chl', 'chl_log10'):
        data[col] = np.nan
    with xr.open_dataset(FIELDS / 'phy_2015-2024.nc') as phy, xr.open_dataset(FIELDS / 'chl_2015-2024.nc') as bio:
        for ds in (phy, bio):
            months = pd.DatetimeIndex(ds.time.values).to_period('M')
            assert len(months) == 120 and months[0] == pd.Period('2015-01') and months[-1] == pd.Period('2024-12')
            assert months.is_unique
        for (year, month), group in data.groupby(['year', 'month'], sort=True):
            year, month = int(year), int(month)
            index = (year - 2015) * 12 + month - 1
            lat = group.decimalLatitude.to_numpy(float)
            lon = group.decimalLongitude.to_numpy(float)
            data.loc[group.index, 'sst'] = _amostra_snap(phy.thetao.isel(time=index, depth=0), lat, lon)
            data.loc[group.index, 'sss'] = _amostra_snap(phy.so.isel(time=index, depth=0), lat, lon)
            data.loc[group.index, 'chl'] = _amostra_snap(bio.CHL.isel(time=index), lat, lon)
            print(f'{year}-{month:02d}: {len(group)} records sampled', flush=True)
    with np.errstate(invalid='ignore', divide='ignore'):
        data['chl_log10'] = np.log10(data.chl.where(data.chl > 0))
    assert 'profundidade' in data and 'sp' in data
    complete = data[['sst', 'sss', 'chl_log10', 'profundidade', 'sp']].notna().all(axis=1)
    counts = data.loc[complete].groupby(['month', 'sp']).size().unstack(fill_value=0)
    if not all((counts.get(v, 0) >= 30).all() for v in (0, 1)) or len(counts) != 12:
        raise ValueError(f'Insufficient complete monthly training records: {counts.to_dict()}')
    target.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(target, index=False)
    print(f'Saved {target}; complete records={int(complete.sum())}; per-month={counts.to_dict()}', flush=True)


if __name__ == '__main__':
    build(Path(sys.argv[1]), Path(sys.argv[2]))
