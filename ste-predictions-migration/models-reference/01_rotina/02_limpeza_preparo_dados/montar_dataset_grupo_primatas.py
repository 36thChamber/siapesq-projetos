#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# montar_dataset_grupo_primatas.py — monta o dataset do MODELO DE GRUPO "Primatas"
# combinando os datasets v3 das 3 espécies (guariba, caraya, nigritus).
#
# Regras (mesma filosofia da receita v3):
#   - presenças  = união das presenças das 3 espécies, DEDUP por célula de 0,01°
#                  (duas espécies na mesma célula = 1 linha; grupo é presença/ausência)
#   - pseudoausências = união das pseudo das 3, dedup por célula, e REMOVIDAS as que
#                  caem em célula com presença de QUALQUER espécie (presença vence)
#   - balanceamento 1:1 (pseudo amostrada com seed fixa se o pool for maior)
#   - preditores: reaproveita os 13 valores já amostrados nas camadas nacionais 0,01°
#                 (mesmas camadas para as 3 espécies — nenhuma recaptura necessária)
#
# Saída: 03_dados_saida/Primatas_grupo/<data>/nacional_v3/dataset_v3_grupo.csv
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe 01_rotina/02_limpeza_preparo_dados/montar_dataset_grupo_primatas.py

from __future__ import annotations

import io
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent.parent
E7 = ROOT / "03_dados_saida"
DATA_RODADA = "2026-08-17"
SEED = 42
CELL = 0.01

ESPECIES = ["Alouatta_caraya", "Alouatta_guariba", "Sapajus_nigritus"]


def celula(df: pd.DataFrame) -> pd.Series:
    cx = np.floor(df["decimalLongitude"] / CELL).astype(int)
    cy = np.floor(df["decimalLatitude"] / CELL).astype(int)
    return cx.astype(str) + "_" + cy.astype(str)


def main() -> None:
    partes = []
    for sp in ESPECIES:
        f = E7 / sp / "2026-08-14" / "nacional_v3" / "dataset_v3.csv"
        d = pd.read_csv(f)
        d["especie_origem"] = sp
        partes.append(d)
        print(f"[grupo] {sp}: {int((d.sp == 1).sum())} presenças + {int((d.sp == 0).sum())} pseudo")
    todos = pd.concat(partes, ignore_index=True)
    todos["_cel"] = celula(todos)

    pres = todos[todos.sp == 1].drop_duplicates("_cel", keep="first")
    pseudo = todos[todos.sp == 0].drop_duplicates("_cel", keep="first")
    n_colisao = int(pseudo["_cel"].isin(set(pres["_cel"])).sum())
    pseudo = pseudo[~pseudo["_cel"].isin(set(pres["_cel"]))]
    print(f"[grupo] presenças únicas por célula: {len(pres)} | pseudo únicas: {len(pseudo)} "
          f"(removidas {n_colisao} por colisão com presença)")

    if len(pseudo) > len(pres):
        pseudo = pseudo.sample(n=len(pres), random_state=SEED)
        print(f"[grupo] pseudo balanceada 1:1 -> {len(pseudo)} (seed {SEED})")

    final = pd.concat([pres, pseudo], ignore_index=True).drop(columns="_cel")
    out = E7 / "Primatas_grupo" / DATA_RODADA / "nacional_v3"
    out.mkdir(parents=True, exist_ok=True)
    dest = out / "dataset_v3_grupo.csv"
    final.to_csv(dest, index=False)
    print(f"[grupo] dataset final: {len(final)} linhas "
          f"({int((final.sp == 1).sum())} presenças / {int((final.sp == 0).sum())} pseudo)")
    print(f"[grupo] salvo: {dest}")

    memo = out / "_montagem_grupo.md"
    memo.write_text(
        "# Montagem do dataset de GRUPO — Primatas (v3)\n\n"
        f"Data da rodada: {DATA_RODADA} (dados reaproveitados das capturas de 2026-08-14).\n\n"
        "União dos datasets v3 das 3 espécies com dedup por célula de 0,01°; pseudoausências "
        "que colidem com presença de qualquer espécie foram removidas (presença vence); "
        f"balanceamento 1:1 com seed {SEED}. Preditores: os 13 da receita v3, valores "
        "reaproveitados (mesmas camadas nacionais para as 3 espécies).\n\n"
        f"- Presenças únicas: {int((final.sp == 1).sum())}\n"
        f"- Pseudoausências: {int((final.sp == 0).sum())}\n"
        f"- Pseudo removidas por colisão: {n_colisao}\n"
        "- Coluna `especie_origem` preserva a proveniência de cada registro.\n",
        encoding="utf-8")
    print(f"[grupo] memorial: {memo}")


if __name__ == "__main__":
    main()
