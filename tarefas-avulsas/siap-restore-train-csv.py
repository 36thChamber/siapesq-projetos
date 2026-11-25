# Testa quatro formas de calcular o logaritmo da clorofila para reconstruir e gravar CSVs de treino idênticos aos originais.
import math, hashlib, os, io, json, sys, ctypes
import numpy as np, pandas as pd
from pathlib import Path
from decimal import Decimal

p = Path(os.environ["RECUPERACAO_DIR"])
m = {
    r["name"]: r
    for r in json.loads(Path(os.environ["MANIFESTO_ORIGINAL"]).read_text())["files"]
}
rawdir = p / "fontes-originais"
methods = {
    "numpy-vector": np.log10,
    "libm": lambda s: s.map(math.log10),
    "numpy-scalar": lambda s: s.map(np.log10),
    "correct": lambda s: s.map(
        lambda x: float(Decimal(x).log10()) if x > 0 else np.nan
    ),
}
for method, fn in methods.items():
    for f in rawdir.glob("*/original.csv"):
        sid = f.parent.name
        target = m["training/" + sid + "/training-ste.csv"]
        raw = pd.read_csv(f).rename(
            columns={"thetao": "sst", "so": "sss", "depth": "profundidade"}
        )
        raw["chl_log10"] = fn(
            pd.to_numeric(raw.CHL, errors="coerce").where(lambda a: a > 0)
        )
        raw["sst"] = pd.to_numeric(raw.sst, errors="coerce").where(
            lambda a: a.between(-5, 50)
        )
        raw["sss"] = pd.to_numeric(raw.sss, errors="coerce").where(lambda a: a >= 0)
        raw = raw.loc[pd.to_numeric(raw.profundidade, errors="coerce") < 0].copy()
        data = raw.to_csv(index=False).encode()
        match = hashlib.sha256(data).hexdigest() == target["sha256"]
        print(method, sid, len(data) - target["bytes"], match)
        if match:
            path = p / "pesos-originais" / target["name"]
            path.write_bytes(data)
