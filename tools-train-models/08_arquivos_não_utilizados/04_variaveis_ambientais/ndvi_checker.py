"""
    @autor: Arthur Correia Flores
    @github: https://github.com/36thChamber
"""
import pandas as pd
import numpy as np
import os
from netCDF4 import Dataset
import argparse


def find_nc_file(year, month, day, directory="."):
    """Encontra o arquivo NetCDF correto no diretório local baseado na data."""
    expected_date = f"{year}{month:02d}{day:02d}"
    for file in os.listdir(directory):
        if expected_date in file and file.endswith(".nc"):
            return os.path.join(directory, file)
    return None  # Retorna None se não encontrar

def get_ndvi_from_nc(file_path, lat, lon):
    """Extrai o NDVI do arquivo NetCDF para uma coordenada específica."""
    try:
        dataset = Dataset(file_path, "r")
        ndvi = dataset.variables["NDVI"][:]
        latitudes = dataset.variables["latitude"][:]
        longitudes = dataset.variables["longitude"][:]

        # Encontrar os índices mais próximos
        lat_idx = np.abs(latitudes - lat).argmin()
        lon_idx = np.abs(longitudes - lon).argmin()
        
        # Verificar _FillValue
        ndvi_value = ndvi[0, lat_idx, lon_idx]
        fill_value = dataset.variables["NDVI"]._FillValue if "_FillValue" in dataset.variables["NDVI"].ncattrs() else None

        # Se for um valor inválido, tenta interpolar
        if fill_value is not None and ndvi_value == fill_value:
            vizinhos = ndvi[0, lat_idx-1:lat_idx+2, lon_idx-1:lon_idx+2]
            vizinhos_validos = vizinhos[vizinhos != fill_value]
            ndvi_value = np.mean(vizinhos_validos) if vizinhos_validos.size > 0 else None
        
        dataset.close()
        return ndvi_value
    except Exception as e:
        print(f"⚠️ Erro ao processar {file_path}: {e}")
        return None

def run_cmd(args: argparse.Namespace):
    csv_file=args.csv
    df = pd.read_csv(csv_file)
    ndvi_data = []
    for _, row in df.iterrows():
        lat, lon = row['decimalLatitude'], row['decimalLongitude']
        year, month, day = int(row['year']), int(row['month']), int(row['day'])
        nc_file = find_nc_file(year, month, day)
        ndvi_value = get_ndvi_from_nc(nc_file, lat, lon) if nc_file else None
        ndvi_data.append({"decimalLatitude": lat, "decimalLongitude": lon, "year": year, "month": month, "day": day, "ndvi": ndvi_value})
        print(f"📅 {year}-{month:02d}-{day:02d} | 📍 ({lat}, {lon}) | 🌿 NDVI: {ndvi_value}")


    df_ndvi = pd.DataFrame(ndvi_data)
    df_final = df.merge(df_ndvi, on=["decimalLatitude", "decimalLongitude", "year", "month", "day"], how="left")
    df_final.to_csv("ndvi_analysis_with_ndvi.csv", index=False)
    print("✅ NDVI adicionado ao CSV com sucesso!")
