# Consulta a implantação mais recente de cada aplicação em arquivos exportados.
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser(
    description="Resume a implantação mais recente em respostas JSON de application.one."
)
parser.add_argument("arquivos", type=Path, nargs="+")
for path in parser.parse_args().arquivos:
    app = json.loads(path.read_text())
    latest = max(app["deployments"], key=lambda row: row["createdAt"], default=None)
    if latest:
        print(
            app["name"],
            latest["status"],
            (latest.get("title") or "").partition("\n")[0],
            [row["host"] for row in app.get("domains", [])],
        )
    else:
        print(app["name"], "sem implantação")
