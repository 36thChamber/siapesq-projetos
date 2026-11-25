import requests,time,subprocess,sys
from pathlib import Path
link=Path('link').read_text()
for attempt in range(120):
    try:
        status=requests.head(link,timeout=10).status_code
        if status==200:
            raise SystemExit(subprocess.call([sys.executable,'verify.py']))
    except requests.RequestException:
        pass
    time.sleep(5)
raise SystemExit('Tempo de validação excedido')
