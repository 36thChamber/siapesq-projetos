import json,os,subprocess
from pathlib import Path
base=Path('/workspace/exclusive-20261002')
if (base/'resume_pending').exists():
    raise SystemExit(0)
status=json.loads((base/'summary.json').read_text()).get('status') if (base/'summary.json').exists() else None
if status in ['complete','finished_with_failures'] or os.environ.get('SERVICE_RESULT') not in [None,'success']:
    subprocess.run(['/usr/sbin/shutdown','-h','+1','Exclusive species batch finished'])
