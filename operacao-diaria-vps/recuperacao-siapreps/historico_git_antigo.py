from pathlib import Path
import json,hashlib,subprocess
base=Path(__file__).resolve().parent
repo='/tmp/siapreps-antigo-modelos'
snap=next(base.parents[1].glob('ec2-analysis-preserv*/s3-antigos.complete.json'))
expected={i['bytes']:i for i in json.loads(snap.read_text())['files'] if i['name'].endswith(('.sdm','.csv'))}
tree={}
for commit in subprocess.check_output(['git','-C',repo,'rev-list','--all']).decode().splitlines():
    result=subprocess.check_output(['git','-C',repo,'ls-tree','-r',commit]).decode()
    for line in result.splitlines():
        obj, path=line.split('\t',1);mode,kind,sha=obj.split()
        if kind=='blob' and path.lower().endswith(('.sdm','.csv','.joblib')):
            tree[sha]={'path':path}
results=[]
for sha,r in tree.items():
    raw=subprocess.check_output(['git','-C',repo,'cat-file','blob',sha])
    h=hashlib.sha256(raw).hexdigest()
    if raw.startswith(b'version https://git-lfs'):h=next(l[11:] for l in raw.decode().splitlines() if l.startswith('oid sha256:'))
    for wanted in expected.values():
        if wanted['sha256']==h:results.append({'name':wanted['name'],'gitpath':r['path'],'sha256':h})
(base/'registro-SIAPESQ-MODELOS.json').write_text(json.dumps({'commits':10,'entradas_candidatas':len(tree),'coincidencias':results},indent=2))
print(results)
