#!/usr/bin/env python3
# ndvi.py — Provider NDVI MENSAL (produto composto MODIS MOD13Q1 via ORNL REST API).
#
# Substitui a fonte antiga (AVHRR diário da NOAA, ~60 MB/dia, ~30 arquivos/mês) por
# um NDVI JÁ COMPOSTO (16 dias, sem nuvem) consultado POR PONTO na API do ORNL DAAC
# (sem download de raster, sem credencial). Os compostos do mês do registro são
# agregados → NDVI mensal (mantém a semântica de "média mensal dos positivos").
# Ver: downloaders/ndvi_modis.py
from __future__ import annotations

import pandas as pd

from .base import EnvProvider, CaptureContext, ensure_downloaders_on_path


class NDVIProvider(EnvProvider):
    name = "ndvi"
    columns = ["ndvi", "ndvi_dias_validos"]

    def capture(self, df: pd.DataFrame, ctx: CaptureContext) -> pd.DataFrame:
        ensure_downloaders_on_path()
        from downloaders.ndvi_modis import monthly_batch
        df = df.copy()
        ndvi, count = monthly_batch(
            df["decimalLatitude"].to_numpy(), df["decimalLongitude"].to_numpy(),
            df["year"].to_numpy(), df["month"].to_numpy(),
            # barra ao vivo no painel do orquestrador
            progress_cb=lambda f, t, e="": ctx.report(self.name, f, t, e),
        )
        df["ndvi"] = ndvi
        # nº de compostos de 16 dias usados na média mensal (coluna interna, fora do slim).
        df["ndvi_dias_validos"] = count
        return df
