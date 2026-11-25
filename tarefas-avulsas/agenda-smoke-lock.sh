#!/bin/sh
# Simula concorrência e falha no agendador para testar o bloqueio entre plataformas e o envio de um único alerta.
set -e
export CODIGO_DIR="${CODIGO_DIR:?Informe CODIGO_DIR}"
export PYTHONPATH="$CODIGO_DIR${PYTHONPATH:+:$PYTHONPATH}"
python - <<'PY'
import os,sys
from agendador import *
import tempfile
from unittest.mock import patch
p=Path(os.environ['AGENDA_DIR'])
with tempfile.TemporaryDirectory(dir=p) as tmp:
    dir=Path(tmp)
    with trava(p,'processamento.lock'):
        # independent process uses the other platform's guard in the same mounted volume
        r=subprocess.run(['python',str(Path(os.environ['CODIGO_DIR'])/'agendador.py'),'manual','siapreps','true'],capture_output=True)
        assert r.returncode and 'já executa'.encode() in r.stderr
    db=banco(dir,'phytobloom',datetime(2026,11,23,18,tzinfo=FUSO))
    hora=datetime(2026,11,24,16,tzinfo=FUSO)
    programar(db,'phytobloom',hora)
    executar(db,'phytobloom',dir,['false'],hora)
    with patch('aviso.enviar',return_value='teste') as send:
        notificar(db,'phytobloom',hora);notificar(db,'phytobloom',hora)
        assert send.call_count==1
    assert db.execute("SELECT status,aviso FROM dias").fetchone()['aviso']=='teste'
    print('Bloqueio entre plataformas e aviso único em falha confirmados')
PY
