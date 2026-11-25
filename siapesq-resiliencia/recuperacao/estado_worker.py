"""Executado no contêiner de agenda. Gera um arquivo sem interferir nos jobs."""
import fcntl
from pathlib import Path
import sqlite3
import sys
import zipfile

root = Path('/dados/state')
with Path('/agenda/processamento.lock').open('rb') as lock:
    fcntl.flock(lock, fcntl.LOCK_SH | fcntl.LOCK_NB)
    source = sqlite3.connect('file:/agenda/phytobloom.sqlite?mode=ro', uri=True)
    memory = sqlite3.connect(':memory:')
    source.backup(memory)
    source.close()
    with zipfile.ZipFile(sys.argv[1], 'w', compression=zipfile.ZIP_DEFLATED) as target:
        target.writestr('agenda/phytobloom.sqlite', memory.serialize())
        for document in sorted(root.rglob('*')):
            if document.is_symlink() or not document.is_file():
                continue
            if document.suffix == '.json' or document.name == 'pending-publication':
                target.write(document, 'state/' + document.relative_to(root).as_posix())
    memory.close()
