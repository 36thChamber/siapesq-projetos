import os
from osgeo import gdal
gdal.UseExceptions ()
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