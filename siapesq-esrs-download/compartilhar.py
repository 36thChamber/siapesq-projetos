import hashlib
import hmac
from http.server import ThreadingHTTPServer
import os
from pathlib import Path
import re
import threading
import time
from urllib.parse import urlsplit

import download

PAGE = '''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow">
<title>Modelos do ES e do RS | SIAPESQ</title>
<meta property="og:title" content="Mapas de predição do ES e do RS | SIAPESQ">
<meta property="og:description" content="Baixe os mapas de 34 espécies em formato TIFF.">
<style>body{margin:0;background:#f4f8f6;color:#19382f;font:1.05rem/1.6 "Inter",system-ui,sans-serif}
main{max-width:38rem;margin:clamp(2rem,10vh,6rem) auto;padding:1.5rem}h1{font-size:clamp(2rem,6vw,3rem);line-height:1.1;margin:.7em 0 .4em}
a{display:inline-block;background:#13614d;color:white;font-weight:650;padding:.75rem 1.2rem;border-radius:.4rem;text-decoration:none}
a:focus-visible{outline:3px solid #bc5a05;outline-offset:3px}small{display:block;margin-top:1rem}</style>
</head><body><main><b>SIAPESQ</b><h1>Mapas de predição do ES e do RS</h1>
<p>O arquivo reúne 1.802 mapas TIFF de 34 espécies, organizados por espécie e cenário.</p>
<p><a href="{download_path}">Baixar ZIP de 33,08 GB</a></p>
<small>Disponível até 1º de dezembro de 2026, às 16h10 (horário de Brasília).</small>
</main></body></html>'''

class SharedDownload(download.Download):
    def end_headers(self):
        self.send_header('X-Accel-Buffering','no')
        self.send_header('X-Robots-Tag','noindex, nofollow')
        super().end_headers()

    def handle_download(self, send_body):
        path=urlsplit(self.path).path
        matched=re.fullmatch(r'/esrs/([a-z0-9]{26})(/baixar)?/?',path)
        if not matched:
            self.send_error(404)
            return
        code, attachment=matched.groups()
        if not hmac.compare_digest(hashlib.sha256(code.encode()).hexdigest(),os.environ['TOKEN_DIGEST']):
            self.send_error(404)
            return
        if time.time() >= int(os.environ['EXPIRES_AT']):
            self.send_error(410)
            return
        if attachment:
            self.path=download.ROUTE+'?chave='+code
            super().handle_download(send_body)
            return
        page=PAGE.replace('{download_path}','/esrs/'+code+'/baixar').encode()
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'")
        self.send_header('Cache-Control','private, no-store')
        self.send_header('Content-Length',str(len(page)))
        self.end_headers()
        if send_body:
            self.wfile.write(page)

if __name__ == '__main__':
    download.CACHE=Path('/index') / download.CACHE.name
    assert download.CACHE.is_file(), 'Índice de integridade ausente'
    download.STATE=Path('/tmp')
    download.parts,download.total_size=download.build_layout()
    download.offsets=[offset for offset,_ in download.parts]+[download.total_size]
    download.slots=threading.BoundedSemaphore(8)
    ThreadingHTTPServer(('0.0.0.0',8080),SharedDownload).serve_forever()
