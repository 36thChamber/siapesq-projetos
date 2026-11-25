# provider.py - NOAA Fisheries — ESQUELETO
#
# Prioridade Média. NOAA Fisheries reúne levantamentos de recursos pesqueiros
# dos EUA — muito relevante para SDM marinho/pesqueiro.
#
# NOAA NÃO expõe uma única API de ocorrências no padrão Darwin Core. As rotas
# oficiais são servidores ERDDAP (tabledap), por exemplo:
#   https://coastwatch.pfeg.noaa.gov/erddap/tabledap/<dataset>.json?<colunas>&<filtros>
# e o portal InPort (catálogo de metadados). A implementação exige escolher o(s)
# dataset(s) ERDDAP de interesse e mapear suas colunas para o modelo único.
# (Alternativa: muitos dados da NOAA também chegam ao OBIS/GBIF.)

from __future__ import annotations

from .._stub import StubProvider
from ...base import ProviderMetadata


class NOAAProvider(StubProvider):
    metadata_spec = ProviderMetadata(
        name="noaa",
        title="NOAA Fisheries",
        homepage="https://www.fisheries.noaa.gov",
        api="ERDDAP tabledap (coastwatch.pfeg.noaa.gov/erddap) — depende do dataset",
        official_api=True,
        requires_auth=False,
        priority="medium",
        implemented=False,
        license_note="Domínio público (U.S. Government), varia por dataset.",
        taxonomic_source="Depende do dataset ERDDAP.",
    )
