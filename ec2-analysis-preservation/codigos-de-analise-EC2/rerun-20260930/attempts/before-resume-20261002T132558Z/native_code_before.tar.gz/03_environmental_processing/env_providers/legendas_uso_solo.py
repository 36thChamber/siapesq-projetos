#!/usr/bin/env python3
# legendas_uso_solo.py — LEGENDAS OFICIAIS de Uso e Ocupação do Solo (código → classe).
#
# Componente reutilizável para SEMPRE apresentar a CATEGORIA (nome da classe), não só
# o código numérico. Usado pelo QC (laudo) e pela captura (colunas `*_classe`).
#
# Fontes oficiais:
#   - MapBiomas Brasil — Coleção 9 (a base do projeto é 2024):
#     brasil.mapbiomas.org/wp-content/uploads/sites/4/2024/08/Legenda-Colecao-9-LEGEND-CODE.pdf
#   - ESA WorldCover v100/v200 (2020/2021), 11 classes (10–100):
#     esa-worldcover.org · developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v200

from __future__ import annotations

# --- MapBiomas Coleção 9 (código de pixel → nome da classe, em PT) ---------------
MAPBIOMAS: dict[int, str] = {
    0: "Sem dado (fora do Brasil)",
    1: "Floresta", 3: "Formação Florestal", 4: "Formação Savânica", 5: "Mangue",
    6: "Floresta Alagável", 49: "Restinga Arbórea",
    10: "Vegetação Herbácea e Arbustiva", 11: "Campo Alagado e Área Pantanosa",
    12: "Formação Campestre", 32: "Apicum", 29: "Afloramento Rochoso",
    50: "Restinga Herbácea",
    14: "Agropecuária", 15: "Pastagem", 18: "Agricultura",
    19: "Lavoura Temporária", 39: "Soja", 20: "Cana", 40: "Arroz",
    62: "Algodão (beta)", 41: "Outras Lavouras Temporárias",
    36: "Lavoura Perene", 46: "Café", 47: "Citrus", 35: "Dendê",
    48: "Outras Lavouras Perenes", 9: "Silvicultura", 21: "Mosaico de Usos",
    22: "Área não Vegetada", 23: "Praia, Duna e Areal", 24: "Área Urbanizada",
    30: "Mineração", 25: "Outras Áreas não Vegetadas",
    26: "Corpo D'água", 33: "Rio, Lago e Oceano", 31: "Aquicultura",
    27: "Não observado",
}

# --- ESA WorldCover (código de pixel → nome da classe, em PT) --------------------
WORLDCOVER: dict[int, str] = {
    10: "Cobertura arbórea (floresta/árvores)",
    20: "Vegetação arbustiva",
    30: "Vegetação herbácea (campos)",
    40: "Agricultura",
    50: "Área construída",
    60: "Solo exposto / vegetação esparsa",
    70: "Neve e gelo",
    80: "Corpos d'água permanentes",
    90: "Área úmida herbácea (banhado)",
    95: "Manguezal",
    100: "Musgos e líquens",
}

_FONTE = {
    "mapbiomas": "MapBiomas Brasil — Coleção 9",
    "worldcover": "ESA WorldCover (11 classes, 10–100)",
}


def _legenda_da_coluna(coluna: str) -> dict[int, str] | None:
    c = coluna.lower()
    if "worldcover" in c:
        return WORLDCOVER
    if "mapbiomas" in c or "uso_solo" in c:
        return MAPBIOMAS
    return None


def legenda_da_coluna(coluna: str) -> dict[int, str] | None:
    """Legenda completa (código → nome) da coluna de uso do solo, ou None."""
    return _legenda_da_coluna(coluna)


def nome_classe(coluna: str, codigo) -> str:
    """Nome da classe para um código, escolhendo a legenda pela coluna. Código
    desconhecido/NaN → rótulo genérico (nunca quebra)."""
    leg = _legenda_da_coluna(coluna)
    if leg is None or codigo is None:
        return ""
    try:
        code = int(round(float(codigo)))
    except (TypeError, ValueError):
        return ""
    return leg.get(code, f"Classe {code}")


def rotulo(coluna: str, codigo) -> str:
    """'código — Nome da classe' (ou só o código se não houver legenda)."""
    nome = nome_classe(coluna, codigo)
    try:
        code = int(round(float(codigo)))
    except (TypeError, ValueError):
        return str(codigo)
    return f"{code} — {nome}" if nome else str(code)


def fonte_da_coluna(coluna: str) -> str | None:
    c = coluna.lower()
    if "worldcover" in c:
        return _FONTE["worldcover"]
    if "mapbiomas" in c or "uso_solo" in c:
        return _FONTE["mapbiomas"]
    return None
