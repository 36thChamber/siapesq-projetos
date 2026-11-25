set -eu
systemctl show siapesq-models-daily.service -p FragmentPath -p ExecStart -p ActiveState -p User
systemctl list-timers --all --no-pager | head -18
find /opt /home/ubuntu -maxdepth 4 -name run_daily.sh -o -name species.csv -o -name run_daily.R 2>/dev/null
ls /opt
python3 --version
df -h /
python3 - <<'PY'
from pathlib import Path
p=Path('/etc/siapesq-models.env')
if p.exists():
 for line in p.read_text().splitlines():
  if '=' in line and line.split('=',1)[0].strip() in {'MODELS_PROJECT_ROOT','STATIC_DEPTH_FILE','S3_OUTPUT_URI','SDM_MIN_LONGITUDE','SDM_MAX_LONGITUDE','SDM_MIN_LATITUDE','SDM_MAX_LATITUDE','DOWNLOAD_PREDICTORS'}:
   print(line)
PY
