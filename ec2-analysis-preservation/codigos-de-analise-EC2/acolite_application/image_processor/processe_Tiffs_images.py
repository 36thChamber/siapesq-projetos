import os
import rasterio
import numpy as np
import rasterio.transform
from scipy.ndimage import zoom

# Importar a lógica de máscara de nuvens do clound_maks.py
def criar_mascara_nuvens(scl):
    # Classes de nuvens baseadas no arquivo clound_maks.py
    cloud_classes = [0, 1, 2, 3, 7, 8, 9, 10, 11]
    return ~np.isin(scl, cloud_classes)

# Função para calcular NDVI
def calcular_ndvi(banda_vermelha, banda_infravermelha):
    ndvi = np.where(
        (banda_infravermelha + banda_vermelha) == 0,
        np.nan,
        (banda_infravermelha - banda_vermelha) / (banda_infravermelha + banda_vermelha)
    )
    return ndvi

# Função para calcular NDCI
def calcular_ndci(banda_b5, banda_b4):
    ndci = np.where(
        (banda_b5 + banda_b4) == 0,
        np.nan,
        (banda_b5 - banda_b4) / (banda_b5 + banda_b4)
    )
    return ndci

# Função para aplicação da máscara de água
def detect_water(b3, b8):  
    ndwi = (b3 - b8) / (b3 + b8)
    threshold = 0.1
    water_mask = ndwi < threshold
    return water_mask

def detect_water_mndwi(b3, b11, lower_limit= -0.10, upper_limit= 1.10):
    """
    Função para detectar corpos d'água usando o Modified Normalized Difference Water Index (MNDWI).
    
    Parâmetros:
    - green_band: Banda verde (B03) da imagem de satélite.
    - swir1_band: Banda SWIR1 (B11) da imagem de satélite.
    - lower_limit: Limite inferior para a classificação de corpos d'água (padrão: -0.45).
    - upper_limit: Limite superior para a classificação de corpos d'água (padrão: 1.10).
    
    Retorna:
    - Uma máscara filtrada de água (com valores 1) e áreas não classificadas (como NaN).
    """
    # Reamostrar a banda SWIR1 para coincidir com as dimensões da banda Green
    zoom_factor = (b3.shape[0] / b11.shape[0], b3.shape[1] / b11.shape[1])
    swir1_band_resampled = zoom(b11, zoom_factor, order=1)

    # Calcular o MNDWI
    mndwi = np.where(
        (b3 + swir1_band_resampled) == 0,
        np.nan,
        (b3 - swir1_band_resampled) / (b3 + swir1_band_resampled)
    )

    # Criar uma máscara onde os valores dentro do intervalo são 1 e fora do intervalo são NaN
    water_mask = np.where((mndwi >= lower_limit) & (mndwi <= upper_limit), 1, np.nan)

    return water_mask

def salvar_indice_com_georef(
    out_dir:str,
    nome_indice:str, 
    indice_array:np.ndarray,
    crs:any,
    transform:any
):
    nome_arquivo_saida = os.path.join(out_dir, f"{nome_indice}.tif")
    if os.path.exists(nome_arquivo_saida):
        os.remove(nome_arquivo_saida)
    with rasterio.open(
        nome_arquivo_saida, 
        'w', 
        driver='GTiff', 
        height=indice_array.shape[0], 
        width=indice_array.shape[1],
        count=1, 
        dtype=indice_array.dtype, 
        crs=crs, 
        transform=transform
    ) as dst:
        dst.write(indice_array, 1)

# Função principal para calcular índices e salvar resultados
def calcular_indices_e_salvar(diretorio:str,aoi_name:str,out_dir:str)->None:
    # Define o padrão de nomeação dos arquivos TIF
    padrao_nomenclatura = "B{:02d}.tif"
    # Lista de variáveis correspondentes às bandas
    nomes_variaveis = ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", 'b8a', 'b9', 'b11', 'b12','scl']
    mapeamento_arquivos = {}
    for variavel in nomes_variaveis:
        if variavel == 'b8a':
            mapeamento_arquivos[variavel] = os.path.join(diretorio, "B8A.tif")
        elif variavel =='b9':
            mapeamento_arquivos[variavel] = os.path.join(diretorio, "B09.tif")
        elif variavel =='scl':
            mapeamento_arquivos[variavel] = os.path.join(diretorio, "SCL.tif")
        else:
            indice = nomes_variaveis.index(variavel) + 1  # Get correct index starting from 1
            mapeamento_arquivos[variavel] = os.path.join(diretorio, padrao_nomenclatura.format(indice))

    # Transformação dos arquivos em array (Matrizes n-dimensionais)
    bandas = {}
    scl_mask = None
    for variavel, caminho_arquivo in mapeamento_arquivos.items():
        with rasterio.open(caminho_arquivo) as dataset:
            bandas[variavel] = dataset.read(1).astype("float64")
            if variavel == "b1":
                transform = dataset.transform
                crs = dataset.crs

            if variavel == "scl":  # Verifica se é a banda SCL para criar a máscara de nuvens
                scl = dataset.read(1).astype("float64")
                scl_mask = criar_mascara_nuvens(scl)
            
            if not 'transform' in locals():
                transform = dataset.transform
                crs = dataset.crs

    if scl_mask is None:
        raise ValueError("A banda SCL para criar a máscara de nuvens não foi encontrada no diretório.")

    for key in bandas.keys():
        bandas[key] = np.where(scl_mask, bandas[key], np.nan)

    ndvi = calcular_ndvi(bandas["b4"], bandas["b8"])
    ndvi2 = calcular_ndvi(bandas["b4"], bandas["b8"])
    
    ndci = calcular_ndci(bandas["b5"], bandas["b4"])
    water_mask = detect_water_mndwi(bandas["b3"], bandas["b11"])

    water_mask2 = detect_water_mndwi(bandas["b3"], bandas["b11"], lower_limit= -0.45, upper_limit= 1.10)
    ndvi2 = np.where(np.isnan(water_mask2), np.nan, ndvi)
    
    ndvi = np.where(np.isnan(water_mask), np.nan, ndvi)
    ndci = np.where(np.isnan(water_mask), np.nan, ndci)

    salvar_indice_com_georef(out_dir,f"{aoi_name}_NDVI", ndvi,crs,transform)
    salvar_indice_com_georef(out_dir,f"{aoi_name}_NDCI", ndci,crs,transform)
    salvar_indice_com_georef(out_dir,f"{aoi_name}_NDVI2", ndvi2,crs,transform)
    return f"{aoi_name}_NDCI.tif", f"{aoi_name}_NDVI.tif", f"{aoi_name}_NDVI2.tif"


