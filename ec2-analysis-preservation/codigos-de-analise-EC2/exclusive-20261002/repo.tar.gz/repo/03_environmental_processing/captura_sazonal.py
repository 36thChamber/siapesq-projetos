#!/usr/bin/env python3
# captura_sazonal.py — CAPTACAO SAZONAL de variaveis (etapa 03, ALTERNATIVA).
#
# E a TERCEIRA via da etapa 03, irma do DIARIO (`captura_ambiental.py`) e do
# CLIMATOLOGICO (`captura_climatologica.py`):
#   - diario:         clima DO DIA de cada registro (baixa ERA5 etc.)
#   - climatologico:  media ANUAL 2015-2024 do LOCAL (a data nao importa)
#   - sazonal (ESTE): media 2015-2024 DO MES de cada registro no LOCAL — o modelo
#                     aprende o ciclo sazonal que a especie tolera. Criado para o
#                     caraya (Cerrado): o climatologico treinava so com medias anuais
#                     e INVERTIA os mapas mensais na estacao seca (mai-out), porque
#                     recebia na predicao valores mensais que nunca viu no treino.
#
# Fontes (NADA e baixado alem do uso do solo/awc-fallback):
#   - t2m,e,tp,ndvi  : rasters MENSAIS ja prontos (env_data/raster_cache/mensal/
#                      <var>_<MM>.tif, gerar_cenarios_mensais.py) — amostrados no mes
#                      do registro.
#   - altitude, awc  : rasters anuais do cache (nao variam por mes). O awc local e
#                      mascarado ao Brasil -> pontos vizinhos (PY/AR/BO) caem no
#                      FALLBACK SoilGrids na nuvem (mesmo provider da etapa diaria).
#   - uso do solo    : ESA WorldCover 10 m na NUVEM (global — cobre os vizinhos;
#                      o MapBiomas so cobre o Brasil). Coluna `ocup_solo_worldcover`.
#
# Dedup espacial: no climatologico era 1 registro por celula ~1 km (linhas no mesmo
# local eram identicas). Aqui registros no mesmo local em MESES diferentes carregam
# informacao distinta -> a chave da dedup vira (celula, sp, MES).
#
# Saida: CSV SLIM (VariablesSazonal_*) na mesma estrutura dos irmaos -> QC reaproveitado.
#
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe 03_environmental_processing/captura_sazonal.py --csv <Pseudoabsence_*.csv>

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
BASE07 = ROOT / "07 Executado por espécie"
sys.path.insert(0, str(ROOT / "03_environmental_processing"))
sys.path.insert(0, str(ROOT))

import naming  # noqa: E402
from point_sampler import sample_raster_file  # noqa: E402
from montar_rasters_predicao import FONTES  # noqa: E402  (col -> raster anual)
from env_providers.legendas_uso_solo import nome_classe  # noqa: E402

MENSAL_DIR = ROOT / "env_data" / "raster_cache" / "mensal"

CONT_MENSAL = ["t2m", "e", "tp", "ndvi"]   # variam por mes (rasters mensais)
CONT_FIXA = ["altitude", "awc"]            # estaticas (rasters anuais)
AMPS = ["t2m_amp", "e_amp", "tp_amp", "ndvi_amp"]  # estaticas (assinatura sazonal do lugar)
CAT = ["ocup_solo_worldcover"]             # categorica global (nuvem)
BASE_COLS = ["decimalLatitude", "decimalLongitude", "day", "month", "year"]
DEDUP_CELL_DEG = 0.01   # ~1,1 km — 1 registro por (celula, sp, mes)


def _p(m=""):
    print(m, flush=True)


class _CtxMudo:
    """CaptureContext minimo p/ reusar providers fora do orquestrador da etapa 03."""

    def report(self, *a, **k):
        pass


def _especie_do_csv(csv: Path) -> str:
    """'Pseudoabsence_Alouatta_caraya_10_08_26.csv' -> 'Alouatta_caraya'. Fallback:
    convencao da pasta (que falha em subpastas de variante, dai o parse do nome)."""
    m = re.match(rf"{naming.TIPOS['pseudoabsence']}_(.+)_\d{{2}}_\d{{2}}_\d{{2}}\.csv$",
                 csv.name)
    if m:
        return m.group(1)
    return naming.especie_da_pasta(csv.parent)


def _dedup_espacial_mensal(df: pd.DataFrame, cell_deg: float) -> tuple[pd.DataFrame, int]:
    """1 registro por (celula ~cell_deg, classe sp, MES). Mesmo local em meses
    distintos = linhas distintas (o clima do mes difere)."""
    lat = pd.to_numeric(df["decimalLatitude"], errors="coerce")
    lon = pd.to_numeric(df["decimalLongitude"], errors="coerce")
    mes = pd.to_numeric(df["month"], errors="coerce").astype("Int64")
    cel_lat = np.floor(lat / cell_deg).astype("Int64")
    cel_lon = np.floor(lon / cell_deg).astype("Int64")
    sp = df["sp"] if "sp" in df.columns else pd.Series(0, index=df.index)
    chave = (cel_lat.astype(str) + "|" + cel_lon.astype(str) + "|"
             + sp.astype(str) + "|" + mes.astype(str))
    n0 = len(df)
    dfd = df.loc[~chave.duplicated(keep="first")].reset_index(drop=True)
    return dfd, n0 - len(dfd)


def capturar_sazonal(csv: Path, cell_deg: float = DEDUP_CELL_DEG,
                     com_amplitudes: bool = False) -> Path:
    df_full = pd.read_csv(csv)
    faltando = [c for c in BASE_COLS if c not in df_full.columns]
    if faltando:
        raise ValueError(f"CSV sem colunas obrigatorias: {faltando}")

    especie_dir = csv.parent
    especie_nome = _especie_do_csv(csv)
    _p(f"[sazonal] {especie_nome} | modo SAZONAL (media 2015-2024 do MES do registro) | "
       f"entrada: {csv.name} ({len(df_full)} registros)")

    # (0) mes valido e inteiro (datas completas ja sao garantidas pela limpeza).
    mes = pd.to_numeric(df_full["month"], errors="coerce")
    ok_mes = mes.between(1, 12)
    if (~ok_mes).any():
        _p(f"[sazonal] descartados {int((~ok_mes).sum())} registros sem mes valido.")
        df_full = df_full.loc[ok_mes].reset_index(drop=True)

    # (1) DEDUP ESPACIAL por (celula, sp, mes).
    df_full, n_dedup = _dedup_espacial_mensal(df_full, cell_deg)
    if n_dedup:
        _p(f"[sazonal] dedup espacial (~{cell_deg}°, 1/celula/classe/mes): "
           f"-{n_dedup} registros -> {len(df_full)} restantes.")

    if "provider" in df_full.columns:
        fonte = df_full["provider"].values
    elif "source" in df_full.columns:
        fonte = df_full["source"].values
    else:
        fonte = pd.Series([pd.NA] * len(df_full)).values

    df = df_full[BASE_COLS].copy()
    df.insert(0, "base_de_dados", fonte)
    if "sp" in df_full.columns:
        df["sp"] = df_full["sp"].values

    lats = pd.to_numeric(df["decimalLatitude"], errors="coerce").to_numpy(float)
    lons = pd.to_numeric(df["decimalLongitude"], errors="coerce").to_numpy(float)
    meses = pd.to_numeric(df["month"], errors="coerce").to_numpy(float).astype(int)

    # (2) VARIAVEIS MENSAIS — amostra o raster do MES de cada registro (bilinear).
    for col in CONT_MENSAL:
        vals = np.full(len(df), np.nan)
        for m in range(1, 13):
            sel = np.flatnonzero(meses == m)
            if sel.size == 0:
                continue
            raster = MENSAL_DIR / f"{col}_{m:02d}.tif"
            if not raster.exists():
                _p(f"[sazonal]  ! {col} mes {m:02d}: raster ausente ({raster.name}).")
                continue
            try:
                v = sample_raster_file(str(raster), lats[sel], lons[sel],
                                       method="bilinear", clip=True)
                vals[sel] = np.asarray(v, dtype=float)
            except Exception as e:  # noqa: BLE001
                _p(f"[sazonal]  ! {col} mes {m:02d}: falha ({type(e).__name__}).")
        df[col] = vals
        _p(f"[sazonal]  = {col:22} (mensal) amostrado: "
           f"{int(np.isfinite(vals).sum())}/{len(df)} nao-nulos")

    # (3) VARIAVEIS FIXAS — raster anual do cache; amplitudes (opt-in) do cache mensal.
    fixas = CONT_FIXA + (AMPS if com_amplitudes else [])
    for col in fixas:
        raster = (MENSAL_DIR / f"{col}.tif") if col in AMPS else FONTES.get(col)
        if raster is None or not Path(raster).exists():
            _p(f"[sazonal]  ! {col}: raster ausente ({raster}) — coluna fica NaN.")
            df[col] = np.nan
            continue
        try:
            vals = sample_raster_file(str(raster), lats, lons, method="bilinear", clip=True)
            vals = np.asarray(vals, dtype=float)
        except Exception as e:  # noqa: BLE001
            _p(f"[sazonal]  ! {col}: falha ao amostrar ({type(e).__name__}) — NaN.")
            vals = np.full(len(df), np.nan)
        df[col] = vals
        _p(f"[sazonal]  = {col:22} (fixa)   amostrado: "
           f"{int(np.isfinite(vals).sum())}/{len(df)} nao-nulos")

    # (3b) FALLBACK awc — o raster local e mascarado ao Brasil; pontos vizinhos
    # (PY/AR/BO) ficam NaN e iriam embora no complete-cases do R, desfazendo em
    # silencio a decisao de incluir o entorno. Busca na nuvem SO os faltantes.
    falta_awc = np.flatnonzero(~np.isfinite(df["awc"].to_numpy(float)))
    if falta_awc.size:
        _p(f"[sazonal]  ~ awc: {falta_awc.size} ponto(s) fora do raster local — "
           f"fallback SoilGrids na nuvem...")
        try:
            from env_providers.soilgrids import SoilGridsProvider
            sub = df.iloc[falta_awc][["decimalLatitude", "decimalLongitude"]].copy()
            sub = SoilGridsProvider().capture(sub, _CtxMudo())
            df.iloc[falta_awc, df.columns.get_loc("awc")] = sub["awc"].to_numpy(float)
            _p(f"[sazonal]  = awc pos-fallback: "
               f"{int(df['awc'].notna().sum())}/{len(df)} nao-nulos")
        except Exception as e:  # noqa: BLE001
            _p(f"[sazonal]  ! fallback awc falhou ({type(e).__name__}: {e}) — seguem NaN.")

    # (4) USO DO SOLO — ESA WorldCover 10 m na nuvem (global, cobre os vizinhos).
    try:
        from env_providers.worldcover import WorldCoverProvider
        anos = pd.to_numeric(df["year"], errors="coerce").to_numpy(float)
        vals = WorldCoverProvider._amostrar_nuvem(lats, lons, anos)
        df["ocup_solo_worldcover"] = vals
        _p(f"[sazonal]  = ocup_solo_worldcover  amostrado: "
           f"{int(np.isfinite(vals).sum())}/{len(df)} nao-nulos")
    except Exception as e:  # noqa: BLE001
        _p(f"[sazonal]  ! worldcover falhou ({type(e).__name__}: {e}) — coluna NaN.")
        df["ocup_solo_worldcover"] = np.nan

    for col in CAT:
        if col in df.columns:
            df[f"{col}_classe"] = df[col].map(lambda v, _c=col: nome_classe(_c, v))

    # (5) Ordena e grava SLIM (mesma estrutura dos irmaos).
    ordem = ["base_de_dados"] + BASE_COLS + (["sp"] if "sp" in df.columns else [])
    for c in CONT_MENSAL + fixas + CAT:
        ordem.append(c)
        if f"{c}_classe" in df.columns:
            ordem.append(f"{c}_classe")
    slim = df[[c for c in ordem if c in df.columns]]

    var_dir = especie_dir / f"{especie_nome}_variables_sazonal_{naming.carimbo(especie_dir)}"
    var_dir.mkdir(parents=True, exist_ok=True)
    out_csv = var_dir / naming.nome("variables_sazonal", especie_nome, especie_dir, "csv")
    slim.to_csv(out_csv, index=False)
    _p(f"[sazonal] [OK] SLIM sazonal salvo: {out_csv.name} "
       f"({len(slim)} linhas, {len(slim.columns)} colunas)")

    env_cols = CONT_MENSAL + fixas + CAT
    _p("[sazonal] QA (nao-nulos):")
    for c in env_cols:
        _p(f"[sazonal]   {c:22} {int(df[c].notna().sum())}/{len(df)}")
    comp = df[env_cols].notna().all(axis=1)
    _p(f"[sazonal] registros COMPLETOS (todas as {len(env_cols)} vars): "
       f"{int(comp.sum())}/{len(df)}")

    # (6) QC AMBIENTAL — mesmo relatorio estatistico dos irmaos.
    try:
        from processo import run_qc
        _p("")
        _p("==== QC AMBIENTAL — SAZONAL (relatorio estatistico) ====")
        run_qc(out_csv, especie=especie_nome)
    except Exception as e:  # noqa: BLE001 - QC nunca derruba a captura
        _p(f"[qc] PULADO: {type(e).__name__}: {e}")

    return out_csv


def main():
    p = argparse.ArgumentParser(
        description="Captacao SAZONAL (media 2015-2024 do MES do registro) — "
                    "alternativa ao diario e ao climatologico.")
    p.add_argument("--csv", type=str, required=True,
                   help="Caminho do Pseudoabsence_*.csv (presencas + pseudo).")
    p.add_argument("--cell_deg", type=float, default=DEDUP_CELL_DEG,
                   help="Celula da dedup espacial em graus (padrao ~0.01 = ~1 km).")
    p.add_argument("--com_amplitudes", action="store_true",
                   help="Soma os 4 preditores estaticos de amplitude sazonal do lugar "
                        "({t2m,e,tp,ndvi}_amp) — ancora o modelo sazonal na assinatura "
                        "do lugar (gerar_amplitudes_sazonais.py).")
    args = p.parse_args()
    capturar_sazonal(Path(args.csv), cell_deg=args.cell_deg,
                     com_amplitudes=args.com_amplitudes)


if __name__ == "__main__":
    main()
