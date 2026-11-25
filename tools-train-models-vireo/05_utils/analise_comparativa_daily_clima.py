#!/usr/bin/env python3
# analise_comparativa_daily_clima.py — ANÁLISE COMPARATIVA das duas metodologias de clima
# (DIÁRIO/ERA5 na data do registro  ×  CLIMATOLÓGICO/média de 10 anos) para as 3 espécies.
#
# Responde, com número e figura, a três perguntas:
#   1) Os MAPAS de adequabilidade no RS são iguais? (correlação, diferença média, área apta)
#   2) Quais VARIÁVEIS mandam em cada metodologia? (importância = queda de AUC ao embaralhar)
#   3) COMO cada variável influencia a predição em cada modo? (curvas de resposta)
#
# Entradas (já geradas pelo pipeline):
#   - mapas:        07 .../<esp>/2026-07-17/predicao_{daily,climatologico}_RS/*_mean_RS.tif
#   - métricas:     .../modelo_rf_{daily,climatologico}/*_eval.csv
#   - importância e curvas: _analise_comparativa/{importancia,resposta}.csv
#     (gerados por 04_modeling/extrair_importancia_resposta.R — RODAR ANTES)
#
# Saídas em 07 Executado por espécie/:
#   comparacao_daily_clima_mapas.png       mapas lado a lado + diferença
#   comparacao_daily_clima_variaveis.png   importância por modo + curvas de resposta
#   comparacao_daily_clima_relatorio.md    o texto com os números
#
# Uso (da raiz do repo):
#   python 05_utils/analise_comparativa_daily_clima.py

from __future__ import annotations

import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import rasterio

ROOT = Path(__file__).resolve().parent.parent
BASE07 = ROOT / "07 Executado por espécie"
ANALISE = ROOT / "05_utils" / "_analise_comparativa"
RODADA = "2026-07-17"
ESPS = ["Alouatta_caraya", "Alouatta_guariba", "Sapajus_nigritus"]
MODOS = {"daily": "diário (ERA5 na data)", "clima": "climatológico (média 10 anos)"}

# Nome legível das 7 variáveis (o eixo do gráfico não pode falar em 't2m').
ROTULO = {
    "t2m": "temperatura",
    "e": "evaporação",
    "tp": "precipitação",
    "ndvi": "vegetação (NDVI)",
    "altitude": "altitude",
    "awc": "água no solo",
    "ocup_solo_mapbiomas": "uso do solo",
}
# Limiar de "área apta" — o mesmo para os dois modos, senão a comparação de área não vale.
LIMIAR_APTO = 0.5


def _tif(esp: str, modo: str) -> Path | None:
    sub = "predicao_daily_RS" if modo == "daily" else "predicao_climatologico_RS"
    pre = "RS_daily_" if modo == "daily" else "RS_clima_"
    p = BASE07 / esp / RODADA / sub / f"{pre}{esp}_mean_RS.tif"
    return p if p.exists() else None


def _ler(p: Path) -> np.ndarray:
    with rasterio.open(p) as src:
        a = src.read(1, masked=True)
    return np.ma.filled(a.astype("float32"), np.nan)


def _eval(esp: str, modo: str) -> pd.DataFrame | None:
    d = "modelo_rf_daily" if modo == "daily" else "modelo_rf_climatologico"
    s = "daily" if modo == "daily" else "clima"
    p = BASE07 / esp / RODADA / d / f"rf_{esp}_{s}_eval.csv"
    return pd.read_csv(p) if p.exists() else None


def comparar_mapas() -> pd.DataFrame:
    """Números da comparação pixel a pixel entre os dois mapas de cada espécie."""
    linhas = []
    for esp in ESPS:
        pa, pb = _tif(esp, "daily"), _tif(esp, "clima")
        if not (pa and pb):
            print(f"[aviso] mapa faltando para {esp} — pulando")
            continue
        a, b = _ler(pa), _ler(pb)
        if a.shape != b.shape:
            print(f"[aviso] {esp}: mapas com formatos diferentes {a.shape} x {b.shape}")
            continue
        ok = np.isfinite(a) & np.isfinite(b)
        if not ok.any():
            continue
        x, y = a[ok], b[ok]
        # Área apta: fração de pixels acima do limiar, no MESMO recorte válido.
        linhas.append(dict(
            especie=esp,
            pixels=int(ok.sum()),
            media_daily=float(x.mean()), media_clima=float(y.mean()),
            corr=float(np.corrcoef(x, y)[0, 1]),
            dif_media=float((x - y).mean()),
            dif_abs_media=float(np.abs(x - y).mean()),
            dif_p95=float(np.percentile(np.abs(x - y), 95)),
            apta_daily=float((x >= LIMIAR_APTO).mean()),
            apta_clima=float((y >= LIMIAR_APTO).mean()),
            concordancia=float(((x >= LIMIAR_APTO) == (y >= LIMIAR_APTO)).mean()),
        ))
    return pd.DataFrame(linhas)


def figura_mapas(dfm: pd.DataFrame) -> Path:
    """3 linhas (espécies) x 3 colunas (diário, climatológico, diferença)."""
    n = len(ESPS)
    fig, axes = plt.subplots(n, 3, figsize=(13, 4.1 * n))
    if n == 1:
        axes = axes.reshape(1, -1)
    for i, esp in enumerate(ESPS):
        pa, pb = _tif(esp, "daily"), _tif(esp, "clima")
        nome = esp.replace("_", " ")
        if not (pa and pb):
            for j in range(3):
                axes[i, j].text(0.5, 0.5, f"{nome}\n(mapa ausente)", ha="center",
                                va="center"); axes[i, j].axis("off")
            continue
        a, b = _ler(pa), _ler(pb)
        d = a - b
        for j, (arr, tit, cmap, lim) in enumerate([
            (a, f"{nome}\ndiário (ERA5 na data)", "viridis", (0, 1)),
            (b, f"{nome}\nclimatológico (média 10 anos)", "viridis", (0, 1)),
            (d, f"{nome}\ndiferença (diário − climatológico)", "RdBu_r", (-0.5, 0.5)),
        ]):
            ax = axes[i, j]
            im = ax.imshow(arr, cmap=cmap, vmin=lim[0], vmax=lim[1])
            ax.set_title(tit, fontsize=10)
            ax.axis("off")
            plt.colorbar(im, ax=ax, fraction=0.046, pad=0.02)
        if len(dfm):
            r = dfm[dfm.especie == esp]
            if len(r):
                r = r.iloc[0]
                # r["corr"] e nao r.corr: em Series, `.corr` e' o METODO do pandas,
                # nao a coluna — e o erro so' aparece na hora de formatar.
                axes[i, 2].set_xlabel(
                    f"r={r['corr']:.3f} | dif.média={r['dif_media']:+.3f} | "
                    f"concordância={100*r['concordancia']:.1f}%", fontsize=8)
    fig.suptitle("Adequabilidade no RS (250 m): duas metodologias de clima",
                 fontsize=13, y=0.995)
    fig.tight_layout()
    out = BASE07 / "comparacao_daily_clima_mapas.png"
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)
    return out


def figura_variaveis(imp: pd.DataFrame, resp: pd.DataFrame) -> Path:
    """Esquerda: importância por modo (barras lado a lado). Direita: curvas de resposta
    das variáveis contínuas, diário x climatológico sobrepostos."""
    conts = [v for v in ROTULO if v != "ocup_solo_mapbiomas"]
    fig = plt.figure(figsize=(15, 4.3 * len(ESPS)))
    gs = fig.add_gridspec(len(ESPS), 3, width_ratios=[1.15, 1, 1], hspace=0.45, wspace=0.28)

    for i, esp in enumerate(ESPS):
        # --- importância -------------------------------------------------------
        ax = fig.add_subplot(gs[i, 0])
        sub = imp[imp.especie == esp]
        if len(sub):
            ordem = (sub[sub.modo == "clima"].sort_values("auc", ascending=True)
                     .variavel.tolist())
            if not ordem:
                ordem = sub.sort_values("auc").variavel.unique().tolist()
            y = np.arange(len(ordem)); h = 0.38
            for k, (modo, cor) in enumerate([("daily", "#4C72B0"), ("clima", "#DD8452")]):
                s = sub[sub.modo == modo].set_index("variavel").reindex(ordem)
                ax.barh(y + (k - 0.5) * h, s.auc.values, height=h,
                        label=MODOS[modo], color=cor)
            ax.set_yticks(y); ax.set_yticklabels([ROTULO.get(v, v) for v in ordem], fontsize=9)
            ax.set_xlabel("importância (queda de AUC ao embaralhar)", fontsize=9)
            ax.set_title(f"{esp.replace('_',' ')} — importância", fontsize=10)
            if i == 0:
                ax.legend(fontsize=8, loc="lower right")

        # --- curvas de resposta: as 2 variáveis mais importantes ---------------
        # `x` vem como TEXTO do R de proposito (ver nota no extrator: o fator do uso do
        # solo transformava os numeros das outras variaveis em NA no rbind).
        sub_r = resp[(resp.especie == esp) & (~resp.categorica.astype(bool))].copy()
        sub_r["x"] = pd.to_numeric(sub_r["x"], errors="coerce")
        sub_r = sub_r.dropna(subset=["x", "y"])
        if len(sub_r) and len(sub):
            top = (sub[sub.modo == "clima"].sort_values("auc", ascending=False)
                   .variavel.tolist())
            top = [v for v in top if v in conts][:2]
            for j, v in enumerate(top):
                ax = fig.add_subplot(gs[i, 1 + j])
                for modo, cor in [("daily", "#4C72B0"), ("clima", "#DD8452")]:
                    d = sub_r[(sub_r.modo == modo) & (sub_r.variavel == v)]
                    if not len(d):
                        continue
                    d = d.sort_values("x")
                    ax.plot(d.x, d.y, color=cor, lw=2, label=MODOS[modo])
                ax.set_title(f"{esp.replace('_',' ')} — {ROTULO.get(v, v)}", fontsize=10)
                ax.set_xlabel(ROTULO.get(v, v), fontsize=9)
                ax.set_ylabel("adequabilidade", fontsize=9)
                ax.grid(alpha=0.3)
                if i == 0 and j == 0:
                    ax.legend(fontsize=8)
    fig.suptitle("Quais variáveis mandam, e como, em cada metodologia", fontsize=13)
    out = BASE07 / "comparacao_daily_clima_variaveis.png"
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)
    return out


def main() -> None:
    imp_p, resp_p = ANALISE / "importancia.csv", ANALISE / "resposta.csv"
    if not imp_p.exists():
        sys.exit("[erro] falta importancia.csv — rode antes:\n"
                 "  Rscript 04_modeling/extrair_importancia_resposta.R "
                 f'"{ANALISE.relative_to(ROOT)}"')
    imp = pd.read_csv(imp_p)
    resp = pd.read_csv(resp_p) if resp_p.exists() else pd.DataFrame()

    print("[1/3] comparando mapas pixel a pixel...")
    dfm = comparar_mapas()
    print("[2/3] figura dos mapas...")
    f1 = figura_mapas(dfm)
    print("[3/3] figura das variaveis...")
    f2 = figura_variaveis(imp, resp)

    # --- métricas dos modelos --------------------------------------------------
    met = []
    for esp in ESPS:
        for modo in MODOS:
            ev = _eval(esp, modo)
            if ev is not None:
                met.append(dict(especie=esp, modo=modo, AUC=ev.AUC.mean(),
                                TSS=ev.TSS.mean(), AUC_sd=ev.AUC.std()))
    dfmet = pd.DataFrame(met)

    dfm.to_csv(ANALISE / "comparacao_mapas.csv", index=False)
    dfmet.to_csv(ANALISE / "metricas.csv", index=False)
    print("\n=== MÉTRICAS ===");   print(dfmet.to_string(index=False))
    print("\n=== MAPAS ===");      print(dfm.to_string(index=False))
    print("\n=== IMPORTÂNCIA (top 3 por modelo) ===")
    for esp in ESPS:
        for modo in MODOS:
            s = imp[(imp.especie == esp) & (imp.modo == modo)].sort_values("auc",
                                                                          ascending=False)
            if len(s):
                top = ", ".join(f"{ROTULO.get(r.variavel, r.variavel)} {r.auc:.3f}"
                                for r in s.head(3).itertuples())
                print(f"  {esp:18} {modo:6} {top}")
    print(f"\n[ok] {f1.name}\n[ok] {f2.name}")


if __name__ == "__main__":
    main()
