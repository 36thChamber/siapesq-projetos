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

attach_sdm_package <- function() {
  if (!"package:sdm" %in% search()) {
    attached <- suppressPackageStartupMessages(
      require("sdm", character.only = TRUE, quietly = TRUE)
    )
    if (!isTRUE(attached)) {
      stop(
        "O pacote 'sdm' está instalado, mas não pôde ser anexado à sessão R.",
        call. = FALSE
      )
    }
  }
  invisible(TRUE)
}

normalize_predictor_name <- function(x) {
  x <- tolower(trimws(x))
  x <- gsub("[^a-z0-9]+", "_", x)
  x <- gsub("^_+|_+$", "", x)

  # Compatibilidade com os modelos marinhos legados do repositório
  # siapesq/Modelos-R. Esses modelos foram treinados antes da padronização
  # diária dos nomes Copernicus, mas representam as mesmas três variáveis.
  legacy_aliases <- c(
    surface_salinity_mean = "so",
    surface_temperature_mean = "thetao",
    ms_bathymetry = "depth"
  )
  matched <- match(x, names(legacy_aliases))
  replace <- !is.na(matched)
  x[replace] <- unname(legacy_aliases[matched[replace]])
  x
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
      if (!raster::hasValues(layer)) {
        stop(
          "Raster sem valores: ", file,
          " (camada ", index, ").",
          call. = FALSE
        )
      }
      layers[[length(layers) + 1L]] <- layer
    }
  }

  layers
}

# O pipeline diário original abre somente a primeira variável raster de cada
# arquivo e usa o nome do arquivo como nome do preditor. Esse caminho já foi
# exercitado com sucesso pelos 16 modelos na EC2. O cache compartilhado mantém
# exatamente essa semântica para evitar diferenças de seleção de subdataset
# entre raster e terra ao abrir NetCDF.
read_daily_predictor_layers <- function(files) {
  assert_namespaces("raster")
  lapply(files, function(file) {
    layer <- tryCatch(
      raster::raster(file),
      error = function(error) {
        stop(
          "Falha ao abrir o preditor diário ", file, ": ",
          conditionMessage(error),
          call. = FALSE
        )
      }
    )
    names(layer) <- tools::file_path_sans_ext(basename(file))
    if (!raster::hasValues(layer)) {
      stop("Preditor diário sem fonte de valores: ", file, call. = FALSE)
    }
    layer
  })
}

# Confirma valores lendo blocos diretamente, sem global(), min(), max() ou
# outra estatística resumida sobre toda a grade. A leitura para assim que
# encontra a primeira célula finita.
raster_has_finite_cell <- function(layer) {
  assert_namespaces("raster")
  blocks <- raster::blockSize(layer, minblocks = 4L)
  for (index in seq_len(blocks$n)) {
    values <- raster::getValuesBlock(
      layer,
      row = blocks$row[index],
      nrows = blocks$nrows[index]
    )
    if (any(is.finite(values))) return(TRUE)
  }
  FALSE
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

configure_raster_tmpdir <- function(path) {
  assert_namespaces("raster")

  if (length(path) != 1L || is.na(path) || !nzchar(path)) {
    stop("Diretório temporário do raster inválido.", call. = FALSE)
  }

  dir.create(path, recursive = TRUE, showWarnings = FALSE)
  if (!dir.exists(path)) {
    stop(
      "Não foi possível criar o diretório temporário do raster: ", path,
      call. = FALSE
    )
  }

  normalized_path <- normalizePath(path, winslash = "/", mustWork = TRUE)
  probe <- base::tempfile(pattern = ".sdm-write-test-", tmpdir = normalized_path)
  writable <- suppressWarnings(base::file.create(probe))
  if (!isTRUE(writable)) {
    stop(
      "O diretório temporário do raster não permite gravação: ",
      normalized_path,
      call. = FALSE
    )
  }
  unlink(probe, force = TRUE)

  # rasterOptions() imprime a tabela completa de opções em algumas versões
  # antigas. capture.output mantém o log limpo, mas a configuração é aplicada.
  invisible(utils::capture.output(
    raster::rasterOptions(tmpdir = normalized_path)
  ))
  normalized_path
}

temporary_raster_tif <- function(temp_dir, pattern) {
  base::tempfile(pattern = pattern, tmpdir = temp_dir, fileext = ".tif")
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
                                   ref_raster_path = NULL,
                                   temp_dir = file.path(tempdir(), "raster")) {
  temp_dir <- configure_raster_tmpdir(temp_dir)

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
      aligned <- layer
    } else {
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
            filename = temporary_raster_tif(temp_dir, "sdm_aggregate_"),
            overwrite = TRUE
          )
        }
      }

      if (!raster::compareCRS(layer, reference)) {
        aligned <- raster::projectRaster(
          layer,
          reference,
          method = method,
          filename = temporary_raster_tif(temp_dir, "sdm_project_"),
          overwrite = TRUE
        )
      } else {
        aligned <- raster::resample(
          layer,
          reference,
          method = method,
          filename = temporary_raster_tif(temp_dir, "sdm_resample_"),
          overwrite = TRUE
        )
      }
    }

    # Todo resultado, inclusive uma camada que já estava na grade de referência,
    # é materializado e reaberto individualmente. Isso evita RasterLayer com
    # geometria válida, mas fonte de valores perdida ao formar um RasterStack.
    # O caminho explícito evita depender do diretório padrão do pacote raster,
    # que pode ser anunciado nas opções antes de sua subpasta existir.
    materialized_file <- base::tempfile(
      pattern = "sdm_aligned_",
      tmpdir = temp_dir,
      fileext = ".tif"
    )
    raster::writeRaster(
      aligned,
      filename = materialized_file,
      format = "GTiff",
      datatype = "FLT4S",
      options = c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER"),
      overwrite = TRUE
    )
    materialized <- raster::raster(materialized_file)
    names(materialized) <- layer_name
    if (!raster::hasValues(materialized)) {
      stop("Camada alinhada sem valores após materialização: ", layer_name,
           call. = FALSE)
    }
    materialized
  })
}

# O cache diário usa terra do início ao fim. Manter a leitura, o alinhamento e
# a gravação dentro do mesmo motor evita Raster*/SpatRaster com geometria, mas
# sem uma fonte de valores legível em determinadas combinações de raster,
# terra e GDAL.
read_predictor_spat_catalog <- function(files) {
  assert_namespaces("terra")
  catalog <- list()

  for (file in files) {
    raster_object <- tryCatch(
      terra::rast(file),
      error = function(error) {
        stop(
          "Falha ao abrir o raster com terra ", file, ": ",
          conditionMessage(error),
          call. = FALSE
        )
      }
    )
    if (terra::nlyr(raster_object) == 1L) {
      names(raster_object) <- tools::file_path_sans_ext(basename(file))
    }

    for (index in seq_len(terra::nlyr(raster_object))) {
      layer <- raster_object[[index]]
      if (!terra::hasValues(layer)) {
        stop(
          "Raster sem valores segundo o terra: ", file,
          " (camada ", index, ").",
          call. = FALSE
        )
      }
      catalog[[length(catalog) + 1L]] <- list(
        layer = layer,
        layer_name = names(layer)[1],
        source_file = normalizePath(file, winslash = "/", mustWork = TRUE),
        source_layer = index
      )
    }
  }

  catalog
}

select_predictor_spat_catalog <- function(catalog, predictor_names) {
  layer_names <- vapply(catalog, `[[`, character(1), "layer_name")
  source_stems <- vapply(catalog, function(item) {
    tools::file_path_sans_ext(basename(item$source_file))
  }, character(1))
  normalized_layers <- normalize_predictor_name(layer_names)
  normalized_stems <- normalize_predictor_name(source_stems)
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
      matches <- which(normalized_stems == normalized_predictor)
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

    item <- catalog[[matches]]
    names(item$layer) <- predictor
    item$layer_name <- predictor
    selected[[index]] <- item
  }

  selected
}

choose_reference_spat <- function(catalog, categorical_vars) {
  areas <- vapply(catalog, function(item) {
    if (item$layer_name %in% categorical_vars) {
      return(Inf)
    }
    resolution <- terra::res(item$layer)
    if (any(!is.finite(resolution))) {
      return(Inf)
    }
    prod(abs(resolution))
  }, numeric(1))

  best <- which.min(areas)
  if (length(best) == 0L || !is.finite(areas[best])) {
    stop("Não foi possível escolher um raster contínuo como referência.", call. = FALSE)
  }
  catalog[[best]]$layer
}

same_spat_grid <- function(x, reference) {
  isTRUE(terra::compareGeom(x, reference, stopOnError = FALSE))
}

align_predictor_spat_catalog <- function(catalog,
                                         categorical_vars = "ocup_solo",
                                         ref_raster_path = NULL,
                                         materialize_dir = tempdir()) {
  assert_namespaces("terra")
  dir.create(materialize_dir, recursive = TRUE, showWarnings = FALSE)

  if (!is.null(ref_raster_path)) {
    if (!file.exists(ref_raster_path)) {
      stop("Raster de referência não encontrado: ", ref_raster_path, call. = FALSE)
    }
    reference <- terra::rast(ref_raster_path)[[1]]
  } else {
    reference <- choose_reference_spat(catalog, categorical_vars)
  }

  lapply(catalog, function(item) {
    layer <- item$layer
    layer_name <- item$layer_name
    method <- if (layer_name %in% categorical_vars) "near" else "bilinear"

    if (same_spat_grid(layer, reference)) {
      aligned <- layer
    } else {
      source_resolution <- terra::res(layer)
      reference_resolution <- terra::res(reference)
      if (
        method == "near" &&
        all(is.finite(source_resolution)) &&
        all(is.finite(reference_resolution)) &&
        any(reference_resolution > source_resolution)
      ) {
        factor_x <- max(
          1L,
          as.integer(round(reference_resolution[1] / source_resolution[1]))
        )
        factor_y <- max(
          1L,
          as.integer(round(reference_resolution[2] / source_resolution[2]))
        )
        if (factor_x > 1L || factor_y > 1L) {
          layer <- terra::aggregate(
            layer,
            fact = c(factor_x, factor_y),
            fun = "modal",
            na.rm = TRUE
          )
        }
      }

      same_crs <- tryCatch(
        terra::same.crs(layer, reference),
        error = function(error) FALSE
      )
      aligned <- if (!isTRUE(same_crs)) {
        terra::project(layer, reference, method = method)
      } else {
        terra::resample(layer, reference, method = method)
      }
    }

    materialized_file <- tempfile(
      pattern = paste0("aligned-", normalize_predictor_name(layer_name), "-"),
      tmpdir = materialize_dir,
      fileext = ".tif"
    )
    terra::writeRaster(
      aligned,
      materialized_file,
      overwrite = TRUE,
      wopt = list(
        datatype = "FLT4S",
        gdal = c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER")
      )
    )
    reopened <- terra::rast(materialized_file)
    names(reopened) <- layer_name
    if (!terra::hasValues(reopened)) {
      stop(
        "Camada alinhada sem valores após materialização com terra: ",
        layer_name,
        call. = FALSE
      )
    }

    item$layer <- reopened
    item$materialized_file <- materialized_file
    item
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

has_sdm_feature_frame <- function(model) {
  tryCatch(
    {
      setting <- methods::slot(model, "setting")
      methods::slot(setting, "featureFrame")
      TRUE
    },
    error = function(error) FALSE
  )
}

read_compatible_sdm <- function(model_file) {
  model <- sdm::read.sdm(model_file)
  if (has_sdm_feature_frame(model)) {
    return(model)
  }

  message(
    "Modelo SDM legado detectado; aplicando sdmAdapt() em memória: ",
    basename(model_file)
  )
  model <- tryCatch(
    sdm::sdmAdapt(model),
    error = function(error) {
      stop(
        "Falha ao adaptar o modelo legado ", model_file, ": ",
        conditionMessage(error),
        call. = FALSE
      )
    }
  )
  if (!has_sdm_feature_frame(model)) {
    stop(
      "sdmAdapt() não criou featureFrame para ", model_file, ".",
      call. = FALSE
    )
  }
  model
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

raster_file_signature <- function(paths) {
  paths <- normalizePath(paths, winslash = "/", mustWork = TRUE)
  info <- file.info(paths)
  data.frame(
    path = paths,
    size = as.numeric(info$size),
    mtime = format(info$mtime, "%Y-%m-%dT%H:%M:%OS6%z"),
    stringsAsFactors = FALSE,
    row.names = NULL
  )
}

prediction_mask <- function(x,
                            mask_variable = "depth",
                            mask_raster_path = NULL,
                            mask_rule = c("auto", "negative", "positive", "non_na"),
                            require_complete_cases = TRUE) {
  assert_namespaces("terra")
  mask_rule <- match.arg(mask_rule)
  x <- terra::rast(x)

  valid <- NULL
  if (isTRUE(require_complete_cases)) {
    complete_fun <- function(values) {
      if (is.null(dim(values))) {
        return(as.numeric(is.finite(values)))
      }
      as.numeric(rowSums(is.finite(values)) == ncol(values))
    }
    valid <- terra::app(x, complete_fun)
    valid <- terra::ifel(valid == 1, 1, NA)
  }

  mask_source <- NULL
  if (!is.null(mask_raster_path) && nzchar(mask_raster_path)) {
    if (!file.exists(mask_raster_path)) {
      stop("Raster de máscara não encontrado: ", mask_raster_path, call. = FALSE)
    }
    mask_source <- terra::rast(mask_raster_path)
    if (!terra::compareGeom(mask_source, x[[1]], stopOnError = FALSE)) {
      mask_source <- terra::resample(mask_source, x[[1]], method = "near")
    }
  } else {
    normalized_names <- normalize_predictor_name(names(x))
    mask_index <- which(normalized_names == normalize_predictor_name(mask_variable))
    if (length(mask_index) == 1L) {
      mask_source <- x[[mask_index]]
    }
  }

  if (!is.null(mask_source)) {
    effective_rule <- mask_rule
    if (identical(effective_rule, "auto")) {
      # Não infere a convenção com min/max da grade inteira. Para uma máscara
      # explícita use SDM_MASK_RULE=negative ou positive; no modo automático,
      # qualquer célula não-NA é considerada parte da cobertura.
      effective_rule <- "non_na"
    }

    ocean <- switch(
      effective_rule,
      negative = mask_source < 0,
      positive = mask_source > 0,
      non_na = !is.na(mask_source)
    )
    ocean <- terra::ifel(ocean, 1, NA)
    valid <- if (is.null(valid)) {
      ocean
    } else {
      terra::ifel(!is.na(valid) & !is.na(ocean), 1, NA)
    }
    message("Máscara oceânica aplicada com regra '", effective_rule, "'.")
  }

  valid
}

prepare_aligned_predictors <- function(predictors_path,
                                       cache_dir,
                                       predictor_names,
                                       pattern = "\\.(nc|tif|tiff)$",
                                       ref_raster_path = NULL,
                                       categorical_vars = "ocup_solo",
                                       mask_variable = "depth",
                                       mask_raster_path = NULL,
                                       mask_rule = c("auto", "negative", "positive", "non_na"),
                                       require_complete_cases = TRUE,
                                       rebuild_cache = FALSE) {
  assert_namespaces("raster")
  mask_rule <- match.arg(mask_rule)
  dir.create(cache_dir, recursive = TRUE, showWarnings = FALSE)

  files <- list_predictor_files(predictors_path, pattern)
  layers <- read_daily_predictor_layers(files)
  layers <- select_predictor_layers(layers, predictor_names)
  selected_names <- normalize_predictor_name(vapply(
    layers,
    function(layer) names(layer)[1],
    character(1)
  ))
  file_stems <- normalize_predictor_name(
    tools::file_path_sans_ext(basename(files))
  )
  selected_files <- files[match(selected_names, file_stems)]
  if (anyNA(selected_files)) {
    stop("Não foi possível relacionar os preditores selecionados aos arquivos.",
         call. = FALSE)
  }

  signature_files <- selected_files
  if (!is.null(ref_raster_path) && nzchar(ref_raster_path)) {
    signature_files <- c(signature_files, ref_raster_path)
  }
  if (!is.null(mask_raster_path) && nzchar(mask_raster_path)) {
    signature_files <- c(signature_files, mask_raster_path)
  }

  stack_file <- file.path(cache_dir, "aligned_predictors.tif")
  mask_file <- file.path(cache_dir, "valid_prediction_mask.tif")
  manifest_file <- file.path(cache_dir, "cache_manifest.rds")
  settings <- list(
    cache_format_version = 7L,
    cache_engine = "raster-original-compatible",
    predictor_names = predictor_names,
    ref_raster_path = if (is.null(ref_raster_path) || !nzchar(ref_raster_path)) {
      NULL
    } else {
      normalizePath(ref_raster_path, winslash = "/", mustWork = TRUE)
    },
    categorical_vars = categorical_vars,
    mask_variable = mask_variable,
    mask_raster_path = if (is.null(mask_raster_path) || !nzchar(mask_raster_path)) {
      NULL
    } else {
      normalizePath(mask_raster_path, winslash = "/", mustWork = TRUE)
    },
    mask_rule = mask_rule,
    require_complete_cases = isTRUE(require_complete_cases)
  )
  signature <- raster_file_signature(signature_files)

  cache_valid <- FALSE
  if (!isTRUE(rebuild_cache) && file.exists(stack_file) && file.exists(manifest_file)) {
    manifest <- tryCatch(readRDS(manifest_file), error = function(error) NULL)
    cache_valid <- !is.null(manifest) &&
      identical(manifest$signature, signature) &&
      identical(manifest$settings, settings)
    if (cache_valid) {
      cache_valid <- tryCatch(
        {
          cached <- raster::stack(stack_file)
          raster::hasValues(cached) &&
            raster::nlayers(cached) == length(predictor_names) &&
            file.info(stack_file)$size > 0
        },
        error = function(error) FALSE
      )
    }
  }

  if (cache_valid) {
    message("Cache diário reutilizado: ", stack_file)
    return(invisible(list(
      stack_file = stack_file,
      mask_file = if (file.exists(mask_file)) mask_file else NULL,
      manifest_file = manifest_file,
      reused = TRUE
    )))
  }

  message("Preparando cache diário compartilhado em: ", cache_dir)
  message("Cache 1/4: abrindo os quatro preditores pelo mesmo motor do pipeline original.")
  for (index in seq_along(layers)) {
    if (!raster_has_finite_cell(layers[[index]])) {
      stop(
        "Preditor sem nenhuma célula finita: ", predictor_names[index],
        " (", selected_files[index], ").",
        call. = FALSE
      )
    }
  }

  message("Cache 2/4: alinhando os preditores uma única vez.")
  alignment_tmp_dir <- file.path(cache_dir, ".raster_tmp")
  alignment_tmp_dir <- configure_raster_tmpdir(alignment_tmp_dir)
  on.exit({
    unlink(alignment_tmp_dir, recursive = TRUE, force = TRUE)
    dir.create(alignment_tmp_dir, recursive = TRUE, showWarnings = FALSE)
  }, add = TRUE)
  aligned_layers <- align_predictor_layers(
    layers,
    categorical_vars = categorical_vars,
    ref_raster_path = ref_raster_path,
    temp_dir = alignment_tmp_dir
  )
  names(aligned_layers) <- predictor_names
  aligned_stack <- raster::stack(aligned_layers)
  names(aligned_stack) <- predictor_names

  message("Cache 3/4: gravando o GeoTIFF multibanda compartilhado.")
  staged_stack <- tempfile(
    pattern = "aligned-stack-",
    tmpdir = cache_dir,
    fileext = ".tif"
  )
  on.exit(unlink(staged_stack, force = TRUE), add = TRUE)
  raster::writeRaster(
    aligned_stack,
    filename = staged_stack,
    format = "GTiff",
    datatype = "FLT4S",
    options = c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER"),
    bylayer = FALSE,
    overwrite = TRUE
  )

  message("Cache 4/4: reabrindo e verificando cada banda em blocos.")
  cached_stack <- raster::stack(staged_stack)
  names(cached_stack) <- predictor_names
  if (raster::nlayers(cached_stack) != length(predictor_names)) {
    stop("Cache alinhado foi gravado com número incorreto de bandas.", call. = FALSE)
  }
  cache_has_values <- vapply(
    seq_len(raster::nlayers(cached_stack)),
    function(index) raster_has_finite_cell(cached_stack[[index]]),
    logical(1)
  )
  if (any(!cache_has_values)) {
    stop(
      "Bandas do cache sem células finitas: ",
      paste(predictor_names[!cache_has_values], collapse = ", "),
      call. = FALSE
    )
  }

  if (!isTRUE(file.copy(staged_stack, stack_file, overwrite = TRUE))) {
    stop("Falha ao publicar o cache alinhado: ", stack_file, call. = FALSE)
  }
  if (file.exists(mask_file)) unlink(mask_file, force = TRUE)

  saveRDS(
    list(
      signature = signature,
      settings = settings,
      created_at = format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z")
    ),
    manifest_file
  )
  message("Cache diário criado: ", stack_file)

  invisible(list(
    stack_file = stack_file,
    mask_file = NULL,
    manifest_file = manifest_file,
    reused = FALSE
  ))
}

ensemble_statistics_block <- function(values,
                                      center = c("mean", "median"),
                                      include_sd = TRUE) {
  center <- match.arg(center)
  if (is.null(dim(values))) {
    valid <- values[is.finite(values)]
    if (length(valid) == 0L) {
      return(if (include_sd) c(NA_real_, NA_real_) else NA_real_)
    }
    central <- if (center == "mean") mean(valid) else stats::median(valid)
    if (!include_sd) return(central)
    spread <- if (length(valid) == 1L) 0 else stats::sd(valid)
    return(c(central, spread))
  }

  finite <- is.finite(values)
  n_valid <- rowSums(finite)
  values[!finite] <- NA_real_
  central <- if (center == "mean") {
    rowMeans(values, na.rm = TRUE)
  } else {
    apply(values, 1L, stats::median, na.rm = TRUE)
  }
  central[n_valid == 0L] <- NA_real_
  if (!include_sd) return(central)

  centered <- sweep(values, 1L, central, FUN = "-")
  spread <- sqrt(rowSums(centered ^ 2, na.rm = TRUE) / (n_valid - 1L))
  spread[n_valid == 1L] <- 0
  spread[n_valid == 0L] <- NA_real_
  cbind(central, spread)
}

write_ensemble_statistics <- function(predictions,
                                      output_file,
                                      uncertainty_file = NULL,
                                      ensemble_fun = c("mean", "median"),
                                      stats_tmp_dir = tempdir()) {
  assert_namespaces("terra")
  ensemble_fun <- match.arg(ensemble_fun)
  dir.create(dirname(output_file), recursive = TRUE, showWarnings = FALSE)
  if (!is.null(uncertainty_file)) {
    dir.create(dirname(uncertainty_file), recursive = TRUE, showWarnings = FALSE)
  }
  dir.create(stats_tmp_dir, recursive = TRUE, showWarnings = FALSE)

  x <- terra::rast(predictions)
  write_options <- list(
    datatype = "FLT4S",
    gdal = c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER")
  )

  if (terra::nlyr(x) == 1L) {
    names(x) <- paste0("ensemble_", ensemble_fun)
    terra::writeRaster(x, output_file, overwrite = TRUE, wopt = write_options)
    if (!is.null(uncertainty_file)) {
      uncertainty <- terra::ifel(is.na(x), NA, 0)
      names(uncertainty) <- "sd_bootstrap"
      terra::writeRaster(
        uncertainty,
        uncertainty_file,
        overwrite = TRUE,
        wopt = write_options
      )
    }
    return(invisible(terra::rast(output_file)))
  }

  stats_file <- tempfile("ensemble_stats_", tmpdir = stats_tmp_dir, fileext = ".tif")
  on.exit(unlink(stats_file, force = TRUE), add = TRUE)
  statistics <- terra::app(
    x,
    fun = ensemble_statistics_block,
    center = ensemble_fun,
    include_sd = !is.null(uncertainty_file),
    filename = stats_file,
    overwrite = TRUE,
    wopt = write_options
  )
  names(statistics)[1] <- paste0("ensemble_", ensemble_fun)
  terra::writeRaster(
    statistics[[1]],
    output_file,
    overwrite = TRUE,
    wopt = write_options
  )
  if (!is.null(uncertainty_file)) {
    names(statistics)[2] <- "sd_bootstrap"
    terra::writeRaster(
      statistics[[2]],
      uncertainty_file,
      overwrite = TRUE,
      wopt = write_options
    )
  }
  invisible(terra::rast(output_file))
}

extract_sdm_prediction_matrix <- function(prediction, expected_rows) {
  prediction_frame <- tryCatch(
    as.data.frame(prediction),
    error = function(error) {
      stop(
        "A predição tabular do sdm não pôde ser convertida em data.frame: ",
        conditionMessage(error),
        call. = FALSE
      )
    }
  )
  numeric_columns <- vapply(prediction_frame, is.numeric, logical(1))
  if (!any(numeric_columns)) {
    stop("A predição tabular do sdm não retornou colunas numéricas.",
         call. = FALSE)
  }

  values <- as.matrix(
    prediction_frame[, numeric_columns, drop = FALSE]
  )
  storage.mode(values) <- "double"
  if (nrow(values) != expected_rows) {
    stop(
      "A predição tabular retornou ", nrow(values),
      " linha(s), mas eram esperadas ", expected_rows, ".",
      call. = FALSE
    )
  }
  if (ncol(values) < 1L) {
    stop("A predição tabular não retornou réplicas do modelo.", call. = FALSE)
  }
  values
}

raster_content_summary <- function(path) {
  assert_namespaces("raster")
  if (!file.exists(path) || file.info(path)$size <= 0) {
    stop("Raster de saída ausente ou vazio: ", path, call. = FALSE)
  }

  layer <- raster::raster(path)
  blocks <- raster::blockSize(layer, minblocks = 8L)
  finite_count <- 0
  minimum <- Inf
  maximum <- -Inf
  total <- 0
  positive_count <- 0

  for (index in seq_len(blocks$n)) {
    values <- raster::getValuesBlock(
      layer,
      row = blocks$row[index],
      nrows = blocks$nrows[index]
    )
    values <- values[is.finite(values)]
    if (length(values) == 0L) next
    finite_count <- finite_count + length(values)
    minimum <- min(minimum, min(values))
    maximum <- max(maximum, max(values))
    total <- total + sum(values)
    positive_count <- positive_count + sum(values > 0)
  }

  if (finite_count == 0L) {
    minimum <- NA_real_
    maximum <- NA_real_
    average <- NA_real_
  } else {
    average <- total / finite_count
  }

  list(
    path = path,
    raster = layer,
    cells = raster::ncell(layer),
    finite = finite_count,
    finite_percent = 100 * finite_count / raster::ncell(layer),
    minimum = minimum,
    maximum = maximum,
    average = average,
    positive = positive_count
  )
}

validate_prediction_outputs <- function(mean_file,
                                        uncertainty_file,
                                        reference) {
  mean_summary <- raster_content_summary(mean_file)
  if (!isTRUE(raster::compareRaster(
    mean_summary$raster,
    reference,
    extent = TRUE,
    rowcol = TRUE,
    crs = TRUE,
    res = TRUE,
    orig = TRUE,
    rotation = TRUE,
    stopiffalse = FALSE
  ))) {
    stop("A geometria da média difere da grade dos preditores.", call. = FALSE)
  }
  if (mean_summary$finite == 0L) {
    stop("Predição inválida: o raster mean contém somente NA.", call. = FALSE)
  }
  if (!is.finite(mean_summary$minimum) ||
      !is.finite(mean_summary$maximum) ||
      mean_summary$maximum <= mean_summary$minimum) {
    stop("Predição inválida: o raster mean não apresenta variação.",
         call. = FALSE)
  }
  if (mean_summary$minimum < -1e-6 || mean_summary$maximum > 1 + 1e-6) {
    stop("Predição inválida: o raster mean está fora do intervalo [0, 1].",
         call. = FALSE)
  }

  sd_summary <- NULL
  if (!is.null(uncertainty_file)) {
    sd_summary <- raster_content_summary(uncertainty_file)
    if (!isTRUE(raster::compareRaster(
      sd_summary$raster,
      reference,
      extent = TRUE,
      rowcol = TRUE,
      crs = TRUE,
      res = TRUE,
      orig = TRUE,
      rotation = TRUE,
      stopiffalse = FALSE
    ))) {
      stop("A geometria do desvio-padrão difere da grade dos preditores.",
           call. = FALSE)
    }
    if (sd_summary$finite == 0L) {
      stop("Predição inválida: o raster sd contém somente NA.", call. = FALSE)
    }
    if (sd_summary$positive == 0L) {
      stop("Predição inválida: o raster sd é inteiramente zero.",
           call. = FALSE)
    }
    if (!is.finite(sd_summary$minimum) || sd_summary$minimum < -1e-7) {
      stop("Predição inválida: o raster sd contém valor negativo.",
           call. = FALSE)
    }
  }

  invisible(list(mean = mean_summary, sd = sd_summary))
}

publish_staged_raster <- function(staged_file, output_file) {
  dir.create(dirname(output_file), recursive = TRUE, showWarnings = FALSE)
  copied <- file.copy(staged_file, output_file, overwrite = TRUE)
  if (!isTRUE(copied) || !file.exists(output_file) ||
      file.info(output_file)$size != file.info(staged_file)$size) {
    stop("Falha ao publicar o raster validado: ", output_file, call. = FALSE)
  }
  invisible(output_file)
}

predict_sdm_tabular_blocks <- function(model,
                                       predictor_stack,
                                       output_file,
                                       uncertainty_file = NULL,
                                       ensemble_fun = c("mean", "median"),
                                       save_multiband = FALSE,
                                       multiband_file = NULL,
                                       block_rows = Sys.getenv(
                                         "SDM_PREDICTION_BLOCK_ROWS",
                                         unset = "128"
                                       )) {
  assert_namespaces("raster")
  ensemble_fun <- match.arg(ensemble_fun)
  block_rows <- suppressWarnings(as.integer(block_rows))
  if (!is.finite(block_rows) || block_rows < 1L) {
    stop("SDM_PREDICTION_BLOCK_ROWS deve ser um inteiro positivo.",
         call. = FALSE)
  }

  predictor_count <- raster::nlayers(predictor_stack)
  if (predictor_count < 1L || any(!nzchar(names(predictor_stack)))) {
    stop("A grade de preditores precisa ter bandas nomeadas.", call. = FALSE)
  }

  dir.create(dirname(output_file), recursive = TRUE, showWarnings = FALSE)
  if (!is.null(uncertainty_file)) {
    dir.create(dirname(uncertainty_file), recursive = TRUE, showWarnings = FALSE)
  }
  if (isTRUE(save_multiband)) {
    if (is.null(multiband_file) || !nzchar(multiband_file)) {
      stop("multiband_file é obrigatório quando save_multiband=TRUE.",
           call. = FALSE)
    }
    dir.create(dirname(multiband_file), recursive = TRUE, showWarnings = FALSE)
  }

  template <- raster::raster(predictor_stack[[1]])
  mean_template <- template
  names(mean_template) <- paste0("ensemble_", ensemble_fun)
  sd_template <- template
  names(sd_template) <- "sd_bootstrap"
  row_starts <- seq.int(1L, raster::nrow(template), by = block_rows)
  row_counts <- pmin(
    block_rows,
    raster::nrow(template) - row_starts + 1L
  )
  block_count <- length(row_starts)
  write_options <- c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER")

  mean_stage <- tempfile(
    "sdm-mean-stage-",
    tmpdir = dirname(output_file),
    fileext = ".tif"
  )
  sd_stage <- if (is.null(uncertainty_file)) NULL else tempfile(
    "sdm-sd-stage-",
    tmpdir = dirname(uncertainty_file),
    fileext = ".tif"
  )
  multiband_stage <- if (!isTRUE(save_multiband)) NULL else tempfile(
    "sdm-bootstrap-stage-",
    tmpdir = dirname(multiband_file),
    fileext = ".tif"
  )
  on.exit(unlink(
    c(mean_stage, sd_stage, multiband_stage),
    force = TRUE
  ), add = TRUE)

  mean_writer <- NULL
  mean_writer_open <- FALSE
  sd_writer <- NULL
  sd_writer_open <- FALSE
  multiband_writer <- NULL
  multiband_writer_open <- FALSE
  on.exit({
    if (isTRUE(mean_writer_open)) {
      try(raster::writeStop(mean_writer), silent = TRUE)
    }
    if (isTRUE(sd_writer_open)) {
      try(raster::writeStop(sd_writer), silent = TRUE)
    }
    if (isTRUE(multiband_writer_open)) {
      try(raster::writeStop(multiband_writer), silent = TRUE)
    }
  }, add = TRUE)

  mean_writer <- raster::writeStart(
    mean_template,
    filename = mean_stage,
    format = "GTiff",
    datatype = "FLT4S",
    options = write_options,
    overwrite = TRUE
  )
  mean_writer_open <- TRUE
  if (!is.null(sd_stage)) {
    sd_writer <- raster::writeStart(
      sd_template,
      filename = sd_stage,
      format = "GTiff",
      datatype = "FLT4S",
      options = write_options,
      overwrite = TRUE
    )
    sd_writer_open <- TRUE
  }

  predict_method <- methods::selectMethod("predict", "sdmModels")
  valid_predictor_cells <- 0
  finite_mean_cells <- 0
  finite_sd_cells <- 0
  prediction_columns <- NULL
  progress_every <- max(1L, as.integer(ceiling(block_count / 10)))

  for (block_index in seq_len(block_count)) {
    values <- raster::getValuesBlock(
      predictor_stack,
      row = row_starts[block_index],
      nrows = row_counts[block_index]
    )
    if (is.null(dim(values))) {
      values <- matrix(values, ncol = predictor_count)
    }
    if (ncol(values) != predictor_count) {
      stop("Bloco de preditores com número incorreto de colunas.", call. = FALSE)
    }

    complete <- rowSums(is.finite(values)) == predictor_count
    valid_predictor_cells <- valid_predictor_cells + sum(complete)
    mean_values <- rep(NA_real_, nrow(values))
    sd_values <- if (is.null(sd_stage)) NULL else rep(NA_real_, nrow(values))
    multiband_values <- NULL

    if (any(complete)) {
      newdata <- as.data.frame(values[complete, , drop = FALSE])
      names(newdata) <- names(predictor_stack)
      prediction <- predict_method(
        model,
        newdata = newdata,
        mean = FALSE
      )
      prediction_values <- extract_sdm_prediction_matrix(
        prediction,
        expected_rows = nrow(newdata)
      )

      if (is.null(prediction_columns)) {
        prediction_columns <- colnames(prediction_values)
        if (is.null(prediction_columns)) {
          prediction_columns <- paste0(
            "bootstrap_", seq_len(ncol(prediction_values))
          )
        }
        if (isTRUE(save_multiband)) {
          multiband_template <- raster::brick(
            nrows = raster::nrow(template),
            ncols = raster::ncol(template),
            nl = ncol(prediction_values),
            xmn = raster::xmin(template),
            xmx = raster::xmax(template),
            ymn = raster::ymin(template),
            ymx = raster::ymax(template),
            crs = raster::crs(template)
          )
          names(multiband_template) <- make.names(
            prediction_columns,
            unique = TRUE
          )
          multiband_writer <- raster::writeStart(
            multiband_template,
            filename = multiband_stage,
            format = "GTiff",
            datatype = "FLT4S",
            options = write_options,
            overwrite = TRUE
          )
          multiband_writer_open <- TRUE
          if (block_index > 1L) {
            for (previous_index in seq_len(block_index - 1L)) {
              previous_cells <- row_counts[previous_index] * raster::ncol(template)
              multiband_writer <- raster::writeValues(
                multiband_writer,
                matrix(
                  NA_real_,
                  nrow = previous_cells,
                  ncol = ncol(prediction_values)
                ),
                row_starts[previous_index]
              )
            }
          }
        }
      } else if (ncol(prediction_values) != length(prediction_columns)) {
        stop("O número de réplicas do sdm mudou entre blocos.", call. = FALSE)
      }

      statistics <- ensemble_statistics_block(
        prediction_values,
        center = ensemble_fun,
        include_sd = !is.null(sd_stage)
      )
      if (is.null(sd_stage)) {
        mean_values[complete] <- statistics
      } else {
        mean_values[complete] <- statistics[, 1]
        sd_values[complete] <- statistics[, 2]
      }

      if (isTRUE(save_multiband)) {
        multiband_values <- matrix(
          NA_real_,
          nrow = nrow(values),
          ncol = length(prediction_columns)
        )
        multiband_values[complete, ] <- prediction_values
      }
    } else if (isTRUE(save_multiband) && !is.null(multiband_writer)) {
      multiband_values <- matrix(
        NA_real_,
        nrow = nrow(values),
        ncol = length(prediction_columns)
      )
    }

    finite_mean_cells <- finite_mean_cells + sum(is.finite(mean_values))
    if (!is.null(sd_values)) {
      finite_sd_cells <- finite_sd_cells + sum(is.finite(sd_values))
    }
    mean_writer <- raster::writeValues(
      mean_writer,
      mean_values,
      row_starts[block_index]
    )
    if (!is.null(sd_writer)) {
      sd_writer <- raster::writeValues(
        sd_writer,
        sd_values,
        row_starts[block_index]
      )
    }
    if (!is.null(multiband_writer)) {
      multiband_writer <- raster::writeValues(
        multiband_writer,
        multiband_values,
        row_starts[block_index]
      )
    }

    if (block_index %% progress_every == 0L || block_index == block_count) {
      message(
        "Predição tabular em blocos: ", block_index, "/", block_count,
        "; células completas acumuladas: ", valid_predictor_cells,
        "; médias finitas: ", finite_mean_cells, "."
      )
    }
  }

  mean_writer <- raster::writeStop(mean_writer)
  mean_writer_open <- FALSE
  if (!is.null(sd_writer)) {
    sd_writer <- raster::writeStop(sd_writer)
    sd_writer_open <- FALSE
  }
  if (!is.null(multiband_writer)) {
    multiband_writer <- raster::writeStop(multiband_writer)
    multiband_writer_open <- FALSE
  }

  if (valid_predictor_cells == 0L) {
    stop("Nenhuma célula possui todos os preditores finitos.", call. = FALSE)
  }
  if (finite_mean_cells == 0L) {
    stop("O sdm não produziu nenhuma previsão finita nos blocos tabulares.",
         call. = FALSE)
  }
  minimum_coverage <- 0.99
  if (finite_mean_cells / valid_predictor_cells < minimum_coverage) {
    stop(
      "Predição inválida: somente ", finite_mean_cells, " de ",
      valid_predictor_cells, " células completas receberam mean finito.",
      call. = FALSE
    )
  }
  if (!is.null(sd_stage) && finite_sd_cells == 0L) {
    stop("O sdm não produziu nenhum desvio-padrão finito.", call. = FALSE)
  }
  if (!is.null(sd_stage) &&
      finite_sd_cells / valid_predictor_cells < minimum_coverage) {
    stop(
      "Predição inválida: somente ", finite_sd_cells, " de ",
      valid_predictor_cells, " células completas receberam sd finito.",
      call. = FALSE
    )
  }

  validation <- validate_prediction_outputs(
    mean_file = mean_stage,
    uncertainty_file = sd_stage,
    reference = template
  )
  if (validation$mean$finite != finite_mean_cells ||
      (!is.null(validation$sd) && validation$sd$finite != finite_sd_cells)) {
    stop("A verificação em disco divergiu da contagem feita durante a escrita.",
         call. = FALSE)
  }
  publish_staged_raster(mean_stage, output_file)
  if (!is.null(sd_stage)) {
    publish_staged_raster(sd_stage, uncertainty_file)
  }
  if (isTRUE(save_multiband)) {
    if (is.null(multiband_writer)) {
      stop("Nenhuma réplica foi produzida para o raster multibanda.",
           call. = FALSE)
    }
    publish_staged_raster(multiband_stage, multiband_file)
  }

  message(
    "Saídas validadas: mean com ", validation$mean$finite,
    " células finitas (", round(validation$mean$finite_percent, 4),
    "%, intervalo ", signif(validation$mean$minimum, 6), " a ",
    signif(validation$mean$maximum, 6), ")",
    if (is.null(validation$sd)) "." else paste0(
      "; sd com ", validation$sd$finite, " células finitas (",
      round(validation$sd$finite_percent, 4),
      "%, máximo ", signif(validation$sd$maximum, 6), ")."
    )
  )

  invisible(raster::raster(output_file))
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
                        uncertainty_file = NULL,
                        cache_dir = NULL,
                        aligned_predictors_path = NULL,
                        rebuild_cache = FALSE,
                        mask_variable = "depth",
                        mask_raster_path = NULL,
                        mask_rule = c("auto", "negative", "positive", "non_na"),
                        require_complete_cases = TRUE,
                        stats_tmp_dir = Sys.getenv("SDM_TMPDIR", unset = tempdir())) {
  assert_namespaces(c(required_sdm_packages, "terra"))
  attach_sdm_package()
  ensemble_fun <- match.arg(ensemble_fun)
  mask_rule <- match.arg(mask_rule)

  inferred <- infer_predictors_from_csv(
    csv_path,
    response_col = response_col,
    ignore_cols = ignore_cols
  )
  model_file <- resolve_model_file(model_path, model_name)
  model <- read_compatible_sdm(model_file)

  if (!is.null(aligned_predictors_path)) {
    if (!file.exists(aligned_predictors_path)) {
      stop(
        "Cache alinhado não encontrado: ",
        aligned_predictors_path,
        call. = FALSE
      )
    }
    cached_stack <- raster::stack(aligned_predictors_path)
    manifest_file <- file.path(
      dirname(aligned_predictors_path),
      "cache_manifest.rds"
    )
    if (file.exists(manifest_file)) {
      manifest <- tryCatch(readRDS(manifest_file), error = function(error) NULL)
      cached_names <- manifest$settings$predictor_names
      if (!is.null(cached_names) && length(cached_names) == raster::nlayers(cached_stack)) {
        names(cached_stack) <- cached_names
      }
    }
    layers <- lapply(seq_len(raster::nlayers(cached_stack)), function(index) {
      cached_stack[[index]]
    })
    layers <- select_predictor_layers(layers, inferred$predictor_names)
  } else if (isTRUE(resample) || !is.null(cache_dir)) {
    effective_cache <- if (is.null(cache_dir)) {
      tempfile("sdm-aligned-cache-")
    } else {
      cache_dir
    }
    prepared <- prepare_aligned_predictors(
      predictors_path = predictors_path,
      cache_dir = effective_cache,
      predictor_names = inferred$predictor_names,
      pattern = pattern,
      ref_raster_path = ref_raster_path,
      categorical_vars = categorical_vars,
      mask_variable = mask_variable,
      mask_raster_path = mask_raster_path,
      mask_rule = mask_rule,
      require_complete_cases = require_complete_cases,
      rebuild_cache = rebuild_cache
    )
    cached_stack <- raster::stack(prepared$stack_file)
    names(cached_stack) <- inferred$predictor_names
    layers <- lapply(seq_len(raster::nlayers(cached_stack)), function(index) {
      cached_stack[[index]]
    })
  } else {
    files <- list_predictor_files(predictors_path, pattern)
    layers <- read_predictor_layers(files)
    layers <- select_predictor_layers(layers, inferred$predictor_names)
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
  if (!isTRUE(ensemble)) {
    stop(
      "A predição raster segura da v9 exige ensemble=TRUE. Use ",
      "save_multiband=TRUE para também preservar as réplicas.",
      call. = FALSE
    )
  }

  # O método raster do sdm 1.2-59 retornou somente NA nesta combinação de
  # raster/GDAL, embora a mesma grade, convertida em data.frame, produzisse as
  # sete réplicas corretamente. A v9 usa deliberadamente a interface tabular
  # por blocos e escreve mean/sd progressivamente, sem carregar a grade inteira.
  predict_sdm_tabular_blocks(
    model = model,
    predictor_stack = predictor_stack,
    output_file = output_file,
    uncertainty_file = uncertainty_file,
    ensemble_fun = ensemble_fun,
    save_multiband = save_multiband,
    multiband_file = multiband_file
  )
}

detect_total_memory_gb <- function() {
  meminfo <- "/proc/meminfo"
  if (!file.exists(meminfo)) return(NA_real_)
  total_line <- grep("^MemTotal:", readLines(meminfo, warn = FALSE), value = TRUE)
  if (length(total_line) != 1L) return(NA_real_)
  total_kb <- suppressWarnings(as.numeric(gsub("[^0-9]", "", total_line)))
  if (!is.finite(total_kb)) return(NA_real_)
  total_kb / 1024 ^ 2
}

recommended_sdm_workers <- function(requested = "auto",
                                    cores = parallel::detectCores(logical = TRUE),
                                    memory_gb = detect_total_memory_gb(),
                                    memory_per_worker_gb = 3,
                                    reserve_memory_gb = 1,
                                    max_workers = 4L) {
  if (!identical(tolower(as.character(requested)), "auto")) {
    workers <- suppressWarnings(as.integer(requested))
    if (!is.finite(workers) || workers < 1L) {
      stop("SDM_WORKERS deve ser 'auto' ou um inteiro positivo.", call. = FALSE)
    }
    return(workers)
  }

  if (!is.finite(cores) || cores < 1L) cores <- 1L
  core_limit <- max(1L, as.integer(cores) - 1L)
  memory_limit <- 1L
  if (is.finite(memory_gb)) {
    memory_limit <- max(
      1L,
      floor((memory_gb - reserve_memory_gb) / memory_per_worker_gb)
    )
  }
  max(1L, min(core_limit, memory_limit, as.integer(max_workers)))
}

configure_sdm_runtime <- function(temp_root,
                                  terra_memfrac = 0.60,
                                  threads_per_worker = 1L) {
  worker_tmp <- file.path(temp_root, paste0("worker-", Sys.getpid()))
  worker_tmp <- configure_raster_tmpdir(worker_tmp)
  terra::terraOptions(tempdir = worker_tmp, memfrac = terra_memfrac)
  Sys.setenv(
    TMPDIR = worker_tmp,
    OMP_NUM_THREADS = as.character(threads_per_worker),
    OPENBLAS_NUM_THREADS = as.character(threads_per_worker),
    MKL_NUM_THREADS = as.character(threads_per_worker),
    GDAL_NUM_THREADS = as.character(threads_per_worker)
  )
  worker_tmp
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
    model <- read_compatible_sdm(model_file)
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
