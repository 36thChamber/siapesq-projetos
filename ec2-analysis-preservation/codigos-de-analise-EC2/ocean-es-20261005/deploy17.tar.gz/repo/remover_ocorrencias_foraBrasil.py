import sys
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
import warnings
import os

warnings.filterwarnings("ignore")

if len(sys.argv) < 2:
    print(f"Uso: python {sys.argv[0]} <arquivo_entrada.csv> [arquivo_saida.csv]")
    sys.exit(1)

ARQUIVO_CSV = sys.argv[1]

if len(sys.argv) >= 3:
    ARQUIVO_SAIDA = sys.argv[2]
else:
    nome_base = os.path.splitext(ARQUIVO_CSV)[0]
    ARQUIVO_SAIDA = f"{nome_base}_Brasil.csv"

COLUNA_LAT = "decimalLatitude"
COLUNA_LON = "decimalLongitude"

print(f"Lendo CSV: {ARQUIVO_CSV}")
df = pd.read_csv(ARQUIVO_CSV)

total_original = len(df)

# Remove linhas sem coordenadas
df = df.dropna(subset=[COLUNA_LAT, COLUNA_LON]).copy()

print(f"Registros originais: {total_original}")
print(f"Com coordenadas: {len(df)}")

# Cria geometria dos pontos
geometry = [
    Point(lon, lat)
    for lon, lat in zip(df[COLUNA_LON], df[COLUNA_LAT])
]

gdf = gpd.GeoDataFrame(
    df,
    geometry=geometry,
    crs="EPSG:4326"
)

print("Baixando limites do mundo...")

url_mapa = (
    "https://naciscdn.org/naturalearth/110m/"
    "cultural/ne_110m_admin_0_countries.zip"
)

world = gpd.read_file(url_mapa)

# Seleciona Brasil
brazil = world[world["ADMIN"] == "Brazil"]

# Mantém apenas pontos dentro do Brasil
gdf_brasil = gdf[gdf.within(brazil.geometry.iloc[0])]

print(f"Ocorrências dentro do Brasil: {len(gdf_brasil)}")
print(f"Ocorrências removidas: {len(df) - len(gdf_brasil)}")

# Remove coluna de geometria
gdf_brasil = gdf_brasil.drop(columns=["geometry"])

# Salva CSV
gdf_brasil.to_csv(ARQUIVO_SAIDA, index=False)

print(f"\nArquivo salvo: {ARQUIVO_SAIDA}")