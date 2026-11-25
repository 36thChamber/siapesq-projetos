#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# montar_datasets_v3_3especies.py — aplica a receita v3 (que aprovou no caraya) as 3 especies,
# somando a captacao RS de 14/08 (literatura + SISBio resgatados) ao dataset nacional:
#
#   presencas = nacional + (novos pontos RS x3)   [triplicata: decisao do usuario, validada no v3]
#   pseudo    = a do dataset nacional (presenca vence colisao de celula)
#   preditores = 13 (7 oficiais c/ MapBiomas + 4 amplitudes + dist_rio + pct_floresta_500m),
#                amostrados nas camadas nacionais 0,01 (predict variables/anual_2015_2024)
#
# Pontos de literatura com precisao municipal/fazenda sao REALOCADOS para a melhor celula
# de mata perto de rio no raio (municipal 15 km, fazenda/aproximada 3 km) — mesma logica do
# dataset v2 do caraya, agora na grade nacional. DESCARTAR nunca entra.
#
# Saida por especie: 07 Executado por especie/<sp>/2026-08-14/nacional_v3/dataset_v3.csv
# EXECUTAR DA RAIZ, no venv.

from __future__ import annotations

import io
import os
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
import numpy as np
import pandas as pd
import rasterio

ROOT = Path(__file__).resolve().parent.parent
LAYERS = ROOT / "predict variables" / "anual_2015_2024"
CONT = ["t2m", "e", "tp", "ndvi", "altitude", "awc",
        "t2m_amp", "e_amp", "tp_amp", "ndvi_amp", "dist_rio", "pct_floresta_500m"]
CAT = "ocup_solo_mapbiomas"
REPESO_NOVOS = 3

E7 = ROOT / "07 Executado por espécie"
ESPECIES = {
    "Alouatta_caraya": {
        "base": E7 / "Alouatta_caraya" / "2026-08-13" / "nacional_v3" / "dataset_v3.csv",
        "base_tem_fonte": True,
        "novos": [E7 / "Alouatta_caraya" / "2026-08-14" / "dados_rs_round2" / "planilha_round2_DRAFT.csv"],
    },
    "Alouatta_guariba": {
        "base": E7 / "STE Final" / "Alouatta_guariba" / "modelo" / "predictor_climatologico.csv",
        "base_tem_fonte": False,
        "novos": [E7 / "Alouatta_guariba" / "2026-08-14" / "dados_rs_v1" / "planilha_mestre_DRAFT.csv",
                  E7 / "Alouatta_guariba" / "2026-08-14" / "dados_rs_v1" / "recuperados_sibbr_sisbio.csv"],
    },
    "Sapajus_nigritus": {
        "base": E7 / "STE Final" / "Sapajus_nigritus" / "modelo" / "predictor_climatologico.csv",
        "base_tem_fonte": False,
        "novos": [E7 / "Sapajus_nigritus" / "2026-08-14" / "dados_rs_v1" / "planilha_mestre_DRAFT.csv",
                  E7 / "Sapajus_nigritus" / "2026-08-14" / "dados_rs_v1" / "recuperados_sibbr_sisbio.csv"],
    },
}


def detect(df, cands):
    for c in df.columns:
        if c.lower() in cands:
            return c
    return None


def carregar_camada(nome):
    with rasterio.open(LAYERS / f"{nome}.tif") as src:
        a = np.array(src.read(1), dtype="float32")
        if src.nodata is not None:
            a[a == src.nodata] = np.nan
        return a, src.transform


PCT, TR = carregar_camada("pct_floresta_500m")
DRIO, _ = carregar_camada("dist_rio")


def realocar(lon, lat, raio_km):
    """Melhor celula de mata perto de rio (<=3 km) no raio; mantem o ponto se nada melhor."""
    if raio_km <= 0:
        return lon, lat
    col, row = ~TR * (lon, lat)
    row, col = int(row), int(col)
    r = max(1, int(raio_km / 111.0 / 0.01))
    r0, r1 = max(0, row - r), min(PCT.shape[0], row + r + 1)
    c0, c1 = max(0, col - r), min(PCT.shape[1], col + r + 1)
    jan_p = PCT[r0:r1, c0:c1]
    jan_d = DRIO[r0:r1, c0:c1]
    cand = np.where(np.isfinite(jan_p) & (jan_d <= 3.0), jan_p, -1.0)
    if cand.max() <= 0.05:
        return lon, lat
    rr, cc = np.unravel_index(int(np.argmax(cand)), cand.shape)
    x, y = TR * (c0 + cc + 0.5, r0 + rr + 0.5)
    return float(x), float(y)


def carregar_novos(paths):
    frames = []
    for p in paths:
        if not p.exists():
            print(f"    [aviso] nao achei {p.name} — pulando")
            continue
        df = pd.read_csv(p)
        la = detect(df, ("lat", "decimallatitude", "latitude"))
        lo = detect(df, ("lon", "decimallongitude", "longitude"))
        df = df.rename(columns={la: "lat", lo: "lon"})
        if "classe" in df.columns:
            antes = len(df)
            df = df[df.classe.astype(str).str.upper() != "DESCARTAR"]
            print(f"    {p.name}: {len(df)} pontos ({antes - len(df)} DESCARTAR fora)")
        else:
            print(f"    {p.name}: {len(df)} pontos")
        prec = df["precisao"].astype(str).str.lower() if "precisao" in df.columns else pd.Series("exata", index=df.index)
        raios = prec.map(lambda s: 15.0 if "munic" in s else (3.0 if ("fazend" in s or "aprox" in s or "local" in s) else 0.0))
        nlon, nlat, nreal = [], [], 0
        for (lo_, la_, rk) in zip(df.lon, df.lat, raios):
            x, y = realocar(lo_, la_, rk)
            nreal += int((x, y) != (lo_, la_))
            nlon.append(x); nlat.append(y)
        df = df.assign(lon=nlon, lat=nlat)
        if nreal:
            print(f"      {nreal} pontos realocados p/ mata perto de rio")
        frames.append(df[["lat", "lon"]])
    if not frames:
        return pd.DataFrame(columns=["lat", "lon"])
    return pd.concat(frames, ignore_index=True)


def cell(df):
    return (np.floor(df.decimalLongitude / 0.01).astype(int).astype(str) + "_" +
            np.floor(df.decimalLatitude / 0.01).astype(int).astype(str))


def montar(esp, cfg):
    print(f"\n=== {esp} ===")
    base = pd.read_csv(cfg["base"])
    cols = ["decimalLatitude", "decimalLongitude", "sp"] + (["fonte"] if cfg["base_tem_fonte"] else [])
    base = base[[c for c in cols if c in base.columns]].copy()
    if "fonte" not in base.columns:
        base["fonte"] = "nacional"
    novos = carregar_novos(cfg["novos"])
    print(f"  base: {int((base.sp==1).sum())} pres / {int((base.sp==0).sum())} pseudo | novos RS: {len(novos)}")

    v = pd.DataFrame({"decimalLatitude": novos.lat, "decimalLongitude": novos.lon,
                      "sp": 1, "fonte": "rs_2026_08_14"})
    pres = pd.concat([base[base.sp == 1]] + [v] * REPESO_NOVOS, ignore_index=True)
    pseu = base[base.sp == 0].copy()
    pres["cel"] = cell(pres)
    pres = pres.groupby("cel", as_index=False).head(REPESO_NOVOS)
    pseu["cel"] = cell(pseu)
    pseu = pseu.drop_duplicates("cel")
    pseu = pseu[~pseu.cel.isin(set(pres.cel))]
    df = pd.concat([pres, pseu], ignore_index=True).drop(columns="cel")

    coords = list(zip(df.decimalLongitude, df.decimalLatitude))
    for nome in CONT + [CAT]:
        with rasterio.open(LAYERS / f"{nome}.tif") as src:
            vals = np.array([x[0] for x in src.sample(coords)], dtype=float)
            if src.nodata is not None:
                vals[vals == src.nodata] = np.nan
        df[nome] = vals
    ok = df[CONT + [CAT]].notna().all(axis=1)
    out = E7 / esp / "2026-08-14" / "nacional_v3"
    out.mkdir(parents=True, exist_ok=True)
    df.to_csv(out / "dataset_v3.csv", index=False)
    resumo = df[ok].groupby(["sp", "fonte"]).size()
    print(f"  completos: {int(ok.sum())}/{len(df)} -> {out / 'dataset_v3.csv'}")
    print(resumo.to_string())


def main():
    for esp, cfg in ESPECIES.items():
        montar(esp, cfg)


if __name__ == "__main__":
    main()
