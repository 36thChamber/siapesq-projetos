# provider.py - Provider SiBBr
#
# SiBBr (Sistema de Informação sobre a Biodiversidade Brasileira) é o nó
# brasileiro do GBIF. Seu portal roda sobre a plataforma ALA (Atlas of Living
# Australia), expondo a API "biocache-service" — uma rota OFICIAL e INDEPENDENTE
# do GBIF, sem necessidade de credenciais.
#
# API: https://biocache-service.sibbr.gov.br/biocache-service/occurrences/search
#   - Busca por frase exata do nome: q=text:"<nome científico>" (o índice de
#     nomes do SiBBr nem sempre resolve a nível de espécie; a busca textual é a
#     mais confiável).
#   - Filtros por faixa (fq): ano e coordenadas (sintaxe SOLR "[min TO max]").
#   - Paginação por start/pageSize, guiada por `totalRecords` (evita parar cedo
#     caso o servidor limite o tamanho de página).
#
# Peculiaridades do ALA tratadas aqui:
#   - a coluna de classe chama-se `classs` (com três "s");
#   - `eventDate` vem em epoch/milissegundos — dele derivamos ano/mês/DIA
#     (o índice não traz `day` separado);
#   - o nome costuma casar a nível de família, então rotulamos a espécie com o
#     nome pesquisado (mesma convenção do `gbif.r` do projeto).

from __future__ import annotations

from typing import Optional

import pandas as pd

from ...base import BaseProvider, ProviderMetadata, TaxonMatch
from ...logs import ProviderStats
from ...models import standardize_frame

_SIBBR_SEARCH = (
    "https://biocache-service.sibbr.gov.br/biocache-service/occurrences/search"
)
_ALA_MAX_PAGE = 300
# Trava de deep-paging do SOLR/ALA (registra aviso se atingida, sem truncar em silêncio).
_ALA_MAX_OFFSET = 100_000

# Renomeações de campos nativos do ALA -> modelo único.
_RENAME = {
    "classs": "class",
    "collector": "recordedBy",
    "dataResourceName": "datasetName",
    "dataResourceUid": "datasetKey",
    "raw_catalogNumber": "catalogNumber",
    "raw_collectionCode": "collectionCode",
    "raw_institutionCode": "institutionCode",
}


class SiBBrProvider(BaseProvider):
    """Provider do SiBBr via API ALA biocache-service (sem credenciais)."""

    # URL do endpoint biocache-service. Subclasses que rodam sobre a MESMA
    # plataforma ALA (ex.: Atlas of Living Australia) só precisam sobrescrever
    # este atributo e a `metadata_spec` — toda a lógica é reaproveitada.
    search_url: str = _SIBBR_SEARCH

    def _extra_headers(self) -> Optional[dict]:
        """
        Cabeçalhos extras enviados a cada requisição (ex.: chave de API).

        Padrão: nenhum (SiBBr é aberto). Subclasses sobre a mesma plataforma ALA
        que exigem autenticação (ex.: Atlas of Living Australia) sobrescrevem
        este método para injetar a chave — e podem levantar erro se ela faltar.
        """
        return None

    metadata_spec = ProviderMetadata(
        name="sibbr",
        title="SiBBr",
        homepage="https://sibbr.gov.br",
        api="REST oficial ALA biocache-service (biocache-service.sibbr.gov.br)",
        official_api=True,
        requires_auth=False,
        priority="high",
        implemented=True,
        license_note="Licenças variam por provedor de dados; ver coluna 'license'.",
        taxonomic_source="ALA/SiBBr (nó brasileiro do GBIF).",
    )

    # ------------------------------------------------------------------
    def search_species(self, species_name: str) -> TaxonMatch:
        # A busca é textual; confiamos no nome informado (rótulo de espécie).
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
        page = min(self.config.batch_size, _ALA_MAX_PAGE)

        # Filtro de ano via fq; filtro espacial via WKT (o range fq sobre
        # decimalLatitude NÃO funciona no índice do ALA — usa-se `wkt`).
        fq = [f"year:[{year_range[0]} TO {year_range[1]}]"]
        world = (lon_range[0] <= -180 and lon_range[1] >= 180
                 and lat_range[0] <= -90 and lat_range[1] >= 90)
        lon0, lon1 = lon_range
        lat0, lat1 = lat_range
        wkt = None if world else (
            f"POLYGON(({lon0} {lat0}, {lon1} {lat0}, {lon1} {lat1}, "
            f"{lon0} {lat1}, {lon0} {lat0}))"
        )

        rows: list[dict] = []
        start = 0
        total = None
        while start < _ALA_MAX_OFFSET:
            params = [("q", f'text:"{species_name}"'), ("pageSize", str(page)),
                      ("start", str(start))]
            params += [("fq", f) for f in fq]
            if wkt:
                params.append(("wkt", wkt))
            resp = self.http.get_json(
                self.search_url, params=params, stats=stats,
                headers=self._extra_headers(),
            )
            stats.pages += 1
            if total is None:
                total = resp.get("totalRecords", 0)
            occ = resp.get("occurrences", []) or []
            if not occ:
                break
            rows.extend(occ)
            start += len(occ)

            if limit is not None and len(rows) >= limit:
                rows = rows[:limit]
                break
            if total is not None and start >= total:
                break
        else:
            self.logger.warning(
                "%s: limite de paginação (%d) atingido; resultado pode estar truncado.",
                self.metadata_spec.title, _ALA_MAX_OFFSET,
            )

        self.logger.info(
            "%s: %d registros brutos recebidos", self.metadata_spec.title, len(rows)
        )
        return pd.DataFrame(rows)

    # ------------------------------------------------------------------
    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        if raw.empty:
            return standardize_frame(raw)

        df = raw.rename(columns={k: v for k, v in _RENAME.items() if k in raw.columns})

        # Nome verbatim -> scientificName; rótulo de espécie = nome pesquisado.
        if "raw_scientificName" in df.columns:
            df["scientificName"] = df["raw_scientificName"]
        df["accepted_species"] = taxon.scientific_name

        if "taxonConceptID" in df.columns:
            df["taxonID"] = df["taxonConceptID"].astype("string")
        if "datasetName" in df.columns:
            df["original_provider"] = df["datasetName"]

        # eventDate em epoch/ms -> ISO e derivação de ano/mês/DIA.
        if "eventDate" in df.columns:
            ms = pd.to_numeric(df["eventDate"], errors="coerce")
            dt = pd.to_datetime(ms, unit="ms", errors="coerce", utc=True)
            for col in ("year", "month", "day"):
                derived = getattr(dt.dt, col)
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(derived)
                else:
                    df[col] = derived
            iso = dt.dt.strftime("%Y-%m-%d")
            df["eventDate"] = iso.where(dt.notna(), None)

        return standardize_frame(df, provider=self.name, source=self.metadata_spec.title)
