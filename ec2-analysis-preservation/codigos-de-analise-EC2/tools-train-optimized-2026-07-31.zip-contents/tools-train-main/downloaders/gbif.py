# gbif.py - Download GBIF data
# Faz download de dados do GBIF para uma espécie especcífica
# Utiliza occurrences.download para baixar os dados como um arquivo ZIP
# e depois extrai os dados relevantes para um CSV
# 
# -> Necessita autenticação no GBIF:
#    É necessário um arquivo .env com as seguintes variáveis:
#    GBIF_USER: Nome de usuário do GBIF
#    GBIF_PWD: Senha do GBIF
#    GBIF_EMAIL: Email do GBIF
#
# -> Faz a busca obtendo primeiro a taxonKey da espécie

import os
import time
import pandas as pd
import requests
import zipfile
from pygbif import occurrences
from dotenv import load_dotenv
from pygbif import species
import argparse


load_dotenv()


os.environ["GBIF_USER"] = os.getenv("GBIF_USER")
os.environ["GBIF_PWD"] = os.getenv("GBIF_PWD")
os.environ["GBIF_EMAIL"] = os.getenv("GBIF_EMAIL")

def get_taxon_key(nome_especie:str):
    resultado = species.name_backbone(name=nome_especie)
    if "usageKey" in resultado:
        return resultado["usageKey"]
    else:
        raise ValueError(f"TaxonKey não encontrado para '{nome_especie}'")
    
def get_genus_key(genus_name: str) -> int:
    res = species.name_backbone(name=genus_name, rank="GENUS")
    if "usageKey" in res:
        return res["usageKey"]
    raise ValueError(f"Gênero '{genus_name}' não encontrado.")

def download_and_extract_zip(download_key:str,zip_path:str, output_dir:str):
    print("Baixando arquivo .zip...")
    zip_url = f"https://api.gbif.org/v1/occurrence/download/request/{download_key}.zip"
    r = requests.get(zip_url)
    with open(zip_path, "wb") as f:
        f.write(r.content)
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(output_dir)


def download_gbif_data(
    species_name:str,
    lon_range:tuple[float]=(-180, 180),
    lat_range:tuple[float]=(-90, 90),
    year_range:tuple[float]=(2000, 2024),
    output_dir="gbif",
    limit:int=100
):
    """
    Faz download de ocorrências do GBIF para a espécie informada em species_name.
    
    """
    taxon_key = get_taxon_key(species_name)

    query = {
        "type": "and",
        "predicates": [
            {"type": "equals", "key": "TAXON_KEY", "value": str(taxon_key)},
            {"type": "greaterThanOrEquals", "key": "YEAR", "value": str(year_range[0])},
            {"type": "lessThanOrEquals", "key": "YEAR", "value": str(year_range[1])},
            {"type": "greaterThanOrEquals", "key": "DECIMAL_LATITUDE", "value": str(lat_range[0])},
            {"type": "lessThanOrEquals", "key": "DECIMAL_LATITUDE", "value": str(lat_range[1])},
            {"type": "greaterThanOrEquals", "key": "DECIMAL_LONGITUDE", "value": str(lon_range[0])},
            {"type": "lessThanOrEquals", "key": "DECIMAL_LONGITUDE", "value": str(lon_range[1])},
            {"type": "equals", "key": "HAS_COORDINATE", "value": "true"}
        ]
    }

    print(f"Buscando dados para {species_name} com taxonKey {taxon_key}...")
    print(f"Coordenadas: {lon_range}, {lat_range}")
    print(f"Ano: {year_range}")
    print(f"Limite: {limit}")
    print(f"Diretório de saída: {output_dir}")
    print("Solicitando download ao GBIF...")
    download_key, metadata = occurrences.download(query)
    print(f"Download requisitado com chave: {download_key}")
    print(f"Aguardando download...")
    while True:
        status = occurrences.download_meta(download_key)["status"]
        print(f"Status do download: {status}")
        if status == "SUCCEEDED":
            break
        elif status == "FAILED":
            raise RuntimeError("O download falhou.")
        time.sleep(10)

    os.makedirs(output_dir, exist_ok=True)
    
    zip_path = os.path.join(output_dir, f"{download_key}.zip")
    download_and_extract_zip(download_key, zip_path, output_dir)

    csv_file = os.path.join(output_dir, f"{download_key}.csv")
    df = pd.read_csv(csv_file, sep='\t', usecols=["decimalLongitude", "decimalLatitude", "year", "day", "month"])
    df = df.dropna()
    df = df.drop_duplicates(subset=["decimalLongitude", "decimalLatitude", "year", "day", "month"])
    df = df.head(limit)

    output_csv = os.path.join(output_dir, f"{species_name.replace(' ', '_')}_GBIF_Data.csv")
    df.to_csv(output_csv, index=False)
    print(f"Finalizado. Dados salvos em: {output_csv}")
    
    os.remove(zip_path)
    os.remove(csv_file)
    return df

def download_gbif_genus(
    genus_name: str,
    lon_range: tuple[float] = (-180, 180),
    lat_range: tuple[float] = (-90, 90),
    year_range: tuple[int] = (2000, 2024),
    output_dir: str = "gbif",
    limit: int = 100
):
    """
    Faz download de ocorrências do GBIF para TODOS os taxonskeys dentro do gênero genus_name.
    Tem a mesma lõgica de download_gbif_data, mas para gênero.
    """
    genus_key = get_genus_key(genus_name)

    query = {
        "type": "and",
        "predicates": [
            {"type": "equals", "key": "GENUS_KEY", "value": str(genus_key)},
            {"type": "greaterThanOrEquals", "key": "YEAR", "value": str(year_range[0])},
            {"type": "lessThanOrEquals", "key": "YEAR", "value": str(year_range[1])},
            {"type": "greaterThanOrEquals", "key": "DECIMAL_LATITUDE",  "value": str(lat_range[0])},
            {"type": "lessThanOrEquals",    "key": "DECIMAL_LATITUDE",  "value": str(lat_range[1])},
            {"type": "greaterThanOrEquals", "key": "DECIMAL_LONGITUDE", "value": str(lon_range[0])},
            {"type": "lessThanOrEquals",    "key": "DECIMAL_LONGITUDE", "value": str(lon_range[1])},
            {"type": "equals", "key": "HAS_COORDINATE", "value": "true"}
        ]
    }

    print(f"Buscando dados para gênero {genus_name} (genusKey {genus_key})...")
    print(f"Coordenadas: {lon_range}, {lat_range}")
    print(f"Ano: {year_range}")
    print(f"Limite: {limit}")
    print(f"Diretório de saída: {output_dir}")
    print("Solicitando download ao GBIF...")
    download_key, metadata = occurrences.download(query)
    print(f"Download requisitado com chave: {download_key}")
    print(f"Aguardando download...")
    while True:
        status = occurrences.download_meta(download_key)["status"]
        print(f"Status do download: {status}")
        if status == "SUCCEEDED":
            break
        elif status == "FAILED":
            raise RuntimeError("O download falhou.")
        time.sleep(10)

    os.makedirs(output_dir, exist_ok=True)

    zip_path = os.path.join(output_dir, f"{download_key}.zip")
    download_and_extract_zip(download_key, zip_path, output_dir)

    csv_file = os.path.join(output_dir, f"{download_key}.csv")
    df = pd.read_csv(csv_file, sep='\t', usecols=["decimalLongitude", "decimalLatitude", "year", "day", "month"])
    df = df.dropna()
    df = df.drop_duplicates(subset=["decimalLongitude", "decimalLatitude", "year", "day", "month"])
    df = df.head(limit)

    output_csv = os.path.join(output_dir, f"{genus_name.replace(' ', '_')}_GENUS_GBIF_Data.csv")
    df.to_csv(output_csv, index=False)
    print(f"Finalizado. Dados salvos em: {output_csv}")

    os.remove(zip_path)
    os.remove(csv_file)
    return df

def run_cmd(args: argparse.Namespace):
    species_name = args.species_name
    genus_name = args.genus_name
    min_lon = args.min_lon
    min_lat = args.min_lat
    max_lon = args.max_lon
    max_lat = args.max_lat
    min_year = args.min_year
    max_year = args.max_year
    output_dir = args.output_dir
    limit = args.limit

    if genus_name:  # if has genus_name argument, use to download data for the genus
        download_gbif_genus(
            genus_name=genus_name,
            lon_range=(min_lon, max_lon),
            lat_range=(min_lat, max_lat),
            year_range=(min_year, max_year),
            output_dir=output_dir,
            limit=limit
        )
    elif species_name: # if has species_name argument, use to download data for the species
        download_gbif_data(
            species_name=species_name,
            lon_range=(min_lon, max_lon),
            lat_range=(min_lat, max_lat),
            year_range=(min_year, max_year),
            output_dir=output_dir,
            limit=limit
        )
    else:
        raise ValueError("No species_name or genus_name!")