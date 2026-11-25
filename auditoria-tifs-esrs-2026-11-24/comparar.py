from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from collections import Counter
import os, json, hashlib
import rasterio as rio
from rasterio.windows import Window
from rasterio.transform import Affine
import numpy as np
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from contextlib import ExitStack

def digest(path):
 with open(path,'rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def measure(args):
 name,src,dst,expected_src,expected_dst,explore=args
 assert digest(src)==expected_src and digest(dst)==expected_dst,name
 with rio.Env(GDAL_CACHEMAX=38000000),ExitStack() as stack:
  a=stack.enter_context(rio.open(src)); b=stack.enter_context(rio.open(dst))
  info=dict(dimensoes_antigo=f'{a.width} × {a.height}',dimensoes_atual=f'{b.width} × {b.height}',crs_antigo=str(a.crs),crs_atual=str(b.crs),nodata_antigo=str(a.nodata),nodata_atual=str(b.nodata))
  assert a.count==b.count==1
  aligned=a.crs==b.crs and a.shape==b.shape
  flip=aligned and (a.transform*Affine.translation(0,a.height)*Affine.scale(1,-1)).almost_equals(b.transform,precision=1e-8)
  if aligned and a.transform.almost_equals(b.transform,precision=1e-8): how='Mesma grade'; flip=False
  elif flip:how='Mesmos centros; linhas em ordem inversa'
  elif not explore:return name,{**info,'grade':'Grades distintas; sem diferença pixel a pixel'}
  else:
   a=stack.enter_context(WarpedVRT(a,crs=b.crs,transform=b.transform,width=b.width,height=b.height,resampling=Resampling.bilinear,dtype='float32',nodata=float('nan')))
   how='Bilinear na grade atual (exploratório)'
  common=gain=loss=changed=over=0;sa=sb=sabs=square=maximum=0.
  for y in range(0,b.height,192):
   height=min(192,b.height-y); wa=Window(0,a.height-y-height if flip else y,b.width,height)
   aa=a.read(1,window=wa,masked=True)
   if flip:aa=aa[::-1]
   bb=b.read(1,window=Window(0,y,b.width,height),masked=True)
   ma=~np.ma.getmaskarray(aa)&np.isfinite(aa.data);mb=~np.ma.getmaskarray(bb)&np.isfinite(bb.data)
   active=ma&mb; common+=int(active.sum());gain+=int((mb&~ma).sum());loss+=int((ma&~mb).sum())
   if not active.any():continue
   av=aa.data[active].astype('float64');bv=bb.data[active].astype('float64')
   diff=bv-av; ab=np.abs(diff)
   sa+=av.sum();sb+=bv.sum();sabs+=ab.sum();square+=np.square(diff).sum();maximum=max(maximum,float(ab.max()));changed+=np.count_nonzero(diff);over+=np.count_nonzero(ab>=0.1)
  info.update(grade=how,comuns=common,ganhos_mascara=gain,perdas_mascara=loss,pixels_diferentes=int(changed),pct_diferentes=100*changed/common if common else None,media_antiga=sa/common if common else None,media_atual=sb/common if common else None,delta=(sb-sa)/common if common else None,mae=sabs/common if common else None,rmse=(square/common)**.5 if common else None,max_abs=maximum if common else None,pct_delta_010=100*over/common if common else None)
  return name,info

if __name__=='__main__':
 series=json.loads(Path('series.json').read_text());jobs=[]
 for name,rows in series.items():
  a,b=rows[0],rows[-1]
  if len(rows)>1:jobs.append((name,a['caminho'],b['caminho'],a['sha'],b['sha'],False))
 # June maps identify the annual product but omit the climatological years.
 for p in sorted(Path('/mnt/a/SIAPESQ-S3/example-bucket/FAPERGS').glob('*anual_mean.tif')):
  sp='_'.join(p.name.split('_')[:2]); n=sp+'_anual_2015_2024_adequabilidade.tif'
  if n not in series:continue
  b=series[n][-1];jobs.append(('FAPERGS/'+n,str(p),b['caminho'],digest(p),b['sha'],True))
 print('pares a medir',len(jobs),flush=True)
 with ProcessPoolExecutor(max_workers=4) as ex,open('metricas.jsonl','w',buffering=1) as output:
  for i,(key,m) in enumerate(ex.map(measure,jobs)):
   output.write(json.dumps([key,m])+'\n')
   if i%25==0:print(i+1,flush=True)
