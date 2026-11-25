#!/usr/bin/env python3
# gerar_pseudo_rs_v2.py — pseudoausencias v2 do caraya regional (rodada de dados 2026-08-12):
#
#   AREA M    = uniao das sub-bacias HydroSHEDS nivel 6 que contem >=1 presenca,
#               recortada a janela regional (a "area acessivel" vira hidrografica —
#               e como a especie se move no Pampa: corredor ripario, nao linha reta).
#   SORTEIO   = TARGET-GROUP BACKGROUND (Phillips et al. 2009): as pseudo caem em
#               celulas ~1 km onde OUTRAS especies do projeto foram registradas e o
#               caraya nao — corrige o vies de amostragem ("observador vai onde tem
#               estrada"). Peso = nº de registros do grupo-alvo na celula.
#   REGRAS    = 1:1 com as presencas, minimo 10 km de qualquer presenca, seed 42.
#               Se o pool do grupo-alvo nao bastar, completa com celulas uniformes
#               dentro da Area M (reportado).
#
# Saida: Pseudoabsence_*.csv (presencas sp=1 + pseudo sp=0) na convencao, em
# 07/Alouatta_caraya/2026-08-12/regional_rs_v2/ + mapa PNG simples.
# EXECUTAR DA RAIZ, no venv.

from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import naming  # noqa: E402

BASE07 = ROOT / "07 Executado por espécie"
V2DIR = BASE07 / "Alouatta_caraya" / "2026-08-12" / "regional_rs_v2"
BACIAS = ROOT / "env_data" / "hidrografia" / "hybas_sa_lev06_v1c.shp"
W, S, E, N = -60.5, -34.0, -49.5, -25.0
SEED = 42
MIN_DIST_KM = 10.0
CEL = 0.01  # ~1,1 km

ESPECIES_TG = ["Alouatta_guariba", "Sapajus_nigritus", "Chrysocyon_brachyurus",
               "Desmodus_rotundus", "Didelphis_albiventris", "Eira_barbara",
               "Hydrochoerus_hydrochaeris", "Myrmecophaga_tridactyla",
               "Nasua_nasua", "Puma_concolor"]


def _p(m=""):
    print(m, flush=True)


def carregar_target_group() -> pd.DataFrame:
    """Registros mais recentes (Occurrence_*.csv) de cada especie do grupo-alvo."""
    frames = []
    for esp in ESPECIES_TG:
        d = BASE07 / esp
        if not d.exists():
            continue
        cands = sorted(d.rglob("Occurrence_*.csv"), key=lambda p: p.stat().st_mtime)
        if not cands:
            continue
        df = pd.read_csv(cands[-1], usecols=lambda c: c in
                         ("decimalLatitude", "decimalLongitude"))
        df["especie_tg"] = esp
        frames.append(df)
        _p(f"[tg] {esp}: {len(df)} registros ({cands[-1].name})")
    return pd.concat(frames, ignore_index=True)


def main():
    rng = np.random.default_rng(SEED)
    occ = pd.read_csv(V2DIR / "Occurrence_Alouatta_caraya_12_08_26.csv")
    pres = occ[["decimalLatitude", "decimalLongitude"]].to_numpy(float)
    _p(f"[v2] presencas: {len(pres)}")

    # AREA M por sub-bacias
    bac = gpd.read_file(BACIAS, bbox=(W, S, E, N))
    pts = gpd.GeoDataFrame(geometry=gpd.points_from_xy(pres[:, 1], pres[:, 0]), crs="EPSG:4326")
    com_presenca = gpd.sjoin(bac, pts, predicate="contains")["HYBAS_ID"].unique()
    area_m = bac[bac.HYBAS_ID.isin(com_presenca)].union_all()
    from shapely.geometry import box
    area_m = area_m.intersection(box(W, S, E, N))
    _p(f"[v2] Area M: {len(com_presenca)}/{len(bac)} sub-bacias nivel 6 com presenca")

    # pool do grupo-alvo
    tg = carregar_target_group()
    tg = tg.dropna()
    tg = tg[(tg.decimalLongitude >= W) & (tg.decimalLongitude <= E)
            & (tg.decimalLatitude >= S) & (tg.decimalLatitude <= N)]
    _p(f"[v2] grupo-alvo na janela: {len(tg)} registros")
    gtg = gpd.GeoDataFrame(tg, geometry=gpd.points_from_xy(tg.decimalLongitude,
                                                           tg.decimalLatitude), crs="EPSG:4326")
    dentro = gtg[gtg.geometry.within(area_m)]
    _p(f"[v2] grupo-alvo dentro da Area M: {len(dentro)}")

    # celulas-pool com peso = nº de registros; exclui celulas a <10 km de presenca
    cel_lat = (dentro.decimalLatitude // CEL).astype(int)
    cel_lon = (dentro.decimalLongitude // CEL).astype(int)
    pool = (pd.DataFrame({"clat": cel_lat, "clon": cel_lon})
            .groupby(["clat", "clon"]).size().rename("peso").reset_index())
    pool["lat"] = (pool.clat + 0.5) * CEL
    pool["lon"] = (pool.clon + 0.5) * CEL
    # distancia minima a presenca (graus ~ km/111)
    from scipy.spatial import cKDTree
    arv = cKDTree(pres[:, [1, 0]])  # lon,lat
    d_deg, _ = arv.query(pool[["lon", "lat"]].to_numpy())
    pool = pool[d_deg * 111.0 >= MIN_DIST_KM]
    _p(f"[v2] pool grupo-alvo (celulas >= {MIN_DIST_KM} km de presenca): {len(pool)}")

    n_alvo = len(pres)
    if len(pool) >= n_alvo:
        idx = rng.choice(len(pool), size=n_alvo, replace=False,
                         p=(pool.peso / pool.peso.sum()).to_numpy())
        escolhidas = pool.iloc[idx]
        complemento = 0
    else:
        escolhidas = pool
        complemento = n_alvo - len(pool)
        _p(f"[v2] pool insuficiente — completando {complemento} celulas uniformes na Area M")
        minx, miny, maxx, maxy = area_m.bounds
        extras = []
        from shapely.geometry import Point
        while len(extras) < complemento:
            lon = rng.uniform(minx, maxx); lat = rng.uniform(miny, maxy)
            if not area_m.contains(Point(lon, lat)):
                continue
            d, _ = arv.query([[lon, lat]])
            if d[0] * 111.0 < MIN_DIST_KM:
                continue
            extras.append((lat, lon))
        extras = pd.DataFrame(extras, columns=["lat", "lon"])
        escolhidas = pd.concat([escolhidas[["lat", "lon"]], extras], ignore_index=True)

    pseudo = pd.DataFrame({
        "decimalLatitude": escolhidas["lat"].to_numpy(),
        "decimalLongitude": escolhidas["lon"].to_numpy(),
        "year": np.nan, "month": np.nan, "day": np.nan,
        "species": "Alouatta caraya", "provider": "pseudo-ausencia-target-group", "sp": 0})
    pres_df = occ.copy(); pres_df["sp"] = 1
    saida = pd.concat([pres_df, pseudo], ignore_index=True)
    out_csv = V2DIR / naming.nome("pseudoabsence", "Alouatta caraya", V2DIR.parent, "csv")
    saida.to_csv(out_csv, index=False)
    _p(f"[v2] [OK] {out_csv.name}: {int((saida.sp == 1).sum())} presencas + "
       f"{int((saida.sp == 0).sum())} pseudo (grupo-alvo={n_alvo - complemento}, "
       f"uniforme={complemento})")

    # mapa simples
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(10, 8), constrained_layout=True)
    gpd.GeoSeries([area_m], crs="EPSG:4326").boundary.plot(ax=ax, color="#2F684B", lw=1)
    ax.scatter(pseudo.decimalLongitude, pseudo.decimalLatitude, s=5, c="#888888",
               label=f"pseudo ({len(pseudo)})")
    ax.scatter(pres[:, 1], pres[:, 0], s=6, c="#d62728", label=f"presenca ({len(pres)})")
    ax.legend(); ax.set_title("v2: Area M por sub-bacias + pseudo por grupo-alvo")
    out_png = V2DIR / naming.nome("map", "Alouatta caraya", V2DIR.parent, "png")
    fig.savefig(out_png, dpi=140)
    _p(f"[v2] mapa: {out_png.name}")


if __name__ == "__main__":
    main()
