"""Consulta a primeira janela e os dias registrados em uma agenda SQLite."""
import argparse
import sqlite3
from contextlib import closing
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("banco", type=Path)
args = parser.parse_args()
uri = args.banco.resolve().as_uri() + "?mode=ro"
with closing(sqlite3.connect(uri, uri=True)) as db:
    primeira = db.execute("SELECT valor FROM config WHERE chave = ?", ("primeira",)).fetchone()
    print("Primeira janela", primeira[0] if primeira else None)
    print("Registros", db.execute("SELECT dia, status FROM dias ORDER BY dia").fetchall())
