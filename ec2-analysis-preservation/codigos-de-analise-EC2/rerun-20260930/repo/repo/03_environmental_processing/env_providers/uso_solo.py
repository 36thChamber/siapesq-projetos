#!/usr/bin/env python3
# uso_solo.py — Componentes REUTILIZÁVEIS de Uso e Ocupação do Solo (etapa 03).
#
# Reúne, num único módulo (fácil de evoluir), a lógica compartilhada entre o provider
# WorldCover e o orquestrador:
#   - fronteira do Brasil (polígono oficial) + teste vetorizado "dentro do Brasil";
#   - REGRA DETERMINÍSTICA (sem IA) de recomendação da fonte principal;
#   - cálculo das métricas e montagem do relatório por espécie.

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np

from .base import ROOT

_BOUNDARY = ROOT / "03_environmental_processing" / "brasil_boundary.json"


@lru_cache(maxsize=1)
def carregar_fronteira_brasil():
    """Geometria (shapely) da fronteira do Brasil, carregada uma única vez (cache)."""
    from shapely.geometry import shape
    with open(_BOUNDARY, "r", encoding="utf-8") as fh:
        gj = json.load(fh)
    return shape(gj["geometry"] if "geometry" in gj else gj)


def pontos_no_brasil(lats, lons) -> np.ndarray:
    """
    Máscara booleana "ponto dentro do Brasil" (fronteira oficial), VETORIZADA
    (`shapely.contains_xy` — rápido p/ milhões de pontos). Coord inválida → False.
    """
    import shapely
    lats = np.asarray(lats, dtype=float)
    lons = np.asarray(lons, dtype=float)
    ok = np.isfinite(lats) & np.isfinite(lons)
    out = np.zeros(len(lats), dtype=bool)
    if ok.any():
        geom = carregar_fronteira_brasil()
        out[ok] = shapely.contains_xy(geom, lons[ok], lats[ok])
    return out


# ---------------------------------------------------------------------------
# REGRA DETERMINÍSTICA de recomendação da fonte principal (SEM IA).
# Encapsulada para facilitar futuras alterações — altere SÓ aqui.
# ---------------------------------------------------------------------------
def recomendar_fonte_uso_solo(total_registros: int, pct_fora_brasil: float) -> str:
    """
    SE total_registros >= 1000            -> "MapBiomas"
    SENÃO SE pct_fora_brasil > 30         -> "WorldCover"
    SENÃO                                 -> "MapBiomas"
    """
    if total_registros >= 1000:
        return "MapBiomas"
    if pct_fora_brasil > 30:
        return "WorldCover"
    return "MapBiomas"


def calcular_metricas(df, col_mapbiomas: str = "ocup_solo_mapbiomas",
                      col_worldcover: str = "ocup_solo_worldcover") -> dict:
    """Métricas determinísticas do uso do solo p/ o relatório e a regra."""
    total = int(len(df))
    dentro = pontos_no_brasil(df["decimalLatitude"].to_numpy(),
                              df["decimalLongitude"].to_numpy())
    n_brasil = int(dentro.sum())
    n_fora = total - n_brasil
    pct_brasil = (100.0 * n_brasil / total) if total else 0.0
    pct_fora = (100.0 * n_fora / total) if total else 0.0
    validos_mb = int(df[col_mapbiomas].notna().sum()) if col_mapbiomas in df else 0
    validos_wc = int(df[col_worldcover].notna().sum()) if col_worldcover in df else 0
    recomendada = recomendar_fonte_uso_solo(total, pct_fora)
    return {
        "total_registros": total,
        "registros_brasil": n_brasil,
        "registros_fora_brasil": n_fora,
        "percentual_brasil": round(pct_brasil, 2),
        "percentual_fora_brasil": round(pct_fora, 2),
        "validos_mapbiomas": validos_mb,
        "validos_worldcover": validos_wc,
        "recommended_land_use_source": recomendada,
    }


def montar_relatorio(especie: str, m: dict) -> str:
    """Relatório textual padronizado (mesma linguagem do QA do orquestrador)."""
    regra = ("total_registros >= 1000 -> MapBiomas | senão (fora_brasil > 30% -> "
             "WorldCover | senão -> MapBiomas)")
    linhas = [
        "==== RELATÓRIO — USO E OCUPAÇÃO DO SOLO ====",
        f"Espécie: {especie}",
        "",
        "-- Estatísticas --",
        f"  Total de registros processados....... {m['total_registros']}",
        f"  Registros no Brasil.................. {m['registros_brasil']} ({m['percentual_brasil']}%)",
        f"  Registros fora do Brasil............. {m['registros_fora_brasil']} ({m['percentual_fora_brasil']}%)",
        f"  Valores válidos MapBiomas............ {m['validos_mapbiomas']}",
        f"  Valores válidos WorldCover........... {m['validos_worldcover']}",
        "",
        "-- Decisão (regra determinística, sem IA) --",
        f"  Regra aplicada: {regra}",
        f"  Métricas usadas: total={m['total_registros']}, "
        f"fora_brasil={m['percentual_fora_brasil']}%",
        f"  recommended_land_use_source = \"{m['recommended_land_use_source']}\"",
        "",
    ]
    return "\n".join(linhas)
