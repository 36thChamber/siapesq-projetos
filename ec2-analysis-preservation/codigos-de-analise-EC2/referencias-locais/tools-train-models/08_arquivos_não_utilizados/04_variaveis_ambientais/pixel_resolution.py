#!/usr/bin/env python3
import xarray as xr
import numpy as np
import geopy.distance
import argparse

def run_cmd(args:argparse.Namespace):
    file_path= args.file
    with xr.open_dataset(file_path) as ds:
        lat_names = ['lat', 'latitude']
        lon_names = ['lon', 'longitude']
        lat_var = next((name for name in lat_names if name in ds), None)
        lon_var = next((name for name in lon_names if name in ds), None)
        
        if lat_var is None or lon_var is None:
            raise ValueError("Latitude or longitude variable not found in the dataset. Check names.")
        
        latitudes = ds[lat_var].values
        longitudes = ds[lon_var].values
        lat_diff = np.abs(latitudes[1] - latitudes[0])
        lon_diff = np.abs(longitudes[1] - longitudes[0])
        km_per_degree_lat = 111.0
        point1 = (latitudes[0], longitudes[0])
        point2 = (latitudes[0], longitudes[1])
        km_per_degree_lon = geopy.distance.distance(point1, point2).km
        lat_resolution_km = lat_diff * km_per_degree_lat
        lon_resolution_km = lon_diff * km_per_degree_lon
        print(f"Latitude resolution: {lat_resolution_km:.2f} km")
        print(f"Longitude resolution: {lon_resolution_km:.2f} km")


def main():
    parser = argparse.ArgumentParser(description='Find pixel resolution in km')
    parser.add_argument('--file', type=str, help='Path to the NetCDF or Tiff file', required=True)
    args = parser.parse_args()
    run_cmd(args)
    

if __name__ == "__main__":
    main()