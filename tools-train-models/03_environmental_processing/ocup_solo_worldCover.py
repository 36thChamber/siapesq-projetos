import pandas as pd
import rasterio
import numpy as np
import math
from rasterio.session import AWSSession
import boto3

CSV_INPUT = "Malus_domestica_clima_global_safras.csv"
CSV_OUTPUT = "Malus_domestica_clima_global_safras_WorldCover.csv"

COLUNA_NOVA = "ocup_solo"
COLUNA_ANO = "year"                    

def calcular_nome_tile(lat, lon):
    """
    Transforma uma coordenada (ex: lat=-28, lon=-52) no nome do bloco 3x3 graus da ESA.
    Retorna algo como 'S30W054'.
    """
    lat_base = math.floor(lat / 3.0) * 3
    lon_base = math.floor(lon / 3.0) * 3
    
    str_lat = f"N{lat_base:02d}" if lat_base >= 0 else f"S{abs(lat_base):02d}"
    str_lon = f"E{lon_base:03d}" if lon_base >= 0 else f"W{abs(lon_base):03d}"
    
    return f"{str_lat}{str_lon}"

def obter_url_aws(ano, tile_id):
    """
    Retorna o link correto do S3 baseado no ano.
    ESA WorldCover só tem 2020 (v100) e 2021 (v200).
    """
    if pd.isna(ano) or ano <= 2020:
        return f"s3://esa-worldcover/v100/2020/map/ESA_WorldCover_10m_2020_v100_{tile_id}_Map.tif"
    else:
        return f"s3://esa-worldcover/v200/2021/map/ESA_WorldCover_10m_2021_v200_{tile_id}_Map.tif"

def extrair_da_nuvem():
    print(f"[INFO] Lendo CSV: {CSV_INPUT}")
    df = pd.read_csv(CSV_INPUT)
    
    df[COLUNA_NOVA] = np.nan
    
    print("[INFO] Calculando a malha de blocos para os seus pontos...")
    df['ESA_Tile'] = df.apply(lambda row: calcular_nome_tile(row['decimalLatitude'], row['decimalLongitude']), axis=1)
    
    grupos_tiles_ano = df.groupby(['ESA_Tile', COLUNA_ANO], dropna=False)
    print(f"[INFO] Seus pontos estão divididos em {len(grupos_tiles_ano)} combinações de Blocos/Anos.")
    
    boto_session = boto3.Session(region_name='eu-central-1')
    aws_session = AWSSession(session=boto_session, requester_pays=False)
    
    with rasterio.Env(aws_session, AWS_NO_SIGN_REQUEST="YES"):
        
        for (tile_id, ano_grupo), pontos_do_grupo in grupos_tiles_ano:
            
            s3_path = obter_url_aws(ano_grupo, tile_id)
            
            ano_formatado = "Sem Ano (Usando 2020)" if pd.isna(ano_grupo) else int(ano_grupo)
            print(f"\n[AWS] Lendo Bloco {tile_id} | Ref. Ano: {ano_formatado} | ({len(pontos_do_grupo)} pontos)...")
            
            lats = pontos_do_grupo["decimalLatitude"].astype(float).tolist()
            lons = pontos_do_grupo["decimalLongitude"].astype(float).tolist()
            coords = list(zip(lons, lats))
            indices_originais = pontos_do_grupo.index.tolist()
            
            try:
                # O 'open' lê apenas o cabeçalho remotamente
                with rasterio.open(s3_path) as src:
                    # O 'sample' faz o download APENAS dos pixels necessários
                    amostras = list(src.sample(coords))
                    
                    # Preencher o DataFrame com os valores encontrados
                    for idx_original, amostra in zip(indices_originais, amostras):
                        val = amostra[0]
                        if val != 0: # 0 significa NoData (Oceano/Fora do mapa) no WorldCover
                            df.at[idx_original, COLUNA_NOVA] = float(val)
                            
                print(f"      -> Extração concluída com sucesso.")
                
            except rasterio.errors.RasterioIOError:
                print(f"      [AVISO] Bloco {tile_id} (Ano {ano_formatado}) não existe no servidor. (Oceano ou fora de cobertura).")
            except Exception as e:
                print(f"      [ERRO] Falha ao ler {tile_id} (Ano {ano_formatado}): {e}")
                
    # Apagar a coluna temporária do bloco
    df = df.drop(columns=['ESA_Tile'])
    
    # Salvar o arquivo final
    print(f"\n[INFO] Salvando resultado final em: {CSV_OUTPUT}")
    df.to_csv(CSV_OUTPUT, index=False)
    print("[SUCESSO] Processo finalizado!")

if __name__ == "__main__":
    extrair_da_nuvem()