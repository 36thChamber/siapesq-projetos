from pathlib import Path
import datetime, json, subprocess, time, traceback
import boto3

BASE = Path('/workspace/rerun-20260930')
RS = Path('/workspace/exclusive-20261002')
CFG = json.loads((BASE / 'config.json').read_text())

def active(service):
    return subprocess.run(['systemctl', 'is-active', '--quiet', service]).returncode == 0

try:
    while active('predictions-exclusive.service'):
        time.sleep(15)
    summary = json.loads((RS / 'summary.json').read_text())
    assert summary['status'] == 'complete' and summary['failures'] == 0
    assert len(summary['records']) == 68
    assert len({(r['species'], r['scenario']) for r in summary['records']}) == 68
    now = datetime.datetime.now(datetime.timezone.utc)
    assert now < datetime.datetime.fromisoformat(CFG['budget_cutoff_utc']) - datetime.timedelta(minutes=10)
    s3 = boto3.client('s3', region_name=CFG['output_region'])
    rs_cfg = json.loads((RS / 'config.json').read_text())
    count = sum(x['Key'].endswith('/complete.json')
                for p in s3.get_paginator('list_objects_v2').paginate(Bucket=CFG['bucket'], Prefix=rs_cfg['prefix'] + '/')
                for x in p.get('Contents', []))
    assert count == 68
    state = {'status': 'starting_common6_after_rs4', 'started_utc': now.isoformat(),
             'completed_priority_scenarios': count, 'next_species': [s['species'] for s in CFG['species']],
             'budget_cutoff_utc': CFG['budget_cutoff_utc']}
    (BASE / 'resume_transition.json').write_text(json.dumps(state, indent=2))
    s3.put_object(Bucket=CFG['bucket'], Key=CFG['prefix'] + '/_run/resume_transition.json',
                  Body=json.dumps(state, indent=2).encode(), ContentType='application/json')
    subprocess.run(['systemctl', 'start', 'predictions-rerun.service'], check=True)
    assert active('predictions-rerun.service')
    (RS / 'resume_pending').unlink(missing_ok=True)
    print(json.dumps(state), flush=True)
except Exception:
    traceback.print_exc()
    (RS / 'resume_pending').unlink(missing_ok=True)
    if not active('predictions-exclusive.service'):
        subprocess.run(['/usr/sbin/shutdown', '-h', '+1', 'Common6 continuation failed preflight'])
    raise
