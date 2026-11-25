#!/usr/bin/env python3
# area_m.py - Construção da Área M por ecorregiões RESOLVE 2017
#
# Responsabilidade ÚNICA deste módulo:
#   -> A partir dos pontos de PRESENÇA de uma espécie e do shapefile RESOLVE
#      Ecoregions 2017, delimitar a "Área M" (área acessível / background
#      ecologicamente plausível do diagrama BAM — Soberón & Peterson, 2005;
#      Barve et al., 2011): a UNIÃO das ecorregiões que contêm ao menos um
#      registro da espécie.
#
# O polígono resultante é o DOMÍNIO INICIAL para a geração de pseudo-ausências.
# Ele NÃO substitui as restrições já existentes no gerador (distância mínima às
# presenças / máscara oceânica): estas continuam sendo aplicadas por cima, de
# modo que a área efetiva de amostragem é a INTERSEÇÃO entre a Área M e os
# filtros atuais.
#
# Desempenho (pensado para milhares de espécies):
#   - Um único `sjoin` vetorizado usa o índice espacial (STRtree) do GeoPandas
#     para descobrir, sem loops, quais ecorregiões contêm presenças.
#   - `dissolve`/`union_all` faz a fusão das geometrias selecionadas de uma vez.
#   - O shapefile pode ser carregado uma vez e reaproveitado entre espécies.
#
# Robustez:
#   - Reprojeção/atribuição de CRS quando ausente (assume EPSG:4326 nas presenças).
#   - Reparo de geometrias inválidas (`make_valid`, com fallback `buffer(0)`).
#   - Espécie sem registros ou sem ecorregião correspondente -> exceção clara
#     (`NoEcoregionMatch`), que o chamador pode tratar (ex.: cair no bbox global).
#   - `pathlib.Path` em todos os caminhos (Windows/WSL/Linux).

from __future__ import annotations

from pathlib import Path
from typing import Optional, Union

import geopandas as gpd
from shapely.geometry.base import BaseGeometry

# CRS de trabalho padrão do pipeline (lon/lat WGS84).
WGS84 = "EPSG:4326"

# CRS equidistante mundial (metros) usado apenas para aplicar o buffer em km de
# forma aproximadamente métrica; o resultado é reprojetado de volta a WGS84.
# EPSG:4087 (World Equidistant Cylindrical) preserva distâncias ao longo dos
# meridianos — aproximação adequada para um buffer de dezenas/centenas de km em
# escala global. Não é uma medida geodésica exata (limitação documentada).
EQUIDISTANT_CRS = "EPSG:4087"

PathLike = Union[str, Path]


class NoEcoregionMatch(RuntimeError):
    """
    Nenhuma ecorregião RESOLVE contém registros da espécie.

    Sinaliza ao chamador que a Área M não pôde ser construída (espécie sem
    registros válidos ou pontos fora de qualquer polígono RESOLVE). O gerador
    pode então recorrer ao comportamento anterior (bbox global) com um aviso.
    """


def load_resolve(shapefile_path: PathLike) -> gpd.GeoDataFrame:
    """
    Carrega o shapefile RESOLVE Ecoregions 2017 em WGS84.

    Parâmetros:
        shapefile_path: caminho do `.shp` (tipicamente vindo de
            `resolve_ecoregions.download_resolve()`).

    Retorna:
        GeoDataFrame das ecorregiões, garantidamente em EPSG:4326.

    Lança:
        FileNotFoundError: se o shapefile não existir.
    """
    path = Path(shapefile_path)
    if not path.exists():
        raise FileNotFoundError(f"Shapefile RESOLVE não encontrado: {path}")

    gdf = gpd.read_file(path)
    if gdf.crs is None:
        # RESOLVE 2017 é distribuído em WGS84; assume-o quando o CRS vier vazio.
        gdf = gdf.set_crs(WGS84)
    elif gdf.crs.to_string() != WGS84:
        gdf = gdf.to_crs(WGS84)
    return gdf


def _repair_geometries(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Repara geometrias inválidas de forma vetorizada.

    Usa `make_valid` (Shapely >= 2 / GEOS) quando disponível e cai para o
    idioma clássico `buffer(0)`. Descarta geometrias nulas/vazias remanescentes.
    """
    geom = gdf.geometry
    invalid = ~geom.is_valid
    if invalid.any():
        try:
            gdf = gdf.copy()
            gdf.loc[invalid, gdf.geometry.name] = geom[invalid].make_valid()
        except AttributeError:  # GeoPandas/Shapely antigos sem make_valid
            gdf = gdf.copy()
            gdf.loc[invalid, gdf.geometry.name] = geom[invalid].buffer(0)
    return gdf[~gdf.geometry.is_empty & gdf.geometry.notna()]


def _presences_to_gdf(occurrences: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Normaliza as presenças para um GeoDataFrame de pontos em WGS84.

    Aceita um GeoDataFrame já pronto (com geometria) ou o converte a partir das
    colunas `decimalLongitude`/`decimalLatitude`. Remove linhas sem coordenada.
    """
    if isinstance(occurrences, gpd.GeoDataFrame) and occurrences.geometry is not None:
        gdf = occurrences
        if gdf.crs is None:
            gdf = gdf.set_crs(WGS84)
        elif gdf.crs.to_string() != WGS84:
            gdf = gdf.to_crs(WGS84)
        gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]
        return gdf

    # Fallback: construir a partir das colunas de coordenadas.
    cols = {"decimalLongitude", "decimalLatitude"}
    if not cols.issubset(occurrences.columns):
        raise ValueError(
            "Presenças precisam de geometria ou das colunas "
            "'decimalLongitude'/'decimalLatitude'."
        )
    df = occurrences.dropna(subset=["decimalLongitude", "decimalLatitude"])
    return gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df["decimalLongitude"], df["decimalLatitude"]),
        crs=WGS84,
    )


def select_ecoregions_with_presences(
    presences: gpd.GeoDataFrame,
    resolve: gpd.GeoDataFrame,
    min_presences: int = 1,
) -> gpd.GeoDataFrame:
    """
    Seleciona as ecorregiões que contêm PRESENÇAS SUFICIENTES da espécie.

    Faz um `sjoin` espacial (predicado `within`) que, por baixo, usa o índice
    espacial do GeoPandas — operação vetorizada, sem loops ponto-a-ponto. Ideal
    para reaproveitar o mesmo `resolve` entre milhares de espécies.

    `min_presences` (default 1 = comportamento original) exige um número MÍNIMO de
    presenças por ecorregião para que ela entre na Área M. Isso evita que 1-2
    registros misidentificados (ex.: bugio rotulado como caraya na Amazônia) arrastem
    uma ecorregião INTEIRA (gigante) para a Área M, inflando a área de amostragem e
    contaminando o modelo. Se o corte remover TODAS as ecorregiões (dataset pequeno),
    cai de volta para todas as que têm ≥1 presença (degradação segura).

    Parâmetros:
        presences: GeoDataFrame de pontos de presença (EPSG:4326).
        resolve: GeoDataFrame das ecorregiões RESOLVE (EPSG:4326).
        min_presences: nº mínimo de presenças para a ecorregião entrar (≥1).

    Retorna:
        Subconjunto de `resolve` com as ecorregiões selecionadas (sem duplicatas).

    Lança:
        NoEcoregionMatch: se nenhuma ecorregião contiver presenças.
    """
    if presences.empty:
        raise NoEcoregionMatch("Espécie sem registros de presença válidos.")

    # sjoin points-in-polygons: cada presença ganha o índice da ecorregião que a
    # contém. `predicate="within"` explora o STRtree do lado direito (resolve).
    joined = gpd.sjoin(
        presences[[presences.geometry.name]],
        resolve,
        how="inner",
        predicate="within",
    )
    if joined.empty:
        raise NoEcoregionMatch(
            "Nenhuma ecorregião RESOLVE contém os pontos de presença "
            "(registros possivelmente no mar/fora da cobertura terrestre)."
        )

    counts = joined["index_right"].value_counts()  # presenças por ecorregião
    if min_presences > 1:
        kept = counts[counts >= min_presences].index
        if len(kept) == 0:  # corte removeu tudo → fallback: mantém todas as com match
            kept = counts.index
    else:
        kept = counts.index
    return resolve.loc[kept]


def resolve_min_presences(n_presences: int, fraction: float, floor: int) -> int:
    """
    Converte a porcentagem ADAPTATIVA em nº mínimo de presenças por ecorregião.

    `fraction` (ex.: 0.005 = 0,5%) escala com o tamanho do dataset da espécie — mais
    robusto que um número fixo, dada a enorme variação de nº de registros entre
    espécies. `floor` é um piso pequeno (protege espécies com poucos dados). Ex.:
    caraya (2527 presenças, 0,5%) → máx(2, ceil(12.6)) = 13.
    """
    import math
    return max(int(floor), math.ceil(fraction * max(n_presences, 0)))


def build_area_m(
    occurrences: gpd.GeoDataFrame,
    resolve: Union[gpd.GeoDataFrame, PathLike],
    buffer_km: float = 0.0,
    min_presence_fraction: float = 0.0,
    min_presence_floor: int = 2,
    max_dist_km: float = 0.0,
    return_selected: bool = False,
) -> BaseGeometry:
    """
    Constrói a Área M: união das ecorregiões que contêm presenças da espécie,
    RECORTADA por um raio de dispersão plausível em torno das presenças.

    Etapas:
        1. Normaliza as presenças para pontos em EPSG:4326.
        2. Carrega/valida as ecorregiões RESOLVE (repara geometrias inválidas).
        3. `sjoin` vetorizado -> ecorregiões que contêm ≥1 presença.
        4. `dissolve`/union -> um único polígono (multipolígono).
        5. (Opcional) RECORTE por `max_dist_km`: interseção com o buffer das
           presenças. VER A NOTA ABAIXO — é o que impede a Área M de inchar.
        6. (Opcional) buffer ajustável de `buffer_km` em torno da Área M.

    POR QUE O RECORTE POR DISTÂNCIA (`max_dist_km`) EXISTE — medido em 2026-07-14:
        As ecorregiões RESOLVE são GROSSAS. A ecorregião "Cerrado" tem ~2 milhões de
        km² e vai de São Paulo ao Maranhão. Basta a espécie encostar na borda sul dela
        para o CERRADO INTEIRO virar Área M — e as pseudoausências passam a ser
        sorteadas no Piauí. Medido nas 3 espécies de primatas: metade das pseudo do
        `Alouatta guariba` e do `Sapajus nigritus` caía a MAIS DE 200 km de qualquer
        presença; 8,6% das do nigritus, a mais de 1.000 km.

        Isso ARRUÍNA o SDM: uma pseudoausência a 1.400 km está num clima
        completamente diferente e é separada TRIVIALMENTE das presenças. O AUC infla,
        e o modelo aprende "Mata Atlântica vs Cerrado" em vez de "que habitat a
        espécie usa DENTRO da área que ela alcança" — que é a pergunta.

        O filtro `min_presence_fraction` NÃO resolve: a espécie realmente tem >0,5%
        das presenças no Cerrado. O problema não é ruído, é a ESCALA do polígono.

        O recorte mantém a lógica ecológica (só ecorregiões que ela ocupa) e acrescenta
        o limite de PLAUSIBILIDADE DE DISPERSÃO — um bugio não coloniza 1.400 km.

    Parâmetros:
        occurrences: presenças (GeoDataFrame com geometria OU DataFrame com
            colunas `decimalLongitude`/`decimalLatitude`).
        resolve: GeoDataFrame já carregado das ecorregiões OU caminho do `.shp`
            (será carregado com `load_resolve`).
        buffer_km: raio (km) para dilatar a Área M. 0 = sem buffer. Permite
            relaxar as fronteiras (rígidas) das ecorregiões de forma
            parametrizável, sem valores fixos embutidos.
        min_presence_fraction: fração ADAPTATIVA (ex.: 0.005 = 0,5%) do total de
            presenças que uma ecorregião precisa conter para entrar na Área M.
            0 (padrão) = sem filtro (compatível). Escala com o dataset de cada
            espécie — evita que 1-2 registros misidentificados arrastem uma
            ecorregião inteira (ver select_ecoregions_with_presences).
        min_presence_floor: piso absoluto do mínimo de presenças (protege espécies
            com poucos registros, onde a fração daria <2).
        max_dist_km: RECORTE. A Área M é intersectada com o buffer de `max_dist_km`
            em torno das PRESENÇAS. 0 = sem recorte (comportamento antigo).

    Retorna:
        Geometria Shapely (Polygon/MultiPolygon) em EPSG:4326 representando a
        Área M — pronta para restringir a geração de pseudo-ausências.

    Lança:
        NoEcoregionMatch: espécie sem registros ou sem ecorregião correspondente.
        ValueError: `buffer_km` ou `max_dist_km` negativo.
    """
    if buffer_km < 0:
        raise ValueError("buffer_km não pode ser negativo.")
    if max_dist_km < 0:
        raise ValueError("max_dist_km não pode ser negativo.")

    presences = _presences_to_gdf(occurrences)

    resolve_gdf = resolve if isinstance(resolve, gpd.GeoDataFrame) else load_resolve(resolve)
    resolve_gdf = _repair_geometries(resolve_gdf)

    # Mínimo ADAPTATIVO de presenças por ecorregião (fraction=0 → sem filtro, compat.).
    min_presences = (resolve_min_presences(len(presences), min_presence_fraction,
                                           min_presence_floor)
                     if min_presence_fraction > 0 else 1)
    selected = select_ecoregions_with_presences(presences, resolve_gdf, min_presences)

    # Fusão vetorizada das ecorregiões selecionadas num único polígono.
    try:
        area_m = selected.geometry.union_all()  # GeoPandas >= 0.14
    except AttributeError:
        area_m = selected.geometry.unary_union   # compat. versões antigas

    # Reparo final defensivo (a união pode gerar micro-invalidez).
    if not area_m.is_valid:
        area_m = area_m.buffer(0)

    # RECORTE POR DISTÂNCIA ÀS PRESENÇAS (ver a nota extensa no docstring).
    # Sem isto, uma ecorregião gigante (Cerrado) arrasta a Área M por 1.400 km.
    if max_dist_km > 0:
        # ÂNCORA DO BUFFER = só as presenças DENTRO das ecorregiões SELECIONADas.
        # POR QUÊ (medido no A. caraya, 2026-07-15): uma presença numa ecorregião
        # DESCARTADA pelo min_presence_fraction (tipicamente misID — ex.: 10 registros
        # de caraya na Caatinga, cujo bioma real é Chaco/Cerrado) SERÁ REMOVIDA do
        # conjunto pelo gen_pseudo. Mas se o buffer for ancorado nela, seus 200 km
        # entram na ecorregião VIZINHA selecionada (Cerrado), mantendo o Piauí na
        # Área M; ali caem pseudoausências que, removida a presença-âncora, ficam
        # ÓRFÃS a ~650 km da presença mais próxima que RESTA — exatamente o que o
        # recorte deveria impedir. Ancorar só nas presenças que PERMANECEM (dentro das
        # ecorregiões selecionadas) fecha esse vazamento. (Toda presença mantida está
        # sempre dentro do seu próprio buffer, então nenhuma é perdida por isto.)
        dentro = presences.geometry.intersects(area_m).to_numpy()
        ancoras = presences.geometry[dentro] if dentro.any() else presences.geometry
        alcance = (ancoras.to_crs(EQUIDISTANT_CRS)
                   .buffer(max_dist_km * 1000.0).union_all())
        alcance = gpd.GeoSeries([alcance], crs=EQUIDISTANT_CRS).to_crs(WGS84).iloc[0]
        area_m = area_m.intersection(alcance)
        if not area_m.is_valid:
            area_m = area_m.buffer(0)
        if area_m.is_empty:
            raise NoEcoregionMatch(
                f"Área M vazia após o recorte de max_dist_km={max_dist_km} km.")

    if buffer_km > 0:
        # Buffer em CRS métrico equidistante e volta a WGS84 (aproximação global).
        gs = gpd.GeoSeries([area_m], crs=WGS84).to_crs(EQUIDISTANT_CRS)
        gs = gs.buffer(buffer_km * 1000.0)
        area_m = gs.to_crs(WGS84).iloc[0]

    if area_m.is_empty:
        raise NoEcoregionMatch("Área M resultante vazia após dissolve/buffer.")

    # `return_selected` devolve também as ecorregiões INDIVIDUAIS selecionadas
    # (antes do dissolve) — usado para DESTACÁ-LAS no mapa de presença/ausência.
    if return_selected:
        return area_m, selected
    return area_m
