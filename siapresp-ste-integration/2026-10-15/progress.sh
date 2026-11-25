set -eu
base=/workspace/ste-ocean-daily
if test -f "$base/releases/2026-10-15-all19/training-summary.json"; then
python3 - <<'PY'
from pathlib import Path
import json
p=Path('/workspace/ste-ocean-daily/releases/2026-10-15-all19/training-summary.json')
d=json.loads(p.read_text());print(json.dumps(d))
PY
fi
tail -4 "$base/logs/train-all19.log"
