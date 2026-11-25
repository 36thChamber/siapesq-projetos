#!/usr/bin/env python3
# netcdf_extrator.py
# Extracts environmental data from a GeoTIFF image and returns as a csv/parquet file.
try:
    from osgeo import gdal # GDAL testado 3.6.4

except ModuleNotFoundError:
    print("Erro ao importar a biblioteca gdal de osgeo.\
            \nA versão gdal utilizada nesse programa é a 3.6.4")
    import sys
    # Terminando com erro
    sys.exit(1)

import argparse
import os
import pandas as pd
import numpy as np # 2.0.2


def main(args:argparse.Namespace) -> None:
    """
    Extrai as variáveis de vários GeoTIFFs ALINHADOS (mesma projeção/transform/tamanho)
    para uma tabela [latitude, longitude, var1, var2, ...], processando em BLOCOS de
    linhas (streaming) — seguro em memória mesmo para rasters continentais.

    Antes: materializava a grade inteira de CADA raster num DataFrame e fazia
    `outer-merge` por floats de lat/lon → estouro de memória e junção frágil. Agora
    as grades são alinhadas por ÍNDICE INTEIRO de pixel (sem merge): cada faixa é lida,
    empilhada por coluna, os pixels totalmente-NoData são descartados, e o resultado
    é ESCRITO INCREMENTALMENTE (CSV append / Parquet streaming).
    """
    tiff_paths = sorted(os.path.join(args.path, f)
                        for f in os.listdir(args.path)
                        if f.lower().endswith(".tif"))
    if not tiff_paths:
        raise FileNotFoundError(f"Nenhum .tif em {args.path}")

    variables = [os.path.splitext(os.path.basename(p))[0] for p in tiff_paths]
    datasets = [gdal.Open(p) for p in tiff_paths]

    # Alinhamento OBRIGATÓRIO (projeção + geotransform + tamanho) — habilita o
    # empilhamento por índice sem merge por float. Grades diferentes → reamostrar antes.
    ref = datasets[0]
    proj, transform = ref.GetProjection(), ref.GetGeoTransform()
    cols, rows = ref.RasterXSize, ref.RasterYSize
    for var, ds in zip(variables[1:], datasets[1:]):
        if ds.GetProjection() != proj:
            raise AssertionError(f"Projeção diferente em '{var}'.")
        if ds.GetGeoTransform() != transform or ds.RasterXSize != cols or ds.RasterYSize != rows:
            raise AssertionError(f"Grade desalinhada em '{var}' (transform/tamanho) — "
                                 f"reamostre para a mesma grade antes de extrair.")

    bands = [ds.GetRasterBand(1) for ds in datasets]
    nodata = [b.GetNoDataValue() for b in bands]
    lons = transform[0] + np.arange(cols) * transform[1]  # convenção original (canto)
    strip = max(1, min(rows, 2_000_000 // max(cols, 1)))   # ~2M px por bloco

    os.makedirs(args.output_dir, exist_ok=True)
    is_csv = args.output_type == "csv"
    ext = "csv" if is_csv else "parquet"
    out_file = os.path.join(args.output_dir, f"extracted_geotiff_variables.{ext}")
    writer = None
    first = True

    for r0 in range(0, rows, strip):
        h = min(strip, rows - r0)
        lat = transform[3] + np.arange(r0, r0 + h) * transform[5]
        data = {"latitude": np.repeat(lat, cols), "longitude": np.tile(lons, h)}
        keep = np.zeros(h * cols, dtype=bool)
        for var, band, nd in zip(variables, bands, nodata):
            arr = band.ReadAsArray(0, r0, cols, h).ravel().astype("float64")
            if nd is not None:
                arr[arr == nd] = np.nan
            data[var] = arr
            keep |= np.isfinite(arr)
        strip_df = pd.DataFrame(data)[keep]  # descarta pixels totalmente NoData
        if strip_df.empty:
            continue
        if is_csv:
            strip_df.to_csv(out_file, index=False, mode="w" if first else "a", header=first)
        else:
            import pyarrow as pa
            import pyarrow.parquet as pq
            table = pa.Table.from_pandas(strip_df, preserve_index=False)
            if writer is None:
                writer = pq.ParquetWriter(out_file, table.schema)
            writer.write_table(table)
        first = False

    if writer is not None:
        writer.close()
    print(f"Arquivo {ext.upper()} exportado: {out_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Extract data from GeoTIFF file and save it"
        )
    parser.add_argument(
        "--path", 
        type=str, 
        required=True, 
        help="path to GeoTIFFs images"
        )
    
    parser.add_argument(
        '--output_dir',
        type=str, 
        help='Path to the directory to save the data\
              from GBIF(default: current directory/gbif)',
        required=False,
        default=f"{os.getcwd()}"
        )
    
    parser.add_argument(
        "--output_type",
        type=str,
        required=False,
        default="csv",
        help="Output file type, default is csv. Accepted type: csv or parquet"
    )

    args = parser.parse_args()
    main(args)