import tempfile
import unittest
from datetime import datetime,timedelta
from pathlib import Path
from unittest.mock import patch

from agendador import FUSO,banco,executar,janela_atual,notificar,programar,trava


class TestAgenda(unittest.TestCase):
    def test_hora_brasilia(self):
        for plataforma,hora in (('siapreps',14),('phytobloom',16)):
            virada=datetime(2026,11,24,hora,tzinfo=FUSO)
            self.assertEqual(janela_atual(virada,plataforma),virada)
            self.assertEqual(janela_atual(virada-timedelta(seconds=1),plataforma),virada-timedelta(days=1))

    def test_concorrencia_reinicio_e_falha(self):
        with tempfile.TemporaryDirectory() as tmp:
            pasta=Path(tmp)
            hoje=datetime(2026,11,23,18,tzinfo=FUSO)
            amanha=hoje+timedelta(days=1)
            db=banco(pasta,'phytobloom',hoje)
            programar(db,'phytobloom',hoje)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM dias').fetchone()[0],0)
            programar(db,'phytobloom',amanha)
            with trava(pasta,'processamento.lock'):
                executar(db,'phytobloom',pasta,['false'],amanha)
                self.assertEqual(db.execute('SELECT status FROM dias').fetchone()[0],'aguardando')
            executar(db,'phytobloom',pasta,['false'],amanha)
            executar(db,'phytobloom',pasta,['true'],amanha)
            self.assertEqual(db.execute('SELECT status FROM dias').fetchone()[0],'falha')
            with patch('aviso.enviar',side_effect=[OSError(), 'recibo']) as email:
                notificar(db,'phytobloom',amanha)
                notificar(db,'phytobloom',amanha)
                notificar(db,'phytobloom',amanha+timedelta(minutes=6))
                notificar(db,'phytobloom',amanha+timedelta(minutes=12))
                self.assertEqual(email.call_count,2)
            db.close()
            db=banco(pasta,'phytobloom',amanha)
            self.assertEqual(db.execute('SELECT aviso FROM dias').fetchone()[0],'recibo')
            dia3=amanha+timedelta(days=1);programar(db,'phytobloom',dia3)
            db.execute("UPDATE dias SET status='executando' WHERE status='aguardando'")
            executar(db,'phytobloom',pasta,['true'],dia3)
            self.assertEqual(db.execute('SELECT status FROM dias ORDER BY dia DESC').fetchone()[0],'falha')

    def test_recupera_janela_e_notifica_periodo_de_indisponibilidade(self):
        with tempfile.TemporaryDirectory() as tmp:
            hoje=datetime(2026,11,23,18,tzinfo=FUSO)
            db=banco(Path(tmp),'phytobloom',hoje)
            programar(db,'phytobloom',hoje+timedelta(days=4))
            estados=[tuple(r) for r in db.execute('SELECT dia,status FROM dias ORDER BY dia')]
            self.assertEqual(estados,[('2026-11-24','falha'),('2026-11-27','aguardando')])
