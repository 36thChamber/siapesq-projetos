#!/usr/bin/env python3
# montar_rasters_predicao.py — Monta a PASTA DE RASTERS DE PREDIÇÃO do Brasil.
#
# O motor de modelagem (04_modeling/utils.r::predict_sdm) projeta o modelo sobre uma
# PASTA DE RASTERS: um arquivo por variável preditora, com o NOME DO ARQUIVO IGUAL ao
# nome da coluna preditora do CSV de treino. Este script junta, numa pasta só, os 10
# rasters do Brasil já existentes + os gerados por `gerar_cache_brasil.py`, cada um
# renomeado EXATAMENTE como a coluna (t2m.tif, e.tif, ...).
#
# Por que nome exato importa: o `predict_sdm` casa preditor↔arquivo por nome exato OU
# por grep; a coluna `e` (evaporação) faria grep em vários nomes. Nomear certinho evita
# ambiguidade.
#
# Custo de disco: usa HARDLINK (os.link) quando a origem está no mesmo volume — não
# duplica os ~6 GB dos rasters estáticos. Se o hardlink falhar (volume diferente),
# cai para cópia. A pasta é COMPARTILHADA por todas as espécies (Brasil inteiro).

from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "env_data" / "raster_cache" / "brasil_250m"
E03 = ROOT / "03_environmental_processing"

# coluna preditora (nome do arquivo de saída, SEM .tif) -> arquivo de origem.
# As 4 primeiras são geradas por gerar_cache_brasil.py (--layers era5,ndvi);
# as demais já existem no projeto.
FONTES: dict[str, Path] = {
    "t2m": CACHE / "t2m_brasil.tif",
    "e": CACHE / "e_brasil.tif",
    "tp": CACHE / "tp_brasil.tif",
    "ndvi": CACHE / "ndvi_brasil.tif",
    "altitude": CACHE / "altitude_brasil_250m.tif",
    "slope": CACHE / "slope_brasil_250m.tif",
    "clay": CACHE / "clay_brasil_250m.tif",
    "awc": CACHE / "awc_brasil_250m.tif",
    "ocup_solo_mapbiomas": E03 / "ocup_solo_mapbiomas_brasil_2024_250m.tif",
    "ocup_solo_worldcover": E03 / "ocup_solo_worldcover_brasil_250m.tif",
}


# Isolated 2026-11-10 run: sample the same annual source layers used by the 17 scenarios.
BASE_CENARIO = ROOT / "env_data" / "predicao_7var_brasil_1km"
for _c in ["t2m", "e", "tp", "ndvi", "altitude", "awc", "ocup_solo_mapbiomas"]:
    FONTES[_c] = BASE_CENARIO / f"{_c}.tif"

def _linkar(origem: Path, destino: Path) -> str:
    """Hardlink origem→destino; cai para cópia se em volumes diferentes. Devolve o modo."""
    if destino.exists():
        return "já existia"
    destino.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(origem, destino)
        return "hardlink"
    except OSError:
        shutil.copy2(origem, destino)
        return "cópia"


def montar(out_dir: Path, colunas: list[str] | None = None) -> tuple[list[str], list[str]]:
    """Monta a pasta. Retorna (prontas, faltando). Não derruba por falta de uma camada:
    monta o que houver e LISTA o que falta (ex.: t2m/ndvi ainda não gerados)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    alvo = colunas or list(FONTES)
    prontas, faltando = [], []
    for col in alvo:
        origem = FONTES.get(col)
        if origem is None:
            print(f"  [?] '{col}': coluna desconhecida (sem fonte mapeada) — pulando.")
            faltando.append(col)
            continue
        if not origem.exists():
            print(f"  [x] {col:22} FALTA a origem: {origem}")
            faltando.append(col)
            continue
        destino = out_dir / f"{col}.tif"
        modo = _linkar(origem, destino)
        mb = origem.stat().st_size / 1e6
        print(f"  [ok] {col:22} <- {origem.name}  ({modo}, {mb:.0f} MB)")
        prontas.append(col)
    return prontas, faltando


def main():
    p = argparse.ArgumentParser(
        description="Monta a pasta de rasters de predição (1 .tif por preditor, nome=coluna).")
    p.add_argument("--out", default=str(ROOT / "env_data" / "predicao_brasil_2015_2024"),
                   help="Pasta de saída (padrão: env_data/predicao_brasil_2015_2024).")
    p.add_argument("--cols", default="", help="Subconjunto de colunas (vírgula). Vazio = todas.")
    args = p.parse_args()
    out_dir = Path(args.out)
    cols = [c.strip() for c in args.cols.split(",") if c.strip()] or None

    print(f"[montar] pasta de predição: {out_dir}")
    prontas, faltando = montar(out_dir, cols)
    print(f"\n[montar] {len(prontas)}/{len(FONTES)} camadas prontas em {out_dir}")
    if faltando:
        print(f"[montar] FALTAM {len(faltando)}: {', '.join(faltando)}")
        print("[montar] Gere as que faltam (clima/ndvi) com:")
        print("         python 03_environmental_processing/gerar_cache_brasil.py "
              "--layers era5,ndvi --anos 2015-2024")
    else:
        print("[montar] pasta COMPLETA — pronta p/ predict_sdm (R).")


if __name__ == "__main__":
    main()
