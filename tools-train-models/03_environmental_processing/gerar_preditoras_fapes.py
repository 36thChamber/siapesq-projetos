#!/usr/bin/env python3
# gerar_preditoras_fapes.py — Rasters de PREDIÇÃO do solo (AWC, clay) a 250 m, COM o
# AJUSTE DE PREENCHIMENTO dos buracos de cidade. Saída na pasta "variaveis preditoras
# FAPES/" da raiz. Extensão padrão: AMÉRICA DO SUL (cobre a Área M das 3 espécies).
#
# POR QUE O PREENCHIMENTO (Achado 5 de DECISOES_METODOLOGICAS_14_07_26.html):
#   A fonte ISRIC MASCARA as cidades — não tem valor de solo sob a mancha urbana. A
#   captura de TREINO (`env_providers/soilgrids.py`) já tapa cada buraco com o solo
#   válido mais próximo num raio de ~10 km; por isso os pontos urbanos saem 100%
#   preenchidos. Mas o raster de predição do Brasil (`gerar_cache_brasil.py`) NÃO
#   tapava: escrevia NaN, e o mapa sairia FURADO exatamente sobre as cidades — onde
#   estão 24% dos registros do S. nigritus, espécie que usa parque urbano. Este script
#   aplica ao RASTER a MESMA operação do treino: não inventa dado, só torna predição e
#   treino coerentes e destrói o sinal espúrio "buraco = cidade → macaco".
#
# COMO: lê por FAIXAS (streaming, não carrega o continente na RAM) com um HALO vertical
# de `radius_px` linhas, para o preenchimento enxergar através da emenda entre faixas
# (um pixel de cidade na borda da faixa acha o solo válido da faixa vizinha). Grava só
# o miolo. Resumível: pula a variável cujo .tif final já existe.

from __future__ import annotations

import argparse
import os
from pathlib import Path

# GDAL: leitura remota eficiente de COG/VRT via /vsicurl/ (antes de importar rasterio).
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.vrt")
os.environ.setdefault("GDAL_HTTP_TIMEOUT", "120")
os.environ.setdefault("VSI_CACHE", "TRUE")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "10")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "1")
os.environ.setdefault("CPL_VSIL_CURL_USE_HEAD", "NO")

from concurrent.futures import ThreadPoolExecutor

import numpy as np
import rasterio
from rasterio.enums import Resampling
from scipy import ndimage

# Reaproveita a lógica JÁ VALIDADA do gerador do Brasil (mesmo grid, leitura por faixa
# com retentativa, Saxton-Rawls). Este script só ACRESCENTA o preenchimento.
from gerar_cache_brasil import (_grid, _read_strip_retry, _saxton_rawls_awc,
                                DEPTHS, ISRIC)

ROOT = Path(__file__).resolve().parent.parent
AMERICA_SUL = (-82.0, -56.0, -34.0, 13.0)  # W, S, E, N — cobre BR+AR+BO+PY+continente


def _fill_nearest(arr: np.ndarray, radius_px: int) -> np.ndarray:
    """
    Preenche NaN com o valor do pixel VÁLIDO mais próximo, até `radius_px` de distância.
    Além do raio (ex.: oceano interior, >10 km de terra) permanece NaN — não se prediz ali.

    Mesma semântica da busca por ponto do treino (soilgrids._sample_layer_igh): pixel
    válido de MENOR distância dentro do raio. `distance_transform_edt(return_indices)`
    dá, para cada pixel inválido, a distância e o índice do válido mais próximo — o
    equivalente vetorizado, no raster inteiro, do argmin por ponto do treino.
    """
    invalid = np.isnan(arr)
    if not invalid.any() or invalid.all():
        return arr
    dist, (ir, ic) = ndimage.distance_transform_edt(invalid, return_indices=True)
    fillable = invalid & (dist <= radius_px)
    out = arr.copy()
    out[fillable] = arr[ir[fillable], ic[fillable]]
    return out


def gerar_solo_fill(bbox, res, out_dir: Path, strip_rows: int = 512,
                    radius_px: int = 40, workers: int = 6) -> None:
    """AWC e clay (0–30 cm ponderado, Saxton-Rawls) a 250 m, com preenchimento ≤ radius_px."""
    width, height, transform = _grid(bbox, res)
    out_dir.mkdir(parents=True, exist_ok=True)
    clay_out = out_dir / "clay_america_sul_250m.tif"
    awc_out = out_dir / "awc_america_sul_250m.tif"
    if clay_out.exists() and awc_out.exists():
        print(f"[solo] já existe: {clay_out.name}, {awc_out.name}")
        return
    profile = dict(driver="GTiff", dtype="float32", count=1, width=width, height=height,
                   crs="EPSG:4326", transform=transform, nodata=np.nan,
                   compress="lzw", tiled=True, bigtiff="YES")
    urls = {(p, d): f"/vsicurl/{ISRIC}/{p}/{p}_{d}_mean.vrt"
            for p in ("clay", "sand", "soc") for d, _ in DEPTHS}
    print(f"[solo] grid {width}x{height} @ {res}° | faixas de {strip_rows} "
          f"(+halo {radius_px}px ≈ {radius_px*250/1000:.0f} km) | preenchimento LIGADO", flush=True)

    with rasterio.open(clay_out, "w", **profile) as dc, \
         rasterio.open(awc_out, "w", **profile) as da:
        for row_off in range(0, height, strip_rows):
            rows = min(strip_rows, height - row_off)
            # HALO vertical: lê radius_px linhas a mais em cima/baixo (quando existem),
            # para o preenchimento na borda da faixa ver o solo da faixa vizinha.
            top_h = min(radius_px, row_off)
            bot_h = min(radius_px, height - (row_off + rows))
            r_ext = row_off - top_h
            rows_ext = rows + top_h + bot_h

            clay_acc = np.zeros((rows_ext, width)); wc = np.zeros((rows_ext, width))
            awc_acc = np.zeros((rows_ext, width)); wa = np.zeros((rows_ext, width))
            for d, wcm in DEPTHS:
                clay = _read_strip_retry(urls[("clay", d)], transform, width, rows_ext, r_ext, Resampling.nearest) / 10.0
                sand = _read_strip_retry(urls[("sand", d)], transform, width, rows_ext, r_ext, Resampling.nearest) / 10.0
                soc = _read_strip_retry(urls[("soc", d)], transform, width, rows_ext, r_ext, Resampling.nearest) / 100.0
                awc = _saxton_rawls_awc(sand, clay, soc * 1.724)
                okc = np.isfinite(clay); clay_acc[okc] += clay[okc] * wcm; wc[okc] += wcm
                oka = np.isfinite(awc); awc_acc[oka] += awc[oka] * wcm; wa[oka] += wcm
            clay_s = np.where(wc > 0, clay_acc / np.maximum(wc, 1e-9), np.nan)
            awc_s = np.where(wa > 0, awc_acc / np.maximum(wa, 1e-9), np.nan)

            # AJUSTE (Achado 5): preenche os buracos de cidade ≤ raio, na faixa ESTENDIDA
            # (com halo), e só depois recorta o miolo — assim não há emenda entre faixas.
            clay_s = _fill_nearest(clay_s, radius_px)
            awc_s = _fill_nearest(awc_s, radius_px)

            core = slice(top_h, top_h + rows)  # descarta o halo
            win = rasterio.windows.Window(0, row_off, width, rows)
            dc.write(clay_s[core].astype("float32"), 1, window=win)
            da.write(awc_s[core].astype("float32"), 1, window=win)
            print(f"  [solo] faixa {row_off}-{row_off+rows}/{height} ok", flush=True)
    print(f"[solo] salvo: {awc_out}\n[solo] salvo: {clay_out}", flush=True)


def main() -> None:
    p = argparse.ArgumentParser(
        description="Gera AWC/clay de PREDIÇÃO (América do Sul, 250 m) com preenchimento "
                    "dos buracos de cidade (mesma regra do treino).")
    p.add_argument("--res", type=float, default=0.00225, help="~250 m em graus.")
    p.add_argument("--bbox", type=float, nargs=4, default=list(AMERICA_SUL),
                   metavar=("W", "S", "E", "N"), help="bbox (padrão: América do Sul).")
    p.add_argument("--out", default=str(ROOT / "variaveis preditoras FAPES"),
                   help="Pasta de saída (padrão: 'variaveis preditoras FAPES/' na raiz).")
    p.add_argument("--strip_rows", type=int, default=512)
    p.add_argument("--radius_px", type=int, default=40,
                   help="Raio do preenchimento em px (40 ≈ 10 km a 250 m; igual ao treino).")
    args = p.parse_args()
    gerar_solo_fill(tuple(args.bbox), args.res, Path(args.out), args.strip_rows, args.radius_px)


if __name__ == "__main__":
    main()
