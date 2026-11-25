suppressPackageStartupMessages(library(sdm))
base <- "/workspace/projects"
files <- c(engraulis_anchoita="Modelo_Eanchoita.sdm", merluccius_merluccius="Modelo_Mmerluccius.sdm")
for (sid in names(files)){
  m <- sdm::read.sdm(file.path(base,"Modelos-R",sid,files[[sid]]))
  d <- m@data; f <- d@features; species <- d@species[[1]]
  f$sp <- NA_integer_
  f$sp[f$rID %in% species@presence] <- 1L
  zeros <- c(if (is.numeric(species@absence)) species@absence else NULL,
             if (is.numeric(species@background)) species@background else NULL)
  f$sp[f$rID %in% zeros] <- 0L
  target <- file.path(base,"operacao-diaria-vps","recuperacao-siapreps","exportacao-sdm",sid)
  dir.create(target,recursive=TRUE,showWarnings=FALSE)
  write.csv(f,file.path(target,"original.csv"),row.names=FALSE)
}
