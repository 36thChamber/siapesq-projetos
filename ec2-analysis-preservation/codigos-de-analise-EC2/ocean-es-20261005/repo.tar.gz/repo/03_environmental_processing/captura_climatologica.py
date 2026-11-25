#!/usr/bin/env python3
# captura_climatologica.py — CAPTACAO CLIMATOLOGICA de variaveis (etapa 03, ALTERNATIVA).
#
# É a alternativa CLIMATOLOGICA ao modo DIARIO (`captura_ambiental.py`). Enquanto o modo
# diario baixa o clima DO DIA de cada registro (dinamica), aqui cada ponto recebe a MEDIA
# DE LONGO PRAZO (2015-2024) do seu LOCAL — o clima passa a depender so do lugar, nao da
# data. Assim TREINO e PREDICAO usam EXATAMENTE os mesmos rasters de 10 anos (coerentes por
# construcao). Ver documentation/14_camadas_predicao_documentacao.md, secao 4.
#
# Diferenca pratica: NAO baixa nada. Apenas AMOSTRA nos pontos os 10 rasters do Brasil ja
# gerados (`gerar_cache_brasil.py` + montador). Rapido (segundos/minutos por especie).
#
# Como a data deixa de importar, registros no mesmo local viram linhas identicas -> aplica
# DEDUPLICACAO ESPACIAL (1 por celula ~1 km) para evitar pseudo-replicacao.
#
# USO (da raiz):
#   .venv\Scripts\python.exe 03_environmental_processing\captura_climatologica.py --especie Alouatta_caraya
#   (ou --csv <Pseudoabsence_*.csv>; opt-in: --uso_solo worldcover, --com_amplitudes, --com_riparios)
#
# Saida: VariablesClimatologico_<Especie>_<DD_MM_AA>.csv na subpasta
# <Especie>_variables_climatologico_<DD_MM_AA>/ da rodada (07/...), CSV SLIM identico
# em estrutura ao do modo diario -> QC/relatorio reaproveitado.

from __future__ import annotations

import argparse
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
from montar_rasters_predicao import FONTES  # noqa: E402  (col -> raster de 10 anos)
from env_providers.legendas_uso_solo import nome_classe  # noqa: E402

# 7 variaveis do projeto (decisao do usuario): evaporacao(e), precipitacao(tp),
# temperatura media(t2m), NDVI, altitude, AWC + uso do solo MapBiomas (categorico).
# slope/clay/worldcover foram removidas.
#
# OPT-IN (caminho B do caraya, 2026-08-10 — nada muda no padrao das outras especies):
#   --uso_solo worldcover : troca MapBiomas (so-Brasil) por ESA WorldCover 10 m na nuvem
#                           (global — necessario quando a area de treino inclui PY/AR/BO)
#                           e liga o FALLBACK SoilGrids p/ awc de pontos fora do Brasil.
#   --com_amplitudes      : soma 4 preditores estaticos de SAZONALIDADE DO LUGAR
#                           ({t2m,e,tp,ndvi}_amp = mes max - mes min, 2015-2024), de
#                           gerar_amplitudes_sazonais.py. E a assinatura que separa
#                           Cerrado de Amazonia/Mata Atlantica sem cair no desenho
#                           por-registro (diario/sazonal), que inverte o mapa.
CONT = ["t2m", "e", "tp", "ndvi", "altitude", "awc"]
CAT = ["ocup_solo_mapbiomas"]
AMPS = ["t2m_amp", "e_amp", "tp_amp", "ndvi_amp"]
RIPARIOS = ["dist_rio", "pct_floresta_500m"]   # gerar_preditores_riparios.py (janela RS)
MENSAL_DIR = ROOT / "env_data" / "raster_cache" / "mensal"
RIPARIO_DIR = ROOT / "env_data" / "raster_cache" / "regional_rs"
BASE_COLS = ["decimalLatitude", "decimalLongitude", "day", "month", "year"]
DEDUP_CELL_DEG = 0.01   # ~1,1 km — 1 registro por celula (por classe sp)


def _p(m=""):
    print(m, flush=True)


class _CtxMudo:
    """CaptureContext minimo p/ reusar providers fora do orquestrador da etapa 03."""

    def report(self, *a, **k):
        pass


def _especie_do_csv(csv: Path) -> str:
    """'Pseudoabsence_Alouatta_caraya_10_08_26.csv' -> 'Alouatta_caraya'. Fallback:
    convencao da pasta (que falha em subpastas de variante, dai o parse do nome)."""
    import re
    m = re.match(rf"{naming.TIPOS['pseudoabsence']}_(.+)_\d{{2}}_\d{{2}}_\d{{2}}\.csv$",
                 csv.name)
    if m:
        return m.group(1)
    return naming.especie_da_pasta(csv.parent)


def _find_pseudo_csv(especie: str) -> Path:
    """CSV de presencas+pseudoausencias mais recente da especie (Pseudoabsence_*.csv,
    ou o legado sp_*_occurrences.csv)."""
    slug = naming.slug_especie(especie)
    cands = [c for c in BASE07.rglob("*")
             if c.is_file() and c.suffix == ".csv"
             and slug.lower() in str(c).lower()
             and (c.name.startswith(naming.TIPOS["pseudoabsence"])
                  or c.name.startswith("sp_"))]
    if not cands:
        raise FileNotFoundError(f"Sem Pseudoabsence_*.csv p/ '{especie}' em {BASE07}.")
    cands.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    if len(cands) > 1:
        _p(f"[clima] {len(cands)} CSVs; usando o mais recente: {cands[0].name}")
    return cands[0]


def _dedup_espacial(df: pd.DataFrame, cell_deg: float) -> tuple[pd.DataFrame, int]:
    """1 registro por celula (~`cell_deg` graus) DENTRO de cada classe sp — no modo
    climatologico varios registros no mesmo local sao identicos (mesma media de 10 anos),
    e mante-los infla artificialmente o peso do local. Retorna (df, n_removidos)."""
    lat = pd.to_numeric(df["decimalLatitude"], errors="coerce")
    lon = pd.to_numeric(df["decimalLongitude"], errors="coerce")
    cel_lat = np.floor(lat / cell_deg).astype("Int64")
    cel_lon = np.floor(lon / cell_deg).astype("Int64")
    sp = df["sp"] if "sp" in df.columns else pd.Series(0, index=df.index)
    chave = (cel_lat.astype(str) + "|" + cel_lon.astype(str) + "|" + sp.astype(str))
    n0 = len(df)
    dfd = df.loc[~chave.duplicated(keep="first")].reset_index(drop=True)
    return dfd, n0 - len(dfd)


def capturar_climatologico(csv: Path, cell_deg: float = DEDUP_CELL_DEG,
                           janela: str = "2015-2024", uso_solo: str = "mapbiomas",
                           com_amplitudes: bool = False,
                           com_riparios: bool = False) -> Path:
    """Amostra os 10 rasters de 10 anos nos pontos do CSV (apos dedup espacial) e grava o
    CSV SLIM climatologico na pasta da especie; roda o QC (relatorio estatistico)."""
    cat = ["ocup_solo_worldcover"] if uso_solo == "worldcover" else list(CAT)
    cont = CONT + (AMPS if com_amplitudes else []) + (RIPARIOS if com_riparios else [])

    df_full = pd.read_csv(csv)
    faltando = [c for c in BASE_COLS if c not in df_full.columns]
    if faltando:
        raise ValueError(f"CSV sem colunas obrigatorias: {faltando}")

    especie_dir = csv.parent
    especie_nome = _especie_do_csv(csv)
    _p(f"[clima] {especie_nome} | modo CLIMATOLOGICO ({janela}) | uso_solo={uso_solo} | "
       f"amplitudes={'sim' if com_amplitudes else 'nao'} | entrada: {csv.name} "
       f"({len(df_full)} registros)")

    # (1) DEDUP ESPACIAL (1/celula por classe).
    df_full, n_dedup = _dedup_espacial(df_full, cell_deg)
    if n_dedup:
        _p(f"[clima] dedup espacial (~{cell_deg}°, 1/celula/classe): "
           f"-{n_dedup} registros -> {len(df_full)} restantes.")

    # base_de_dados (fonte do registro).
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

    # (2) AMOSTRA cada raster de 10 anos nos pontos (continuas=bilinear; categoricas=
    # nearest). Amplitudes vem do cache mensal (<var>_amp.tif); o resto, das FONTES.
    for col in cont:
        if col in AMPS:
            raster = MENSAL_DIR / f"{col}.tif"
        elif col in RIPARIOS:
            raster = RIPARIO_DIR / f"{col}.tif"
        else:
            raster = FONTES.get(col)
        if raster is None or not Path(raster).exists():
            _p(f"[clima]  ! {col}: raster ausente ({raster}) — coluna fica NaN.")
            df[col] = np.nan
            continue
        try:
            vals = sample_raster_file(str(raster), lats, lons, method="bilinear", clip=True)
        except Exception as e:  # noqa: BLE001
            _p(f"[clima]  ! {col}: falha ao amostrar ({type(e).__name__}) — NaN.")
            vals = np.full(len(df), np.nan)
        df[col] = np.asarray(vals, dtype=float)
        ok = int(np.isfinite(df[col]).sum())
        _p(f"[clima]  = {col:22} amostrado: {ok}/{len(df)} nao-nulos")

    # (2b) FALLBACK awc (so no modo worldcover, que implica area com vizinhos): o raster
    # local e mascarado ao Brasil; sem isto os pontos PY/AR/BO morreriam em silencio no
    # complete-cases do R. Busca na nuvem SO os faltantes (mesmo provider da etapa diaria).
    if uso_solo == "worldcover" and "awc" in df.columns:
        falta_awc = np.flatnonzero(~np.isfinite(df["awc"].to_numpy(float)))
        if falta_awc.size:
            _p(f"[clima]  ~ awc: {falta_awc.size} ponto(s) fora do raster local — "
               f"fallback SoilGrids na nuvem...")
            try:
                from env_providers.soilgrids import SoilGridsProvider
                sub = df.iloc[falta_awc][["decimalLatitude", "decimalLongitude"]].copy()
                sub = SoilGridsProvider().capture(sub, _CtxMudo())
                df.iloc[falta_awc, df.columns.get_loc("awc")] = sub["awc"].to_numpy(float)
                _p(f"[clima]  = awc pos-fallback: "
                   f"{int(df['awc'].notna().sum())}/{len(df)} nao-nulos")
            except Exception as e:  # noqa: BLE001
                _p(f"[clima]  ! fallback awc falhou ({type(e).__name__}: {e}) — seguem NaN.")

    # (2b2) FALLBACK pct_floresta_500m — o MapBiomas so cobre o Brasil; pontos
    # argentinos (Corrientes/Misiones) ficam NaN. Busca na nuvem WorldCover 10 m a
    # fracao de cobertura arborea (classe 10) numa vizinhanca 3x3 de ~250 m.
    if com_riparios and "pct_floresta_500m" in df.columns:
        falta = np.flatnonzero(~np.isfinite(df["pct_floresta_500m"].to_numpy(float)))
        if falta.size:
            _p(f"[clima]  ~ pct_floresta: {falta.size} ponto(s) fora do MapBiomas — "
               f"fallback WorldCover 3x3 na nuvem...")
            try:
                from env_providers.worldcover import WorldCoverProvider
                la = lats[falta]; lo = lons[falta]
                dx = 0.0025
                las, los = [], []
                for dlat in (-dx, 0, dx):
                    for dlon in (-dx, 0, dx):
                        las.append(la + dlat); los.append(lo + dlon)
                las = np.concatenate(las); los = np.concatenate(los)
                anos = np.full(len(las), 2021.0)
                v = WorldCoverProvider._amostrar_nuvem(las, los, anos)
                v = v.reshape(9, falta.size)
                frac = np.nanmean(np.isin(v, (10,)) & np.isfinite(v), axis=0)
                df.iloc[falta, df.columns.get_loc("pct_floresta_500m")] = frac
                _p(f"[clima]  = pct_floresta pos-fallback: "
                   f"{int(df['pct_floresta_500m'].notna().sum())}/{len(df)} nao-nulos")
            except Exception as e:  # noqa: BLE001
                _p(f"[clima]  ! fallback pct_floresta falhou ({type(e).__name__}: {e}).")

    # (2c) Uso do solo: mapbiomas = raster local (nearest); worldcover = nuvem 10 m
    # (global, pixel nativo — mesma rotina do provider da etapa diaria).
    for col in cat:
        if col == "ocup_solo_worldcover":
            try:
                from env_providers.worldcover import WorldCoverProvider
                anos = pd.to_numeric(df["year"], errors="coerce").to_numpy(float)
                vals = WorldCoverProvider._amostrar_nuvem(lats, lons, anos)
            except Exception as e:  # noqa: BLE001
                _p(f"[clima]  ! worldcover falhou ({type(e).__name__}: {e}) — NaN.")
                vals = np.full(len(df), np.nan)
        else:
            raster = FONTES.get(col)
            if raster is None or not Path(raster).exists():
                _p(f"[clima]  ! {col}: raster ausente ({raster}) — coluna fica NaN.")
                df[col] = np.nan
                continue
            try:
                vals = sample_raster_file(str(raster), lats, lons, method="nearest", clip=True)
            except Exception as e:  # noqa: BLE001
                _p(f"[clima]  ! {col}: falha ao amostrar ({type(e).__name__}) — NaN.")
                vals = np.full(len(df), np.nan)
        df[col] = np.asarray(vals, dtype=float)
        _p(f"[clima]  = {col:22} amostrado: "
           f"{int(np.isfinite(df[col]).sum())}/{len(df)} nao-nulos")

    # (3) Rotulo de classe do uso do solo (ao lado do codigo).
    classe_cols = []
    for col in cat:
        if col in df.columns:
            df[f"{col}_classe"] = df[col].map(lambda v, _c=col: nome_classe(_c, v))
            classe_cols.append(f"{col}_classe")

    # (4) Ordena e grava SLIM (mesma estrutura do modo diario).
    ordem = ["base_de_dados"] + BASE_COLS + (["sp"] if "sp" in df.columns else [])
    for c in cont + cat:
        ordem.append(c)
        if f"{c}_classe" in df.columns:
            ordem.append(f"{c}_classe")
    slim = df[[c for c in ordem if c in df.columns]]

    var_dir = especie_dir / f"{especie_nome}_variables_climatologico_{naming.carimbo(especie_dir)}"
    var_dir.mkdir(parents=True, exist_ok=True)
    out_csv = var_dir / naming.nome("variables_climatologico", especie_nome, especie_dir, "csv")
    slim.to_csv(out_csv, index=False)
    _p(f"[clima] [OK] SLIM climatologico salvo: {out_csv.name} "
       f"({len(slim)} linhas, {len(slim.columns)} colunas)")

    # QA rapido (nao-nulos por variavel).
    env_cols = cont + cat
    _p("[clima] QA (nao-nulos):")
    for c in env_cols:
        _p(f"[clima]   {c:22} {int(df[c].notna().sum())}/{len(df)}")
    comp = df[env_cols].notna().all(axis=1)
    _p(f"[clima] registros COMPLETOS (todas as {len(env_cols)} vars): {int(comp.sum())}/{len(df)}")

    # (5) QC AMBIENTAL — relatorio estatistico (mesma rotina do modo diario).
    try:
        from processo import run_qc
        _p("")
        _p("==== QC AMBIENTAL — CLIMATOLOGICO (relatorio estatistico) ====")
        run_qc(out_csv, especie=especie_nome)
    except Exception as e:  # noqa: BLE001 - QC nunca derruba a captura
        _p(f"[qc] PULADO: {type(e).__name__}: {e}")

    return out_csv


def main():
    p = argparse.ArgumentParser(
        description="Captacao CLIMATOLOGICA (media 2015-2024) — ALTERNATIVA ao modo diario.")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--especie", type=str, help="Nome cientifico (busca na pasta 07).")
    g.add_argument("--csv", type=str, help="Caminho do Pseudoabsence_*.csv.")
    p.add_argument("--cell_deg", type=float, default=DEDUP_CELL_DEG,
                   help="Celula da dedup espacial em graus (padrao ~0.01 = ~1 km).")
    p.add_argument("--uso_solo", choices=["mapbiomas", "worldcover"], default="mapbiomas",
                   help="Fonte do uso do solo. 'worldcover' (global) p/ area de treino com "
                        "vizinhos; liga tambem o fallback SoilGrids do awc fora do Brasil.")
    p.add_argument("--com_amplitudes", action="store_true",
                   help="Soma os 4 preditores de amplitude sazonal do lugar "
                        "({t2m,e,tp,ndvi}_amp; gerar_amplitudes_sazonais.py).")
    p.add_argument("--com_riparios", action="store_true",
                   help="Soma dist_rio e pct_floresta_500m (paisagem riparia da janela "
                        "regional RS; gerar_preditores_riparios.py). Fallback WorldCover "
                        "p/ pct_floresta fora do Brasil.")
    args = p.parse_args()
    csv = Path(args.csv) if args.csv else _find_pseudo_csv(args.especie)
    capturar_climatologico(csv, cell_deg=args.cell_deg, uso_solo=args.uso_solo,
                           com_amplitudes=args.com_amplitudes,
                           com_riparios=args.com_riparios)


if __name__ == "__main__":
    main()
