"""Prefetch pending soil strips using the existing cache keys and source algorithm."""
import importlib.util
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import subprocess
import os

BASE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('resume',BASE/'retomar_solo.py')
# Load only the acquisition module, not the standalone resume driver.
spec=importlib.util.spec_from_file_location('cache','/workspace/tools-train-models-vireo/03_environmental_processing/gerar_cache_brasil.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
import sys, tempfile, numpy as np
width,height,transform=m._grid(m.BRASIL,.01)
def isolated(url,transform,width,rows,row_off,resampling):
 with tempfile.TemporaryDirectory(prefix='vireo-prefetch-') as tmp:
  target=str(Path(tmp)/'strip.npy')
  subprocess.run([sys.executable,str(BASE/'retomar_solo.py'),url,str(row_off),str(rows),target],check=True,timeout=240)
  return np.load(target)
m._read_strip=isolated

def row(r):
 for d,_ in m.DEPTHS:
  for prop in ('clay','sand','soc'):
   url=f'/vsicurl/{m.ISRIC}/{prop}/{prop}_{d}_mean.vrt'
   m._read_strip_retry(url,transform,width,min(128,height-r),r,m.Resampling.nearest)
 return r
with ThreadPoolExecutor(max_workers=5) as pool:
 futures={pool.submit(row,r):r for r in range(896,height,128)}
 for f in as_completed(futures):
  try: print('CACHE PRONTO',f.result(),flush=True)
  except Exception as e: print('CACHE PENDENTE',futures[f],str(e),flush=True)
