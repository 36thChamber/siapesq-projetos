#!/bin/sh
# Executa uma rodada do PhytoBloom e testa se uma rodada sem imagens preserva a versão do catálogo.
set -e
export CODIGO_DIR="${CODIGO_DIR:?Informe CODIGO_DIR}"
export PYTHONPATH="$CODIGO_DIR${PYTHONPATH:+:$PYTHONPATH}"
set -eu
cd "${WORK_DIR:?Informe WORK_DIR}"
python "$CODIGO_DIR/agendador.py" manual phytobloom python "$CODIGO_DIR/rodada.py"
python - <<'PY'
from pathlib import Path
import subprocess,os
from rodada import cliente
c=cliente()
def index():
    h=c.head_object(Bucket=os.environ['DAILY_BUCKET'],Key='catalogo/publicado.json')
    return (h['ETag'],h['LastModified'])
before=index()
env=os.environ.copy()
env.update(ACOLITE_START_DATE='1900-01-01',ACOLITE_END_DATE='1900-01-03')
r=subprocess.run(['python',str(Path(os.environ['CODIGO_DIR'])/'agendador.py'),'manual','phytobloom','python',str(Path(os.environ['CODIGO_DIR'])/'rodada.py')],env=env,capture_output=True)
assert r.returncode!=0 and b'Sem aquisi' in r.stderr
assert before==index()
print('Falha sem cena, catálogo preservado',before[1].isoformat())
PY
