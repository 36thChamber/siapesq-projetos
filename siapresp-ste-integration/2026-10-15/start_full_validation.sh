set -eu
base=/workspace/ste-ocean-daily
python3 - <<'PY'
from pathlib import Path
import json
root=Path('/workspace/ste-ocean-daily')
for kind in ['antigos','novos']:
 d=json.loads((root/'ops'/f'backup-{kind}.json').read_text());assert d['status']=='complete' and d['model_count']==19
p=root/'all19-smoke-outputs/2026-10-12/run_summary.json';d=json.loads(p.read_text())
assert d['expected']==19 and len(d['records'])==19 and all(r['status']=='complete' for r in d['records'])
print('19/19 modelos e backups prontos')
PY
test "$(systemctl show siapesq-models-daily.service -p ActiveState --value)" = inactive
systemctl cat siapesq-models-daily.service > "$base/ops/legacy-service-before-ste.txt"
systemctl stop siapesq-models-daily.timer
systemctl start --no-block siapresp-ste-all19-validation.service
systemctl show siapresp-ste-all19-validation.service -p ActiveState -p Result
