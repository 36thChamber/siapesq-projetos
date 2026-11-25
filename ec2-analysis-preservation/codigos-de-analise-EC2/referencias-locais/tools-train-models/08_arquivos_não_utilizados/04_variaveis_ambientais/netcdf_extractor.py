#!/usr/bin/env python3
# netcdf_extrator.py
# Extracts environmental data from a NetCDF file and returns a pandas DataFrame.
import xarray as xr
import pandas as pd
import argparse
import os

def netcdf_extract_to_dataframe(nc_file: str, ) -> pd.DataFrame:
    ds = xr.open_dataset(nc_file)

    df = ds.to_dataframe().reset_index()

    ds.close()

    df.dropna(inplace=True)

    df["time"] = pd.to_datetime(df["time"], errors="coerce")
    df["year"] = df["time"].dt.year
    df["month"] = df["time"].dt.month
    df["day"] = df["time"].dt.day
    df.drop(columns=["time"], inplace=True)
    
    df.rename(columns={"latitude": "lat", "longitude": "lon"}, inplace=True)
    default_columns = ["lat", "lon", "year", "month", "day"]
    default_columns_set = set(default_columns)
    other_columns = [col for col in df.columns if col not in default_columns_set]
    df = df[default_columns + other_columns]

    return df

def run_cmd(args: argparse.Namespace):
    nc_file = args.nc_file
    output_csv = args.output_csv

    if not os.path.exists(nc_file):
        raise FileNotFoundError(f"NetCDF file {nc_file} does not exist.")
    
    if output_csv is None:
        output_csv = f"extracted_{os.path.basename(nc_file).replace('.nc', '.csv')}"

    df = netcdf_extract_to_dataframe(nc_file)
    df.to_csv(output_csv, index=False)
    print(f"Data extracted and saved to: {output_csv} | Total rows: {len(df)}")

def main():
    parser = argparse.ArgumentParser(description="Extract data from NetCDF file and save to CSV.")
    parser.add_argument("--nc_file", type=str, help="Path to the NetCDF file.")
    parser.add_argument("--output_csv", type=str, nargs="?", help="Path to the output CSV file.")
    
    args = parser.parse_args()
    run_cmd(args)

if __name__ == "__main__":
    main()