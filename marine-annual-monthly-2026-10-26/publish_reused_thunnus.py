#!/usr/bin/env python3
"""Publish the verified October 14 Thunnus annual map from the EC2 checkpoint."""

from pathlib import Path
import hashlib
import json

import boto3

BASE = Path(__file__).resolve().parent
CFG = json.loads((BASE / 'config.json').read_text())
S3 = boto3.client('s3', region_name=CFG['bucket_region'])
BUCKET = CFG['bucket']
SOURCE = BASE / 'reused_thunnus'
TARGET = CFG['prefix'] + '/Thunnus_obesus/anual_2015_2024'


def main():
    marker = json.loads((SOURCE / 'complete.json').read_text())
    assert marker['status'] == 'complete' and marker['scenario'] == 'anual_2015_2024'
    published = []
    for entry in marker['files']:
        path = SOURCE / entry['name']
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        assert len(raw) == entry['bytes'] and digest == entry['sha256']
        key = TARGET + '/' + path.name
        mime = 'image/tiff' if path.suffix == '.tif' else 'application/json'
        S3.put_object(Bucket=BUCKET, Key=key, Body=raw, ContentType=mime,
                      Metadata={'sha256': digest})
        again = S3.get_object(Bucket=BUCKET, Key=key)['Body'].read()
        assert hashlib.sha256(again).hexdigest() == digest
        published.append({'key': key, 'bytes': len(raw), 'sha256': digest})
    result = {**marker, 'files': published,
              'reused_from': 'EC2 Thunnus obesus batch 2026-10-14; local verified checkpoint',
              'copy_verification': 'source and destination full SHA-256 readback'}
    S3.put_object(Bucket=BUCKET, Key=TARGET + '/complete.json',
                  Body=json.dumps(result, indent=2, ensure_ascii=False).encode(),
                  ContentType='application/json')
    print('Thunnus obesus', len(published), 'files verified')


if __name__ == '__main__':
    main()
