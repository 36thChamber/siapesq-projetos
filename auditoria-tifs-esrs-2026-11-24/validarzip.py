from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,zipfile,hashlib
series=json.loads(Path('series.json').read_text())
archive='/mnt/a/Downloads/Modelos-SIAPESQ-ES-RS.zip'
with zipfile.ZipFile(archive) as z:
 names=z.namelist()
assert len(names)==len(series)==1802
lookup={k:next(r['sha'] for r in v if r['no_zip']) for k,v in series.items()}
def check(chunk):
 with zipfile.ZipFile(archive) as z:
  for n in chunk:
   with z.open(n) as f:assert hashlib.file_digest(f,'sha256').hexdigest()==lookup[Path(n).name],n
 return len(chunk)
with ThreadPoolExecutor(3) as pool:
 total=sum(pool.map(check,[names[i:i+30] for i in range(0,len(names),30)]))
Path('zip-validado.json').write_text(json.dumps({'arquivos':total,'bytes_zip':Path(archive).stat().st_size}))
print('ZIP validado',total,flush=True)
