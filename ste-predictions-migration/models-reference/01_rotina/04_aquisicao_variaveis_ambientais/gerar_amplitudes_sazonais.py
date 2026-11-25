#!/usr/bin/env python3
# gerar_amplitudes_sazonais.py — Gera rasters de AMPLITUDE SAZONAL por pixel.
#
# Para cada variavel mensal ja cacheada (env_data/raster_cache/mensal/<var>_<MM>.tif,
# medias 2015-2024 por mes), calcula por pixel:
#     <var>_amp = max(12 meses) - min(12 meses)
#
# POR QUE: o modelo climatologico do caraya (Cerrado) separava mal presenca de
# pseudoausencia (razao 1,4) porque as MEDIAS anuais de dois lugares podem ser iguais
# com REGIMES opostos (chuva o ano todo vs seca braba de 5 meses). A amplitude e a
# assinatura DO LUGAR que diferencia Cerrado (tp_amp alta) de Amazonia/Mata Atlantica
# (tp_amp menor) — e vars ESTATICAS por local, entao entram no desenho climatologico
# (que funciona) sem o vicio do desenho por-registro (diario/sazonal, que inverte:
# la o clima do registro nao separa as classes e o RF desaba na altitude).
#
# Cobertura: bbox dos rasters mensais (Brasil + vizinhos PY/AR/BO/UY).
# Saida: env_data/raster_cache/mensal/<var>_amp.tif (mesma grade do mensal).
#
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe 03_environmental_processing/gerar_amplitudes_sazonais.py

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parent.parent.parent
MENSAL = ROOT / "02_dados_entrada" / "ambientais" / "raster_cache" / "mensal"
VARS = ["t2m", "e", "tp", "ndvi"]


def _p(m=""):
    print(m, flush=True)


def gerar(var: str) -> Path | None:
    fontes = [MENSAL / f"{var}_{m:02d}.tif" for m in range(1, 13)]
    faltam = [f.name for f in fontes if not f.exists()]
    if faltam:
        _p(f"[amp] {var}: faltam {len(faltam)} rasters mensais — pulando.")
        return None
    out = MENSAL / f"{var}_amp.tif"

    with rasterio.open(fontes[0]) as ref:
        perfil = ref.profile.copy()
        mn = ref.read(1, masked=True).astype("float64")
    mx = mn.copy()
    for f in fontes[1:]:
        with rasterio.open(f) as src:
            v = src.read(1, masked=True).astype("float64")
        mn = np.ma.minimum(mn, v)
        mx = np.ma.maximum(mx, v)
    amp = (mx - mn).astype("float32")

    perfil.update(dtype="float32", count=1, compress="deflate", predictor=2)
    with rasterio.open(out, "w", **perfil) as dst:
        dst.write(amp.filled(perfil.get("nodata") or np.nan), 1)
    ok = int((~amp.mask).sum()) if np.ma.isMaskedArray(amp) else amp.size
    _p(f"[amp] {out.name}: pixels validos {ok} | faixa "
       f"{float(amp.min()):.4g} a {float(amp.max()):.4g}")
    return out


def main():
    feitos = [gerar(v) for v in VARS]
    _p(f"[amp] FEITO: {sum(1 for f in feitos if f)} de {len(VARS)} amplitudes geradas.")


if __name__ == "__main__":
    main()
