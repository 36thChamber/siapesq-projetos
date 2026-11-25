# occurrences/ - Aquisição multi-fonte de ocorrências de espécies (SIAPESQ/SDM)
#
# Processo INDEPENDENTE e autocontido: baixa ocorrências de várias bases de
# biodiversidade (GBIF, OBIS, iNaturalist, ...) por meio de "Providers" com uma
# interface comum, unifica em um modelo único, deduplica, limpa (reutilizando o
# pacote `cleaning/` do projeto) e exporta um CSV compatível com o restante do
# pipeline.
#
# Uso por código:
#     from occurrences import OccurrenceManager, OccurrencesConfig
#     config = OccurrencesConfig.from_yaml("occurrences/config.example.yaml")
#     result = OccurrenceManager(config).run("Pomatomus saltatrix")
#
# Uso por linha de comando (ver __main__.py):
#     python -m occurrences --config occurrences/config.example.yaml --species "..."

from __future__ import annotations

from .config import OccurrencesConfig
from .manager import OccurrenceManager, RunResult
from .models import STANDARD_COLUMNS, OccurrenceRecord, standardize_frame

__all__ = [
    "OccurrencesConfig",
    "OccurrenceManager",
    "RunResult",
    "STANDARD_COLUMNS",
    "OccurrenceRecord",
    "standardize_frame",
]
