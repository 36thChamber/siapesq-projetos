# run_predict_climatologico.R — PROJETA um modelo RF climatologico e gera o mapa de
# adequabilidade (ensemble mean dos bootstraps) + incerteza (sd).
#
# PREDICAO RAPIDA E RESUMIVEL:
#  - Extrai os N modelos randomForest do objeto sdm (getModelObject) e preve EM MATRIZ
#    (type="response") — MUITO mais rapido que o predict raster do sdm.
#  - O MapBiomas (categorico) e' expandido no MESMO one-hot que o modelo usa
#    (colunas `ocup_solo_mapbiomas__<nivel>`).
#  - Processa em FAIXAS de latitude; grava cada faixa em `_strips/` (checkpoint). Se for
#    interrompido, a proxima execucao PULA as faixas ja prontas e continua.
#  - Escreve `<model_dir>/_progress.txt` a cada faixa (barra do monitor_progresso.py).
#
# Uso (raiz do repo):
#   Rscript 04_modeling/run_predict_climatologico.R <model_dir> <model_name> <predictors_dir> <out_mean.tif> <out_sd.tif> [W,S,E,N] [linhas_por_faixa]

suppressMessages({ library(sdm); library(terra); library(randomForest); library(parallel) })
args <- commandArgs(trailingOnly = TRUE)
model_dir  <- normalizePath(args[1], winslash = "/", mustWork = TRUE)
model_name <- args[2]
pred_dir   <- normalizePath(args[3], winslash = "/", mustWork = TRUE)
out_mean   <- args[4]
out_sd     <- args[5]
bbox_arg   <- if (length(args) >= 6 && nzchar(args[6])) as.numeric(strsplit(args[6], ",")[[1]]) else NULL
linhas_faixa <- if (length(args) >= 7) as.integer(args[7]) else 300L

if (file.exists(out_mean) && file.exists(out_sd)) {
  cat(sprintf("[pred] JA EXISTE: %s — pulando.\n", basename(out_mean)))
  quit(save = "no", status = 0)
}

# Publica somente depois de fechar o TIFF. Interrupções deixam *.partial.tif,
# reconhecidos pelo inventário do run_predicoes_cenarios.py na próxima execução.
write_checkpoint <- function(r, path) {
  partial <- sub("[.]tif$", ".partial.tif", path)
  writeRaster(r, partial, overwrite = TRUE)
  if (file.exists(path) && !file.remove(path)) stop("Não foi possível substituir: ", path)
  if (!file.rename(partial, path)) stop("Não foi possível publicar: ", path)
}

CAT_BASE <- "ocup_solo_mapbiomas"
BUF <- 0.3
# Checkpoint POR ALVO: o strip_dir/prog levam o nome do mapa de saida. Sem isso, dois
# mapas diferentes do MESMO modelo (ex.: recorte do RS e Brasil inteiro) escreveriam no
# mesmo `_strips` e um corromperia o outro — as faixas nao guardam a extensao que cobrem.
alvo <- tools::file_path_sans_ext(basename(out_mean))
prog_file <- file.path(model_dir, paste0("_progress_", alvo, ".txt"))
strip_dir <- file.path(model_dir, paste0("_strips_", alvo))
dir.create(strip_dir, showWarnings = FALSE, recursive = TRUE)
t0 <- Sys.time()
prog <- function(fase, feito, total, msg = "") {
  el <- as.integer(difftime(Sys.time(), t0, units = "secs"))
  pct <- if (total > 0) round(100 * feito / total) else 0
  writeLines(sprintf("%s\t%d\t%d\t%d\t%s\t%d", fase, feito, total, pct, msg, el), prog_file)
  cat(sprintf("[pred] %-10s %3d%% (%d/%d) %s\n", fase, pct, feito, total, msg))
}

prog("carregando", 0, 1, "modelo + rasters")
modelo <- sdm::read.sdm(file.path(model_dir, paste0(model_name, ".sdm")))
ids <- sdm::getModelInfo(modelo)$modelID
models <- lapply(ids, function(k) sdm::getModelObject(modelo, id = k))
rm(modelo); gc()
feat <- rownames(models[[1]]$importance)               # preditores do RF (inclui dummies)
dcols <- grep("__", feat, value = TRUE)                # colunas one-hot do MapBiomas
cont_feat <- setdiff(feat, dcols)                      # continuos (nomes crus)
preds_raster <- c(cont_feat, CAT_BASE)                 # o que preciso ler dos rasters

# CLUSTER: o predict do randomForest é o gargalo (~65 s/modelo p/ 0,8M células). Paraleliza
# a predicao dos 10 modelos em chunks de LINHAS pelos nucleos disponiveis (~10x). Os modelos
# sao exportados UMA vez para os workers.
ncores <- max(1L, min(parallel::detectCores() - 2L, as.integer(Sys.getenv("PREDICT_CORES", "2"))))   # teto p/ nao estourar RAM
cl <- NULL
if (ncores > 1L) {
  cl <- parallel::makeForkCluster(ncores)
  parallel::clusterEvalQ(cl, suppressMessages(library(randomForest)))
  # Fork workers inherit the read-only forests without serializing a copy.
}
cat(sprintf("[pred] cluster com %d nucleos\n", ncores))

# Preve mu/sd (ensemble dos N modelos) para uma matriz de preditores JA no formato do RF,
# dividindo as linhas entre os workers.
predizer_par <- function(Xok) {
  if (nrow(Xok) == 0) return(matrix(numeric(0), ncol = 2))
  chunks <- lapply(parallel::splitIndices(nrow(Xok), ncores), function(ii) Xok[ii, , drop = FALSE])
  predict_chunk <- function(sub) {
    P <- vapply(models, function(mm) predict(mm, sub, type = "response"), numeric(nrow(sub)))
    if (is.null(dim(P))) P <- matrix(P, ncol = length(models))
    mu <- rowMeans(P)
    sdv <- if (ncol(P) > 1) sqrt(rowSums((P - mu)^2) / (ncol(P) - 1)) else rep(0, length(mu))
    cbind(mu, sdv)
  }
  parts <- if (is.null(cl)) lapply(chunks, predict_chunk) else parallel::parLapply(cl, chunks, predict_chunk)
  do.call(rbind, parts)
}

tifs <- list.files(pred_dir, pattern = "[.]tif$", full.names = TRUE)
r_list <- lapply(tifs, function(f) { r <- rast(f); names(r) <- tools::file_path_sans_ext(basename(f)); r })
names(r_list) <- sapply(r_list, function(x) names(x)[1])
if (!all(preds_raster %in% names(r_list))) stop("Faltam rasters p/: ",
    paste(setdiff(preds_raster, names(r_list)), collapse = ", "))

base <- r_list[["altitude"]][[1]]
if (!is.null(bbox_arg)) base <- crop(base, ext(bbox_arg[1], bbox_arg[3], bbox_arg[2], bbox_arg[4]))
nfaixas <- max(1L, as.integer(ceiling(nrow(base) / linhas_faixa)))
cat(sprintf("[pred] base %dx%d @ %.5f° | %d faixas de ~%d linhas | %d modelos\n",
            nrow(base), ncol(base), res(base)[1], nfaixas, linhas_faixa, length(models)))
xmn <- xmin(base); xmx <- xmax(base); ry <- res(base)[2]

predizer_faixa <- function(i) {
  fmean <- file.path(strip_dir, sprintf("mean_%03d.tif", i))
  fsd   <- file.path(strip_dir, sprintf("sd_%03d.tif", i))
  if (file.exists(fmean) && file.exists(fsd)) return(invisible(NULL))   # ja feito
  r0 <- (i - 1L) * linhas_faixa + 1L; r1 <- min(i * linhas_faixa, nrow(base))
  ytop <- yFromRow(base, r0) + ry / 2; ybot <- yFromRow(base, r1) - ry / 2
  base_f <- crop(base, ext(xmn, xmx, ybot, ytop))
  e_buf  <- ext(xmn - BUF, xmx + BUF, ybot - BUF, ytop + BUF)
  cam <- lapply(preds_raster, function(nm)
    resample(crop(r_list[[nm]], e_buf, snap = "out"), base_f,
             method = if (nm == CAT_BASE) "near" else "bilinear"))
  st <- rast(cam); names(st) <- preds_raster
  X <- as.data.frame(st, na.rm = FALSE)
  ok <- stats::complete.cases(X[, cont_feat, drop = FALSE]) & !is.na(X[[CAT_BASE]])
  rmean <- base_f; rsd <- base_f; vals_m <- rep(NA_real_, ncell(base_f)); vals_s <- vals_m
  if (any(ok)) {
    Xok <- X[ok, cont_feat, drop = FALSE]
    for (d in dcols) { L <- as.integer(sub(".*__", "", d)); Xok[[d]] <- as.integer(X[[CAT_BASE]][ok] == L) }
    Xok <- Xok[, feat, drop = FALSE]
    ms <- predizer_par(Xok)                # ensemble mu/sd em paralelo
    vals_m[ok] <- ms[, 1]; vals_s[ok] <- ms[, 2]
  }
  values(rmean) <- vals_m; values(rsd) <- vals_s
  write_checkpoint(rmean, fmean); write_checkpoint(rsd, fsd)
  invisible(NULL)
}

# Uma faixa só está pronta quando AMBOS os arquivos foram publicados.
faixa_pronta <- function(i) {
  file.exists(file.path(strip_dir, sprintf("mean_%03d.tif", i))) &&
    file.exists(file.path(strip_dir, sprintf("sd_%03d.tif", i)))
}
ja <- sum(vapply(seq_len(nfaixas), faixa_pronta, logical(1)))
prog("predicao", ja, nfaixas, if (ja > 0) sprintf("retomando (%d prontas)", ja) else "iniciando")
for (i in seq_len(nfaixas)) {
  predizer_faixa(i)
  feito <- sum(vapply(seq_len(nfaixas), faixa_pronta, logical(1)))
  prog("predicao", feito, nfaixas, sprintf("faixa %d/%d", i, nfaixas))
}

prog("ensemble", 0, 2, "unindo faixas (media)")
mlist <- lapply(seq_len(nfaixas), function(i) rast(file.path(strip_dir, sprintf("mean_%03d.tif", i))))
slist <- lapply(seq_len(nfaixas), function(i) rast(file.path(strip_dir, sprintf("sd_%03d.tif", i))))
p_mean <- if (length(mlist) == 1) mlist[[1]] else do.call(terra::merge, mlist)
write_checkpoint(p_mean, out_mean)
prog("ensemble", 1, 2, "unindo faixas (incerteza)")
p_sd <- if (length(slist) == 1) slist[[1]] else do.call(terra::merge, slist)
write_checkpoint(p_sd, out_sd)

if (!is.null(cl)) parallel::stopCluster(cl)
mn <- global(p_mean, "min", na.rm = TRUE)[1, 1]; mx <- global(p_mean, "max", na.rm = TRUE)[1, 1]
unlink(strip_dir, recursive = TRUE)                      # limpa checkpoints
prog("concluido", 2, 2, sprintf("adequab. %.3f-%.3f", mn, mx))
cat(sprintf("[pred] FEITO: %s | adequabilidade %.3f a %.3f\n", out_mean, mn, mx))
