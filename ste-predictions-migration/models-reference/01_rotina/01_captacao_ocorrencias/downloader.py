#!/usr/bin/env python3
import argparse
import os
from downloaders.cdsapi import run_cmd as cdsapi_cmd
from downloaders.opentopograpy import run_cmd as opentopography_cmd
from downloaders.sdtb import run_cmd as sdtb_cmd
# NOTA (2026-07): `downloaders.altitude` (altitude via GEBCO), `downloaders.ndvi`
# (NDVI NOAA diário) e `checkers.ndvi` foram ARQUIVADOS em
# `08_arquivos_não_utilizados/04_variaveis_ambientais/` — substituídos pela captura
# na nuvem (altitude = COP30/AWS; NDVI = MODIS/ORNL via env_providers). Seus
# subcomandos foram removidos deste CLI.
# NOTA (2026-08, migração STE): os downloaders MARINHOS (coperniocusmarine, depth,
# depth_GEBCO, oceancolor) NÃO foram migrados para o STE Primatas RS — vivem no
# projeto tools-train-models. Os subcomandos correspondentes abortam com aviso.
from downloaders.gbif import run_cmd as gbif_cmd
from cleaning.occurrence_cleaner import run_cmd as gbif_clean_cmd


def _marinho_indisponivel(*_args, **_kwargs):
    raise SystemExit("[STE] Componente marinho não incluído neste projeto — "
                     "use o tools-train-models (E:\\Projetos\\tools-train-models).")


copernicusmarine_cmd = depth_cmd = depth_gebco_cmd = oc_cmd = _marinho_indisponivel

def main():
    
    parser = argparse.ArgumentParser(description='Run routines to download data from different sources to Model Training')
    parser.add_argument('subcommand', action='store_true', help='subcomand help')
    subparsers = parser.add_subparsers(help='subcommand help')

    #cdsapi
    parser_csdapi = subparsers.add_parser('cdsapi', help='cdsapi help')
    parser_csdapi.add_argument('--csv',type=str,help='Path to the CSV file(example:example.csv)',required=True)
    parser_csdapi.add_argument('--data_dir',type=str, help='Path to the directory to save the data from ERA5-Land(default: current directory/era5)',required=False,default=f"{os.getcwd()}/dados_saida/era5")
    parser_csdapi.add_argument('--max_workers',type=int,default=5,help='Number of threads for parallel downloads (default = 5)')
    parser_csdapi.add_argument('--max_retries',type=int,default=5,help='Number of download retries (default = 5)',required=False)
    parser_csdapi.set_defaults(func=cdsapi_cmd)

    #opentopography
    parser_opentopography = subparsers.add_parser('opentopography', help='opentopography help')
    parser_opentopography.add_argument('--data_dir',type=str,help='Path to the directory to save the data from OpenTopography(default: current directory/dem)',required=False,default=f"{os.getcwd()}/dados_saida/dem")
    parser_opentopography.add_argument('--area', type=float, nargs=4, required=False, default=None, metavar=('WEST','EAST','NORTH','SOUTH'), help='Bounding box (west east north south). Default: América do Sul. Requer OPENTOPOGRAPHY_API_KEY no .env.')
    parser_opentopography.set_defaults(func=opentopography_cmd)
    
    #copernicusmarine
    parser_cmarine = subparsers.add_parser('cmarine', help='cmarine help')
    parser_cmarine.add_argument('--csv',type=str,help='Path to the CSV file(example:example.csv)',required=True)
    parser_cmarine.add_argument('--data_dir',type=str,help='Path to the directory to save the data from Copernicus Marine Data Store (default: current directory/cmarine)',required=False,default=f"{os.getcwd()}/dados_saida/cmarine")
    parser_cmarine.add_argument('--max_workers',type=int,default=5,help='Number of threads for parallel downloads (default = 5)')
    parser_cmarine.add_argument('--num_retries_download',type=int,default=1,help='Number of download attempts (default=1)')
    parser_cmarine.set_defaults(func=copernicusmarine_cmd)

    #depth
    parser_depth = subparsers.add_parser('depth', help='depth help')
    parser_depth.add_argument('--csv',type=str,help='Path to the CSV file(example:example.csv)',required=True)
    parser_depth.add_argument('--minimal_depth',type=int,help='Minimal depth to considerer in bathmetry NC(default: 50)',required=False,default=50)
    parser_depth.add_argument('--bathmetry_netcdf',type=str,help='Path to bathmetry nc file(default: current directory/ocean_depth.nc) used to extract depth',required=False,default=f"{os.getcwd()}/dados_entrada/ocean_depth.nc")
    parser_depth.set_defaults(func=depth_cmd)

    # depth_GEBCO
    parser_depth_gebco = subparsers.add_parser('depth_gebco', help='depth_GEBCO help')
    parser_depth_gebco.add_argument('--csv', type=str, required=True, help='Path to the CSV file (example: example.csv)')
    parser_depth_gebco.add_argument('--bathmetry_netcdf', type=str, required=True, help='Path to bathymetry NetCDF file')
    parser_depth_gebco.add_argument('--minimal_depth', type=float, default=0.0, help='Minimal depth to consider (default: 0.0)')
    parser_depth_gebco.add_argument('--db', action='store_true', help='If set, insert into database')
    parser_depth_gebco.set_defaults(func=depth_gebco_cmd)

    # sdtb
    parser_sdtb = subparsers.add_parser('sdtb', help='Soil depth to bedrock')
    parser_sdtb.add_argument('--csv',type=str,help='Path to the CSV file',required=True)
    parser_sdtb.add_argument('--nc_file',type=str, help='Path to sdtb.nc',required=True)
    parser_sdtb.set_defaults(func=sdtb_cmd)

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
    parser_gbif.add_argument('--output_dir',type=str, help='Path to the directory to save the data from GBIF(default: current directory/gbif)',required=False,default=f"{os.getcwd()}/dados_saida/gbif")
    parser_gbif.add_argument('--limit',type=int, help='[DEPRECATED] Kept for backward compatibility; the RAW download preserves all matching records and does not truncate.',required=False,default=100000)
    parser_gbif.add_argument('--keep_archive', action='store_true', help='Keep the raw DWCA .zip and extracted files instead of deleting them after building the RAW CSV.')
    parser_gbif.add_argument('--strict_taxon_match', action='store_true', help='Abort if the GBIF backbone match is not EXACT/confident (avoids downloading the wrong taxon).')
    parser_gbif.set_defaults(func=gbif_cmd)

    #gbif_clean - limpeza do CSV bruto do GBIF (etapa separada do download)
    parser_gbif_clean = subparsers.add_parser('gbif_clean', help='Clean a RAW GBIF occurrence CSV for SDM')
    parser_gbif_clean.add_argument('--csv', type=str, required=True, help='Path to the RAW GBIF CSV (e.g. Species_GBIF_raw.csv)')
    parser_gbif_clean.add_argument('--config', type=str, required=False, default=None, help='Path to a CleaningConfig JSON file. If omitted, defaults are used.')
    parser_gbif_clean.add_argument('--output_csv', type=str, required=False, default=None, help='Output path for the clean CSV (default: derived, *_GBIF_Data.csv).')
    parser_gbif_clean.add_argument('--report_dir', type=str, required=False, default=None, help='Directory for cleaning_report.json/.txt (default: alongside output).')
    parser_gbif_clean.add_argument('--reference_data_dir', type=str, required=False, default=None, help='Cache directory for cartographic reference data (Natural Earth, etc.).')
    parser_gbif_clean.add_argument('--habitat', type=str, required=False, default=None, choices=['terrestrial', 'marine', 'any'], help='Land/ocean policy (overrides config).')
    parser_gbif_clean.add_argument('--max_coordinate_uncertainty', type=float, required=False, default=None, help='Max coordinate uncertainty in meters (overrides config).')
    parser_gbif_clean.add_argument('--min_year', type=int, required=False, default=None, help='Minimum acceptable year (overrides config).')
    parser_gbif_clean.add_argument('--max_year', type=int, required=False, default=None, help='Maximum acceptable year (overrides config).')
    parser_gbif_clean.add_argument('--remove_centroids', action='store_true', help='Remove records flagged as administrative centroids.')
    parser_gbif_clean.add_argument('--remove_institutions', action='store_true', help='Remove records flagged as institutions.')
    parser_gbif_clean.add_argument('--remove_capitals', action='store_true', help='Remove records flagged as capitals.')
    parser_gbif_clean.set_defaults(func=gbif_clean_cmd)

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
                             default=f"{os.getcwd()}/dados_saida/oceancolor")
    
    parser_ocean_color.set_defaults(func=oc_cmd)

    
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
