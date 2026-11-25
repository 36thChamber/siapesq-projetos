# Procura em arquivos locais e ZIPs cópias de dados e modelos que correspondam a tamanhos e hashes conhecidos.
import os, hashlib, json, collections, zipfile
from pathlib import Path

r = Path(os.environ["MANIFESTOS_DIR"])
ids = "camarao caranx_all cynoscion_all merluccius_hubbsi micropogonias_furnieri urophycis_brasiliensis".split()
rows = [
    i
    for name in ["s3-antigos.complete.json", "s3-novos.complete.json"]
    for i in json.load((r / name).open())["files"]
    if any("/" + s + "/" in i["name"] for s in ids)
    and i["name"].lower().endswith((".csv", ".sdm", ".joblib"))
]
expect = collections.defaultdict(set)
for row in rows:
    expect[row["bytes"]].add(row["sha256"])
skip = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    ".next",
    "Cookies",
    "Empyrean",
    "DerivedDataCache",
    "Intermediate",
    "Saved",
    "Saved Games",
}
roots = [Path(x) for x in os.environ["PASTAS_BUSCA"].split(os.pathsep) if x]
for base in roots:
    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if d not in skip and "blender" not in d.lower()]
        for name in files:
            p = Path(root) / name
            try:
                sz = p.stat().st_size
                if sz in expect and p.is_file():
                    with p.open("rb") as f:
                        sha = hashlib.file_digest(f, "sha256").hexdigest()
                    if sha in expect[sz]:
                        print("MATCH", p, sha, flush=True)
                if name.lower().endswith(".zip") and sz < 4 * 1024**3:
                    with zipfile.ZipFile(p) as z:
                        for j in z.infolist():
                            if j.file_size in expect:
                                sha = hashlib.sha256(z.read(j)).hexdigest()
                                if sha in expect[j.file_size]:
                                    print("ZIP", p, j.filename, sha, flush=True)
            except (FileNotFoundError, PermissionError, OSError, zipfile.BadZipFile):
                continue
    print("Concluído", base, flush=True)
