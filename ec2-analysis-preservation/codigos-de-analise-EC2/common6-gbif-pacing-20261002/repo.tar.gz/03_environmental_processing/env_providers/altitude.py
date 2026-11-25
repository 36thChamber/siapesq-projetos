#!/usr/bin/env python3
# altitude.py — Provider Altitude (DEM COP30, extração bilinear)
#
# Dois modos:
#   1) Se existir um DEM pré-baixado (`ctx.dem_path`), amostra dele (bilinear).
#   2) Caso contrário (padrão p/ espécies com Área M grande), baixa o COP30 em
#      JANELINHAS ao redor dos pontos (`_dem.ensure_tiles`) e amostra tile a tile —
#      sem carregar mosaico gigante. Os tiles ficam cacheados (reuso na predição).
from __future__ import annotations

from pathlib import Path

import pandas as pd

from .base import EnvProvider, CaptureContext, ensure_downloaders_on_path


class AltitudeProvider(EnvProvider):
    name = "altitude"
    columns = ["altitude"]

    def capture(self, df: pd.DataFrame, ctx: CaptureContext) -> pd.DataFrame:
        ensure_downloaders_on_path()
        lats = df["decimalLatitude"].to_numpy()
        lons = df["decimalLongitude"].to_numpy()
        df = df.copy()

        dem = Path(ctx.dem_path) if ctx.dem_path else None
        if dem is not None and dem.exists():
            from point_sampler import sample_raster_file
            df["altitude"] = sample_raster_file(dem, lats, lons, method="bilinear")
        else:
            # Padrão: Copernicus DEM COP30 lido na nuvem (AWS), por tile — sem chave
            # nem limite de requisições (substitui o OpenTopography, que bloqueava).
            # Os tiles vão EM PARALELO (o custo é esperar a rede, não processar).
            from ._dem import sample_alt_slope_cloud
            alt, _ = sample_alt_slope_cloud(
                lats, lons, want_alt=True, want_slope=False,
                workers=max(ctx.workers, 8),
                progress_cb=lambda f, t, e="": ctx.report(self.name, f, t, e),
            )
            df["altitude"] = alt
        return df
