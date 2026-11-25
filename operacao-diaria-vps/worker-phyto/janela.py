"""Seleciona a última aquisição já catalogada e reaproveita o job da mesma janela."""
from datetime import date,timedelta
import json
from pathlib import Path
import requests

def aquisicao(aoi, start, last_day):
    extent=aoi['spatial_extent']
    coords=[extent[k] for k in ('west','south','east','north')]
    url='https://stac.dataspace.copernicus.eu/v1/search'
    params={'collections':'sentinel-2-l2a','bbox':','.join(map(str,coords)),
            'datetime':f'{start}T00:00:00Z/{last_day}T23:59:59Z','limit':100}
    reply=requests.get(url,params=params,timeout=45)
    reply.raise_for_status()
    result=reply.json()
    if any(link.get('rel')=='next' for link in result['links']):
        raise ValueError('Consulta de cenas excedeu uma página')
    dates=[item['properties']['datetime'][:10] for item in result['features']]
    if not dates:raise ValueError('Sem aquisição Sentinel-2 L2A no catálogo para esta janela')
    return max(dates)

def janela(aoi, start, last_day, state, day=None):
    day=day or aquisicao(aoi, start, last_day)
    for path in sorted((Path(state)/'openeo').glob('*/job.json')):
        job=json.loads(path.read_text())
        if job['request']['aoi_id']!=str(aoi['id']) or job.get('status') in ('error','canceled'):continue
        graph=job['request']['graph']
        args=next(node['arguments'] for node in graph.values() if node['process_id']=='load_collection')
        lo,hi=args['temporal_extent']
        if lo>=start and lo<=day<hi and hi<=(date.fromisoformat(last_day)+timedelta(days=1)).isoformat():
            return lo,hi
    return day,(date.fromisoformat(day)+timedelta(days=1)).isoformat()
