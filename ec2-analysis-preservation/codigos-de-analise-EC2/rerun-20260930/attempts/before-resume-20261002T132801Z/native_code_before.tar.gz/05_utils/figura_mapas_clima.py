#!/usr/bin/env python3
# figura_mapas_clima.py — Plota lado a lado os mapas CLIMATOLOGICOS das 3 especies,
# recortados no RS, na mesma escala. Dois tipos:
#   --tipo mean : ADEQUABILIDADE (media dos bootstraps), escala fixa 0..1
#   --tipo sd   : INCERTEZA (desvio-padrao dos 10 modelos), escala 0..max compartilhado
#
# Escala de cor PADRAO = frio->quente (azul -> vermelho, 'coolwarm') p/ os dois tipos.
#
# Uso:
#   python 05_utils/figura_mapas_clima.py --tipo mean
#   python 05_utils/figura_mapas_clima.py --tipo sd
#   python 05_utils/figura_mapas_clima.py --tipo mean --cmap coolwarm --data 2026-07-17

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parent.parent
BASE07 = ROOT / "07 Executado por espécie"
sys.path.insert(0, str(ROOT / "05_utils"))

ESPECIES = ["Alouatta_caraya", "Alouatta_guariba", "Sapajus_nigritus"]
CMAP_PADRAO = "coolwarm"  # frio->quente (azul -> vermelho) para adequabilidade E incerteza

TIPOS = {
    "mean": {"sufixo": "mean", "rotulo": "Adequabilidade climática (0 = inadequado, 1 = adequado)",
             "titulo": "Adequabilidade climatológica no Rio Grande do Sul — 250 m "
                       "(Random Forest, média de 10 anos)",
             "saida": "mapas_climatologico_RS_3especies.png"},
    "sd":   {"sufixo": "sd", "rotulo": "Incerteza — desvio-padrão entre os 10 modelos "
                       "(maior = modelos discordam mais)",
             "titulo": "Incerteza da predição climatológica no Rio Grande do Sul — 250 m "
                       "(desvio-padrão dos 10 bootstraps)",
             "saida": "mapas_incerteza_RS_3especies.png"},
}


def _outline_rs():
    try:
        from recortar_estado import malha_uf
        return malha_uf("RS")
    except Exception as e:  # noqa: BLE001
        print(f"[fig] aviso: sem contorno do RS ({type(e).__name__}: {e})")
        return None


def plotar(tipo: str, data: str, out: Path, cmap: str) -> Path:
    cfg = TIPOS[tipo]
    rs = _outline_rs()

    # 1a passada: carrega arrays + stats (define vmax compartilhado para 'sd').
    dados = {}
    for sp in ESPECIES:
        tif = (BASE07 / sp / data / "predicao_climatologico_RS" /
               f"RS_clima_{sp}_{cfg['sufixo']}_RS.tif")
        if not tif.exists():
            print(f"[fig] FALTA: {tif}")
            dados[sp] = None
            continue
        with rasterio.open(tif) as src:
            arr = src.read(1, masked=True).filled(np.nan)
            b = src.bounds
        v = arr[np.isfinite(arr)]
        dados[sp] = (arr, b)
        print(f"[stats] {sp:20} {tipo}: min={v.min():.3f} max={v.max():.3f} media={v.mean():.3f}")

    if tipo == "mean":
        vmin, vmax = 0.0, 1.0
    else:  # sd: 0..max compartilhado (arredondado p/ cima em 0.05)
        allmax = max((np.nanmax(a) for a, _ in filter(None, dados.values())), default=1.0)
        vmax = float(np.ceil(allmax / 0.05) * 0.05)
        vmin = 0.0

    fig, axes = plt.subplots(1, len(ESPECIES), figsize=(5.2 * len(ESPECIES), 6.2),
                             constrained_layout=True)
    if len(ESPECIES) == 1:
        axes = [axes]
    im = None
    for ax, sp in zip(axes, ESPECIES):
        titulo = sp.replace("_", " ")
        if dados[sp] is None:
            ax.set_title(f"{titulo}\n(sem mapa)", fontsize=12, style="italic")
            ax.set_axis_off(); continue
        arr, b = dados[sp]
        im = ax.imshow(arr, extent=[b.left, b.right, b.bottom, b.top],
                       origin="upper", cmap=cmap, vmin=vmin, vmax=vmax)
        if rs is not None:
            rs.boundary.plot(ax=ax, color="black", linewidth=0.6, alpha=0.5)
        ax.set_title(titulo, fontsize=13, style="italic")
        ax.set_xticks([]); ax.set_yticks([]); ax.set_aspect("equal")
    if im is not None:
        cb = fig.colorbar(im, ax=axes, orientation="horizontal", fraction=0.046,
                          pad=0.03, shrink=0.6)
        cb.set_label(cfg["rotulo"])
    fig.suptitle(cfg["titulo"], fontsize=14)
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=160, bbox_inches="tight")
    plt.close(fig)
    print(f"[fig] salvo: {out}")
    return out


def main():
    p = argparse.ArgumentParser(description="Mapas climatologicos do RS lado a lado (3 especies).")
    p.add_argument("--tipo", choices=list(TIPOS), default="mean",
                   help="mean=adequabilidade | sd=incerteza. Padrao: mean.")
    p.add_argument("--data", default="2026-07-17", help="Subpasta datada da rodada.")
    p.add_argument("--cmap", default=CMAP_PADRAO, help=f"Colormap. Padrao: {CMAP_PADRAO} (azul->vermelho).")
    p.add_argument("--out", default=None, help="PNG de saida (padrao depende do --tipo).")
    a = p.parse_args()
    out = Path(a.out) if a.out else (BASE07 / TIPOS[a.tipo]["saida"])
    plotar(a.tipo, a.data, out, a.cmap)


if __name__ == "__main__":
    main()
