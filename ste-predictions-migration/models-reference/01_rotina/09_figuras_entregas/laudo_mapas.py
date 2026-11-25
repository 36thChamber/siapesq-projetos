#!/usr/bin/env python3
# laudo_mapas.py — COMPARAÇÃO DAS PROJEÇÕES do Brasil (1 km) entre diário e climatológico.
# Como os dois modos são projetados sobre EXATAMENTE os mesmos rasters (média decenal), toda
# diferença vem da forma de treinar. Calcula (§16 contínuo, §17 binário, §25 por bioma):
#   - contínuo: Pearson, Spearman, MAE, RMSE, diferença média/absoluta/máx, % do Brasil com
#     |dif| > 0,05/0,10/0,20/0,30, Schoener's D, Hellinger's I;
#   - binário (limiar maxTSS de cada modelo): área km², % do Brasil, Jaccard, Sørensen-Dice,
#     concordância categórica, fragmentação;
#   - por bioma: adequabilidade média e área apta de cada modo.
# Figuras: mapas contínuos (diário|clima|diferença), mapa categórico de concordância,
# mapas de incerteza (sd). Só processa a espécie que já tem os DOIS mapas.

from __future__ import annotations

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parent.parent.parent
COMP = ROOT / "01_rotina" / "09_figuras_entregas" / "_comparacao_brasil"
PREDBR = ROOT / "02_dados_entrada" / "ambientais" / "predicao_brasil_comparacao"
PRED1KM = ROOT / "02_dados_entrada" / "ambientais" / "predicao_7var_brasil_1km"
ECO = ROOT / "05_dados_auxiliares" / "resolve_ecoregions" / "Ecoregions2017" / "Ecoregions2017.shp"
ESPS = ["Alouatta_caraya", "Alouatta_guariba", "Sapajus_nigritus"]


def _map(esp, modo, tipo="mean"):
    p = PREDBR / f"BR_{modo}_{esp}_{tipo}.tif"
    if not p.exists():
        return None
    with rasterio.open(p) as s:
        return s.read(1, masked=True).filled(np.nan).astype("float32")


def _area_km2_grid() -> np.ndarray:
    """Área (km²) de cada pixel 0,01°, variando com a latitude (cos)."""
    with rasterio.open(PRED1KM / "ndvi.tif") as s:
        H, W = s.height, s.width
        top = s.bounds.top; resy = s.res[1]
    lats = top - (np.arange(H) + 0.5) * resy
    dx = 0.01 * 111.320 * np.cos(np.radians(lats))    # km na horizontal por pixel
    dy = 0.01 * 110.574                                # km na vertical
    return np.repeat((dx * dy)[:, None], W, axis=1)


_BIOMA_CACHE = None


def _bioma_raster() -> tuple[np.ndarray, dict]:
    """Rasteriza os biomas (RESOLVE) na grade 1 km. Cacheado em disco."""
    global _BIOMA_CACHE
    if _BIOMA_CACHE is not None:
        return _BIOMA_CACHE
    cache = COMP / "_bioma_id_1km.tif"
    import geopandas as gpd
    with rasterio.open(PRED1KM / "ndvi.tif") as s:
        transform, H, W = s.transform, s.height, s.width
        bounds = s.bounds
    g = gpd.read_file(ECO, bbox=(bounds.left, bounds.bottom, bounds.right, bounds.top))
    g = g[g.BIOME_NAME.notna()].copy()
    nomes = sorted(g.BIOME_NAME.unique())
    idmap = {n: i + 1 for i, n in enumerate(nomes)}
    if cache.exists():
        with rasterio.open(cache) as s:
            rid = s.read(1)
    else:
        from rasterio.features import rasterize
        shapes = [(geom, idmap[b]) for geom, b in zip(g.geometry, g.BIOME_NAME)]
        rid = rasterize(shapes, out_shape=(H, W), transform=transform, fill=0,
                        dtype="int32")
        with rasterio.open(PRED1KM / "ndvi.tif") as s:
            perfil = s.profile.copy()
        perfil.update(dtype="int32", nodata=0, compress="deflate",
                      tiled=True, blockxsize=256, blockysize=256)
        with rasterio.open(cache, "w", **perfil) as dst:
            dst.write(rid, 1)
    _BIOMA_CACHE = (rid, {v: k for k, v in idmap.items()})
    return _BIOMA_CACHE


def schoener_hellinger(a, b, ok):
    """Sobreposição de nicho entre dois rasters de adequabilidade."""
    pa = a[ok]; pb = b[ok]
    pa = pa / pa.sum(); pb = pb / pb.sum()
    D = 1 - 0.5 * np.abs(pa - pb).sum()
    I = 1 - 0.5 * ((np.sqrt(pa) - np.sqrt(pb)) ** 2).sum()
    return float(D), float(I)


def comparar(esp, thr_daily, thr_clima) -> dict | None:
    a = _map(esp, "daily"); b = _map(esp, "clima")
    if a is None or b is None:
        return None
    ok = np.isfinite(a) & np.isfinite(b)
    x, y = a[ok], b[ok]
    from scipy.stats import spearmanr
    area = _area_km2_grid()
    D, I = schoener_hellinger(a, b, ok)
    d = x - y
    ba = (a >= thr_daily); bb = (b >= thr_clima)
    both = ok & ba & bb; onlyd = ok & ba & ~bb; onlyc = ok & ~ba & bb
    inter = float(area[both].sum()); ud = float(area[onlyd].sum()); uc = float(area[onlyc].sum())
    uni = inter + ud + uc
    out = dict(
        pixels=int(ok.sum()),
        pearson=float(np.corrcoef(x, y)[0, 1]),
        spearman=float(spearmanr(x, y).statistic),
        MAE=float(np.abs(d).mean()), RMSE=float(np.sqrt((d ** 2).mean())),
        dif_media=float(d.mean()), dif_abs_media=float(np.abs(d).mean()),
        dif_max=float(np.abs(d).max()),
        perc_dif_05=float((np.abs(d) > 0.05).mean() * 100),
        perc_dif_10=float((np.abs(d) > 0.10).mean() * 100),
        perc_dif_20=float((np.abs(d) > 0.20).mean() * 100),
        perc_dif_30=float((np.abs(d) > 0.30).mean() * 100),
        schoener_D=D, hellinger_I=I,
        limiar_daily=thr_daily, limiar_clima=thr_clima,
        area_apta_daily_km2=float(area[ok & ba].sum()),
        area_apta_clima_km2=float(area[ok & bb].sum()),
        intersecao_km2=inter, so_daily_km2=ud, so_clima_km2=uc,
        jaccard=inter / uni if uni else 0.0,
        sorensen=2 * inter / (float(area[ok & ba].sum()) + float(area[ok & bb].sum()))
        if (area[ok & ba].sum() + area[ok & bb].sum()) else 0.0,
        concordancia_apta=float((both.sum()) / max((ba | bb)[ok].sum(), 1)),
    )
    # fragmentação (nº de manchas aptas) por modo
    from scipy import ndimage
    for modo, bmap in [("daily", ba & ok), ("clima", bb & ok)]:
        lab, nfrag = ndimage.label(bmap)
        tam = np.bincount(lab.ravel())[1:] if nfrag else np.array([])
        out[f"fragmentos_{modo}"] = int(nfrag)
        out[f"maior_fragmento_km2_{modo}"] = float(area[lab == (tam.argmax() + 1)].sum()) if nfrag else 0.0
    # por bioma
    rid, nomes = _bioma_raster()
    biomas = {}
    for bid, nome in nomes.items():
        mb = ok & (rid == bid)
        if mb.sum() < 100:
            continue
        biomas[nome] = dict(
            pixels=int(mb.sum()),
            adeq_media_daily=float(a[mb].mean()), adeq_media_clima=float(b[mb].mean()),
            area_apta_daily_km2=float(area[mb & ba].sum()),
            area_apta_clima_km2=float(area[mb & bb].sum()),
            dif_media=float((a[mb] - b[mb]).mean()))
    out["por_bioma"] = biomas
    return out


def figura_mapas(especies_ok):
    n = len(especies_ok)
    fig, axes = plt.subplots(n, 3, figsize=(14, 4.3 * n))
    if n == 1:
        axes = axes.reshape(1, -1)
    for i, esp in enumerate(especies_ok):
        a = _map(esp, "daily"); b = _map(esp, "clima"); d = a - b
        for j, (arr, tit, cmap, lim) in enumerate([
            (a, f"{esp.replace('_',' ')}\ndiário", "viridis", (0, 1)),
            (b, f"{esp.replace('_',' ')}\nclimatológico", "viridis", (0, 1)),
            (d, f"{esp.replace('_',' ')}\ndiferença (diário − climatológico)", "RdBu_r", (-0.5, 0.5))]):
            ax = axes[i, j]
            im = ax.imshow(arr, cmap=cmap, vmin=lim[0], vmax=lim[1])
            ax.set_title(tit, fontsize=10); ax.axis("off")
            plt.colorbar(im, ax=ax, fraction=0.046, pad=0.02)
    fig.suptitle("Projeção no Brasil (1 km): adequabilidade e diferença entre metodologias",
                 fontsize=13, y=0.997)
    fig.tight_layout()
    fig.savefig(COMP / "fig_mapas_brasil.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def figura_concordancia(especies_ok, thr):
    from matplotlib.colors import ListedColormap
    n = len(especies_ok)
    fig, axes = plt.subplots(1, n, figsize=(5.2 * n, 5.4))
    if n == 1:
        axes = [axes]
    cmap = ListedColormap(["#eeeeee", "#4C72B0", "#DD8452", "#2a9d3f"])
    for i, esp in enumerate(especies_ok):
        a = _map(esp, "daily"); b = _map(esp, "clima")
        ok = np.isfinite(a) & np.isfinite(b)
        ba = a >= thr[esp]["daily"]; bb = b >= thr[esp]["clima"]
        cat = np.full(a.shape, np.nan)
        cat[ok & ~ba & ~bb] = 0; cat[ok & ba & ~bb] = 1
        cat[ok & ~ba & bb] = 2; cat[ok & ba & bb] = 3
        axes[i].imshow(cat, cmap=cmap, vmin=0, vmax=3)
        axes[i].set_title(esp.replace("_", " "), fontsize=11); axes[i].axis("off")
    from matplotlib.patches import Patch
    leg = [Patch(color="#eeeeee", label="inadequado nos dois"),
           Patch(color="#4C72B0", label="apto só no diário"),
           Patch(color="#DD8452", label="apto só no climatológico"),
           Patch(color="#2a9d3f", label="apto nos dois")]
    fig.legend(handles=leg, loc="lower center", ncol=4, fontsize=9)
    fig.suptitle("Concordância espacial das áreas aptas (limiar maxTSS)", fontsize=13)
    fig.tight_layout(rect=(0, 0.05, 1, 1))
    fig.savefig(COMP / "fig_concordancia_brasil.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def figura_incerteza(especies_ok):
    n = len(especies_ok)
    fig, axes = plt.subplots(n, 2, figsize=(10, 4.3 * n))
    if n == 1:
        axes = axes.reshape(1, -1)
    for i, esp in enumerate(especies_ok):
        for k, modo in enumerate(["daily", "clima"]):
            sd = _map(esp, modo, "sd")
            ax = axes[i, k]
            im = ax.imshow(sd, cmap="magma", vmin=0, vmax=0.25)
            ax.set_title(f"{esp.replace('_',' ')} — {('diário' if modo=='daily' else 'climatológico')}"
                         f"\nincerteza (dp entre 10 modelos)", fontsize=9)
            ax.axis("off"); plt.colorbar(im, ax=ax, fraction=0.046, pad=0.02)
    fig.suptitle("Incerteza da projeção (desvio-padrão do ensemble)", fontsize=13)
    fig.tight_layout()
    fig.savefig(COMP / "fig_incerteza_brasil.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def main():
    met = json.loads((COMP / "metricas.json").read_text(encoding="utf-8"))
    thr = {}
    resultado = {}
    ok_esps = []
    for esp in ESPS:
        td = met[esp]["daily"]["limiares"]["maxTSS"]
        tc = met[esp]["clima"]["limiares"]["maxTSS"]
        thr[esp] = {"daily": td, "clima": tc}
        r = comparar(esp, td, tc)
        if r is not None:
            resultado[esp] = r
            ok_esps.append(esp)
            print(f"  {esp:18} r={r['pearson']:.3f} D={r['schoener_D']:.3f} "
                  f"apta_daily={r['area_apta_daily_km2']/1e3:.0f}k km² "
                  f"apta_clima={r['area_apta_clima_km2']/1e3:.0f}k km² "
                  f"Jaccard={r['jaccard']:.3f}")
    if ok_esps:
        figura_mapas(ok_esps); figura_concordancia(ok_esps, thr); figura_incerteza(ok_esps)
        (COMP / "mapas.json").write_text(json.dumps(resultado, indent=2, ensure_ascii=False),
                                         encoding="utf-8")
        print(f"[ok] mapas.json + figuras ({len(ok_esps)}/3 espécies)")
    else:
        print("[aviso] nenhuma espécie com os 2 mapas prontos ainda.")


if __name__ == "__main__":
    main()
