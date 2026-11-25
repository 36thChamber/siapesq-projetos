import pandas as pd
import xarray as xr
import argparse
import numpy as np
import os

def run_cmd(args: argparse.Namespace):
    csv = args.csv
    nc = args.nc_file
    df = pd.read_csv(csv)

    with xr.open_dataset(nc) as ds:
        var = ds["Band1"]
        values = []

        for _, row in df.iterrows():
            lon = float(row.get("decimalLongitude"))
            lat = float(row.get("decimalLatitude"))

            try:
                valor = var.sel(lon=lon, lat=lat, method="nearest").values.item()
                print(f"({lat}, {lon}) = {valor}")

                if valor is not None and not np.isnan(valor):
                    values.append(round(valor, 2))
                else:
                    values.append(np.nan)

            except Exception as e:
                print(f"Erro ao interpolar valor em ({lat}, {lon}): {e}")
                values.append(np.nan)

        df["sdtb"] = values

        # remover linhas sem sdtb
        df_clean = df.dropna(subset=["sdtb"])

        out_filename = f"out_sdtb_{os.path.basename(csv)}"
        df_clean.to_csv(out_filename, index=False)

    print(f"Arquivo salvo: {out_filename}")
    print(f"Registros válidos: {len(df_clean)} / {len(df)}")
    print(f"Registros removidos: {len(df) - len(df_clean)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extracts sdtb.nc data")
    parser.add_argument("--csv", required=True, help="CSV de entrada com lat/lon")
    parser.add_argument("--nc_file", required=True, help="Arquivo .nc (ex.: sdtb.nc)")
    args = parser.parse_args()
    run_cmd(args)