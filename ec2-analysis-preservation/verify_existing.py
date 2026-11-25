import tarfile,io,boto3,json,pathlib,hashlib
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
s=boto3.client('s3',region_name='sa-east-1');b='example-bucket';base=pathlib.Path(__file__).parent;records=[]
for f in sorted(base.glob('s3-*.complete.json')):
 doc=json.loads(f.read_text());files={x['name']:x for x in doc['files']}
 pref=doc['prefix'].rstrip('/')+'/'; pg=s.get_paginator('list_objects_v2');objs={i['Key'][len(pref):]:i['Size'] for page in pg.paginate(Bucket=b,Prefix=pref) for i in page.get('Contents',[])}
 assert all(objs.get(n)==v['bytes'] for n,v in files.items())
 assert doc['model_count']==19
 for n,v in files.items():
  if pathlib.PurePosixPath(n).suffix.lower() in ('.sh','.py','.r','.rmd','.yaml','.yml','.toml','.service','.timer','.json','.txt') and v['bytes']<8*1024**2:
   records.append((doc['kind'],pref,n,v['sha256']))
def read(t):
 kind,p,n,h=t
 k=pathlib.PurePosixPath(n)
 assert not k.is_absolute() and '..' not in k.parts
 data=s.get_object(Bucket=b,Key=p+n)['Body'].read()
 assert hashlib.sha256(data).hexdigest()==h
 return kind+'/'+n,data,h
with tarfile.open(base/'fontes-modelos-s3.tar.gz','w:gz') as tar,ThreadPoolExecutor(6) as e:
 manifest={}
 for name,buf,h in e.map(read,records):
  ti=tarfile.TarInfo(name);ti.size=len(buf);ti.mode=0o600;tar.addfile(ti,io.BytesIO(buf)); manifest[name]=h
with tarfile.open(base/'fontes-modelos-s3.tar.gz','r:gz') as tar:assert {i.name:hashlib.file_digest(tar.extractfile(i),'sha256').hexdigest() for i in tar}==manifest
(base/'fontes-modelos-s3.sha256.json').write_text(json.dumps(manifest,indent=2))
print('checked',len(manifest),'source/configuration files;',len(files),'objects in last manifest')
