set -eu
Rscript - <<'R'
suppressPackageStartupMessages(library(sdm))
for (id in c('engraulis_anchoita','merluccius_merluccius','sardinella_brasiliensis')) {
 m <- sdm::read.sdm(paste0('/workspace/models/oceanincs/',id,'/',id,'_rf.sdm'))
 d <- m@data
 cat('SPECIES',id,'\n')
 str(d@species[[1]],max.level=2)
 str(d@info,max.level=2)
 cat('FEATURES',names(d@features),'\n')
}
R
