#!/usr/bin/env python3
# captura_marinha.py — CAPTURA AMBIENTAL DIÁRIA para o PIPELINE OCEÂNICO (etapa 4).
#
# Anexa a cada ponto (presença + pseudo-ausência) 4 variáveis, no DIA da ocorrência:
#   - sst  (temperatura de superfície)  ┐ CMEMS físico `my` (0.083°, diário), superfície
#   - sss  (salinidade de superfície)   ┘ 0 m; fallback `myint` (interim) p/ datas recentes
#   - chl  (clorofila)                    CMEMS bio gap-free 4 km (sem furos de nuvem)
#   - profundidade (fixa no tempo)        batimetria (GEBCO/ocean_depth via 05_utils/batimetria)
# + coluna `chl_log10` (clorofila é log-normal — padrão em oceanografia).
#
# DIFERENÇA vs o downloader legado (`downloaders/coperniocusmarine.py`): aquele baixa o
# campo GLOBAL por data (impraticável p/ muitas datas). Aqui SUBSETAMOS ao bbox dos pontos
# DE CADA DATA (+ margem), reduzindo o download em ordens de grandeza. A extração por ponto
# (bilinear + fallback nearest) e os dataset IDs são reusados do módulo proven.
#
# Saída: CSV SLIM `Variables_<Genero_especie>_<DD_MM_AA>.csv` na pasta da espécie — mesma
# estrutura do modo continental, para o QC e a modelagem reaproveitarem.

from __future__ import annotations

import argparse
import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent.parent
BASE07 = ROOT / "07 Executado por espécie"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "05_utils"))
sys.path.insert(0, str(ROOT / "01_data_acquisition"))

import naming  # noqa: E402
import batimetria  # noqa: E402
# Reusa a extração por ponto (bilinear + fallback nearest) e os IDs de dataset validados.
from downloaders.coperniocusmarine import (  # noqa: E402
    _sample_points_bilinear,
    DATASET_ID_PHYSICS, DATASET_ID_PHYSICS2, DATASET_ID_CHL,
    CMEMS_USERNAME, CMEMS_PASSWORD,
)
import copernicusmarine  # noqa: E402

BASE_COLS = ["decimalLatitude", "decimalLongitude", "year", "month", "day"]
MARGEM_DEG = 0.5   # margem no bbox de download por data (cobre a interpolação bilinear)


def _p(m: str = "") -> None:
    print(m, flush=True)


def _reduz_2d(var: "xr.DataArray") -> "xr.DataArray":
    """Reduz dims extras (time/depth) ao 1º índice -> campo 2D lat×lon (superfície)."""
    for dd in list(var.dims):
        if str(dd).lower() not in ("lat", "latitude", "lon", "longitude"):
            var = var.isel({dd: 0})
    return var


def _amostra_snap(var: "xr.DataArray", plat, plon, max_graus: float = 0.75) -> np.ndarray:
    """Amostra `var` nos pontos por BILINEAR e, onde der NaN (célula costeira que o grid
    ~9 km do CMEMS marca como TERRA), faz SNAP para a célula OCEÂNICA VÁLIDA mais próxima
    (até `max_graus` de distância). Recupera presenças costeiras/estuarinas sem re-baixar.
    Retorna array (N,)."""
    var2 = _reduz_2d(var)
    latn = "latitude" if "latitude" in var2.coords else ("lat" if "lat" in var2.coords else list(var2.dims)[0])
    lonn = "longitude" if "longitude" in var2.coords else ("lon" if "lon" in var2.coords else list(var2.dims)[1])
    plat = np.asarray(plat, float); plon = np.asarray(plon, float)
    vals = var2.interp({latn: xr.DataArray(plat, dims="p"),
                        lonn: xr.DataArray(plon, dims="p")}, method="linear").values.reshape(-1)
    nan = ~np.isfinite(vals)
    if nan.any():
        arr = np.asarray(var2.values, float)
        LO, LA = np.meshgrid(var2[lonn].values.astype(float), var2[latn].values.astype(float))
        valid = np.isfinite(arr)
        if valid.any():
            tree = cKDTree(np.column_stack([LA[valid], LO[valid]]))
            dist, k = tree.query(np.column_stack([plat[nan], plon[nan]]), k=1)
            snap = arr[valid][k].astype(float)
            snap[dist > max_graus] = np.nan
            vals[nan] = snap
    return vals


def _find_pseudo_csv(especie: str) -> Path:
    """CSV de presenças+pseudo mais recente da espécie (Pseudoabsence_*.csv ou legado sp_*)."""
    slug = naming.slug_especie(especie)
    cands = [c for c in BASE07.rglob("*")
             if c.is_file() and c.suffix == ".csv"
             and slug.lower() in str(c).lower()
             and (c.name.startswith(naming.TIPOS["pseudoabsence"]) or c.name.startswith("sp_"))]
    if not cands:
        raise FileNotFoundError(f"Sem Pseudoabsence_*.csv p/ '{especie}' em {BASE07}.")
    cands.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return cands[0]


def _subset(dataset_id: str, variables: list[str], dt: datetime,
            bbox: tuple[float, float, float, float], out: Path, retries: int) -> bool:
    """Baixa um subset diário do CMEMS recortado a `bbox` (w,s,e,n), superfície (0-1 m).
    Retorna True se gerou um NetCDF abrível. Não levanta — deixa o chamador decidir."""
    if out.exists():
        return True
    w, s, e, n = bbox
    auth = {}
    if CMEMS_USERNAME and CMEMS_PASSWORD:
        auth = {"username": CMEMS_USERNAME, "password": CMEMS_PASSWORD}
    for tent in range(retries + 1):
        try:
            copernicusmarine.subset(
                dataset_id=dataset_id, variables=variables,
                start_datetime=dt, end_datetime=dt,
                minimum_longitude=w, maximum_longitude=e,
                minimum_latitude=s, maximum_latitude=n,
                minimum_depth=0.5, maximum_depth=1.0,      # superfície
                output_filename=str(out),
                netcdf_compression_level=9, disable_progress_bar=True, **auth,
            )
            with xr.open_dataset(out, engine="netcdf4"):
                return True
        except Exception as ex:  # noqa: BLE001 — transitório: tenta de novo, some ao esgotar
            import time
            _p(f"[mar]  ! {dataset_id} {dt:%Y-%m-%d} tent {tent + 1}/{retries + 1}: {ex}")
            if out.exists():
                try: out.unlink()
                except OSError: pass
            time.sleep(min(20, 4 * (tent + 1)))
    return False


def _baixar_data(y: int, m: int, d: int, grp: pd.DataFrame, data_dir: Path, retries: int) -> None:
    """Baixa thetao/so (físico my, fallback myint) e CHL (bio gap-free) do DIA, recortado
    ao bbox dos pontos daquela data (+ margem)."""
    key = f"{y}_{m:02d}_{d:02d}"
    dt = datetime(y, m, d)
    lat, lon = grp["decimalLatitude"].astype(float), grp["decimalLongitude"].astype(float)
    bbox = (float(lon.min()) - MARGEM_DEG, float(lat.min()) - MARGEM_DEG,
            float(lon.max()) + MARGEM_DEG, float(lat.max()) + MARGEM_DEG)

    ts = data_dir / f"temp_salinity_{key}.nc"
    if not ts.exists():
        if not _subset(DATASET_ID_PHYSICS, ["thetao", "so"], dt, bbox, ts, retries):
            _subset(DATASET_ID_PHYSICS2, ["thetao", "so"], dt, bbox, ts, retries)  # fallback myint

    chl = data_dir / f"chl_{key}.nc"
    if not chl.exists():
        _subset(DATASET_ID_CHL, ["CHL"], dt, bbox, chl, retries)


def capturar_marinho(csv: Path, data_dir: Path, batimetria_path: str | Path,
                     max_workers: int = 5, retries: int = 1) -> Path:
    """Captura as 4 variáveis marinhas no dia da ocorrência e grava o CSV SLIM."""
    df = pd.read_csv(csv)
    faltando = [c for c in BASE_COLS if c not in df.columns]
    if faltando:
        raise ValueError(f"CSV sem colunas obrigatórias: {faltando}")

    especie_dir = csv.parent
    especie_nome = naming.especie_da_pasta(especie_dir)
    data_dir = Path(data_dir); data_dir.mkdir(parents=True, exist_ok=True)
    _p(f"[mar] {especie_nome} | {len(df)} pontos | captura DIÁRIA (sst/sss/chl/profundidade)")

    validos = df.dropna(subset=BASE_COLS).copy()
    grupos = validos.groupby([validos["year"].astype(int),
                              validos["month"].astype(int),
                              validos["day"].astype(int)])

    # (1) DOWNLOAD por data (subset ao bbox dos pontos; paralelo; resumível via cache .nc)
    _p(f"[mar] baixando {grupos.ngroups} data(s) do CMEMS (subset por bbox)...")
    # O backend HDF5/netCDF4 usado pelo cliente CMEMS não é thread-safe. Processos
    # isolam o estado nativo e evitam segfaults durante downloads concorrentes.
    with ProcessPoolExecutor(max_workers=max_workers) as ex:
        futs = [ex.submit(_baixar_data, int(y), int(m), int(d), grp, data_dir, retries)
                for (y, m, d), grp in grupos]
        for f in as_completed(futs):
            f.result()

    # (2) EXTRAÇÃO por data (abre cada .nc UMA vez; bilinear + fallback nearest)
    for c in ("thetao", "so", "CHL"):
        df[c] = np.nan
    for (y, m, d), grp in grupos:
        key = f"{y}_{m:02d}_{d:02d}"; idx = grp.index
        plat = grp["decimalLatitude"].astype(float).to_numpy()
        plon = grp["decimalLongitude"].astype(float).to_numpy()
        ts = data_dir / f"temp_salinity_{key}.nc"
        if ts.exists():
            with xr.open_dataset(ts, engine="netcdf4") as ds:
                for v in ("thetao", "so"):
                    if v in ds:
                        df.loc[idx, v] = _amostra_snap(ds[v], plat, plon)
        chl = data_dir / f"chl_{key}.nc"
        if chl.exists():
            with xr.open_dataset(chl, engine="netcdf4") as ds:
                if "CHL" in ds:
                    df.loc[idx, "CHL"] = _amostra_snap(ds["CHL"], plat, plon)

    # (3) PROFUNDIDADE (fixa no tempo) via batimetria
    df["profundidade"] = batimetria.profundidade_pontos(
        df["decimalLatitude"], df["decimalLongitude"], batimetria_path)

    # (4) log10(clorofila) — distribuição log-normal
    with np.errstate(invalid="ignore", divide="ignore"):
        df["chl_log10"] = np.log10(df["CHL"].where(df["CHL"] > 0))

    # (5) padroniza nomes: sst, sss, chl (+ chl_log10, profundidade)
    df = df.rename(columns={"thetao": "sst", "so": "sss", "CHL": "chl"})

    # (6) SLIM + grava na convenção de nomes
    if "provider" in df.columns:
        fonte = df["provider"].values
    elif "base_de_dados" in df.columns:
        fonte = df["base_de_dados"].values
    else:
        fonte = pd.Series([pd.NA] * len(df)).values
    env = ["sst", "sss", "chl", "chl_log10", "profundidade"]
    ordem = BASE_COLS + (["sp"] if "sp" in df.columns else []) + env
    slim = df[[c for c in ordem if c in df.columns]].copy()
    slim.insert(0, "base_de_dados", fonte)

    var_dir = especie_dir / f"{especie_nome}_variables_marinho_{naming.carimbo(especie_dir)}"
    var_dir.mkdir(parents=True, exist_ok=True)
    out_csv = var_dir / naming.nome("variables", especie_nome, especie_dir, "csv")
    slim.to_csv(out_csv, index=False)

    _p("[mar] QA (não-nulos):")
    for c in env:
        _p(f"[mar]   {c:14} {int(slim[c].notna().sum())}/{len(slim)}")
    comp = slim[env].notna().all(axis=1)
    _p(f"[mar] COMPLETOS (todas as {len(env)} vars): {int(comp.sum())}/{len(slim)}")
    _p(f"[mar] [OK] {out_csv}")
    return out_csv


def main() -> None:
    p = argparse.ArgumentParser(
        description="Captura ambiental MARINHA diária (sst/sss/chl/profundidade).")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--especie", type=str, help="Nome científico (busca na pasta 07).")
    g.add_argument("--csv", type=str, help="Caminho do Pseudoabsence_*.csv.")
    p.add_argument("--data_dir", type=str, default=str(ROOT / "dados_saida" / "cmarine"),
                   help="Cache dos NetCDF do CMEMS (resumível).")
    p.add_argument("--batimetria", type=str, default=str(batimetria.BATIMETRIA_PADRAO),
                   help="NetCDF de batimetria (default: ocean_depth.nc; troque pelo GEBCO).")
    p.add_argument("--max_workers", type=int, default=5)
    p.add_argument("--retries", type=int, default=1)
    args = p.parse_args()
    csv = Path(args.csv) if args.csv else _find_pseudo_csv(args.especie)
    capturar_marinho(csv, Path(args.data_dir), args.batimetria, args.max_workers, args.retries)


if __name__ == "__main__":
    main()
