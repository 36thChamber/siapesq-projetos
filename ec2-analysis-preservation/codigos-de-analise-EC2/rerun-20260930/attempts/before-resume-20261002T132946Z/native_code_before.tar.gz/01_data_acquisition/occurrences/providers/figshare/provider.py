# provider.py - Figshare — ESQUELETO
#
# Prioridade Baixa. Figshare é um REPOSITÓRIO GENÉRICO de dados de pesquisa, não
# uma base de ocorrências ponto-a-ponto. Cada artigo/dataset tem formato próprio.
#
# API oficial:
#   https://api.figshare.com/v2/articles/search  (POST com {"search_for": "<termo>"})
#   https://api.figshare.com/v2/articles/<id>     (arquivos em "files")
# Implementação sugerida (futura): descoberta de datasets por espécie + mapeamento
# por dataset para o modelo único. Por isso permanece como esqueleto.

from __future__ import annotations

from .._stub import StubProvider
from ...base import ProviderMetadata


class FigshareProvider(StubProvider):
    metadata_spec = ProviderMetadata(
        name="figshare",
        title="Figshare",
        homepage="https://figshare.com",
        api="REST (api.figshare.com/v2/articles/search) — NÃO é API de ocorrências",
        official_api=True,
        requires_auth=False,
        priority="low",
        implemented=False,
        taxonomic_source="Varia por dataset.",
    )
