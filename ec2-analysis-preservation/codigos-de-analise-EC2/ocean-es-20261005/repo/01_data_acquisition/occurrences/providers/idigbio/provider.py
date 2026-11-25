# provider.py - Provider iDigBio
#
# iDigBio (Integrated Digitized Biocollections) agrega dezenas de milhões de
# registros de coleções de história natural digitalizadas. Usa a API REST de
# busca oficial (sem credenciais):
#
#   GET https://search.idigbio.org/v2/search/records
#       ?rq=<JSON record-query>&limit=<n>&offset=<n>
#
# A "record query" (rq) aceita:
#   - `scientificname`: casamento textual (a API normaliza para minúsculas);
#   - `geopoint` com `type:"geo_bounding_box"` (top_left / bottom_right);
#   - `datecollected` com `type:"range"` (gte/lte em ISO).
#
# Cada item traz `data` (verbatim) e `indexTerms` (campos NORMALIZADOS pelo
# iDigBio). Usamos `indexTerms`, que já entrega `geopoint`, `datecollected`,
# `scientificname`, `basisofrecord`, taxonomia, etc. Paginação por `offset`.

from __future__ import annotations

import json
from typing import Optional

import pandas as pd

from ...base import BaseProvider, ProviderMetadata, TaxonMatch
from ...logs import ProviderStats
from ...models import standardize_frame

_IDIGBIO_SEARCH = "https://search.idigbio.org/v2/search/records"
_IDIGBIO_MAX_PAGE = 5_000       # teto de `limit` por página
_IDIGBIO_MAX_OFFSET = 100_000   # limite de deep-paging da API

# O iDigBio normaliza basisOfRecord SEM underscore e em minúsculas
# (ex.: "preservedspecimen"). Mapeamos para o enum UPPER_SNAKE do GBIF, para que
# o filtro de basisOfRecord da limpeza (que espera "PRESERVED_SPECIMEN") funcione.
_BASIS_MAP = {
    "preservedspecimen": "PRESERVED_SPECIMEN",
    "humanobservation": "HUMAN_OBSERVATION",
    "machineobservation": "MACHINE_OBSERVATION",
    "fossilspecimen": "FOSSIL_SPECIMEN",
    "livingspecimen": "LIVING_SPECIMEN",
    "materialsample": "MATERIAL_SAMPLE",
    "materialcitation": "MATERIAL_CITATION",
    "observation": "OBSERVATION",
    "occurrence": "OCCURRENCE",
}


class IDigBioProvider(BaseProvider):
    """Provider do iDigBio via API REST de busca (sem credenciais)."""

    metadata_spec = ProviderMetadata(
        name="idigbio",
        title="iDigBio",
        homepage="https://www.idigbio.org",
        api="REST oficial v2 (search.idigbio.org/v2/search/records) — offset",
        official_api=True,
        requires_auth=False,
        priority="high",
        implemented=True,
        license_note="Licenças variam por coleção; ver 'rights'/'license'.",
        taxonomic_source="Darwin Core dos provedores (índice do iDigBio).",
    )

    # ------------------------------------------------------------------
    def search_species(self, species_name: str) -> TaxonMatch:
        # Busca textual pelo nome (o índice do iDigBio casa por scientificname).
        return TaxonMatch(
            provider=self.name,
            query_name=species_name,
            matched=True,
            accepted_name=species_name,
            scientific_name=species_name,
            taxonomic_source=self.metadata_spec.taxonomic_source,
        )

    # ------------------------------------------------------------------
    def _build_rq(
        self,
        species_name: str,
        lon_range: tuple[float, float],
        lat_range: tuple[float, float],
        year_range: tuple[int, int],
    ) -> dict:
        """Monta a record-query (rq) do iDigBio."""
        rq: dict[str, object] = {"scientificname": species_name.lower()}

        world = (lon_range[0] <= -180 and lon_range[1] >= 180
                 and lat_range[0] <= -90 and lat_range[1] >= 90)
        if not world:
            rq["geopoint"] = {
                "type": "geo_bounding_box",
                "top_left": {"lat": lat_range[1], "lon": lon_range[0]},
                "bottom_right": {"lat": lat_range[0], "lon": lon_range[1]},
            }
        rq["datecollected"] = {
            "type": "range",
            "gte": f"{year_range[0]}-01-01",
            "lte": f"{year_range[1]}-12-31",
        }
        return rq

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
        page = min(self.config.batch_size, _IDIGBIO_MAX_PAGE)
        rq = self._build_rq(species_name, lon_range, lat_range, year_range)

        rows: list[dict] = []
        offset = 0
        while offset < _IDIGBIO_MAX_OFFSET:
            params = {"rq": json.dumps(rq), "limit": page, "offset": offset}
            resp = self.http.get_json(_IDIGBIO_SEARCH, params=params, stats=stats)
            stats.pages += 1
            items = resp.get("items", []) or []
            if not items:
                break
            for it in items:
                rows.append(self._flatten(it))

            if limit is not None and len(rows) >= limit:
                rows = rows[:limit]
                break
            if len(items) < page:
                break
            offset += page
        else:
            self.logger.warning(
                "iDigBio: limite de paginação (%d) atingido; possível truncamento.",
                _IDIGBIO_MAX_OFFSET,
            )

        self.logger.info("iDigBio: %d registros brutos recebidos", len(rows))
        return pd.DataFrame(rows)

    @staticmethod
    def _flatten(item: dict) -> dict:
        """Achata um item do iDigBio usando os `indexTerms` (normalizados)."""
        idx = item.get("indexTerms") or {}
        geo = idx.get("geopoint") or {}
        return {
            "scientificName": idx.get("scientificname"),
            "decimalLatitude": geo.get("lat"),
            "decimalLongitude": geo.get("lon"),
            "coordinateUncertaintyInMeters": idx.get("coordinateuncertainty"),
            "eventDate": idx.get("datecollected"),
            "basisOfRecord": idx.get("basisofrecord"),
            "kingdom": idx.get("kingdom"),
            "phylum": idx.get("phylum"),
            "class": idx.get("class"),
            "order": idx.get("order"),
            "family": idx.get("family"),
            "genus": idx.get("genus"),
            "country": idx.get("country"),
            "stateProvince": idx.get("stateprovince"),
            "recordedBy": idx.get("recordedby"),
            "institutionCode": idx.get("institutioncode"),
            "collectionCode": idx.get("collectioncode"),
            "catalogNumber": idx.get("catalognumber"),
            "datasetName": idx.get("recordset"),
            "occurrenceID": idx.get("occurrenceid") or item.get("uuid"),
        }

    # ------------------------------------------------------------------
    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        if raw.empty:
            return standardize_frame(raw)

        df = raw.copy()
        df["accepted_species"] = taxon.scientific_name

        # Normaliza basisOfRecord para o enum UPPER_SNAKE do GBIF.
        if "basisOfRecord" in df.columns:
            key = df["basisOfRecord"].astype("string").str.lower().str.replace(
                r"[^a-z]", "", regex=True)
            df["basisOfRecord"] = key.map(_BASIS_MAP).fillna(df["basisOfRecord"])

        # Deriva ano/mês/dia de datecollected (ISO) quando ausentes.
        if "eventDate" in df.columns:
            dt = pd.to_datetime(df["eventDate"], errors="coerce", utc=True)
            for col in ("year", "month", "day"):
                df[col] = getattr(dt.dt, col)

        if "datasetName" in df.columns:
            df["original_provider"] = df["datasetName"]

        return standardize_frame(df, provider=self.name, source=self.metadata_spec.title)
