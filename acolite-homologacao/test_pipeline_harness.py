import os
from pathlib import Path
import sys
import types
import uuid

workspace = Path(__file__).resolve().parent
sys.path.insert(0, str(workspace / '.test-deps'))
sys.path.insert(0, str(workspace / 'acolite-batch-fix'))
gdal = types.ModuleType('osgeo.gdal')
gdal.UseExceptions = lambda: None
def forbidden_warp(*args, **kwargs):
    raise AssertionError('GDAL clipping is outside this offline mock test')
gdal.Warp = forbidden_warp
osgeo = types.ModuleType('osgeo')
osgeo.gdal = gdal
sys.modules['osgeo'] = osgeo
sys.modules['osgeo.gdal'] = gdal
os.chdir(workspace / 'acolite-batch-fix')
import pytest
raise SystemExit(pytest.main(['-q', '--tb=short', '--basetemp', str(workspace / ('pytest-pipeline-' + uuid.uuid4().hex))] + (sys.argv[1:] or ['tests/test_pipeline_outcomes.py'])))
