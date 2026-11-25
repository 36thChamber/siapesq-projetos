# provider.py - PANGAEA — ESQUELETO
#
# Prioridade Baixa. PANGAEA é um REPOSITÓRIO de dados ambientais/geocientíficos
# (marinhos, sobretudo). Contém datasets tabulares com posição e, às vezes,
# ocorrências de espécies, mas cada dataset tem esquema próprio.
#
# API oficial:
#   Busca (Elasticsearch): https://www.pangaea.de/advanced/search.php?... e a API
#     https://ws.pangaea.de/es/pangaea/panmd/_search
#   OAI-PMH / TSV por dataset: https://doi.pangaea.de/10.1594/PANGAEA.<id>?format=textfile
# Implementação sugerida (futura): busca por espécie + mapeamento por dataset
# para o modelo único. Por isso permanece como esqueleto.

from __future__ import annotations

from .._stub import StubProvider
from ...base import ProviderMetadata


class PangaeaProvider(StubProvider):
    metadata_spec = ProviderMetadata(
        name="pangaea",
        title="PANGAEA",
        homepage="https://www.pangaea.de",
        api="Busca ES (ws.pangaea.de) + TSV por dataset — NÃO é API de ocorrências",
        official_api=True,
        requires_auth=False,
        priority="low",
        implemented=False,
        taxonomic_source="Varia por dataset.",
    )
