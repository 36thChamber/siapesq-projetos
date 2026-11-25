"""Reproduz três aquisições existentes sem criar jobs ou transmitir alertas."""
import os,sys,hashlib,json
from pathlib import Path
import numpy as np,xarray as xr,requests
import openeo
import acolite
from downloader.copernicus import gerar_novo_nome_arquivo
from runtime_state import state_root,write_json
from image_processor import alertas
proof=json.loads((Path(__file__).parent/'historico.json').read_text())
cache=Path('/dados/cenas-historicas');cache.mkdir(exist_ok=True)
def download(aoi,*args):
    i=str(aoi['id']);j=proof['jobs'][i];raw=cache/(i+'.nc')
    if not raw.exists():
        c=openeo.connect(os.environ['OPENEO_BACKEND_URL'],default_timeout=60)
        c.authenticate_oidc_client_credentials(client_id=os.environ['OPENEO_CLIENT_ID'],client_secret=os.environ['OPENEO_CLIENT_SECRET'])
        asset=c.job(j['job_id']).get_results().get_assets()
        a=next(x for x in asset if x.name=='openEO.nc')
        part=raw.with_suffix('.nc.part')
        # Resume bounded ranges from a previously completed provider job.
        while True:
            off=part.stat().st_size if part.exists() else 0
            end=off+4*1024*1024-1
            with requests.get(a.href,headers={'Range':f'bytes={off}-{end}'},timeout=90) as r:
                r.raise_for_status()
                rg=r.headers.get('Content-Range',''); total=int(rg.split('/')[-1])
                assert r.status_code==206 and rg==f'bytes {off}-{min(end,total-1)}/{total}' and len(r.content)==min(end+1,total)-off
                with part.open('ab') as f:f.write(r.content)
            if part.stat().st_size==total:break
        with part.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==j['sha256']
        part.replace(raw)
    with raw.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==j['sha256']
    with xr.open_dataset(raw) as ds:
        sel=ds.sel(t=np.sort(ds.t.values)[-1]);dest=cache/gerar_novo_nome_arquivo(i,sel)
        temp=dest.with_suffix('.part.nc');sel.to_netcdf(temp);temp.replace(dest)
    return [str(dest)]
def no_send(*args,**kwargs):
    raise RuntimeError('Identidade histórica sem recibo confirmado')
for k,v in proof['alerts'].items():
    p=state_root()/'alerts'/k
    if p.exists():assert json.loads(p.read_text())==v
    else:write_json(p,v)
acolite.download_netcdf=download
acolite.enviar_alerta=no_send
out=acolite.run_process([165,541,542],None,'COPERNICUS','LATEST')
assert out['exit_code']==0,out['exit_code']
manifest=json.loads(Path(out['publication_manifest']).read_text())
products={p['key']:p['sha256'] for scene in manifest['scenes'] for p in scene['products']}
assert len(products)==15
result={'products':products,'matches':sum(proof['products'][k]==v for k,v in products.items()),'alerts_reused':sum(r['alerts_reused'] for r in out['aois']),'run_id':out['run_id']}
write_json(state_root()/'replay.json',result)
print('HISTORICO',result['matches'],result['alerts_reused'],flush=True)
assert result['matches']==15 and result['alerts_reused']==39
