#!/usr/bin/env python3
# laudo_metricas.py — MÉTRICAS DE DESEMPENHO do laudo comparativo (diário × climatológico).
#
# Le os pares (observado, predito) extraidos dos 6 modelos (avaliacao_pontos.csv, gerado por
# 04_modeling/extrair_avaliacao_pontos.R) e calcula, por especie × modo, na particao de TESTE
# (validacao ALEATORIA por bootstrap — NAO espacial; ver nota de honestidade abaixo) e no
# consolidado:
#   - discriminacao: ROC AUC, PR AUC (average precision)
#   - limiar (maxTSS): matriz de confusao, sensibilidade, especificidade, acuracia, acuracia
#     balanceada, precisao, NPV, F1, F2, MCC, Kappa, TSS, FPR, FNR, omissao, comissao
#   - calibracao: Brier, LogLoss, ECE, slope/intercept, curva de calibracao
#   - Indice de Boyce continuo
#   - sobreajuste: diferenca treino - teste (AUC)
#
# HONESTIDADE (exigida pela spec): os modelos usaram replicacao BOOTSTRAP ALEATORIA. NAO ha
# validacao espacial (blocos/LORO) nem conjunto independente. Portanto "queda de desempenho
# espacial", "validacao por blocos" e afins sao NAO-CALCULAVEIS com estes arquivos e assim
# constam no relatorio. O que se calcula aqui e' validacao aleatoria + sobreajuste bootstrap.
#
# Saida: metricas.json + figuras (ROC, PR, calibracao, confusao, boxplots por fold) em <saida>/.

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent.parent
COMP = ROOT / "01_rotina" / "09_figuras_entregas" / "_comparacao_brasil"
ESPS = ["Alouatta_caraya", "Alouatta_guariba", "Sapajus_nigritus"]
MODOS = ["daily", "clima"]


# ----------------------------------------------------------------------------- métricas base
def roc_auc(y: np.ndarray, p: np.ndarray) -> float:
    """AUC = P(pred_presenca > pred_ausencia) via estatistica de Mann-Whitney (rank)."""
    y = np.asarray(y); p = np.asarray(p)
    n1 = int((y == 1).sum()); n0 = int((y == 0).sum())
    if n1 == 0 or n0 == 0:
        return float("nan")
    r = pd.Series(p).rank().to_numpy()
    return (r[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)


def average_precision(y: np.ndarray, p: np.ndarray) -> float:
    """PR AUC via average precision (soma de precisão ponderada pelo ganho de recall)."""
    y = np.asarray(y); p = np.asarray(p)
    order = np.argsort(-p)
    y = y[order]
    tp = np.cumsum(y == 1)
    fp = np.cumsum(y == 0)
    P = tp / np.maximum(tp + fp, 1)
    R = tp / max(int((y == 1).sum()), 1)
    dR = np.diff(np.concatenate([[0], R]))
    return float((P * dR).sum())


def brier(y: np.ndarray, p: np.ndarray) -> float:
    return float(np.mean((p - y) ** 2))


def log_loss(y: np.ndarray, p: np.ndarray) -> float:
    eps = 1e-12
    p = np.clip(p, eps, 1 - eps)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def ece(y: np.ndarray, p: np.ndarray, nbins: int = 10) -> float:
    """Expected Calibration Error: |freq observada - prob prevista| ponderado por bin."""
    y = np.asarray(y); p = np.asarray(p)
    edges = np.linspace(0, 1, nbins + 1)
    e = 0.0
    for i in range(nbins):
        m = (p >= edges[i]) & (p < edges[i + 1] if i < nbins - 1 else p <= edges[i + 1])
        if m.sum() == 0:
            continue
        e += (m.sum() / len(p)) * abs(y[m].mean() - p[m].mean())
    return float(e)


def calib_slope_intercept(y: np.ndarray, p: np.ndarray) -> tuple[float, float]:
    """Recalibracao logistica: observed ~ logit(p). slope=1/intercept=0 => bem calibrado."""
    from sklearn.linear_model import LogisticRegression
    eps = 1e-6
    logit = np.log(np.clip(p, eps, 1 - eps) / np.clip(1 - p, eps, 1 - eps)).reshape(-1, 1)
    try:
        lr = LogisticRegression(C=1e12, solver="lbfgs", max_iter=1000)
        lr.fit(logit, y)
        return float(lr.coef_[0][0]), float(lr.intercept_[0])
    except Exception:  # noqa: BLE001
        return float("nan"), float("nan")


def boyce(y: np.ndarray, p: np.ndarray, nbins: int = 10) -> float:
    """Indice de Boyce continuo: corr de Spearman entre a razao P/E e a adequabilidade.
    P = freq de presencas no bin; E = freq esperada (todos os pontos). +1 = ideal."""
    from scipy.stats import spearmanr
    y = np.asarray(y); p = np.asarray(p)
    pres = p[y == 1]
    if len(pres) < 5:
        return float("nan")
    edges = np.linspace(p.min(), p.max(), nbins + 1)
    centros, pe = [], []
    for i in range(nbins):
        lo, hi = edges[i], edges[i + 1]
        exp = ((p >= lo) & (p <= hi)).mean()
        obs = ((pres >= lo) & (pres <= hi)).mean()
        if exp > 0:
            centros.append((lo + hi) / 2); pe.append(obs / exp)
    if len(pe) < 3:
        return float("nan")
    rho, _ = spearmanr(centros, pe)
    return float(rho)


def confusao_metricas(y: np.ndarray, p: np.ndarray, thr: float) -> dict:
    yhat = (p >= thr).astype(int)
    tp = int(((yhat == 1) & (y == 1)).sum()); tn = int(((yhat == 0) & (y == 0)).sum())
    fp = int(((yhat == 1) & (y == 0)).sum()); fn = int(((yhat == 0) & (y == 1)).sum())
    P = tp + fn; N = tn + fp
    sens = tp / P if P else float("nan")           # recall/sensibilidade
    spec = tn / N if N else float("nan")
    prec = tp / (tp + fp) if (tp + fp) else float("nan")
    npv = tn / (tn + fn) if (tn + fn) else float("nan")
    acc = (tp + tn) / (P + N) if (P + N) else float("nan")
    balacc = (sens + spec) / 2
    f1 = 2 * prec * sens / (prec + sens) if (prec + sens) else float("nan")
    f2 = 5 * prec * sens / (4 * prec + sens) if (4 * prec + sens) else float("nan")
    tss = sens + spec - 1
    denom = np.sqrt(float((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)))
    mcc = (tp * tn - fp * fn) / denom if denom else float("nan")
    po = acc
    pe = ((tp + fp) * (tp + fn) + (tn + fn) * (tn + fp)) / (P + N) ** 2 if (P + N) else 0
    kappa = (po - pe) / (1 - pe) if (1 - pe) else float("nan")
    return dict(TP=tp, TN=tn, FP=fp, FN=fn, limiar=round(float(thr), 4),
                sensibilidade=sens, especificidade=spec, precisao=prec, npv=npv,
                acuracia=acc, acuracia_balanceada=balacc, F1=f1, F2=f2, TSS=tss,
                MCC=mcc, kappa=kappa, FPR=1 - spec, FNR=1 - sens,
                omissao=1 - sens, comissao=fp / N if N else float("nan"))


def limiar_maxTSS(y: np.ndarray, p: np.ndarray) -> float:
    thrs = np.unique(np.round(np.linspace(0.01, 0.99, 99), 3))
    best, bt = -2, 0.5
    for t in thrs:
        yhat = (p >= t).astype(int)
        tp = ((yhat == 1) & (y == 1)).sum(); fn = ((yhat == 0) & (y == 1)).sum()
        tn = ((yhat == 0) & (y == 0)).sum(); fp = ((yhat == 1) & (y == 0)).sum()
        sens = tp / (tp + fn) if (tp + fn) else 0
        spec = tn / (tn + fp) if (tn + fp) else 0
        tss = sens + spec - 1
        if tss > best:
            best, bt = tss, t
    return float(bt)


def limiar_p10(y: np.ndarray, p: np.ndarray) -> float:
    """Percentil 10 das presenças: só 10% das presenças ficam abaixo (alta sensibilidade)."""
    pres = p[y == 1]
    return float(np.percentile(pres, 10)) if len(pres) else 0.5


def limiar_sens_spec(y: np.ndarray, p: np.ndarray) -> float:
    """Ponto onde sensibilidade = especificidade."""
    thrs = np.linspace(0.01, 0.99, 99)
    best, bt = 9, 0.5
    for t in thrs:
        yhat = (p >= t).astype(int)
        tp = ((yhat == 1) & (y == 1)).sum(); fn = ((yhat == 0) & (y == 1)).sum()
        tn = ((yhat == 0) & (y == 0)).sum(); fp = ((yhat == 1) & (y == 0)).sum()
        sens = tp / (tp + fn) if (tp + fn) else 0
        spec = tn / (tn + fp) if (tn + fp) else 0
        if abs(sens - spec) < best:
            best, bt = abs(sens - spec), t
    return float(bt)


# ----------------------------------------------------------------------------- consolidação
def por_modelo(df: pd.DataFrame) -> dict:
    """Todas as métricas para um (especie, modo): consolidado no teste + por réplica."""
    teste = df[df.particao == "teste"]
    treino = df[df.particao == "treino"]
    y, p = teste.observed.to_numpy(), teste.predicted.to_numpy()

    thr = limiar_maxTSS(y, p)
    base = confusao_metricas(y, p, thr)
    out = dict(
        n_teste=int(len(y)), n_presencas=int((y == 1).sum()), n_ausencias=int((y == 0).sum()),
        AUC=roc_auc(y, p), PR_AUC=average_precision(y, p),
        Brier=brier(y, p), LogLoss=log_loss(y, p), ECE=ece(y, p), Boyce=boyce(y, p),
        **base,
    )
    out["calib_slope"], out["calib_intercept"] = calib_slope_intercept(y, p)
    # sobreajuste: AUC treino - AUC teste
    out["AUC_treino"] = roc_auc(treino.observed.to_numpy(), treino.predicted.to_numpy())
    out["sobreajuste_AUC"] = out["AUC_treino"] - out["AUC"]

    # por réplica (para boxplots e desvios)
    reps = []
    for r, g in teste.groupby("replicata"):
        yr, pr = g.observed.to_numpy(), g.predicted.to_numpy()
        tr = limiar_maxTSS(yr, pr)
        cm = confusao_metricas(yr, pr, tr)
        reps.append(dict(replicata=int(r), AUC=roc_auc(yr, pr), PR_AUC=average_precision(yr, pr),
                         TSS=cm["TSS"], MCC=cm["MCC"], Boyce=boyce(yr, pr),
                         Brier=brier(yr, pr), sensibilidade=cm["sensibilidade"],
                         omissao=cm["omissao"]))
    out["por_replicata"] = reps
    rr = pd.DataFrame(reps)
    for c in ["AUC", "PR_AUC", "TSS", "MCC", "Boyce", "sensibilidade", "omissao"]:
        out[f"{c}_media"] = float(rr[c].mean())
        out[f"{c}_dp"] = float(rr[c].std())
        out[f"{c}_min"] = float(rr[c].min())
        out[f"{c}_max"] = float(rr[c].max())
    # limiares alternativos (sensibilidade ao limiar, §18)
    out["limiares"] = {
        "maxTSS": limiar_maxTSS(y, p),
        "sens_igual_spec": limiar_sens_spec(y, p),
        "p10_presenca": limiar_p10(y, p),
    }
    return out


def main() -> None:
    df = pd.read_csv(COMP / "avaliacao_pontos.csv")
    rf = pd.read_csv(COMP / "rf_interno.csv")
    resultado = {}
    for esp in ESPS:
        resultado[esp] = {}
        for modo in MODOS:
            sub = df[(df.especie == esp) & (df.modo == modo)]
            if not len(sub):
                continue
            m = por_modelo(sub)
            rfi = rf[(rf.especie == esp) & (rf.modo == modo)]
            m["rf"] = dict(
                ntree=int(rfi.ntree.iloc[0]) if len(rfi) else None,
                mtry=int(rfi.mtry.iloc[0]) if len(rfi) else None,
                n_replicatas=int(len(rfi)),
                oob_disponivel=bool(rfi.oob_err.notna().any()) if len(rfi) else False,
            )
            resultado[esp][modo] = m
            print(f"  {esp:18} {modo:6} AUC={m['AUC']:.3f} PR={m['PR_AUC']:.3f} "
                  f"TSS={m['TSS']:.3f} MCC={m['MCC']:.3f} Boyce={m['Boyce']:.3f} "
                  f"Brier={m['Brier']:.3f} sobreaj={m['sobreajuste_AUC']:.3f}")
    (COMP / "metricas.json").write_text(json.dumps(resultado, indent=2, ensure_ascii=False),
                                        encoding="utf-8")
    print(f"[ok] metricas.json")


if __name__ == "__main__":
    main()
