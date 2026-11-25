"""Resume the three pending continental species on the preserved EC2 disk."""

from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import sys
import traceback

BASE = Path('/workspace/rerun-20260930')
STAGE = Path('/workspace/remaining3-20261006')
REL = '01_data_acquisition/occurrences/cache.py'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


try:
    assert Path('/run/systemd/shutdown/scheduled').is_file(), 'Cost deadline is not installed'
    old_config = json.loads((BASE / 'config.json').read_text())
    new_config = json.loads((STAGE / 'config.json').read_text())
    old_manifest = json.loads((STAGE / 'previous_repo_manifest.json').read_text())
    assert digest(STAGE / 'previous_repo_manifest.json') == old_config['code_manifest_sha256']
    new_manifest = json.loads((STAGE / 'repo_manifest.json').read_text())
    assert old_config['budget_cutoff_utc'] == '2026-10-02T20:08:08.895034+00:00'
    assert new_config['budget_cutoff_utc'] > datetime.now(timezone.utc).isoformat()
    assert new_config['hourly_usd'] == 0.63904
    assert new_config['parallel_species'] == 2 and new_config['workers_each'] == 4
    assert new_config['occurrence_cache_date'] == '2026-10-02'
    assert len(new_config['species']) == 6
    assert [x['species'] for x in new_config['species'][:3]] == [
        'Eira_barbara', 'Vireo_chivi', 'Turdus_rufiventris'
    ]
    assert set(old_manifest) == set(new_manifest)
    assert all(old_manifest[k] == new_manifest[k] for k in old_manifest if k != REL)
    assert digest(BASE / 'repo' / REL) == old_manifest[REL]
    assert digest(STAGE / 'cache.py') == new_manifest[REL]
    assert digest(STAGE / 'repo_manifest.json') == new_config['code_manifest_sha256']
    assert old_config['code_manifest_sha256'] in new_config['accepted_code_manifest_sha256']
    for name in ('Turdus_rufiventris', 'Vireo_chivi', 'Eira_barbara'):
        assert (BASE / 'rounds' / name / old_config['round_name']).is_dir()
    assert len(list((BASE / 'repo' / '01_data_acquisition' / 'occurrences_cache' /
                     'gbif_pages').glob('*/*.json.gz'))) >= 500

    (BASE / 'resume_pending').write_text('Guard against service stop during 2026-10-06 preparation\n')
    subprocess.run(['systemctl', 'stop', 'predictions-rerun.service'], check=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = BASE / 'attempts' / ('before-remaining3-' + stamp)
    backup.mkdir(parents=True, exist_ok=False)
    for name in ['config.json', 'run.py', 'summary.json', 'run.log', 'repo_manifest.json']:
        source = BASE / name
        if source.is_file():
            shutil.copy2(source, backup / name)
    shutil.copy2(BASE / 'repo' / REL, backup / 'cache.py')
    for src, dst in [
        (STAGE / 'cache.py', BASE / 'repo' / REL),
        (STAGE / 'config.json', BASE / 'config.json'),
        (STAGE / 'run.py', BASE / 'run.py'),
        (STAGE / 'repo_manifest.json', BASE / 'repo_manifest.json'),
    ]:
        shutil.copy2(src, dst)
        os.chown(dst, 1000, 1000)
    for rel, expected in new_manifest.items():
        assert digest(BASE / 'repo' / rel) == expected, rel

    env = {**os.environ, 'SIAPESQ_OCCURRENCE_CACHE_DATE': '2026-10-02'}
    with (STAGE / 'tests.log').open('w') as output:
        subprocess.run(['runuser', '-u', 'ubuntu', '--', str(BASE / '.venv/bin/python'),
                        '-m', 'unittest', 'discover', '-s', 'tests',
                        '-p', 'test_provider_gbif.py', '-v'], cwd=BASE / 'repo', env=env,
                       stdout=output, stderr=subprocess.STDOUT, check=True)
        subprocess.run(['runuser', '-u', 'ubuntu', '--', str(BASE / '.venv/bin/python'),
                        '-c', 'from occurrences.cache import CacheManager; '
                              'assert CacheManager("/tmp", enabled=False).date_stamp == "2026-10-02"'],
                       cwd=BASE / 'repo/01_data_acquisition', env=env,
                       stdout=output, stderr=subprocess.STDOUT, check=True)

    prepared = {'status': 'prepared_resume', 'started_utc': datetime.now(timezone.utc).isoformat(),
                'previous_complete_scenarios': 51, 'cache_date': '2026-10-02',
                'backup': str(backup)}
    (BASE / 'summary.json').write_text(json.dumps(prepared, indent=2))
    (BASE / 'run.log').write_text('2026-10-06: resume remaining three with preserved cache\n')
    for name in ['summary.json', 'run.log']:
        os.chown(BASE / name, 1000, 1000)
    subprocess.run(['systemctl', 'start', 'predictions-rerun.service'], check=True)
    assert subprocess.run(['systemctl', 'is-active', '--quiet', 'predictions-rerun.service']).returncode == 0
    (BASE / 'resume_pending').unlink()
    print(json.dumps({'status': 'started', 'backup': str(backup),
                      'deadline': new_config['budget_cutoff_utc'],
                      'cache_date': new_config['occurrence_cache_date'],
                      'parallel_species': 2, 'workers_each': 4}), flush=True)
except Exception:
    print(traceback.format_exc(), file=sys.stderr, flush=True)
    (BASE / 'resume_pending').unlink(missing_ok=True)
    subprocess.run(['/usr/sbin/shutdown', '-h', '+1', 'Prediction bootstrap failed; stop cost'],
                   check=False)
    raise
