"""Reconstrói as tabelas de outubro. Para a etapa log10, reproduza a CPU Skylake Server."""
import argparse
import hashlib
import io
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

base = Path(__file__).resolve().parent
ste = base.parent / "ensaio/ste"
sys.path.insert(0, str(ste))
from balanceamento import preparar_treino, dividir_treino_teste

manifest = next(base.parents[1].glob("ec2-analysis-preserv*/s3-novos.complete.json"))
entries = {r["name"]: r for r in json.loads(manifest.read_text())["files"]}
dest = base / "pesos-originais"


def save_verified(path, data):
    key = path.relative_to(dest).as_posix()
    assert hashlib.sha256(data).hexdigest() == entries[key]["sha256"], key
    assert len(data) == entries[key]["bytes"], key
    path.write_bytes(data)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--usar-treino-restaurado", action="store_true",
                    help="Revalida o CSV de treino já restaurado, evitando a emulação de CPU.")
args = parser.parse_args()
for candidate in sorted((base / "reconstrucao-2026-11-23-v1").glob("*/reconstrucao.json")):
    metadata = json.loads(candidate.read_text())
    sid = metadata["especie"]
    directory = dest / "training" / sid
    training_path = directory / "training-ste.csv"
    if args.usar_treino_restaurado and training_path.is_file():
        buf = training_path.read_bytes()
    elif metadata["treino_identico"]:
        buf = (candidate.parent / "training-ste.csv").read_bytes()
    else:
        source = Path(metadata["fonte"])
        assert hashlib.sha256(source.read_bytes()).hexdigest() == metadata["sha256_fonte"]
        raw = pd.read_csv(source).rename(columns={"thetao": "sst", "so": "sss", "depth": "profundidade"})
        raw["chl_log10"] = np.log10(pd.to_numeric(raw.CHL, errors="coerce").where(lambda a: a > 0))
        raw["sst"] = pd.to_numeric(raw.sst, errors="coerce").where(lambda a: a.between(-5, 50))
        raw["sss"] = pd.to_numeric(raw.sss, errors="coerce").where(lambda a: a >= 0)
        raw = raw.loc[pd.to_numeric(raw.profundidade, errors="coerce") < 0].copy()
        buf = raw.to_csv(index=False).encode()
    save_verified(training_path, buf)
    predictors = metadata["preditores"]
    data, _ = preparar_treino(pd.read_csv(io.BytesIO(buf)), predictors, 42)
    _, test_indices = dividir_treino_teste(data.sp.to_numpy(), 42)
    out = data[predictors + ["sp"]].copy()
    out["split"] = "treino"
    out.iloc[test_indices, out.columns.get_loc("split")] = "teste"
    model = next((directory / "modelo_rf_marinho").glob("*.joblib"))
    save_verified(model.with_name(model.stem + "_dados_split.csv"), out.to_csv(index=False).encode())
    print(sid, "treino e split com SHA originais", flush=True)
