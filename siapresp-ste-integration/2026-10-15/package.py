from pathlib import Path
import tarfile,json,hashlib
root=Path('/workspace/siapresp-ste-integration')
old=root/'2026-10-14';new=root/'2026-10-15'
with tarfile.open(old/'siapresp-ste-diario.tar.gz') as source,tarfile.open(new/'ec2-release.tar.gz','w:gz') as target:
 for member in source.getmembers():
  if member.name.startswith(('ste/','siapresp/')) or member.name=='requirements-tested.txt':
   target.addfile(member,source.extractfile(member) if member.isfile() else None)
 target.add(old/'local-real/model_run',arcname='model_run')
 target.add(old/'local-real/daily/2026-10-12',arcname='test-inputs/2026-10-12')
 target.add(old/'local-real/audit.json',arcname='local-audit.json')
print(json.dumps({'bytes':(new/'ec2-release.tar.gz').stat().st_size,'sha256':hashlib.file_digest((new/'ec2-release.tar.gz').open('rb'),'sha256').hexdigest()}))
