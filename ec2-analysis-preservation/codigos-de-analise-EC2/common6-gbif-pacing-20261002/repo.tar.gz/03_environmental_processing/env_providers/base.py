#!/usr/bin/env python3
# base.py — Interface comum dos PROVIDERS de variáveis ambientais (etapa 03)
#
# Espelha o padrão Provider/Strategy usado na camada de ocorrências
# (`01_data_acquisition/occurrences`): cada variável ambiental (ERA5, NDVI,
# altitude, slope, SoilGrids, ...) é um `EnvProvider` isolado, com a MESMA
# interface. O orquestrador `captura_ambiental.py` percorre um registry de
# providers e aplica cada um em sequência (linear), sem conhecer os detalhes de
# cada fonte — baixo acoplamento, alta coesão, extensível (nova variável = 1
# arquivo + 1 linha no registry).
#
# Contrato:
#   name: str            — identificador curto (ex.: "soilgrids")
#   columns: list[str]   — nomes das colunas que o provider ADICIONA ao df
#   capture(df, ctx)     — recebe o df com lat/lon (e data) e devolve o df com as
#                          colunas novas preenchidas; NÃO remove/renomeia colunas
#                          existentes. Deve ISOLAR falhas internamente quando fizer
#                          sentido; exceções são capturadas pelo orquestrador.
#   brazil_raster(ctx)   — (opcional) baixa/cacheia o(s) raster(s) do Brasil para
#                          reuso na PREDIÇÃO; retorna caminho(s) ou None.

from __future__ import annotations

import os
import sys
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from types import SimpleNamespace
from typing import Optional

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent.parent


@dataclass
class CaptureContext:
    """Configuração compartilhada por todos os providers em uma execução."""

    especie_dir: Path                 # pasta 07/<Especie>/
    work: Path                        # diretório de trabalho isolado (token único)
    token: str                        # token único da espécie (nomes de arquivo)
    data_root: Path                   # raiz dos dados baixados (era5/ndvi/...)
    cache_dir: Path                   # cache de rasters reutilizáveis (predição)
    dem_path: str                     # DEM (GeoTIFF) para altitude/slope
    workers: int = 5
    # bbox (lon_min, lat_min, lon_max, lat_max) dos pontos (+margem) — usado pelos
    # providers que baixam recortes regionais (SoilGrids). Preenchido pelo orquestrador.
    bbox: Optional[tuple] = None

    # PROGRESSO AO VIVO: os providers rodam em paralelo e reportam aqui quantos itens
    # já processaram. O orquestrador lê isto para desenhar o painel de barras.
    # {nome: (feitos, total, etapa)}. Só quem tem um laço contável reporta (era5, ndvi);
    # os demais são rápidos e o painel os mostra como "em andamento".
    progresso: dict = field(default_factory=dict)
    _plock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def report(self, nome: str, feitos: int, total: int, etapa: str = "") -> None:
        """Chamado PELOS PROVIDERS (de várias threads) para atualizar sua barra."""
        with self._plock:
            self.progresso[nome] = (int(feitos), int(total), etapa)

    def ler_progresso(self) -> dict:
        with self._plock:
            return dict(self.progresso)


class EnvProvider(ABC):
    """Interface de um provider de variável ambiental."""

    name: str = "base"
    columns: list[str] = []

    @abstractmethod
    def capture(self, df: pd.DataFrame, ctx: CaptureContext) -> pd.DataFrame:
        """Retorna `df` com as colunas de `self.columns` preenchidas."""

    def brazil_raster(self, ctx: CaptureContext):  # pragma: no cover - opcional
        """Baixa/cacheia raster(s) do Brasil p/ predição (opcional). Retorna path(s)/None."""
        return None


# ---------------------------------------------------------------------------
# Utilitários compartilhados (reuso entre providers)
# ---------------------------------------------------------------------------
def sanitize_token(name: str) -> str:
    """Token seguro para nomes de arquivo (isola execuções paralelas)."""
    import re
    return re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_") or "especie"


def apply_downloader_step(df: pd.DataFrame, run_cmd, out_path: Path, work: Path,
                          stem: str, **extra) -> pd.DataFrame:
    """
    Executa um downloader de `01_data_acquisition/downloaders` sobre `df` e anexa
    suas colunas NOVAS, alinhando por `_row_id` único.

    Alinhar por `_row_id` (e não por lat/lon) é essencial p/ variáveis TEMPORAIS
    (ERA5): o mesmo (lat, lon) pode ter datas diferentes (pseudoausências herdam
    datas). `how="left"` preserva todas as linhas mesmo se o downloader descartar
    alguma (ex.: `dropna` do CMEMS).
    """
    df = df.copy()
    df["_row_id"] = np.arange(len(df))
    in_csv = work / f"{stem}.csv"
    df.to_csv(in_csv, index=False)
    if out_path.exists():
        out_path.unlink()
    run_cmd(SimpleNamespace(csv=str(in_csv), **extra))
    if not out_path.exists():
        raise FileNotFoundError(f"downloader não produziu {out_path}")
    enr = pd.read_csv(out_path)
    if "_row_id" not in enr.columns:
        raise RuntimeError("downloader não preservou _row_id.")
    new_cols = [c for c in enr.columns if c not in df.columns]
    merged = df.merge(enr[["_row_id"] + new_cols].drop_duplicates("_row_id"),
                      on="_row_id", how="left")
    return merged.drop(columns=["_row_id"])


def ensure_downloaders_on_path() -> None:
    """Garante que `downloaders.<mod>` seja importável como PACOTE.

    O arquivo `downloaders/cdsapi.py` tem o mesmo nome do pacote pip `cdsapi`;
    NUNCA colocar a pasta `downloaders/` no sys.path (o `import cdsapi` interno
    importaria a si mesmo). Coloca-se `01_data_acquisition/` no path.
    """
    p = str(ROOT / "01_data_acquisition")
    if p not in sys.path:
        sys.path.insert(0, p)
    p2 = str(ROOT / "03_environmental_processing")
    if p2 not in sys.path:
        sys.path.insert(0, p2)
