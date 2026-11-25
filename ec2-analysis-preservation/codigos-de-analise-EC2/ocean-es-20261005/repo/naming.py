#!/usr/bin/env python3
# naming.py — FONTE ÚNICA DA VERDADE dos nomes de arquivo de saída do pipeline.
#
# CONVENÇÃO (definida com o usuário em 14/07/2026):
#
#       <Tipo>_<Genero_especie>_<DD_MM_AA>.<ext>
#
#   Occurrence_Sapajus_nigritus_13_07_26.csv       ocorrências limpas (etapa 1)
#   OccurrenceReport_Sapajus_nigritus_13_07_26.json
#   Pseudoabsence_Sapajus_nigritus_13_07_26.csv    presenças + pseudo (etapa 2)
#   Map_Sapajus_nigritus_13_07_26.png              mapa presença/pseudo (etapa 2)
#   Variables_Sapajus_nigritus_13_07_26.csv        CSV de modelagem (etapa 3)
#   QA_Sapajus_nigritus_13_07_26.txt               relatório de preenchimento (etapa 3)
#   LandUse_Sapajus_nigritus_13_07_26.txt/.json    uso e ocupação do solo (etapa 3)
#   QC_Sapajus_nigritus_13_07_26.html/.json/.md    laudo do QC ambiental (etapa 4)
#
# POR QUE ISSO EXISTE: antes, cada etapa montava o nome do seu jeito. A captura tirava o
# nome da PASTA — que é a data — e o CSV de variáveis saía como `2026_07_13_variables.csv`,
# SEM A ESPÉCIE. Ao juntar arquivos de espécies diferentes, era impossível saber de quem
# era qual (o usuário teve que renomeá-los à mão). Agora a regra mora AQUI, e só aqui.
#
# A DATA é a da PASTA DA RODADA (`07 Executado por espécie/<Especie>/2026-07-13/`), não a
# de "hoje": uma rodada que atravessa a meia-noite — o que já aconteceu — geraria arquivos
# com carimbos diferentes, e o carimbo passaria a atrapalhar em vez de rastrear.

from __future__ import annotations

import re
from datetime import date
from pathlib import Path

# Nome canônico de cada tipo de saída. Alterar AQUI muda em todo o pipeline.
TIPOS = {
    "occurrence": "Occurrence",
    "occurrence_report": "OccurrenceReport",
    "pseudoabsence": "Pseudoabsence",
    "map": "Map",
    "variables": "Variables",
    "variables_climatologico": "VariablesClimatologico",
    "variables_sazonal": "VariablesSazonal",
    "points": "Points",
    "checkpoint": "VariablesCache",
    "qa": "QA",
    "landuse": "LandUse",
    "qc": "QC",
}

_RE_DATA = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")


def slug_especie(especie: str) -> str:
    """'Sapajus nigritus' -> 'Sapajus_nigritus' (seguro para nome de arquivo)."""
    s = re.sub(r"[^A-Za-z0-9]+", "_", especie.strip()).strip("_")
    return s or "especie"


def carimbo(pasta: Path | str | None = None) -> str:
    """
    Carimbo DD_MM_AA. Vem da PASTA da rodada quando ela é datada
    (`.../<Especie>/2026-07-13/` -> `13_07_26`); senão, cai na data de hoje.
    """
    if pasta is not None:
        m = _RE_DATA.match(Path(pasta).name)
        if m:
            ano, mes, dia = m.groups()
            return f"{dia}_{mes}_{ano[2:]}"
    return date.today().strftime("%d_%m_%y")


def especie_da_pasta(pasta: Path | str) -> str:
    """
    Espécie a partir da pasta de saída. Se a pasta for datada
    (`07/<Especie>/2026-07-13/`), a espécie é a PASTA-MÃE. Senão, é a própria.
    """
    p = Path(pasta)
    return slug_especie(p.parent.name if _RE_DATA.match(p.name) else p.name)


def nome(tipo: str, especie: str, pasta: Path | str | None, ext: str) -> str:
    """
    Nome de arquivo na convenção do projeto.

        nome("variables", "Sapajus nigritus", pasta, "csv")
        -> "Variables_Sapajus_nigritus_13_07_26.csv"
    """
    if tipo not in TIPOS:
        raise ValueError(f"tipo de saída desconhecido: {tipo!r} (use um de {sorted(TIPOS)})")
    ext = ext.lstrip(".")
    return f"{TIPOS[tipo]}_{slug_especie(especie)}_{carimbo(pasta)}.{ext}"


def caminho(tipo: str, especie: str, pasta: Path | str, ext: str) -> Path:
    """`nome()` já resolvido dentro de `pasta`."""
    return Path(pasta) / nome(tipo, especie, pasta, ext)


# ---------------------------------------------------------------------------
# LOCALIZAR arquivos de uma etapa anterior. As etapas precisam ENCONTRAR o que a
# anterior gravou — e precisam continuar achando os arquivos ANTIGOS (nomes legados),
# senão uma rodada retomada com `--start captura` não enxergaria o que já existe.
# ---------------------------------------------------------------------------
_LEGADO = {
    "occurrence": ["*_occurrences.csv"],          # <Especie>_occurrences.csv
    "pseudoabsence": ["sp_*_occurrences.csv"],    # sp_<Especie>_occurrences.csv
    "variables": ["*_variables.csv"],             # <token>_variables.csv
}


def achar(tipo: str, pasta: Path | str, recursivo: bool = False) -> Path | None:
    """
    O arquivo de `tipo` em `pasta` — no nome NOVO ou em qualquer nome LEGADO.
    Havendo mais de um, devolve o MAIS RECENTE (e o chamador deve avisar qual usou).
    None se não achar.
    """
    p = Path(pasta)
    padroes = [f"{TIPOS[tipo]}_*"] + _LEGADO.get(tipo, [])
    achados: list[Path] = []
    for pad in padroes:
        achados += list(p.rglob(pad) if recursivo else p.glob(pad))

    # `occurrence` e `pseudoabsence` colidem no legado: `sp_X_occurrences.csv` casa com
    # `*_occurrences.csv`. Desambigua explicitamente.
    if tipo == "occurrence":
        achados = [a for a in achados
                   if not a.name.startswith("sp_")
                   and not a.name.startswith(TIPOS["pseudoabsence"])]
    achados = [a for a in achados if a.is_file()]
    if not achados:
        return None
    return max(achados, key=lambda a: a.stat().st_mtime)
