#!/usr/bin/env python3

"""
Cleans a CSV file by removing rows with missing or invalid values.
Removes the 'species' column if it exists, replaces '--' with NaN, and
drops rows with any missing values.
Saves the cleaned DataFrame to a new CSV file prefixed with 'clean_'.
"""

import os
import pandas as pd
import argparse

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean a CSV file by removing rows with missing/invalid values.")
    parser.add_argument("--input_csv", type=str, required=True, help="Path to the input CSV file")
    return parser.parse_args()

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans the input DataFrame by removing rows with missing or invalid values.
    Args:
        df (pd.DataFrame): Input DataFrame to be cleaned.
    Returns:
        pd.DataFrame: Cleaned DataFrame.
    """
    # removes species column
    if "species" in df.columns:
        df = df.drop(columns=["species"])
    
    # replace -- with NaN
    df = df.replace("--", pd.NA)
        
    # remove rows with any missing values
    df = df.dropna()
    
    return df

def main() -> None:
    args = parse_args()
    
    if not os.path.isfile(args.input_csv):
        raise FileNotFoundError(f"Input CSV file '{args.input_csv}' not found.")
    
    input_df = pd.read_csv(args.input_csv)
    
    # Clean the DataFrame
    output_df = clean_dataframe(input_df)

    print(f"{len(input_df) - len(output_df)} / {len(input_df)} linhas removidas.")
    
    output_filename = f"clean_{os.path.basename(args.input_csv)}"
    output_df.to_csv(output_filename, index=False)
    
if __name__ == "__main__":
    main()