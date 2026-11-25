#!/usr/bin/env python3
"""Two comparable Caretta monthly GIFs plus a side-by-side comparison."""

from __future__ import annotations

import importlib.util
import hashlib
import json
from pathlib import Path

import boto3
import numpy as np
from PIL import Image
import rasterio

BASE = Path(__file__).resolve().parent
CFG = json.loads((BASE / 'config.json').read_text())
PREFIX = CFG['prefix']
OUT = BASE / 'gifs'
SHARED = Path('/workspace/ec2-predictions-ocean-es/2026-10-05/scenarios17/gifs/create_gifs.py')
spec = importlib.util.spec_from_file_location('marine_gifs_shared', SHARED)
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
S3 = boto3.client('s3', region_name=CFG['bucket_region'])


def upload_gif(path: Path):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    key = f'{PREFIX}/Caretta_caretta/gifs/{path.name}'
    S3.upload_file(str(path), CFG['bucket'], key,
                   ExtraArgs={'ContentType': 'image/gif', 'Metadata': {'sha256': digest}})
    head = S3.head_object(Bucket=CFG['bucket'], Key=key)
    assert head['ContentLength'] == path.stat().st_size and head['Metadata']['sha256'] == digest
    return {'s3_key': key, 'sha256': digest}


def frame_for(method: str, number: int, short: str, month_name: str):
    scenario = f'mensal_{number:02d}_{short}'
    key = f'{PREFIX}/Caretta_caretta/{method}/{scenario}/Caretta_caretta_{scenario}_adequabilidade.tif'
    raw = S3.get_object(Bucket=CFG['bucket'], Key=key)['Body'].read()
    with rasterio.MemoryFile(raw).open() as ds:
        values = ds.read(1, masked=True).filled(np.nan)
        bounds = tuple(ds.bounds)
        assert ds.crs.to_string() == 'EPSG:4326' and np.isfinite(values).any()
        assert 0 <= np.nanmin(values) <= np.nanmax(values) <= 1
    subtitle = ('Um modelo anual treinado com registros de todos os meses; camada mensal CMEMS 2015–2024.'
                if method == 'mensal_modelo_anual' else
                'Modelo deste mês treinado com camadas de cada ano e mês (2015–2024); projeção na climatologia mensal.')
    frame = shared.render_frame('Caretta_caretta', values, bounds, month_name, subtitle)
    return frame, key


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    products = []
    frames_by_method = {}
    for method, filename in [('mensal_modelo_anual', 'Caretta_caretta_modelo_anual_meses.gif'),
                             ('mensal_modelo_mes', 'Caretta_caretta_12_modelos_mensais.gif')]:
        frames, keys = [], []
        for number, (short, name) in enumerate(zip(shared.MONTHS, shared.MONTH_NAMES), 1):
            frame, key = frame_for(method, number, short, name)
            frames.append(frame)
            keys.append(key)
            print(method, name, flush=True)
        path = OUT / filename
        shared.save_gif(frames, path, 900)
        products.append({'method': method, 'file': filename, 'frames': len(frames),
                         'bytes': path.stat().st_size, 'source_keys': keys,
                         **upload_gif(path)})
        frames_by_method[method] = frames
    side = []
    for first, second in zip(frames_by_method['mensal_modelo_anual'], frames_by_method['mensal_modelo_mes']):
        joined = Image.new('RGB', (first.width + second.width, first.height), 'white')
        joined.paste(first, (0, 0))
        joined.paste(second, (first.width, 0))
        side.append(joined)
    comparison = OUT / 'Caretta_caretta_comparacao_lado_a_lado.gif'
    shared.save_gif(side, comparison, 900)
    products.append({'method': 'side_by_side', 'file': comparison.name,
                     'frames': len(side), 'bytes': comparison.stat().st_size,
                     **upload_gif(comparison)})
    (OUT / 'manifest.json').write_text(json.dumps({'species': 'Caretta caretta',
                                                   'fixed_scale': [0, 1], 'products': products},
                                                  indent=2, ensure_ascii=False) + '\n')
    print('GIFS_DONE', [(x['file'], x['frames']) for x in products])


if __name__ == '__main__':
    main()
