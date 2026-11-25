import os
import rasterio
import logging
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
from pyproj import Transformer
from osgeo import gdal
gdal.UseExceptions ()
import os
def corta_tiff(tiff_path:str, geojson_file:str, output_tiff:str):
    try:
        gdal.Warp(
            output_tiff,
            tiff_path,
            cutlineDSName=geojson_file,
            cropToCutline=True,        
            dstAlpha=True              
        )
        print(f"Clipped raster saved as {output_tiff}")
    except Exception as e:
        print(f"Error: {e}")
        

def cortar_bandas(bandas_dir:str, geojson_file:str):
    try:
        bandas = os.listdir(bandas_dir)
        for banda in bandas:
            if banda.endswith(".tif"):
                output_tiff = os.path.join(bandas_dir,banda)
                corta_tiff(os.path.join(bandas_dir, banda), geojson_file, output_tiff)
    except Exception as e:
        print(f"Error: {e}")


def cortar_bandas_por_bbox(bandas_dir: str, bbox: list[float], output_dir: str):
    """
    Recorta todas as bandas TIFF dentro de bandas_dir com base na bbox [west, south, east, north]
    e salva no output_dir, convertendo a bbox para o CRS da imagem.
    """
    west, south, east, north = bbox

    for filename in os.listdir(bandas_dir):
        if filename.lower().endswith(".tif"):
            input_path = os.path.join(bandas_dir, filename)
            with rasterio.open(input_path) as src:
                src_crs = src.crs
                transformer = Transformer.from_crs("EPSG:4326", src_crs, always_xy=True)

                west_t, south_t = transformer.transform(west, south)
                east_t, north_t = transformer.transform(east, north)

                window = from_bounds(west_t, south_t, east_t, north_t, transform=src.transform)
                out_transform = src.window_transform(window)
                out_image = src.read(window=window, resampling=Resampling.nearest)

                if out_image.shape[1] == 0 or out_image.shape[2] == 0:
                    logging.warning(f"[{filename}] Recorte 0x0 ignorado para bbox {bbox}")
                    continue

                out_meta = src.meta.copy()
                out_meta.update({
                    "height": out_image.shape[1],
                    "width": out_image.shape[2],
                    "transform": out_transform
                })

                os.makedirs(output_dir, exist_ok=True)
                output_path = os.path.join(output_dir, filename)
                with rasterio.open(output_path, "w", **out_meta) as dest:
                    dest.write(out_image)
