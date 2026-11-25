import pandas as pd
import xarray as xr
import argparse
import numpy as np
import os
import psycopg2
from dotenv import load_dotenv
from global_land_mask import globe
import logging
from datetime import datetime

load_dotenv()

DB_PARAMS = {
    'host':     os.getenv('POSTGRES_HOST',   'localhost'),
    'port':     os.getenv('POSTGRES_PORT',   '5432'),
    'dbname':   os.getenv('POSTGRES_DB',     'postgres'),
    'user':     os.getenv('POSTGRES_USER',   'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD','')
}

def setup_logging():
    # define the log filename with a timestamp
    log_filename = f"depth_GEBCO_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

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

    # set logging levels for specific libraries
    logging.getLogger("urllib3.connectionpool").setLevel(logging.ERROR)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

def connect_db():
    conn = psycopg2.connect(**DB_PARAMS)
    conn.autocommit = False
    return conn

def insert_depth(conn, data_date, lat, lon, depth_value):
    if depth_value is None or np.isnan(depth_value):
        return
    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO cmarine_data (data_date, latitude, longitude, variable_type_id, var_value)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (data_date, lat, lon, 4, depth_value) # ID = 4 para "depth"
        )
        conn.commit()

def get_nearest_valid_depth(var, lon, lat):
    # try to get the nearest point with a valid depth value
    valor = var.sel(lon=lon, lat=lat, method="nearest").values.item()
    logging.info(f"Profundidade inicial obtida: {valor} para coordenadas ({lat}, {lon})")
    if valor < 0 and not np.isnan(valor):
        logging.info(f"Profundidade válida: {valor} em ({lat}, {lon})")
        return round(valor, 5)
    
    # If the nearest point is not valid, search around it
    # Get the indices of the longitude and latitude arrays
    lons = var.lon.values
    lats = var.lat.values
    lon_idx = np.abs(lons - lon).argmin()
    lat_idx = np.abs(lats - lat).argmin()

    # define a search grid of 3x3 points around the nearest point
    idx_lon = (np.abs(lons - lon)).argmin()
    idx_lat = (np.abs(lats - lat)).argmin()
    # loop to find a valid depth value:
    logging.info(f"Procurando profundidade válida em torno de ({lat}, {lon})")
    for dlat in [-1, 0, 1]:
        for dlon in [-1, 0, 1]:
            ilat = idx_lat + dlat
            ilon = idx_lon + dlon
            if 0 <= ilat < len(lats) and 0 <= ilon < len(lons):
                lat2 = lats[ilat]
                lon2 = lons[ilon]
                valor2 = var.values[ilat, ilon].item()
                #if valor2 < 0: # here only filtering negative values
                if not globe.is_land(lat2, lon2) and not np.isnan(valor2): # here verifying if it's not land
                    logging.info(f"Profundidade válida: {valor2} em ({lat2}, {lon2}). Valores originais eram ({lat}, {lon}) com depth {valor}. Máscara is_land() retorna {globe.is_land(lat2, lon2)}")
                    return float(valor2)
    # If no valid depth value is found, return the original value
    logging.warning(f"Nenhuma profundidade válida encontrada em torno de ({lat}, {lon}). Retornando o valor original: {valor}")
    return valor
    
def run_cmd(args: argparse.Namespace):
    setup_logging()
    csv = args.csv
    MINIMAL_DEPTH = args.minimal_depth
    netcdf = args.bathmetry_netcdf
    use_db = getattr(args, "db", False)

    logging.info(f"Lendo CSV: {csv}")
    df = pd.read_csv(csv)

    logging.info(f"Lendo NetCDF: {netcdf}")
    with xr.open_dataset(netcdf) as ds:
        
        depths = []
        conn = connect_db() if use_db else None

        var = ds["elevation"]

        for idx, row in df.iterrows():
            try:
                lon = float(row.get("decimalLongitude"))
                lat = float(row.get("decimalLatitude"))

                #valor = var.sel(lon=lon, lat=lat, method="nearest").values.item()
                # New method to get the nearest valid depth
                valor = get_nearest_valid_depth(var, lon, lat)

                # if not (ds.lon.min().values <= lon <= ds.lon.max().values) or not (ds.lat.min().values <= lat <= ds.lat.max().values):
                #     logging.warning(f"Coordenada ({lat}, {lon}) fora do domínio do NetCDF.")
                #     depths.append(np.nan)
                #     continue
                
                logging.info(f" > lat: {lat} lon: {lon} elevation: {valor} | is_land: {globe.is_land(lat, lon)}")

                #if valor is not None and not np.isnan(valor) and abs(valor) >= MINIMAL_DEPTH and valor < 0:
                if valor is not None and not np.isnan(valor):
                    depths.append(round(valor, 5))
                    if conn:
                        data_date = row.get("data_date") if "data_date" in row else None
                        if data_date is None and all(k in row for k in ["year", "month", "day"]):
                            data_date = f"{int(row['year']):04d}-{int(row['month']):02d}-{int(row['day']):02d}"
                        insert_depth(conn, data_date, lat, lon, valor)
                else:
                    logging.info(f"Valor inválido ou fora do intervalo: {valor} em ({lat}, {lon})")
                    depths.append(np.nan)
            except Exception as e:
                logging.error(f"Erro ao interpolar profundidade em ({lat}, {lon}): {e}")
                depths.append(np.nan)
        if conn:
            conn.close()

    # counting valid depths
    df["depth"] = depths
    # drop NaN values
    df = df.dropna(subset=["depth"])
    logging.info(f"Registros com profundidade válida: {df['depth'].notna().sum()} / {len(df)}")
    output_filename = f"out_depth_{os.path.basename(csv)}"
    df.to_csv(output_filename, index=False)
    logging.info(f"Arquivo salvo: {output_filename}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Adiciona profundidade interpolada ao CSV e ao banco de dados")
    parser.add_argument("--csv", required=True, help="CSV de entrada")
    parser.add_argument("--bathmetry_netcdf", required=True, help="Arquivo NetCDF de batimetria")
    parser.add_argument("--minimal_depth", type=float, default=0.0, help="Profundidade mínima")
    parser.add_argument("--db", action="store_true", help="Se definido, insere no banco de dados")
    args = parser.parse_args()
    run_cmd(args)