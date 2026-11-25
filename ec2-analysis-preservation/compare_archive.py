import csv,json,pathlib,sys
root=pathlib.Path(__file__).parent
known=set(json.loads((root/'fontes-workspace.sha256.json').read_text()).values()) | set(json.loads((root/'fontes-modelos-s3.sha256.json').read_text()).values())
for file in sorted(root.glob('vol-*.files.json')):
 vid=file.name.split('.')[0]
 data=json.loads(file.read_text()); count=0;matched=0
 with (root/(vid+'.codes.csv')).open('w',newline='') as out:
  w=csv.writer(out);w.writerow(['Caminho na EC2','SHA-256','Bytes','Mesmo conteúdo no pacote de referência local ou S3'])
  for name,(h,size,code) in sorted(data.items()):
   if code:
    w.writerow(['/'+name,h,size,'sim' if h in known else 'não']);count+=1;matched+=h in known
 print(vid,'code/compared',count,matched)
