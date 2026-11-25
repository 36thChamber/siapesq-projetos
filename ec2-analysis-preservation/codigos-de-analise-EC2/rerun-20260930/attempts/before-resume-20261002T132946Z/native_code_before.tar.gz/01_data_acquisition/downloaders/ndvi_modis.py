#!/usr/bin/env python3
# ndvi_modis.py — NDVI MENSAL via produto composto MODIS (ORNL DAAC REST API).
#
# POR QUE: a fonte antiga (AVHRR diário da NOAA) baixa 1 arquivo GLOBAL de ~60 MB
# POR DIA e a média mensal exige ~30 arquivos/mês (~60 GB p/ dezenas de meses).
# Aqui usamos a API REST do ORNL DAAC, que devolve o NDVI já COMPOSTO (16 dias,
# filtrado de nuvem — "best pixel") por PONTO, sem baixar rasters e SEM credencial.
# Produto: MOD13Q1 (NDVI 250 m, composto de 16 dias). Agregamos os compostos do
# MÊS do registro → NDVI mensal (mantém a semântica de "média mensal dos positivos").
#
# Escala oficial: valor inteiro × 0,0001 = NDVI (−0,2..1). Fill/nuvem/água ficam
# negativos → descartados (média só dos POSITIVOS), como na rotina anterior.
#
# DESEMPENHO: a API é consultada 1x por ponto (I/O de rede, ~4 s/ponto). O gargalo
# é ESPERAR a resposta, não a CPU. Por isso `monthly_batch` dispara os pontos únicos
# em PARALELO (ThreadPoolExecutor, sessão por thread) — os valores são idênticos ao
# modo sequencial, só muito mais rápido (~8x com 8 trabalhadores). Nº de trabalhadores
# configurável por `workers=` ou variável de ambiente NDVI_WORKERS (default 8); baixe-o
# se o ORNL começar a recusar (rate-limit).

from __future__ import annotations

import calendar
import os
import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date

import numpy as np
import requests

_BASE = "https://modis.ornl.gov/rst/api/v1"
_PRODUCT = "MOD13Q1"
_BAND = "250m_16_days_NDVI"
_HEADERS = {"Accept": "application/json"}

# Sessão HTTP por thread (requests.Session NÃO é seguro para uso concorrente entre
# threads; uma por trabalhador mantém keep-alive sem corrida).
_thread_local = threading.local()


def _session() -> requests.Session:
    s = getattr(_thread_local, "session", None)
    if s is None:
        s = requests.Session()
        _thread_local.session = s
    return s


def _adate(year: int, doy: int) -> str:
    return f"A{year}{doy:03d}"


def monthly_point(lat: float, lon: float, year: int, month: int,
                  timeout: int = 60, session: requests.Session | None = None,
                  retries: int = 2, backoff: float = 1.5) -> tuple[float, int]:
    """
    NDVI mensal (média dos compostos POSITIVOS do mês) para um ponto.
    Retorna (media, n_compostos_validos). (NaN, 0) se indisponível.

    Em caso de falha (API oscila / rate-limit sob paralelismo), espera um tempo
    CRESCENTE antes de tentar de novo (backoff exponencial + jitter) — assim uma
    nova tentativa não bate na hora e é reengolida pelo mesmo erro.
    """
    s = session or requests
    first_doy = date(year, month, 1).timetuple().tm_yday
    last_day = calendar.monthrange(year, month)[1]
    last_doy = date(year, month, last_day).timetuple().tm_yday
    params = {
        "latitude": lat, "longitude": lon, "band": _BAND,
        "startDate": _adate(year, first_doy), "endDate": _adate(year, last_doy),
        "kmAboveBelow": 0, "kmLeftRight": 0,
    }
    ym = f"{year}-{month:02d}"
    last_err = None
    for attempt in range(retries + 1):
        try:
            r = s.get(f"{_BASE}/{_PRODUCT}/subset", params=params,
                      headers=_HEADERS, timeout=timeout)
            r.raise_for_status()
            j = r.json()
            scale = float(j.get("scale", 0.0001))
            vals = []
            for rec in j.get("subset", []):
                cal = str(rec.get("calendar_date", ""))
                if cal[:7] != ym:  # compostos que INICIAM no mês do registro
                    continue
                data = rec.get("data") or []
                v = data[0] if data else None
                if v is not None and v > 0:
                    vals.append(v * scale)
            if vals:
                return float(np.mean(vals)), len(vals)
            return np.nan, 0
        except Exception as e:  # noqa: BLE001 - API pode oscilar; tenta de novo
            last_err = e
            if attempt < retries:
                time.sleep(backoff * (2 ** attempt) + random.uniform(0, 0.5))
    # Falha após retries: propaga como (NaN,0) silencioso (isola por ponto).
    _ = last_err
    return np.nan, 0


def _resolve_workers(workers: int | None) -> int:
    if workers is None:
        try:
            workers = int(os.environ.get("NDVI_WORKERS", "8"))
        except ValueError:
            workers = 8
    return max(1, workers)


def monthly_batch(lats, lons, years, months, round_dp: int = 3,
                  timeout: int = 60, workers: int | None = None,
                  progress_every: int = 100,
                  progress_cb=None) -> tuple[np.ndarray, np.ndarray]:
    """
    Vetoriza `monthly_point` deduplicando por (lat,lon,ano,mês) — 1 chamada por
    combinação única — e dispara essas chamadas em PARALELO (ThreadPoolExecutor,
    sessão keep-alive por thread). O resultado é remontado na ordem de entrada,
    então os valores são IDÊNTICOS ao modo sequencial, só mais rápido.
    Retorna (ndvi[], n_compostos[]) alinhados à ordem de entrada.
    """
    lats = np.asarray(lats, float)
    lons = np.asarray(lons, float)
    years = np.asarray(years)
    months = np.asarray(months)
    n = len(lats)
    ndvi = np.full(n, np.nan)
    count = np.zeros(n, dtype=int)

    # 1) monta as chaves ÚNICAS -> índices de entrada que compartilham cada chave
    #    (deduplicação idêntica à versão sequencial).
    key_to_indices: dict[tuple, list[int]] = {}
    for i in range(n):
        if not (np.isfinite(lats[i]) and np.isfinite(lons[i])):
            continue
        try:
            y = int(years[i]); m = int(months[i])
        except (TypeError, ValueError):
            continue
        key = (round(float(lats[i]), round_dp), round(float(lons[i]), round_dp), y, m)
        key_to_indices.setdefault(key, []).append(i)

    unique_keys = list(key_to_indices.keys())
    total = len(unique_keys)
    if total == 0:
        return ndvi, count

    workers = min(_resolve_workers(workers), total)

    def _fetch(key: tuple) -> tuple[tuple, tuple[float, int]]:
        lat, lon, y, m = key
        return key, monthly_point(lat, lon, y, m, timeout=timeout, session=_session())

    done = 0
    if progress_cb:
        progress_cb(0, total, "pontos únicos")
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [ex.submit(_fetch, k) for k in unique_keys]
        for fut in as_completed(futures):
            key, (val, cnt) = fut.result()
            for i in key_to_indices[key]:
                ndvi[i] = val
                count[i] = cnt
            done += 1
            if progress_cb:
                progress_cb(done, total, "pontos únicos")
            if progress_every and (done % progress_every == 0 or done == total):
                print(f"  [ndvi] {done}/{total} pontos unicos "
                      f"({workers} em paralelo)", flush=True)
    return ndvi, count
