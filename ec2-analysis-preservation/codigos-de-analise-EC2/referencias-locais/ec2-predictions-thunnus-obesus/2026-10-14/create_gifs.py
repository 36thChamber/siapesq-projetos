#!/usr/bin/env python3
"""Create monthly and future GIFs from the completed Thunnus obesus S3 batch."""

from __future__ import annotations

import importlib.util
from pathlib import Path

SHARED = Path('/workspace/ec2-predictions-ocean-es/2026-10-05/scenarios17/gifs/create_gifs.py')
spec = importlib.util.spec_from_file_location('marine_gifs', SHARED)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.PREFIX = 'predicoes_cenarios/thunnus-obesus-17cenarios-2026-10-14-perfil-1x1'
module.SPECIES = ('Thunnus_obesus',)
module.OUT = Path(__file__).resolve().parent / 'gifs'

if __name__ == '__main__':
    module.main()
