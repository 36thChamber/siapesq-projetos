#!/usr/bin/env python3
import pandas as pd
import geopandas as gpd
import xarray as xr
from shapely.geometry import Point
import numpy as np
import argparse
import os
import warnings
from pandarallel import pandarallel
from functools import partial
from geopy.distance import great_circle
from radius_checker_utils import check_radius 

warnings.filterwarnings('ignore')

def min_distance_between_sp1_and_sp0(df):
    sp1 = df[df["sp"] == 1][["decimalLatitude", "decimalLongitude"]].values
    sp0 = df[df["sp"] == 0][["decimalLatitude", "decimalLongitude"]].values

    min_dist = float("inf")
    for lat0, lon0 in sp0:
        for lat1, lon1 in sp1:
            dist = great_circle((lat0, lon0), (lat1, lon1)).km
            if dist < min_dist:
                min_dist = dist
    print(f"Menor distância entre pseudo-ausência e presença: {min_dist:.2f} km")

def generate_pseudo_absences(df: pd.DataFrame,
                             gdf: gpd.GeoDataFrame,
                             num_absences: int,
                             ocean_only: bool,
                             bathy_var: xr.DataArray,
                             sp1_points,
                             radius_km: int,
                             number_final_df: int,
                             brazil_polygon) -> pd.DataFrame:
    check_function = partial(check_radius, sp1_points=sp1_points, radius_km=radius_km)
    pseudo_absences = []
    
    minx, miny, maxx, maxy = brazil_polygon.bounds

    samples = df.sample(num_absences, replace=True).reset_index(drop=True)
    for index in range(num_absences):
        row = samples.iloc[index]
        while True:
            lon = np.random.uniform(minx, maxx)
            lat = np.random.uniform(miny, maxy)
            point = Point(lon, lat)

            if not brazil_polygon.contains(point):
                continue

            if gdf.geometry.contains(point).any():
                continue

            if ocean_only:
                try:
                    bathy_value = bathy_var.interp(lat=lat, lon=lon).values.item()
                    if bathy_value is None or bathy_value >= 0 or np.isnan(bathy_value):
                        continue
                except Exception:
                    continue

            pseudo_absences.append({
                "decimalLongitude": lon,
                "decimalLatitude": lat,
                "year": row["year"],
                "month": row["month"],
                "day": row["day"],
                "species": row["species"],
                "sp": 0
            })
            print(f"Generated pseudo absence at ({lon:.2f}, {lat:.2f}) [{index + 1}/{num_absences}]")
            break
    
    df_pseudo = pd.DataFrame(pseudo_absences)
    df = pd.concat([df, df_pseudo], ignore_index=True)
    print(f"\tFiltering pseudo absences within {radius_km} km of presence points...")
    
    sp0_points = df[df["sp"] == 0]
    sp0_filtered = sp0_points[sp0_points.parallel_apply(check_function, axis=1)]
    
    filtered_df = pd.concat([df[df["sp"] == 1], sp0_filtered])
        
    if len(filtered_df) == number_final_df:
        return filtered_df
    else:
        print(f"\tFiltered pseudo absences within {radius_km} km of presence points = {len(filtered_df)}")
        gdf_new = gpd.GeoDataFrame(filtered_df,
                                   geometry=gpd.points_from_xy(
                                       filtered_df.decimalLongitude, 
                                       filtered_df.decimalLatitude), 
                                   crs="EPSG:4326")
        
        print("\tGerando novas pseudo absences para repor as perdidas no raio...")
        faltam = number_final_df - len(filtered_df)
        df_pseudo_recursive = generate_pseudo_absences(
                        filtered_df,
                        gdf_new,
                        faltam,
                        ocean_only,
                        bathy_var,
                        sp1_points,
                        radius_km,
                        number_final_df,
                        brazil_polygon
                    )
        return df_pseudo_recursive

def run_cmd(args: argparse.Namespace):
    csv = args.csv
    radius_km = args.radius_km
    ocean_only = args.ocean_only
    bathymetry_input = args.bathymetry_input
    species_name = args.species_name
    bathy_ds = None
    bathy_var = None

    if ocean_only:
        print("Generating pseudo absences only in ocean...")
        if not bathymetry_input:
            raise ValueError("Bathymetry input file is required when --ocean_only is set.")
        bathy_ds = xr.open_dataset(bathymetry_input)
        bathy_ds = bathy_ds.rename({'__xarray_dataarray_variable__': 'depth', 'x': 'lon', 'y': 'lat'})
        bathy_var = bathy_ds['depth']
        print("Bathymetry loaded.")

    df = pd.read_csv(csv)

    if "species" not in df.columns:
        df["species"] = species_name
    else:
        df["species"] = species_name

    df["sp"] = 1
    sp1_points = df[df["sp"] == 1][["decimalLatitude", "decimalLongitude"]].to_numpy()
    
    print("Baixando polígono de fronteira do Brasil...")
    url_mapa = "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip"
    world = gpd.read_file(url_mapa)
    brazil_polygon = world[world['ADMIN'] == "Brazil"].geometry.iloc[0]
    print("Fronteira carregada!")

    gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df.decimalLongitude, df.decimalLatitude), crs="EPSG:4326")

    num_absences = args.num_absences if args.num_absences > 0 else 3 * len(df)
    number_final_df = len(df) + num_absences
    print(f"{len(df)} presence points detected. Generating {num_absences} pseudo absences inside Brazil.")

    filtered_df = generate_pseudo_absences(
                        df,
                        gdf,
                        num_absences,
                        ocean_only,
                        bathy_var,
                        sp1_points,
                        radius_km,
                        number_final_df,
                        brazil_polygon
                    )
    
    min_distance_between_sp1_and_sp0(filtered_df)

    output_file = f"sp_{os.path.basename(csv)}"
    filtered_df.to_csv(output_file, index=False)
    print(f"Saved final dataset to: {output_file} | Total rows: {len(filtered_df)}")

    if bathy_ds is not None:
        bathy_ds.close()

def main():
    parser = argparse.ArgumentParser(description='Generate pseudo absence data inside Brazil.')
    parser.add_argument('--csv', type=str, required=True)
    parser.add_argument('--num_absences', type=int, default=0)
    parser.add_argument('--radius_km', type=float, default=50)
    parser.add_argument('--ocean_only', action='store_true')
    parser.add_argument('--bathymetry_input', type=str, default='ocean_depth.nc')
    parser.add_argument('--species_name', type=str, default='Unknown')
    parser.add_argument('--cores', type=int, default=1)

    args = parser.parse_args()
    pandarallel.initialize(nb_workers=args.cores, progress_bar=False, verbose=0)
    run_cmd(args)

if __name__ == "__main__":
    main()