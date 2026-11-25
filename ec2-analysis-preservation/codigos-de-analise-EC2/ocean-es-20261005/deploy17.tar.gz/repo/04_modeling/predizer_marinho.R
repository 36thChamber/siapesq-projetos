# predizer_marinho.R — Predição do modelo R sobre as MESMAS células do mapa Python.
#
# Lê a matriz de células oceânicas exportada pela predição Python (gridX.csv: lat/lon +
# preditores + adeq_py), aplica o RF em R e grava adeq_R por célula. A comparação de mapas
# (correlação Python×R, diferença, figura lado a lado) é feita depois em comparar_py_r.py.
#
# Uso: Rscript 04_modeling/predizer_marinho.R <gridX.csv> <modelo_R.rds> <saida_gridX_R.csv>
#        [tif_python_molde] [saida_R.tif]

suppressMessages(library(randomForest))
args <- commandArgs(trailingOnly = TRUE)
gridx <- args[1]; modelo <- args[2]; saida <- args[3]
tif_molde <- if (length(args) >= 4) args[4] else NULL
tif_saida <- if (length(args) >= 5) args[5] else NULL

rf <- readRDS(modelo)
gx <- read.csv(gridx)
preds <- intersect(rownames(rf$importance), names(gx))
cat(sprintf("[pred-R] %d celulas | preditores: %s\n", nrow(gx), paste(preds, collapse = ", ")))

t0 <- Sys.time()
adeq_R <- predict(rf, gx[, preds], type = "prob")[, "1"]
cat(sprintf("[pred-R] predicao em %.2f s\n", as.numeric(difftime(Sys.time(), t0, units = "secs"))))

out <- data.frame(lat = gx$lat, lon = gx$lon, adeq_R = adeq_R)
write.csv(out, saida, row.names = FALSE)
cat(sprintf("[pred-R] salvo: %s | adeq_R min/media/max = %.3f/%.3f/%.3f\n",
            saida, min(adeq_R), mean(adeq_R), max(adeq_R)))

# GeoTIFF opcional: usa o mapa Python somente como molde de grade/CRS. As
# probabilidades gravadas são as calculadas acima pelo modelo randomForest em R.
if (!is.null(tif_molde) && !is.null(tif_saida)) {
  suppressMessages(library(terra))
  r <- rast(tif_molde)
  values(r) <- NA_real_
  cells <- cellFromXY(r, out[, c("lon", "lat")])
  values(r)[cells] <- out$adeq_R
  names(r) <- "adequabilidade_R"
  writeRaster(r, tif_saida, overwrite = TRUE,
              wopt = list(gdal = c("COMPRESS=DEFLATE", "PREDICTOR=3")))
  cat(sprintf("[pred-R] GeoTIFF salvo: %s\n", tif_saida))
}
