required_sdm_packages <- c("raster", "sdm")

default_ignore_cols <- c(
  "decimalLongitude", "decimalLatitude", "species",
  "year", "day", "month", "lon", "lat", "x", "y", "id"
)

assert_namespaces <- function(packages) {
  missing <- packages[
    !vapply(packages, requireNamespace, logical(1), quietly = TRUE)
  ]
  if (length(missing) > 0L) {
    stop(
      "Pacotes R ausentes: ", paste(missing, collapse = ", "),
      ". Execute scripts/install_r_packages.R.",
      call. = FALSE
    )
  }
  invisible(TRUE)
}

normalize_predictor_name <- function(x) {
  x <- tolower(trimws(x))
  x <- gsub("[^a-z0-9]+", "_", x)
  gsub("^_+|_+$", "", x)
}

infer_predictors_from_csv <- function(csv_path,
                                      response_col = "sp",
                                      ignore_cols = default_ignore_cols) {
  if (!file.exists(csv_path)) {
    stop("CSV não encontrado: ", csv_path, call. = FALSE)
  }

  df <- utils::read.csv(csv_path, header = TRUE, check.names = FALSE)
  if (!response_col %in% names(df)) {
    stop("Coluna de resposta não encontrada: ", response_col, call. = FALSE)
  }

  ignored <- intersect(ignore_cols, names(df))
  numeric_cols <- names(df)[vapply(df, is.numeric, logical(1))]
  predictor_names <- setdiff(numeric_cols, c(ignored, response_col))

  if (length(predictor_names) == 0L) {
    stop(
      "Nenhuma coluna preditora numérica foi encontrada em ", csv_path, ".",
      call. = FALSE
    )
  }

  list(
    predictor_names = predictor_names,
    response_col = response_col,
    ignore_cols = ignored
  )
}

read_predictor_csv <- function(csv_path,
                               response_col = "sp",
                               sp_keep = NULL) {
  if (!file.exists(csv_path)) {
    stop("CSV não encontrado: ", csv_path, call. = FALSE)
  }
  df <- utils::read.csv(csv_path, header = TRUE, check.names = FALSE)

  if (!is.null(sp_keep)) {
    if (!response_col %in% names(df)) {
      stop("Coluna de resposta não encontrada: ", response_col, call. = FALSE)
    }
    df <- df[df[[response_col]] %in% sp_keep, , drop = FALSE]
  }

  df
}

sdm_available_methods <- function() {
  assert_namespaces("sdm")
  available <- sdm::getmethodNames("sdm")

  if (is.data.frame(available)) {
    names_found <- rownames(available)
    if ("Methods" %in% names(available)) {
      names_found <- c(names_found, as.character(available$Methods))
    }
    return(unique(tolower(names_found[nzchar(names_found)])))
  }

  unique(tolower(as.character(available)))
}

check_sdm_methods <- function(methods) {
  requested <- unique(tolower(methods))
  missing <- setdiff(requested, sdm_available_methods())
  if (length(missing) > 0L) {
    stop(
      "Métodos SDM indisponíveis: ", paste(missing, collapse = ", "),
      call. = FALSE
    )
  }
  invisible(TRUE)
}

check_sdm_dependencies <- function(methods) {
  dependency_map <- list(
    rf = "randomForest",
    gam = "mgcv",
    glm = character(0),
    brt = "gbm",
    gbm = "gbm",
    maxent = c("dismo", "rJava"),
    maxnet = "maxnet"
  )

  requested <- unique(tolower(methods))
  needed <- unique(unlist(dependency_map[requested], use.names = FALSE))
  missing <- needed[
    !vapply(needed, requireNamespace, logical(1), quietly = TRUE)
  ]

  if (length(missing) > 0L) {
    stop(
      "Dependências ausentes para os métodos solicitados: ",
      paste(missing, collapse = ", "),
      call. = FALSE
    )
  }

  if ("maxent" %in% requested) {
    jar_path <- file.path(system.file("java", package = "dismo"), "maxent.jar")
    if (!file.exists(jar_path) && !file.exists("maxent.jar")) {
      stop(
        "MaxEnt foi solicitado, mas maxent.jar não foi encontrado.",
        call. = FALSE
      )
    }
  }

  invisible(TRUE)
}

generate_model <- function(data_path,
                           output_path,
                           model_name,
                           response_col = "sp",
                           ignore_cols = default_ignore_cols,
                           methods = "rf",
                           csv_filename = "predictor.csv",
                           n_reps = 10L,
                           model_settings = NULL,
                           categorical_vars = "ocup_solo") {
  assert_namespaces(required_sdm_packages)

  csv_path <- file.path(data_path, csv_filename)
  inferred <- infer_predictors_from_csv(
    csv_path,
    response_col = response_col,
    ignore_cols = ignore_cols
  )
  df <- read_predictor_csv(csv_path)

  if (!all(df[[response_col]] %in% c(0, 1, NA))) {
    stop("A resposta '", response_col, "' deve conter apenas 0 e 1.", call. = FALSE)
  }

  keep_cols <- c(response_col, inferred$predictor_names)
  df <- df[, keep_cols, drop = FALSE]
  df <- df[stats::complete.cases(df), , drop = FALSE]

  if (nrow(df) == 0L || length(unique(df[[response_col]])) < 2L) {
    stop(
      "O treino requer linhas completas e as duas classes (sp=0 e sp=1).",
      call. = FALSE
    )
  }

  for (variable in intersect(categorical_vars, names(df))) {
    df[[variable]] <- as.factor(df[[variable]])
  }

  check_sdm_dependencies(methods)
  check_sdm_methods(methods)
  dir.create(output_path, recursive = TRUE, showWarnings = FALSE)

  formula <- stats::as.formula(paste(response_col, "~ ."))
  training_data <- sdm::sdmData(formula, train = df)
  model <- sdm::sdm(
    formula,
    training_data,
    methods = methods,
    replication = "boot",
    n = as.integer(n_reps),
    modelSettings = model_settings
  )

  sdm::write.sdm(
    model,
    file.path(output_path, model_name),
    overwrite = TRUE
  )
  model
}

list_predictor_files <- function(predictors_path,
                                 pattern = "\\.(nc|tif|tiff)$") {
  if (!dir.exists(predictors_path)) {
    stop("Pasta de preditores não encontrada: ", predictors_path, call. = FALSE)
  }

  files <- list.files(
    predictors_path,
    pattern = pattern,
    full.names = TRUE,
    ignore.case = TRUE
  )
  files <- sort(unique(files))
  if (length(files) == 0L) {
    stop(
      "Nenhum raster encontrado em ", predictors_path,
      " usando o padrão ", pattern, ".",
      call. = FALSE
    )
  }
  files
}

read_predictor_layers <- function(files) {
  assert_namespaces("raster")
  layers <- list()

  for (file in files) {
    raster_object <- tryCatch(
      raster::brick(file),
      error = function(error) {
        stop(
          "Falha ao abrir o raster ", file, ": ", conditionMessage(error),
          call. = FALSE
        )
      }
    )

    if (raster::nlayers(raster_object) == 1L) {
      names(raster_object) <- tools::file_path_sans_ext(basename(file))
    }

    for (index in seq_len(raster::nlayers(raster_object))) {
      layer <- raster_object[[index]]
      attr(layer, "source_file") <- file
      layers[[length(layers) + 1L]] <- layer
    }
  }

  layers
}

select_predictor_layers <- function(layers, predictor_names) {
  layer_names <- vapply(layers, function(layer) names(layer)[1], character(1))
  normalized_layers <- normalize_predictor_name(layer_names)
  selected <- vector("list", length(predictor_names))

  for (index in seq_along(predictor_names)) {
    predictor <- predictor_names[index]
    normalized_predictor <- normalize_predictor_name(predictor)
    matches <- which(normalized_layers == normalized_predictor)

    if (length(matches) == 0L) {
      token_match <- vapply(
        strsplit(normalized_layers, "_", fixed = TRUE),
        function(tokens) normalized_predictor %in% tokens,
        logical(1)
      )
      matches <- which(token_match)
    }

    if (length(matches) == 0L) {
      stop(
        "Não encontrei uma camada inequívoca para '", predictor,
        "'. Camadas disponíveis: ", paste(layer_names, collapse = ", "),
        call. = FALSE
      )
    }
    if (length(matches) > 1L) {
      stop(
        "Mais de uma camada corresponde a '", predictor, "': ",
        paste(layer_names[matches], collapse = ", "),
        call. = FALSE
      )
    }

    selected[[index]] <- layers[[matches]]
    names(selected[[index]]) <- predictor
  }

  selected
}

same_grid <- function(x, reference) {
  isTRUE(raster::compareRaster(
    x,
    reference,
    extent = TRUE,
    rowcol = TRUE,
    crs = TRUE,
    res = TRUE,
    orig = TRUE,
    rotation = TRUE,
    stopiffalse = FALSE
  ))
}

choose_reference_raster <- function(layers, categorical_vars) {
  areas <- vapply(layers, function(layer) {
    if (names(layer)[1] %in% categorical_vars) {
      return(Inf)
    }
    resolution <- raster::res(layer)
    if (any(!is.finite(resolution))) {
      return(Inf)
    }
    prod(abs(resolution))
  }, numeric(1))

  best <- which.min(areas)
  if (length(best) == 0L || !is.finite(areas[best])) {
    stop("Não foi possível escolher um raster contínuo como referência.", call. = FALSE)
  }
  layers[[best]]
}

align_predictor_layers <- function(layers,
                                   categorical_vars = "ocup_solo",
                                   ref_raster_path = NULL) {
  if (!is.null(ref_raster_path)) {
    if (!file.exists(ref_raster_path)) {
      stop("Raster de referência não encontrado: ", ref_raster_path, call. = FALSE)
    }
    reference <- raster::raster(ref_raster_path)
  } else {
    reference <- choose_reference_raster(layers, categorical_vars)
  }

  lapply(layers, function(layer) {
    layer_name <- names(layer)[1]
    if (same_grid(layer, reference)) {
      return(layer)
    }

    method <- if (layer_name %in% categorical_vars) "ngb" else "bilinear"
    source_resolution <- raster::res(layer)
    reference_resolution <- raster::res(reference)

    if (
      method == "ngb" &&
      all(is.finite(source_resolution)) &&
      all(is.finite(reference_resolution)) &&
      any(reference_resolution > source_resolution)
    ) {
      factor_x <- max(1L, as.integer(round(reference_resolution[1] / source_resolution[1])))
      factor_y <- max(1L, as.integer(round(reference_resolution[2] / source_resolution[2])))
      if (factor_x > 1L || factor_y > 1L) {
        layer <- raster::aggregate(
          layer,
          fact = c(factor_x, factor_y),
          fun = raster::modal,
          na.rm = TRUE,
          expand = TRUE,
          filename = raster::rasterTmpFile(),
          overwrite = TRUE
        )
      }
    }

    if (!raster::compareCRS(layer, reference)) {
      aligned <- raster::projectRaster(
        layer,
        reference,
        method = method,
        filename = raster::rasterTmpFile(),
        overwrite = TRUE
      )
    } else {
      aligned <- raster::resample(
        layer,
        reference,
        method = method,
        filename = raster::rasterTmpFile(),
        overwrite = TRUE
      )
    }
    names(aligned) <- layer_name
    aligned
  })
}

resolve_model_file <- function(model_path, model_name = NULL) {
  if (grepl("\\.sdm$", model_path, ignore.case = TRUE)) {
    model_file <- model_path
  } else {
    if (is.null(model_name) || !nzchar(model_name)) {
      model_name <- basename(normalizePath(model_path, mustWork = FALSE))
    }
    model_file <- file.path(model_path, paste0(model_name, ".sdm"))
  }

  if (!file.exists(model_file)) {
    stop("Modelo .sdm não encontrado: ", model_file, call. = FALSE)
  }
  model_file
}

safe_mean <- function(values) {
  if (all(is.na(values))) NA_real_ else mean(values, na.rm = TRUE)
}

safe_median <- function(values) {
  if (all(is.na(values))) NA_real_ else stats::median(values, na.rm = TRUE)
}

safe_sd <- function(values) {
  values <- values[!is.na(values)]
  if (length(values) == 0L) NA_real_ else if (length(values) == 1L) 0 else stats::sd(values)
}

predict_sdm <- function(model_path,
                        predictors_path,
                        output_file,
                        csv_path,
                        pattern = "\\.(nc|tif|tiff)$",
                        resample = TRUE,
                        ref_raster_path = NULL,
                        model_name = NULL,
                        response_col = "sp",
                        ignore_cols = default_ignore_cols,
                        categorical_vars = "ocup_solo",
                        ensemble = TRUE,
                        ensemble_fun = c("mean", "median"),
                        save_multiband = FALSE,
                        multiband_file = NULL,
                        uncertainty_file = NULL) {
  assert_namespaces(required_sdm_packages)
  ensemble_fun <- match.arg(ensemble_fun)

  inferred <- infer_predictors_from_csv(
    csv_path,
    response_col = response_col,
    ignore_cols = ignore_cols
  )
  model_file <- resolve_model_file(model_path, model_name)
  model <- sdm::read.sdm(model_file)

  files <- list_predictor_files(predictors_path, pattern)
  layers <- read_predictor_layers(files)
  layers <- select_predictor_layers(layers, inferred$predictor_names)

  if (isTRUE(resample)) {
    layers <- align_predictor_layers(
      layers,
      categorical_vars = categorical_vars,
      ref_raster_path = ref_raster_path
    )
  }

  predictor_stack <- raster::stack(layers)
  names(predictor_stack) <- inferred$predictor_names

  dir.create(dirname(output_file), recursive = TRUE, showWarnings = FALSE)
  if (!is.null(uncertainty_file)) {
    dir.create(dirname(uncertainty_file), recursive = TRUE, showWarnings = FALSE)
  }

  if (save_multiband && is.null(multiband_file)) {
    multiband_file <- sub(
      "\\.tif$",
      "_bands.tif",
      output_file,
      ignore.case = TRUE
    )
  }
  raw_prediction_file <- if (save_multiband) {
    multiband_file
  } else {
    paste0(raster::rasterTmpFile(), ".tif")
  }

  raw_prediction <- methods::selectMethod("predict", "sdmModels")(
    model,
    newdata = predictor_stack,
    filename = raw_prediction_file,
    overwrite = TRUE,
    mean = FALSE
  )

  if (inherits(raw_prediction, "SpatRaster")) {
    assert_namespaces("terra")
    if (isTRUE(ensemble)) {
      aggregate_function <- if (ensemble_fun == "mean") safe_mean else safe_median
      ensemble_prediction <- terra::app(
        raw_prediction,
        aggregate_function
      )
      names(ensemble_prediction) <- paste0("ensemble_", ensemble_fun)
      terra::writeRaster(
        ensemble_prediction,
        output_file,
        overwrite = TRUE,
        datatype = "FLT4S"
      )
      if (!is.null(uncertainty_file)) {
        uncertainty <- terra::app(raw_prediction, safe_sd)
        names(uncertainty) <- "sd_bootstrap"
        terra::writeRaster(
          uncertainty,
          uncertainty_file,
          overwrite = TRUE,
          datatype = "FLT4S"
        )
      }
      return(invisible(ensemble_prediction))
    }

    terra::writeRaster(
      raw_prediction,
      output_file,
      overwrite = TRUE,
      datatype = "FLT4S"
    )
    return(invisible(raw_prediction))
  }

  if (!inherits(raw_prediction, c("RasterLayer", "RasterBrick", "RasterStack"))) {
    raw_prediction <- raster::stack(raw_prediction)
  }

  if (isTRUE(ensemble)) {
    aggregate_function <- if (ensemble_fun == "mean") safe_mean else safe_median
    ensemble_prediction <- raster::calc(
      raw_prediction,
      fun = aggregate_function,
      filename = output_file,
      overwrite = TRUE,
      datatype = "FLT4S"
    )
    names(ensemble_prediction) <- paste0("ensemble_", ensemble_fun)

    if (!is.null(uncertainty_file)) {
      uncertainty <- raster::calc(
        raw_prediction,
        fun = safe_sd,
        filename = uncertainty_file,
        overwrite = TRUE,
        datatype = "FLT4S"
      )
      names(uncertainty) <- "sd_bootstrap"
    }
    return(invisible(ensemble_prediction))
  }

  raster::writeRaster(
    raw_prediction,
    filename = output_file,
    overwrite = TRUE,
    datatype = "FLT4S"
  )
  invisible(raw_prediction)
}

generate_vif <- function(csv_path,
                         response_col = "sp",
                         ignore_cols = default_ignore_cols,
                         vif_threshold = 7,
                         cor_threshold = 0.7,
                         sp_keep = 1) {
  assert_namespaces("usdm")
  df <- read_predictor_csv(csv_path, response_col, sp_keep)
  predictors <- infer_predictors_from_csv(
    csv_path,
    response_col,
    ignore_cols
  )$predictor_names

  values <- df[, predictors, drop = FALSE]
  values <- values[stats::complete.cases(values), , drop = FALSE]
  variable <- vapply(values, function(column) length(unique(column)) > 1L, logical(1))
  values <- values[, variable, drop = FALSE]

  if (ncol(values) < 2L) {
    stop("VIF requer pelo menos dois preditores com variação.", call. = FALSE)
  }

  step_result <- usdm::vifstep(values, th = vif_threshold)
  correlation_result <- usdm::vifcor(values, th = cor_threshold)

  print(step_result)
  print(correlation_result)
  invisible(list(vifstep = step_result, vifcor = correlation_result))
}

generate_5_methods <- function(base_path,
                               species_name,
                               response_col = "sp",
                               ignore_cols = default_ignore_cols,
                               csv_filename = "predictor.csv",
                               methods = c("rf", "glm", "gam", "brt", "maxent"),
                               n_reps = 10L,
                               predict_daily = FALSE,
                               predict_annual = TRUE,
                               daily_path = file.path(base_path, "predictors"),
                               annual_path = file.path(base_path, "anual"),
                               model_settings = list(
                                 brt = list(n.trees = 500, train.fraction = 0.8)
                               )) {
  csv_path <- file.path(base_path, csv_filename)

  for (method in methods) {
    model_name <- paste0(species_name, "_", method)
    settings <- NULL
    if (!is.null(model_settings[[method]])) {
      settings <- stats::setNames(list(model_settings[[method]]), method)
    }

    generate_model(
      data_path = base_path,
      output_path = base_path,
      model_name = model_name,
      response_col = response_col,
      ignore_cols = ignore_cols,
      methods = method,
      csv_filename = csv_filename,
      n_reps = n_reps,
      model_settings = settings
    )

    if (isTRUE(predict_daily)) {
      predict_sdm(
        model_path = base_path,
        predictors_path = daily_path,
        output_file = file.path(base_path, paste0(model_name, "_diario_mean.tif")),
        uncertainty_file = file.path(base_path, paste0(model_name, "_diario_sd.tif")),
        csv_path = csv_path,
        pattern = "\\.(nc|tif|tiff)$",
        resample = TRUE,
        model_name = model_name,
        response_col = response_col,
        ignore_cols = ignore_cols
      )
    }

    if (isTRUE(predict_annual)) {
      predict_sdm(
        model_path = base_path,
        predictors_path = annual_path,
        output_file = file.path(base_path, paste0(model_name, "_anual_mean.tif")),
        uncertainty_file = file.path(base_path, paste0(model_name, "_anual_sd.tif")),
        csv_path = csv_path,
        pattern = "\\.(tif|tiff)$",
        resample = TRUE,
        model_name = model_name,
        response_col = response_col,
        ignore_cols = ignore_cols
      )
    }
  }
  invisible(TRUE)
}

html_escape <- function(values) {
  values <- gsub("&", "&amp;", values, fixed = TRUE)
  values <- gsub("<", "&lt;", values, fixed = TRUE)
  values <- gsub(">", "&gt;", values, fixed = TRUE)
  values
}

generate_gui_report <- function(model = NULL,
                                model_path = NULL,
                                model_name = NULL,
                                output_csv = NULL,
                                output_html = NULL,
                                title = "Avaliação dos modelos SDM") {
  assert_namespaces("sdm")

  if (is.null(model)) {
    model_file <- resolve_model_file(model_path, model_name)
    model <- sdm::read.sdm(model_file)
  }

  evaluations <- as.data.frame(sdm::getEvaluation(model))
  if (is.null(output_csv) && !is.null(model_path) && !is.null(model_name)) {
    output_csv <- file.path(model_path, paste0(model_name, "_eval.csv"))
  }
  if (is.null(output_html) && !is.null(model_path) && !is.null(model_name)) {
    output_html <- file.path(model_path, paste0(model_name, "_eval.html"))
  }

  if (!is.null(output_csv)) {
    utils::write.csv(evaluations, output_csv, row.names = FALSE)
  }

  if (!is.null(output_html)) {
    formatted <- evaluations
    numeric_columns <- vapply(formatted, is.numeric, logical(1))
    formatted[numeric_columns] <- lapply(
      formatted[numeric_columns],
      round,
      digits = 3
    )

    header <- paste0(
      "<tr>",
      paste0("<th>", html_escape(names(formatted)), "</th>", collapse = ""),
      "</tr>"
    )
    rows <- apply(formatted, 1, function(row) {
      paste0(
        "<tr>",
        paste0("<td>", html_escape(as.character(row)), "</td>", collapse = ""),
        "</tr>"
      )
    })

    html <- c(
      "<!doctype html>",
      "<html lang='pt-BR'><head><meta charset='utf-8'>",
      paste0("<title>", html_escape(title), "</title>"),
      "<style>body{font-family:Arial,sans-serif;margin:2rem}",
      "table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:.35rem}",
      "th{background:#f5f5f5}</style></head><body>",
      paste0("<h1>", html_escape(title), "</h1>"),
      paste0("<table>", header, paste(rows, collapse = "\n"), "</table>"),
      "</body></html>"
    )
    writeLines(html, output_html, useBytes = TRUE)
  }

  evaluations
}
