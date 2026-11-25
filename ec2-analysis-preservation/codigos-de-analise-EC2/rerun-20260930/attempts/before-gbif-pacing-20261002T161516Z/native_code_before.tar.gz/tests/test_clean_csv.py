"""
Testes de clean_csv.py — sentinelas configuráveis e imputação.

Execução:
    python -m unittest tests/test_clean_csv.py
"""

import os
import sys
import unittest

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "05_utils")))

from clean_csv import clean_dataframe  # noqa: E402


def _sample() -> pd.DataFrame:
    return pd.DataFrame({
        "species": ["a", "a", "a", "a"],
        "temp": [10.0, -9999.0, 12.0, 13.0],
        "precip": [100.0, 200.0, -999.9, 400.0],
        "ndvi": [0.5, 0.6, 0.7, "--"],
    })


class TestCleanCsv(unittest.TestCase):
    def test_backward_compatible_default(self):
        # Só '--' é sentinela por padrão; -9999/-999.9 permanecem como números.
        out = clean_dataframe(_sample())
        self.assertNotIn("species", out.columns)
        # a linha com '--' (ndvi) é removida; as demais permanecem
        self.assertEqual(len(out), 3)

    def test_multiple_sentinels_listwise(self):
        out = clean_dataframe(_sample(), sentinels=["--", "-9999", "-999.9"])
        # 3 linhas contêm algum sentinela -> resta 1
        self.assertEqual(len(out), 1)
        self.assertAlmostEqual(out.iloc[0]["temp"], 10.0)

    def test_impute_mean(self):
        out = clean_dataframe(_sample(), sentinels=["--", "-9999", "-999.9"], impute="mean")
        # imputação numérica preserva as 4 linhas; nenhum NaN remanescente
        self.assertEqual(len(out), 4)
        self.assertFalse(out.isna().any().any())
        # temp imputado = média dos válidos (10,12,13)
        self.assertAlmostEqual(out["temp"].iloc[1], (10.0 + 12.0 + 13.0) / 3)

    def test_impute_median(self):
        out = clean_dataframe(_sample(), sentinels=["--", "-9999", "-999.9"], impute="median")
        self.assertEqual(len(out), 4)
        self.assertFalse(out.isna().any().any())

    def test_keep_species(self):
        out = clean_dataframe(_sample(), drop_species=False)
        self.assertIn("species", out.columns)


if __name__ == "__main__":
    unittest.main()
