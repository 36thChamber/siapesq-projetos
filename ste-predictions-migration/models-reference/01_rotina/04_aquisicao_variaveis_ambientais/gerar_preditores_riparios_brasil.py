#!/usr/bin/env python3
# gerar_preditores_riparios_brasil.py — versao NACIONAL dos 2 preditores riparios do v2,
# na grade padrao de predicao do Brasil (4000x4000 @ 0.01 grau, -74,-34 -> -34,6):
#
#   dist_rio            distancia (km) ao rio HydroRIVERS mais proximo
#   pct_floresta_500m   fracao de formacoes lenhosas (MapBiomas 3,4,5,6,49) num raio ~500 m
#
# Mesma definicao de gerar_preditores_riparios.py (regional RS); muda so a grade.
# O pct e calculado na grade nativa do MapBiomas (250 m) em faixas com sobreposicao
# (filtro focal 5x5 = ~+-550 m) e depois reamostrado por MEDIA para 0.01 grau.
# Fora da cobertura MapBiomas -> NaN (o predict ja mascara pro Brasil via mapbiomas).
#
# Saida: env_data/raster_cache/brasil_v2/{dist_rio,pct_floresta_500m}.tif
# EXECUTAR DA RAIZ, no venv.

from __future__ import annotations

from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio import features
from rasterio.transform import from_origin
from rasterio.warp import reproject, Resampling
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / "02_dados_entrada" / "ambientais" / "raster_cache" / "brasil_v2"
RIOS = ROOT / "02_dados_entrada" / "ambientais" / "hidrografia" / "HydroRIVERS_v10_sa_shp" / "HydroRIVERS_v10_sa.shp"
MAPBIOMAS = ROOT / "02_dados_entrada" / "ambientais" / "uso_solo" / "ocup_solo_mapbiomas_brasil_2024_250m.tif"

W, S, E, N = -74.0, -34.0, -34.0, 6.0
RES = 0.01                        # grade nacional de predicao (~1,1 km)
CLASSES_FLORESTA = (3, 4, 5, 6, 49)
FAIXA = 2000                      # linhas por faixa no MapBiomas (com sobreposicao de 2 px)


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

    # ---- dist_rio (km) na grade 0.01
    _p(f"[rip-br] rasterizando rios na grade {ncol}x{nrow} (~1,1 km)...")
    rios = gpd.read_file(RIOS, bbox=(W, S, E, N))
    _p(f"[rip-br]   {len(rios)} segmentos HydroRIVERS na janela nacional")
    mask_rio = features.rasterize(((g, 1) for g in rios.geometry), out_shape=(nrow, ncol),
                                  transform=tr, fill=0, dtype="uint8")
    _p("[rip-br] transformada de distancia...")
    dist_px = ndimage.distance_transform_edt(mask_rio == 0)
    dist_km = (dist_px * RES * 111.0).astype("float32")
    with rasterio.open(OUT / "dist_rio.tif", "w", **perfil) as dst:
        dst.write(dist_km, 1)
    _p(f"[rip-br] [OK] dist_rio.tif (max {float(dist_km.max()):.1f} km)")

    # ---- pct_floresta_500m: nativa 250 m em faixas -> media p/ 0.01
    _p("[rip-br] fracao de floresta ~500 m na grade nativa do MapBiomas (faixas)...")
    with rasterio.open(MAPBIOMAS) as src:
        h, w = src.height, src.width
        pct_nat = np.full((h, w), np.nan, dtype="float32")
        for r0 in range(0, h, FAIXA):
            r1 = min(r0 + FAIXA, h)
            a0, a1 = max(0, r0 - 2), min(h, r1 + 2)          # sobreposicao p/ filtro 5x5
            uso = src.read(1, window=((a0, a1), (0, w)))
            flo = np.isin(uso, CLASSES_FLORESTA).astype("float32")
            pct = ndimage.uniform_filter(flo, size=5)
            sem_dado = (uso == 0)
            cobertura = 1.0 - ndimage.uniform_filter(sem_dado.astype("float32"), size=5)
            pct = np.where(cobertura > 0.5, pct / np.maximum(cobertura, 1e-6), np.nan)
            pct_nat[r0:r1] = pct[(r0 - a0):(r0 - a0) + (r1 - r0)]
            _p(f"[rip-br]   faixa {r1}/{h}")
        nat_transform, nat_crs = src.transform, src.crs

    _p("[rip-br] reamostrando por media p/ 0.01 grau...")
    pct_01 = np.full((nrow, ncol), np.nan, dtype="float32")
    reproject(source=pct_nat, destination=pct_01,
              src_transform=nat_transform, src_crs=nat_crs,
              dst_transform=tr, dst_crs="EPSG:4326",
              src_nodata=np.nan, dst_nodata=np.nan,
              resampling=Resampling.average)
    with rasterio.open(OUT / "pct_floresta_500m.tif", "w", **perfil) as dst:
        dst.write(pct_01, 1)
    ok = int(np.isfinite(pct_01).sum())
    _p(f"[rip-br] [OK] pct_floresta_500m.tif ({ok}/{pct_01.size} pixels validos)")


if __name__ == "__main__":
    main()
