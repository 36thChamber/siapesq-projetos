from __future__ import annotations

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
UTILS = (ROOT / "utils.r").read_text(encoding="utf-8")
PIPELINE = (ROOT / "R" / "pipeline.R").read_text(encoding="utf-8")


class OptimizedPipelineStaticTests(unittest.TestCase):
    def test_optimized_entrypoints_exist(self) -> None:
        for entrypoint in (
            "prepare_aligned_predictors <- function",
            "prediction_mask <- function",
            "write_ensemble_statistics <- function",
            "recommended_sdm_workers <- function",
            "configure_sdm_runtime <- function",
        ):
            self.assertIn(entrypoint, UTILS)

    def test_pipeline_prepares_cache_before_parallel_loop(self) -> None:
        cache_position = PIPELINE.index("prepared <- prepare_aligned_predictors(")
        parallel_position = PIPELINE.index("parallel::mclapply(")
        self.assertLess(cache_position, parallel_position)
        self.assertIn("aligned_predictors_path = prepared$stack_file", PIPELINE)
        self.assertIn("resample = FALSE", PIPELINE)

    def test_cache_reuses_original_raster_engine_without_global_stats(self) -> None:
        self.assertNotIn('attr(layer, "source_file") <- file', UTILS)
        cache_start = UTILS.index("prepare_aligned_predictors <- function")
        cache_end = UTILS.index("ensemble_statistics_block <- function")
        cache_body = UTILS[cache_start:cache_end]
        self.assertIn("read_daily_predictor_layers(files)", cache_body)
        self.assertIn("align_predictor_layers(", cache_body)
        self.assertIn("raster::writeRaster(", cache_body)
        self.assertIn('assert_namespaces("raster")', cache_body)
        self.assertIn("raster_has_finite_cell", cache_body)
        self.assertNotIn("terra::global(", cache_body)
        self.assertNotIn("terra::app(", cache_body)
        self.assertNotIn("prediction_mask(", cache_body)

    def test_runtime_validation_avoids_global_statistics(self) -> None:
        runtime = (ROOT / "tests" / "test_optimized_runtime.R").read_text(
            encoding="utf-8"
        )
        self.assertNotIn("terra::global", runtime)
        self.assertIn("raster_has_finite_cell", runtime)

    def test_temporary_geotiff_is_compatible_with_old_raster(self) -> None:
        self.assertNotRegex(
            UTILS,
            r"raster::rasterTmpFile\s*\([^)]*extension\s*=",
        )
        self.assertIn("materialized_file <- base::tempfile(", UTILS)
        self.assertIn('fileext = ".tif"', UTILS)

    def test_old_two_pass_ensemble_was_removed(self) -> None:
        start = UTILS.index("predict_sdm <- function")
        end = UTILS.index("detect_total_memory_gb <- function")
        prediction_body = UTILS[start:end]
        self.assertNotIn("raster::calc(", prediction_body)
        self.assertNotIn("terra::app(raw_prediction, safe_sd)", prediction_body)
        self.assertIn("write_ensemble_statistics(", prediction_body)

    def test_summary_remains_compatible_with_s3_publisher(self) -> None:
        for column in ("species_id", "status", "mean_file", "sd_file", "error"):
            self.assertIn(f"{column} =", PIPELINE)


if __name__ == "__main__":
    unittest.main()
