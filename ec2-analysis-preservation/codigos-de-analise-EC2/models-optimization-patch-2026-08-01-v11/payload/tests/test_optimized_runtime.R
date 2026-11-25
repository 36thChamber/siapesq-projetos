#!/usr/bin/env Rscript

required_packages <- c("raster", "sdm")
missing_packages <- required_packages[
  !vapply(required_packages, requireNamespace, logical(1), quietly = TRUE)
]
if (length(missing_packages) > 0L) {
  stop("Pacotes obrigatórios ausentes: ", paste(missing_packages, collapse = ", "))
}

options(error = function() {
  traceback(20)
  quit(save = "no", status = 1L, runLast = FALSE)
})

arguments <- commandArgs(trailingOnly = TRUE)
if (length(arguments) != 1L) {
  stop(
    "Uso: Rscript tests/test_optimized_runtime.R CAMINHO_DOS_PREDITORES_REAIS",
    call. = FALSE
  )
}

script_argument <- grep("^--file=", commandArgs(trailingOnly = FALSE), value = TRUE)
script_path <- normalizePath(sub("^--file=", "", script_argument[[1]]), mustWork = TRUE)
project_root <- normalizePath(file.path(dirname(script_path), ".."), mustWork = TRUE)
predictors_dir <- normalizePath(arguments[[1]], mustWork = TRUE)
source(file.path(project_root, "utils.r"))

predictor_names <- c("thetao", "so", "CHL", "depth")
files <- list_predictor_files(predictors_dir, pattern = "\\.(nc|tif|tiff)$")
stems <- normalize_predictor_name(tools::file_path_sans_ext(basename(files)))
missing_predictors <- predictor_names[
  !normalize_predictor_name(predictor_names) %in% stems
]
if (length(missing_predictors) > 0L) {
  stop(
    "Preditores reais ausentes em ", predictors_dir, ": ",
    paste(missing_predictors, collapse = ", "),
    call. = FALSE
  )
}
cat("Teste real 1/6: preditores encontrados em ", predictors_dir, ".\n", sep = "")

# O cache é o mesmo que a rotina diária usará. Ele não é descartado ao final
# do teste e nenhuma aquisição de dados é executada por este script.
cache_dir <- file.path(predictors_dir, "_aligned_sdm_cache")
first <- prepare_aligned_predictors(
  predictors_path = predictors_dir,
  cache_dir = cache_dir,
  predictor_names = predictor_names,
  pattern = "\\.(nc|tif|tiff)$",
  mask_variable = "depth",
  mask_rule = "non_na",
  require_complete_cases = FALSE,
  rebuild_cache = FALSE
)
stopifnot(
  file.exists(first$stack_file),
  file.exists(first$manifest_file),
  dir.exists(file.path(cache_dir, ".raster_tmp"))
)
cat(
  "Teste real 2/6: cache ",
  if (isTRUE(first$reused)) "válido reutilizado" else "criado",
  " em ", first$stack_file, ".\n",
  sep = ""
)

second <- prepare_aligned_predictors(
  predictors_path = predictors_dir,
  cache_dir = cache_dir,
  predictor_names = predictor_names,
  pattern = "\\.(nc|tif|tiff)$",
  mask_variable = "depth",
  mask_rule = "non_na",
  require_complete_cases = FALSE,
  rebuild_cache = FALSE
)
stopifnot(isTRUE(second$reused))
cat("Teste real 3/6: reutilização do cache confirmada.\n")

cached_stack <- raster::stack(first$stack_file)
stopifnot(
  raster::hasValues(cached_stack),
  raster::nlayers(cached_stack) == length(predictor_names),
  all(vapply(
    seq_len(raster::nlayers(cached_stack)),
    function(index) raster_has_finite_cell(cached_stack[[index]]),
    logical(1)
  ))
)
cat("Teste real 4/6: todas as bandas do cache possuem valores finitos.\n")

# A estatística em bloco independe do formato do raster. A escrita completa
# será exercitada na predição controlada de uma espécie após a instalação.
input <- matrix(c(1, 2, 3, 2, NA, 4), nrow = 2, byrow = TRUE)
statistics <- ensemble_statistics_block(input, center = "mean", include_sd = TRUE)
validation_dir <- tempfile("sdm-validation-")
dir.create(validation_dir, recursive = TRUE, showWarnings = FALSE)
validation_reference <- raster::raster(
  nrows = 2L,
  ncols = 3L,
  xmn = -3,
  xmx = 3,
  ymn = -2,
  ymx = 2
)
validation_mean <- validation_reference
validation_sd <- validation_reference
validation_mean[] <- c(NA, 0.1, 0.2, 0.3, 0.4, NA)
validation_sd[] <- c(NA, 0.01, 0.02, 0.03, 0.04, NA)
validation_mean_file <- raster::writeRaster(
  validation_mean,
  file.path(validation_dir, "mean.tif"),
  overwrite = TRUE
)
validation_sd_file <- raster::writeRaster(
  validation_sd,
  file.path(validation_dir, "sd.tif"),
  overwrite = TRUE
)
validated <- validate_prediction_outputs(
  raster::filename(validation_mean_file),
  raster::filename(validation_sd_file),
  validation_reference
)
stopifnot(
  isTRUE(all.equal(statistics[, 1], c(2, 3))),
  isTRUE(all.equal(statistics[, 2], c(1, sqrt(2)))),
  validated$mean$finite == 4L,
  validated$sd$finite == 4L,
  validated$sd$positive == 4L,
  recommended_sdm_workers("auto", cores = 2, memory_gb = 1) == 1L,
  recommended_sdm_workers("auto", cores = 4, memory_gb = 8) == 2L,
  recommended_sdm_workers("auto", cores = 8, memory_gb = 16) == 4L
)
unlink(validation_dir, recursive = TRUE, force = TRUE)
cat("Teste real 5/6: ensemble e workers validados.\n")

# Exercita o mesmo caminho tabular que a v9 usará em cada bloco. Cem células
# completas são suficientes para detectar modelo incompatível, nomes trocados
# ou regressão para o método raster que produziu apenas NA na v8.
config <- utils::read.csv(
  file.path(project_root, "config", "species.csv"),
  stringsAsFactors = FALSE,
  check.names = FALSE
)
species_row <- config[config$species_id == "thunnus_obesus", , drop = FALSE]
stopifnot(nrow(species_row) == 1L)
species_dir <- file.path(project_root, "oceanincs", "thunnus_obesus")
csv_file <- file.path(species_dir, species_row$csv_filename[[1]])
model_file <- file.path(
  species_dir,
  paste0(species_row$model_name[[1]], ".sdm")
)
stopifnot(file.exists(csv_file), file.exists(model_file))

inferred <- infer_predictors_from_csv(csv_file)
cached_stack <- raster::stack(first$stack_file)
names(cached_stack) <- predictor_names
cached_layers <- lapply(seq_len(raster::nlayers(cached_stack)), function(index) {
  cached_stack[[index]]
})
cached_layers <- select_predictor_layers(
  cached_layers,
  inferred$predictor_names
)
predictor_stack <- raster::stack(cached_layers)
names(predictor_stack) <- inferred$predictor_names

blocks <- raster::blockSize(predictor_stack, minblocks = 8L)
sample_values <- NULL
for (index in seq_len(blocks$n)) {
  values <- raster::getValuesBlock(
    predictor_stack,
    row = blocks$row[index],
    nrows = blocks$nrows[index]
  )
  if (is.null(dim(values))) {
    values <- matrix(values, ncol = raster::nlayers(predictor_stack))
  }
  complete <- rowSums(is.finite(values)) == ncol(values)
  if (any(complete)) {
    missing_rows <- 100L - if (is.null(sample_values)) 0L else nrow(sample_values)
    selected <- head(which(complete), missing_rows)
    sample_values <- rbind(
      sample_values,
      values[selected, , drop = FALSE]
    )
  }
  if (!is.null(sample_values) && nrow(sample_values) >= 100L) break
}
stopifnot(!is.null(sample_values), nrow(sample_values) >= 100L)
sample_frame <- as.data.frame(sample_values[seq_len(100L), , drop = FALSE])
names(sample_frame) <- inferred$predictor_names

attach_sdm_package()
model <- read_compatible_sdm(model_file)
prediction <- methods::selectMethod("predict", "sdmModels")(
  model,
  newdata = sample_frame,
  mean = FALSE
)
prediction_values <- extract_sdm_prediction_matrix(prediction, 100L)
stopifnot(
  nrow(prediction_values) == 100L,
  ncol(prediction_values) >= 1L,
  all(is.finite(prediction_values))
)
cat("Teste real 6/6: predição tabular de 100 células retornou valores finitos.\n")

cat(paste0(
  "OK: preditores reais, cache, ensemble, workers e caminho tabular ",
  "validados sem estatísticas globais.\n"
))
