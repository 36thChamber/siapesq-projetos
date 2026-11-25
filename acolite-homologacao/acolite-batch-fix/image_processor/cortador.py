import os
from osgeo import gdal
gdal.UseExceptions ()
def corta_tiff(tiff_path:str, geojson_file:str, output_tiff:str):
    result = gdal.Warp(
        output_tiff,
        tiff_path,
        cutlineDSName=geojson_file,
        cropToCutline=True,
        dstAlpha=True,
    )
    if result is None:
        raise RuntimeError("GDAL não produziu o raster recortado.")
    result = None  # Flush the output before the indices consume it.
    print(f"Clipped raster saved as {output_tiff}")
        

def cortar_bandas(bandas_dir:str, geojson_file:str):
    bandas = os.listdir(bandas_dir)
    for banda in bandas:
        if banda.endswith(".tif"):
            output_tiff = os.path.join(bandas_dir,banda)
            corta_tiff(os.path.join(bandas_dir, banda), geojson_file, output_tiff)
