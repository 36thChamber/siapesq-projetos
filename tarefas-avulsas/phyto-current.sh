#!/bin/sh
# Mostra o estado e o período solicitado pelas tarefas openEO e conta alertas reservados para validação.
set -e
python - <<'PY'
import os
from pathlib import Path
import json
s=Path(os.environ['DADOS_DIR'])/'state'
for p in (s/'openeo').glob('*/job.json'):
 j=json.load(p.open());g=j['request']['graph'];print(j['request']['aoi_id'],j['status'],[(n['arguments']['temporal_extent']) for n in g.values() if n['process_id']=='load_collection'])
print('reservados',len(list((s/'alertas-em-validacao').glob('*.json'))))
PY
