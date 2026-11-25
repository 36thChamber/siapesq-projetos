import csv,json,os
from datetime import datetime
from pathlib import Path
from collections import Counter
base=Path.cwd();links=json.load(open('local-plan.json')); entries=[json.loads(l) for l in open('exclusoes-locais.jsonl')]
checks=json.load(open('candidatos.json')); old={k for k,x in checks.items() if not x['is_catalog']}
drive=[json.loads(l) for l in open('exclusoes-drive.jsonl')]; byid=json.load(open('drive-rclone-owner.conf.json'))['files']
assert len(entries)==805 and len(drive)==102 and sorted(x[0] for x in drive)==sorted(byid)
assert all(not os.path.lexists(p) for _,p,_ in entries)
root=Path('/mnt/a/Downloads/Registro-de-exclusao-TIFFs-ES-RS-2026-11-24.csv')
tmp=root.with_suffix('.csv.part')
allhash=set();total=0
with tmp.open('x',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f,delimiter=';');w.writerow(['Local','Tipo de exclusão','Arquivo ou identificador','SHA-256 do TIFF','Tamanho original do TIFF (bytes)'])
 def row(loc,kind,name,h,amount):
  global total
  assert h in old;allhash.add(h);total+=amount;w.writerow([loc,kind,name,h,amount])
 for typ,p,h in entries:
  if typ=='links':continue
  row('Backup local' if p.startswith('/mnt/a/') else 'Projeto local','Arquivo excluído',p,h,checks[h]['size'])
 arc=json.load(open('tar-verificado.json'))
 for p,h in arc['removidos']:row('Backup de benchmark','TIFF removido de TAR.GZ',arc['arquivo']+' / '+p,h,checks[h]['size'])
 for i,h,code in drive:row('Google Drive','Arquivo excluído permanentemente',byid[i]['name']+' ['+i+']',h,checks[h]['size'])
assert allhash==old
tmp.replace(root)
print('Resultados:',len(allhash),'versões;',len(entries)-len(links['links'])+len(arc['removidos'])+len(drive),'cópias;',total,'bytes somados antes da compactação')
