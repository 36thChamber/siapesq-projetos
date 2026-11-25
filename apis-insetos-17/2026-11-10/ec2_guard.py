from pathlib import Path
from datetime import datetime,timezone
import time,json,boto3,traceback
B=Path(__file__).resolve().parent;P=B/'ec2_deployment.json';c=boto3.client('ec2',region_name='us-east-1')
while True:
 d=json.loads(P.read_text());deadline=datetime.fromisoformat(d['deadline_utc'])
 if d.get('security_cleanup_verified') and d.get('final_state')=='stopped':print('Cleanup already verified; guard completed',flush=True);break
 if datetime.now(timezone.utc)<deadline:time.sleep(20);continue
 try:
  iid=d['instance_id'];i=c.describe_instances(InstanceIds=[iid])['Reservations'][0]['Instances'][0]
  if i['State']['Name'] in ['running','pending']:c.stop_instances(InstanceIds=[iid])
  c.get_waiter('instance_stopped').wait(InstanceIds=[iid],WaiterConfig={'Delay':5,'MaxAttempts':60})
  sg=c.describe_security_groups(GroupIds=[d['security_group']])['SecurityGroups'][0]
  present=any(r.get('IpProtocol')=='tcp' and r.get('FromPort')==22 and r.get('ToPort')==22 and any(x.get('CidrIp')==d['approved_ingress'] for x in r.get('IpRanges',[])) for r in sg['IpPermissions'])
  if present and d.get('ingress_added'):c.revoke_security_group_ingress(GroupId=d['security_group'],IpPermissions=[{'IpProtocol':'tcp','FromPort':22,'ToPort':22,'IpRanges':[{'CidrIp':d['approved_ingress']}]}])
  c.modify_instance_attribute(InstanceId=iid,InstanceType={'Value':d['restore_type']})
  i=c.describe_instances(InstanceIds=[iid])['Reservations'][0]['Instances'][0];sg=c.describe_security_groups(GroupIds=[d['security_group']])['SecurityGroups'][0]
  assert not any(r.get('IpProtocol')=='tcp' and r.get('FromPort')==22 and r.get('ToPort')==22 and any(x.get('CidrIp')==d['approved_ingress'] for x in r.get('IpRanges',[])) for r in sg['IpPermissions'])
  d=json.loads(P.read_text());d.update(final_state=i['State']['Name'],restored_type=i['InstanceType'],security_cleanup_verified=True,ingress_removed=True,budget_guard_triggered=True,stopped_verified_utc=datetime.now(timezone.utc).isoformat());P.write_text(json.dumps(d,indent=2));print('BUDGET_STOP_AND_CLEANUP_VERIFIED',flush=True);break
 except Exception as e:print(datetime.now(timezone.utc).isoformat(),type(e).__name__,str(e),flush=True);time.sleep(30)
