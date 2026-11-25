from pathlib import Path
import json,hashlib,subprocess,os
b=Path('/workspace/ocean-es-20261005');py=str(b/'.venv/bin/python')
m=json.loads((b/'repo_manifest.json').read_text())
assert all(hashlib.sha256((b/'repo'/p).read_bytes()).hexdigest()==h for p,h in m.items())
with (b/'repair_tests.log').open('w') as log:
 for test in ['test_marine_export_metrics.py','test_pipeline_profiles_balance.py']:
  subprocess.run([py,'-m','unittest','discover','-s','tests','-p',test,'-v'],cwd=b/'repo',stdout=log,stderr=subprocess.STDOUT,check=True)
subprocess.run([py,str(b/'repair_existing_tiffs.py')],check=True)
(b/'resume_pending').unlink()
subprocess.run(['sudo','systemctl','start','predictions-ocean-es.service'],check=True)
print('REPAIR_TESTS_PASSED_AND_BATCH_RESUMED',flush=True)
