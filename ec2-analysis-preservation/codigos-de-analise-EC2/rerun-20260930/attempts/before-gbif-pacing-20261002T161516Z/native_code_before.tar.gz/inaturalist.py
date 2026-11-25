import requests
import json
import sys
import os
import csv
import time

TAXA_SEARCH_URL = "https://api.inaturalist.org/v1/taxa"
OBSERVATIONS_SEARCH_URL = "https://api.inaturalist.org/v1/observations"

MAX_PER_PAGE = 200

IMPORTANT_FIELDS = 'location,geojson,observed_on_details'

CSV_HEADERS = [
    'decimalLatitude',
    'decimalLongitude',
    'day',
    'month',
    'year'
]

def get_taxon_id(species_name):
    print(f"Buscando ID do táxon para: '{species_name}'...")
    params = {
        'q': species_name,
        'is_active': 'true',
        'rank': 'species',
        'per_page': 1
    }

    try:
        response = requests.get(TAXA_SEARCH_URL, params=params)

        if response.status_code == 200:
            data = response.json()
            if data.get('results') and len(data['results']) > 0:
                first_result = data['results'][0]
                taxon_id = first_result['id']
                matched_name = first_result['name']
                print(f"ID encontrado: {taxon_id} (Nome correspondente: {matched_name})")
                return taxon_id, matched_name
            else:
                print(f"Nenhum táxon de espécie encontrado para '{species_name}'. Verifique o nome.")
                return None, None
        else:
            print(f"Erro ao buscar táxon (HTTP {response.status_code}): {response.text}")
            return None, None

    except requests.exceptions.RequestException as e:
        print(f"Erro de conexão ao buscar táxon: {e}")
        return None, None

def fetch_and_write_observations(taxon_id, max_results, csv_writer):
    page = 1
    total_fetched = 0

    print(f"\nIniciando busca e processamento (limite de {max_results} registros)...")

    while total_fetched < max_results:
        remaining_needed = max_results - total_fetched
        per_page = min(remaining_needed, MAX_PER_PAGE)

        if per_page <= 0:
            break

        params = {
            'taxon_id': taxon_id,
            'per_page': per_page,
            'page': page,
            'order': 'desc',
            'order_by': 'observed_on',
            'geo': 'true',
            'fields': IMPORTANT_FIELDS
        }

        print(f"Buscando e processando página {page} ({per_page} registros)...")

        try:
            response = requests.get(OBSERVATIONS_SEARCH_URL, params=params)

            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])

                if not results:
                    print("Não há mais resultados. Busca concluída.")
                    break

                rows_to_write = []
                for obs in results:
                    if total_fetched >= max_results:
                        break

                    lat, lon = 'N/A', 'N/A'
                    if obs.get('geojson') and (obs['geojson'].get('coordinates')):
                        coords = obs['geojson']['coordinates']
                        lon, lat = coords[0], coords[1]
                    elif obs.get('location'):
                        lat_lon_str = obs.get('location', '').split(',')
                        if len(lat_lon_str) == 2:
                            lat, lon = lat_lon_str[0], lat_lon_str[1]

                    details = obs.get('observed_on_details') or {}
                    day = details.get('day', 'N/A')
                    month = details.get('month', 'N/A')
                    year = details.get('year', 'N/A')

                    rows_to_write.append([
                        lat,
                        lon,
                        day,
                        month,
                        year
                    ])
                    total_fetched += 1

                csv_writer.writerows(rows_to_write)

                total_api_results = data.get('total_results', 0)
                if total_fetched >= total_api_results:
                    print(f"Todos os {total_api_results} resultados disponíveis foram baixados.")
                    break

                page += 1
                time.sleep(0.1)

            else:
                print(f"Erro ao buscar observações (HTTP {response.status_code}): {response.text}")
                break

        except requests.exceptions.RequestException as e:
            print(f"Erro de conexão ao buscar observações: {e}")
            break

    return total_fetched

def main():
    species_name = input("Digite o nome científico da espécie: ").strip()
    if not species_name:
        print("Nome da espécie não pode ser vazio.")
        return

    try:
        max_results_str = input("Qual o NÚMERO MÁXIMO de registros que deseja buscar: ").strip()
        max_results = int(max_results_str)
        if max_results <= 0:
            print("O número máximo deve ser maior que zero.")
            return
    except ValueError:
        print("Entrada inválida. Por favor, insira um número.")
        return

    taxon_id, matched_name = get_taxon_id(species_name)

    if taxon_id and matched_name:

        output_folder = "arquivo Inaturalist"
        safe_species_name = matched_name.replace(' ', '_')
        base_filename = f"{safe_species_name}_inaturalist.csv"
        output_filename = os.path.join(output_folder, base_filename)

        try:
            if not os.path.exists(output_folder):
                os.makedirs(output_folder)
                print(f"\nPasta '{output_folder}' criada.")

            with open(output_filename, 'w', encoding='utf-8', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(CSV_HEADERS)

                total_saved = fetch_and_write_observations(taxon_id, max_results, writer)

            print(f"\n--- SUCESSO ---")
            print(f"Total de {total_saved} registros foram salvos em:")
            print(f"{output_filename}")

        except IOError as e:
            print(f"\nErro ao salvar arquivo: {e}")
        except Exception as e:
            print(f"\nOcorreu um erro inesperado: {e}")

if __name__ == "__main__":
    main()