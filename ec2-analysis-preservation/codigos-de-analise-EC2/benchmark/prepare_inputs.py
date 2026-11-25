from pathlib import Path
import urllib.request,json,hashlib,tarfile,os
BASE=Path(__file__).resolve().parent
access=json.loads((BASE/'staging_access.json').read_text())
dest=BASE/'scenario.tar.gz'
with urllib.request.urlopen(access['url'],timeout=180) as source,dest.open('wb') as output:
    while chunk:=source.read(4*1024*1024): output.write(chunk)
assert hashlib.sha256(dest.read_bytes()).hexdigest()==access['sha256']
with tarfile.open(dest) as tar: tar.extractall(BASE,filter='data')
(BASE/'staging_access.json').unlink()
print('Scenario received and checksum verified',flush=True)
