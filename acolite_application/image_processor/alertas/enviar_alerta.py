from image_processor.alertas.classificacao import ClassificacaoAlertas
import os
import logging
from image_processor.alertas.processamento import converter_bbox_para_utm, extrair_data, extrair_tipo

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