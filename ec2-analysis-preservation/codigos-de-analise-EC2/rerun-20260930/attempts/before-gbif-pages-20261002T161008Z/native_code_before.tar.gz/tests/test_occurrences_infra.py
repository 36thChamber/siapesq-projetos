"""
Testes da infraestrutura comum da aquisição multi-fonte (Etapa 2).

Cobrem, SEM acesso à rede:
    - o modelo único (standardize_frame): esquema, NULLs, coerção, `species`;
    - a união (merge_frames);
    - a deduplicação por níveis (low/medium/high);
    - a validação estrutural (quality_flags);
    - o cache round-trip (parquet/csv);
    - o `OccurrenceManager` de ponta a ponta com um Provider DUMMY em memória,
      provando que o CSV final tem as colunas exigidas a jusante.

Execução (a partir da raiz do repositório):
    python -m unittest tests/test_occurrences_infra.py
"""

import os
import sys
import tempfile
import unittest

import pandas as pd

# Adiciona 01_data_acquisition ao sys.path (mesma convenção dos demais testes).
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "01_data_acquisition"))
)

from occurrences.models import (  # noqa: E402
    STANDARD_COLUMNS,
    DOWNSTREAM_REQUIRED_COLUMNS,
    standardize_frame,
    empty_frame,
)
from occurrences.merger import merge_frames  # noqa: E402
from occurrences.deduplicator import deduplicate  # noqa: E402
from occurrences.validator import validate  # noqa: E402
from occurrences.cache import CacheManager  # noqa: E402
from occurrences.config import OccurrencesConfig  # noqa: E402
from occurrences.manager import OccurrenceManager  # noqa: E402
from occurrences.base import BaseProvider, ProviderMetadata, TaxonMatch  # noqa: E402


class TestModel(unittest.TestCase):
    def test_standardize_creates_all_columns_and_order(self):
        df = pd.DataFrame({"decimalLatitude": [1.0], "decimalLongitude": [2.0],
                           "scientificName": ["Aus bus"]})
        out = standardize_frame(df)
        self.assertEqual(list(out.columns), list(STANDARD_COLUMNS))
        # Colunas ausentes viram NULL.
        self.assertTrue(pd.isna(out.loc[0, "family"]))

    def test_species_fallback_from_scientificname(self):
        df = pd.DataFrame({"scientificName": ["Aus bus"], "decimalLatitude": [1.0],
                           "decimalLongitude": [2.0]})
        out = standardize_frame(df)
        self.assertEqual(out.loc[0, "species"], "Aus bus")

    def test_numeric_coercion(self):
        df = pd.DataFrame({"decimalLatitude": ["1.5"], "decimalLongitude": ["x"],
                           "year": ["2000"]})
        out = standardize_frame(df)
        self.assertEqual(out.loc[0, "decimalLatitude"], 1.5)
        self.assertTrue(pd.isna(out.loc[0, "decimalLongitude"]))
        self.assertEqual(out.loc[0, "year"], 2000)

    def test_provenance_fill(self):
        df = pd.DataFrame({"decimalLatitude": [1.0], "decimalLongitude": [2.0]})
        out = standardize_frame(df, provider="gbif", source="GBIF", download_date="2026-07-10")
        self.assertEqual(out.loc[0, "provider"], "gbif")
        self.assertEqual(out.loc[0, "download_date"], "2026-07-10")


class TestMerge(unittest.TestCase):
    def test_merge_ignores_empty(self):
        a = standardize_frame(pd.DataFrame({"decimalLatitude": [1.0], "decimalLongitude": [2.0],
                                            "species": ["A"]}))
        merged = merge_frames([a, empty_frame(), None])
        self.assertEqual(len(merged), 1)
        self.assertEqual(list(merged.columns), list(STANDARD_COLUMNS))


class TestDeduplicate(unittest.TestCase):
    def _frame(self):
        return standardize_frame(pd.DataFrame({
            "occurrenceID": ["X1", "X1", None, None],
            "catalogNumber": ["C1", "C1", "C2", "C2"],
            "institutionCode": ["I1", "I1", "I2", "I2"],
            "decimalLatitude": [10.0, 10.0, 20.0, 20.0],
            "decimalLongitude": [30.0, 30.0, 40.0, 40.0],
            "year": [2000, 2000, 2001, 2001],
            "month": [1, 1, 2, 2],
            "day": [1, 1, 2, 2],
            "species": ["A", "A", "B", "B"],
        }))

    def test_low_only_occurrenceid(self):
        out, rep = deduplicate(self._frame(), "low")
        # Remove a 2ª linha (occurrenceID X1 repetido); as 2 sem ID ficam.
        self.assertEqual(len(out), 3)
        self.assertEqual(rep["removed_by"]["occurrenceID"], 1)

    def test_medium_removes_catalog_and_coords(self):
        out, rep = deduplicate(self._frame(), "medium")
        # X1/X1 -> 1 removido; C2+I2 (linhas 3,4) -> 1 removido.
        self.assertEqual(len(out), 2)

    def test_high_hash(self):
        df = standardize_frame(pd.DataFrame({
            "decimalLatitude": [1.0, 1.0], "decimalLongitude": [2.0, 2.0],
            "year": [2000, 2000], "month": [1, 1], "day": [1, 1],
            "species": ["A", "A"],
        }))
        out, rep = deduplicate(df, "high")
        self.assertEqual(len(out), 1)


class TestValidate(unittest.TestCase):
    def test_flags_are_marked_not_removed(self):
        df = standardize_frame(pd.DataFrame({
            "decimalLatitude": [None, 0.0, 200.0, 1.0],
            "decimalLongitude": [None, 0.0, 5.0, 2.0],
            "species": [None, "A", "B", "C"],
            "year": [None, 2000, 2001, 2002],
        }))
        out = validate(df)
        self.assertEqual(len(out), 4)  # nada removido
        self.assertIn("NO_COORD", str(out.loc[0, "quality_flags"]))
        self.assertIn("ZERO_COORD", str(out.loc[1, "quality_flags"]))
        self.assertIn("COORD_OUT_RANGE", str(out.loc[2, "quality_flags"]))


class TestCache(unittest.TestCase):
    def test_round_trip(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache = CacheManager(tmp, enabled=True, date_stamp="2026-07-10")
            df = pd.DataFrame({"decimalLatitude": [1.0], "decimalLongitude": [2.0]})
            params = {"limit": None}
            self.assertIsNone(cache.get("gbif", "Aus bus", params))
            cache.put("gbif", "Aus bus", params, df)
            got = cache.get("gbif", "Aus bus", params)
            self.assertIsNotNone(got)
            self.assertEqual(len(got), 1)

    def test_disabled_cache_is_noop(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache = CacheManager(tmp, enabled=False)
            cache.put("gbif", "A", {}, pd.DataFrame({"a": [1]}))
            self.assertIsNone(cache.get("gbif", "A", {}))


class _DummyProvider(BaseProvider):
    """Provider em memória para exercitar o manager sem rede."""

    metadata_spec = ProviderMetadata(
        name="dummy", title="Dummy", homepage="", api="memória",
        official_api=False, requires_auth=False, priority="high", implemented=True,
    )

    def __init__(self, config, rows):
        super().__init__(config)
        self._rows = rows

    def search_species(self, species):
        return TaxonMatch(provider=self.name, query_name=species, matched=True,
                          accepted_name=species, scientific_name=species)

    def download_occurrences(self, species, taxon, lon_range, lat_range, year_range, limit, stats):
        stats.pages = 1
        return pd.DataFrame(self._rows)

    def normalize(self, raw, taxon):
        return standardize_frame(raw)


class TestManagerEndToEnd(unittest.TestCase):
    def test_run_with_two_dummy_providers(self):
        with tempfile.TemporaryDirectory() as tmp:
            config = OccurrencesConfig(
                output_dir=os.path.join(tmp, "out"),
                cache_dir=os.path.join(tmp, "cache"),
                use_cache=False,
                dedup_level="medium",
            )
            # Dois providers com um registro IDÊNTICO por coordenada/data/espécie.
            common = {"decimalLatitude": 10.0, "decimalLongitude": 20.0,
                      "year": 2001, "month": 5, "day": 3, "scientificName": "Aus bus"}
            p1 = _DummyProvider(config, [common])
            p2 = _DummyProvider(config, [common, {**common, "decimalLatitude": 11.0}])
            manager = OccurrenceManager(config, providers=[p1, p2])

            result = manager.run("Aus bus")

            # 3 baixados -> após dedup deve sobrar 2 (o duplicado foi removido).
            self.assertEqual(result.report.total_after_merge, 3)
            self.assertEqual(result.report.total_after_dedup, 2)
            # O CSV foi escrito e tem as colunas exigidas a jusante.
            self.assertTrue(os.path.exists(result.output_csv))
            written = pd.read_csv(result.output_csv)
            for col in DOWNSTREAM_REQUIRED_COLUMNS:
                self.assertIn(col, written.columns)
            self.assertTrue((written["species"] == "Aus bus").all())

    def test_failing_provider_does_not_break_others(self):
        with tempfile.TemporaryDirectory() as tmp:
            config = OccurrencesConfig(output_dir=os.path.join(tmp, "out"),
                                       cache_dir=os.path.join(tmp, "cache"),
                                       use_cache=False)

            class _Boom(_DummyProvider):
                def download_occurrences(self, *a, **k):
                    raise RuntimeError("falha simulada")

            good = _DummyProvider(config, [{"decimalLatitude": 1.0, "decimalLongitude": 2.0,
                                            "year": 2000, "month": 1, "day": 1,
                                            "scientificName": "Aus bus"}])
            bad = _Boom(config, [])
            bad.metadata_spec = ProviderMetadata(
                name="boom", title="Boom", homepage="", api="", official_api=False,
                requires_auth=False, priority="high", implemented=True)

            result = OccurrenceManager(config, providers=[good, bad]).run("Aus bus")
            # O bom entregou 1; o ruim registrou erro mas não quebrou a execução.
            self.assertEqual(len(result.df), 1)
            stats = {s.provider: s for s in result.report.providers}
            self.assertFalse(stats["boom"].success)
            self.assertTrue(stats["dummy"].success)


if __name__ == "__main__":
    unittest.main(verbosity=2)
