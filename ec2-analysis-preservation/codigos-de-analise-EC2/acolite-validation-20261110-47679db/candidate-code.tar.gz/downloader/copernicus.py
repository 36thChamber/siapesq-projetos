import openeo
import os
import xarray as xr
import numpy as np
from datetime import datetime
from siapesq.aoi import Aoi
from downloader.batch import BatchJobError, download_batch_netcdf

def gerar_novo_nome_arquivo(aoi_id: int, ds: xr.Dataset, include_time: bool = False) -> str:
    
    if np.isscalar(ds.t.values):
        valores_t = ds.t.values
    else:
        valores_t = ds.t.values[0]
    valor_selecionado = np.datetime_as_string(valores_t, unit='D')
    valor_formatado = valor_selecionado[:10].replace('-', '_')
    if include_time:
        valor_hora = np.datetime_as_string(valores_t, unit='ns').split("T")[-1]
        valor_hora = valor_hora.rstrip('0').rstrip('.') if '.' in valor_hora else valor_hora
        valor_hora = valor_hora.replace(":", "_").replace(".", "_")
        return f"S2_{aoi_id}_{valor_formatado}_MSI_L2A_{valor_hora}.nc"
    return f"S2_{aoi_id}_{valor_formatado}_MSI_L2A.nc"


def download_netcdf(
    aoi: Aoi,
    start_date: datetime,
    end_date: datetime,
    temporal_mode: str = "LATEST"
) -> list[str]:
    
    backend_url = os.getenv("OPENEO_BACKEND_URL")
    if not backend_url:
        raise ValueError("Variável de ambiente OPENEO_BACKEND_URL não definida.")
    
    client_id = os.getenv("OPENEO_CLIENT_ID")
    if not client_id:
        raise ValueError("Variável de ambiente OPENEO_CLIENT_ID não definida.")
    
    client_secret = os.getenv("OPENEO_CLIENT_SECRET")
    if not client_secret:
        raise ValueError("Variável de ambiente OPENEO_CLIENT_SECRET não definida.")

    try:
        connection = openeo.connect(backend_url, default_timeout=60)
        connection.authenticate_oidc_client_credentials(client_id=client_id, client_secret=client_secret)
    except Exception:
        raise BatchJobError("Falha ao conectar/autenticar openEO; confira configuração e logs privados do provedor.") from None
    
    loadco3 = connection.load_collection(
        aoi.get('collection_id'),
        temporal_extent=[start_date, end_date],
        spatial_extent=aoi.get('spatial_extent'),
        max_cloud_cover=100
    )
    
    temp_dir = os.path.join("tmp", "netcdf", str(aoi.get('id')))
    os.makedirs(temp_dir, exist_ok=True)
    
    arquivo_nc = download_batch_netcdf(
        connection, loadco3, aoi_id=aoi.get('id'),
        backend_url=backend_url, client_id=client_id,
    )
    generated_files = []
    # Keep the durable raw cube, and materialize only the selected scene at a time.
    with xr.open_dataset(arquivo_nc) as ds:
        # Keep numpy datetime64 values: tolist() turns nanoseconds into integers.
        times = np.sort(ds.t.values)
        if len(times) == 0:
            raise ValueError(f"Nenhuma cena encontrada para a AOI {aoi.get('id')} no intervalo informado.")
        if temporal_mode == "LATEST":
            times = [times[-1]]
        for t in times:
            ds_time = ds.sel(t=t)
            nome = gerar_novo_nome_arquivo(
                aoi.get('id'), ds_time,
                include_time=temporal_mode == "ALL_30_DAYS",
            )
            nome_novo = os.path.join(temp_dir, nome)
            staged = nome_novo + ".part"
            try:
                ds_time.to_netcdf(staged)
                os.replace(staged, nome_novo)
            finally:
                if os.path.exists(staged):
                    os.remove(staged)
            generated_files.append(nome_novo)
            print(f"Imagem processada e salva em: {nome_novo}")
    return generated_files
