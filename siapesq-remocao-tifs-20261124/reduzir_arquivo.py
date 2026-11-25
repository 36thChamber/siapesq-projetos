import io,os,json,tarfile,hashlib,tempfile
from pathlib import Path
a=Path.home()/'projects/ec2-prediction-benchmark/2026-09-27/results.tar.gz'
known=json.load(open('candidatos.json')); targets={k:v for k,v in known.items() if not v['is_catalog']}; pid=a.stat()
def sig(i):return [i.name,i.type.decode(),i.size,i.mode,i.uid,i.gid,i.uname,i.gname,i.mtime,i.linkname,i.pax_headers]
def parse(path, dest=None):
 kept=[];removed=[]
 with tarfile.open(path,'r:gz') as f:
  for i in f:
   payload=f.extractfile(i).read() if i.isfile() else None
   digest=hashlib.sha256(payload).hexdigest() if payload is not None else None
   if digest in targets and Path(i.name).name in targets[digest]['names']:
    removed.append((i.name,digest));continue
   kept.append((sig(i),digest))
   if dest:dest.addfile(i,io.BytesIO(payload) if payload is not None else None)
 return kept,removed
fd,name=tempfile.mkstemp(dir=a.parent,prefix='.results-em-limpeza-',suffix='.tar.gz');os.close(fd);tmp=Path(name)
try:
 with tarfile.open(tmp,'w:gz',compresslevel=3) as f:kept,removed=parse(a,f)
 assert len(removed)==6 and len(kept)>=3 and parse(tmp)==(kept,[])
 cur=a.stat();assert (pid.st_ino,pid.st_size,pid.st_mtime_ns)==(cur.st_ino,cur.st_size,cur.st_mtime_ns)
 os.chmod(tmp,pid.st_mode & 0o777)
 with tmp.open('rb') as f:os.fsync(f.fileno())
 os.replace(tmp,a);assert parse(a)==(kept,[])
 json.dump({'arquivo':str(a),'removidos':removed,'preservados':len(kept)},open('tar-verificado.json','w'))
 print('TIFFs antigos retirados do TAR',len(removed),'entradas preservadas',len(kept))
finally:tmp.unlink(missing_ok=True)
