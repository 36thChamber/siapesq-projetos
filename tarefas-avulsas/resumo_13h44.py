# Gera outra versão do inventário de cópias usando um levantamento parcial do Drive relativo à Copel.
from pathlib import Path
import csv, json, sqlite3, collections, os, time

h = Path(os.environ["ESTADO_COPIA"])
a = json.loads((h / "inventory.json").read_text())
v = json.load(open(os.environ["INVENTARIO_VPS"]))
marks = set((Path(os.environ["CHAVES_ESPELHO"])).read_text().splitlines())
db = {
    (b, k): (s, t, m)
    for b, k, s, t, _, m in sqlite3.connect(
        "file:" + str(h / "files.sqlite") + "?mode=ro", uri=True
    ).execute("select * from files")
}


def tree(path):
    out = {}
    for root, dirs, files in os.walk(path):
        for name in files:
            f = Path(root) / name
            out[str(f.relative_to(path))] = f.stat()
    return out


local = tree(Path(os.environ["COPIA_LOCAL"]))
cache = tree(Path(os.environ["CACHE_DRIVE"]))
d = {
    os.environ["BUCKET_DRIVE"] + "/" + r["Path"]: r["Size"]
    for r in json.load(open(os.environ["INVENTARIO_DRIVE"]))
}
c = collections.defaultdict(collections.Counter)
with open(os.environ["INVENTARIO_CSV"], "w") as f:
    w = csv.writer(f)
    w.writerow(
        [
            "bucket",
            "arquivo",
            "bytes",
            "Drive_mesmo_tamanho",
            "local_verificado",
            "VPS_catalogo_mesmo_tamanho",
            "local_ou_cache_mesmo_tamanho",
            "sem_copia_identificada",
        ]
    )
    for b, k, s, t, _ in a:
        if k.endswith("/"):
            continue
        key = b + "/" + k
        l = local.get(key)
        verified = l and db.get((b, k)) == (s, t, l.st_mtime_ns) and l.st_size == s
        flags = [
            d.get(key) == s,
            bool(verified),
            b == os.environ["BUCKET_CATALOGO"] and k in marks and v.get(k) == s,
            any(st and st.st_size == s for st in (l, cache.get(key))),
        ]
        flags.append(not any(flags))
        w.writerow([b, k, s, *map(int, flags)])
        for i, flag in enumerate([True, *flags, not flags[0], not any(flags[:3])]):
            if flag:
                c[b][i] += s
                c[b][str(i)] += 1
for b, row in c.items():
    print(b, [(row[str(i)], round(row[i] / 1e9, 4)) for i in range(8)])
