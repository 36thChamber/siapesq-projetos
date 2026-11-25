set -eu
python3 - <<'PY'
from pathlib import Path
import re,json
root=Path('/workspace/models')
for name in ['config/species.csv','scripts/run_daily.sh']:
 print('FILE',name)
 for line in (root/name).read_text().splitlines():
  if re.search(r'(PASSWORD|SECRET|TOKEN|ACCESS_KEY)\s*=',line,re.I):print('[sensitive assignment omitted]')
  else:print(line)
print('daily dirs:',[p.name for p in (root/'data/daily').iterdir() if p.is_dir()][-10:])
print('env keys:',[line.split('=',1)[0] for line in Path('/etc/siapesq-models.env').read_text().splitlines() if '=' in line and not line.startswith('#')])
for p in (root/'oceanincs').glob('*/predictor.csv'):
 with p.open() as f:print('CSV',p.parent.name,f.readline().strip())
PY
/workspace/models/.venv/bin/python -c 'import importlib.metadata as m; print({n:m.version(n) for n in ["numpy","pandas","xarray","netCDF4","copernicusmarine"]})'
