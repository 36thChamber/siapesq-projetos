#!/usr/bin/env python3
# painel_geral.py — PAINEL DE ACOMPANHAMENTO de TODAS as etapas, para as 3 especies.
#
# Mostra, num quadro so, o andamento ponta-a-ponta de cada especie:
#   occ -> pseudo -> captura(daily) -> captura(clima) -> RF(daily) -> RF(clima)
#        -> predicao RS(daily) -> predicao RS(clima)
#
# Le o estado direto do DISCO (arquivos de saida na pasta 07). Nao interfere em nada que
# esteja rodando. A predicao expoe % ao vivo via `_progress.txt` (mesmo do motor de predicao).
#
# Uso:
#   python 05_utils/painel_geral.py                # snapshot unico
#   python 05_utils/painel_geral.py --loop 15      # atualiza a cada 15 s (Ctrl+C sai)
#   python 05_utils/painel_geral.py --especies "Alouatta caraya,Sapajus nigritus"

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE07 = ROOT / "07 Executado por espécie"
sys.path.insert(0, str(ROOT))
import naming  # noqa: E402

ESPECIES_PADRAO = ["Alouatta caraya", "Alouatta guariba", "Sapajus nigritus"]

# Cache ERA5: 1 GRIB por DIA unico (ver env_providers/era5.py + downloaders/cdsapi.py).
# E' o unico sinal de progresso AO VIVO da captura daily — o checkpoint da captura so
# e' reescrito quando uma variavel INTEIRA termina (5 escritas na execucao toda).
ERA5_DIR = ROOT / "env_data" / "era5"
_RE_GRIB = re.compile(r"^variables_(\d{4})_(\d{2})_(\d{2})_[0-9a-f]+\.grib$")

# Etapas na ordem do pipeline (rotulo curto p/ cabecalho da tabela).
ETAPAS = ["occ", "pseudo", "cap.daily", "cap.clima", "RF daily", "RF clima",
          "pred.daily", "pred.clima"]

# codigos de status -> simbolo (ASCII-only p/ nao embaralhar em consoles cp1252)
PEND = "--"
OK = "OK"

_RE_DATA_DIR = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _latest_subdir(especies: list[str]) -> str:
    """Descobre a subpasta datada (YYYY-MM-DD) mais recente entre as especies —
    assim o comando nao precisa da data na mao. Vazio se nao achar nenhuma."""
    datas = set()
    for esp in especies:
        slug = esp.strip().replace(" ", "_")
        for d in list(BASE07.glob(f"{slug}/*")) + list(BASE07.glob(f"{slug}*/*")):
            if d.is_dir() and _RE_DATA_DIR.match(d.name):
                datas.add(d.name)
    return max(datas) if datas else ""


def _sdm_rodando() -> str:
    """Best-effort: diz se o SDM esta rodando AGORA.

    Olha os PROCESSOS primeiro e a Tarefa Agendada depois: o pipeline tambem pode ser
    lancado na mao (fora da tarefa), e ai o status da tarefa dizia 'parada' com tudo
    trabalhando. Quem manda e' o processo vivo."""
    rscript = python = 0
    try:
        r = subprocess.run(["tasklist", "/fi", "IMAGENAME eq Rscript.exe", "/nh"],
                           capture_output=True, text=True, timeout=8).stdout
        rscript = r.count("Rscript.exe")
    except Exception:  # noqa: BLE001
        pass
    try:
        r = subprocess.run(["tasklist", "/fi", "IMAGENAME eq python.exe", "/nh"],
                           capture_output=True, text=True, timeout=8).stdout
        # desconta o proprio painel, que tambem e' python.exe
        python = max(0, r.count("python.exe") - 1)
    except Exception:  # noqa: BLE001
        pass

    if rscript or python:
        partes = []
        if rscript:
            partes.append(f"{rscript} Rscript (modelo/predicao)")
        if python:
            partes.append(f"{python} python (captura)")
        estado = "SIM - " + " + ".join(partes)
    else:
        estado = "NAO - nenhum processo ativo"

    try:
        out = subprocess.run(["schtasks", "/query", "/tn", "SDM_master_run", "/fo", "list"],
                             capture_output=True, text=True, timeout=8).stdout
        if re.search(r"Status:\s*(Running|Em execu)", out):
            estado += " | tarefa SDM ativa"
        elif "Status:" in out:
            estado += " | tarefa SDM parada"
    except Exception:  # noqa: BLE001
        pass
    return estado


def _pasta_especie(especie: str, subdir: str = "") -> Path | None:
    slug = especie.strip().replace(" ", "_")
    exato = BASE07 / slug
    base = exato if exato.exists() else None
    if base is None:
        cands = sorted(d for d in BASE07.glob(f"{slug}*") if d.is_dir())
        base = cands[0] if cands else None
    if base is None:
        return None
    if subdir:  # escopo: SO a rodada nova (evita pegar saidas antigas na mesma pasta)
        alvo = base / subdir
        return alvo if alvo.exists() else None
    return base


def _linhas_csv(p: Path) -> int:
    try:
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            return max(0, sum(1 for _ in f) - 1)
    except Exception:
        return -1


def _tem_clima(csv: Path) -> bool:
    """True se o dataset ja' traz as colunas do ERA5 (t2m/e/tp) — sem elas a captura
    daily NAO esta' completa, mesmo que o arquivo exista."""
    try:
        with open(csv, "r", encoding="utf-8", errors="ignore") as f:
            cols = {c.strip().strip('"') for c in f.readline().split(",")}
        return "t2m" in cols
    except Exception:  # noqa: BLE001
        return False


def _achar(tipo: str, base: Path) -> Path | None:
    try:
        return naming.achar(tipo, base)
    except Exception:
        return None


def _glob1(base: Path, pattern: str, excluir: str | None = None) -> Path | None:
    for p in sorted(base.rglob(pattern)):
        if excluir and excluir in str(p).lower():
            continue
        return p
    return None


def _ler_progress(prog: Path) -> str | None:
    """Le `_progress.txt` (fase\\tfeito\\ttotal\\tpct\\tmsg\\tel) -> texto curto de %.
    Mostra tambem feito/total (faixas da predicao), que e' o contador que interessa."""
    try:
        campos = prog.read_text(encoding="utf-8").strip().split("\t")
        fase, feito, total, pct = campos[0], campos[1], campos[2], campos[3]
        if fase == "concluido":
            return None
        return f"{pct:>3}% {feito}/{total}"
    except Exception:
        return None


_CACHE_ERA5: tuple[float, set[str]] = (0.0, set())


def _dias_no_cache_era5() -> set[str]:
    """Chaves 'AAAA_MM_DD' que ja tem GRIB baixado. Um scandir por atualizacao —
    NAO abre os GRIBs (eccodes nao e' thread-safe; ver memoria do projeto).
    Memoizado por 3 s: sao ~10 mil arquivos e as 3 especies consultam a mesma pasta."""
    global _CACHE_ERA5
    agora = time.time()
    if agora - _CACHE_ERA5[0] < 3.0:
        return _CACHE_ERA5[1]
    dias: set[str] = set()
    try:
        with __import__("os").scandir(ERA5_DIR) as it:
            for e in it:
                m = _RE_GRIB.match(e.name)
                if m:
                    dias.add("_".join(m.groups()))
    except Exception:  # noqa: BLE001 - pasta ausente = 0% (nao derruba o painel)
        pass
    _CACHE_ERA5 = (agora, dias)
    return dias


_CACHE_NOMES: tuple[float, set[str]] = (0.0, set())


def _nomes_no_cache_era5() -> set[str]:
    """Nomes dos GRIBs em disco ('variables_AAAA_MM_DD_hash.grib'). Mesmo scandir e
    mesma memoizacao de `_dias_no_cache_era5`, mas guardando o nome INTEIRO — e' o
    hash do recorte no nome que permite reconhecer um arquivo baixado DEPOIS de o
    indice `_extents.json` ter sido escrito."""
    global _CACHE_NOMES
    agora = time.time()
    if agora - _CACHE_NOMES[0] < 3.0:
        return _CACHE_NOMES[1]
    nomes: set[str] = set()
    try:
        with __import__("os").scandir(ERA5_DIR) as it:
            for e in it:
                if _RE_GRIB.match(e.name):
                    nomes.add(e.name)
    except Exception:  # noqa: BLE001
        pass
    _CACHE_NOMES = (agora, nomes)
    return nomes


# Janela da captação: IMPORTADA de 03_environmental_processing/captura_ambiental.py, não
# copiada. A captura descarta as datas fora dela ANTES de pedir qualquer coisa; se o painel
# contasse essas datas no denominador, o contador empacava num teto (ex.: 98%) esperando
# download que nunca vem — foi o que aconteceu em 2026-07-20 com o número 1950 copiado à mão
# enquanto a captura já cortava em 2000. Os valores abaixo são só rede de segurança para o
# caso do import falhar (o painel nunca pode derrubar por causa disso).
ERA5_ANO_INICIO = 2000
ERA5_ATRASO_DIAS = 5
try:
    sys.path.insert(0, str(ROOT / "03_environmental_processing"))
    from captura_ambiental import (ERA5_ANO_INICIO,  # noqa: F811,E402
                                   ERA5_ATRASO_DIAS)
except Exception:  # noqa: BLE001 - segue com os valores acima
    pass

# Idem para a geometria do recorte: mesma margem e mesma tolerancia de grade que o
# downloader usa em `achar_no_cache` — se o painel medisse com outra regra, ele diria
# "falta baixar" para datas que a captura considera prontas (e vice-versa).
ERA5_BUFFER_DEG = 0.2
ERA5_TOL = 0.1 + 1e-6


def _bbox_hash(bbox: list) -> str:
    """Hash do recorte, IGUAL ao de downloaders/cdsapi.py::bbox_hash (md5 dos 4 valores
    com 2 casas). Reimplementado aqui de proposito, em vez de importado: importar aquele
    modulo puxa o pacote `cdsapi`, que existe no python da captura mas nao no `python`
    que o painel.bat pega no cmd. O import falhava calado, o painel caia na contagem
    antiga e mostrava um numero congelado (2026-07-20, custou varias rodadas de conversa).
    Sao 3 linhas: melhor duplicar do que depender de um pacote pesado para isso."""
    import hashlib
    return hashlib.md5("_".join(f"{v:.2f}" for v in bbox).encode()).hexdigest()[:8]


try:                                    # so' para alinhar as constantes, se der
    sys.path.insert(0, str(ROOT / "01_data_acquisition"))
    from downloaders.cdsapi import (ERA5_BUFFER_DEG,  # noqa: F811,E402
                                    ERA5_GRID_DEG)
    ERA5_TOL = ERA5_GRID_DEG + 1e-6
except Exception:  # noqa: BLE001 - segue com os valores acima
    pass


def _dias_pedidos(csv_pseudo: Path) -> set[str]:
    """Dias unicos que a captura vai pedir ao ERA5 = 1 requisicao por data unica
    (mesma chave de `create_data_hash`). Linhas sem data completa nao contam, nem
    datas fora da janela do ERA5-Land (antigas demais / recentes demais)."""
    from datetime import date, timedelta
    limite = date.today() - timedelta(days=ERA5_ATRASO_DIAS)
    dias: set[str] = set()
    try:
        import csv as _csv
        with open(csv_pseudo, encoding="utf-8", errors="ignore") as f:
            for row in _csv.DictReader(f):
                try:
                    # o CSV grava as datas como float ("1.0"), entao int() direto estoura
                    y, mth, d = (int(float(row[c])) for c in ("year", "month", "day"))
                except (KeyError, TypeError, ValueError):
                    continue
                if y < ERA5_ANO_INICIO:
                    continue
                try:
                    if date(y, mth, d) > limite:
                        continue
                except ValueError:      # data invalida (ex.: 31/02) — a captura tb ignora
                    continue
                dias.add(f"{y:04d}_{mth:02d}_{d:02d}")
    except Exception:  # noqa: BLE001
        pass
    return dias


def _cobertura_por_data(csv_pseudo: Path) -> tuple[int, int] | None:
    """(datas ja resolvidas, datas pedidas) medindo COBERTURA DE RECORTE, como a captura
    faz de verdade. None se o indice `_extents.json` nao existir.

    Por que nao basta 'existe grib desta data': o recorte pedido e' a caixa dos pontos
    DAQUELA data, que muda de especie para especie. Um grib da mesma data baixado para
    outra especie pode NAO cobrir esta — a captura rebaixa, e o contador por data ficava
    parado (o famoso '1892 que nao sobe') enquanto havia download acontecendo."""
    import csv as _csv
    import json
    from collections import defaultdict
    try:
        ext = json.loads((ERA5_DIR / "_extents.json").read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 - sem indice: cai no modo antigo
        return None
    idx: dict[str, list] = defaultdict(list)
    for nome, e in ext.items():        # variables_AAAA_MM_DD_hash.grib
        p = nome.split("_")
        if len(p) >= 4:
            idx["_".join(p[1:4])].append(tuple(e))

    from datetime import date, timedelta
    limite = date.today() - timedelta(days=ERA5_ATRASO_DIAS)
    pts: dict[str, list] = defaultdict(list)
    try:
        with open(csv_pseudo, encoding="utf-8", errors="ignore") as f:
            for row in _csv.DictReader(f):
                try:
                    y, mth, d = (int(float(row[c])) for c in ("year", "month", "day"))
                    lat = float(row["decimalLatitude"]); lon = float(row["decimalLongitude"])
                except (KeyError, TypeError, ValueError):
                    continue
                if y < ERA5_ANO_INICIO:
                    continue
                try:
                    if date(y, mth, d) > limite:
                        continue
                except ValueError:
                    continue
                pts[f"{y:04d}_{mth:02d}_{d:02d}"].append((lon, lat))
    except Exception:  # noqa: BLE001
        return None
    if not pts:
        return None

    # `_extents.json` e' um retrato do INICIO da execucao (quem o reescreve e'
    # `indexar_cache`, antes do ThreadPool). Tudo que a captura baixa DEPOIS fica
    # invisivel nele — e o contador congelava no meio da corrida, parecendo travado
    # com o download a todo vapor. Por isso olhamos tambem os arquivos no disco: um
    # grib gravado com o hash do recorte PEDIDO e' resposta exata, nao precisa do
    # indice para ser reconhecido.
    nomes = _nomes_no_cache_era5()
    ok = 0
    for k, pp in pts.items():
        lons = [p[0] for p in pp]; lats = [p[1] for p in pp]
        n, w = max(lats) + ERA5_BUFFER_DEG, min(lons) - ERA5_BUFFER_DEG
        s, e = min(lats) - ERA5_BUFFER_DEG, max(lons) + ERA5_BUFFER_DEG
        if any(N >= n - ERA5_TOL and S <= s + ERA5_TOL and W <= w + ERA5_TOL
               and E >= e - ERA5_TOL for N, W, S, E in idx.get(k, [])):
            ok += 1
        elif _bbox_hash and f"variables_{k}_{_bbox_hash([n, w, s, e])}.grib" in nomes:
            ok += 1
    return (ok, len(pts))


def progresso_era5(especie: str, subdir: str, cache: set[str] | None = None) -> tuple[int, int]:
    """(dias prontos, dias pedidos) do ERA5 para uma especie. (0, 0) se nao der p/ medir."""
    base = _pasta_especie(especie, subdir)
    if base is None:
        return (0, 0)
    ps = _achar("pseudoabsence", base)
    if not ps:
        return (0, 0)
    exato = _cobertura_por_data(ps)     # medida CERTA (por recorte)
    if exato:
        return exato
    pedidos = _dias_pedidos(ps)         # queda p/ a medida grosseira (so por data)
    if not pedidos:
        return (0, 0)
    prontos = pedidos & (cache if cache is not None else _dias_no_cache_era5())
    return (len(prontos), len(pedidos))


def status_especie(especie: str, subdir: str = "") -> dict[str, str]:
    """Devolve {etapa: texto_status} para uma especie (le o disco).
    `subdir` limita o escopo a uma rodada especifica (subpasta da especie)."""
    st = {e: PEND for e in ETAPAS}
    base = _pasta_especie(especie, subdir)
    if base is None:
        return st

    # occ
    occ = _achar("occurrence", base)
    if occ:
        st["occ"] = f"{OK} {_linhas_csv(occ)}p"

    # pseudo (mostra presencas/pseudo)
    ps = _achar("pseudoabsence", base)
    if ps:
        n = _linhas_csv(ps)
        pres = pseudo = None
        try:
            import csv
            with open(ps, encoding="utf-8", errors="ignore") as f:
                r = csv.DictReader(f)
                if "sp" in (r.fieldnames or []):
                    pres = pseudo = 0
                    for row in r:
                        if str(row.get("sp")) == "1":
                            pres += 1
                        elif str(row.get("sp")) == "0":
                            pseudo += 1
        except Exception:
            pass
        st["pseudo"] = f"{OK} {pres}:{pseudo}" if pres is not None else f"{OK} {n}"

    # captura climatologica (dataset SLIM: VariablesClimatologico_*.csv)
    cap_cl = _glob1(base, "*limatologico*.csv")
    if cap_cl and cap_cl.is_file():
        st["cap.clima"] = f"{OK} {_linhas_csv(cap_cl)}"

    # captura daily (dataset SLIM: Variables_*.csv — nao casa com VariablesClimatologico_).
    # So' conta como pronta se tiver as colunas do ERA5: existe dataset de execucao
    # ANTERIOR com as outras 4 variaveis e SEM clima, que marcava OK indevidamente.
    cap_d = _glob1(base, "Variables_*.csv")
    if cap_d and cap_d.is_file() and _tem_clima(cap_d):
        st["cap.daily"] = f"{OK} {_linhas_csv(cap_d)}"
    else:
        # AO VIVO: enquanto o dataset nao existe, mede o ERA5 (o gargalo) pelos GRIBs
        # ja baixados. O denominador e' so' desta especie; dias baixados por outra
        # especie contam como prontos aqui de proposito (o cache e' compartilhado).
        feito, total = progresso_era5(especie, subdir)
        if total:
            # trava em 99%: 1892/1899 arredondava para 100% e a etapa aparecia como
            # concluida enquanto o dataset ainda nem tinha sido escrito.
            pct = min(99, int(100 * feito / total)) if feito < total else 99
            st["cap.daily"] = f"{pct:>3}% ERA5"

    # modelos RF (.sdm) — modo pelo caminho
    for sdm in base.rglob("*.sdm"):
        chave = "RF clima" if "climatolog" in str(sdm).lower() or "clima" in sdm.stem.lower() else "RF daily"
        st[chave] = OK

    # predicao RS (mean.tif) + % ao vivo (_progress.txt).
    # IGNORA `_strips/`: sao as faixas PARCIAIS do checkpoint (mean_001.tif, ...), que
    # casavam com "*mean*.tif" e marcavam a predicao como OK ainda no meio da corrida.
    for mean in base.rglob("*mean*.tif"):
        low = str(mean).lower()
        if "_strips" in low:
            continue
        chave = "pred.clima" if "clima" in low else "pred.daily"
        st[chave] = OK
    for prog in base.rglob("_progress.txt"):
        txt = _ler_progress(prog)
        if txt:
            low = str(prog).lower()
            chave = "pred.clima" if "clima" in low else "pred.daily"
            if not st[chave].startswith(OK):
                st[chave] = txt
    return st


def _frac(cell: str) -> float:
    """Fracao de conclusao de uma celula: OK=1.0; 'NN% ...'=NN/100; senao 0."""
    if cell.startswith(OK):
        return 1.0
    import re
    m = re.match(r"\s*(\d+)%", cell)
    return (int(m.group(1)) / 100.0) if m else 0.0


# Historico p/ calcular ritmo e ETA no modo --loop: {especie: [(t, dias_prontos), ...]}
_HIST: dict[str, list[tuple[float, int]]] = {}


def _hms(seg: float) -> str:
    seg = int(max(seg, 0))
    h, m = seg // 3600, (seg % 3600) // 60
    return f"{h}h{m:02d}" if h else f"{m}min"


def _batimento_era5(minutos: int = 10) -> str:
    """SINAL DE VIDA do download, medido nos arquivos em disco (nao no historico do
    --loop, que zera a cada vez que o painel reabre).

    Existe porque o resto do painel e' quase todo estatico durante a captura: o TOTAL
    fica parado em 21/24 por horas e a celula da tabela so' vira a cada ~1%, entao o
    painel parecia travado com o download a todo vapor (aconteceu em 2026-07-20, e o
    usuario perguntou 3x se tinha parado). 'Ultimo ha 12s' responde na hora."""
    import os
    agora = time.time()
    corte = agora - minutos * 60
    n, mais_novo = 0, 0.0
    try:
        with os.scandir(ERA5_DIR) as it:
            for e in it:
                if not _RE_GRIB.match(e.name):
                    continue
                try:
                    mt = e.stat().st_mtime
                except OSError:
                    continue
                mais_novo = max(mais_novo, mt)
                if mt >= corte:
                    n += 1
    except Exception:  # noqa: BLE001
        return ""
    if not mais_novo:
        return ""
    idade = int(agora - mais_novo)
    quando = f"{idade}s" if idade < 90 else _hms(idade)
    marca = "BAIXANDO" if idade < 180 else "SEM ARQUIVO NOVO"
    return (f"  [{marca}] {n} arquivo(s) nos ultimos {minutos} min "
            f"({n * 60 // minutos}/h)  |  ultimo ha {quando}")


def _detalhe_era5(especie: str, feito: int, total: int) -> str:
    """Linha de detalhe: dias prontos, ritmo e tempo restante. O ritmo vem da
    variacao do proprio contador entre atualizacoes (janela de 10 min)."""
    agora = time.time()
    h = _HIST.setdefault(especie, [])
    h.append((agora, feito))
    while len(h) > 2 and agora - h[0][0] > 600:
        h.pop(0)
    txt = f"  ERA5 {especie}: {feito}/{total} dias"
    if len(h) >= 2:
        dt, dn = h[-1][0] - h[0][0], h[-1][1] - h[0][1]
        if dt > 5 and dn > 0:
            ritmo = dn / dt                      # dias/s
            txt += f"  |  {ritmo * 60:.1f}/min  |  faltam ~{_hms((total - feito) / ritmo)}"
        elif dt > 60:
            # sem GRIB novo != travado: pode estar na fila do CDS ou ja' na extracao
            txt += "  |  sem download novo (fila do CDS ou fase de extracao)"
    return txt


def _abrev(especie: str) -> str:
    """'Alouatta caraya' -> 'A. caraya' (a lista de pendencias fica curta)."""
    partes = especie.split()
    return f"{partes[0][0]}. {' '.join(partes[1:])}" if len(partes) > 1 else especie


def _resumo_etapas(especies: list[str], sts: dict[str, dict[str, str]],
                   subdir: str) -> list[str]:
    """CONTADOR POR ETAPA: quantas especies ja concluiram cada uma das 8 etapas,
    quem esta em andamento (com o contador da etapa) e quem ainda nem comecou.

    E' a visao que o painel nao tinha: a barra geral dizia 'quanto', mas nao 'o que'.
    """
    linhas = ["CONTADOR POR ETAPA (de 3 especies)"]
    n_esp = len(especies)
    feitas_total = 0
    for etapa in ETAPAS:
        prontas, andando, faltando = [], [], []
        for esp in especies:
            celula = sts[esp][etapa]
            f = _frac(celula)
            if f >= 1.0:
                prontas.append(esp)
            elif f > 0.0:
                # ERA5 tem contador em dias; predicao, em faixas — pega o que houver
                extra = celula.strip()
                if etapa == "cap.daily":
                    feito, total = progresso_era5(esp, subdir)
                    if total:
                        faltam = total - feito
                        extra = (f"{min(99, int(100 * feito / total))}% "
                                 f"({feito}/{total} dias, faltam {faltam})")
                andando.append(f"{_abrev(esp)} {extra}")
            else:
                faltando.append(_abrev(esp))
        feitas_total += len(prontas)
        nota = ""
        if andando:
            nota = "rodando: " + ", ".join(andando)
            if faltando:
                nota += "  |  falta: " + ", ".join(faltando)
        elif faltando:
            nota = "falta: " + ", ".join(faltando)
        else:
            nota = "concluida"
        linhas.append(f"  {etapa.ljust(11)} {len(prontas)}/{n_esp}   {nota}")
    alvo = len(ETAPAS) * n_esp
    linhas.append("  " + "-" * 58)
    linhas.append(f"  {'TOTAL'.ljust(11)} {feitas_total}/{alvo} tarefas concluidas "
                  f"({round(100 * feitas_total / max(1, alvo))}%)")
    return linhas


def _barra(frac: float, largura: int = 30) -> str:
    cheio = int(round(frac * largura))
    return "[" + "#" * cheio + "-" * (largura - cheio) + f"] {frac*100:5.1f}%"


def render(especies: list[str], subdir: str = "") -> str:
    larg_esp = max(18, max(len(e) for e in especies) + 1)
    larg_col = 11
    linhas = []
    # A HORA no cabecalho nao e' enfeite: sem ela nao da' para saber se o que esta' na
    # tela e' de agora ou um quadro velho (janela antiga aberta, terminal sem suporte ao
    # codigo de limpar tela, scrollback). Ja custou uma hora de confusao em 2026-07-20,
    # com o usuario lendo numeros de 2 h antes e concluindo que o pipeline tinha parado.
    linhas.append(f"Atualizado: {time.strftime('%H:%M:%S')}   |   "
                  f"Rodada: {subdir or '(pasta inteira)'}   |   "
                  f"SDM rodando? {_sdm_rodando()}")
    linhas.append("")
    cab = "ESPECIE".ljust(larg_esp) + "".join(e.center(larg_col) for e in ETAPAS)
    linhas.append(cab)
    linhas.append("-" * len(cab))
    fracs_por_esp = {}
    sts = {}
    total_frac = 0.0
    for esp in especies:
        st = sts[esp] = status_especie(esp, subdir)
        linha = esp.ljust(larg_esp) + "".join(st[e].center(larg_col) for e in ETAPAS)
        linhas.append(linha)
        f = sum(_frac(st[e]) for e in ETAPAS) / len(ETAPAS)
        fracs_por_esp[esp] = f
        total_frac += f
    geral = total_frac / max(1, len(especies))
    linhas.append("")
    linhas.append("PROGRESSO GERAL DO PROJETO")
    linhas.append("  " + _barra(geral, 40))
    linhas.append("")
    linhas.append("Por especie:")
    for esp in especies:
        linhas.append(f"  {esp.ljust(larg_esp)} {_barra(fracs_por_esp[esp], 28)}")
    linhas.append("")
    linhas.extend(_resumo_etapas(especies, sts, subdir))

    # Detalhe da etapa que esta rodando agora (so' de quem ainda nao terminou o daily).
    detalhes = []
    for esp in especies:
        if sts[esp]["cap.daily"].startswith(OK):   # ja' terminou: nao e' "em andamento"
            continue
        feito, total = progresso_era5(esp, subdir)
        if total and feito < total:
            detalhes.append(_detalhe_era5(esp, feito, total))
    if detalhes:
        linhas.append("")
        linhas.append("EM ANDAMENTO (captura daily — download ERA5, 1 arquivo por dia):")
        linhas.extend(detalhes)
        bat = _batimento_era5()
        if bat:
            linhas.append(bat)
    linhas.append("")
    linhas.append("Etapas por especie: occ, pseudo, cap.daily, cap.clima, RF daily, RF clima, "
                  "pred.daily, pred.clima (8 etapas).")
    linhas.append("Legenda: 'OK Np'=presencas | 'OK a:b'=pres:pseudo | '--'=pendente | "
                  "'42% pred'=predicao em andamento")
    return "\n".join(linhas)


def _habilitar_ansi() -> bool:
    """Liga o processamento de sequencias ANSI no console do Windows (ENABLE_VIRTUAL_
    TERMINAL_PROCESSING). True se der para usar '\\033[2J' para limpar a tela.

    Sem isso, em console antigo o codigo de limpar tela vira lixo na tela e cada
    atualizacao EMPILHA um quadro novo — o painel parece congelado no primeiro."""
    if os.name != "nt":
        return sys.stdout.isatty()
    if not sys.stdout.isatty():
        return False                      # saida redirecionada (arquivo/pipe)
    try:
        import ctypes
        k = ctypes.windll.kernel32
        h = k.GetStdHandle(-11)           # STD_OUTPUT_HANDLE
        modo = ctypes.c_uint32()
        if not k.GetConsoleMode(h, ctypes.byref(modo)):
            return False
        return bool(k.SetConsoleMode(h, modo.value | 0x0004))
    except Exception:  # noqa: BLE001
        return False


def main() -> None:
    p = argparse.ArgumentParser(description="Painel geral de progresso (3 especies x etapas).")
    p.add_argument("--especies", default=",".join(ESPECIES_PADRAO),
                   help="Lista separada por virgula. Padrao: as 3 do projeto.")
    p.add_argument("--loop", type=float, default=0.0,
                   help="Se >0, atualiza a cada N segundos (Ctrl+C sai). Padrao: snapshot unico.")
    p.add_argument("--subdir", default="",
                   help="Escopo: subpasta datada da rodada (ex.: '2026-07-17'). "
                        "Vazio = detecta AUTOMATICAMENTE a rodada mais recente.")
    a = p.parse_args()
    especies = [e.strip() for e in a.especies.split(",") if e.strip()]
    # Sem --subdir: detecta sozinho a rodada (pasta datada) mais recente.
    if not a.subdir:
        a.subdir = _latest_subdir(especies)

    if a.loop <= 0:
        print(render(especies, a.subdir))
        return
    limpa = _habilitar_ansi()
    try:
        while True:
            if limpa:
                print("\033[2J\033[H", end="")   # limpa tela
            else:
                # Console SEM suporte a ANSI: o codigo de limpar sai como lixo e os
                # quadros EMPILHAM. Sem uma separacao clara, o usuario le o quadro do
                # TOPO — o primeiro, de horas atras — e conclui que o painel travou
                # (aconteceu em 2026-07-20). Separador grosso: o mais novo e' o de baixo.
                print("\n" * 2 + "=" * 78)
                print("QUADRO NOVO ABAIXO (o console nao aceita limpar tela; role ate' o FIM)")
                print("=" * 78)
            print(f"PAINEL SDM - atualiza a cada {a.loop:g}s (Ctrl+C sai)\n")
            print(render(especies, a.subdir), flush=True)
            time.sleep(a.loop)
    except KeyboardInterrupt:
        print("\n[painel] encerrado.")


if __name__ == "__main__":
    main()
