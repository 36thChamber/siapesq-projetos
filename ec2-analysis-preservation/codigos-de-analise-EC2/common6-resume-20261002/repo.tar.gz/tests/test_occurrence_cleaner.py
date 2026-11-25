"""
Testes unitários dos filtros determinísticos (tabulares) do occurrence_cleaner.

Cobrem as etapas que NÃO dependem de geopandas/rede (coordenadas, duplicatas,
incerteza, issues, basis, status, datas) e o orquestrador `clean_occurrences`
com os filtros espaciais desligados. Os filtros espaciais (centroides,
instituições, capitais, terra x oceano) exigem dados cartográficos e são
exercitados manualmente no ambiente com as dependências instaladas.

Execução:
    python -m unittest tests/test_occurrence_cleaner.py
"""

import os
import sys
import unittest

import pandas as pd

# Adiciona o diretório do pacote de limpeza ao sys.path.
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "01_data_acquisition"))
)

from cleaning.config import CleaningConfig  # noqa: E402
from cleaning.occurrence_cleaner import (  # noqa: E402
    prepare_dataframe,
    remove_missing_coordinates,
    remove_invalid_coordinates,
    remove_zero_coordinates,
    remove_equal_coordinates,
    remove_duplicates,
    spatial_thin,
    filter_coordinate_uncertainty,
    filter_gbif_issues,
    filter_basis_of_record,
    remove_absent_records,
    filter_dates,
    clean_occurrences,
)


def _haversine_km(a, b) -> float:
    """Distância de grande círculo (km) entre (lat, lon) a e b — para asserts."""
    import math
    R = 6371.0088
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def _sample() -> pd.DataFrame:
    """DataFrame sintético cobrindo vários casos-limite."""
    return pd.DataFrame({
        "decimalLatitude": [10.0, 10.0, None, 95.0, 0.0, -22.9, -22.9, 40.0],
        "decimalLongitude": [20.0, 20.0, 30.0, 50.0, 0.0, -43.2, -43.2, -73.9],
        "year": [2010, 2010, 2011, 2012, 2013, 1990, 2020, None],
        "month": [1, 1, 2, 3, 4, 5, 6, 7],
        "day": [1, 1, 2, 3, 4, 5, 6, 7],
        "coordinateUncertaintyInMeters": [100, 100, 5000, 50, 10, None, 200, 300],
        "issue": ["", "", "ZERO_COORDINATE;OTHER", "", "", "COUNTRY_COORDINATE_MISMATCH", "", ""],
        "basisOfRecord": ["HUMAN_OBSERVATION", "HUMAN_OBSERVATION", "PRESERVED_SPECIMEN",
                          "FOSSIL_SPECIMEN", "LIVING_SPECIMEN", "HUMAN_OBSERVATION",
                          "MATERIAL_SAMPLE", "HUMAN_OBSERVATION"],
        "occurrenceStatus": ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "ABSENT",
                             "PRESENT", "PRESENT", "PRESENT"],
    })


class TestCoordinateFilters(unittest.TestCase):
    def setUp(self):
        self.df = prepare_dataframe(_sample())

    def test_remove_missing(self):
        out = remove_missing_coordinates(self.df)
        self.assertEqual(len(out), 7)  # remove a linha com lat None

    def test_remove_invalid(self):
        out = remove_invalid_coordinates(self.df)
        # lat=95 é inválida; a linha None não é removida aqui (between -> NaN False)
        self.assertNotIn(95.0, out["decimalLatitude"].tolist())

    def test_remove_zero(self):
        out = remove_zero_coordinates(self.df)
        self.assertFalse(((out["decimalLatitude"] == 0) & (out["decimalLongitude"] == 0)).any())


class TestDuplicates(unittest.TestCase):
    def setUp(self):
        self.df = prepare_dataframe(_sample()).dropna(subset=["decimalLatitude"])

    def test_spatial(self):
        out = remove_duplicates(self.df, mode="spatial")
        # (10,20) aparece 2x e (-22.9,-43.2) aparece 2x -> 2 removidos
        self.assertEqual(len(out), len(self.df) - 2)

    def test_spatial_rounding(self):
        out = remove_duplicates(self.df, mode="spatial", decimals=0)
        self.assertLessEqual(len(out), len(self.df))

    def test_exact(self):
        out = remove_duplicates(self.df, mode="exact")
        # (10,20,2010,1,1) duplicado exato -> 1 removido
        self.assertEqual(len(out), len(self.df) - 1)


class TestOtherFilters(unittest.TestCase):
    def setUp(self):
        self.df = prepare_dataframe(_sample())

    def test_uncertainty(self):
        out = filter_coordinate_uncertainty(self.df, max_uncertainty=1000, keep_missing=True)
        self.assertNotIn(5000, out["coordinateUncertaintyInMeters"].tolist())
        # o registro com incerteza None deve permanecer
        self.assertTrue(out["coordinateUncertaintyInMeters"].isna().any())

    def test_uncertainty_drop_missing(self):
        out = filter_coordinate_uncertainty(self.df, max_uncertainty=1000, keep_missing=False)
        self.assertFalse(out["coordinateUncertaintyInMeters"].isna().any())

    def test_uncertainty_none_noop(self):
        out = filter_coordinate_uncertainty(self.df, max_uncertainty=None)
        self.assertEqual(len(out), len(self.df))

    def test_issues(self):
        out = filter_gbif_issues(self.df, ["ZERO_COORDINATE", "COUNTRY_COORDINATE_MISMATCH"])
        self.assertEqual(len(out), len(self.df) - 2)

    def test_basis(self):
        out = filter_basis_of_record(
            self.df, ["HUMAN_OBSERVATION", "PRESERVED_SPECIMEN", "MATERIAL_SAMPLE"])
        self.assertNotIn("FOSSIL_SPECIMEN", out["basisOfRecord"].tolist())
        self.assertNotIn("LIVING_SPECIMEN", out["basisOfRecord"].tolist())

    def test_absent(self):
        out = remove_absent_records(self.df, ["ABSENT"])
        self.assertFalse((out["occurrenceStatus"] == "ABSENT").any())

    def test_dates_require_year(self):
        out = filter_dates(self.df, require_year=True)
        self.assertFalse(out["year"].isna().any())

    def test_dates_window(self):
        out = filter_dates(self.df, require_year=True, min_year=2000, max_year=2015)
        self.assertTrue((out["year"] >= 2000).all())
        self.assertTrue((out["year"] <= 2015).all())


class TestOrchestrator(unittest.TestCase):
    def test_full_pipeline_no_spatial(self):
        config = CleaningConfig(
            # desliga filtros espaciais (sem geopandas/rede nos testes)
            flag_centroids=False, remove_centroids=False,
            flag_institutions=False, remove_institutions=False,
            flag_capitals=False, remove_capitals=False,
            habitat="any",
            max_coordinate_uncertainty=1000,
            min_year=2000, max_year=2025,
            duplicate_mode="spatial",
        )
        df, report = clean_occurrences(_sample(), config)

        # Sanidade do relatório
        self.assertEqual(report.initial_records, 8)
        self.assertEqual(report.final_records, len(df))
        self.assertLess(report.final_records, report.initial_records)
        self.assertIn("missing_coordinates", report.removed)
        self.assertIn("duplicates", report.removed)

        # Nenhuma coordenada inválida/zero/ausência remanescente
        self.assertFalse(((df["decimalLatitude"] == 0) & (df["decimalLongitude"] == 0)).any())
        self.assertTrue(df["decimalLatitude"].between(-90, 90).all())
        self.assertFalse((df["occurrenceStatus"] == "ABSENT").any())

    def test_report_serialization(self):
        config = CleaningConfig(
            flag_centroids=False, flag_institutions=False, flag_capitals=False,
            habitat="any",
        )
        _df, report = clean_occurrences(_sample(), config)
        d = report.to_dict()
        self.assertIn("removed", d)
        self.assertIn("config", d)
        self.assertEqual(d["initial_records"] - d["final_records"], d["total_removed"])


class TestEqualCoordinates(unittest.TestCase):
    def test_remove_equal(self):
        df = prepare_dataframe(pd.DataFrame({
            "decimalLatitude": [10.0, 5.0, -3.0, 0.0],
            "decimalLongitude": [20.0, 5.0, 7.0, 0.0],
        }))
        out = remove_equal_coordinates(df)
        # remove (5,5) e (0,0)
        self.assertEqual(len(out), 2)
        self.assertFalse((out["decimalLatitude"] == out["decimalLongitude"]).any())


class TestSpatialThinning(unittest.TestCase):
    def _sample(self):
        # três pontos ~110 m entre si perto de (5,40) + dois pontos distantes
        return prepare_dataframe(pd.DataFrame({
            "decimalLatitude": [5.0, 5.0005, 5.001, 20.0, -30.0],
            "decimalLongitude": [40.0, 40.0005, 40.001, 60.0, -50.0],
        }))

    def _min_pairwise_km(self, df):
        pts = list(zip(df["decimalLatitude"], df["decimalLongitude"]))
        return min(
            (_haversine_km(pts[i], pts[j]) for i in range(len(pts)) for j in range(i + 1, len(pts))),
            default=float("inf"),
        )

    def test_min_distance_respected(self):
        out = spatial_thin(self._sample(), min_distance_km=1.0, method="random", seed=1)
        # cluster de 3 colapsa para 1; os 2 distantes permanecem
        self.assertEqual(len(out), 3)
        self.assertGreaterEqual(self._min_pairwise_km(out), 1.0 - 1e-6)

    def test_empty(self):
        empty = prepare_dataframe(pd.DataFrame({"decimalLatitude": [], "decimalLongitude": []}))
        self.assertEqual(len(spatial_thin(empty, 1.0)), 0)

    def test_single(self):
        one = prepare_dataframe(pd.DataFrame({"decimalLatitude": [5.0], "decimalLongitude": [40.0]}))
        self.assertEqual(len(spatial_thin(one, 1.0)), 1)

    def test_reproducible_with_seed(self):
        df = self._sample()
        a = spatial_thin(df, 1.0, method="random", seed=42)
        b = spatial_thin(df, 1.0, method="random", seed=42)
        self.assertEqual(list(a.index), list(b.index))

    def test_grid_method(self):
        out = spatial_thin(self._sample(), min_distance_km=1.0, method="grid")
        self.assertLessEqual(len(out), 5)
        self.assertGreaterEqual(len(out), 3)


class TestDateValidation(unittest.TestCase):
    def _sample(self):
        return prepare_dataframe(pd.DataFrame({
            "decimalLatitude": [1, 2, 3, 4, 5, 6],
            "decimalLongitude": [10, 11, 12, 13, 14, 15],
            "year":  [2010, 2010, 2010, 2010, 2999, 2010],
            "month": [1,    0,    13,   2,    6,    6],
            "day":   [15,   15,   15,   30,   15,   32],
        }))

    def test_month_day_and_future(self):
        out = filter_dates(
            self._sample(), require_year=True,
            validate_month_day=True, reject_future_dates=True,
        )
        # apenas a linha 0 (2010-01-15) é válida
        self.assertEqual(len(out), 1)
        self.assertEqual(int(out.iloc[0]["month"]), 1)

    def test_month_day_off(self):
        out = filter_dates(
            self._sample(), require_year=True,
            validate_month_day=False, reject_future_dates=True,
        )
        # sem validação de mês/dia, só o ano futuro (2999) é removido
        self.assertEqual(len(out), 5)

    def test_future_year(self):
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        df = prepare_dataframe(pd.DataFrame({
            "decimalLatitude": [1, 2],
            "decimalLongitude": [3, 4],
            "year": [now.year - 5, now.year + 1],
            "month": [1, 1],
            "day": [1, 1],
        }))
        out = filter_dates(df, require_year=True, reject_future_dates=True)
        self.assertEqual(len(out), 1)
        self.assertEqual(int(out.iloc[0]["year"]), now.year - 5)


class TestConfig(unittest.TestCase):
    def test_roundtrip(self):
        import tempfile
        cfg = CleaningConfig(max_coordinate_uncertainty=500, habitat="marine")
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "cfg.json")
            cfg.to_json(path)
            loaded = CleaningConfig.from_json(path)
        self.assertEqual(loaded.max_coordinate_uncertainty, 500)
        self.assertEqual(loaded.habitat, "marine")

    def test_invalid_mode(self):
        with self.assertRaises(ValueError):
            CleaningConfig(duplicate_mode="wrong")

    def test_invalid_habitat(self):
        with self.assertRaises(ValueError):
            CleaningConfig(habitat="space")

    def test_invalid_thinning_method(self):
        with self.assertRaises(ValueError):
            CleaningConfig(thinning_method="hexagon")

    def test_invalid_thinning_distance(self):
        with self.assertRaises(ValueError):
            CleaningConfig(thinning_min_distance_km=0)


if __name__ == "__main__":
    unittest.main()
