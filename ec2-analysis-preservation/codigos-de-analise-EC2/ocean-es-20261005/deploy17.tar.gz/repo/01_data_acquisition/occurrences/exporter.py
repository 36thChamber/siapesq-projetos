# exporter.py - Exportação do resultado unificado
#
# Grava o produto final da aquisição multi-fonte:
#   - <Especie>_occurrences.csv        : tabela unificada (modelo único)
#   - raw/<provider>_raw.csv           : bruto por provider (rastreabilidade)
#   - <Especie>_occurrences_report.json: relatório da execução (stats + dedup + limpeza)
#
# COMPATIBILIDADE: o CSV unificado contém as colunas exigidas a jusante
# (`decimalLatitude, decimalLongitude, year, month, day, species`), então pode
# ser passado diretamente para `02_pseudoabsence/gen_pseudo_occurences.py`.

from __future__ import annotations

import json
import os
import re
from typing import Optional

import pandas as pd

from .logs import RunReport, get_logger
from .models import DOWNSTREAM_REQUIRED_COLUMNS

_logger = get_logger("occurrences.exporter")

# Caracteres proibidos em nome de arquivo no Windows (plataforma do usuário) + controle.
_WIN_FORBIDDEN = re.compile(r'[\\/:*?"<>|\x00-\x1f]')


def _safe_name(species: str) -> str:
    """Nome de arquivo seguro (Windows-safe) a partir do nome da espécie."""
    s = _WIN_FORBIDDEN.sub("-", species.strip().replace(" ", "_"))
    return s.strip(". ") or "especie"  # Windows não aceita terminar em '.'/espaço


def _atomic_to_csv(df: pd.DataFrame, path: str) -> None:
    """Grava CSV de forma ATÔMICA (tmp + os.replace): interromper não deixa
    arquivo truncado que a etapa 02 leria como válido."""
    tmp = f"{path}.tmp"
    df.to_csv(tmp, index=False)
    os.replace(tmp, path)


def _atomic_write_text(text: str, path: str) -> None:
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def export(
    df: pd.DataFrame,
    species: str,
    output_dir: str,
    report: Optional[RunReport] = None,
    raw_by_provider: Optional[dict[str, pd.DataFrame]] = None,
) -> str:
    """
    Grava o CSV unificado, os brutos por provider e o relatório JSON.

    Retorna o caminho do CSV unificado (o arquivo consumido a jusante).
    """
    os.makedirs(output_dir, exist_ok=True)

    # Nome na convenção do projeto: Occurrence_<Genero_especie>_<DD_MM_AA>.csv
    # A regra mora em `naming.py` (raiz) — nenhuma etapa inventa nome por conta própria.
    import sys
    from pathlib import Path as _Path
    _raiz = str(_Path(__file__).resolve().parents[2])
    if _raiz not in sys.path:
        sys.path.insert(0, _raiz)
    import naming as _nm

    # Garante que a coluna `species` nunca fique vazia (contrato a jusante).
    if "species" in df.columns:
        df = df.copy()
        df["species"] = df["species"].where(df["species"].notna(), species)

    csv_path = os.path.join(output_dir, _nm.nome("occurrence", species, output_dir, "csv"))
    _atomic_to_csv(df, csv_path)
    _logger.info("CSV unificado: %s | %d registros", csv_path, len(df))

    # Aviso defensivo se alguma coluna a jusante faltar (não deveria ocorrer).
    missing = [c for c in DOWNSTREAM_REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        _logger.warning("colunas exigidas a jusante ausentes: %s", missing)

    # Brutos por provider (rastreabilidade).
    if raw_by_provider:
        raw_dir = os.path.join(output_dir, "raw")
        os.makedirs(raw_dir, exist_ok=True)
        for provider, raw_df in raw_by_provider.items():
            if raw_df is None or raw_df.empty:
                continue
            _atomic_to_csv(raw_df, os.path.join(raw_dir, f"{_safe_name(provider)}_raw.csv"))

    # Relatório da execução.
    if report is not None:
        report.output_csv = csv_path
        report_path = os.path.join(
            output_dir, _nm.nome("occurrence_report", species, output_dir, "json"))
        _atomic_write_text(
            json.dumps(report.to_dict(), indent=2, ensure_ascii=False), report_path)
        _logger.info("relatório: %s", report_path)

    return csv_path
