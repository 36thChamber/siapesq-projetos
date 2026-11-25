set -eu
base=/workspace/ste-ocean-daily
release="$base/releases/2026-10-15-all19"
cd "$release/ste"
sudo -u ubuntu "$base/.venv/bin/python" run_predicoes_diarias_ocean.py --models "$release/models.csv" --predictors "$base/releases/2026-10-15/test-inputs/2026-10-12" --outdir "$base/all19-smoke-outputs" --bbox -54 -34 -48 -28 --resolucao .1 --depth-convention negative-ocean --jobs 2 --existentes retomar
