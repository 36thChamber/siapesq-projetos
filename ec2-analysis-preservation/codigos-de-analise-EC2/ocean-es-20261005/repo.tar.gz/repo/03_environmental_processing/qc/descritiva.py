#!/usr/bin/env python3
# descritiva.py — Seção 2: Estatística descritiva por variável contínua (3 conjuntos).
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats as _st


def _stats_var(s: pd.Series) -> dict:
    x = s.dropna().to_numpy(dtype="float64")
    if x.size == 0:
        return {k: np.nan for k in _COLS}
    q1, q3 = np.percentile(x, [25, 75])
    p5, p50, p95 = np.percentile(x, [5, 50, 95])
    mean = float(np.mean(x)); std = float(np.std(x, ddof=1)) if x.size > 1 else 0.0
    try:
        moda = float(_st.mode(np.round(x, 6), keepdims=False).mode)
    except Exception:  # noqa: BLE001
        moda = np.nan
    return {
        "n": int(x.size), "media": mean, "mediana": float(np.median(x)), "moda": moda,
        "minimo": float(x.min()), "maximo": float(x.max()),
        "amplitude": float(x.max() - x.min()), "desvio_padrao": std,
        "coef_variacao": float(std / mean) if mean != 0 else np.nan,
        "q1": float(q1), "q3": float(q3), "iqr": float(q3 - q1),
        "p5": float(p5), "p25": float(q1), "p50": float(p50), "p75": float(q3), "p95": float(p95),
        "assimetria": float(_st.skew(x)) if x.size > 2 else np.nan,
        "curtose": float(_st.kurtosis(x)) if x.size > 3 else np.nan,
    }


_COLS = ["n", "media", "mediana", "moda", "minimo", "maximo", "amplitude",
         "desvio_padrao", "coef_variacao", "q1", "q3", "iqr", "p5", "p25", "p50",
         "p75", "p95", "assimetria", "curtose"]


def analisar(qc, out_dir=None) -> dict:
    """Devolve {conjunto: DataFrame(variável × estatística)} e grava CSV combinado."""
    res = {}
    linhas_csv = []
    for nome, df in qc.conjuntos.items():
        cont = [c for c in qc.continuas if c in df.columns]
        tab = pd.DataFrame({c: _stats_var(df[c]) for c in cont}).T
        tab = tab.reindex(columns=_COLS)
        res[nome] = tab
        for var, row in tab.iterrows():
            linhas_csv.append({"conjunto": nome, "variavel": var, **row.to_dict()})
    if out_dir is not None and linhas_csv:
        pd.DataFrame(linhas_csv).to_csv(out_dir / qc.arq("descriptive_statistics.csv"), index=False)
    return res
