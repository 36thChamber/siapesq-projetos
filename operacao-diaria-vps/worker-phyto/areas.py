"""Recupera os limites originais dos retângulos de alerta, sem arredondar coordenadas."""
import requests

def limites(base_api,token,ids):
    result={}
    for reservoir in ids:
        r=requests.get(base_api.rstrip('/')+'/v1/phytoBloom/reservatorios/'+reservoir,
                       headers={'x-api-key':token},timeout=30)
        r.raise_for_status()
        for area in r.json()['areas_alertas']:
            xy={(float(p['longitude']),float(p['latitude'])) for p in area['regiao_alerta']}
            xs=sorted({x for x,y in xy});ys=sorted({y for x,y in xy})
            if len(xs)!=2 or len(ys)!=2 or len(xy)!=4:
                raise ValueError('A geometria cadastrada deixou de ser retangular')
            result[(reservoir,str(area['id']))]=[ys[0],xs[0],ys[1],xs[1]]
    return result
