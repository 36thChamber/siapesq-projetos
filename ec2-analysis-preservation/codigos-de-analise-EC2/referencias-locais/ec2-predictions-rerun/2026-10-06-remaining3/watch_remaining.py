"""Audit the resumed common-six prefix and enforce this activation's cost cap."""

from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import json
import time
import traceback

import boto3
from botocore.exceptions import ClientError

BASE = Path(__file__).resolve().parent
PLAN = json.loads((BASE / 'plan.json').read_text())
CFG = json.loads((BASE / 'payload/config.json').read_text())
S3 = boto3.client('s3', region_name=CFG['output_region'])
EC2 = boto3.client('ec2', region_name=CFG['region'])
BUCKET = CFG['bucket']
PREFIX = CFG['prefix'] + '/'
DEADLINE = datetime.fromisoformat(PLAN['budget_cutoff_utc'])
SPECIES = {item['species']: item['perfil'] for item in CFG['species']}
EXPECTED = {(sp, scenario) for sp in SPECIES for scenario in CFG['scenarios']}


def utc():
    return datetime.now(timezone.utc)


def read_json(key):
    try:
        return json.loads(S3.get_object(Bucket=BUCKET, Key=key)['Body'].read())
    except ClientError as exc:
        if exc.response['Error']['Code'] in ('NoSuchKey', '404'):
            return None
        raise


def markers():
    return [obj['Key'] for page in S3.get_paginator('list_objects_v2').paginate(
        Bucket=BUCKET, Prefix=PREFIX
    ) for obj in page.get('Contents', []) if obj['Key'].endswith('/complete.json')]


while True:
    try:
        instance = EC2.describe_instances(InstanceIds=[PLAN['instance_id']])['Reservations'][0]['Instances'][0]
        state = instance['State']['Name']
        summary = read_json(PREFIX + '_run/summary.json') or {}
        keys = markers()
        counts = Counter(key[len(PREFIX):].split('/')[0] for key in keys)
        progress = {'checked_utc': utc().isoformat(), 'instance_state': state,
                    'summary_status': summary.get('status'), 'marker_count': len(keys),
                    'expected': 102, 'new_markers': max(0, len(keys) - 51),
                    'by_species': {sp: counts[sp] for sp in SPECIES},
                    'deadline_utc': PLAN['budget_cutoff_utc']}
        (BASE / 'progress.json').write_text(json.dumps(progress, indent=2))
        print(json.dumps(progress), flush=True)
        if utc() >= DEADLINE and state in ('pending', 'running'):
            EC2.stop_instances(InstanceIds=[PLAN['instance_id']])
        if state in ('stopped', 'terminated'):
            break
    except Exception:
        print(traceback.format_exc(), flush=True)
    time.sleep(45)


def verify(key):
    marker = read_json(key)
    assert marker['status'] == 'complete' and len(marker['files']) == 5, key
    sp, scenario = marker['species'], marker['scenario']
    assert (sp, scenario) in EXPECTED, key
    assert key == PREFIX + sp + '/' + scenario + '/complete.json', key
    method = marker['methodology']
    assert method['perfil'] == SPECIES[sp], key
    assert method['class_counts']['0'] == method['class_counts']['1'] > 0, key
    assert method['code_manifest_sha256'] in CFG['accepted_code_manifest_sha256'], key
    assert method['prediction_driver_sha256'] == CFG['prediction_driver_sha256'], key
    assert marker['model_sha256'] == method['model_sha256'], key
    for artifact in marker['files']:
        head = S3.head_object(Bucket=BUCKET, Key=artifact['key'])
        assert head['ContentLength'] == artifact['bytes'] > 0, artifact['key']
        assert head.get('Metadata', {}).get('sha256') == artifact['sha256'], artifact['key']
    return marker


keys = markers()
with ThreadPoolExecutor(max_workers=8) as pool:
    verified = list(pool.map(verify, keys))
found = {(m['species'], m['scenario']) for m in verified}
assert len(found) == len(verified)
counts = Counter(m['species'] for m in verified)
status = ('complete' if found == EXPECTED and summary.get('status') == 'complete'
          else 'partial')
now = utc()
audit = {'status': status, 'verified_utc': now.isoformat(),
         'instance_state': state, 'expected_scenarios': 102,
         'verified_scenarios': len(verified),
         'verified_result_files': sum(len(m['files']) for m in verified),
         'by_species': {sp: counts[sp] for sp in SPECIES},
         'verdicts': {sp: dict(Counter(m['coherence']['veredito'] for m in verified
                                       if m['species'] == sp)) for sp in SPECIES},
         'compute_elapsed_upper_usd': round((now - datetime.fromisoformat(
             PLAN['started_utc'])).total_seconds() / 3600 * PLAN['hourly_usd'], 3),
         'markers': verified}
(BASE / 'audit_final.json').write_text(json.dumps(audit, indent=2))
report = ['# Retomada das três comuns', '',
          f"Estado: {status}. Cenários no lote: {len(verified)}/102; novos: "
          f"{max(0, len(verified) - 51)}/51. EC2: {state}.", '',
          '| Espécie | Cenários | APROVADO | SUSPEITO | REPROVADO |',
          '|---|---:|---:|---:|---:|']
for sp in SPECIES:
    v = audit['verdicts'][sp]
    report.append(f"| {sp.replace('_', ' ')} | {counts[sp]}/17 | "
                  f"{v.get('APROVADO', 0)} | {v.get('SUSPEITO', 0)} | "
                  f"{v.get('REPROVADO', 0)} |")
report.extend(['', f"Teto conservador desta ativação até a verificação de parada: "
               f"US$ {audit['compute_elapsed_upper_usd']:.2f} de computação. "
               'Armazenamento e transferência separados.',
               '', 'Os vereditos são uma triagem automática; não constituem aprovação ecológica.',
               '', f"S3: s3://{BUCKET}/{CFG['prefix']}/"])
(BASE / 'RELATORIO_FINAL.md').write_text('\n'.join(report) + '\n')
for name in ('audit_final.json', 'RELATORIO_FINAL.md'):
    path = BASE / name
    S3.upload_file(str(path), BUCKET, PREFIX + '_run/remaining3_' + name)

rule_file = BASE / 'temporary_ssh_rule.json'
if rule_file.exists():
    rule = json.loads(rule_file.read_text())
    if rule['added']:
        EC2.revoke_security_group_ingress(GroupId=rule['group_id'], IpPermissions=[
            {'IpProtocol': 'tcp', 'FromPort': 22, 'ToPort': 22,
             'IpRanges': [{'CidrIp': rule['cidr']}]}
        ])
print('REMAINING3_FINAL', status, len(verified), flush=True)
