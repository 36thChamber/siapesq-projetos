# provider.py - Provider Atlas of Living Australia (ALA)
#
# ALA é a maior infraestrutura de biodiversidade da Austrália e roda sobre a
# MESMA plataforma `biocache-service` do SiBBr (nó australiano vs. brasileiro do
# GBIF). Por isso este provider REAPROVEITA integralmente o `SiBBrProvider`,
# trocando apenas o endpoint (`search_url`), a ficha (`metadata_spec`) e os
# cabeçalhos (a ALA passou a EXIGIR uma chave de API no biocache-service).
#
# API oficial:
#   https://biocache-ws.ala.org.au/ws/occurrences/search?q=...&fq=...&wkt=...
#   -> requer o cabeçalho `apiKey` (chave gratuita: https://support.ala.org.au/
#      -> "API keys"). Defina a variável de ambiente ALA_API_KEY. Sem ela, o
#      provider é pulado de forma controlada (como eBird/BIEN).

from __future__ import annotations

import os
from typing import Optional

from ..sibbr.provider import SiBBrProvider
from ...base import ProviderMetadata


class AtlasAustraliaProvider(SiBBrProvider):
    """Provider do ALA via biocache-service (herda a lógica do SiBBr; requer chave)."""

    search_url = "https://biocache-ws.ala.org.au/ws/occurrences/search"

    metadata_spec = ProviderMetadata(
        name="atlas",
        title="Atlas of Living Australia",
        homepage="https://www.ala.org.au",
        api="REST ALA biocache-service (biocache-ws.ala.org.au) — requer apiKey",
        official_api=True,
        requires_auth=True,   # ALA exige chave (ALA_API_KEY)
        priority="medium",
        implemented=True,
        license_note="Licenças variam por provedor de dados; ver coluna 'license'.",
        taxonomic_source="ALA National Species List.",
    )

    def _extra_headers(self) -> Optional[dict]:
        key = os.getenv("ALA_API_KEY")
        if not key:
            raise RuntimeError(
                "ALA indisponível: defina ALA_API_KEY (chave gratuita da Atlas of "
                "Living Australia) para consultar o biocache-service."
            )
        return {"apiKey": key}
