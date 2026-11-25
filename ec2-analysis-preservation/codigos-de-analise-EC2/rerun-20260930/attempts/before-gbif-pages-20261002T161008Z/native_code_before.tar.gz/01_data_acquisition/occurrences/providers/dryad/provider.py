# provider.py - Dryad — ESQUELETO
#
# Prioridade Baixa. Dryad é um REPOSITÓRIO DE DATASETS científicos, não uma base
# de ocorrências ponto-a-ponto. Não há uma API que devolva registros Darwin Core
# padronizados: cada dataset tem seu próprio formato (CSV/planilha).
#
# API oficial (busca/descoberta de datasets):
#   https://datadryad.org/api/v2/search?q=<termo>
#   https://datadryad.org/api/v2/datasets/<id>/download
# Implementação sugerida (futura): buscar datasets por espécie, baixar os
# arquivos e aplicar um mapeamento POR DATASET (semiautomático) para o modelo
# único. Por isso permanece como esqueleto.

from __future__ import annotations

from .._stub import StubProvider
from ...base import ProviderMetadata


class DryadProvider(StubProvider):
    metadata_spec = ProviderMetadata(
        name="dryad",
        title="Dryad",
        homepage="https://datadryad.org",
        api="REST de datasets (datadryad.org/api/v2) — NÃO é API de ocorrências",
        official_api=True,
        requires_auth=False,
        priority="low",
        implemented=False,
        license_note="Datasets majoritariamente CC0.",
        taxonomic_source="Varia por dataset.",
    )
