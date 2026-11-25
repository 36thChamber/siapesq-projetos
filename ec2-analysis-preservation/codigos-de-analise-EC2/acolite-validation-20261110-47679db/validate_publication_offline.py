"""Exercise exact candidate publisher with captured, never executed, AWS argv."""
import argparse
import json
import os
from pathlib import Path
import sys
from types import SimpleNamespace
from validate_cached_scene import verify_offline_namespace, install_guard, digest

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo', required=True, type=Path)
    p.add_argument('--run', required=True, type=Path)
    args = p.parse_args()
    repo, run = args.repo.resolve(), args.run.resolve()
    verify_offline_namespace()
    blocked=[]
    install_guard(blocked)
    sys.path.insert(0,str(repo))
    os.environ['PROJ_NETWORK']='OFF'
    import publication
    report=json.loads((run/'report.json').read_text())
    if report.get('exit_code') not in (0,2) or not report.get('source_unchanged'):
        raise RuntimeError('Run is not accepted for simulated publication')
    manifest=Path(report['summary']['publication_manifest']).resolve()
    if not manifest.is_relative_to(run/'state'):
        raise RuntimeError('Manifest must belong to this isolated run')
    proof=json.loads(manifest.read_text())
    destination='s3://isolated-validation-only/SIMULATED-NOT-UPLOADED'
    captures=[]
    output=run/'simulated-publication.json'
    if output.exists():
        raise RuntimeError('Simulated publication report already exists')
    def fake_run(argv, **kwargs):
        if len(argv)!=5 or argv[:3]!=['OFFLINE_CAPTURE_ONLY','s3','cp']:
            raise RuntimeError('Unexpected publisher command')
        source=Path(argv[3]).resolve()
        if not source.is_relative_to(manifest.parent) or not source.parent.name.startswith('verified-'):
            raise RuntimeError('Publisher did not use its verified snapshot')
        if argv[4] != destination+'/'+source.name:
            raise RuntimeError('Unexpected simulated destination')
        captures.append({'argv':argv,'sha256':digest(source),'size':source.stat().st_size})
        output.write_text(json.dumps({'simulated_only':True,'copies':captures},indent=2))
        return SimpleNamespace(returncode=0)
    publication.subprocess.run=fake_run
    receipt=publication.publish(manifest,proof['token'],run/'out',destination,
                                'OFFLINE_CAPTURE_ONLY',proof['exit_code'],resume=True)
    expected=sum(len(s['products']) for s in proof['scenes'])
    if len(captures)!=expected or blocked:
        raise RuntimeError('Unexpected copy count or blocked external operation')
    publication.publish(manifest,proof['token'],run/'out',destination,
                        'OFFLINE_CAPTURE_ONLY',proof['exit_code'],resume=True)
    if len(captures)!=expected or blocked:
        raise RuntimeError('Publisher replay did not reuse completed simulated receipts')
    output.write_text(json.dumps({'simulated_only':True,'copies':captures,'receipt':receipt,
                                 'blocked_operations':blocked,'validated_products':expected,
                                 'replay_new_copies':0},indent=2))
    print(json.dumps({'simulated_only':True,'validated_products':expected,'report':str(output)}))
    return 0

if __name__=='__main__':
    sys.exit(main())
