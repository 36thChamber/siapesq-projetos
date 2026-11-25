#!/usr/bin/env python3
# mapbiomas.py — Provider MapBiomas (Uso e Ocupação do Solo — BRASIL)
#
# Extrai o código da classe de uso/cobertura do solo do raster MapBiomas 250 m já
# presente no projeto (`03_environmental_processing/ocup_solo_mapbiomas_brasil_2024_250m.tif`,
# EPSG:4326, nodata=0). Variável CATEGÓRICA → VALOR DO PIXEL (nearest), nunca
# interpolação/média. Coluna: `ocup_solo_mapbiomas`.
#
# Amostragem por STREAMING (`point_sampler.sample_categorical_nearest`) — mesma
# função usada pelo WorldCover-local; consolida a lógica antes duplicada em
# `add_occup_solo.py`. Como o MapBiomas cobre só o Brasil, pontos fora do país
# ficam NaN (esperado — o WorldCover global cobre esses).

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .base import EnvProvider, CaptureContext, ROOT, ensure_downloaders_on_path

_MAPBIOMAS_TIF = ROOT / "02_dados_entrada" / "ambientais" / "uso_solo" / "ocup_solo_mapbiomas_brasil_2024_250m.tif"


class MapBiomasProvider(EnvProvider):
    name = "mapbiomas"
    columns = ["ocup_solo_mapbiomas"]

    def capture(self, df: pd.DataFrame, ctx: CaptureContext) -> pd.DataFrame:
        ensure_downloaders_on_path()
        from point_sampler import sample_categorical_nearest
        if not _MAPBIOMAS_TIF.exists():
            raise FileNotFoundError(f"Raster MapBiomas não encontrado: {_MAPBIOMAS_TIF}")
        df = df.copy()
        df["ocup_solo_mapbiomas"] = sample_categorical_nearest(
            _MAPBIOMAS_TIF, df["decimalLatitude"].to_numpy(),
            df["decimalLongitude"].to_numpy(),
        )
        return df

    def brazil_raster(self, ctx: CaptureContext):
        return _MAPBIOMAS_TIF if _MAPBIOMAS_TIF.exists() else None
