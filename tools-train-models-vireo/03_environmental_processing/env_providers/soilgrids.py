#!/usr/bin/env python3
# soilgrids.py — Provider ISRIC SoilGrids (variáveis edáficas) — LEITURA POR PONTO NA NUVEM.
#
# Variáveis:
#   - clay : % de argila (0–30 cm, média ponderada pela espessura).
#   - awc  : Água disponível (Available Water Capacity, v%) estimada pela fórmula
#            agronômica PADRÃO Saxton & Rawls (2006) a partir de areia+argila+matéria
#            orgânica: AWC = θ_FC(33 kPa) − θ_WP(1500 kPa). 0–30 cm ponderado.
#
# POR QUE ASSIM: as camadas nativas de água do SoilGrids (wv0033/wv1500) NÃO estão
# hospedadas na nuvem (COG) do ISRIC — só as propriedades básicas (clay, sand, soc…).
# Para manter TODO o solo em leitura por ponto na nuvem (rápida, global, sem limite
# de requisições, sem o WCS que travava em áreas grandes), o awc é derivado dessas
# propriedades via Saxton-Rawls (θ é modelado igual ao wv nativo — ambos estimativas).
#
# Fonte: COGs globais do ISRIC (files.isric.org/.../{prop}/{prop}_{depth}_mean.vrt),
# em projeção Homolosine (IGH). Lemos o VALOR DO PIXEL (nearest) no ponto, sem baixar
# rasters. Unidades: clay/sand em g/kg → ÷10 = %; soc em dg/kg → ÷100 = SOC%.

from __future__ import annotations

import os

# GDAL: leitura remota eficiente de COG/VRT via /vsicurl/ (definido antes do rasterio).
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.vrt")
os.environ.setdefault("GDAL_HTTP_TIMEOUT", "120")
os.environ.setdefault("VSI_CACHE", "TRUE")
# ROBUSTEZ DE REDE: sem retries, o /vsicurl/ preenche NODATA silenciosamente numa
# falha transitória (ponto vira NaN sem erro). Retries no nível HTTP do GDAL evitam.
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "5")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "1")

import time as _time

import numpy as np
import pandas as pd

from .base import EnvProvider, CaptureContext

_BASE = "https://files.isric.org/soilgrids/latest/data"
_IGH = "+proj=igh +lat_0=0 +lon_0=0 +datum=WGS84 +units=m +no_defs"
_DEPTHS = [("0-5cm", 5), ("5-15cm", 10), ("15-30cm", 15)]  # (rótulo, espessura cm)
_TOTAL_CM = 30.0


def _clean_nodata(vals: np.ndarray, nod) -> np.ndarray:
    vals = vals.astype("float64")
    if nod is not None:
        vals[vals == nod] = np.nan
    vals[vals < -1e4] = np.nan  # nodata residual do SoilGrids (-32768)
    return vals


def _sample_layer_igh(prop: str, depth: str, xs, ys, fill_radius_px: int = 40,
                      tile_px: int = 2048) -> np.ndarray:
    """
    Amostra (nearest) uma camada COG global do ISRIC nos pontos (coords em IGH).
    Para pontos que caem em NODATA (costa/água), busca o PIXEL VÁLIDO MAIS PRÓXIMO
    numa janela ao redor (~fill_radius_px × 250 m) — recupera pontos de habitat
    litorâneo sem "inventar" dado (usa o valor terrestre real mais próximo).

    LEITURA POR BLOCO, NÃO POR PONTO (medido em 2026-07-13):
      antes  `ds.sample()` ponto a ponto -> cada ponto era uma ida à rede: 831 ms/ponto.
             Para 7.203 pontos x 9 camadas = ~65 mil leituras aleatórias = **~15 h**.
      agora  os pontos são agrupados em BLOCOS de `tile_px` pixels e lemos UMA janela
             por bloco (expandida em `fill_radius_px`, para a busca do pixel válido mais
             próximo caber dentro dela). Pontos vizinhos passam a compartilhar a mesma
             leitura, em vez de cada um pagar sua viagem.

    A ciência não muda: MESMO pixel amostrado (nearest), MESMO raio de busca.
    """
    import rasterio
    from rasterio.transform import rowcol
    from rasterio.windows import Window

    url = f"/vsicurl/{_BASE}/{prop}/{prop}_{depth}_mean.vrt"
    xs = np.asarray(xs, float)
    ys = np.asarray(ys, float)
    n = len(xs)
    if n == 0:
        return np.array([], dtype="float64")

    r = int(fill_radius_px)
    # RETENTATIVAS: se a leitura vier TODA-NaN (provável falha de rede que o /vsicurl/
    # preencheu com nodata), re-tenta. All-NaN legítimo (todos os pontos no oceano) é
    # raro; aceita após esgotar. Erro de abertura (VRT indisponível) → propaga (isolado
    # pelo orquestrador).
    vals = np.full(n, np.nan)
    for attempt in range(3):
        with rasterio.open(url) as ds:
            nod = ds.nodata
            preenche = nod if nod is not None else -32768
            rows, cols = rowcol(ds.transform, xs, ys)
            rows = np.asarray(rows, dtype="int64")
            cols = np.asarray(cols, dtype="int64")

            # Agrupa os pontos por bloco de `tile_px` — um read por bloco ocupado.
            chaves = (rows // tile_px) * 1_000_000 + (cols // tile_px)
            for chave in np.unique(chaves):
                idx = np.flatnonzero(chaves == chave)
                r0 = int(rows[idx].min()) - r
                c0 = int(cols[idx].min()) - r
                alt = int(rows[idx].max()) + r - r0 + 1
                larg = int(cols[idx].max()) + r - c0 + 1

                # RETENTATIVA POR BLOCO. Uma janela de ~9 MB é muito mais sensível a um
                # soluço de rede do que as leituras pontuais de antes, e um `ds.read()`
                # que LEVANTA exceção escapava do laço de retentativa lá de cima — a
                # variável inteira era PULADA (clay/awc ficavam vazios) por causa de um
                # bloco. Aqui cada bloco tem suas próprias 3 chances, com espera crescente.
                bloco = None
                for tent in range(3):
                    try:
                        bloco = _clean_nodata(
                            ds.read(1, window=Window(c0, r0, larg, alt),
                                    boundless=True,
                                    fill_value=preenche).astype("float64"), nod)
                        break
                    except Exception as e:  # noqa: BLE001 - falha de rede transitória
                        if tent == 2:
                            raise RuntimeError(
                                f"soilgrids: bloco {prop}/{depth} falhou 3x "
                                f"({type(e).__name__}: {e})") from e
                        _time.sleep(3 * (tent + 1))
                if bloco is None:            # inalcançável (o raise acima cobre), defensivo
                    continue

                lr = rows[idx] - r0          # coords do ponto DENTRO do bloco
                lc = cols[idx] - c0
                v = bloco[lr, lc]

                # NODATA (costa/água): pixel válido mais próximo dentro do raio. A janela
                # já foi expandida em `r`, então o raio inteiro cabe no bloco lido.
                for k in np.flatnonzero(np.isnan(v)):
                    rr, cc = int(lr[k]), int(lc[k])
                    viz = bloco[max(rr - r, 0): rr + r + 1, max(cc - r, 0): cc + r + 1]
                    fin = np.argwhere(np.isfinite(viz))
                    if fin.size == 0:
                        continue
                    # distância ao ponto, nas coordenadas da vizinhança recortada
                    dr = rr - max(rr - r, 0)
                    dc = cc - max(cc - r, 0)
                    d2 = (fin[:, 0] - dr) ** 2 + (fin[:, 1] - dc) ** 2
                    br, bc = fin[int(np.argmin(d2))]
                    v[k] = viz[br, bc]

                vals[idx] = v

        if np.isfinite(vals).any():
            break  # sucesso
        if attempt < 2:
            _time.sleep(2 * (attempt + 1))  # tudo-NaN → provável rede; re-tenta
    return vals


def _saxton_rawls_awc(sand_pct, clay_pct, om_pct):
    """AWC volumétrica (fração) por Saxton & Rawls (2006). Entradas: %, %, % (MO)."""
    S = np.asarray(sand_pct) / 100.0
    C = np.asarray(clay_pct) / 100.0
    OM = np.asarray(om_pct)
    t1500 = (-0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * (S * OM)
             - 0.013 * (C * OM) + 0.068 * (S * C) + 0.031)
    th1500 = t1500 + (0.14 * t1500 - 0.02)
    t33 = (-0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * (S * OM)
           - 0.027 * (C * OM) + 0.452 * (S * C) + 0.299)
    th33 = t33 + (1.283 * t33 * t33 - 0.374 * t33 - 0.015)
    return th33 - th1500  # fração volumétrica


class SoilGridsProvider(EnvProvider):
    name = "soilgrids"
    columns = ["clay", "awc"]

    def capture(self, df: pd.DataFrame, ctx: CaptureContext) -> pd.DataFrame:
        from pyproj import Transformer
        df = df.copy()
        lats = df["decimalLatitude"].to_numpy(dtype="float64")
        lons = df["decimalLongitude"].to_numpy(dtype="float64")
        tr = Transformer.from_crs("EPSG:4326", _IGH, always_xy=True)
        xs, ys = tr.transform(lons, lats)  # vetorizado

        n = len(df)
        clay_acc = np.zeros(n)
        awc_acc = np.zeros(n)
        wsum_clay = np.zeros(n)
        wsum_awc = np.zeros(n)
        # 3 profundidades x 3 propriedades = 9 camadas a ler (barra do painel).
        n_camadas = len(_DEPTHS) * 3
        lidas = 0
        ctx.report(self.name, 0, n_camadas, "camadas")

        def _ler(prop: str, depth: str) -> np.ndarray:
            nonlocal lidas
            v = _sample_layer_igh(prop, depth, xs, ys)
            lidas += 1
            ctx.report(self.name, lidas, n_camadas, "camadas")
            return v

        # Média ponderada 0–30 cm: soma (valor·espessura) / soma(espessura válida),
        # ignorando profundidades com nodata (não penaliza o ponto).
        for depth, w in _DEPTHS:
            clay = _ler("clay", depth) / 10.0    # %
            sand = _ler("sand", depth) / 10.0    # %
            soc = _ler("soc", depth) / 100.0     # SOC %
            om = soc * 1.724                                          # matéria orgânica %
            awc = _saxton_rawls_awc(sand, clay, om) * 100.0          # v%

            ok_c = np.isfinite(clay)
            clay_acc[ok_c] += clay[ok_c] * w
            wsum_clay[ok_c] += w
            ok_a = np.isfinite(awc)
            awc_acc[ok_a] += awc[ok_a] * w
            wsum_awc[ok_a] += w

        df["clay"] = np.where(wsum_clay > 0, clay_acc / np.maximum(wsum_clay, 1e-9), np.nan)
        df["awc"] = np.where(wsum_awc > 0, awc_acc / np.maximum(wsum_awc, 1e-9), np.nan)
        return df

    def brazil_raster(self, ctx: CaptureContext):
        """Cache do Brasil p/ predição é gerado à parte (script dedicado, 250 m)."""
        return None
