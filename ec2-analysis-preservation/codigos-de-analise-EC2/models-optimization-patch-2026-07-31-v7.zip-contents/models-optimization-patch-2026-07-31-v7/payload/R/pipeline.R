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
  output_sinks <- sink.number(type = "output")
  message_sinks <- sink.number(type = "message")
  sink(output_connection, type = "output", split = TRUE)
  sink(output_connection, type = "message")
  on.exit({
    while (sink.number(type = "message") > message_sinks) {
      try(sink(type = "message"), silent = TRUE)
    }
    while (sink.number(type = "output") > output_sinks) {
      try(sink(type = "output"), silent = TRUE)
    }
    try(close(output_connection), silent = TRUE)
  }, add = TRUE)

  force(expression)
}

environment_flag <- function(name, default = FALSE) {
  value <- Sys.getenv(name, unset = if (default) "true" else "false")
  tolower(trimws(value)) %in% c("true", "1", "yes", "sim")
}

environment_number <- function(name, default) {
  value <- suppressWarnings(as.numeric(Sys.getenv(name, unset = as.character(default))))
  if (!is.finite(value)) default else value
}

environment_path <- function(name) {
  value <- trimws(Sys.getenv(name, unset = ""))
  if (nzchar(value)) value else NULL
}

predict_one_species <- function(species_row,
                                project_root,
                                predictors_path,
                                prediction_date,
                                output_root,
                                log_root,
                                aligned_predictors_path,
                                temp_root,
                                mask_variable = "depth",
                                mask_rule = "auto") {
  species_id <- species_row$species_id
  model_name <- species_row$model_name
  assets <- validate_species_assets(species_row, project_root)
  worker_tmp <- configure_sdm_runtime(
    temp_root = temp_root,
    terra_memfrac = environment_number("SDM_TERRA_MEMFRAC", 0.60),
    threads_per_worker = 1L
  )
  on.exit(unlink(worker_tmp, recursive = TRUE, force = TRUE), add = TRUE)

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
      resample = FALSE,
      model_name = model_name,
      ensemble = TRUE,
      ensemble_fun = "mean",
      save_multiband = FALSE,
      aligned_predictors_path = aligned_predictors_path,
      mask_variable = mask_variable,
      mask_rule = mask_rule,
      stats_tmp_dir = worker_tmp
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
  if (nrow(config) == 0L) {
    stop("Nenhuma espécie habilitada foi selecionada.", call. = FALSE)
  }

  output_root <- file.path(project_root, "outputs", prediction_date)
  log_root <- file.path(project_root, "logs", prediction_date)
  cache_dir <- Sys.getenv(
    "SDM_CACHE_DIR",
    unset = file.path(predictors_path, "_aligned_sdm_cache")
  )
  temp_root <- Sys.getenv(
    "SDM_TMPDIR",
    unset = file.path(project_root, "data", "tmp", prediction_date)
  )
  dir.create(output_root, recursive = TRUE, showWarnings = FALSE)
  dir.create(log_root, recursive = TRUE, showWarnings = FALSE)
  dir.create(temp_root, recursive = TRUE, showWarnings = FALSE)

  assets <- lapply(seq_len(nrow(config)), function(index) {
    validate_species_assets(config[index, , drop = FALSE], project_root)
  })
  all_predictors <- unlist(lapply(assets, function(item) {
    infer_predictors_from_csv(item$csv_path)$predictor_names
  }), use.names = FALSE)
  all_predictors <- all_predictors[
    !duplicated(normalize_predictor_name(all_predictors))
  ]
  mask_variable <- Sys.getenv("SDM_MASK_VARIABLE", unset = "depth")
  # Os rasters oceânicos já carregam NA fora de sua cobertura; o sdm ignora
  # essas células durante a predição. Não fazemos global()/min()/max() para
  # construir uma segunda máscara sobre a grade inteira.
  mask_rule <- Sys.getenv("SDM_MASK_RULE", unset = "non_na")
  prepared <- prepare_aligned_predictors(
    predictors_path = predictors_path,
    cache_dir = cache_dir,
    predictor_names = all_predictors,
    pattern = "\\.(nc|tif|tiff)$",
    ref_raster_path = environment_path("SDM_REFERENCE_RASTER"),
    mask_variable = mask_variable,
    mask_raster_path = environment_path("SDM_MASK_RASTER"),
    mask_rule = mask_rule,
    require_complete_cases = FALSE,
    rebuild_cache = environment_flag("SDM_REBUILD_CACHE", FALSE)
  )

  requested_workers <- Sys.getenv("SDM_WORKERS", unset = "auto")
  worker_count <- min(
    nrow(config),
    recommended_sdm_workers(
      requested = requested_workers,
      memory_per_worker_gb = environment_number(
        "SDM_MEMORY_PER_WORKER_GB",
        3
      ),
      reserve_memory_gb = environment_number("SDM_RESERVE_MEMORY_GB", 1),
      max_workers = as.integer(environment_number("SDM_MAX_WORKERS", 4))
    )
  )
  if (.Platform$OS.type == "windows" && worker_count > 1L) {
    warning("Fork não está disponível no Windows; usando um worker.")
    worker_count <- 1L
  }
  message(
    "Rodada ", prediction_date, ": ", nrow(config), " espécie(s), ",
    worker_count, " worker(s), cache ", prepared$stack_file
  )

  run_index <- function(index) {
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
          log_root,
          aligned_predictors_path = prepared$stack_file,
          temp_root = temp_root,
          mask_variable = mask_variable,
          mask_rule = mask_rule
        )
        output_mean <- output$mean_file
        output_sd <- output$sd_file
      },
      error = function(error) {
        error_message <<- conditionMessage(error)
        cat(
          format(Sys.time(), "%Y-%m-%d %H:%M:%S"),
          " | ERRO | ", error_message, "\n",
          file = file.path(log_root, paste0(row$species_id, ".log")),
          append = TRUE,
          sep = ""
        )
      }
    )

    finished_at <- Sys.time()
    data.frame(
      species_id = row$species_id,
      status = if (is.na(error_message)) "ok" else "erro",
      started_at = format(started_at, "%Y-%m-%dT%H:%M:%S%z"),
      finished_at = format(finished_at, "%Y-%m-%dT%H:%M:%S%z"),
      elapsed_seconds = round(
        as.numeric(difftime(finished_at, started_at, units = "secs")),
        3
      ),
      mean_file = output_mean,
      sd_file = output_sd,
      error = error_message,
      stringsAsFactors = FALSE
    )
  }

  indices <- seq_len(nrow(config))
  results <- if (worker_count > 1L) {
    parallel::mclapply(
      indices,
      run_index,
      mc.cores = worker_count,
      mc.preschedule = FALSE
    )
  } else {
    lapply(indices, run_index)
  }

  for (index in indices) {
    if (inherits(results[[index]], "try-error") || !is.data.frame(results[[index]])) {
      failure_time <- Sys.time()
      results[[index]] <- data.frame(
        species_id = config$species_id[index],
        status = "erro",
        started_at = format(failure_time, "%Y-%m-%dT%H:%M:%S%z"),
        finished_at = format(failure_time, "%Y-%m-%dT%H:%M:%S%z"),
        elapsed_seconds = NA_real_,
        mean_file = NA_character_,
        sd_file = NA_character_,
        error = paste("Worker encerrado:", as.character(results[[index]])),
        stringsAsFactors = FALSE
      )
    }
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
