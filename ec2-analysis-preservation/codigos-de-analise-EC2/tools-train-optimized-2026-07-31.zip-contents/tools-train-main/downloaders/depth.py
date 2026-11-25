import pandas as pd
import xarray as xr
import argparse
import numpy as np
import os

def run_cmd(args: argparse.Namespace):
    csv = args.csv
    MINIMAL_DEPTH = args.minimal_depth
    netcdf = args.bathmetry_netcdf
    
    # Define a tolerância de busca para pontos na praia (em graus). 
    # 0.05 graus equivale a aprox. 5km. Ajuste conforme a resolução do seu NetCDF.
    SEARCH_TOLERANCE = 0.05 

    print(f"Lendo CSV: {csv}")
    df = pd.read_csv(csv)

    print(f"Lendo NetCDF: {netcdf}")
    with xr.open_dataset(netcdf) as ds:
        # Renomeia as dimensões conforme o padrão
        if "__xarray_dataarray_variable__" in ds.data_vars:
            ds = ds.rename({"__xarray_dataarray_variable__": "depth", "x": "lon", "y": "lat"})
        
        var = ds["depth"]
        depths = []

        for _, row in df.iterrows():
            lon = float(row.get("decimalLongitude"))
            lat = float(row.get("decimalLatitude"))
            
            try:
                # 1. Tenta pegar o ponto exato primeiro
                valor = var.sel(lon=lon, lat=lat, method="nearest").values.item()

                # 2. Resgate Costeiro: Se for NaN (terra firme) ou >= 0, tenta buscar na vizinhança
                if np.isnan(valor) or valor >= 0:
                    # Cria uma pequena janela (bounding box) ao redor do ponto
                    # Usamos .sortby() para garantir que o slice funcione independente da orientação do eixo no NetCDF
                    window = var.sel(
                        lon=slice(lon - SEARCH_TOLERANCE, lon + SEARCH_TOLERANCE),
                        lat=slice(lat - SEARCH_TOLERANCE, lat + SEARCH_TOLERANCE)
                    )
                    
                    # Filtra apenas os pixels que são água (menor que 0)
                    ocean_pixels = window.where(window < 0)
                    
                    # Se encontrou água na vizinhança, pega o valor médio (ou o mais raso/fundo, se preferir)
                    if ocean_pixels.count() > 0:
                        valor = ocean_pixels.mean().values.item()

                # 3. Aplica a regra de negócio final (MINIMAL_DEPTH)
                if not np.isnan(valor) and valor < 0 and abs(valor) >= MINIMAL_DEPTH:
                    depths.append(valor)
                    # print(f"({lat}, {lon}) = {valor:.2f}") # Opcional: print apenas dos sucessos
                else:
                    depths.append(np.nan)

            except Exception as e:
                print(f"⚠️ Erro ao interpolar profundidade em ({lat}, {lon}): {e}")
                depths.append(np.nan)

    # Adiciona a coluna ao DataFrame
    df["depth"] = depths

    # 4. REMOVE AS LINHAS VAZIAS (NaN)
    linhas_antes = len(df)
    df = df.dropna(subset=["depth"])
    linhas_depois = len(df)

    # Salva o arquivo limpo
    output_filename = f"out_depth_{os.path.basename(csv)}"
    df.to_csv(output_filename, index=False)
    
    print("-" * 40)
    print(f"Arquivo salvo: {output_filename}")
    print(f"Registros mantidos: {linhas_depois} / {linhas_antes}")
    print(f"Registros removidos (terra firme): {linhas_antes - linhas_depois}")