set -eu
systemctl show siapresp-ste-all19-validation.service -p ActiveState -p Result -p ExecMainStatus -p MemoryCurrent
journalctl -u siapresp-ste-all19-validation.service -n 6 --no-pager
python3 - <<'PY'
from pathlib import Path
import json
root=Path('/workspace/models')
link=root/'data/daily/current'
if link.is_dir():
 p=link/'manifest.json';day=json.loads(p.read_text())['data_date'];print('INPUT_DATE',day)
 p=root/'outputs'/day/'run_summary.json'
 if p.exists():
  d=json.loads(p.read_text());print('PROGRESS',len(d['records']),d.get('expected'),{r['status'] for r in d['records']})
base=Path('/workspace/ste-ocean-daily')
for p in sorted((base/'ops').glob('publication-*.json'))[-1:]:
 d=json.loads(p.read_text());print('PUBLICATION',p.name,d['status'],d['species_count'],len(d['predictions']['files']))
PY
