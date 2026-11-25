from pathlib import Path
import subprocess,json,zipfile,collections
h=Path.home(); c=json.load(open('candidatos.json'));sizes={v['size'] for v in c.values() if not v['is_catalog']}; base=h/'projects'
roots=[d for d in base.iterdir() if d.is_dir() and d.name.startswith(('ste-','siapesq','ec2-','insetos-','especies-nativas','vireo-','marine-','tools-train','prediction-','model','Model'))]+[Path('/mnt/a/Backups-SIAPESQ'),Path('/mnt/a/Downloads'),Path('/mnt/a/SIAPESQ-S3/example-bucket')]
p=subprocess.run(['rg','--files','--hidden','--no-ignore','-g','!**/.git/**','-g','!**/node_modules/**','-g','!**/.venv/**','-g','*.{zip,7z,rar,tar,tar.gz,tgz}',*map(str,roots)],capture_output=True,text=True)
files=list(map(Path,p.stdout.splitlines()));print('arquivos compactados',collections.Counter(f.suffix for f in files))
hits=[]
for f in files:
 if f.suffix.lower()!='.zip':continue
 try:
  with zipfile.ZipFile(f) as z:
   hits+= [(str(f),i.filename) for i in z.infolist() if i.file_size in sizes and i.filename.lower().endswith(('.tiff','.tif'))]
 except zipfile.BadZipFile:continue
json.dump(hits,open('arquivos-compactados-candidatos.json','w')); print('membros cujo tamanho coincide',len(hits),collections.Counter(a for a,b in hits).most_common(8))
