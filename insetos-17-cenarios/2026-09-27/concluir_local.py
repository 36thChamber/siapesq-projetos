"""Continue the authorized local batch; never upload or edit the spreadsheet."""
from pathlib import Path
import fcntl
import json
import os
import subprocess
import sys
import time

BASE = Path(__file__).resolve().parent
ROOT = Path('/workspace/tools-train-models-vireo')
lock = (BASE / 'fila_local.lock').open('w')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)

def running(pid, marker):
    try:
        return marker in Path(f'/proc/{pid}/cmdline').read_text()
    except FileNotFoundError:
        return False

def wait_for(pid, marker):
    while running(pid, marker):
        time.sleep(30)

def say(message):
    print(time.strftime('%Y-%m-%d %H:%M:%S'), message, flush=True)

say('Aguardando os processos locais já iniciados.')
wait_for(4212, 'executar_cenarios.py')
wait_for(3980, 'ndvi_mensal_robusto.py')
ndvi_log = BASE / 'logs/ndvi_mensal.log'
if '[ndvi-mensal] pronto:' not in ndvi_log.read_text():
    say('Retomando a preparação mensal com os checkpoints existentes.')
    with ndvi_log.open('a') as log:
        subprocess.run([sys.executable, '-u', str(BASE/'ndvi_mensal_robusto.py')],
                       cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, check=True)

sys.path.insert(0, str(ROOT/'03_environmental_processing'))
import montar_predict_variables as montar
montar.PREDITORES = ['t2m', 'e', 'tp', 'ndvi', 'altitude', 'awc', 'ocup_solo_mapbiomas']
montar.ESTATICAS = ['altitude', 'awc', 'ocup_solo_mapbiomas']
montar.AMPLITUDES = []
ready, missing = montar.montar(montar.SAIDA, [], False)
if len(ready) != 17 or missing:
    raise RuntimeError(f'Cenários incompletos: {missing}; prontos: {len(ready)}')

sys.path.insert(0, str(ROOT))
from prediction_state import validate_tif
results = {}
for species, cores in [('Acromyrmex_subterraneus', 8), ('Apis_mellifera', 2)]:
    say(f'Iniciando/retomando os 17 cenários de {species}.')
    output = BASE/species/'predicoes'
    with (BASE/'logs'/f'{species}_17_cenarios.log').open('a') as log:
        completed = subprocess.run([
            sys.executable, '-u', str(BASE/'executar_cenarios.py'),
            '--especie', species.replace('_', ' '),
            '--model_dir', str(BASE/species/'modelo'),
            '--outdir', str(output), '--existentes', 'retomar'],
            cwd=ROOT, env={**os.environ, 'PREDICT_CORES': str(cores)},
            stdout=log, stderr=subprocess.STDOUT)
    errors = []
    quality = {}
    for scenario in ready:
        prefix = output/scenario/f'{species}_{scenario}'
        for kind in ['adequabilidade', 'incerteza', 'extrapolacao']:
            path = Path(f'{prefix}_{kind}.tif')
            error = validate_tif(path)
            if error:
                errors.append({'file': str(path), 'error': str(error)})
        path = Path(f'{prefix}_coerencia.json')
        if path.exists():
            quality[scenario] = json.loads(path.read_text())
        else:
            errors.append({'file': str(path), 'error': 'relatório ausente'})
    results[species] = {'exit_code': completed.returncode,
                        'raster_and_report_errors': errors, 'coherence': quality}
    (BASE/'resultado_local.json').write_text(json.dumps(results, indent=2, ensure_ascii=False))
    say(f'{species}: verificação encerrada, {len(errors)} erros de arquivos; código do pipeline {completed.returncode}.')
say('Fila local encerrada. Consulte resultado_local.json para integridade e ressalvas científicas.')
