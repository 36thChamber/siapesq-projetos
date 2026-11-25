set -eu
base=/workspace/ste-ocean-daily
release="$base/releases/2026-10-15"
mkdir -p "$release" "$base/logs"
aws s3 cp s3://example-bucket/_deploy/siapresp-ste/2026-10-15/ec2-release.tar.gz /tmp/siapresp-ste-20261015.tar.gz --region sa-east-1 --only-show-errors
echo '7e947729c7c3170f3ad49186377967f5d54a492f1a895d11ce041a09cc7fefea  /tmp/siapresp-ste-20261015.tar.gz' | sha256sum -c -
tar -xzf /tmp/siapresp-ste-20261015.tar.gz -C "$release"
python3 -m venv "$base/.venv"
"$base/.venv/bin/pip" install -r "$release/requirements-tested.txt" > "$base/logs/install-dependencies.log" 2>&1
ln -sfn "$release" "$base/current"
ln -sfn "$base/.venv" "$release/ste/.venv"
cat > "$release/models.csv" <<'CSV'
species,species_id,profile,model_dir
Pomatomus saltatrix,pomatomus_saltatrix,peixes_marinhos,model_run/modelo_rf_marinho
CSV
mkdir -p "$base/bin"
cat > "$base/bin/run_test.sh" <<'RUN'
#!/usr/bin/env bash
set -Eeuo pipefail
base=/workspace/ste-ocean-daily
exec "$base/.venv/bin/python" "$base/current/ste/run_predicoes_diarias_ocean.py" \
 --models "$base/current/models.csv" \
 --predictors "$base/current/test-inputs/2026-10-12" \
 --outdir "$base/test-outputs" --bbox -54 -34 -48 -28 \
 --resolucao 0.1 --depth-convention negative-ocean --jobs 2 --existentes retomar
RUN
chmod 750 "$base/bin/run_test.sh"
cat > /etc/systemd/system/siapresp-ste-test.service <<'UNIT'
[Unit]
Description=SIAPRESP STE ocean integration validation (one species, fixed real daily inputs)
After=network-online.target
[Service]
Type=oneshot
User=ubuntu
Group=ubuntu
WorkingDirectory=/workspace/ste-ocean-daily/current/ste
ExecStart=/workspace/ste-ocean-daily/bin/run_test.sh
TimeoutStartSec=15min
UMask=0027
NoNewPrivileges=true
PrivateTmp=true
MemoryMax=4G
CPUQuota=200%
UNIT
chown -R ubuntu:ubuntu "$base"
systemctl daemon-reload
systemctl start siapresp-ste-test.service
systemctl show siapresp-ste-test.service -p Result -p ExecMainStatus -p ActiveState
journalctl -u siapresp-ste-test.service -n 10 --no-pager
