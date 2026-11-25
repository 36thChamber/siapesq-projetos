# provider.py - Provider BOLD Systems
#
# BOLD (Barcode of Life Data System) reúne registros de espécimes com código de
# barras genético (DNA barcoding). Usa a API pública v5 do portal
# (https://portal.boldsystems.org/api), sem credenciais, num fluxo de 3 passos:
#
#   1) /api/query/preprocessor?query=tax:<nome>  -> valida o termo taxonômico
#      (ex.: "tax:species:Pomatomus saltatrix").
#   2) /api/query?query=<termo>&extent=full      -> devolve um query_id (24 h).
#   3) /api/documents/<query_id>/download?format=json -> registros no padrão BCDM,
#      em JSONL (um objeto JSON por linha).
#
# O portal fica atrás de Cloudflare, então enviamos um User-Agent de navegador.
# A API não filtra por caixa geográfica de forma simples; como o volume por
# espécie é modesto, filtramos coordenadas e ano do lado do cliente.
#
# Peculiaridades do BCDM tratadas: `coord` vem como [LAT, LON]; algumas chaves
# têm barra ("country/ocean", "province/state").

from __future__ import annotations

from typing import Optional
from urllib.parse import quote

import pandas as pd

from ...base import BaseProvider, ProviderMetadata, TaxonMatch
from ...logs import ProviderStats
from ...models import standardize_frame

_BOLD_API = "https://portal.boldsystems.org/api"
_BROWSER_UA = {"User-Agent": "Mozilla/5.0 (compatible; SIAPESQ-SDM/1.0)"}

# Renomeações BCDM -> modelo único (kingdom..genus já batem com o modelo).
_RENAME = {
    "country/ocean": "country",
    "province/state": "stateProvince",
    "coord_accuracy": "coordinateUncertaintyInMeters",
    "collection_code": "collectionCode",
    "museumid": "catalogNumber",
    "processid": "occurrenceID",
    "collectors": "recordedBy",
    "identified_by": "identifiedBy",
    "taxid": "taxonID",
    "region": "locality",
    "specimen_linkout": "references",
}


class BOLDProvider(BaseProvider):
    """Provider do BOLD Systems via API pública v5 (sem credenciais)."""

    metadata_spec = ProviderMetadata(
        name="bold",
        title="BOLD Systems",
        homepage="https://boldsystems.org",
        api="REST oficial v5 (portal.boldsystems.org/api) — fluxo preprocessor/query/download",
        official_api=True,
        requires_auth=False,
        priority="high",
        implemented=True,
        license_note="Dados públicos do BOLD; ver termos do consórcio iBOL.",
        taxonomic_source="BOLD Taxonomy",
    )

    # ------------------------------------------------------------------
    def search_species(self, species_name: str) -> TaxonMatch:
        data = self.http.get_json(
            f"{_BOLD_API}/query/preprocessor",
            params={"query": f"tax:{species_name}"}, headers=_BROWSER_UA,
        )
        terms = data.get("successful_terms") or []
        if not terms:
            return TaxonMatch(provider=self.name, query_name=species_name, matched=False)

        triplet = terms[0].get("matched")  # ex.: "tax:species:Pomatomus saltatrix"
        resolved = triplet.split(":")[-1] if triplet else species_name
        return TaxonMatch(
            provider=self.name,
            query_name=species_name,
            matched=bool(triplet),
            accepted_name=resolved,
            scientific_name=resolved,
            taxonomic_source=self.metadata_spec.taxonomic_source,
            raw={"triplet": triplet},
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
        triplet = (taxon.raw or {}).get("triplet")
        if not triplet:
            return pd.DataFrame()

        # Passo 2: obtém o query_id.
        qresp = self.http.get_json(
            f"{_BOLD_API}/query",
            params={"query": triplet, "extent": "full"},
            headers=_BROWSER_UA, stats=stats,
        )
        query_id = qresp.get("query_id")
        if not query_id:
            return pd.DataFrame()

        # Passo 3: baixa os registros (JSONL). O query_id é base64 (pode conter
        # '/', '+', '='), então é codificado no caminho da URL.
        url = f"{_BOLD_API}/documents/{quote(query_id, safe='')}/download"
        text = self.http.get_text(url, params={"format": "json"},
                                  headers=_BROWSER_UA, stats=stats)
        stats.pages += 1

        import json
        world = (lon_range[0] <= -180 and lon_range[1] >= 180
                 and lat_range[0] <= -90 and lat_range[1] >= 90)
        rows: list[dict] = []
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except ValueError:
                continue

            # Filtro de ano (client-side) por collection_date_start.
            year = _year_of(rec.get("collection_date_start"))
            if year is not None and not (year_range[0] <= year <= year_range[1]):
                continue

            # SDM exige coordenada: descarta registros sem `coord` válida
            # (coord é [lat, lon]). Isso também torna o `limit` significativo.
            coord = rec.get("coord")
            if not (isinstance(coord, (list, tuple)) and len(coord) >= 2):
                continue
            lat, lon = coord[0], coord[1]
            if lat is None or lon is None:
                continue
            if not world and not (
                lat_range[0] <= lat <= lat_range[1]
                and lon_range[0] <= lon <= lon_range[1]
            ):
                continue

            rows.append(rec)
            if limit is not None and len(rows) >= limit:
                break

        self.logger.info("BOLD: %d registros recebidos (após filtros)", len(rows))
        return pd.DataFrame(rows)

    # ------------------------------------------------------------------
    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        if raw.empty:
            return standardize_frame(raw)

        df = raw.rename(columns={k: v for k, v in _RENAME.items() if k in raw.columns})

        # coord [lat, lon] -> colunas separadas.
        if "coord" in df.columns:
            df["decimalLatitude"] = df["coord"].map(
                lambda c: c[0] if isinstance(c, (list, tuple)) and len(c) >= 2 else None)
            df["decimalLongitude"] = df["coord"].map(
                lambda c: c[1] if isinstance(c, (list, tuple)) and len(c) >= 2 else None)

        if "taxonID" in df.columns:
            df["taxonID"] = df["taxonID"].astype("string")

        # Nome/rotulagem: 'species' do BCDM é o nome aceito.
        if "species" in df.columns:
            df["accepted_species"] = df["species"]
        if "identification" in df.columns:
            df["scientificName"] = df["identification"]

        # Data: collection_date_start -> eventDate + ano/mês/dia.
        if "collection_date_start" in df.columns:
            dt = pd.to_datetime(df["collection_date_start"], errors="coerce", utc=True)
            df["eventDate"] = df["collection_date_start"]
            df["year"] = dt.dt.year
            df["month"] = dt.dt.month
            df["day"] = dt.dt.day

        # Instituição e proveniência.
        if "inst" in df.columns:
            df["institutionCode"] = df["inst"]
            df["original_provider"] = df["inst"]

        # Espécimes com material genético.
        df["basisOfRecord"] = "MATERIAL_SAMPLE"

        return standardize_frame(df, provider=self.name, source=self.metadata_spec.title)


def _year_of(date_str: object) -> Optional[int]:
    """Extrai o ano de uma data 'AAAA-MM-DD' (ou None)."""
    if not isinstance(date_str, str) or len(date_str) < 4:
        return None
    try:
        return int(date_str[:4])
    except ValueError:
        return None
