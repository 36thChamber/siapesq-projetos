set -eu
base=/workspace/ste-ocean-daily
cd "$base/current/ste"
sudo -u ubuntu "$base/.venv/bin/python" -W ignore -m unittest discover -s tests -p test_daily_ocean.py -v
"$base/.venv/bin/python" - <<'PY'
from pathlib import Path
import json,hashlib,rasterio,numpy as np
base=Path('/workspace/ste-ocean-daily')
local=json.loads((base/'current/local-audit.json').read_text())
folder=base/'test-outputs/2026-10-12/pomatomus_saltatrix'
summary=json.loads((folder.parent/'run_summary.json').read_text())
print('REMOTE_TEST_SUMMARY',json.dumps(summary))
result={}
for product in ['mean','sd','extrapolacao']:
 p=folder/f'pomatomus_saltatrix_rf_2026-10-12_{product}.tif'
 with rasterio.open(p) as r:
  a=r.read(1,masked=True);v=a.compressed();assert a.count()==1795
  assert np.isfinite(v).all() and v.min()>=0 and v.max()<=1
 result[product]={'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest(),'matches_local_bytes':hashlib.file_digest(p.open('rb'),'sha256').hexdigest()==local['products'][product]['sha256'],'valid_cells':int(a.count())}
assert all(item['matches_local_bytes'] for item in result.values())
(base/'remote-test-verification.json').write_text(json.dumps(result,indent=2))
print('REMOTE_TIFFS',json.dumps(result))
print('PRODUCTION_RUNNER_SHA256',hashlib.file_digest(Path('/workspace/models/scripts/run_daily.sh').open('rb'),'sha256').hexdigest())
PY
systemctl show siapresp-ste-shadow.service -p LoadState -p ActiveState -p Result -p ExecMainStatus
journalctl -u siapresp-ste-shadow.service -n 12 --no-pager
