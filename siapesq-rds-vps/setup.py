import json,os,secrets,sys,subprocess,yaml
from pathlib import Path
D=Path(__file__).resolve().parent
sys.path.insert(0,str(D.parent/'siapesq-vps-cog'));from ingress import s,API
A=Path.home()/'projects/aws-db-recovery/2026-09-07'; SRC=json.loads((A/'production-credentials.json').read_text())
def call(n,b):
 r=s.post(API+n,json=b,timeout=60);r.raise_for_status();return r.json()
def secret(n):
 p=D/n
 if not p.exists():p.write_text(secrets.token_urlsafe(48))
 return p.read_text()
if __name__=='__main__':
 os.umask(0o077)
 pg=secret('db-password');backup=secret('backup-key')
 cfg={'services':{'postgres':{'image':'postgres:15-bookworm','restart':'unless-stopped','environment':{'POSTGRES_PASSWORD':'${PG_ADMIN_PASSWORD}'},'volumes':['dados:/var/lib/postgresql/data'],'ports':['127.0.0.1:55435:5432']}},'volumes':{'dados':{}}}
 content=yaml.safe_dump(cfg);idfile=D/'compose-id'
 if not idfile.exists():idfile.write_text(call('compose.create',{'name':'PostgreSQL legado SIAPESQ','appName':'siapesq-postgres-legado','environmentId':'W86YvSqd4jIYEP_S_MRmX','sourceType':'raw','composeType':'docker-compose','composeFile':content})['composeId'])
 call('compose.update',{'composeId':idfile.read_text(),'env':'PG_ADMIN_PASSWORD='+pg,'composeFile':content})
 call('compose.deploy',{'composeId':idfile.read_text()})
