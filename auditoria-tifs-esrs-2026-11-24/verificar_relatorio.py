from pathlib import Path
from openpyxl import load_workbook
from collections import Counter
import pymupdf,json
base=Path('/mnt/a/Downloads/Auditoria-TIFFs-ES-RS-2026-11-24')
book=load_workbook(base.with_suffix('.xlsx'),read_only=True,data_only=True)
sumario=json.loads(Path('resumo.json').read_text())
s=list(book['Séries'].values)
assert len(s)==1803 and len(set((a,b,c) for a,b,c,*_ in s[1:]))==1802
assert Counter(x[3] for x in s[1:])==Counter(sumario['resultados'])
assert all(x[10]=='Sim' for x in s[1:])
assert book['Proveniência'].max_row-1==sumario['registros']
assert book['Anuais exploratórios'].max_row-1==sumario['extras']
assert all(row[4]=='Medido' for row in list(book['Anuais exploratórios'].values)[1:])
pdf=pymupdf.open(base.with_suffix('.pdf'))
assert len(pdf)==3 and all('SIAPESQ' in p.get_text() for p in pdf)
assert '0,244' in pdf[0].get_text() and '1.802' in pdf[2].get_text()
print('Validação final aprovada, 3 páginas e',len(book.sheetnames),'abas')
