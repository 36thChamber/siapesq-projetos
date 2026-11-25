"""
NDVI downloader ULTRA otimizado + autocorreção de NetCDF corrompido
"""

import pandas as pd
import requests
import os
from bs4 import BeautifulSoup
from netCDF4 import Dataset
import numpy as np
import argparse
import time

NOAA_BASE_URL = "https://www.ncei.noaa.gov/data/land-normalized-difference-vegetation-index/access/"

year_index_cache = {}

########################################
# REQUEST ROBUSTO
########################################

def safe_request(url, stream=False):

    while True:
        try:

            r = requests.get(url, stream=stream, timeout=120)

            if r.status_code == 200:
                return r

            print(f"⚠️ servidor respondeu {r.status_code}")
            time.sleep(30)

        except requests.exceptions.RequestException as e:

            print("⚠️ erro de conexão:", e)
            print("aguardando internet voltar...")
            time.sleep(60)


########################################
# INDEXAR ARQUIVOS DO ANO
########################################

def build_year_index(year):

    if year in year_index_cache:
        return year_index_cache[year]

    print(f"📂 indexando ano {year}")

    url = f"{NOAA_BASE_URL}{year}/"

    r = safe_request(url)

    soup = BeautifulSoup(r.text, "html.parser")

    index = {}

    for link in soup.find_all("a"):

        file = link.get("href")

        if file and file.endswith(".nc"):

            date = file.split("_")[-2]

            index[date] = file

    year_index_cache[year] = index

    return index


########################################
# DOWNLOAD
########################################

def download_nc(url, filename, data_dir):

    os.makedirs(data_dir, exist_ok=True)

    path = os.path.join(data_dir, filename)

    if os.path.exists(path):

        # detectar arquivo incompleto
        if os.path.getsize(path) < 1000000:
            print("⚠️ arquivo suspeito pequeno, removendo")
            os.remove(path)
        else:
            return path

    print("⬇️ baixando", filename)

    while True:

        try:

            r = safe_request(url, stream=True)

            with open(path, "wb") as f:

                for chunk in r.iter_content(1024*1024):

                    if chunk:
                        f.write(chunk)

            print("✅ download concluído")

            return path

        except Exception as e:

            print("⚠️ falha no download:", e)
            time.sleep(60)


########################################
# EXTRAIR NDVI
########################################

def extract_ndvi_batch(nc_file, rows):

    results = {}

    try:

        ds = Dataset(nc_file)

    except Exception as e:

        print("⚠️ NetCDF corrompido:", nc_file)
        print("removendo arquivo...")

        try:
            os.remove(nc_file)
        except:
            pass

        return None

    try:

        ndvi = ds.variables["NDVI"][:]
        latitudes = ds.variables["latitude"][:]
        longitudes = ds.variables["longitude"][:]

        fill_value = ds.variables["NDVI"]._FillValue

        for idx, lat, lon in rows:

            lat_idx = np.abs(latitudes - lat).argmin()
            lon_idx = np.abs(longitudes - lon).argmin()

            value = ndvi[0, lat_idx, lon_idx]

            if value == fill_value:

                viz = ndvi[0, lat_idx-1:lat_idx+2, lon_idx-1:lon_idx+2]
                viz = viz[viz != fill_value]

                if viz.size > 0:
                    value = np.mean(viz)
                else:
                    value = None

            results[idx] = value

        ds.close()

    except Exception as e:

        print("⚠️ erro lendo netcdf:", e)

        ds.close()

        for idx, _, _ in rows:
            results[idx] = None

    return results


########################################
# MAIN
########################################

def run_cmd(args):

    csv_file = args.csv
    data_dir = args.data_dir

    df = pd.read_csv(csv_file)

    if "ndvi" not in df.columns:
        df["ndvi"] = np.nan

    ####################################
    # descobrir anos únicos
    ####################################

    years = df["year"].unique()

    print("📊 anos encontrados:", years)

    for y in years:
        build_year_index(int(y))

    ####################################
    # agrupar linhas por data
    ####################################

    date_groups = {}

    for i, row in df.iterrows():

        if pd.notna(row["ndvi"]):
            continue

        year = int(row["year"])
        month = int(row["month"])
        day = int(row["day"])

        key = f"{year}{month:02d}{day:02d}"

        if key not in date_groups:
            date_groups[key] = []

        date_groups[key].append((i, row["decimalLatitude"], row["decimalLongitude"]))

    ####################################
    # processar datas únicas
    ####################################

    total_dates = len(date_groups)

    for n, (date_key, rows) in enumerate(date_groups.items(), 1):

        year = int(date_key[:4])

        print(f"\nProcessando data {n}/{total_dates} → {date_key}")

        index = year_index_cache[year]

        if date_key not in index:
            print("⚠️ arquivo não encontrado")
            continue

        filename = index[date_key]

        url = f"{NOAA_BASE_URL}{year}/{filename}"

        while True:

            local_nc = download_nc(url, filename, data_dir)

            results = extract_ndvi_batch(local_nc, rows)

            if results is None:
                print("🔄 tentando baixar novamente...")
                time.sleep(5)
                continue

            break

        for idx, value in results.items():
            df.at[idx, "ndvi"] = value

    ####################################
    # remover linhas sem NDVI
    ####################################

    df = df.dropna(subset=["ndvi"])

    output = f"out_ndvi_{os.path.basename(csv_file)}"

    df.to_csv(output, index=False)

    print("\n✅ finalizado")
    print("linhas finais:", len(df))
    print("arquivo:", output)


########################################

def main():

    parser = argparse.ArgumentParser()

    parser.add_argument("--csv", required=True)
    parser.add_argument("--data_dir", default="nc_data")

    args = parser.parse_args()

    run_cmd(args)


if __name__ == "__main__":
    main()