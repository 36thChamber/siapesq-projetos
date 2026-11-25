set -eu
systemctl cat siapesq-models-daily.service
systemctl cat siapesq-models-daily.timer
find /workspace/models -maxdepth 4 -name '*.sdm' -printf '%P %s bytes\n'
python3 - <<'PY'
from pathlib import Path
p=Path('/workspace/models/scripts/run_daily.sh')
print('RUNNER',p.stat().st_size)
for line in p.read_text().splitlines():
 if 'cleanup' in line or 'STOP' in line or 'last-successful' in line: print(line)
for p in Path('/workspace/models/scripts').glob('*stop*'):print('STOP_SCRIPT',p)
for p in Path('/etc/systemd/system/siapesq-models-daily.service.d').glob('*'):
 print('DROPIN',p.name);print(p.read_text())
PY
/workspace/models/.venv/bin/python -c 'import boto3; print("boto3 available")'
