suppressPackageStartupMessages(library(sdm))
args <- commandArgs(trailingOnly=TRUE)
m <- sdm::read.sdm(args[1]); d <- m@data;f <- d@features
stopifnot(names(d@species)=="species")
s <- d@species[[1]]
f$sp <- NA_integer_
f$sp[f$rID %in% s@presence] <- 1L
zero <- c(if(is.numeric(s@absence)) s@absence else NULL,if(is.numeric(s@background)) s@background else NULL)
f$sp[f$rID %in% zero] <- 0L
write.csv(f,args[2],row.names=FALSE)
