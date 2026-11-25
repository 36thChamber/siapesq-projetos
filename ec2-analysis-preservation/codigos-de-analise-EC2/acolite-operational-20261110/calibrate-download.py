import os,sys,json,pathlib,time,logging,hashlib
from datetime import datetime,timezone
import dotenv,openeo,xarray as xr
from downloader.copernicus import download_netcdf
from siapesq.downloader import create_list,get_reservatorio
logging.basicConfig(level=logging.INFO)
rid=int(sys.argv[1]); assert rid in {165,541,542}
dotenv.load_dotenv('/workspace/acolite_application/.env')
root=pathlib.Path('/workspace/acolite-operational-20261110/evidence')
state=pathlib.Path(os.environ['ACOLITE_STATE_DIR'])
report={'id':rid,'started':datetime.now(timezone.utc).isoformat(),'window':['2026-11-05','2026-11-10'],'max_executors':os.environ['OPENEO_MAX_EXECUTORS'],'budget_request':os.environ['OPENEO_JOB_BUDGET'],'budget_hard_cap_verified':False}
start=time.monotonic(); result=1
try:
    catalog=get_reservatorio(os.environ['SIAPESQ_BASE_API'],f'v1/phytoBloom/reservatorios/{rid}',os.environ['SIAPESQ_API_KEY'])
    assert str(catalog['id'])==str(rid)
    aoi=create_list([catalog])[0]
    paths=download_netcdf(aoi,'2026-11-05','2026-11-10','LATEST')
    report['files']=[]
    for name in paths:
        p=pathlib.Path(name)
        with xr.open_dataset(p) as ds:
            scene=str(ds.t.values)
            assert '2026-11-05' <= scene[:10] < '2026-11-10'
            report['files'].append({'path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest(),'acquisition':scene,'sizes':dict(ds.sizes),'bands':sorted(ds.data_vars)})
    result=0
except Exception as e:
    report['error_type']=type(e).__name__
    report['error_message']=str(e) if type(e).__module__ in {'downloader.batch','runtime_state'} else 'Private provider details omitted; inspect protected logs if needed.'
finally:
    report['jobs']=[]
    try:
        c=openeo.connect(os.environ['OPENEO_BACKEND_URL'],default_timeout=30,retry=False)
        c.authenticate_oidc_client_credentials(client_id=os.environ['OPENEO_CLIENT_ID'],client_secret=os.environ['OPENEO_CLIENT_SECRET'])
        for path in (state/'openeo').glob('*/job.json'):
            m=json.loads(path.read_text())
            if m['request']['aoi_id']!=str(rid):continue
            item={k:m.get(k) for k in ['job_id','phase','status','creation_options']}
            if m.get('job_id'):
                j=c.job(m['job_id']); data=j.describe()
                item['provider']={k:data.get(k) for k in ['status','created','updated','costs','budget','usage','job_options']}
                if result and data['status'] in {'queued','running'}:
                    j.stop_job(); item['cancel_requested']=True; item['status_after_cancel']=j.status()
            report['jobs'].append(item)
    except Exception as e:report['provider_check_error']=type(e).__name__
    report['exit']=result; report['elapsed_seconds']=round(time.monotonic()-start,2)
    report['finished']=datetime.now(timezone.utc).isoformat()
    (root/f'calibration-{rid}.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
sys.exit(result)
