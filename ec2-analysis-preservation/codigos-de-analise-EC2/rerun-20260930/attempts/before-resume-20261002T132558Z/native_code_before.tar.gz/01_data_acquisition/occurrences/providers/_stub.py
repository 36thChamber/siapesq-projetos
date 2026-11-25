# _stub.py - Base para providers ainda NÃO implementados (esqueleto preparado)
#
# As fontes de Prioridade Média/Baixa entram no sistema como ESQUELETOS: já
# registradas, com a ficha (`ProviderMetadata`) preenchida e a API oficial
# documentada, mas sem downloader completo. Cada esqueleto herda de
# `StubProvider`, que implementa a interface obrigatória levantando
# `NotImplementedError` com uma mensagem clara.
#
# Consequência prática: se o usuário LIGAR um esqueleto na configuração, o
# `manager` o executa, a chamada falha de forma controlada (success=False, com a
# dica de implementação nos logs/relatório) e as demais fontes seguem normalmente
# — nada quebra. Para implementar de fato, basta criar as três funções usando o
# endpoint documentado em `metadata_spec.api`, espelhando um provider pronto
# (ex.: `gbif` ou `sibbr`).

from __future__ import annotations

from typing import Optional

import pandas as pd

from ..base import BaseProvider, TaxonMatch
from ..logs import ProviderStats


class StubProvider(BaseProvider):
    """Provider registrado, porém ainda sem downloader (esqueleto)."""

    def _not_implemented(self) -> "NotImplementedError":
        meta = self.metadata_spec
        return NotImplementedError(
            f"Provider '{self.name}' ({meta.title}) ainda não implementado. "
            f"API oficial a usar: {meta.api}. "
            f"Prioridade: {meta.priority}."
        )

    def search_species(self, species: str) -> TaxonMatch:
        raise self._not_implemented()

    def download_occurrences(
        self,
        species: str,
        taxon: TaxonMatch,
        lon_range: tuple[float, float],
        lat_range: tuple[float, float],
        year_range: tuple[int, int],
        limit: Optional[int],
        stats: ProviderStats,
    ) -> pd.DataFrame:
        raise self._not_implemented()

    def normalize(self, raw: pd.DataFrame, taxon: TaxonMatch) -> pd.DataFrame:
        raise self._not_implemented()
