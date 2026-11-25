#!/usr/bin/env Rscript

required_packages <- c(
  "raster", "terra", "sdm", "rgbif", "dplyr", "tidyr", "sp", "sf", "usdm", "maps"
)
missing_packages <- required_packages[
  !vapply(required_packages, requireNamespace, logical(1), quietly = TRUE)
]
if (length(missing_packages) > 0L) {
  cat("SKIP: pacotes R ausentes:", paste(missing_packages, collapse = ", "), "\n")
  quit(status = 0L)
}

script_arg <- grep("^--file=", commandArgs(trailingOnly = FALSE), value = TRUE)
script_path <- normalizePath(sub("^--file=", "", script_arg[[1]]), mustWork = TRUE)
project_dir <- normalizePath(file.path(dirname(script_path), ".."), mustWork = TRUE)
source(file.path(project_dir, "utils.r"))

work_dir <- tempfile("test_utils_optimized_")
dir.create(work_dir, recursive = TRUE)
on.exit(unlink(work_dir, recursive = TRUE, force = TRUE), add = TRUE)

predictors_dir <- file.path(work_dir, "predictors")
cache_dir <- file.path(work_dir, "cache")
dir.create(predictors_dir)

thetao <- raster::raster(nrows = 4, ncols = 4, xmn = 0, xmx = 4, ymn = 0, ymx = 4)
raster::values(thetao) <- seq_len(raster::ncell(thetao))
raster::writeRaster(thetao, file.path(predictors_dir, "thetao.tif"), overwrite = TRUE)

depth <- raster::raster(nrows = 2, ncols = 2, xmn = 0, xmx = 4, ymn = 0, ymx = 4)
raster::values(depth) <- c(-100, -50, 5, 10)
raster::writeRaster(depth, file.path(predictors_dir, "depth.tif"), overwrite = TRUE)

first <- prepare_aligned_predictors(
  predictors_path = predictors_dir,
  cache_dir = cache_dir,
  predictor_names = c("thetao", "depth"),
  pattern = "\\.tif$",
  mask_rule = "auto"
)
stopifnot(!first$reused, file.exists(first$stack_file), file.exists(first$mask_file))

second <- prepare_aligned_predictors(
  predictors_path = predictors_dir,
  cache_dir = cache_dir,
  predictor_names = c("thetao", "depth"),
  pattern = "\\.tif$",
  mask_rule = "auto"
)
stopifnot(second$reused)

mask_values <- terra::values(terra::rast(first$mask_file), mat = FALSE)
stopifnot(any(is.na(mask_values)), any(mask_values == 1, na.rm = TRUE))

input <- matrix(c(1, 2, 3, 2, NA, 4), nrow = 2, byrow = TRUE)
stats <- ensemble_statistics_block(input, center = "mean", include_sd = TRUE)
stopifnot(
  isTRUE(all.equal(stats[, 1], c(2, 3))),
  isTRUE(all.equal(stats[, 2], c(1, sqrt(2))))
)

boot <- terra::rast(nrows = 2, ncols = 2, nlyrs = 3, xmin = 0, xmax = 2, ymin = 0, ymax = 2)
terra::values(boot) <- cbind(1:4, 2:5, 3:6)
mean_file <- file.path(work_dir, "mean.tif")
sd_file <- file.path(work_dir, "sd.tif")
write_ensemble_statistics(boot, mean_file, sd_file)
stopifnot(
  isTRUE(all.equal(terra::values(terra::rast(mean_file), mat = FALSE), 2:5)),
  isTRUE(all.equal(terra::values(terra::rast(sd_file), mat = FALSE), rep(1, 4)))
)

stopifnot(
  recommended_sdm_workers("auto", cores = 2, memory_gb = 1) == 1L,
  recommended_sdm_workers("auto", cores = 4, memory_gb = 8) == 2L,
  recommended_sdm_workers("auto", cores = 8, memory_gb = 16) == 4L
)

cat("OK: cache, máscara, ensemble de uma passagem e workers automáticos.\n")

