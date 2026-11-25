source(file.path(dirname(normalizePath(sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE)[1]))), "..", "..", "R", "cli_helpers.R"))
run_single_species_entrypoint("thunnus_alalunga")
