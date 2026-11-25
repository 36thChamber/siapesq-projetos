#!/usr/bin/env python3
# integridade.py — Seção 1: Integridade dos dados (por conjunto).
from __future__ import annotations

import numpy as np
import pandas as pd

_CV_BAIXO = 0.05        # coeficiente de variação < 5% → baixa variabilidade
_VAR_QUASE_ZERO = 1e-8  # variância ≈ 0


def analisar(qc, out_dir=None) -> dict:
    """Integridade para cada conjunto: contagens, faltantes, inf, duplicados,
    constantes, baixa variabilidade, variância≈0."""
    res = {}
    for nome, df in qc.conjuntos.items():
        cont = [c for c in qc.continuas if c in df.columns]
        cat = [c for c in qc.categoricas if c in df.columns]
        n = len(df)
        constantes, baixa_var, var_zero = [], [], []
        for c in cont:
            s = df[c].dropna()
            if s.nunique() <= 1:
                constantes.append(c)
                continue
            var = float(np.nanvar(s.to_numpy(), ddof=1)) if len(s) > 1 else 0.0
            if var < _VAR_QUASE_ZERO:
                var_zero.append(c)
            mean = float(np.nanmean(s.to_numpy())) if len(s) else np.nan
            cv = abs(np.sqrt(var) / mean) if mean not in (0, np.nan) and mean != 0 else np.inf
            if np.isfinite(cv) and cv < _CV_BAIXO:
                baixa_var.append(c)
        cols_var = cont + cat
        faltantes = {c: int(df[c].isna().sum()) for c in cols_var}
        infinitos = {c: int(np.isinf(df[c].to_numpy(dtype="float64", na_value=np.nan)).sum())
                     for c in cont}
        res[nome] = {
            "n_total": n,
            "n_presencas": int((df["sp"] == 1).sum()) if "sp" in df else None,
            "n_ausencias": int((df["sp"] == 0).sum()) if "sp" in df else None,
            "n_continuas": len(cont),
            "n_categoricas": len(cat),
            "faltantes_total": int(sum(faltantes.values())),
            "faltantes_por_var": faltantes,
            "infinitos_total": int(sum(infinitos.values())),
            "duplicados": int(df.duplicated().sum()),
            "constantes": constantes,
            "baixa_variabilidade": baixa_var,
            "variancia_quase_zero": var_zero,
        }
    return res
