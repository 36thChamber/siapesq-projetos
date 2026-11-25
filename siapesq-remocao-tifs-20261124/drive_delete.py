from drive_access import session
import json,time,random,sys,requests,os
from pathlib import Path
os.umask(0o077)
known=json.load(open('drive-ids-originais.json'))
allowed=json.load(open('candidatos.json'))
snap=json.load(open('drive-rclone-owner.conf.json'))
assert snap['complete']
files=snap['files']
assert set(files)==set(known)
for i,x in files.items():
 k=known[i];t=allowed[k['sha']]
 assert not t['is_catalog'] and x['sha256Checksum']==k['sha'] and x['md5Checksum']==t['md5'] and int(x['size'])==t['size']==k['size'] and x['name']==k['name'] and x['ownedByMe'] and x['capabilities']['canDelete']
parents={tuple(x['parents']) for x in files.values()};assert len(parents)==1;parent=next(iter(parents))[0]
cfg='rclone-owner.conf';endpoint='https://www.googleapis.com/drive/v2/files'
def call(method,url,**kw):
 for attempt in range(16):
  try:r=session(cfg).request(method,url,timeout=25,**kw)
  except requests.RequestException:
   time.sleep(min(10+attempt*5,50));continue
  if r.ok or r.status_code==404:return r
  err=r.json()['error']['errors'][0]['reason']
  if err not in ('rateLimitExceeded','userRateLimitExceeded','backendError') and r.status_code not in (429,500,502,503,504):raise RuntimeError((r.status_code,err))
  if attempt in (0,6):print('Drive aguardando cota',method,'tentativa',attempt+1,flush=True)
  time.sleep(int(r.headers.get('Retry-After') or min(12+attempt*5,55))+random.random())
 raise RuntimeError('Drive indisponível após tentativas')
def listing():
 found={};token=None
 while True:
  p={'q':"'"+parent+"' in parents",'maxResults':1000,'fields':'nextPageToken,items(id,title,md5Checksum,fileSize,etag,capabilities/canDelete)'}
  if token:p['pageToken']=token
  r=call('GET',endpoint,params=p);r.raise_for_status();j=r.json();found.update((x['id'],x) for x in j.get('items',[]));token=j.get('nextPageToken')
  if not token:return found
listing_before=listing()
receipt=Path('exclusoes-drive.jsonl')
done={json.loads(x)[0] for x in receipt.read_text().splitlines()} if receipt.exists() else set()
if not done:assert set(files)<=set(listing_before)
with receipt.open('a',buffering=1) as log:
 for i in sorted(set(files)-done):
  k=files[i];x=listing_before.get(i)
  if x is None:raise RuntimeError('Ausência inesperada antes da exclusão')
  assert x['title']==k['name'] and x['md5Checksum']==k['md5Checksum'] and x['fileSize']==k['size'] and x['capabilities']['canDelete'] and x['etag']
  r=call('DELETE',endpoint+'/'+i,headers={'If-Match':x['etag']},params={'supportsAllDrives':'true'})
  assert r.status_code in (204,404),(r.status_code,i)
  log.write(json.dumps([i,k['sha256Checksum'],r.status_code])+'\n');done.add(i)
  if len(done)%15==0:print('Removidos do Drive',len(done),flush=True)
  time.sleep(.15)
 os.fsync(log.fileno())
remaining=listing();assert not(set(known)&set(remaining))
print('DRIVE_VERIFICADO',len(done),flush=True)
