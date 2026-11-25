import xarray as xr
import rioxarray  # Registers the .rio accessor used by the NetCDF extractor.
import os
import shutil
import uuid
from pyproj import CRS
import rasterio
import numpy as np
from rasterio.enums import Resampling

def nome_produto_por_cena(scene_path: str) -> str:
    """Preserva o horário opcional da aquisição nos nomes de RGB e índices."""
    stem = os.path.splitext(os.path.basename(scene_path))[0]
    prefix, time_suffix = stem.split("_MSI_L2A", 1)
    return prefix.removeprefix("S2_") + time_suffix


# Função para criar a máscara de nuvens
def criar_mascara_nuvens(scl):
    """
    Cria uma máscara de nuvens com base nas classes definidas.
    """
    cloud_classes = [0, 1, 3, 7, 9, 10, 11]
    return ~np.isin(scl, cloud_classes)  # True para pixels fora das nuvens

def salvar_imagem_rgb(rgb_array, transform, crs, diretorio, nome_base,mask=None):
    if mask is not None:
        for i in range(3):
            rgb_array[:, :, i] = np.where(mask, rgb_array[:, :, i], 0)
        
    nome=f"{nome_base}_RGB.tif"
    if mask is not None:
        nome=f"{nome_base}_RGB_MASK.tif"
        
    rgb_arquivo_saida = os.path.join(diretorio,nome)
    partial_path = rgb_arquivo_saida + ".partial-" + uuid.uuid4().hex
    try:
        with rasterio.open(
            partial_path, 'w', driver='GTiff', height=rgb_array.shape[0], width=rgb_array.shape[1],
            count=3, dtype=rgb_array.dtype, crs=crs, transform=transform
        ) as dst:
            dst.write(rgb_array[:, :, 0], 1)  # Banda Vermelha
            dst.write(rgb_array[:, :, 1], 2)  # Banda Verde
            dst.write(rgb_array[:, :, 2], 3)  # Banda Azul
        os.replace(partial_path, rgb_arquivo_saida)
    except Exception:
        if os.path.exists(partial_path):
            os.remove(partial_path)
        raise

def obter_crs(dados):
    if 'crs' in dados.data_vars:
        crs_data = dados['crs']
        crs_wkt = crs_data.attrs.get('crs_wkt')
        if crs_wkt:
            crs_obj = CRS.from_wkt(crs_wkt)
        else:
            crs_obj = CRS.from_user_input(crs_data.attrs)
        return crs_obj
    else:
        raise ValueError("Informações de CRS não encontradas no arquivo NetCDF.")
           
def extrair_bandas_netcdf(aoi_id:int,netcdf_path:str, out:str) -> tuple[str,str]:
    temp_dir=os.path.join("tmp","tiff")
    bandas_out_tiff=os.path.join(temp_dir,str(aoi_id))
    # tmp/netcdf/{aoi_id}/S2_{aoi_id}_{year}_{mouth}_{day}_MSI_L2A.nc
    nome_com_data = nome_produto_por_cena(netcdf_path)
    if os.path.exists(bandas_out_tiff):
        shutil.rmtree(bandas_out_tiff)
    os.makedirs(bandas_out_tiff, exist_ok=True)
    
    transform = None
    crs = None
    dados = xr.open_dataset(netcdf_path)
    scl_mask = None
    
    if 'SCL' in dados:
        scl = dados['SCL'].values.astype("float64")
        scl_mask = criar_mascara_nuvens(scl)

    if all(banda in dados for banda in ['B04', 'B03', 'B02']):
        banda_r = dados['B04'] / np.max(dados['B04'])
        banda_g = dados['B03'] / np.max(dados['B03'])
        banda_b = dados['B02'] / np.max(dados['B02'])
        rgb_array_mask = np.stack([banda_r.values, banda_g.values, banda_b.values], axis=-1)
        rgb_array = np.stack([banda_r.values, banda_g.values, banda_b.values], axis=-1)
        rgb_crs = dados['B04'].rio.crs
        if rgb_crs is None:
            # A CF grid_mapping kept as a data variable is not visible to the
            # band accessor. Preserve its existing WKT in the RGB outputs.
            rgb_crs = obter_crs(dados)
        salvar_imagem_rgb(rgb_array_mask, dados['B04'].rio.transform(), rgb_crs, out,nome_com_data, mask=scl_mask)
        salvar_imagem_rgb(rgb_array, dados['B04'].rio.transform(), rgb_crs, out,nome_com_data)
    else:
        raise ValueError("Bandas necessárias para RGB não encontradas no NetCDF.")

    print(f"Extraindo bandas de {netcdf_path}")
    for banda in ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B8A', 'B09', 'B11', 'B12','SCL']:
        banda_data = dados[banda]
        try:
            crs_obj = obter_crs(dados)
            epsg_code = crs_obj.to_epsg()
            banda_data.rio.write_crs(f"epsg:{epsg_code}", inplace=True)
        except:
            try:
                crs_wkt = crs_obj.to_wkt()
                banda_data.rio.write_crs(crs_wkt, inplace=True)
            except:
                try:
                    crs_proj4 = crs_obj.to_proj4()
                    banda_data.rio.write_crs(crs_proj4, inplace=True)
                except Exception as e:
                    print(f"Não foi possível definir o CRS para {netcdf_path} devido a {str(e)}")
                    
        if transform is None:
            transform = banda_data.rio.transform()
        if crs is None:
            crs = banda_data.rio.crs

        nome_arquivo_saida = os.path.join(bandas_out_tiff, f"{banda}.tif")
        banda_data.rio.to_raster(nome_arquivo_saida)

    return (bandas_out_tiff,nome_com_data)


def extrair_bandas_tiff(aoi_id: int, geotiff_path: str, out: str) -> tuple[str, str]:
    temp_dir = os.path.join("tmp", "tiff")
    bandas_out_tiff = os.path.join(temp_dir, str(aoi_id))
    nome_com_data = nome_produto_por_cena(geotiff_path)
    if os.path.exists(bandas_out_tiff):
        shutil.rmtree(bandas_out_tiff)
    os.makedirs(bandas_out_tiff, exist_ok=True)

    transform = None
    crs = None
    scl_mask = None

    with rasterio.open(geotiff_path) as src:
        transform = src.transform
        crs = src.crs
        band_names=['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B8A', 'B09', 'B11', 'B12', 'SCL']
        band_data = {band: src.read(idx + 1, resampling=Resampling.nearest) for idx, band in enumerate(band_names) if idx < src.count}
        if 'SCL' in band_data:
            scl = band_data['SCL'].astype("float64")
            scl_mask = criar_mascara_nuvens(scl)

        if all(b in band_data for b in ['B04', 'B03', 'B02']):
            banda_r = band_data['B04'] / np.max(band_data['B04'])
            banda_g = band_data['B03'] / np.max(band_data['B03'])
            banda_b = band_data['B02'] / np.max(band_data['B02'])
            rgb_array_mask = np.stack([banda_r, banda_g, banda_b], axis=-1)
            rgb_array = np.stack([banda_r, banda_g, banda_b], axis=-1)
            salvar_imagem_rgb(rgb_array_mask, transform, crs, out, nome_com_data, mask=scl_mask)
            salvar_imagem_rgb(rgb_array, transform, crs, out, nome_com_data)
        else:
            raise ValueError("Bandas necessárias para RGB não encontradas no GeoTIFF.")
        print(f"Extraindo bandas de {geotiff_path}")
        for banda_name, banda_data in band_data.items():
            nome_arquivo_saida = os.path.join(bandas_out_tiff, f"{banda_name}.tif")
            with rasterio.open(
                nome_arquivo_saida,
                'w',
                driver='GTiff',
                height=banda_data.shape[0],
                width=banda_data.shape[1],
                count=1,
                dtype=banda_data.dtype,
                crs=crs,
                transform=transform
            ) as dst:
                dst.write(banda_data, 1)

    return bandas_out_tiff, nome_com_data
