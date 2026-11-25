"""Run the repository suite with native Linux GDAL and no external services."""
import json
import os
from pathlib import Path
import platform
import socket
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = ROOT / 'acolite-batch-fix'
OUTPUT = ROOT / 'homologation' / 'linux-suite-20261108'
OUTPUT.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(REPOSITORY))
os.environ['PYTHONPATH'] = str(REPOSITORY)
os.environ['PROJ_NETWORK'] = 'OFF'
for key in ('SIAPESQ_API_KEY', 'DISCORD_BOT_TOKEN', 'DISCORD_BOT_CHANNEL',
            'OPENEO_CLIENT_ID', 'OPENEO_CLIENT_SECRET', 'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN'):
    os.environ.pop(key, None)

original_connect = socket.socket.connect
original_connect_ex = socket.socket.connect_ex
blocked = []
def guarded_connect(self, address):
    if self.family in (socket.AF_INET, socket.AF_INET6):
        blocked.append(str(address))
        raise RuntimeError('External network is forbidden in the native offline suite')
    return original_connect(self, address)
def guarded_connect_ex(self, address):
    if self.family in (socket.AF_INET, socket.AF_INET6):
        blocked.append(str(address))
        raise RuntimeError('External network is forbidden in the native offline suite')
    return original_connect_ex(self, address)
socket.socket.connect = guarded_connect
socket.socket.connect_ex = guarded_connect_ex

from osgeo import gdal
import numpy as np
import openeo
import pytest
import rasterio
import scipy
import xarray as xr

assert gdal.VersionInfo('RELEASE_NAME') == rasterio.__gdal_version__, 'GDAL mismatch'
class Results:
    def __init__(self):
        self.tests = []
    def pytest_runtest_logreport(self, report):
        if report.when == 'call' or report.failed or report.skipped:
            self.tests.append({'test': report.nodeid, 'when': report.when,
                               'outcome': report.outcome, 'seconds': report.duration})

plugin = Results()
os.chdir(REPOSITORY)
started = time.monotonic()
exit_code = pytest.main([str(REPOSITORY / 'tests'), '-q', '--tb=short',
                         '--basetemp=/tmp/acolite-native-pytest-20261108'], plugins=[plugin])
report = {
    'exit_code': int(exit_code), 'seconds': time.monotonic() - started,
    'runtime': {'platform': platform.platform(), 'python': sys.version,
                'gdal': gdal.VersionInfo('--version'), 'rasterio': rasterio.__version__,
                'rasterio_gdal': rasterio.__gdal_version__, 'numpy': np.__version__,
                'xarray': xr.__version__, 'openeo': openeo.__version__, 'scipy': scipy.__version__},
    'network_guard_attempts': blocked, 'gdal_stub': False,
    'counts': {outcome: sum(item['outcome'] == outcome for item in plugin.tests)
               for outcome in ('passed', 'failed', 'skipped')},
    'tests': plugin.tests,
}
(OUTPUT / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({key: report[key] for key in ('exit_code', 'counts', 'seconds', 'gdal_stub', 'network_guard_attempts')}))
raise SystemExit(exit_code)
