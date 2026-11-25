#!/usr/bin/env python3
import argparse
import os
from downloaders.cdsapi import run_cmd as cdsapi_cmd
from downloaders.opentopograpy import run_cmd as opentopography_cmd
from downloaders.coperniocusmarine import run_cmd as copernicusmarine_cmd
from downloaders.depth import run_cmd as depth_cmd
from downloaders.depth_GEBCO import run_cmd as depth_gebco_cmd
from downloaders.sdtb import run_cmd as sdtb_cmd
from downloaders.altitude import run_cmd as altitude_cmd
from downloaders.ndvi import run_cmd as ndvi_download_cmd
from checkers.ndvi import run_cmd as ndvi_checker_cmd
from downloaders.gbif import run_cmd as gbif_cmd
from downloaders.oceancolor import run_cmd as oc_cmd

def main():
    
    parser = argparse.ArgumentParser(description='Run routines to download data from different sources to Model Training')
    parser.add_argument('subcommand', action='store_true', help='subcomand help')
    subparsers = parser.add_subparsers(help='subcommand help')

    #cdsapi
    parser_csdapi = subparsers.add_parser('cdsapi', help='cdsapi help')
    parser_csdapi.add_argument('--csv',type=str,help='Path to the CSV file(example:example.csv)',required=True)
    parser_csdapi.add_argument('--data_dir',type=str, help='Path to the directory to save the data from ERA5-Land(default: current directory/era5)',required=False,default=f"{os.getcwd()}/era5")
    parser_csdapi.add_argument('--max_workers',type=int,default=5,help='Number of threads for parallel downloads (default = 5)')
    parser_csdapi.add_argument('--max_retries',type=int,default=5,help='Number of download retries (default = 5)',required=False)
    parser_csdapi.set_defaults(func=cdsapi_cmd)

    #opentopography
    parser_opentopography = subparsers.add_parser('opentopography', help='opentopography help')
    parser_opentopography.add_argument('--data_dir',type=str,help='Path to the directory to save the data from OpenTopography(default: current directory/dem)',required=False,default=f"{os.getcwd()}/dem")
    parser_opentopography.set_defaults(func=opentopography_cmd)
    
    #copernicusmarine
    parser_cmarine = subparsers.add_parser('cmarine', help='cmarine help')
    parser_cmarine.add_argument('--csv',type=str,help='Path to the CSV file(example:example.csv)',required=True)
    parser_cmarine.add_argument('--data_dir',type=str,help='Path to the directory to save the data from Copernicus Marine Data Store (default: current directory/cmarine)',required=False,default=f"{os.getcwd()}/cmarine")
    parser_cmarine.add_argument('--max_workers',type=int,default=5,help='Number of threads for parallel downloads (default = 5)')
    parser_cmarine.add_argument('--num_retries_download',type=int,default=1,help='Number of download attempts (default=1)')
    parser_cmarine.set_defaults(func=copernicusmarine_cmd)

    #depth
    parser_depth = subparsers.add_parser('depth', help='depth help')
    parser_depth.add_argument('--csv',type=str,help='Path to the CSV file(example:example.csv)',required=True)
    parser_depth.add_argument('--minimal_depth',type=int,help='Minimal depth to considerer in bathmetry NC(default: 50)',required=False,default=50)
    parser_depth.add_argument('--bathmetry_netcdf',type=str,help='Path to bathmetry nc file(default: current directory/ocean_depth.nc) used to extract depth',required=False,default=f"{os.getcwd()}/ocean_depth.nc")
    parser_depth.set_defaults(func=depth_cmd)

    # depth_GEBCO
    parser_depth_gebco = subparsers.add_parser('depth_gebco', help='depth_GEBCO help')
    parser_depth_gebco.add_argument('--csv', type=str, required=True, help='Path to the CSV file (example: example.csv)')
    parser_depth_gebco.add_argument('--bathmetry_netcdf', type=str, required=True, help='Path to bathymetry NetCDF file')
    parser_depth_gebco.add_argument('--minimal_depth', type=float, default=0.0, help='Minimal depth to consider (default: 0.0)')
    parser_depth_gebco.add_argument('--db', action='store_true', help='If set, insert into database')
    parser_depth_gebco.set_defaults(func=depth_gebco_cmd)

    # altitude_GEBCO
    parser_altitude = subparsers.add_parser('altitude', help='Altitude from GEBCO for land areas')
    parser_altitude.add_argument('--csv', type=str, required=True, help='Path to the CSV file (example: example.csv)')
    parser_altitude.add_argument('--bathymetry_netcdf', type=str, required=True, help='Path to bathymetry NetCDF file')
    parser_altitude.set_defaults(func=altitude_cmd)

    # sdtb
    parser_sdtb = subparsers.add_parser('sdtb', help='Soil depth to bedrock')
    parser_sdtb.add_argument('--csv',type=str,help='Path to the CSV file',required=True)
    parser_sdtb.add_argument('--nc_file',type=str, help='Path to sdtb.nc',required=True)
    parser_sdtb.set_defaults(func=sdtb_cmd)

    #ndvi
    parser_ndvi = subparsers.add_parser('ndvi', help='NDVI related operations')
    ndvi_subparsers = parser_ndvi.add_subparsers(dest="ndvi_subcommand", help="NDVI subcommands")
    # ndvi download
    parser_ndvi_download = ndvi_subparsers.add_parser('download', help='Download NDVI data')
    parser_ndvi_download.add_argument('--csv', type=str, required=True, help='Path to the CSV file(example:example.csv)')
    parser_ndvi_download.add_argument('--data_dir',type=str, help='Path to the directory to save NDVI data from NOAA(default: current directory/ndvi)',required=False,default=f"{os.getcwd()}/ndvi")
    parser_ndvi_download.set_defaults(func=ndvi_download_cmd)
    # ndvi checker
    parser_ndvi_checker = ndvi_subparsers.add_parser('checker', help='Check NDVI data integrity')
    parser_ndvi_checker.add_argument('--csv', type=str, required=True, help='Path to the CSV file(example:example.csv)')
    parser_ndvi_checker.set_defaults(func=ndvi_checker_cmd)
  
    #gbif
    parser_gbif = subparsers.add_parser('gbif', help='gbif help')
    parser_gbif.add_argument('--species_name',type=str, help='Name of the species to search in GBIF', required=False, default=None)
    parser_gbif.add_argument("--genus_name", help="Name of the genus to search in GBIF. (Ex.: coffea)", required=False, default=None)
    parser_gbif.add_argument('--min_lat',type=float, help='Min latitude to consider in the search',required=True)
    parser_gbif.add_argument('--min_lon',type=float, help='Min longitude to consider in the search',required=True)
    parser_gbif.add_argument('--max_lat',type=float, help='Max latitude to consider in the search',required=True)
    parser_gbif.add_argument('--max_lon',type=float, help='Max longitude to consider in the search',required=True)
    parser_gbif.add_argument('--max_year',type=int, help='Max year to consider in the search(default: 2025)',required=False,default=2025)
    parser_gbif.add_argument('--min_year',type=int, help='Min year to consider in the search(default: 2000)',required=False,default=2000)
    parser_gbif.add_argument('--output_dir',type=str, help='Path to the directory to save the data from GBIF(default: current directory/gbif)',required=False,default=f"{os.getcwd()}/gbif")
    parser_gbif.add_argument('--limit',type=int, help='Limit of records to download from GBIF(default: 100000)',required=False,default=100000)
    parser_gbif.set_defaults(func=gbif_cmd)

    # Ocean Color
    parser_ocean_color = subparsers.add_parser('oceancolor', help="oceancolor help")
    parser_ocean_color.add_argument('--csv',type=str,
                                    help='Path to the CSV file(example:example.csv)',
                                    required=True)
    parser_ocean_color.add_argument('--var', type=str, help="chl, so,", required=True)
    parser_ocean_color.add_argument("--bbox",
                                     type=float, 
                                     nargs=4, 
                                     required=True, 
                                     metavar=('LAT_MAX', 'LAT_MIN', 'LON_MAX', 'LON_MIN'))
    parser_ocean_color.add_argument('--max_year',type=str, 
                                    help='Max year to consider in the search(default: 2025)',
                                    required=False,default=2025)
    parser_ocean_color.add_argument('--min_year',type=str,
                                    help='Min year to consider in the search(default: 2000)',
                                    required=False,default=2000)
    parser_ocean_color.add_argument('--cc', type=int,
                                    nargs=2,
                                    help="cloud cover --cc 0 50",
                                    required=False,
                                    metavar=('min', 'max'),
                                    default=None)
    parser_ocean_color.add_argument('--output_dir',
                             type=str, 
                             help='Path to the directory to save the data from GBIF(default: current directory/gbif)',
                             required=False,
                             default=f"{os.getcwd()}/oceancolor")
    
    parser_ocean_color.set_defaults(func=oc_cmd)

    
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
