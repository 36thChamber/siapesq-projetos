#!/usr/bin/env python3
# gerar_pseudo_rs_guariba_v1.py — pseudoausencias do guariba regional v1 (2026-08-20).
#
# Replica da receita do caraya regional v2 (gerar_pseudo_rs_v2.py), com o guariba como
# especie-alvo e o CARAYA no grupo-alvo — e essa troca que ensina ao modelo a fronteira
# parapátrica: as matas de galeria do oeste do Pampa, onde o caraya foi amostrado e o
# guariba nunca, viram pseudoausencia com peso alto (correção da sobrepredição que
# reprovou o guariba nacional v3 na janela RS — laudo de 18/08).
#
#   BACKGROUND = JANELA REGIONAL INTEIRA (nao a Area M do guariba!). A 1ª tentativa
#               (v1.0, 20/08) restringiu o pool as 32 sub-bacias com presenca de guariba,
#               como no caraya v2 — e reprovou 17/17: sem contraste fora da Area M, o RF
#               extrapolou alto na Serra do Sudeste e no oeste (razao dentro/fora < 1).
#               A Area M apertada funcionou para o caraya porque a dele cobria o proprio
#               Pampa; para o guariba ela exclui exatamente as regioes que precisam de
#               ausencia.
#   SORTEIO   = 2 x n_presencas, metade TARGET-GROUP (Phillips et al. 2009, peso = nº de
#               registros do grupo-alvo na celula de ~1 km — inclui os 1161 pontos de
#               caraya do oeste = fronteira parapátrica) e metade UNIFORME sobre o dominio
#               valido (fecha os buracos de esforco amostral, ex. Serra do Sudeste, onde o
#               grupo-alvo quase nao tem registros e o target-group puro herda o vies).
#   REGRAS    = minimo 10 km de qualquer presenca, seed 42.
#   DOMINIO   = celulas com pct_floresta_500m valido na pilha rs_250m (lado brasileiro —
#               o mesmo dominio dos mapas preditos, recortados ao Brasil via MapBiomas).
#
# Fontes do grupo-alvo (mais recentes disponiveis):
#   - Alouatta_caraya : Occurrence regional v2 (03_dados_saida, curado 12/08)
#   - Sapajus_nigritus: Occurrence 17/07 (07_arquivos_antigos)
#   - demais 8        : <esp>_occurrences.csv do tools-train-models (07 Executado por especie)
#
# EXECUTAR DA RAIZ, no venv.

from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "01_rotina"))
import naming  # noqa: E402

V1DIR = ROOT / "03_dados_saida" / "Alouatta_guariba" / "2026-08-20" / "regional_rs_v1"
BACIAS = ROOT / "02_dados_entrada" / "ambientais" / "hidrografia" / "hybas_sa_lev06_v1c.shp"
# mascara de dominio = MapBiomas (so-Brasil, classe > 0): e o preditor categorico do
# modelo e o recorte efetivo dos mapas preditos (fora do Brasil o complete-cases descarta)
DOMINIO_TIF = (ROOT / "02_dados_entrada" / "variaveis_predicao" / "rs_250m"
               / "anual_2015_2024" / "ocup_solo_mapbiomas.tif")
TOOLS07 = Path(r"E:\Projetos\tools-train-models") / "07 Executado por espécie"
W, S, E, N = -60.5, -34.0, -49.5, -25.0
SEED = 42
MIN_DIST_KM = 10.0
CEL = 0.01  # ~1,1 km

# fontes explicitas por especie do grupo-alvo (None = procurar *_occurrences.csv no tools-train)
FONTES_TG = {
    "Alouatta_caraya": ROOT / "03_dados_saida" / "Alouatta_caraya" / "2026-08-12"
    / "regional_rs_v2" / "Occurrence_Alouatta_caraya_12_08_26.csv",
    "Sapajus_nigritus": None,
    "Chrysocyon_brachyurus": None, "Desmodus_rotundus": None,
    "Didelphis_albiventris": None, "Eira_barbara": None,
    "Hydrochoerus_hydrochaeris": None, "Myrmecophaga_tridactyla": None,
    "Nasua_nasua": None, "Puma_concolor": None,
}


def _p(m=""):
    print(m, flush=True)


def _mais_recente(esp: str) -> Path | None:
    cands = []
    for raiz in (ROOT / "03_dados_saida" / esp, ROOT / "07_arquivos_antigos" / esp):
        if raiz.exists():
            cands += list(raiz.rglob("Occurrence_*.csv"))
    if TOOLS07.exists() and (TOOLS07 / esp).exists():
        cands += [p for p in (TOOLS07 / esp).rglob("*_occurrences.csv")
                  if not p.name.startswith("sp_")]
    return max(cands, key=lambda p: p.stat().st_mtime) if cands else None


def carregar_target_group() -> pd.DataFrame:
    frames = []
    for esp, fixo in FONTES_TG.items():
        arq = fixo if fixo and fixo.exists() else _mais_recente(esp)
        if arq is None:
            _p(f"[tg] {esp}: NADA ENCONTRADO — pulando")
            continue
        df = pd.read_csv(arq, usecols=lambda c: c in
                         ("decimalLatitude", "decimalLongitude"), low_memory=False)
        df["especie_tg"] = esp
        frames.append(df)
        _p(f"[tg] {esp}: {len(df)} registros ({arq.name})")
    return pd.concat(frames, ignore_index=True)


def _validos(lons, lats) -> np.ndarray:
    """True onde o MapBiomas tem classe (>0) — o dominio util (Brasil) do modelo."""
    import rasterio
    with rasterio.open(DOMINIO_TIF) as r:
        v = np.array([x[0] for x in r.sample(zip(lons, lats))], dtype="float64")
        if r.nodata is not None and not np.isnan(r.nodata):
            v[v == r.nodata] = np.nan
    return np.isfinite(v) & (v > 0)


def main():
    rng = np.random.default_rng(SEED)
    occ = pd.read_csv(V1DIR / "Occurrence_Alouatta_guariba_20_08_26.csv")
    pres = occ[["decimalLatitude", "decimalLongitude"]].to_numpy(float)
    ok_pres = _validos(pres[:, 1], pres[:, 0])
    _p(f"[v1] presencas: {len(pres)} ({int(ok_pres.sum())} no dominio com preditores; "
       f"{int((~ok_pres).sum())} fora — mantidas no CSV, o treino as descarta)")

    tg = carregar_target_group().dropna()
    tg = tg[(tg.decimalLongitude >= W) & (tg.decimalLongitude <= E)
            & (tg.decimalLatitude >= S) & (tg.decimalLatitude <= N)]
    _p(f"[v1] grupo-alvo na janela: {len(tg)} registros")

    cel_lat = (tg.decimalLatitude // CEL).astype(int)
    cel_lon = (tg.decimalLongitude // CEL).astype(int)
    pool = (pd.DataFrame({"clat": cel_lat, "clon": cel_lon})
            .groupby(["clat", "clon"]).size().rename("peso").reset_index())
    pool["lat"] = (pool.clat + 0.5) * CEL
    pool["lon"] = (pool.clon + 0.5) * CEL
    from scipy.spatial import cKDTree
    arv = cKDTree(pres[:, [1, 0]])
    d_deg, _ = arv.query(pool[["lon", "lat"]].to_numpy())
    pool = pool[d_deg * 111.0 >= MIN_DIST_KM]
    _p(f"[v1] pool grupo-alvo (celulas >= {MIN_DIST_KM} km de presenca): {len(pool)}")
    pool = pool[_validos(pool["lon"].to_numpy(), pool["lat"].to_numpy())]
    _p(f"[v1] pool no dominio com preditores: {len(pool)}")

    n_pres_ok = int(ok_pres.sum())
    n_tg = min(n_pres_ok, len(pool))
    idx = rng.choice(len(pool), size=n_tg, replace=False,
                     p=(pool.peso / pool.peso.sum()).to_numpy())
    esc_tg = pool.iloc[idx][["lat", "lon"]]

    # metade uniforme sobre o dominio valido: fecha os buracos de esforco amostral
    n_uni = n_pres_ok
    import rasterio
    with rasterio.open(DOMINIO_TIF) as r:
        arr = r.read(1).astype("float64")
        valid = np.isfinite(arr) & (arr > 0)
        if r.nodata is not None and not np.isnan(r.nodata):
            valid &= arr != r.nodata
        rows, cols = np.where(valid)
        _p(f"[v1] dominio valido: {len(rows)} celulas de {arr.size}")
        extras = []
        while len(extras) < n_uni:
            take = rng.choice(len(rows), size=n_uni * 2, replace=False)
            xs, ys = rasterio.transform.xy(r.transform, rows[take], cols[take])
            cand = np.column_stack([ys, xs])  # lat, lon
            d, _ = arv.query(cand[:, [1, 0]])
            cand = cand[d * 111.0 >= MIN_DIST_KM]
            extras.extend(map(tuple, cand))
        extras = pd.DataFrame(extras[:n_uni], columns=["lat", "lon"])
    _p(f"[v1] pseudo: {n_tg} grupo-alvo + {n_uni} uniformes (2 x {n_pres_ok} presencas validas)")

    pseudo = pd.concat([
        esc_tg.assign(provider="pseudo-ausencia-target-group"),
        extras.assign(provider="pseudo-ausencia-uniforme"),
    ], ignore_index=True)
    pseudo = pd.DataFrame({
        "decimalLatitude": pseudo["lat"].to_numpy(),
        "decimalLongitude": pseudo["lon"].to_numpy(),
        "year": np.nan, "month": np.nan, "day": np.nan,
        "species": "Alouatta guariba", "provider": pseudo["provider"].to_numpy(), "sp": 0})
    pres_df = occ.copy(); pres_df["sp"] = 1
    saida = pd.concat([pres_df, pseudo], ignore_index=True)
    out_csv = V1DIR / naming.nome("pseudoabsence", "Alouatta guariba", V1DIR.parent, "csv")
    saida.to_csv(out_csv, index=False)
    _p(f"[v1] [OK] {out_csv.name}: {int((saida.sp == 1).sum())} presencas + "
       f"{int((saida.sp == 0).sum())} pseudo (grupo-alvo={n_tg}, uniforme={n_uni})")

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(10, 8), constrained_layout=True)
    tg_mask = pseudo.provider == "pseudo-ausencia-target-group"
    ax.scatter(pseudo.decimalLongitude[~tg_mask], pseudo.decimalLatitude[~tg_mask], s=5,
               c="#bbbbbb", label=f"pseudo uniforme ({int((~tg_mask).sum())})")
    ax.scatter(pseudo.decimalLongitude[tg_mask], pseudo.decimalLatitude[tg_mask], s=5,
               c="#555555", label=f"pseudo grupo-alvo ({int(tg_mask.sum())})")
    ax.scatter(pres[:, 1], pres[:, 0], s=6, c="#d62728", label=f"presenca ({len(pres)})")
    ax.legend(); ax.set_title("guariba v1: background janela cheia (grupo-alvo + uniforme)")
    out_png = V1DIR / naming.nome("map", "Alouatta guariba", V1DIR.parent, "png")
    fig.savefig(out_png, dpi=140)
    _p(f"[v1] mapa: {out_png.name}")


if __name__ == "__main__":
    main()
