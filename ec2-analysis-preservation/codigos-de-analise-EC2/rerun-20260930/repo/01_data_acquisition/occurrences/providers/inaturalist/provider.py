# provider.py - Provider iNaturalist
#
# iNaturalist é a maior base de CIÊNCIA CIDADÃ (observações com foto). Usa a API
# REST oficial v1 (https://api.inaturalist.org/v1), sem necessidade de
# credenciais para leitura.
#
#   - Resolução taxonômica: GET /taxa -> id do táxon + linhagem (ancestors).
#   - Observações: GET /observations com paginação por CURSOR (`id_above`, com
#     order_by=id&order=asc), que é o método recomendado para grandes volumes
#     (a paginação por página é limitada a 10.000 registros no iNaturalist).
#   - Por padrão restringe a `quality_grade=research` (observações validadas pela
#     comunidade), o mais adequado para SDM.
#
# Detalhe importante para a DEDUPLICAÇÃO: o `occurrenceID` é montado no MESMO
# formato de URL que o GBIF usa para registros do iNaturalist
# (https://www.inaturalist.org/observations/{id}), permitindo detectar o mesmo
# registro vindo das duas fontes.

from __future__ import annotations

from typing import Optional

import pandas as pd

from ...base import BaseProvider, ProviderMetadata, TaxonMatch
from ...logs import ProviderStats
from ...models import standardize_frame

_INAT_BASE = "https://api.inaturalist.org/v1"
_INAT_MAX_PAGE = 200
# Qualidade mínima aceita (research = validada pela comunidade).
_DEFAULT_QUALITY = "research"
# Trava de segurança de paginação.
_INAT_MAX_RECORDS = 200_000


class INaturalistProvider(BaseProvider):
    """Provider do iNaturalist via API REST v1 (sem credenciais)."""

    metadata_spec = ProviderMetadata(
        name="inaturalist",
        title="iNaturalist",
        homepage="https://www.inaturalist.org",
        api="REST oficial v1 (api.inaturalist.org)",
        official_api=True,
        requires_auth=False,
        priority="high",
        implemented=True,
        license_note="Licenças por observação (frequentemente CC-BY-NC); ver 'license'.",
        taxonomic_source="iNaturalist Taxonomy",
    )

    # ------------------------------------------------------------------
    def search_species(self, species_name: str) -> TaxonMatch:
        data = self.http.get_json(
            f"{_INAT_BASE}/taxa", params={"q": species_name, "rank": "species"}
        )
        results = data.get("results") or []
        if not results:
            return TaxonMatch(provider=self.name, query_name=species_name, matched=False)

        top = results[0]
        # Busca a linhagem completa (o /taxa de busca nem sempre traz ancestors).
        lineage: dict[str, str] = {}
        try:
            detail = self.http.get_json(f"{_INAT_BASE}/taxa/{top['id']}")
            node = (detail.get("results") or [top])[0]
            for anc in node.get("ancestors", []) or []:
                rank = (anc.get("rank") or "").lower()
                if rank in ("kingdom", "phylum", "class", "order", "family", "genus"):
                    lineage[rank] = anc.get("name")
        except Exception:  # noqa: BLE001 - linhagem é opcional
            pass

        return TaxonMatch(
            provider=self.name,
            query_name=species_name,
            matched=True,
            accepted_name=top.get("name"),
            scientific_name=top.get("name"),
            taxon_id=str(top.get("id")),
            rank=top.get("rank"),
            taxonomic_source=self.metadata_spec.taxonomic_source,
            raw=lineage,
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
        page = min(self.config.batch_size, _INAT_MAX_PAGE)
        params: dict[str, object] = {
            "taxon_id": taxon.taxon_id,
            "quality_grade": _DEFAULT_QUALITY,
            "d1": f"{year_range[0]}-01-01",
            "d2": f"{year_range[1]}-12-31",
            "geo": "true",
            "per_page": page,
            "order_by": "id",
            "order": "asc",
        }
        world = (lon_range[0] <= -180 and lon_range[1] >= 180
                 and lat_range[0] <= -90 and lat_range[1] >= 90)
        if not world:
            params.update({
                "swlng": lon_range[0], "swlat": lat_range[0],
                "nelng": lon_range[1], "nelat": lat_range[1],
            })

        rows: list[dict] = []
        id_above = 0
        while len(rows) < _INAT_MAX_RECORDS:
            resp = self.http.get_json(
                f"{_INAT_BASE}/observations",
                params=dict(params, id_above=id_above), stats=stats,
            )
            stats.pages += 1
            results = resp.get("results", []) or []
            if not results:
                break
            for obs in results:
                rows.append(self._flatten(obs, taxon))
            id_above = results[-1].get("id", id_above)

            if limit is not None and len(rows) >= limit:
                rows = rows[:limit]
                break
            if len(results) < page:
                break

        self.logger.info("iNaturalist: %d observações recebidas", len(rows))
        return pd.DataFrame(rows)

    @staticmethod
    def _flatten(obs: dict, taxon: TaxonMatch) -> dict:
        """Achata uma observação (campos aninhados) num dicionário plano."""
        details = obs.get("observed_on_details") or {}
        geo = obs.get("geojson") or {}
        coords = geo.get("coordinates") or [None, None]
        obs_taxon = obs.get("taxon") or {}
        user = obs.get("user") or {}
        obs_id = obs.get("id")
        license_code = obs.get("license_code")
        return {
            "scientificName": obs_taxon.get("name"),
            "decimalLongitude": coords[0],
            "decimalLatitude": coords[1],
            "coordinateUncertaintyInMeters": obs.get("positional_accuracy"),
            "eventDate": details.get("date") or obs.get("observed_on"),
            "year": details.get("year"),
            "month": details.get("month"),
            "day": details.get("day"),
            "basisOfRecord": "HUMAN_OBSERVATION",
            "locality": obs.get("place_guess"),
            "recordedBy": user.get("login"),
            "catalogNumber": str(obs_id) if obs_id is not None else None,
            # occurrenceID no formato de URL usado pelo GBIF (habilita dedup cruzada).
            "occurrenceID": (
                f"https://www.inaturalist.org/observations/{obs_id}"
                if obs_id is not None else None
            ),
            "references": obs.get("uri"),
            "license": license_code.upper() if isinstance(license_code, str) else None,
            "institutionCode": "iNaturalist",
        }

    # ------------------------------------------------------------------
    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        if raw.empty:
            return standardize_frame(raw)

        df = raw.copy()
        # Rótulo de espécie = nome aceito resolvido (nível de espécie).
        df["accepted_species"] = taxon.accepted_name
        if taxon.taxon_id:
            df["taxonID"] = str(taxon.taxon_id)
        df["original_provider"] = "iNaturalist"

        # Backfill da taxonomia com a linhagem resolvida.
        for rank, value in (taxon.raw or {}).items():
            if value is None:
                continue
            if rank not in df.columns:
                df[rank] = value
            else:
                df[rank] = df[rank].fillna(value)

        return standardize_frame(df, provider=self.name, source=self.metadata_spec.title)
