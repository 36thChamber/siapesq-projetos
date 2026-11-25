from pathlib import Path
import requests,json
from PIL import Image
from io import BytesIO
p=Path(__file__).resolve().parent;d=json.loads((p/'fotos_catalogo.json').read_text());choices=[0,1,1,0,0,1,0,1,2,0,2,0]
overrides={
'Sardinella brasiliensis':('https://r1.ufrrj.br/lep/img/sardinella.png','LEP / UFRRJ','https://r1.ufrrj.br/lep/colecao_ictiologica.html','Crédito à coleção; licença não informada na página'),
'Caretta caretta':('https://media.fisheries.noaa.gov/styles/original/s3/dam-migration/galv_loggerhead_turtle_t_moore_noaa_via_wikimedia_750_500.png?itok=2imlVJRS','T. Moore / NOAA','https://www.fisheries.noaa.gov/podcast/exploring-solutions-sea-turtle-bycatch','NOAA / domínio público'),
'Megaptera novaeangliae':('https://www.fisheries.noaa.gov/s3/dam-migration/2160x1440_humpbackwhale_noaa.jpg','NOAA Fisheries','https://www.fisheries.noaa.gov/species/humpback-whale','NOAA / domínio público')}
selected=[]
for i,sp in enumerate(d):
 name=sp['scientificName'];im=sp['images'][choices[i]];f=p/'fotos'/im['key'];credit=im.get('creator') or im.get('rightsHolder') or 'GBIF';url=im.get('references') or im['occurrenceUrl'];lic=im['license']
 if name in overrides:
  src,credit,url,lic=overrides[name];r=requests.get(src,timeout=30);r.raise_for_status();f=p/(name.replace(' ','_')+'_foto.png');Image.open(BytesIO(r.content)).convert('RGB').save(f)
 selected.append({'name':name,'file':str(f),'credit':credit,'source':url,'license':lic})
(p/'fotos_selecionadas.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2))
print([(x['name'],x['credit']) for x in selected])
