from pathlib import Path
import json,os,subprocess,sys,time
import boto3
BASE=Path(__file__).resolve().parent
while not (BASE/'config.json').exists():
    try:os.kill(3049,0)
    except ProcessLookupError:raise RuntimeError('Input preparation ended without config.json; inspect prepare.log')
    time.sleep(20)
subprocess.run([sys.executable,str(BASE/'deploy.py')],check=True)
with (BASE/'finalization.log').open('a') as log:
    watcher=subprocess.Popen([sys.executable,'-u',str(BASE/'finalize.py')],stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
(BASE/'finalization.pid').write_text(str(watcher.pid))
d=json.loads((BASE/'deployment.json').read_text());ssh=d['ssh'];remote=d['remote_root']
for attempt in range(120):
    check=subprocess.run(ssh+['systemctl is-active predictions-ocean-es.service; systemctl show ocean-es-bootstrap.service -p ActiveState -p Result; tail -n 5 '+remote+'/bootstrap.log'],capture_output=True,text=True)
    print(check.stdout,flush=True)
    if check.stdout.splitlines() and check.stdout.splitlines()[0]=='active':
        d['status']='running';(BASE/'deployment.json').write_text(json.dumps(d,indent=2))
        print('PREDICTIONS_RUNNING',flush=True);break
    if 'ActiveState=failed' in check.stdout:
        raise RuntimeError('Bootstrap failed; shutdown is scheduled. Inspect bootstrap.log')
    time.sleep(20)
else:
    boto3.client('ec2',region_name='us-east-1').stop_instances(InstanceIds=[d['instance_id']])
    raise RuntimeError('Bootstrap did not launch predictions within 40 minutes; stopped to save credits')
