from pathlib import Path
import hashlib,json,subprocess
out=Path(__file__).resolve().parent
projects=out.parents[1]
s=json.loads((projects/'siapresp-ste-integration/2026-10-15/production/training-summary-s3.json').read_text())
targets={r['source_sha256']:r['species_id'] for r in s['records'] if 'source_sha256' in r}
found={}
for repo in ['models','Modelos-R']:
 path=projects/repo
 entries=subprocess.check_output(['git','-C',str(path),'rev-list','--objects','--all']).decode().splitlines()
 for line in entries:
  obj,_,name=line.partition(' ')
  if not name.lower().endswith('.csv'):continue
  data=subprocess.check_output(['git','-C',str(path),'cat-file','blob',obj])
  key=hashlib.sha256(data).hexdigest()
  if key not in targets:continue
  sid=targets[key];directory=out/'fontes-originais'/sid;directory.mkdir(parents=True,exist_ok=True)
  (directory/'original.csv').write_bytes(data);found[sid]={'repo':repo,'obj':obj,'path':name,'sha256':key}
(out/'fontes-git.json').write_text(json.dumps(found,indent=2))
print(list(found))
