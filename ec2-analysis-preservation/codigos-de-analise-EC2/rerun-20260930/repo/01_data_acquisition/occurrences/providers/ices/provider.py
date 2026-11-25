# provider.py - ICES — ESQUELETO
#
# Prioridade Média. ICES (International Council for the Exploration of the Sea)
# mantém levantamentos de arrasto e dados pesqueiros do Atlântico Norte.
#
# API oficial: web services do DATRAS (trawl surveys) e outros:
#   https://datras.ices.dk/WebServices/DATRASWebService.asmx
#   (também há APIs REST em https://datras.ices.dk/ e dados de captura por espécie).
# A implementação exige mapear os registros de lance/estação (haul) para
# ocorrências no modelo único (posição, data, espécie capturada).

from __future__ import annotations

from .._stub import StubProvider
from ...base import ProviderMetadata


class ICESProvider(StubProvider):
    metadata_spec = ProviderMetadata(
        name="ices",
        title="ICES (DATRAS)",
        homepage="https://www.ices.dk",
        api="Web services DATRAS (datras.ices.dk) — dados de arrasto",
        official_api=True,
        requires_auth=False,
        priority="medium",
        implemented=False,
        taxonomic_source="Códigos de espécie do ICES (AphiaID/WoRMS).",
    )
