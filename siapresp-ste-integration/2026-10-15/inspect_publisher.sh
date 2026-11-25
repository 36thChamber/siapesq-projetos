set -eu
python3 - <<'PY'
from pathlib import Path
root=Path('/workspace/models')
for file in ['scripts/publish_s3.py','scripts/cleanup_local_artifacts.py']:
 p=root/file
 print('FILE',file)
 lines=p.read_text().splitlines()
 for i,line in enumerate(lines):
  if any(w in line for w in ['def ', 'run_summary', 'S3_BASE_URI', 'predictions/daily','get_object','head_object','delete','source_root','allowed_root']):
   print('\n'.join(f'{j+1}: {lines[j]}' for j in range(max(0,i-1),min(len(lines),i+5))))
for p in (root/'data/daily').glob('*/manifest.json'):
 import json
 d=json.loads(p.read_text());print('MANIFEST_SCHEMA',p,d.keys(),d.get('files'));break
PY
