from pathlib import Path
import re,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ingress import API,s
i=(Path(__file__).parent/'phyto-worker-id').read_text()
d=s.get(API+'deployment.allByCompose',params={'composeId':i}).json()[0]
print('build',d['status'])
t=s.get(API+'deployment.readLogs',params={'deploymentId':d['deploymentId'],'tail':25}).json()
for line in t.splitlines()[-10:]:
 if any(w in line.lower() for w in ['error','conflict','resolutionimpossible','failed','starting','started','built','incompatible','depends on','because','installing','collecting','downloading','pulled','exporting','transferring']):
  print(re.sub(r'https?://\S+','[URL]',line)[:230])
print([(x['name'],x['state']) for x in s.get(API+'docker.getContainers').json() if 'phyto-worker' in x['name']])
