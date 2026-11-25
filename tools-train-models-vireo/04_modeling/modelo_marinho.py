#!/usr/bin/env python3
# modelo_marinho.py — Modelagem Random Forest (Python/sklearn) do PIPELINE OCEÂNICO.
#
# Treina um RF sobre o CSV de variáveis marinho (presenças sp=1 + pseudo-ausências sp=0),
# avalia e salva o modelo + métricas. Preditores: sst, sss, chl_log10, profundidade.
#
# NOTA CIENTÍFICA (herdada da auditoria): a validação aqui é ALEATÓRIA (split estratificado),
# não espacial — com ocorrências agregadas o AUC pode estar otimista. É um modelo-teste do
# pipeline marinho; a validação espacial fica como melhoria futura (registrado no relatório).
#
# USO (da raiz; normalmente chamado pelo run_pipeline_ocean.py):
#   .venv\Scripts\python.exe 04_modeling\modelo_marinho.py --csv <Variables_*.csv> --outdir <pasta> --especie Pomatomus_saltatrix
#
# Saída (em --outdir): rf_<slug>_marinho.joblib, *_eval.json e *_dados_split.csv
# (o split é reusado pelo modelo_marinho.R para comparação justa).

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.inspection import permutation_importance
from sklearn.metrics import (roc_auc_score, confusion_matrix, precision_score,
                             recall_score, f1_score, matthews_corrcoef)

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import naming  # noqa: E402

PREDITORES = ["sst", "sss", "chl_log10", "profundidade"]


def _p(m: str = "") -> None:
    print(m, flush=True)


def _tss_e_limiar(y, p):
    """TSS máximo e limiar correspondente (maxSSS). AVISO: escolhido no MESMO teste —
    otimista (ver auditoria F03); reportado como referência do modelo-teste."""
    thrs = np.unique(np.round(p, 3))
    melhor = (-1.0, 0.5)
    for t in thrs:
        pred = (p >= t).astype(int)
        tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
        sens = tp / (tp + fn) if (tp + fn) else 0.0
        spec = tn / (tn + fp) if (tn + fp) else 0.0
        tss = sens + spec - 1.0
        if tss > melhor[0]:
            melhor = (tss, float(t))
    return melhor


def treinar(csv: Path, outdir: Path, especie: str, seed: int = 42, n_estimators: int = 500) -> Path:
    df = pd.read_csv(csv)
    preds = [c for c in PREDITORES if c in df.columns]
    if "sp" not in df.columns:
        raise ValueError("CSV sem coluna 'sp' (presença/ausência).")
    faltam = [c for c in PREDITORES if c not in df.columns]
    if faltam:
        _p(f"[rf-mar] AVISO: preditores ausentes no CSV, ignorados: {faltam}")

    d = df.dropna(subset=preds + ["sp"]).reset_index(drop=True).copy()
    X, y = d[preds].to_numpy(float), d["sp"].astype(int).to_numpy()
    n_pres, n_aus = int((y == 1).sum()), int((y == 0).sum())
    _p(f"[rf-mar] {especie} | {len(d)} casos completos | presenças={n_pres} pseudo={n_aus} | preditores={preds}")
    if n_pres < 10 or n_aus < 10:
        raise SystemExit(f"[rf-mar] dados insuficientes (pres={n_pres}, aus={n_aus}).")

    # split por ÍNDICE (guarda quais linhas são treino/teste) — permite ao R reusar o
    # MESMO split para uma comparação Python×R rigorosa (mesmas linhas).
    idx = np.arange(len(d))
    itr, ite = train_test_split(idx, test_size=0.3, random_state=seed, stratify=y)
    Xtr, Xte, ytr, yte = X[itr], X[ite], y[itr], y[ite]
    rf = RandomForestClassifier(n_estimators=n_estimators, random_state=seed,
                                class_weight="balanced", n_jobs=-1, oob_score=True)
    import time as _time
    _t0 = _time.perf_counter()
    rf.fit(Xtr, ytr)
    tempo_treino = _time.perf_counter() - _t0

    p_te = rf.predict_proba(Xte)[:, 1]
    p_tr = rf.predict_proba(Xtr)[:, 1]
    auc_te = float(roc_auc_score(yte, p_te))
    auc_tr = float(roc_auc_score(ytr, p_tr))
    tss, thr = _tss_e_limiar(yte, p_te)
    pred_te = (p_te >= thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(yte, pred_te, labels=[0, 1]).ravel()
    metrics = {
        "especie": especie, "preditores": preds, "n_completos": len(d),
        "n_presencas": n_pres, "n_pseudo": n_aus, "seed": seed,
        "auc_teste": round(auc_te, 4), "auc_treino": round(auc_tr, 4),
        "overfit_auc": round(auc_tr - auc_te, 4), "oob_score": round(float(rf.oob_score_), 4),
        "tempo_treino_seg": round(tempo_treino, 3), "n_jobs": -1, "framework": "Python sklearn",
        "tss_max_teste": round(float(tss), 4), "limiar_maxTSS": round(float(thr), 3),
        "sensibilidade": round(tp / (tp + fn) if (tp + fn) else 0.0, 4),
        "especificidade": round(tn / (tn + fp) if (tn + fp) else 0.0, 4),
        "precisao": round(float(precision_score(yte, pred_te, zero_division=0)), 4),
        "recall": round(float(recall_score(yte, pred_te, zero_division=0)), 4),
        "f1": round(float(f1_score(yte, pred_te, zero_division=0)), 4),
        "mcc": round(float(matthews_corrcoef(yte, pred_te)), 4),
        "matriz_confusao_teste": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "validacao": "ALEATORIA (split estratificado 70/30) — NAO espacial; AUC pode ser otimista",
    }

    # importância por permutação (no teste)
    imp = permutation_importance(rf, Xte, yte, n_repeats=10, random_state=seed, n_jobs=-1)
    metrics["importancia_permutacao"] = {
        preds[i]: round(float(imp.importances_mean[i]), 4) for i in range(len(preds))
    }
    # faixas de treino por preditor (p/ diagnóstico de extrapolação na predição)
    metrics["faixa_treino"] = {c: [float(d[c].min()), float(d[c].max())] for c in preds}

    outdir.mkdir(parents=True, exist_ok=True)
    nome = f"rf_{naming.slug_especie(especie)}_marinho"
    model_path = outdir / f"{nome}.joblib"
    joblib.dump({"modelo": rf, "preditores": preds, "faixa_treino": metrics["faixa_treino"],
                 "limiar_maxTSS": metrics["limiar_maxTSS"]}, model_path)
    (outdir / f"{nome}_eval.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")

    # split treino/teste (MESMAS linhas) para a comparação Python×R
    d_split = d[preds + ["sp"]].copy()
    d_split["split"] = "treino"
    d_split.iloc[ite, d_split.columns.get_loc("split")] = "teste"
    d_split.to_csv(outdir / f"{nome}_dados_split.csv", index=False)

    _p("")
    _p("==== MODELO RF MARINHO — AVALIAÇÃO ====")
    _p(f"  AUC teste = {metrics['auc_teste']}  (treino {metrics['auc_treino']}, overfit {metrics['overfit_auc']}, OOB {metrics['oob_score']})")
    _p(f"  TSS(max) = {metrics['tss_max_teste']} @ limiar {metrics['limiar_maxTSS']} | MCC={metrics['mcc']} F1={metrics['f1']}")
    _p(f"  sens={metrics['sensibilidade']} spec={metrics['especificidade']}")
    _p(f"  importância(perm): {metrics['importancia_permutacao']}")
    _p(f"[rf-mar] modelo salvo: {model_path}")
    return model_path


def main() -> None:
    ap = argparse.ArgumentParser(description="Modelagem RF marinha (sklearn).")
    ap.add_argument("--csv", required=True)
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--especie", required=True)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--n_estimators", type=int, default=500)
    a = ap.parse_args()
    treinar(Path(a.csv), Path(a.outdir), a.especie, a.seed, a.n_estimators)


if __name__ == "__main__":
    main()
