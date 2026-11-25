# config.py - Configuração da etapa de limpeza de ocorrências
#
# Centraliza TODOS os parâmetros configuráveis da limpeza. Nada de valores
# "hard coded" espalhados: cada filtro lê seus parâmetros a partir de uma
# instância de `CleaningConfig`, que pode ser criada em código, carregada de um
# JSON ou serializada para JSON (útil para rastreabilidade/reprodutibilidade).

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from typing import Optional


# ---------------------------------------------------------------------------
# Valores padrão (defensáveis segundo a literatura de limpeza para SDM).
# ---------------------------------------------------------------------------

# "Issues" do GBIF consideradas críticas por padrão. São flags emitidas pela
# própria interpretação do GBIF que indicam problemas graves de georreferência
# ou de correspondência taxonômica. Nomes conforme o enum oficial do GBIF.
DEFAULT_CRITICAL_ISSUES: tuple[str, ...] = (
    "ZERO_COORDINATE",
    "COORDINATE_INVALID",
    "COORDINATE_OUT_OF_RANGE",
    "COUNTRY_COORDINATE_MISMATCH",
    "CONTINENT_COORDINATE_MISMATCH",
    "PRESUMED_SWAPPED_COORDINATE",
    "PRESUMED_NEGATED_LATITUDE",
    "PRESUMED_NEGATED_LONGITUDE",
    "TAXON_MATCH_HIGHERRANK",
    "TAXON_MATCH_NONE",
)

# Tipos de registro (basisOfRecord) aceitos por padrão. FOSSIL_SPECIMEN e
# LIVING_SPECIMEN ficam de fora porque não representam a distribuição atual e
# natural da espécie (fósseis = distribuição pretérita; espécimes vivos =
# jardins/zoológicos/cativeiro).
DEFAULT_ACCEPTED_BASIS_OF_RECORD: tuple[str, ...] = (
    "HUMAN_OBSERVATION",
    "MACHINE_OBSERVATION",
    "OBSERVATION",
    "PRESERVED_SPECIMEN",
    "MATERIAL_SAMPLE",
    "MATERIAL_CITATION",
    "OCCURRENCE",
)

# Valores de occurrenceStatus considerados "ausência" (removidos por padrão
# quando se modela presença).
DEFAULT_ABSENT_STATUS: tuple[str, ...] = ("ABSENT",)


@dataclass
class CleaningConfig:
    """
    Configuração completa da limpeza de ocorrências.

    Todos os filtros são opcionais e controlados por flags. Parâmetros com
    valor `None` desativam o filtro correspondente (ex.: `max_coordinate_uncertainty=None`
    não aplica corte por incerteza).

    Atributos (agrupados por etapa):

    Coordenadas:
        remove_missing_coordinates: remove registros sem lat/lon.
        remove_invalid_coordinates: remove |lat|>90 ou |lon|>180.
        remove_zero_coordinates: remove exatamente (0, 0).
        remove_equal_coordinates: remove registros com lat == lon (cc_equ), um
            indício clássico de inversão/erro de transcrição dos campos.

    Duplicatas:
        remove_duplicates: liga/desliga a deduplicação.
        duplicate_mode: "exact" (todas as colunas-chave) ou "spatial" (apenas
            lat/lon).
        duplicate_decimals: se informado, arredonda lat/lon a N casas antes de
            deduplicar espacialmente (agrupa pontos quase coincidentes).
        duplicate_subset: colunas usadas no modo "exact"; se None usa o padrão
            (lat, lon, ano, mês, dia).

    Thinning espacial (rarefação; spThin):
        apply_spatial_thinning: liga/desliga o thinning por distância geodésica.
            Diferente da deduplicação por célula, remove iterativamente pontos
            mais próximos que `thinning_min_distance_km`, reduzindo o viés
            amostral espacial (Aiello-Lammens et al., 2015).
        thinning_min_distance_km: distância mínima (km) entre presenças mantidas.
        thinning_method: "random" (remoção aleatória gulosa) ou "grid"
            (um ponto por célula de grade de lado ~ min_distance).
        thinning_seed: semente para reprodutibilidade do método "random".
        thinning_same_date_only: se True, o thinning só remove pontos próximos
            que compartilham a MESMA data (ano/mês/dia). Pontos próximos com
            datas diferentes (ou sem data) são PRESERVADOS — evita descartar
            observações de eventos temporais distintos no mesmo local.

    Incerteza:
        max_coordinate_uncertainty: incerteza máxima aceitável (metros). None
            desativa. Registros SEM valor de incerteza são mantidos por padrão
            (ver keep_missing_uncertainty).
        keep_missing_uncertainty: se True (padrão), mantém registros sem
            coordinateUncertaintyInMeters; se False, remove-os.

    Issues do GBIF:
        remove_flagged_issues: liga/desliga o filtro por issues.
        critical_issues: lista de issues que causam remoção.

    Basis of record:
        filter_basis_of_record: liga/desliga.
        accepted_basis_of_record: tipos aceitos.

    Occurrence status:
        remove_absent: remove registros marcados como ausência.
        absent_status_values: quais valores contam como ausência.

    Datas:
        remove_invalid_dates: liga/desliga o filtro temporal.
        require_year: remove registros sem ano.
        min_year / max_year: janela temporal aceitável (None desativa o lado).
        validate_month_day: rejeita month fora de 1-12 e day fora do intervalo
            válido do mês (considerando ano bissexto), quando as colunas existem.
        reject_future_dates: rejeita registros cuja data (ano/mês/dia) é
            posterior à data de execução (impossível para uma observação).
        require_complete_date: remove registros sem DATA COMPLETA (ano E mês E
            dia). Ligado por padrão porque a captação ambiental é por data.

    Outliers geográficos:
        flag_spatial_outliers: calcula a coluna `is_spatial_outlier`.
        remove_spatial_outliers: além de marcar, remove os pontos muito distantes
            do núcleo da distribuição (erro de coordenada, cativeiro, hemisfério
            trocado). Centro robusto (mediana) + cerca de Tukey (Q3 + k×IQR) na
            distância de grande círculo, com trava mínima e nº mínimo de pontos.
        spatial_outlier_multiplier: k da cerca de Tukey (5 = conservador).
        spatial_outlier_min_km: distância mínima abaixo da qual nunca marca
            (protege espécies de área pequena, onde o IQR é minúsculo).
        spatial_outlier_min_n: nº mínimo de registros válidos para aplicar o filtro.

    Centroides administrativos:
        flag_centroids: calcula a coluna `is_centroid`.
        remove_centroids: além de marcar, remove os flagueados.
        centroid_tolerance_km: distância ao centroide para considerar suspeito.
        centroid_levels: níveis administrativos a avaliar ("country", "state").

    Instituições (museus, herbários, universidades, coleções, jardins):
        flag_institutions: calcula a coluna `is_institution`.
        remove_institutions: além de marcar, remove os flagueados.
        institution_buffer_m: raio (metros) ao redor de uma instituição.

    Capitais:
        flag_capitals: calcula a coluna `is_capital`.
        remove_capitals: além de marcar, remove os flagueados.
        capital_tolerance_km: distância à capital para considerar suspeito.

    Terra x Oceano:
        habitat: "terrestrial" (remove pontos no mar), "marine" (remove pontos
            em terra) ou "any" (não aplica).

    Dados de referência / performance:
        reference_data_dir: diretório de cache dos dados cartográficos.
        auto_download_reference: baixa Natural Earth/instituições se ausente.
        country_shapefile / state_shapefile: caminhos opcionais para polígonos.
        institutions_csv / capitals_csv: caminhos opcionais para referências.

    Saída:
        output_columns: se informado, restringe as colunas do CSV limpo. Se
            None, mantém todas (colunas de flag `is_*` são sempre preservadas).
        keep_flag_columns: mantém as colunas `is_centroid/is_institution/is_capital`
            no CSV final.
    """

    # --- Coordenadas ---
    remove_missing_coordinates: bool = True
    remove_invalid_coordinates: bool = True
    remove_zero_coordinates: bool = True
    remove_equal_coordinates: bool = True  # lat == lon (cc_equ): erro de inversão de campos

    # --- Duplicatas ---
    remove_duplicates: bool = True
    duplicate_mode: str = "spatial"  # "exact" | "spatial"
    duplicate_decimals: Optional[int] = None
    duplicate_subset: Optional[list[str]] = None

    # --- Thinning espacial (rarefação por distância geodésica; spThin) ---
    apply_spatial_thinning: bool = True
    thinning_min_distance_km: float = 1.0
    thinning_method: str = "random"  # "random" | "grid"
    thinning_seed: Optional[int] = None
    thinning_same_date_only: bool = True  # só remove vizinhos com a MESMA data

    # --- Incerteza ---
    max_coordinate_uncertainty: Optional[float] = None
    keep_missing_uncertainty: bool = True

    # --- Issues ---
    remove_flagged_issues: bool = True
    critical_issues: list[str] = field(
        default_factory=lambda: list(DEFAULT_CRITICAL_ISSUES)
    )

    # --- Basis of record ---
    filter_basis_of_record: bool = True
    accepted_basis_of_record: list[str] = field(
        default_factory=lambda: list(DEFAULT_ACCEPTED_BASIS_OF_RECORD)
    )

    # --- Occurrence status ---
    remove_absent: bool = True
    absent_status_values: list[str] = field(
        default_factory=lambda: list(DEFAULT_ABSENT_STATUS)
    )

    # --- Datas ---
    remove_invalid_dates: bool = True
    require_year: bool = True
    min_year: Optional[int] = None
    max_year: Optional[int] = None
    validate_month_day: bool = True   # rejeita month fora de 1-12 / day fora do mês
    reject_future_dates: bool = True  # rejeita datas posteriores à execução
    # Alarga o corte acima N dias para TRÁS. O ERA5-Land é uma REANÁLISE e leva alguns dias
    # para publicar cada dia — medido em 2026-07-13: 08/07 baixou; 09/07 e 10/07 devolveram
    # HTTP 400 (o dado não existia ainda). Um registro de ontem NÃO TEM COMO receber clima,
    # então não deve entrar. 5 dias cobre o atraso observado com folga. 0 desliga.
    reject_recent_days: int = 5
    # Exige DATA COMPLETA (ano E mês E dia). Ligado por padrão porque a captação de
    # variáveis ambientais (etapa 03) é POR DATA — ERA5 baixa o DIA, NDVI o MÊS — e
    # um registro sem data completa não tem como receber esses valores. Remover aqui
    # (na limpeza) evita arrastar registros que seriam descartados adiante.
    require_complete_date: bool = True

    # --- Outliers geográficos (pontos fora do núcleo da distribuição) ---
    # Remove registros geograficamente MUITO distantes do grosso das ocorrências —
    # tipicamente erro de coordenada, animal de cativeiro (zoológico) ou hemisfério
    # trocado. Esses pontos incham a Área M a jusante (pseudoausências espalhadas) e
    # comprometem o modelo. Metodologia (ver flag_spatial_outliers): centro = mediana
    # (robusta), distância de grande círculo ao centro, cerca de Tukey Q3+k×IQR.
    flag_spatial_outliers: bool = True     # calcula a coluna is_spatial_outlier
    remove_spatial_outliers: bool = True   # além de marcar, remove os outliers
    spatial_outlier_multiplier: float = 5.0   # k da cerca de Tukey (conservador)
    spatial_outlier_min_km: float = 1000.0    # trava: nunca marca abaixo disso
    spatial_outlier_min_n: int = 20           # pula se houver menos registros válidos

    # --- Centroides ---
    flag_centroids: bool = True
    remove_centroids: bool = False
    centroid_tolerance_km: float = 1.0
    centroid_levels: list[str] = field(default_factory=lambda: ["country", "state"])

    # --- Instituições ---
    # Zoológicos/museus/universidades/coleções: coordenadas de cativeiro/coleção NÃO
    # representam a distribuição natural. Removido por padrão (era só marcado).
    flag_institutions: bool = True
    remove_institutions: bool = True
    institution_buffer_m: float = 1000.0

    # --- Capitais ---
    flag_capitals: bool = True
    remove_capitals: bool = False
    capital_tolerance_km: float = 10.0

    # --- Terra x Oceano ---
    habitat: str = "terrestrial"  # "terrestrial" | "marine" | "any"

    # --- Dados de referência / performance ---
    reference_data_dir: str = "gbif_reference_cache"
    auto_download_reference: bool = True
    country_shapefile: Optional[str] = None
    state_shapefile: Optional[str] = None
    institutions_csv: Optional[str] = None
    capitals_csv: Optional[str] = None

    # --- Saída ---
    output_columns: Optional[list[str]] = None
    keep_flag_columns: bool = True

    # ------------------------------------------------------------------
    # Validação e (de)serialização
    # ------------------------------------------------------------------
    def __post_init__(self) -> None:
        if self.duplicate_mode not in ("exact", "spatial"):
            raise ValueError(
                f"duplicate_mode inválido: {self.duplicate_mode!r} "
                "(use 'exact' ou 'spatial')."
            )
        if self.habitat not in ("terrestrial", "marine", "any"):
            raise ValueError(
                f"habitat inválido: {self.habitat!r} "
                "(use 'terrestrial', 'marine' ou 'any')."
            )
        if self.thinning_method not in ("random", "grid"):
            raise ValueError(
                f"thinning_method inválido: {self.thinning_method!r} "
                "(use 'random' ou 'grid')."
            )
        if self.thinning_min_distance_km <= 0:
            raise ValueError(
                "thinning_min_distance_km deve ser > 0 "
                f"(recebido: {self.thinning_min_distance_km})."
            )

    def to_dict(self) -> dict:
        """Serializa a configuração para dicionário."""
        return asdict(self)

    def to_json(self, path: str) -> None:
        """Grava a configuração em um arquivo JSON (rastreabilidade)."""
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)

    @classmethod
    def from_dict(cls, data: dict) -> "CleaningConfig":
        """Cria a configuração a partir de um dicionário, ignorando chaves extras."""
        valid = {f for f in cls.__dataclass_fields__}
        filtered = {k: v for k, v in data.items() if k in valid}
        return cls(**filtered)

    @classmethod
    def from_json(cls, path: str) -> "CleaningConfig":
        """Carrega a configuração a partir de um arquivo JSON."""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)
