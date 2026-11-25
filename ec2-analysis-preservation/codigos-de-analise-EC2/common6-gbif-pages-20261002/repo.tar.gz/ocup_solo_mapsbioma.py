import ee
import pandas as pd

ee.Initialize(project='lexical-botany-496115-j2')

ARQUIVO_ENTRADA = 'Malus_domestica_clima_global_safras.csv'
ARQUIVO_SAIDA = 'Malus_domestica_clima_global_safras_mapbiomas.csv'

COLUNA_LAT = 'decimalLatitude'
COLUNA_LON = 'decimalLongitude'
COLUNA_ANO = 'year'

mapbiomas = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection10/mapbiomas_brazil_collection10_coverage_v2')

print("Lendo arquivo CSV...")
df = pd.read_csv(ARQUIVO_ENTRADA)

def extrair_classe(feature):
    ano = ee.Number(feature.get('ano_ocorrencia'))
    ano_busca = ee.Algorithms.If(ano.gt(2024), 2024, ano)
    banda = ee.String('classification_').cat(ee.Number(ano_busca).format('%04d'))
    img_ano = mapbiomas.select([banda])
    amostra = img_ano.reduceRegion(
        reducer=ee.Reducer.first(),
        geometry=feature.geometry(),
        scale=30
    )
    valor_classe = amostra.get(banda)
    return feature.set('id_uso_solo_mapbiomas', valor_classe)

TAMANHO_LOTE = 2000
mapeamento_classes = {}

print(f"Iniciando extração para {len(df)} pontos...")

for i in range(0, len(df), TAMANHO_LOTE):
    lote = df.iloc[i:i + TAMANHO_LOTE]
    print(f"Processando lote: linhas {i} a {i + len(lote)}...")

    features = []
    for index, row in lote.iterrows():
        if pd.isna(row[COLUNA_LAT]) or pd.isna(row[COLUNA_LON]):
            continue

        geom = ee.Geometry.Point([row[COLUNA_LON], row[COLUNA_LAT]])
        feature = ee.Feature(geom, {
            'id_linha': index,
            'ano_ocorrencia': int(row[COLUNA_ANO])
        })
        features.append(feature)

    if not features:
        continue

    fc_ocorrencias = ee.FeatureCollection(features)
    fc_processada = fc_ocorrencias.map(extrair_classe)

    resultado_lote = fc_processada.getInfo()['features']

    for feat in resultado_lote:
        props = feat['properties']
        id_linha = props.get('id_linha')
        classe = props.get('id_uso_solo_mapbiomas')
        mapeamento_classes[id_linha] = classe

print("Integrando resultados e salvando CSV...")
df['id_uso_solo_mapbiomas'] = df.index.map(mapeamento_classes)
df.to_csv(ARQUIVO_SAIDA, index=False)
print(f"Sucesso! Arquivo gerado: {ARQUIVO_SAIDA}")