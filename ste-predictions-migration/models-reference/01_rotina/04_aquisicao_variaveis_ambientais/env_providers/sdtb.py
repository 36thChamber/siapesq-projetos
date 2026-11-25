#!/usr/bin/env python3
# sdtb.py — Provider SDTB (Soil Depth To Bedrock: profundidade do solo até a rocha)
#
# Variável CONTÍNUA, em CENTÍMETROS. Fonte: raster global já presente no projeto
# (`dados_entrada/sdtb.tif`), EPSG:4326, ~0,0083° (~1 km), int32, nodata = -99999.
# Coluna: `sdtb`.
#
# POR QUE IMPORTA (ecologia): a profundidade até a rocha limita o enraizamento, a água
# disponível para a vegetação e, portanto, a estrutura do habitat — solo raso sobre rocha
# sustenta vegetação diferente de solo profundo, mesmo com o mesmo clima. Complementa
# `clay`/`awc` (SoilGrids), que descrevem a QUALIDADE do solo, não a sua ESPESSURA.
#
# ⚠️ VALOR CENSURADO EM 200 cm: o produto satura no teto (2 m). "200" NÃO significa
# "exatamente 2 m" — significa "2 m OU MAIS". A variável é, na prática, censurada à
# direita. Isso precisa ser dito nos Métodos: um modelo não distingue 2 m de 20 m de solo.
#
# ARQUITETURA: raster LOCAL, como o `mapbiomas`. Amostragem BILINEAR (é contínua, não
# categórica) via `point_sampler.sample_raster_file`, que:
#   - recorta ao bbox dos pontos ANTES de carregar (o raster global tem 43200 x 17924 px);
#   - converte `nodata` em NaN (`masked=True`) — sem isso, um ponto sem dado entraria no
#     modelo como profundidade de -99999 cm, envenenando tudo em silêncio;
#   - cai em `nearest` onde a bilinear der NaN (ponto na borda do dado).
#
# NUNCA remove linhas. Um provider que descarta registros desalinha o dataset dos demais
# (o orquestrador confere o nº de linhas e DESCARTA a coluna se ele mudar). Ponto sem dado
# vira NaN e é contabilizado no QA — que é onde essa informação pertence.

from __future__ import annotations

import numpy as np
import pandas as pd

from .base import EnvProvider, CaptureContext, ROOT, ensure_downloaders_on_path

_SDTB_TIF = ROOT / "02_dados_entrada" / "ambientais" / "sdtb.tif"

# Teto do produto (cm). Valores iguais a este são CENSURADOS ("≥ 2 m"), não exatos.
SDTB_TETO_CM = 200.0


class SDTBProvider(EnvProvider):
    name = "sdtb"
    columns = ["sdtb"]

    def capture(self, df: pd.DataFrame, ctx: CaptureContext) -> pd.DataFrame:
        ensure_downloaders_on_path()
        from point_sampler import sample_raster_file

        if not _SDTB_TIF.exists():
            raise FileNotFoundError(
                f"Raster SDTB não encontrado: {_SDTB_TIF}. "
                f"Coloque `sdtb.tif` em `dados_entrada/`.")

        df = df.copy()
        lats = df["decimalLatitude"].to_numpy(dtype="float64")
        lons = df["decimalLongitude"].to_numpy(dtype="float64")

        ctx.report(self.name, 0, 1, "amostrando raster")
        vals = sample_raster_file(_SDTB_TIF, lats, lons, method="bilinear", clip=True)
        ctx.report(self.name, 1, 1, "amostrando raster")

        vals = np.asarray(vals, dtype="float64")
        # Rede de segurança: se algum nodata escapar do `masked=True`, ele NÃO pode virar
        # profundidade. Valores negativos são fisicamente impossíveis.
        vals[vals < 0] = np.nan

        df["sdtb"] = np.round(vals, 2)
        return df

    def brazil_raster(self, ctx: CaptureContext):
        """Raster reutilizável na predição (é global; serve para qualquer recorte)."""
        return _SDTB_TIF if _SDTB_TIF.exists() else None
