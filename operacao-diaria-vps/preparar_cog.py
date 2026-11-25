"""Prepara um COG diário sem perdas e valida o conteúdo antes de publicá-lo localmente."""
import argparse
import math
import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import rasterio


def nodata_key(value):
    return "NaN" if value is not None and math.isnan(value) else value


def verificar(origem, destino):
    with rasterio.open(origem) as a, rasterio.open(destino) as b:
        if b.tags(ns="IMAGE_STRUCTURE").get("LAYOUT") != "COG":
            raise ValueError("Destino sem estrutura COG")
        for atributo in ("width", "height", "count", "crs", "transform", "dtypes", "scales", "offsets", "units", "descriptions", "colorinterp"):
            if getattr(a, atributo) != getattr(b, atributo):
                raise ValueError(f"Metadado divergente: {atributo}")
        if list(map(nodata_key, a.nodatavals)) != list(map(nodata_key, b.nodatavals)):
            raise ValueError("NoData divergente")
        for i in a.indexes:
            for _, janela in b.block_windows(i):
                if a.read(i, window=janela).tobytes() != b.read(i, window=janela).tobytes():
                    raise ValueError(f"Pixels divergentes na banda {i}")
                if not np.array_equal(a.read_masks(i, window=janela), b.read_masks(i, window=janela)):
                    raise ValueError(f"Máscara divergente na banda {i}")


def preparar(origem, destino):
    if origem.resolve() == destino.resolve():
        raise ValueError("Use um destino separado para o derivado")
    destino.parent.mkdir(parents=True, exist_ok=True)
    if destino.exists():
        verificar(origem, destino)
        return
    with tempfile.TemporaryDirectory(dir=destino.parent) as tmp:
        arquivo = Path(tmp) / "produto.tif"
        subprocess.run(["gdal_translate", "-q", "-of", "COG", "-co", "COMPRESS=DEFLATE",
                        "-co", "BLOCKSIZE=256", "-co", "OVERVIEWS=IGNORE_EXISTING",
                        "-co", "RESAMPLING=NEAREST", str(origem), str(arquivo)], check=True)
        verificar(origem, arquivo)
        try:
            os.link(arquivo, destino)
        except FileExistsError:
            verificar(origem, destino)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("origem", type=Path)
    p.add_argument("destino", type=Path)
    args = p.parse_args()
    preparar(args.origem, args.destino)
