"""Compara a prévia calculada dos COGs lidos de produção com cada registro na API."""
from collections import Counter
from pathlib import Path
import csv,json,requests
root=Path(__file__).resolve().parent
env={l.partition('=')[0]:l.partition('=')[2].strip().strip('"\'') for l in (Path.home()/'projects/acolite_application/.env').read_text().splitlines() if '=' in l}
with (root/'previa-alertas.csv').open(encoding='utf-8-sig') as fd:rows=list(csv.DictReader(fd))
def identity(v):return str(v['id_reservatorio']),str(v['id_area_alerta']),v['data_alerta'][:10],v['tipo'],v['nivel_critico']
expected=Counter(identity(v) for v in rows)
seen={}
for day in sorted({x['data_alerta'][:10] for x in rows}):
    off=0
    while True:
        stamp=day+'T00:00:00.000Z'
        r=requests.get(env['SIAPESQ_BASE_API'].rstrip('/')+'/v1/phytoBloom/alertas',params={'data_inicio':stamp,'data_fim':stamp,'limit':1000,'offset':off},headers={'x-api-key':env['SIAPESQ_API_KEY']},timeout=30);r.raise_for_status();data=r.json()
        for v in data['alertas']:
            if identity(v)[:3] in {k[:3] for k in expected}:
                assert v['id'] not in seen;seen[v['id']]=v
        off+=len(data['alertas'])
        if off>=data['total']:break
        assert data['alertas']
got=Counter(identity(v) for v in seen.values())
proof={'esperados':sum(expected.values()),'conferidos':sum((got & expected).values()),'ausentes':sum((expected-got).values()),'adicionais':sum((got-expected).values()),'por_reservatorio':dict(Counter(str(v['id_reservatorio']) for v in seen.values())),'ids':sorted(seen)}
(root/'alertas-atuais-conferidos.json').write_text(json.dumps(proof,indent=2))
print({k:v for k,v in proof.items() if k!='ids'})
assert got==expected
