# modelo_marinho.R — Modelagem RF em R (pacote randomForest) do PIPELINE OCEÂNICO.
#
# Espelha o modelo Python (sklearn) para COMPARAÇÃO JUSTA: usa o MESMO split treino/teste
# (coluna `split` do <nome>_dados_split.csv gerado pelo modelo Python) e os MESMOS
# preditores, avaliando nas MESMAS linhas de teste. Reporta AUC/TSS/sens/spec/MCC/F1 e o
# TEMPO de treino — para comparar resultado, eficácia, confiabilidade e tempo com o Python.
#
# Uso:
#   Rscript 04_modeling/modelo_marinho.R <dados_split.csv> <outdir> <especie> [ntree]

suppressMessages(library(randomForest))
args <- commandArgs(trailingOnly = TRUE)
csv     <- args[1]
outdir  <- args[2]
especie <- args[3]
ntree   <- if (length(args) >= 4) as.integer(args[4]) else 500L
set.seed(42)   # reprodutibilidade (o Python usa seed 42)

dir.create(outdir, recursive = TRUE, showWarnings = FALSE)
df <- read.csv(csv)
preds <- setdiff(names(df), c("sp", "split"))
df$sp <- factor(df$sp, levels = c(0, 1))

tr <- df[df$split == "treino", ]
te <- df[df$split == "teste", ]
cat(sprintf("[rf-R] %s | treino=%d teste=%d | preditores: %s\n",
            especie, nrow(tr), nrow(te), paste(preds, collapse = ", ")))

# --- treino CRONOMETRADO ---
t0 <- Sys.time()
rf <- randomForest(x = tr[, preds], y = tr$sp, ntree = ntree)
tempo_treino <- as.numeric(difftime(Sys.time(), t0, units = "secs"))

# --- predição no MESMO teste ---
p_te <- predict(rf, te[, preds], type = "prob")[, "1"]
p_tr <- predict(rf, tr[, preds], type = "prob")[, "1"]
y_te <- as.integer(as.character(te$sp))
y_tr <- as.integer(as.character(tr$sp))

# --- métricas (sem pROC: AUC por ranks = Mann-Whitney) ---
auc <- function(y, p) {
  n1 <- sum(y == 1); n0 <- sum(y == 0)
  if (n1 == 0 || n0 == 0) return(NA_real_)
  r <- rank(p)
  (sum(r[y == 1]) - n1 * (n1 + 1) / 2) / (n1 * n0)
}
tss_max <- function(y, p) {
  thrs <- sort(unique(round(p, 3)))
  best <- -1; bt <- 0.5
  for (t in thrs) {
    pred <- as.integer(p >= t)
    tp <- sum(pred == 1 & y == 1); tn <- sum(pred == 0 & y == 0)
    fp <- sum(pred == 1 & y == 0); fn <- sum(pred == 0 & y == 1)
    sens <- if ((tp + fn) > 0) tp / (tp + fn) else 0
    spec <- if ((tn + fp) > 0) tn / (tn + fp) else 0
    if (sens + spec - 1 > best) { best <- sens + spec - 1; bt <- t }
  }
  c(tss = best, thr = bt)
}
auc_te <- auc(y_te, p_te); auc_tr <- auc(y_tr, p_tr)
tm <- tss_max(y_te, p_te); thr <- tm["thr"]
pred <- as.integer(p_te >= thr)
tp <- sum(pred == 1 & y_te == 1); tn <- sum(pred == 0 & y_te == 0)
fp <- sum(pred == 1 & y_te == 0); fn <- sum(pred == 0 & y_te == 1)
sens <- if ((tp + fn) > 0) tp / (tp + fn) else 0
spec <- if ((tn + fp) > 0) tn / (tn + fp) else 0
prec <- if ((tp + fp) > 0) tp / (tp + fp) else 0
f1   <- if ((prec + sens) > 0) 2 * prec * sens / (prec + sens) else 0
den  <- sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn))
mcc  <- if (den == 0) 0 else (tp * tn - fp * fn) / den

# importância (MeanDecreaseGini)
imp <- rf$importance[, 1]
imp_txt <- paste(sprintf('"%s": %.4f', names(imp), imp / sum(imp)), collapse = ", ")

nome <- sprintf("rf_%s_marinho_R", gsub("[^A-Za-z0-9]+", "_", especie))
saveRDS(rf, file.path(outdir, paste0(nome, ".rds")))
json <- sprintf(paste0(
  '{\n  "framework": "R randomForest",\n  "especie": "%s",\n  "preditores": [%s],\n',
  '  "n_treino": %d,\n  "n_teste": %d,\n  "ntree": %d,\n',
  '  "auc_teste": %.4f,\n  "auc_treino": %.4f,\n  "overfit_auc": %.4f,\n',
  '  "tss_max_teste": %.4f,\n  "limiar_maxTSS": %.3f,\n',
  '  "sensibilidade": %.4f,\n  "especificidade": %.4f,\n  "precisao": %.4f,\n',
  '  "f1": %.4f,\n  "mcc": %.4f,\n',
  '  "matriz_confusao_teste": {"tn": %d, "fp": %d, "fn": %d, "tp": %d},\n',
  '  "tempo_treino_seg": %.3f,\n  "importancia_gini": {%s},\n',
  '  "validacao": "MESMO split do Python (treino/teste identicos) — comparacao justa"\n}\n'),
  especie, paste(sprintf('"%s"', preds), collapse = ", "),
  nrow(tr), nrow(te), ntree, auc_te, auc_tr, auc_tr - auc_te,
  tm["tss"], thr, sens, spec, prec, f1, mcc, tn, fp, fn, tp,
  tempo_treino, imp_txt)
writeLines(json, file.path(outdir, paste0(nome, "_eval.json")))

cat("\n==== MODELO RF MARINHO (R) — AVALIACAO ====\n")
cat(sprintf("  AUC teste = %.4f (treino %.4f, overfit %.4f)\n", auc_te, auc_tr, auc_tr - auc_te))
cat(sprintf("  TSS(max) = %.4f @ %.3f | MCC=%.4f F1=%.4f | sens=%.4f spec=%.4f\n",
            tm["tss"], thr, mcc, f1, sens, spec))
cat(sprintf("  tempo de treino = %.3f s\n", tempo_treino))
cat(sprintf("[rf-R] modelo salvo: %s\n", file.path(outdir, paste0(nome, ".rds"))))
