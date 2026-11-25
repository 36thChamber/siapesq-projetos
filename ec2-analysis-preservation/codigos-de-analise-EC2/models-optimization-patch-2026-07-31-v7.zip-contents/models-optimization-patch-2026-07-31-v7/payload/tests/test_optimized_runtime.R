#!/usr/bin/env Rscript

required_packages <- "raster"
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

predictor_names <- c("CHL", "thetao", "so", "depth")
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
cat("Teste real 1/5: preditores encontrados em ", predictors_dir, ".\n", sep = "")

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
  file.exists(first$manifest_file)
)
cat(
  "Teste real 2/5: cache ",
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
cat("Teste real 3/5: reutilização do cache confirmada.\n")

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
cat("Teste real 4/5: todas as bandas do cache possuem valores finitos.\n")

# A estatística em bloco independe do formato do raster. A escrita completa
# será exercitada na predição controlada de uma espécie após a instalação.
input <- matrix(c(1, 2, 3, 2, NA, 4), nrow = 2, byrow = TRUE)
statistics <- ensemble_statistics_block(input, center = "mean", include_sd = TRUE)
stopifnot(
  isTRUE(all.equal(statistics[, 1], c(2, 3))),
  isTRUE(all.equal(statistics[, 2], c(1, sqrt(2)))),
  recommended_sdm_workers("auto", cores = 2, memory_gb = 1) == 1L,
  recommended_sdm_workers("auto", cores = 4, memory_gb = 8) == 2L,
  recommended_sdm_workers("auto", cores = 8, memory_gb = 16) == 4L
)
cat("Teste real 5/5: ensemble e workers validados.\n")

cat("OK: preditores reais, cache, ensemble e workers validados sem estatísticas globais.\n")
