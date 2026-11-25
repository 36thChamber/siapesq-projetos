#!/usr/bin/env python3
"""Read public GBIF taxonomy; no S3 writes or inferred ecological descriptions."""
import concurrent.futures
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'artifacts/content/gbif-taxonomy.json'


def fetch(path):
    request = urllib.request.Request('https://api.gbif.org/v1/' + path, headers={'User-Agent': 'SIAPESQ-clone-content/1.0'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                return json.load(response)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def collect(name):
    if name == 'Primatas grupo':
        return name, {'status': 'aggregate-model', 'source_name': name}
    match = fetch('species/match?' + urllib.parse.urlencode({'name': name, 'strict': 'true'}))
    if not match.get('usageKey') or match.get('matchType') == 'NONE' or match.get('rank') not in ('SPECIES', 'SUBSPECIES'):
        return name, {'status': 'needs-review', 'match': match}
    key = match['usageKey']
    record = fetch(f'species/{key}')
    accepted_key = match.get('acceptedUsageKey', key)
    vernaculars = fetch(f'species/{accepted_key}/vernacularNames?limit=100')
    portuguese = [item['vernacularName'] for item in vernaculars.get('results', [])
                  if item.get('language') in ('por', 'pt') and item.get('vernacularName')]
    return name, {'status': 'matched', 'match': match, 'record': record,
                  'portuguese_names': list(dict.fromkeys(portuguese)),
                  'source_url': f'https://www.gbif.org/species/{key}',
                  'api_url': f'https://api.gbif.org/v1/species/{key}'}


def main():
    catalog = json.loads((ROOT / 'artifacts/catalog-migration/staging-catalog.json').read_text())
    names = sorted({item['nome_cientifico'] for item in catalog['species']})
    data = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {'schema': 1, 'read_at': '2026-11-14', 'species': {}}
    pending = [name for name in names if name not in data['species']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(collect, name): name for name in pending}
        for future in concurrent.futures.as_completed(futures):
            try:
                name, record = future.result()
                data['species'][name] = record
            except Exception as error:
                print(json.dumps({'name': futures[future], 'error': type(error).__name__}), flush=True)
                continue
            OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
            print(json.dumps({'completed': len(data['species']), 'expected': len(names)}), flush=True)
    if len(data['species']) != len(names):
        raise RuntimeError('Taxonomy read incomplete; rerun to resume')


if __name__ == '__main__':
    main()
