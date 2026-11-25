from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
UTILS = ROOT / "utils.r"


class OptimizedUtilsStaticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = UTILS.read_text(encoding="utf-8")

    def test_optimized_entrypoints_exist(self):
        for name in (
            "prepare_aligned_predictors <- function",
            "write_ensemble_statistics <- function",
            "recommended_sdm_workers <- function",
            "predict_sdm_batch <- function",
        ):
            self.assertIn(name, self.source)

    def test_batch_prepares_cache_before_parallel_loop(self):
        prepare = self.source.index("prepared <- prepare_aligned_predictors(")
        fork = self.source.index("parallel::mclapply(")
        self.assertLess(prepare, fork)

    def test_old_two_pass_ensemble_was_removed(self):
        active_source = self.source.split("##########################\n########## OLD", 1)[0]
        self.assertNotIn("terra::app(p_raw, stats::sd", active_source)
        self.assertNotIn("raster::calc(\n            p_raw", active_source)


if __name__ == "__main__":
    unittest.main()

