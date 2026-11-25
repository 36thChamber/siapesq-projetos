set -eu
base=/workspace/ste-ocean-daily
mkdir -p "$base/legacy-training-export"
chown ubuntu:ubuntu "$base/legacy-training-export"
sudo -u ubuntu Rscript - <<'R'
suppressPackageStartupMessages(library(sdm))
base <- '/workspace/ste-ocean-daily/legacy-training-export'
for (id in c('engraulis_anchoita','merluccius_merluccius')) {
 m <- sdm::read.sdm(paste0('/workspace/models/oceanincs/',id,'/',id,'_rf.sdm'))
 d <- m@data; f <- d@features; species <- d@species[[1]]
 f$sp <- NA_integer_
 f$sp[f$rID %in% species@presence] <- 1L
 zeros <- c(if (is.numeric(species@absence)) species@absence else NULL,
            if (is.numeric(species@background)) species@background else NULL)
 f$sp[f$rID %in% zeros] <- 0L
 write.csv(f,file.path(base,paste0(id,'.csv')),row.names=FALSE)
 for (name in names(f)) if(is.numeric(f[[name]])) cat(id,name,'range',range(f[[name]],na.rm=TRUE),'\n')
 cat(id,'CLASS_COUNTS',table(f$sp),'\n')
}
R
