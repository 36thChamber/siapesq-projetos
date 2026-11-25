"""
Testes do Provider BOLD Systems que NÃO exigem rede.

Exercitam o mapeamento `normalize()` do padrão BCDM -> modelo único, com atenção
às peculiaridades: `coord` como [LAT, LON], chaves com barra ("country/ocean",
"province/state") e derivação de data.

Execução:
    python -m unittest tests/test_provider_bold.py
"""

import os
import sys
import unittest

import pandas as pd

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "01_data_acquisition"))
)

from occurrences.config import OccurrencesConfig  # noqa: E402
from occurrences.base import TaxonMatch  # noqa: E402
from occurrences.providers.bold.provider import BOLDProvider, _year_of  # noqa: E402


class TestYearOf(unittest.TestCase):
    def test_parses_year(self):
        self.assertEqual(_year_of("2000-01-01"), 2000)
        self.assertIsNone(_year_of(None))
        self.assertIsNone(_year_of("N/A"))


class TestBOLDNormalize(unittest.TestCase):
    def setUp(self):
        self.p = BOLDProvider(OccurrencesConfig(use_cache=False))
        self.tm = TaxonMatch(provider="bold", query_name="Pomatomus saltatrix",
                             matched=True, scientific_name="Pomatomus saltatrix")

    def _raw(self):
        # Registro BCDM como o BOLD devolve (chaves com barra, coord [lat, lon]).
        return pd.DataFrame([{
            "processid": "AMS933-08", "museumid": "I.43204-005",
            "kingdom": "Animalia", "phylum": "Chordata", "class": "Teleostei",
            "order": "Scombriformes", "family": "Pomatomidae", "genus": "Pomatomus",
            "species": "Pomatomus saltatrix", "identification": "Pomatomus saltatrix",
            "coord": [-34.05, 151.08333], "coord_accuracy": None,
            "country/ocean": "Australia", "province/state": "New South Wales",
            "collection_date_start": "2000-06-15",
            "inst": "Australian Museum, Sydney",
            "collectors": "B. Pease", "taxid": 18117,
        }])

    def test_coord_split_and_slash_keys(self):
        out = self.p.normalize(self._raw(), self.tm)
        # coord [lat, lon] -> colunas certas.
        self.assertEqual(out.loc[0, "decimalLatitude"], -34.05)
        self.assertEqual(out.loc[0, "decimalLongitude"], 151.08333)
        # chaves com barra mapeadas.
        self.assertEqual(out.loc[0, "country"], "Australia")
        self.assertEqual(out.loc[0, "stateProvince"], "New South Wales")

    def test_mapping_and_date(self):
        out = self.p.normalize(self._raw(), self.tm)
        self.assertEqual(out.loc[0, "accepted_species"], "Pomatomus saltatrix")
        self.assertEqual(out.loc[0, "catalogNumber"], "I.43204-005")
        self.assertEqual(out.loc[0, "occurrenceID"], "AMS933-08")
        self.assertEqual(out.loc[0, "institutionCode"], "Australian Museum, Sydney")
        self.assertEqual(out.loc[0, "recordedBy"], "B. Pease")
        self.assertEqual(out.loc[0, "taxonID"], "18117")
        self.assertEqual(out.loc[0, "year"], 2000)
        self.assertEqual(out.loc[0, "month"], 6)
        self.assertEqual(out.loc[0, "day"], 15)
        self.assertEqual(out.loc[0, "basisOfRecord"], "MATERIAL_SAMPLE")
        self.assertEqual(out.loc[0, "provider"], "bold")


if __name__ == "__main__":
    unittest.main(verbosity=2)
