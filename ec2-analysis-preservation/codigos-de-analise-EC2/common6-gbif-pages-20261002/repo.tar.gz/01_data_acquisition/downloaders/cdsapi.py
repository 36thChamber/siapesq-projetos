
import os
import time
import hashlib
import queue
import threading
import numpy as np
import pandas as pd
import xarray as xr
from shapely.geometry import Polygon
import cdsapi
import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# CONCORRÊNCIA: o CDS limita POR USUÁRIO, não por conexão — medido em 2026-07-13:
#   2 threads -> 3,0 datas/min, 7,6 MB/min, ZERO recusas
#   8 threads -> 2,5 datas/min, 8,5 MB/min, e o CDS começou a RECUSAR ('rejected'),
#                PERDENDO datas (a vazão é a MESMA: subir threads não acelera nada).
# Ou seja: 2 é o teto POR CONTA. A única forma de ir além é ter MAIS CONTAS — cada uma
# tem sua própria fila. Daí o POOL DE VAGAS abaixo: 2 vagas por conta, e cada download
# pega uma vaga livre e devolve ao terminar. Isso GARANTE que nunca passamos de 2
# requisições simultâneas em nenhuma conta, qualquer que seja o nº de threads.
ERA5_CONCORRENCIA_POR_CONTA = 2

_POOL: "queue.Queue | None" = None
_POOL_LOCK = threading.Lock()

# Margem (graus) do bbox de download em torno dos pontos. A grade do ERA5-Land é
# ~0,1° (~9 km); para a extração BILINEAR funcionar, o recorte precisa conter os
# 4 pixels vizinhos de cada ponto — por isso a margem é ~0,2° (≈ 2 células), e não
# os 0,001° antigos (que deixavam o ponto na borda → NaN na bilinear).
ERA5_BUFFER_DEG = 0.2

# Passo da grade do ERA5-Land. O CDS encaixa o recorte pedido nesta grade, devolvendo
# um arquivo até 1 passo MENOR em cada borda — é a tolerância que `achar_no_cache`
# precisa dar para reconhecer um grib já baixado (ver a nota lá).
ERA5_GRID_DEG = 0.1

# UMA REQUISIÇÃO POR DIA — e não por mês. Medido em 2026-07-13, não suposto:
#
#   por dia : ~40 s por requisição, 1,7 MB   -> 40 s POR DATA
#   por mês : ~14 min por requisição, 118 MB -> 138 s POR DATA (6,1 datas/pedido)
#
# Agrupar os dias de um mês num pedido só PARECE bom ("menos requisições, menos
# fila"), mas a fila do CDS CRESCE COM O TAMANHO DO PEDIDO, e o recorte de um mês é
# a união dos pontos do mês (quase a área inteira da espécie) — 70x mais bytes que
# o recorte de um dia. Na prática ficou 3,4x PIOR por data. Não refazer.
#
# O gargalo real era o TETO DE THREADS (estava em 2, em env_providers/era5.py):
# o tempo cai proporcionalmente ao paralelismo, e o volume por dia é pequeno.
#
# CUIDADO (a razão do hash no nome do arquivo): o recorte de uma data depende dos
# PONTOS daquela data, que mudam a cada dataset/espécie. O nome antigo
# (`variables_2026_04_02.grib`) não codificava o recorte, então um arquivo baixado
# para OUTRO conjunto de pontos era reaproveitado como "já baixado" — e os pontos
# fora daquela caixa recebiam valor de BORDA, silenciosamente. Com o hash do bbox no
# nome, o cache só acerta quando a caixa é de fato a mesma.


def credenciais_cds() -> list[tuple[str, str]]:
    """
    Todas as contas do CDS configuradas no `.env` (gitignored), na ordem:

        CDSAPI_URL   + CDSAPI_KEY       -> conta 1
        CDSAPI_URL_2 + CDSAPI_KEY_2     -> conta 2   (URL opcional: herda a da conta 1)
        CDSAPI_URL_3 + CDSAPI_KEY_3     -> conta 3   ... e assim por diante

    Lista vazia = nenhuma no `.env`; o cdsapi cai no `~/.cdsapirc` (comportamento antigo).
    """
    url0 = os.getenv("CDSAPI_URL")
    creds: list[tuple[str, str]] = []
    k0 = os.getenv("CDSAPI_KEY")
    if url0 and k0:
        creds.append((url0, k0))
    i = 2
    while True:
        k = os.getenv(f"CDSAPI_KEY_{i}")
        if not k:
            break
        u = os.getenv(f"CDSAPI_URL_{i}") or url0
        if u:
            creds.append((u, k))
        i += 1
    return creds


def n_contas_cds() -> int:
    return max(len(credenciais_cds()), 1)


def era5_max_workers() -> int:
    """Threads que o ERA5 comporta: 2 por conta configurada (ver nota no topo)."""
    return ERA5_CONCORRENCIA_POR_CONTA * n_contas_cds()


def _cds_client(url: str | None, key: str | None, max_retries: int) -> "cdsapi.Client":
    """Cliente do CDS com sessão HTTP PRÓPRIA.

    PEGADINHA: `cdsapi.Client(session=...)` tem como default um `requests.Session()`
    avaliado UMA VEZ, na definição da função — ou seja, TODOS os clientes do pool
    compartilham a MESMA sessão. `requests.Session` não é thread-safe: com as threads
    do ERA5 baixando ao mesmo tempo, o pool de conexões do urllib3 corrompe e as
    threads ficam bloqueadas para sempre (0% CPU, 0 conexão, 0 log — o download
    parecia "vivo mas parado"; foi o que travou a captura em 2026-07-19/20).
    Uma sessão por cliente resolve, e o pool volta a valer o que promete.
    """
    import requests
    comum = dict(progress=False, quiet=True, retry_max=max_retries,
                 session=requests.Session())
    if url and key:
        return cdsapi.Client(url=url, key=key, **comum)
    return cdsapi.Client(**comum)


def _pool(max_retries: int) -> "queue.Queue":
    """
    POOL DE VAGAS: uma fila com `ERA5_CONCORRENCIA_POR_CONTA` clientes POR CONTA.

    Um download só roda se conseguir tirar uma vaga da fila, e devolve a vaga ao terminar.
    Assim, o nº de requisições simultâneas EM CADA CONTA nunca passa de 2 — mesmo que o
    ThreadPool tenha mais threads. Cada vaga tem seu próprio `cdsapi.Client` (keep-alive
    reaproveitado, e nunca compartilhado entre threads ao mesmo tempo).
    """
    global _POOL
    with _POOL_LOCK:
        if _POOL is None:
            _POOL = queue.Queue()
            creds = credenciais_cds()
            if not creds:                      # sem `.env`: cai no ~/.cdsapirc
                creds = [(None, None)]         # type: ignore[list-item]
            for url, key in creds:
                for _ in range(ERA5_CONCORRENCIA_POR_CONTA):
                    _POOL.put(_cds_client(url, key, max_retries))
        return _POOL

def download(year: str,month: str,day:str,bbox:list[4],target:str,max_retries:int=5):
    """
        Download ERA5-Land data for a given date and bounding box.
        Parameters:
            year (str): Year of the data.
            month (str): Month of the data.
            day (str): Day of the data.
            bbox (list): Bounding box in the format north, west, south, east
            target (str): Path to save the downloaded data.
            max_retries (int): Maximum number of retries for the download (default: 5).
    """
    dataset = "reanalysis-era5-land"

    def _montar(area):
        return {
            "variable": [
                "2m_temperature",      # t2m
                "total_evaporation",   # e
                "total_precipitation"  # tp
            ],
            "year": year,
            "month": month,
            "day": [day],
            # AGREGADO DIÁRIO (P1D): baixa as 24 horas do dia. A jusante, `t2m` vira a
            # MÉDIA das 24 h e `tp`/`e` o ACUMULADO do dia (último passo da acumulação
            # do ERA5-Land, que é cumulativa desde 00 UTC). Antes usava-se só 12:00
            # (um instante p/ temperatura; meio dia de chuva) — corrigido.
            "time": [f"{h:02d}:00" for h in range(24)],
            "data_format": "grib",
            "download_format": "unarchived",
            "area": area,  # [North, West, South, East]
        }

    # ESCRITA ATÔMICA: baixa para `.part` e só renomeia ao completar. Se o processo
    # morrer no meio, sobra um `.part` (ignorado pelo cache) em vez de um `.grib`
    # truncado — que seria lido como "já baixado" e envenenaria os dados.
    parcial = f"{target}.part"

    def _tentar(area, tentativas):
        """Tenta baixar `tentativas` vezes com um recorte. True se conseguiu."""
        nonlocal last_err
        # VAGA: tira um cliente do pool (no máx. 2 por conta) e devolve no fim, sempre.
        pool = _pool(max_retries)
        client = pool.get()
        req = _montar(area)
        try:
            for attempt in range(tentativas):
                try:
                    client.retrieve(dataset, req, target=parcial)
                    os.replace(parcial, target)
                    return True
                except Exception as e:  # noqa: BLE001 - 'rejected'/transientes de fila
                    last_err = e
                    if os.path.exists(parcial):
                        try:
                            os.remove(parcial)
                        except OSError:
                            pass
                    if attempt < tentativas - 1:
                        # O NOVO CDS REJEITA requisições concorrentes em excesso
                        # ('rejected'). Espera crescente: ao liberar a vaga na fila, a
                        # mesma requisição costuma passar. A espera acontece COM A VAGA
                        # NA MÃO, de propósito — é contrapressão: segura a conta que está
                        # sendo recusada, em vez de continuar martelando o servidor.
                        time.sleep(min(60, 8 * (attempt + 1)))
            return False
        finally:
            pool.put(client)

    last_err = None
    if _tentar(bbox, max_retries):
        return

    # ARQUIVO PODRE NO CACHE DO CDS: às vezes o CDS entrega o job, mas o arquivo no
    # object-store dele volta 403/AccessDenied — e, como ele CACHEIA o resultado por
    # requisição, repetir o MESMO pedido devolve eternamente a MESMA URL quebrada.
    # (Aconteceu de verdade em 2026-07-14, na data 2021-12-31 do Sapajus nigritus: 10
    # repescagens seguidas no mesmo arquivo morto.) A saída é fazer o pedido ser OUTRO
    # para o CDS: ALARGAMOS o recorte alguns centésimos de grau, o que gera um job novo
    # e um arquivo novo.
    #
    # Isto é SEGURO por construção: a caixa nova CONTÉM a antiga, e o valor do ponto é
    # interpolado na grade FIXA do ERA5 (0,1°) — o dado extraído é idêntico. Nunca
    # encolhemos o recorte; só alargamos.
    for extra in (0.05, 0.13, 0.31):
        area = [min(bbox[0] + extra, 90.0), max(bbox[1] - extra, -180.0),
                max(bbox[2] - extra, -90.0), min(bbox[3] + extra, 180.0)]
        print(f"  [cds] arquivo do CDS inacessivel; refazendo o pedido com recorte "
              f"+{extra}° (forca um job novo)...", flush=True)
        if _tentar(area, 2):
            return

    raise last_err


def bbox_hash(bbox: list) -> str:
    """Hash curto e estável do recorte — parte do nome do arquivo (ver topo)."""
    return hashlib.md5("_".join(f"{v:.2f}" for v in bbox).encode()).hexdigest()[:8]


def day_target(data_dir: str, key: str, bbox: list) -> str:
    """Arquivo de uma data. O hash do bbox impede reusar um grib de OUTRO recorte."""
    return f"{data_dir}/variables_{key}_{bbox_hash(bbox)}.grib"


def _extent(arquivo: str) -> "tuple | None":
    """Recorte (N, W, S, E) coberto por um grib. None se ilegível."""
    try:
        with xr.open_dataset(arquivo, engine="cfgrib", decode_timedelta=False,
                             filter_by_keys={"dataTime": 0},
                             backend_kwargs={"indexpath": ""}) as ds:
            la = ds.latitude.values
            lo = ds.longitude.values
        return (float(la.max()), float(lo.min()), float(la.min()), float(lo.max()))
    except Exception:  # noqa: BLE001 - grib ilegível: não serve
        return None


def indexar_cache(data_dir: str, chaves) -> dict:
    """
    Mapeia, para cada data, os gribs já em disco e o recorte que cada um cobre:
        {"2026_04_02": [(caminho, (N, W, S, E)), ...]}

    FEITO UMA VEZ, ANTES DO ThreadPool — e isso é OBRIGATÓRIO, não uma otimização:
    o **eccodes NÃO é thread-safe**. Abrir GRIB de várias threads ao mesmo tempo
    corrompe o estado interno dele e MATA o processo com
    `fatal flex scanner internal error--end of buffer missed`. (Aconteceu de verdade
    em 2026-07-14, com 10 threads de download consultando o cache.) Depois deste
    índice, as threads só comparam números — nenhuma toca no eccodes.

    O resultado é persistido num JSON ao lado dos gribs: abrir ~5 mil arquivos leva
    minutos, e não faz sentido repetir isso a cada execução.
    """
    import json
    import glob as _glob

    cache_json = Path(data_dir) / "_extents.json"
    try:
        conhecidos = json.loads(cache_json.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 - índice ausente/corrompido: recomeça
        conhecidos = {}

    idx: dict[str, list] = {}
    novos = 0
    for key in chaves:
        for f in sorted(_glob.glob(f"{data_dir}/variables_{key}_*.grib")):
            nome = os.path.basename(f)
            ext = conhecidos.get(nome)
            if ext is None:
                e = _extent(f)
                if e is None:
                    continue
                ext = list(e)
                conhecidos[nome] = ext
                novos += 1
            idx.setdefault(key, []).append((f, tuple(ext)))

    if novos:
        try:
            cache_json.write_text(json.dumps(conhecidos), encoding="utf-8")
        except OSError:
            pass
        print(f"ERA5: indexados {novos} grib(s) novos do cache "
              f"({len(conhecidos)} no total).")
    return idx


def achar_no_cache(idx: dict, key: str, bbox: list) -> "str | None":
    """
    Um grib JÁ BAIXADO desta data que COBRE o recorte pedido — mesmo que o recorte
    dele seja OUTRO (maior). Só aritmética: seguro entre threads.

    Por que isso importa: o recorte de uma data é a caixa dos PONTOS daquela data. Se
    as pseudoausências mudarem (ex.: a Área M foi recortada e elas se aproximaram das
    presenças), a caixa ENCOLHE — e um cache que exigisse o hash idêntico jogaria fora
    milhares de gribs válidos, forçando ~10 h de rebaixamento à toa. Um recorte MAIOR
    contém o menor, e o valor extraído é o MESMO: a interpolação acontece na grade FIXA
    do ERA5 (0,1°), não nas bordas do recorte.

    Nunca aceitamos um recorte que NÃO cubra todos os pontos — isso daria valor de borda.

    TOLERÂNCIA DE UM PASSO DE GRADE (0,1°) — sem ela o cache era quase inútil:
    o CDS não devolve o retângulo pedido, e sim as células da grade fixa de 0,1° que
    caem dentro dele, ou seja, um recorte ENCAIXADO e até 0,1° MENOR em cada borda.
    Ex. real: pedido N=-9.42 → arquivo N=-9.50. Com `eps` de ponto flutuante, nem o
    arquivo recém-baixado passava no próprio teste, e cada espécie rebaixava as mesmas
    datas: 10.819 gribs no disco para 3.420 datas (3,2 cópias por data, uma com 10).
    A folga é segura porque o recorte pedido já vem com ERA5_BUFFER_DEG (0,2°) de
    margem sobre os pontos: descontando 0,1° do encaixe, todo ponto continua a pelo
    menos uma célula inteira da borda — que é o que a bilinear precisa. E o VALOR não
    muda: a grade é fixa, o recorte só decide quanto dela vem junto.
    """
    eps = ERA5_GRID_DEG + 1e-6
    n, w, s, e = bbox
    for caminho, (N, W, S, E) in idx.get(key, []):
        if N >= n - eps and S <= s + eps and W <= w + eps and E >= e - eps:
            return caminho
    return None


def create_bbox(lat:float, lon:float, buffer=0.001):
    """
        Generate a small bounding box around a given latitude and longitude.
        Parameters:
            lat (float): Latitude of the central point.
            lon (float): Longitude of the central point.
            buffer (float): Size of the bbox in degrees (default: 0.001 degrees ~ 111 meters).
        
        Returns:
            list: Bounding box in the format [west, east, south, north].
    """
    return [
        lon - buffer,
        lon + buffer,
        lat - buffer,
        lat + buffer
    ]

def create_bbox_from_polygon(polygon:Polygon)->list[4]:
    """
        Create a bounding box from a polygon
        Parameters:
            polygon:Polygon: Polygon to create the bounding box
        Returns:
            bbox: List with the bounding box coordinates
    """
    buffer=0.001
    minx, miny, maxx, maxy = polygon.bounds
    return [maxy-buffer, minx+buffer, miny-buffer, maxx+buffer]

def create_data_hash(df:pd.DataFrame)->dict[str,tuple]:
    """
        Create a hash with the data from the CSV file
        Parameters:
            df:pd.DataFrame: DataFrame with the data from the CSV file
        Returns:
            data_hash:dict: Dictionary with a collection of coordinates for each date
    """
    data_hash={}
    for _, row in df.iterrows():
        # ISOLA a linha sem data/coordenada completa (ex.: ~1% das pseudoausências
        # não têm year/month/day): PULA, em vez de derrubar TODO o passo ERA5 com
        # `int(NaN)`. Mesmo comportamento do NDVI e do laço de agrupamento abaixo —
        # essas poucas linhas ficam com NaN em t2m/e/tp (sem data não há como buscar
        # o clima do dia).
        try:
            lon:float=float(row.get("decimalLongitude"))
            lat:float=float(row.get("decimalLatitude"))
            year:int=int(row.get("year"))
            month:int=int(row.get("month"))
            day:int=int(row.get("day"))
        except (TypeError, ValueError):
            continue
        if not (np.isfinite(lat) and np.isfinite(lon)):
            continue
        if month<10:
            month="0"+str(month)
        if day<10:
            day="0"+str(day)

        key=f"{year}_{month}_{day}"
        if key not in data_hash:
            data_hash[key]=[(lon,lat)]
        else:
            data_hash[key].append((lon,lat))
    return data_hash


def plan_days(data_hash: dict, data_dir: str) -> dict[str, dict]:
    """
    Uma requisição por DATA. O recorte é a caixa dos pontos DAQUELA data + margem
    (para a bilinear ter os 4 vizinhos). Devolve {chave: {bbox, target}}.
    """
    plano: dict[str, dict] = {}
    for key, pts in data_hash.items():
        lons = [p[0] for p in pts]
        lats = [p[1] for p in pts]
        buf = ERA5_BUFFER_DEG
        # Formato do ERA5: [North, West, South, East].
        bbox = [max(lats) + buf, min(lons) - buf, min(lats) - buf, max(lons) + buf]
        plano[key] = {"bbox": bbox, "data_dir": data_dir,
                      "target": day_target(data_dir, key, bbox)}
    return plano


def process_day(key: str, info: dict, max_retries: int, idx: dict):
    """Baixa (ou reaproveita do cache) o grib de uma data."""
    try:
        # Reaproveita QUALQUER grib desta data que já COBRE o recorte pedido — não só o
        # de hash idêntico (ver `achar_no_cache`). `idx` foi montado ANTES do ThreadPool
        # justamente porque o eccodes não é thread-safe (ver `indexar_cache`).
        ja = achar_no_cache(idx, key, info["bbox"])
        if ja:
            info["target"] = ja
            print(f"[{key}] Already downloaded.")
            return key, ja
        target = info["target"]
        y, m, d = key.split("_")
        print(f"[{key}] Downloading... BBOX: {[round(v, 2) for v in info['bbox']]}")
        download(y, m, d, info["bbox"], target=target, max_retries=max_retries)
        return key, target
    except Exception as e:  # noqa: BLE001
        print(f"[Download Error] {key}: {e}")
        return key, None


def _campo_do_dia(ds: xr.Dataset, var_name: str, y: int, m: int, d: int):
    """
    Reduz as 24 h de UM dia a um campo 2D (lat × lon), a partir de um grib que pode
    conter VÁRIOS dias.

    O ERA5-Land codifica a hora como (time-base + step), então as 24 h de um dia
    ficam espalhadas por mais de um `time` — recortar por `time` pegaria o conjunto
    ERRADO de horas (e a diferença bate 9 °C, o tamanho da oscilação dia/noite).
    O recorte correto é pela HORA VÁLIDA (`valid_time`).

    Reduções (idênticas às de antes): t2m → média das 24 h; tp → MÁXIMO (a chuva
    acumula desde 00 UTC → o máximo é o total do dia); e → MÍNIMO (a evaporação é
    negativa e acumula → o mínimo é o total do dia).
    """
    var = ds[var_name]
    tdims = [dim for dim in var.dims if dim not in ("latitude", "longitude", "lat", "lon")]
    if not tdims:
        return var

    if "valid_time" in ds.coords:
        h0 = np.datetime64(f"{y:04d}-{m:02d}-{d:02d}T00:00")
        h1 = np.datetime64(f"{y:04d}-{m:02d}-{d:02d}T23:00")
        # Recorta antes pelo `time` vizinho (economiza memória em gribs mensais
        # grandes) e só então filtra pela hora válida exata.
        if "time" in var.dims:
            um_dia = np.timedelta64(1, "D")
            sub = ds.sel(time=slice(h0 - um_dia, h1))
            if sub.sizes.get("time", 0):
                ds, var = sub, sub[var_name]
        var = var.where((ds.valid_time >= h0) & (ds.valid_time <= h1))

    if var_name == "t2m":
        return var.mean(tdims)
    if var_name == "tp":
        return var.max(tdims)
    return var.min(tdims)  # 'e' (evaporação, negativa)


def run_cmd(args:argparse.Namespace):
    csv=args.csv
    data_dir=args.data_dir
    max_retries=args.max_retries
    df = pd.read_csv(csv)
    data_hash = create_data_hash(df)

    # --- DOWNLOAD: uma requisição por DATA (ver a nota no topo do arquivo) ---
    plano = plan_days(data_hash, data_dir)
    n = len(plano)
    # Barra ao vivo no painel do orquestrador (opcional; None quando rodado avulso).
    cb = getattr(args, "progress_cb", None)
    n_contas = n_contas_cds()
    print(f"ERA5: {n} datas distintas -> {n} requisições | "
          f"{n_contas} conta(s) CDS x {ERA5_CONCORRENCIA_POR_CONTA} vagas = "
          f"{era5_max_workers()} em paralelo (threads: {args.max_workers}).")

    # Índice do cache — MONTADO AQUI, FORA das threads (o eccodes não é thread-safe).
    idx = indexar_cache(data_dir, plano.keys())

    if cb:
        cb(0, n, "baixando")
    feitos = 0
    with ThreadPoolExecutor(max_workers=args.max_workers) as executor:
        futures = [executor.submit(process_day, key, info, max_retries, idx)
                   for key, info in plano.items()]
        for future in as_completed(futures):
            print(future.result())
            feitos += 1
            if cb:
                cb(feitos, n, "baixando")

    # --- REPESCAGEM: uma data que falhou NÃO pode virar NaN em silêncio ---
    # O CDS recusa requisições quando há concorrência demais ('rejected'). Se o retry
    # do download() esgotar, a data fica SEM arquivo e todos os pontos dela sairiam com
    # t2m/e/tp vazios — sem erro, sem aviso. Tentamos de novo, agora SEQUENCIALMENTE
    # (sem concorrência não há o que o CDS recuse) e com mais paciência.
    faltando = [k for k, info in plano.items() if not os.path.exists(info["target"])]
    if faltando:
        print(f"\n[repescagem] {len(faltando)} data(s) falharam. Repetindo uma a uma "
              f"(sem paralelismo, {max_retries * 2} tentativas)...")
        for key in faltando:
            process_day(key, plano[key], max_retries * 2, idx)
        faltando = [k for k, info in plano.items() if not os.path.exists(info["target"])]

    if faltando:
        # Ainda faltam: NÃO seguir em silêncio. Derruba a etapa com a lista das datas.
        raise RuntimeError(
            f"ERA5: {len(faltando)} data(s) não baixaram nem na repescagem — os pontos "
            f"dessas datas ficariam SEM clima (NaN). Datas: {sorted(faltando)[:20]}"
            f"{' ...' if len(faltando) > 20 else ''}"
        )

    print(f"All downloads completed. ({len(plano)} datas, 0 falhas)")
    print("Processing data (agregado diário + extração bilinear)...")

    # Agrupa os registros por data e extrai todos os pontos daquela data de uma vez.
    groups: dict[str, list[tuple]] = defaultdict(list)
    for index, row in df.iterrows():
        try:
            key = f"{int(row['year'])}_{int(row['month']):02d}_{int(row['day']):02d}"
        except (TypeError, ValueError):
            continue
        groups[key].append((index, float(row["decimalLatitude"]),
                            float(row["decimalLongitude"])))

    n_extr = 0
    for key in sorted(groups):
        n_extr += 1
        if cb:
            cb(n_extr, len(groups), "extraindo")
        items = groups[key]
        info = plano.get(key)
        target = info["target"] if info else None
        if not target or not os.path.exists(target):
            print(f"[{key}] File not found. Skipping processing.")
            continue
        y, m, d = (int(v) for v in key.split("_"))
        idxs = [it[0] for it in items]
        pts_lat = xr.DataArray([it[1] for it in items], dims="points")
        pts_lon = xr.DataArray([it[2] for it in items], dims="points")

        with xr.open_dataset(target, engine="cfgrib", decode_timedelta=False,
                             filter_by_keys={"dataTime": 0},
                             backend_kwargs={"indexpath": ""}) as ds:
            for var_name in ds.data_vars:
                # 24 h daquele DIA (recorte por hora válida) -> campo 2D lat×lon.
                field = _campo_do_dia(ds, var_name, y, m, d)
                # Extração BILINEAR nos pontos (variáveis contínuas), com FALLBACK
                # nearest onde a bilinear cair em NaN (ponto na borda do recorte).
                vals = field.interp(latitude=pts_lat, longitude=pts_lon,
                                    method="linear").values.reshape(-1)
                nan = np.isnan(vals)
                if nan.any():
                    near = field.sel(latitude=pts_lat, longitude=pts_lon,
                                     method="nearest").values.reshape(-1)
                    vals = np.where(nan, near, vals)
                # Pontos LITORÂNEOS: o pixel mais próximo pode ser oceano (ERA5-Land
                # é só de terra → NaN). Busca o pixel de TERRA válido mais próximo.
                still = np.isnan(vals)
                if still.any():
                    # Colapsa qualquer dimensão remanescente (time/step) → 2D lat×lon.
                    f2 = field
                    for dim in list(f2.dims):  # `dim`, não `d`: `d` é o DIA.
                        if dim not in ("latitude", "longitude", "lat", "lon"):
                            f2 = f2.isel({dim: -1})
                    latn = "latitude" if "latitude" in f2.dims else "lat"
                    lonn = "longitude" if "longitude" in f2.dims else "lon"
                    f2 = f2.transpose(latn, lonn)
                    fv = np.asarray(f2.values, dtype="float64")
                    la = np.asarray(f2[latn].values, dtype="float64")
                    lo = np.asarray(f2[lonn].values, dtype="float64")
                    fin = np.isfinite(fv)
                    if fv.ndim == 2 and fin.any():
                        rows, cols = np.where(fin)
                        flat = fv[rows, cols]
                        flat_lat = la[rows]; flat_lon = lo[cols]
                        pla = np.asarray(pts_lat).reshape(-1)
                        plo = np.asarray(pts_lon).reshape(-1)
                        for k in np.where(still)[0]:
                            d2 = (flat_lat - pla[k]) ** 2 + (flat_lon - plo[k]) ** 2
                            vals[k] = float(flat[int(np.argmin(d2))])
                for i, idx in enumerate(idxs):
                    df.at[idx, var_name] = float(vals[i])
                print(f"[{key}] {var_name}: {len(idxs)} pontos extraídos (bilinear+fallback).")

    base_name = os.path.basename(csv)
    out_file = f"out_{base_name}"
    df.to_csv(out_file, index=False)
    print(f"Saved -> {out_file}")