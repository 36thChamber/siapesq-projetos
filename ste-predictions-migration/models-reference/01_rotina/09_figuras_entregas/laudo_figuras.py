#!/usr/bin/env python3
# laudo_figuras.py — figuras de MÉTRICAS do laudo (a partir de avaliacao_pontos.csv):
#   1) boxplots das métricas por fold (diário × climatológico), por espécie;
#   2) curvas ROC e Precision-Recall (teste consolidado);
#   3) curvas de calibração;
#   4) matrizes de confusão (no limiar maxTSS);
#   5) distribuição da adequabilidade prevista (presenças × pseudoausências).
# Saída: PNGs em _comparacao_brasil/.

from __future__ import annotations

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

import laudo_metricas as M

ROOT = Path(__file__).resolve().parent.parent.parent
COMP = ROOT / "01_rotina" / "09_figuras_entregas" / "_comparacao_brasil"
ESPS = ["Alouatta_caraya", "Alouatta_guariba", "Sapajus_nigritus"]
COR = {"daily": "#4C72B0", "clima": "#DD8452"}
NOME = {"daily": "diário", "clima": "climatológico"}


def _teste(df, esp, modo):
    s = df[(df.especie == esp) & (df.modo == modo) & (df.particao == "teste")]
    return s.observed.to_numpy(), s.predicted.to_numpy()


def fig_boxplots(df):
    mets = ["AUC", "PR_AUC", "TSS", "MCC", "Boyce", "sensibilidade"]
    fig, axes = plt.subplots(len(ESPS), len(mets), figsize=(17, 3.2 * len(ESPS)))
    for i, esp in enumerate(ESPS):
        for j, met in enumerate(mets):
            ax = axes[i, j]
            dados, cores, labs = [], [], []
            for modo in ["daily", "clima"]:
                vals = []
                for r, g in df[(df.especie == esp) & (df.modo == modo) &
                               (df.particao == "teste")].groupby("replicata"):
                    y, p = g.observed.to_numpy(), g.predicted.to_numpy()
                    if met == "AUC":
                        vals.append(M.roc_auc(y, p))
                    elif met == "PR_AUC":
                        vals.append(M.average_precision(y, p))
                    elif met == "Boyce":
                        vals.append(M.boyce(y, p))
                    else:
                        cm = M.confusao_metricas(y, p, M.limiar_maxTSS(y, p))
                        vals.append(cm["TSS"] if met == "TSS" else cm["MCC"] if met == "MCC"
                                    else cm["sensibilidade"])
                dados.append([v for v in vals if np.isfinite(v)])
                cores.append(COR[modo]); labs.append(NOME[modo])
            bp = ax.boxplot(dados, patch_artist=True, widths=0.6)
            for patch, c in zip(bp["boxes"], cores):
                patch.set_facecolor(c); patch.set_alpha(0.7)
            ax.set_xticklabels(labs, fontsize=8)
            if i == 0:
                ax.set_title(met, fontsize=11)
            if j == 0:
                ax.set_ylabel(esp.replace("_", " "), fontsize=9)
            ax.grid(alpha=0.3, axis="y")
    fig.suptitle("Métricas por réplica bootstrap (validação aleatória) — diário × climatológico",
                 fontsize=13)
    fig.tight_layout()
    fig.savefig(COMP / "fig_boxplots.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def _roc(y, p):
    thr = np.linspace(0, 1, 101)
    tpr = [((p >= t) & (y == 1)).sum() / max((y == 1).sum(), 1) for t in thr]
    fpr = [((p >= t) & (y == 0)).sum() / max((y == 0).sum(), 1) for t in thr]
    return np.array(fpr), np.array(tpr)


def _pr(y, p):
    order = np.argsort(-p); ys = y[order]
    tp = np.cumsum(ys == 1); fp = np.cumsum(ys == 0)
    prec = tp / np.maximum(tp + fp, 1); rec = tp / max((y == 1).sum(), 1)
    return rec, prec


def fig_roc_pr(df):
    fig, axes = plt.subplots(2, len(ESPS), figsize=(15, 8.5))
    for j, esp in enumerate(ESPS):
        for modo in ["daily", "clima"]:
            y, p = _teste(df, esp, modo)
            fpr, tpr = _roc(y, p)
            axes[0, j].plot(fpr, tpr, color=COR[modo], lw=2,
                            label=f"{NOME[modo]} (AUC={M.roc_auc(y,p):.3f})")
            rec, prec = _pr(y, p)
            axes[1, j].plot(rec, prec, color=COR[modo], lw=2,
                            label=f"{NOME[modo]} (AP={M.average_precision(y,p):.3f})")
        axes[0, j].plot([0, 1], [0, 1], "k--", alpha=0.3)
        axes[0, j].set_title(esp.replace("_", " "), fontsize=11)
        axes[0, j].set_xlabel("FPR (1−especificidade)"); axes[0, j].set_ylabel("TPR (sensibilidade)")
        axes[0, j].legend(fontsize=8); axes[0, j].grid(alpha=0.3)
        axes[1, j].set_xlabel("recall (sensibilidade)"); axes[1, j].set_ylabel("precisão")
        axes[1, j].legend(fontsize=8); axes[1, j].grid(alpha=0.3)
    axes[0, 0].text(-0.28, 0.5, "ROC", transform=axes[0, 0].transAxes, fontsize=13,
                    rotation=90, va="center", fontweight="bold")
    axes[1, 0].text(-0.28, 0.5, "Precision-Recall", transform=axes[1, 0].transAxes,
                    fontsize=13, rotation=90, va="center", fontweight="bold")
    fig.suptitle("Curvas ROC e Precision-Recall (teste consolidado)", fontsize=13)
    fig.tight_layout()
    fig.savefig(COMP / "fig_roc_pr.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def fig_calibracao(df):
    fig, axes = plt.subplots(1, len(ESPS), figsize=(15, 4.6))
    for j, esp in enumerate(ESPS):
        ax = axes[j]
        ax.plot([0, 1], [0, 1], "k--", alpha=0.4, label="perfeita")
        for modo in ["daily", "clima"]:
            y, p = _teste(df, esp, modo)
            edges = np.linspace(0, 1, 11)
            xs, ys = [], []
            for i in range(10):
                m = (p >= edges[i]) & (p < edges[i + 1] if i < 9 else p <= edges[i + 1])
                if m.sum() >= 5:
                    xs.append(p[m].mean()); ys.append(y[m].mean())
            ax.plot(xs, ys, "o-", color=COR[modo], lw=2, ms=5,
                    label=f"{NOME[modo]} (Brier={M.brier(y,p):.3f})")
        ax.set_title(esp.replace("_", " "), fontsize=11)
        ax.set_xlabel("adequabilidade prevista"); ax.set_ylabel("frequência observada")
        ax.legend(fontsize=8); ax.grid(alpha=0.3)
    fig.suptitle("Curvas de calibração (teste consolidado)", fontsize=13)
    fig.tight_layout()
    fig.savefig(COMP / "fig_calibracao.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def fig_confusao(df):
    fig, axes = plt.subplots(len(ESPS), 2, figsize=(8.5, 3.6 * len(ESPS)))
    for i, esp in enumerate(ESPS):
        for k, modo in enumerate(["daily", "clima"]):
            y, p = _teste(df, esp, modo)
            cm = M.confusao_metricas(y, p, M.limiar_maxTSS(y, p))
            mat = np.array([[cm["TN"], cm["FP"]], [cm["FN"], cm["TP"]]])
            ax = axes[i, k]
            im = ax.imshow(mat, cmap="Blues")
            for (r, c), val in np.ndenumerate(mat):
                ax.text(c, r, f"{val}", ha="center", va="center",
                        color="white" if val > mat.max() / 2 else "black", fontsize=12)
            ax.set_xticks([0, 1]); ax.set_xticklabels(["prev. ausência", "prev. presença"], fontsize=8)
            ax.set_yticks([0, 1]); ax.set_yticklabels(["obs. ausência", "obs. presença"], fontsize=8)
            ax.set_title(f"{esp.replace('_',' ')} — {NOME[modo]}\n"
                         f"limiar={cm['limiar']:.2f} | TSS={cm['TSS']:.3f} | omissão={cm['omissao']:.3f}",
                         fontsize=9)
    fig.suptitle("Matrizes de confusão (limiar maxTSS, teste consolidado)", fontsize=13)
    fig.tight_layout()
    fig.savefig(COMP / "fig_confusao.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def fig_distribuicao(df):
    fig, axes = plt.subplots(len(ESPS), 2, figsize=(13, 3.3 * len(ESPS)))
    for i, esp in enumerate(ESPS):
        for k, modo in enumerate(["daily", "clima"]):
            y, p = _teste(df, esp, modo)
            ax = axes[i, k]
            ax.hist(p[y == 1], bins=30, alpha=0.6, color="#2a9d3f", label="presenças", density=True)
            ax.hist(p[y == 0], bins=30, alpha=0.6, color="#b03030", label="pseudoausências", density=True)
            ax.set_title(f"{esp.replace('_',' ')} — {NOME[modo]}", fontsize=10)
            ax.set_xlabel("adequabilidade prevista"); ax.grid(alpha=0.3)
            if i == 0 and k == 0:
                ax.legend(fontsize=8)
    fig.suptitle("Distribuição da adequabilidade prevista: presenças × pseudoausências", fontsize=13)
    fig.tight_layout()
    fig.savefig(COMP / "fig_distribuicao.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def fig_importancia():
    """Importância das 7 variáveis por metodologia (queda de AUC ao embaralhar), por espécie."""
    imp = pd.read_csv(COMP / "importancia.csv")
    ROT = {"t2m": "temperatura", "e": "evaporação", "tp": "precipitação",
           "ndvi": "vegetação (NDVI)", "altitude": "altitude", "awc": "água no solo",
           "ocup_solo_mapbiomas": "uso do solo"}
    fig, axes = plt.subplots(1, len(ESPS), figsize=(15, 4.6))
    for j, esp in enumerate(ESPS):
        ax = axes[j]; sub = imp[imp.especie == esp]
        ordem = sub[sub.modo == "clima"].sort_values("auc").variavel.tolist()
        if not ordem:
            ordem = sub.sort_values("auc").variavel.unique().tolist()
        y = np.arange(len(ordem)); h = 0.38
        for k, modo in enumerate(["daily", "clima"]):
            s = sub[sub.modo == modo].set_index("variavel").reindex(ordem)
            ax.barh(y + (k - 0.5) * h, s.auc.values, height=h, color=COR[modo],
                    label=NOME[modo])
        ax.set_yticks(y); ax.set_yticklabels([ROT.get(v, v) for v in ordem], fontsize=8)
        ax.set_title(esp.replace("_", " "), fontsize=11)
        ax.set_xlabel("importância (queda de AUC)", fontsize=9); ax.grid(alpha=0.3, axis="x")
        if j == 0:
            ax.legend(fontsize=8, loc="lower right")
    fig.suptitle("Importância das variáveis por metodologia (permutação)", fontsize=13)
    fig.tight_layout()
    fig.savefig(COMP / "fig_importancia.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def main():
    df = pd.read_csv(COMP / "avaliacao_pontos.csv")
    fig_importancia(); print("[ok] fig_importancia.png")
    fig_boxplots(df); print("[ok] fig_boxplots.png")
    fig_roc_pr(df); print("[ok] fig_roc_pr.png")
    fig_calibracao(df); print("[ok] fig_calibracao.png")
    fig_confusao(df); print("[ok] fig_confusao.png")
    fig_distribuicao(df); print("[ok] fig_distribuicao.png")


if __name__ == "__main__":
    main()
