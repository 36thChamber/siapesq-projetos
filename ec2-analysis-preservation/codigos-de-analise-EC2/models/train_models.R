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

config <- read_species_config(project_root)
config <- config[config$enabled, , drop = FALSE]
requested_species <- split_cli_values(arguments$species)
if (!is.null(requested_species)) {
  unknown <- setdiff(requested_species, config$species_id)
  if (length(unknown) > 0L) {
    stop("Espécies desconhecidas: ", paste(unknown, collapse = ", "), call. = FALSE)
  }
  config <- config[config$species_id %in% requested_species, , drop = FALSE]
}

n_reps <- if (is.null(arguments$n_reps)) 10L else as.integer(arguments$n_reps)
if (!is.finite(n_reps) || n_reps < 1L) {
  stop("--n-reps deve ser um inteiro positivo.", call. = FALSE)
}

failures <- character(0)
for (index in seq_len(nrow(config))) {
  row <- config[index, , drop = FALSE]
  message("Treinando ", row$species_id, "...")
  tryCatch(
    train_species_model(
      row,
      project_root = project_root,
      n_reps = n_reps,
      force = as_cli_bool(arguments$force),
      run_vif = as_cli_bool(arguments$vif)
    ),
    error = function(error) {
      failures <<- c(
        failures,
        paste0(row$species_id, ": ", conditionMessage(error))
      )
    }
  )
}

if (length(failures) > 0L) {
  message("Falhas de treino:\n", paste(failures, collapse = "\n"))
  quit(save = "no", status = 1L)
}
