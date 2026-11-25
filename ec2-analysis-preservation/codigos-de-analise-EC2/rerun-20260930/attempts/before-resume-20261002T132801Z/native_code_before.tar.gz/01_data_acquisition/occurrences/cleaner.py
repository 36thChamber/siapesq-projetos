# cleaner.py - Adaptador que REUTILIZA a limpeza já existente do projeto
#
# O projeto já tem um pipeline de limpeza maduro em `01_data_acquisition/cleaning/`
# (filtros de coordenada, data, duplicata, terra x oceano, instituições, etc.),
# que opera sobre um DataFrame com colunas Darwin Core — exatamente o formato do
# nosso modelo único. Em vez de reimplementar, apenas o ADAPTAMOS aqui.
#
# O import é robusto: funciona quando o processo roda de dentro de
# `01_data_acquisition/` (convenção do projeto) e também quando roda de outro
# diretório, inserindo o caminho do pacote em `sys.path` como fallback. Se mesmo
# assim `cleaning/` não for encontrado, a limpeza é PULADA com aviso (o pipeline
# nunca quebra por causa de uma etapa opcional).

from __future__ import annotations

import os
import sys
from typing import Optional

import pandas as pd

from .logs import get_logger

_logger = get_logger("occurrences.cleaner")


def _load_cleaning():
    """
    Importa `clean_occurrences` e `CleaningConfig` do pacote `cleaning/`.

    Retorna a tupla (clean_occurrences, CleaningConfig) ou (None, None) se
    indisponível.
    """
    try:
        from cleaning.occurrence_cleaner import clean_occurrences
        from cleaning.config import CleaningConfig
        return clean_occurrences, CleaningConfig
    except Exception:  # noqa: BLE001 - tenta fallback por sys.path
        pass

    # Fallback: adiciona o diretório-pai do pacote `occurrences` (que contém
    # `cleaning/`) ao sys.path e tenta de novo.
    parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent not in sys.path:
        sys.path.insert(0, parent)
    try:
        from cleaning.occurrence_cleaner import clean_occurrences
        from cleaning.config import CleaningConfig
        return clean_occurrences, CleaningConfig
    except Exception as exc:  # noqa: BLE001
        _logger.warning("pacote 'cleaning/' indisponível — limpeza pulada: %s", exc)
        return None, None


def clean(
    df: pd.DataFrame,
    cleaning_params: Optional[dict],
    enabled: bool = True,
) -> tuple[pd.DataFrame, Optional[dict]]:
    """
    Aplica a limpeza reutilizando `cleaning/occurrence_cleaner`.

    Parâmetros:
        df: DataFrame no modelo único.
        cleaning_params: dicionário repassado a `CleaningConfig` (as chaves
            correspondem aos campos daquela dataclass).
        enabled: se False, devolve o df intacto e relatório None.

    Retorna (df_limpo, relatório_dict | None).
    """
    if not enabled or df.empty:
        return df, None

    clean_occurrences, CleaningConfig = _load_cleaning()
    if clean_occurrences is None:
        return df, {"skipped": "pacote cleaning indisponível"}

    config = CleaningConfig.from_dict(cleaning_params or {})
    clean_df, report = clean_occurrences(df, config)
    _logger.info("limpeza: %d -> %d registros", len(df), len(clean_df))
    return clean_df, report.to_dict()
