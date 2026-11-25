import requests
import os
import argparse

from dotenv import load_dotenv

load_dotenv()

# bbox padrão (América do Sul) no formato [west, east, north, south].
# CORREÇÃO: antes era `[-85,-32,15 -58]` — a falta de vírgula fazia `15 -58`
# virar `-43`, resultando numa lista de 3 elementos. Agora está correto.
DEFAULT_AREA = [-85.0, -32.0, 15.0, -58.0]
DEFAULT_DIR = "dados_saida/dem"
# Copernicus GLO-30 (~30 m) — melhor resolução que o SRTMGL3 (~90 m); usado p/
# altitude E derivação de slope. Sobrescrevível por env OPENTOPOGRAPHY_DEMTYPE
# (ex.: SRTMGL3, NASADEM, COP90) para compatibilidade.
DEMTYPE = os.getenv("OPENTOPOGRAPHY_DEMTYPE", "COP30")
# Tamanho de cada subárea (a API tem limite de área por requisição). Mantém a
# granularidade original (~5,3° lon × 7,3° lat) e cobre QUALQUER bbox.
_LON_STEP = 5.3
_LAT_STEP = 7.3


def _api_key() -> str:
    """Lê a chave do OpenTopography do ambiente (OPENTOPOGRAPHY_API_KEY)."""
    key = os.getenv("OPENTOPOGRAPHY_API_KEY")
    if not key:
        raise RuntimeError(
            "OpenTopography indisponível: defina OPENTOPOGRAPHY_API_KEY no .env "
            "(chave gratuita em https://portal.opentopography.org)."
        )
    return key


def generate_subsets(area, lon_step: float = _LON_STEP, lat_step: float = _LAT_STEP):
    """
    Divide um bbox [west, east, north, south] em subáreas de tamanho ≤ passo,
    cobrindo QUALQUER região (não mais fixa na América do Sul).

    Retorna lista de [west, east, north, south] por subárea.
    """
    west, east, north, south = area
    subsets = []
    lon = west
    while lon < east - 1e-9:
        lon2 = min(lon + lon_step, east)
        lat = north
        while lat > south + 1e-9:
            lat2 = max(lat - lat_step, south)
            subsets.append([round(lon, 4), round(lon2, 4), round(lat, 4), round(lat2, 4)])
            lat = lat2
        lon = lon2
    return subsets


def download_subsets(area=DEFAULT_AREA, data_dir: str = DEFAULT_DIR):
    """
    Baixa o DEM SRTMGL3 (~90 m) do OpenTopography cobrindo `area`, em subáreas
    (a API limita a área por requisição). Chave via .env; subáreas geradas
    dinamicamente para qualquer bbox.
    """
    api_key = _api_key()
    os.makedirs(data_dir, exist_ok=True)
    subsets = generate_subsets(area)
    print(f"OpenTopography: {len(subsets)} subárea(s) para bbox {area}")
    for index, (west, east, north, south) in enumerate(subsets):
        local_filename = f"{data_dir}/dem{index}.tif"
        if os.path.exists(local_filename):
            continue
        url = (
            "https://portal.opentopography.org/API/globaldem"
            f"?demtype={DEMTYPE}&south={south}&north={north}&west={west}&east={east}"
            f"&outputFormat=GTiff&API_Key={api_key}"
        )
        try:
            with requests.get(url, stream=True, timeout=(30, 300)) as r:
                r.raise_for_status()
                with open(local_filename, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
        except Exception as e:  # noqa: BLE001 - uma subárea ruim não derruba as demais
            print(f"  falha na subárea {index} {(west, east, north, south)}: {e}")

def download_window(west, east, north, south, out_path: str,
                    demtype: str | None = None, api_key: str | None = None,
                    timeout=(30, 300)):
    """
    Baixa UM recorte pequeno do DEM (uma "janela" ao redor de pontos) do
    OpenTopography e salva em `out_path`. Usado pela captação de altitude/slope
    para espécies com Área M grande (baixa só janelinhas nos pontos, não o mosaico
    inteiro). Reaproveita a mesma API/credencial do `download_subsets`.
    """
    demtype = demtype or DEMTYPE
    api_key = api_key or _api_key()
    url = (
        "https://portal.opentopography.org/API/globaldem"
        f"?demtype={demtype}&south={south}&north={north}&west={west}&east={east}"
        f"&outputFormat=GTiff&API_Key={api_key}"
    )
    with requests.get(url, stream=True, timeout=timeout) as r:
        r.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    return out_path


def clean_empty_files(dir:str=DEFAULT_DIR):
    """
        This function removes the empty files from the given directory.
        Parameters:
            dir (str): Path to the directory to clean.
    """
    for filename in os.listdir(dir):
        if filename.endswith(('.tif', '.tiff')):
            if os.path.getsize(f"{dir}/{filename}") == 0:
                os.remove(f"{dir}/{filename}")

def compress_all_file(dir:str=DEFAULT_DIR):
    """
        This function compresses all the files in the given directory.
        Parameters:
            dir (str): Path to the directory to compress.
    """
    
    for filename in os.listdir(dir):
        if filename.endswith(('.tif', '.tiff')):
            os.system(f"gdal_translate -of GTiff -co COMPRESS=LZW -co TILED=YES {dir}/{filename} {dir}/{filename.split('.')[0]}_compressed.tif")
            os.remove(f"{dir}/{filename}")

def merge_all_files(dir:str=DEFAULT_DIR):
    """
        This function merges all the files in the given directory.
        Parameters:
            dir (str): Path to the directory to merge.
    """
    files = [f"{dir}/{filename}" for filename in os.listdir(dir)]
    for entry in files:
        if not entry.endswith(('.tif', '.tiff')):
            files.remove(entry)
    
    if len(files) > 1:
        files = " ".join(files)
        os.system(f"gdal_merge.py -o {dir}/output.tif {files}")
    else:
        print("Only one file found.")

def clean_dir(dir:str=DEFAULT_DIR):
    """
        This function removes all the files in the given directory.
        Parameters:
            dir (str): Path to the directory to clean.
    """
    for filename in os.listdir(dir):
        if filename.endswith(('.tif', '.tiff')) and filename != "output.tif":
            os.remove(f"{dir}/{filename}")

def mosaic_tiles(data_dir: str = DEFAULT_DIR, out_name: str = "output.tif"):
    """
    Mosaica os tiles `dem*.tif` em `output.tif` (LZW) usando **rasterio** — sem
    depender do GDAL CLI (`gdal_merge.py`/`gdal_translate`), que pode não estar
    instalado. Remove os tiles após o mosaico. Substitui, de forma NÃO destrutiva,
    o antigo `compress_all_file`+`merge_all_files`+`clean_dir` (que apagava os
    tiles mesmo quando a compressão via GDAL falhava).
    """
    import rasterio
    from rasterio.merge import merge

    tiles = [os.path.join(data_dir, f) for f in os.listdir(data_dir)
             if f.lower().endswith((".tif", ".tiff")) and f != out_name]
    if not tiles:
        print("OpenTopography: nenhum tile para mosaicar.")
        return None

    srcs = [rasterio.open(t) for t in tiles]
    try:
        mosaic, transform = merge(srcs)
        meta = srcs[0].meta.copy()
        meta.update(height=mosaic.shape[1], width=mosaic.shape[2],
                    transform=transform, compress="lzw", tiled=True)
        out_path = os.path.join(data_dir, out_name)
        with rasterio.open(out_path, "w", **meta) as dst:
            dst.write(mosaic)
    finally:
        for s in srcs:
            s.close()
    for t in tiles:
        os.remove(t)
    print(f"OpenTopography: mosaico salvo em {out_path} ({len(tiles)} tile(s)).")
    return out_path


def run_cmd(args:argparse.Namespace):
    data_dir=args.data_dir
    # Área parametrizável: usa --area (west east north south) se fornecida.
    area = getattr(args, "area", None) or DEFAULT_AREA
    download_subsets(area=area, data_dir=data_dir)
    clean_empty_files(data_dir)
    mosaic_tiles(data_dir)  # mosaico em rasterio (sem GDAL CLI, não destrutivo)
