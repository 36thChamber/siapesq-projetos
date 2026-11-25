from mirror import *
def availability():
 rows,files=catalog();dest=client('writer'); live=json.loads((BASE/'prod-live.json').read_text())
 seen={x['Key']:(x['Size'],x['ETag']) for page in dest.get_paginator('list_objects_v2').paginate(Bucket=BUCKET) for x in page.get('Contents',[])}
 idx={x['source_key']:x for x in rows}
 def present(k):return k in seen and seen[k][0]==files[k][0] and ('-' in files[k][1] or seen[k][1]==files[k][1])
 needed={row[p+'key'] for v in live.values() for row in [idx[v['key']]] for p in ('source_','')}
 ready=[i for i,v in live.items() if all(present(idx[v['key']][p+'key']) for p in ('source_',''))]
 missing={k:files[k] for k in needed if not present(k)}
 return ready,missing
if __name__=='__main__':
 ready,missing=availability();print('ready',len(ready),'missing objects',len(missing),'bytes',sum(v[0] for v in missing.values()))
