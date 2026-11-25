#!/usr/bin/env python3
# captura_ambiental.py — captação SEQUENCIAL de variáveis ambientais (etapa 03)
#
# Interconecta a etapa 02 (pseudoausências) com a etapa 03: recebe o dataset final
# de uma espécie (`sp_<Especie>_occurrences.csv`, presenças sp=1 + ausências sp=0
# na pasta "07 Executado por espécie/<Esp>/") e captura as variáveis ambientais de
# CADA registro (mesmo lat/lon p/ presença e ausência), produzindo um CSV SLIM.
#
# ESTE ARQUIVO CAPTA UMA VARIÁVEL DE CADA VEZ (tempo = SOMA das variáveis).
# A variante SIMULTÂNEA (todas de uma vez; tempo = MÁXIMO, não soma) está em
# `captura_ambiental_simultaneo.py`, que é o padrão do `run_pipeline.py`. As duas
# COMPARTILHAM este mesmo miolo — só muda quantas rodam por vez (`paralelo=`), e
# produzem valores IDÊNTICOS. Mantemos as duas para poder comparar/depurar.
#
# Arquitetura: cada variável é um `EnvProvider` (Strategy) num REGISTRY
# (`env_providers/`), espelhando o padrão das ocorrências. Novas variáveis entram
# com 1 arquivo + 1 linha no registry — extensível, baixo acoplamento.
#
# Fluxo:
#   sp_<Esp>.csv → CSV intermediário [base_de_dados, lat, lon, data]
#               → providers (era5, ndvi, altitude, slope, soilgrids, mapbiomas,
#                 worldcover) — com PAINEL AO VIVO (barras de %, ritmo, MB/min)
#               → SLIM: [base_de_dados, lat, lon, data, sp, <variáveis>]
#               → 07/<Esp>/<Esp>_variables/<Esp>_variables.csv (+ QA + QC)
#
# Rasters do Brasil (soilgrids/slope/mapbiomas) são cacheados p/ reuso na predição.

from __future__ import annotations

import argparse
import shutil
import sys
import threading
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Medidor de CONSUMO de download (requisições + bytes). Instrumenta o `requests`
# (usado por era5/cdsapi, ndvi, OpenTopography e SoilGrids) para contar chamadas e
# volume. O MapBiomas é raster local (não conta). É best-effort: o volume "real"
# em disco é medido à parte (crescimento da pasta de dados por etapa).
# ---------------------------------------------------------------------------
import requests.sessions as _rsess  # noqa: E402

_METER = {"req": 0, "bytes": 0}
_METER_LOCK = threading.Lock()
_ORIG_REQUEST = _rsess.Session.request


def _metered_request(self, method, url, *a, **k):
    with _METER_LOCK:
        _METER["req"] += 1
    resp = _ORIG_REQUEST(self, method, url, *a, **k)
    try:
        cl = resp.headers.get("Content-Length")
        if cl:
            with _METER_LOCK:
                _METER["bytes"] += int(cl)
    except Exception:  # noqa: BLE001
        pass
    return resp


_rsess.Session.request = _metered_request

# Windows: stdout redirecionado usa cp1252 e quebra com emojis/unicode dos
# downloaders/desta rotina. Força utf-8 (com replace) para não travar o pipe.
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except Exception:  # noqa: BLE001
        pass

ROOT = Path(__file__).resolve().parent.parent
BASE07 = ROOT / "07 Executado por espécie"
sys.path.insert(0, str(ROOT / "03_environmental_processing"))
sys.path.insert(0, str(ROOT / "01_data_acquisition"))

sys.path.insert(0, str(ROOT))  # `naming.py` (raiz) = convenção de nomes de saída

import naming  # noqa: E402
from env_providers import build_providers, DEFAULT_CONTINENTAL  # noqa: E402
from env_providers.base import CaptureContext, sanitize_token  # noqa: E402

# Colunas de identificação (não são variáveis ambientais).
_BASE_COLS = ["decimalLatitude", "decimalLongitude", "day", "month", "year"]


def _p(msg: str = "") -> None:
    """print com flush (para a saída aparecer AO VIVO, mesmo redirecionada)."""
    print(msg, flush=True)


def _bar(done: int, total: int, width: int = 24) -> str:
    """Barra de progresso ASCII: [######----] 3/6  50%."""
    total = max(total, 1)
    done = max(0, min(done, total))
    fill = int(round(width * done / total))
    pct = int(round(100 * done / total))
    return f"[{'#' * fill}{'-' * (width - fill)}] {done}/{total}  {pct}%"


def _dir_size(path: Path) -> int:
    """Soma (bytes) de todos os arquivos sob `path` (0 se não existir)."""
    if not path.exists():
        return 0
    total = 0
    for f in path.rglob("*"):
        try:
            if f.is_file():
                total += f.stat().st_size
        except OSError:
            pass
    return total


def _mb(nbytes: float) -> str:
    return f"{nbytes / 1e6:.1f} MB"


def _hms(seg: float) -> str:
    """3661 -> '1h01'; 125 -> '2min05'; 9 -> '9s'."""
    seg = int(max(seg, 0))
    if seg >= 3600:
        return f"{seg // 3600}h{(seg % 3600) // 60:02d}"
    if seg >= 60:
        return f"{seg // 60}min{seg % 60:02d}"
    return f"{seg}s"


class _Painel(threading.Thread):
    """
    PAINEL AO VIVO. Os 7 providers rodam em paralelo — sete "sinais de vida" soltos
    viravam sopa no log. Aqui um único thread desenha, a cada `every` segundos, o
    estado de TODAS as variáveis: barra de %, contagem, ritmo e previsão de término,
    mais a vazão global de download.

    Quem tem laço contável (era5, ndvi) reporta progresso real via `ctx.report()`;
    os demais são rápidos e aparecem como "rodando" com o tempo decorrido.

    Saída é APPEND (um bloco por tick), não redesenho com códigos de terminal: o
    stdout aqui costuma estar redirecionado para um arquivo de log, e código ANSI
    viraria lixo. Para ver ao vivo: `tail -f <log>`.

    NUNCA derruba a captura: qualquer erro ao desenhar é engolido.
    """

    LARG = 22  # largura da barra

    def __init__(self, ctx, nomes: list[str], estado: dict, lock: threading.Lock,
                 data_root: Path, every: float = 20.0):
        super().__init__(daemon=True)
        self.ctx, self.nomes, self.estado, self.lock = ctx, nomes, estado, lock
        self.data_root = data_root
        self.every = every
        self.t0 = time.perf_counter()
        self.disk0 = _dir_size(data_root)
        self._stop = threading.Event()
        self._hist_disk: deque = deque(maxlen=90)          # (t, bytes)
        self._hist_prov: dict[str, deque] = {}             # nome -> (t, feitos)

    def parar(self) -> None:
        self._stop.set()

    def run(self) -> None:
        while not self._stop.wait(self.every):
            try:
                self.desenhar()
            except Exception:  # noqa: BLE001 - painel jamais derruba a captura
                pass

    # -- ritmo: itens/s de um provider, medido na janela recente ---------------
    def _ritmo(self, nome: str, feitos: int, agora: float) -> float:
        h = self._hist_prov.setdefault(nome, deque(maxlen=90))
        h.append((agora, feitos))
        while len(h) > 2 and agora - h[0][0] > 600:  # janela de 10 min
            h.popleft()
        if len(h) < 2:
            return 0.0
        dt = h[-1][0] - h[0][0]
        return (h[-1][1] - h[0][1]) / dt if dt > 1 else 0.0

    def _linha(self, nome: str, agora: float) -> str:
        with self.lock:
            st = dict(self.estado.get(nome, {}))
        status = st.get("status", "PENDENTE")
        cheia = "█" * self.LARG
        vazia = "·" * self.LARG

        if status == "CACHE":
            return f"  {nome:<10} [{cheia}] 100%  já estava em cache"
        if status == "OK":
            return f"  {nome:<10} [{cheia}] 100%  OK em {_hms(st.get('dt', 0))}"
        if status in ("PULADA", "SEM DADOS"):
            return f"  {nome:<10} [{vazia}]   --  {status}"
        if status == "PENDENTE":
            return f"  {nome:<10} [{vazia}]   --  aguardando"

        # RODANDO
        el = agora - st.get("t0", agora)
        prog = self.ctx.ler_progresso().get(nome)
        if not prog or not prog[1]:
            return (f"  {nome:<10} [{'░' * self.LARG}]   --  rodando há {_hms(el)}")

        feitos, total, etapa = prog
        frac = min(max(feitos / total, 0.0), 1.0)
        n = int(round(frac * self.LARG))
        barra = "█" * n + "·" * (self.LARG - n)
        r = self._ritmo(nome, feitos, agora)          # itens/s
        txt = f"  {nome:<10} [{barra}] {frac * 100:3.0f}%  {feitos}/{total}"
        if etapa:
            txt += f" {etapa}"
        if r > 0:
            falta = (total - feitos) / r
            txt += f"  |  {r * 60:.1f}/min  |  faltam ~{_hms(falta)}"
        return txt

    def desenhar(self, final: bool = False) -> None:
        agora = time.perf_counter()
        el = agora - self.t0
        disk = max(_dir_size(self.data_root) - self.disk0, 0)
        self._hist_disk.append((agora, disk))
        while len(self._hist_disk) > 2 and agora - self._hist_disk[0][0] > 600:
            self._hist_disk.popleft()

        vazao = ""
        if len(self._hist_disk) >= 2:
            dt = self._hist_disk[-1][0] - self._hist_disk[0][0]
            db = self._hist_disk[-1][1] - self._hist_disk[0][1]
            if dt > 1:
                vazao = f"{db / 1e6 / (dt / 60):.1f} MB/min"

        with self.lock:
            prontas = sum(1 for n in self.nomes
                          if self.estado.get(n, {}).get("status") in
                          ("OK", "CACHE", "PULADA", "SEM DADOS"))
        risca = "─" * 78
        _p("")
        _p(risca)
        _p(f" CAPTURA {'CONCLUÍDA' if final else 'em andamento'} — decorrido {_hms(el)}"
           f"   |   variáveis prontas: {prontas}/{len(self.nomes)}")
        _p(risca)
        for nome in self.nomes:
            _p(self._linha(nome, agora))
        _p(risca)
        _p(f"  DADOS: {_mb(disk)} baixados"
           + (f"   |   {vazao}" if vazao else "")
           + f"   |   {_METER['req']} requisições")
        _p(risca)


def _find_species_csv(especie: str) -> Path:
    """
    O CSV de presenças+pseudoausências da espécie. Aceita o nome NOVO
    (`Pseudoabsence_<Esp>_<DD_MM_AA>.csv`) e o LEGADO (`sp_*_occurrences.csv`) — uma
    rodada antiga tem de continuar sendo retomável. Havendo vários, usa o MAIS RECENTE
    e DIZ qual escolheu (escolher em silêncio é como se captam variáveis do dataset errado).
    """
    slug = naming.slug_especie(especie)
    cands = [c for c in BASE07.rglob("*")
             if c.is_file() and c.suffix == ".csv"
             and slug.lower() in str(c).lower()
             and (c.name.startswith(naming.TIPOS["pseudoabsence"])
                  or c.name.startswith("sp_"))]
    if not cands:
        raise FileNotFoundError(
            f"Não encontrei Pseudoabsence_*.csv (nem sp_*_occurrences.csv) "
            f"p/ '{especie}' em {BASE07}.")
    cands.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    if len(cands) > 1:
        _p(f"[captura] {len(cands)} CSVs de pseudoausência p/ '{especie}'; "
           f"usando o mais recente: {cands[0].name}")
    return cands[0]


def _drop_incomplete_dates(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Remove linhas SEM data completa (ano E mês E dia) — REDE DE SEGURANÇA antes
    de qualquer provider. A captação é POR DATA (ERA5 baixa o DIA; NDVI o MÊS): um
    registro sem data completa não tem como receber esses valores. Complementa a
    remoção feita na limpeza das ocorrências e cobre também as pseudoausências e um
    CSV injetado direto (`--csv`). Retorna (df_filtrado, n_removidos). Se faltar
    alguma coluna de data, não mexe — a validação de colunas obrigatórias trata
    isso adiante."""
    date_cols = [c for c in ("year", "month", "day") if c in df.columns]
    if len(date_cols) < 3:
        return df, 0
    df = df.copy()
    for c in date_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    sem_data = df[date_cols].isna().any(axis=1)
    n = int(sem_data.sum())
    if n:
        df = df[~sem_data].reset_index(drop=True)
    return df, n


# O ERA5-Land é uma REANÁLISE: os dados de um dia só ficam disponíveis alguns dias depois.
# Medido em 2026-07-13: as datas até 08/07 baixaram; 09/07 e 10/07 devolveram HTTP 400
# ("Bad Request" no /results) — o dado simplesmente NÃO EXISTE ainda no servidor.
# Um registro de ontem, portanto, não tem como receber clima. Barramos na entrada, como já
# fazemos com registros sem data completa — em vez de descobrir isso 2 h depois, quando o
# download falha e derruba a etapa inteira por causa de meia dúzia de linhas.
ERA5_ATRASO_DIAS = 5

# O MESMO problema existe do OUTRO lado da linha do tempo: o ERA5-Land começa em 1950.
# Registro de coleta de museu (1900, 1925, 1941...) NÃO tem clima e nunca vai ter. Pior
# que só falhar: para cada data dessas o downloader alarga o recorte 3x e ainda toma 502
# com espera de 2 min — medido em 2026-07-18, ~15 min POR DATA. Nas 3 espécies eram ~60
# datas impossíveis, ou seja ~15 h de espera inútil, e o pipeline parecia travado.
#
# Mas quem MANDA no corte não é o ERA5, e sim o NDVI: ele vem do MODIS (MOD13Q1), que só
# existe a partir de FEV/2000 — medido em 2026-07-20, 100% dos registros pré-2000 voltavam
# com NDVI vazio (caraya 28/28, guariba 38/38). E linha sem NDVI é DESCARTADA no treino,
# em `04_modeling/run_rf_climatologico.R` (complete.cases nos 7 preditores). Ou seja: sem
# este corte, o pipeline baixava clima de datas que o modelo joga fora no fim.
# Cortar em 2000 custa pouco (~3% das presenças) e ainda faz os modos diário e climático
# treinarem no MESMO conjunto de pontos — o climático tinha NDVI para todos e não perdia
# nada, o que poluía a comparação entre os dois.
NDVI_ANO_INICIO = 2000

# Janela efetiva da captação: a mais restritiva das duas fontes.
ERA5_ANO_INICIO = max(1950, NDVI_ANO_INICIO)


def _drop_dates_sem_era5(df: pd.DataFrame, atraso_dias: int = ERA5_ATRASO_DIAS,
                         ano_inicio: int = ERA5_ANO_INICIO
                         ) -> tuple[pd.DataFrame, int, int]:
    """Remove registros fora da janela da captação: RECENTES DEMAIS (a reanálise do ERA5
    ainda não publicou) ou ANTIGOS DEMAIS (anteriores a `ano_inicio` — hoje 2000, limite
    do NDVI/MODIS, e não 1950 do ERA5). Ver notas acima.
    Retorna (df, n_recentes, n_antigos)."""
    from datetime import date, timedelta
    if not all(c in df.columns for c in ("year", "month", "day")):
        return df, 0, 0
    anos = pd.to_numeric(df["year"], errors="coerce")
    dt = pd.to_datetime(
        dict(year=anos,
             month=pd.to_numeric(df["month"], errors="coerce"),
             day=pd.to_numeric(df["day"], errors="coerce")),
        errors="coerce")
    limite = pd.Timestamp(date.today() - timedelta(days=atraso_dias))
    recentes = dt > limite
    antigos = anos < ano_inicio
    n_rec, n_ant = int(recentes.sum()), int(antigos.sum())
    fora = recentes | antigos
    if n_rec or n_ant:
        df = df[~fora].reset_index(drop=True)
    return df, n_rec, n_ant


def _ident_key(frame: pd.DataFrame) -> np.ndarray:
    """Chave de identidade por linha (lat/lon/ano/mês/dia) p/ casar o checkpoint com
    a entrada atual. lat/lon arredondados; datas como número."""
    lat = pd.to_numeric(frame["decimalLatitude"], errors="coerce").round(6)
    lon = pd.to_numeric(frame["decimalLongitude"], errors="coerce").round(6)
    y = pd.to_numeric(frame["year"], errors="coerce")
    m = pd.to_numeric(frame["month"], errors="coerce")
    d = pd.to_numeric(frame["day"], errors="coerce")
    return (lat.astype(str) + "|" + lon.astype(str) + "|"
            + y.astype(str) + "|" + m.astype(str) + "|" + d.astype(str)).to_numpy()


def _carregar_checkpoint(df: pd.DataFrame, checkpoint: Path,
                         cols_ident: set) -> tuple[pd.DataFrame, list[str]]:
    """CACHE RESUMÍVEL: traz de volta as colunas de variáveis já captadas em execuções
    anteriores, para que os providers correspondentes sejam PULADOS.

    O casamento é por IDENTIDADE DA LINHA (lat/lon/ano/mês/dia), não por posição nem por
    contagem: assim o checkpoint continua valendo mesmo que a entrada tenha PERDIDO linhas
    entre uma execução e outra (ex.: registros recentes demais para o ERA5-Land, que são
    descartados). Exigir o mesmo nº de linhas jogaria fora horas de captação por causa de
    meia dúzia de registros a menos.

    Só reaproveita se TODAS as linhas atuais existirem no checkpoint (uma linha nova não
    teria valor de onde vir). Retorna (df, colunas_reaproveitadas).
    """
    if not checkpoint.exists():
        return df, []
    try:
        cache = pd.read_csv(checkpoint)
    except Exception as e:  # noqa: BLE001 - cache corrompido não derruba a captura
        _p(f"[captura] cache ignorado (falha ao ler: {type(e).__name__}).")
        return df, []
    if any(c not in cache.columns for c in _BASE_COLS):
        _p("[captura] cache ignorado (sem as colunas de identificacao).")
        return df, []

    chave_cache = _ident_key(cache)
    chave_df = _ident_key(df)
    # Primeira ocorrência de cada chave no cache (linhas duplicadas são equivalentes).
    pos = {}
    for i, k in enumerate(chave_cache):
        pos.setdefault(k, i)
    faltando = [k for k in chave_df if k not in pos]
    if faltando:
        _p(f"[captura] cache ignorado ({len(faltando)} linha(s) da entrada nao existem "
           f"no checkpoint — pontos mudaram).")
        return df, []

    idx = np.array([pos[k] for k in chave_df])
    var_cols = [c for c in cache.columns if c not in cols_ident and c not in df.columns]
    for c in var_cols:
        df[c] = cache[c].values[idx]
    if len(cache) != len(df):
        _p(f"[captura] checkpoint casado por identidade: {len(df)} de {len(cache)} linhas "
           f"reaproveitadas ({len(cache) - len(df)} sairam da entrada).")
    return df, var_cols


def _salvar_checkpoint(df: pd.DataFrame, checkpoint: Path) -> None:
    """Grava o estado atual (identidade + variáveis já captadas). Chamado APÓS cada
    variável — é o que garante 'prosseguir depois sem perder o que já foi feito'."""
    try:
        df.to_csv(checkpoint, index=False)
    except Exception as e:  # noqa: BLE001 - checkpoint nunca derruba a captura
        _p(f"[captura] aviso: falha ao salvar checkpoint: {type(e).__name__}: {e}")


def _relatorio_qa(df: pd.DataFrame, env_cols: list[str], n0: int, out_qa: Path) -> None:
    linhas = ["==== QA — VARIÁVEIS AMBIENTAIS ====", f"Registros: {len(df)} (entrada: {n0})"]
    if "sp" in df.columns:
        n1 = int((df["sp"] == 1).sum()); n0s = int((df["sp"] == 0).sum())
        linhas.append(f"Balanço: presenças(sp=1)={n1} | pseudoausências(sp=0)={n0s}")
    linhas += ["", "Variáveis (não-nulos / total):"]
    for c in env_cols:
        ok = int(df[c].notna().sum())
        linhas.append(f"  - {c:.<26} {ok}/{len(df)}  (NaN: {len(df) - ok})")
    if env_cols:
        comp = df[env_cols].notna().all(axis=1)
        linhas += ["", f"Registros COMPLETOS (todas as {len(env_cols)} variáveis): "
                   f"{int(comp.sum())}/{len(df)}"]
        if "sp" in df.columns:
            linhas.append(f"  - por classe: presenças={int(((df['sp']==1) & comp).sum())} | "
                          f"ausências={int(((df['sp']==0) & comp).sum())}")
    txt = "\n".join(linhas) + "\n"
    out_qa.write_text(txt, encoding="utf-8")
    print(txt)


def capturar(csv: Path, variaveis: list[str], data_root: Path, dem_path: str,
             workers: int, paralelo: bool = False, painel_seg: float = 20.0) -> Path:
    """Executa a captação e grava o CSV slim de variáveis na pasta da espécie.

    `paralelo=False` (padrão DESTE arquivo): as variáveis são captadas UMA A UMA, na
    ordem do registry — o comportamento histórico. Tempo = SOMA das variáveis.

    `paralelo=True`: todas de uma vez (ver `captura_ambiental_simultaneo.py`).
    Tempo = MÁXIMO, não soma. Os dois modos produzem valores IDÊNTICOS (validado:
    diferença 0,000e+00 em todas as colunas) — o que muda é só quantas rodam por vez.

    Os dois caminhos compartilham este mesmo miolo de propósito: duas cópias do
    código divergiriam com o tempo, e uma correção feita numa não chegaria na outra.
    """
    df_full = pd.read_csv(csv)
    # GARANTIA: nenhuma linha sem data completa (ano/mês/dia) entra na captação.
    df_full, _n_sem_data = _drop_incomplete_dates(df_full)
    if _n_sem_data:
        _p(f"[captura] {_n_sem_data} registro(s) SEM data completa (ano/mes/dia) "
           f"removidos antes da captacao ambiental (rede de seguranca).")
    # GARANTIA: nada FORA da janela da captação — nem recente demais (atraso de
    # publicação do ERA5) nem antigo demais (antes do NDVI/MODIS, que começa em 2000).
    df_full, _n_recente, _n_antigo = _drop_dates_sem_era5(df_full)
    if _n_recente:
        _p(f"[captura] {_n_recente} registro(s) dos ultimos {ERA5_ATRASO_DIAS} dias "
           f"removidos: o ERA5-Land ainda NAO publicou esses dias (nao teriam clima).")
    if _n_antigo:
        _p(f"[captura] {_n_antigo} registro(s) anteriores a {ERA5_ANO_INICIO} removidos: "
           f"sem NDVI (MODIS so comeca em 2000) a linha seria descartada no treino, "
           f"e cada data antiga ainda custava ~15 min de tentativa de download.")
    n0 = len(df_full)
    especie_dir = csv.parent

    # NOME DA ESPÉCIE — a peça que faltava. O `token` vinha do nome da PASTA, que é a
    # DATA (`2026-07-13`): o CSV de variáveis saía como `2026_07_13_variables.csv`, SEM
    # a espécie, e ao juntar arquivos de espécies diferentes não dava para saber de quem
    # era qual (o usuário teve de renomear à mão). A convenção agora mora em `naming.py`.
    especie_nome = naming.especie_da_pasta(especie_dir)   # 'Sapajus_nigritus'
    token = sanitize_token(especie_dir.name)              # ainda usado no dir de trabalho
    var_dir = especie_dir / f"{especie_nome}_variables_{naming.carimbo(especie_dir)}"
    var_dir.mkdir(parents=True, exist_ok=True)
    work = data_root / f"tmp_{token}_{especie_nome}"
    work.mkdir(parents=True, exist_ok=True)
    cache_dir = data_root / "raster_cache"

    def _saida(tipo: str, ext: str) -> Path:
        """Caminho de uma saída desta espécie, na convenção do projeto."""
        return var_dir / naming.nome(tipo, especie_nome, especie_dir, ext)

    # base_de_dados = fonte do registro (coluna `provider` do modelo único; ex.: gbif).
    if "provider" in df_full.columns:
        fonte = df_full["provider"]
    elif "source" in df_full.columns:
        fonte = df_full["source"]
    else:
        fonte = pd.Series([pd.NA] * n0)

    # DataFrame de trabalho: identificação + o que os providers precisam.
    faltando = [c for c in _BASE_COLS if c not in df_full.columns]
    if faltando:
        raise ValueError(f"CSV de entrada sem colunas obrigatórias: {faltando}")
    df = df_full[_BASE_COLS].copy()
    df.insert(0, "base_de_dados", fonte.values)
    if "sp" in df_full.columns:
        df["sp"] = df_full["sp"].values

    # (1) CSV intermediário: apenas [base_de_dados, lat, lon, data] (spec obrigatório).
    inter = _saida("points", "csv")
    df[["base_de_dados"] + _BASE_COLS].to_csv(inter, index=False)
    _p(f"[captura] {csv.name} | {n0} registros | vars={variaveis} | intermediário: {inter.name}")

    cols_ident = set(df.columns)
    ctx = CaptureContext(
        especie_dir=especie_dir, work=work, token=token, data_root=data_root,
        cache_dir=cache_dir, dem_path=dem_path, workers=workers,
    )

    # CACHE RESUMÍVEL: reaproveita variáveis já captadas antes (checkpoint por variável).
    checkpoint = _saida("checkpoint", "csv")
    df, _cache_cols = _carregar_checkpoint(df, checkpoint, cols_ident)
    if _cache_cols:
        _p(f"[captura] cache: {len(_cache_cols)} coluna(s) reaproveitada(s) "
           f"({', '.join(sorted(_cache_cols))}) — providers correspondentes serao pulados.")

    provs = build_providers(variaveis)

    # Pula os que já vieram do checkpoint (resumível — não refaz o que já foi captado).
    consumo = []  # (nome, status, tempo_s)
    pendentes = []
    for prov in provs:
        _prov_cols = list(getattr(prov, "columns", []) or [])
        if _prov_cols and all(c in df.columns for c in _prov_cols):
            _p(f"  =   {prov.name}: JA NO CACHE ({', '.join(_prov_cols)}) — pulando.")
            consumo.append((prov.name, "CACHE", 0.0))
        else:
            pendentes.append(prov)

    # ------------------------------------------------------------------
    # PROVIDERS EM PARALELO — cada um fala com um SERVIDOR DIFERENTE (ERA5=Copernicus,
    # NDVI=NASA, SoilGrids=ISRIC, altitude=OpenTopography, MapBiomas=raster local), então
    # não disputam banda nem fila entre si. Antes rodavam em fila, e o tempo era a SOMA;
    # agora é o MÁXIMO. O ERA5 (horas) passa a correr junto com os demais (minutos).
    #
    # SEGURANÇA DO MERGE: cada provider recebe uma CÓPIA do df e devolve as linhas na
    # MESMA ORDEM (apply_downloader_step alinha por `_row_id` e faz merge à esquerda).
    # Conferimos o tamanho antes de anexar e copiamos as colunas por POSIÇÃO (.values),
    # que é imune a diferença de índice.
    # ------------------------------------------------------------------
    t_ini = time.perf_counter()
    disk0_tot = _dir_size(data_root)
    req0_tot = _METER["req"]
    cols_antes = set(df.columns)
    lock = threading.Lock()

    # Estado de cada variável, lido pelo painel (de outra thread) -> sob `lock`.
    nomes = [p.name for p in provs]
    estado: dict[str, dict] = {p.name: {"status": "PENDENTE"} for p in provs}
    for nome, status, dt in consumo:                       # as que vieram do cache
        estado[nome] = {"status": status, "dt": dt}

    def _rodar(prov):
        with lock:
            estado[prov.name] = {"status": "RODANDO", "t0": time.perf_counter()}
        t0 = time.perf_counter()
        try:
            dfp = prov.capture(df.copy(), ctx)
            return prov, dfp, None, time.perf_counter() - t0
        except Exception as e:  # noqa: BLE001 - isola falha por variável
            return prov, None, e, time.perf_counter() - t0

    painel = _Painel(ctx, nomes, estado, lock, data_root, every=max(painel_seg, 1.0))

    if pendentes:
        n_par = len(pendentes) if paralelo else 1
        _p("")
        _p("=" * 78)
        _p(f">> {len(pendentes)} variavel(is) a captar "
           + (f"— MODO SIMULTANEO ({n_par} de uma vez): "
              if paralelo else "— MODO SEQUENCIAL (uma de cada vez): ")
           + ", ".join(p.name for p in pendentes))
        if painel_seg > 0:
            painel.start()
        try:
            with ThreadPoolExecutor(max_workers=n_par) as ex:
                for fut in as_completed([ex.submit(_rodar, p) for p in pendentes]):
                    prov, dfp, err, dt = fut.result()

                    def _fim(status: str, msg: str) -> None:
                        with lock:
                            estado[prov.name] = {"status": status, "dt": dt}
                        consumo.append((prov.name, status, dt))
                        _p(f"  >> {prov.name}: {msg}")

                    if err is not None:
                        _fim("PULADA", f"FALHOU ({type(err).__name__}: {err}) "
                                       f"apos {_hms(dt)}")
                        continue
                    if len(dfp) != len(df):
                        _fim("PULADA", f"devolveu {len(dfp)} linhas, esperado {len(df)} "
                                       f"— NAO anexado (evita desalinhar os dados)")
                        continue
                    novas = [c for c in dfp.columns if c not in cols_antes]
                    if not novas:
                        _fim("SEM DADOS", f"nenhuma coluna nova apos {_hms(dt)}")
                        continue
                    with lock:
                        for c in novas:                   # por POSIÇÃO: imune ao índice
                            df[c] = dfp[c].values
                        cols_antes.update(novas)
                    preench = ", ".join(f"{c}={int(df[c].notna().sum())}/{len(df)}"
                                        for c in novas)
                    _fim("OK", f"OK em {_hms(dt)}  |  {preench}")
                    # CHECKPOINT após CADA variável concluída (resumível: se o PC
                    # desligar, o que já foi captado fica salvo).
                    _salvar_checkpoint(df, checkpoint)
        finally:
            painel.parar()
            if painel_seg > 0:
                painel.desenhar(final=True)

    shutil.rmtree(work, ignore_errors=True)

    # ---- Resumo de CONSUMO (downloads) ----
    # No modo SIMULTANEO os providers correm juntos, então requisições/bytes não são
    # atribuíveis a um deles isoladamente (os contadores são globais): reportamos
    # req/dados só no TOTAL. O TEMPO por variável é medido individualmente e é exato
    # nos dois modos — mas o TOTAL é a SOMA no sequencial e o MÁXIMO no simultâneo.
    t_tot = time.perf_counter() - t_ini
    _p("")
    _p("==== CONSUMO DE DOWNLOAD ====")
    for nome, status, dt in sorted(consumo, key=lambda c: -c[2]):
        _p(f"  {nome:10} {status:9} | tempo {_hms(dt):>8}")
    tot_req = _METER["req"] - req0_tot
    tot_disk = max(_dir_size(data_root) - disk0_tot, 0)
    _p(f"  {'TOTAL':10} {'':9} | tempo {_hms(t_tot):>8} | req {tot_req} "
       f"| dados +{_mb(tot_disk)}  ({'simultaneo' if paralelo else 'sequencial'})")

    # VARIÁVEL QUE FALHOU NÃO PODE PASSAR DESPERCEBIDA. A falha de um provider é isolada
    # de propósito (melhor entregar 6 de 7 do que nada), mas o CSV sai SEM aquela coluna
    # e o pipeline termina com código de sucesso — é fácil não notar. Aqui o aviso é
    # explícito e diz o que fazer: rodar de novo, que o checkpoint refaz SÓ o que faltou.
    _falhas = [nome for nome, status, _ in consumo if status in ("PULADA", "SEM DADOS")]
    if _falhas:
        _p("")
        _p("!" * 78)
        _p(f"!! ATENCAO: {len(_falhas)} variavel(is) NAO foram captadas: {', '.join(_falhas)}")
        _p("!! O CSV sai SEM essas colunas. Rode a captura de novo para completar —")
        _p("!! o checkpoint preserva as que já ficaram prontas e refaz apenas as que faltam.")
        _p("!" * 78)

    # (2a) USO E OCUPAÇÃO DO SOLO: regra determinística + relatório + campo recomendado.
    _uso_solo_report(df, especie_nome, especie_dir, var_dir)

    # (2b) USO DO SOLO: SEMPRE apresentar a CATEGORIA — coluna `<col>_classe` com o
    #      NOME oficial da classe ao lado do código (MapBiomas Col.9 / ESA WorldCover).
    from env_providers.legendas_uso_solo import nome_classe
    _classe_cols = []
    for _col in ("ocup_solo_mapbiomas", "ocup_solo_worldcover"):
        if _col in df.columns:
            df[f"{_col}_classe"] = df[_col].map(lambda v, _c=_col: nome_classe(_c, v))
            _classe_cols.append(f"{_col}_classe")

    # (2c) Saída SLIM: base_de_dados, lat, lon, data, sp + variáveis (sem colunas-QA).
    #      `*_classe` = rótulo (não-variável) → fora do QA, mas AO LADO do seu código.
    _nao_variaveis = {"ndvi_dias_validos", "recommended_land_use_source", *_classe_cols}
    # ORDEM DAS COLUNAS = ordem do registry de providers, NÃO a ordem em que terminaram.
    # Rodando em paralelo, quem acaba primeiro varia a cada execução; sem isto o CSV
    # sairia com as colunas embaralhadas de um run para o outro.
    _ordem_registry = [c for p in provs for c in (getattr(p, "columns", []) or [])]
    _elegivel = lambda c: (c not in cols_ident and c not in _nao_variaveis  # noqa: E731
                           and c in df.columns)
    env_cols = [c for c in _ordem_registry if _elegivel(c)]
    env_cols += [c for c in df.columns if _elegivel(c) and c not in env_cols]  # imprevistas
    ordem = ["base_de_dados"] + _BASE_COLS + (["sp"] if "sp" in df.columns else [])
    for c in env_cols:                       # insere o nome da classe logo após o código
        ordem.append(c)
        if f"{c}_classe" in df.columns:
            ordem.append(f"{c}_classe")
    if "recommended_land_use_source" in df.columns:
        ordem += ["recommended_land_use_source"]
    slim = df[ordem]
    out_csv = _saida("variables", "csv")
    slim.to_csv(out_csv, index=False)
    _p(f"[OK] CSV slim salvo: {out_csv} | {len(slim)} linhas, {len(slim.columns)} colunas")

    _relatorio_qa(df, env_cols, n0, _saida("qa", "txt"))

    # (3) ÚLTIMA ETAPA da 03: Controle de Qualidade Ambiental (QC) para SDM.
    #     Isolado — nunca derruba a captura; gera environmental_qc/ com o relatório.
    # A ESPÉCIE, não o nome da pasta — que é a DATA. O laudo do QC vinha intitulado
    # "2026-07-13" em vez de "Sapajus nigritus".
    _rodar_qc_ambiental(out_csv, especie_nome)
    return out_csv


def _rodar_qc_ambiental(out_csv: Path, especie: str) -> None:
    try:
        from processo import run_qc
        _p("")
        _p("==== QC AMBIENTAL (última etapa) ====")
        run_qc(out_csv, especie=especie)
    except Exception as e:  # noqa: BLE001 - QC nunca derruba a captura
        _p(f"[qc] PULADO: {type(e).__name__}: {e}")


def _uso_solo_report(df: pd.DataFrame, especie: str, especie_dir: Path,
                     var_dir: Path) -> None:
    """Regra determinística (fonte recomendada) + relatório por espécie + campo
    `recommended_land_use_source` no df. Só roda se houver ao menos uma coluna de
    uso do solo; isola falhas (não derruba a captura)."""
    cols = [c for c in ("ocup_solo_mapbiomas", "ocup_solo_worldcover") if c in df.columns]
    if not cols:
        return
    try:
        import json
        from env_providers.uso_solo import calcular_metricas, montar_relatorio
        m = calcular_metricas(df)
        df["recommended_land_use_source"] = m["recommended_land_use_source"]
        rep = montar_relatorio(especie, m)
        (var_dir / naming.nome("landuse", especie, especie_dir, "txt")).write_text(
            rep, encoding="utf-8")
        (var_dir / naming.nome("landuse", especie, especie_dir, "json")).write_text(
            json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
        _p(rep)
    except Exception as e:  # noqa: BLE001
        _p(f"[uso_solo] relatório/recomendação PULADO: {type(e).__name__}: {e}")


def main(paralelo: bool = False) -> None:
    """CLI compartilhada. `captura_ambiental.py` chama com paralelo=False;
    `captura_ambiental_simultaneo.py` chama com paralelo=True."""
    modo = "SIMULTÂNEA (todas as variáveis de uma vez)" if paralelo \
        else "SEQUENCIAL (uma variável de cada vez)"
    p = argparse.ArgumentParser(
        description=f"Captação de variáveis ambientais (etapa 03) — {modo}."
    )
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--especie", type=str, help="Nome científico (busca na pasta 07).")
    g.add_argument("--csv", type=str, help="Caminho do sp_<Especie>_occurrences.csv.")
    p.add_argument("--vars", type=str, default=",".join(DEFAULT_CONTINENTAL),
                   help="Variáveis (era5,ndvi,altitude,slope,soilgrids,mapbiomas,worldcover).")
    p.add_argument("--dem", type=str, default=str(ROOT / "dados_saida" / "dem" / "output.tif"),
                   help="DEM (GeoTIFF) para altitude/slope.")
    p.add_argument("--data_dir", type=str, default=str(ROOT / "env_data"),
                   help="Raiz dos dados ambientais + cache de rasters.")
    p.add_argument("--max_workers", type=int, default=5)
    p.add_argument("--painel_seg", type=float, default=20.0,
                   help="Intervalo (s) do painel ao vivo. 0 desliga. Padrão: 20.")
    # DOIS PROCESSOS de representação temporal do clima/NDVI (ERA5, NDVI):
    #   daily (padrão)  -> baixa o clima DO DIA de cada registro (SDM dinâmico).
    #   climatologico   -> amostra a média 2015-2024 nos pontos (SDM do nicho médio).
    # A escolha é POR PARÂMETRO; ver documentation/14_camadas_predicao_documentacao.md §4-5.
    p.add_argument("--modo", choices=["daily", "climatologico"], default="daily",
                   help="daily (padrão): clima DO DIA de cada registro (dinâmico). "
                        "climatologico: média 2015-2024 amostrada nos pontos "
                        "(delega p/ captura_climatologica.py).")
    # Opt-ins do modo CLIMATOLÓGICO (repassados a capturar_climatologico; ignorados no daily):
    p.add_argument("--uso_solo", choices=["mapbiomas", "worldcover"], default="mapbiomas",
                   help="[climatologico] Categórica de uso do solo. worldcover = global "
                        "(área de treino com PY/AR/BO).")
    p.add_argument("--com_amplitudes", action="store_true",
                   help="[climatologico] Soma {t2m,e,tp,ndvi}_amp (sazonalidade do lugar).")
    p.add_argument("--com_riparios", action="store_true",
                   help="[climatologico] Soma dist_rio e pct_floresta_500m (janela RS).")
    args = p.parse_args()

    csv = Path(args.csv) if args.csv else _find_species_csv(args.especie)

    # ALTERNATIVA CLIMATOLÓGICA: em vez de baixar por data, amostra os rasters de 10 anos.
    if args.modo == "climatologico":
        from captura_climatologica import capturar_climatologico
        _p(f"[captura] MODO CLIMATOLÓGICO (média 2015-2024) — delegando p/ "
           f"captura_climatologica (uso_solo={args.uso_solo}, "
           f"amplitudes={args.com_amplitudes}, riparios={args.com_riparios}).")
        capturar_climatologico(csv, uso_solo=args.uso_solo,
                               com_amplitudes=args.com_amplitudes,
                               com_riparios=args.com_riparios)
        return

    variaveis = [v.strip() for v in args.vars.split(",") if v.strip()]
    capturar(csv, variaveis, Path(args.data_dir), args.dem, args.max_workers,
             paralelo=paralelo, painel_seg=args.painel_seg)


if __name__ == "__main__":
    main()
