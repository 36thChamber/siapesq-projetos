# occurrence_cleaner.py - Limpeza taxonômica/espacial/temporal de ocorrências
#
# Módulo dedicado à LIMPEZA de registros de ocorrência do GBIF para SDM. Cada
# filtro é uma FUNÇÃO INDEPENDENTE e testável isoladamente; o orquestrador
# `clean_occurrences` apenas encadeia os filtros conforme a `CleaningConfig` e
# acumula um relatório (`CleaningReport`).
#
# Filtros puramente tabulares (coordenadas, duplicatas, incerteza, issues,
# basis, status, datas) não exigem geopandas. Os filtros espaciais
# (centroides, instituições, capitais, terra x oceano) usam dados de referência
# fornecidos por `reference_data.ReferenceData` e são PULADOS com aviso quando a
# referência não está disponível — o cleaner nunca quebra a pipeline por falta
# de uma camada opcional.
#
# Convenção das colunas de flag adicionadas (não removem sozinhas):
#   is_centroid, is_institution, is_capital  (bool)

from __future__ import annotations

import os
import json
import argparse
import warnings
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
import pandas as pd

from .config import CleaningConfig
from .reference_data import ReferenceData


# Nomes canônicos das colunas de coordenada.
LAT = "decimalLatitude"
LON = "decimalLongitude"

# Raio médio da Terra (km), usado nas distâncias de grande círculo.
EARTH_RADIUS_KM = 6371.0088


# ---------------------------------------------------------------------------
# Relatório
# ---------------------------------------------------------------------------
@dataclass
class CleaningReport:
    """Acumula estatísticas de cada etapa da limpeza."""

    initial_records: int = 0
    final_records: int = 0
    removed: dict[str, int] = field(default_factory=dict)
    flagged: dict[str, int] = field(default_factory=dict)
    skipped_filters: list[str] = field(default_factory=list)
    config: Optional[dict] = None
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def record_removal(self, step: str, before: int, after: int) -> None:
        """Registra quantos registros um passo removeu."""
        self.removed[step] = self.removed.get(step, 0) + (before - after)

    def skip(self, step: str, reason: str) -> None:
        """Marca um filtro como pulado (referência indisponível, etc.)."""
        entry = f"{step}: {reason}"
        if entry not in self.skipped_filters:
            self.skipped_filters.append(entry)

    def to_dict(self) -> dict:
        return {
            "initial_records": self.initial_records,
            "final_records": self.final_records,
            "total_removed": self.initial_records - self.final_records,
            "removed": self.removed,
            "flagged": self.flagged,
            "skipped_filters": self.skipped_filters,
            "timestamp": self.timestamp,
            "config": self.config,
        }

    def to_json(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)

    def to_txt(self, path: str) -> None:
        lines = [
            "==== RELATÓRIO DE LIMPEZA DE OCORRÊNCIAS ====",
            f"Gerado em (UTC): {self.timestamp}",
            "",
            f"Registros iniciais: {self.initial_records}",
            f"Registros finais:   {self.final_records}",
            f"Total removido:     {self.initial_records - self.final_records}",
            "",
            "Removidos por etapa:",
        ]
        if self.removed:
            for step, n in self.removed.items():
                lines.append(f"  - {step:.<32} {n}")
        else:
            lines.append("  (nenhum)")

        lines.append("")
        lines.append("Marcados (flags, não necessariamente removidos):")
        if self.flagged:
            for flag, n in self.flagged.items():
                lines.append(f"  - {flag:.<32} {n}")
        else:
            lines.append("  (nenhum)")

        if self.skipped_filters:
            lines.append("")
            lines.append("Filtros pulados:")
            for s in self.skipped_filters:
                lines.append(f"  - {s}")

        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")


# ---------------------------------------------------------------------------
# Utilitários de coluna / geometria
# ---------------------------------------------------------------------------
def _first_present(df: pd.DataFrame, *names: str) -> Optional[str]:
    """Retorna o primeiro nome de coluna presente no DataFrame, ou None."""
    for n in names:
        if n in df.columns:
            return n
    return None


def _unit_sphere_xyz(lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    """Converte lat/lon (graus) em coordenadas cartesianas na esfera unitária."""
    lat_r = np.radians(lat.astype(float))
    lon_r = np.radians(lon.astype(float))
    cos_lat = np.cos(lat_r)
    return np.column_stack((
        cos_lat * np.cos(lon_r),
        cos_lat * np.sin(lon_r),
        np.sin(lat_r),
    ))


def _great_circle_km(lat: np.ndarray, lon: np.ndarray,
                     ref_lat: float, ref_lon: float) -> np.ndarray:
    """Distância de grande círculo (km, haversine) de cada (lat,lon) a um ponto."""
    lat_r = np.radians(np.asarray(lat, dtype=float))
    lon_r = np.radians(np.asarray(lon, dtype=float))
    rlat = np.radians(float(ref_lat))
    rlon = np.radians(float(ref_lon))
    dlat = lat_r - rlat
    dlon = lon_r - rlon
    a = np.sin(dlat / 2.0) ** 2 + np.cos(lat_r) * np.cos(rlat) * np.sin(dlon / 2.0) ** 2
    return 2.0 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))


def _flag_near_reference(
    lat: np.ndarray,
    lon: np.ndarray,
    ref_lat: np.ndarray,
    ref_lon: np.ndarray,
    radius_km: float,
) -> np.ndarray:
    """
    Marca (True) os pontos que estão a até `radius_km` de QUALQUER ponto de
    referência, usando distância de grande círculo.

    Implementação eficiente via KD-tree na esfera unitária (chord distance),
    adequada ao processamento em lote. Faz fallback para força bruta vetorizada
    se scipy não estiver disponível.
    """
    if len(lat) == 0 or len(ref_lat) == 0:
        return np.zeros(len(lat), dtype=bool)

    query_xyz = _unit_sphere_xyz(lat, lon)
    ref_xyz = _unit_sphere_xyz(ref_lat, ref_lon)

    # Ângulo (rad) correspondente ao raio -> distância de corda equivalente.
    theta = radius_km / EARTH_RADIUS_KM
    chord_threshold = 2.0 * np.sin(theta / 2.0)

    try:
        from scipy.spatial import cKDTree

        tree = cKDTree(ref_xyz)
        nearest, _ = tree.query(query_xyz, k=1)
        return nearest <= chord_threshold
    except ImportError:
        # Fallback: processa em blocos para limitar memória.
        flags = np.zeros(len(lat), dtype=bool)
        block = 2000
        for start in range(0, len(query_xyz), block):
            chunk = query_xyz[start:start + block]
            # distância de corda mínima a qualquer referência
            dmin = np.sqrt(
                ((chunk[:, None, :] - ref_xyz[None, :, :]) ** 2).sum(axis=2)
            ).min(axis=1)
            flags[start:start + block] = dmin <= chord_threshold
        return flags


# ---------------------------------------------------------------------------
# Preparação
# ---------------------------------------------------------------------------
def prepare_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converte colunas essenciais para tipos numéricos, preservando o restante.

    Não remove nada; apenas coage `decimalLatitude/Longitude`, `year/month/day`
    e `coordinateUncertaintyInMeters` (quando presentes) para numérico, de modo
    que os filtros subsequentes possam comparar valores corretamente. O RAW é
    lido como texto, portanto esta etapa é necessária.
    """
    df = df.copy()
    for col in (LAT, LON, "year", "month", "day", "coordinateUncertaintyInMeters",
                "coordinatePrecision"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


# ---------------------------------------------------------------------------
# Filtros tabulares (cada um independente)
# ---------------------------------------------------------------------------
def remove_missing_coordinates(df: pd.DataFrame) -> pd.DataFrame:
    """Remove registros sem latitude ou longitude."""
    if LAT not in df.columns or LON not in df.columns:
        return df
    return df.dropna(subset=[LAT, LON])


def remove_invalid_coordinates(df: pd.DataFrame) -> pd.DataFrame:
    """Remove coordenadas fora dos domínios válidos (|lat|>90, |lon|>180)."""
    if LAT not in df.columns or LON not in df.columns:
        return df
    valid = (
        df[LAT].between(-90, 90, inclusive="both")
        & df[LON].between(-180, 180, inclusive="both")
    )
    return df[valid]


def remove_zero_coordinates(df: pd.DataFrame, tol: float = 1e-8) -> pd.DataFrame:
    """Remove registros exatamente em (0, 0) (erro clássico de georreferência)."""
    if LAT not in df.columns or LON not in df.columns:
        return df
    is_zero = (df[LAT].abs() < tol) & (df[LON].abs() < tol)
    return df[~is_zero]


def remove_equal_coordinates(df: pd.DataFrame, tol: float = 1e-8) -> pd.DataFrame:
    """
    Remove registros com latitude == longitude (equivalente ao `cc_equ`).

    Coordenadas idênticas nos dois eixos são um indício clássico de inversão de
    campos ou erro de transcrição — raramente uma observação legítima. O ponto
    (0, 0) também satisfaz esta condição, mas já é tratado separadamente por
    `remove_zero_coordinates`.
    """
    if LAT not in df.columns or LON not in df.columns:
        return df
    is_equal = (df[LAT] - df[LON]).abs() < tol
    return df[~is_equal]


def remove_duplicates(
    df: pd.DataFrame,
    mode: str = "spatial",
    decimals: Optional[int] = None,
    subset: Optional[list[str]] = None,
) -> pd.DataFrame:
    """
    Remove duplicatas em dois modos.

    - "exact": deduplica pelo conjunto de colunas `subset` (padrão:
      lat, lon, year, month, day) — duplicata exata de registro.
    - "spatial": deduplica apenas por lat/lon, opcionalmente arredondadas a
      `decimals` casas (agrupa pontos praticamente coincidentes).
    """
    if LAT not in df.columns or LON not in df.columns:
        return df

    if mode == "spatial":
        if decimals is not None:
            key = pd.DataFrame({
                "_lat": df[LAT].round(decimals),
                "_lon": df[LON].round(decimals),
            })
            return df[~key.duplicated()]
        return df.drop_duplicates(subset=[LAT, LON])

    # modo "exact"
    if subset is None:
        subset = [c for c in (LAT, LON, "year", "month", "day") if c in df.columns]
    subset = [c for c in subset if c in df.columns]
    if not subset:
        return df
    return df.drop_duplicates(subset=subset)


def filter_coordinate_uncertainty(
    df: pd.DataFrame,
    max_uncertainty: Optional[float],
    keep_missing: bool = True,
) -> pd.DataFrame:
    """
    Remove registros cuja incerteza de coordenada excede `max_uncertainty` (m).

    `max_uncertainty=None` desativa o filtro. Registros sem valor de incerteza
    são mantidos se `keep_missing=True` (comportamento conservador padrão).
    """
    if max_uncertainty is None:
        return df
    col = "coordinateUncertaintyInMeters"
    if col not in df.columns:
        return df
    within = df[col] <= max_uncertainty
    if keep_missing:
        within = within | df[col].isna()
    return df[within]


def filter_gbif_issues(
    df: pd.DataFrame, critical_issues: list[str]
) -> pd.DataFrame:
    """
    Remove registros que contenham ao menos uma issue crítica do GBIF.

    A coluna de issues ("issue" no DWCA; "issues" em alguns exports) é uma
    lista separada por ';'. Um registro é removido se a interseção com
    `critical_issues` for não vazia.
    """
    col = _first_present(df, "issue", "issues")
    if col is None or not critical_issues:
        return df
    critical = set(critical_issues)

    def _has_critical(value: object) -> bool:
        if not isinstance(value, str) or not value:
            return False
        tokens = {t.strip() for t in value.split(";") if t.strip()}
        return bool(tokens & critical)

    mask_bad = df[col].apply(_has_critical)
    return df[~mask_bad]


def filter_basis_of_record(
    df: pd.DataFrame, accepted: list[str]
) -> pd.DataFrame:
    """Mantém apenas registros cujo basisOfRecord está na lista aceita."""
    col = "basisOfRecord"
    if col not in df.columns or not accepted:
        return df
    accepted_upper = {a.upper() for a in accepted}
    keep = df[col].astype(str).str.upper().isin(accepted_upper)
    return df[keep]


def remove_absent_records(
    df: pd.DataFrame, absent_values: list[str]
) -> pd.DataFrame:
    """Remove registros marcados como ausência (occurrenceStatus == ABSENT)."""
    col = "occurrenceStatus"
    if col not in df.columns or not absent_values:
        return df
    absent_upper = {a.upper() for a in absent_values}
    is_absent = df[col].astype(str).str.upper().isin(absent_upper)
    return df[~is_absent]


def _days_in_month(year: pd.Series, month: pd.Series) -> pd.Series:
    """Número de dias do mês, tolerante a NaN (retorna 31 quando indeterminado)."""
    # Base de dias por mês (índice 1..12); fevereiro tratado à parte por bissexto.
    base = {1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
            7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}
    month_int = month.round().astype("Int64")
    days = month_int.map(base).astype("float")
    # Anos bissextos -> fevereiro com 29 dias.
    yr = year.round()
    is_leap = ((yr % 4 == 0) & (yr % 100 != 0)) | (yr % 400 == 0)
    days = days.where(~((month_int == 2) & is_leap), 29.0)
    # Onde o mês é desconhecido/ inválido, não restringe o dia (usa 31).
    return days.fillna(31.0)


def filter_dates(
    df: pd.DataFrame,
    require_year: bool = True,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    validate_month_day: bool = False,
    reject_future_dates: bool = False,
    reject_recent_days: int = 0,
    require_month: bool = False,
    require_day: bool = False,
) -> pd.DataFrame:
    """
    Filtra registros por validade temporal.

    - require_year: remove registros sem ano.
    - min_year/max_year: aplica janela temporal (cada lado é opcional).
    - validate_month_day: quando as colunas `month`/`day` existem, rejeita
      `month` fora de 1-12 e `day` fora do intervalo válido do mês (considerando
      ano bissexto). Valores ausentes (NaN) em month/day NÃO invalidam o registro.
    - reject_future_dates: rejeita registros cuja data (ano, e mês/dia quando
      presentes) é posterior à data de execução — impossível para uma observação.
    - reject_recent_days: alarga esse corte N dias para TRÁS. Existe porque o ERA5-Land
      é uma REANÁLISE e leva alguns dias para publicar cada dia: um registro de ontem
      NÃO TEM COMO receber clima (o servidor devolve HTTP 400 — o dado não existe).
      Barrar aqui evita descobrir isso horas depois, quando a captação ambiental falha.
    - require_month/require_day: remove registros sem mês / sem dia. Diferente de
      `validate_month_day` (que só rejeita valor PRESENTE porém inválido), estes
      EXIGEM o campo preenchido — usados para garantir DATA COMPLETA quando a
      captação ambiental precisa do dia/mês exato.
    """
    if "year" not in df.columns:
        return df
    mask = pd.Series(True, index=df.index)
    if require_year:
        mask &= df["year"].notna()
    if require_month and "month" in df.columns:
        mask &= df["month"].notna()
    if require_day and "day" in df.columns:
        mask &= df["day"].notna()
    if min_year is not None:
        mask &= df["year"] >= min_year
    if max_year is not None:
        mask &= df["year"] <= max_year

    if validate_month_day:
        if "month" in df.columns:
            m = df["month"]
            # inválido apenas quando presente E fora de 1..12
            bad_month = m.notna() & ~m.between(1, 12, inclusive="both")
            mask &= ~bad_month
        if "day" in df.columns:
            d = df["day"]
            year = df["year"] if "year" in df.columns else pd.Series(np.nan, index=df.index)
            month = df["month"] if "month" in df.columns else pd.Series(np.nan, index=df.index)
            max_day = _days_in_month(year, month)
            bad_day = d.notna() & (~d.between(1, max_day, inclusive="both"))
            mask &= ~bad_day

    if reject_future_dates or reject_recent_days > 0:
        # CORTE COM FOLGA. Data futura é impossível para uma observação. E data RECENTE
        # DEMAIS é inútil para o modelo: o ERA5-Land é uma REANÁLISE e só publica um dia
        # alguns dias depois (medido em 2026-07-13: 08/07 baixou; 09/07 e 10/07 devolveram
        # HTTP 400 — o dado não existia ainda). Um registro de ontem não teria clima.
        # `reject_recent_days=0` reproduz o comportamento antigo (corta só o futuro).
        hoje = datetime.now(timezone.utc)
        corte = hoje - timedelta(days=int(reject_recent_days))
        yr = df["year"]
        fora = yr > corte.year
        mesmo_ano = yr == corte.year
        if "month" in df.columns:
            mth = df["month"].fillna(1)
            fora |= mesmo_ano & (mth > corte.month)
            mesmo_am = mesmo_ano & (mth == corte.month)
            if "day" in df.columns:
                dy = df["day"].fillna(1)
                fora |= mesmo_am & (dy > corte.day)
        mask &= ~fora.fillna(False)

    return df[mask]


# ---------------------------------------------------------------------------
# Filtros espaciais (flags + remoção opcional)
# ---------------------------------------------------------------------------
def _polygon_centroids(gdf) -> tuple[np.ndarray, np.ndarray]:
    """Extrai (lat, lon) dos centroides de um GeoDataFrame de polígonos."""
    # Silencia o aviso de centroide em CRS geográfico: para este heurístico a
    # pequena imprecisão do centroide planar é aceitável (mesma base usada pelo
    # CoordinateCleaner).
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        cent = gdf.geometry.centroid
    return cent.y.to_numpy(), cent.x.to_numpy()


def flag_centroids(
    df: pd.DataFrame,
    reference: ReferenceData,
    tolerance_km: float,
    levels: list[str],
    report: Optional[CleaningReport] = None,
) -> pd.DataFrame:
    """
    Adiciona a coluna booleana `is_centroid`.

    Marca registros próximos (< tolerance_km) do centroide de qualquer país
    e/ou estado, seguindo a abordagem do CoordinateCleaner (`cc_cen`): os
    centroides administrativos são pontos de referência conhecidos onde
    coordenadas imprecisas costumam ser "empilhadas".
    """
    df = df.copy()
    if "is_centroid" not in df.columns:
        df["is_centroid"] = False
    if df.empty:
        return df

    ref_lat_parts: list[np.ndarray] = []
    ref_lon_parts: list[np.ndarray] = []

    if "country" in levels:
        gdf = reference.countries
        if gdf is None:
            if report:
                report.skip("centroids.country", "polígonos de país indisponíveis")
        else:
            la, lo = _polygon_centroids(gdf)
            ref_lat_parts.append(la)
            ref_lon_parts.append(lo)

    if "state" in levels:
        gdf = reference.states
        if gdf is None:
            if report:
                report.skip("centroids.state", "polígonos de estado indisponíveis")
        else:
            la, lo = _polygon_centroids(gdf)
            ref_lat_parts.append(la)
            ref_lon_parts.append(lo)

    if not ref_lat_parts:
        return df

    ref_lat = np.concatenate(ref_lat_parts)
    ref_lon = np.concatenate(ref_lon_parts)
    flags = _flag_near_reference(
        df[LAT].to_numpy(), df[LON].to_numpy(), ref_lat, ref_lon, tolerance_km
    )
    df["is_centroid"] = flags
    return df


def flag_institutions(
    df: pd.DataFrame,
    reference: ReferenceData,
    buffer_m: float,
    report: Optional[CleaningReport] = None,
) -> pd.DataFrame:
    """
    Adiciona a coluna booleana `is_institution`.

    Marca registros dentro de `buffer_m` metros de museus, herbários,
    universidades, coleções zoológicas e jardins botânicos (base de
    instituições conhecida). Análogo ao `cc_inst` do CoordinateCleaner.
    """
    df = df.copy()
    if "is_institution" not in df.columns:
        df["is_institution"] = False
    if df.empty:
        return df

    inst = reference.institutions
    if inst is None or inst.empty:
        if report:
            report.skip("institutions", "base de instituições indisponível")
        return df

    flags = _flag_near_reference(
        df[LAT].to_numpy(), df[LON].to_numpy(),
        inst["lat"].to_numpy(), inst["lon"].to_numpy(),
        radius_km=buffer_m / 1000.0,
    )
    df["is_institution"] = flags
    return df


def flag_capitals(
    df: pd.DataFrame,
    reference: ReferenceData,
    tolerance_km: float,
    report: Optional[CleaningReport] = None,
) -> pd.DataFrame:
    """
    Adiciona a coluna booleana `is_capital`.

    Marca registros próximos (< tolerance_km) de capitais nacionais — outro
    ponto de agregação comum de coordenadas imprecisas (`cc_cap`).
    """
    df = df.copy()
    if "is_capital" not in df.columns:
        df["is_capital"] = False
    if df.empty:
        return df

    cap = reference.capitals
    if cap is None or cap.empty:
        if report:
            report.skip("capitals", "base de capitais indisponível")
        return df

    flags = _flag_near_reference(
        df[LAT].to_numpy(), df[LON].to_numpy(),
        cap["lat"].to_numpy(), cap["lon"].to_numpy(), tolerance_km,
    )
    df["is_capital"] = flags
    return df


def flag_spatial_outliers(
    df: pd.DataFrame,
    multiplier: float = 5.0,
    min_km: float = 1000.0,
    min_n: int = 20,
    report: Optional[CleaningReport] = None,
) -> pd.DataFrame:
    """
    Adiciona a coluna booleana `is_spatial_outlier`.

    Marca registros geograficamente MUITO distantes do núcleo da distribuição —
    tipicamente erro de coordenada, animal de cativeiro (zoológico) ou hemisfério
    trocado. Esses pontos incham a Área M a jusante e comprometem o modelo.

    Metodologia (inspirada no `cc_outl` do CoordinateCleaner):
      1. Centro ROBUSTO = (mediana das latitudes, mediana das longitudes). A mediana
         não é puxada pelos poucos outliers (ao contrário da média).
      2. Distância de grande círculo (km) de cada ponto a esse centro.
      3. Cerca de Tukey na distribuição das distâncias: limite = Q3 + multiplier×IQR.
         `multiplier` alto (5) = conservador: só corta o claramente aberrante.
      4. Trava: nunca marca abaixo de `min_km` (protege espécie de área pequena, onde
         o IQR é minúsculo e o limite ficaria baixo demais).

    Pula (não marca nada) se houver menos de `min_n` registros com coordenada válida
    — poucos pontos não definem um "normal" confiável.
    """
    df = df.copy()
    if "is_spatial_outlier" not in df.columns:
        df["is_spatial_outlier"] = False
    if LAT not in df.columns or LON not in df.columns or df.empty:
        return df

    valid = df[LAT].notna() & df[LON].notna()
    n = int(valid.sum())
    if n < min_n:
        if report is not None:
            report.skip("spatial_outliers", f"poucos registros ({n} < {min_n})")
        return df

    lat = df.loc[valid, LAT].to_numpy(dtype=float)
    lon = df.loc[valid, LON].to_numpy(dtype=float)
    center_lat = float(np.median(lat))
    center_lon = float(np.median(lon))
    dist = _great_circle_km(lat, lon, center_lat, center_lon)

    q1, q3 = np.percentile(dist, [25, 75])
    iqr = q3 - q1
    threshold = max(q3 + multiplier * iqr, min_km)
    is_out = dist > threshold

    flags = pd.Series(False, index=df.index)
    flags.loc[df.index[valid]] = is_out
    df["is_spatial_outlier"] = flags.to_numpy()
    return df


def filter_sea(
    df: pd.DataFrame,
    habitat: str,
    report: Optional[CleaningReport] = None,
) -> pd.DataFrame:
    """
    Verificação terra x oceano usando a máscara global `global-land-mask`.

    - habitat == "terrestrial": remove registros no oceano (mantém terra).
    - habitat == "marine": remove registros em terra (mantém oceano).
    - habitat == "any": não aplica.
    """
    if habitat == "any":
        return df
    if LAT not in df.columns or LON not in df.columns or df.empty:
        return df

    try:
        from global_land_mask import globe
    except ImportError:
        if report:
            report.skip("sea_or_land", "global-land-mask não instalado")
        return df

    # globe.is_land espera lon em [-180, 180] e lat em [-90, 90] (já garantido
    # pelos filtros de coordenada anteriores).
    is_land = globe.is_land(df[LAT].to_numpy(), df[LON].to_numpy())
    if habitat == "terrestrial":
        return df[is_land]
    # marine
    return df[~is_land]


# ---------------------------------------------------------------------------
# Thinning espacial (rarefação; spThin)
# ---------------------------------------------------------------------------
def _conflict_pairs(lat: np.ndarray, lon: np.ndarray, min_distance_km: float):
    """
    Retorna os pares de índices (i, j) mais próximos que `min_distance_km`.

    Usa KD-tree na esfera unitária (chord distance). Fallback vetorizado por
    força bruta quando scipy não está disponível.
    """
    xyz = _unit_sphere_xyz(lat, lon)
    theta = min_distance_km / EARTH_RADIUS_KM
    chord_threshold = 2.0 * np.sin(theta / 2.0)
    try:
        from scipy.spatial import cKDTree

        tree = cKDTree(xyz)
        return tree.query_pairs(chord_threshold, output_type="set")
    except ImportError:
        pairs = set()
        n = len(xyz)
        for i in range(n):
            d = np.sqrt(((xyz[i + 1:] - xyz[i]) ** 2).sum(axis=1))
            for offset in np.nonzero(d <= chord_threshold)[0]:
                pairs.add((i, i + 1 + int(offset)))
        return pairs


def _date_keys(df: pd.DataFrame) -> Optional[list]:
    """
    Constrói uma chave de data por registro para o thinning "mesma data".

    Retorna uma lista alinhada às linhas: uma string `"AAAA-M-D"` (com `x` onde
    mês/dia faltam) quando o ANO é conhecido, ou `None` quando não há ano. Dois
    registros só são considerados "mesma data" se ambas as chaves forem iguais e
    não-nulas.
    """
    if "year" not in df.columns:
        return None
    y = pd.to_numeric(df["year"], errors="coerce")
    m = (pd.to_numeric(df["month"], errors="coerce")
         if "month" in df.columns else pd.Series(np.nan, index=df.index))
    d = (pd.to_numeric(df["day"], errors="coerce")
         if "day" in df.columns else pd.Series(np.nan, index=df.index))
    keys: list = []
    for yi, mi, di in zip(y.to_numpy(), m.to_numpy(), d.to_numpy()):
        if pd.isna(yi):
            keys.append(None)
            continue
        ms = str(int(mi)) if not pd.isna(mi) else "x"
        ds = str(int(di)) if not pd.isna(di) else "x"
        keys.append(f"{int(yi)}-{ms}-{ds}")
    return keys


def spatial_thin(
    df: pd.DataFrame,
    min_distance_km: float,
    method: str = "random",
    seed: Optional[int] = None,
    same_date_only: bool = False,
) -> pd.DataFrame:
    """
    Rarefação espacial das presenças por distância geodésica (inspirado em spThin).

    Diferente da deduplicação por célula, garante que nenhum par de registros
    mantidos fique mais próximo que `min_distance_km`, mitigando o viés amostral
    espacial típico do GBIF (mais registros perto de estradas/cidades).

    Métodos:
        - "random": heurística gulosa — remove iterativamente o ponto com mais
          vizinhos em conflito (empates resolvidos aleatoriamente com `seed`),
          maximizando o número de pontos retidos. Garante a distância mínima.
        - "grid": mantém no máximo um ponto por célula de grade de lado
          ~ `min_distance_km` (determinístico; aproxima a distância mínima).

    Parâmetros:
        df: DataFrame com colunas de coordenada.
        min_distance_km: distância mínima permitida entre pontos mantidos.
        method: "random" ou "grid".
        seed: semente para reprodutibilidade do método "random".
        same_date_only: se True, só considera "conflito" (candidato a remoção)
            um par de pontos próximos que compartilham a MESMA data (ano/mês/dia);
            pontos próximos com datas diferentes ou sem data são preservados.

    Retorna:
        Subconjunto de `df` respeitando o espaçamento mínimo.
    """
    if LAT not in df.columns or LON not in df.columns:
        return df
    n = len(df)
    if n <= 1 or min_distance_km <= 0:
        return df

    lat = df[LAT].to_numpy(dtype=float)
    lon = df[LON].to_numpy(dtype=float)
    date_key = _date_keys(df) if same_date_only else None

    if method == "grid":
        keep_pos = _thin_grid(lat, lon, min_distance_km, date_key)
    else:
        keep_pos = _thin_random(lat, lon, min_distance_km, seed, date_key)

    return df.iloc[np.sort(keep_pos)]


def _thin_grid(
    lat: np.ndarray,
    lon: np.ndarray,
    min_distance_km: float,
    date_key: Optional[list] = None,
) -> np.ndarray:
    """
    Mantém o primeiro ponto de cada célula de grade (~min_distance_km).

    Com `date_key`, a data entra na chave da célula: pontos na mesma célula mas
    com datas diferentes são preservados; registros sem data (chave None) nunca
    são fundidos (recebem um token único).
    """
    lat_cell = min_distance_km / 111.0
    mean_lat = float(np.nanmean(lat))
    lon_scale = max(np.cos(np.radians(mean_lat)), 1e-6)
    lon_cell = min_distance_km / (111.0 * lon_scale)
    cell_lat = np.floor(lat / lat_cell).astype("int64")
    cell_lon = np.floor(lon / lon_cell).astype("int64")

    if date_key is None:
        str_keys = [f"{a}|{b}" for a, b in zip(cell_lat, cell_lon)]
    else:
        str_keys = [
            f"{a}|{b}|" + (dk if dk is not None else f"__none_{i}")
            for i, (a, b, dk) in enumerate(zip(cell_lat, cell_lon, date_key))
        ]
    _unique, first_idx = np.unique(np.asarray(str_keys), return_index=True)
    return first_idx


def _thin_random(
    lat: np.ndarray,
    lon: np.ndarray,
    min_distance_km: float,
    seed: Optional[int],
    date_key: Optional[list] = None,
) -> np.ndarray:
    """Remoção gulosa aleatória até nenhum par violar a distância mínima."""
    pairs = _conflict_pairs(lat, lon, min_distance_km)
    n = len(lat)
    # "Mesma data": um par só é conflito se ambas as datas existem e são iguais.
    if date_key is not None and pairs:
        pairs = {
            (i, j) for (i, j) in pairs
            if date_key[i] is not None and date_key[i] == date_key[j]
        }
    if not pairs:
        return np.arange(n)

    # Listas de adjacência apenas para os nós envolvidos em conflitos.
    neighbors: dict[int, set[int]] = {}
    for i, j in pairs:
        neighbors.setdefault(i, set()).add(j)
        neighbors.setdefault(j, set()).add(i)

    degree = {i: len(nb) for i, nb in neighbors.items()}
    rng = np.random.default_rng(seed)
    removed: set[int] = set()

    while True:
        max_deg = max(degree.values(), default=0)
        if max_deg == 0:
            break
        candidates = [i for i, d in degree.items() if d == max_deg]
        pick = int(candidates[int(rng.integers(len(candidates)))])
        for nb in neighbors[pick]:
            if pick in neighbors[nb]:
                neighbors[nb].discard(pick)
                degree[nb] -= 1
        neighbors[pick] = set()
        degree[pick] = 0
        removed.add(pick)

    return np.array([i for i in range(n) if i not in removed], dtype=int)


# ---------------------------------------------------------------------------
# Orquestrador
# ---------------------------------------------------------------------------
def _apply_flag_and_optional_remove(
    df: pd.DataFrame,
    flag_col: str,
    remove: bool,
    report: CleaningReport,
    removal_step: str,
) -> pd.DataFrame:
    """Registra a contagem de uma flag e, se `remove`, remove os flagueados."""
    n_flagged = int(df[flag_col].sum()) if flag_col in df.columns else 0
    report.flagged[flag_col] = n_flagged
    if remove and flag_col in df.columns:
        before = len(df)
        df = df[~df[flag_col]]
        report.record_removal(removal_step, before, len(df))
    return df


def clean_occurrences(
    df: pd.DataFrame,
    config: CleaningConfig,
    reference: Optional[ReferenceData] = None,
) -> tuple[pd.DataFrame, CleaningReport]:
    """
    Aplica o pipeline completo de limpeza segundo `config`.

    Ordem (barata -> cara): filtros tabulares primeiro (reduzem N), deduplicação
    antes dos filtros espaciais (reduzem o custo geoespacial) e, por fim, as
    verificações espaciais. Cada etapa é opcional via configuração.

    Retorna:
        (df_limpo, relatório).
    """
    if reference is None:
        reference = ReferenceData(config)

    report = CleaningReport()
    report.config = config.to_dict()

    df = prepare_dataframe(df)
    report.initial_records = len(df)

    # --- Coordenadas ---
    if config.remove_missing_coordinates:
        before = len(df)
        df = remove_missing_coordinates(df)
        report.record_removal("missing_coordinates", before, len(df))
    if config.remove_invalid_coordinates:
        before = len(df)
        df = remove_invalid_coordinates(df)
        report.record_removal("invalid_coordinates", before, len(df))
    if config.remove_zero_coordinates:
        before = len(df)
        df = remove_zero_coordinates(df)
        report.record_removal("zero_coordinates", before, len(df))
    if config.remove_equal_coordinates:
        before = len(df)
        df = remove_equal_coordinates(df)
        report.record_removal("equal_coordinates", before, len(df))

    # --- Issues do GBIF ---
    if config.remove_flagged_issues:
        before = len(df)
        df = filter_gbif_issues(df, config.critical_issues)
        report.record_removal("gbif_issues", before, len(df))

    # --- Basis of record ---
    if config.filter_basis_of_record:
        before = len(df)
        df = filter_basis_of_record(df, config.accepted_basis_of_record)
        report.record_removal("basis_of_record", before, len(df))

    # --- Occurrence status (ausências) ---
    if config.remove_absent:
        before = len(df)
        df = remove_absent_records(df, config.absent_status_values)
        report.record_removal("occurrence_status_absent", before, len(df))

    # --- Incerteza ---
    if config.max_coordinate_uncertainty is not None:
        before = len(df)
        df = filter_coordinate_uncertainty(
            df, config.max_coordinate_uncertainty, config.keep_missing_uncertainty
        )
        report.record_removal("coordinate_uncertainty", before, len(df))

    # --- Datas ---
    if config.remove_invalid_dates:
        before = len(df)
        df = filter_dates(
            df,
            # data completa (mês/dia) implica exigir o ano — senão sobraria registro
            # com mês/dia mas sem ano, que a captação por data também não aproveita.
            require_year=config.require_year or config.require_complete_date,
            min_year=config.min_year, max_year=config.max_year,
            validate_month_day=config.validate_month_day,
            reject_future_dates=config.reject_future_dates,
            reject_recent_days=config.reject_recent_days,
            require_month=config.require_complete_date,
            require_day=config.require_complete_date,
        )
        report.record_removal("invalid_dates", before, len(df))

    # --- Duplicatas (antes dos filtros espaciais) ---
    if config.remove_duplicates:
        before = len(df)
        df = remove_duplicates(
            df, config.duplicate_mode, config.duplicate_decimals,
            config.duplicate_subset,
        )
        report.record_removal("duplicates", before, len(df))

    # --- Outliers geográficos (ANTES do thinning e da Área M a jusante): remove os
    #     pontos muito fora do núcleo (zoológico/erro de coordenada) para não inflar
    #     a Área M e não contaminar o modelo. ---
    if config.flag_spatial_outliers or config.remove_spatial_outliers:
        df = flag_spatial_outliers(
            df, config.spatial_outlier_multiplier, config.spatial_outlier_min_km,
            config.spatial_outlier_min_n, report,
        )
        df = _apply_flag_and_optional_remove(
            df, "is_spatial_outlier", config.remove_spatial_outliers, report,
            "spatial_outliers")

    # --- Thinning espacial (rarefação por distância; reduz N e viés amostral) ---
    if config.apply_spatial_thinning:
        before = len(df)
        df = spatial_thin(
            df, config.thinning_min_distance_km, config.thinning_method,
            config.thinning_seed, config.thinning_same_date_only,
        )
        report.record_removal("spatial_thinning", before, len(df))

    # --- Centroides administrativos ---
    if config.flag_centroids or config.remove_centroids:
        df = flag_centroids(
            df, reference, config.centroid_tolerance_km,
            config.centroid_levels, report,
        )
        df = _apply_flag_and_optional_remove(
            df, "is_centroid", config.remove_centroids, report, "centroids")

    # --- Instituições ---
    if config.flag_institutions or config.remove_institutions:
        df = flag_institutions(df, reference, config.institution_buffer_m, report)
        df = _apply_flag_and_optional_remove(
            df, "is_institution", config.remove_institutions, report, "institutions")

    # --- Capitais ---
    if config.flag_capitals or config.remove_capitals:
        df = flag_capitals(df, reference, config.capital_tolerance_km, report)
        df = _apply_flag_and_optional_remove(
            df, "is_capital", config.remove_capitals, report, "capitals")

    # --- Terra x Oceano ---
    if config.habitat != "any":
        before = len(df)
        df = filter_sea(df, config.habitat, report)
        report.record_removal("sea_or_land", before, len(df))

    # --- Seleção de colunas de saída ---
    df = _select_output_columns(df, config)

    report.final_records = len(df)
    return df.reset_index(drop=True), report


def _select_output_columns(df: pd.DataFrame, config: CleaningConfig) -> pd.DataFrame:
    """Aplica a seleção/limpeza de colunas conforme a configuração."""
    flag_cols = [c for c in ("is_centroid", "is_institution", "is_capital",
                             "is_spatial_outlier")
                 if c in df.columns]

    if config.output_columns is not None:
        cols = [c for c in config.output_columns if c in df.columns]
        if config.keep_flag_columns:
            cols += [c for c in flag_cols if c not in cols]
        df = df[cols]
    elif not config.keep_flag_columns:
        df = df.drop(columns=flag_cols, errors="ignore")

    return df


# ---------------------------------------------------------------------------
# Conveniência de arquivo + CLI
# ---------------------------------------------------------------------------
def _default_output_path(input_csv: str) -> str:
    """Deriva o caminho do CSV limpo preservando o nome esperado a jusante."""
    base = os.path.basename(input_csv)
    directory = os.path.dirname(input_csv)
    if base.endswith("_GBIF_raw.csv"):
        out = base.replace("_GBIF_raw.csv", "_GBIF_Data.csv")
    else:
        stem, ext = os.path.splitext(base)
        out = f"{stem}_clean.csv"
    return os.path.join(directory, out)


def clean_file(
    input_csv: str,
    config: CleaningConfig,
    output_csv: Optional[str] = None,
    report_dir: Optional[str] = None,
) -> str:
    """
    Lê o CSV bruto, aplica a limpeza e grava o CSV limpo + relatórios.

    Retorna o caminho do CSV limpo gerado.
    """
    if output_csv is None:
        output_csv = _default_output_path(input_csv)
    if report_dir is None:
        report_dir = os.path.dirname(output_csv) or "."
    os.makedirs(report_dir, exist_ok=True)

    print(f"Lendo RAW: {input_csv}")
    df = pd.read_csv(input_csv, low_memory=False)

    clean_df, report = clean_occurrences(df, config)

    clean_df.to_csv(output_csv, index=False)
    print(f"CSV limpo salvo em: {output_csv} | {len(clean_df)} registros")

    json_path = os.path.join(report_dir, "cleaning_report.json")
    txt_path = os.path.join(report_dir, "cleaning_report.txt")
    report.to_json(json_path)
    report.to_txt(txt_path)
    print(f"Relatórios: {json_path} | {txt_path}")

    return output_csv


def run_cmd(args: argparse.Namespace) -> None:
    """Ponto de entrada da CLI (subcomando `gbif_clean`)."""
    if getattr(args, "config", None):
        config = CleaningConfig.from_json(args.config)
    else:
        config = CleaningConfig()

    # Overrides pontuais de linha de comando (têm precedência sobre o JSON).
    if getattr(args, "habitat", None):
        config.habitat = args.habitat
    if getattr(args, "max_coordinate_uncertainty", None) is not None:
        config.max_coordinate_uncertainty = args.max_coordinate_uncertainty
    if getattr(args, "remove_centroids", False):
        config.remove_centroids = True
    if getattr(args, "remove_institutions", False):
        config.remove_institutions = True
    if getattr(args, "remove_capitals", False):
        config.remove_capitals = True
    if getattr(args, "reference_data_dir", None):
        config.reference_data_dir = args.reference_data_dir
    if getattr(args, "min_year", None) is not None:
        config.min_year = args.min_year
    if getattr(args, "max_year", None) is not None:
        config.max_year = args.max_year

    clean_file(
        input_csv=args.csv,
        config=config,
        output_csv=getattr(args, "output_csv", None),
        report_dir=getattr(args, "report_dir", None),
    )
