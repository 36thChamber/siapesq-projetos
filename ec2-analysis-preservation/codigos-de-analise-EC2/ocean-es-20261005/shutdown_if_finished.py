from pathlib import Path
import os,json,subprocess
BASE=Path('/workspace/ocean-es-20261005')
if (BASE/'resume_pending').exists():raise SystemExit(0)
state=json.loads((BASE/'summary.json').read_text()).get('status') if (BASE/'summary.json').exists() else None
if state in ['complete','finished_with_failures'] or os.environ.get('SERVICE_RESULT') not in [None,'success']:
    subprocess.run(['/usr/sbin/shutdown','-h','+1','Ocean ES annual predictions finished'])
