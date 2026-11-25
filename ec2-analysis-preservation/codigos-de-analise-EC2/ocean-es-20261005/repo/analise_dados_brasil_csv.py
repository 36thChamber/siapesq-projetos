import sys
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
import warnings

warnings.filterwarnings('ignore')

if len(sys.argv) != 2:
    print(f"Uso: python {sys.argv[0]} <arquivo.csv>")
    sys.exit(1)

ARQUIVO_CSV = sys.argv[1]

COLUNA_LAT = 'decimalLatitude'
COLUNA_LON = 'decimalLongitude'
COLUNA_SP = 'sp'

print(f"Lendo o arquivo CSV: {ARQUIVO_CSV}")
df = pd.read_csv(ARQUIVO_CSV)

total_linhas = df.shape[0]
total_colunas = df.shape[1]

print("\n" + "="*40)
print("INFORMAÇÕES BÁSICAS DO ARQUIVO")
print("="*40)
print(f"Total de colunas: {total_colunas}")
print(f"Total de ocorrências (linhas): {total_linhas}")

df_clean = df.dropna(subset=[COLUNA_LAT, COLUNA_LON]).copy()
linhas_sem_coordenada = total_linhas - df_clean.shape[0]

print("\nProcessando localização espacial (baixando o mapa-múndi e analisando)...")

geometry = [Point(xy) for xy in zip(df_clean[COLUNA_LON], df_clean[COLUNA_LAT])]
gdf = gpd.GeoDataFrame(df_clean, geometry=geometry, crs="EPSG:4326")

url_mapa = "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip"
world = gpd.read_file(url_mapa)

brazil_polygon = world[world['ADMIN'] == "Brazil"].geometry.iloc[0]

gdf['no_brasil'] = gdf.geometry.within(brazil_polygon)

dentro_brasil = gdf[gdf['no_brasil'] == True]
fora_brasil = gdf[gdf['no_brasil'] == False]

print("\n" + "="*40)
print("🌍 DISTRIBUIÇÃO GEOGRÁFICA (BRASIL VS MUNDO)")
print("="*40)
print(f"🟢 Ocorrências DENTRO do Brasil: {len(dentro_brasil)}")
print(f"🔴 Ocorrências FORA do Brasil:   {len(fora_brasil)}")

if linhas_sem_coordenada > 0:
    print(f"⚪ Ignoradas (sem coordenadas):  {linhas_sem_coordenada}")

print("\n" + "="*40)
print("🐒 ANÁLISE DA COLUNA 'sp' (0 e 1)")
print("="*40)

print("📌 DENTRO do Brasil:")
print(f"   ➤ sp = 1: {len(dentro_brasil[dentro_brasil[COLUNA_SP] == 1])}")
print(f"   ➤ sp = 0: {len(dentro_brasil[dentro_brasil[COLUNA_SP] == 0])}")

print("\n📌 FORA do Brasil:")
print(f"   ➤ sp = 1: {len(fora_brasil[fora_brasil[COLUNA_SP] == 1])}")
print(f"   ➤ sp = 0: {len(fora_brasil[fora_brasil[COLUNA_SP] == 0])}")

print("="*40)