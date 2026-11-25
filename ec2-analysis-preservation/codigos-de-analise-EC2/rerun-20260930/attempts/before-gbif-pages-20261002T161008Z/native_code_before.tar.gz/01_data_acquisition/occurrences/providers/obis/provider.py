# provider.py - Provider OBIS
#
# OBIS (Ocean Biodiversity Information System) é a maior base aberta de
# biodiversidade MARINHA — muito relevante para pesca/SDM marinho. Usa a API
# REST oficial v3 (https://api.obis.org/v3), sem necessidade de credenciais.
#
#   - Resolução taxonômica: GET /taxon/{nome} -> AphiaID (WoRMS) + linhagem.
#   - Ocorrências: GET /occurrence com paginação por CURSOR (`after` recebe o
#     `id` do último registro da página anterior), que é como o OBIS pagina
#     grandes volumes. Filtros por caixa geográfica (WKT) e por datas.
#
# A taxonomia do OBIS segue o WoRMS (World Register of Marine Species).

from __future__ import annotations

from typing import Optional

import pandas as pd

from ...base import BaseProvider, ProviderMetadata, TaxonMatch
from ...logs import ProviderStats
from ...models import standardize_frame

_OBIS_BASE = "https://api.obis.org/v3"
# Tamanho máximo de página aceito pela API do OBIS.
_OBIS_MAX_PAGE = 10_000


def _bbox_wkt(lon_range: tuple[float, float], lat_range: tuple[float, float]) -> Optional[str]:
    """
    Converte uma caixa (bbox) em polígono WKT para o parâmetro `geometry`.

    Retorna None quando a caixa cobre o mundo inteiro (não vale a pena filtrar).
    """
    lon0, lon1 = lon_range
    lat0, lat1 = lat_range
    if lon0 <= -180 and lon1 >= 180 and lat0 <= -90 and lat1 >= 90:
        return None
    return (
        f"POLYGON(({lon0} {lat0}, {lon1} {lat0}, {lon1} {lat1}, "
        f"{lon0} {lat1}, {lon0} {lat0}))"
    )


class OBISProvider(BaseProvider):
    """Provider da fonte OBIS via API REST v3 (sem credenciais)."""

    metadata_spec = ProviderMetadata(
        name="obis",
        title="OBIS",
        homepage="https://obis.org",
        api="REST oficial v3 (api.obis.org)",
        official_api=True,
        requires_auth=False,
        priority="high",
        implemented=True,
        license_note="Dados majoritariamente CC-BY/CC0; ver política do OBIS.",
        taxonomic_source="WoRMS (World Register of Marine Species)",
    )

    # ------------------------------------------------------------------
    def search_species(self, species_name: str) -> TaxonMatch:
        data = self.http.get_json(f"{_OBIS_BASE}/taxon/{species_name}")
        results = data.get("results") or []
        if not results:
            return TaxonMatch(provider=self.name, query_name=species_name, matched=False)

        top = results[0]
        taxon_id = top.get("taxonID") or top.get("aphiaID")
        return TaxonMatch(
            provider=self.name,
            query_name=species_name,
            matched=taxon_id is not None,
            accepted_name=top.get("acceptedNameUsage") or top.get("scientificName"),
            scientific_name=top.get("scientificName"),
            taxon_id=str(taxon_id) if taxon_id is not None else None,
            rank=top.get("rank"),
            taxonomic_source=self.metadata_spec.taxonomic_source,
            raw={k: top.get(k) for k in
                 ("kingdom", "phylum", "class", "order", "family", "genus")},
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
        size = min(self.config.batch_size, _OBIS_MAX_PAGE)
        params: dict[str, object] = {
            "scientificname": taxon.scientific_name or species_name,
            "startdate": f"{year_range[0]}-01-01",
            "enddate": f"{year_range[1]}-12-31",
            "size": size,
        }
        geometry = _bbox_wkt(lon_range, lat_range)
        if geometry:
            params["geometry"] = geometry

        results: list[dict] = []
        after: Optional[str] = None
        while True:
            page_params = dict(params)
            if after is not None:
                page_params["after"] = after
            resp = self.http.get_json(
                f"{_OBIS_BASE}/occurrence", params=page_params, stats=stats
            )
            stats.pages += 1
            batch = resp.get("results", []) or []
            if not batch:
                break
            results.extend(batch)

            if limit is not None and len(results) >= limit:
                results = results[:limit]
                break
            if len(batch) < size:
                break
            after = batch[-1].get("id")
            if after is None:
                break

        self.logger.info("OBIS: %d registros brutos recebidos", len(results))
        return pd.DataFrame(results)

    # ------------------------------------------------------------------
    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        if raw.empty:
            return standardize_frame(raw)

        df = raw.copy()

        # AphiaID como taxonID; nome aceito a partir de 'species'.
        if "aphiaID" in df.columns:
            df["taxonID"] = df["aphiaID"].astype("string")
        if "species" in df.columns:
            df["accepted_species"] = df["species"]

        # Proveniência: institutionCode e, quando faltar, o id do conjunto de dados.
        orig = df["institutionCode"] if "institutionCode" in df.columns else None
        if "dataset_id" in df.columns:
            df["datasetKey"] = df["dataset_id"]
            orig = df["dataset_id"] if orig is None else orig.fillna(df["dataset_id"])
        if orig is not None:
            df["original_provider"] = orig

        # Backfill da taxonomia com a linhagem resolvida (WoRMS), quando faltar.
        for rank, value in (taxon.raw or {}).items():
            if value is None:
                continue
            if rank not in df.columns:
                df[rank] = value
            else:
                df[rank] = df[rank].fillna(value)

        return standardize_frame(df, provider=self.name, source=self.metadata_spec.title)
