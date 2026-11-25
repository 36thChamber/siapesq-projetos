"""Lossless experimental copies; official paths are read-only. Resumable journal."""
import argparse, os, base64, concurrent.futures, hashlib, json, math, os, tempfile, time
from pathlib import Path
import boto3
from botocore.config import Config
import numpy as np
import rasterio
from rasterio.shutil import copy
from rio_cogeo.cogeo import cog_validate

ROOT = Path(__file__).resolve().parents[1]
BUCKET = os.environ['COG_BUCKET']
PREFIX = os.environ['COG_PREFIX']
S3 = boto3.client('s3', region_name='sa-east-1', config=Config(max_pool_connections=16, retries={'max_attempts': 5, 'mode': 'adaptive'}))

def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1024*1024), b''): h.update(b)
    return h.hexdigest()

def same(a,b):
    return a == b or (isinstance(a,float) and isinstance(b,float) and math.isnan(a) and math.isnan(b))

def convert(obj):
    key = obj['Key']; dest = PREFIX + 'ste/' + key
    journal = ROOT/'validated'/(hashlib.sha256(key.encode()).hexdigest()+'.json')
    if journal.exists():
        row = json.loads(journal.read_text())
        h = S3.head_object(Bucket=BUCKET, Key=dest, ChecksumMode='ENABLED')
        assert h['ETag'] == row['etag'] and h['ChecksumSHA256'] == row['checksum_sha256_base64']
        assert S3.head_object(Bucket=BUCKET,Key=key)['ETag'] == obj['ETag']
        return row
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix='cog-',dir=ROOT/'tmp') as tmp:
        src=Path(tmp)/'source.tif'; dst=Path(tmp)/'cog.tif'
        r=S3.get_object(Bucket=BUCKET,Key=key,IfMatch=obj['ETag'])
        with src.open('wb') as f:
            for chunk in r['Body'].iter_chunks(1024*1024): f.write(chunk)
        assert src.stat().st_size == obj['Size']
        source_sha=sha(src)
        with rasterio.Env(GDAL_CACHEMAX=64*1024*1024):
            copy(src,dst,driver='COG',COMPRESS='DEFLATE',LEVEL=6,PREDICTOR='YES',BLOCKSIZE=512,OVERVIEWS='IGNORE_EXISTING',RESAMPLING='NEAREST',NUM_THREADS='2',BIGTIFF='IF_SAFER')
        valid, errors, warnings = cog_validate(str(dst), strict=True)
        assert valid, (key, errors, warnings)
        with rasterio.open(src) as a, rasterio.open(dst) as b:
            for attr in ['width','height','count','dtypes','crs','transform','colorinterp','scales','offsets','descriptions','units']:
                assert getattr(a,attr)==getattr(b,attr),(key,attr)
            assert all(same(x,y) for x,y in zip(a.nodatavals,b.nodatavals)),(key,'nodata')
            assert a.tags()==b.tags(),(key,'metadata')
            pixels=0
            for _,window in b.block_windows(1):
                x=a.read(window=window); y=b.read(window=window)
                # Bitwise equality also checks the exact payload of nodata/NaN cells.
                assert x.tobytes()==y.tobytes(),(key,'pixels',window)
                assert np.array_equal(a.read_masks(window=window),b.read_masks(window=window)),(key,'mask',window)
                pixels+=x.size
            info=dict(width=a.width,height=a.height,bands=a.count,dtypes=a.dtypes,crs=str(a.crs),transform=list(a.transform),nodata=[str(x) for x in a.nodatavals],overviews=b.overviews(1),blocks=b.block_shapes)
        assert S3.head_object(Bucket=BUCKET,Key=key)['ETag']==obj['ETag'],(key,'source changed')
        digest=sha(dst); checksum=base64.b64encode(bytes.fromhex(digest)).decode()
        with dst.open('rb') as f:
            S3.put_object(Bucket=BUCKET,Key=dest,Body=f,ContentLength=dst.stat().st_size,ContentType='image/tiff',ServerSideEncryption='AES256',ChecksumSHA256=checksum,IfNoneMatch='*',Metadata={'source-etag':obj['ETag'].strip('"'),'source-sha256':source_sha,'cog-validation':'passed','purpose':'auspex-evaluation'})
        h=S3.head_object(Bucket=BUCKET,Key=dest,ChecksumMode='ENABLED')
        assert h['ChecksumSHA256']==checksum and h['ContentLength']==dst.stat().st_size
        # Verify a real HTTP partial read from the uploaded object too.
        end=min(65535,dst.stat().st_size-1)
        part=S3.get_object(Bucket=BUCKET,Key=dest,Range=f'bytes=0-{end}',IfMatch=h['ETag'])
        with dst.open('rb') as f: assert part['Body'].read()==f.read(end+1)
        assert part['ResponseMetadata']['HTTPStatusCode']==206
        row=dict(module='ste',source_bucket=BUCKET,source_key=key,source_etag=obj['ETag'],source_bytes=obj['Size'],source_sha256=source_sha,bucket=BUCKET,key=dest,etag=h['ETag'],bytes=h['ContentLength'],sha256=digest,checksum_sha256_base64=checksum,pixels_compared=pixels,pixels_bitwise_equal=True,masks_equal=True,cog_valid=True,cog_warnings=warnings,range_read_verified=True,metadata=info,elapsed_seconds=round(time.monotonic()-started,2))
        journal.write_text(json.dumps(row,indent=2))
        return row

def main():
    p=argparse.ArgumentParser();p.add_argument('--pilot',action='store_true');p.add_argument('--workers',type=int,default=4);args=p.parse_args()
    (ROOT/'tmp').mkdir(exist_ok=True);(ROOT/'validated').mkdir(exist_ok=True)
    objs=json.loads((ROOT/'selected.json').read_text())
    if args.pilot:
        chosen=[]
        for region in ['nacional_1km','rs_250m','poligono_30m']:
            for scenario in ['anual_','mensal_01_','futuro_2050_ssp245']:
                for product in ['adequabilidade.tif','incerteza.tif']:
                    matches=[x for x in objs if x['Key'].startswith('predictions/caraya/') and region in x['Key'] and scenario in x['Key'] and x['Key'].endswith(product)]
                    if matches:chosen.append(matches[0])
        for group in ['comuns-rs-es','exclusivas-rs','exclusivas-es-ocean']:
            for scenario in ['anual_','mensal_01_','futuro_2050_ssp245']:
                for product in ['adequabilidade.tif','incerteza.tif','extrapolacao.tif']:
                    matches=[x for x in objs if x['Key'].startswith('predicoes_cenarios/'+group+'/') and scenario in x['Key'] and x['Key'].endswith(product)]
                    if matches:chosen.append(matches[0])
        objs=chosen
    rows=[];errors=[];started=time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        pending={pool.submit(convert,o):o for o in objs}
        for future in concurrent.futures.as_completed(pending):
            o=pending[future]
            try: rows.append(future.result())
            except Exception as e: errors.append({'key':o['Key'],'error':repr(e)}); print('ERROR',o['Key'],repr(e),flush=True)
            if len(rows)%10==0 or errors: print(json.dumps({'validated':len(rows),'total':len(objs),'errors':len(errors),'elapsed_s':round(time.monotonic()-started)}),flush=True)
    manifest=dict(schema=1,status='validated' if not errors else 'incomplete',purpose='Experimental COG copies for Auspex; official originals remain authoritative',created_utc=__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),source_bucket=BUCKET,prefix=PREFIX,scope='pilot' if args.pilot else 'SIAPESQ current Auspex catalog (classic and scenario groups)',compression='DEFLATE lossless; predictor YES; 512px tiles; nearest-neighbor overviews; native base grid unchanged',files=sorted(rows,key=lambda r:r['source_key']),errors=errors,summary=dict(files=len(rows),source_bytes=sum(r['source_bytes'] for r in rows),cog_bytes=sum(r['bytes'] for r in rows),pixels_compared=sum(r['pixels_compared'] for r in rows),elapsed_seconds=round(time.monotonic()-started,2)))
    name='pilot-manifest.json' if args.pilot else 'manifest.json'
    data=json.dumps(manifest,indent=2).encode();(ROOT/name).write_bytes(data)
    S3.put_object(Bucket=BUCKET,Key=PREFIX+name,Body=data,ContentType='application/json',ServerSideEncryption='AES256')
    assert S3.get_object(Bucket=BUCKET,Key=PREFIX+name)['Body'].read()==data
    print(json.dumps(manifest['summary']),flush=True)
    if errors: raise SystemExit(1)

if __name__=='__main__':main()
