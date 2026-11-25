import pandas as pd
import argparse
import os
import sys

def balance_strict_clean_no_shuffle(csv_path):
    if not os.path.exists(csv_path):
        print(f"Erro: Arquivo '{csv_path}' não encontrado.")
        sys.exit(1)

    df = pd.read_csv(csv_path)

    if 'sp' not in df.columns:
        print("Erro: Coluna 'sp' não encontrada.")
        sys.exit(1)

    print("="*60)
    print(f"ANÁLISE E LIMPEZA DE DADOS (Presenças e Ausências)")

    df_presencas_raw = df[df['sp'] == 1]
    total_presencas_raw = len(df_presencas_raw)

    df_presencas_limpas = df_presencas_raw.dropna()
    qtd_presencas_validas = len(df_presencas_limpas)
    qtd_presencas_lixo = total_presencas_raw - qtd_presencas_validas

    print(f"Presenças (sp=1) Totais:    {total_presencas_raw}")
    print(f"Presenças Incompletas:      -{qtd_presencas_lixo} (DESCARTADAS)")
    print(f"Presenças Válidas:          {qtd_presencas_validas} (MANTIDAS)")
    print("-" * 30)

    df_ausencias_raw = df[df['sp'] == 0]
    total_ausencias_raw = len(df_ausencias_raw)

    df_ausencias_limpas = df_ausencias_raw.dropna()
    qtd_ausencias_validas = len(df_ausencias_limpas)
    qtd_ausencias_lixo = total_ausencias_raw - qtd_ausencias_validas

    print(f"Ausências (sp=0) Totais:    {total_ausencias_raw}")
    print(f"Ausências Incompletas:      -{qtd_ausencias_lixo} (DESCARTADAS)")
    print(f"Ausências Válidas:          {qtd_ausencias_validas} (ELEGÍVEIS)")
    print("="*60)

    target_ausencias = int(qtd_presencas_validas / 2)
    print(f"\n>>> META: Precisamos de {target_ausencias} ausências limpas (baseado em {qtd_presencas_validas} presenças).")

    df_ausencias_final = pd.DataFrame()

    if qtd_ausencias_validas > target_ausencias:
        excesso = qtd_ausencias_validas - target_ausencias
        print(f"[SUCESSO] Temos mais ausências do que o necessário (Excesso: {excesso}).")
        print(f"--> Sorteando {target_ausencias} aleatórias e removendo o resto...")

        df_ausencias_final = df_ausencias_limpas.sample(n=target_ausencias, random_state=42)

    elif qtd_ausencias_validas == target_ausencias:
        print(f"[SUCESSO] Temos exatamente a quantidade necessária.")
        df_ausencias_final = df_ausencias_limpas

    else:
        print(f"[AVISO] Não há ausências LIMPAS suficientes para atingir 33%.")
        print(f"--> Meta: {target_ausencias} | Disponível Limpo: {qtd_ausencias_validas}")
        print(f"--> Usando TODAS as {qtd_ausencias_validas} ausências limpas disponíveis.")
        df_ausencias_final = df_ausencias_limpas

    df_final = pd.concat([df_presencas_limpas, df_ausencias_final])

    total = len(df_final)
    final_p = len(df_final[df_final['sp'] == 1])
    final_a = len(df_final[df_final['sp'] == 0])

    print("\n" + "-"*60)
    print("RESUMO FINAL")
    print(f"Total de Linhas: {total}")
    print(f"Presenças: {final_p} ({final_p/total*100:.2f}%)")
    print(f"Ausências: {final_a} ({final_a/total*100:.2f}%)")

    if final_a < target_ausencias:
         print(f"!!! O dataset ficou desbalanceado pois faltaram ausências completas.")

    output_name = f"final_limpo_v2_{os.path.basename(csv_path)}"
    df_final.to_csv(output_name, index=False)
    print(f"\nSalvo em: {output_name}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Balanceia dataset (66/33) limpando Presenças e Ausências. Remove excesso de ausências aleatoriamente.')
    parser.add_argument('--csv', type=str, required=True, help='Arquivo CSV de entrada')
    args = parser.parse_args()

    balance_strict_clean_no_shuffle(args.csv)