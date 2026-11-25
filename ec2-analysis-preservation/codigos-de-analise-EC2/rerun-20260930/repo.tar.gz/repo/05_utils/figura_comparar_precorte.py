#!/usr/bin/env python3
# figura_comparar_precorte.py — Figura PNG comparando, por especie, a adequabilidade no RS
# do modelo com pseudo-ausencia LARGA (pre-corte ~650km+) vs a de 200km (atual).
#
# Grade: 3 especies (linhas) x 2 cenarios (colunas: "agora 200km" | "anterior pre-corte").
# Mapa de MAGNITUDE (adequabilidade 0-1) -> rampa sequencial perceptualmente uniforme
# (magma), MESMA escala 0-1 em todos os paineis, barra de cor UNICA compartilhada, contorno
# oficial do RS. Paineis ainda nao prontos aparecem como "gerando...".

from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import rasterio
import rasterio.mask
from matplotlib.patches import Patch  # noqa: F401

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "05_utils"))
from recortar_estado import malha_uf  # reusa a malha IBGE cacheada

B = "07 Executado por espécie"
# (rotulo, caminho agora-200km, caminho anterior-precorte)
ESPECIES = [
    ("Alouatta caraya",
     f"{B}/Alouatta_caraya/2026-07-15/modelo_rf_climatologico/rf_clim_Alouatta_caraya_adequabilidade_RS_recortado_mean.tif",
     f"{B}/Alouatta_caraya/2026-07-13/modelo_rf_climatologico_precorte/rf_clim_Alouatta_caraya_precorte_adequabilidade_RS_recortado_mean.tif"),
    ("Alouatta guariba",
     f"{B}/Alouatta_guariba/2026-07-15/modelo_rf_climatologico/rf_clim_Alouatta_guariba_adequabilidade_RS_recortado_mean.tif",
     f"{B}/Alouatta_guariba/2026-07-13/modelo_rf_climatologico_precorte/rf_clim_Alouatta_guariba_precorte_adequabilidade_RS_recortado_mean.tif"),
    ("Sapajus nigritus",
     f"{B}/Sapajus_nigritus/2026-07-15/modelo_rf_climatologico/rf_clim_Sapajus_nigritus_adequabilidade_RS_recortado_mean.tif",
     f"{B}/Sapajus_nigritus/2026-07-13/modelo_rf_climatologico_precorte/rf_clim_Sapajus_nigritus_precorte_adequabilidade_RS_recortado_mean.tif"),
]
COLS = [("agora — pseudo 200 km", 1), ("anterior — pseudo larga (pré-corte)", 2)]


def _recortar_se_preciso(path: str):
    """Se o *_recortado_ não existe mas o *_mean.tif (bbox) existe, recorta no RS."""
    p = Path(path)
    if p.exists():
        return p
    bbox_v = Path(str(path).replace("_recortado_mean.tif", "_mean.tif"))
    if bbox_v.exists():
        from recortar_estado import recortar
        recortar(bbox_v, p, "RS")
        return p if p.exists() else None
    return None


def main():
    out = ROOT / B / "comparacao_precorte_vs_200km_RS.png"
    rs = malha_uf("RS").to_crs("EPSG:4326")

    fig, axes = plt.subplots(3, 2, figsize=(9.5, 12.6), constrained_layout=True)
    fig.suptitle("Adequabilidade climática no Rio Grande do Sul (250 m)\n"
                 "efeito do corte de 200 km na pseudo-ausência",
                 fontsize=15, fontweight="bold")
    im = None
    for i, (nome, p_agora, p_ant) in enumerate(ESPECIES):
        for j, (rotulo, _) in enumerate(COLS):
            ax = axes[i, j]
            path = _recortar_se_preciso(p_agora if j == 0 else p_ant)
            rs.boundary.plot(ax=ax, color="#333333", linewidth=0.7, zorder=3)
            if path is None:
                ax.text(0.5, 0.5, "gerando…", ha="center", va="center",
                        transform=ax.transAxes, fontsize=13, color="#999999")
            else:
                with rasterio.open(path) as ds:
                    a = ds.read(1)
                    ext = [ds.bounds.left, ds.bounds.right, ds.bounds.bottom, ds.bounds.top]
                a = np.where(np.isfinite(a), a, np.nan)
                im = ax.imshow(a, extent=ext, origin="upper", cmap="magma",
                               vmin=0.0, vmax=1.0, interpolation="nearest", zorder=2)
                v = a[np.isfinite(a)]
                pct = 100 * (v > 0.5).mean() if v.size else 0
                ax.text(0.02, 0.02, f"média {v.mean():.2f} · >0,5: {pct:.1f}%",
                        transform=ax.transAxes, fontsize=8, va="bottom", ha="left",
                        bbox=dict(boxstyle="round,pad=0.25", fc="white", ec="none", alpha=0.75))
            ax.set_xlim(-58.0, -49.3); ax.set_ylim(-34.0, -26.8)
            ax.set_xticks([]); ax.set_yticks([])
            for s in ax.spines.values():
                s.set_visible(False)
            if i == 0:
                ax.set_title(rotulo, fontsize=11, fontweight="bold")
            if j == 0:
                ax.set_ylabel(nome, fontsize=12, fontstyle="italic", fontweight="bold")

    if im is not None:
        cb = fig.colorbar(im, ax=axes, orientation="horizontal", fraction=0.045,
                          pad=0.02, shrink=0.6, aspect=40)
        cb.set_label("adequabilidade climática (0 = inadequado, 1 = ótimo)", fontsize=10)
        cb.set_ticks([0, 0.25, 0.5, 0.75, 1.0])
    fig.savefig(out, dpi=150, bbox_inches="tight")
    print(f"[fig] salvo: {out}")


if __name__ == "__main__":
    main()
