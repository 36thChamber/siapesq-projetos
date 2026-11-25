"""Conta pixels finitos e válidos da primeira banda dos TIFFs de índices."""
import argparse
import re
from pathlib import Path

import numpy as np
import rasterio

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("pasta", type=Path)
parser.add_argument("--desde", metavar="AAAA_MM_DD")
args = parser.parse_args()
for path in sorted(args.pasta.glob("*_ND*.tif")):
    data = re.search(r"\d{4}_\d{2}_\d{2}", path.stem)
    if args.desde and (not data or data[0] < args.desde):
        continue
    with rasterio.open(path) as raster:
        total = sum(
            np.isfinite(raster.read(1, window=window, masked=True).compressed()).sum()
            for _, window in raster.block_windows(1)
        )
    print(path.name, total)
