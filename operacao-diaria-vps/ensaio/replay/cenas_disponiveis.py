from pathlib import Path
import json,requests
root=Path(__file__).resolve().parent
env={l.partition('=')[0]:l.partition('=')[2].strip().strip('"\'') for l in (Path.home()/'projects/acolite_application/.env').read_text().splitlines() if '=' in l}
output={}
for i in ('165','541','542'):
    r=requests.get(env['SIAPESQ_BASE_API'].rstrip('/')+'/v1/phytoBloom/reservatorios/'+i,headers={'x-api-key':env['SIAPESQ_API_KEY']},timeout=25);r.raise_for_status()
    coords=r.json()['posicoes'];xs=[float(p['longitude']) for p in coords];ys=[float(p['latitude']) for p in coords]
    bounds=[min(xs),min(ys),max(xs),max(ys)]
    url='https://stac.dataspace.copernicus.eu/v1/search'
    params={'collections':'sentinel-2-l2a','bbox':','.join(map(str,bounds)),'datetime':'2026-11-09T00:00:00Z/2026-11-23T23:59:59Z','limit':100}
    r=requests.get(url,params=params,timeout=30);r.raise_for_status()
    data=r.json();assert data['type']=='FeatureCollection'
    dates=sorted({f['properties']['datetime'][:10] for f in data['features']})
    output[i]={'acquisitions':dates,'items':len(data['features']),'bbox':bounds}
    print(i,dates,flush=True)
(root/'catalogo-copernicus.json').write_text(json.dumps(output,indent=2))
