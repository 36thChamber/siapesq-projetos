from pathlib import Path
import sys,json,shutil
from concurrent.futures import ThreadPoolExecutor
BASE=Path(__file__).resolve().parent
OLD=Path('/workspace/siapesq-species-images')
sys.path.insert(0,str(OLD));import build_catalog as b
b.ROOT=BASE/'fotos'
names=[x['species'] for x in json.loads((BASE.parents[1]/'config.json').read_text())['annual_species']]
def job(name):
 p=OLD/'species'/(name.replace(' ','_')+'.json')
 if p.exists():
  obj=json.loads(p.read_text());obj['images']=obj['images'][:3]
  for im in obj['images']:
   dest=b.ROOT/im['key'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(OLD/im['key'],dest)
  b.save(b.ROOT/'species'/p.name,obj);return obj
 return b.collect((name,'apresentacao'),3)
with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(job,names))
(BASE/'fotos_catalogo.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print([(r['scientificName'],len(r['images'])) for r in results])
