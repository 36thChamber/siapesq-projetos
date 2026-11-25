#!/usr/bin/env python3

"""
Limpa a matriz de treino já enriquecida com variáveis ambientais.

Trata valores sentinela (marcadores de "sem dado" comuns em produtos raster,
ex.: '--', -9999, -999.9) convertendo-os para NaN e, então, ou (a) remove as
linhas incompletas (*listwise deletion* — comportamento padrão, retrocompatível)
ou (b) imputa os valores ausentes coluna a coluna (média/mediana/k-NN).

Também remove a coluna 'species' quando presente (não é preditor). Salva o
resultado com o prefixo 'clean_'.

Retrocompatibilidade: sem argumentos extras, o comportamento é idêntico ao
anterior (sentinela '--', descarte de linhas com qualquer NaN).
"""

import os
import argparse
from typing import Sequence

import numpy as np
import pandas as pd


# Sentinela histórico reconhecido pela versão anterior.
DEFAULT_SENTINELS: tuple[str, ...] = ("--",)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Clean a CSV file: handle raster sentinels and missing values."
    )
    parser.add_argument("--input_csv", type=str, required=True,
                        help="Path to the input CSV file")
    parser.add_argument("--sentinels", type=str, nargs="+", default=list(DEFAULT_SENTINELS),
                        help="Sentinel values treated as missing (e.g. --sentinels -- -9999 -999.9). "
                             "Default: '--'.")
    parser.add_argument("--impute", type=str, default="none",
                        choices=["none", "mean", "median", "knn"],
                        help="Imputation strategy for numeric columns. 'none' (default) keeps "
                             "the previous behaviour (listwise deletion).")
    parser.add_argument("--knn_neighbors", type=int, default=5,
                        help="Number of neighbours for --impute knn (default: 5).")
    parser.add_argument("--keep_species", action="store_true",
                        help="Do not drop the 'species' column.")
    return parser.parse_args()


def _sentinel_replacements(sentinels: Sequence[str]) -> list:
    """
    Expande a lista de sentinelas para casar tanto valores de texto quanto
    numéricos (ex.: '-9999' também casa o float -9999.0 lido de colunas numéricas).
    """
    repl: list = []
    for s in sentinels:
        repl.append(s)
        try:
            repl.append(float(s))
        except (TypeError, ValueError):
            pass
    return repl


def _coerce_numeric(series: pd.Series) -> pd.Series:
    """
    Converte uma coluna de texto para numérica quando ela é, de fato, numérica.

    Necessário porque uma coluna numérica "contaminada" por sentinelas de texto
    (ex.: '--') é lida como `object`; após trocar o sentinela por NaN, queremos
    recuperar o tipo numérico para permitir imputação. Colunas genuinamente
    categóricas são mantidas como estão.
    """
    if series.dtype != object:
        return series
    converted = pd.to_numeric(series, errors="coerce")
    # aceita a conversão apenas se não introduziu NaN além dos já existentes
    if converted.notna().sum() >= series.notna().sum():
        return converted
    return series


def _impute(df: pd.DataFrame, method: str, knn_neighbors: int) -> pd.DataFrame:
    """
    Imputa valores ausentes nas colunas numéricas segundo `method`.

    Linhas com NaN remanescente em colunas NÃO numéricas são descartadas
    (não há imputação estatística óbvia para categóricas aqui).
    """
    num_cols = df.select_dtypes(include="number").columns
    if method in ("mean", "median"):
        for c in num_cols:
            fill = df[c].mean() if method == "mean" else df[c].median()
            df[c] = df[c].fillna(fill)
    elif method == "knn":
        try:
            from sklearn.impute import KNNImputer
        except ImportError as exc:  # pragma: no cover - depende do ambiente
            raise ImportError(
                "Imputação k-NN requer scikit-learn: pip install scikit-learn"
            ) from exc
        if len(num_cols) > 0:
            imputer = KNNImputer(n_neighbors=knn_neighbors)
            df[num_cols] = imputer.fit_transform(df[num_cols])
    return df.dropna()


def clean_dataframe(
    df: pd.DataFrame,
    sentinels: Sequence[str] = DEFAULT_SENTINELS,
    impute: str = "none",
    knn_neighbors: int = 5,
    drop_species: bool = True,
) -> pd.DataFrame:
    """
    Limpa o DataFrame: remove 'species', converte sentinelas para NaN e trata
    ausências (descarte de linha por padrão, ou imputação coluna a coluna).

    Args:
        df: DataFrame de entrada.
        sentinels: valores tratados como ausência.
        impute: 'none' (listwise deletion) | 'mean' | 'median' | 'knn'.
        knn_neighbors: vizinhos para imputação k-NN.
        drop_species: remove a coluna 'species' quando presente.

    Returns:
        DataFrame limpo.
    """
    df = df.copy()

    if drop_species and "species" in df.columns:
        df = df.drop(columns=["species"])

    # Converte sentinelas (texto e numéricos) para NaN.
    df = df.replace(_sentinel_replacements(sentinels), np.nan)

    # Recupera o tipo numérico de colunas que ficaram como texto por causa dos
    # sentinelas (permite imputação e comparações corretas).
    for col in df.columns:
        df[col] = _coerce_numeric(df[col])

    if impute == "none":
        return df.dropna()
    return _impute(df, impute, knn_neighbors)


def main() -> None:
    args = parse_args()

    if not os.path.isfile(args.input_csv):
        raise FileNotFoundError(f"Input CSV file '{args.input_csv}' not found.")

    input_df = pd.read_csv(args.input_csv)

    output_df = clean_dataframe(
        input_df,
        sentinels=args.sentinels,
        impute=args.impute,
        knn_neighbors=args.knn_neighbors,
        drop_species=not args.keep_species,
    )

    print(f"{len(input_df) - len(output_df)} / {len(input_df)} linhas removidas "
          f"(sentinelas={args.sentinels}, impute={args.impute}).")

    output_filename = f"clean_{os.path.basename(args.input_csv)}"
    output_df.to_csv(output_filename, index=False)


if __name__ == "__main__":
    main()
