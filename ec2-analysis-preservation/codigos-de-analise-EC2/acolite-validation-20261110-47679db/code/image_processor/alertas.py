from datetime import date, datetime
from enum import Enum
import rasterio
from rasterio.features import geometry_mask
import numpy as np
from pyproj import Transformer
import requests
import logging
from shapely.geometry import Polygon
import os

class NivelCritico(Enum):
    Amarelo = "Possivel presença de vegetação"
    Laranja = "Presença de vegetação"
    Vermelho = "Presença de vegetação em grande quantidade"
    
class Alerta:
    def __init__(
        self,
        id_reservatorio:int,
        data_alerta:datetime,
        hora_alerta:datetime,
        nivel_critico:str,
        tipo:str,
        id_area_alerta: int
    ):
        self.id_reservatorio=id_reservatorio
        self.data_alerta=datetime.isoformat(data_alerta)
        self.hora_alerta=datetime.isoformat(hora_alerta)
        self.nivel_critico=nivel_critico
        self.tipo=tipo
        self.id_area_alerta=id_area_alerta

def classificar_nivel_critico(pixel_value:float,tipo='ndvi')->NivelCritico:
    if tipo=='ndvi':
        if pixel_value>=0.2 and pixel_value<=0.3:
            return NivelCritico.Amarelo
        elif pixel_value>0.3 and pixel_value<=0.4:
            return NivelCritico.Laranja
        elif pixel_value>0.5:
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
    
def ler_geotiff(geotiff_path:str,tipo:str)->list[tuple[tuple[float,float],NivelCritico]]:
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
    min_lat, min_lon, max_lat, max_lon = bbox
    min_x, min_y = transformer.transform(min_lon, min_lat)  # (min_lon, min_lat)
    max_x, max_y = transformer.transform(max_lon, max_lat)  # (max_lon, max_lat)
    
    return [min_x, min_y, max_x, max_y]

def enviar_alerta(
    tiff_path:str,
    nome_arquivo: str,
    base_api:str,
    endpoint:str,
    api_key:str,
    id_reservatorio:int,
    area_alerta,
    id_area_alerta
):
    classificando = ClassificacaoAlertas()
    nome_arquivo_saida = os.path.join(tiff_path, nome_arquivo)
    area_convertida = converter_bbox_para_utm(area_alerta)
    tipo=extrair_tipo(nome_arquivo)
    data=extrair_data(nome_arquivo)
    logging.info(f'Tipo da analise: {tipo} \nData da analise: {data}')
    classificando.separar_area_alerta(tiff=nome_arquivo_saida, area_alerta=area_convertida,tipo=tipo.lower())
    alertas= classificando.criar_alertas(id_reservatorio=id_reservatorio,data=data,tipo=tipo.lower(),id_area_alerta=id_area_alerta)
    
    logging.info(f'Alertas a ser criados: {alertas}')
    logging.info(f"Enviando {len(alertas)} alertas para o reservatório {id_reservatorio}")
    classificando.salvar_alerta(base_api,endpoint,api_key,alertas)


class ClassificacaoAlertas:
    def __init__(self):
        self.classificacoes_macrofitas = [
            "Sem vegetação detectada - ",
            "Baixa densidade de vegetação detectada - ",
            "Alta densidade de vegetação detectada - "
        ]

        self.classificacoes_algas = [
            "Densidade desconsideravél de microalgas - ",
            "Baixa densidade de microalgas - ",
            "Alta densidade de microalgas - "
        ]
        self.classificacoes_ndci = [
            "Clorofila em nível baixo - ",
            "Clorofila em nível moderado - ",
            "Clorofila em nível alto - ",
            "Clorofila em nível crítico! - "
        ]
        self.classificacoes_tsi = [
            "área está Oligotrofica",
            "área está Mesotrofica",
            "área está Eutrofica",
            "área está Supertrofica",
            "área está Hipertrofica"
        ]


        self.resetar_arrays()

    def resetar_arrays(self):
        self.pixels_analise_macrofitas = [[], [], []]
        self.pixels_analise_ndci = [[], [], [], []]
        self.pixels_analise_tsi = [[], [], [], [], []]
        self.pixels_analise_algas = [[], [], []]

    def convert_to_shapely_polygon(self, bbox):
        if len(bbox) != 4:
            raise ValueError("O bounding box deve ter exatamente 4 valores: [min_lon, min_lat, max_lon, max_lat]")
        min_lon, min_lat, max_lon, max_lat = bbox
        coordinates = [
            (min_lon, min_lat),  # canto inferior esquerdo
            (min_lon, max_lat),  # canto superior esquerdo
            (max_lon, max_lat),  # canto superior direito
            (max_lon, min_lat),  # canto inferior direito
            (min_lon, min_lat)   # volta ao ponto inicial para fechar o polígono
        ]

        return Polygon(coordinates)

    def contagem_macrofitas(self):
        total_pixels = sum(len(subarray) for subarray in self.pixels_analise_macrofitas)
        percentuais = [
            (len(subarray) / total_pixels * 100) if total_pixels > 0 else 0
            for subarray in self.pixels_analise_macrofitas
        ]
        return {"total": total_pixels, "percentuais": percentuais}

    def contagem_ndci(self):
        total_pixels = sum(len(subarray) for subarray in self.pixels_analise_ndci)
        percentuais = [
            (len(subarray) / total_pixels * 100) if total_pixels > 0 else 0
            for subarray in self.pixels_analise_ndci
        ]
        return {"total": total_pixels, "percentuais": percentuais}

    def contagem_tsi(self):

        total_pixels = sum(len(subarray) for subarray in self.pixels_analise_tsi)
        percentuais = [
            (len(subarray) / total_pixels * 100) if total_pixels > 0 else 0
            for subarray in self.pixels_analise_tsi
        ]
        return {"total": total_pixels, "percentuais": percentuais}

    def contagem_algas(self):

        total_pixels = sum(len(subarray) for subarray in self.pixels_analise_algas)
        percentuais = [
            (len(subarray) / total_pixels * 100) if total_pixels > 0 else 0
            for subarray in self.pixels_analise_algas
        ]
        return {"total": total_pixels, "percentuais": percentuais}

    def separar_area_alerta(self, tiff, area_alerta, tipo):
        
        with rasterio.open(tiff) as dataset:
            band1 = dataset.read(1)  # Lê a banda de interesse
            transform = dataset.transform
            # Converte o bbox em um polígono
            reservatorio_polygon = self.convert_to_shapely_polygon(area_alerta)

            # Cria a máscara para a área de interesse
            mask = geometry_mask([reservatorio_polygon], transform=transform, invert=True, out_shape=dataset.shape)
            # Mascarando a banda para manter apenas os pixels dentro da área
            masked_band = np.ma.masked_array(band1, mask=mask)

            # Vetorização: Filtra todos os valores de pixels dentro da área de alerta
            valid_pixels = masked_band[~masked_band.mask]
            
            # Se houver pixels válidos
            if valid_pixels.size > 0:

                for pixel, pixel_value in enumerate(valid_pixels):
                    
                    if not np.isnan(pixel_value):
                       
                        # faz analise no tiff NDVI
                        if tipo == 'ndvi':
                                if pixel_value <= 0.15:
                                    self.pixels_analise_algas[0].append({"pixel": pixel, "value": pixel_value})
                                elif pixel_value > 0.15 and pixel_value <= 0.35:
                                    self.pixels_analise_algas[1].append({"pixel": pixel, "value": pixel_value})
                                elif pixel_value > 0.35 and pixel_value <= 0.65:
                                    self.pixels_analise_algas[2].append({"pixel": pixel, "value": pixel_value})
                       
                        # faz analise no tiff NDVI2
                        elif tipo == 'ndvi2':
                                if pixel_value <= 0.3:
                                    self.pixels_analise_macrofitas[0].append({"pixel":pixel,"value": pixel_value})
                                elif pixel_value > 0.3 and pixel_value <= 0.6:
                                    self.pixels_analise_macrofitas[1].append({"pixel": pixel, "value": pixel_value})
                                else:
                                    self.pixels_analise_macrofitas[2].append({"pixel": pixel, "value": pixel_value})

                        
                        # faz analise no tiff NDCI
                        elif tipo == 'ndci':
                            # Intervalos para ndci
                                if pixel_value <= -0.0333:
                                    self.pixels_analise_ndci[0].append({"pixel": pixel, "value": pixel_value})
                                elif pixel_value > -0.0333 and pixel_value <= 0.1334:
                                    self.pixels_analise_ndci[1].append({"pixel": pixel, "value": pixel_value})
                                elif pixel_value > 0.1334 and pixel_value <= 0.3:
                                    self.pixels_analise_ndci[2].append({"pixel": pixel, "value": pixel_value})
                                elif pixel_value > 0.3:
                                    self.pixels_analise_ndci[3].append({"pixel": pixel, "value": pixel_value})

                                if pixel_value <= -0.1120:
                                    self.pixels_analise_tsi[0].append({"pixel": pixel, "value": pixel_value})
                                elif pixel_value > -0.1120 and pixel_value <= -0.0402:
                                    self.pixels_analise_tsi[1].append({"pixel": pixel, "value": pixel_value})
                                elif pixel_value > -0.0402 and pixel_value <= 0.0316:
                                    self.pixels_analise_tsi[2].append({"pixel": pixel, "value": pixel_value})
                                elif pixel_value > 0.0316 and pixel_value <= 0.1034:
                                    self.pixels_analise_tsi[3].append({"pixel": pixel, "value": pixel_value})
                                elif pixel_value > 0.1034 and pixel_value <= 0.17525:
                                    self.pixels_analise_tsi[4].append({"pixel": pixel, "value": pixel_value})
                
                print("Classificação completa!")
            else:
                print("Nenhum pixel válido na área.")

    def criar_alertas(self, id_reservatorio: int, data: date,tipo: str,id_area_alerta:int)->list[Alerta]:
        try:
            logging.info('INICIANDO CRIAÇÃO DO ALERTA')
            alertas=[]
            
            if(tipo == 'ndci'):
                print('Iniciando contagem para NDCI')
                alertas_ndci = self.contagem_ndci()
                alertas_tsi = self.contagem_tsi()

                if alertas_ndci:
                    percentuais = alertas_ndci["percentuais"]

                    for i, percentual in enumerate(percentuais):
                        if percentual > 0:  # Só cria alerta se houver pixels nessa categoria
                            alerta = {
                                "tipo": "NDCI",
                                "nivel_critico": f"{self.classificacoes_ndci[i]} {percentual:.2f}% do total"
                            }
                            print('Adicionando no banco!')

                            a=Alerta(id_reservatorio,data,datetime.now(),alerta["nivel_critico"],alerta["tipo"],id_area_alerta)
                            alertas.append(a.__dict__)

                if alertas_tsi:
                    percentuais = alertas_tsi["percentuais"]

                    for i, percentual in enumerate(percentuais):
                        if percentual > 0: #Só cria alerta se houver pixels nessa categoria
                            alerta = {
                                "tipo": "TSI",
                                "nivel_critico": f"{percentual:.2f}% da {self.classificacoes_tsi[i]}"
                            }

                            a=Alerta(id_reservatorio,data,datetime.now(), alerta["nivel_critico"],alerta["tipo"],id_area_alerta)
                            alertas.append(a.__dict__)

            elif tipo == 'ndvi':
                print('Iniciando contagem para NDVI')
                alertas_algas = self.contagem_algas()
                if alertas_algas:
                    percentuais = alertas_algas["percentuais"]

                    for i, percentual in enumerate(percentuais):
                        if percentual > 0:  # Só cria alerta se houver pixels nessa categoria
                            alerta = {
                                "tipo": "Algas",
                                "nivel_critico": f"{self.classificacoes_algas[i]} {percentual:.2f}% do total"
                            }

                            a=Alerta(id_reservatorio,data, datetime.now(),alerta["nivel_critico"],alerta["tipo"],id_area_alerta)
                            alertas.append(a.__dict__)

            elif tipo == 'ndvi2':
                alertas_macrofitas = self.contagem_macrofitas()
                if alertas_macrofitas:
                    percentuais = alertas_macrofitas["percentuais"]

                    for i, percentual in enumerate(percentuais):
                        if percentual > 0:  # Só cria alerta se houver pixels nessa categoria
                            alerta = {
                                "tipo": "Macrofitas",
                                "nivel_critico": f"{self.classificacoes_macrofitas[i]} {percentual:.2f}% do total"
                            }
                            #a=Alerta(id_reservatorio,lat,lon,datetime.now(),datetime.now(),nv.value,tipo)

                            a=Alerta(id_reservatorio,data, datetime.now(),alerta["nivel_critico"],alerta["tipo"],id_area_alerta)
                            alertas.append(a.__dict__)
            #logging.info(f'Resultado da função criar a alerta: {alertas}')
            return alertas
        except Exception as e:
            logging.info(f'Erro na criação do alerta: {e}')
    
    def salvar_alerta(self,base_api:str,endpoint:str,api_key:str,alertas:list[Alerta]):
        headers = {'x-api-key': api_key}
        url=f"{base_api}/{endpoint}"
        data={"alertas":alertas}
        response = requests.post(url, headers=headers, json=data, timeout=(15, 60))
        response.raise_for_status()
        return response.json()
        


