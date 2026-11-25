"""
Pacote de limpeza de ocorrências para SDM.

Separa a responsabilidade de LIMPEZA (taxonômica/espacial/temporal) do
DOWNLOAD (que fica em `downloaders/gbif.py`). O ponto de entrada principal é
`occurrence_cleaner.clean_occurrences`, configurado por `config.CleaningConfig`.
"""

from .config import CleaningConfig
from .occurrence_cleaner import clean_occurrences, CleaningReport

__all__ = ["CleaningConfig", "clean_occurrences", "CleaningReport"]
