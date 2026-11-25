import pandas as pd

arquivo_csv = "csv"

df = pd.read_csv(arquivo_csv)

print(df.columns)
df.drop(columns=['t2m', 'e', 'tp', 'sdtb', 'altitude', 'ndvi', 'species', 'sp', 'ocup_solo'], inplace=True) # colunas que vai remover do csv

df.to_csv(arquivo_csv, index=False)

print("Coluna 'ocup_solo' removida com sucesso.")