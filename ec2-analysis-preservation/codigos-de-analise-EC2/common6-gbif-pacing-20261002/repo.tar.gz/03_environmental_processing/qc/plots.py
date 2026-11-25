#!/usr/bin/env python3
# plots.py — Seções 3/4/9/10: figuras (matplotlib puro, backend Agg, sem seaborn).
#
# Baixo consumo de memória: cada figura é fechada após salvar; para volumes enormes,
# os gráficos AMOSTRAM até `_MAX_PLOT` pontos por grupo (as estatísticas usam tudo).
from __future__ import annotations

import base64
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

_MAX_PLOT = 50_000
_COR = {"completo": "#888888", "presencas": "#1f77b4", "ausencias": "#d62728"}
_ROT = {"completo": "Completo", "presencas": "Presenças", "ausencias": "Pseudoausências"}


def _amostra(x: np.ndarray) -> np.ndarray:
    x = x[np.isfinite(x)]
    if x.size > _MAX_PLOT:
        idx = np.linspace(0, x.size - 1, _MAX_PLOT).astype(int)
        return x[idx]
    return x


def _kde(ax, x, cor, label):
    x = _amostra(x)
    if x.size < 5 or np.ptp(x) == 0:
        return
    try:
        from scipy.stats import gaussian_kde
        grid = np.linspace(x.min(), x.max(), 200)
        ax.plot(grid, gaussian_kde(x)(grid), color=cor, label=label, lw=1.8)
    except Exception:  # noqa: BLE001
        pass


def _ecdf(ax, x, cor, label):
    x = np.sort(_amostra(x))
    if x.size:
        ax.step(x, np.arange(1, x.size + 1) / x.size, color=cor, label=label, where="post")


def figura_variavel(qc, var: str, out_dir: Path) -> Path | None:
    """Figura comparativa por variável: histograma+densidade, boxplot, violin, ECDF."""
    grupos = [g for g in ("presencas", "ausencias") if g in qc.conjuntos] or ["completo"]
    dados = {g: qc.conjuntos[g][var].to_numpy(dtype="float64", na_value=np.nan)
             for g in grupos}
    if all(_amostra(v).size == 0 for v in dados.values()):
        return None
    fig, axs = plt.subplots(2, 2, figsize=(11, 7.5))
    fig.suptitle(f"Distribuição — {var}", fontsize=13, fontweight="bold")

    # (1) Histograma + densidade
    ax = axs[0, 0]
    for g, v in dados.items():
        vv = _amostra(v)
        if vv.size:
            ax.hist(vv, bins=30, density=True, alpha=0.35, color=_COR[g])
            _kde(ax, v, _COR[g], _ROT[g])
    ax.set_title("Histograma + densidade"); ax.legend(fontsize=8)

    # (2) Boxplot
    ax = axs[0, 1]
    vals = [_amostra(dados[g]) for g in grupos]
    bp = ax.boxplot(vals, tick_labels=[_ROT[g] for g in grupos], patch_artist=True)
    for patch, g in zip(bp["boxes"], grupos):
        patch.set_facecolor(_COR[g]); patch.set_alpha(0.5)
    ax.set_title("Boxplot")

    # (3) Violin
    ax = axs[1, 0]
    try:
        vp = ax.violinplot(vals, showmeans=True)
        for b, g in zip(vp["bodies"], grupos):
            b.set_facecolor(_COR[g]); b.set_alpha(0.5)
        ax.set_xticks(range(1, len(grupos) + 1)); ax.set_xticklabels([_ROT[g] for g in grupos])
    except Exception:  # noqa: BLE001
        pass
    ax.set_title("Violin plot")

    # (4) ECDF
    ax = axs[1, 1]
    for g, v in dados.items():
        _ecdf(ax, v, _COR[g], _ROT[g])
    ax.set_title("ECDF (distribuição acumulada)"); ax.legend(fontsize=8)

    fig.tight_layout(rect=[0, 0, 1, 0.96])
    # Carimbada como todas as saídas: um `altitude.png` solto não diz de que espécie é.
    out = out_dir / qc.arq(f"{var}.png")
    fig.savefig(out, dpi=90); plt.close(fig)
    return out


def distribuicoes(qc, dist_dir: Path) -> dict:
    """Gera uma figura por variável contínua. Retorna {var: Path}."""
    dist_dir.mkdir(parents=True, exist_ok=True)
    paths = {}
    for var in qc.continuas:
        try:
            p = figura_variavel(qc, var, dist_dir)
            if p:
                paths[var] = p
        except Exception:  # noqa: BLE001
            pass
    return paths


def heatmap_correlacao(mat, out_path: Path, titulo="Correlação de Pearson") -> Path | None:
    if mat is None or mat.empty:
        return None
    fig, ax = plt.subplots(figsize=(max(6, 0.6 * len(mat)), max(5, 0.6 * len(mat))))
    im = ax.imshow(mat.to_numpy(), vmin=-1, vmax=1, cmap="RdBu_r")
    ax.set_xticks(range(len(mat))); ax.set_xticklabels(mat.columns, rotation=90, fontsize=8)
    ax.set_yticks(range(len(mat))); ax.set_yticklabels(mat.index, fontsize=8)
    for i in range(len(mat)):
        for j in range(len(mat)):
            ax.text(j, i, f"{mat.iloc[i, j]:.2f}", ha="center", va="center",
                    fontsize=7, color="black")
    ax.set_title(titulo); fig.colorbar(im, ax=ax, shrink=0.8)
    fig.tight_layout(); fig.savefig(out_path, dpi=90); plt.close(fig)
    return out_path


def grafico_pca(pca_res, qc, out_path: Path) -> Path | None:
    p = (pca_res or {}).get("completo")
    if p is None:
        return None
    fig, axs = plt.subplots(1, 2, figsize=(12, 5))
    # Scree
    r = p["explained_variance_ratio"]
    axs[0].bar(range(1, len(r) + 1), r * 100, color="#4c72b0")
    axs[0].plot(range(1, len(r) + 1), p["explained_cumulative"] * 100, "o-", color="#dd8452")
    axs[0].set_xlabel("Componente"); axs[0].set_ylabel("% variância")
    axs[0].set_title("Scree Plot (variância explicada)")
    # Scatter PC1×PC2 (presença/ausência)
    ax = axs[1]; sc = p["scores"]
    if qc.tem_sp:
        df_c = qc.conjuntos["completo"]; usar = p["variaveis"]
        mask = df_c[usar].notna().all(axis=1).to_numpy()
        spv = df_c.loc[mask, "sp"].to_numpy()
        for val, g in ((1, "presencas"), (0, "ausencias")):
            m = spv == val
            ax.scatter(sc[m, 0], sc[m, 1], s=10, alpha=0.5, color=_COR[g], label=_ROT[g])
        ax.legend(fontsize=8)
    else:
        ax.scatter(sc[:, 0], sc[:, 1], s=10, alpha=0.5, color=_COR["completo"])
    ax.set_xlabel(f"PC1 ({r[0]*100:.1f}%)")
    ax.set_ylabel(f"PC2 ({r[1]*100:.1f}%)" if len(r) > 1 else "PC2")
    ax.set_title("PCA — PC1 × PC2")
    fig.tight_layout(); fig.savefig(out_path, dpi=90); plt.close(fig)
    return out_path


def b64(path: Path | None) -> str | None:
    """Codifica um PNG em base64 (para embutir no HTML auto-contido)."""
    if path is None or not Path(path).exists():
        return None
    return base64.b64encode(Path(path).read_bytes()).decode("ascii")
