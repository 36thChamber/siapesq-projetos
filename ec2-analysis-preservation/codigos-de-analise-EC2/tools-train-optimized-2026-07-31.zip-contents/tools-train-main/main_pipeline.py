import subprocess
import sys
import re
import os

def run_step_and_read_terminal(command_template, input_csv):
    command = command_template.replace("FILE_INPUT", f'"{input_csv}"')
    
    print(f"\n{'='*80}")
    print(f"EXECUTANDO: {command}")
    print("-" * 80)

    env_config = os.environ.copy()
    env_config["PYTHONIOENCODING"] = "utf-8"

    process = subprocess.Popen(
        command, 
        shell=True, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.STDOUT, 
        text=True,
        encoding='utf-8', 
        errors='replace',
        env=env_config
    )
    
    terminal_output = ""
    
    for line in process.stdout:
        print(line, end='')
        terminal_output += line
        
    process.wait()
    
    if process.returncode != 0:
        print(f"\n!!! ERRO NO COMANDO !!! Pipeline interrompido.")
        sys.exit(1)

    matches = re.findall(r'([a-zA-Z0-9_.\-\\/]+\.csv)', terminal_output)
    
    if matches:
        novo_csv = matches[-1] 
        print(f"\n[SUCESSO] O terminal informou o arquivo: {novo_csv}")
        return novo_csv
    else:
        print(f"\n[AVISO] Nenhum nome de CSV encontrado no texto do terminal.")
        return input_csv

def main():
    if len(sys.argv) < 3:
        print("Erro: Faltam argumentos!")
        print("Como usar: python main_pipeline.py \"meu_arquivo_gbif.csv\" \"Nome da Especie\"")
        print("Exemplo: python main_pipeline.py \"_Acromyrmex_subterraneus_GBIF.csv\" \"Acromyrmex subterraneus\"")
        sys.exit(1)
    
    csv_inicial = sys.argv[1].strip()
    especie_alvo = sys.argv[2].strip()

    if not os.path.exists(csv_inicial):
        print(f"Erro: O arquivo '{csv_inicial}' não foi encontrado na pasta.")
        sys.exit(1)

    steps = [
        'python downloader.py cdsapi --csv FILE_INPUT --max_workers 2',
        'python downloaders/sdtb.py --csv FILE_INPUT --nc_file "nc/sdtb.nc"',
        'python downloader.py altitude --csv FILE_INPUT --bathymetry_netcdf nc/gebco_2024.nc',
        'python downloader.py ndvi download --csv FILE_INPUT',
        
        f'python gen_pseudo_occurences.py --csv FILE_INPUT --species_name "{especie_alvo}"',
        
        'python downloader.py cdsapi --csv FILE_INPUT --max_workers 2',
        'python downloaders/sdtb.py --csv FILE_INPUT --nc_file "nc/sdtb.nc"',
        'python downloader.py altitude --csv FILE_INPUT --bathymetry_netcdf nc/gebco_2024.nc',
        'python downloader.py ndvi download --csv FILE_INPUT',
        
        'python add_occup_solo.py --csv FILE_INPUT --raster tif/ocup_solo.tif',
        'python balanceador_estrito.py --csv FILE_INPUT'
    ]

    print(f"=== INICIANDO PIPELINE ===")
    print(f"Arquivo Base: {csv_inicial}")
    print(f"Espécie Alvo: {especie_alvo}")
    
    current_csv = csv_inicial
    
    for i, cmd in enumerate(steps):
        print(f"\n>>> ETAPA {i+1}/{len(steps)}")
        current_csv = run_step_and_read_terminal(cmd, current_csv)

    print(f"\n{'#'*80}")
    print(f"PROCESSO TOTALMENTE CONCLUÍDO!")
    print(f"Arquivo final: {current_csv}")
    print(f"{'#'*80}")

if __name__ == "__main__":
    main()