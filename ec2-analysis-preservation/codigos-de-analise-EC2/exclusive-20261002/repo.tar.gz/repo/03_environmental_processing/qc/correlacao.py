#!/usr/bin/env python3
# correlacao.py — Seção 4: Correlação (Pearson/Spearman/Kendall) + classificação.
from __future__ import annotations

import numpy as np
import pandas as pd


def _classificar(r: float) -> str:
    a = abs(r)
    if a < 0.70:
        return "baixa"
    if a < 0.80:
        return "moderada"
    if a < 0.90:
        return "alta"
    return "muito alta"


def _matriz(df, cont, metodo):
    sub = df[cont].dropna(how="all")
    if sub.shape[1] < 2:
        return pd.DataFrame()
    return sub.corr(method=metodo)


def _top_pares(mat: pd.DataFrame, metodo: str) -> list[dict]:
    pares = []
    cols = list(mat.columns)
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            r = mat.iloc[i, j]
            if pd.notna(r):
                pares.append({"metodo": metodo, "var1": cols[i], "var2": cols[j],
                              "r": float(r), "abs_r": abs(float(r)),
                              "classificacao": _classificar(r)})
    return sorted(pares, key=lambda d: d["abs_r"], reverse=True)


def analisar(qc, out_dir=None) -> dict:
    """{conjunto: {matrizes: {metodo: DataFrame}, top: [pares]}}. Grava a matriz de
    Pearson do conjunto completo em correlation_matrix.csv."""
    res = {}
    for nome, df in qc.conjuntos.items():
        cont = [c for c in qc.continuas if c in df.columns]
        matrizes, top = {}, []
        for metodo in ("pearson", "spearman", "kendall"):
            m = _matriz(df, cont, metodo)
            matrizes[metodo] = m
            if not m.empty:
                top += _top_pares(m, metodo)
        top = sorted(top, key=lambda d: d["abs_r"], reverse=True)
        res[nome] = {"matrizes": matrizes, "top": top}
    if out_dir is not None and "completo" in res:
        pm = res["completo"]["matrizes"].get("pearson")
        if pm is not None and not pm.empty:
            pm.to_csv(out_dir / qc.arq("correlation_matrix.csv"))
    return res
