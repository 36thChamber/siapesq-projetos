set -eu
python3 - <<'PY'
from pathlib import Path
for line in Path('/etc/siapesq-models.env').read_text().splitlines():
 if '=' in line and line.split('=',1)[0] in {'STOP_EC2_AFTER_SUCCESS','EC2_STOP_DELAY_SECONDS'}:print(line)
PY
systemctl show siapesq-models-daily.service -p ActiveState
systemctl show siapresp-ste-all19-validation.service -p ActiveState
