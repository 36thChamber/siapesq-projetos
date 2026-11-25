# models.py - Modelo único de dados de ocorrência
#
# Independentemente da fonte (GBIF, OBIS, iNaturalist, ...), TODOS os registros
# são convertidos para um mesmo conjunto de colunas (o "modelo único"). Assim o
# restante do pipeline nunca precisa saber de onde o dado veio.
#
# `STANDARD_COLUMNS` é a fonte da verdade sobre o esquema. `OccurrenceRecord` é
# uma dataclass equivalente, útil para construir/documentar um registro isolado
# com type hints. Como os providers trabalham com `pandas.DataFrame` (baixam
# lotes inteiros), a função central usada na prática é `standardize_frame`, que
# encaixa QUALQUER DataFrame no esquema padrão, preenchendo o que faltar com NULL
# (pd.NA) e descartando colunas não previstas.
#
# Observação técnica: `class` e demais nomes reservados do Python não podem ser
# atributos de dataclass, então o campo do modelo chama-se `class_` e é mapeado
# para a coluna `class` em `FIELD_TO_COLUMN`.

from __future__ import annotations

import re
from dataclasses import dataclass, fields
from datetime import date
from typing import Optional

import pandas as pd


# Insere um separador antes de cada maiúscula interna (para CamelCase -> SNAKE).
_CAMEL_BOUNDARY = re.compile(r"(?<!^)(?=[A-Z])")


def canonical_basis_of_record(value: object) -> object:
    """
    Padroniza `basisOfRecord` para o estilo do GBIF (UPPER_SNAKE_CASE).

    Diferentes bases usam grafias distintas ("HumanObservation" no OBIS,
    "HUMAN_OBSERVATION" no GBIF). Uniformizar permite que o filtro opcional de
    basisOfRecord funcione igual para todas as fontes. Valores nulos/vazios são
    devolvidos como estão.
    """
    if value is None or (not isinstance(value, str) and pd.isna(value)):
        return value
    s = str(value).strip()
    if not s:
        return value
    if "_" in s or s.isupper():
        return s.upper()
    return _CAMEL_BOUNDARY.sub("_", s).upper()


# Ordem canônica das colunas do modelo único (exatamente a especificada).
STANDARD_COLUMNS: tuple[str, ...] = (
    "species",
    "accepted_species",
    "scientificName",
    "taxonID",
    "kingdom",
    "phylum",
    "class",
    "order",
    "family",
    "genus",
    "specificEpithet",
    "decimalLatitude",
    "decimalLongitude",
    "coordinateUncertaintyInMeters",
    "country",
    "stateProvince",
    "municipality",
    "locality",
    "eventDate",
    "year",
    "month",
    "day",
    "basisOfRecord",
    "institutionCode",
    "collectionCode",
    "catalogNumber",
    "datasetName",
    "datasetKey",
    "occurrenceID",
    "recordedBy",
    "identifiedBy",
    "license",
    "rightsHolder",
    "references",
    "source",
    "provider",
    "original_provider",
    "download_date",
    "quality_flags",
)

# Colunas numéricas do modelo (coagidas em `standardize_frame`).
NUMERIC_COLUMNS: tuple[str, ...] = (
    "decimalLatitude",
    "decimalLongitude",
    "coordinateUncertaintyInMeters",
    "year",
    "month",
    "day",
)

# Colunas mínimas exigidas a jusante (02_pseudoabsence lê exatamente estas).
DOWNSTREAM_REQUIRED_COLUMNS: tuple[str, ...] = (
    "decimalLatitude",
    "decimalLongitude",
    "year",
    "month",
    "day",
    "species",
)

# Mapeia o nome do atributo da dataclass -> nome da coluna (nomes reservados).
FIELD_TO_COLUMN: dict[str, str] = {"class_": "class"}


@dataclass
class OccurrenceRecord:
    """
    Um registro de ocorrência no modelo único.

    Todos os campos são opcionais: uma base que não fornece um dado deixa o
    campo como None (que vira NULL na tabela). Serve principalmente como
    documentação tipada do esquema e para construir registros individuais; o
    caminho de alto volume usa DataFrames + `standardize_frame`.
    """

    species: Optional[str] = None
    accepted_species: Optional[str] = None
    scientificName: Optional[str] = None
    taxonID: Optional[str] = None
    kingdom: Optional[str] = None
    phylum: Optional[str] = None
    class_: Optional[str] = None  # -> coluna "class"
    order: Optional[str] = None
    family: Optional[str] = None
    genus: Optional[str] = None
    specificEpithet: Optional[str] = None
    decimalLatitude: Optional[float] = None
    decimalLongitude: Optional[float] = None
    coordinateUncertaintyInMeters: Optional[float] = None
    country: Optional[str] = None
    stateProvince: Optional[str] = None
    municipality: Optional[str] = None
    locality: Optional[str] = None
    eventDate: Optional[str] = None
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None
    basisOfRecord: Optional[str] = None
    institutionCode: Optional[str] = None
    collectionCode: Optional[str] = None
    catalogNumber: Optional[str] = None
    datasetName: Optional[str] = None
    datasetKey: Optional[str] = None
    occurrenceID: Optional[str] = None
    recordedBy: Optional[str] = None
    identifiedBy: Optional[str] = None
    license: Optional[str] = None
    rightsHolder: Optional[str] = None
    references: Optional[str] = None
    source: Optional[str] = None
    provider: Optional[str] = None
    original_provider: Optional[str] = None
    download_date: Optional[str] = None
    quality_flags: Optional[str] = None

    def to_dict(self) -> dict:
        """Converte para dicionário já com os NOMES DE COLUNA (ex.: `class`)."""
        out = {}
        for f in fields(self):
            col = FIELD_TO_COLUMN.get(f.name, f.name)
            out[col] = getattr(self, f.name)
        return out


def empty_frame() -> pd.DataFrame:
    """Retorna um DataFrame vazio com todas as colunas do modelo único."""
    return pd.DataFrame({c: pd.Series(dtype="object") for c in STANDARD_COLUMNS})


def records_to_frame(records: list[OccurrenceRecord]) -> pd.DataFrame:
    """Constrói um DataFrame padronizado a partir de uma lista de registros."""
    if not records:
        return empty_frame()
    df = pd.DataFrame([r.to_dict() for r in records])
    return standardize_frame(df)


def standardize_frame(
    df: pd.DataFrame,
    provider: Optional[str] = None,
    source: Optional[str] = None,
    original_provider: Optional[str] = None,
    download_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Encaixa um DataFrame qualquer no esquema do modelo único.

    - Reordena/seleciona exatamente `STANDARD_COLUMNS`.
    - Colunas ausentes são criadas com NULL (pd.NA).
    - Colunas numéricas são coagidas (valores inválidos viram NaN).
    - `provider`/`source`/`original_provider`/`download_date` preenchem as
      respectivas colunas quando informados (não sobrescrevem valores já
      presentes por linha, exceto quando a coluna está inteira vazia).
    - Deriva `species` a partir de `accepted_species`/`scientificName` quando
      ausente, garantindo a coluna exigida a jusante.

    Não remove linhas: padronização é estrutural, não filtragem.
    """
    df = df.copy()

    # Cria colunas faltantes com NULL.
    for col in STANDARD_COLUMNS:
        if col not in df.columns:
            df[col] = pd.NA

    # Preenche metadados de proveniência (só onde faz sentido).
    if provider is not None:
        df["provider"] = df["provider"].where(df["provider"].notna(), provider)
    if source is not None:
        df["source"] = df["source"].where(df["source"].notna(), source)
    if original_provider is not None:
        df["original_provider"] = df["original_provider"].where(
            df["original_provider"].notna(), original_provider
        )
    if download_date is not None:
        df["download_date"] = df["download_date"].where(
            df["download_date"].notna(), download_date
        )

    # Coage numéricos.
    for col in NUMERIC_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Uniformiza a grafia de basisOfRecord entre as fontes (idempotente).
    df["basisOfRecord"] = df["basisOfRecord"].map(canonical_basis_of_record)

    # Garante a coluna `species` (exigida a jusante): usa o nome aceito ou o
    # scientificName quando `species` estiver vazio.
    species = df["species"]
    fallback = df["accepted_species"].where(
        df["accepted_species"].notna(), df["scientificName"]
    )
    df["species"] = species.where(species.notna(), fallback)

    # Seleciona apenas as colunas do modelo, na ordem canônica.
    return df[list(STANDARD_COLUMNS)].reset_index(drop=True)


def today_iso() -> str:
    """Data de download padrão (AAAA-MM-DD), usada como carimbo e na chave de cache."""
    return date.today().isoformat()
