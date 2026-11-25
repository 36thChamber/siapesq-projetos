# Reescreve a rotina que prepara destinos e configurações de acesso no Drive para backups.
from pathlib import Path

p = Path("preparar_drive.py")
s = p.read_text()
a = s.index("def prepare(")
b = s.index("if __name__", a)
s = (
    s[:a]
    + """def api(http, method, url, **kwargs):
    for attempt in range(12):
        response=http.request(method, url, timeout=20, **kwargs)
        if response.ok:
            return response
        if response.status_code not in (403,429,500,502,503,504):
            break
        time.sleep(min(5,attempt+1))
    raise RuntimeError(f"Drive recusou a emissão: HTTP {response.status_code}")


def prepare(args):
    now=dt.datetime.now(dt.timezone.utc)
    grant=token(args.config)
    if dt.datetime.fromisoformat(grant["expiry"]) <= now+dt.timedelta(minutes=5):
        subprocess.run([args.rclone, "about", "destino:", "--config", args.config,
                        "--retries", "2", "--low-level-retries", "2"],check=True,
                       stdout=subprocess.DEVNULL, timeout=65)
        grant=token(args.config)
    today=now.astimezone(SP).date()
    pending=getattr(args,"pending",{})
    dates=sorted(set(pending)|{(today+dt.timedelta(days=i)).isoformat() for i in range(7)})
    existing=json.loads(args.output.read_text()) if args.output.exists() else {}
    with requests.Session() as http:
        http.headers["Authorization"]="Bearer "+grant["access_token"]
        for day in dates:
            entry=existing.get(day,{})
            name=f"{os.environ['BACKUP_PREFIX']}-{day}.p7m"
            scheduled=dt.datetime.combine(dt.date.fromisoformat(day),dt.time(3,30),SP)
            if day in pending:
                q=f"'{args.folder}' in parents and name='{name}' and trashed=false"
                result=api(http,"GET","https://www.googleapis.com/drive/v3/files",params={"q":q,"fields":"files(name,size,sha256Checksum,shared),nextPageToken"}).json()
                if result["files"]:
                    files=result["files"]
                    if len(files)!=1 or result.get("nextPageToken") or files[0].get("shared") or files[0].get("sha256Checksum")!=pending[day]:
                        raise RuntimeError("Conciliação da cópia externa divergente")
                    existing[day]={"name":name,"confirmed":files[0]["sha256Checksum"],"size":int(files[0]["size"])}
                    continue
            elif entry.get("confirmed"):
                continue
            elif entry.get("id") and dt.datetime.fromisoformat(entry["expires"])>max(scheduled,now):
                continue
            file_id=entry.get("id")
            if not file_id:
                file_id=api(http,"GET","https://www.googleapis.com/drive/v3/files/generateIds",params={"count":1,"space":"drive","type":"files"}).json()["ids"][0]
            urls=[]
            for _ in range(2):
                r=api(http,"POST","https://www.googleapis.com/upload/drive/v3/files",
                      params={"uploadType":"resumable","fields":"id,name,size,sha256Checksum"},
                      headers={"X-Upload-Content-Type":"application/octet-stream"},
                      json={"id":file_id,"name":name,"parents":[args.folder],"mimeType":"application/octet-stream"})
                url=r.headers["Location"]
                if not re.match(r"https://(www|content)\\.googleapis\\.com/",url):
                    raise RuntimeError("Host de upload inesperado")
                urls.append(url)
            existing[day]={"id":file_id,"url":urls[0],"alternate":urls[1],"name":name,"expires":(now+dt.timedelta(days=7)).isoformat()}
        wanted={k:existing[k] for k in dates}
        with tempfile.NamedTemporaryFile(mode="w",dir=args.output.parent,delete=False) as out:
            json.dump(wanted,out)
        os.replace(out.name,args.output)
        print(f"Janelas autorizadas de {min(wanted)} até {max(wanted)}")


"""
    + s[b:]
)
p.write_text(s)
