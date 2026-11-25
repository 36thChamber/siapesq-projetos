#!/usr/bin/env python3
# batimetria.py — Batimetria AGNÓSTICA DE FONTE para o pipeline OCEÂNICO.
#
# POR QUE: três etapas do pipeline marinho precisam da profundidade do fundo:
#   (1) LIMPEZA  — remover ocorrências que caíram em TERRA (profundidade >= 0);
#   (2) PSEUDO   — sortear pseudo-ausências só na FAIXA de profundidade das ocorrências;
#   (3) CAPTURA  — a variável ambiental "profundidade" (fixa no tempo) por ponto.
#
# Este módulo abstrai a FONTE do dado de batimetria. Funciona com:
#   - `dados_entrada/ocean_depth.nc`  (interim, ~9 km — var `__xarray_dataarray_variable__`, coords x/y)
#   - GEBCO                            (~450 m — var `elevation`, coords lon/lat)
# Basta apontar o caminho; a estrutura é detectada automaticamente. Convenção de
# sinal: profundidade em METROS, **negativo = oceano**, positivo = terra (elevação).
#
# Amostragem por VIZINHO MAIS PRÓXIMO (batimetria é estática; nearest evita borrar a
# linha de costa que a interpolação bilinear causaria ao misturar terra e mar).

from __future__ import annotations

from pathlib import Path

import numpy as np
import xarray as xr

ROOT = Path(__file__).resolve().parent.parent
# Interim: o ocean_depth.nc (~9 km, mesma grade do CMEMS). Troque pelo GEBCO quando
# o arquivo estiver em dados_entrada/ (ex.: dados_entrada/gebco_atlantico.nc).
BATIMETRIA_PADRAO = ROOT / "dados_entrada" / "ocean_depth.nc"

_CACHE: dict[str, xr.DataArray] = {}


def _abrir(path: str | Path) -> xr.DataArray:
    """Abre a batimetria e padroniza para um DataArray 2D chamado `depth`, com coords
    `lat`/`lon`. Detecta ocean_depth.nc e GEBCO automaticamente. Cacheia em memória."""
    chave = str(path)
    if chave in _CACHE:
        return _CACHE[chave]
    ds = xr.open_dataset(chave)

    # 1) variável de profundidade/elevação
    if "elevation" in ds.data_vars:                       # GEBCO
        da = ds["elevation"]
    elif "__xarray_dataarray_variable__" in ds.data_vars:  # ocean_depth.nc
        da = ds["__xarray_dataarray_variable__"]
    else:                                                  # fallback: 1ª var "real"
        cand = [v for v in ds.data_vars if v not in ("spatial_ref", "crs")]
        if not cand:
            raise ValueError(f"Batimetria sem variável de profundidade: {chave}")
        da = ds[cand[0]]

    # 2) reduz dimensões extras (band/time) ao 1º índice
    for d in list(da.dims):
        if str(d).lower() not in ("x", "y", "lon", "lat", "longitude", "latitude"):
            da = da.isel({d: 0}, drop=True)

    # 3) renomeia coords/dims para lat/lon
    ren: dict = {}
    for c in list(da.coords) + list(da.dims):
        cl = str(c).lower()
        if cl in ("x", "lon", "longitude"):
            ren[c] = "lon"
        elif cl in ("y", "lat", "latitude"):
            ren[c] = "lat"
    da = da.rename({k: v for k, v in ren.items() if k != v})
    da = da.rename("depth")

    # 4) garante lat/lon crescentes (necessário p/ sel nearest coerente)
    if da["lat"].values[0] > da["lat"].values[-1]:
        da = da.sortby("lat")
    if da["lon"].values[0] > da["lon"].values[-1]:
        da = da.sortby("lon")

    _CACHE[chave] = da
    return da


def profundidade_pontos(lats, lons, path: str | Path = BATIMETRIA_PADRAO) -> np.ndarray:
    """Profundidade (m; negativo = oceano) nos pontos, por vizinho mais próximo.
    Pontos FORA da cobertura da grade viram NaN (evita o clamp do nearest na borda)."""
    da = _abrir(path)
    lat_arr = np.asarray(lats, dtype=float)
    lon_arr = np.asarray(lons, dtype=float)
    plat = xr.DataArray(lat_arr, dims="p")
    plon = xr.DataArray(lon_arr, dims="p")
    dep = da.sel(lat=plat, lon=plon, method="nearest").values.reshape(-1).astype(float)

    latv, lonv = da["lat"].values, da["lon"].values
    fora = ((lat_arr < latv.min()) | (lat_arr > latv.max())
            | (lon_arr < lonv.min()) | (lon_arr > lonv.max()))
    dep[fora] = np.nan
    return dep


def eh_oceano(lats, lons, path: str | Path = BATIMETRIA_PADRAO) -> np.ndarray:
    """Máscara booleana: True onde é oceano (profundidade finita e < 0)."""
    dep = profundidade_pontos(lats, lons, path)
    return np.isfinite(dep) & (dep < 0)


def faixa_profundidade(lats, lons, path: str | Path = BATIMETRIA_PADRAO
                       ) -> tuple[float, float] | None:
    """(min, max) de profundidade das ocorrências que estão no OCEANO. Define a faixa
    de sorteio das pseudo-ausências (etapa 3). None se nenhum ponto for oceânico."""
    dep = profundidade_pontos(lats, lons, path)
    oce = dep[np.isfinite(dep) & (dep < 0)]
    if oce.size == 0:
        return None
    return float(oce.min()), float(oce.max())


if __name__ == "__main__":  # smoke test rápido
    import sys
    p = sys.argv[1] if len(sys.argv) > 1 else BATIMETRIA_PADRAO
    # pontos: oceano (costa RJ ~-24,-42), terra (Brasília ~-15.8,-47.9), fora da grade
    la = [-24.0, -15.8, 80.0]
    lo = [-42.0, -47.9, 120.0]
    dep = profundidade_pontos(la, lo, p)
    oce = eh_oceano(la, lo, p)
    print("batimetria:", p)
    for i, (a, o, d, m) in enumerate(zip(la, lo, dep, oce)):
        print(f"  ({a:.1f},{o:.1f}) depth={d!r} oceano={bool(m)}")
    print("faixa_profundidade (oceânicos):", faixa_profundidade(la, lo, p))
