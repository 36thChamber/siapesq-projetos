"""Restore original S3 keys from the verified consolidation plan. Read local evidence first."""
import boto3,json,base64
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from botocore.exceptions import ClientError
P=Path(__file__).parent;B='example-bucket';S=boto3.client('s3',region_name='sa-east-1')
records=json.loads((P/'stage-objects.json').read_text());markers={x['source']:x for x in json.loads((P/'stage-manifests.json').read_text())}
def restore(x):
 src=markers[x['source']]['backup'] if x['source'] in markers else x['destination']
 h=S.head_object(Bucket=B,Key=src,ChecksumMode='ENABLED')
 assert h['ContentLength']==x['bytes'] and base64.b64decode(h['ChecksumSHA256']).hex()==x['sha256'],src
 try:
  old=S.head_object(Bucket=B,Key=x['source'])
 except ClientError as e:
  if e.response['Error']['Code'] not in ('404','NoSuchKey','NotFound'):raise
 else:
  raise RuntimeError('Original already exists; refusing overwrite: '+x['source'])
 S.copy_object(Bucket=B,Key=x['source'],CopySource={'Bucket':B,'Key':src},CopySourceIfMatch=h['ETag'],ChecksumAlgorithm='SHA256')
 out=S.head_object(Bucket=B,Key=x['source'],ChecksumMode='ENABLED')
 assert out['ContentLength']==x['bytes'] and base64.b64decode(out['ChecksumSHA256']).hex()==x['sha256']
 return x['source']
if __name__=='__main__':
 print('Restoring original keys; canonical groups and archive are retained.')
 with ThreadPoolExecutor(max_workers=16) as pool:
  result=list(pool.map(restore,records))
 print('Restored and verified:',len(result))
