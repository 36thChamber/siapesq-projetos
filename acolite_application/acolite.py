from downloader.copernicus import download_netcdf
from downloader.sentinel import download_sentinel
from image_processor.GTiff_images import extrair_bandas_netcdf,extrair_bandas_tiff
from image_processor.processe_Tiffs_images import calcular_indices_e_salvar
from image_processor.cortador import cortar_bandas, cortar_bandas_por_bbox
from siapesq.downloader import get_reservatories, create_list,get_reservatorio
from image_processor.alertas.enviar_alerta import enviar_alerta
from messenger.discord import DiscordNotifier
import logging
import dotenv
from datetime import date, timedelta
import os
import sys
import time
from uuid import uuid4

logging.basicConfig(level=logging.INFO)


def init_config():
    logging.info("Carregando variaveis de ambiente")
    if not dotenv.find_dotenv():
        logging.error("Arquivo .env não encontrado")
        return
    dotenv.load_dotenv()

def get_all_AOI():
    logging.info("Buscando áreas de interesse")
    endpoint="v1/phytoBloom/reservatorios"
    base_api=os.getenv("SIAPESQ_BASE_API")
    if not base_api:
        raise ValueError("Variável de ambiente BASE_API não definida.")
    
    api_key=os.getenv("SIAPESQ_API_KEY")
    if not api_key:
        raise ValueError("Variável de ambiente API_KEY não definida.")
    response=get_reservatories(base_api,endpoint,api_key)
    logging.info("Áreas de interesse encontradas")
    
    reservatorioes=response.get('reservatorios')
    total=response.get('total')
    logging.info(f"Total de áreas de interesse encontradas: {total}")
    if total==0:
        logging.error("Nenhuma área de interesse encontrada")
        return
    
    aoi_list=create_list(reservatorios=reservatorioes)
    if len(aoi_list)==0:
        logging.error("lista de áreas de interesse vazia")
        return
    logging.info("Áreas de interesse carregadas com sucesso")

    return aoi_list

def get_selected_AOI(aoi_ids:list[int]):
    logging.info("Buscando áreas de interesse")
    base_api=os.getenv("SIAPESQ_BASE_API")
    if not base_api:
        raise ValueError("Variável de ambiente BASE_API não definida.")
    
    api_key=os.getenv("SIAPESQ_API_KEY")
    if not api_key:
        raise ValueError("Variável de ambiente API_KEY não definida.")
    reservatorioes=[]
    for aoi_id in aoi_ids:
        endpoint=f"v1/phytoBloom/reservatorios/{aoi_id}"    
        r=get_reservatorio(base_api,endpoint,api_key)
        reservatorioes.append(r)

    aoi_list=create_list(reservatorios=reservatorioes)
    if len(aoi_list)==0:
        logging.error("lista de áreas de interesse vazia")
        return
    logging.info("Áreas de interesse carregadas com sucesso")
    return aoi_list

def run_process(aoi_ids: list[int] | None, notifier: DiscordNotifier,provider:str):
    start_time = time.time()
    logging.info("Iniciando o processo de download de NetCDF's")
    aoi_list = []
    if aoi_ids is None or len(aoi_ids) == 0:
        aoi_list = get_all_AOI()
    else:
        aoi_list = get_selected_AOI(aoi_ids)
    out_dir = os.path.join("out")
    today = date.today()
    end_date = today.strftime("%Y-%m-%d")
    start_date = (today - timedelta(5)).strftime("%Y-%m-%d")
    logging.info(f"Data de início: {start_date}")
    logging.info(f"Data de fim: {end_date}")
    notifier.send_message(f"Iniciando o processo de download de NetCDF's\nNúmero de áreas para processar:{len(aoi_list)}\nData de início: {start_date}\nData de fim: {end_date}\nProvider: {provider}")
    success = 0
    for aoi in aoi_list:
        try:
            logging.info(f"[ID {aoi.get('id')}]Baixando Dados para a área de interesse {aoi.get('name')}")
            logging.info(f"[ID {aoi.get('id')}]Coleção: {aoi.get('collection_id')}")
            logging.info(f"[ID {aoi.get('id')}]Extensão espacial: {aoi.get('spatial_extent')}")
            cdf_out_path:str
            if "SENTINELHUB"==provider:
                cdf_out_path=download_sentinel(aoi, start_date, end_date)
            else:
                cdf_out_path=download_netcdf(aoi, start_date, end_date)
            logging.info(f"[ID {aoi.get('id')}]Arquivo baixado com sucesso para a área de interesse {aoi.get('name')} id {aoi.get('id')}")
            logging.info(f"[ID {aoi.get('id')}]Extraindo todas as bandas de {cdf_out_path}")
            bandas_dir:str
            nome_com_data:str
            if "SENTINELHUB"==provider:
                (bandas_dir,nome_com_data)=extrair_bandas_tiff(aoi_id=aoi.get('id'),geotiff_path=cdf_out_path,out=out_dir)
            else:
                (bandas_dir,nome_com_data)=extrair_bandas_netcdf(aoi_id=aoi.get('id'),netcdf_path=cdf_out_path,out=out_dir)
            copel_map={
                    #siapesq
                    "78":"reservatorios/sal_de_caxias.geojson",
                    #copel
                    "129":"reservatorios/sal_de_caxias.geojson",
                    "123":"reservatorios/governador_ney_barros.geojson",
                    "128":"reservatorios/governador_pedro_souza.geojson",
                    "127":"reservatorios/governador_bento_munhoz.geojson",
                    "126":"reservatorios/governador_jaime_canet.geojson",
                    "130":"reservatorios/tibagi.geojson"
            }
            if aoi.get('id') in copel_map:
                path_geojson=copel_map.get(aoi.get('id'))
                if path_geojson is None:
                    logging.error(f"[ID {aoi.get('id')}]Geojson não encontrado para a área de interesse {aoi.get('name')} id {aoi.get('id')}")
                    break
                logging.info(f"[ID {aoi.get('id')}]Cortando bandas para a área de interesse {aoi.get('name')} id {aoi.get('id')}")
                cortar_bandas(bandas_dir, path_geojson)
                logging.info(f"[ID {aoi.get('id')}]Bandas cortadas com sucesso para a área de interesse {aoi.get('name')} id {aoi.get('id')}")

            logging.info(f"[ID {aoi.get('id')}]Extração de {cdf_out_path} concluida Diretorio de Saida: {bandas_dir}")
            
            logging.info(f"[ID {aoi.get('id')}]Indices calculados e salvos com sucesso para a área de interesse {aoi.get('name')} id {aoi.get('id')}")
            logging.info(f"[ID {aoi.get('id')}]Processo finalizado com sucesso para a área de interesse {aoi.get('name')}\nSaida: {out_dir}")
            logging.info(f"[ID {aoi.get('id')}] Verificando alertas para a área de interesse {aoi.get('name')}")
            base_api=os.getenv("SIAPESQ_BASE_API")
            api_key = os.getenv("SIAPESQ_API_KEY")
            logging.info(f"[ID {aoi.get('id')}] Iniciando verificação de alerta para area do reservatório {aoi.get('name')}")
            for area in aoi.get('squares'):
                logging.info(f"[ID {aoi.get('id')}] Processando subárea {area.get('id')}")
                
                # Criar diretório temporário para essa subárea
                sub_dir = os.path.join(bandas_dir, f"area_{area.get('id')}_{uuid4().hex[:6]}")
                os.makedirs(sub_dir, exist_ok=True)

                # Recortar bandas para a subárea
                lat_min, lon_min, lat_max, lon_max = area['bbox']
                bbox_rasterio = [lon_min, lat_min, lon_max, lat_max]
                cortar_bandas_por_bbox(bandas_dir, bbox_rasterio, sub_dir)

                # Calcular os índices apenas para a subárea
                ndci, ndvi, ndvi2 = calcular_indices_e_salvar(sub_dir, nome_com_data, out_dir)
                logging.info(f"[ID {aoi.get('id')}] Enviando alertas de ndci")
                enviar_alerta(tiff_path=out_dir, nome_arquivo=ndci, base_api=base_api, endpoint='v1/phytoBloom/alertas/bulk', api_key=api_key, id_reservatorio=aoi.get('id'), area_alerta=area.get('bbox'), id_area_alerta=area.get('id'))
                logging.info(f"[ID {aoi.get('id')}] Enviando alertas de ndvi")
                enviar_alerta(tiff_path=out_dir, nome_arquivo=ndvi, base_api=base_api, endpoint='v1/phytoBloom/alertas/bulk', api_key=api_key, id_reservatorio=aoi.get('id'), area_alerta=area.get('bbox'), id_area_alerta=area.get('id'))
                logging.info(f"[ID {aoi.get('id')}] Enviando alertas de macrófritas")
                enviar_alerta(tiff_path=out_dir, nome_arquivo=ndvi2, base_api=base_api, endpoint='v1/phytoBloom/alertas/bulk', api_key=api_key, id_reservatorio=aoi.get('id'), area_alerta=area.get('bbox'), id_area_alerta=area.get('id'))
            logging.info(f"[ID {aoi.get('id')}] Alertas enviados com sucesso para a área de interesse {aoi.get('name')}")
            success+=1
        except Exception as e:
            logging.error(f"[{aoi.get('id')}] Erro ao baixar imagens para a área de interesse {aoi.get('name')}: {e}")
            notifier.send_message(f"[{aoi.get('id')}] Erro ao baixar imagens para a área de interesse {aoi.get('name')}: {e}")
            continue
    notifier.send_message(f"Processo finalizado com sucesso. Número de áreas processadas: {success}\nTempo de execução: {time.time() - start_time} segundos")

def main():
    try:
        init_config()
      
        args = sys.argv[1:]
        if not args:
            args = None
        if args is not None:
            logging.info(f"Argumentos passados: {args}")
            try:
                integers = [int(arg) for arg in args]
                print(integers)
            except ValueError:
                print("Please provide valid integers.")
        else:
            logging.info("Nenhum argumento passado. Iniciando processo para todas as áreas de interesse.")
        
        BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
        CHANNEL = os.getenv("DISCORD_BOT_CHANNEL")
        PROVIDER=os.getenv("PROVIDER")
        if not PROVIDER:
            PROVIDER="COPERNICUS"
        notifier = DiscordNotifier(token=BOT_TOKEN, channel_id=CHANNEL)
        logging.info("Starting bot...")
        notifier.start()
        time.sleep(1)
        run_process(args, notifier,PROVIDER)
        

    except Exception as e:
        logging.error(f"Erro ao executar o processo: {e}")

if __name__ == "__main__":
    main()
