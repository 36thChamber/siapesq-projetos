# cache.py - Cache de downloads por hash
#
# Evita baixar de novo o que já foi baixado. A identidade de um download é o
# hash de (espécie + provider + data + parâmetros). Downloads idênticos no mesmo
# dia reutilizam o arquivo em disco. Guardamos em parquet (compacto e rápido);
# se `pyarrow` não estiver disponível, cai para CSV automaticamente.

from __future__ import annotations

import hashlib
import json
import os
from typing import Optional

import pandas as pd

from .logs import get_logger
from .models import today_iso

_logger = get_logger("occurrences.cache")


class CacheManager:
    """
    Cache simples em disco, indexado por hash.

    Parâmetros:
        cache_dir: diretório raiz do cache.
        enabled: se False, get sempre devolve None e put é no-op.
        date_stamp: componente de "data" da chave (padrão: hoje). Exposto para
            testes e para permitir reuso entre execuções do mesmo dia.
    """

    def __init__(
        self,
        cache_dir: str,
        enabled: bool = True,
        date_stamp: Optional[str] = None,
    ) -> None:
        self.cache_dir = cache_dir
        self.enabled = enabled
        # A resumed batch may pin its original cache date to reuse completed
        # downloads across calendar days. Ordinary runs still use today's date.
        self.date_stamp = date_stamp or os.environ.get("SIAPESQ_OCCURRENCE_CACHE_DATE") or today_iso()
        self._use_parquet = self._detect_parquet()

    @staticmethod
    def _detect_parquet() -> bool:
        try:
            import pyarrow  # noqa: F401
            return True
        except ImportError:
            return False

    def make_key(self, provider: str, species: str, params: dict) -> str:
        """
        Gera a chave (hash SHA-1) de um download.

        Inclui a data (`self.date_stamp`) para que downloads de dias diferentes
        não colidam, conforme especificado.
        """
        payload = {
            "provider": provider,
            "species": species.strip().lower(),
            "date": self.date_stamp,
            "params": params,
        }
        blob = json.dumps(payload, sort_keys=True, ensure_ascii=False)
        return hashlib.sha1(blob.encode("utf-8")).hexdigest()

    def _path(self, provider: str, key: str) -> str:
        ext = "parquet" if self._use_parquet else "csv"
        return os.path.join(self.cache_dir, provider, f"{key}.{ext}")

    def get(self, provider: str, species: str, params: dict) -> Optional[pd.DataFrame]:
        """Devolve o DataFrame em cache, ou None se não existir/estiver desligado."""
        if not self.enabled:
            return None
        path = self._path(provider, self.make_key(provider, species, params))
        if not os.path.exists(path):
            return None
        try:
            if self._use_parquet:
                return pd.read_parquet(path)
            return pd.read_csv(path, low_memory=False)
        except Exception as exc:  # noqa: BLE001 - cache corrompido não deve quebrar o fluxo
            _logger.warning("falha ao ler cache %s: %s", path, exc)
            return None

    def put(self, provider: str, species: str, params: dict, df: pd.DataFrame) -> None:
        """Grava o DataFrame no cache (no-op se desligado)."""
        if not self.enabled:
            return
        path = self._path(provider, self.make_key(provider, species, params))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        # Escrita ATÔMICA (tmp + os.replace): uma interrupção não deixa um cache
        # truncado que seria lido depois como válido.
        tmp = f"{path}.tmp"
        try:
            if self._use_parquet:
                df.to_parquet(tmp, index=False)
            else:
                df.to_csv(tmp, index=False)
            os.replace(tmp, path)
        except Exception as exc:  # noqa: BLE001
            _logger.warning("falha ao gravar cache %s: %s", path, exc)
            try:
                if os.path.exists(tmp):
                    os.remove(tmp)
            except OSError:
                pass
