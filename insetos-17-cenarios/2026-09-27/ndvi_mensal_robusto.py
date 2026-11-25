from pathlib import Path
import sys, hashlib, time, json, os, shutil, uuid, threading
import numpy as np
import planetary_computer

ROOT = Path('/workspace/tools-train-models-vireo')
sys.path.insert(0, str(ROOT/'03_environmental_processing'))
import gerar_cenarios_mensais as mensal

# Official SDK reuses a SAS token per container; one request per image
# exhausted the provider's anonymous signing rate limit.
sign_lock = threading.Lock()
def sign(href):
    with sign_lock:
        return planetary_computer.sign(href)
mensal.gcb._mpc_sign = sign

original_read = mensal.gcb._ndvi_ler_composicao
cache = ROOT/'env_data/raster_cache/modis_composicoes_1km'
cache.mkdir(parents=True, exist_ok=True)

def read(href, bbox, grid):
    key = hashlib.sha256(repr((href,bbox,grid)).encode()).hexdigest()
    path = cache/f'{key}.npz'
    if path.exists():
        with np.load(path) as d:
            return None if int(d['row']) < 0 else (int(d['row']),int(d['col']),d['data'])
    for attempt in range(5):
        try:
            result = original_read(href,bbox,grid)
            r,c,a = result if result is not None else (-1,-1,np.empty((0,0)))
            tmp = path.with_suffix('.part')
            with tmp.open('wb') as f: np.savez_compressed(f,row=r,col=c,data=a)
            os.replace(tmp,path)
            return result
        except Exception:
            if attempt == 4: raise
            time.sleep(2**attempt)

# Commit a full generation before changing CURRENT: interruption cannot mix
# accumulators from a new checkpoint with a previous list of completed inputs.
original_save = mensal._ckpt_salvar
original_load = mensal._ckpt_carregar

def save(directory, meta, acc, cnt, done):
    directory.mkdir(parents=True,exist_ok=True)
    generation = directory/('generation-'+uuid.uuid4().hex)
    original_save(generation,meta,acc,cnt,done)
    pointer = directory/'CURRENT.tmp'
    pointer.write_text(generation.name)
    os.replace(pointer,directory/'CURRENT')
    for old in directory.glob('generation-*'):
        if old != generation: shutil.rmtree(old)

def load(directory,*args):
    pointer=directory/'CURRENT'
    if pointer.exists(): return original_load(directory/pointer.read_text().strip(),*args)
    return original_load(directory,*args)

mensal.gcb._ndvi_ler_composicao=read
mensal._ckpt_salvar=save
mensal._ckpt_carregar=load
mensal.gerar_ndvi_mensal(mensal.BRASIL,ROOT/'env_data/raster_cache/mensal',
                       list(range(2015,2025)),list(range(1,13)),workers=24,ckpt_cada=100)
