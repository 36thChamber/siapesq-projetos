#!/bin/sh
# Consulta downloads parciais, andamento e erros por área da última execução e estado das tarefas openEO.
set -e
python - <<'PY'
import os
from pathlib import Path
import json
b=Path(os.environ['DADOS_DIR'])
print('historical sizes',[(f.name,f.stat().st_size) for f in (b/'cenas-historicas').glob('*.part')])
for f in sorted((b/'state/runs').glob('*.json'),key=lambda v:v.stat().st_mtime)[-1:]:
 d=json.load(f.open());print('run',d.get('status'),[(r.get('id'),r.get('status'),r.get('stage'),r.get('error_type'),str(r.get('error_detail',''))[:180]) for r in d.get('aois',[])])
for f in sorted((b/'state/openeo').glob('*/job.json')):
 j=json.load(f.open());print('job',j['request']['aoi_id'],j.get('phase'),j.get('status'))
PY
