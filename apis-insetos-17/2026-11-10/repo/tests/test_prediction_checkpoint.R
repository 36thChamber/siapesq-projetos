# Executar na raiz: Rscript tests/test_prediction_checkpoint.R
# Carrega apenas os helpers, sem disparar predições/modelos reais.
code <- parse("04_modeling/run_predict_climatologico.R")
for (expr in code) {
  if (is.call(expr) && identical(expr[[1]], as.name("<-")) &&
      is.symbol(expr[[2]]) &&
      as.character(expr[[2]]) %in% c("write_checkpoint", "faixa_pronta")) eval(expr)
}
library(terra)
test_checkpoint <- function() {
  td <- tempfile()
  dir.create(td)
  on.exit(unlink(td, recursive = TRUE))
  r <- rast(nrows = 4, ncols = 4)
  values(r) <- 1:16
  f <- file.path(td, "mean.tif")
  write_checkpoint(r, f)
  stopifnot(file.exists(f), !file.exists(file.path(td, "mean.partial.tif")),
            identical(as.vector(values(rast(f))), as.vector(values(r))))
  values(r) <- 17:32
  write_checkpoint(r, f)
  stopifnot(identical(as.vector(values(rast(f))), as.vector(values(r))))
  # O helper usa strip_dir no ambiente de definição.
  environment(faixa_pronta) <- environment()
  strip_dir <- td
  write_checkpoint(r, file.path(td, "mean_001.tif"))
  stopifnot(!faixa_pronta(1))
  write_checkpoint(r, file.path(td, "sd_001.tif"))
  stopifnot(faixa_pronta(1))
}
test_checkpoint()
cat("R: publicação e contagem de pares OK\n")
