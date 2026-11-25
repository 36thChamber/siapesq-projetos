set -eu
base=/workspace/ste-ocean-daily
if test -f "$base/logs/install-dependencies.log"; then tail -5 "$base/logs/install-dependencies.log"; fi
systemctl show siapresp-ste-test.service -p Result -p ExecMainStatus -p ActiveState
