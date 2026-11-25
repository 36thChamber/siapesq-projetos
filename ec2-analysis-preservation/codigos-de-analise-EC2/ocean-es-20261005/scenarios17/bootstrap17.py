from pathlib import Path
import json,hashlib,subprocess,os
b=Path('/workspace/ocean-es-20261005/scenarios17');repo=b.parent/'repo';py=str(b.parent/'.venv/bin/python')
cfg=json.loads((b/'config.json').read_text())
try:
    manifest=json.loads((b/'repo_manifest.json').read_text())
    assert all(hashlib.sha256((repo/p).read_bytes()).hexdigest()==h for p,h in manifest.items())
    subprocess.run([py,'-m','pip','install','--quiet','gcsfs==2026.8.1','zarr==3.3.0','cftime==1.6.5'],check=True)
    with (b/'tests.log').open('w') as log:
        for test in ['test_marine_scenarios.py','test_marine_export_metrics.py','test_pipeline_profiles_balance.py','test_prediction_resume.py']:
            subprocess.run([py,'-m','unittest','discover','-s','tests','-p',test],cwd=repo,stdout=log,stderr=subprocess.STDOUT,check=True)
    unit='''[Unit]
Description=17 marine scenarios for four ES species; original budget deadline
After=network-online.target
[Service]
Type=exec
User=ubuntu
WorkingDirectory=/workspace/ocean-es-20261005/scenarios17
Environment=OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 MPLBACKEND=Agg
ExecStart=/workspace/ocean-es-20261005/.venv/bin/python -u /workspace/ocean-es-20261005/scenarios17/run17.py
ExecStopPost=+/usr/bin/python3 /workspace/ocean-es-20261005/scenarios17/shutdown17.py
TimeoutStopSec=120
StandardOutput=append:/workspace/ocean-es-20261005/scenarios17/run.log
StandardError=append:/workspace/ocean-es-20261005/scenarios17/run.log
'''
    Path('/etc/systemd/system/predictions-ocean-es-scenarios.service').write_text(unit)
    subprocess.run(['chown','-R','ubuntu:ubuntu',str(b)],check=True)
    subprocess.run(['systemctl','daemon-reload'],check=True);subprocess.run(['systemctl','start','predictions-ocean-es-scenarios.service'],check=True)
    print('MARINE_17_SCENARIOS_STARTED',flush=True)
except Exception:
    subprocess.run(['/usr/sbin/shutdown','-h','+1','Marine scenario preparation failed']);raise
