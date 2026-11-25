#!/usr/bin/env python3
# pca.py — Seção 10: PCA (diagnóstico). SVD do numpy sobre dados padronizados.
#          NÃO reduz dimensionalidade — só diagnóstico (variância explicada + scores 2D).
from __future__ import annotations

import numpy as np
import pandas as pd


def _pca(df, cont):
    usar = [c for c in cont if df[c].dropna().nunique() > 1]
    sub = df[usar].dropna()
    if sub.shape[0] < 3 or sub.shape[1] < 2:
        return None
    X = sub.to_numpy(dtype="float64")
    mean = X.mean(axis=0); std = X.std(axis=0, ddof=0)
    std[std == 0] = 1.0
    Z = (X - mean) / std
    # SVD: colunas de Vt = componentes; s²/(n-1) = variância de cada componente.
    U, s, Vt = np.linalg.svd(Z, full_matrices=False)
    var = (s ** 2) / (Z.shape[0] - 1)
    ratio = var / var.sum()
    scores = U * s  # projeções (n × k)
    return {
        "variaveis": usar,
        "explained_variance_ratio": ratio,
        "explained_cumulative": np.cumsum(ratio),
        "scores": scores,           # p/ o gráfico 2D (PC1×PC2)
        "loadings": Vt,             # componentes × variáveis
        "n": int(Z.shape[0]),
    }


def analisar(qc, out_dir=None) -> dict:
    """{conjunto: resultado_pca | None}."""
    res = {}
    for nome, df in qc.conjuntos.items():
        cont = [c for c in qc.continuas if c in df.columns]
        try:
            res[nome] = _pca(df, cont)
        except Exception:  # noqa: BLE001
            res[nome] = None
    return res
