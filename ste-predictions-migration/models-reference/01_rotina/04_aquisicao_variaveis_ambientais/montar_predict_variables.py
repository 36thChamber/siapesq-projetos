#!/usr/bin/env python3
# montar_predict_variables.py — Monta a pasta "predict variables/" com os 17 CENÁRIOS.
#
# O motor de predição (`04_modeling/utils.r::predict_sdm`) projeta o modelo sobre uma PASTA
# DE RASTERS: um arquivo por preditor, com o NOME DO ARQUIVO IGUAL ao da coluna do CSV de
# treino. Logo, CADA cenário precisa da sua própria pasta com os 7 arquivos.
#
# OS 17 CENÁRIOS
#   anual_2015_2024        1  já validado (média dos 10 anos)
#   mensal_01..12         12  clima e NDVI variam por mês; altitude/awc/uso do solo fixos
#   futuro_{2050,2100}_{ssp245,ssp585}
#                          4  clima do CMIP6 (método delta); NDVI e uso do solo CONGELADOS
#                             no valor de hoje — não existe projeção deles para o Brasil.
#
# DISCO: as camadas que NÃO mudam entre cenários entram por HARDLINK (os.link). Aparecem nas
# 17 pastas ocupando UMA cópia só. Se o hardlink falhar (volume diferente), cai para cópia.
#
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe 03_environmental_processing/montar_predict_variables.py
#   .venv/Scripts/python.exe 03_environmental_processing/montar_predict_variables.py --grupos mensal

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SAIDA = ROOT / "02_dados_entrada" / "variaveis_predicao" / "nacional"

# Fontes por tipo de camada.
BASE_ANUAL = ROOT / "02_dados_entrada" / "ambientais" / "predicao_7var_brasil_1km"   # os 7 do cenário anual
MENSAL = ROOT / "02_dados_entrada" / "ambientais" / "raster_cache" / "mensal"        # {var}_{MM}.tif
FUTURO = ROOT / "02_dados_entrada" / "ambientais" / "raster_cache" / "futuro"        # {var}_{janela}_{exp}.tif

# As colunas preditoras (nome do arquivo = nome da coluna). As DUAS fontes de uso do
# solo entram nas pastas: mapbiomas (modelo climatológico, só-Brasil) e worldcover
# (modelo SAZONAL, área com vizinhos). O motor (`utils.r::predict_sdm`) seleciona as
# camadas pelos preditores DO MODELO, então a camada extra é inofensiva.
PREDITORES = ["t2m", "e", "tp", "ndvi", "altitude", "awc",
              "ocup_solo_mapbiomas", "ocup_solo_worldcover"]
# Não mudam em NENHUM cenário: vêm sempre da pasta anual, por hardlink.
ESTATICAS = ["altitude", "awc", "ocup_solo_mapbiomas", "ocup_solo_worldcover"]
# Amplitudes sazonais do lugar (mes max - mes min 2015-2024; gerar_amplitudes_sazonais.py):
# ESTATICAS em todos os cenários, mas moram no cache MENSAL, não na pasta anual.
AMPLITUDES = ["t2m_amp", "e_amp", "tp_amp", "ndvi_amp"]
# Variam por mês nos cenários mensais.
DINAMICAS_MENSAIS = ["t2m", "e", "tp", "ndvi"]
# Variam nos cenários futuros (o NDVI fica congelado — decisão registrada no relatório).
DINAMICAS_FUTURAS = ["t2m", "e", "tp"]

NOMES_MES = ["", "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
             "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
JANELAS_FUT = ["2050", "2100"]
EXPERIMENTOS = ["ssp245", "ssp585"]


def _p(m: str = "") -> None:
    print(m, flush=True)


def _linkar(origem: Path, destino: Path, forcar: bool) -> str:
    """Hardlink origem→destino; cai para cópia se em volumes diferentes."""
    if destino.exists():
        if not forcar:
            return "já existia"
        destino.unlink()
    destino.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(origem, destino)
        return "hardlink"
    except OSError:
        shutil.copy2(origem, destino)
        return "cópia"


def _plano() -> dict[str, dict[str, Path]]:
    """Monta o plano completo: cenário -> {coluna preditora: arquivo de origem}."""
    plano: dict[str, dict[str, Path]] = {}

    amps = {c: MENSAL / f"{c}.tif" for c in AMPLITUDES}

    # (1) ANUAL — os arquivos base já existem prontos na pasta de predição atual.
    plano["anual_2015_2024"] = {c: BASE_ANUAL / f"{c}.tif" for c in PREDITORES} | amps

    # (2) MENSAIS — clima e NDVI do mês; o resto, estático.
    for m in range(1, 13):
        cen = f"mensal_{m:02d}_{NOMES_MES[m]}"
        fontes = {c: MENSAL / f"{c}_{m:02d}.tif" for c in DINAMICAS_MENSAIS}
        fontes.update({c: BASE_ANUAL / f"{c}.tif" for c in ESTATICAS})
        plano[cen] = fontes | amps

    # (3) FUTUROS — clima do CMIP6; NDVI e uso do solo CONGELADOS no valor de hoje.
    for jan in JANELAS_FUT:
        for exp in EXPERIMENTOS:
            cen = f"futuro_{jan}_{exp}"
            fontes = {c: FUTURO / f"{c}_{jan}_{exp}.tif" for c in DINAMICAS_FUTURAS}
            fontes["ndvi"] = BASE_ANUAL / "ndvi.tif"        # congelado (decisão registrada)
            fontes.update({c: BASE_ANUAL / f"{c}.tif" for c in ESTATICAS})
            plano[cen] = fontes | amps
    return plano


def montar(out_dir: Path, grupos: list[str], forcar: bool) -> tuple[list[str], list[str]]:
    """Monta as pastas dos cenários pedidos. NÃO derruba por falta de camada: monta o que
    houver e LISTA o que falta (o NDVI mensal e o CMIP6 chegam em tempos diferentes)."""
    plano = _plano()
    prontos, incompletos = [], []
    for cen, fontes in plano.items():
        grupo = cen.split("_")[0]
        if grupos and grupo not in grupos:
            continue
        destino_dir = out_dir / cen
        faltando = [c for c, src in fontes.items() if not src.exists()]
        if faltando:
            incompletos.append(cen)
            _p(f"  [x] {cen:26} FALTAM: {', '.join(faltando)}")
            continue
        for col, src in fontes.items():
            _linkar(src, destino_dir / f"{col}.tif", forcar)
        prontos.append(cen)
        _p(f"  [ok] {cen:26} {len(fontes)} camadas")
    return prontos, incompletos


def main() -> None:
    p = argparse.ArgumentParser(
        description="Monta 'predict variables/' com os 17 cenários de predição.")
    p.add_argument("--out", default=str(SAIDA))
    p.add_argument("--grupos", default="",
                   help="Subconjunto: anual, mensal, futuro (vírgula). Vazio = todos.")
    p.add_argument("--forcar", action="store_true",
                   help="Refaz os links mesmo onde o arquivo de destino já existe.")
    a = p.parse_args()

    out_dir = Path(a.out)
    grupos = [g.strip() for g in a.grupos.split(",") if g.strip()]
    _p(f"[montar] saída: {out_dir}")
    _p(f"[montar] grupos: {grupos or 'todos (anual, mensal, futuro)'}")
    _p("")
    prontos, incompletos = montar(out_dir, grupos, a.forcar)
    _p("")
    _p(f"[montar] {len(prontos)} cenário(s) prontos, {len(incompletos)} incompletos.")
    if incompletos:
        _p("[montar] os incompletos dependem de etapas que ainda não terminaram:")
        _p("[montar]   mensal_* -> 03_environmental_processing/gerar_cenarios_mensais.py")
        _p("[montar]   futuro_* -> 03_environmental_processing/gerar_cenarios_futuros.py")
    return 0 if not incompletos else 0


if __name__ == "__main__":
    sys.exit(main())
