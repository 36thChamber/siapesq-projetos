set -eu
base=/workspace/ste-ocean-daily
test "$(systemctl show siapresp-ste-all19-validation.service -p ActiveState --value)" = inactive
test "$(systemctl show siapresp-ste-all19-validation.service -p Result --value)" = success
test "$(systemctl show siapresp-ste-all19-validation.service -p ExecMainStatus --value)" = 0
python3 - <<'PY'
from pathlib import Path
import json
base=Path('/workspace/ste-ocean-daily');marker=Path('/workspace/models/data/last-successful-s3-run')
s=marker.read_text();assert all(k in s.splitlines() for k in ['predictors=verified','predictions=verified','models_antigos=verified','models_novos=verified','species_count=19'])
day=next(line.split('=',1)[1] for line in s.splitlines() if line.startswith('date='))
d=json.loads((base/'ops'/f'publication-{day}.json').read_text());assert d['status']=='verified' and d['species_count']==19
for kind in ['antigos','novos']:
 d=json.loads((base/'ops'/f'backup-{kind}.json').read_text());assert d['model_count']==19 and d['status']=='complete'
print('VALIDATED_DATE',day)
PY
mkdir -p /etc/systemd/system/siapesq-models-daily.service.d
cat > /etc/systemd/system/siapesq-models-daily.service.d/ste.conf <<'UNIT'
[Unit]
Description=SIAPRESP daily STE ocean RF predictions for all 19 species/groups
[Service]
ExecStart=
ExecStart=/workspace/ste-ocean-daily/ops/run_daily_all19.sh
MemoryMax=10G
CPUQuota=250%
Environment=OMP_NUM_THREADS=2
Environment=OPENBLAS_NUM_THREADS=1
UNIT
cat > "$base/ops/rollback_to_legacy.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
if systemctl is-active --quiet siapesq-models-daily.service; then
 echo 'Espere a rotina ativa terminar antes de reverter.'; exit 1
fi
rm -f /etc/systemd/system/siapesq-models-daily.service.d/ste.conf
systemctl daemon-reload
systemctl start siapesq-models-daily.timer
echo 'Execução original restaurada; modelos antigos preservados.'
ROLLBACK
chmod 750 "$base/ops/rollback_to_legacy.sh"
systemctl daemon-reload
systemctl start siapesq-models-daily.timer
systemctl show siapesq-models-daily.service -p ExecStart -p OnSuccess
systemctl is-enabled siapesq-models-daily.timer
systemctl list-timers siapesq-models-daily.timer --no-pager
