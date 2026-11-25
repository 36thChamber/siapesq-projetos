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
            "predict_sdm_tabular_blocks <- function",
            "validate_prediction_outputs <- function",
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
        alignment_start = UTILS.index("align_predictor_layers <- function")
        alignment_end = UTILS.index("read_predictor_spat_catalog <- function")
        alignment_body = UTILS[alignment_start:alignment_end]
        self.assertNotIn("raster::rasterTmpFile(", alignment_body)
        self.assertIn("materialized_file <- base::tempfile(", UTILS)
        self.assertIn('fileext = ".tif"', UTILS)

    def test_alignment_creates_and_uses_explicit_writable_tmpdir(self) -> None:
        self.assertIn("configure_raster_tmpdir <- function", UTILS)
        self.assertIn('alignment_tmp_dir <- file.path(cache_dir, ".raster_tmp")', UTILS)
        self.assertIn("temp_dir = alignment_tmp_dir", UTILS)
        for operation in ("sdm_aggregate_", "sdm_project_", "sdm_resample_"):
            self.assertIn(operation, UTILS)

    def test_prediction_uses_the_verified_tabular_path_in_blocks(self) -> None:
        start = UTILS.index("predict_sdm_tabular_blocks <- function")
        end = UTILS.index("predict_sdm <- function")
        block_body = UTILS[start:end]
        self.assertIn("raster::getValuesBlock(", block_body)
        self.assertIn("newdata = newdata", block_body)
        self.assertIn("raster::writeStart(", block_body)
        self.assertIn("raster::writeValues(", block_body)
        self.assertIn("extract_sdm_prediction_matrix(", block_body)

        prediction_start = UTILS.index("predict_sdm <- function")
        prediction_end = UTILS.index("detect_total_memory_gb <- function")
        prediction_body = UTILS[prediction_start:prediction_end]
        self.assertNotIn("newdata = predictor_stack", prediction_body)
        self.assertNotIn("filename = raw_prediction_file", prediction_body)
        self.assertIn("predict_sdm_tabular_blocks(", prediction_body)

    def test_all_na_outputs_can_never_be_reported_as_success(self) -> None:
        start = UTILS.index("validate_prediction_outputs <- function")
        end = UTILS.index("publish_staged_raster <- function")
        validation_body = UTILS[start:end]
        self.assertIn("mean_summary$finite == 0L", validation_body)
        self.assertIn("sd_summary$finite == 0L", validation_body)
        self.assertIn("sd_summary$positive == 0L", validation_body)
        self.assertIn("mean_summary$maximum <= mean_summary$minimum", validation_body)
        self.assertIn('mean_summary$maximum > 1 + 1e-6', validation_body)

        block_start = UTILS.index("predict_sdm_tabular_blocks <- function")
        block_end = UTILS.index("predict_sdm <- function")
        block_body = UTILS[block_start:block_end]
        self.assertIn("minimum_coverage <- 0.99", block_body)
        self.assertIn("finite_mean_cells / valid_predictor_cells", block_body)
        self.assertIn("validation$mean$finite != finite_mean_cells", block_body)

        species_start = PIPELINE.index("predict_one_species <- function")
        species_end = PIPELINE.index("run_daily_pipeline <- function")
        species_body = PIPELINE[species_start:species_end]
        self.assertLess(
            species_body.index("predict_sdm("),
            species_body.index('" | Concluído ", species_id'),
        )

    def test_summary_remains_compatible_with_s3_publisher(self) -> None:
        for column in ("species_id", "status", "mean_file", "sd_file", "error"):
            self.assertIn(f"{column} =", PIPELINE)


if __name__ == "__main__":
    unittest.main()
