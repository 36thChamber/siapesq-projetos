#!/usr/bin/env python3
# radius_checker_utils.py — Filtro de RAIO das pseudoausências (distância às presenças).
#
# Antes: loop Python O(P) com `geopy.great_circle` POR ponto — o gargalo da etapa 02.
# Agora: haversine VETORIZADO (numpy), sem dependências novas. Distância exata na
# esfera. As funções antigas (`is_within_radius`/`check_radius`) foram mantidas por
# compatibilidade, reimplementadas sobre a versão vetorizada.

from __future__ import annotations

import numpy as np

_R_KM = 6371.0088  # raio médio da Terra (km)


def haversine_min_km(cand_latlon, pres_latlon) -> np.ndarray:
    """
    Distância haversine MÍNIMA (km) de cada candidato ao conjunto de presenças.

    cand_latlon: array (B, 2) de [lat, lon] em graus.
    pres_latlon: array (P, 2) de [lat, lon] em graus.
    Retorna: array (B,) com a menor distância de cada candidato a qualquer presença
    (np.inf se não houver presenças). Vetorizado; para P muito grande, processa em
    blocos de candidatos para limitar memória.
    """
    cand = np.radians(np.asarray(cand_latlon, dtype="float64")).reshape(-1, 2)
    pres = np.radians(np.asarray(pres_latlon, dtype="float64")).reshape(-1, 2)
    out = np.full(len(cand), np.inf)
    if len(pres) == 0 or len(cand) == 0:
        return out
    plat, plon = pres[:, 0], pres[:, 1]
    cos_p = np.cos(plat)
    step = max(1, int(4_000_000 / max(len(pres), 1)))  # ~4M pares por bloco
    for i in range(0, len(cand), step):
        clat = cand[i:i + step, 0][:, None]
        clon = cand[i:i + step, 1][:, None]
        dlat = clat - plat[None, :]
        dlon = clon - plon[None, :]
        a = np.sin(dlat / 2) ** 2 + np.cos(clat) * cos_p[None, :] * np.sin(dlon / 2) ** 2
        d = 2 * _R_KM * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))
        out[i:i + step] = d.min(axis=1)
    return out


def outside_radius_mask(cand_latlon, pres_latlon, radius_km: float) -> np.ndarray:
    """Máscara booleana: candidatos a >= radius_km de TODA presença (aceitáveis)."""
    return haversine_min_km(cand_latlon, pres_latlon) >= radius_km


# --- Compatibilidade (interface antiga; agora sobre a versão vetorizada) ---------
def is_within_radius(lat, lon, sp1_points, radius_km) -> bool:
    """True se (lat,lon) está DENTRO do raio de alguma presença."""
    return bool(haversine_min_km([[lat, lon]], sp1_points)[0] < radius_km)


def check_radius(row, sp1_points, radius_km) -> bool:
    """True se o registro está FORA do raio de todas as presenças (aceitável)."""
    return not is_within_radius(row["decimalLatitude"], row["decimalLongitude"],
                                sp1_points, radius_km)
