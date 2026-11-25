script_path <- local({
  file_argument <- grep(
    "^--file=",
    commandArgs(trailingOnly = FALSE),
    value = TRUE
  )
  normalizePath(sub("^--file=", "", file_argument[1]), mustWork = TRUE)
})
default_project_root <- dirname(script_path)

source(file.path(default_project_root, "R", "cli_helpers.R"))
arguments <- parse_cli_args(commandArgs(trailingOnly = TRUE))

project_root <- normalizePath(
  if (is.null(arguments$project_root)) {
    default_project_root
  } else {
    arguments$project_root
  },
  mustWork = TRUE
)
source(file.path(project_root, "utils.r"))
source(file.path(project_root, "R", "pipeline.R"))

predictors_path <- if (!is.null(arguments$predictors)) {
  arguments$predictors
} else {
  Sys.getenv(
    "DAILY_PREDICTORS_DIR",
    file.path(project_root, "data", "daily", "current")
  )
}
predictors_path <- normalizePath(predictors_path, mustWork = TRUE)

prediction_date <- arguments$date
if (is.null(prediction_date)) {
  resolved_name <- basename(predictors_path)
  prediction_date <- if (grepl("^\\d{4}-\\d{2}-\\d{2}$", resolved_name)) {
    resolved_name
  } else {
    as.character(Sys.Date())
  }
}

summary <- run_daily_pipeline(
  project_root = project_root,
  predictors_path = predictors_path,
  prediction_date = prediction_date,
  species_ids = split_cli_values(arguments$species)
)

print(summary[, c("species_id", "status", "error"), drop = FALSE])
message("Resumo: ", attr(summary, "summary_file"))
if (any(summary$status != "ok")) {
  quit(save = "no", status = 1L)
}
