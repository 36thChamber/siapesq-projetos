import json,os,stat
from pathlib import Path
src=Path.home()/'projects/auditoria-tifs-esrs-2026-11-24'
plan=json.load(open('local-plan.json')); checks=json.load(open('candidatos.json'))
assert not any(not r['known'] for r in list(plan['files'].values())+list(plan['links'].values()))
assert json.load(open(src/'zip-validado.json'))['arquivos']==1802 and json.load(open(src/'vps-validada.json'))['originais']==1802
verify=lambda st:(st.st_dev,st.st_ino,st.st_size,st.st_mtime_ns)
for name,r in {**plan['links'],**plan['files']}.items():
 p=Path(name)
 assert tuple(r['stat'])==verify(p.stat()) and not checks[r['sha']]['is_catalog']
 if name in plan['links']:assert p.is_symlink() and str(p.resolve())==r['target'] and r['target'] in plan['files']
 else:assert not p.is_symlink() and p.is_file()
with open('exclusoes-locais.jsonl','x',buffering=1) as log:
 for kind in ('links','files'):
  for name,r in plan[kind].items():
   p=Path(name);assert tuple(r['stat'])==verify(p.stat())
   p.unlink()
   log.write(json.dumps([kind,name,r['sha']])+'\n')
  os.fsync(log.fileno())
assert all(not os.path.lexists(n) for k in ('files','links') for n in plan[k])
print('Exclusões verificadas',len(plan['files']),'arquivos e',len(plan['links']),'links da fila')
