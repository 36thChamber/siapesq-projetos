#!/bin/sh
# Mostra nomes e tamanhos de arquivos de processamento e consulta o relatório da reexecução.
set -e
python - <<'PY'
import os
from pathlib import Path
import json
root=Path(os.environ['DADOS_DIR'])
for name in ['state/publications','state/runs','state/openeo','work/out','cenas-historicas']:
 print(name,[(p.name,p.stat().st_size) for p in list((root/name).glob('*'))[-12:]])
for p in (root/'state').glob('replay.json'):
 d=json.load(p.open());print(d['matches'],d['alerts_reused'])
PY
