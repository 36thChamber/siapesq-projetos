"""Ensaio fora de produção dos três modelos anteriores ao balanceamento obrigatório."""
import json
from pathlib import Path
import sys

import joblib
import sklearn

base=Path(__file__).resolve().parent
sys.path.insert(0,str(base.parent/'ensaio/ste'))
from run_predicoes_diarias_ocean import prepare_layers, project_model
from comparar_historico import compare_day

if __name__=='__main__':
    if sklearn.__version__!='1.7.2': raise RuntimeError('Estes três estimadores foram salvos com sklearn 1.7.2')
    day='2026-11-17'
    acquired,ds,provenance=prepare_layers(base/'preditores'/day,[-90,-60,55,40],0.1,'negative-ocean')
    if acquired!=day:raise ValueError('Data de entrada divergente')
    models=sorted((base.parent/'recuperacao-siapreps/drive-modelagem').glob('*/modelo_rf_marinho/*.joblib'))
    if len(models)!=3:raise ValueError('A comparação exige os três arquivos de setembro')
    out=base/'alternativos-drive-setembro'
    for model in models:
        sid=model.parent.parent.name
        ev=json.loads(next(model.parent.glob('*_eval.json')).read_text());bundle=joblib.load(model)
        if ev['especie'].lower().replace(' ','_')!=sid:raise ValueError('Espécie divergente')
        if bundle['preditores']!=ev['preditores'] or bundle['faixa_treino']!=ev['faixa_treino']:raise ValueError('Metadados do treino inconsistentes')
        if bundle['faixa_treino']['profundidade'][1]>0:raise ValueError('Sinal de profundidade incompatível')
        original=(ev['especie'],sid,'peixes_marinhos',model,ev)
        # This intentionally skips only the production 1:1 training gate in this read-only comparison.
        project_model(original,ds,provenance,out,jobs=2)
    report=compare_day(base/'referencias'/day,out/day)
    report['finalidade']='diagnóstico histórico dos pesos não balanceados de setembro'
    (base/'comparacao-drive-setembro.json').write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
