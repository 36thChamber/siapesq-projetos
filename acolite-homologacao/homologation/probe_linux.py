import importlib.util
import json
import os
from pathlib import Path
import platform
import subprocess
import sys

from osgeo import gdal

def capture(args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=10)
    return {"exit": result.returncode, "stdout": result.stdout.strip(), "stderr": result.stderr.strip()}

print(json.dumps({
    "platform": platform.platform(), "python": sys.version, "executable": sys.executable,
    "gdal": gdal.VersionInfo("--version"), "gdal_config": capture(["gdal-config", "--version"]),
    "packages": {name: bool(importlib.util.find_spec(name)) for name in [
        "rasterio", "numpy", "xarray", "pytest", "openeo", "netCDF4", "rioxarray", "scipy", "dotenv", "discord", "sentinelhub"]},
    "build_tools": {name: capture(["/bin/sh", "-c", "command -v " + name]) for name in ["gcc", "g++", "python3-config", "pip3"]},
    "config_presence": {name: bool(os.getenv(name)) for name in ["OPENEO_BACKEND_URL", "OPENEO_CLIENT_ID", "OPENEO_CLIENT_SECRET"]},
}, indent=2))
