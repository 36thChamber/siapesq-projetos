"""
Testes do Provider iNaturalist que NÃO exigem rede.

Exercitam o achatamento de uma observação aninhada (`_flatten`), o mapeamento
`normalize()` e — em especial — a construção do `occurrenceID` no formato de URL
usado pelo GBIF (habilita deduplicação cruzada GBIF<->iNaturalist).

Execução:
    python -m unittest tests/test_provider_inaturalist.py
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
from occurrences.providers.inaturalist.provider import INaturalistProvider  # noqa: E402


class TestINaturalist(unittest.TestCase):
    def setUp(self):
        self.p = INaturalistProvider(OccurrencesConfig(use_cache=False))
        self.tm = TaxonMatch(
            provider="inaturalist", query_name="Pomatomus saltatrix", matched=True,
            accepted_name="Pomatomus saltatrix", scientific_name="Pomatomus saltatrix",
            taxon_id="50984",
            raw={"kingdom": "Animalia", "class": "Actinopterygii", "family": "Pomatomidae"},
        )

    def _obs(self):
        return {
            "id": 115546,
            "uri": "http://www.inaturalist.org/observations/115546",
            "observed_on": "2012-08-22",
            "observed_on_details": {"date": "2012-08-22", "day": 22, "month": 8, "year": 2012},
            "quality_grade": "research",
            "place_guess": "Long Island Sound",
            "license_code": "cc-by-nc",
            "positional_accuracy": 50,
            "geojson": {"type": "Point", "coordinates": [-72.5469, 41.2488]},
            "taxon": {"name": "Pomatomus saltatrix", "rank": "species"},
            "user": {"login": "kueda"},
        }

    def test_flatten_and_occurrenceid_format(self):
        row = INaturalistProvider._flatten(self._obs(), self.tm)
        self.assertEqual(row["decimalLatitude"], 41.2488)
        self.assertEqual(row["decimalLongitude"], -72.5469)
        self.assertEqual(row["day"], 22)
        self.assertEqual(row["coordinateUncertaintyInMeters"], 50)
        self.assertEqual(row["recordedBy"], "kueda")
        # occurrenceID no MESMO formato do GBIF (dedup cruzada).
        self.assertEqual(row["occurrenceID"],
                         "https://www.inaturalist.org/observations/115546")
        self.assertEqual(row["license"], "CC-BY-NC")

    def test_normalize_maps_and_backfills(self):
        raw = pd.DataFrame([INaturalistProvider._flatten(self._obs(), self.tm)])
        out = self.p.normalize(raw, self.tm)
        self.assertEqual(out.loc[0, "accepted_species"], "Pomatomus saltatrix")
        self.assertEqual(out.loc[0, "taxonID"], "50984")
        self.assertEqual(out.loc[0, "class"], "Actinopterygii")
        self.assertEqual(out.loc[0, "family"], "Pomatomidae")
        self.assertEqual(out.loc[0, "basisOfRecord"], "HUMAN_OBSERVATION")
        self.assertEqual(out.loc[0, "provider"], "inaturalist")
        self.assertEqual(out.loc[0, "original_provider"], "iNaturalist")


if __name__ == "__main__":
    unittest.main(verbosity=2)
