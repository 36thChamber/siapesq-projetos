#!/bin/sh
# Conta alertas por estado e verifica quantos receberam confirmação na reconciliação.
set -e
python - <<'PY'
import os
from pathlib import Path
from collections import Counter
import json
root=Path(os.environ['DADOS_DIR'])/'state';records=[json.load(p.open()) for p in (root/'alerts').glob('*.json')]
print('grupos',Counter(r['status'] for r in records if r['request']['acquisition'][:10]>='2026-11-18'))
r=[json.load(p.open()) for p in (root/'alert-reconciliation').glob('*.json')]
print('recibos',len(r),'confirmados',sum(x['confirmed'] for x in r),'ids',len(set(i for x in r for i in x['record_ids'])))
PY
