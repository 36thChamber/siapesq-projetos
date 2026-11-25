#!/usr/bin/env python3
"""Project explicit STE ocean models onto daily SIAPRESP predictors, without training."""
from __future__ import annotations

import argparse
import csv
from datetime import date
import fcntl
import json
import os
from pathlib import Path
import re
import tempfile
import uuid

import joblib
import numpy as np
import pandas as pd
import rasterio
import xarray as xr

from marine_scenarios import atomic_json, sha, surface, PREDICTORS
from perfil import carregar_perfil, selecionar_perfil
from run_predicoes_cenarios_ocean import find_model, forest_moments, validate_map, write_tif

UNITS = {
    'thetao': {'degrees_C', 'degree_Celsius', 'degree_C', 'degC'},
    'so': {'1e-3', '0.001', 'PSU', 'psu'},
    'CHL': {'mg m-3', 'mg/m^3', 'mg m^-3', 'milligram m-3'},
}


def read_field(path, variable, day=None):
    """Read geographic NetCDF or a single-band WGS84 static bathymetry TIFF."""
    if path.suffix.lower() in {'.tif', '.tiff'}:
        if variable != 'depth':
            raise ValueError('Somente a batimetria aceita GeoTIFF')
        with rasterio.open(path) as raster:
            if raster.crs != rasterio.crs.CRS.from_epsg(4326) or raster.count != 1:
                raise ValueError('Batimetria TIFF exige EPSG:4326 e uma banda')
            if raster.transform.b or raster.transform.d:
                raise ValueError('Batimetria TIFF rotacionada não suportada')
            array = xr.DataArray(raster.read(1, masked=True).astype(float).filled(np.nan),
                                 dims=('lat', 'lon'), coords={
                                     'lat': raster.transform.f + (np.arange(raster.height) + .5) * raster.transform.e,
                                     'lon': raster.transform.c + (np.arange(raster.width) + .5) * raster.transform.a,
                                 })
    else:
        with xr.open_dataset(path) as dataset:
            candidates = [k for k in dataset.data_vars if k.casefold() == variable.casefold()]
            if variable == 'depth' and not candidates:
                candidates = [k for k in dataset.data_vars if k.lower() in {'elevation', 'bathymetry', 'profundidade', '__xarray_dataarray_variable__'}]
            if len(candidates) != 1:
                raise ValueError(f'Variável {variable} ausente/ambígua em {path}')
            array = dataset[candidates[0]]
            if variable == 'depth' and 'band' in array.dims:
                if array.sizes['band'] != 1:
                    raise ValueError('Batimetria exige uma única banda')
                array = array.isel(band=0, drop=True)
            if variable in UNITS and array.attrs.get('units') not in UNITS[variable]:
                raise ValueError(f'Unidade inesperada de {variable}: {array.attrs.get("units")}')
            if variable == 'depth' and array.attrs.get('units', 'm') not in {'m', 'meter', 'meters', 'metre', 'metres'}:
                raise ValueError('Batimetria deve estar em metros')
            if 'time' in array.dims:
                if array.sizes['time'] != 1 or pd.Timestamp(array.time.values[0]).date().isoformat() != day:
                    raise ValueError(f'{variable}: exige uma única data igual ao manifesto')
                array = array.isel(time=0, drop=True)
            array = array.load()
    array = surface(array)
    if set(array.dims) != {'lat', 'lon'}:
        raise ValueError(f'{variable}: grade deve ser 2D')
    for coord in ('lat', 'lon'):
        values = array[coord].values
        if len(values) < 2 or not np.isfinite(values).all() or np.any(np.diff(values) <= 0):
            raise ValueError(f'{variable}: coordenadas {coord} inválidas')
    return array.transpose('lat', 'lon')


def daily_inputs(directory):
    directory = Path(directory).resolve()
    manifest = json.loads((directory / 'manifest.json').read_text())
    day = date.fromisoformat(manifest['data_date']).isoformat()
    paths = {}
    for name in ('thetao', 'so', 'CHL', 'depth'):
        path = (directory / manifest['files'][name]).resolve()
        if not path.is_relative_to(directory) or not path.is_file():
            raise ValueError(f'Arquivo diário inválido: {name}')
        paths[name] = path
    return day, manifest, paths


def prepare_layers(directory, bbox, resolution, depth_convention):
    day, manifest, paths = daily_inputs(directory)
    west, south, east, north = bbox
    if not (-180 <= west < east <= 180 and -90 <= south < north <= 90 and resolution > 0):
        raise ValueError('BBox/resolução inválidos')
    lat = np.arange(south, north + 1e-9, resolution)
    lon = np.arange(west, east + 1e-9, resolution)
    if len(lat) < 2 or len(lon) < 2 or len(lat) * len(lon) > 5_000_000:
        raise ValueError('Grade exige ao menos 2 células por eixo e no máximo 5 milhões de células')
    fields = {}
    for source, target in [('thetao', 'sst'), ('so', 'sss'), ('CHL', 'chl'), ('depth', 'profundidade')]:
        array = read_field(paths[source], source, day)
        if source == 'depth':
            if min(lat) < float(array.lat.min()) or max(lat) > float(array.lat.max()) or min(lon) < float(array.lon.min()) or max(lon) > float(array.lon.max()):
                raise ValueError('Batimetria não cobre a grade solicitada')
            if depth_convention == 'positive-down':
                array = -array
            array = array.interp(lat=lat, lon=lon, method='nearest')
        else:
            array = array.interp(lat=lat, lon=lon)
        fields[target] = array
    fields['sss'] = fields['sss'].where(fields['sss'] >= 0)
    fields['chl_log10'] = np.log10(fields.pop('chl').where(lambda a: a > 0))
    dataset = xr.Dataset({k: fields[k] for k in PREDICTORS})
    provenance = {
        'schema': 1, 'data_date': day, 'bbox': list(bbox), 'resolution': resolution,
        'depth_convention_input': depth_convention,
        'predictors': list(PREDICTORS), 'chlorophyll_transform': 'log10(CHL), CHL > 0',
        'interpolation': 'linear dynamic fields; nearest static depth; no extrapolation',
        'datasets': manifest.get('datasets', {}),
        'input_sha256': {k: sha(v) for k, v in paths.items()},
        'manifest_sha256': sha(Path(directory) / 'manifest.json'),
    }
    return day, dataset, provenance


def load_models(config):
    config = Path(config).resolve()
    with config.open(newline='') as stream:
        rows = list(csv.DictReader(stream))
    if not rows:
        raise ValueError('CSV de modelos vazio')
    seen = set()
    models = []
    for row in rows:
        species, species_id = row['species'].strip(), row['species_id'].strip()
        if not re.fullmatch(r'[a-z0-9]+(?:_[a-z0-9]+)*', species_id) or species_id in seen:
            raise ValueError(f'species_id inválido/duplicado: {species_id}')
        seen.add(species_id)
        if not row['model_dir'].strip():
            raise ValueError(f'{species}: model_dir explícito obrigatório')
        profile = selecionar_perfil(species, row['profile'].strip())
        if carregar_perfil(profile).get('pipeline') != 'ocean':
            raise ValueError(f'{species}: exige perfil oceânico')
        folder, model, evaluation = find_model(species, config.parent / row['model_dir'])
        methodology = json.loads((folder.parent / 'metodologia_perfil.json').read_text())
        if methodology.get('perfil') != profile or methodology.get('pipeline') != 'run_pipeline_ocean.py':
            raise ValueError(f'{species}: metodologia do modelo incompatível')
        if evaluation.get('especie', species) != species.replace(' ', '_') and evaluation.get('especie', species) != species:
            raise ValueError(f'{species}: avaliação de outra espécie')
        models.append((species, species_id, profile, model, evaluation))
    return models


def project_model(entry, dataset, provenance, output_root, jobs=2, existing='retomar'):
    root = Path(output_root)
    root.mkdir(parents=True, exist_ok=True)
    with (root / f'.{entry[1]}-{provenance["data_date"]}.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise ValueError(f'Outra execução ativa para {entry[1]}') from exc
        return _project_model(entry, dataset, provenance, output_root, jobs, existing)


def _project_model(entry, dataset, provenance, output_root, jobs, existing):
    species, species_id, profile, model_path, evaluation = entry
    day = provenance['data_date']
    final = Path(output_root) / day / species_id
    signature = {'model_sha256': sha(model_path), 'evaluation': evaluation,
                 'profile': profile, 'layers': provenance, 'implementation': sha(Path(__file__)),
                 'shared_code_sha256': {name: sha(Path(__file__).parent / name) for name in
                                        ('run_predicoes_cenarios_ocean.py', 'marine_scenarios.py', 'perfil.py')},
                 'uncertainty': 'population SD between RF tree probabilities; not bootstrap SD'}
    marker = final / 'complete.json'
    if final.exists() and existing != 'overwrite':
        if not marker.exists():
            raise ValueError(f'Saída sem marcador STE; preservada: {final}')
        previous = json.loads(marker.read_text())
        if previous['signature'] != signature:
            raise ValueError(f'Modelo/entradas mudaram; use overwrite explicitamente: {final}')
        if not previous.get('files'):
            raise ValueError(f'Marcador sem arquivos: {final}')
        for item in previous['files']:
            path = final / item['name']
            if not path.is_file() or sha(path) != item['sha256']:
                raise ValueError(f'Saída incompleta/corrompida; use overwrite: {path}')
            if path.suffix == '.tif':
                validate_map(path)
        return {'species_id': species_id, 'status': 'complete', 'reused': True}
    bundle = joblib.load(model_path)
    predictors = bundle['preditores']
    if len(predictors) != 4 or set(predictors) != set(PREDICTORS):
        raise ValueError('Modelo exige os quatro preditores do perfil oceânico')
    ranges = bundle.get('faixa_treino', evaluation.get('faixa_treino'))
    if not ranges or any(k not in ranges for k in predictors):
        raise ValueError('Modelo sem faixas de treino')
    features = np.column_stack([dataset[k].values.ravel() for k in predictors]).astype('float32')
    valid = np.isfinite(features).all(axis=1) & (dataset.profundidade.values.ravel() < 0)
    indices = np.flatnonzero(valid)
    if not len(indices):
        raise ValueError('Nenhuma célula oceânica válida')
    mean, sd, extrap = [np.full(len(features), np.nan) for _ in range(3)]
    for start in range(0, len(indices), 16384):
        ids = indices[start:start + 16384]
        mean[ids], sd[ids] = forest_moments(bundle['modelo'], features[ids], jobs)
        extrap[ids] = np.any(np.column_stack([
            (features[ids, i] < ranges[k][0]) | (features[ids, i] > ranges[k][1])
            for i, k in enumerate(predictors)]), axis=1)
    final.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f'.{species_id}-', dir=final.parent) as tmp:
        staging = Path(tmp)
        prefix = f'{species_id}_rf_{day}'
        for suffix, values in [('mean', mean), ('sd', sd), ('extrapolacao', extrap)]:
            write_tif(staging / f'{prefix}_{suffix}.tif', values.reshape(dataset.profundidade.shape), dataset.lat.values, dataset.lon.values)
        atomic_json(staging / 'methodology.json', {
            'species': species, 'signature': signature, 'valid_ocean_cells': len(indices),
            'extrapolation_fraction': float(extrap[valid].mean()),
            'validation': 'Operational projection, not ecological approval. Training split is random, not spatial.',
        })
        files = [{'name': p.name, 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(staging.iterdir())]
        atomic_json(staging / 'complete.json', {'status': 'complete', 'signature': signature, 'files': files})
        if final.exists():
            backup = Path(output_root) / '_backups' / day / species_id / uuid.uuid4().hex
            backup.parent.mkdir(parents=True, exist_ok=True)
            os.replace(final, backup)
        os.replace(staging, final)
        # TemporaryDirectory tolerates the already moved staging directory.
    return {'species_id': species_id, 'status': 'complete', 'reused': False,
            'extrapolation_fraction': float(extrap[valid].mean())}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--models', required=True, help='CSV: species,species_id,profile,model_dir')
    parser.add_argument('--predictors', required=True, help='Pasta diária com manifest.json do downloader SIAPRESP')
    parser.add_argument('--outdir', required=True, help='Destino separado para validação antes de publicar')
    parser.add_argument('--bbox', nargs=4, type=float, required=True, metavar=('W', 'S', 'E', 'N'))
    parser.add_argument('--resolucao', type=float, default=.1)
    parser.add_argument('--depth-convention', choices=('negative-ocean', 'positive-down'), required=True)
    parser.add_argument('--jobs', type=int, default=2)
    parser.add_argument('--existentes', choices=('retomar', 'overwrite'), default='retomar')
    parser.add_argument('--dry_run', action='store_true')
    args = parser.parse_args(argv)
    if not 1 <= args.jobs <= 64:
        parser.error('jobs deve ser 1..64')
    entries = load_models(args.models)
    day, _, _ = daily_inputs(args.predictors)
    print(f'{day}: {len(entries)} modelos STE existentes; sem treino ou download')
    for entry in entries:
        print(f'{entry[1]} | {entry[2]} | {entry[3]}')
    if args.dry_run:
        print('Dry-run: metadados/modelos conferidos; sem ler grades nem escrever saídas.')
        return 0
    day, dataset, provenance = prepare_layers(args.predictors, args.bbox, args.resolucao, args.depth_convention)
    records = []
    for entry in entries:
        try:
            result = project_model(entry, dataset, provenance, args.outdir, args.jobs, args.existentes)
        except Exception as exc:
            result = {'species_id': entry[1], 'status': 'failed', 'error': f'{type(exc).__name__}: {exc}'}
        records.append(result)
        print(json.dumps(result), flush=True)
        atomic_json(Path(args.outdir) / day / 'run_summary.json', {'data_date': day, 'expected': len(entries), 'records': records})
    return int(any(r['status'] != 'complete' for r in records))


if __name__ == '__main__':
    raise SystemExit(main())
