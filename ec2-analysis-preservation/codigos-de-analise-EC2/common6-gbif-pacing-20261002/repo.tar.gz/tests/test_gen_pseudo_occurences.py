import os
import sys
import unittest
from pandarallel import pandarallel
import pandas as pd
import geopandas as gpd
import json
import xarray as xr
import argparse

# Adiciona o diretório do módulo de pseudo-ausência ao sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '02_pseudoabsence')))
from gen_pseudo_occurences import generate_pseudo_absences

# Variável global para passar para os testes
CONFIG = {}

# Carregar configuração a partir da linha de comando
def load_config():
    """Carrega arquivo de configuração."""
    global CONFIG
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', type=str, help='Caminho para o arquivo de configuração JSON')

    # Aqui está o que estava faltando:
    args, remaining_args = parser.parse_known_args()

    if args.config:
        with open(args.config, 'r') as f:
            CONFIG = json.load(f)

    # Remover os args personalizados de sys.argv para evitar conflito com unittest
    sys.argv = [sys.argv[0]] + remaining_args


class TestGeneratePseudoAbsences(unittest.TestCase):
    """Testes para a função 'generate_pseudo_absences.'"""

    def setUp(self):
        """
        Setup inicial para passar na função.
        """
        pandarallel.initialize(nb_workers=1, progress_bar=False, verbose=0)
        csv_name = CONFIG.get("csv_name")
        species_name = CONFIG.get("species_name")
        self.radius_km = CONFIG.get("radius_km")
        bathymetry_input = CONFIG.get("bathymetry_input")
        self.bbox = CONFIG.get("bbox")
        self.ocean_only = CONFIG.get("ocean_only")
        self.num_absences = CONFIG.get("num_absences")
        self.number_final_df = CONFIG.get("number_final_df")

        self.df = pd.read_csv(csv_name)

        if "species" not in self.df.columns:
            #print(f"Column 'species' not found. Creating it with value '{species_name}'.")
            self.df["species"] = species_name
        else:
            #print(f"Overriding 'species' column with value '{species_name}'.")
            self.df["species"] = species_name

        self.df["sp"] = 1
        self.sp1_points = self.df[self.df["sp"] == 1][["decimalLatitude", "decimalLongitude"]].to_numpy()
        
        self.gdf = gpd.GeoDataFrame(self.df, geometry=gpd.points_from_xy(
                                                    self.df.decimalLongitude,
                                                    self.df.decimalLatitude),
                                                    crs="EPSG:4326")

        #num_absences = args.num_absences if args.num_absences > 0 else 2 * len(df)
        self.num_absences = 1000
        self.number_final_df = len(self.df) + self.num_absences

        self.bathy_ds = xr.open_dataset(bathymetry_input)
        self.bathy_ds = self.bathy_ds.rename({'__xarray_dataarray_variable__': 'depth', 'x': 'lon', 'y': 'lat'})
        self.bathy_var = self.bathy_ds['depth']

    def test_number_absences(self,):
        """
        Testa se o número esperado de absences está correto.
        """
        """ df = self.df
        gdf = self.gdf
        num_absences = self.num_absences
        ocean_only = self.ocean_only
        bathy_var = self.bathy_var
        bbox = self.bbox
        sp1_points = self.sp1_points
        radius_km = self.radius_km
        number_final_df = self.number_final_df """


        df_pseudo = generate_pseudo_absences(self.df, self.gdf, self.num_absences, 
                                            self.ocean_only, 
                                            self.bathy_var, 
                                            self.bbox,
                                            self.sp1_points,
                                            self.radius_km,
                                            self.number_final_df)
        
        # Testando
        self.assertEqual(len(df_pseudo), self.number_final_df)
    
    def test_number_absences_not_ocean_only(self,):
        """Testa se o número esperado de absences está correto com ocean_only=False
        """
        ocean_only=False
        number_final_df = 2*len(self.df) + self.num_absences
        #number_final_df = 6000 # 2000:sp1 + 4000:sp0
        df_pseudo = generate_pseudo_absences(self.df, self.gdf, self.num_absences, 
                                            ocean_only, 
                                            self.bathy_var, 
                                            self.bbox,
                                            self.sp1_points,
                                            self.radius_km,
                                            number_final_df)
        
        # Testando
        self.assertEqual(len(df_pseudo), 6000)


if __name__ == "__main__":
    load_config()
    unittest.main()