#!/usr/bin/env python3
# recortar_estado.py — Recorta um raster ao POLIGONO REAL de um estado (malha IBGE).
#
# POR QUE: predizer/recortar por BBOX (retangulo) engana — o retangulo do "RS" inclui
# Argentina (Corrientes/Misiones), Uruguai e oceano. Como esses vizinhos podem ser o
# nucleo da distribuicao da especie, a mancha de alta aptidao aparece FORA do estado e o
# mapa fica ilegivel/enganoso. Aqui cortamos no contorno oficial do estado.
#
# A malha vem da API publica do IBGE (sem login), cacheada em dados_entrada/.
#
# Uso:
#   python 05_utils/recortar_estado.py <entrada.tif> <saida.tif> [--uf RS]
#   python 05_utils/recortar_estado.py in.tif out.tif --uf SC

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
import rasterio.mask
import requests

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "dados_entrada"
# Codigos IBGE das UFs (so as usadas pelo projeto; completar conforme precisar).
UF_COD = {"RS": 43, "SC": 42, "PR": 41, "SP": 35, "RJ": 33, "MG": 31, "ES": 32,
          "MS": 50, "MT": 51, "GO": 52, "BA": 29}


def malha_uf(uf: str) -> gpd.GeoDataFrame:
    """Poligono do estado (IBGE). Cacheia o geojson em dados_entrada/."""
    uf = uf.upper()
    if uf not in UF_COD:
        raise SystemExit(f"UF desconhecida: {uf} (conhecidas: {sorted(UF_COD)})")
    dest = CACHE / f"{uf.lower()}_ibge.geojson"
    if not dest.exists():
        url = (f"https://servicodados.ibge.gov.br/api/v3/malhas/estados/{UF_COD[uf]}"
               f"?formato=application/vnd.geo+json&qualidade=intermediaria")
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(r.json()), encoding="utf-8")
        print(f"[uf] malha {uf} baixada do IBGE -> {dest.name}")
    g = gpd.read_file(dest)
    if g.crs is None:
        g = g.set_crs("EPSG:4326")
    return g


def recortar(entrada: Path, saida: Path, uf: str) -> None:
    g = malha_uf(uf)
    with rasterio.open(entrada) as src:
        gg = g.to_crs(src.crs)
        shapes = [geom.__geo_interface__ for geom in gg.geometry]
        arr, transform = rasterio.mask.mask(src, shapes, crop=True, filled=True,
                                            nodata=np.nan)
        perfil = src.profile.copy()
    # O blocksize herdado da origem pode não casar com as novas dimensões (GDAL exige
    # múltiplo de 16). Descarta e deixa o GDAL escolher os blocos do arquivo recortado.
    for k in ("blockxsize", "blockysize"):
        perfil.pop(k, None)
    perfil.update(height=arr.shape[1], width=arr.shape[2], transform=transform,
                  nodata=np.nan, dtype="float32", compress="lzw", tiled=True)
    saida.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(saida, "w", **perfil) as dst:
        dst.write(arr[0].astype("float32"), 1)
    v = arr[0][np.isfinite(arr[0])]
    if v.size:
        print(f"[uf] {saida.name}: {arr.shape[2]}x{arr.shape[1]} | {v.size:,} células em {uf} "
              f"| min={v.min():.3f} média={v.mean():.3f} max={v.max():.3f} "
              f"| >0.5: {100 * (v > 0.5).mean():.1f}%")
    else:
        print(f"[uf] {saida.name}: SEM células válidas dentro de {uf} (?)")


def main():
    p = argparse.ArgumentParser(description="Recorta um raster ao polígono real de uma UF (IBGE).")
    p.add_argument("entrada"); p.add_argument("saida")
    p.add_argument("--uf", default="RS")
    a = p.parse_args()
    recortar(Path(a.entrada), Path(a.saida), a.uf)


if __name__ == "__main__":
    main()
