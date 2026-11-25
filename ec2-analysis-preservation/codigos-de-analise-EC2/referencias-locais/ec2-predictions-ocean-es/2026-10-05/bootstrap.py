from pathlib import Path
import json,hashlib,os,shutil,subprocess,tarfile
import boto3

BASE=Path('/workspace/ocean-es-20261005');BASE.mkdir(exist_ok=True)
CFG=json.loads((BASE/'config.json').read_text());S3=boto3.client('s3',region_name=CFG['region'])
def digest(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
try:
    for name in ['repo.tar.gz','marine_inputs.tar','worker.tar.gz']:
        p=BASE/name;key='ocean-es-20261005/'+name
        if not p.exists() or digest(p)!=CFG['packages'][name]['sha256']:
            S3.download_file(CFG['staging_bucket'],key,str(p))
        assert digest(p)==CFG['packages'][name]['sha256']
        with tarfile.open(p) as t:t.extractall(BASE,filter='data')
    repo=BASE/'repo';manifest=json.loads((BASE/'repo_manifest.json').read_text())
    for rel,sha in manifest.items():assert digest(repo/rel)==sha,rel
    # Clone the working environment; preserve the earlier batch's environment.
    if not (BASE/'.venv').exists():shutil.copytree('/workspace/rerun-20260930/.venv',BASE/'.venv',symlinks=True)
    py=str(BASE/'.venv/bin/python')
    subprocess.run([py,'-m','pip','install','--quiet','copernicusmarine==2.4.1','netCDF4','dask','joblib','scikit-learn'],check=True)
    subprocess.run([py,str(BASE/'finish_monthly_cache.py')],check=True)
    os.chmod(repo/'.env',0o600)
    subprocess.run(['chown','-R','ubuntu:ubuntu',str(BASE)],check=True)
    with (BASE/'tests.log').open('w') as log:
        subprocess.run(['runuser','-u','ubuntu','--',py,'-m','unittest','discover','-s','tests','-p','test_pipeline_profiles_balance.py','-v'],cwd=repo,stdout=log,stderr=subprocess.STDOUT,check=True)
        subprocess.run(['runuser','-u','ubuntu','--','Rscript','-e','library(randomForest);library(terra);cat("Marine R dependencies OK\\n")'],stdout=log,stderr=subprocess.STDOUT,check=True)
    for item in CFG['species']:
        sp=item['species']
        if item.get('reuse_variables'):
            dest=repo/'07 Executado por espécie'/sp/CFG['round_name'];dest.mkdir(parents=True,exist_ok=True)
            folder=dest/(sp+'_variables_marinho_05_10_26');folder.mkdir(exist_ok=True)
            shutil.copy2(BASE/'inputs/Pomatomus_variables_cached.csv',folder/'Variables_Pomatomus_saltatrix_05_10_26.csv')
            shutil.copy2(BASE/'inputs/Pomatomus_occurrences_cached.csv',dest/'Occurrence_Pomatomus_saltatrix_05_10_26.csv')
    subprocess.run(['chown','-R','ubuntu:ubuntu',str(BASE)],check=True)
    unit='''[Unit]
Description=Four ES marine annual predictions with native ocean profiles and 1:1 training
After=network-online.target
Wants=network-online.target
[Service]
Type=exec
User=ubuntu
WorkingDirectory=/workspace/ocean-es-20261005
ExecStart=/workspace/ocean-es-20261005/.venv/bin/python -u /workspace/ocean-es-20261005/run.py
ExecStopPost=+/usr/bin/python3 /workspace/ocean-es-20261005/shutdown_if_finished.py
TimeoutStopSec=120
StandardOutput=append:/workspace/ocean-es-20261005/run.log
StandardError=append:/workspace/ocean-es-20261005/run.log
'''
    Path('/etc/systemd/system/predictions-ocean-es.service').write_text(unit)
    (BASE/'summary.json').write_text(json.dumps({'status':'prepared'}));os.chown(BASE/'summary.json',1000,1000)
    subprocess.run(['systemctl','daemon-reload'],check=True)
    subprocess.run(['systemctl','start','predictions-ocean-es.service'],check=True)
    assert subprocess.run(['systemctl','is-active','--quiet','predictions-ocean-es.service']).returncode==0
    print('OCEAN_ES_STARTED',flush=True)
except Exception:
    subprocess.run(['/usr/sbin/shutdown','-h','+1','Ocean ES preparation failed'])
    raise
