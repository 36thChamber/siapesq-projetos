from pathlib import Path
import csv,json,os
d=Path(__file__).resolve().parent;rows=json.loads((d/'pares.json').read_bytes())
assert len(rows)==138 and (d/'verificado-final.txt').exists() and (d/'https-legado.txt').exists()
out=Path('/mnt/a/Downloads/Substituicao-TIFFs-SIAPESQ-2026-11-24.csv');tmp=out.with_suffix('.csv.tmp')
with tmp.open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f,delimiter=';');w.writerow(['Espécie','Período','Produto','Produção anterior (UTC)','Produção atual (UTC)','Original anterior na VPS','Original atual na VPS','Ação no endereço anterior','COG antigo excluído','COG atual','MD5 original antigo','MD5 original atual','MD5 COG antigo','MD5 COG atual'])
 for r in rows:w.writerow([r['species'].replace('_',' ').capitalize(),r['period'],r['product'],r['old_date'],r['new_date'],r['old'],r['new'],'Conteúdo substituído no endereço usado pelo catálogo legado' if r['keep_address'] else 'Arquivo antigo excluído',r['old_cog'],r['new_cog'],*r['etags']])
tmp.replace(out);print(out)
