#!/usr/bin/env python3
"""Eight new marine annual maps plus two Caretta monthly methods on EC2."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import traceback

import boto3
import pandas as pd

BASE = Path('/workspace/marine-annual-monthly-20261026')
REPO = Path('/workspace/ocean-es-20261005/repo')
PY = Path('/workspace/ocean-es-20261005/.venv/bin/python')
OLD = Path('/workspace/ocean-es-20261005')
CFG = json.loads((BASE / 'config.json').read_text())
BUCKET = CFG['bucket']
PREFIX = CFG['prefix']
S3 = boto3.client('s3', region_name=CFG['bucket_region'])
sys.path.insert(0, str(REPO))
from marine_scenarios import MarineLayers, scenarios  # noqa: E402
from run_predicoes_cenarios_ocean import find_model, run_scenario  # noqa: E402
import naming  # noqa: E402


def utc():
    return datetime.now(timezone.utc).isoformat()


def sha(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def put_json(key, obj):
    S3.put_object(Bucket=BUCKET, Key=f'{PREFIX}/{key}',
                  Body=json.dumps(obj, indent=2, ensure_ascii=False, default=str).encode(),
                  ContentType='application/json')


def upload(path, key):
    path = Path(path)
    digest = sha(path)
    mime = 'image/tiff' if path.suffix.lower() in ('.tif', '.tiff') else 'text/csv' if path.suffix.lower() == '.csv' else 'application/json'
    full_key = f'{PREFIX}/{key}'
    S3.upload_file(str(path), BUCKET, full_key, ExtraArgs={'ContentType': mime, 'Metadata': {'sha256': digest}})
    head = S3.head_object(Bucket=BUCKET, Key=full_key)
    assert head['ContentLength'] == path.stat().st_size and head['Metadata']['sha256'] == digest
    return {'key': full_key, 'bytes': path.stat().st_size, 'sha256': digest}


def state_write(slug, state):
    state['updated_utc'] = utc()
    path = BASE / 'state' / f'{slug}.json'
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(state, indent=2, ensure_ascii=False, default=str))
    put_json(f'_run/{slug}.json', state)
    print(utc(), slug, state.get('stage'), state.get('scenario'), state['status'], flush=True)


def command_run(command, slug, stage):
    log = BASE / 'logs' / slug / f'{stage}.log'
    log.parent.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, 'OMP_NUM_THREADS': '8', 'OPENBLAS_NUM_THREADS': '8',
           'MKL_NUM_THREADS': '8', 'MPLBACKEND': 'Agg', 'PYTHONUNBUFFERED': '1'}
    with log.open('a', buffering=1) as stream:
        stream.write(f'{utc()} {command!r}\n')
        subprocess.run(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT, check=True)


def pipeline_stage(item, slug, dest, stage):
    checkpoint = BASE / 'checkpoints' / slug / f'{stage}.json'
    if checkpoint.exists():
        return json.loads(checkpoint.read_text())
    command = [str(PY), str(REPO / 'run_pipeline_ocean.py'), '--especie', item['species'],
               '--perfil', item['profile'], '--seed', str(CFG['seed']), '--ratio', '1.0',
               '--engine', 'ambos', '--outdir', str(dest), '--start', stage, '--stop', stage,
               '--janela', CFG['window'], '--max_workers', str(CFG['capture_workers_per_species']),
               '--data_dir', str(BASE / 'daily_cache' / slug)]
    if stage == 'occ':
        command += ['--occ_csv', str(BASE / 'inputs' / item['occurrence_file'])]
    command_run(command, slug, stage)
    result = {'stage': stage, 'finished_utc': utc()}
    if stage == 'captura':
        variables = list(dest.rglob('Variables_*.csv'))
        assert len(variables) == 1, (slug, variables)
        result['variables_file'] = str(variables[0])
    if stage == 'qc':
        verdicts = list(dest.rglob('QCVeredito_*.json'))
        assert len(verdicts) == 1, (slug, verdicts)
        verdict = json.loads(verdicts[0].read_text())['veredito']
        assert verdict in ('APTO', 'REVISAR'), (slug, verdict)
        result['verdict'] = verdict
    if stage == 'modelo':
        evaluation = json.loads((dest / 'modelo_rf_marinho' / f'rf_{slug}_marinho_eval.json').read_text())
        assert evaluation['balanceamento']['proporcao'] == '1:1'
        assert evaluation['n_presencas'] == evaluation['n_pseudo'] > 0
        assert (dest / 'modelo_rf_marinho' / f'rf_{slug}_marinho_R.rds').exists()
        result['evaluation'] = evaluation
    checkpoint.parent.mkdir(parents=True, exist_ok=True)
    checkpoint.write_text(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    return result


def layers():
    return MarineLayers(cache=OLD / 'scenarios17/layers',
                        cmems_cache=REPO / 'dados_saida/pred_marinho_cache/2015-2024',
                        bathymetry=REPO / 'dados_entrada/ocean_depth.nc',
                        catalog=OLD / 'scenarios17/marine_cmip6_catalog.csv')


def publish_scenario(slug, scenario, folder, local, metadata):
    marker = json.loads((local / scenario.name / 'complete.json').read_text())
    files = [upload(local / scenario.name / x['name'],
                    f'{slug}/{folder}/{x["name"]}') for x in marker['files']]
    remote = {**marker, 'files': files, 'finished_utc': utc(), **metadata}
    put_json(f'{slug}/{folder}/complete.json', remote)
    return {'scenario': scenario.name, 'files': len(files), 'marker': f'{PREFIX}/{slug}/{folder}/complete.json'}


def caretta_month_models(slug, dest, source, state):
    monthly_csv = BASE / 'month_models' / slug / 'training_year_month_layers_2015_2024.csv'
    if not monthly_csv.exists():
        variable_files = list(dest.rglob('Variables_*.csv'))
        assert len(variable_files) == 1
        command_run([str(PY), str(BASE / 'build_caretta_monthly_training.py'),
                     str(variable_files[0]), str(monthly_csv)], slug, 'sample_monthly_training')
    data = pd.read_csv(monthly_csv, low_memory=False)
    month_values = pd.to_numeric(data['month'], errors='coerce')
    completed = []
    for scenario in scenarios(groups=('mensal',)):
        month = scenario.month
        state.update(stage='treino_mensal', scenario=scenario.name)
        state_write(slug, state)
        subset = data.loc[month_values == month].copy()
        counts = {str(k): int(v) for k, v in subset.sp.value_counts().items()}
        if min(counts.get('0', 0), counts.get('1', 0)) < 30:
            raise ValueError(f'{scenario.name}: menos de 30 casos por classe antes do treino: {counts}')
        month_dir = BASE / 'month_models' / slug / scenario.name
        month_dir.mkdir(parents=True, exist_ok=True)
        csv = month_dir / 'training_same_calendar_month.csv'
        subset.to_csv(csv, index=False)
        model_dir = month_dir / 'modelo_rf_marinho'
        command = [str(PY), str(REPO / '04_modeling/modelo_marinho.py'), '--csv', str(csv),
                   '--outdir', str(model_dir), '--especie', 'Caretta caretta',
                   '--seed', str(CFG['seed']), '--n_estimators', '500']
        if not (model_dir / 'rf_Caretta_caretta_marinho.joblib').exists():
            command_run(command, slug, f'month_model_{month:02d}')
        _, model, evaluation = find_model('Caretta caretta', model_dir)
        output = BASE / 'outputs' / slug / 'monthly_trained'
        result = run_scenario('Caretta caretta', model, evaluation, scenario, source,
                              output, engine='python', jobs=8)
        assert result['status'] == 'complete'
        meta = {'profile': 'repteis_marinhos', 'training_method': 'one random forest per calendar month, trained on each record sampled from CMEMS layers of its own year and month (2015-2024)',
                'training_month': month, 'source_records_by_class': counts,
                'monthly_training_csv_sha256': sha(monthly_csv),
                'monthly_model_sha256': sha(model), 'monthly_model_evaluation': evaluation}
        record = publish_scenario(slug, scenario, f'mensal_modelo_mes/{scenario.name}', output, meta)
        completed.append(record)
        state['monthly_trained_completed'] = len(completed)
        state_write(slug, state)
    return completed


def train_species(item):
    species = item['species']
    slug = naming.slug_especie(species)
    prior = BASE / 'state' / f'{slug}.json'
    if prior.exists():
        saved = json.loads(prior.read_text())
        if saved.get('status') == 'complete' and saved.get('annual_completed'):
            return saved
    dest = REPO / '07 Executado por espécie' / slug / '2026-10-26'
    state = {'species': species, 'profile': item['profile'], 'status': 'running',
             'stage': 'init', 'started_utc': utc(), 'annual_completed': False}
    state_write(slug, state)
    try:
        for stage in ('occ', 'pseudo', 'captura', 'qc', 'modelo'):
            state.update(stage=stage, scenario=None)
            state_write(slug, state)
            result = pipeline_stage(item, slug, dest, stage)
            state.setdefault('stages', {})[stage] = result
            state_write(slug, state)
        model_dir = dest / 'modelo_rf_marinho'
        _, model, evaluation = find_model(species, model_dir)
        methodology = json.loads((dest / 'metodologia_perfil.json').read_text())
        assert methodology['perfil'] == item['profile'] and methodology['parametros']['ratio'] == 1
        source = layers()
        annual = scenarios()[0]
        out = BASE / 'outputs' / slug / 'annual_model'
        state.update(stage='predicao_anual', scenario=annual.name)
        state_write(slug, state)
        result = run_scenario(species, model, evaluation, annual, source, out, engine='ambos', jobs=8)
        assert result['status'] == 'complete'
        state['annual'] = publish_scenario(slug, annual, annual.name, out,
                                           {'profile': item['profile'], 'model_sha256': sha(model),
                                            'training_methodology': methodology})
        state['annual_completed'] = True
        state_write(slug, state)
        if item.get('monthly_comparison'):
            current = []
            for scenario in scenarios(groups=('mensal',)):
                state.update(stage='predicao_mensal_modelo_anual', scenario=scenario.name)
                state_write(slug, state)
                output = BASE / 'outputs' / slug / 'annual_trained_monthly'
                result = run_scenario(species, model, evaluation, scenario, source,
                                      output, engine='ambos', jobs=8)
                assert result['status'] == 'complete'
                current.append(publish_scenario(slug, scenario,
                               f'mensal_modelo_anual/{scenario.name}', output,
                               {'profile': item['profile'], 'training_method': 'one annual model projected on monthly climatologies',
                                'model_sha256': sha(model)}))
                state['monthly_current_completed'] = len(current)
                state_write(slug, state)
            state['monthly_current'] = current
            state['monthly_trained'] = caretta_month_models(slug, dest, source, state)
        state.update(status='complete', stage='done', scenario=None, finished_utc=utc())
    except Exception:
        state.update(status='failed', error=traceback.format_exc(), finished_utc=utc())
    finally:
        state_write(slug, state)
        for log in sorted((BASE / 'logs' / slug).glob('*.log')):
            try:
                upload(log, f'_run/logs/{slug}/{log.name}')
            except Exception as error:
                print('LOG_UPLOAD_FAILED', slug, log, error, flush=True)
    return state


def main():
    jobs = [x for x in CFG['annual_species'] if x['source'] == 'train']
    assert len(jobs) == 8
    summary = {'status': 'running', 'expected_new_species': 8,
               'expected_annual_species_total': 12, 'expected_caretta_monthly_each': 12,
               'started_utc': utc(), 'records': []}
    put_json('_run/summary.json', summary)
    with ThreadPoolExecutor(max_workers=CFG['parallel_species']) as pool:
        futures = {pool.submit(train_species, item): item['species'] for item in jobs}
        for future in as_completed(futures):
            try:
                result = future.result()
            except Exception:
                result = {'species': futures[future], 'status': 'failed', 'error': traceback.format_exc()}
            summary['records'].append(result)
            summary['completed_new_annual'] = sum(bool(x.get('annual_completed')) for x in summary['records'])
            put_json('_run/summary.json', summary)
    summary.update(status='complete' if all(x.get('status') == 'complete' for x in summary['records']) else 'finished_with_failures',
                   finished_utc=utc())
    put_json('_run/summary.json', summary)
    if summary['status'] == 'complete':
        subprocess.run(['sudo', 'shutdown', '-c'], check=False)
        subprocess.run(['sudo', 'shutdown', '-h', '+1', 'Marine batch complete'], check=False)
    else:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
