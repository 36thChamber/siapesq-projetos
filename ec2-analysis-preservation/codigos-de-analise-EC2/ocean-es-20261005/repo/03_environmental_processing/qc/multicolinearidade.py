#!/usr/bin/env python3
# multicolinearidade.py — Seção 5: VIF (Variance Inflation Factor) + classificação.
#
# VIF sem statsmodels: para variáveis padronizadas, VIF_i = elemento (i,i) da INVERSA
# da matriz de correlação. Se a matriz for singular (colinearidade perfeita), usa a
# pseudo-inversa e sinaliza. Reprodutível, exato e só com numpy.
from __future__ import annotations

import numpy as np
import pandas as pd


def _classificar(vif: float) -> str:
    if not np.isfinite(vif):
        return "singular (colinearidade perfeita)"
    if vif < 5:
        return "adequado"
    if vif < 10:
        return "atenção"
    return "remoção recomendada"


def _vif(df, cont) -> pd.DataFrame:
    # Usa apenas variáveis não-constantes e linhas completas (complete-case).
    usar = [c for c in cont if df[c].dropna().nunique() > 1]
    sub = df[usar].dropna()
    linhas = []
    if len(usar) >= 2 and len(sub) > len(usar):
        R = np.corrcoef(sub.to_numpy().T)
        try:
            inv = np.linalg.inv(R); singular = False
        except np.linalg.LinAlgError:
            inv = np.linalg.pinv(R); singular = True
        for k, c in enumerate(usar):
            vif = float(inv[k, k]) if not singular else float("inf")
            linhas.append({"variavel": c, "vif": vif, "classificacao": _classificar(vif)})
    else:
        for c in usar:
            linhas.append({"variavel": c, "vif": np.nan,
                           "classificacao": "insuficiente (poucos dados/variáveis)"})
    return pd.DataFrame(linhas)


def analisar(qc, out_dir=None) -> dict:
    """{conjunto: DataFrame(variavel, vif, classificacao)}. Grava vif_table.csv."""
    res = {}
    linhas_csv = []
    for nome, df in qc.conjuntos.items():
        cont = [c for c in qc.continuas if c in df.columns]
        tab = _vif(df, cont)
        res[nome] = tab
        for _, row in tab.iterrows():
            linhas_csv.append({"conjunto": nome, **row.to_dict()})
    if out_dir is not None and linhas_csv:
        pd.DataFrame(linhas_csv).to_csv(out_dir / qc.arq("vif_table.csv"), index=False)
    return res
