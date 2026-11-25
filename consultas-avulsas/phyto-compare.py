"""Compara grade, pixels e máscaras de dois rasters, independentemente da compressão."""
import argparse
import hashlib
import json

import numpy as np
import rasterio
from rasterio.windows import Window


def assinatura(path):
    pixels = hashlib.sha256()
    masks = hashlib.sha256()
    with rasterio.open(path) as raster:
        for band in raster.indexes:
            for y in range(0, raster.height, 128):
                window = Window(0, y, raster.width, min(128, raster.height - y))
                values = raster.read(band, window=window)
                if np.issubdtype(values.dtype, np.floating):
                    values[np.isnan(values)] = np.nan
                    values[values == 0] = 0
                pixels.update(values.tobytes())
                masks.update(raster.read_masks(band, window=window).tobytes())
        return {
            "shape": [raster.width, raster.height, raster.count],
            "dtype": list(raster.dtypes),
            "crs": raster.crs.to_wkt() if raster.crs else None,
            "transform": list(raster.transform),
            "nodata": [str(value) for value in raster.nodatavals],
            "pixels": pixels.hexdigest(),
            "masks": masks.hexdigest(),
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("referencia")
    parser.add_argument("candidato")
    args = parser.parse_args()
    expected = assinatura(args.referencia)
    actual = assinatura(args.candidato)
    changes = [key for key in expected if actual[key] != expected[key]]
    print(json.dumps(changes))
    raise SystemExit(int(bool(changes)))
