# provider.py - Provider VertNet
#
# VertNet agrega coleções de museus de VERTEBRADOS (peixes, anfíbios, répteis,
# aves e mamíferos) publicadas em Darwin Core — relevante para SDM de fauna
# continental. Usa a API REST oficial (sem credenciais):
#
#   GET http://api.vertnet.org/api/search?q={"q":"<consulta>","l":<page>}
#
# Peculiaridades tratadas aqui:
#   - O parâmetro `q` é, ele próprio, um JSON (string) com a "search query" no
#     campo `q` e o tamanho de página no campo `l`. A paginação é por CURSOR: a
#     resposta traz `cursor` e `last_cursor`; reenvia-se o `cursor` no campo `c`.
#   - Os campos vêm em Darwin Core, porém com nomes em MINÚSCULAS
#     (`decimallatitude`, `scientificname`, ...); renomeamos para o modelo único.
#   - A linguagem de busca aceita termos DwC com comparadores (`year>=1980`), mas
#     o filtro por caixa geográfica é aplicado no cliente (mais robusto).
#   - VertNet não tem backbone taxonômico próprio: a busca é textual pelo nome
#     (rótulo de espécie = nome pesquisado, mesma convenção do SiBBr).

from __future__ import annotations

import json
import os
from typing import Optional

import pandas as pd

from ...base import BaseProvider, ProviderMetadata, TaxonMatch
from ...logs import ProviderStats
from ...models import standardize_frame

# Endpoint oficial; sobrescrevível por env (ex.: espelho appspot) caso
# api.vertnet.org esteja indisponível/bloqueado.
_VERTNET_SEARCH = os.getenv(
    "VERTNET_API_URL", "https://api.vertnet.org/api/search"
)
_VERTNET_MAX_PAGE = 1000          # teto de `l` aceito pela API
_VERTNET_MAX_RECORDS = 200_000    # trava de segurança de paginação

# Campos nativos (DwC minúsculo) -> modelo único.
_RENAME = {
    "scientificname": "scientificName",
    "decimallatitude": "decimalLatitude",
    "decimallongitude": "decimalLongitude",
    "coordinateuncertaintyinmeters": "coordinateUncertaintyInMeters",
    "eventdate": "eventDate",
    "basisofrecord": "basisOfRecord",
    "institutioncode": "institutionCode",
    "collectioncode": "collectionCode",
    "catalognumber": "catalogNumber",
    "occurrenceid": "occurrenceID",
    "recordedby": "recordedBy",
    "identifiedby": "identifiedBy",
    "stateprovince": "stateProvince",
    "specificepithet": "specificEpithet",
    "individualcount": "individualCount",
    "datasetname": "datasetName",
}


class VertNetProvider(BaseProvider):
    """Provider do VertNet via API REST oficial (sem credenciais)."""

    metadata_spec = ProviderMetadata(
        name="vertnet",
        title="VertNet",
        homepage="http://vertnet.org",
        api="REST oficial (api.vertnet.org/api/search) — paginação por cursor",
        official_api=True,
        requires_auth=False,
        priority="high",
        implemented=True,
        license_note="Licenças variam por coleção; ver coluna 'license'/'rights'.",
        taxonomic_source="Darwin Core dos provedores (sem backbone próprio).",
    )

    # ------------------------------------------------------------------
    def search_species(self, species_name: str) -> TaxonMatch:
        # Busca textual: confia-se no nome informado (rótulo de espécie).
        return TaxonMatch(
            provider=self.name,
            query_name=species_name,
            matched=True,
            accepted_name=species_name,
            scientific_name=species_name,
            taxonomic_source=self.metadata_spec.taxonomic_source,
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
        page = min(self.config.batch_size, _VERTNET_MAX_PAGE)

        # Search query: nome exato + exige coordenadas mapeáveis + janela de ano.
        query = (
            f'"{species_name}" mappable:1 '
            f'year>={year_range[0]} year<={year_range[1]}'
        )

        rows: list[dict] = []
        cursor: Optional[str] = None
        while len(rows) < _VERTNET_MAX_RECORDS:
            q_obj = {"q": query, "l": page}
            if cursor:
                q_obj["c"] = cursor
            resp = self.http.get_json(
                _VERTNET_SEARCH, params={"q": json.dumps(q_obj)}, stats=stats
            )
            stats.pages += 1
            recs = resp.get("recs", []) or []
            if not recs:
                break
            rows.extend(recs)

            cursor = resp.get("cursor")
            if resp.get("last_cursor") or not cursor:
                break
            if limit is not None and len(rows) >= limit:
                rows = rows[:limit]
                break

        self.logger.info("VertNet: %d registros brutos recebidos", len(rows))
        df = pd.DataFrame(rows)
        return self._filter_bbox(df, lon_range, lat_range, limit)

    @staticmethod
    def _filter_bbox(
        df: pd.DataFrame,
        lon_range: tuple[float, float],
        lat_range: tuple[float, float],
        limit: Optional[int],
    ) -> pd.DataFrame:
        """Filtra a caixa geográfica no cliente (robusto) e aplica o limite."""
        if df.empty or "decimallatitude" not in df.columns:
            return df
        lat = pd.to_numeric(df["decimallatitude"], errors="coerce")
        lon = pd.to_numeric(df["decimallongitude"], errors="coerce")
        world = (lon_range[0] <= -180 and lon_range[1] >= 180
                 and lat_range[0] <= -90 and lat_range[1] >= 90)
        if not world:
            keep = (lat.between(lat_range[0], lat_range[1])
                    & lon.between(lon_range[0], lon_range[1]))
            df = df[keep]
        if limit is not None and len(df) > limit:
            df = df.iloc[:limit]
        return df.reset_index(drop=True)

    # ------------------------------------------------------------------
    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        if raw.empty:
            return standardize_frame(raw)

        df = raw.rename(columns={k: v for k, v in _RENAME.items() if k in raw.columns})

        # Rótulo de espécie = nome pesquisado (VertNet não tem backbone próprio).
        df["accepted_species"] = taxon.scientific_name

        # occurrenceID: usa o nativo ou constrói a partir de institution/catalog.
        if "occurrenceID" not in df.columns or df["occurrenceID"].isna().all():
            inst = df.get("institutionCode")
            cat = df.get("catalogNumber")
            if inst is not None and cat is not None:
                df["occurrenceID"] = (
                    "VertNet:" + inst.astype(str) + ":" + cat.astype(str)
                )

        if "datasetName" in df.columns:
            df["original_provider"] = df["datasetName"]

        return standardize_frame(df, provider=self.name, source=self.metadata_spec.title)
