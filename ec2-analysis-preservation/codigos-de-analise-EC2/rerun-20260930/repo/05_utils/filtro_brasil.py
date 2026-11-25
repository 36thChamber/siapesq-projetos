#!/usr/bin/env python3
# filtro_brasil.py — Restringe pontos/geometrias ao POLIGONO REAL do Brasil (malha IBGE).
#
# POR QUE: o pipeline so tinha filtro por BBOX (retangulo). O retangulo do Brasil inclui
# Argentina, Paraguai, Bolivia, oceano etc. Para "usar APENAS dados do Brasil" (ocorrencias)
# e "gerar pseudo-ausencias so dentro do Brasil", precisamos do CONTORNO real do pais, nao
# de uma caixa. Aqui baixamos a malha do Brasil da API publica do IBGE (sem login), cacheada
# em dados_entrada/, e oferecemos:
#   - poligono_brasil()          -> geometria Shapely (uniao) do Brasil, EPSG:4326
#   - filtrar_pontos_brasil(df)  -> subconjunto do DataFrame cujos pontos caem no Brasil
#
# Uso como CLI (filtra um CSV de ocorrencias):
#   python 05_utils/filtro_brasil.py <entrada.csv> <saida.csv>
#   python 05_utils/filtro_brasil.py in.csv out.csv --lat decimalLatitude --lon decimalLongitude

from __future__ import annotations

import argparse
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd
import requests
from shapely.geometry import Point  # noqa: F401 (documenta o formato dos pontos)

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "dados_entrada"
_CACHE_GEOJSON = CACHE / "brasil_ibge.geojson"
_POLY_CACHE = {}  # memoiza a geometria unida na sessao


def _baixar_malha_brasil(dest: Path) -> None:
    """Baixa a malha do Brasil (contorno do pais) da API v3 do IBGE -> geojson em dest."""
    url = ("https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR"
           "?formato=application/vnd.geo+json&qualidade=intermediaria")
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(r.json()), encoding="utf-8")
    print(f"[brasil] malha do Brasil baixada do IBGE -> {dest.name}")


def poligono_brasil():
    """Geometria Shapely (uniao dos poligonos) do Brasil em EPSG:4326. Cacheia em disco
    (dados_entrada/brasil_ibge.geojson) e em memoria."""
    if "geom" in _POLY_CACHE:
        return _POLY_CACHE["geom"]
    if not _CACHE_GEOJSON.exists():
        _baixar_malha_brasil(_CACHE_GEOJSON)
    g = gpd.read_file(_CACHE_GEOJSON)
    if g.crs is None:
        g = g.set_crs("EPSG:4326")
    else:
        g = g.to_crs("EPSG:4326")
    geom = g.geometry.union_all() if hasattr(g.geometry, "union_all") else g.geometry.unary_union
    _POLY_CACHE["geom"] = geom
    return geom


def filtrar_pontos_brasil(df: pd.DataFrame,
                          lat: str = "decimalLatitude",
                          lon: str = "decimalLongitude",
                          buffer_deg: float = 0.0) -> pd.DataFrame:
    """Devolve o subconjunto de `df` cujos pontos (lat/lon) caem DENTRO do Brasil.

    - Linhas com lat/lon ausentes sao descartadas (nao ha como testar).
    - `buffer_deg`: folga opcional (graus) no contorno, p/ nao perder registros costeiros
      por causa da grossura da malha. Padrao 0 (contorno estrito; exclui oceano/vizinhos).
    """
    if lat not in df.columns or lon not in df.columns:
        raise ValueError(f"CSV sem colunas de coordenada: {lat!r}/{lon!r}.")
    geom = poligono_brasil()
    if buffer_deg and buffer_deg > 0:
        geom = geom.buffer(buffer_deg)

    valido = df[lat].notna() & df[lon].notna()
    sub = df.loc[valido].copy()
    if sub.empty:
        return sub.iloc[0:0]

    pts = gpd.GeoDataFrame(
        sub, geometry=gpd.points_from_xy(sub[lon].astype(float), sub[lat].astype(float)),
        crs="EPSG:4326")
    dentro = pts.geometry.within(geom).to_numpy()
    return sub.loc[dentro].drop(columns="geometry", errors="ignore")


def _cli() -> None:
    p = argparse.ArgumentParser(
        description="Filtra um CSV de pontos ao poligono real do Brasil (malha IBGE).")
    p.add_argument("entrada")
    p.add_argument("saida")
    p.add_argument("--lat", default="decimalLatitude")
    p.add_argument("--lon", default="decimalLongitude")
    p.add_argument("--buffer_deg", type=float, default=0.0,
                   help="Folga (graus) no contorno p/ registros costeiros. Padrao 0.")
    a = p.parse_args()
    df = pd.read_csv(a.entrada)
    n0 = len(df)
    out = filtrar_pontos_brasil(df, lat=a.lat, lon=a.lon, buffer_deg=a.buffer_deg)
    Path(a.saida).parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(a.saida, index=False)
    print(f"[brasil] {a.entrada}: {n0} -> {len(out)} dentro do Brasil "
          f"(removidos {n0 - len(out)}). Salvo: {a.saida}")


if __name__ == "__main__":
    _cli()
