from buscar_drive import *
from collections import deque
folders=dict(json.loads((base/'raizes-drive.json').read_text()))
todo=deque(folders);visited=set();seen=set()
out={'pastas':0,'arquivos':0,'exatos':[],'por_nome':[],'compactados':[],'sem_sha_mesmo_tamanho':[]}
while todo:
    batch=[]
    while todo and len(batch)<20:
        i=todo.popleft()
        if i not in visited:visited.add(i);batch.append(i)
    if not batch:continue
    for f in scan('trashed=false and ('+' or '.join("'"+i+"' in parents" for i in batch)+')'):
        i=f['id']
        if i in seen:continue
        seen.add(i)
        parent=next((k for k in f.get('parents',[]) if k in folders),None)
        path=folders.get(parent,'')+'/'+f['name']
        isfolder=f['mimeType']=='application/vnd.google-apps.folder'
        if f.get('shortcutDetails',{}).get('targetMimeType')=='application/vnd.google-apps.folder':
            i=f['shortcutDetails']['targetId'];isfolder=True
        if isfolder:
            folders[i]=path;todo.append(i)
            continue
        out['arquivos']+=1
        name=f['name'];sha=f.get('sha256Checksum');short={'id':i,'nome':name,'caminho':path,'bytes':int(f.get('size',0)),'sha256':sha}
        if sha in hashes:out['exatos'].append({**short,'original':hashes[sha]})
        if not sha and short['bytes'] in sizes:out['sem_sha_mesmo_tamanho'].append(short)
        if target.search(name) and not name.lower().endswith(('.tif','.png','.jpg','.tiff')):out['por_nome'].append(short)
        if archive.search(name):out['compactados'].append(short)
    out['pastas']=len(visited)
    tmp=base/'busca-compartilhados.tmp';tmp.write_text(json.dumps(out,ensure_ascii=False));tmp.replace(base/'busca-compartilhados.json')
    print(out['pastas'],out['arquivos'],len(todo),flush=True)
