from remoto import *
import sys
mode=sys.argv[1]
assert mode in ('antes','copiado','final')
pairs=json.loads((D/'pares.json').read_bytes())
script="""python3 - <<'END'
import base64,gzip,json,boto3,os,hashlib,re
from botocore.config import Config
from botocore.exceptions import ClientError
from concurrent.futures import ThreadPoolExecutor
pairs=json.loads(gzip.decompress(base64.b64decode('''PAYLOAD''')))
mode='MODE'
s=boto3.client('s3',region_name='us-east-1',endpoint_url=os.environ['SOURCE_ENDPOINT'],config=Config(signature_version='s3v4',s3={'addressing_style':'path'},connect_timeout=10,read_timeout=25,max_pool_connections=8))
B='siapesq-cog-vps'
def head(k,e):
 h=s.head_object(Bucket=B,Key=k);md=h['Metadata']
 assert h['ETag'].strip('"')==md['content-md5'] and md['origin-etag']==e and re.fullmatch('[a-f0-9]{64}',md['sha256']) and h['ContentLength']>128,(k,'metadados')
 if '-' not in e:assert h['ETag'].strip('"')==e
 return h['ETag'],md['sha256'],h['ContentLength']
def verify(row):
 old,new,oc,nc=[row[k] for k in ('old','new','old_cog','new_cog')]
 e0,e1,e2,e3=row['etags'];raw=head(new,e1);cog=head(nc,e3)
 for k,v in ((new,raw),(nc,cog)):
  r=s.get_object(Bucket=B,Key=k,Range='bytes=0-15',IfMatch=v[0])
  with r['Body'] as f: data=f.read()
  assert r['ResponseMetadata']['HTTPStatusCode']==206 and len(data)==16 and data[:4] in (b'II*\\0',b'II+\\0',b'MM\\0*',b'MM\\0+'),k
 for k,e in ((old,e0),(oc,e2)):
  if k==old and row['keep_address'] and mode!='antes':
   assert head(k,e1)==raw
  elif mode=='final':
   try:s.head_object(Bucket=B,Key=k)
   except ClientError as exc:assert exc.response['ResponseMetadata']['HTTPStatusCode']==404
   else:raise ValueError('Ainda existe: '+k)
  else:head(k,e)
 return raw[2],cog[2]
with ThreadPoolExecutor(max_workers=6) as pool:out=list(pool.map(verify,pairs))
print('VERIFICADO',mode,len(out),sum(r[0]+r[1] for r in out))
END
""".replace('PAYLOAD',literal(pairs)).replace('MODE',mode)
out=run('siapesq-download-esrs-djgmob',script);line=next(x[x.index('VERIFICADO '):] for x in out.splitlines() if 'VERIFICADO '+mode in x);print(line);(D/('verificado-'+mode+'.txt')).write_text(line+'\n')
