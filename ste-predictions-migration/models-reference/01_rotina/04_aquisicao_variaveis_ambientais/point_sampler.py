#!/usr/bin/env python3
# point_sampler.py — Extração de valores de raster NOS PONTOS de ocorrência/ausência
#
# Utilitário COMPARTILHADO usado pelos extratores/rotinas ambientais para amostrar
# um raster (NetCDF via xarray ou GeoTIFF via rioxarray) nas coordenadas de cada
# registro, com o MÉTODO CORRETO por tipo de variável:
#
#   - "bilinear" (linear) → variáveis CONTÍNUAS (temperatura, salinidade, elevação,
#     clorofila): interpola entre os 4 pixels vizinhos, suavizando o gradiente e
#     reduzindo o erro de "centro de pixel" do vizinho-mais-próximo (até ~½ célula
#     em grades grosseiras: ERA5 ~9 km, CMEMS ~9 km).
#   - "nearest" → variáveis CATEGÓRICAS/RUIDOSAS (NDVI, uso do solo): mantém o
#     valor do pixel, sem inventar valores intermediários.
#
# Funciona com QUALQUER convenção de nome de coordenada (latitude/lat/y,
# longitude/lon/x). Não altera os módulos existentes — é uma base reutilizável.

from __future__ import annotations

from pathlib import Path
from typing import Sequence

import numpy as np
import xarray as xr

_LAT_NAMES = ("latitude", "lat", "y", "Y")
_LON_NAMES = ("longitude", "lon", "x", "X")


def _coord_name(da: xr.DataArray, candidates: Sequence[str]) -> str:
    """Descobre o nome da coordenada de lat/lon no DataArray."""
    for name in candidates:
        if name in da.coords or name in da.dims:
            return name
    raise KeyError(
        f"Coordenada não encontrada entre {candidates}. "
        f"Disponíveis: coords={list(da.coords)}, dims={list(da.dims)}"
    )


def sample_dataarray(
    da: xr.DataArray,
    lats: Sequence[float],
    lons: Sequence[float],
    method: str = "bilinear",
) -> np.ndarray:
    """
    Amostra `da` nas coordenadas (lats, lons), ponto a ponto.

    Parâmetros:
        da: DataArray 2D (lat×lon); dimensões extras (ex.: time) devem ter sido
            reduzidas antes (ver `captura_ambiental`).
        lats, lons: listas/arrays de mesmas dimensões (um valor por registro).
        method: "bilinear" (contínuas) ou "nearest" (categóricas/NDVI).

    Retorna:
        np.ndarray (float) com um valor por ponto (NaN onde indisponível).
    """
    latn = _coord_name(da, _LAT_NAMES)
    lonn = _coord_name(da, _LON_NAMES)

    # Garante coordenadas monotônicas crescentes (interp exige monotonicidade;
    # GeoTIFF costuma vir com latitude decrescente).
    da = da.sortby(latn).sortby(lonn)

    pts = xr.DataArray(np.asarray(lats, dtype=float), dims="points")
    pln = xr.DataArray(np.asarray(lons, dtype=float), dims="points")
    kw = {latn: pts, lonn: pln}

    if method == "nearest":
        res = da.sel(**kw, method="nearest")
    elif method in ("bilinear", "linear"):
        # `interp` com DataArrays pontuais faz interpolação vetorizada nos 2 eixos
        # simultaneamente (bilinear) e devolve um valor por ponto.
        res = da.interp(**kw, method="linear")
    else:
        raise ValueError(f"method inválido: {method!r} (use 'bilinear' ou 'nearest').")

    return np.asarray(res.values, dtype=float).reshape(-1)


def sample_dataarray_safe(
    da: xr.DataArray,
    lats: Sequence[float],
    lons: Sequence[float],
    method: str = "bilinear",
) -> np.ndarray:
    """
    Como `sample_dataarray`, mas se `method="bilinear"` e algum ponto sair NaN
    (ex.: vizinho na borda/máscara), refaz APENAS esses pontos com "nearest".

    Isso preserva a suavização bilinear no interior e evita perder registros à
    beira de máscaras (costa, no-data) — comum em variáveis oceânicas/DEM.
    """
    vals = sample_dataarray(da, lats, lons, method=method)
    if method in ("bilinear", "linear"):
        nan = np.isnan(vals)
        if nan.any():
            lats_a = np.asarray(lats, dtype=float)
            lons_a = np.asarray(lons, dtype=float)
            fallback = sample_dataarray(da, lats_a[nan], lons_a[nan], method="nearest")
            vals[nan] = fallback
    return vals


def open_raster(path: str | Path) -> xr.DataArray:
    """
    Abre um raster como DataArray 2D (lat/lon), aceitando GeoTIFF ou NetCDF.

    - GeoTIFF (.tif/.tiff): via rioxarray (coords `x`/`y`); descarta a dimensão
      `band` (usa a banda 1). Valores no-data viram NaN (`masked=True`). Se o CRS
      NÃO for geográfico (EPSG:4326), REPROJETA para 4326 — a extração é sempre
      por lon/lat, então um raster projetado (UTM, etc.) seria amostrado errado.
    - NetCDF (.nc): via xarray; retorna a 1ª variável de dados (assume lon/lat).
    """
    path = Path(path)
    if path.suffix.lower() in (".tif", ".tiff"):
        import rioxarray  # noqa: F401  (registra o acessor .rio)
        da = rioxarray.open_rasterio(path, masked=True)
        if "band" in da.dims:
            da = da.isel(band=0, drop=True)
        crs = da.rio.crs
        if crs is not None and not crs.is_geographic:
            da = da.rio.reproject("EPSG:4326")
        return da
    ds = xr.open_dataset(path)
    first = list(ds.data_vars)[0]
    return ds[first]


def _clip_to_points(da: xr.DataArray, lats, lons, margin_deg: float = 0.1) -> xr.DataArray:
    """
    Recorta `da` à caixa dos pontos (+ margem) ANTES de amostrar — evita carregar/
    ordenar um mosaico inteiro (ex.: DEM SRTM continental) na memória.

    Para rasters com acessor `.rio` (GeoTIFF) usa `clip_box` (leitura por janela);
    caso contrário, recorta por índice nas coordenadas (funciona com eixo asc/desc).
    """
    lats = np.asarray(lats, dtype=float)
    lons = np.asarray(lons, dtype=float)
    lat_min, lat_max = np.nanmin(lats) - margin_deg, np.nanmax(lats) + margin_deg
    lon_min, lon_max = np.nanmin(lons) - margin_deg, np.nanmax(lons) + margin_deg
    try:
        if hasattr(da, "rio") and da.rio.crs is not None:
            return da.rio.clip_box(minx=lon_min, miny=lat_min,
                                   maxx=lon_max, maxy=lat_max)
    except Exception:  # noqa: BLE001 - cai no recorte por índice
        pass
    latn = _coord_name(da, _LAT_NAMES)
    lonn = _coord_name(da, _LON_NAMES)
    lat_c = da[latn].values
    lon_c = da[lonn].values
    lat_idx = np.where((lat_c >= lat_min) & (lat_c <= lat_max))[0]
    lon_idx = np.where((lon_c >= lon_min) & (lon_c <= lon_max))[0]
    if len(lat_idx) and len(lon_idx):
        da = da.isel({latn: lat_idx, lonn: lon_idx})
    return da


def sample_raster_file(
    path: str | Path,
    lats: Sequence[float],
    lons: Sequence[float],
    method: str = "bilinear",
    clip: bool = True,
) -> np.ndarray:
    """
    Abre um raster de arquivo e amostra nos pontos (com fallback nearest).

    `clip=True` recorta ao bbox dos pontos antes de carregar — essencial para
    rasters grandes (mosaicos DEM). Reprojeta a 4326 se necessário (ver open_raster).
    """
    da = open_raster(path)
    if clip:
        da = _clip_to_points(da, lats, lons)
    da = da.load()  # agora pequeno o suficiente para caber em memória
    return sample_dataarray_safe(da, lats, lons, method=method)


def sample_categorical_nearest(
    src,
    lats: Sequence[float],
    lons: Sequence[float],
    treat_zero_as_nodata: bool = False,
) -> np.ndarray:
    """
    Amostra o VALOR DO PIXEL (nearest) de um raster CATEGÓRICO (uso do solo) via
    `rasterio` `src.sample` — em STREAMING, sem carregar o raster inteiro na RAM
    (suporta milhões de pontos, mínimo de leitura em disco). `nodata` → NaN.

    `src` pode ser um caminho (str/Path) OU um dataset rasterio já aberto (reuso do
    objeto carregado em memória entre chamadas). O raster deve estar em EPSG:4326
    (mesma convenção dos demais rasters do projeto).

    `treat_zero_as_nodata=True` trata 0 como sem-dado (convenção do ESA WorldCover:
    0 = oceano/fora do mapa).
    """
    import rasterio

    lats = np.asarray(lats, dtype=float)
    lons = np.asarray(lons, dtype=float)
    ok = np.isfinite(lats) & np.isfinite(lons)
    out = np.full(len(lats), np.nan, dtype=float)
    if not ok.any():
        return out

    close = isinstance(src, (str, Path))
    ds = rasterio.open(src) if close else src
    try:
        coords = list(zip(lons[ok], lats[ok]))  # (x=lon, y=lat)
        vals = np.array([s[0] if s is not None and len(s) else np.nan
                         for s in ds.sample(coords)], dtype=float)
        nod = ds.nodata
        if nod is not None:
            vals[vals == nod] = np.nan
        if treat_zero_as_nodata:
            vals[vals == 0] = np.nan
    finally:
        if close:
            ds.close()
    out[ok] = vals
    return out
