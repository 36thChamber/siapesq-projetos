"""Run the repository DEM method by independent, resumable latitude strips."""
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor,as_completed
import numpy as np
import rasterio

BASE=Path(__file__).resolve().parent
ROOT=Path('/workspace/tools-train-models-vireo')
PARTS=BASE/'dem_faixas';PARTS.mkdir(exist_ok=True)
os.environ.setdefault('GDAL_HTTP_TIMEOUT','90')
os.environ.setdefault('GDAL_HTTP_CONNECTTIMEOUT','20')
spec=importlib.util.spec_from_file_location('cache',ROOT/'03_environmental_processing/gerar_cache_brasil.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
NAMES=['altitude_brasil_250m.tif','slope_brasil_250m.tif']
if len(sys.argv)>1:
 row=int(sys.argv[1]);rows=min(128,4000-row);top=6-row*.01;bottom=top-rows*.01
 m.gerar_dem((-74,bottom,-34,top),.01,PARTS/str(row),128)
else:
 def run(row):
  directory=PARTS/str(row);directory.mkdir(exist_ok=True)
  if (directory/'OK').exists(): return row
  for attempt in range(4):
   for name in NAMES:
    (directory/name).unlink(missing_ok=True)
   with (directory/'run.log').open('w') as f:
    result=subprocess.run([sys.executable,__file__,str(row)],stdout=f,stderr=subprocess.STDOUT,timeout=900)
   log=(directory/'run.log').read_text()
   if result.returncode==0 and 'FALHOU' not in log and '[dem] salvo:' in log:
    with rasterio.open(directory/NAMES[0]) as src:
     a=src.read(1,masked=True)
     if src.shape==(min(128,4000-row),4000) and a.count()>0:
      (directory/'OK').touch();return row
   print(f'[dem] repetindo faixa {row} tentativa {attempt+2}',flush=True)
  raise RuntimeError(f'Faixa incompleta: {row}')
 with ThreadPoolExecutor(max_workers=6) as pool:
  futures=[pool.submit(run,row) for row in range(0,4000,128)]
  for f in as_completed(futures):print(f'[dem] faixa validada {f.result()}/4000',flush=True)
 out=ROOT/'env_data/raster_cache/brasil_1km'
 for name in NAMES:
  with rasterio.open(PARTS/'0'/name) as first:profile=first.profile.copy()
  profile.update(height=4000,width=4000,transform=rasterio.transform.from_origin(-74,6,.01,.01))
  temp=out/(name+'.new')
  with rasterio.open(temp,'w',**profile) as dst:
   for row in range(0,4000,128):
    with rasterio.open(PARTS/str(row)/name) as src:
     dst.write(src.read(1),1,window=rasterio.windows.Window(0,row,4000,min(128,4000-row)))
  os.replace(temp,out/name)
 print('[dem] salvo: altitude e slope; todas as 32 faixas validadas',flush=True)
