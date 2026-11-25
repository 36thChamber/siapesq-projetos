set -eu
base=/workspace/ste-ocean-daily
cat > "$base/bin/run_shadow_daily.sh" <<'RUN'
#!/usr/bin/env bash
set -Eeuo pipefail
base=/workspace/ste-ocean-daily
release="$base/current"
mkdir -p "$base/daily-inputs" "$base/shadow-outputs"
exec 9>"$base/daily-shadow.lock"
flock -n 9 || { echo 'STE shadow execution already running'; exit 1; }
# Reads the existing Copernicus credentials through systemd EnvironmentFile.
# Uses separate inputs/outputs and never invokes the production S3 publisher.
"/workspace/models/.venv/bin/python" "$release/siapresp/scripts/download_daily_predictors.py" \
 --output-root "$base/daily-inputs" --depth-file "$STATIC_DEPTH_FILE" \
 --min-longitude -54.2 --max-longitude -47.8 --min-latitude -34.2 --max-latitude -27.8 \
 --target-date auto --retries 1 --lookback-days 4
"$base/.venv/bin/python" "$release/ste/run_predicoes_diarias_ocean.py" \
 --models "$release/models.csv" --predictors "$base/daily-inputs/current" \
 --outdir "$base/shadow-outputs" --bbox -54 -34 -48 -28 \
 --resolucao 0.1 --depth-convention negative-ocean --jobs 2 --existentes retomar
RUN
chmod 750 "$base/bin/run_shadow_daily.sh"
chown ubuntu:ubuntu "$base/bin/run_shadow_daily.sh"
cat > /etc/systemd/system/siapresp-ste-shadow.service <<'UNIT'
[Unit]
Description=SIAPRESP STE shadow daily prediction (anchova, limited South coast area, no S3 publication)
Wants=network-online.target
After=network-online.target
[Service]
Type=oneshot
User=ubuntu
Group=ubuntu
WorkingDirectory=/workspace/ste-ocean-daily/current/ste
EnvironmentFile=/etc/siapesq-models.env
ExecStart=/workspace/ste-ocean-daily/bin/run_shadow_daily.sh
TimeoutStartSec=30min
UMask=0027
NoNewPrivileges=true
PrivateTmp=true
MemoryMax=4G
CPUQuota=200%
UNIT
systemctl daemon-reload
systemctl start --no-block siapresp-ste-shadow.service
systemctl show siapresp-ste-shadow.service -p LoadState -p ActiveState -p Result
