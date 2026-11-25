"""
    @autor: Arthur Correia Flores
    @github: https://github.com/36thChamber
"""
import pandas as pd
import requests
import os
from bs4 import BeautifulSoup
from netCDF4 import Dataset
import numpy as np
import argparse

NOAA_BASE_URL = "https://www.ncei.noaa.gov/data/land-normalized-difference-vegetation-index/access/"

def get_nc_file(year, month, day):
    """Busca o arquivo NetCDF correto na pasta do ano correspondente, independente do prefixo."""
    year_folder = f"{NOAA_BASE_URL}{year}/"
    response = requests.get(year_folder)
    if response.status_code != 200:
        print(f"❌ Erro ao acessar diretório {year_folder}: {response.status_code}")
        return None, None
    
    soup = BeautifulSoup(response.text, 'html.parser')
    expected_date = f"{year}{month:02d}{day:02d}"
    
    for link in soup.find_all('a'):
        file_name = link.get('href')
        if file_name and expected_date in file_name and file_name.endswith(".nc"):
            return year_folder + file_name, file_name  # Retorna a URL completa e o nome do arquivo
    
    print(f"❌ Nenhum arquivo encontrado para {year}-{month}-{day}")
    return None, None

def download_nc_file(url, file_name, data_dir):
    """Baixa o arquivo NetCDF se ainda não estiver disponível localmente."""
    if url:
        os.makedirs(data_dir, exist_ok=True)
        file_path = os.path.join(data_dir, file_name)
        if not os.path.exists(file_path):
            response = requests.get(url)
            if response.status_code == 200:
                with open(file_path, "wb") as f:
                    f.write(response.content)
                print(f"✅ Arquivo {file_name} baixado com sucesso!")
            else:
                print(f"❌ Erro ao baixar {file_name}: {response.status_code}")
                return None
        return file_path
    return None

def get_ndvi_from_nc(file_name, lat, lon):
    """Extrai o NDVI do arquivo NetCDF para uma coordenada específica, tratando _FillValue e interpolando quando necessário."""
    try:
        dataset = Dataset(file_name, "r")

        # Pegar as variáveis
        ndvi = dataset.variables["NDVI"][:]  # Matriz 3D (tempo, lat, lon)
        latitudes = dataset.variables["latitude"][:]
        longitudes = dataset.variables["longitude"][:]

        # Verificar _FillValue
        fill_value = dataset.variables["NDVI"]._FillValue if "_FillValue" in dataset.variables["NDVI"].ncattrs() else None

        # Encontrar os índices mais próximos
        lat_idx = np.abs(latitudes - lat).argmin()
        lon_idx = np.abs(longitudes - lon).argmin()

        # Extrair NDVI
        ndvi_value = ndvi[0, lat_idx, lon_idx]  # Pegando o primeiro índice de tempo

        # Se o valor for _FillValue, tentar interpolação
        if fill_value is not None and ndvi_value == fill_value:
            print(f"⚠️ NDVI para ({lat}, {lon}) é _FillValue! Tentando interpolação...")

            # Pegar os vizinhos mais próximos e calcular média (ignorando valores errados)
            vizinhos = ndvi[0, lat_idx-1:lat_idx+2, lon_idx-1:lon_idx+2]
            vizinhos_validos = vizinhos[vizinhos != fill_value]

            if vizinhos_validos.size > 0:
                interpolated_ndvi = np.mean(vizinhos_validos)
                print(f"🔄 NDVI interpolado para ({lat}, {lon}): {interpolated_ndvi}")
                ndvi_value = interpolated_ndvi
            else:
                print("❌ Não há vizinhos válidos para interpolação!")

        dataset.close()
        return ndvi_value

    except Exception as e:
        print(f"⚠️ Erro ao processar {file_name}: {e}")
        return None

import calendar
import xarray as xr


def _monthly_nc_files(year: int, month: int, data_dir: str) -> list[str]:
    """Baixa (com cache) todos os NDVI diários do MÊS e retorna os caminhos locais."""
    files: list[str] = []
    n_days = calendar.monthrange(year, month)[1]
    for day in range(1, n_days + 1):
        url, name = get_nc_file(year, month, day)
        if not url:
            continue
        fp = download_nc_file(url, name, data_dir)
        if fp:
            files.append(fp)
    return files


def _positive_monthly_mean(files: list[str], lats, lons):
    """
    Para cada ponto, amostra o NDVI (vizinho mais próximo) em cada dia do mês,
    mantém APENAS os valores POSITIVOS (descarta negativos = nuvem/água/neve e
    os `_FillValue`, já convertidos em NaN pelo xarray) e devolve a MÉDIA dos
    positivos + a contagem de dias válidos por ponto.
    """
    lats = np.asarray(lats, dtype=float)
    lons = np.asarray(lons, dtype=float)
    n = len(lats)
    ssum = np.zeros(n)
    scount = np.zeros(n)
    latd = xr.DataArray(lats, dims="points")
    lond = xr.DataArray(lons, dims="points")

    for fp in files:
        try:
            # mask_and_scale=True (padrão): aplica scale_factor e transforma
            # _FillValue em NaN — corrige a comparação de fill crua da versão antiga.
            with xr.open_dataset(fp) as ds:
                da = ds["NDVI"]
                if "time" in da.dims:
                    da = da.isel(time=0)
                vals = da.sel(latitude=latd, longitude=lond,
                              method="nearest").values.reshape(-1)
        except Exception as e:  # noqa: BLE001 - um dia ruim não derruba o mês
            print(f"⚠️  Ignorando {os.path.basename(fp)}: {e}")
            continue
        pos = np.isfinite(vals) & (vals > 0)
        ssum[pos] += vals[pos]
        scount[pos] += 1

    mean = np.where(scount > 0, ssum / np.maximum(scount, 1), np.nan)
    return mean, scount


def run_cmd(args: argparse.Namespace):
    csv_file = args.csv
    data_dir = args.data_dir
    df = pd.read_csv(csv_file)
    df["ndvi"] = np.nan
    df["ndvi_dias_validos"] = 0

    # Agrupa por (ano, mês): os arquivos diários do mês são baixados UMA vez e
    # reaproveitados por todos os registros daquele mês.
    df["_ym"] = list(zip(df["year"].astype(int), df["month"].astype(int)))
    for (year, month), grp in df.groupby("_ym"):
        print(f"📅 {year}-{month:02d}: {len(grp)} registro(s) — baixando NDVI diário do mês...")
        files = _monthly_nc_files(int(year), int(month), data_dir)
        if not files:
            print(f"   ❌ Nenhum NDVI diário encontrado para {year}-{month:02d}.")
            continue
        mean, count = _positive_monthly_mean(
            files, grp["decimalLatitude"].to_numpy(), grp["decimalLongitude"].to_numpy()
        )
        df.loc[grp.index, "ndvi"] = mean
        df.loc[grp.index, "ndvi_dias_validos"] = count.astype(int)
        print(f"   ✅ {int((count > 0).sum())}/{len(grp)} pontos com NDVI positivo (média mensal).")

    df.drop(columns=["_ym"], inplace=True)
    output_filename = f"out_ndvi_{os.path.basename(csv_file)}"
    df.to_csv(output_filename, index=False)
    print(f"✅ Processo finalizado! NDVI (média mensal dos positivos) salvo em '{output_filename}'.")
