#!/usr/bin/env python3
"""S3 readback and raster QA for 12 annual maps and both Caretta monthly sets."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import boto3
import numpy as np
import rasterio

BASE = Path(__file__).resolve().parent
CFG = json.loads((BASE / 'config.json').read_text())
BUCKET = CFG['bucket']
PREFIX = CFG['prefix']
S3 = boto3.client('s3', region_name=CFG['bucket_region'])
MONTHS = ('jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez')


def read(key):
    return S3.get_object(Bucket=BUCKET, Key=key)['Body'].read()


def check_marker(folder: str, expected_files: int):
    marker = json.loads(read(f'{PREFIX}/{folder}/complete.json'))
    assert marker['status'] == 'complete' and len(marker['files']) == expected_files
    records = []
    for item in marker['files']:
        key = item['key']
        assert key.startswith(f'{PREFIX}/{folder}/'), key
        content = read(key)
        digest = hashlib.sha256(content).hexdigest()
        assert len(content) == item['bytes'] and digest == item['sha256'], key
        record = {'key': key, 'bytes': len(content), 'sha256': digest}
        if key.endswith('_adequabilidade.tif'):
            with rasterio.MemoryFile(content).open() as ds:
                data = ds.read(1, masked=True).compressed()
                assert ds.crs.to_string() == 'EPSG:4326' and len(data) > 0
                assert np.isfinite(data).all() and 0 <= data.min() <= data.max() <= 1
                record['spatial_std'] = round(float(data.std()), 6)
                record['spatial_mean'] = round(float(data.mean()), 6)
        if key.endswith('_avaliacao.json'):
            evaluation = json.loads(content)
            assert evaluation['land_cells_predicted'] == 0
            record['extrapolation_fraction'] = evaluation['extrapolation_fraction']
            record['auc_teste'] = evaluation['training_evaluation']['auc_teste']
            record['tss_max_teste'] = evaluation['training_evaluation']['tss_max_teste']
        records.append(record)
    return {'folder': folder, 'files': records}


def main():
    annual = []
    for item in CFG['annual_species']:
        slug = item['species'].replace(' ', '_')
        result = check_marker(f'{slug}/anual_2015_2024', 5)
        result['species'] = item['species']
        annual.append(result)
        print('ANNUAL', item['species'], 'OK', flush=True)
    monthly = []
    for method, count in (('mensal_modelo_anual', 5), ('mensal_modelo_mes', 4)):
        for index, short in enumerate(MONTHS, 1):
            scenario = f'mensal_{index:02d}_{short}'
            result = check_marker(f'Caretta_caretta/{method}/{scenario}', count)
            result['scenario'] = scenario
            result['method'] = method
            monthly.append(result)
            print('MONTHLY', method, scenario, 'OK', flush=True)
    assert len(annual) == 12 and len(monthly) == 24
    report = {'status': 'complete', 'annual_count': len(annual), 'monthly_count': len(monthly),
              'objects_checked': sum(len(x['files']) for x in annual + monthly),
              'annual': annual, 'caretta_monthly': monthly}
    (BASE / 'audit.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print('AUDIT_COMPLETE', report['annual_count'], report['monthly_count'], report['objects_checked'])


if __name__ == '__main__':
    main()
