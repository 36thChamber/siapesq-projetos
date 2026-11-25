"""Local Windows harness: native clipping is never exercised by these tests."""
from pathlib import Path
import os
import sys
import types

root = Path(__file__).resolve().parent
sys.path[:0] = [str(root / 'acolite-batch-fix'), str(root / '.test-deps')]
os.environ['PYTHONPATH'] = os.pathsep.join([
    str(root / '.test-deps'), str(root / 'acolite-batch-fix'), os.environ.get('PYTHONPATH', '')])
try:
    import osgeo.gdal
except ImportError:
    osgeo = types.ModuleType('osgeo')
    gdal = types.ModuleType('osgeo.gdal')
    gdal.UseExceptions = lambda: None
    def forbidden_warp(*args, **kwargs):
        raise AssertionError('Native GDAL clipping is outside this offline test harness')
    gdal.Warp = forbidden_warp
    osgeo.gdal = gdal
    sys.modules.update({'osgeo': osgeo, 'osgeo.gdal': gdal})
    print('GDAL import stub active; native clipping is forbidden.')

import pytest
raise SystemExit(pytest.main(sys.argv[1:]))
