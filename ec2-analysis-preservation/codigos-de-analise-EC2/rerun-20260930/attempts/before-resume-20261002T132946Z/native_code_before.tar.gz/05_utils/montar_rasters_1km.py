#!/usr/bin/env python3
# montar_rasters_1km.py — cria a versão 1 km dos rasters de predição do Brasil, para a
# COMPARAÇÃO diário × climatológico em escala continental.
#
# Por quê 1 km e não 250 m: as métricas da comparação (correlação pixel a pixel, Schoener D,
# Jaccard, área, MESS, Boyce, calibração) são calculadas amostrando o país inteiro; a 1 km já
# são ~16 milhões de amostras — o resultado numérico é indistinguível do de 250 m. Os 250 m
# só acrescentam detalhe VISUAL aos mapas finais, sem mudar nenhuma conclusão. E 1 km custa
# ~30 min por mapa contra ~11 h a 250 m (a base de 250 m tem 316 milhões de pixels).
#
# Grade-alvo: a MESMA do raster ndvi (4000×4000 @ 0,01°, bounds -74,-34,-34,6, EPSG:4326),
# para que tudo fique alinhado. As 3 variáveis finas (altitude, awc, uso do solo) são
# reamostradas para essa grade; as coarse (t2m, e, tp, ndvi) são copiadas — o motor de
# predição as reamostra para a base de qualquer jeito.
#
# Uso (da raiz): python 05_utils/montar_rasters_1km.py

from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "env_data" / "predicao_7var_brasil"
DST = ROOT / "env_data" / "predicao_7var_brasil_1km"
DST.mkdir(parents=True, exist_ok=True)

# Reamostragem por variável: média p/ contínuas, MODA p/ a categórica (uso do solo).
REAMOSTRA = {
    "altitude": Resampling.average,
    "awc": Resampling.average,
    "ocup_solo_mapbiomas": Resampling.mode,
}
COPIAR = ["t2m", "e", "tp", "ndvi"]     # já são coarse — o motor reamostra p/ a base


def grade_alvo() -> tuple:
    with rasterio.open(SRC / "ndvi.tif") as s:
        return s.transform, s.width, s.height, s.crs


def reamostrar(nome: str, metodo: Resampling, transform, w: int, h: int, crs) -> None:
    dst_path = DST / f"{nome}.tif"
    with rasterio.open(SRC / f"{nome}.tif") as src:
        perfil = src.profile.copy()
        nodata = src.nodata
        dtype = src.dtypes[0]
        dst = np.full((h, w), nodata if nodata is not None else np.nan, dtype=dtype)
        reproject(
            source=rasterio.band(src, 1),
            destination=dst,
            src_transform=src.transform, src_crs=src.crs,
            dst_transform=transform, dst_crs=crs,
            resampling=metodo,
            src_nodata=nodata, dst_nodata=nodata,
        )
    perfil.update(transform=transform, width=w, height=h, crs=crs,
                  compress="deflate", tiled=True, blockxsize=256, blockysize=256)
    with rasterio.open(dst_path, "w", **perfil) as out:
        out.write(dst, 1)
    print(f"[ok] {nome}: 1 km {w}x{h} ({metodo.name})")


def main() -> None:
    transform, w, h, crs = grade_alvo()
    print(f"[grade] alvo 1 km: {w}x{h} @ 0.01° | {crs}")
    for nome, metodo in REAMOSTRA.items():
        reamostrar(nome, metodo, transform, w, h, crs)
    for nome in COPIAR:
        shutil.copy2(SRC / f"{nome}.tif", DST / f"{nome}.tif")
        print(f"[copia] {nome}")
    print(f"[fim] pasta 1 km pronta em {DST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
