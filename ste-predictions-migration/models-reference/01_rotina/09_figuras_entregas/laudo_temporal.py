#!/usr/bin/env python3
# laudo_temporal.py — COMPATIBILIDADE TEMPORAL treino×projeção e DOMÍNIO DE APLICABILIDADE.
#
# Seção central do laudo (§14/§15). Para cada variável e espécie compara a distribuição:
#   - no treino DIÁRIO (clima do dia do registro — amplitude alta, "tempo");
#   - no treino CLIMATOLÓGICO (média de 10 anos no local — amplitude menor, "clima");
#   - na PROJEÇÃO (raster da média de 10 anos do Brasil — o cenário comum).
#
# Pergunta-chave: as médias de 10 anos da projeção caem DENTRO do intervalo em que cada
# modelo foi treinado? Se sim, o modelo INTERPOLA (seguro); se não, EXTRAPOLA (arriscado).
# Como o treino diário tem amplitude MAIOR (variação do tempo dia a dia), a projeção decenal
# (mais estreita) tende a cair dentro dele — mas o modelo diário aprendeu relações do "tempo",
# não do "clima". O climatológico treina e projeta na MESMA escala (coerência por construção).
#
# Produz: temporal.json (tabela por variável) + MESS por espécie×modo (extrapolação no Brasil)
# como GeoTIFF + PNG + % de área extrapolada.

from __future__ import annotations

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import rasterio

ROOT = Path(__file__).resolve().parent.parent.parent
BASE = ROOT / "03_dados_saida"
COMP = ROOT / "01_rotina" / "09_figuras_entregas" / "_comparacao_brasil"
PRED1KM = ROOT / "02_dados_entrada" / "ambientais" / "predicao_7var_brasil_1km"
RODADA = "2026-07-17"
ESPS = ["Alouatta_caraya", "Alouatta_guariba", "Sapajus_nigritus"]
CONT = ["t2m", "e", "tp", "ndvi", "altitude", "awc"]      # contínuas (uso do solo é categórico)
ROTULO = {"t2m": "temperatura", "e": "evaporação", "tp": "precipitação", "ndvi": "NDVI",
          "altitude": "altitude", "awc": "água no solo"}


def _dataset(esp: str, modo: str) -> pd.DataFrame:
    sub = "_variables_climatologico_" if modo == "clima" else "_variables_"
    pat = "VariablesClimatologico_*.csv" if modo == "clima" else "Variables_*.csv"
    d = BASE / esp / RODADA / f"{esp}{sub}17_07_26"
    fs = [f for f in d.glob(pat) if "Cache" not in f.name]
    return pd.read_csv(fs[0])


def _stats(x: np.ndarray) -> dict:
    x = x[np.isfinite(x)]
    if not len(x):
        return {}
    return dict(n=int(len(x)), media=float(x.mean()), dp=float(x.std()),
                min=float(x.min()), q05=float(np.percentile(x, 5)),
                q95=float(np.percentile(x, 95)), max=float(x.max()))


def _grade_base() -> tuple:
    """Grade comum = a do ndvi 1 km (4000×4000). As coarse (t2m/e/tp) sobem para ela."""
    with rasterio.open(PRED1KM / "ndvi.tif") as s:
        return s.transform, s.width, s.height, s.crs


def _proj_stack() -> tuple[dict, np.ndarray]:
    """Carrega os rasters de projeção reamostrados para a MESMA grade (a do ndvi 1 km).
    Retorna {var: array_flat} + máscara de válidos. As coarse (0,1°) são reamostradas
    (bilinear) para 0,01° — mesma coisa que o motor de predição faz por faixa."""
    from rasterio.warp import reproject
    from rasterio.enums import Resampling
    transform, W, H, crs = _grade_base()
    arr = {}
    for v in CONT:
        with rasterio.open(PRED1KM / f"{v}.tif") as s:
            if s.width == W and s.height == H:
                a = s.read(1, masked=True).filled(np.nan).astype("float32")
            else:
                a = np.full((H, W), np.nan, dtype="float32")
                reproject(source=rasterio.band(s, 1), destination=a,
                          src_transform=s.transform, src_crs=s.crs,
                          dst_transform=transform, dst_crs=crs,
                          resampling=Resampling.bilinear,
                          src_nodata=s.nodata, dst_nodata=np.nan)
        arr[v] = a.ravel()
    ok = np.ones(H * W, dtype=bool)
    for v in CONT:
        ok &= np.isfinite(arr[v])
    return arr, ok


def mess(ref: dict, proj: dict, ok: np.ndarray) -> np.ndarray:
    """MESS (Elith et al. 2010): similaridade ambiental multivariada. Por pixel, o MÍNIMO
    entre variáveis da similaridade percentílica. <0 = fora do intervalo de treino de ao
    menos uma variável (extrapolação)."""
    n = len(next(iter(proj.values())))
    sim_min = np.full(n, np.inf, dtype="float32")
    for v in CONT:
        r = np.sort(ref[v][np.isfinite(ref[v])])
        p = proj[v]
        nref = len(r)
        # % de referências abaixo de p
        idx = np.searchsorted(r, p, side="right")
        f = 100.0 * idx / nref
        rng = r[-1] - r[0]
        s = np.empty(n, dtype="float32")
        below = p < r[0]; above = p > r[-1]
        mid = ~(below | above)
        with np.errstate(divide="ignore", invalid="ignore"):
            s[below] = 100.0 * (p[below] - r[0]) / rng if rng else 0.0
            s[above] = 100.0 * (r[-1] - p[above]) / rng if rng else 0.0
        s[mid] = 2.0 * np.minimum(f[mid], 100.0 - f[mid])
        sim_min = np.minimum(sim_min, s)
    sim_min[~ok] = np.nan
    return sim_min


def main() -> None:
    proj, ok = _proj_stack()
    with rasterio.open(PRED1KM / "ndvi.tif") as s:   # grade base 1 km (4000×4000)
        perfil = s.profile.copy()
        H, W = s.height, s.width
    perfil.update(dtype="float32", count=1, nodata=np.nan, compress="deflate",
                  tiled=True, blockxsize=256, blockysize=256)

    resultado = {}
    for esp in ESPS:
        resultado[esp] = {"variaveis": {}, "mess": {}}
        refs = {}
        for modo in ["daily", "clima"]:
            ds = _dataset(esp, modo)
            comp = ds.dropna(subset=[c for c in CONT if c in ds.columns])
            refs[modo] = {v: comp[v].to_numpy() for v in CONT if v in comp.columns}
        # tabela por variável: treino diário, treino clima, projeção + compatibilidade
        for v in CONT:
            td = _stats(refs["daily"][v]); tc = _stats(refs["clima"][v])
            pj = _stats(proj[v][ok])
            # compatibilidade: fração da projeção dentro do intervalo [q05,q95] do treino
            def _dentro(ref_stats):
                if not ref_stats or not pj:
                    return None
                pv = proj[v][ok]
                return float(((pv >= ref_stats["min"]) & (pv <= ref_stats["max"])).mean())
            comp_daily = _dentro(td); comp_clima = _dentro(tc)
            def _classe(fr):
                if fr is None:
                    return "?"
                return ("alta" if fr >= 0.98 else "moderada" if fr >= 0.90
                        else "baixa" if fr >= 0.75 else "incompatível")
            resultado[esp]["variaveis"][v] = dict(
                rotulo=ROTULO[v], treino_daily=td, treino_clima=tc, projecao=pj,
                proj_dentro_daily=comp_daily, proj_dentro_clima=comp_clima,
                compat_daily=_classe(comp_daily), compat_clima=_classe(comp_clima))
        # MESS por modo
        for modo in ["daily", "clima"]:
            m = mess(refs[modo], proj, ok)
            neg = float(np.nanmean(m < 0))
            resultado[esp]["mess"][modo] = dict(
                perc_extrapolacao=round(100 * neg, 2),
                mess_min=float(np.nanmin(m)), mess_mediana=float(np.nanmedian(m)))
            # grava raster
            out = COMP / f"MESS_{modo}_{esp}.tif"
            with rasterio.open(out, "w", **perfil) as dst:
                dst.write(m.reshape(H, W), 1)
        print(f"  {esp:18} extrapolação(MESS<0): daily="
              f"{resultado[esp]['mess']['daily']['perc_extrapolacao']}% "
              f"clima={resultado[esp]['mess']['clima']['perc_extrapolacao']}%")

    (COMP / "temporal.json").write_text(json.dumps(resultado, indent=2, ensure_ascii=False),
                                        encoding="utf-8")
    print("[ok] temporal.json + MESS_*.tif")


if __name__ == "__main__":
    main()
