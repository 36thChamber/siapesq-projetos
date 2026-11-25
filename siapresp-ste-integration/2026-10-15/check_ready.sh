set -eu
python3 - <<'PY'
from pathlib import Path
import json,csv
base=Path('/workspace/ste-ocean-daily');root=base/'releases/2026-10-15-all19'
with (root/'models.csv').open() as f:rows=list(csv.DictReader(f))
print('MODELS',len(rows))
p=base/'all19-smoke-outputs/2026-10-12/run_summary.json'
if p.exists():
 d=json.loads(p.read_text());print('SMOKE',d['expected'],len(d['records']),{r['status'] for r in d['records']})
p=base/'ops/backup-novos.json'
if p.exists():
 d=json.loads(p.read_text());print('NEW_BACKUP',d['prefix'],d['model_count'])
PY
