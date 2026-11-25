read_species_config <- function(project_root,
                                config_path = file.path(
                                  project_root,
                                  "config",
                                  "species.csv"
                                )) {
  if (!file.exists(config_path)) {
    stop("Configuração de espécies não encontrada: ", config_path, call. = FALSE)
  }

  config <- utils::read.csv(
    config_path,
    stringsAsFactors = FALSE,
    check.names = FALSE
  )
  required <- c("species_id", "enabled", "model_name", "csv_filename")
  missing <- setdiff(required, names(config))
  if (length(missing) > 0L) {
    stop(
      "Colunas ausentes em config/species.csv: ",
      paste(missing, collapse = ", "),
      call. = FALSE
    )
  }

  config$species_id <- trimws(config$species_id)
  config$model_name <- trimws(config$model_name)
  config$csv_filename <- trimws(config$csv_filename)
  config$enabled <- tolower(trimws(as.character(config$enabled))) %in% c(
    "true", "1", "yes", "sim"
  )

  if (anyDuplicated(config$species_id)) {
    stop("Há species_id duplicado em config/species.csv.", call. = FALSE)
  }
  config
}

validate_species_assets <- function(species_row, project_root) {
  species_dir <- file.path(
    project_root,
    "oceanincs",
    species_row$species_id
  )
  csv_path <- file.path(species_dir, species_row$csv_filename)
  model_file <- file.path(species_dir, paste0(species_row$model_name, ".sdm"))

  missing <- character(0)
  if (!dir.exists(species_dir)) missing <- c(missing, species_dir)
  if (!file.exists(csv_path)) missing <- c(missing, csv_path)
  if (!file.exists(model_file)) missing <- c(missing, model_file)

  if (length(missing) > 0L) {
    stop(
      "Ativos ausentes para ", species_row$species_id, ": ",
      paste(missing, collapse = ", "),
      ". Os .sdm e predictor.csv não são recuperados pelo clone porque são ",
      "artefatos de dados/modelo; restaure-os do EBS/S3 ou treine o modelo.",
      call. = FALSE
    )
  }

  list(
    species_dir = species_dir,
    csv_path = csv_path,
    model_file = model_file
  )
}

validate_daily_predictors <- function(predictors_path, expected = c(
                                        "CHL", "depth", "so", "thetao"
                                      )) {
  files <- list_predictor_files(
    predictors_path,
    pattern = "\\.(nc|tif|tiff)$"
  )
  stems <- normalize_predictor_name(
    tools::file_path_sans_ext(basename(files))
  )
  missing <- expected[
    !normalize_predictor_name(expected) %in% stems
  ]
  if (length(missing) > 0L) {
    stop(
      "Preditores diários ausentes em ", predictors_path, ": ",
      paste(missing, collapse = ", "),
      call. = FALSE
    )
  }
  invisible(files)
}

with_species_log <- function(log_file, expression) {
  dir.create(dirname(log_file), recursive = TRUE, showWarnings = FALSE)
  output_connection <- file(log_file, open = "at", encoding = "UTF-8")
  on.exit(close(output_connection), add = TRUE)

  sink(output_connection, type = "output", split = TRUE)
  on.exit(sink(type = "output"), add = TRUE)
  sink(output_connection, type = "message")
  on.exit(sink(type = "message"), add = TRUE)

  force(expression)
}

predict_one_species <- function(species_row,
                                project_root,
                                predictors_path,
                                prediction_date,
                                output_root,
                                log_root) {
  species_id <- species_row$species_id
  model_name <- species_row$model_name
  assets <- validate_species_assets(species_row, project_root)

  species_output <- file.path(output_root, species_id)
  dir.create(species_output, recursive = TRUE, showWarnings = FALSE)
  log_file <- file.path(log_root, paste0(species_id, ".log"))

  output_mean <- file.path(
    species_output,
    paste0(model_name, "_", prediction_date, "_mean.tif")
  )
  output_sd <- file.path(
    species_output,
    paste0(model_name, "_", prediction_date, "_sd.tif")
  )

  with_species_log(log_file, {
    message(
      format(Sys.time(), "%Y-%m-%d %H:%M:%S"),
      " | Iniciando ", species_id
    )
    predict_sdm(
      model_path = assets$model_file,
      predictors_path = predictors_path,
      output_file = output_mean,
      uncertainty_file = output_sd,
      csv_path = assets$csv_path,
      pattern = "\\.(nc|tif|tiff)$",
      resample = TRUE,
      model_name = model_name,
      ensemble = TRUE,
      ensemble_fun = "mean",
      save_multiband = FALSE
    )
    message(
      format(Sys.time(), "%Y-%m-%d %H:%M:%S"),
      " | Concluído ", species_id
    )
  })

  list(
    mean_file = output_mean,
    sd_file = output_sd,
    log_file = log_file
  )
}

run_daily_pipeline <- function(project_root,
                               predictors_path,
                               prediction_date,
                               species_ids = NULL,
                               config_path = file.path(
                                 project_root,
                                 "config",
                                 "species.csv"
                               )) {
  project_root <- normalizePath(project_root, mustWork = TRUE)
  predictors_path <- normalizePath(predictors_path, mustWork = TRUE)
  prediction_date <- as.character(as.Date(prediction_date))
  validate_daily_predictors(predictors_path)

  config <- read_species_config(project_root, config_path)
  config <- config[config$enabled, , drop = FALSE]

  if (!is.null(species_ids)) {
    unknown <- setdiff(species_ids, config$species_id)
    if (length(unknown) > 0L) {
      stop(
        "Espécies não habilitadas ou desconhecidas: ",
        paste(unknown, collapse = ", "),
        call. = FALSE
      )
    }
    config <- config[config$species_id %in% species_ids, , drop = FALSE]
  }

  output_root <- file.path(project_root, "outputs", prediction_date)
  log_root <- file.path(project_root, "logs", prediction_date)
  dir.create(output_root, recursive = TRUE, showWarnings = FALSE)
  dir.create(log_root, recursive = TRUE, showWarnings = FALSE)

  results <- vector("list", nrow(config))
  for (index in seq_len(nrow(config))) {
    row <- config[index, , drop = FALSE]
    started_at <- Sys.time()
    error_message <- NA_character_
    output_mean <- NA_character_
    output_sd <- NA_character_

    tryCatch(
      {
        output <- predict_one_species(
          row,
          project_root,
          predictors_path,
          prediction_date,
          output_root,
          log_root
        )
        output_mean <- output$mean_file
        output_sd <- output$sd_file
      },
      error = function(error) {
        error_message <<- conditionMessage(error)
        message("ERRO em ", row$species_id, ": ", error_message)
      }
    )

    results[[index]] <- data.frame(
      species_id = row$species_id,
      status = if (is.na(error_message)) "ok" else "erro",
      started_at = format(started_at, "%Y-%m-%dT%H:%M:%S%z"),
      finished_at = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z"),
      mean_file = output_mean,
      sd_file = output_sd,
      error = error_message,
      stringsAsFactors = FALSE
    )
  }

  summary <- do.call(rbind, results)
  summary_file <- file.path(output_root, "run_summary.csv")
  utils::write.csv(summary, summary_file, row.names = FALSE, na = "")
  attr(summary, "summary_file") <- summary_file
  summary
}

train_species_model <- function(species_row,
                                project_root,
                                n_reps = 10L,
                                force = FALSE,
                                run_vif = FALSE) {
  species_dir <- file.path(project_root, "oceanincs", species_row$species_id)
  csv_path <- file.path(species_dir, species_row$csv_filename)
  model_file <- file.path(species_dir, paste0(species_row$model_name, ".sdm"))

  if (!dir.exists(species_dir)) {
    stop("Pasta da espécie ausente: ", species_dir, call. = FALSE)
  }
  if (!file.exists(csv_path)) {
    stop("predictor.csv ausente: ", csv_path, call. = FALSE)
  }
  if (file.exists(model_file) && !isTRUE(force)) {
    message("Modelo existente; ignorando: ", model_file)
    return(invisible(model_file))
  }

  if (isTRUE(run_vif)) {
    generate_vif(csv_path)
  }

  model <- generate_model(
    data_path = species_dir,
    output_path = species_dir,
    model_name = species_row$model_name,
    methods = "rf",
    csv_filename = species_row$csv_filename,
    n_reps = n_reps
  )
  generate_gui_report(
    model = model,
    model_path = species_dir,
    model_name = species_row$model_name,
    title = paste("Avaliação SDM —", species_row$species_id)
  )
  invisible(model_file)
}
