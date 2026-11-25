# gbif.py - Download GBIF data (apenas RAW)
#
# Responsabilidade ÚNICA deste módulo (após a refatoração):
#   -> Solicitar, baixar e armazenar o dataset BRUTO de ocorrências do GBIF.
#
# Toda a limpeza taxonômica/espacial foi movida para o módulo dedicado
# `cleaning/occurrence_cleaner.py`. Aqui NÃO se remove, filtra ou deduplica
# nada: o CSV gravado permanece praticamente idêntico ao retornado pelo GBIF,
# preservando todas as colunas do Darwin Core para controle de qualidade e
# rastreabilidade a jusante.
#
# Formato de download:
#   Usa o formato DWCA ("Darwin Core Archive") e lê o arquivo interpretado
#   `occurrence.txt`, que contém o conjunto COMPLETO de termos Darwin Core
#   (muito mais rico que o SIMPLE_CSV). Caso o arquivo interpretado não exista
#   no pacote, faz fallback para o CSV simples `{download_key}.csv`.
#
# -> Necessita autenticação no GBIF:
#    É necessário um arquivo .env com as seguintes variáveis:
#    GBIF_USER: Nome de usuário do GBIF
#    GBIF_PWD: Senha do GBIF
#    GBIF_EMAIL: Email do GBIF
#
# -> Faz a busca obtendo primeiro a taxonKey (espécie) ou genusKey (gênero).

import os
import csv
import time
import zipfile
import argparse
import warnings
from typing import Optional

import pandas as pd
import requests
from pygbif import occurrences
from pygbif import species
from dotenv import load_dotenv


load_dotenv()


# Credenciais GBIF via .env. Antes fazia `os.environ[x] = os.getenv(x)` — que
# CRASHAVA no import (TypeError) quando o .env não tinha a chave, justo o caso que
# deveria dar uma mensagem clara. Agora só propaga se existir e avisa se faltar.
_GBIF_MISSING = [k for k in ("GBIF_USER", "GBIF_PWD", "GBIF_EMAIL") if not os.getenv(k)]
for _k in ("GBIF_USER", "GBIF_PWD", "GBIF_EMAIL"):
    _v = os.getenv(_k)
    if _v is not None:
        os.environ[_k] = _v
if _GBIF_MISSING:
    print(f"[gbif] AVISO: credenciais ausentes no .env: {_GBIF_MISSING} — "
          f"o download GBIF (downloader.py) exige essas chaves.")


# Formato de download solicitado ao GBIF. DWCA entrega o `occurrence.txt`
# interpretado com todos os termos Darwin Core.
GBIF_DOWNLOAD_FORMAT = "DWCA"

# Colunas Darwin Core consideradas relevantes para SDM / QA. NÃO é usada para
# restringir a leitura (o RAW preserva TODAS as colunas); serve apenas como
# documentação e para reordenar as colunas mais úteis à frente quando presentes.
RELEVANT_DARWIN_CORE_COLUMNS: tuple[str, ...] = (
    "occurrenceID", "gbifID", "datasetKey",
    "institutionCode", "collectionCode", "catalogNumber",
    "basisOfRecord", "occurrenceStatus",
    "scientificName", "acceptedScientificName", "species", "genus", "family",
    "order", "class", "phylum", "kingdom",
    "taxonRank", "taxonKey", "speciesKey", "genusKey",
    "countryCode", "country", "stateProvince", "county", "municipality",
    "locality", "verbatimLocality",
    "decimalLatitude", "decimalLongitude",
    "coordinateUncertaintyInMeters", "coordinatePrecision", "coordinateAccuracy",
    "geodeticDatum", "georeferenceProtocol", "georeferenceSources",
    "georeferenceRemarks",
    "issue",  # no DWCA a coluna interpretada de flags de qualidade chama-se "issue"
    "eventDate", "year", "month", "day",
    "recordedBy", "identifiedBy",
)


# Limiar mínimo de confiança para aceitar a correspondência do backbone GBIF.
# Configurável por variável de ambiente (GBIF_MIN_MATCH_CONFIDENCE).
DEFAULT_MIN_MATCH_CONFIDENCE = int(os.getenv("GBIF_MIN_MATCH_CONFIDENCE", "90"))


def _normalize_backbone_result(result: dict) -> dict:
    """
    Compatibiliza retornos antigos e novos do pygbif.name_backbone().
    Versões antigas retornam usageKey/matchType/confidence no topo.
    Versões novas retornam usage/diagnostics aninhados.
    """
    if not isinstance(result, dict):
        return {}

    # Formato antigo
    if "usageKey" in result or "matchType" in result:
        return result

    usage = result.get("usage") or {}
    diagnostics = result.get("diagnostics") or {}

    normalized = dict(usage)

    normalized["usageKey"] = (
        usage.get("usageKey")
        or usage.get("key")
        or usage.get("nubKey")
        or result.get("usageKey")
    )

    normalized["scientificName"] = (
        usage.get("scientificName")
        or usage.get("name")
        or usage.get("canonicalName")
        or result.get("scientificName")
    )

    normalized["canonicalName"] = (
        usage.get("canonicalName")
        or usage.get("name")
        or result.get("canonicalName")
    )

    normalized["rank"] = (
        usage.get("rank")
        or usage.get("taxonRank")
        or result.get("rank")
    )

    normalized["matchType"] = (
        diagnostics.get("matchType")
        or diagnostics.get("match_type")
        or result.get("matchType")
    )

    normalized["confidence"] = (
        diagnostics.get("confidence")
        or result.get("confidence")
    )

    return normalized


def _validate_backbone_match(
    result: dict,
    requested_name: str,
    strict: bool,
    min_confidence: int,
    expected_rank: Optional[str] = None,
) -> None:
    """
    Valida a qualidade da correspondência taxonômica do backbone do GBIF.

    Evita baixar dados do táxon errado silenciosamente: só é considerada
    confiável a correspondência `matchType == "EXACT"` com `confidence` acima do
    limiar (e, quando informado, `rank` igual ao esperado). Caso contrário emite
    um aviso claro com o nome de fato resolvido; se `strict=True`, aborta.
    """
    match_type = result.get("matchType", "NONE")
    confidence = result.get("confidence")
    resolved = result.get("scientificName") or result.get("canonicalName") or "?"
    rank = result.get("rank")

    problems = []
    if match_type != "EXACT":
        problems.append(f"matchType={match_type}")
    if confidence is not None and confidence < min_confidence:
        problems.append(f"confidence={confidence} < {min_confidence}")
    if expected_rank is not None and rank is not None and rank != expected_rank:
        problems.append(f"rank={rank} (esperado {expected_rank})")

    if problems:
        msg = (
            f"Correspondência taxonômica DUVIDOSA para '{requested_name}': "
            f"{', '.join(problems)}. Resolvido como '{resolved}' "
            f"(usageKey={result.get('usageKey')}). Confirme se é o táxon correto."
        )
        if strict:
            raise ValueError(msg)
        warnings.warn(msg)


def get_taxon_key(
    nome_especie: str,
    strict: bool = False,
    min_confidence: int = DEFAULT_MIN_MATCH_CONFIDENCE,
) -> int:
    """
    Resolve a usageKey/taxonKey de uma espécie no backbone do GBIF.
    Compatível com versões novas e antigas do pygbif.
    """
    resultado_raw = species.name_backbone(scientificName=nome_especie)
    resultado = _normalize_backbone_result(resultado_raw)

    if "usageKey" not in resultado or resultado["usageKey"] is None:
        raise ValueError(
            f"TaxonKey não encontrado para '{nome_especie}'. "
            f"Retorno GBIF/pygbif: {resultado_raw}"
        )

    _validate_backbone_match(resultado, nome_especie, strict, min_confidence)
    return int(resultado["usageKey"])


def get_genus_key(
    genus_name: str,
    strict: bool = False,
    min_confidence: int = DEFAULT_MIN_MATCH_CONFIDENCE,
) -> int:
    """
    Resolve a usageKey/genusKey de um gênero no backbone do GBIF.
    Compatível com versões novas e antigas do pygbif.
    """
    resultado_raw = species.name_backbone(
        scientificName=genus_name,
        taxonRank="GENUS"
    )
    resultado = _normalize_backbone_result(resultado_raw)

    if "usageKey" not in resultado or resultado["usageKey"] is None:
        raise ValueError(
            f"GenusKey não encontrado para '{genus_name}'. "
            f"Retorno GBIF/pygbif: {resultado_raw}"
        )

    _validate_backbone_match(
        resultado,
        genus_name,
        strict,
        min_confidence,
        expected_rank="GENUS"
    )
    return int(resultado["usageKey"])


def _build_predicates(
    key_type: str,
    key_value: int,
    lon_range: tuple[float, float],
    lat_range: tuple[float, float],
    year_range: tuple[int, int],
) -> dict:
    """
    Monta o predicado de busca do GBIF.

    Parâmetros:
        key_type: "TAXON_KEY" ou "GENUS_KEY".
        key_value: valor da chave taxonômica.
        lon_range/lat_range/year_range: limites de busca (inclusivos).

    Retorna:
        Dicionário de predicado no formato aceito por `occurrences.download`.
    """
    return {
        "type": "and",
        "predicates": [
            {"type": "equals", "key": key_type, "value": str(key_value)},
            {"type": "greaterThanOrEquals", "key": "YEAR", "value": str(year_range[0])},
            {"type": "lessThanOrEquals", "key": "YEAR", "value": str(year_range[1])},
            {"type": "greaterThanOrEquals", "key": "DECIMAL_LATITUDE", "value": str(lat_range[0])},
            {"type": "lessThanOrEquals", "key": "DECIMAL_LATITUDE", "value": str(lat_range[1])},
            {"type": "greaterThanOrEquals", "key": "DECIMAL_LONGITUDE", "value": str(lon_range[0])},
            {"type": "lessThanOrEquals", "key": "DECIMAL_LONGITUDE", "value": str(lon_range[1])},
            {"type": "equals", "key": "HAS_COORDINATE", "value": "true"},
        ],
    }


def download_and_extract_zip(download_key: str, zip_path: str, output_dir: str) -> None:
    """Baixa o pacote .zip do GBIF e o extrai em `output_dir`."""
    print("Baixando arquivo .zip...")
    zip_url = f"https://api.gbif.org/v1/occurrence/download/request/{download_key}.zip"
    r = requests.get(zip_url)
    r.raise_for_status()
    with open(zip_path, "wb") as f:
        f.write(r.content)
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(output_dir)


def _wait_for_download(download_key: str, poll_seconds: int = 10) -> None:
    """Bloqueia até o download do GBIF terminar (SUCCEEDED) ou falhar."""
    print("Aguardando download...")
    while True:
        status = occurrences.download_meta(download_key)["status"]
        print(f"Status do download: {status}")
        if status == "SUCCEEDED":
            return
        if status in ("FAILED", "KILLED", "CANCELLED"):
            raise RuntimeError(f"O download falhou com status: {status}")
        time.sleep(poll_seconds)


def _locate_occurrence_file(output_dir: str, download_key: str) -> str:
    """
    Localiza o arquivo de dados dentro do pacote extraído.

    Prioriza o `occurrence.txt` interpretado (DWCA, com todos os termos Darwin
    Core) e faz fallback para o `{download_key}.csv` (formato SIMPLE_CSV).
    """
    dwca_path = os.path.join(output_dir, "occurrence.txt")
    if os.path.exists(dwca_path):
        return dwca_path
    simple_csv = os.path.join(output_dir, f"{download_key}.csv")
    if os.path.exists(simple_csv):
        return simple_csv
    raise FileNotFoundError(
        f"Nenhum arquivo de ocorrências encontrado em '{output_dir}' "
        f"(esperava 'occurrence.txt' ou '{download_key}.csv')."
    )


def _read_raw_occurrences(path: str) -> pd.DataFrame:
    """
    Lê o arquivo de ocorrências do GBIF preservando os valores originais.

    O DWCA usa TAB como separador e NÃO envolve campos entre aspas
    (`fieldsEnclosedBy` vazio), portanto desabilitamos o parsing de aspas para
    não corromper localidades/observações que contenham `"`. Tudo é lido como
    texto (`dtype=str`) para manter o RAW fiel; a conversão de tipos ocorre na
    etapa de limpeza.
    """
    return pd.read_csv(
        path,
        sep="\t",
        dtype=str,
        quoting=csv.QUOTE_NONE,
        on_bad_lines="warn",
        low_memory=False,
    )


def _reorder_relevant_first(df: pd.DataFrame) -> pd.DataFrame:
    """Reordena o DataFrame colocando as colunas relevantes de SDM à frente."""
    present = [c for c in RELEVANT_DARWIN_CORE_COLUMNS if c in df.columns]
    remaining = [c for c in df.columns if c not in present]
    return df[present + remaining]


def _download_raw(
    key_type: str,
    key_value: int,
    label: str,
    output_basename: str,
    lon_range: tuple[float, float],
    lat_range: tuple[float, float],
    year_range: tuple[int, int],
    output_dir: str,
    keep_archive: bool,
) -> pd.DataFrame:
    """
    Núcleo compartilhado de download RAW (espécie ou gênero).

    Solicita o download ao GBIF, baixa/extrai o pacote, lê TODAS as colunas do
    arquivo interpretado e grava o CSV bruto sem qualquer limpeza.

    Parâmetros:
        key_type: "TAXON_KEY" ou "GENUS_KEY".
        key_value: chave taxonômica resolvida.
        label: rótulo humano (nome da espécie/gênero) para logs.
        output_basename: base do nome do arquivo de saída (sem extensão).
        lon_range/lat_range/year_range: limites de busca.
        output_dir: diretório de saída.
        keep_archive: se True, mantém o .zip e o arquivo extraído; se False,
            remove-os após gerar o CSV bruto.

    Retorna:
        DataFrame bruto (todas as colunas, sem filtragem).
    """
    query = _build_predicates(key_type, key_value, lon_range, lat_range, year_range)

    print(f"Buscando dados para {label} ({key_type}={key_value})...")
    print(f"Coordenadas: lon={lon_range}, lat={lat_range}")
    print(f"Ano: {year_range}")
    print(f"Formato: {GBIF_DOWNLOAD_FORMAT}")
    print(f"Diretório de saída: {output_dir}")
    print("Solicitando download ao GBIF...")

    download_key, _metadata = occurrences.download(query, format=GBIF_DOWNLOAD_FORMAT)
    print(f"Download requisitado com chave: {download_key}")

    _wait_for_download(download_key)

    os.makedirs(output_dir, exist_ok=True)
    zip_path = os.path.join(output_dir, f"{download_key}.zip")
    download_and_extract_zip(download_key, zip_path, output_dir)

    data_file = _locate_occurrence_file(output_dir, download_key)
    df = _read_raw_occurrences(data_file)
    df = _reorder_relevant_first(df)

    output_csv = os.path.join(output_dir, f"{output_basename}_GBIF_raw.csv")
    df.to_csv(output_csv, index=False)
    print(f"Finalizado. RAW salvo em: {output_csv} | {len(df)} registros, {df.shape[1]} colunas")

    if not keep_archive:
        for artefato in (zip_path, data_file):
            if os.path.exists(artefato):
                os.remove(artefato)
        # meta.xml e demais arquivos do DWCA também podem ser limpos
        for extra in ("meta.xml", "citations.txt", "rights.txt", "verbatim.txt", "multimedia.txt"):
            extra_path = os.path.join(output_dir, extra)
            if os.path.exists(extra_path):
                os.remove(extra_path)

    return df


def download_gbif_data(
    species_name: str,
    lon_range: tuple[float, float] = (-180, 180),
    lat_range: tuple[float, float] = (-90, 90),
    year_range: tuple[int, int] = (2000, 2024),
    output_dir: str = "gbif",
    keep_archive: bool = False,
    strict_match: bool = False,
) -> pd.DataFrame:
    """
    Faz download RAW de ocorrências do GBIF para a espécie informada.

    Preserva todas as colunas Darwin Core (sem limpeza). A limpeza deve ser
    feita posteriormente com `cleaning.occurrence_cleaner`. Com `strict_match`,
    aborta se a correspondência taxonômica não for confiável.
    """
    taxon_key = get_taxon_key(species_name, strict=strict_match)
    return _download_raw(
        key_type="TAXON_KEY",
        key_value=taxon_key,
        label=species_name,
        output_basename=species_name.replace(" ", "_"),
        lon_range=lon_range,
        lat_range=lat_range,
        year_range=year_range,
        output_dir=output_dir,
        keep_archive=keep_archive,
    )


def download_gbif_genus(
    genus_name: str,
    lon_range: tuple[float, float] = (-180, 180),
    lat_range: tuple[float, float] = (-90, 90),
    year_range: tuple[int, int] = (2000, 2024),
    output_dir: str = "gbif",
    keep_archive: bool = False,
    strict_match: bool = False,
) -> pd.DataFrame:
    """
    Faz download RAW de ocorrências do GBIF para TODOS os táxons de um gênero.

    Mesma lógica de `download_gbif_data`, mas usando GENUS_KEY.
    """
    genus_key = get_genus_key(genus_name, strict=strict_match)
    return _download_raw(
        key_type="GENUS_KEY",
        key_value=genus_key,
        label=genus_name,
        output_basename=f"{genus_name.replace(' ', '_')}_GENUS",
        lon_range=lon_range,
        lat_range=lat_range,
        year_range=year_range,
        output_dir=output_dir,
        keep_archive=keep_archive,
    )


def run_cmd(args: argparse.Namespace):
    species_name: Optional[str] = args.species_name
    genus_name: Optional[str] = args.genus_name
    keep_archive: bool = getattr(args, "keep_archive", False)
    strict_match: bool = getattr(args, "strict_taxon_match", False)

    if genus_name:  # se houver genus_name, baixa dados do gênero
        download_gbif_genus(
            genus_name=genus_name,
            lon_range=(args.min_lon, args.max_lon),
            lat_range=(args.min_lat, args.max_lat),
            year_range=(args.min_year, args.max_year),
            output_dir=args.output_dir,
            keep_archive=keep_archive,
            strict_match=strict_match,
        )
    elif species_name:  # senão, baixa dados da espécie
        download_gbif_data(
            species_name=species_name,
            lon_range=(args.min_lon, args.max_lon),
            lat_range=(args.min_lat, args.max_lat),
            year_range=(args.min_year, args.max_year),
            output_dir=args.output_dir,
            keep_archive=keep_archive,
            strict_match=strict_match,
        )
    else:
        raise ValueError("No species_name or genus_name!")
