import pathlib,re,tarfile,hashlib,os,json
from collections import Counter
base=pathlib.Path.home()/'projects'; dest=pathlib.Path(__file__).parent
roots=['Modelos-R','models','tools-train-models','prediction-process-update','siapresp-ste-integration','acolite_application','ec2-process-notifier','siapreps-download-fix']+sorted(p.name for p in base.glob('ec2-predict*'))
extensions={'.py','.r','.rmd','.sh','.bash','.pl','.jl','.sql','.toml','.ipynb','.ps1','.yml','.yaml','.service','.timer','.conf','.m','.mk','.js','.ts','.cpp','.h'}
ignore={'.git','.venv','renv','venv','node_modules','__pycache__','site-packages','dist','build','packrat','.cache','.terraform','.Rproj.user'}
names={'makefile','dockerfile','readme.md','description','requirements.txt','docker-compose.yaml','renv.lock'}
manifest={}
with tarfile.open(dest/'fontes-workspace.tar.gz','w:gz',compresslevel=5) as tar:
 for root in roots:
  for cur,dirs,files in os.walk(base/root):
   dirs[:]=[x for x in dirs if x not in ignore]
   for n in sorted(files):
    p=pathlib.Path(cur)/n
    if p.is_symlink() or not p.is_file() or not (p.suffix.lower() in extensions or n.lower() in names) or p.stat().st_size>16*1024**2:continue
    key=str(p.relative_to(base))
    if key in manifest:continue
    manifest[key]=hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
    tar.add(p,arcname=key,recursive=False)
with tarfile.open(dest/'fontes-workspace.tar.gz','r:gz') as tar:
 verified={m.name:hashlib.file_digest(tar.extractfile(m),'sha256').hexdigest() for m in tar if m.isfile()}
assert verified==manifest
(dest/'fontes-workspace.sha256.json').write_text(json.dumps(manifest,indent=2))
print(len(manifest),sorted(Counter(k.split('/')[0] for k in manifest).items()),flush=True)
