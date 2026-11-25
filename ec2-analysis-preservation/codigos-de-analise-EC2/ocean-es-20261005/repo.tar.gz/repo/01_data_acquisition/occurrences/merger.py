# merger.py - União dos resultados normalizados
#
# Recebe os DataFrames (já no modelo único) de cada provider e os concatena em
# uma única tabela padronizada. Simples de propósito: a padronização de colunas
# já foi feita por cada provider, então aqui basta empilhar e reforçar o esquema.

from __future__ import annotations

import pandas as pd

from .models import empty_frame, standardize_frame


def merge_frames(frames: list[pd.DataFrame]) -> pd.DataFrame:
    """
    Concatena vários DataFrames padronizados em um só.

    Frames vazios ou None são ignorados. O resultado é re-padronizado para
    garantir esquema e ordem de colunas consistentes.
    """
    valid = [f for f in frames if f is not None and not f.empty]
    if not valid:
        return empty_frame()
    merged = pd.concat(valid, ignore_index=True)
    return standardize_frame(merged)
