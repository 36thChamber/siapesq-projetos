"""Append one species to the live catalog without rebuilding other species."""
import argparse
import concurrent.futures
import hashlib
import json
from datetime import datetime, timezone
from build_catalog import ROOT, S3, BUCKET, PREFIX, collect, save

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('name')
    parser.add_argument('--group', default='adicionais')
    args = parser.parse_args()
    entry = collect((args.name, args.group), 10)
    assert len(entry['images']) == 10, 'Collection incomplete; live catalog unchanged'
    def publish_image(img):
        S3.upload_file(str(ROOT / img['key']), BUCKET, img['key'], ExtraArgs={
            'ContentType': img['contentType'], 'CacheControl': 'private, max-age=86400',
            'Metadata': {'sha256': img['sha256']}})
        body = S3.get_object(Bucket=BUCKET, Key=img['key'])['Body'].read()
        assert hashlib.sha256(body).hexdigest() == img['sha256']
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(publish_image, entry['images']))
    key = PREFIX + '/catalog.json'
    previous = S3.get_object(Bucket=BUCKET, Key=key)
    before = previous['Body'].read()
    catalog = json.loads(before)
    original = [s for s in catalog['species'] if s['slug'] != entry['slug']]
    catalog['species'] = original + [entry]
    for taxon_key in {entry['usageKey'], entry['acceptedUsageKey']}:
        existing = catalog['byUsageKey'].get(str(taxon_key))
        assert existing in (None, entry['slug']), 'Taxon collision'
        catalog['byUsageKey'][str(taxon_key)] = entry['slug']
    stamp = datetime.now(timezone.utc).isoformat()
    catalog['createdAt'] = stamp
    catalog['counts'] = {'species': len(catalog['species']),
        'images': sum(len(s['images']) for s in catalog['species']),
        'complete': sum(s['status'] == 'complete' for s in catalog['species'])}
    raw = (json.dumps(catalog, ensure_ascii=False, indent=2) + '\n').encode()
    archive = PREFIX + '/runs/' + stamp.replace(':', '-')
    S3.put_object(Bucket=BUCKET, Key=archive+'/catalog-before.json', Body=before, ContentType='application/json')
    S3.put_object(Bucket=BUCKET, Key=archive+'/catalog.json', Body=raw, ContentType='application/json')
    # Refuse to overwrite any concurrent catalog update.
    S3.put_object(Bucket=BUCKET, Key=key, Body=raw, ContentType='application/json',
                  CacheControl='no-cache', IfMatch=previous['ETag'])
    assert S3.get_object(Bucket=BUCKET, Key=key)['Body'].read() == raw
    save(ROOT / 'catalog.json', catalog)
    extras_path = ROOT / 'extra_species.json'
    extras = json.loads(extras_path.read_text()) if extras_path.exists() else []
    extras = [item for item in extras if item[0] != args.name] + [[args.name, args.group]]
    save(extras_path, extras)
    save(ROOT / ('publication-' + entry['slug'] + '.json'), {
        'publishedAt': stamp, 'catalogKey': key, 'usageKey': entry['usageKey'],
        'images': len(entry['images']), 'counts': catalog['counts'],
        'catalogSha256': hashlib.sha256(raw).hexdigest(), 'previousSpeciesPreserved': len(original)})
    print(json.dumps({'usageKey': entry['usageKey'], 'images': len(entry['images']), 'counts': catalog['counts']}), flush=True)

if __name__ == '__main__':
    main()
