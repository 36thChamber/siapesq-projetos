# provider.py - Provider GBIF
#
# Conecta-se ao GBIF (maior agregador de biodiversidade do mundo) reutilizando o
# que já existe no projeto e evitando duplicação:
#
#   - Resolução taxonômica: reaproveita `_normalize_backbone_result` e
#     `_validate_backbone_match` de `downloaders/gbif.py` (lógica já testada que
#     lida com os formatos ANTIGO e NOVO do backbone do pygbif). Se o módulo não
#     puder ser importado (ex.: sem `.env`), há um fallback local equivalente.
#
#   - Download: usa a API de BUSCA do GBIF (`pygbif.occurrences.search`), que é
#     SÍNCRONA e NÃO exige credenciais — ideal para rodar em paralelo com as
#     outras fontes. (O download em massa via DWCA, que exige login e espera de
#     minutos, continua disponível em `downloaders/gbif.py` para quem precisar do
#     Darwin Core verbatim completo.)
#
# A API de busca limita o deslocamento (offset) a 100.000 registros; para uma
# espécie numa região isso é mais que suficiente para SDM.

from __future__ import annotations

import random
import time
import gzip
import hashlib
import json
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import pandas as pd
from pygbif import occurrences, species

from ...base import BaseProvider, ProviderMetadata, TaxonMatch
from ...logs import ProviderStats, get_logger
from ...models import standardize_frame

_logger = get_logger("occurrences.gbif")


def _pygbif_retry(fn, *args, _tries: int = 4, _backoff: float = 1.5, **kwargs):
    """
    Envolve chamadas do pygbif (fora do HttpClient) com RETRY + backoff. Um único
    5xx/timeout do GBIF — a fonte principal — não pode derrubar todo o pull.
    Levanta a última exceção se esgotar (isolada pelo `fetch` do BaseProvider).
    """
    last = None
    for attempt in range(1, _tries + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001 - rede/HTTP do pygbif
            last = exc
            _logger.warning("GBIF %s falhou (tentativa %d/%d): %s",
                            getattr(fn, "__name__", fn), attempt, _tries, exc)
            if attempt < _tries:
                time.sleep(_backoff ** attempt + random.uniform(0.0, 0.5))
    raise last

# Limite duro de offset da API de busca do GBIF.
_GBIF_MAX_OFFSET = 100_000
# Tamanho máximo de página aceito pela API.
_GBIF_MAX_PAGE = 300


def _normalize_backbone(result: dict) -> dict:
    """
    Normaliza o retorno do `name_backbone` reutilizando a função do módulo
    existente; se indisponível, usa um fallback local equivalente.
    """
    try:
        from downloaders.gbif import _normalize_backbone_result
        return _normalize_backbone_result(result)
    except Exception:  # noqa: BLE001 - fallback quando o módulo não importa
        if not isinstance(result, dict):
            return {}
        if "usageKey" in result or "matchType" in result:
            return result
        usage = result.get("usage") or {}
        diag = result.get("diagnostics") or {}
        return {
            "usageKey": usage.get("usageKey") or usage.get("key") or usage.get("nubKey"),
            "scientificName": usage.get("scientificName") or usage.get("name"),
            "canonicalName": usage.get("canonicalName") or usage.get("name"),
            "rank": usage.get("rank"),
            "matchType": diag.get("matchType"),
            "confidence": diag.get("confidence"),
        }


def _classification_map(result: dict) -> dict:
    """Extrai reino/filo/classe/ordem/família/gênero da lista `classification`."""
    out: dict[str, str] = {}
    for node in result.get("classification", []) or []:
        rank = (node.get("rank") or "").upper()
        name = node.get("name")
        if rank == "KINGDOM":
            out["kingdom"] = name
        elif rank == "PHYLUM":
            out["phylum"] = name
        elif rank == "CLASS":
            out["class"] = name
        elif rank == "ORDER":
            out["order"] = name
        elif rank == "FAMILY":
            out["family"] = name
        elif rank == "GENUS":
            out["genus"] = name
    return out


class GBIFProvider(BaseProvider):
    """Provider da fonte GBIF via API de busca (sem credenciais)."""

    metadata_spec = ProviderMetadata(
        name="gbif",
        title="GBIF",
        homepage="https://www.gbif.org",
        api="REST oficial (pygbif occurrences.search)",
        official_api=True,
        requires_auth=False,   # a busca não exige login (o DWCA em massa exige)
        priority="high",
        implemented=True,
        license_note="Licenças por registro (CC0/CC-BY/CC-BY-NC); ver coluna 'license'.",
        taxonomic_source="GBIF Backbone Taxonomy",
    )

    # ------------------------------------------------------------------
    def search_species(self, species_name: str) -> TaxonMatch:
        raw = _pygbif_retry(species.name_backbone, scientificName=species_name,
                           timeout=self.config.timeout)
        norm = _normalize_backbone(raw)
        usage_key = norm.get("usageKey")
        matched = usage_key is not None
        return TaxonMatch(
            provider=self.name,
            query_name=species_name,
            matched=matched,
            accepted_name=norm.get("canonicalName") or norm.get("scientificName"),
            scientific_name=norm.get("scientificName"),
            taxon_id=str(usage_key) if matched else None,
            rank=norm.get("rank"),
            confidence=norm.get("confidence"),
            taxonomic_source=self.metadata_spec.taxonomic_source,
            raw={"classification": raw.get("classification", [])},
        )

    # ------------------------------------------------------------------
    def download_occurrences(
        self,
        species_name: str,
        taxon: TaxonMatch,
        lon_range: tuple[float, float],
        lat_range: tuple[float, float],
        year_range: tuple[int, int],
        limit: Optional[int],
        stats: ProviderStats,
    ) -> pd.DataFrame:
        page = min(self.config.batch_size, _GBIF_MAX_PAGE)
        results: list[dict] = []
        offset = 0
        cache_identity = {'taxon': taxon.taxon_id, 'lon': lon_range,
                          'lat': lat_range, 'year': year_range, 'page': page,
                          'date': self.cache.date_stamp}
        identity = hashlib.sha256(json.dumps(cache_identity, sort_keys=True).encode()).hexdigest()
        page_dir = Path(self.cache.cache_dir) / 'gbif_pages' / identity

        def get_page(offset):
            # Keep each complete response so maintenance need not download it again.
            path = page_dir / f'{offset}.json.gz'
            if self.cache.enabled and path.exists():
                try:
                    with gzip.open(path, 'rt') as source:
                        cached = json.load(source)
                    if cached.get('offset') == offset and isinstance(cached.get('results'), list):
                        return cached
                except (OSError, ValueError, TypeError):
                    self.logger.warning('GBIF: cache de página inválido em offset %d', offset)
            response = _pygbif_retry(
                occurrences.search,
                taxonKey=int(taxon.taxon_id), hasCoordinate=True,
                decimalLatitude=f"{lat_range[0]},{lat_range[1]}",
                decimalLongitude=f"{lon_range[0]},{lon_range[1]}",
                year=f"{year_range[0]},{year_range[1]}",
                limit=min(page, _GBIF_MAX_OFFSET - offset), offset=offset,
                timeout=self.config.timeout,
            )
            if self.cache.enabled:
                page_dir.mkdir(parents=True, exist_ok=True)
                tmp = path.with_suffix('.tmp')
                with gzip.open(tmp, 'wt') as target:
                    json.dump(response, target)
                os.replace(tmp, path)
            return response

        first = get_page(0)
        # The API supplies count: schedule bounded concurrent requests, retaining
        # offset order and the same records/100000-record ceiling as the search.
        count = first.get('count')
        if isinstance(count, int):
            ceiling = min(count, _GBIF_MAX_OFFSET)
            if limit is not None:
                ceiling = min(ceiling, limit)
            offsets = list(range(page, ceiling, page))
            results.extend(first.get('results', []) or [])
            stats.attempts += 1 + len(offsets)
            stats.pages += 1
            workers = max(1, min(self.config.parallelism, 8))
            with ThreadPoolExecutor(max_workers=workers) as pool:
                for current, response in zip(offsets, pool.map(get_page, offsets)):
                    stats.pages += 1
                    results.extend(response.get('results', []) or [])
                    if stats.pages % 10 == 0:
                        self.logger.info('GBIF: %d registros, offset %d/%d',
                                         len(results), current, ceiling)
            results = results[:ceiling]
            self.logger.info('GBIF: %d registros brutos recebidos', len(results))
            return pd.DataFrame(results)

        while offset < _GBIF_MAX_OFFSET:
            stats.attempts += 1
            resp = first if offset == 0 else get_page(offset)
            stats.pages += 1
            batch = resp.get("results", []) or []
            if not batch:
                break
            results.extend(batch)

            if limit is not None and len(results) >= limit:
                results = results[:limit]
                break
            if resp.get("endOfRecords", False):
                break
            offset += page

        self.logger.info("GBIF: %d registros brutos recebidos", len(results))
        return pd.DataFrame(results)

    # ------------------------------------------------------------------
    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        if raw.empty:
            return standardize_frame(raw)

        df = raw.copy()

        # A maioria dos campos do GBIF já usa nomes Darwin Core idênticos ao
        # modelo (scientificName, decimalLatitude, class, order, family, ...),
        # então só precisamos derivar/renomear alguns.
        if "taxonKey" in df.columns:
            df["taxonID"] = df["taxonKey"].astype("string")
        if "species" in df.columns:
            df["accepted_species"] = df["species"]
        # 'country' do GBIF já vem como nome do país; mantemos.
        # 'original_provider' mais informativo: o conjunto de dados publicador.
        if "datasetName" in df.columns:
            df["original_provider"] = df["datasetName"]

        # Backfill da taxonomia: o GBIF nem sempre traz reino/filo/classe por
        # registro. Preenche o que faltar com a linhagem aceita já resolvida em
        # `search_species`, deixando a saída completa e consistente entre fontes.
        lineage = _classification_map(taxon.raw)
        for rank, value in lineage.items():
            if value is None:
                continue
            if rank not in df.columns:
                df[rank] = value
            else:
                df[rank] = df[rank].fillna(value)

        return standardize_frame(df, provider=self.name, source=self.metadata_spec.title)
