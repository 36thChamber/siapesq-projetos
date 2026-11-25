import json, subprocess
args=['aws','cloudtrail','lookup-events','--region','sa-east-1','--lookup-attributes','AttributeKey=EventName,AttributeValue=StartInstances','--start-time','2026-11-10T16:40:00Z','--end-time','2026-11-10T17:00:00Z','--max-results','10','--output','json','--no-cli-pager']
r=subprocess.run(args,capture_output=True,text=True)
if r.returncode:
 print(r.stderr); raise SystemExit(r.returncode)
out=[]
for item in json.loads(r.stdout).get('Events',[]):
 e=json.loads(item['CloudTrailEvent'])
 out.append({'time':e.get('eventTime'),'identity_type':e.get('userIdentity',{}).get('type'),'invoked_by':e.get('userIdentity',{}).get('invokedBy'),'user_agent':e.get('userAgent'),'instances':[x.get('instanceId') for x in e.get('requestParameters',{}).get('instancesSet',{}).get('items',[])]})
print(json.dumps(out,indent=2))