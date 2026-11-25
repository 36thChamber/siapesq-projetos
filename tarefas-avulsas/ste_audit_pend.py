# Busca cópias locais de previsões, imagens e tabelas pendentes por tamanho e MD5 e grava o resultado em CSV.
import csv, collections, json, os, hashlib
from pathlib import Path

h = Path.home()
inv = {
    k: (s, t.strip('"'))
    for b, k, s, t, _ in json.load(open(os.environ["OBJETOS_JSON"]))
    if b == os.environ["BUCKET_CATALOGO"]
}
a = [
    r
    for r in csv.DictReader(open(os.environ["INVENTARIO_CSV"]))
    if r["arquivo"].split("/")[0]
    in ("predicoes_cenarios", "species-images", "species-table")
    and r["sem_copia_identificada"] == "1"
]
sizes = {inv[r["arquivo"]][0] for r in a}
matches = {}
for root, dirs, files in os.walk(os.environ["PROJETOS_DIR"]):
    dirs[:] = [
        x
        for x in dirs
        if x not in {".git", "node_modules", ".venv", "venv", "__pycache__", ".next"}
    ]
    for f in files:
        p = Path(root) / f
        if p.suffix.lower() not in {
            ".csv",
            ".jpg",
            ".jpeg",
            ".json",
            ".log",
            ".md",
            ".zip",
            ".gif",
        }:
            continue
        try:
            s = p.stat().st_size
            if s in sizes:
                matches[(s, hashlib.md5(p.read_bytes()).hexdigest())] = str(p)
        except OSError:
            pass
tot = collections.defaultdict(collections.Counter)
with open(os.environ["PENDENCIAS_CSV"], "w") as f:
    w = csv.writer(f)
    w.writerow(["arquivo_original", "bytes", "copia_local_correspondente"])
    for r in a:
        k = r["arquivo"]
        s, t = inv[k]
        m = matches.get((s, t), "")
        w.writerow([k, s, m])
        c = tot[k.split("/")[0]]
        c[bool(m)] += 1
        c["bytes" + str(bool(m))] += s
print(tot)
