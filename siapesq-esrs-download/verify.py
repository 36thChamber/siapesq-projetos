from collections import Counter
from datetime import datetime
import hashlib, io, json, os, re, zipfile
from pathlib import Path
from zoneinfo import ZoneInfo
import requests

url = Path('link').read_text()
session=requests.Session()
def check(status):
    if status.status_code not in (200,206):
        raise ValueError(f'Unexpected status {status.status_code}')
    return status
head=check(session.head(url, timeout=20))
assert head.status_code==200 and head.headers['Accept-Ranges']=='bytes' and 'attachment' in head.headers['Content-Disposition']
total=int(head.headers['Content-Length'])
def read_range(start,end):
    r=check(session.get(url,headers={'Range':f'bytes={start}-{end}','If-Range':head.headers['ETag']},timeout=50))
    assert r.status_code==206 and r.headers['Content-Range']==f'bytes {start}-{end}/{total}' and len(r.content)==end-start+1
    return r.content
class Reader(io.RawIOBase):
    pos=0
    def seekable(self): return True
    def seek(self, offset, whence=0):
        self.pos=max(0,[0,self.pos,total][whence]+offset)
        return self.pos
    def tell(self): return self.pos
    def read(self,n=-1):
        end=total if n<0 else min(total,self.pos+n)
        if end<=self.pos:return b''
        b=read_range(self.pos,end-1)
        self.pos=end
        return b
rows=json.loads(Path('catalog.json').read_bytes())
files={k.split('/',1)[1]:(size,etag) for k,size,etag in rows}
with zipfile.ZipFile(Reader()) as archive:
    assert len(archive.infolist())==len(files)==1802
    assert {v.filename:v.file_size for v in archive.infolist()}=={k:v[0] for k,v in files.items()}
    candidates=[]
    for group in sorted({k.split('/')[0] for k in files}):
        candidates.append(min((k for k in files if k.startswith(group+'/')),key=lambda k:files[k][0]))
    for k in candidates:
        data=archive.read(k)
        assert hashlib.md5(data).hexdigest()==files[k][1]
    ids={(k.split('/')[0],k.split('/')[1]) for k in files}
    scenarios={(k.split('/')[0],k.split('/')[1],k.split('/')[2]) for k in files}
    assert len(ids)==34 and len(scenarios)==578
    # Cross an object boundary including the following local header in a single Range.
    first,second=archive.infolist()[:2]
    boundary=second.header_offset
    joined=read_range(boundary-8,boundary+39)
    assert joined[8:12]==b'PK\x03\x04' and joined==read_range(boundary-8,boundary-1)+read_range(boundary,boundary+39)
bad=session.head(url.split('?')[0],timeout=10)
assert bad.status_code in (403,404)
assert session.get(url,headers={'Range':f'bytes={total}-'},timeout=10).status_code==416
with session.get(url,stream=True,timeout=12) as first:
    assert first.status_code==200 and next(first.iter_content(4))==b'PK\x03\x04'
expires=datetime.fromtimestamp(json.loads(Path('access.json').read_text())['end'],ZoneInfo('America/Sao_Paulo')).strftime('%d/%m/%Y %H:%M')
print('Bytes ZIP',total,'espécies',len(ids),'espécie-cenários',len(scenarios),'grupos',dict(Counter(g for g,_ in ids)),'amostras',len(candidates),'expiração',expires,flush=True)
print(url)
