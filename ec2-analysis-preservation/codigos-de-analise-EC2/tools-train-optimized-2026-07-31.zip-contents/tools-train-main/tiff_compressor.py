#!/usr/bin/env python3
import os
import argparse
import logging

import numpy as np
import rasterio

logging.basicConfig(level=logging.INFO, format='[tiff_compressor.py] %(message)s')

def run_cmd(tif_path: str, tif_output_path: str = 'output.tif', precision: int = 2, algo: str = 'ZSTD'):
    if algo not in ['DEFLATE', 'ZSTD']:
        raise ValueError("Algoritmo de compressão deve ser 'DEFLATE' ou 'ZSTD'.")

    with rasterio.open(tif_path) as src:
        profile = src.profile.copy()
        band_descriptions = src.descriptions

        bands_data = src.read(out_dtype='float32')
        np.round(bands_data, decimals=precision, out=bands_data)

        profile.update({
            'compress': algo,
            'predictor': 2,
            'zlevel': 9,
            'tiled': True,
            'blockxsize': 256,
            'blockysize': 256,
            'interleave': 'band',
            'dtype': 'float32'
        })

    with rasterio.open(tif_output_path, 'w', **profile) as dst:
        dst.write(bands_data)
        for i, desc in enumerate(band_descriptions):
            if desc:
                dst.set_band_description(i + 1, desc)

    size_input = os.path.getsize(tif_path)
    size_output = os.path.getsize(tif_output_path)
    size_diff = size_input - size_output

    logging.info(f"TIFF salvo com sucesso: {tif_output_path}")
    logging.info(f"Arredondando valores para {precision} casas decimais...")
    logging.info(f"Tamanho do arquivo de entrada: {tif_path} - {size_input / (1024 ** 2):.2f} MB")
    logging.info(f"Tamanho do arquivo de saída: {tif_output_path} - {size_output / (1024 ** 2):.2f} MB")
    logging.info(f"Diferença de tamanho: {size_diff} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Arredonda valores e salva TIFF mantendo resolução e CRS.')
    parser.add_argument('tif_path', type=str, help='Arquivo TIFF de entrada.')
    parser.add_argument('--tif_output_path', type=str, default='output.tif', help='Arquivo TIFF de saída.')
    parser.add_argument('--precision', type=int, default=2, help='Casas decimais para arredondar valores.')
    parser.add_argument('--algo', type=str, default='ZSTD', help='Algoritmo de compressão (DEFLATE,ZSTD).')

    args = parser.parse_args()
    run_cmd(args.tif_path, args.tif_output_path, args.precision,args.algo)
