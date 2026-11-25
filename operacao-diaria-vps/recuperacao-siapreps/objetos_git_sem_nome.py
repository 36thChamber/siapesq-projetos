"""Procura pesos e entradas no armazenamento local do Git, inclusive blobs sem referências."""
import hashlib
import json
import os
import subprocess
from pathlib import Path

base = Path(__file__).resolve().parent
projects = base.parents[1]
missing = {"camarao", "caranx_all", "cynoscion_all", "merluccius_hubbsi", "micropogonias_furnieri", "urophycis_brasiliensis"}
by_size = {}
for generation in ("antigos", "novos"):
    path = next(projects.glob("ec2-analysis-preserv*/s3-" + generation + ".complete.json"))
    for item in json.loads(path.read_text())["files"]:
        name = Path(item["name"])
        if name.parts[1:2] and name.parts[1] in missing and name.suffix.lower() in {".csv", ".joblib", ".sdm"}:
            by_size.setdefault(item["bytes"], {})[item["sha256"]] = item["name"]
env = {**os.environ, "GIT_NO_LAZY_FETCH": "1", "GIT_TERMINAL_PROMPT": "0"}
stats = {}
matches = []
for repo in sorted(projects.iterdir()):
    if not (repo / ".git").exists():
        continue
    git = ["git", "-C", str(repo)]
    opts = ["cat-file", "--batch-all-objects", "--unordered", "--batch-check=%(objectname) %(objecttype) %(objectsize)"]
    result = subprocess.run(git + opts, env=env, capture_output=True, check=True)
    counts = {"blobs": 0, "mesmo_tamanho": 0}
    for row in result.stdout.splitlines():
        key, kind, size = row.split()
        if kind != b"blob":
            continue
        counts["blobs"] += 1
        if int(size) not in by_size:
            continue
        counts["mesmo_tamanho"] += 1
        data = subprocess.check_output(git + ["cat-file", "blob", key.decode()], env=env)
        sha = hashlib.sha256(data).hexdigest()
        if sha in by_size[int(size)]:
            name = by_size[int(size)][sha]
            dest = base / "fontes-outros-git" / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            matches.append({"repo": str(repo), "oid": key.decode(), "sha256": sha, "name": name})
    stats[repo.name] = counts
(base / "objetos-git-locais.json").write_text(json.dumps({"repos": stats, "coincidencias": matches}, indent=2))
print(len(stats), "repos", sum(s["blobs"] for s in stats.values()), "blobs", len(matches), "originais encontrados")
