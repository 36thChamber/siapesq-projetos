#!/usr/bin/env python3
# slope.py — Provider Slope (declividade em GRAUS), derivada do DEM da pipeline
#
# Dois modos (iguais aos da altitude, compartilhando os tiles baixados):
#   1) Se existir um DEM pré-baixado (`ctx.dem_path`), calcula o slope dele e cacheia.
#   2) Caso contrário (padrão p/ Área M grande), usa o COP30 em JANELINHAS ao redor
#      dos pontos (`_dem`), derivando o slope de cada tile (gradiente numpy com
#      célula em metros). Extração no ponto = valor do pixel (nearest).

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
import pandas as pd

from .base import EnvProvider, CaptureContext, ensure_downloaders_on_path
from ._dem import _slope_degrees


class SlopeProvider(EnvProvider):
    name = "slope"
    columns = ["slope"]

    def capture(self, df: pd.DataFrame, ctx: CaptureContext) -> pd.DataFrame:
        ensure_downloaders_on_path()
        lats = df["decimalLatitude"].to_numpy()
        lons = df["decimalLongitude"].to_numpy()
        df = df.copy()

        dem = Path(ctx.dem_path) if ctx.dem_path else None
        if dem is not None and dem.exists():
            df["slope"] = self._slope_from_dem_file(dem, lats, lons, ctx)
        else:
            # Padrão: mesmo COP30 na nuvem (AWS) usado pela altitude — slope derivado
            # do tile, sem chave nem limite de requisições. Tiles EM PARALELO.
            from ._dem import sample_alt_slope_cloud
            _, slp = sample_alt_slope_cloud(
                lats, lons, want_alt=False, want_slope=True,
                workers=max(ctx.workers, 8),
                progress_cb=lambda f, t, e="": ctx.report(self.name, f, t, e),
            )
            df["slope"] = slp
        return df

    @staticmethod
    def _slope_from_dem_file(dem: Path, lats, lons, ctx: CaptureContext):
        """Modo DEM único (pequeno): deriva o slope do arquivo e cacheia por bbox."""
        from point_sampler import open_raster, _clip_to_points, sample_dataarray_safe
        ctx.cache_dir.mkdir(parents=True, exist_ok=True)
        key = hashlib.md5(
            f"{dem.resolve()}|{np.round(np.nanmin(lats),3)}|{np.round(np.nanmax(lats),3)}"
            f"|{np.round(np.nanmin(lons),3)}|{np.round(np.nanmax(lons),3)}".encode()
        ).hexdigest()[:10]
        slope_tif = ctx.cache_dir / f"slope_{key}.tif"
        if slope_tif.exists():
            slope_da = open_raster(slope_tif)
        else:
            dem_da = _clip_to_points(open_raster(dem), lats, lons).load()
            slope_da = _slope_degrees(dem_da)
            try:
                slope_da.rio.write_crs("EPSG:4326").rio.to_raster(slope_tif)
            except Exception:  # noqa: BLE001 - cache é best-effort
                pass
        return sample_dataarray_safe(slope_da, lats, lons, method="nearest")
