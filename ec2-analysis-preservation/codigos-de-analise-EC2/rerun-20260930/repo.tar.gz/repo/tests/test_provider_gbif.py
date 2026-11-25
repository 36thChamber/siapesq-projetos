"""
Testes do Provider GBIF que NÃO exigem rede.

Exercitam o mapeamento `normalize()` (campos nativos do GBIF -> modelo único) e o
backfill taxonômico a partir da linhagem resolvida, usando dados sintéticos.

Um smoke test REAL (com rede) fica em `test_provider_gbif_live` e é pulado
automaticamente quando não há conectividade/pygbif.

Execução:
    python -m unittest tests/test_provider_gbif.py
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
from occurrences.providers.gbif.provider import GBIFProvider  # noqa: E402


class TestGBIFNormalize(unittest.TestCase):
    def setUp(self):
        self.provider = GBIFProvider(OccurrencesConfig(use_cache=False))
        self.taxon = TaxonMatch(
            provider="gbif", query_name="Pomatomus saltatrix", matched=True,
            accepted_name="Pomatomus saltatrix", scientific_name="Pomatomus saltatrix",
            taxon_id="5208090",
            raw={"classification": [
                {"rank": "KINGDOM", "name": "Animalia"},
                {"rank": "PHYLUM", "name": "Chordata"},
                {"rank": "FAMILY", "name": "Pomatomidae"},
            ]},
        )

    def _raw(self):
        # Campos como o GBIF os devolve na busca (muitos já em Darwin Core).
        return pd.DataFrame([{
            "scientificName": "Pomatomus saltatrix (Linnaeus, 1766)",
            "species": "Pomatomus saltatrix",
            "taxonKey": 5208090,
            "order": "Perciformes",
            "decimalLatitude": -23.5,
            "decimalLongitude": -45.1,
            "year": 2019, "month": 8, "day": 29,
            "basisOfRecord": "HUMAN_OBSERVATION",
            "occurrenceID": "obs-1",
            "datasetName": "iNaturalist research-grade observations",
            "country": "Brazil",
        }])

    def test_maps_core_fields(self):
        out = self.provider.normalize(self._raw(), self.taxon)
        self.assertEqual(out.loc[0, "taxonID"], "5208090")
        self.assertEqual(out.loc[0, "accepted_species"], "Pomatomus saltatrix")
        self.assertEqual(out.loc[0, "species"], "Pomatomus saltatrix")
        self.assertEqual(out.loc[0, "provider"], "gbif")
        self.assertEqual(out.loc[0, "source"], "GBIF")
        self.assertEqual(out.loc[0, "decimalLatitude"], -23.5)
        # original_provider vem do datasetName.
        self.assertEqual(out.loc[0, "original_provider"],
                         "iNaturalist research-grade observations")

    def test_taxonomy_backfill_from_lineage(self):
        out = self.provider.normalize(self._raw(), self.taxon)
        # kingdom/phylum/family não vinham no registro -> preenchidos pela linhagem.
        self.assertEqual(out.loc[0, "kingdom"], "Animalia")
        self.assertEqual(out.loc[0, "phylum"], "Chordata")
        self.assertEqual(out.loc[0, "family"], "Pomatomidae")
        # order veio no próprio registro e é preservado.
        self.assertEqual(out.loc[0, "order"], "Perciformes")

    def test_empty_raw_returns_standard_empty(self):
        out = self.provider.normalize(pd.DataFrame(), self.taxon)
        self.assertTrue(out.empty)
        self.assertIn("decimalLatitude", out.columns)


if __name__ == "__main__":
    unittest.main(verbosity=2)
