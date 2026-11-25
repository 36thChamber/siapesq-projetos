# config.py - Configuração da camada de ocorrências (multi-fonte)
#
# Centraliza TODOS os parâmetros: quais providers ligar, comportamento de rede
# (timeout, retries, paralelismo, lote, limite por provider), janela de busca,
# deduplicação e limpeza. Carregada de um arquivo YAML (formato do exemplo em
# `config.example.yaml`) e serializável de volta para rastreabilidade.
#
# A limpeza REUTILIZA o módulo já existente `cleaning/` do projeto: o bloco
# `cleaning:` do YAML é repassado ao `CleaningConfig` daquele pacote. Aqui só
# guardamos o dicionário; a conversão acontece em `cleaner.py`.

from __future__ import annotations

import os
from dataclasses import dataclass, field, asdict
from typing import Optional

import yaml


# Providers e prioridade. `True` = ligado por padrão. As prioridades Média/Baixa
# começam desligadas (podem não ter downloader completo ainda).
#
# O conjunto de ALTA prioridade ligado por padrão é o "perfil CONTINENTAL"
# (espécies terrestres/dulcícolas): as bases generalistas (GBIF, iNaturalist,
# iDigBio, VertNet), as brasileiras (SpeciesLink, SiBBr), a de plantas (BIEN),
# a de aves (eBird) e a de código de barras (BOLD). O OBIS (marinho) também vem
# ligado por padrão por ser generalista; as demais fontes marinhas (EMODnet,
# ICES) e as de repositório (Dryad/Zenodo/...) permanecem desligadas.
# Ligados por padrão = TODAS as fontes IMPLEMENTADAS (capta do máximo de fontes).
# Os esqueletos ainda não implementados (`_stub.py`) ficam `False` — ativá-los só
# produziria falhas controladas sem trazer dados. Para usar algum, ponha `true`
# no YAML (e implemente o downloader, se ainda for esqueleto).
DEFAULT_PROVIDERS: dict[str, bool] = {
    # --- Implementadas (ligadas) ---
    "gbif": True,
    "specieslink": True,
    "sibbr": True,
    "bien": True,          # plantas (Américas) — requer BIEN_DB_*
    "inaturalist": True,
    "vertnet": False,      # vertebrados — DESLIGADO: api.vertnet.org fora do ar (timeout), só atrasava a captação
    "idigbio": True,       # coleções digitalizadas
    "ebird": True,         # apenas aves (token) — pulado p/ não-aves
    "bold": True,
    "obis": True,          # marinho generalista
    "atlas": True,         # Atlas of Living Australia — requer ALA_API_KEY
    "emodnet": True,       # marinho europeu (EurOBIS/WFS)
    # --- Esqueletos (desligados; ainda sem downloader de ocorrências) ---
    "ices": False,         # DATRAS: acesso por survey, não por espécie
    "noaa": False,         # ERDDAP: acesso por dataset, não por espécie
    "dryad": False,        # repositório de datasets (não é API de ocorrências)
    "zenodo": False,       # repositório de datasets
    "figshare": False,     # repositório de datasets
    "pangaea": False,      # repositório de datasets
}


# Perfis de fonte por domínio ecológico (para seleção/documentação). Os nomes
# batem com as chaves de DEFAULT_PROVIDERS. O perfil CONTINENTAL é o padrão de
# alta prioridade para espécies terrestres/dulcícolas; o MARINHO agrupa as bases
# oceânicas (nem todas ligadas por padrão).
CONTINENTAL_PROVIDERS: tuple[str, ...] = (
    "gbif", "specieslink", "sibbr", "bien",
    "inaturalist", "vertnet", "idigbio", "ebird", "bold",
)
MARINE_PROVIDERS: tuple[str, ...] = ("obis", "emodnet", "ices")


# Limpeza padrão adequada a DADOS MULTI-FONTE: mantém apenas os filtros que fazem
# sentido para qualquer base (coordenadas e datas), e DESLIGA os que são
# específicos do GBIF (issues, basisOfRecord) ou redundantes com a nossa própria
# deduplicação. O usuário pode sobrescrever qualquer chave no bloco `cleaning:`.
DEFAULT_CLEANING: dict = {
    "remove_missing_coordinates": True,
    "remove_invalid_coordinates": True,
    "remove_zero_coordinates": True,
    "remove_equal_coordinates": True,
    "remove_invalid_dates": True,
    "require_year": False,          # bases variam muito; não exigir ano por padrão
    # Data COMPLETA (ano+mês+dia): a captação ambiental (etapa 03) é por data
    # (ERA5=dia, NDVI=mês). require_complete_date implica exigir o ano.
    "require_complete_date": True,
    # Outliers geográficos: remove pontos fora do núcleo (zoológico/erro de
    # coordenada) que inflam a Área M e contaminam o modelo.
    "remove_spatial_outliers": True,
    "remove_duplicates": False,     # a deduplicação multi-fonte é feita por nós
    "remove_flagged_issues": False, # coluna `issue` só existe no GBIF
    "filter_basis_of_record": False,# muitas bases não trazem basisOfRecord
    "flag_centroids": False,
    "flag_capitals": False,
    "habitat": "any",               # não assume terrestre/marinho por padrão
    # Thinning espacial: 1 km, apenas para registros de MESMA data (pontos
    # próximos com datas diferentes são preservados).
    "apply_spatial_thinning": True,
    "thinning_min_distance_km": 1.0,
    "thinning_same_date_only": True,
    # Instituições: marca e remove registros a até 1000 m de museus/herbários/etc.
    "flag_institutions": True,
    "remove_institutions": True,
    "institution_buffer_m": 1000.0,
}


@dataclass
class OccurrencesConfig:
    """
    Configuração completa da aquisição multi-fonte de ocorrências.

    Rede / execução:
        timeout: tempo máximo (s) por requisição HTTP.
        retries: tentativas por requisição antes de desistir.
        parallelism: quantos providers baixam ao mesmo tempo.
        batch_size: tamanho de página/lote nas APIs paginadas.
        limit_per_provider: teto de registros por provider (None = sem teto).

    Janela de busca (opcional; pode vir também por linha de comando):
        lon_range / lat_range: caixa geográfica (min, max).
        year_range: faixa de anos (min, max).

    Saída / cache:
        output_dir: onde gravar os CSVs e relatórios.
        cache_dir: onde guardar os downloads em cache.
        use_cache: liga/desliga o cache.

    Deduplicação:
        deduplicate: liga/desliga.
        dedup_level: "low" | "medium" | "high" (rigor crescente).

    Limpeza (reutiliza o pacote `cleaning/`):
        clean: liga/desliga a etapa de limpeza.
        cleaning: dicionário repassado ao `CleaningConfig`.
    """

    providers: dict[str, bool] = field(default_factory=lambda: dict(DEFAULT_PROVIDERS))

    # Rede / execução
    timeout: int = 60
    retries: int = 3
    parallelism: int = 6
    batch_size: int = 300
    limit_per_provider: Optional[int] = None

    # Janela de busca
    lon_range: tuple[float, float] = (-180.0, 180.0)
    lat_range: tuple[float, float] = (-90.0, 90.0)
    year_range: tuple[int, int] = (1900, 2100)

    # Saída / cache
    output_dir: str = field(default_factory=lambda: os.path.join(os.getcwd(), "occurrences_out"))
    cache_dir: str = field(default_factory=lambda: os.path.join(os.getcwd(), "occurrences_cache"))
    use_cache: bool = True

    # Deduplicação
    deduplicate: bool = True
    dedup_level: str = "medium"

    # Limpeza (reuso do pacote cleaning/)
    clean: bool = True
    cleaning: dict = field(default_factory=lambda: dict(DEFAULT_CLEANING))

    def __post_init__(self) -> None:
        if self.dedup_level not in ("low", "medium", "high"):
            raise ValueError(
                f"dedup_level inválido: {self.dedup_level!r} (use 'low', 'medium' ou 'high')."
            )
        if self.parallelism < 1:
            raise ValueError("parallelism deve ser >= 1.")
        # Normaliza ranges para tupla (YAML entrega listas).
        self.lon_range = tuple(self.lon_range)  # type: ignore[assignment]
        self.lat_range = tuple(self.lat_range)  # type: ignore[assignment]
        self.year_range = tuple(self.year_range)  # type: ignore[assignment]
        # Garante que todos os providers conhecidos existam no dicionário.
        merged = dict(DEFAULT_PROVIDERS)
        merged.update(self.providers or {})
        self.providers = merged

    def enabled_providers(self) -> list[str]:
        """Nomes dos providers ligados na configuração (ordem de DEFAULT_PROVIDERS)."""
        return [name for name in DEFAULT_PROVIDERS if self.providers.get(name, False)]

    # ------------------------------------------------------------------
    # (De)serialização
    # ------------------------------------------------------------------
    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "OccurrencesConfig":
        """Cria a configuração a partir de um dicionário, ignorando chaves extras."""
        valid = set(cls.__dataclass_fields__)
        filtered = {k: v for k, v in (data or {}).items() if k in valid}
        return cls(**filtered)

    @classmethod
    def from_yaml(cls, path: str) -> "OccurrencesConfig":
        """Carrega a configuração de um arquivo YAML."""
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        return cls.from_dict(data)

    def to_yaml(self, path: str) -> None:
        """Grava a configuração em YAML (rastreabilidade/reprodutibilidade)."""
        with open(path, "w", encoding="utf-8") as f:
            yaml.safe_dump(self.to_dict(), f, allow_unicode=True, sort_keys=False)
