#!/usr/bin/env python3
# outliers.py — Seção 6: Detecção de outliers (IQR / Z-score / Z-robusto). NÃO remove.
from __future__ import annotations

import numpy as np
import pandas as pd

_Z = 3.0            # limiar |z| do Z-score
_ZR = 3.5           # limiar do Z-robusto (Iglewicz & Hoaglin)
_MAD_K = 0.6745


def _conta(x: np.ndarray) -> dict:
    x = x[np.isfinite(x)]
    n = x.size
    if n == 0:
        return {"n": 0, "iqr": 0, "zscore": 0, "robust_z": 0}
    q1, q3 = np.percentile(x, [25, 75]); iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    out_iqr = int(((x < lo) | (x > hi)).sum())
    std = x.std(ddof=1) if n > 1 else 0.0
    out_z = int((np.abs((x - x.mean()) / std) > _Z).sum()) if std > 0 else 0
    med = np.median(x); mad = np.median(np.abs(x - med))
    out_rz = int((np.abs(_MAD_K * (x - med) / mad) > _ZR).sum()) if mad > 0 else 0
    return {"n": n, "iqr": out_iqr, "zscore": out_z, "robust_z": out_rz}


def analisar(qc, out_dir=None) -> dict:
    """{conjunto: {por_var: DataFrame, resumo: dict}}. Grava outlier_report.csv."""
    res = {}
    linhas_csv = []
    for nome, df in qc.conjuntos.items():
        cont = [c for c in qc.continuas if c in df.columns]
        linhas = []
        for c in cont:
            d = _conta(df[c].to_numpy(dtype="float64", na_value=np.nan))
            n = max(d["n"], 1)
            linhas.append({
                "variavel": c, "n": d["n"],
                "out_iqr": d["iqr"], "pct_iqr": round(100 * d["iqr"] / n, 2),
                "out_zscore": d["zscore"], "pct_zscore": round(100 * d["zscore"] / n, 2),
                "out_robust_z": d["robust_z"], "pct_robust_z": round(100 * d["robust_z"] / n, 2),
            })
        tab = pd.DataFrame(linhas)
        afetadas = [r["variavel"] for r in linhas if r["out_iqr"] > 0]
        res[nome] = {"por_var": tab, "variaveis_afetadas": afetadas,
                     "total_iqr": int(tab["out_iqr"].sum()) if not tab.empty else 0}
        for r in linhas:
            linhas_csv.append({"conjunto": nome, **r})
    if out_dir is not None and linhas_csv:
        pd.DataFrame(linhas_csv).to_csv(out_dir / qc.arq("outlier_report.csv"), index=False)
    return res
