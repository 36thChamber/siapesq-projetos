"""Agenda de uma plataforma. As duas instâncias usam o mesmo volume Linux persistente."""
import argparse
import contextlib
from datetime import date, datetime, time, timedelta
import fcntl
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
from time import sleep
from zoneinfo import ZoneInfo

FUSO = ZoneInfo("America/Sao_Paulo")
HORAS = {"siapreps": 14, "phytobloom": 16}


def abertura(dia, plataforma):
    return datetime.combine(dia, time(HORAS[plataforma]), FUSO)


def janela_atual(agora, plataforma):
    hoje = abertura(agora.date(), plataforma)
    return hoje if agora >= hoje else hoje - timedelta(days=1)


@contextlib.contextmanager
def trava(pasta, nome):
    with (pasta / nome).open("a+b") as arquivo:
        try:
            fcntl.flock(arquivo, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            yield None
            return
        yield arquivo


def banco(pasta, plataforma, agora):
    db = sqlite3.connect(pasta / (plataforma + ".sqlite"), isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)")
    db.execute("""CREATE TABLE IF NOT EXISTS dias (
        dia TEXT PRIMARY KEY, status TEXT NOT NULL, motivo TEXT, aviso TEXT, tentativa REAL DEFAULT 0)""")
    atual = janela_atual(agora, plataforma)
    db.execute("INSERT OR IGNORE INTO config VALUES ('primeira', ?)", ((atual.date()+timedelta(days=1)).isoformat(),))
    return db


def programar(db, plataforma, agora):
    primeira = db.execute("SELECT valor FROM config WHERE chave='primeira'").fetchone()[0]
    ultima = janela_atual(agora, plataforma).date().isoformat()
    if ultima < primeira:
        return
    anterior = db.execute("SELECT MAX(dia) FROM dias").fetchone()[0]
    pendente = date.fromisoformat(primeira) if anterior is None else date.fromisoformat(anterior) + timedelta(days=1)
    if pendente.isoformat() < ultima:
        fim = date.fromisoformat(ultima) - timedelta(days=1)
        motivo = f"Agenda indisponível entre {pendente:%d/%m/%Y} e {fim:%d/%m/%Y}. A última janela será recuperada."
        db.execute("INSERT OR IGNORE INTO dias(dia,status,motivo) VALUES (?,'falha',?)",(pendente.isoformat(),motivo))
    db.execute("INSERT OR IGNORE INTO dias (dia,status) VALUES (?, 'aguardando')", (ultima,))


def executar(db, plataforma, pasta, comando, agora):
    with trava(pasta,"processamento.lock") as lock:
        if lock is None:
            return
        # A previous process can only be marked interrupted after its inherited flock was released.
        db.execute("UPDATE dias SET status='falha',motivo='Processamento interrompido na VPS' WHERE status='executando'")
        row = db.execute("SELECT dia FROM dias WHERE status='aguardando' ORDER BY dia DESC LIMIT 1").fetchone()
        if not row:
            return
        dia = row['dia']
        db.execute("""UPDATE dias SET status='falha',motivo='Janela anterior ultrapassada durante indisponibilidade'
                      WHERE status='aguardando' AND dia < ?""", (dia,))
        db.execute("UPDATE dias SET status='executando' WHERE dia=?", (dia,))
        try:
            resultado = subprocess.run(comando, pass_fds=(lock.fileno(),), timeout=12*3600)
            if resultado.returncode:
                raise RuntimeError(f"Worker terminou com código {resultado.returncode}")
        except (OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
            db.execute("UPDATE dias SET status='falha',motivo=? WHERE dia=?", (str(exc),dia))
        else:
            db.execute("UPDATE dias SET status='sucesso' WHERE dia=?", (dia,))


def notificar(db, plataforma, agora):
    from aviso import enviar
    for row in db.execute("""SELECT * FROM dias WHERE status='falha' AND aviso IS NULL
                             AND tentativa <= ? ORDER BY dia""", (agora.timestamp()-300,)).fetchall():
        db.execute("UPDATE dias SET tentativa=? WHERE dia=?", (agora.timestamp(),row['dia']))
        try:
            recibo = enviar(plataforma, row['dia'], row['motivo'])
            if not recibo: raise ValueError("SMTP sem confirmação")
        except Exception as exc:
            print("Falha no envio de aviso:",type(exc).__name__,flush=True)
        else:
            db.execute("UPDATE dias SET aviso=? WHERE dia=?", (recibo,row['dia']))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("modo",choices=("iniciar","manual"))
    parser.add_argument("plataforma",choices=HORAS)
    parser.add_argument("comando",nargs="+")
    args=parser.parse_args()
    pasta=Path(os.environ.get("AGENDA_DIR","/agenda"))
    pasta.mkdir(parents=True,exist_ok=True)
    if args.modo=="manual":
        with trava(pasta,"processamento.lock") as lock:
            if lock is None:sys.exit("A VPS já executa uma análise")
            sys.exit(subprocess.run(args.comando,pass_fds=(lock.fileno(),)).returncode)
    with trava(pasta,args.plataforma+".scheduler.lock") as unico:
        if unico is None:sys.exit("Agenda já ativa")
        db=banco(pasta,args.plataforma,datetime.now(FUSO))
        while True:
            agora=datetime.now(FUSO)
            programar(db,args.plataforma,agora)
            executar(db,args.plataforma,pasta,args.comando,agora)
            notificar(db,args.plataforma,datetime.now(FUSO))
            sleep(20)
if __name__=="__main__":
    main()
