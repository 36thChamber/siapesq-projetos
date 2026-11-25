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
from functools import reduce


def main(args:argparse.Namespace) -> None:
    """"""
    tiffs_folder = args.path

    tiff_paths = [os.path.join(tiffs_folder, f)
                  for f in os.listdir(tiffs_folder)
                  if f.lower().endswith(".tif")]


    # Lista para armazenar DataFrames individuais de cada variável
    dfs = []

    # Armazena projeções e resoluções para verificação
    projections = []
    resolutions = []

    # Processa cada imagem tif separado
    for tiff_file in tiff_paths:
        # Pega o nome da variavel pelo nome do geotiff
        variable = os.path.splitext(os.path.basename(tiff_file))[0]
        
        dataset = gdal.Open(tiff_file)
        banda = dataset.GetRasterBand(1)
        array = banda.ReadAsArray()
        no_data = banda.GetNoDataValue()
        cols = dataset.RasterXSize
        rows = dataset.RasterYSize
        transform = dataset.GetGeoTransform()
        projection = dataset.GetProjection()
        projections.append(projection)
        resolution = (abs(transform[1]), abs(transform[5]))
        resolutions.append(resolution)

        # Cria as coordenadas dos pixels
        longitudes = np.array([transform[0] + i * transform[1] for i in range(cols)])
        latitudes = np.array([transform[3] + j * transform[5] for j in range(rows)])
        lon_grid, lat_grid = np.meshgrid(longitudes, latitudes)

        # Cria DataFrame da variável
        df = pd.DataFrame({
            "latitude": lat_grid.ravel(),
            "longitude": lon_grid.ravel(),
            variable: array.ravel()
        })

        # Remove valores NoData
        if no_data is not None:
            df = df[df[variable] != no_data]
        
        dfs.append(df)
    
    # Verificação de consistência espacial entre os arquivos
    assert len(set(projections)) == 1, "Projeções diferentes entre os arquivos GeoTIFF!"

    assert len(set(resolutions)) == 1, "Resoluções espaciais diferentes entre os arquivos GeoTIFF!"

    # Junta todos os DataFrames em um único DataFrame final
    df_final = reduce(
        lambda left, right: pd.merge(left, right, on=["latitude", "longitude"], how="outer"),
        dfs
    )

    if args.output_type == "csv":
        # Exporta para CSV
        output_file = os.path.join(args.output_dir, "extracted_geotiff_variables.csv")
        df_final.to_csv(output_file, index=False)
        print(f"Arquivo CSV exportado com sucesso: {output_file}")
    elif args.output_type == "parquet":
        # Salva em formato Parquet
        output_file = os.path.join(args.output_dir, "extracted_geotiff_variables.parquet")
        df_final.to_parquet(output_file)


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