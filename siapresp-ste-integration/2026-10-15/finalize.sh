set -eu
base=/workspace/ste-ocean-daily
cat > "$base/README.md" <<'DOC'
# STE ocean daily integration on SIAPRESP-ofc

Installed 2026-10-15 in an isolated Python environment and release directory.

Validated model: Pomatomus saltatrix (anchova), 500-tree STE ocean RF.
Scope: bbox W=-54, S=-34, E=-48, N=-28; 0.1 degree output grid.
Other 18 configured production species/groups remain in the legacy workflow.
No primary service, timer, model, credentials or publisher was replaced.
No new periodic timer is enabled; the two new units are manual oneshot services.

Run recent daily inputs and write separate shadow outputs:

    sudo systemctl start siapresp-ste-shadow.service
    journalctl -u siapresp-ste-shadow.service --no-pager

Repeat the fixed real 2026-10-12 integration fixture:

    sudo systemctl start siapresp-ste-test.service

Artifacts:

- current/ste: framework code
- current/model_run: validated trained model and metadata
- shadow-outputs/YYYY-MM-DD/pomatomus_saltatrix: mean/sd/extrapolacao + hashes
- remote-test-verification.json: exact byte agreement with local TIFFs
- remote-live-verification.json: recent-date readback and hashes

The shadow service uses existing Copernicus credentials from the systemd
EnvironmentFile, separate inputs/outputs, and does not publish to S3.
The sd represents dispersion between trees, not the legacy bootstrap uncertainty.
The 22.95% depth extrapolation in this test area requires scientific review.
To complete production migration: inventory/train/validate the remaining species,
compare methods, and switch publication/scheduling with model version labels.
DOC
chown ubuntu:ubuntu "$base/README.md"
rm -f /tmp/siapresp-ste-20261015.tar.gz
systemctl is-enabled siapesq-models-daily.timer
systemctl show siapesq-models-daily.service -p ActiveState
systemctl show siapresp-ste-shadow.service -p ActiveState -p Result -p ExecMainStatus
sha256sum /workspace/models/scripts/run_daily.sh
