# base.py - Interface comum de Provider
#
# Todo conector de fonte (GBIF, OBIS, ...) herda de `BaseProvider` e implementa
# a MESMA interface, devolvendo SEMPRE o mesmo formato (o modelo único de
# `models.py`). Isso é o que permite o `manager` tratar todas as fontes de forma
# idêntica.
#
# Métodos que cada provider implementa:
#   search_species(species)      -> TaxonMatch (resolve o táxon na base)
#   download_occurrences(...)     -> DataFrame BRUTO da fonte
#   normalize(raw)                -> DataFrame no modelo único
#   validate(df)                  -> DataFrame validado (padrão: remove sem lat/lon)
#   metadata()                    -> ProviderMetadata
#
# O método-template `fetch(...)` (NÃO sobrescrever normalmente) encadeia tudo,
# cuidando de cache, cronometragem e coleta de estatísticas.

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import requests

# Exceções tratadas como FALHA DE REDE (transitória/esperada) — isoladas sem alarde.
# Qualquer OUTRA exceção é tratada como BUG/DADOS (logada com traceback, ver fetch()).
_NETWORK_ERRORS = (requests.RequestException, ConnectionError, TimeoutError, OSError)
from typing import Optional

import pandas as pd

from .cache import CacheManager
from .config import OccurrencesConfig
from .http import HttpClient
from .logs import ProviderStats, get_logger
from .models import (
    DOWNSTREAM_REQUIRED_COLUMNS,
    standardize_frame,
    today_iso,
)


@dataclass
class ProviderMetadata:
    """Ficha descritiva de um provider (para logs, docs e o comando `list`)."""

    name: str
    title: str
    homepage: str
    api: str                 # descrição curta do endpoint/protocolo usado
    official_api: bool       # usa API oficial (True) ou não há API (False)
    requires_auth: bool      # exige chave/credencial
    priority: str            # "high" | "medium" | "low"
    implemented: bool        # já possui downloader funcional
    license_note: str = ""
    taxonomic_source: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name, "title": self.title, "homepage": self.homepage,
            "api": self.api, "official_api": self.official_api,
            "requires_auth": self.requires_auth, "priority": self.priority,
            "implemented": self.implemented, "license_note": self.license_note,
            "taxonomic_source": self.taxonomic_source,
        }


@dataclass
class TaxonMatch:
    """
    Resultado da resolução taxonômica em uma base.

    Guarda o nome informado, o nome aceito, o sinônimo efetivamente usado e a
    fonte taxonômica — atendendo à padronização taxonômica pedida.
    """

    provider: str
    query_name: str
    matched: bool = False
    accepted_name: Optional[str] = None
    scientific_name: Optional[str] = None
    taxon_id: Optional[str] = None
    rank: Optional[str] = None
    synonym_used: Optional[str] = None
    confidence: Optional[float] = None
    taxonomic_source: str = ""
    raw: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "provider": self.provider, "query_name": self.query_name,
            "matched": self.matched, "accepted_name": self.accepted_name,
            "scientific_name": self.scientific_name, "taxon_id": self.taxon_id,
            "rank": self.rank, "synonym_used": self.synonym_used,
            "confidence": self.confidence, "taxonomic_source": self.taxonomic_source,
        }


class BaseProvider(ABC):
    """
    Classe base de todos os providers.

    Subclasses definem o atributo de classe `metadata_spec` (ProviderMetadata) e
    implementam `search_species`, `download_occurrences` e `normalize`.
    """

    metadata_spec: ProviderMetadata

    def __init__(
        self,
        config: OccurrencesConfig,
        http: Optional[HttpClient] = None,
        cache: Optional[CacheManager] = None,
    ) -> None:
        self.config = config
        self.http = http or HttpClient(timeout=config.timeout, retries=config.retries)
        self.cache = cache or CacheManager(config.cache_dir, enabled=config.use_cache)
        self.logger = get_logger(f"occurrences.{self.name}")

    # ------------------------------------------------------------------
    # Identidade
    # ------------------------------------------------------------------
    @property
    def name(self) -> str:
        return self.metadata_spec.name

    def metadata(self) -> ProviderMetadata:
        return self.metadata_spec

    # ------------------------------------------------------------------
    # Interface a implementar
    # ------------------------------------------------------------------
    @abstractmethod
    def search_species(self, species: str) -> TaxonMatch:
        """Resolve o táxon na base e devolve o `TaxonMatch`."""

    @abstractmethod
    def download_occurrences(
        self,
        species: str,
        taxon: TaxonMatch,
        lon_range: tuple[float, float],
        lat_range: tuple[float, float],
        year_range: tuple[int, int],
        limit: Optional[int],
        stats: ProviderStats,
    ) -> pd.DataFrame:
        """Baixa os registros BRUTOS da fonte (colunas nativas)."""

    @abstractmethod
    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        """Converte o bruto para o modelo único (`standardize_frame`)."""

    # ------------------------------------------------------------------
    # Implementações padrão (sobrescrevíveis)
    # ------------------------------------------------------------------
    def validate(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Validação mínima do provider: remove linhas sem coordenadas.

        A limpeza pesada é feita depois, uma vez, no `cleaner` compartilhado.
        """
        if df.empty:
            return df
        mask = df["decimalLatitude"].notna() & df["decimalLongitude"].notna()
        return df[mask].reset_index(drop=True)

    # ------------------------------------------------------------------
    # Template: orquestra a coleta de um provider
    # ------------------------------------------------------------------
    def fetch(
        self,
        species: str,
        lon_range: tuple[float, float],
        lat_range: tuple[float, float],
        year_range: tuple[int, int],
    ) -> tuple[pd.DataFrame, ProviderStats]:
        """
        Coleta completa deste provider: cache → search → download → normalize →
        validate. Nunca levanta exceção: falhas viram `success=False` no stats,
        para que os outros providers continuem.
        """
        stats = ProviderStats(provider=self.name)
        started = time.perf_counter()
        limit = self.config.limit_per_provider

        cache_params = {
            "lon_range": list(lon_range),
            "lat_range": list(lat_range),
            "year_range": list(year_range),
            "limit": limit,
        }

        try:
            # 1) Cache
            cached = self.cache.get(self.name, species, cache_params)
            if cached is not None:
                stats.cache_hit = True
                stats.downloaded = len(cached)
                df = standardize_frame(cached, provider=self.name)
                df = self.validate(df)
                stats.kept = len(df)
                self.logger.info("cache: %d registros reutilizados", len(df))
                return df, stats.finalize()

            # 2) Resolução taxonômica
            taxon = self.search_species(species)
            if not taxon.matched:
                self.logger.warning("táxon não encontrado para '%s'", species)
                stats.errors.append(f"táxon não encontrado: {species}")
                return _empty_standard(self.name), stats.finalize()

            # 3) Download bruto
            raw = self.download_occurrences(
                species, taxon, lon_range, lat_range, year_range, limit, stats
            )
            stats.downloaded = len(raw)

            # 4) Normalização + carimbo de proveniência
            df = self.normalize(raw, taxon)
            df = standardize_frame(
                df, provider=self.name, source=self.metadata_spec.title,
                original_provider=self.name, download_date=today_iso(),
            )

            # 5) Validação e cache do resultado
            df = self.validate(df)
            stats.kept = len(df)
            self.cache.put(self.name, species, cache_params, df)
            self.logger.info(
                "ok: %d baixados, %d mantidos", stats.downloaded, stats.kept
            )
            return df, stats.finalize()

        except _NETWORK_ERRORS as exc:
            # Falha de REDE (transitória/esperada): isola o provider e segue.
            stats.success = False
            stats.errors.append(f"REDE: {type(exc).__name__}: {exc}")
            self.logger.error("provider '%s' — falha de REDE: %s", self.name, exc)
            return _empty_standard(self.name), stats.finalize()
        except Exception as exc:  # noqa: BLE001 - isolamento: não derruba os outros
            # ERRO DE CÓDIGO/DADOS (bug de normalize/schema, etc.): NÃO pode passar
            # como "0 registros" silencioso — isso vira "espécie ausente" e corrompe
            # os modelos. Loga o TRACEBACK completo e marca distintamente no relatório.
            stats.success = False
            stats.errors.append(f"BUG/DADOS (VERIFICAR): {type(exc).__name__}: {exc}")
            self.logger.error("provider '%s' — ERRO DE CÓDIGO/DADOS (verificar!): %s",
                              self.name, exc, exc_info=True)
            return _empty_standard(self.name), stats.finalize()
        finally:
            stats.duration_s = round(time.perf_counter() - started, 4)


def _empty_standard(provider: str) -> pd.DataFrame:
    """DataFrame vazio no modelo único (para falhas/sem resultado)."""
    df = standardize_frame(pd.DataFrame(columns=list(DOWNSTREAM_REQUIRED_COLUMNS)))
    return df.iloc[0:0]
