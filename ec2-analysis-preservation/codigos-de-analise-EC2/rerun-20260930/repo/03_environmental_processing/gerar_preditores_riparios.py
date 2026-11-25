#!/usr/bin/env python3
# gerar_preditores_riparios.py — 2 preditores de PAISAGEM RIPÁRIA da janela regional RS:
#
#   dist_rio            distancia (km) ao rio HydroRIVERS mais proximo
#   pct_floresta_500m   fracao de formacoes lenhosas (MapBiomas) num raio ~500 m
#
# POR QUE: no RS o caraya nao usa "o Pampa" — usa mata ciliar/galeria e capoes de
# 1-30 ha ao longo da hidrografia (Codenotti 2002; Jardim 2020; ficha SALVE 2025).
# Clima a 9 km e uso do solo a 250 m borram essa estrutura linear; estas camadas a
# devolvem ao modelo. Grade de saida: 0.0025 grau (~275 m), so a janela regional
# [-60.5,-34,-49.5,-25] — NAO por hardlink nas pastas nacionais de cenario (uma camada
# fina vira raster-referencia e quebraria predicoes Brasil-afora; usar pasta v2 propria).
#
# Saida: env_data/raster_cache/regional_rs/{dist_rio,pct_floresta_500m}.tif
# EXECUTAR DA RAIZ, no venv.

from __future__ import annotations

from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio import features
from rasterio.transform import from_origin
from rasterio.windows import from_bounds
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "env_data" / "raster_cache" / "regional_rs"
RIOS = ROOT / "env_data" / "hidrografia" / "HydroRIVERS_v10_sa_shp" / "HydroRIVERS_v10_sa.shp"
MAPBIOMAS = ROOT / "03_environmental_processing" / "ocup_solo_mapbiomas_brasil_2024_250m.tif"

W, S, E, N = -60.5, -34.0, -49.5, -25.0
RES = 0.0025                      # ~275 m
CLASSES_FLORESTA = (3, 4, 5, 6, 49)


def _p(m=""):
    print(m, flush=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ncol = int(round((E - W) / RES))
    nrow = int(round((N - S) / RES))
    tr = from_origin(W, N, RES, RES)
    perfil = dict(driver="GTiff", height=nrow, width=ncol, count=1, dtype="float32",
                  crs="EPSG:4326", transform=tr, compress="deflate", predictor=2,
                  nodata=np.nan)

    # ---- dist_rio (km)
    _p(f"[rip] rasterizando rios na grade {ncol}x{nrow} (~275 m)...")
    rios = gpd.read_file(RIOS, bbox=(W, S, E, N))
    _p(f"[rip]   {len(rios)} segmentos HydroRIVERS na janela")
    mask_rio = features.rasterize(((g, 1) for g in rios.geometry), out_shape=(nrow, ncol),
                                  transform=tr, fill=0, dtype="uint8")
    _p("[rip] transformada de distancia...")
    dist_px = ndimage.distance_transform_edt(mask_rio == 0)
    dist_km = (dist_px * RES * 111.0).astype("float32")
    with rasterio.open(OUT / "dist_rio.tif", "w", **perfil) as dst:
        dst.write(dist_km, 1)
    _p(f"[rip] [OK] dist_rio.tif (max {float(dist_km.max()):.1f} km)")

    # ---- pct_floresta_500m
    _p("[rip] fracao de floresta em ~500 m...")
    with rasterio.open(MAPBIOMAS) as src:
        win = from_bounds(W, S, E, N, src.transform)
        uso = src.read(1, window=win, out_shape=(nrow, ncol),
                       resampling=rasterio.enums.Resampling.nearest)
    flo = np.isin(uso, CLASSES_FLORESTA).astype("float32")
    # media focal 5x5 (~±550 m) via convolucao uniforme
    pct = ndimage.uniform_filter(flo, size=5).astype("float32")
    # fora do Brasil o MapBiomas e 0 (nodata) -> pct=0; a Argentina fica "sem floresta".
    # Para nao ensinar isso errado, mascara onde o MapBiomas nao cobre (valor 0 puro).
    sem_dado = uso == 0
    cobertura = 1.0 - ndimage.uniform_filter(sem_dado.astype("float32"), size=5)
    pct = np.where(cobertura > 0.5, pct / np.maximum(cobertura, 1e-6), np.nan).astype("float32")
    with rasterio.open(OUT / "pct_floresta_500m.tif", "w", **perfil) as dst:
        dst.write(pct, 1)
    ok = int(np.isfinite(pct).sum())
    _p(f"[rip] [OK] pct_floresta_500m.tif ({ok}/{pct.size} pixels validos; "
       f"NaN fora da cobertura MapBiomas — pontos argentinos precisam de fallback ou "
       f"exclusao desta variavel p/ eles)")


if __name__ == "__main__":
    main()
