#!/usr/bin/env python3
import argparse
import os

import numpy as np
import pandas as pd
import rasterio


def add_occup_solo_column(
    csv_path: str,
    raster_path: str,
    out_path: str | None = None,
    col_name: str = "ocup_solo",
) -> str:
    """
    Adiciona uma coluna com o valor de ocupação do solo (MapBiomas)
    para cada ponto (lat, lon) do predictor.csv.

    csv_path   : caminho do predictor.csv
    raster_path: GeoTIFF categórico de uso do solo (ocup_solo.tif)
    out_path   : caminho do CSV de saída (opcional)
    col_name   : nome da nova coluna (default: 'ocup_solo')
    """
    if out_path is None:
        dirname = os.path.dirname(csv_path)
        base = os.path.basename(csv_path)
        name, ext = os.path.splitext(base)
        out_path = os.path.join(dirname, f"{name}_with_{col_name}{ext}")

    print(f"[INFO] Lendo CSV: {csv_path}")
    df = pd.read_csv(csv_path)

    if not {"decimalLatitude", "decimalLongitude"}.issubset(df.columns):
        raise ValueError(
            "CSV precisa ter as colunas 'decimalLatitude' e 'decimalLongitude'."
        )

    lats = df["decimalLatitude"].astype(float).to_numpy()
    lons = df["decimalLongitude"].astype(float).to_numpy()

    print(f"[INFO] Abrindo raster: {raster_path}")
    with rasterio.open(raster_path) as src:
        # coordenadas no formato (x=lon, y=lat), mesmo CRS (EPSG:4326)
        coords = list(zip(lons, lats))
        print(f"[INFO] Amostrando {len(coords)} pontos no raster grande (sem carregar tudo em memória)...")

        samples = list(src.sample(coords))
        values = np.array([s[0] if s is not None else np.nan for s in samples])

        nodata = src.nodata
        if nodata is not None:
            values = np.where(values == nodata, np.nan, values)

    df[col_name] = values

    print(f"[INFO] Salvando CSV com coluna '{col_name}': {out_path}")
    df.to_csv(out_path, index=False)

    return out_path


def main():
    parser = argparse.ArgumentParser(
        description="Adiciona coluna de ocupação do solo (MapBiomas) ao predictor.csv."
    )
    parser.add_argument(
        "--csv",
        required=True,
        help="Caminho para o predictor.csv",
    )
    parser.add_argument(
        "--raster",
        required=True,
        help="Caminho para o GeoTIFF de ocupação do solo (ocup_solo.tif)",
    )
    parser.add_argument(
        "--output",
        help="Caminho do CSV de saída (opcional). "
             "Se não informar, gera <predictor>_with_ocup_solo.csv.",
    )
    parser.add_argument(
        "--column",
        default="ocup_solo",
        help="Nome da coluna a ser criada (default: ocup_solo).",
    )

    args = parser.parse_args()
    add_occup_solo_column(
        csv_path=args.csv,
        raster_path=args.raster,
        out_path=args.output,
        col_name=args.column,
    )


if __name__ == "__main__":
    main()
