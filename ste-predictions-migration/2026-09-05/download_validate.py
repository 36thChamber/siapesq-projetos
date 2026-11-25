import concurrent.futures as cf
import csv, hashlib, json, time
from pathlib import Path
import requests, rasterio, numpy as np

BASE=Path(__file__).resolve().parent
FILES=BASE/'drive-files'; FILES.mkdir(exist_ok=True)
manifest=list(csv.DictReader(open(BASE/'MANIFEST.csv')))
inventory={x['title']:x for x in json.load(open(BASE/'drive-inventory.json'))['files']}
assert len(manifest)==408 and len({r['arquivo'] for r in manifest})==408
assert {r['arquivo'] for r in manifest}=={n for n in inventory if n.endswith('.tif')}
# Manifest predates final masking; validate transfer against current Drive metadata.

def run(row):
    name=row['arquivo']; p=FILES/name; meta=inventory[name]
    for attempt in range(4):
        try:
            if not p.exists() or p.stat().st_size!=int(meta['size']):
                with requests.get('https://drive.google.com/uc',params={'export':'download','id':meta['id']},stream=True,timeout=(20,120)) as resp:
                    resp.raise_for_status()
                    with open(str(p)+'.part','wb') as out:
                        for chunk in resp.iter_content(1024*1024):out.write(chunk)
                assert Path(str(p)+'.part').stat().st_size==int(meta['size']), 'download size mismatch'
                Path(str(p)+'.part').replace(p)
            break
        except Exception:
            if attempt==3:raise
            time.sleep(2**attempt)
    sha=hashlib.sha256(p.read_bytes()).hexdigest()
    with rasterio.open(p) as ds:
        errors=[]
        if ds.crs.to_epsg()!=4326:errors.append('crs')
        if ds.count!=1 or ds.dtypes!=('float32',):errors.append('bands/dtype')
        if ds.nodata is None or not np.isnan(ds.nodata):errors.append('nodata')
        expected={'nacional_1km':.01,'rs_250m':.0025,'poligono_30m':.00025}[row['recorte']]
        if not np.allclose(ds.res,[expected,expected],atol=1e-10):errors.append('resolution')
        count=0; low=float('inf');high=-float('inf'); total=0.; maskhash=hashlib.sha256()
        for _,window in ds.block_windows(1):
            a=ds.read(1,window=window); valid=np.isfinite(a);maskhash.update(valid.tobytes())
            if np.isinf(a).any():errors.append('infinite')
            v=a[valid];count+=v.size
            if v.size:low=min(low,float(v.min())); high=max(high,float(v.max()));total+=float(v.sum(dtype=np.float64))
        if not count:errors.append('empty')
        if low<0 or high>1:errors.append('range')
        return dict(row,drive_id=meta['id'],sha256=sha,crs=str(ds.crs),shape=list(ds.shape),bounds=list(ds.bounds),res=list(ds.res),compression=str(ds.compression),nodata='NaN',valid_pixels=count,min=low,max=high,mean=total/count if count else None,mask_sha256=maskhash.hexdigest(),errors=errors)

if __name__=='__main__':
    results=[];failed=[];start=time.time()
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        jobs={pool.submit(run,r):r['arquivo'] for r in manifest}
        for f in cf.as_completed(jobs):
            try:results.append(f.result())
            except Exception as e: failed.append({'arquivo':jobs[f],'error':str(e)})
            (BASE/'validation-progress.json').write_text(json.dumps({'done':len(results),'failed':failed,'seconds':time.time()-start}))
            if (len(results)+len(failed))%10==0: print('done',len(results),'failed',len(failed),'seconds',round(time.time()-start),flush=True)
    (BASE/'validation.json').write_text(json.dumps({'files':sorted(results,key=lambda x:x['arquivo']),'failed':failed},indent=2))
    print('COMPLETE',len(results),'failed',failed,'validation_errors',sum(bool(x['errors']) for x in results),flush=True)
