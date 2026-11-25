"""Retry soil reads in isolated processes so failed GDAL range caches are discarded."""
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import numpy as np

ROOT = Path('/workspace/tools-train-models-vireo')
os.environ.setdefault('GDAL_HTTP_TIMEOUT', '90')
os.environ.setdefault('GDAL_HTTP_CONNECTTIMEOUT', '30')
spec = importlib.util.spec_from_file_location('cache', ROOT/'03_environmental_processing/gerar_cache_brasil.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

if len(sys.argv) > 1:
    url, row, rows, target = sys.argv[1:]
    width, _, transform = m._grid(m.BRASIL, .01)
    np.save(target, m._read_strip(url, transform, width, int(rows), int(row), m.Resampling.nearest))
else:
    def isolated(url, transform, width, rows, row_off, resampling):
        with tempfile.TemporaryDirectory(prefix='vireo-soil-') as tmp:
            target = str(Path(tmp)/'strip.npy')
            for attempt in range(6):
                try:
                    subprocess.run([sys.executable, __file__, url, str(row_off), str(rows), target], check=True, timeout=240)
                    return np.load(target)
                except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                    if attempt == 5:
                        raise
                    print(f'[solo] nova conexão para faixa {row_off}, tentativa {attempt+2}', flush=True)
                    time.sleep(3)
    m._read_strip = isolated
    m.gerar_solo(m.BRASIL, .01, ROOT/'env_data/raster_cache/brasil_1km', 128)
