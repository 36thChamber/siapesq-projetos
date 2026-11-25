import pandas as pd
import xarray as xr
import argparse
import numpy as np
import os
from global_land_mask import globe
import logging
from datetime import datetime

def setup_logging():
    # define the log filename with a timestamp
    log_filename = f"altitude_GEBCO_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

    # remove existing handlers to fix logs
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)

    # logging configuration
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_filename, mode='w'),
            logging.StreamHandler()
        ]
    )

def get_nearest_valid_altitude(var, lon, lat):
    # try to get the nearest point with a valid altitude value
    valor = var.sel(lon=lon, lat=lat, method="nearest").values.item()
    logging.info(f"Altitude inicial obtida: {valor} para coordenadas ({lat}, {lon})")
    if not np.isnan(valor): # if the nearest point is valid, return it
        logging.info(f"Altitude válida: {valor} em ({lat}, {lon})")
        return round(valor, 5)
    
    # If the nearest point is not valid, search around it
    # Get the indices of the longitude and latitude arrays
    lons = var.lon.values
    lats = var.lat.values

    # define a search grid of 3x3 points around the nearest point
    idx_lon = (np.abs(lons - lon)).argmin()
    idx_lat = (np.abs(lats - lat)).argmin()
    # loop to find a valid altitude value:
    logging.info(f"Procurando altitude válida em torno de ({lat}, {lon})")
    for dlat in [-1, 0, 1]:
        for dlon in [-1, 0, 1]:
            ilat = idx_lat + dlat
            ilon = idx_lon + dlon
            if 0 <= ilat < len(lats) and 0 <= ilon < len(lons):
                lat2 = lats[ilat]
                lon2 = lons[ilon]
                valor2 = var.isel(lat=ilat, lon=ilon).values.item()
                if globe.is_land(lat2, lon2) and not np.isnan(valor2): # here verifying if it's not land
                    #logging.info(f"Altitude válida: {valor2} em ({lat2}, {lon2}). Valores originais eram ({lat}, {lon}) com altitude {valor}. Máscara is_land() retorna {globe.is_land(lat2, lon2)}")
                    logging.info(f"Altitude válida: {valor2} em ({lat2}, {lon2}). Valores originais eram ({lat}, {lon}) com altitude {valor}.")
                    return float(valor2)
    # If no valid altitude value is found, return the original value
    logging.warning(f"Nenhuma altitude válida encontrada em torno de ({lat}, {lon}). Retornando o valor original: {valor}")
    return valor
    
def run_cmd(args: argparse.Namespace):
    setup_logging()

    csv = args.csv
    netcdf = args.bathymetry_netcdf

    logging.info(f"Lendo CSV: {csv}")
    df = pd.read_csv(csv)

    logging.info(f"Lendo NetCDF: {netcdf}")
    with xr.open_dataset(netcdf) as ds:
        
        altitude = []

        var = ds["elevation"]

        for idx, row in df.iterrows():
            try:
                logging.info(f"Processando linha {idx+1}/{len(df)}")

                lon = float(row.get("decimalLongitude"))
                lat = float(row.get("decimalLatitude"))

                valor = get_nearest_valid_altitude(var, lon, lat)

                logging.info(f" > lat: {lat} lon: {lon} elevation: {valor}.")

                if valor is not None and not np.isnan(valor):
                    altitude.append(round(valor, 5))
                else:
                    logging.info(f"Valor inválido ou fora do intervalo: {valor} em ({lat}, {lon})")
                    altitude.append(np.nan)
            except Exception as e:
                logging.error(f"Erro ao interpolar altitude em ({lat}, {lon}): {e}")
                altitude.append(np.nan)

    # counting valid depths
    df["altitude"] = altitude
    # drop NaN values
    df = df.dropna(subset=["altitude"])
    logging.info(f"Registros com altitude válida: {df['altitude'].notna().sum()} / {len(df)}")
    output_filename = f"out_altitude_{os.path.basename(csv)}"
    df.to_csv(output_filename, index=False)
    logging.info(f"Arquivo salvo: {output_filename}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Adiciona altitude interpolada ao CSV.")
    parser.add_argument("--csv", required=True, help="CSV de entrada")
    parser.add_argument("--bathymetry_netcdf", required=True, help="Arquivo NetCDF de batimetria")
    args = parser.parse_args()
    run_cmd(args)