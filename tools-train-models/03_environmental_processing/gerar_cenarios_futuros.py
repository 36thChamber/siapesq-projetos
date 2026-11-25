#!/usr/bin/env python3
# gerar_cenarios_futuros.py — Camadas de clima FUTURO (2050 e 2100) para a predição.
#
# Cobre 4 dos 17 cenários do projeto: 2050 e 2100 × SSP2-4.5 e SSP5-8.5.
#
# MÉTODO: DELTA (anomalia), não valor absoluto do modelo global. Os modelos CMIP6 são
# grosseiros (~100-250 km) e têm viés sistemático — usar o valor bruto deles quebraria a
# escala em que o modelo de espécie foi treinado. Em vez disso, extraímos só a MUDANÇA
# entre a janela futura e a linha de base, e aplicamos sobre o ERA5 de hoje:
#
#   t2m_fut = t2m_ERA5 + (tas_fut     − tas_base)        diferença (Kelvin)
#   tp_fut  = tp_ERA5  × (pr_fut      / pr_base)         razão (adimensional)
#   e_fut   = e_ERA5   × (evspsbl_fut / evspsbl_base)    razão (adimensional)
#
# Assim o resultado fica em Kelvin e m/dia (idêntico ao treino), herda o detalhe de 11 km
# do ERA5, e o viés do modelo global se cancela na subtração/divisão.
#
# SINAL DE `e`: o ERA5 usa NEGATIVO para evaporação (água saindo da superfície); o CMIP6
# usa `evspsbl` POSITIVO (fluxo para cima). A razão entre dois positivos é positiva, então
# multiplicar o `e` negativo do ERA5 preserva o sinal e escala a magnitude. Correto.
#
# LINHA DE BASE = 2015-2024 DO PRÓPRIO CENÁRIO SSP (as simulações SSP começam em 2015),
# não o experimento `historical` (que termina em 2014). Assim a janela bate exatamente com
# a do ERA5 e não sobra aquecimento sem contabilizar.
#
# 5 MODELOS, MEDIANA: um modelo sozinho carrega as próprias manias (na Amazônia a chuva
# projetada varia de −30% a +10% conforme o modelo). A mediana dos 5 descarta os extremos;
# a dispersão entre eles vira um mapa de concordância.
#
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe 03_environmental_processing/gerar_cenarios_futuros.py --etapa probe
#   .venv/Scripts/python.exe 03_environmental_processing/gerar_cenarios_futuros.py --etapa baixar
#   .venv/Scripts/python.exe 03_environmental_processing/gerar_cenarios_futuros.py --etapa delta

from __future__ import annotations

import argparse
import os
import sys
import time
import zipfile
from pathlib import Path

import numpy as np
import rasterio
import xarray as xr

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_cache_brasil as gcb  # noqa: E402  (credenciais CDS + bbox + escrita de tif)

BRASIL = gcb.BRASIL                       # (-74, -34, -34, 6)

# --- CMIP6: modelo -> nome no CDS. 5 centros independentes (AU, EU, DE, JP, US). ---
MODELOS = {
    "ACCESS-CM2": "access_cm2",
    "EC-Earth3-Veg": "ec_earth3_veg",
    "MPI-ESM1-2-HR": "mpi_esm1_2_hr",
    "MRI-ESM2-0": "mri_esm2_0",
    "GFDL-ESM4": "gfdl_esm4",
}
# variável do treino -> (nome no CDS, nome da variável dentro do NetCDF)
VARIAVEIS = {
    "t2m": ("near_surface_air_temperature", "tas"),
    "tp": ("precipitation", "pr"),
    "e": ("evaporation_including_sublimation_and_transpiration", "evspsbl"),
}
EXPERIMENTOS = {"ssp245": "ssp2_4_5", "ssp585": "ssp5_8_5"}
# janela -> (ano inicial, ano final). A base sai do MESMO arquivo do cenário.
JANELAS = {"base": (2015, 2024), "2050": (2041, 2060), "2100": (2081, 2100)}

# Razões (tp, e) são instáveis onde a base é quase zero: 0.1 mm/dia virando 0.3 daria ×3.
# Travamos num intervalo fisicamente defensável e registramos quantas células bateram nele.
RAZAO_MIN, RAZAO_MAX = 0.5, 2.0

CACHE = ROOT / "env_data" / "cmip6_cache"
SAIDA = ROOT / "env_data" / "raster_cache" / "futuro"


def _p(m: str = "") -> None:
    print(m, flush=True)


# ---------------------------------------------------------------------------
# (1) DOWNLOAD do CDS
# ---------------------------------------------------------------------------
def _cliente_cds(idx: int = 0, permitidas: list[int] | None = None):
    """Cliente CDS. Rotaciona entre as contas do `.env` (o CDS limita por conta E por IP —
    ver a experiência do ERA5), caindo no ~/.cdsapirc se não houver nenhuma.
    `permitidas`: índices 0-based das contas com a licença do CMIP6 aceita."""
    import cdsapi
    creds = gcb._cds_credenciais()
    if permitidas:
        creds = [creds[i] for i in permitidas]
    if creds:
        url, key = creds[idx % len(creds)]
        return cdsapi.Client(url=url, key=key, quiet=True, progress=False)
    return cdsapi.Client(quiet=True, progress=False)


# O CMIP6 no CDS exige uma licença PRÓPRIA (`cmip6-wps`), diferente da `cc-by` do ERA5.
# Sem ela o CDS devolve um 403 genérico ("required licences not accepted") em CADA pedido —
# 30 falhas crípticas. Conferimos ANTES de baixar e dizemos exatamente o que falta.
LICENCA_CMIP6 = "cmip6-wps"
URL_ACEITE = "https://cds.climate.copernicus.eu/datasets/projections-cmip6?tab=download"


def checar_licencas() -> tuple[list[int], list[int]]:
    """Verifica em QUAIS contas do `.env` a licença do CMIP6 já foi aceita.
    Devolve (índices 0-based das contas LIBERADAS, índices 1-based das PENDENTES).
    Só as liberadas entram na rotação de download — misturar contas sem licença
    devolveria 403 aleatórios que pareceriam falha de rede."""
    import json as _json
    import urllib.request as _ur
    creds = gcb._cds_credenciais()
    if not creds:
        _p("[cmip6] sem CDSAPI_* no .env — usando ~/.cdsapirc sem conferir a licença.")
        return ([], [])
    ok, faltando = [], []
    for i, (url, key) in enumerate(creds):
        base = url.rstrip("/")
        try:
            req = _ur.Request(base + "/profiles/v1/account/licences",
                              headers={"PRIVATE-TOKEN": key, "Accept": "application/json"})
            with _ur.urlopen(req, timeout=60) as h:
                aceitas = {l.get("id") for l in _json.load(h).get("licences", [])}
        except Exception as ex:  # noqa: BLE001 — conta inacessível conta como pendente
            _p(f"[cmip6] conta {i + 1}: não deu para conferir ({type(ex).__name__}) — tratando como pendente.")
            faltando.append(i + 1)
            continue
        if LICENCA_CMIP6 in aceitas:
            _p(f"[cmip6] conta {i + 1}: licença '{LICENCA_CMIP6}' OK.")
            ok.append(i)
        else:
            _p(f"[cmip6] conta {i + 1}: FALTA aceitar a licença '{LICENCA_CMIP6}'.")
            faltando.append(i + 1)
    return (ok, faltando)


def _anos_pedido() -> list[str]:
    """Todos os anos necessários (base + 2050 + 2100), num pedido só por arquivo."""
    anos: list[int] = []
    for y0, y1 in JANELAS.values():
        anos += list(range(y0, y1 + 1))
    return [str(a) for a in sorted(set(anos))]


def _baixar_um(tarefa: tuple, bbox, anos, meses, retries: int,
               permitidas: list[int] | None, slot: int) -> tuple | None:
    """Baixa UMA combinação (modelo, experimento, variável). Devolve a tarefa se falhou,
    None se deu certo. `slot` fixa a conta CDS deste trabalhador."""
    (mod_nome, mod_cds), (exp_nome, exp_cds), (var_col, var_cds) = tarefa
    w, s, e, n = bbox
    alvo = CACHE / f"{mod_nome}_{exp_nome}_{var_col}.zip"
    if alvo.exists():
        _p(f"[cmip6] {alvo.name}: já em cache.")
        return None
    req = {
        "temporal_resolution": "monthly", "experiment": exp_cds, "variable": var_cds,
        "model": mod_cds, "year": anos, "month": meses,
        "area": [n, w, s, e],                      # CDS: [Norte, Oeste, Sul, Leste]
    }
    # .part POR ALVO E POR SLOT: dois downloads simultâneos não podem disputar o mesmo
    # arquivo temporário — um sobrescreveria o outro pela metade.
    parcial = CACHE / f".{alvo.stem}.s{slot}.part"
    for tent in range(retries):
        try:
            _p(f"[cmip6] baixando {mod_nome} {exp_nome} {var_col} (conta {slot + 1})...")
            _cliente_cds(slot, permitidas).retrieve("projections-cmip6", req, str(parcial))
            os.replace(parcial, alvo)
            _p(f"[cmip6] [OK] {alvo.name} ({alvo.stat().st_size / 1e6:.1f} MB)")
            return None
        except Exception as ex:  # noqa: BLE001 — fila/rede do CDS falha muito
            _p(f"[cmip6]   ! {mod_nome} {exp_nome} {var_col} tentativa {tent + 1}/{retries}: "
               f"{type(ex).__name__}: {str(ex)[:180]}")
            if parcial.exists():
                try: parcial.unlink()
                except OSError: pass
            time.sleep(min(60, 10 * (tent + 1)))
    return (mod_nome, exp_nome, var_col)


def baixar(modelos: dict, experimentos: dict, variaveis: dict, bbox,
           retries: int = 3, apenas_probe: bool = False,
           permitidas: list[int] | None = None, workers: int = 2) -> list[tuple]:
    """Baixa (modelo × experimento × variável). Um arquivo cobre as TRÊS janelas, então
    são 5×2×3 = 30 pedidos, não 90. Resumível: pula o que já está no disco.

    PARALELO por CONTA: o CDS enfileira por conta, então N contas licenciadas rodam N
    pedidos ao mesmo tempo. Sequencial daria ~15 h; com 2 contas, ~7 h. Não adianta pôr
    mais trabalhadores que contas — a fila é da conta, não da conexão.

    `apenas_probe`: pede UM mês só, para descobrir cedo quais combinações não existem no
    CDS (nem todo modelo publica `evspsbl` mensal) — antes de investir horas de fila."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    CACHE.mkdir(parents=True, exist_ok=True)
    anos = ["2050"] if apenas_probe else _anos_pedido()
    meses = ["01"] if apenas_probe else [f"{m:02d}" for m in range(1, 13)]

    tarefas = [((mn, mc), (en, ec), (vc, vcds))
               for mn, mc in modelos.items()
               for en, ec in experimentos.items()
               for vc, (vcds, _vnc) in variaveis.items()]
    n_contas = len(permitidas) if permitidas else 1
    workers = max(1, min(workers, n_contas, len(tarefas)))
    _p(f"[cmip6] {len(tarefas)} pedido(s) | {workers} em paralelo "
       f"({n_contas} conta(s) licenciada(s))")

    falhas: list[tuple] = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(_baixar_um, t, bbox, anos, meses, retries, permitidas, i % workers): t
                for i, t in enumerate(tarefas)}
        feitos = 0
        for fut in as_completed(futs):
            feitos += 1
            r = fut.result()
            if r is not None:
                falhas.append(r)
            _p(f"[cmip6] progresso {feitos}/{len(tarefas)} ({len(falhas)} falhas)")
    if falhas:
        _p("")
        _p(f"[cmip6] {len(falhas)} combinação(ões) FALHARAM:")
        for f in falhas:
            _p(f"[cmip6]   x {f[0]} {f[1]} {f[2]}")
        _p("[cmip6] rode de novo: o que já baixou é pulado (resumível).")
    return falhas


# ---------------------------------------------------------------------------
# (1b) PANGEO/Zarr — a MESMA base CMIP6, sem fila e sem login (FONTE PADRÃO)
#
# O CDS entrega o CMIP6, mas por FILA: medido, ~3 h por pedido, e são 30 — inviável.
# O mesmo arquivamento CMIP6 está publicado em Zarr na nuvem (projeto Pangeo, bucket
# público do Google), legível direto por HTTPS: medido, ~17 s por combinação, ~10 min
# no total. Mesmos dados, mesma proveniência — muda só o transporte.
#
# Gravamos um NetCDF pequeno por (modelo, cenário, variável), já recortado ao Brasil
# (~3 MB), no MESMO cache do CDS. O passo `delta` lê os dois formatos.
# ---------------------------------------------------------------------------
CATALOGO_PANGEO = "https://storage.googleapis.com/cmip6/pangeo-cmip6.csv"
GCS_HTTPS = "https://storage.googleapis.com/"


def _catalogo(cache_csv: Path):
    """Catálogo Pangeo (514 mil linhas). Baixa uma vez e reusa do disco."""
    import pandas as pd
    if not cache_csv.exists():
        _p(f"[pangeo] baixando o catálogo ({CATALOGO_PANGEO})...")
        cache_csv.parent.mkdir(parents=True, exist_ok=True)
        pd.read_csv(CATALOGO_PANGEO).to_csv(cache_csv, index=False)
    return pd.read_csv(cache_csv)


def baixar_pangeo(modelos: dict, experimentos: dict, variaveis: dict, bbox) -> list[tuple]:
    """Lê o CMIP6 do Zarr público e grava um NetCDF por (modelo, cenário, variável),
    recortado ao Brasil. Resumível: pula o que já está no disco."""
    import fsspec
    import pandas as pd

    CACHE.mkdir(parents=True, exist_ok=True)
    cat = _catalogo(CACHE / "pangeo-cmip6.csv")
    w, s, e, n = bbox
    falhas: list[tuple] = []
    tarefas = [(mn, en, vc, vnc)
               for mn in modelos for en in experimentos
               for vc, (_vcds, vnc) in variaveis.items()]
    _p(f"[pangeo] {len(tarefas)} combinação(ões) a montar")

    for i, (mod, exp, var_col, var_nc) in enumerate(tarefas, start=1):
        alvo = CACHE / f"{mod}_{exp}_{var_col}.nc"
        if alvo.exists() or (CACHE / f"{mod}_{exp}_{var_col}.zip").exists():
            _p(f"[pangeo] ({i}/{len(tarefas)}) {alvo.stem}: já em cache.")
            continue
        linhas = cat[(cat.source_id == mod) & (cat.experiment_id == exp)
                     & (cat.variable_id == var_nc) & (cat.table_id == "Amon")]
        if linhas.empty:
            _p(f"[pangeo] ({i}/{len(tarefas)}) {mod} {exp} {var_col}: NÃO existe no catálogo.")
            falhas.append((mod, exp, var_col))
            continue
        # membro preferencial r1i1p1f1 (o mais publicado); senão, o primeiro disponível
        pref = linhas[linhas.member_id == "r1i1p1f1"]
        linha = (pref if not pref.empty else linhas).sort_values("zstore").iloc[0]
        url = str(linha.zstore).replace("gs://", GCS_HTTPS)
        try:
            ds = xr.open_zarr(fsspec.get_mapper(url), consolidated=True)
            da = ds[var_nc]
            # o CMIP6 usa longitude 0..360; o nosso bbox é -180..180
            lon0, lon1 = (w % 360), (e % 360)
            sub = da.sel(lat=slice(s, n), lon=slice(lon0, lon1))
            if sub.sizes.get("lon", 0) == 0 or sub.sizes.get("lat", 0) == 0:
                raise ValueError(f"recorte vazio (lat {s}..{n}, lon {lon0}..{lon1})")
            sub = sub.compute()
            # normaliza a longitude para -180..180 ANTES de gravar, para o passo delta
            # não precisar saber de que fonte veio o arquivo.
            sub = sub.assign_coords(lon=(((sub["lon"] + 180) % 360) - 180)).sortby("lon")
            sub.to_dataset(name=var_nc).to_netcdf(alvo)
            _p(f"[pangeo] ({i}/{len(tarefas)}) [OK] {alvo.name} | "
               f"{dict(sub.sizes)} | {linha.member_id} | {alvo.stat().st_size / 1e6:.1f} MB")
        except Exception as ex:  # noqa: BLE001 — um modelo ruim não derruba os outros
            _p(f"[pangeo] ({i}/{len(tarefas)}) FALHOU {mod} {exp} {var_col}: "
               f"{type(ex).__name__}: {str(ex)[:160]}")
            if alvo.exists():
                try: alvo.unlink()
                except OSError: pass
            falhas.append((mod, exp, var_col))
    if falhas:
        _p("")
        _p(f"[pangeo] {len(falhas)} combinação(ões) FALHARAM:")
        for f in falhas:
            _p(f"[pangeo]   x {f[0]} {f[1]} {f[2]}")
    return falhas


# ---------------------------------------------------------------------------
# (2) DELTA e aplicação sobre o ERA5
# ---------------------------------------------------------------------------
def _abrir_cmip6(caminho: Path, var_nc: str) -> xr.DataArray:
    """Abre a série temporal do CMIP6 e devolve o DataArray da variável, com coords
    padronizadas em lat/lon e a longitude em [-180,180].

    Aceita as DUAS fontes: `.nc` (Pangeo, já recortado ao Brasil) e `.zip` (CDS, que
    empacota um ou mais NetCDF). O passo delta não precisa saber de onde veio."""
    if caminho.suffix == ".nc":
        ds = xr.open_dataset(caminho)
    else:
        destino = caminho.with_suffix("")
        if not destino.exists():
            destino.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(caminho) as z:
                z.extractall(destino)
        ncs = sorted(destino.rglob("*.nc"))
        if not ncs:
            raise FileNotFoundError(f"Sem .nc dentro de {caminho}")
        ds = (xr.open_mfdataset(ncs, combine="by_coords") if len(ncs) > 1
              else xr.open_dataset(ncs[0]))
    if var_nc not in ds.data_vars:
        raise KeyError(f"'{var_nc}' não está em {zip_path.name}: {list(ds.data_vars)}")
    da = ds[var_nc]
    ren = {}
    for c in list(da.coords):
        cl = str(c).lower()
        if cl in ("longitude", "lon", "x"):
            ren[c] = "lon"
        elif cl in ("latitude", "lat", "y"):
            ren[c] = "lat"
    da = da.rename(ren)
    if float(da["lon"].max()) > 180.0:          # grade 0..360 -> -180..180
        da = da.assign_coords(lon=(((da["lon"] + 180) % 360) - 180)).sortby("lon")
    return da.sortby("lat")


def _media_janela(da: xr.DataArray, y0: int, y1: int) -> xr.DataArray:
    """Média climatológica da janela [y0, y1] (todos os meses, cada um pesando igual)."""
    sel = da.sel(time=slice(f"{y0}-01-01", f"{y1}-12-31"))
    if sel.sizes.get("time", 0) == 0:
        raise ValueError(f"janela {y0}-{y1} vazia neste arquivo")
    return sel.mean("time", skipna=True)


def _grade_era5(var: str) -> tuple[xr.DataArray, dict]:
    """Lê o raster ERA5 anual (0.1°) como DataArray lat/lon + o profile do rasterio.
    É a grade-alvo: o delta é interpolado para ela e aplicado célula a célula."""
    src = ROOT / "env_data" / "predicao_7var_brasil_1km" / f"{var}.tif"
    if not src.exists():
        raise SystemExit(f"[futuro] raster ERA5 de base não encontrado: {src}")
    with rasterio.open(src) as r:
        arr = r.read(1).astype("float64")
        prof = r.profile.copy()
        t = r.transform
        lons = t.c + t.a * (np.arange(r.width) + 0.5)
        lats = t.f + t.e * (np.arange(r.height) + 0.5)
    da = xr.DataArray(arr, dims=("lat", "lon"), coords={"lat": lats, "lon": lons})
    return da, prof


def calcular_delta(modelos: dict, experimentos: dict, variaveis: dict,
                   out_dir: Path) -> None:
    """Para cada (experimento × janela futura × variável): calcula o delta de CADA modelo,
    interpola para a grade do ERA5, tira a MEDIANA entre modelos, aplica sobre o ERA5 e
    grava o raster. Grava também a dispersão entre modelos (mapa de concordância)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    janelas_fut = {k: v for k, v in JANELAS.items() if k != "base"}
    yb0, yb1 = JANELAS["base"]

    for exp_nome in experimentos:
        for jan_nome, (yf0, yf1) in janelas_fut.items():
            for var_col, (_var_cds, var_nc) in variaveis.items():
                base_era5, prof = _grade_era5(var_col)
                deltas = []
                usados = []
                for mod_nome in modelos:
                    # Pangeo (.nc) tem preferência sobre CDS (.zip): mesmos dados, menor.
                    cands = [CACHE / f"{mod_nome}_{exp_nome}_{var_col}.nc",
                             CACHE / f"{mod_nome}_{exp_nome}_{var_col}.zip"]
                    z = next((c for c in cands if c.exists()), None)
                    if z is None:
                        _p(f"[futuro] {mod_nome} {exp_nome} {var_col}: SEM arquivo — fora da mediana.")
                        continue
                    try:
                        da = _abrir_cmip6(z, var_nc)
                        m_base = _media_janela(da, yb0, yb1)
                        m_fut = _media_janela(da, yf0, yf1)
                    except Exception as ex:  # noqa: BLE001 — um modelo ruim não derruba os outros
                        _p(f"[futuro] {mod_nome} {exp_nome} {var_col}: ILEGÍVEL "
                           f"({type(ex).__name__}: {str(ex)[:120]}) — fora da mediana.")
                        continue
                    if var_col == "t2m":
                        d = m_fut - m_base                       # diferença (K)
                    else:
                        d = m_fut / m_base.where(m_base != 0)     # razão
                    # interpola o delta (campo suave) para a grade do ERA5
                    d_i = d.interp(lat=base_era5["lat"], lon=base_era5["lon"],
                                   method="linear")
                    deltas.append(d_i.values.astype("float64"))
                    usados.append(mod_nome)

                if not deltas:
                    _p(f"[futuro] {exp_nome} {jan_nome} {var_col}: NENHUM modelo disponível — pulando.")
                    continue

                pilha = np.stack(deltas)
                delta_med = np.nanmedian(pilha, axis=0)
                disp = np.nanstd(pilha, axis=0)

                if var_col == "t2m":
                    fut = base_era5.values + delta_med
                    resumo = (f"delta mediano {np.nanmin(delta_med):+.2f} a "
                              f"{np.nanmax(delta_med):+.2f} K "
                              f"(médio {np.nanmean(delta_med):+.2f})")
                else:
                    travadas = int(np.nansum((delta_med < RAZAO_MIN) | (delta_med > RAZAO_MAX)))
                    delta_med = np.clip(delta_med, RAZAO_MIN, RAZAO_MAX)
                    fut = base_era5.values * delta_med
                    resumo = (f"razão mediana {np.nanmin(delta_med):.2f} a "
                              f"{np.nanmax(delta_med):.2f} "
                              f"(média {np.nanmean(delta_med):.2f}; "
                              f"{travadas} células travadas no limite)")

                prof.update(dtype="float32", nodata=np.nan, compress="lzw")
                alvo = out_dir / f"{var_col}_{jan_nome}_{exp_nome}.tif"
                with rasterio.open(alvo, "w", **prof) as dst:
                    dst.write(fut.astype("float32"), 1)
                alvo_d = out_dir / f"dispersao_{var_col}_{jan_nome}_{exp_nome}.tif"
                with rasterio.open(alvo_d, "w", **prof) as dst:
                    dst.write(disp.astype("float32"), 1)
                _p(f"[futuro] {alvo.name}: {len(usados)} modelo(s) {usados} | {resumo}")
    _p(f"[futuro] pronto: {out_dir}")


# ---------------------------------------------------------------------------
def main() -> None:
    p = argparse.ArgumentParser(description="Camadas de clima FUTURO (CMIP6, método delta).")
    p.add_argument("--etapa", choices=["probe", "baixar", "delta"], required=True,
                   help="probe: testa 1 mês por combinação (descobre o que não existe). "
                        "baixar: baixa tudo. delta: calcula e aplica sobre o ERA5.")
    p.add_argument("--fonte", choices=["pangeo", "cds"], default="pangeo",
                   help="De onde ler o CMIP6. pangeo (PADRÃO): Zarr público, sem fila nem "
                        "login (~17 s por combinação). cds: Copernicus, exige a licença "
                        "'cmip6-wps' e enfileira (~3 h por pedido, medido). Mesmos dados.")
    p.add_argument("--modelos", default="", help="Subconjunto de modelos (vírgula). Vazio = os 5.")
    p.add_argument("--experimentos", default="", help="ssp245,ssp585. Vazio = os 2.")
    p.add_argument("--variaveis", default="", help="t2m,tp,e. Vazio = as 3.")
    p.add_argument("--bbox", type=float, nargs=4, default=list(BRASIL),
                   metavar=("W", "S", "E", "N"))
    p.add_argument("--out", default=str(SAIDA))
    p.add_argument("--workers", type=int, default=2,
                   help="Pedidos simultâneos ao CDS (1 por conta licenciada). Padrão: 2.")
    a = p.parse_args()

    mods = ({k: v for k, v in MODELOS.items() if k in a.modelos.split(",")}
            if a.modelos else MODELOS)
    exps = ({k: v for k, v in EXPERIMENTOS.items() if k in a.experimentos.split(",")}
            if a.experimentos else EXPERIMENTOS)
    vars_ = ({k: v for k, v in VARIAVEIS.items() if k in a.variaveis.split(",")}
             if a.variaveis else VARIAVEIS)

    _p(f"[futuro] etapa={a.etapa} | {len(mods)} modelo(s) × {len(exps)} cenário(s) "
       f"× {len(vars_)} variável(is) = {len(mods) * len(exps) * len(vars_)} combinações")

    if a.etapa in ("probe", "baixar") and a.fonte == "pangeo":
        if a.etapa == "probe":
            _p("[pangeo] a fonte pangeo não precisa de probe (o catálogo já diz o que existe); "
               "rode --etapa baixar direto.")
            return
        falhas = baixar_pangeo(mods, exps, vars_, tuple(a.bbox))
        _p("")
        _p(f"[pangeo] concluído: {len(falhas)} falha(s). Próximo passo: --etapa delta")
    elif a.etapa in ("probe", "baixar"):
        liberadas, pendentes = checar_licencas()
        if pendentes and not liberadas:
            raise SystemExit(
                f"\n[cmip6] BLOQUEADO: NENHUMA conta do .env aceitou a licença "
                f"'{LICENCA_CMIP6}'.\n"
                f"  Aceite (leva ~30 s, uma vez por conta) em:\n    {URL_ACEITE}\n"
                f"  Entre na conta, role até 'Terms of use' e clique em aceitar.\n"
                f"  Depois rode este comando de novo.")
        if pendentes:
            _p(f"[cmip6] usando as {len(liberadas)} conta(s) licenciada(s); as contas "
               f"{pendentes} ficam de fora até aceitarem '{LICENCA_CMIP6}' em {URL_ACEITE} "
               f"(aceitar em mais contas acelera a fila).")
        falhas = baixar(mods, exps, vars_, tuple(a.bbox),
                        apenas_probe=(a.etapa == "probe"), permitidas=liberadas,
                        workers=a.workers)
        if a.etapa == "probe":
            _p("")
            _p(f"[cmip6] PROBE concluído: {len(falhas)} combinação(ões) indisponíveis. "
               f"Ajuste --modelos antes de rodar --etapa baixar.")
    else:
        calcular_delta(mods, exps, vars_, Path(a.out))


if __name__ == "__main__":
    main()
