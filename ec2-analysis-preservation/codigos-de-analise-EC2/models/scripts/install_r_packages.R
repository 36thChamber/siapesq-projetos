options(repos = c(CRAN = "https://cloud.r-project.org"))

required <- c(
  "raster",
  "terra",
  "sdm",
  "randomForest",
  "usdm"
)
optional <- c("gbm", "mgcv", "dismo", "maxnet")

install_all_methods <- tolower(Sys.getenv(
  "INSTALL_ALL_SDM_METHODS",
  "false"
)) %in% c("1", "true", "yes", "sim")

packages <- if (install_all_methods) unique(c(required, optional)) else required
missing <- packages[
  !vapply(packages, requireNamespace, logical(1), quietly = TRUE)
]
if (length(missing) > 0L) {
  install.packages(missing, dependencies = TRUE)
}

still_missing <- packages[
  !vapply(packages, requireNamespace, logical(1), quietly = TRUE)
]
if (length(still_missing) > 0L) {
  stop("Falha ao instalar: ", paste(still_missing, collapse = ", "))
}

message("Pacotes R instalados e validados.")
message("Versão do sdm: ", as.character(utils::packageVersion("sdm")))
