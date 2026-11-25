#!/usr/bin/env python3
# teste_coerencia_ecologica.py — O modelo pontua mais alto ONDE A ESPÉCIE OCORRE?
#
# POR QUE EXISTE: em 2026-08-07 o `modelo_rf_daily` do Sapajus passou no teste de
# extrapolação (0,1% das células fora da faixa de treino) e mesmo assim produziu mapas
# ECOLOGICAMENTE INVERTIDOS — dava a Amazônia (0,552) como mais adequada que a Mata
# Atlântica (0,506), sendo que nenhuma das 3.134 presenças está na Amazônia.
#
# A lição: extrapolação é métrica NECESSÁRIA mas NÃO SUFICIENTE. Estar dentro da faixa de
# treino não garante que o modelo separe as regiões certas, e nenhum limiar corrige uma
# inversão de ranqueamento — não é calibração, é falha de discriminação.
#
# O QUE ESTE TESTE FAZ: compara a adequabilidade média DENTRO do envelope das presenças
# reais contra a de uma região onde a espécie comprovadamente NÃO ocorre. O envelope sai
# das próprias presenças do CSV de treino, então o teste não depende de conhecimento
# externo da espécie — funciona para qualquer uma.
#
# VEREDITO
#   APROVADO  — média dentro do envelope > média fora, com margem
#   SUSPEITO  — as duas médias são próximas (o modelo não discrimina)
#   REPROVADO — média FORA >= média dentro (inversão; não usar o mapa)
#
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe 04_modeling/teste_coerencia_ecologica.py \
#       --mapa "07 .../anual_2015_2024/Sapajus_nigritus_anual_2015_2024_adequabilidade.tif" \
#       --treino "07 .../modelo_rf_climatologico/predictor_climatologico.csv"

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import rasterio
from rasterio.enums import Resampling

# "Dentro" e "fora" são definidos por DISTÂNCIA ÀS PRESENÇAS, não por caixa envolvente.
#
# A primeira versão usava a caixa (bbox) e deu falso alarme na Alouatta guariba: ela ocupa
# uma faixa costeira longa e estreita (Bahia ao RS), e a caixa que a envolve engole todo o
# interior do Brasil, onde ela não vive. Isso diluía a média "dentro" e o teste reprovava um
# modelo bom — medido: 1,12 pela caixa contra 3,39 por distância, no MESMO mapa.
#
# O anel morto entre RAIO_DENTRO e RAIO_FORA evita que a borda da distribuição, onde a
# adequabilidade cai gradualmente, entre nos dois lados da conta.
RAIO_DENTRO_KM = 50.0
RAIO_FORA_KM = 100.0
GRAU_EM_KM = 111.0      # aproximação suficiente: o teste compara médias, não mede área

MARGEM_APROVA = 1.80    # dentro precisa ser >= 1,8× a média de fora
MARGEM_SUSPEITA = 1.30  # abaixo disso o modelo mal separa as duas

# SEGUNDO CRITÉRIO: populações fantasma.
#
# A razão dentro/fora mede o gradiente LOCAL e sozinha não pega sobrepredição REGIONAL. O
# modelo diário do Sapajus dava razão 1,30 (só "suspeito") e ao mesmo tempo marcava 30-41%
# do território distante como adequado — uma espécie da Mata Atlântica "ocupando" a Amazônia.
# Medido: o modelo climatológico nunca passa de 2,9% nesse indicador; o diário vai a 40,8%.
# A separação é limpa, então o corte em 10% é folgado para os dois lados.
MAX_PCT_FORA_ADEQUADO = 10.0


def _p(m: str = "") -> None:
    print(m, flush=True)


def _presencas(treino_csv: Path):
    d = pd.read_csv(treino_csv)
    lat_c = "decimalLatitude" if "decimalLatitude" in d.columns else "lat"
    lon_c = "decimalLongitude" if "decimalLongitude" in d.columns else "lon"
    pr = d[d["sp"] == 1] if "sp" in d.columns else d
    if pr.empty:
        raise SystemExit(f"[coer] sem presenças (sp==1) em {treino_csv}")
    return pr[[lat_c, lon_c]].to_numpy(float)


def testar(mapa: Path, treino_csv: Path, raio_dentro=RAIO_DENTRO_KM,
           raio_fora=RAIO_FORA_KM) -> dict:
    from scipy.spatial import cKDTree

    pts = _presencas(treino_csv)
    _p(f"[coer] {len(pts)} presenças | dentro <= {raio_dentro:.0f} km, "
       f"fora > {raio_fora:.0f} km")

    with rasterio.open(mapa) as r:
        arr = r.read(1, out_shape=(min(r.height, 700), min(r.width, 700)),
                     resampling=Resampling.average).astype("float64")
        b = r.bounds
    alt, larg = arr.shape
    lons = np.linspace(b.left, b.right, larg)
    lats = np.linspace(b.top, b.bottom, alt)
    LON, LAT = np.meshgrid(lons, lats)
    val = np.isfinite(arr)

    # distância de cada célula predita à presença mais próxima
    tree = cKDTree(pts)
    dist_graus, _ = tree.query(np.column_stack([LAT[val], LON[val]]), k=1)
    dist_km = dist_graus * GRAU_EM_KM

    v = arr[val]
    m_dentro_arr = v[dist_km <= raio_dentro]
    m_fora_arr = v[dist_km > raio_fora]
    if m_dentro_arr.size < 50 or m_fora_arr.size < 50:
        raise SystemExit("[coer] células insuficientes para comparar.")

    m_dentro = float(m_dentro_arr.mean())
    m_fora = float(m_fora_arr.mean())
    razao = m_dentro / m_fora if m_fora > 1e-9 else float("inf")

    pct_fora_adequado = 100.0 * float((m_fora_arr > 0.5).mean())

    if m_fora >= m_dentro:
        veredito = "REPROVADO"
        nota = ("O modelo pontua a região onde a espécie NÃO ocorre igual ou acima de onde "
                "ela ocorre. Inversão de ranqueamento — o mapa não deve ser usado.")
    elif pct_fora_adequado > MAX_PCT_FORA_ADEQUADO:
        veredito = "REPROVADO"
        nota = (f"Populações fantasma: {pct_fora_adequado:.1f}% do território a mais de "
                f"{raio_fora:.0f} km de qualquer presença aparece como adequado (limite "
                f"{MAX_PCT_FORA_ADEQUADO:.0f}%). O modelo sobreprediz em larga escala, "
                f"mesmo tendo gradiente local (razão {razao:.2f}).")
    elif razao < MARGEM_SUSPEITA:
        veredito = "SUSPEITO"
        nota = "As médias são quase iguais: o modelo mal distingue as duas regiões."
    elif razao < MARGEM_APROVA:
        veredito = "SUSPEITO"
        nota = (f"Separação fraca (razão {razao:.2f}; esperado >= {MARGEM_APROVA}). "
                f"Não há sobrepredição distante ({pct_fora_adequado:.1f}%), então o mapa "
                f"não inventa população onde não há — só distingue mal as bordas.")
    else:
        veredito = "APROVADO"
        nota = "O modelo pontua claramente mais alto onde a espécie ocorre."

    res = {
        "mapa": mapa.name, "veredito": veredito,
        "n_presencas_treino": len(pts),
        "raio_dentro_km": raio_dentro, "raio_fora_km": raio_fora,
        "adequabilidade_media_dentro": round(m_dentro, 4),
        "adequabilidade_media_fora": round(m_fora, 4),
        "razao_dentro_fora": round(razao, 3),
        "pct_acima_0.5_dentro": round(100 * float((m_dentro_arr > 0.5).mean()), 2),
        "pct_acima_0.5_fora": round(100 * float((m_fora_arr > 0.5).mean()), 2),
        "n_celulas_dentro": int(m_dentro_arr.size),
        "n_celulas_fora": int(m_fora_arr.size),
        "nota": nota,
    }
    _p(f"[coer] dentro ({m_dentro_arr.size} céls): média {m_dentro:.3f} "
       f"({res['pct_acima_0.5_dentro']:.1f}% acima de 0,5)")
    _p(f"[coer] fora   ({m_fora_arr.size} céls): média {m_fora:.3f} "
       f"({res['pct_acima_0.5_fora']:.1f}% acima de 0,5)")
    _p(f"[coer] razão dentro/fora = {razao:.2f}  ->  {veredito}")
    _p(f"[coer] {nota}")
    return res


def main() -> None:
    p = argparse.ArgumentParser(
        description="Testa se o modelo pontua mais alto onde a espécie realmente ocorre.")
    p.add_argument("--mapa", required=True, help="GeoTIFF de adequabilidade.")
    p.add_argument("--treino", required=True, help="CSV de treino (com sp e coordenadas).")
    p.add_argument("--raio_dentro", type=float, default=RAIO_DENTRO_KM,
                   help="Raio (km) que conta como DENTRO da distribuição.")
    p.add_argument("--raio_fora", type=float, default=RAIO_FORA_KM,
                   help="Além deste raio (km) conta como FORA.")
    p.add_argument("--json", default=None, help="Grava o resultado neste caminho.")
    a = p.parse_args()
    res = testar(Path(a.mapa), Path(a.treino), a.raio_dentro, a.raio_fora)
    if a.json:
        Path(a.json).write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
        _p(f"[coer] salvo: {a.json}")
    raise SystemExit(0 if res["veredito"] == "APROVADO" else 3)


if __name__ == "__main__":
    main()
