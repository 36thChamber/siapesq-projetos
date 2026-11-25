#!/usr/bin/env python3
# readiness.py — SDM Readiness Score (0–100) como ÍNDICE DE QUALIDADE.
#
# Índice objetivo, determinístico e AJUSTÁVEL: cada critério pontua de 0 até o seu
# PESO; a soma dá 0–100 → estrelas + classificação. Além da nota, devolve a
# CONTRIBUIÇÃO de cada critério e os fatores separados em positivos/atenção/críticos
# (cada um com status), alimentando o Resumo Executivo e a seção "Problemas".
# Para ajustar o índice, altere os PESOS aqui e os limiares em `limiares.py`.

from __future__ import annotations

import numpy as np

from . import limiares as L

# ---- PESOS (somam 100) — ajustáveis --------------------------------------------
PESOS = {
    "n_presencas": 20, "proporcao": 10, "faltantes": 12, "constantes": 8,
    "variabilidade": 10, "correlacao": 12, "vif": 12, "cobertura": 8,
    "outliers": 4, "distribuicao": 4,
}
ROTULOS = {
    "n_presencas": "Número de presenças", "proporcao": "Proporção presença/ausência",
    "faltantes": "Ausência de valores faltantes", "constantes": "Variáveis com variação",
    "variabilidade": "Variabilidade ambiental", "correlacao": "Baixa correlação",
    "vif": "Baixa multicolinearidade (VIF)", "cobertura": "Cobertura ambiental",
    "outliers": "Controle de outliers", "distribuicao": "Distribuições adequadas",
}
# Status de modelagem (mantém compatibilidade) por faixa de nota.
_STATUS_MODELAGEM = [(80, "READY FOR MODELING"), (60, "MODELING WITH CAUTION"),
                     (0, "MODELING NOT RECOMMENDED")]


def _pts(frac, peso):
    return round(max(0.0, min(1.0, frac)) * peso, 2)


def _status(pontos, peso):
    pct = pontos / peso if peso else 0.0
    if pct >= 0.85:
        return L.VERDE
    if pct >= 0.5:
        return L.AMARELO
    return L.VERMELHO


def calcular(qc, resultados: dict) -> dict:
    """Calcula o índice (conjunto completo) + contribuição e fatores classificados."""
    integ = resultados["integridade"]["completo"]
    desc = resultados["descritiva"]["completo"]
    corr_top = resultados["correlacao"]["completo"]["top"]
    vif = resultados["vif"]["completo"]
    outl = resultados["outliers"]["completo"]["por_var"]
    cob_razao = resultados["cobertura"].get("razao_presencas_completo")
    n_cont = max(integ["n_continuas"], 1)

    criterios: list[dict] = []
    pos: list[str] = []
    aten: list[str] = []
    crit: list[str] = []

    def add(chave, pontos, fator_txt):
        peso = PESOS[chave]
        st = _status(pontos, peso)
        criterios.append({"chave": chave, "rotulo": ROTULOS[chave], "pontos": pontos,
                          "peso": peso, "status": st, "fator": fator_txt})
        (pos if st == L.VERDE else aten if st == L.AMARELO else crit).append(fator_txt)

    # 1) Nº de presenças
    npres = integ["n_presencas"] if integ["n_presencas"] is not None else integ["n_total"]
    frac = (0.0 if npres < L.N_PRES_MINIMO else 0.5 if npres < L.N_PRES_BOM
            else 0.8 if npres < L.N_PRES_OTIMO else 1.0)
    add("n_presencas", _pts(frac, PESOS["n_presencas"]),
        f"{npres} presenças " + ("(suficiente)" if frac >= 0.8 else
        "(poucas — risco de sobreajuste)" if frac < 0.5 else "(aceitável)"))

    # 2) Proporção presença/ausência
    na = integ["n_ausencias"] or 0
    prop = (npres / na) if na else 1.0
    ok = 0.2 <= prop <= 1.0
    add("proporcao", _pts(1.0 if ok else 0.5, PESOS["proporcao"]),
        f"proporção presença/ausência = {prop:.2f}")

    # 3) Faltantes
    n_cells = integ["n_total"] * (integ["n_continuas"] + integ["n_categoricas"])
    frac_ok = 1.0 - (integ["faltantes_total"] / n_cells) if n_cells else 1.0
    add("faltantes", _pts(frac_ok, PESOS["faltantes"]),
        f"{100*(1-frac_ok):.1f}% de valores faltantes")

    # 4) Constantes / variância ≈ 0
    n_const = len(integ["constantes"]) + len(integ["variancia_quase_zero"])
    add("constantes", _pts(1.0 - n_const / n_cont, PESOS["constantes"]),
        "nenhuma variável constante" if n_const == 0
        else f"{n_const} variável(is) sem variabilidade")

    # 5) Variabilidade ambiental
    cvs = desc["coef_variacao"].abs().replace([np.inf], np.nan).dropna()
    cv_med = float(cvs.median()) if len(cvs) else 0.0
    add("variabilidade", _pts(min(cv_med / 0.15, 1.0), PESOS["variabilidade"]),
        f"variabilidade ambiental (CV mediano = {cv_med:.2f})")

    # 6) Correlação
    muito = sum(1 for p in corr_top if p["metodo"] == "pearson" and p["abs_r"] >= L.CORR_MUITO_ALTA)
    alta = sum(1 for p in corr_top if p["metodo"] == "pearson" and L.CORR_ALTA <= p["abs_r"] < L.CORR_MUITO_ALTA)
    add("correlacao", _pts(max(0.0, 1.0 - 0.25 * muito - 0.10 * alta), PESOS["correlacao"]),
        f"{muito} par(es) |r|≥0,9 e {alta} par(es) 0,8–0,9")

    # 7) VIF
    n10 = int((vif["vif"] >= L.VIF_REMOVER).sum()) if "vif" in vif else 0
    n5 = int(((vif["vif"] >= L.VIF_ATENCAO) & (vif["vif"] < L.VIF_REMOVER)).sum()) if "vif" in vif else 0
    add("vif", _pts(max(0.0, 1.0 - 0.25 * n10 - 0.10 * n5), PESOS["vif"]),
        f"{n10} variável(is) com VIF≥10 e {n5} com 5–10")

    # 8) Cobertura ambiental
    frac_cob = cob_razao if cob_razao is not None else 0.5
    add("cobertura", _pts(frac_cob, PESOS["cobertura"]),
        f"cobertura do espaço ambiental = {int(frac_cob*100)}%" if cob_razao is not None
        else "cobertura ambiental não estimada")

    # 9) Outliers extremos
    pct_rz = float(outl["pct_robust_z"].mean()) if "pct_robust_z" in outl and len(outl) else 0.0
    add("outliers", _pts(max(0.0, 1.0 - pct_rz / 10.0), PESOS["outliers"]),
        f"outliers extremos (média {pct_rz:.1f}% por variável)")

    # 10) Distribuição (assimetria extrema)
    sk = desc["assimetria"].abs().dropna()
    n_sk = int((sk > L.SKEW_FORTE).sum())
    add("distribuicao", _pts(1.0 - n_sk / n_cont, PESOS["distribuicao"]),
        "distribuições sem assimetria extrema" if n_sk == 0
        else f"{n_sk} variável(is) com assimetria forte (|skew|>2)")

    total = round(sum(c["pontos"] for c in criterios), 1)
    n_estrelas, classificacao = L.escala_do_score(total)
    status_mod = next(rot for lim, rot in _STATUS_MODELAGEM if total >= lim)
    return {
        "score": total, "estrelas": n_estrelas, "estrelas_txt": L.estrelas(n_estrelas),
        "classificacao": classificacao, "status": status_mod, "pesos": PESOS,
        "criterios": criterios, "positivos": pos, "atencao": aten, "criticos": crit,
        # compat. com quem lia as chaves antigas:
        "detalhe_pontos": {c["chave"]: c["pontos"] for c in criterios},
        "fatores_positivos": pos, "fatores_negativos": aten + crit,
    }
