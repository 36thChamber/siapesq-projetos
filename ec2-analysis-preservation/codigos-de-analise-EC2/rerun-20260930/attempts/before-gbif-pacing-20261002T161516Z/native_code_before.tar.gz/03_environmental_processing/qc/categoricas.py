#!/usr/bin/env python3
# categoricas.py — Seção 8: Variáveis categóricas (uso do solo) + Índice de Shannon.
from __future__ import annotations

import numpy as np
import pandas as pd


def _shannon(freq_rel: np.ndarray) -> float:
    p = freq_rel[freq_rel > 0]
    return float(-(p * np.log(p)).sum()) if p.size else 0.0


def _analisar_var(s: pd.Series) -> dict:
    s = s.dropna()
    if s.empty:
        return {"n_classes": 0, "classe_dominante": None, "shannon": 0.0,
                "freq_abs": {}, "freq_rel": {}}
    vc = s.value_counts()
    rel = vc / vc.sum()
    return {
        "n_classes": int(vc.size),
        "classe_dominante": (int(vc.index[0]) if np.issubdtype(type(vc.index[0]), np.number)
                             else str(vc.index[0])),
        "shannon": round(_shannon(rel.to_numpy()), 4),
        "freq_abs": {str(k): int(v) for k, v in vc.items()},
        "freq_rel": {str(k): round(float(v), 4) for k, v in rel.items()},
    }


def analisar(qc, out_dir=None) -> dict:
    """{conjunto: {variavel: {n_classes, classe_dominante, shannon, freq_abs, freq_rel}}}."""
    res = {}
    for nome, df in qc.conjuntos.items():
        cat = [c for c in qc.categoricas if c in df.columns]
        res[nome] = {c: _analisar_var(df[c]) for c in cat}
    return res
