"""Finish the authorized annual Vireo prediction after acquisition succeeds."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import time

import numpy as np
import pandas as pd
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT

BASE = Path(__file__).resolve().parent
ROOT = Path('/workspace/tools-train-models-vireo')
CACHE = ROOT / 'env_data/raster_cache'
SCENARIO = ROOT / 'predict variables/anual_2015_2024'
OUT = BASE / 'saida'
SLUG = 'Vireo_chivi_anual_2015_2024'
SOURCES = {
    't2m': CACHE / 'brasil_250m/t2m_brasil.tif',
    'e': CACHE / 'brasil_250m/e_brasil.tif',
    'tp': CACHE / 'brasil_250m/tp_brasil.tif',
    'ndvi': CACHE / 'brasil_250m/ndvi_brasil.tif',
    'altitude': CACHE / 'brasil_1km/altitude_brasil_250m.tif',
    'awc': CACHE / 'brasil_1km/awc_brasil_250m.tif',
    'ocup_solo_mapbiomas': ROOT / 'env_data/predicao_7var_brasil_1km/ocup_solo_mapbiomas.tif',
}


def log(message):
    print(time.strftime('%Y-%m-%d %H:%M:%S'), message, flush=True)


def raster_stats(path):
    count = 0
    total = 0.0
    low, high = np.inf, -np.inf
    with rasterio.open(path) as src:
        assert src.count == 1 and src.crs.to_epsg() == 4326, path
        for _, window in src.block_windows(1):
            values = src.read(1, window=window, masked=True).compressed()
            assert not np.isinf(values).any(), path
            values = values[np.isfinite(values)]
            if values.size:
                count += values.size
                total += values.sum(dtype=np.float64)
                low = min(low, float(values.min()))
                high = max(high, float(values.max()))
        assert count > 0, f'Empty raster: {path}'
        return dict(file=path.name, valid_pixels=int(count), min=low, max=high,
                    mean=float(total/count), shape=list(src.shape), crs=str(src.crs),
                    resolution=list(src.res), bounds=list(src.bounds))


def ready():
    checks = [('era5.log', '[era5] salvo:'), ('solo_1km.log', '[solo] salvo:'),
              ('dem_1km.log', '[dem] salvo:'), ('ndvi_retomada.log', '[ndvi] salvo:')]
    return all((BASE / p).exists() and marker in (BASE / p).read_text(errors='replace')
               for p, marker in checks)


def run(command, logfile):
    log('Running ' + str(command[0]) + ' ' + str(command[1]))
    with (BASE / logfile).open('w') as stream:
        subprocess.run(command, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT, check=True)


def main():
    log('Waiting for successful completion of all acquisition jobs.')
    while not ready():
        time.sleep(20)
    log('All source generators completed. Validating inputs.')
    SCENARIO.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(exist_ok=True)
    stats = {}
    for name, source in SOURCES.items():
        stats[name] = raster_stats(source)
        target = SCENARIO / f'{name}.tif'
        if not target.exists():
            os.link(source, target)
    with rasterio.open(SOURCES['ocup_solo_mapbiomas']) as reference:
        domain = reference.read(1) > 0
        for name, source in SOURCES.items():
            with rasterio.open(source) as src, WarpedVRT(
                src, crs=reference.crs, transform=reference.transform,
                width=reference.width, height=reference.height,
                resampling=Resampling.nearest if name == 'ocup_solo_mapbiomas' else Resampling.bilinear,
            ) as vrt:
                arr = vrt.read(1, masked=True)
                valid = ~np.ma.getmaskarray(arr) & np.isfinite(arr.data)
                fraction = float((domain & valid).sum() / domain.sum())
                stats[name]['brazil_coverage_fraction'] = fraction
                assert fraction > .90, f'Insufficient coverage for {name}: {fraction:.3f}'
    (BASE / 'validacao_camadas.json').write_text(json.dumps(stats, indent=2))
    mean = OUT / f'{SLUG}_adequabilidade.tif'
    sd = OUT / f'{SLUG}_incerteza.tif'
    run(['Rscript', str(BASE/'run_predict_local.R'), str(BASE/'modelo'),
         'rf_Vireo_chivi_clima', str(SCENARIO), str(mean), str(sd), '', '100'], 'predicao.log')
    results = []
    for path in (mean, sd):
        info = raster_stats(path)
        assert info['shape'] == [4000, 4000], info
        assert 0 <= info['min'] <= info['max'] <= 1, info
        assert info['valid_pixels'] > .9 * int(domain.sum()), info
        info['sha256'] = hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()
        results.append(info)
    run([sys.executable, str(ROOT/'04_modeling/mapa_extrapolacao.py'),
         '--cenario', str(SCENARIO), '--treino', str(BASE/'modelo/predictor_climatologico.csv'),
         '--outdir', str(OUT), '--prefixo', SLUG+'_'], 'extrapolacao.log')
    run([sys.executable, str(ROOT/'04_modeling/teste_coerencia_ecologica.py'),
         '--mapa', str(mean), '--treino', str(BASE/'modelo/predictor_climatologico.csv'),
         '--json', str(OUT/f'{SLUG}_coerencia.json')], 'coerencia.log')
    (OUT/'validacao_predicao.json').write_text(json.dumps(results, indent=2))
    (BASE/'PREDICAO_VALIDADA').write_text(time.strftime('%Y-%m-%d %H:%M:%S'))
    log('Prediction and validation completed. Ready for Drive upload.')


if __name__ == '__main__':
    main()
