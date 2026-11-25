"""
Testes do Provider SpeciesLink que NÃO exigem rede nem chave de API.

Exercitam o mapeamento `normalize()` (Darwin Core antigo -> modelo único), o
helper de bbox e a FALHA GRACIOSA quando a chave (SPECIESLINK_APIKEY) não está
configurada (o provider deve reportar erro claro sem levantar exceção).

Execução:
    python -m unittest tests/test_provider_specieslink.py
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
from occurrences.providers.specieslink.provider import (  # noqa: E402
    SpeciesLinkProvider, _bbox_param,
)


class TestBbox(unittest.TestCase):
    def test_world_none(self):
        self.assertIsNone(_bbox_param((-180, 180), (-90, 90)))

    def test_region(self):
        self.assertEqual(_bbox_param((-60, -30), (-40, -10)), "-60,-40,-30,-10")


class TestNormalize(unittest.TestCase):
    def setUp(self):
        self.p = SpeciesLinkProvider(OccurrencesConfig(use_cache=False))
        self.tm = TaxonMatch(provider="specieslink", query_name="Pomatomus saltatrix",
                             matched=True, scientific_name="Pomatomus saltatrix")

    def test_darwin_core_lowercase_mapping(self):
        # A API do SpeciesLink devolve os termos Darwin Core em MINÚSCULAS.
        raw = pd.DataFrame([{
            "scientificname": "Pomatomus saltatrix", "family": "Pomatomidae",
            "specificepithet": "saltatrix",
            "decimallatitude": -23.9, "decimallongitude": -46.3,
            "yearcollected": 2012, "monthcollected": 3, "daycollected": 15,
            "basisofrecord": "PreservedSpecimen", "institutioncode": "MZUSP",
            "catalognumber": "12345", "county": "Santos", "stateprovince": "SP",
            "recordedby": "Fulano",
        }])
        out = self.p.normalize(raw, self.tm)
        self.assertEqual(out.loc[0, "scientificName"], "Pomatomus saltatrix")
        self.assertEqual(out.loc[0, "accepted_species"], "Pomatomus saltatrix")
        self.assertEqual(out.loc[0, "specificEpithet"], "saltatrix")
        self.assertEqual(out.loc[0, "year"], 2012)
        self.assertEqual(out.loc[0, "month"], 3)
        self.assertEqual(out.loc[0, "day"], 15)
        self.assertEqual(out.loc[0, "municipality"], "Santos")
        self.assertEqual(out.loc[0, "stateProvince"], "SP")
        self.assertEqual(out.loc[0, "basisOfRecord"], "PRESERVED_SPECIMEN")
        self.assertEqual(out.loc[0, "institutionCode"], "MZUSP")
        self.assertEqual(out.loc[0, "catalogNumber"], "12345")
        self.assertEqual(out.loc[0, "recordedBy"], "Fulano")
        self.assertEqual(out.loc[0, "provider"], "specieslink")


class TestGracefulNoKey(unittest.TestCase):
    def test_fetch_without_key_reports_error(self):
        # Garante que a variável não está definida neste teste.
        old = os.environ.pop("SPECIESLINK_APIKEY", None)
        try:
            p = SpeciesLinkProvider(OccurrencesConfig(use_cache=False))
            df, stats = p.fetch("Pomatomus saltatrix", (-60, -30), (-40, -10), (2000, 2020))
            self.assertFalse(stats.success)
            self.assertTrue(df.empty)
            self.assertIn("SPECIESLINK_APIKEY", stats.errors[0])
        finally:
            if old is not None:
                os.environ["SPECIESLINK_APIKEY"] = old


if __name__ == "__main__":
    unittest.main(verbosity=2)
