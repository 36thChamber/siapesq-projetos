# provider.py - Zenodo — ESQUELETO
#
# Prioridade Baixa. Zenodo é um REPOSITÓRIO GENÉRICO de dados/publicações (CERN),
# não uma base de ocorrências ponto-a-ponto. Cada depósito tem formato próprio.
#
# API oficial (busca de registros):
#   https://zenodo.org/api/records?q=<termo>&type=dataset
#   (download dos arquivos via campo "files" de cada registro)
# Implementação sugerida (futura): descoberta de datasets por espécie + mapeamento
# por dataset para o modelo único. Por isso permanece como esqueleto.

from __future__ import annotations

from .._stub import StubProvider
from ...base import ProviderMetadata


class ZenodoProvider(StubProvider):
    metadata_spec = ProviderMetadata(
        name="zenodo",
        title="Zenodo",
        homepage="https://zenodo.org",
        api="REST de registros (zenodo.org/api/records) — NÃO é API de ocorrências",
        official_api=True,
        requires_auth=False,
        priority="low",
        implemented=False,
        taxonomic_source="Varia por dataset.",
    )
