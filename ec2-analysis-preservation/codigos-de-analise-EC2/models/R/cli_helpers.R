current_script_path <- function() {
  file_argument <- grep(
    "^--file=",
    commandArgs(trailingOnly = FALSE),
    value = TRUE
  )
  if (length(file_argument) == 0L) {
    stop("Não foi possível determinar o arquivo R em execução.", call. = FALSE)
  }
  normalizePath(sub("^--file=", "", file_argument[1]), mustWork = TRUE)
}

parse_cli_args <- function(arguments) {
  result <- list()
  index <- 1L

  while (index <= length(arguments)) {
    argument <- arguments[index]
    if (!startsWith(argument, "--")) {
      stop("Argumento inválido: ", argument, call. = FALSE)
    }

    argument <- sub("^--", "", argument)
    if (grepl("=", argument, fixed = TRUE)) {
      pieces <- strsplit(argument, "=", fixed = TRUE)[[1]]
      key <- pieces[1]
      value <- paste(pieces[-1], collapse = "=")
    } else {
      key <- argument
      if (
        index < length(arguments) &&
        !startsWith(arguments[index + 1L], "--")
      ) {
        index <- index + 1L
        value <- arguments[index]
      } else {
        value <- "true"
      }
    }
    result[[gsub("-", "_", key, fixed = TRUE)]] <- value
    index <- index + 1L
  }
  result
}

as_cli_bool <- function(value, default = FALSE) {
  if (is.null(value)) {
    return(default)
  }
  tolower(trimws(as.character(value))) %in% c("1", "true", "yes", "sim")
}

split_cli_values <- function(value) {
  if (is.null(value) || !nzchar(value)) {
    return(NULL)
  }
  trimws(strsplit(value, ",", fixed = TRUE)[[1]])
}

run_single_species_entrypoint <- function(species_id) {
  script_path <- current_script_path()
  project_root <- normalizePath(
    file.path(dirname(script_path), "..", ".."),
    mustWork = TRUE
  )
  source(file.path(project_root, "utils.r"), local = globalenv())
  source(file.path(project_root, "R", "pipeline.R"), local = globalenv())

  predictors_path <- Sys.getenv(
    "DAILY_PREDICTORS_DIR",
    file.path(project_root, "data", "daily", "current")
  )
  resolved_predictors <- normalizePath(predictors_path, mustWork = TRUE)
  prediction_date <- basename(resolved_predictors)
  if (!grepl("^\\d{4}-\\d{2}-\\d{2}$", prediction_date)) {
    prediction_date <- as.character(Sys.Date())
  }

  summary <- run_daily_pipeline(
    project_root = project_root,
    predictors_path = resolved_predictors,
    prediction_date = prediction_date,
    species_ids = species_id
  )
  if (any(summary$status != "ok")) {
    quit(save = "no", status = 1L)
  }
  invisible(summary)
}
