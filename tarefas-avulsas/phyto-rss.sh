#!/bin/sh
# Mostra consumo de memória dos processos Python, eventos de memória do contêiner e contagem de TIFFs.
set -e
python - <<'PY'
import os
import os
from pathlib import Path
print('memory events',Path('/sys/fs/cgroup/memory.events').read_text())
for p in Path('/proc').glob('[0-9]*/status'):
 t=p.read_text()
 if 'python' in t[:30]:print([l for l in t.splitlines() if l.startswith(('VmRSS:','State:','VmPeak:'))])
print('tiffs',len(list((Path(os.environ['DADOS_DIR'])/'work/tmp/tiff').rglob('*.tif'))),'products',len(list((Path(os.environ['DADOS_DIR'])/'state/publications').rglob('*.tif'))))
PY
