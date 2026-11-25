import sys,json,urllib.request,csv,io,collections,pathlib,hashlib,subprocess
base=pathlib.Path(__file__).parent
item=json.loads(sys.argv[1]); f=item['file']; url=item['download_url']
try:
    data=subprocess.run(['curl','-fsSL','--retry','2',url],capture_output=True,check=True).stdout
    if f.get('size') and len(data)!=int(f['size']): raise ValueError('size mismatch')
    (base/'csv').mkdir(exist_ok=True)
    (base/'csv'/(f['id']+'.csv')).write_bytes(data)
    s=data.decode('utf-8-sig'); reader=csv.DictReader(io.StringIO(s)); cols=reader.fieldnames
    counts={c:collections.Counter() for c in cols if c.lower() in ['sp','presence','presence_absence','occurrence','pa','source','presenca','presença','class','label','occurrenceStatus'.lower()]}
    n=0
    for row in reader:
        n+=1
        for c in counts: counts[c][row.get(c)]+=1
    result={**f,'rows':n,'columns':cols,'counts':counts,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
    (base/'results').mkdir(exist_ok=True)
    (base/'results'/(f['id']+'.json')).write_text(json.dumps(result,ensure_ascii=False))
    print(json.dumps({'file':f['path'],'rows':n,'counts':{k:v for k,v in counts.items() if k!='source'}}))
except Exception as e:
    print(json.dumps({'file':f['path'],'error':str(e)}));sys.exit(1)
