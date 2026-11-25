from pathlib import Path
import json,hashlib,tarfile,os,shutil
D=Path('/workspace/acolite-operational-20261110');S=Path('/workspace/.local/state/acolite')
v=json.loads((D/'evidence/final-verification.json').read_text());assert len(v['s3_objects'])==15 and all(r['matches_manifest'] for r in v['s3_objects'])
outcome=v['outcome'];pub=Path(outcome['manifest']).parent.resolve();assert pub.parent==S.resolve() and pub.name.startswith('publication.')
proof=json.loads(Path(outcome['manifest']).read_text());entries=[e for scene in proof['scenes'] for e in scene['products']]
keep={(pub/e['path']).resolve() for e in entries};files={}
for p in pub.rglob('*'):
 if p.is_symlink():raise RuntimeError('Unexpected symlink')
 if p.is_file():files['publication/'+str(p.relative_to(pub))]=p
for e in entries:
 p=D/'release/out'/e['key'];assert p.is_file();files['out/'+e['key']]=p
for rid in [165,541,542]:
 r=json.loads((D/'evidence'/f'calibration-{rid}.json').read_text())
 for e in r['files']:
  p=(D/'release'/e['path']).resolve();assert p.is_relative_to((D/'release/tmp/netcdf'/str(rid)).resolve());files['selected/'+str(p.relative_to(D/'release/tmp/netcdf'))]=p

def sha(stream):
 h=hashlib.sha256()
 while x:=stream.read(1024*1024):h.update(x)
 return h.hexdigest()
hashes={name:sha(p.open('rb')) for name,p in files.items()}
archive=D/'archives';archive.mkdir(exist_ok=True,mode=0o700);dst=archive/(proof['run_id']+'.tar.gz');assert not dst.exists()
partial=dst.with_suffix('.partial');seen={}
with tarfile.open(partial,'w:gz',compresslevel=1) as t:
 for name,p in sorted(files.items()):
  info=t.gettarinfo(str(p),arcname=name);h=hashes[name]
  if h in seen:
   info.type=tarfile.LNKTYPE;info.linkname=seen[h];info.size=0;t.addfile(info)
  else:
   with p.open('rb') as f:t.addfile(info,f)
   seen[h]=name
os.replace(partial,dst)
checked={}
with tarfile.open(dst,'r:gz') as t:
 for m in t:
  if m.isfile() or m.islnk():
   with t.extractfile(m) as f:checked[m.name]=sha(f)
assert checked==hashes,'Archive differs; originals preserved'
removed=[]
for name,p in files.items():
 if p.resolve() in keep or p.suffix=='.json':continue
 with p.open('rb') as f:assert sha(f)==hashes[name],'File changed; preserve remaining originals'
 p.unlink();removed.append(name)
report={'archive':str(dst),'sha256':sha(dst.open('rb')),'archive_bytes':dst.stat().st_size,'files_verified':len(hashes),'removed_copies':removed,'file_hashes':hashes,'restore_targets':{'publication':str(pub),'out':str(D/'release/out'),'selected':str(D/'release/tmp/netcdf')},'live_final_products_preserved':len(keep),'free_bytes':shutil.disk_usage(D).free}
(D/'evidence/operational-archive.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['archive','sha256','archive_bytes','files_verified','live_final_products_preserved','free_bytes']},indent=2))
print('Removed archived copies/intermediates:',len(removed))