# Pacotes
library(raster)
library(rgbif)   # <- usar occ_data
library(dplyr)
library(tidyr)
library(sp)
library(sf)
library(usdm)
library(maps)
library(terra)
library(sdm)

# --------- util: detectar preditores a partir do CSV ---------
infer_predictors_from_csv <- function(csv_path,
                                      response_col = "sp",
                                      ignore_cols = c("decimalLongitude","decimalLatitude","species",
                                                      "year","day","month","lon","lat","x","y","id")) {
  df <- read.csv(csv_path, header = TRUE)
  # Remover colunas ignoradas (se existirem)
  ignore_cols <- intersect(ignore_cols, names(df))
  base_cols <- unique(c(ignore_cols, response_col))
  # Ficar só com colunas numéricas (boas p/ modelagem) que não estão na base_cols
  num_cols <- names(df)[sapply(df, is.numeric)]
  preds <- setdiff(num_cols, base_cols)
  if (length(preds) == 0) {
    stop("Nenhuma coluna preditora numérica encontrada no CSV após remover ignore_cols e a resposta.")
  }
  list(predictor_names = preds, response_col = response_col, ignore_cols = ignore_cols)
}

read_predictor_csv <- function(csv_path,
                               response_col = "sp",
                               sp_keep = NULL) {
  df <- read.csv(csv_path, header = TRUE)
  
  if (!is.null(sp_keep)) {
    if (!response_col %in% names(df)) {
      stop("Coluna de resposta não encontrada no CSV: ", response_col)
    }
    df <- df[df[[response_col]] %in% sp_keep, , drop = FALSE]
  }
  
  df
}


# --------- 1) GBIF: igual, só habilitando rgbif ---------
process_gbif_data <- function(species_name, lon_range = c(-85,-32), lat_range = c(-58, 15), 
                              year_range = c(2000, 2024), output_dir = getwd(), limit = 100000) {
  gbif_data <- occ_data(scientificName = species_name, hasCoordinate = TRUE,
                        decimalLongitude = paste(lon_range, collapse=","),
                        decimalLatitude  = paste(lat_range, collapse=","), limit = limit)
  species_coords <- gbif_data$data[, c("decimalLongitude","decimalLatitude","year","day","month")]
  setwd(output_dir)
  species_filtered <- species_coords %>% 
    filter(year >= year_range[1] & year <= year_range[2]) %>% 
    drop_na(decimalLongitude, decimalLatitude, year, day, month)
  unique_species <- species_filtered[!duplicated(species_filtered[, c("decimalLongitude","decimalLatitude","year","day","month")]), ]
  output_file <- paste0(gsub(" ", "_", species_name), "_GBIF_Data.csv")
  write.csv(unique_species, output_file, row.names = FALSE)
  coordinates(unique_species) <- ~ decimalLongitude + decimalLatitude
  return(unique_species)
}

# -------------------------------
# Checagens de métodos/dependências
# -------------------------------

sdm_available_methods <- function() {
  x <- sdm::getmethodNames("sdm")
  
  # getmethodNames geralmente retorna data.frame
  if (is.data.frame(x)) {
    avail <- c(rownames(x))
    if ("Methods" %in% names(x)) avail <- c(avail, as.character(x$Methods))
    avail <- unique(tolower(avail))
    return(avail)
  }
  
  # fallback se vier outra estrutura
  unique(tolower(as.character(x)))
}

check_sdm_methods <- function(methods) {
  avail <- sdm_available_methods()
  want  <- unique(tolower(methods))
  missing <- setdiff(want, avail)
  
  if (length(missing) > 0) {
    stop(
      "Métodos não disponíveis no seu 'sdm' agora: ",
      paste(missing, collapse = ", "),
      "\nDisponíveis agora: ", paste(avail, collapse = ", ")
    )
  }
  invisible(TRUE)
}

check_sdm_dependencies <- function(methods) {
  # Mapa mínimo de dependências (sdm "habilita" métodos conforme pacotes instalados)
  deps_map <- list(
    rf     = c("randomForest"),
    gam    = c("mgcv"),
    glm    = character(0),
    brt    = c("gbm"),
    gbm    = c("gbm"),
    
    # MaxEnt Java (dismo + rJava + maxent.jar)
    maxent = c("dismo", "rJava"),
    
    # MaxNet (sem Java)
    maxnet = c("maxnet"),
    maxNet = c("maxnet")
  )
  
  methods <- unique(methods)
  need <- unique(unlist(deps_map[methods], use.names = FALSE))
  need <- need[need != ""]
  missing_pkgs <- need[!vapply(need, requireNamespace, logical(1), quietly = TRUE)]
  
  if (length(missing_pkgs) > 0) {
    stop(
      "Pacotes faltando para esses métodos: ",
      paste(missing_pkgs, collapse = ", "),
      "\nInstale com install.packages(c(...)) ou use sdm::installAll()."
    )
  }
  
  # Checagem extra do maxent.jar (o 'sdm' chama o jar via 'dismo')
  if ("maxent" %in% tolower(methods)) {
    jar_path <- file.path(system.file("java", package = "dismo"), "maxent.jar")
    if (!file.exists(jar_path) && !file.exists("maxent.jar")) {
      warning(
        "MaxEnt: não achei maxent.jar.\n",
        "O local típico é: ", jar_path, "\n",
        "Você precisa colocar o 'maxent.jar' em system.file('java', package='dismo') ",
        "ou no diretório de trabalho. Além disso, 'rJava' precisa funcionar (Java instalado)."
      )
    }
  }
  
  invisible(TRUE)
}


# --------- 2) Treino: usa variáveis do CSV automaticamente ---------
generate_model <- function(data_path,
                           output_path,
                           model_name,
                           response_col = "sp",
                           ignore_cols = c("decimalLongitude","decimalLatitude","species","year","day","month"),
                           methods = c("rf"),
                           csv_filename = "predictor.csv",
                           n_reps = 10,
                           model_settings = NULL) {
  
  setwd(data_path)
  df <- read.csv(csv_filename, sep = ",", header = TRUE)
  
  if ("ocup_solo" %in% names(df)) {
    df$ocup_solo <- as.factor(df$ocup_solo)
  }
  
  inferred <- infer_predictors_from_csv(file.path(data_path, csv_filename),
                                        response_col = response_col,
                                        ignore_cols  = ignore_cols)
  
  predictor_names <- inferred$predictor_names
  response_col    <- inferred$response_col
  
  if (!any(response_col %in% names(df)))
    stop(paste("Coluna de resposta não encontrada:", paste(response_col, collapse=", ")))
  
  check_sdm_dependencies(methods)
  check_sdm_methods(methods)
  
  keep_cols <- c(response_col, predictor_names)
  df <- df[, keep_cols, drop = FALSE]
  
  form <- as.formula(paste(response_col, "~ ."))
  sdmDataObj <- sdmData(form, train = df)
  
  modelo <- sdm(
    form, sdmDataObj,
    methods       = methods,
    replication   = "boot",
    n             = n_reps,
    modelSettings = model_settings
  )
  
  setwd(output_path)
  write.sdm(modelo, model_name, overwrite = TRUE)
  return(modelo)
}



# ---------------------------------------------------------------------
# 3) Predição otimizada: cache diário, máscara e ensemble em uma passagem
# ---------------------------------------------------------------------

`%||%` <- function(x, y) {
  if (is.null(x) || length(x) == 0L || (length(x) == 1L && is.na(x))) y else x
}

normalize_raster_pattern <- function(pattern) {
  # Compatibilidade com exemplos antigos como "*tif$" e "*nc$".
  if (startsWith(pattern, "*.")) {
    pattern <- paste0("\\.", substring(pattern, 3L))
  } else if (startsWith(pattern, "*")) {
    pattern <- paste0("\\.", substring(pattern, 2L))
  }
  pattern
}

match_predictor_indices <- function(available_names, predictor_names) {
  available_lower <- tolower(available_names)
  out <- integer(length(predictor_names))

  for (i in seq_along(predictor_names)) {
    target <- tolower(predictor_names[[i]])
    hit <- which(available_lower == target)

    if (length(hit) == 0L) {
      prefixes <- c(paste0(target, "_"), paste0(target, "-"), paste0(target, "."))
      hit <- which(vapply(
        available_lower,
        function(x) any(startsWith(x, prefixes)),
        logical(1)
      ))
    }

    if (length(hit) == 0L) {
      hit <- grep(target, available_lower, fixed = TRUE)
    }

    if (length(hit) == 0L) {
      stop(
        "Não encontrei camada para '", predictor_names[[i]],
        "'. Disponíveis: ", paste(available_names, collapse = ", ")
      )
    }

    out[[i]] <- hit[[1]]
  }

  out
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

same_raster_geometry <- function(x, reference) {
  isTRUE(raster::compareRaster(
    x, reference,
    extent = TRUE,
    rowcol = TRUE,
    crs = TRUE,
    res = TRUE,
    orig = TRUE,
    rotation = TRUE,
    stopiffalse = FALSE
  ))
}

align_predictor_raster <- function(x,
                                   reference,
                                   variable_name,
                                   categorical_vars = c("ocup_solo")) {
  if (same_raster_geometry(x, reference)) {
    return(x)
  }

  if (variable_name %in% categorical_vars) {
    source_res <- raster::res(x)
    target_res <- raster::res(reference)

    if (all(is.finite(source_res)) && all(is.finite(target_res)) &&
        (target_res[[1]] > source_res[[1]] || target_res[[2]] > source_res[[2]])) {
      fact_x <- max(1L, as.integer(round(target_res[[1]] / source_res[[1]])))
      fact_y <- max(1L, as.integer(round(target_res[[2]] / source_res[[2]])))

      if (fact_x > 1L || fact_y > 1L) {
        message(sprintf(
          "Categórico '%s': aggregate(modal) fact=(%d,%d) antes de ngb.",
          variable_name, fact_x, fact_y
        ))
        x <- raster::aggregate(
          x,
          fact = c(fact_x, fact_y),
          fun = raster::modal,
          na.rm = TRUE,
          expand = TRUE,
          filename = raster::rasterTmpFile(),
          overwrite = TRUE
        )
      }
    }

    return(raster::resample(
      x,
      reference,
      method = "ngb",
      filename = raster::rasterTmpFile(),
      overwrite = TRUE
    ))
  }

  raster::resample(
    x,
    reference,
    method = "bilinear",
    filename = raster::rasterTmpFile(),
    overwrite = TRUE
  )
}

prediction_mask <- function(x,
                            mask_variable = "depth",
                            mask_raster_path = NULL,
                            mask_rule = c("auto", "negative", "positive", "non_na"),
                            require_complete_cases = TRUE) {
  mask_rule <- match.arg(mask_rule)
  x <- terra::rast(x)

  valid <- NULL
  if (isTRUE(require_complete_cases)) {
    complete_fun <- function(values) {
      if (is.null(dim(values))) {
        return(as.numeric(all(is.finite(values))))
      }
      as.numeric(rowSums(is.finite(values)) == ncol(values))
    }
    valid <- terra::app(x, complete_fun)
    valid <- terra::ifel(valid == 1, 1, NA)
  }

  mask_source <- NULL
  if (!is.null(mask_raster_path)) {
    if (!file.exists(mask_raster_path)) {
      stop("Raster de máscara não encontrado: ", mask_raster_path)
    }
    mask_source <- terra::rast(mask_raster_path)
    if (!terra::compareGeom(mask_source, x[[1]], stopOnError = FALSE)) {
      mask_source <- terra::resample(mask_source, x[[1]], method = "near")
    }
  } else {
    mask_idx <- tryCatch(
      match_predictor_indices(names(x), mask_variable),
      error = function(e) integer(0)
    )
    if (length(mask_idx) > 0L) {
      mask_source <- x[[mask_idx[[1]]]]
    }
  }

  if (!is.null(mask_source)) {
    effective_rule <- mask_rule
    if (identical(mask_rule, "auto")) {
      value_range <- terra::global(mask_source, c("min", "max"), na.rm = TRUE)
      minimum <- value_range[[1, 1]]
      maximum <- value_range[[1, 2]]
      effective_rule <- if (is.finite(minimum) && minimum < 0) {
        "negative"
      } else if (!is.null(mask_raster_path) && is.finite(minimum) &&
                 is.finite(maximum) && minimum == 0 && maximum > 0) {
        "positive"
      } else {
        "non_na"
      }
    }

    ocean <- switch(
      effective_rule,
      negative = mask_source < 0,
      positive = mask_source > 0,
      non_na = !is.na(mask_source)
    )
    ocean <- terra::ifel(ocean, 1, NA)
    valid <- if (is.null(valid)) ocean else terra::mask(valid, ocean)
    message("Máscara aplicada com regra '", effective_rule, "'.")
  }

  valid
}

prepare_aligned_predictors <- function(predictors_path,
                                       cache_dir,
                                       predictor_names,
                                       pattern = "\\.(nc|tif|tiff)$",
                                       ref_raster_path = NULL,
                                       categorical_vars = c("ocup_solo"),
                                       mask_variable = "depth",
                                       mask_raster_path = NULL,
                                       mask_rule = c("auto", "negative", "positive", "non_na"),
                                       require_complete_cases = TRUE,
                                       rebuild_cache = FALSE) {
  mask_rule <- match.arg(mask_rule)
  pattern <- normalize_raster_pattern(pattern)
  dir.create(cache_dir, recursive = TRUE, showWarnings = FALSE)

  source_files <- list.files(
    predictors_path,
    pattern = pattern,
    full.names = TRUE,
    ignore.case = TRUE
  )
  if (length(source_files) == 0L) {
    stop("Nenhum raster encontrado em ", predictors_path, " com pattern ", pattern)
  }

  source_names <- tools::file_path_sans_ext(basename(source_files))
  selected_idx <- match_predictor_indices(source_names, predictor_names)
  selected_files <- source_files[selected_idx]
  selected_names <- predictor_names

  signature_files <- selected_files
  if (!is.null(ref_raster_path)) signature_files <- c(signature_files, ref_raster_path)
  if (!is.null(mask_raster_path)) signature_files <- c(signature_files, mask_raster_path)

  stack_file <- file.path(cache_dir, "aligned_predictors.tif")
  mask_file <- file.path(cache_dir, "valid_prediction_mask.tif")
  manifest_file <- file.path(cache_dir, "cache_manifest.rds")
  settings <- list(
    predictor_names = predictor_names,
    ref_raster_path = if (is.null(ref_raster_path)) NULL else normalizePath(
      ref_raster_path, winslash = "/", mustWork = TRUE
    ),
    categorical_vars = categorical_vars,
    mask_variable = mask_variable,
    mask_rule = mask_rule,
    require_complete_cases = isTRUE(require_complete_cases)
  )
  signature <- raster_file_signature(signature_files)

  cache_valid <- FALSE
  if (!isTRUE(rebuild_cache) && file.exists(stack_file) && file.exists(manifest_file)) {
    manifest <- tryCatch(readRDS(manifest_file), error = function(e) NULL)
    cache_valid <- !is.null(manifest) &&
      identical(manifest$signature, signature) &&
      identical(manifest$settings, settings)
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
  rasters <- lapply(seq_along(selected_files), function(i) {
    out <- raster::raster(selected_files[[i]])
    names(out) <- selected_names[[i]]
    out
  })

  if (!is.null(ref_raster_path)) {
    if (!file.exists(ref_raster_path)) {
      stop("ref_raster_path não existe: ", ref_raster_path)
    }
    reference <- raster::raster(ref_raster_path)
  } else {
    cell_areas <- vapply(seq_along(rasters), function(i) {
      if (selected_names[[i]] %in% categorical_vars) return(Inf)
      resolution <- raster::res(rasters[[i]])
      if (any(!is.finite(resolution))) return(Inf)
      prod(resolution)
    }, numeric(1))
    best_idx <- which.min(cell_areas)
    if (!is.finite(cell_areas[[best_idx]])) {
      stop("Não foi possível escolher um raster de referência válido.")
    }
    reference <- rasters[[best_idx]]
    message(
      "Referência automática: ", basename(selected_files[[best_idx]]),
      " | resolução ", paste(raster::res(reference), collapse = " x ")
    )
  }

  aligned <- lapply(seq_along(rasters), function(i) {
    align_predictor_raster(
      rasters[[i]],
      reference,
      variable_name = selected_names[[i]],
      categorical_vars = categorical_vars
    )
  })
  aligned_stack <- raster::stack(aligned)
  names(aligned_stack) <- selected_names
  aligned_spat <- terra::rast(aligned_stack)

  valid_mask <- prediction_mask(
    aligned_spat,
    mask_variable = mask_variable,
    mask_raster_path = mask_raster_path,
    mask_rule = mask_rule,
    require_complete_cases = require_complete_cases
  )

  write_options <- list(
    datatype = "FLT4S",
    gdal = c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER")
  )
  if (!is.null(valid_mask)) {
    terra::writeRaster(
      valid_mask,
      mask_file,
      overwrite = TRUE,
      wopt = list(datatype = "INT1U", gdal = write_options$gdal)
    )
    terra::mask(
      aligned_spat,
      valid_mask,
      filename = stack_file,
      overwrite = TRUE,
      wopt = write_options
    )
  } else {
    terra::writeRaster(
      aligned_spat,
      stack_file,
      overwrite = TRUE,
      wopt = write_options
    )
  }

  saveRDS(
    list(signature = signature, settings = settings, created_at = Sys.time()),
    manifest_file
  )
  message("Cache diário criado: ", stack_file)

  invisible(list(
    stack_file = stack_file,
    mask_file = if (file.exists(mask_file)) mask_file else NULL,
    manifest_file = manifest_file,
    reused = FALSE
  ))
}

ensemble_statistics_block <- function(values, center = c("mean", "median"), include_sd = TRUE) {
  center <- match.arg(center)

  if (is.null(dim(values))) {
    valid <- values[is.finite(values)]
    if (length(valid) == 0L) {
      return(if (include_sd) c(NA_real_, NA_real_) else NA_real_)
    }
    central <- if (center == "mean") mean(valid) else stats::median(valid)
    if (!include_sd) return(central)
    spread <- if (length(valid) > 1L) stats::sd(valid) else NA_real_
    return(c(central, spread))
  }

  finite <- is.finite(values)
  n_valid <- rowSums(finite)
  values[!finite] <- NA_real_

  if (center == "mean") {
    central <- rowMeans(values, na.rm = TRUE)
  } else {
    central <- apply(values, 1L, stats::median, na.rm = TRUE)
  }
  central[n_valid == 0L] <- NA_real_
  if (!include_sd) return(central)

  centered <- sweep(values, 1L, central, FUN = "-")
  spread <- sqrt(rowSums(centered ^ 2, na.rm = TRUE) / (n_valid - 1L))
  spread[n_valid < 2L] <- NA_real_
  cbind(central, spread)
}

write_ensemble_statistics <- function(predictions,
                                      output_file,
                                      uncertainty_file = NULL,
                                      ensemble_fun = c("mean", "median"),
                                      stats_tmp_dir = tempdir()) {
  ensemble_fun <- match.arg(ensemble_fun)
  dir.create(dirname(output_file), recursive = TRUE, showWarnings = FALSE)
  if (!is.null(uncertainty_file)) {
    dir.create(dirname(uncertainty_file), recursive = TRUE, showWarnings = FALSE)
  }
  dir.create(stats_tmp_dir, recursive = TRUE, showWarnings = FALSE)

  x <- terra::rast(predictions)
  include_sd <- !is.null(uncertainty_file)
  stats_file <- tempfile("ensemble_stats_", tmpdir = stats_tmp_dir, fileext = ".tif")
  on.exit(unlink(stats_file, force = TRUE), add = TRUE)

  stats_raster <- terra::app(
    x,
    fun = ensemble_statistics_block,
    center = ensemble_fun,
    include_sd = include_sd,
    filename = stats_file,
    overwrite = TRUE,
    wopt = list(
      datatype = "FLT4S",
      gdal = c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER")
    )
  )

  names(stats_raster)[[1]] <- paste0("ensemble_", ensemble_fun)
  terra::writeRaster(
    stats_raster[[1]],
    output_file,
    overwrite = TRUE,
    wopt = list(
      datatype = "FLT4S",
      gdal = c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER")
    )
  )

  if (include_sd) {
    names(stats_raster)[[2]] <- "sd_bootstrap"
    terra::writeRaster(
      stats_raster[[2]],
      uncertainty_file,
      overwrite = TRUE,
      wopt = list(
        datatype = "FLT4S",
        gdal = c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER")
      )
    )
  }

  invisible(terra::rast(output_file))
}

predict_sdm <- function(model_path,
                        predictors_path,
                        output_file,
                        csv_path,
                        pattern = "\\.nc$",
                        resample = FALSE,
                        ref_raster_path = NULL,
                        model_name = basename(model_path),
                        response_col = "sp",
                        ignore_cols = c("decimalLongitude","decimalLatitude",
                                        "species","year","day","month"),
                        ensemble = TRUE,
                        ensemble_fun = c("mean", "median"),
                        save_multiband = FALSE,
                        multiband_file = NULL,
                        uncertainty_file = NULL,
                        cache_dir = NULL,
                        aligned_predictors_path = NULL,
                        rebuild_cache = FALSE,
                        categorical_vars = c("ocup_solo"),
                        mask_variable = "depth",
                        mask_raster_path = NULL,
                        mask_rule = c("auto", "negative", "positive", "non_na"),
                        require_complete_cases = TRUE,
                        stats_tmp_dir = Sys.getenv("SDM_TMPDIR", unset = tempdir())) {
  ensemble_fun <- match.arg(ensemble_fun)
  mask_rule <- match.arg(mask_rule)
  pattern <- normalize_raster_pattern(pattern)

  inferred <- infer_predictors_from_csv(
    csv_path,
    response_col = response_col,
    ignore_cols = ignore_cols
  )
  predictor_names <- inferred$predictor_names

  path <- file.path(model_path, paste(model_name, "sdm", sep = "."))
  modelo <- sdm::read.sdm(path)

  if (!is.null(aligned_predictors_path)) {
    if (!file.exists(aligned_predictors_path)) {
      stop("Cache alinhado não encontrado: ", aligned_predictors_path)
    }
    r_stack <- raster::stack(aligned_predictors_path)
    cache_manifest <- file.path(dirname(aligned_predictors_path), "cache_manifest.rds")
    if (file.exists(cache_manifest)) {
      manifest <- tryCatch(readRDS(cache_manifest), error = function(e) NULL)
      cached_names <- manifest$settings$predictor_names %||% character(0)
      if (length(cached_names) == raster::nlayers(r_stack)) {
        names(r_stack) <- cached_names
      }
    }
  } else if (isTRUE(resample) || !is.null(cache_dir)) {
    effective_cache <- cache_dir %||% tempfile("sdm_aligned_cache_")
    prepared <- prepare_aligned_predictors(
      predictors_path = predictors_path,
      cache_dir = effective_cache,
      predictor_names = predictor_names,
      pattern = pattern,
      ref_raster_path = ref_raster_path,
      categorical_vars = categorical_vars,
      mask_variable = mask_variable,
      mask_raster_path = mask_raster_path,
      mask_rule = mask_rule,
      require_complete_cases = require_complete_cases,
      rebuild_cache = rebuild_cache
    )
    r_stack <- raster::stack(prepared$stack_file)
  } else {
    source_files <- list.files(
      predictors_path,
      pattern = pattern,
      full.names = TRUE,
      ignore.case = TRUE
    )
    if (length(source_files) == 0L) {
      stop("Nenhum arquivo encontrado em ", predictors_path, " com pattern ", pattern)
    }
    r_list <- lapply(source_files, function(file) {
      out <- raster::raster(file)
      names(out) <- tools::file_path_sans_ext(basename(file))
      out
    })
    r_stack <- raster::stack(r_list)
  }

  matched_idx <- match_predictor_indices(names(r_stack), predictor_names)
  r_stack <- r_stack[[matched_idx]]
  names(r_stack) <- predictor_names

  if (save_multiband && is.null(multiband_file)) {
    multiband_file <- sub("\\.tif$", "_bands.tif", output_file, ignore.case = TRUE)
    if (identical(multiband_file, output_file)) {
      multiband_file <- paste0(output_file, "_bands.tif")
    }
  }
  pred_file <- if (save_multiband) multiband_file else raster::rasterTmpFile()

  p_raw <- methods::selectMethod("predict", "sdmModels")(
    modelo,
    newdata = r_stack,
    filename = pred_file,
    overwrite = TRUE,
    mean = FALSE
  )

  n_layers <- if (inherits(p_raw, "SpatRaster")) {
    terra::nlyr(p_raw)
  } else {
    raster::nlayers(p_raw)
  }

  if (isTRUE(ensemble) && n_layers > 1L) {
    return(invisible(write_ensemble_statistics(
      predictions = p_raw,
      output_file = output_file,
      uncertainty_file = uncertainty_file,
      ensemble_fun = ensemble_fun,
      stats_tmp_dir = stats_tmp_dir
    )))
  }

  if (inherits(p_raw, "SpatRaster")) {
    terra::writeRaster(
      p_raw,
      output_file,
      overwrite = TRUE,
      wopt = list(
        datatype = "FLT4S",
        gdal = c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER")
      )
    )
  } else {
    raster::writeRaster(
      p_raw,
      filename = output_file,
      overwrite = TRUE,
      datatype = "FLT4S",
      options = c("COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER")
    )
  }

  invisible(p_raw)
}

detect_total_memory_gb <- function() {
  meminfo <- "/proc/meminfo"
  if (!file.exists(meminfo)) return(NA_real_)
  lines <- readLines(meminfo, warn = FALSE)
  total_line <- grep("^MemTotal:", lines, value = TRUE)
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
                                    max_workers = 4) {
  if (!identical(requested, "auto")) {
    workers <- suppressWarnings(as.integer(requested))
    if (!is.finite(workers) || workers < 1L) {
      stop("workers deve ser 'auto' ou um inteiro positivo.")
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

configure_sdm_runtime <- function(temp_root = Sys.getenv(
                                    "SDM_TMPDIR",
                                    unset = file.path(tempdir(), "sdm-runtime")
                                  ),
                                  terra_memfrac = 0.60,
                                  threads_per_worker = 1L) {
  worker_tmp <- file.path(temp_root, paste0("worker-", Sys.getpid()))
  dir.create(worker_tmp, recursive = TRUE, showWarnings = FALSE)

  raster::rasterOptions(tmpdir = worker_tmp)
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

default_uncertainty_file <- function(output_file) {
  if (grepl("_mean\\.tif$", output_file, ignore.case = TRUE)) {
    return(sub("_mean\\.tif$", "_sd.tif", output_file, ignore.case = TRUE))
  }
  if (grepl("\\.tif$", output_file, ignore.case = TRUE)) {
    return(sub("\\.tif$", "_sd.tif", output_file, ignore.case = TRUE))
  }
  paste0(output_file, "_sd.tif")
}

predict_sdm_batch <- function(jobs,
                              predictors_path,
                              cache_dir,
                              pattern = "\\.(nc|tif|tiff)$",
                              ref_raster_path = NULL,
                              workers = "auto",
                              summary_file = NULL,
                              temp_root = Sys.getenv(
                                "SDM_TMPDIR",
                                unset = file.path(tempdir(), "sdm-runtime")
                              ),
                              categorical_vars = c("ocup_solo"),
                              mask_variable = "depth",
                              mask_raster_path = NULL,
                              mask_rule = c("auto", "negative", "positive", "non_na"),
                              require_complete_cases = TRUE,
                              rebuild_cache = FALSE,
                              ...) {
  mask_rule <- match.arg(mask_rule)
  if (is.character(jobs) && length(jobs) == 1L) {
    jobs <- read.csv(jobs, stringsAsFactors = FALSE, check.names = FALSE)
  }
  jobs <- as.data.frame(jobs, stringsAsFactors = FALSE)
  required_columns <- c("model_path", "output_file", "csv_path")
  missing_columns <- setdiff(required_columns, names(jobs))
  if (length(missing_columns) > 0L) {
    stop("Colunas obrigatórias ausentes em jobs: ", paste(missing_columns, collapse = ", "))
  }
  if (nrow(jobs) == 0L) stop("A tabela jobs está vazia.")

  predictor_sets <- lapply(jobs$csv_path, function(csv_path) {
    infer_predictors_from_csv(csv_path)$predictor_names
  })
  all_predictors <- unique(unlist(predictor_sets, use.names = FALSE))

  # Etapa serial obrigatória: o cache fica completo antes de iniciar os forks.
  prepared <- prepare_aligned_predictors(
    predictors_path = predictors_path,
    cache_dir = cache_dir,
    predictor_names = all_predictors,
    pattern = pattern,
    ref_raster_path = ref_raster_path,
    categorical_vars = categorical_vars,
    mask_variable = mask_variable,
    mask_raster_path = mask_raster_path,
    mask_rule = mask_rule,
    require_complete_cases = require_complete_cases,
    rebuild_cache = rebuild_cache
  )

  worker_count <- min(
    nrow(jobs),
    recommended_sdm_workers(requested = workers)
  )
  if (.Platform$OS.type == "windows" && worker_count > 1L) {
    warning("Paralelização por fork não está disponível no Windows; usando 1 worker.")
    worker_count <- 1L
  }
  message(
    "Predições: ", nrow(jobs), " job(s), ", worker_count,
    " worker(s), cache compartilhado: ", prepared$stack_file
  )

  extra_args <- list(...)
  run_one <- function(index) {
    started <- Sys.time()
    worker_tmp <- configure_sdm_runtime(temp_root = temp_root)
    on.exit(unlink(worker_tmp, recursive = TRUE, force = TRUE), add = TRUE)

    row <- lapply(jobs[index, , drop = FALSE], function(value) value[[1]])
    model_name <- if ("model_name" %in% names(row) &&
                      !is.na(row$model_name) && nzchar(row$model_name)) {
      as.character(row$model_name)
    } else {
      basename(as.character(row$model_path))
    }
    uncertainty_file <- if ("uncertainty_file" %in% names(row) &&
                            !is.na(row$uncertainty_file) &&
                            nzchar(row$uncertainty_file)) {
      as.character(row$uncertainty_file)
    } else {
      default_uncertainty_file(as.character(row$output_file))
    }
    species_id <- if ("species_id" %in% names(row)) {
      as.character(row$species_id)
    } else {
      model_name
    }

    error_message <- NA_character_
    status <- "ok"
    tryCatch({
      call_args <- utils::modifyList(extra_args, list(
        model_path = as.character(row$model_path),
        predictors_path = predictors_path,
        output_file = as.character(row$output_file),
        csv_path = as.character(row$csv_path),
        pattern = pattern,
        resample = FALSE,
        model_name = model_name,
        uncertainty_file = uncertainty_file,
        aligned_predictors_path = prepared$stack_file,
        categorical_vars = categorical_vars,
        mask_variable = mask_variable,
        mask_raster_path = mask_raster_path,
        mask_rule = mask_rule,
        require_complete_cases = require_complete_cases,
        stats_tmp_dir = worker_tmp
      ))
      do.call(predict_sdm, call_args)
    }, error = function(error) {
      status <<- "error"
      error_message <<- conditionMessage(error)
    })

    finished <- Sys.time()
    data.frame(
      species_id = species_id,
      model_name = model_name,
      status = status,
      started_at = format(started, "%Y-%m-%dT%H:%M:%S%z"),
      finished_at = format(finished, "%Y-%m-%dT%H:%M:%S%z"),
      elapsed_seconds = round(as.numeric(difftime(finished, started, units = "secs")), 3),
      output_file = as.character(row$output_file),
      uncertainty_file = uncertainty_file,
      error = error_message,
      stringsAsFactors = FALSE
    )
  }

  indices <- seq_len(nrow(jobs))
  results <- if (worker_count > 1L) {
    parallel::mclapply(
      indices,
      run_one,
      mc.cores = worker_count,
      mc.preschedule = FALSE
    )
  } else {
    lapply(indices, run_one)
  }
  summary <- do.call(rbind, results)
  row.names(summary) <- NULL

  if (!is.null(summary_file)) {
    dir.create(dirname(summary_file), recursive = TRUE, showWarnings = FALSE)
    write.csv(summary, summary_file, row.names = FALSE, na = "")
  }
  invisible(summary)
}

# --------- 4) VIF genérico: usa TODAS variáveis numéricas do CSV ---------
generate_vif <- function(csv_path,
                         response_col = "sp",
                         ignore_cols = c("decimalLongitude","decimalLatitude","species","year","day","month"),
                         res = 0.5,
                         vif_threshold = 7,
                         cor_threshold = 0.7,
                         sp_keep = 1) {
  
  df <- read.csv(csv_path, header = TRUE)
  
  # filtra sp (por padrão só presença)
  if (!is.null(sp_keep)) {
    if (!response_col %in% names(df)) stop("Coluna de resposta não encontrada: ", response_col)
    df <- df[df[[response_col]] %in% sp_keep, , drop = FALSE]
  }
  
  inferred <- infer_predictors_from_csv(
    csv_path = csv_path,
    response_col = response_col,
    ignore_cols = ignore_cols
  )
  preds <- inferred$predictor_names
  
  x <- df[, preds, drop = FALSE]
  
  # VIFSTEP e VIFCOR
  v_step <- usdm::vifstep(x, th = vif_threshold)
  v_cor  <- usdm::vifcor(x, th = cor_threshold)
  
  cat("\n===== VIFSTEP (th =", vif_threshold, ") =====\n")
  print(v_step)
  
  cat("\n===== VIFCOR (th =", cor_threshold, ") =====\n")
  print(v_cor)
  
  invisible(list(vifstep = v_step, vifcor = v_cor))
}


# --------- 5) Pipeline com vários métodos (ex: BRT), usando CSV ---------
generate_5_methods <- function(base_path, species_name,
                               response_col = "sp",
                               ignore_cols = c("decimalLongitude","decimalLatitude","species","year","day","month"),
                               csv_filename = "predictor.csv",
                               methods = c("rf","glm","gam","brt","maxent"),
                               model_settings = list(
                                 brt = list(n.trees = 500, train.fraction = 0.8)
                               )) {
  
  predictors_daily  <- file.path(base_path, "daily")
  predictors_annual <- file.path(base_path, "anual")
  
  for (method in methods) {
    model_name <- paste0(species_name, "_", method)
    message("Treinando: ", model_name)
    
    # settings só pro método atual (se existir)
    ms <- NULL
    if (!is.null(model_settings[[method]])) {
      ms <- setNames(list(model_settings[[method]]), method)
    }
    
    model <- generate_model(
      data_path       = base_path,
      output_path     = base_path,
      model_name      = model_name,
      response_col    = response_col,
      ignore_cols     = ignore_cols,
      methods         = c(method),
      csv_filename    = csv_filename,
      n_reps          = 10,
      model_settings  = ms
    )
    
    
    predict_sdm(
      model_path      = base_path,
      predictors_path = predictors_annual,
      output_file     = file.path(base_path, paste0(model_name, "_anual.tif")),
      csv_path        = file.path(base_path, csv_filename),
      pattern         = "*tif$",
      resample        = TRUE,
      model_name      = model_name,
      response_col    = response_col,
      ignore_cols     = ignore_cols
    )
  }
}


# ------------------------------------------------------------
# 6) Relatório completo GUI: CSV + HTML (inclui todos bootstraps)
# ------------------------------------------------------------

generate_gui_report <- function(model = NULL,
                                model_path = NULL,
                                model_name = NULL,
                                output_csv = NULL,
                                output_html = NULL,
                                title = "Avaliação dos modelos SDM") {
  # Precisamos de: OU um objeto de modelo, OU caminho+nome
  if (is.null(model) && (is.null(model_path) || is.null(model_name))) {
    stop("Informe 'model' OU ('model_path' e 'model_name').")
  }
  
  # Se não veio output_csv/output_html, cria defaults com base no caminho/nome
  if (is.null(output_csv) && !is.null(model_path) && !is.null(model_name)) {
    output_csv <- file.path(model_path, paste0(model_name, "_eval.csv"))
  }
  if (is.null(output_html) && !is.null(model_path) && !is.null(model_name)) {
    output_html <- file.path(model_path, paste0(model_name, "_eval.html"))
  }
  
  # 1) Obter o modelo (em memória ou lendo o .sdm)
  if (!is.null(model)) {
    modelo <- model
  } else {
    sdm_file <- file.path(model_path, paste0(model_name, ".sdm"))
    if (!file.exists(sdm_file)) {
      stop("Arquivo .sdm não encontrado: ", sdm_file)
    }
    modelo <- read.sdm(sdm_file)
  }
  
  # 2) Puxar todas as avaliações (cada linha = 1 replicação/método/tipo de dado)
  ev <- getEvaluation(modelo)
  
  # 3) Salvar CSV com TODAS as linhas (todos os 10 bootstraps)
  if (!is.null(output_csv)) {
    write.csv(ev, output_csv, row.names = FALSE)
  }
  
  # 4) Gerar HTML (resumo + tabela completa)
  if (!is.null(output_html)) {
    
    round_df <- function(df, digits = 3) {
      num_cols <- sapply(df, is.numeric)
      if (any(num_cols)) {
        df[, num_cols] <- lapply(df[, num_cols, drop = FALSE], round, digits = digits)
      }
      df
    }
    
    df_to_html_table <- function(df) {
      df <- round_df(df)
      header <- paste0(
        "<tr>",
        paste(sprintf("<th>%s</th>", names(df)), collapse = ""),
        "</tr>"
      )
      rows <- apply(df, 1, function(r) {
        paste0(
          "<tr>",
          paste(sprintf("<td>%s</td>", r), collapse = ""),
          "</tr>"
        )
      })
      paste0("<table>", header, paste(rows, collapse = "\n"), "</table>")
    }
    
    # Resumo por método/tipo de dado (médias das métricas)
    meta_cols   <- intersect(c("model", "method", "algorithm", "replication", "dataType"), names(ev))
    metric_cols <- setdiff(names(ev), meta_cols)
    group_cols  <- intersect(c("method", "dataType"), names(ev))
    summ <- NULL
    if (length(group_cols) > 0 && length(metric_cols) > 0) {
      formula_str <- paste(
        paste(metric_cols, collapse = " + "),
        "~",
        paste(group_cols, collapse = " + ")
      )
      sum_formula <- as.formula(formula_str)
      summ <- aggregate(sum_formula, data = ev, FUN = mean, na.rm = TRUE)
    }
    
    html <- c(
      "<!DOCTYPE html>",
      "<html>",
      "<head>",
      "<meta charset='UTF-8'>",
      sprintf("<title>%s</title>", title),
      "<style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1, h2 { font-family: Arial, sans-serif; }
      table { border-collapse: collapse; margin-bottom: 20px; }
      th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 12px; }
      th { background-color: #f5f5f5; }
    </style>",
      "</head>",
      "<body>",
      sprintf("<h1>%s</h1>", title)
    )
    
    if (!is.null(model_name)) {
      html <- c(html, sprintf("<h2>Modelo: %s</h2>", model_name))
    }
    
    if (!is.null(summ)) {
      html <- c(
        html,
        "<h2>Resumo por método / tipo de dado (médias)</h2>",
        df_to_html_table(summ)
      )
    }
    
    # Aqui vai a tabela COMPLETA: todos os bootstraps
    html <- c(
      html,
      "<h2>Todas as avaliações (cada linha = 1 bootstrap / replicação)</h2>",
      df_to_html_table(ev),
      "</body>",
      "</html>"
    )
    
    writeLines(html, output_html)
  }
  
  # Devolve o data.frame completo (caso tu queira usar em R)
  return(ev)
}

# ------------------------------------------------------------
# 7) Checar range de variáveis por área/tempo (CSV) e TIFF
# ------------------------------------------------------------
check_sdm_ranges <- function(csv_path,
                             raster_path = NULL,
                             response_col = "sp",
                             ignore_cols = c(
                               "decimalLongitude","decimalLatitude","species",
                               "year","day","month","lon","lat","x","y","id"
                             ),
                             area_col = NULL,   # ex: "regiao"
                             time_col = NULL    # ex: "year"
) {
  if (!file.exists(csv_path)) {
    stop("CSV não encontrado em: ", csv_path)
  }
  
  # --------- 1) Lê o CSV e descobre preditores ---------
  df <- read.csv(csv_path, header = TRUE)
  
  inferred <- infer_predictors_from_csv(
    csv_path     = csv_path,
    response_col = response_col,
    ignore_cols  = ignore_cols
  )
  predictor_names <- inferred$predictor_names
  
  # Garante que as colunas existem
  area_col <- if (!is.null(area_col) && area_col %in% names(df)) area_col else NULL
  time_col <- if (!is.null(time_col) && time_col %in% names(df)) time_col else NULL
  
  group_vars <- c()
  if (!is.null(area_col)) group_vars <- c(group_vars, area_col)
  if (!is.null(time_col)) group_vars <- c(group_vars, time_col)
  
  if (length(group_vars) == 0) {
    # Se não tiver nenhuma coluna de área/tempo, cria um grupo único
    df$..grupo.. <- "tudo"
    group_vars <- "..grupo.."
  }
  
  # Fica só com colunas de interesse
  sel_cols <- c(predictor_names, group_vars)
  sel_cols <- intersect(sel_cols, names(df))
  df_sel   <- df[, sel_cols, drop = FALSE]
  
  # --------- 2) Tabela longa e estatísticas por grupo ---------
  long_df <- tidyr::pivot_longer(
    data      = df_sel,
    cols      = dplyr::all_of(predictor_names),
    names_to  = "variable",
    values_to = "value"
  )
  
  predictor_ranges <- long_df %>%
    dplyr::group_by(dplyr::across(dplyr::all_of(group_vars)), .data$variable) %>%
    dplyr::summarise(
      n      = sum(!is.na(.data$value)),
      min    = ifelse(n > 0, min(.data$value, na.rm = TRUE), NA_real_),
      q25    = ifelse(n > 0, stats::quantile(.data$value, 0.25, na.rm = TRUE), NA_real_),
      median = ifelse(n > 0, stats::median(.data$value, na.rm = TRUE), NA_real_),
      q75    = ifelse(n > 0, stats::quantile(.data$value, 0.75, na.rm = TRUE), NA_real_),
      max    = ifelse(n > 0, max(.data$value, na.rm = TRUE), NA_real_),
      mean   = ifelse(n > 0, mean(.data$value, na.rm = TRUE), NA_real_),
      sd     = ifelse(n > 1, stats::sd(.data$value, na.rm = TRUE), NA_real_),
      .groups = "drop"
    )
  
  # --------- 3) Estatísticas do raster de predição (opcional) ---------
  raster_ranges <- NULL
  if (!is.null(raster_path)) {
    if (!file.exists(raster_path)) {
      warning("Raster de predição não encontrado em: ", raster_path)
    } else {
      r_stack <- raster::stack(raster_path)
      n_layers <- raster::nlayers(r_stack)
      layer_names <- names(r_stack)
      
      raster_ranges <- data.frame(
        layer = layer_names,
        min   = NA_real_,
        max   = NA_real_,
        mean  = NA_real_,
        sd    = NA_real_,
        stringsAsFactors = FALSE
      )
      
      for (i in seq_len(n_layers)) {
        lay <- r_stack[[i]]
        # AQUI a correção: usar cellStats em tudo
        raster_ranges$min[i]  <- raster::cellStats(lay, stat = "min",  na.rm = TRUE)
        raster_ranges$max[i]  <- raster::cellStats(lay, stat = "max",  na.rm = TRUE)
        raster_ranges$mean[i] <- raster::cellStats(lay, stat = "mean", na.rm = TRUE)
        raster_ranges$sd[i]   <- raster::cellStats(lay, stat = "sd",   na.rm = TRUE)
      }
    }
  }
  
  # --------- 4) Retorno ---------
  out <- list(
    predictor_ranges = predictor_ranges,
    raster_ranges    = raster_ranges
  )
  return(out)
}



# -------------------- EXEMPLOS DE USO --------------------
# 1) Treinar um modelo RF lendo variáveis do predictor.csv automaticamente:
# model <- generate_model(
#   data_path   = "/caminho/para/pasta",
#   output_path = "/caminho/para/pasta",
#   model_name  = "minha_especie_rf",
#   response_col = "sp",
#   ignore_cols  = c("decimalLongitude","decimalLatitude","species","year","day","month"),
#   methods      = c("rf"),
#   csv_filename = "predictor.csv"
# )

# 2) Predizer usando os nomes de variáveis vindos do CSV (.nc):
# predict_sdm(
#   model_path      = "/caminho/para/pasta",
#   predictors_path = "/caminho/para/pasta/daily",
#   output_file     = "/caminho/para/pasta/minha_especie_rf_diario.tif",
#   csv_path        = "/caminho/para/pasta/predictor.csv",
#   pattern         = "*nc$",
#   resample        = TRUE,
#   model_name      = "minha_especie_rf",
#   response_col    = "sp"
# )

# 3) VIF automático a partir do CSV (sem nomes fixos):
# generate_vif(
#   csv_path      = "/caminho/para/pasta/predictor.csv",
#   response_col  = "sp",
#   ignore_cols   = c("decimalLongitude","decimalLatitude","species","year","day","month"),
#   res           = 0.5,
#   vif_threshold = 7
# )

# 4) Pipeline (ex.: BRT) já usando CSV para descobrir variáveis:
# generate_5_methods(
#   base_path    = "/caminho/para/pasta",
#   species_name = "Thunnus_obesus",
#   response_col = "sp"
# )

##########################
########## OLD ###########
##########################
# library(raster)
# #library(rgbif)
# library(dplyr)
# library(tidyr)
# library(sp)
# library(sf)
# library(usdm)
# library(maps)
# library(tidyr)
# library(terra)
# library(sdm)

# process_gbif_data <- function(species_name, lon_range = c(-85,-32), lat_range = c(-58, 15), 
#                               year_range = c(2000, 2024), output_dir = getwd(),limit=100000) {
#   gbif_data <- occ_data(scientificName = species_name, hasCoordinate = TRUE,
#                         decimalLongitude = paste(lon_range, collapse=","), 
#                         decimalLatitude = paste(lat_range, collapse=","),limit=limit)
#   species_coords <- gbif_data$data[, c("decimalLongitude", "decimalLatitude", "year","day","month")]
#   setwd(output_dir)
#   species_filtered <- species_coords %>% 
#     filter(year >= year_range[1] & year <= year_range[2]) %>% 
#     drop_na(decimalLongitude, decimalLatitude,year,day,month)
#   unique_species <- species_filtered[!duplicated(species_filtered[, c("decimalLongitude", "decimalLatitude","year","day","month")]), ]
#   output_file <- paste0(gsub(" ", "_", species_name), "_GBIF_Data.csv")
#   write.csv(unique_species, output_file, row.names = FALSE)
#   coordinates(unique_species) <- ~decimalLongitude + decimalLatitude
#   return(unique_species)
# }


# generate_model <- function(data_path, output_path, model_name,ignore_cols,methods=c('rf')) {
#   setwd(data_path)
#   df <- read.csv("predictor.csv", sep = ",", header = TRUE)
#   head(df)
#   cols.dont.want <- ignore_cols
#   df <- df[, ! names(df) %in% cols.dont.want, drop = FALSE]
#   sdmData <- sdmData(sp~ ., train = df)
#   modelo <- sdm(sp~ ., sdmData, methods = methods, replication = c('boot'), n = 7)
#   setwd(output_path)
#   write.sdm(modelo, model_name, overwrite = TRUE)
#   return (modelo)
# }

# predict_sdm <- function(model_path, predictors_path, output_file,variables,pattern="*nc$",resample=FALSE,model_name=basename(model_path)) {
#   setwd(model_path)

#   path<-file.path(model_path, paste(model_name,"sdm",sep="."))
#   print(path)
#   modelo <- read.sdm(path)
#   #print(modelo)
#   nc_files <- list.files(path = predictors_path, pattern = pattern, full.names = TRUE)
#   r <- lapply(nc_files, raster)
#   if (resample) {
#     ref_raster <- r[[1]]
#     r_resampled <- lapply(r, function(x) resample(x, ref_raster, method = "bilinear"))
#     bio_presente_cop <- stack(r_resampled)
#   } else {
#     bio_presente_cop <- stack(r)
#   }
#   names(bio_presente_cop) <- variables
#   print(bio_presente_cop)
#   p <- predict(modelo, bio_presente_cop,overwrite = TRUE)
#   writeRaster(p, filename = output_file, overwrite = TRUE, datatype = 'FLT4S')
# }



# generate_vif <- function(csv_path){
#   data <- read.csv(csv_path)
#   head(data)
#   coordinates(data) <- ~decimalLongitude + decimalLatitude
#   ext <- extent(data)
#   raster_template <- raster(ext, res = 0.5)
#   thetao_raster <- rasterize(data, raster_template, field = "thetao", fun = mean)
#   so_raster <- rasterize(data, raster_template, field = "so", fun = mean)
#   chl_raster <- rasterize(data, raster_template, field = "CHL", fun = mean)
#   depth_raster <- rasterize(data, raster_template, field = "depth", fun = mean)
#   env_stack <- stack(thetao_raster, so_raster, chl_raster,depth_raster)
#   names(env_stack) <- c("thetao", "so", "CHL","depth")
#   data<-rast(env_stack)
#   print("VIFSTEP")
#   print(vifstep(data,th=7))
#   print("VIFCORE")
#   print(vifcor(data,th=7))
# }


# generate_5_methods<-function(base_path,species_name){
#   methods <- c(
#     'rf', 
#     'glm', 
#     'gam',
#     'brt',
#     'maxent'
#   )
#   predictors_daily <- file.path(base_path, "predictors")
#   predictors_annual <- file.path(base_path, "anual")
#   for (method in methods) {
#     model_name <- paste0(species_name,"_", method)
#     print(model_name)

#     model <- generate_model(
#       base_path,
#       base_path,
#       model_name,
#       c('decimalLongitude','decimalLatitude','species','year','day','month'),
#       c(method)
#     )


#     predict_sdm(
#       model_path = base_path,
#       predictors_path = predictors_daily,
#       output_file = file.path(base_path, paste0(model_name, "_diario.tif")),

#       variables = c('CHL','depth','so','thetao'),
#       pattern = '*nc$',
#       resample = TRUE,
#       model_name = model_name
#     )

#     predict_sdm(
#       model_path = base_path,
#       predictors_path = predictors_annual,
#       output_file = file.path(base_path, paste0(model_name, "_anual.tif")),
#       variables = c('CHL','depth','so','thetao'),
#       pattern = '*tif$',
#       resample = TRUE,
#       model_name = model_name
#     )
#   }

# }
