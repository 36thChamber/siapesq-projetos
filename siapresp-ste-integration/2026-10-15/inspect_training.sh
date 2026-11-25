set -eu
root=/workspace/models
cat "$root/scripts/stop_instance_after_success.sh"
systemctl cat siapesq-models-stop-after-success.service
find "$root/oceanincs/engraulis_anchoita" "$root/oceanincs/merluccius_merluccius" -maxdepth 2 -type f -printf '%P %s bytes\n'
"$root/.venv/bin/python" - <<'PY'
import pandas as pd
from pathlib import Path
root=Path('/workspace/models')
for p in root.glob('oceanincs/*/predictor.csv'):
 d=pd.read_csv(p)
 print('TRAINING',p.parent.name,'rows',len(d),'classes',d.sp.value_counts(dropna=False).to_dict(),'depth',pd.to_numeric(d.depth,errors='coerce').agg(['min','max']).to_dict(),'chl',pd.to_numeric(d.CHL,errors='coerce').agg(['min','max']).to_dict())
PY
Rscript - <<'R'
suppressPackageStartupMessages(library(sdm))
p <- '/workspace/models/oceanincs/engraulis_anchoita/engraulis_anchoita_rf.sdm'
m <- sdm::read.sdm(p)
cat('MODEL_SLOTS',slotNames(m),'\n')
if ('data' %in% slotNames(m)) {
 d <- slot(m,'data');cat('DATA_CLASS',class(d),'SLOTS',slotNames(d),'\n')
 for (s in slotNames(d)) {
  x <- slot(d,s);cat('SLOT',s,'class',class(x),'length',length(x),'\n')
  if (is.data.frame(x)) cat('COLUMNS',names(x),'NROWS',nrow(x),'\n')
 }
}
R
