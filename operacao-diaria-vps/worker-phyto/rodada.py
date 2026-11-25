"""Execução avulsa na VPS. O manifesto só fica disponível após a releitura dos 15 produtos."""
import hashlib,json,os,sys
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import acolite
from osgeo import gdal
from preparar_cog import verificar
from runtime_state import exclusive_lock

def cliente():
    return boto3.client('s3',endpoint_url=os.environ['DAILY_ENDPOINT'],region_name='us-east-1',config=Config(signature_version='s3v4',s3={'addressing_style':'path'}))

def preparar(path):
    d=json.loads(path.read_text())
    if d['exit_code']!=0 or len(d['scenes'])!=3 or {str(s['aoi_id']) for s in d['scenes']}!={'165','541','542'}:
        raise ValueError('Rodada incompleta')
    c=cliente()
    bucket=os.environ['DAILY_BUCKET']
    records=[]
    cogs=path.parent/"cog";cogs.mkdir(exist_ok=True)
    for scene in d['scenes']:
        products=scene['products'];assert len(products)==5
        for p in products:
            f=path.parent/p['path'];key=p['key']
            assert f.resolve().is_relative_to(path.parent.resolve()) and Path(key).name==key
            if key.endswith(('_NDVI.tif','_NDVI2.tif','_NDCI.tif')):
                import rasterio
                import numpy as np
                with rasterio.open(f) as ds:
                    if not any(np.isfinite(ds.read(1,window=w,masked=True).compressed()).any() for _,w in ds.block_windows(1)):
                        raise ValueError(f'Índice sem pixels válidos: {key}')
            with f.open('rb') as stream:
                assert hashlib.file_digest(stream,'sha256').hexdigest()==p['sha256']
            target=cogs/key
            temp=target.with_suffix(".partial.tif")
            if not target.exists():
                dataset=gdal.Translate(str(temp),str(f),format="COG",creationOptions=["COMPRESS=DEFLATE","BLOCKSIZE=256","OVERVIEWS=IGNORE_EXISTING","RESAMPLING=NEAREST"])
                if dataset is None:raise RuntimeError("Conversão COG falhou")
                dataset=None
                verificar(f,temp)
                temp.replace(target)
            verificar(f,target)
            with target.open("rb") as stream:
                sha=hashlib.file_digest(stream,"sha256").hexdigest()
                stream.seek(0)
                try:c.put_object(Bucket=bucket,Key=key,Body=stream,IfNoneMatch='*',ContentType='image/tiff',Metadata={'sha256':sha,'source-sha256':p['sha256']})
                except ClientError as e:
                    if e.response['ResponseMetadata']['HTTPStatusCode']!=412:raise
            h=hashlib.sha256();body=c.get_object(Bucket=bucket,Key=key)['Body']
            try:
                for part in body.iter_chunks(1048576):h.update(part)
            finally:body.close()
            assert h.hexdigest()==sha
            records.append({'key':key,'sha256':p['sha256'],'cog_sha256':sha,'bytes':target.stat().st_size})
    return records

def promover(records):
    c=cliente()
    bucket=os.environ["DAILY_BUCKET"]
    # Readers discover the entire run in a single conditional index update.
    index_key='catalogo/publicado.json'
    for attempt in range(4):
        try:
            current=c.get_object(Bucket=bucket,Key=index_key)
            previous=json.loads(current['Body'].read())
            condition={'IfMatch':current['ETag']}
        except ClientError as err:
            if err.response['ResponseMetadata']['HTTPStatusCode']!=404:raise
            previous={'version':1,'products':[]};condition={'IfNoneMatch':'*'}
        assert previous['version']==1
        lookup={r['key']:r for r in previous['products']}
        for record in records:
            if record['key'] in lookup and lookup[record['key']]!=record:
                raise RuntimeError("Conflito com produto já publicado")
            lookup[record['key']]=record
        index={'version':1,'products':sorted(lookup.values(),key=lambda r:r['key'])}
        try:
            c.put_object(Bucket=bucket,Key=index_key,Body=json.dumps(index).encode(),ContentType='application/json',**condition)
            break
        except ClientError as err:
            if attempt==3 or err.response['ResponseMetadata']['HTTPStatusCode']!=412:raise
    return records

if __name__=='__main__':
    root=Path(os.environ['ACOLITE_STATE_DIR']);root.mkdir(parents=True,exist_ok=True)
    with exclusive_lock(root/'vps.lock'):
        pending=root/'pending-publication'
        if pending.exists():path=Path(pending.read_text())
        else:
            from janela import aquisicao
            ids=[165,541,542]
            start,end=acolite.get_date_range('LATEST')
            selected=acolite.get_selected_AOI(ids)
            dates={str(aoi['id']):aquisicao(aoi,start,end) for aoi in selected}
            if set(dates)!=set(map(str,ids)):
                raise ValueError("Consulta de reservatórios incompleta")
            catalog=json.load(cliente().get_object(Bucket=os.environ['DAILY_BUCKET'],Key='catalogo/publicado.json')['Body'])
            known={row['key'] for row in catalog['products']}
            wanted={i+'_'+day.replace('-','_')+'_'+suffix+'.tif' for i,day in dates.items()
                    for suffix in ('NDVI','NDVI2','NDCI','RGB','RGB_MASK')}
            if wanted <= known:
                print("Cenas já publicadas",dates,flush=True)
                sys.exit(0)
            import shutil
            if shutil.disk_usage(root).free < 10 * 1024**3:
                raise RuntimeError("Menos de 10 GiB livres para a análise na VPS")
            historical=json.loads((Path(__file__).parent/'historico.json').read_text())
            for name,record in historical['alerts'].items():
                journal=root/'alerts'/name
                if not journal.exists():
                    from runtime_state import write_json
                    write_json(journal,record)
            original=acolite.download_netcdf
            def download(aoi,start,end,mode):
                from janela import janela
                lo,hi=janela(aoi,start,end,root,dates[str(aoi['id'])])
                os.environ['OPENEO_JOB_BUDGET']='300' if str(aoi['id'])=='165' else '50'
                return original(aoi,lo,hi,mode)
            acolite.download_netcdf=download
            # Preserve the exact scene/area identities for a separate delivery after spatial validation.
            # This journal does not acknowledge a POST in the production delivery ledger.
            from runtime_state import fingerprint, write_json
            def queue_alert(identity, send):
                key = fingerprint(identity) + '.json'
                journal = root / 'alerts' / key
                if journal.exists() and json.loads(journal.read_text()).get('status') == 'completed':
                    return False
                write_json(root / 'alertas-em-validacao' / key, {'status': 'aguardando_validacao_espacial', 'request': identity})
                return True
            acolite.deliver_once = queue_alert
            result=acolite.run_process([165,541,542],None,'COPERNICUS','LATEST')
            if result['exit_code']:sys.exit(result['exit_code'])
            path=Path(result['publication_manifest'])
            tmp=pending.with_suffix('.tmp');tmp.write_text(str(path));tmp.replace(pending)
        from revisar import processar
        from runtime_state import write_json
        receipt={'manifest':str(path),'products':preparar(path)}
        processar(publicar=True,proof=receipt)
        promover(receipt['products'])
        write_json(path.parent/'vps-readback.json',receipt)
        pending.unlink()
        print('PHYTO_PUBLICADO',len(receipt['products']),flush=True)
