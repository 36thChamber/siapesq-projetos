"""Compara uma vez cada candidato CMEMS assim que a sua saída de treino for gravada."""
import csv
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
import time

from comparar_historico import compare_day, digest

base=Path(__file__).resolve().parent
platform=base.parent
version=platform/'recuperacao-siapreps/candidatos-cmems-diario-2026-11-23-v1'
species=('Urophycis brasiliensis','Micropogonias furnieri','Merluccius hubbsi')
day='2026-11-17'

def save_json(target, report):
    tmp=target.with_suffix('.tmp')
    tmp.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
    tmp.replace(target)

def examine(species_name, pending):
    sid=species_name.lower().replace(' ','_')
    folder=version/sid
    model_dir=folder/'modelo_rf_marinho'
    candidates=list(model_dir.glob('*.joblib'))
    if len(candidates)!=1 or not list(model_dir.glob('*_eval.json')):return
    pending[sid]='calculando';save_json(base/'estado-comparacoes-pendentes.json',pending)
    resultdir=base/'alternativos-cmems'/sid
    resultdir.mkdir(parents=True,exist_ok=True)
    cfg=resultdir/'modelo.csv'
    with cfg.open('w',newline='') as f:
        w=csv.writer(f);w.writerow(['species','species_id','profile','model_dir'])
        w.writerow([species_name,sid,'peixes_marinhos',str(model_dir)])
    with (resultdir/'rodada.log').open('a') as log:
        subprocess.run([sys.executable,'-u',str(platform/'ensaio/ste/run_predicoes_diarias_ocean.py'),
          '--models',str(cfg),'--predictors',str(base/'preditores'/day),'--outdir',str(resultdir),
          '--bbox','-90','-60','55','40','--resolucao','0.1','--depth-convention','negative-ocean','--jobs','2'],
          env={**os.environ,'OPENBLAS_NUM_THREADS':'1','OMP_NUM_THREADS':'1'},check=True,stdout=log,stderr=log)
    result=compare_day(base/'referencias'/day,resultdir/day)
    result['versao']=version.name;result['sha256_modelo']=digest(candidates[0])
    save_json(resultdir/'comparacao.json',result)
    pending[sid]='comparado'
    print(sid,'comparado',flush=True)

def main():
    status=base/'estado-comparacoes-pendentes.json'
    lock=(base/'comparacoes-pendentes.lock').open('a')
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    pending={}
    for sp in species:
        sid=sp.lower().replace(' ','_')
        previous=base/'alternativos-cmems'/sid/'comparacao.json'
        models=list((version/sid/'modelo_rf_marinho').glob('*.joblib'))
        already=previous.is_file() and len(models)==1 and json.loads(previous.read_text())['sha256_modelo']==digest(models[0])
        pending[sid]='comparado' if already else 'aguardando_treino'
    save_json(status,pending)
    while 'aguardando_treino' in pending.values():
        for sp in species:
            sid=sp.lower().replace(' ','_')
            if pending[sid]!='aguardando_treino':continue
            try:examine(sp,pending)
            except (ValueError,subprocess.CalledProcessError) as exc:
                pending[sid]='falha_'+type(exc).__name__;print(sid,pending[sid],flush=True)
            save_json(status,pending)
        if 'aguardando_treino' in pending.values():time.sleep(45)
    return int(any(s!='comparado' for s in pending.values()))

if __name__=='__main__':sys.exit(main())
