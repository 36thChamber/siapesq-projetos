#!/usr/bin/env python3
import xarray as xr
import numpy as np
import argparse
from scipy.ndimage import zoom

def km_to_degrees(lat:float, km_resolution:float) -> tuple[float]:
    lat_degree = km_resolution / 111.32
    lon_degree = km_resolution / (111.32 * np.cos(np.deg2rad(lat)))
    return lat_degree, lon_degree

def resample_dataset(ds:xr.Dataset, lat_name:str,lon_name:str,km_resolution:float) -> xr.Dataset:
    lat_center = ds[lat_name].mean().item()
    lat_deg, lon_deg = km_to_degrees(lat_center, km_resolution)
    new_lat = np.arange(ds[lat_name].min(), ds[lat_name].max(), lat_deg)
    new_lon = np.arange(ds[lon_name].min(), ds[lon_name].max(), lon_deg)
    new_ds = ds.interp({lat_name: new_lat, lon_name: new_lon}, method="linear")
    return new_ds

def run_cmd(args:argparse.Namespace):
    target_resolution_km = args.resolution_km
    nc_file = args.file
    nc_output = args.outfile
    with xr.open_dataset(nc_file) as ds:
        lat_names = ['lat', 'latitude']
        lon_names = ['lon', 'longitude']
        lat_var = next((name for name in lat_names if name in ds), None)
        lon_var = next((name for name in lon_names if name in ds), None)
        
        if lat_var is None or lon_var is None:
            raise ValueError("Latitude or longitude variable not found in the dataset. Check names.")

        print(f"Resampling {nc_file} to {target_resolution_km} km resolution")
        resampled_ds = resample_dataset(ds, lat_var, lon_var, target_resolution_km)
        resampled_ds.to_netcdf(nc_output)
        print(f"Resampled dataset saved to {nc_output}")

def main():
    parser = argparse.ArgumentParser(description='Resample NetCDF file to a specified pixel resolution in km')
    parser.add_argument('--file', type=str, help='Path to the NetCDF or Tiff file', required=True)
    parser.add_argument('--resolution_km', type=float,default=4,help='Target resolution in kilometers')
    parser.add_argument('--outfile', type=str, help='Output file path for the resampled NetCDF', required=True)
    args = parser.parse_args()
    run_cmd(args)
    
if __name__ == "__main__":
    main()