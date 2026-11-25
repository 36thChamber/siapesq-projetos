import sys,subprocess
sys.path.insert(0,'../siapesq-vps-cog')
from ingress import s,API
from pathlib import Path
import requests
cs=[v for v in s.get(API+'docker.getContainers',timeout=12).json() if 'siapesq-download-esrs-' in v['name']]
if cs:
 print(cs[0]['status'],flush=True)
 subprocess.run(['node','logs.cjs',cs[0]['containerId']])
print('API',requests.head(Path('link').read_text(),timeout=5).status_code)
