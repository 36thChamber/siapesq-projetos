#!/usr/bin/env python3
# montar_dataset_rs_v2.py — monta o conjunto de PRESENCAS v2 do caraya regional (RS+entorno).
#
# Funde 3 fontes, na rodada de dados de 2026-08-12 (decisoes com o usuario):
#   1. base regional atual (Occurrence 2026-08-11, 1.196 registros GBIF/iNat/etc.)
#   2. recuperados SISBio (35 registros ICMBio que o dedup por catalogo matava —
#      catalogNumber e a LICENCA, nao o especime)
#   3. planilha-mestre da literatura (Codenotti 2002, Silva&Codenotti 2007, Dias 2015,
#      SALVE 2025, Jardim 2020 aproximado) com curadoria automatica:
#        - DESCARTAR fora (machos dispersores uruguaios, translocada)
#        - linhas cuja obs sinaliza erro de coordenada fora
#        - dedup espacial ~1 km entre fontes (2002 x 2007 repetem pontos)
#        - CONFIRMADO pontual/fazenda -> presenca DIRETA
#        - PROVAVEL (qualquer precisao) e precisao=municipal -> PONTO INFORMADO POR
#          PAISAGEM: realoca para o pixel de FLORESTA (MapBiomas) mais proximo de RIO
#          (HydroRIVERS) dentro do raio de incerteza (municipal ~15 km; fazenda ~3 km).
#          Se nao houver pixel elegivel no raio, mantem a coordenada original.
#
# Saida: Occurrence_*.csv na convencao, em 07/Alouatta_caraya/2026-08-12/regional_rs_v2/
# + relatorio _montagem_v2.md. EXECUTAR DA RAIZ, no venv.

from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from rasterio.windows import from_bounds

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
BASE = ROOT / "07 Executado por espécie" / "Alouatta_caraya"
V2 = BASE / "2026-08-12" / "dados_rs_v2"
OUT_DIR = BASE / "2026-08-12" / "regional_rs_v2"

MAPBIOMAS = ROOT / "03_environmental_processing" / "ocup_solo_mapbiomas_brasil_2024_250m.tif"
RIOS = ROOT / "env_data" / "hidrografia" / "HydroRIVERS_v10_sa_shp" / "HydroRIVERS_v10_sa.shp"
W, S, E, N = -60.5, -34.0, -49.5, -25.0
CLASSES_FLORESTA = (3, 4, 5, 6, 49)   # formacoes lenhosas MapBiomas
RAIO_KM = {"municipal": 15.0, "fazenda": 3.0, "pontual": 0.0}
SEED = 42


def _p(m=""):
    print(m, flush=True)


def realocar_por_paisagem(rows: pd.DataFrame) -> pd.DataFrame:
    """Move cada linha para o pixel de floresta mais perto de rio dentro do raio."""
    _p(f"[v2] realocando {len(rows)} ponto(s) por paisagem (floresta perto de rio)...")
    with rasterio.open(MAPBIOMAS) as src:
        win = from_bounds(W, S, E, N, src.transform)
        uso = src.read(1, window=win)
        tr = src.window_transform(win)
    floresta = np.isin(uso, CLASSES_FLORESTA)
    rios = gpd.read_file(RIOS, bbox=(W, S, E, N))
    rng = np.random.default_rng(SEED)

    novas_lat, novas_lon, movidos = [], [], 0
    for _, r in rows.iterrows():
        raio_km = RAIO_KM.get(str(r.get("precisao", "municipal")), 15.0)
        if raio_km <= 0:
            novas_lat.append(r.lat); novas_lon.append(r.lon); continue
        raio_deg = raio_km / 111.0
        # candidatos: pixels de floresta no raio
        i0 = int((tr.f - (r.lat + raio_deg)) / -tr.e); i1 = int((tr.f - (r.lat - raio_deg)) / -tr.e)
        j0 = int(((r.lon - raio_deg) - tr.c) / tr.a); j1 = int(((r.lon + raio_deg) - tr.c) / tr.a)
        i0, j0 = max(i0, 0), max(j0, 0)
        sub = floresta[i0:i1 + 1, j0:j1 + 1]
        ii, jj = np.nonzero(sub)
        if ii.size == 0:
            novas_lat.append(r.lat); novas_lon.append(r.lon); continue
        lats_c = tr.f + tr.e * (i0 + ii + 0.5)
        lons_c = tr.c + tr.a * (j0 + jj + 0.5)
        dentro = ((lats_c - r.lat) ** 2 + (lons_c - r.lon) ** 2) <= raio_deg ** 2
        if not dentro.any():
            novas_lat.append(r.lat); novas_lon.append(r.lon); continue
        lats_c, lons_c = lats_c[dentro], lons_c[dentro]
        # dos candidatos de floresta, o mais perto de um rio (amostra p/ custo)
        if lats_c.size > 400:
            k = rng.choice(lats_c.size, 400, replace=False)
            lats_c, lons_c = lats_c[k], lons_c[k]
        pts = gpd.GeoSeries(gpd.points_from_xy(lons_c, lats_c), crs="EPSG:4326")
        cand_rios = rios.cx[r.lon - raio_deg - 0.1:r.lon + raio_deg + 0.1,
                            r.lat - raio_deg - 0.1:r.lat + raio_deg + 0.1]
        if len(cand_rios):
            uniao = cand_rios.geometry.union_all()
            d = pts.distance(uniao).to_numpy()
            k = int(np.argmin(d))
        else:
            k = int(rng.integers(len(pts)))
        novas_lat.append(float(pts.iloc[k].y)); novas_lon.append(float(pts.iloc[k].x))
        movidos += 1
    rows = rows.copy()
    rows["lat"], rows["lon"] = novas_lat, novas_lon
    _p(f"[v2]   realocados: {movidos}/{len(rows)} (sem pixel elegivel: mantida a original)")
    return rows


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # (1) base regional atual
    occ = pd.read_csv(BASE / "2026-08-11" / "regional_rs" / "Occurrence_Alouatta_caraya_11_08_26.csv")
    _p(f"[v2] base regional atual: {len(occ)}")

    # (2) recuperados SISBio
    rec = pd.read_csv(V2 / "recuperados_sibbr_sisbio.csv")
    _p(f"[v2] recuperados SISBio: {len(rec)}")

    # (3) planilha-mestre com curadoria
    pm = pd.read_csv(V2 / "planilha_mestre_DRAFT.csv")
    n0 = len(pm)
    pm = pm[pm["classe"] != "DESCARTAR"]
    obs = pm["obs"].fillna("").str.lower()
    erro = obs.str.contains("erro") & obs.str.contains("coorden")
    pm = pm[~erro]
    _p(f"[v2] planilha: {n0} -> {len(pm)} (sem DESCARTAR/erros de coordenada)")

    direto = pm[(pm["classe"] == "CONFIRMADO") & (pm["precisao"].isin(["pontual", "fazenda"]))]
    paisagem = pm.drop(direto.index)
    _p(f"[v2]   presenca direta: {len(direto)} | via paisagem: {len(paisagem)}")
    paisagem = realocar_por_paisagem(paisagem)

    def pm_para_occ(df, rotulo):
        return pd.DataFrame({
            "decimalLatitude": df["lat"], "decimalLongitude": df["lon"],
            "year": pd.to_numeric(df["ano"], errors="coerce"),
            "month": np.nan, "day": np.nan,
            "species": "Alouatta caraya", "provider": rotulo,
        })

    partes = [occ, rec.reindex(columns=occ.columns.union(rec.columns), fill_value=np.nan),
              pm_para_occ(direto, "literatura"), pm_para_occ(paisagem, "literatura-paisagem")]
    todos = pd.concat(partes, ignore_index=True)

    # dedup espacial ~1 km entre TODAS as fontes (prioridade: quem chegou antes = base atual)
    cel = ((todos.decimalLatitude // 0.01).astype(str) + "|"
           + (todos.decimalLongitude // 0.01).astype(str))
    n_antes = len(todos)
    todos = todos.loc[~cel.duplicated()].reset_index(drop=True)
    _p(f"[v2] fusao: {n_antes} -> {len(todos)} apos dedup ~1 km")

    import naming
    out_csv = OUT_DIR / naming.nome("occurrence", "Alouatta caraya", OUT_DIR.parent, "csv")
    todos.to_csv(out_csv, index=False)
    _p(f"[v2] [OK] presencas v2: {out_csv} ({len(todos)} registros)")

    rel = OUT_DIR / "_montagem_v2.md"
    rel.write_text(
        f"# Dataset v2 — montagem (2026-08-12)\n\n"
        f"| fonte | registros |\n|---|---|\n"
        f"| base regional 11/08 | {len(occ)} |\n| SISBio recuperados | {len(rec)} |\n"
        f"| literatura direta | {len(direto)} |\n| literatura via paisagem | {len(paisagem)} |\n"
        f"| **total pos-dedup 1 km** | **{len(todos)}** |\n\n"
        f"Curadoria: DESCARTAR e erros de coordenada removidos; pontos municipais/PROVAVEL "
        f"realocados p/ floresta perto de rio (raios: municipal 15 km, fazenda 3 km; seed {SEED}). "
        f"Bossoroca mantida como presenca de habitat (decisao do usuario; extirpacao por febre "
        f"amarela anotada). Linhas da literatura sem mes/dia: alimentam so o modelo "
        f"climatologico (que nao usa a data).\n", encoding="utf-8")
    _p(f"[v2] relatorio: {rel}")


if __name__ == "__main__":
    main()
