# Compara hashes de TIFFs antigos com o catálogo ativo e grava uma classificação dos candidatos. Não apaga TIFFs.
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict, Counter
import json, hashlib, os

h = Path.home()
src = Path(os.environ["SERIES_DIR"])
out = Path(os.environ["SAIDA_DIR"])
out.mkdir(mode=0o700, parents=True, exist_ok=True)
os.umask(0o077)
read = lambda p: json.loads(p.read_bytes())
s = read(src / "series.json")
cogs = read(Path(os.environ["CATALOGO_COG"]))["files"]
cur = {x[-1]["sha"] for x in s.values()}
current_etags = {r[j].strip('"') for r in cogs for j in ["source_etag", "etag"]}
cand = defaultdict(list)
for n, v in s.items():
    for x in v:
        if x["sha"] not in cur:
            cand[x["sha"]].append((n, x))


def inspect(k):
    rr = cand[k]
    p = Path(rr[0][1]["caminho"])
    md = hashlib.md5()
    sha = hashlib.sha256()
    with p.open("rb") as f:
        while buf := f.read(1 << 20):
            md.update(buf)
            sha.update(buf)
    assert k == sha.hexdigest()
    return k, {
        "md5": md.hexdigest(),
        "size": p.stat().st_size,
        "paths": sorted({r["caminho"] for n, r in rr}),
        "names": sorted({Path(r["caminho"]).name for n, r in rr} | {n for n, r in rr}),
        "is_catalog": md.hexdigest() in current_etags,
    }


with ThreadPoolExecutor(5) as ex:
    rows = dict(ex.map(inspect, cand))
protected_sha = {
    x["sha256"]
    for x in read(Path(os.environ["MANIFESTO_PUBLICADO"]))
    if x["etag"].strip('"') in current_etags
}
assert all(v["is_catalog"] for k, v in rows.items() if k in protected_sha)
(out / "candidatos.json").write_text(json.dumps(rows))
print(
    "hashes antigos e ativos",
    Counter(v["is_catalog"] for v in rows.values()),
    flush=True,
)
