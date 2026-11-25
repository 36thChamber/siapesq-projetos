#!/usr/bin/env python3
# teste_municipios_literatura.py — a REGUA DO RS: % dos pontos da literatura
# (planilha-mestre, classes CONFIRMADO/PROVAVEL) cuja adequabilidade no mapa fica
# acima de limiares. E a metrica que mede exatamente o objetivo do usuario:
# "adequabilidade favoravel em todas as areas de ocorrencia documentadas".
#
# Uso (da raiz):
#   .venv/Scripts/python.exe 04_modeling/teste_municipios_literatura.py \
#       --mapa <adequabilidade.tif> [--planilha <csv>] [--json <saida.json>]
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "03_environmental_processing"))
from point_sampler import sample_raster_file  # noqa: E402

PLANILHA = (ROOT / "07 Executado por espécie" / "Alouatta_caraya" / "2026-08-12"
            / "dados_rs_v2" / "planilha_mestre_DRAFT.csv")
LIMIARES = (0.1, 0.2, 0.3)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--mapa", required=True)
    p.add_argument("--planilha", default=str(PLANILHA))
    p.add_argument("--json", default=None)
    p.add_argument("--buffer_melhor_celula_km", type=float, default=3.0,
                   help="Usa a MELHOR celula num raio (a coordenada da literatura pode "
                        "cair no pasto ao lado da mata; padrao 3 km).")
    a = p.parse_args()

    pm = pd.read_csv(a.planilha)
    pm = pm[pm["classe"].isin(["CONFIRMADO", "PROVAVEL"])].copy()
    lats = pm["lat"].to_numpy(float)
    lons = pm["lon"].to_numpy(float)

    # melhor celula num raio: amostra um mini-grid 5x5 (~+-3 km com passo 1,5 km)
    r = a.buffer_melhor_celula_km / 111.0
    passos = np.linspace(-r, r, 5)
    vals = np.full(len(pm), np.nan)
    for dlat in passos:
        for dlon in passos:
            v = np.asarray(sample_raster_file(a.mapa, lats + dlat, lons + dlon,
                                              method="bilinear", clip=True), float)
            vals = np.fmax(vals, v)
    pm["adequabilidade_melhor"] = vals

    res = {"mapa": Path(a.mapa).name, "n_pontos": int(len(pm)),
           "buffer_km": a.buffer_melhor_celula_km,
           "mediana": round(float(np.nanmedian(vals)), 4)}
    print(f"[municipios] {res['n_pontos']} pontos da literatura | mapa {res['mapa']}")
    for t in LIMIARES:
        pct = 100.0 * float(np.nanmean(vals >= t))
        res[f"pct_acima_{t}"] = round(pct, 1)
        print(f"[municipios]   >= {t}: {pct:.1f}%")
    for cl in ("CONFIRMADO", "PROVAVEL"):
        sub = pm[pm["classe"] == cl]["adequabilidade_melhor"]
        print(f"[municipios]   {cl}: mediana {np.nanmedian(sub):.3f} (n={len(sub)})")
    piores = pm.nsmallest(8, "adequabilidade_melhor")
    print("[municipios] 8 piores (onde o mapa ainda nao ve a especie):")
    for _, row in piores.iterrows():
        print(f"[municipios]   {str(row.get('municipio','?')):28} "
              f"{row['adequabilidade_melhor']:.3f} ({row['classe']})")
    if a.json:
        Path(a.json).write_text(json.dumps(res, indent=2, ensure_ascii=False),
                                encoding="utf-8")
        print(f"[municipios] json: {a.json}")


if __name__ == "__main__":
    main()
