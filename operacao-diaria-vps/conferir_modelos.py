"""Confronta arquivos locais com o manifesto operacional antes de carregar modelos."""
import argparse
import hashlib
import json
import os
from pathlib import Path


def conferir(manifesto, raizes):
    arquivos = json.loads(manifesto.read_text())["files"]
    modelos = {a["sha256"]: a for a in arquivos if a["name"].endswith(".joblib")}
    if len(modelos) != 19:
        raise ValueError("O manifesto precisa identificar 19 modelos distintos")
    tamanhos = {a["bytes"] for a in modelos.values()}
    encontrados = {}
    for raiz in raizes:
        for pasta, dirs, nomes in os.walk(raiz):
            dirs[:] = [d for d in dirs if d not in {".git", "node_modules", ".venv", ".cache", ".next"}]
            for nome in nomes:
                p = Path(pasta, nome)
                if p.suffix.lower() != ".joblib" or p.stat().st_size not in tamanhos:
                    continue
                with p.open("rb") as f:
                    digest = hashlib.file_digest(f, "sha256").hexdigest()
                if digest in modelos:
                    encontrados.setdefault(digest, []).append(str(p))
    return [{"modelo": a["name"], "sha256": h, "copias": encontrados.get(h, [])} for h, a in modelos.items()]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifesto", type=Path)
    parser.add_argument("raizes", type=Path, nargs="+")
    args = parser.parse_args()
    print(json.dumps(conferir(args.manifesto, args.raizes), indent=2))
