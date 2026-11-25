#!/usr/bin/env python3
# cobertura.py — Seção 11: Cobertura do espaço ambiental (amplitude + Convex Hull).
#
# Objetivo: avaliar se os registros REPRESENTAM bem o nicho ambiental. Métricas simples:
#   - amplitude (min/max/range) por variável contínua;
#   - Convex Hull no espaço PCA-2D (área do envelope) — proxy da cobertura ambiental;
#   - razão de cobertura presenças / conjunto completo (quão bem as presenças cobrem
#     o espaço amostrado).
from __future__ import annotations

import numpy as np
import pandas as pd


def _amplitude(df, cont) -> pd.DataFrame:
    linhas = []
    for c in cont:
        x = df[c].dropna().to_numpy()
        if x.size:
            linhas.append({"variavel": c, "minimo": float(x.min()),
                           "maximo": float(x.max()), "amplitude": float(x.max() - x.min())})
    return pd.DataFrame(linhas)


def _hull_area(pts: np.ndarray):
    """Área do Convex Hull 2D (None se pontos insuficientes/colineares)."""
    if pts.shape[0] < 3:
        return None
    try:
        from scipy.spatial import ConvexHull
        return float(ConvexHull(pts).volume)  # em 2D, .volume = área
    except Exception:  # noqa: BLE001
        return None


def analisar(qc, pca_res=None, out_dir=None) -> dict:
    """Amplitude por conjunto + área do hull (PCA-2D) + razão presenças/completo."""
    res = {}
    for nome, df in qc.conjuntos.items():
        cont = [c for c in qc.continuas if c in df.columns]
        res[nome] = {"amplitude": _amplitude(df, cont)}

    # Cobertura no espaço PCA-2D do CONJUNTO COMPLETO (projeta os 3 grupos no mesmo eixo).
    hull = {}
    p = (pca_res or {}).get("completo")
    if p is not None and p["scores"].shape[1] >= 2:
        scores2d = p["scores"][:, :2]
        area_total = _hull_area(scores2d)
        hull["completo"] = area_total
        if qc.tem_sp:
            df_c = qc.conjuntos["completo"]
            usar = p["variaveis"]
            mask_ok = df_c[usar].notna().all(axis=1).to_numpy()
            sp_ok = df_c.loc[mask_ok, "sp"].to_numpy()
            hull["presencas"] = _hull_area(scores2d[sp_ok == 1])
            hull["ausencias"] = _hull_area(scores2d[sp_ok == 0])
    razao = None
    if hull.get("completo") and hull.get("presencas"):
        razao = round(hull["presencas"] / hull["completo"], 3)
    return {"por_conjunto": res, "hull_area": hull, "razao_presencas_completo": razao}
