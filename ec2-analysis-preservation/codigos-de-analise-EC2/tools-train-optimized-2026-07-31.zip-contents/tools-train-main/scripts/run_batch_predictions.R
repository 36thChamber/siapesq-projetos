#!/usr/bin/env Rscript

parse_cli <- function(args) {
  out <- list(rebuild_cache = FALSE)
  i <- 1L
  while (i <= length(args)) {
    key <- args[[i]]
    if (identical(key, "--rebuild-cache")) {
      out$rebuild_cache <- TRUE
      i <- i + 1L
      next
    }
    if (!startsWith(key, "--") || i == length(args)) {
      stop("Argumento inválido ou sem valor: ", key)
    }
    out[[substring(key, 3L)]] <- args[[i + 1L]]
    i <- i + 2L
  }
  out
}

script_arg <- grep("^--file=", commandArgs(trailingOnly = FALSE), value = TRUE)
script_path <- normalizePath(sub("^--file=", "", script_arg[[1]]), mustWork = TRUE)
project_dir <- normalizePath(file.path(dirname(script_path), ".."), mustWork = TRUE)
source(file.path(project_dir, "utils.r"))

args <- parse_cli(commandArgs(trailingOnly = TRUE))
required <- c("jobs", "predictors")
missing <- required[!vapply(required, function(x) !is.null(args[[x]]), logical(1))]
if (length(missing) > 0L) {
  stop(
    "Argumentos obrigatórios: --jobs ARQUIVO --predictors DIRETÓRIO. Faltando: ",
    paste(missing, collapse = ", ")
  )
}

cache_dir <- args$cache %||% file.path(args$predictors, "_aligned_predictors")
summary_file <- args$summary %||% file.path(dirname(cache_dir), "run_summary.csv")
workers <- args$workers %||% "auto"
pattern <- args$pattern %||% "\\.(nc|tif|tiff)$"
mask_rule <- args$`mask-rule` %||% "auto"
temp_root <- args$`temp-dir` %||% Sys.getenv(
  "SDM_TMPDIR",
  unset = file.path(tempdir(), "sdm-runtime")
)

summary <- predict_sdm_batch(
  jobs = args$jobs,
  predictors_path = args$predictors,
  cache_dir = cache_dir,
  pattern = pattern,
  ref_raster_path = args$ref %||% NULL,
  workers = workers,
  summary_file = summary_file,
  temp_root = temp_root,
  mask_raster_path = args$mask %||% NULL,
  mask_rule = mask_rule,
  rebuild_cache = isTRUE(args$rebuild_cache)
)

print(summary[, c("species_id", "status", "elapsed_seconds", "error")], row.names = FALSE)
if (any(summary$status != "ok")) quit(status = 1L)

