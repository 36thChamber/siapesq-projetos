# provider.py - Provider EMODnet Biology (EurOBIS)
#
# EMODnet Biology reúne dados de biodiversidade MARINHA europeus, servidos pelo
# EurOBIS. Aqui consumimos o WFS oficial do VLIZ (GeoServer), que expõe a camada
# `Dataportal:eurobis` em Darwin Core e devolve GeoJSON — a geometria de cada
# feature já traz [lon, lat], o que torna a extração de coordenadas robusta.
#
# API oficial (sem credenciais):
#   https://geo.vliz.be/geoserver/Dataportal/wfs
#     ?service=WFS&version=2.0.0&request=GetFeature
#     &typeNames=Dataportal:eurobis&outputFormat=application/json
#     &count=<n>&startIndex=<n>&cql_filter=scientificname='<nome>'
#
# Filtro de espécie e ano vão por CQL (server-side, reduzindo volume); a caixa
# geográfica é aplicada no cliente a partir da geometria (robusto contra o nome
# da coluna de geometria variar).

from __future__ import annotations

import re
from typing import Optional

import pandas as pd

from ...base import BaseProvider, ProviderMetadata, TaxonMatch
from ...logs import ProviderStats
from ...models import standardize_frame

_EMODNET_WFS = "https://geo.vliz.be/geoserver/Dataportal/wfs"
_EMODNET_TYPE = "Dataportal:eurobis"
_EMODNET_MAX_PAGE = 5_000
_EMODNET_MAX_RECORDS = 200_000

_APHIA_ID = re.compile(r"id=(\d+)")


class EMODnetProvider(BaseProvider):
    """Provider do EMODnet Biology via WFS do EurOBIS (VLIZ), sem credenciais."""

    metadata_spec = ProviderMetadata(
        name="emodnet",
        title="EMODnet Biology",
        homepage="https://emodnet.ec.europa.eu/en/biology",
        api="WFS EurOBIS (geo.vliz.be/geoserver Dataportal:eurobis) — GeoJSON",
        official_api=True,
        requires_auth=False,
        priority="medium",
        implemented=True,
        license_note="Licenças variam por conjunto de dados EurOBIS; ver EMODnet.",
        taxonomic_source="WoRMS (via EurOBIS).",
    )

    # ------------------------------------------------------------------
    def search_species(self, species_name: str) -> TaxonMatch:
        # Busca textual pelo nome (o WFS filtra por `scientificname`).
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
        page = min(self.config.batch_size, _EMODNET_MAX_PAGE)

        # CQL: nome exato (aspas simples escapadas por duplicação) + janela de ano.
        safe_name = species_name.replace("'", "''")
        cql = (
            f"scientificname='{safe_name}' "
            f"AND yearcollected >= {year_range[0]} "
            f"AND yearcollected <= {year_range[1]}"
        )

        rows: list[dict] = []
        start = 0
        while start < _EMODNET_MAX_RECORDS:
            params = {
                "service": "WFS",
                "version": "2.0.0",
                "request": "GetFeature",
                "typeNames": _EMODNET_TYPE,
                "outputFormat": "application/json",
                "srsName": "EPSG:4326",
                "count": page,
                "startIndex": start,
                # `sortBy` é OBRIGATÓRIO junto de `startIndex` no GeoServer WFS 2.0
                # (paginação estável); sem ele o servidor devolve HTTP 400.
                "sortBy": "id",
                "cql_filter": cql,
            }
            resp = self.http.get_json(_EMODNET_WFS, params=params, stats=stats)
            stats.pages += 1
            feats = resp.get("features", []) or []
            if not feats:
                break
            for f in feats:
                rows.append(self._flatten(f))
            start += len(feats)

            if limit is not None and len(rows) >= limit:
                rows = rows[:limit]
                break
            if len(feats) < page:
                break

        self.logger.info("EMODnet: %d registros brutos recebidos", len(rows))
        df = pd.DataFrame(rows)
        return self._filter_bbox(df, lon_range, lat_range, limit)

    @staticmethod
    def _flatten(feature: dict) -> dict:
        """Achata uma feature GeoJSON do EurOBIS no modelo único."""
        geom = feature.get("geometry") or {}
        coords = geom.get("coordinates") or [None, None]
        p = feature.get("properties") or {}
        aphia = p.get("aphiaid")
        aphia_id = None
        if isinstance(aphia, str):
            m = _APHIA_ID.search(aphia)
            aphia_id = m.group(1) if m else None
        return {
            "scientificName": p.get("scientificname"),
            "accepted_species": p.get("scientificname_accepted") or p.get("scientificname"),
            "decimalLongitude": coords[0],
            "decimalLatitude": coords[1],
            "eventDate": p.get("eventdate") or p.get("observationdate"),
            "year": p.get("yearcollected"),
            "month": p.get("monthcollected"),
            "day": p.get("daycollected"),
            "basisOfRecord": p.get("basisofrecord"),
            "kingdom": p.get("kingdom"),
            "phylum": p.get("phylum"),
            "class": p.get("class"),
            "order": p.get("order"),
            "family": p.get("family"),
            "genus": p.get("genus"),
            "country": p.get("country"),
            "stateProvince": p.get("stateprovince"),
            "institutionCode": p.get("institutioncode"),
            "collectionCode": p.get("collectioncode"),
            "catalogNumber": p.get("catalognumber"),
            "recordedBy": p.get("collector"),
            "individualCount": p.get("individualcount"),
            "occurrenceID": p.get("occurrenceid") or p.get("recordurl") or p.get("id"),
            "references": p.get("recordurl"),
            "datasetName": p.get("datasetid"),
            "taxonID": aphia_id,
        }

    @staticmethod
    def _filter_bbox(
        df: pd.DataFrame,
        lon_range: tuple[float, float],
        lat_range: tuple[float, float],
        limit: Optional[int],
    ) -> pd.DataFrame:
        """Aplica o recorte da caixa geográfica no cliente (via geometria)."""
        if df.empty:
            return df
        world = (lon_range[0] <= -180 and lon_range[1] >= 180
                 and lat_range[0] <= -90 and lat_range[1] >= 90)
        if not world:
            lat = pd.to_numeric(df["decimalLatitude"], errors="coerce")
            lon = pd.to_numeric(df["decimalLongitude"], errors="coerce")
            df = df[lat.between(lat_range[0], lat_range[1])
                    & lon.between(lon_range[0], lon_range[1])]
        if limit is not None and len(df) > limit:
            df = df.iloc[:limit]
        return df.reset_index(drop=True)

    # ------------------------------------------------------------------
    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        if raw.empty:
            return standardize_frame(raw)
        df = raw.copy()
        if "datasetName" in df.columns:
            df["original_provider"] = df["datasetName"]
        return standardize_frame(df, provider=self.name, source=self.metadata_spec.title)
