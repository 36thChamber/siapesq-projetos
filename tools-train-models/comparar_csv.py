import pandas as pd

caminho_completo = 'final_limpo_v2_Sapajus_nigritus_mapbiomas.csv'
caminho_gbif = 'gbif/Sapajus_nigritus_GBIF_Data.csv'

# Lê os arquivos
df_completo = pd.read_csv(caminho_completo)
df_gbif = pd.read_csv(caminho_gbif)

# Colunas usadas para comparação
colunas_chave = [
    'decimalLatitude',
    'decimalLongitude',
    'day',
    'month',
    'year'
]

# Remove duplicados do GBIF
df_gbif_chaves = df_gbif[colunas_chave].drop_duplicates()

# Faz merge apenas para descobrir quais linhas bateram
df_merge = pd.merge(
    df_completo[colunas_chave],
    df_gbif_chaves,
    on=colunas_chave,
    how='left',
    indicator=True
)

# Cria coluna vazia
df_completo['base_de_dados'] = None

# Apenas para sp == 1
mask_sp1 = df_completo['sp'] == 1

# Linhas que bateram com GBIF
mask_gbif = df_merge['_merge'] == 'both'

# Preenche apenas sp=1
df_completo.loc[mask_sp1 & mask_gbif, 'base_de_dados'] = 'gbif'
df_completo.loc[mask_sp1 & ~mask_gbif, 'base_de_dados'] = 'inaturalis'

# Salva
df_completo.to_csv(caminho_completo, index=False)

# Resumo
df_sp1 = df_completo[df_completo['sp'] == 1]

contagem = df_sp1['base_de_dados'].value_counts()

qtd_gbif = contagem.get('gbif', 0)
qtd_inat = contagem.get('inaturalis', 0)

print("Processo concluído!")
print("-" * 40)
print("RESUMO DO CRUZAMENTO (somente sp = 1)")
print(f"✅ GBIF: {qtd_gbif}")
print(f"❌ iNaturalis: {qtd_inat}")
print(f"Total sp=1: {qtd_gbif + qtd_inat}")
print("-" * 40)