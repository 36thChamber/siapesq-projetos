# predizer_marinho.R — Predição do modelo R sobre as MESMAS células do mapa Python.
#
# Lê a matriz de células oceânicas exportada pela predição Python (gridX.csv: lat/lon +
# preditores + adeq_py), aplica o RF em R e grava adeq_R por célula. A comparação de mapas
# (correlação Python×R, diferença, figura lado a lado) é feita depois em comparar_py_r.py.
#
# Uso: Rscript 04_modeling/predizer_marinho.R <gridX.csv> <modelo_R.rds> <saida_gridX_R.csv>

suppressMessages(library(randomForest))
args <- commandArgs(trailingOnly = TRUE)
gridx <- args[1]; modelo <- args[2]; saida <- args[3]

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
