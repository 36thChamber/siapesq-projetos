#!/usr/bin/env python3
import pandas  as pd
import argparse

def run_cmd(args:argparse.Namespace):
    csv=args.csv
    df = pd.read_csv(csv)
    df_1 = df[df["sp"] == 1]
    df_0 = df[df["sp"] == 0]
    print("Registros com sp = 1:", len(df_1))
    print("Registros com sp = 0:", len(df_0))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=str, help="Caminho para o arquivo CSV")
    args = parser.parse_args()
    run_cmd(args)

if __name__ == "__main__":
    main()