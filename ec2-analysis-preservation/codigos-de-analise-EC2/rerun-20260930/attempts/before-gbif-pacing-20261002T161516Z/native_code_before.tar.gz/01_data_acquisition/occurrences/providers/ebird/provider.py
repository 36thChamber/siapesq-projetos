# provider.py - Provider eBird (apenas AVES)
#
# eBird (Cornell Lab of Ornithology) é a maior base mundial de observações de
# AVES. Usa a API 2.0 oficial, que EXIGE um token gratuito enviado no cabeçalho
# `X-eBirdApiToken` (obtenha em https://ebird.org/api/keygen e defina a variável
# de ambiente `EBIRD_API_TOKEN`).
#
# "Apenas aves" — de graça: a taxonomia do eBird é exclusivamente de aves. Em
# `search_species` resolvemos o `speciesCode` pela taxonomia do eBird; se o nome
# não for uma ave, não há correspondência (matched=False) e o provider é pulado
# naturalmente — sem precisar de um filtro taxonômico externo.
#
# LIMITAÇÃO IMPORTANTE (documentada): a API pública do eBird entrega apenas
# observações RECENTES (janela `back` de no máximo 30 dias) e por proximidade
# geográfica (raio `dist` de no máximo 50 km). Para cobrir a caixa de busca,
# consultamos uma GRADE de pontos e deduplicamos por `obsId`. O histórico
# COMPLETO do eBird (EBD) não é servido por esta API — ele está disponível via
# GBIF (dataset EOD) ou pelo download em massa do EBD (mediante solicitação).

from __future__ import annotations

import math
import os
from typing import Optional

import pandas as pd

from ...base import BaseProvider, ProviderMetadata, TaxonMatch
from ...logs import ProviderStats
from ...models import standardize_frame

_EBIRD_BASE = "https://api.ebird.org/v2"
_EBIRD_MAX_DIST_KM = 50      # raio máximo aceito pelo endpoint geo/recent
_EBIRD_MAX_BACK_DAYS = 30    # janela máxima (dias) do endpoint recent
_EBIRD_MAX_TILES = 300       # trava de segurança da grade de cobertura


class EBirdProvider(BaseProvider):
    """Provider do eBird (apenas aves) via API 2.0 (requer token)."""

    metadata_spec = ProviderMetadata(
        name="ebird",
        title="eBird",
        homepage="https://ebird.org",
        api="REST oficial 2.0 (api.ebird.org/v2) — requer token X-eBirdApiToken",
        official_api=True,
        requires_auth=True,   # token gratuito em EBIRD_API_TOKEN
        priority="high",
        implemented=True,
        license_note="eBird Basic Dataset (CC0/Cornell); ver termos do eBird.",
        taxonomic_source="eBird/Clements Taxonomy (apenas Aves).",
    )

    # Cache de taxonomia por processo (a taxonomia do eBird é grande e estável).
    _taxonomy_cache: Optional[dict[str, str]] = None

    # ------------------------------------------------------------------
    def _token_header(self) -> dict:
        token = os.getenv("EBIRD_API_TOKEN")
        if not token:
            raise RuntimeError(
                "eBird indisponível: defina EBIRD_API_TOKEN (token gratuito em "
                "https://ebird.org/api/keygen)."
            )
        return {"X-eBirdApiToken": token}

    def _load_taxonomy(self, stats: ProviderStats) -> dict[str, str]:
        """Baixa (uma vez) a taxonomia do eBird: {sciName minúsculo -> speciesCode}."""
        if EBirdProvider._taxonomy_cache is not None:
            return EBirdProvider._taxonomy_cache
        data = self.http.get_json(
            f"{_EBIRD_BASE}/ref/taxonomy/ebird",
            params={"fmt": "json", "cat": "species"},
            headers=self._token_header(),
            stats=stats,
        )
        mapping = {
            (row.get("sciName") or "").strip().lower(): row.get("speciesCode")
            for row in (data or [])
            if row.get("sciName") and row.get("speciesCode")
        }
        EBirdProvider._taxonomy_cache = mapping
        return mapping

    # ------------------------------------------------------------------
    def search_species(self, species_name: str) -> TaxonMatch:
        stats = ProviderStats(provider=self.name)  # taxonomia não conta nas stats do fetch
        try:
            taxonomy = self._load_taxonomy(stats)
        except Exception as exc:  # noqa: BLE001 - sem token/rede -> não casa
            self.logger.warning("eBird: taxonomia indisponível (%s)", exc)
            return TaxonMatch(provider=self.name, query_name=species_name, matched=False)

        code = taxonomy.get(species_name.strip().lower())
        if not code:
            # Não é uma ave (ou nome fora da taxonomia eBird) -> pulado.
            return TaxonMatch(provider=self.name, query_name=species_name, matched=False)

        return TaxonMatch(
            provider=self.name,
            query_name=species_name,
            matched=True,
            accepted_name=species_name,
            scientific_name=species_name,
            taxon_id=code,
            rank="species",
            taxonomic_source=self.metadata_spec.taxonomic_source,
            raw={"class": "Aves"},
        )

    # ------------------------------------------------------------------
    def _grid_centers(
        self,
        lon_range: tuple[float, float],
        lat_range: tuple[float, float],
        dist_km: float,
    ) -> list[tuple[float, float]]:
        """Centros de uma grade que cobre o bbox com células de raio `dist_km`."""
        lat0, lat1 = lat_range
        lon0, lon1 = lon_range
        # Passo ~ raio (sobreposição para não deixar buracos entre círculos).
        step_lat = dist_km / 111.0
        mean_lat = math.radians((lat0 + lat1) / 2.0)
        step_lon = dist_km / (111.0 * max(math.cos(mean_lat), 1e-6))

        centers: list[tuple[float, float]] = []
        lat = lat0 + step_lat / 2
        while lat <= lat1 + step_lat / 2:
            lon = lon0 + step_lon / 2
            while lon <= lon1 + step_lon / 2:
                centers.append((min(lat, 90.0), min(max(lon, -180.0), 180.0)))
                lon += step_lon
            lat += step_lat
        return centers

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
        headers = self._token_header()
        dist = float(os.getenv("EBIRD_DIST_KM", _EBIRD_MAX_DIST_KM))
        dist = min(dist, _EBIRD_MAX_DIST_KM)
        back = int(os.getenv("EBIRD_BACK_DAYS", _EBIRD_MAX_BACK_DAYS))
        back = min(back, _EBIRD_MAX_BACK_DAYS)

        world = (lon_range[0] <= -180 and lon_range[1] >= 180
                 and lat_range[0] <= -90 and lat_range[1] >= 90)
        centers = ([(0.0, 0.0)] if world
                   else self._grid_centers(lon_range, lat_range, dist))
        if len(centers) > _EBIRD_MAX_TILES:
            self.logger.warning(
                "eBird: bbox exige %d células (> %d); cobrindo apenas as primeiras "
                "%d. Aumente EBIRD_DIST_KM ou reduza a área para cobrir tudo.",
                len(centers), _EBIRD_MAX_TILES, _EBIRD_MAX_TILES,
            )
            centers = centers[:_EBIRD_MAX_TILES]

        seen: set[str] = set()
        rows: list[dict] = []
        for lat, lon in centers:
            params = {
                "lat": round(lat, 4), "lng": round(lon, 4),
                "dist": dist, "back": back, "includeProvisional": "true",
            }
            obs = self.http.get_json(
                f"{_EBIRD_BASE}/data/obs/geo/recent/{taxon.taxon_id}",
                params=params, headers=headers, stats=stats,
            )
            stats.pages += 1
            for rec in (obs or []):
                key = str(rec.get("obsId") or rec.get("subId") or id(rec))
                if key in seen:
                    continue
                seen.add(key)
                rows.append(rec)
            if limit is not None and len(rows) >= limit:
                rows = rows[:limit]
                break

        self.logger.info("eBird: %d observações recebidas (janela recente)", len(rows))
        return pd.DataFrame(rows)

    # ------------------------------------------------------------------
    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        if raw.empty:
            return standardize_frame(raw)

        df = raw.rename(columns={
            "sciName": "scientificName",
            "lat": "decimalLatitude",
            "lng": "decimalLongitude",
            "locName": "locality",
            "howMany": "individualCount",
        })
        df["accepted_species"] = taxon.scientific_name
        df["class"] = "Aves"
        df["kingdom"] = "Animalia"
        df["phylum"] = "Chordata"
        df["basisOfRecord"] = "HUMAN_OBSERVATION"
        df["institutionCode"] = "eBird"
        if taxon.taxon_id:
            df["taxonID"] = taxon.taxon_id

        # Data/hora do eBird: "YYYY-MM-DD HH:MM" ou "YYYY-MM-DD".
        if "obsDt" in df.columns:
            dt = pd.to_datetime(df["obsDt"], errors="coerce")
            df["eventDate"] = df["obsDt"]
            for col in ("year", "month", "day"):
                df[col] = getattr(dt.dt, col)

        # occurrenceID rastreável (checklist + espécie).
        if "subId" in df.columns:
            df["occurrenceID"] = (
                "https://ebird.org/checklist/" + df["subId"].astype(str)
                + "#" + str(taxon.taxon_id)
            )
            df["catalogNumber"] = df["subId"].astype(str)

        return standardize_frame(df, provider=self.name, source=self.metadata_spec.title)
