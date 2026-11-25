#!/usr/bin/env python3
# gen_pseudo_occurences.py — GERA PSEUDO-AUSÊNCIAS (sp=0) a partir de um CSV de presenças.
#
# POR QUE: os modelos (RF etc.) precisam de exemplos de "ausência"; como não há ausência
# verdadeira, sorteamos pontos de fundo respeitando restrições ecológicas/geográficas:
#   - raio mínimo das presenças (--radius_km, default 10 km);
#   - Área M por ecorregiões RESOLVE 2017 (--use_ecoregions), recortada a
#     --area_max_dist_km (~200 km) das presenças p/ não inflar o AUC;
#   - opcionais: recorte ao polígono do Brasil (--clip_brasil), bbox de sorteio (--bbox),
#     modo marinho (--ocean_only + batimetria + --depth_min/--depth_max),
#     proporção pseudo:presença (--ratio, default 1:1).
# Amostragem equal-area em latitude; reprodutível via --seed (semente sempre impressa).
# Cada pseudo-ausência herda year/month/day/species de uma presença sorteada (proveniência).
#
# USO (da raiz):
#   .venv\Scripts\python.exe 02_pseudoabsence\gen_pseudo_occurences.py ^
#       --csv "07 Executado por espécie\Alouatta_caraya\<data>\Occurrences_Alouatta_caraya_10_08_26.csv" ^
#       --species_name Alouatta_caraya --use_ecoregions --seed 42
#
# SAÍDAS (na MESMA pasta do CSV de entrada, convenção naming.py):
#   - Pseudoabsence_<Genero_especie>_<DD_MM_AA>.csv  (presenças sp=1 + pseudo sp=0)
#   - Map_<Genero_especie>_<DD_MM_AA>.png            (mapa SEMPRE gerado; nunca derruba a rodada)
import pandas as pd
import geopandas as gpd
import xarray as xr
from shapely.geometry import Point
from shapely.prepared import prep
import numpy as np
import argparse
import os
import warnings

from radius_checker_utils import outside_radius_mask, haversine_min_km


def min_distance_between_sp1_and_sp0(df):
    """Menor distância presença×pseudoausência (haversine VETORIZADO)."""
    sp1 = df[df["sp"] == 1][["decimalLatitude", "decimalLongitude"]].to_numpy()
    sp0 = df[df["sp"] == 0][["decimalLatitude", "decimalLongitude"]].to_numpy()
    if len(sp0) == 0 or len(sp1) == 0:
        print("Menor distância entre pseudo-ausência e presença: n/d (conjunto vazio)")
        return
    md = float(haversine_min_km(sp0, sp1).min())
    print(f"Menor distância entre pseudo-ausência e presença: {md:.2f} km")


def generate_pseudo_absences(df: pd.DataFrame,
                             gdf: gpd.GeoDataFrame,
                             num_absences: int,
                             ocean_only: bool,
                             bathy_var: xr.DataArray,
                             bbox: list,
                             sp1_points,
                             radius_km: int,
                             number_final_df: int,
                             area_m=None,
                             depth_min=None,
                             depth_max=None,
                             rng=None,
                            ) -> pd.DataFrame:
    """
    Gera pseudo-ausências (sp = 0) com base em pontos de presença, garantindo
    distância mínima e (opcionalmente) presença em regiões oceânicas.

    Parâmetros:
        df: DataFrame com os dados originais de presença
        gdf: GeoDataFrame com os pontos de presença e geometria
        num_absences: número de pseudo-ausências a serem geradas
        ocean_only: se True, apenas regiões oceânicas serão consideradas
        bathy_var: DataArray com a profundidade (batimetria)
        bbox: limites [lon_min, lat_min, lon_max, lat_max] para gerar pontos aleatórios
        sp1_points: coordenadas [lat, lon] dos pontos de presença
        radius_km: distância mínima (km) entre ausências e presenças
        area_m: (opcional) geometria Shapely da Área M (união das ecorregiões
            RESOLVE com presenças). Quando informada, os pontos sorteados também
            precisam cair DENTRO dela — restrição aplicada POR CIMA das demais
            (raio/oceano), preservando toda a metodologia existente. Se None
            (padrão), o comportamento é idêntico ao original.

    Retorna:
        DataFrame com os pontos gerados de pseudo-ausência
    """
    rng = rng if rng is not None else np.random.default_rng()

    # Geometria "preparada" p/ testes ponto-em-polígono O(1)~amortizado (Área M).
    area_m_prep = prep(area_m) if area_m is not None else None

    presencas = df[df["sp"] == 1].reset_index(drop=True)
    meta_pool = (presencas[["year", "month", "day", "species"]].to_numpy()
                 if len(presencas) else None)
    sp1 = np.asarray(sp1_points, dtype="float64").reshape(-1, 2)

    lon_min, lat_min, lon_max, lat_max = bbox[0], bbox[1], bbox[2], bbox[3]
    # Amostragem EQUAL-AREA na latitude (arcsin) — corrige o viés de superamostrar
    # latitudes altas do `uniform(lat)`; relevante em bbox global/ocean_only.
    slat_lo, slat_hi = np.sin(np.radians(lat_min)), np.sin(np.radians(lat_max))

    aceitos_lon: list[float] = []
    aceitos_lat: list[float] = []
    alvo = int(num_absences)
    tentativas = 0
    # TETO anti-travamento: se a Área M for minúscula / raio cobrir o domínio /
    # oceano rejeitar tudo, aborta com aviso em vez de laço infinito.
    max_tentativas = max(50_000, alvo * 300)

    while len(aceitos_lon) < alvo and tentativas < max_tentativas:
        restam = alvo - len(aceitos_lon)
        b = int(min(max(512, restam * 4), 200_000))  # sorteio em LOTE (vetorizado)
        lons = rng.uniform(lon_min, lon_max, b)
        lats = np.degrees(np.arcsin(rng.uniform(slat_lo, slat_hi, b)))
        tentativas += b

        mask = np.ones(b, dtype=bool)
        if len(sp1):  # filtro de RAIO vetorizado (haversine)
            mask &= outside_radius_mask(np.column_stack([lats, lons]), sp1, radius_km)
        if area_m_prep is not None:  # Área M (ecorregiões)
            for k in np.where(mask)[0]:
                if not area_m_prep.contains(Point(lons[k], lats[k])):
                    mask[k] = False
        if ocean_only:  # batimetria VETORIZADA; NaN = fora do domínio = não-oceano
            idx = np.where(mask)[0]
            if len(idx):
                dep = bathy_var.interp(lat=xr.DataArray(lats[idx], dims="p"),
                                       lon=xr.DataArray(lons[idx], dims="p")).values.reshape(-1)
                ok = np.isfinite(dep) & (dep < 0)
                # FAIXA DE PROFUNDIDADE (marinho): restringe às profundidades observadas nas
                # ocorrências — evita sortear "ausência" no abismo p/ peixe de plataforma
                # (contraste raso×fundo trivial, que inflaria o AUC). None = sem restrição.
                if depth_min is not None:
                    ok &= dep >= depth_min
                if depth_max is not None:
                    ok &= dep <= depth_max
                mask[idx] = ok

        for k in np.where(mask)[0]:
            if len(aceitos_lon) >= alvo:
                break
            aceitos_lon.append(float(lons[k])); aceitos_lat.append(float(lats[k]))

    if len(aceitos_lon) < alvo:
        warnings.warn(
            f"Geradas {len(aceitos_lon)}/{alvo} pseudoausências após {tentativas} "
            f"tentativas — Área M pequena, raio ({radius_km} km) grande demais, ou "
            f"oceano restritivo. Retornando o que foi possível.")

    n = len(aceitos_lon)
    if meta_pool is not None and n:  # herda ano/mês/dia/species de presenças (reprodutível)
        pick = rng.integers(0, len(meta_pool), n)
        meta = meta_pool[pick]
        df_pseudo = pd.DataFrame({
            "decimalLongitude": aceitos_lon, "decimalLatitude": aceitos_lat,
            "year": meta[:, 0], "month": meta[:, 1], "day": meta[:, 2],
            "species": meta[:, 3], "sp": 0,
        })
    else:
        df_pseudo = pd.DataFrame({"decimalLongitude": aceitos_lon,
                                  "decimalLatitude": aceitos_lat, "sp": 0})
    print(f"\t{n} pseudoausências aceitas (fora do raio de {radius_km} km"
          f"{', dentro da Área M' if area_m_prep is not None else ''}"
          f"{', em oceano' if ocean_only else ''}).")

    # PROVENIÊNCIA: preserva a origem também nas pseudoausências. Se as presenças
    # trazem alguma coluna de fonte (provider/source/base_de_dados), marca as
    # pseudo com um rótulo claro para que a proveniência NÃO fique vazia a jusante
    # (a captura ambiental usa essas colunas para preencher `base_de_dados`).
    for col, rotulo in (("provider", "pseudo-ausencia"),
                        ("source", "Pseudo-ausência (gerada)"),
                        ("base_de_dados", "pseudo-ausencia")):
        if col in presencas.columns and col not in df_pseudo.columns:
            df_pseudo[col] = rotulo
    return pd.concat([presencas, df_pseudo], ignore_index=True)
    

def run_cmd(args: argparse.Namespace):
    csv = args.csv
    radius_km = args.radius_km
    ocean_only = args.ocean_only
    bathymetry_input = args.bathymetry_input
    species_name = args.species_name
    bathy_ds = None
    bathy_var = None

    # REPRODUTIBILIDADE: RNG com semente explícita (requisito científico em SDM).
    # Sem --seed, usa uma semente aleatória mas a REGISTRA (para poder reproduzir).
    seed = getattr(args, "seed", None)
    if seed is None:
        seed = int.from_bytes(os.urandom(4), "little")
    rng = np.random.default_rng(seed)
    print(f"[pseudo] semente aleatória = {seed} (use --seed {seed} para reproduzir)")

    if ocean_only:
        print("Generating pseudo absences only in ocean...")
        if not bathymetry_input:
            raise ValueError("Bathymetry input file is required when --ocean_only is set.")
        bathy_ds = xr.open_dataset(bathymetry_input)
        bathy_ds = bathy_ds.rename({'__xarray_dataarray_variable__': 'depth', 'x': 'lon', 'y': 'lat'})
        bathy_var = bathy_ds['depth']
        print("Bathymetry loaded.")

    df = pd.read_csv(csv)

    # VALIDAÇÃO DE ENTRADA (falha cedo e clara, em vez de estourar fundo no laço).
    faltando = [c for c in ("decimalLatitude", "decimalLongitude") if c not in df.columns]
    if faltando:
        raise ValueError(f"CSV sem colunas obrigatórias: {faltando}.")
    df = df.dropna(subset=["decimalLatitude", "decimalLongitude"]).copy()
    lat = df["decimalLatitude"].astype(float); lon = df["decimalLongitude"].astype(float)
    if len(df) == 0:
        raise ValueError("CSV sem registros de presença válidos (lat/lon).")
    if not (lat.between(-90, 90).all() and lon.between(-180, 180).all()):
        raise ValueError("Coordenadas fora de EPSG:4326 (lat∈[-90,90], lon∈[-180,180]).")

    if "species" not in df.columns:
        print(f"Column 'species' not found. Creating it with value '{species_name}'.")
        df["species"] = species_name
    else:
        print(f"Overriding 'species' column with value '{species_name}'.")
        df["species"] = species_name

    df["sp"] = 1
    sp1_points = df[df["sp"] == 1][["decimalLatitude", "decimalLongitude"]].to_numpy()
    # bbox de sorteio: global por padrão; --bbox W S E N restringe ao DOMÍNIO DE ESTUDO
    # (usado no pipeline marinho, onde não há Área M/ecorregiões).
    bbox = list(args.bbox) if getattr(args, "bbox", None) else [-180, -90, 180, 90]
    gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df.decimalLongitude, df.decimalLatitude), crs="EPSG:4326")

    # -------------------------------------------------------------------------
    # RECORTE BRASIL (opcional, --clip_brasil): usa APENAS presencas dentro do
    # poligono real do Brasil (malha IBGE) e confina a pseudo ao Brasil. Feito ANTES
    # das ecorregioes porque as ecorregioes RESOLVE sao transnacionais (Cerrado/Mata
    # Atlantica cruzam p/ Argentina/Paraguai/Uruguai); sem isto a pseudo cairia em
    # pais vizinho. A intersecao da Area M com o Brasil e' aplicada mais abaixo.
    # -------------------------------------------------------------------------
    poly_brasil = None
    if getattr(args, "clip_brasil", False):
        import sys as _sysbr
        from pathlib import Path as _Pbr
        _utils_dir = str(_Pbr(__file__).resolve().parents[1] / "05_utils")
        if _utils_dir not in _sysbr.path:
            _sysbr.path.insert(0, _utils_dir)
        from filtro_brasil import poligono_brasil, filtrar_pontos_brasil
        poly_brasil = poligono_brasil()
        n_antes = len(df)
        df = filtrar_pontos_brasil(df, "decimalLatitude", "decimalLongitude").reset_index(drop=True)
        n_fora = n_antes - len(df)
        if n_fora:
            print(f"[brasil] {n_fora} presenca(s) FORA do Brasil removida(s) "
                  f"({n_antes} -> {len(df)}).")
        if len(df) == 0:
            raise ValueError("Nenhuma presenca dentro do Brasil apos --clip_brasil.")
        df["sp"] = 1
        sp1_points = df[["decimalLatitude", "decimalLongitude"]].to_numpy()
        gdf = gpd.GeoDataFrame(
            df, geometry=gpd.points_from_xy(df.decimalLongitude, df.decimalLatitude),
            crs="EPSG:4326")

    # -------------------------------------------------------------------------
    # Área M por ecorregiões RESOLVE 2017 (opcional, --use_ecoregions).
    # Define o polígono INICIAL de amostragem = união das ecorregiões que contêm
    # presenças. É um COMPLEMENTO às restrições atuais (raio/oceano), não um
    # substituto: o gerador continua aplicando todos os filtros existentes.
    # -------------------------------------------------------------------------
    area_m = None
    selected_eco = None  # ecorregiões de ocorrência selecionadas (p/ destacar no mapa)
    if getattr(args, "use_ecoregions", False):
        # Imports preguiçosos: só carregam geopandas-pesados quando solicitado.
        from resolve_ecoregions import download_resolve
        from area_m import build_area_m, NoEcoregionMatch

        try:
            resolve_src = args.resolve_shp if args.resolve_shp else download_resolve(args.resolve_dir)
            print("Construindo Área M a partir das ecorregiões RESOLVE 2017...")
            area_m, selected_eco = build_area_m(
                gdf, resolve_src, buffer_km=args.area_buffer_km,
                min_presence_fraction=args.area_min_frac,
                max_dist_km=args.area_max_dist_km, return_selected=True)
            # Restringe o bbox aos limites da Área M -> menos rejeições, mais rápido.
            minx, miny, maxx, maxy = area_m.bounds
            bbox = [minx, miny, maxx, maxy]
            recorte = (f", recortada a {args.area_max_dist_km:g} km das presenças"
                       if args.area_max_dist_km > 0 else "")
            print(
                f"Área M definida por ecorregiões (buffer={args.area_buffer_km} km"
                f"{recorte}). "
                f"bbox restrito a [{minx:.2f}, {miny:.2f}, {maxx:.2f}, {maxy:.2f}]."
            )
            # RECORTE BRASIL: intersecta a Área M com o polígono do país -> pseudo só
            # dentro do Brasil (as ecorregiões RESOLVE vazam para os vizinhos).
            if poly_brasil is not None:
                area_m = area_m.intersection(poly_brasil)
                if area_m.is_empty:
                    raise ValueError("Área M vazia após interseção com o Brasil.")
                minx, miny, maxx, maxy = area_m.bounds
                bbox = [minx, miny, maxx, maxy]
                print(f"[brasil] Area M recortada ao Brasil -> bbox "
                      f"[{minx:.2f}, {miny:.2f}, {maxx:.2f}, {maxy:.2f}].")
        except NoEcoregionMatch as exc:
            warnings.warn(
                f"Área M por ecorregiões indisponível ({exc}); "
                "revertendo ao bbox global e à metodologia padrão."
            )
            area_m = None

    # RECORTE POR JANELA (--area_clip_bbox, p/ MODELOS REGIONAIS, ex.: RS+entorno):
    # intersecta a Área M com a caixa W S E N — mesmo espírito do recorte-Brasil.
    # Sem isso, uma ecorregião grande (ex.: savana uruguaia) arrasta a Área M para
    # fora da janela de estudo E da cobertura dos rasters (bbox Brasil vai só até
    # lat -34), gerando pseudo que morreria em silêncio na captura.
    clip_janela = getattr(args, "area_clip_bbox", None)
    if area_m is not None and clip_janela:
        from shapely.geometry import box as _box
        w_, s_, e_, n_ = clip_janela
        area_m = area_m.intersection(_box(w_, s_, e_, n_))
        if area_m.is_empty:
            raise ValueError(f"Área M vazia após recorte pela janela {clip_janela}.")
        minx, miny, maxx, maxy = area_m.bounds
        bbox = [minx, miny, maxx, maxy]
        print(f"[janela] Área M recortada à janela -> bbox "
              f"[{minx:.2f}, {miny:.2f}, {maxx:.2f}, {maxy:.2f}].")

    # SEGURANÇA: se há recorte-Brasil mas nenhuma Área M de ecorregiões, confina a
    # pseudo ao polígono do Brasil (senão ela cairia no bbox global).
    if poly_brasil is not None and area_m is None:
        area_m = poly_brasil
        minx, miny, maxx, maxy = area_m.bounds
        bbox = [minx, miny, maxx, maxy]
        print("[brasil] Sem Área M de ecorregiões; pseudo confinada ao polígono do Brasil.")

    # COERÊNCIA DO CONJUNTO: remove PRESENÇAS que caem FORA das ecorregiões de
    # ocorrência (a Área M já pós-filtro de mínimo por ecorregião). Motivo: uma
    # presença cuja ecorregião foi descartada (poucos registros → tipicamente misID,
    # ex.: bugio amazônico rotulado como a espécie-alvo) não representa habitat real;
    # mantê-la ensinaria o modelo que "a espécie ocorre ali". Reflete no nº de pseudo.
    # Opt-out: --keep_presences_outside_area. Só se aplica quando há Área M.
    if area_m is not None and not getattr(args, "keep_presences_outside_area", False):
        within = gdf.geometry.intersects(area_m).to_numpy()
        n_fora = int((~within).sum())
        if n_fora:
            print(f"Removendo {n_fora} presença(s) FORA das ecorregiões de ocorrência "
                  f"(Área M pós-filtro) — coerência do conjunto.")
            df = df[within].reset_index(drop=True)
            gdf = gdf[within].reset_index(drop=True)
            sp1_points = df[["decimalLatitude", "decimalLongitude"]].to_numpy()

    # PROPORÇÃO presença:pseudo. Sem --num_absences explícito, usa --ratio (1.0 = 1:1,
    # padrão do projeto). Ex.: ratio=2.0 reproduz o comportamento antigo (2×presenças).
    num_absences = (args.num_absences if args.num_absences > 0
                    else max(1, int(round(getattr(args, "ratio", 1.0) * len(df)))))
    number_final_df = len(df) + num_absences
    print(f"{len(df)} presence points detected. Generating {num_absences} pseudo absences.")

    filtered_df = generate_pseudo_absences(
                        df,
                        gdf,
                        num_absences,
                        ocean_only,
                        bathy_var,
                        bbox,
                        sp1_points,
                        radius_km,
                        number_final_df,
                        area_m,
                        depth_min=getattr(args, "depth_min", None),
                        depth_max=getattr(args, "depth_max", None),
                        rng=rng,
                    )
    
    # Não publicar um resultado incompleto como se tivesse atingido a proporção pedida.
    geradas = int((filtered_df['sp'] == 0).sum())
    if geradas != num_absences:
        raise RuntimeError(f'Pseudo-ausências insuficientes: {geradas}/{num_absences}. '
                           'Revise o domínio/raio; nenhum novo CSV foi publicado.')

    # Checagem das distancias
    min_distance_between_sp1_and_sp0(filtered_df)

    # SAÍDA na convenção do projeto (ver `naming.py` na raiz):
    #   Pseudoabsence_<Genero_especie>_<DD_MM_AA>.csv, AO LADO do CSV de entrada.
    # (Antes gravava `sp_<entrada>.csv` no diretório ATUAL, e o orquestrador tinha de
    #  mover o arquivo depois — um passo a mais para dar errado.)
    import sys as _sys
    from pathlib import Path as _Path
    _raiz = str(_Path(__file__).resolve().parents[1])
    if _raiz not in _sys.path:
        _sys.path.insert(0, _raiz)
    import naming as _nm

    out_dir = os.path.dirname(os.path.abspath(csv))
    output_file = os.path.join(
        out_dir, _nm.nome("pseudoabsence", species_name, out_dir, "csv"))
    filtered_df.to_csv(output_file, index=False)
    print(f"Saved final dataset to: {output_file} | Total rows: {len(filtered_df)}")

    # MAPA (SEMPRE): PNG com a TOTALIDADE dos dados — presenças (sp=1) + pseudo-
    # ausências (sp=0) — com as ECORREGIÕES DE OCORRÊNCIA destacadas. Salvo na pasta
    # da espécie (mesmo diretório do CSV de entrada). Isolado: nunca derruba a geração.
    try:
        from plot_dados import salvar_mapa_presenca_ausencia
        out_png = os.path.join(
            out_dir, _nm.nome("map", species_name, out_dir, "png"))
        salvar_mapa_presenca_ausencia(filtered_df, out_png, species_name,
                                      area_m=area_m, ecoregioes=selected_eco)
    except Exception as e:  # noqa: BLE001
        print(f"[mapa] AVISO: nao foi possivel gerar o mapa: {type(e).__name__}: {e}")

    if bathy_ds is not None:
        bathy_ds.close()

def main():
    parser = argparse.ArgumentParser(description='Generate pseudo absence data.')
    parser.add_argument('--csv', type=str, required=True, help='Input CSV file with occurrence data.')
    parser.add_argument('--num_absences', type=int, default=0, help='Number of pseudo absences to generate.')
    parser.add_argument('--radius_km', type=float, default=10, help='Minimum distance (in km) from presences (default: 10).')
    parser.add_argument('--ocean_only', action='store_true', help='Generate absences only in ocean areas.')
    parser.add_argument('--bathymetry_input', type=str, default='dados_entrada/ocean_depth.nc', help='NetCDF bathymetry file.')
    parser.add_argument('--species_name', type=str, default='Unknown', help='Species name to use or override in CSV.')
    parser.add_argument('--cores', type=int, default=1, help='Number of cores to use for parallel processing.')
    parser.add_argument('--use_ecoregions', action='store_true',
                        help='Restringe a Área M às ecorregiões RESOLVE 2017 que contêm presenças '
                             '(complementa, não substitui, o filtro de raio/oceano).')
    parser.add_argument('--resolve_shp', type=str, default=None,
                        help='Caminho de um shapefile RESOLVE já existente. Se omitido e '
                             '--use_ecoregions estiver ativo, a base é baixada automaticamente.')
    parser.add_argument('--resolve_dir', type=str, default=None,
                        help='Diretório de cache para download da base RESOLVE '
                             '(padrão: ./resolve_ecoregions).')
    parser.add_argument('--area_buffer_km', type=float, default=0.0,
                        help='Buffer (km) ajustável aplicado à Área M das ecorregiões (padrão: 0).')
    parser.add_argument('--area_min_frac', type=float, default=0.005,
                        help='Fração ADAPTATIVA (0.005 = 0,5%%) do total de presenças que uma '
                             'ecorregião precisa conter para entrar na Área M. Remove ecorregiões '
                             'com poucos registros (misID que arrastam a ecorregião inteira). '
                             '0 desliga o filtro. Padrão: 0.005.')
    parser.add_argument('--area_max_dist_km', type=float, default=200.0,
                        help='RECORTE da Área M: distância máxima (km) de uma pseudoausência à '
                             'presença mais próxima. As ecorregiões RESOLVE são GROSSAS (a do '
                             'Cerrado tem ~2 milhões de km², de SP ao Maranhão): sem este recorte, '
                             'encostar na borda dela põe pseudoausências no Piauí — a 1.400 km da '
                             'espécie, num clima totalmente outro, trivialmente separáveis. Isso '
                             'infla o AUC e faz o modelo aprender BIOMA em vez de HABITAT. '
                             '0 desliga (comportamento antigo). Padrão: 200.')
    parser.add_argument('--keep_presences_outside_area', action='store_true',
                        help='NÃO remover presenças que caem FORA das ecorregiões de ocorrência '
                             '(Área M pós-filtro). Por padrão essas presenças são removidas para '
                             'manter o conjunto coerente (só onde há habitat plausível).')
    parser.add_argument('--seed', type=int, default=None,
                        help='Semente do gerador aleatório (reprodutibilidade). '
                             'Se omitida, sorteia uma e a registra no log.')
    parser.add_argument('--ratio', type=float, default=1.0,
                        help='Razão pseudo:presença quando --num_absences NÃO é informado. '
                             '1.0 = 1:1 (padrão do projeto). num_absences = round(ratio × nº presenças).')
    parser.add_argument('--clip_brasil', action='store_true',
                        help='Usa APENAS presenças dentro do Brasil (polígono real, malha IBGE) '
                             'e confina as pseudo-ausências ao Brasil (intersecta a Área M com o país). '
                             'As ecorregiões RESOLVE vazam para Argentina/Paraguai/Uruguai; sem isto '
                             'a pseudo cairia em país vizinho.')
    # --- Parâmetros MARINHOS (só com --ocean_only; retrocompatíveis, default = sem efeito) ---
    parser.add_argument('--area_clip_bbox', type=float, nargs=4, default=None,
                        metavar=('W', 'S', 'E', 'N'),
                        help='(Regional) Recorta a Área M das ecorregiões a esta janela '
                             '[lon_min lat_min lon_max lat_max]. Para modelos REGIONAIS '
                             '(ex.: RS+entorno); evita a Área M vazar da cobertura dos rasters.')
    parser.add_argument('--bbox', type=float, nargs=4, default=None, metavar=('W', 'S', 'E', 'N'),
                        help='(Marinho) Caixa de sorteio [W S E N] = [lon_min lat_min lon_max lat_max]. '
                             'Restringe o sorteio ao DOMÍNIO DE ESTUDO. None = global (padrão).')
    parser.add_argument('--depth_min', type=float, default=None,
                        help='(Marinho, com --ocean_only) Profundidade MÍNIMA (mais funda, valor '
                             'NEGATIVO) das pseudo-ausências — restringe à faixa de profundidade das '
                             'ocorrências. None = sem restrição.')
    parser.add_argument('--depth_max', type=float, default=None,
                        help='(Marinho, com --ocean_only) Profundidade MÁXIMA (mais rasa, valor '
                             'NEGATIVO) das pseudo-ausências. None = sem restrição.')

    args = parser.parse_args()
    # `--cores`/pandarallel não são mais necessários: o filtro de raio agora é
    # vetorizado (numpy), não mais um apply linha-a-linha.
    run_cmd(args)

if __name__ == "__main__":
    main()
