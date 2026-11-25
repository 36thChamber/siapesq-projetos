import openeo
import os
import json
import xarray as xr
import numpy as np
from datetime import datetime
from siapesq.aoi import Aoi


def ler_arquivo_json(path_file: str) -> list[Aoi]:
    if not os.path.exists(path_file):
        raise FileNotFoundError(f"Arquivo JSON '{path_file}' não encontrado.")
    
    with open(path_file, 'r') as file:
        return json.load(file)


def gerar_novo_nome_arquivo(aoi_id: int, ds: xr.Dataset) -> str:
    
    if np.isscalar(ds.t.values):
        valores_t = ds.t.values
    else:
        valores_t = ds.t.values[0]
    valor_selecionado = np.datetime_as_string(valores_t, unit='D')
    valor_formatado = valor_selecionado[:10].replace('-', '_')
    return f"S2_{aoi_id}_{valor_formatado}_MSI_L2A.nc"


def download_netcdf(
    aoi: Aoi,
    start_date: datetime,
    end_date: datetime
) -> str:
    
    backend_url = os.getenv("OPENEO_BACKEND_URL")
    if not backend_url:
        raise ValueError("Variável de ambiente OPENEO_BACKEND_URL não definida.")
    
    client_id = os.getenv("OPENEO_CLIENT_ID")
    if not client_id:
        raise ValueError("Variável de ambiente OPENEO_CLIENT_ID não definida.")
    
    client_secret = os.getenv("OPENEO_CLIENT_SECRET")
    if not client_secret:
        raise ValueError("Variável de ambiente OPENEO_CLIENT_SECRET não definida.")

    connection = openeo.connect(backend_url)
    connection.authenticate_oidc_client_credentials(client_id=client_id, client_secret=client_secret)
    
    loadco3 = connection.load_collection(
        aoi.get('collection_id'),
        temporal_extent=[start_date, end_date],
        spatial_extent=aoi.get('spatial_extent'),
        max_cloud_cover=100
    )
    
    temp_dir = os.path.join("tmp", "netcdf", str(aoi.get('id')))
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    
    arquivo_nc = os.path.join(temp_dir, f"S2_{aoi.get('id')}_MSI_L2A.nc")
    loadco3.download(arquivo_nc)
    print(f"Arquivo baixado em: {arquivo_nc}")
    ds = xr.open_dataset(arquivo_nc)
    times = ds.t.values
    nome_novo = ""
    if len(times) == 1:
        t = times[0]
        ds_time = ds.sel(t=t)
        nome = gerar_novo_nome_arquivo(aoi.get('id'), ds_time)
        nome_novo= os.path.join(temp_dir, nome)
        ds_time.to_netcdf(nome_novo)
        print(f"Imagem processada e salva em: {nome_novo}")
    else:
        for t in times:
            ds_time = ds.sel(t=t)
            nome = gerar_novo_nome_arquivo(aoi.get('id'), ds_time)
            nome_novo= os.path.join(temp_dir, nome)
            ds_time.to_netcdf(nome_novo)
            print(f"Imagem processada e salva em: {nome_novo}")
    ds.close()
    os.remove(arquivo_nc)
    return nome_novo
