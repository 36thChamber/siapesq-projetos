from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import datetime
import json
import os
import platform
import subprocess
import threading
import time
import traceback
import numpy as np
import rasterio

BASE=Path(__file__).resolve().parent
os.chdir(BASE)
OUT=BASE/'results'
OUT.mkdir(exist_ok=True)
ENV={**os.environ,'PREDICT_CORES':'64','OMP_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','MKL_NUM_THREADS':'1','GDAL_NUM_THREADS':'1'}
SPECIES=[('small','Butia_eriospatha'),('medium','Didelphis_albiventris'),('large','Cerdocyon_thous')]
def utc(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def atomic(path,data):
    tmp=path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data,indent=2))
    os.replace(tmp,path)

def check_raster(path):
    count=0; low=float('inf'); high=float('-inf')
    with rasterio.open(path) as d:
        if d.shape != (4000,4000) or d.crs.to_epsg()!=4326:
            raise ValueError('Unexpected raster shape or CRS')
        for _,window in d.block_windows(1):
            a=d.read(1,window=window,masked=True).compressed()
            if not len(a): continue
            if not np.isfinite(a).all(): raise ValueError('Non-finite raster values')
            count+=len(a);low=min(low,float(a.min()));high=max(high,float(a.max()))
        if not count: raise ValueError('Raster has no valid cells')
        return {'shape':d.shape,'crs':str(d.crs),'valid_pixels':count,'min':low,'max':high,'bytes':path.stat().st_size}

def run_one(size,species):
    destination=OUT/species
    destination.mkdir(exist_ok=True)
    model=BASE/'models'/species
    name=f'{species}_anual_2015_2024'
    mean=destination/f'{name}_adequabilidade.tif'
    sd=destination/f'{name}_incerteza.tif'
    result={'species':species,'size_class':size,'workers':64,'started_utc':utc(),
            'model_compressed_bytes':(model/f'rf_{species}_clima.sdm').stat().st_size}
    start=time.monotonic()
    try:
        command=['/usr/bin/time','-f','{"elapsed_seconds":%e,"user_cpu_seconds":%U,"system_cpu_seconds":%S,"max_rss_kib":%M,"exit_code":%x}',
                 '-o',str(destination/'prediction_time.json'),'Rscript',str(BASE/'run_predict_benchmark.R'),str(model),
                 f'rf_{species}_clima',str(BASE/'scenario'),str(mean),str(sd)]
        with (destination/'prediction.log').open('w') as log:
            subprocess.run(command,env=ENV,stdout=log,stderr=subprocess.STDOUT,check=True,timeout=5400)
        result['prediction']=json.loads((destination/'prediction_time.json').read_text())
        qa_start=time.monotonic()
        with (destination/'qa.log').open('w') as log:
            subprocess.run(['python3',str(BASE/'mapa_extrapolacao.py'),'--cenario',str(BASE/'scenario'),
                            '--treino',str(model/'predictor_climatologico.csv'),'--outdir',str(destination),
                            '--prefixo',name+'_'],env=ENV,stdout=log,stderr=subprocess.STDOUT,check=True)
            coher=subprocess.run(['python3',str(BASE/'teste_coerencia_ecologica.py'),'--mapa',str(mean),
                                  '--treino',str(model/'predictor_climatologico.csv'),'--json',str(destination/'coerencia.json')],
                                 env=ENV,stdout=log,stderr=subprocess.STDOUT)
        result['qa_seconds']=time.monotonic()-qa_start
        result['coherence_exit_code']=coher.returncode
        result['coherence']=json.loads((destination/'coerencia.json').read_text())
        result['rasters']={kind:check_raster(destination/f'{name}_{kind}.tif') for kind in ['adequabilidade','incerteza','extrapolacao']}
        if any(result['rasters'][kind]['min'] < 0 or result['rasters'][kind]['max'] > 1 for kind in ['adequabilidade','incerteza']):
            raise ValueError('Prediction values outside [0,1]')
        result['computational_status']='complete'
    except Exception:
        result['computational_status']='failed'
        result['error']=traceback.format_exc()
    result['total_seconds']=time.monotonic()-start
    result['finished_utc']=utc()
    atomic(destination/'benchmark.json',result)
    print(json.dumps(result),flush=True)
    return result

for item in json.loads((BASE/'inputs_manifest.json').read_text()):
    assert (BASE/item['path']).stat().st_size == item['size'],item
info={'started_utc':utc(),'cpu_count':os.cpu_count(),'platform':platform.platform(),
      'lscpu':subprocess.check_output(['lscpu'],text=True),
      'r_versions':subprocess.check_output(['Rscript','-e','for (p in c("sdm","terra","randomForest")) cat(p,as.character(packageVersion(p)),"\\n")'],text=True),
      'scenario':'anual_2015_2024','layout':'three concurrent models, 64 fork workers each'}
stop=threading.Event()
def monitor():
    with (OUT/'host_memory.jsonl').open('w') as log:
        while not stop.is_set():
            mem={line.split(':')[0]:int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines() if line.split(':')[0] in ['MemTotal','MemAvailable','SwapFree']}
            log.write(json.dumps({'utc':utc(),**mem})+'\n');log.flush()
            stop.wait(5)
thread=threading.Thread(target=monitor,daemon=True);thread.start()
start=time.monotonic()
with ThreadPoolExecutor(max_workers=3) as pool:
    info['models']=[f.result() for f in as_completed([pool.submit(run_one,*item) for item in SPECIES])]
info['batch_seconds']=time.monotonic()-start
info['finished_utc']=utc()
stop.set();thread.join()
atomic(OUT/'summary.json',info)
(OUT/'COMPLETE').write_text(utc())
