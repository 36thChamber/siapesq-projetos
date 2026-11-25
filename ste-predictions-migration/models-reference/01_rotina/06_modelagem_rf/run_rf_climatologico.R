# run_rf_climatologico.R — Treina RANDOM FOREST no conjunto CLIMATOLOGICO (nicho medio)
# de UMA especie e gera o relatorio de avaliacao (AUC/TSS por bootstrap).
#
# Parametros de metodologia (fixados conforme decidido com o usuario):
#   - 7 preditores: t2m,e,tp,ndvi,altitude,awc,ocup_solo_mapbiomas
#     (uso do solo = MapBiomas, categorico; dados APENAS do Brasil, entao MapBiomas
#      cobre 100% e substitui o WorldCover global. slope/clay REMOVIDAS.)
#   - VIF/correlacao ficam como RELATORIO (QC); nenhuma variavel e cortada automaticamente
#   - RF, replicacao bootstrap n_reps (padrao 10)
#   - casos COMPLETOS nos 7 preditores (RF nao aceita NA)
#
# Uso (a partir da raiz do repo):
#   Rscript 04_modeling/run_rf_climatologico.R <csv_climatologico> <output_dir> <model_name> [n_reps] [uso_solo] [extras]
#
#   [uso_solo] (opcional): coluna CATEGORICA de uso do solo a usar como preditor.
#     Padrao "ocup_solo_mapbiomas" (rodadas so-Brasil). Modelos com area PY/AR/BO
#     usam "ocup_solo_worldcover", que e global.
#   [extras] (opcional): preditores CONTINUOS adicionais, separados por virgula.
#     Caminho B do caraya: "t2m_amp,e_amp,tp_amp,ndvi_amp" (amplitudes sazonais do
#     lugar — o que separa Cerrado de Amazonia sem o desenho por-registro que inverte).

suppressMessages({ library(sdm); library(randomForest) })
args <- commandArgs(trailingOnly = TRUE)
csv        <- args[1]
outdir     <- args[2]
model_name <- args[3]
n_reps     <- if (length(args) >= 4) as.integer(args[4]) else 10L
uso_solo   <- if (length(args) >= 5) args[5] else "ocup_solo_mapbiomas"
extras     <- if (length(args) >= 6 && nzchar(args[6]))
                strsplit(args[6], ",")[[1]] else character(0)

source("01_rotina/06_modelagem_rf/utils.r")
dir.create(outdir, recursive = TRUE, showWarnings = FALSE)
# generate_model faz setwd(data_path) e depois file.path(data_path, csv): com caminho
# RELATIVO isso duplica o path. Normalizamos para ABSOLUTO para evitar o bug.
outdir <- normalizePath(outdir, winslash = "/", mustWork = TRUE)

PREDS <- c("t2m", "e", "tp", "ndvi", "altitude", "awc", uso_solo, extras)

df <- read.csv(csv, check.names = FALSE)
keep <- intersect(c("decimalLatitude", "decimalLongitude", "sp", PREDS), names(df))
df <- df[, keep]
n0 <- nrow(df)
df <- df[complete.cases(df[, c("sp", PREDS)]), ]
cat(sprintf("[rf] %s | registros %d -> %d completos (%d preditores)\n",
            model_name, n0, nrow(df), length(PREDS)))
cat(sprintf("[rf] balanco: presencas=%d | pseudo=%d\n",
            sum(df$sp == 1), sum(df$sp == 0)))

prep_csv <- "predictor_climatologico.csv"
write.csv(df, file.path(outdir, prep_csv), row.names = FALSE)

# Rotulos de classe/coords/datas fora dos preditores. A coluna de uso do solo
# ESCOLHIDA (uso_solo) e preditor; a outra fonte e os rotulos textuais sao ignorados.
ig <- setdiff(c("decimalLongitude", "decimalLatitude", "species", "year", "day", "month",
                "ocup_solo_mapbiomas", "ocup_solo_mapbiomas_classe",
                "ocup_solo_worldcover", "ocup_solo_worldcover_classe",
                "base_de_dados"),
              uso_solo)

generate_model(data_path = outdir, output_path = outdir, model_name = model_name,
               csv_filename = prep_csv, methods = c("rf"), n_reps = n_reps,
               ignore_cols = ig)

generate_gui_report(model_path = outdir, model_name = model_name,
                    output_csv = file.path(outdir, paste0(model_name, "_eval.csv")),
                    output_html = file.path(outdir, paste0(model_name, "_eval.html")),
                    title = paste("RF climatologico —", model_name))

cat("[rf] FEITO:", model_name, "\n")
