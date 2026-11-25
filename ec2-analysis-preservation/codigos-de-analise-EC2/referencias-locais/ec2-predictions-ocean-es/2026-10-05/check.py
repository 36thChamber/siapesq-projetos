from pathlib import Path
import json,subprocess,sys
BASE=Path(__file__).resolve().parent
if '--remote' in sys.argv:
    deployment=json.loads((BASE/'deployment.json').read_text())
    command='systemctl status predictions-ocean-es.service --no-pager; tail -n 25 /workspace/ocean-es-20261005/run.log'
    raise SystemExit(subprocess.run(deployment['ssh']+[command]).returncode)
path=BASE/'progress.json'
print(path.read_text() if path.exists() else 'Preparação em andamento; consulte launch.log.')
