import concurrent.futures
import json
import sys
from collections import Counter
from inventory import ACCOUNT, BACK, TIF, STE, client, collect, current_target, file, oldyear

def check(condition, message):
    if not condition:
        raise RuntimeError(message)

before = json.loads(file('before').read_text())

def clean_versions(name):
    initial = before[name]
    check(initial['versioning'] == 'Enabled', 'expected versioning')
    api = client(initial['region'])
    kw = {'Bucket':name, 'ExpectedBucketOwner':ACCOUNT}

    def batch(rows):
        for start in range(0,len(rows),500):
            items = [{'Key':r[0],'VersionId':r[1]} for r in rows[start:start+500]]
            check(all(i['VersionId'] for i in items), 'expected explicit version IDs')
            result = api.delete_objects(**kw,Delete={'Objects':items})
            check(not result.get('Errors'), str(result.get('Errors',[])[:3]))
            check(Counter((x['Key'],x['VersionId']) for x in items) == Counter((x['Key'],x['VersionId']) for x in result['Deleted']), 'mismatched batch response')

    rows = initial['objects']
    keep = [r for r in rows if r[2] and not r[5] and not (name == TIF and current_target(r[0]))]
    old = [r for r in rows if not r[2] and not r[5]]
    targeted = [r for r in rows if r[2] and not r[5] and name == TIF and current_target(r[0])]
    batch(old)
    batch(targeted)
    latest = collect(name)['objects']
    check(sorted(r for r in latest if not r[5]) == sorted(keep), 'unexpected data versions after data deletion')
    markers = [r for r in latest if r[5]]
    check({(r[0],r[1]) for r in markers} == {(r[0],r[1]) for r in rows if r[5]}, 'markers changed concurrently')
    live_keys = {r[0] for r in keep}
    check(all(r[0] not in live_keys for r in markers if r[2]), 'refused to expose an old data version')
    batch(markers)
    print(name, 'removed data versions', len(old), 'removed current objects',len(targeted),'removed markers',len(markers),flush=True)

def clean_years():
    initial = before[STE]
    kw = {'Bucket':STE,'ExpectedBucketOwner':ACCOUNT}
    api = client(initial['region'])
    check(not api.get_bucket_versioning(**kw).get('Status'), 'versioning changed')
    rows = [r for r in initial['objects'] if oldyear(r[0])]
    check(all(r[2] and not r[5] and r[1] is None and r[4] for r in rows), 'unexpected attributes')
    def remove_one(r):
        result=api.delete_object(**kw,Key=r[0],IfMatch=r[4])
        check(result['ResponseMetadata']['HTTPStatusCode'] == 204,'unexpected response')
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        list(pool.map(remove_one,rows))
    print(STE, 'removed year objects',len(rows),'bytes',sum(r[3] for r in rows),flush=True)

if __name__=='__main__':
    if sys.argv[1:] == ['main']:
        clean_versions(TIF)
        clean_years()
    elif sys.argv[1:] == ['backup']:
        clean_versions(BACK)
    else:
        raise ValueError('unknown scope')
