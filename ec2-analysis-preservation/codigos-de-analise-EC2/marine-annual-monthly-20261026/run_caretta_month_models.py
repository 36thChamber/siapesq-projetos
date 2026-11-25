#!/usr/bin/env python3
"""Precompute the 12 month-trained Caretta maps while annual jobs run."""

from pathlib import Path
from worker import BASE, caretta_month_models, layers, utc


if __name__ == '__main__':
    state = {'species': 'Caretta caretta', 'profile': 'repteis_marinhos',
             'status': 'running', 'stage': 'treino_mensal', 'started_utc': utc()}
    dest = Path('/workspace/ocean-es-20261005/repo/07 Executado por espécie/Caretta_caretta/2026-10-26')
    result = caretta_month_models('Caretta_caretta', dest, layers(), state)
    assert len(result) == 12
    (BASE / 'month_models' / 'Caretta_caretta' / 'complete.txt').write_text(utc() + '\n')
    print('MONTHLY_MODELS_DONE', len(result), flush=True)
