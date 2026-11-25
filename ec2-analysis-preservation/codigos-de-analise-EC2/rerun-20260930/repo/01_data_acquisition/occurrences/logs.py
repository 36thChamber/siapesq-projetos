# logs.py - Logging estruturado e estatísticas por provider
#
# Cada provider registra: tempo de execução, quantidade baixada, quantidade
# descartada, erros, tentativas e tempo médio por página. `ProviderStats`
# acumula essas métricas; `RunReport` agrega a execução inteira. Tudo é
# serializável para JSON (rastreabilidade).

from __future__ import annotations

import logging
import sys
from dataclasses import dataclass, field, asdict
from typing import Optional


def get_logger(name: str = "occurrences", level: int = logging.INFO) -> logging.Logger:
    """
    Retorna um logger com formato estruturado e uma única saída em stderr.

    Idempotente: chamar várias vezes não duplica handlers.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
        logger.addHandler(handler)
        logger.setLevel(level)
        logger.propagate = False
    return logger


@dataclass
class ProviderStats:
    """Métricas de execução de um provider."""

    provider: str
    downloaded: int = 0          # registros brutos recebidos da fonte
    kept: int = 0                # registros após validação do provider
    discarded: int = 0           # descartados pelo provider (downloaded - kept)
    pages: int = 0               # páginas/lotes consumidos
    attempts: int = 0            # tentativas HTTP totais (inclui retries)
    duration_s: float = 0.0      # tempo total do provider
    avg_page_time_s: float = 0.0 # tempo médio por página
    cache_hit: bool = False      # se o resultado veio do cache
    success: bool = True         # False se o provider falhou por completo
    errors: list[str] = field(default_factory=list)

    def finalize(self) -> "ProviderStats":
        """Deriva campos calculados (descartados e tempo médio por página)."""
        self.discarded = max(self.downloaded - self.kept, 0)
        if self.pages > 0:
            self.avg_page_time_s = round(self.duration_s / self.pages, 4)
        return self

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class RunReport:
    """Relatório agregado de uma execução multi-fonte."""

    species: str
    providers: list[ProviderStats] = field(default_factory=list)
    total_downloaded: int = 0
    total_after_merge: int = 0
    total_after_dedup: int = 0
    total_after_clean: int = 0
    dedup_report: Optional[dict] = None
    cleaning_report: Optional[dict] = None
    output_csv: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "species": self.species,
            "providers": [p.to_dict() for p in self.providers],
            "total_downloaded": self.total_downloaded,
            "total_after_merge": self.total_after_merge,
            "total_after_dedup": self.total_after_dedup,
            "total_after_clean": self.total_after_clean,
            "dedup_report": self.dedup_report,
            "cleaning_report": self.cleaning_report,
            "output_csv": self.output_csv,
        }
