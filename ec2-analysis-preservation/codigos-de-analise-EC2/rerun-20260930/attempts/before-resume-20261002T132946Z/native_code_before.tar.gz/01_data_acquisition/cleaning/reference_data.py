# reference_data.py - Provedor de dados cartográficos de referência
#
# Fornece, de forma preguiçosa (lazy) e com cache em disco, as camadas usadas
# pelos filtros espaciais do `occurrence_cleaner`:
#
#   - Polígonos administrativos de PAÍSES e ESTADOS (Natural Earth) -> centroides
#   - Capitais nacionais (Natural Earth populated places, ADM0CAP=1)
#   - Instituições (museus/herbários/universidades/coleções/jardins)
#
# Estratégia de resolução de cada camada (nesta ordem):
#   1. Caminho local informado na configuração (ex.: config.country_shapefile).
#   2. Arquivo já presente no diretório de cache (reference_data_dir).
#   3. Download automático de fonte pública conhecida (se auto_download_reference).
#   4. Degradação graciosa: retorna None e emite aviso; o filtro correspondente
#      é PULADO e isso é registrado no relatório.
#
# As dependências geoespaciais (geopandas/shapely) são importadas de forma
# preguiçosa dentro dos métodos, para que os filtros puramente tabulares do
# cleaner funcionem mesmo sem geopandas instalado.

from __future__ import annotations

import os
import warnings
from functools import cached_property
from typing import Optional, TYPE_CHECKING

import pandas as pd
import requests

from .config import CleaningConfig

if TYPE_CHECKING:  # apenas para type hints; não força import em runtime
    import geopandas as gpd


# Fontes públicas (Natural Earth, via repositório oficial nvkelso/natural-earth-vector).
# Resolução 50m é um bom compromisso entre precisão e tamanho para escala global.
NE_BASE = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
)
NE_COUNTRIES_URL = f"{NE_BASE}/ne_50m_admin_0_countries.geojson"
NE_STATES_URL = f"{NE_BASE}/ne_50m_admin_1_states_provinces.geojson"
NE_POPULATED_PLACES_URL = f"{NE_BASE}/ne_10m_populated_places_simple.geojson"

# Base de instituições (museus/herbários/universidades/coleções/jardins).
#
# LIMITAÇÃO CONHECIDA: o dataset `institutions` do pacote R CoordinateCleaner não
# é publicado como CSV em uma URL estável (é distribuído como `.rda`). Em vez de
# depender de uma URL frágil, usamos como fonte pública e estável o **GRSciColl**
# (Global Registry of Scientific Collections) do próprio GBIF, que expõe museus,
# herbários, universidades e coleções com coordenadas via API REST. Ainda assim,
# o usuário pode sobrepor com `config.institutions_csv` (ex.: exportando o dataset
# do CoordinateCleaner para CSV). Se nenhuma fonte estiver disponível, o filtro é
# pulado com aviso (degradação graciosa).
INSTITUTIONS_URL: Optional[str] = None
GRSCICOLL_INSTITUTION_URL = "https://api.gbif.org/v1/grscicoll/institution"


class ReferenceData:
    """
    Acesso preguiçoso e cacheado às camadas cartográficas de referência.

    Cada propriedade retorna a camada carregada ou `None` (com aviso) quando a
    fonte não pôde ser resolvida. O carregamento acontece no primeiro acesso e
    é reaproveitado (cached_property) — importante para o processamento em lote
    de centenas de espécies, evitando releituras/downloads repetidos.
    """

    def __init__(self, config: CleaningConfig) -> None:
        self.config = config
        os.makedirs(config.reference_data_dir, exist_ok=True)

    # ------------------------------------------------------------------
    # Utilitários internos
    # ------------------------------------------------------------------
    def _cache_path(self, filename: str) -> str:
        return os.path.join(self.config.reference_data_dir, filename)

    def _resolve_source(
        self, explicit_path: Optional[str], cache_filename: str, url: Optional[str]
    ) -> Optional[str]:
        """
        Resolve o caminho de uma camada seguindo a ordem de prioridade.

        Retorna o caminho de arquivo utilizável ou None se indisponível.
        """
        # 1. Caminho explícito da configuração
        if explicit_path:
            if os.path.exists(explicit_path):
                return explicit_path
            warnings.warn(
                f"Caminho informado não existe: {explicit_path!r}. "
                "Tentando cache/download."
            )

        # 2. Cache local
        cached = self._cache_path(cache_filename)
        if os.path.exists(cached):
            return cached

        # 3. Download automático
        if self.config.auto_download_reference and url:
            try:
                print(f"[reference_data] Baixando {url} ...")
                resp = requests.get(url, timeout=120)
                resp.raise_for_status()
                with open(cached, "wb") as f:
                    f.write(resp.content)
                return cached
            except Exception as exc:  # noqa: BLE001 - degradação graciosa
                warnings.warn(f"Falha ao baixar {url}: {exc}")

        return None

    @staticmethod
    def _import_geopandas():
        """Importa geopandas sob demanda, com mensagem clara se ausente."""
        try:
            import geopandas as gpd  # noqa: WPS433 (import local proposital)

            return gpd
        except ImportError as exc:  # pragma: no cover - depende do ambiente
            raise ImportError(
                "geopandas é necessário para os filtros espaciais "
                "(centroides/instituições/capitais). Instale com "
                "`pip install geopandas`."
            ) from exc

    # ------------------------------------------------------------------
    # Camadas
    # ------------------------------------------------------------------
    @cached_property
    def countries(self) -> Optional["gpd.GeoDataFrame"]:
        """GeoDataFrame de polígonos de países (Natural Earth admin-0)."""
        path = self._resolve_source(
            self.config.country_shapefile, "ne_50m_admin_0_countries.geojson",
            NE_COUNTRIES_URL,
        )
        if path is None:
            warnings.warn("Polígonos de países indisponíveis; filtro de "
                          "centroide de país será pulado.")
            return None
        gpd = self._import_geopandas()
        gdf = gpd.read_file(path)
        return gdf.to_crs("EPSG:4326") if gdf.crs is not None else gdf.set_crs("EPSG:4326")

    @cached_property
    def states(self) -> Optional["gpd.GeoDataFrame"]:
        """GeoDataFrame de polígonos de estados/províncias (Natural Earth admin-1)."""
        path = self._resolve_source(
            self.config.state_shapefile,
            "ne_50m_admin_1_states_provinces.geojson", NE_STATES_URL,
        )
        if path is None:
            warnings.warn("Polígonos de estados indisponíveis; filtro de "
                          "centroide de estado será pulado.")
            return None
        gpd = self._import_geopandas()
        gdf = gpd.read_file(path)
        return gdf.to_crs("EPSG:4326") if gdf.crs is not None else gdf.set_crs("EPSG:4326")

    @cached_property
    def capitals(self) -> Optional[pd.DataFrame]:
        """
        DataFrame de capitais nacionais com colunas ['name', 'lon', 'lat'].

        Se um CSV for informado em config.capitals_csv, usa-o (esperando colunas
        de longitude/latitude reconhecíveis). Caso contrário, extrai as capitais
        do Natural Earth populated places (ADM0CAP == 1).
        """
        # CSV informado pelo usuário
        if self.config.capitals_csv and os.path.exists(self.config.capitals_csv):
            df = pd.read_csv(self.config.capitals_csv)
            return _normalize_lonlat(df, name_candidates=("name", "NAME", "city", "capital"))

        path = self._resolve_source(
            None, "ne_10m_populated_places_simple.geojson", NE_POPULATED_PLACES_URL,
        )
        if path is None:
            warnings.warn("Base de capitais indisponível; filtro de capitais "
                          "será pulado.")
            return None
        gpd = self._import_geopandas()
        gdf = gpd.read_file(path)
        # ADM0CAP marca capitais nacionais no Natural Earth
        if "adm0cap" in gdf.columns:
            gdf = gdf[gdf["adm0cap"] == 1]
        elif "ADM0CAP" in gdf.columns:
            gdf = gdf[gdf["ADM0CAP"] == 1]
        name_col = next((c for c in ("name", "NAME", "nameascii", "NAMEASCII")
                         if c in gdf.columns), None)
        out = pd.DataFrame({
            "name": gdf[name_col].values if name_col else "",
            "lon": gdf.geometry.x.values,
            "lat": gdf.geometry.y.values,
        })
        return out

    @cached_property
    def institutions(self) -> Optional[pd.DataFrame]:
        """
        DataFrame de instituições com colunas ['name', 'lon', 'lat'].

        Resolução (nesta ordem):
          1. CSV informado em `config.institutions_csv`.
          2. Cache local `institutions.csv` (de execução anterior).
          3. URL explícita `INSTITUTIONS_URL` (se definida).
          4. Download automático do GRSciColl (GBIF) — museus, herbários,
             universidades e coleções com coordenadas.
        Se nada estiver disponível, o filtro é pulado (retorna None + aviso).
        """
        # 1. CSV do usuário
        if self.config.institutions_csv and os.path.exists(self.config.institutions_csv):
            df = pd.read_csv(self.config.institutions_csv)
            return _normalize_lonlat(
                df, name_candidates=("name", "institution", "institutionCode"))

        # 2. cache / 3. URL explícita
        cache_file = self._cache_path("institutions.csv")
        path = self._resolve_source(None, "institutions.csv", INSTITUTIONS_URL)
        if path is not None:
            df = pd.read_csv(path)
            return _normalize_lonlat(
                df, name_candidates=("name", "institution", "institutionCode"))

        # 4. GRSciColl (GBIF)
        if self.config.auto_download_reference:
            df = self._download_grscicoll_institutions(cache_file)
            if df is not None and not df.empty:
                return df

        warnings.warn(
            "Base de instituições indisponível (informe config.institutions_csv "
            "com colunas de lon/lat, ou permita auto_download_reference para "
            "buscar o GRSciColl do GBIF). Filtro de instituições será pulado.")
        return None

    def _download_grscicoll_institutions(
        self, cache_file: str, page_size: int = 1000, max_pages: int = 100
    ) -> Optional[pd.DataFrame]:
        """
        Baixa instituições do GRSciColl (GBIF) e cacheia em CSV.

        Pagina a API REST até `endOfRecords`, extraindo nome + latitude/longitude
        (registros sem coordenada são descartados). Best-effort: em caso de falha
        de rede, retorna None (o filtro será pulado).
        """
        rows: list[dict] = []
        offset = 0
        try:
            for _ in range(max_pages):
                resp = requests.get(
                    GRSCICOLL_INSTITUTION_URL,
                    params={"limit": page_size, "offset": offset},
                    timeout=120,
                )
                resp.raise_for_status()
                payload = resp.json()
                for inst in payload.get("results", []):
                    lat = inst.get("latitude")
                    lon = inst.get("longitude")
                    if lat is None or lon is None:
                        continue
                    rows.append({"name": inst.get("name", ""), "lat": lat, "lon": lon})
                if payload.get("endOfRecords", True):
                    break
                offset += page_size
        except Exception as exc:  # noqa: BLE001 - degradação graciosa
            warnings.warn(f"Falha ao baixar instituições do GRSciColl: {exc}")
            return None

        if not rows:
            return None
        df = pd.DataFrame(rows)
        try:
            df.to_csv(cache_file, index=False)  # cacheia para próximas execuções
        except OSError:
            pass
        return _normalize_lonlat(df, name_candidates=("name",))


def _normalize_lonlat(
    df: pd.DataFrame, name_candidates: tuple[str, ...]
) -> pd.DataFrame:
    """
    Normaliza um DataFrame de pontos para as colunas ['name', 'lon', 'lat'].

    Reconhece nomes comuns de colunas de longitude/latitude. Levanta ValueError
    se não conseguir identificar as coordenadas.
    """
    lon_candidates = ("lon", "longitude", "decimalLongitude", "LONGITUDE", "x", "X")
    lat_candidates = ("lat", "latitude", "decimalLatitude", "LATITUDE", "y", "Y")

    lon_col = next((c for c in lon_candidates if c in df.columns), None)
    lat_col = next((c for c in lat_candidates if c in df.columns), None)
    if lon_col is None or lat_col is None:
        raise ValueError(
            "Não foi possível identificar colunas de longitude/latitude no CSV "
            f"de referência. Colunas disponíveis: {list(df.columns)}"
        )

    name_col = next((c for c in name_candidates if c in df.columns), None)
    out = pd.DataFrame({
        "name": df[name_col].astype(str).values if name_col else "",
        "lon": pd.to_numeric(df[lon_col], errors="coerce"),
        "lat": pd.to_numeric(df[lat_col], errors="coerce"),
    })
    return out.dropna(subset=["lon", "lat"]).reset_index(drop=True)
