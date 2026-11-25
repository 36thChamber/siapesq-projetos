#!/usr/bin/env python3
# gerar_cenarios_mensais.py — Gera as camadas MENSAIS (12 meses) para a predição.
#
# Dos 17 cenários de predição do projeto (1 anual + 12 mensais + 4 futuros), este script
# cobre os 12 MENSAIS. Produz, para cada mês, a média climatológica de 2015-2024:
#   - t2m, e, tp  (ERA5-Land, 0.1°)  — os gribs MENSAIS JÁ ESTÃO no cache do
#                                       `gerar_cache_brasil.py`; aqui é só reagrupar.
#   - ndvi        (MODIS MOD13A1, 0.01°) — UMA varredura das composições, distribuída
#                                       em 12 acumuladores (ler 12 vezes seria 12× o custo).
#
# DIFERENÇA vs `gerar_cache_brasil.py`: lá a média é sobre TODOS os meses (1 raster por
# variável, o cenário anual); aqui a média é POR MÊS (12 rasters por variável). O miolo
# (assinatura MPC, leitura de composição, escrita do GeoTIFF) é IMPORTADO de lá — não
# duplicado.
#
# Saída: env_data/raster_cache/mensal/<var>_<MM>.tif
# A montagem das pastas por cenário é do `montar_predict_variables.py`.
#
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe 03_environmental_processing/gerar_cenarios_mensais.py --layers era5
#   .venv/Scripts/python.exe 03_environmental_processing/gerar_cenarios_mensais.py --layers ndvi

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.vrt")
os.environ.setdefault("GDAL_HTTP_TIMEOUT", "120")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "10")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "1")

import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

import gerar_cache_brasil as gcb  # noqa: E402  (miolo compartilhado)

BRASIL = gcb.BRASIL                       # (-74, -34, -34, 6)
ERA5_SHORTS = ("t2m", "e", "tp")
MESES = list(range(1, 13))
NOMES_MES = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
             "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]


def _p(m: str = "") -> None:
    print(m, flush=True)


# ---------------------------------------------------------------------------
# ERA5 mensal — reagrupa os gribs JÁ BAIXADOS por mês
# ---------------------------------------------------------------------------
def gerar_era5_mensal(cache_gribs: Path, out_dir: Path, meses: list[int]) -> None:
    """Média climatológica POR MÊS de t2m/e/tp a partir dos gribs mensais em cache.

    Acumula soma e CONTAGEM de meses válidos por célula, igual ao caminho anual: o
    ERA5-Land é só terra, e um `sum(skipna=True)` devolveria 0 (não NaN) no oceano — o
    t2m sairia com mar a 0 K. Ver o comentário longo em `gerar_cache_brasil.gerar_era5`."""
    import cfgrib

    gribs = sorted(cache_gribs.glob("era5_monthly_*.grib"))
    if not gribs:
        raise SystemExit(
            f"[era5-mensal] nenhum grib em {cache_gribs}.\n"
            f"  Gere o cenário anual primeiro (ele baixa os gribs):\n"
            f"  python 03_environmental_processing/gerar_cache_brasil.py --layers era5")
    _p(f"[era5-mensal] {len(gribs)} grib(s) em cache — nenhum download necessário.")

    # somas[(short, mes)] e conta[(short, mes)]: acumuladores por célula.
    somas: dict = {}
    conta: dict = {}
    for g in gribs:
        for ds in cfgrib.open_datasets(g, backend_kwargs={"indexpath": ""}):
            for short in ERA5_SHORTS:
                if short not in ds.data_vars:
                    continue
                da = ds[short]
                # colapsa dims que NÃO são tempo/espaço (number/step/expver etc.)
                extra = [d for d in da.dims if d not in ("time", "latitude", "longitude")]
                if extra:
                    da = da.mean(extra)
                if "time" not in da.dims:
                    continue
                # separa cada passo de tempo no BALDE do seu mês
                for i, t in enumerate(da["time"].values):
                    mes = int(str(t)[5:7])
                    if mes not in meses:
                        continue
                    campo = da.isel(time=i)
                    finito = campo.notnull()
                    s = campo.where(finito, 0.0).load()
                    c = finito.astype("int32").load()
                    k = (short, mes)
                    somas[k] = s if k not in somas else somas[k] + s
                    conta[k] = c if k not in conta else conta[k] + c
            ds.close()
        _p(f"[era5-mensal] {g.name} processado.")

    out_dir.mkdir(parents=True, exist_ok=True)
    for short in ERA5_SHORTS:
        for mes in meses:
            k = (short, mes)
            if k not in somas:
                _p(f"[era5-mensal] AVISO: {short} mês {mes:02d} ausente nos gribs — pulando.")
                continue
            c = conta[k]
            media = (somas[k] / c.where(c > 0)).where(c > 0)   # oceano (c==0) -> NaN
            gcb._write_da_tif(media, out_dir / f"{short}_{mes:02d}.tif", short)
    _p(f"[era5-mensal] pronto: {out_dir}")


# ---------------------------------------------------------------------------
# NDVI mensal — UMA varredura do MODIS, 12 acumuladores
# ---------------------------------------------------------------------------
def _ckpt_meta(bbox, res, anos, meses) -> dict:
    return {"bbox": [float(x) for x in bbox], "res": float(res),
            "anos": [min(anos), max(anos)], "meses": sorted(meses)}


def _ckpt_carregar(ckdir: Path, meta: dict, meses, shape):
    """Retoma (acc, cnt, done) do checkpoint. Se os parâmetros mudaram, ignora o
    checkpoint e recomeça — misturar grades diferentes corromperia a média."""
    import json as _json
    mp = ckdir / "meta.json"
    if not mp.exists():
        return None
    try:
        if _json.loads(mp.read_text(encoding="utf-8")) != meta:
            _p("[ndvi-mensal] checkpoint de outra configuração — recomeçando do zero.")
            return None
        done = set(_json.loads((ckdir / "done.json").read_text(encoding="utf-8")))
        acc = {m: np.load(ckdir / f"acc_{m:02d}.npy") for m in meses}
        cnt = {m: np.load(ckdir / f"cnt_{m:02d}.npy") for m in meses}
    except Exception as e:  # noqa: BLE001 — checkpoint corrompido não pode travar a rodada
        _p(f"[ndvi-mensal] checkpoint ilegível ({type(e).__name__}) — recomeçando do zero.")
        return None
    if any(acc[m].shape != shape for m in meses):
        _p("[ndvi-mensal] checkpoint com grade diferente — recomeçando do zero.")
        return None
    _p(f"[ndvi-mensal] retomando do checkpoint: {len(done)} composições já processadas.")
    return acc, cnt, done


def _ckpt_salvar(ckdir: Path, meta: dict, acc, cnt, done) -> None:
    """Grava o estado parcial. Escrita ATÔMICA (.tmp + replace): um kill no meio de um
    checkpoint não deixa um arquivo pela metade que a retomada leria como bom."""
    import json as _json
    ckdir.mkdir(parents=True, exist_ok=True)
    for m in acc:
        for nome, arr in ((f"acc_{m:02d}.npy", acc[m]), (f"cnt_{m:02d}.npy", cnt[m])):
            tmp = ckdir / (nome + ".tmp.npy")
            np.save(tmp, arr)
            os.replace(tmp, ckdir / nome)
    for nome, obj in (("done.json", sorted(done)), ("meta.json", meta)):
        tmp = ckdir / (nome + ".tmp")
        tmp.write_text(_json.dumps(obj), encoding="utf-8")
        os.replace(tmp, ckdir / nome)


def gerar_ndvi_mensal(bbox, out_dir: Path, anos: list[int], meses: list[int],
                      res: float = 0.01, workers: int = 10, ckpt_cada: int = 500) -> None:
    """Média climatológica POR MÊS do NDVI. Lê cada composição UMA vez e soma no balde do
    seu mês — 12 leituras separadas custariam 12× o mesmo download (o gargalo é a rede).

    RESUMÍVEL: são ~4.600 composições (horas de rede). O estado parcial é gravado a cada
    `ckpt_cada` composições, então uma queda não joga fora o que já foi lido."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    width, height, transform = gcb._grid(bbox, res)
    grid = (width, height, transform)
    _p(f"[ndvi-mensal] buscando composições MODIS {min(anos)}-{max(anos)} sobre o Brasil...")
    pares = gcb.buscar_ndvi_com_mes(bbox, anos, meses)
    if not pares:
        raise SystemExit("[ndvi-mensal] nenhuma composição encontrada no Planetary Computer.")
    por_mes: dict[int, int] = {}
    for mes, _h in pares:
        por_mes[mes] = por_mes.get(mes, 0) + 1
    _p(f"[ndvi-mensal] {len(pares)} composições | por mês: "
       + ", ".join(f"{m:02d}={por_mes.get(m, 0)}" for m in sorted(meses)))
    _p(f"[ndvi-mensal] grade {width}x{height} @ {res}° | {workers} em paralelo")

    # 12 pares de acumuladores (soma + contagem) na grade de saída.
    ckdir = out_dir / "_ckpt_ndvi_mensal"
    meta = _ckpt_meta(bbox, res, anos, meses)
    retomado = _ckpt_carregar(ckdir, meta, meses, (height, width))
    if retomado is not None:
        acc, cnt, done = retomado
    else:
        acc = {m: np.zeros((height, width), "float64") for m in meses}
        cnt = {m: np.zeros((height, width), "int32") for m in meses}
        done = set()

    pendentes = [(m, h) for m, h in pares if h not in done]
    _p(f"[ndvi-mensal] {len(pendentes)} composições pendentes nesta rodada.")

    falhas = feitos = 0
    lidos = len(done)
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(gcb._ndvi_ler_composicao, h, bbox, grid): (m, h)
                for m, h in pendentes}
        for fut in as_completed(futs):
            feitos += 1
            mes, href = futs[fut]
            try:
                res_t = fut.result()
            except Exception as exc:  # noqa: BLE001 — uma composição ruim não derruba tudo
                falhas += 1
                if falhas <= 10:
                    _p(f"[ndvi-mensal] falha em 1 composição ({type(exc).__name__}); seguindo.")
                res_t = None
            if res_t is not None:
                r0, c0, a = res_t
                ok = np.isfinite(a)
                acc[mes][r0:r0 + a.shape[0], c0:c0 + a.shape[1]][ok] += a[ok]
                cnt[mes][r0:r0 + a.shape[0], c0:c0 + a.shape[1]][ok] += 1
                lidos += 1
            done.add(href)
            if feitos % 200 == 0:
                _p(f"[ndvi-mensal] {feitos}/{len(pendentes)} desta rodada "
                   f"({lidos}/{len(pares)} no total, {falhas} falhas)...")
            if feitos % ckpt_cada == 0:
                _ckpt_salvar(ckdir, meta, acc, cnt, done)
                _p(f"[ndvi-mensal] checkpoint salvo ({len(done)} composições).")

    if lidos == 0:
        raise SystemExit("[ndvi-mensal] nenhuma composição lida — nada a gravar.")

    out_dir.mkdir(parents=True, exist_ok=True)
    profile = dict(driver="GTiff", dtype="float32", count=1, height=height, width=width,
                   crs="EPSG:4326", transform=transform, nodata=np.nan,
                   compress="lzw", tiled=True)
    for mes in sorted(meses):
        media = np.where(cnt[mes] > 0, acc[mes] / np.maximum(cnt[mes], 1),
                         np.nan).astype("float32")
        out = out_dir / f"ndvi_{mes:02d}.tif"
        with rasterio.open(out, "w", **profile) as dst:
            dst.write(media, 1)
        fin = np.isfinite(media)
        _p(f"[ndvi-mensal] {out.name}: {int(fin.sum())} px válidos | "
           f"min={np.nanmin(media):.3g} mean={np.nanmean(media):.3g} "
           f"max={np.nanmax(media):.3g}")
    import shutil
    shutil.rmtree(ckdir, ignore_errors=True)   # concluído: descarta o checkpoint
    _p(f"[ndvi-mensal] pronto: {out_dir}")


# ---------------------------------------------------------------------------
def main() -> None:
    p = argparse.ArgumentParser(
        description="Gera as camadas MENSAIS (12 meses) da predição: ERA5 e/ou NDVI.")
    p.add_argument("--layers", default="era5",
                   help="era5, ndvi (separados por vírgula). Padrão: era5.")
    p.add_argument("--anos", default="2015-2024", help="Janela climatológica. Padrão: 2015-2024.")
    p.add_argument("--meses", default="1-12", help="Meses a gerar (ex.: '1-12' ou '6,7,8').")
    p.add_argument("--bbox", type=float, nargs=4, default=list(BRASIL),
                   metavar=("W", "S", "E", "N"))
    p.add_argument("--res_ndvi", type=float, default=0.01, help="Resolução do NDVI (graus).")
    p.add_argument("--workers", type=int, default=10)
    p.add_argument("--out", default=str(ROOT / "02_dados_entrada" / "ambientais" / "raster_cache" / "mensal"))
    p.add_argument("--cache_gribs", default=str(
        ROOT / "02_dados_entrada" / "ambientais" / "raster_cache" / "brasil_250m" / "era5_monthly_cache"))
    a = p.parse_args()

    anos = gcb._parse_anos(a.anos)
    meses = _parse_meses(a.meses)
    out_dir = Path(a.out)
    camadas = [c.strip() for c in a.layers.split(",") if c.strip()]

    _p(f"[mensal] camadas={camadas} | anos {min(anos)}-{max(anos)} | meses {meses}")
    _p(f"[mensal] saída: {out_dir}")

    if "era5" in camadas:
        gerar_era5_mensal(Path(a.cache_gribs), out_dir, meses)
    if "ndvi" in camadas:
        gerar_ndvi_mensal(tuple(a.bbox), out_dir, anos, meses, a.res_ndvi, a.workers)


def _parse_meses(txt: str) -> list[int]:
    """'1-12' -> [1..12]; '6,7,8' -> [6,7,8]."""
    txt = txt.strip()
    if "-" in txt and "," not in txt:
        i, f = txt.split("-")
        return list(range(int(i), int(f) + 1))
    return [int(x) for x in txt.split(",") if x.strip()]


if __name__ == "__main__":
    main()
