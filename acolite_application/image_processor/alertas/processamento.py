from datetime import datetime
import rasterio
import numpy as np
from pyproj import Transformer
import logging
from typing import Any
from image_processor.alertas.modelos import NivelCritico

def classificar_nivel_critico(pixel_value:float,tipo='ndvi')->NivelCritico:
    if tipo=='ndvi':
        if pixel_value>=0.2 and pixel_value<=0.3:
            return NivelCritico.Amarelo
        elif pixel_value>0.3 and pixel_value<=0.4:
            return NivelCritico.Laranja
        elif pixel_value>0.4:
            return NivelCritico.Vermelho
        else:
            return None
    #Rever iss aqui com o wesley
    elif tipo=='ndci':
        if pixel_value >= 0 and pixel_value < 0.2:
            return NivelCritico.Amarelo
        elif pixel_value >= 0.2 and pixel_value < 0.4:
            return NivelCritico.Laranja
        elif pixel_value >= 0.4:
            return NivelCritico.Vermelho
        return None
    else:
        return None
    
def ler_geotiff(geotiff_path:str,tipo:str)->tuple[np.ndarray, Any, Transformer, np.ndarray]:
    logging.info('Lendo o arquivo tiff')
    with rasterio.open(geotiff_path) as dataset:
        print("Driver:", dataset.driver)
        print("Width:", dataset.width)
        print("Height:", dataset.height)
        print("Bands:", dataset.count)
        print("Dtype:", dataset.dtypes)
        print("CRS:", dataset.crs)
        print("Transform:", dataset.transform)
        band1 = dataset.read(1)
        transform = dataset.transform
        transformer = Transformer.from_crs(dataset.crs, "EPSG:4326", always_xy=True)
        if tipo=="ndvi":
            min_value=0.2
        elif tipo=="ndci":
            min_value=0.0
        mask = ~np.isnan(band1) &(band1 > min_value)
        indices = np.column_stack(np.where(mask))
        return (indices,transform,transformer,band1)

def extrair_tipo(geotiff_path:str)->str:
    return geotiff_path.split("/")[-1].split(".")[0].split("_")[-1].lower()

def extrair_data(nome_arquivo):
    try:
        partes = nome_arquivo.split("_")
        if len(partes) >= 3:
            data_str = "_".join(partes[1:4])  # Junta a data novamente
            data_obj = datetime.strptime(data_str, "%Y_%m_%d")
            return data_obj
        else:
            raise ValueError("Formato do nome do arquivo inválido. Não foi possível encontrar a data.")
    
    except (IndexError, ValueError) as e:
        print(f"Erro ao extrair data: {e}")
        return None

def converter_bbox_para_utm(bbox, origem="EPSG:4326", destino="EPSG:32722"):
    transformer = Transformer.from_crs(origem, destino, always_xy=True)  
    min_lon, min_lat, max_lon, max_lat = bbox
    min_x, min_y = transformer.transform(min_lon, min_lat)  # (min_lon, min_lat)
    max_x, max_y = transformer.transform(max_lon, max_lat)  # (max_lon, max_lat)
    
    return [min_x, min_y, max_x, max_y]
