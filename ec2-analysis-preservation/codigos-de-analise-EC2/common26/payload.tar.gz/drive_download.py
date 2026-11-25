from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import requests,os,json,time
class DownloadForm(HTMLParser):

    def __init__(self):
        super().__init__()
        self.action = None
        self.fields = {}
        self.inside = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'form' and a.get('id') == 'download-form':
            self.action = a.get('action')
            self.inside = True
        if self.inside and tag == 'input' and a.get('name'):
            self.fields[a['name']] = a.get('value', '')

    def handle_endtag(self, tag):
        if tag == 'form':
            self.inside = False
def download(meta, dest):
    if dest.exists() and dest.stat().st_size == meta['size']:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        try:
            with requests.Session() as session:
                response = session.get('https://drive.google.com/uc', params={'export': 'download', 'id': meta['id']}, stream=True, timeout=(30, 180))
                response.raise_for_status()
                if 'text/html' in response.headers.get('Content-Type', ''):
                    form = DownloadForm()
                    form.feed(response.text)
                    response.close()
                    if not form.action or urlparse(form.action).hostname not in {'drive.google.com', 'drive.usercontent.google.com'}:
                        raise RuntimeError('Drive não forneceu um formulário de download autorizado.')
                    response = session.get(form.action, params=form.fields, stream=True, timeout=(30, 180))
                    response.raise_for_status()
                if 'text/html' in response.headers.get('Content-Type', ''):
                    raise RuntimeError('Drive retornou HTML em vez do arquivo.')
                part = dest.with_suffix(dest.suffix + '.part')
                with part.open('wb') as output:
                    for chunk in response.iter_content(4 * 1024 * 1024):
                        output.write(chunk)
                response.close()
                if part.stat().st_size != meta['size']:
                    raise RuntimeError('Download incompleto: tamanho diferente do inventário Drive.')
                os.replace(part, dest)
                return
        except Exception:
            if attempt == 2:
                raise
            time.sleep(10 * (attempt + 1))
