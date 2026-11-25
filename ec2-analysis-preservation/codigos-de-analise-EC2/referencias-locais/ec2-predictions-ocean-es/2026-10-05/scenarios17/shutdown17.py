from pathlib import Path
import datetime,json,os,subprocess
b=Path('/workspace/ocean-es-20261005/scenarios17');c=json.loads((b/'config.json').read_text())
state=json.loads((b/'summary.json').read_text()).get('status') if (b/'summary.json').exists() else None
deadline=datetime.datetime.fromisoformat(c['budget_cutoff_utc'])
if (deadline-datetime.datetime.now(datetime.timezone.utc)).total_seconds()>60 and (state in ['complete','finished_with_failures'] or os.environ.get('SERVICE_RESULT') not in [None,'success']):
    subprocess.run(['/usr/sbin/shutdown','-h','+1','Marine 17-scenario batch finished'])
