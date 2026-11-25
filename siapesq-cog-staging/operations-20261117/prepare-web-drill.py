import pathlib,json,os
os.umask(0o077)
root=pathlib.Path(__file__).parent
state=json.loads((root/'drill-instance.json').read_text());plan=json.loads((root/'drill-plan.json').read_text())
host='recovery-'+plan['uid']+'.'+state['public_ip'].replace('.','-')+'.sslip.io'
state['recovery_origin']='https://'+host;(root/'drill-instance.json').write_text(json.dumps(state,indent=2))
script='''#!/bin/bash
set -euo pipefail
umask 077
cd /opt/siapesq-recovery
python3 - <<'PY'
from pathlib import Path
p=Path('restore/recovered.env');lines=p.read_text().splitlines();origin='https://HOST_PLACEHOLDER';p.write_text('\\n'.join('STAGING_APP_ORIGIN='+origin if l.startswith('STAGING_APP_ORIGIN=') else l for l in lines)+'\\n');p.chmod(0o600)
PY
docker network create siapesq-recovery-web >/dev/null
docker run -d --name recovered-clone --network siapesq-recovery-web --network-alias clone --restart unless-stopped --memory 2g --cpus 2 --pids-limit 256 --security-opt no-new-privileges --env-file restore/recovered.env -v /opt/siapesq-recovery/restore/recovered:/data siapesq-cog-clone:20261116-browsers >/dev/null
cat > Caddyfile <<'CADDY'
{
 admin off
}
HOST_PLACEHOLDER {
 reverse_proxy clone:3000
}
CADDY
docker pull caddy:2-alpine >/dev/null
docker run -d --name recovery-tls --network siapesq-recovery-web --restart unless-stopped --memory 128m --cpus 0.5 --pids-limit 64 -p 80:80 -p 443:443 -v /opt/siapesq-recovery/Caddyfile:/etc/caddy/Caddyfile:ro -v recovery-caddy-data:/data caddy:2-alpine >/dev/null
docker image inspect caddy:2-alpine --format '{{json .RepoDigests}}'
echo RECOVERED_WEB_BOOTED
'''.replace('HOST_PLACEHOLDER',host)
(root/'start-recovered-web.sh').write_text(script);print(json.dumps({'temporary_origin':state['recovery_origin']}))
