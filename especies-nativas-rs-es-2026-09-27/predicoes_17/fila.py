"""Download grounded model files and run common species before unique ones locally."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import fcntl
import json
import os
import subprocess
import sys
import time
import requests

BASE = Path(__file__).resolve().parent
ROOT = Path('/workspace/tools-train-models-vireo')
lock = (BASE/'fila.lock').open('w')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
groups = json.loads((BASE.parent/'comparacao_listas.json').read_text())
models = {m['species']: m for m in json.loads((BASE.parent/'modelos_drive.json').read_text())}
queue = [(group, sp.replace(' ', '_')) for group, names in groups.items() for sp in names]
state = {}
state_file = BASE/'estado.json'
if state_file.exists():
    state = json.loads(state_file.read_text())

def record(species, **fields):
    state.setdefault(species, {}).update(fields)
    tmp = state_file.with_suffix('.tmp')
    tmp.write_text(json.dumps(state, indent=2, ensure_ascii=False))
    os.replace(tmp, state_file)

def say(message):
    print(time.strftime('%Y-%m-%d %H:%M:%S'), message, flush=True)

class DownloadForm(HTMLParser):
    def __init__(self):
        super().__init__()
        self.action = None
        self.fields = {}
        self.inside = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'form' and a.get('id') == 'download-form':
            self.action = a.get('action')
            self.inside = True
        if self.inside and tag == 'input' and a.get('name'):
            self.fields[a['name']] = a.get('value', '')
    def handle_endtag(self, tag):
        if tag == 'form':
            self.inside = False

def download(meta, dest):
    if dest.exists() and dest.stat().st_size == meta['size']:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        try:
            with requests.Session() as session:
                response = session.get('https://drive.google.com/uc',
                    params={'export': 'download', 'id': meta['id']}, stream=True, timeout=(30, 180))
                response.raise_for_status()
                if 'text/html' in response.headers.get('Content-Type', ''):
                    form = DownloadForm()
                    form.feed(response.text)
                    response.close()
                    if not form.action or urlparse(form.action).hostname not in {'drive.google.com', 'drive.usercontent.google.com'}:
                        raise RuntimeError('Drive não forneceu um formulário de download autorizado.')
                    response = session.get(form.action, params=form.fields, stream=True, timeout=(30, 180))
                    response.raise_for_status()
                if 'text/html' in response.headers.get('Content-Type', ''):
                    raise RuntimeError('Drive retornou HTML em vez do arquivo.')
                part = dest.with_suffix(dest.suffix+'.part')
                with part.open('wb') as output:
                    for chunk in response.iter_content(4*1024*1024):
                        output.write(chunk)
                response.close()
                if part.stat().st_size != meta['size']:
                    raise RuntimeError('Download incompleto: tamanho diferente do inventário Drive.')
                os.replace(part, dest)
                return
        except Exception:
            if attempt == 2:
                raise
            time.sleep(10*(attempt+1))

reuse = {
    'Acromyrmex_subterraneus': Path('/workspace/insetos-17-cenarios/2026-09-27/Acromyrmex_subterraneus'),
    'Vireo_chivi': Path('/workspace/vireo-chivi-anual/2026-09-11'),
}
for group, species in queue:
    model = models.get(species)
    if not model or not model.get('files'):
        record(species, group=group, status='pendente_pipeline_marinho', reason='Modelo marinho incompatível com os 17 cenários terrestres.')
        continue
    record(species, group=group, status='preparando_modelo')
    if species == 'Acromyrmex_crassispinus':
        record(species, warning='Relatório original reprova o modelo; incluído na nova lista explicitamente solicitada, sem afirmar aprovação.')
    try:
        model_dir = BASE/species/'modelo'
        model_dir.mkdir(parents=True, exist_ok=True)
        for meta in model['files']:
            name = 'predictor_climatologico.csv' if meta['name'].endswith('.csv') else f'rf_{species}_clima.sdm'
            dest = model_dir/name
            old = reuse.get(species)
            source = old/'modelo'/name if old else None
            if not dest.exists() and source and source.exists() and source.stat().st_size == meta['size']:
                os.link(source, dest)
            download(meta, dest)
        record(species, status='modelo_pronto')
        say(f'Modelo pronto: {species}')
    except Exception as exc:
        record(species, status='erro_download', error=str(exc))
        say(f'Falha no download de {species}: {exc}')

say('Aguardando o serviço insetos-17-cenarios liberar os recursos.')
while subprocess.run(['systemctl', '--user', 'is-active', '--quiet', 'insetos-17-cenarios']).returncode == 0:
    time.sleep(30)

for group, species in queue:
    if state[species]['status'] != 'modelo_pronto':
        continue
    model_dir = BASE/species/'modelo'
    output = BASE/species/'predicoes'
    if species == 'Acromyrmex_subterraneus':
        model_dir = reuse[species]/'modelo'
        existing = reuse[species]/'predicoes'
        if not output.exists():
            output.symlink_to(existing, target_is_directory=True)
    size = max(f['size'] for f in models[species]['files'])
    cores = 1 if size > 500_000_000 else 2
    command = [sys.executable, '-u', str(BASE/'executar_especie.py'), '--especie', species.replace('_', ' '),
               '--model_dir', str(model_dir), '--outdir', str(output), '--existentes', 'retomar']
    record(species, status='executando', command=command, started=time.strftime('%Y-%m-%dT%H:%M:%S'))
    say(f'INICIANDO {group}: {species}')
    with (BASE/'logs'/f'{species}.log').open('a') as log:
        result = subprocess.run(command, cwd=ROOT, env={**os.environ, 'PREDICT_CORES': str(cores)}, stdout=log, stderr=subprocess.STDOUT)
    record(species, status='concluido' if result.returncode == 0 else 'encerrado_com_falhas_ou_ressalvas',
           exit_code=result.returncode, finished=time.strftime('%Y-%m-%dT%H:%M:%S'))
    say(f'ENCERRADO {species}: código {result.returncode}; consulte o log individual.')
say('Fila encerrada. estado.json registra falhas e pendências; nenhum upload foi feito.')
