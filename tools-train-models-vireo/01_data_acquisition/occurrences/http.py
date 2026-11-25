# http.py - Cliente HTTP compartilhado (timeout, retries, paginação)
#
# Todos os providers baseados em REST usam este cliente para não repetir a
# lógica de rede. Centraliza: timeout por requisição, retentativas com espera
# exponencial e um helper de paginação genérico. Cada chamada contabiliza
# tentativas em um `ProviderStats` (quando fornecido), alimentando os logs.

from __future__ import annotations

import random
import time
from typing import Callable, Iterator, Optional

import requests

from .logs import ProviderStats, get_logger

_logger = get_logger("occurrences.http")

# Status HTTP que VALEM re-tentar (transitórios). 4xx restantes (400/401/403/404)
# são erros do PEDIDO — re-tentar só desperdiça banda e pode causar throttle/ban.
_RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})


class HttpClient:
    """
    Wrapper fino sobre `requests.Session` com timeout e retries.

    Parâmetros:
        timeout: tempo máximo (s) por requisição.
        retries: número de tentativas por requisição antes de desistir.
        backoff: fator de espera exponencial entre tentativas (s).
        user_agent: identificação enviada às APIs (boa prática/etiqueta).
    """

    def __init__(
        self,
        timeout: int = 60,
        retries: int = 3,
        backoff: float = 1.5,
        user_agent: str = "SIAPESQ-occurrences/1.0 (SDM data acquisition)",
    ) -> None:
        self.timeout = timeout
        self.retries = max(1, retries)
        self.backoff = backoff
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent})

    def _wait(self, resp: Optional[requests.Response], attempt: int) -> float:
        """Espera antes de re-tentar: respeita `Retry-After` (429/503) + jitter."""
        if resp is not None:
            ra = resp.headers.get("Retry-After")
            if ra and ra.strip().isdigit():
                return min(120.0, float(ra))
        return self.backoff ** attempt + random.uniform(0.0, 0.5)  # backoff + jitter

    def _send(
        self,
        url: str,
        params: Optional[dict],
        headers: Optional[dict],
        stats: Optional[ProviderStats],
        label: str,
    ) -> requests.Response:
        """
        GET com retries INTELIGENTES: re-tenta só transitórios (timeout/conexão e
        HTTP 429/5xx, respeitando `Retry-After`); 4xx do pedido levantam na hora
        (sem desperdiçar tentativas/arriscar ban). Levanta a última exceção se
        esgotar. Base compartilhada por get_json/get_text/get_bytes.
        """
        last_exc: Optional[Exception] = None
        for attempt in range(1, self.retries + 1):
            if stats is not None:
                stats.attempts += 1
            try:
                resp = self.session.get(url, params=params, headers=headers,
                                        timeout=self.timeout)
            except requests.RequestException as exc:  # timeout/conexão = transitório
                last_exc = exc
                _logger.warning("%s falhou (tentativa %d/%d) em %s: %s",
                                label, attempt, self.retries, url, exc)
                if attempt < self.retries:
                    time.sleep(self._wait(None, attempt))
                continue
            if resp.status_code in _RETRYABLE_STATUS:
                last_exc = requests.HTTPError(f"HTTP {resp.status_code}", response=resp)
                _logger.warning("%s HTTP %d (tentativa %d/%d) em %s",
                                label, resp.status_code, attempt, self.retries, url)
                if attempt < self.retries:
                    time.sleep(self._wait(resp, attempt))
                    continue
            resp.raise_for_status()  # 4xx não-retryável levanta imediatamente
            return resp
        assert last_exc is not None
        raise last_exc

    def get_json(self, url: str, params: Optional[dict] = None,
                 stats: Optional[ProviderStats] = None,
                 headers: Optional[dict] = None) -> dict:
        """GET com retries, devolvendo o JSON decodificado."""
        return self._send(url, params, headers, stats, "GET").json()

    def get_text(self, url: str, params: Optional[dict] = None,
                 stats: Optional[ProviderStats] = None,
                 headers: Optional[dict] = None) -> str:
        """GET com retries devolvendo o corpo como texto (ex.: JSONL/TSV)."""
        return self._send(url, params, headers, stats, "GET(text)").text

    def get_bytes(self, url: str, params: Optional[dict] = None,
                  stats: Optional[ProviderStats] = None) -> bytes:
        """GET com retries devolvendo o corpo bruto (ex.: TSV/zip)."""
        return self._send(url, params, None, stats, "GET(bytes)").content

    def paginate(
        self,
        fetch_page: Callable[[int], list],
        page_size: int,
        limit: Optional[int] = None,
        stats: Optional[ProviderStats] = None,
        max_pages: int = 10000,
    ) -> Iterator[list]:
        """
        Paginação genérica por deslocamento (offset).

        `fetch_page(offset)` deve devolver a lista de registros daquela página
        (vazia quando acabar). Interrompe ao esgotar os dados, ao atingir
        `limit` de registros, ou ao chegar em `max_pages` (trava de segurança).
        Cada página consumida incrementa `stats.pages`.
        """
        collected = 0
        for page_index in range(max_pages):
            offset = page_index * page_size
            page = fetch_page(offset)
            if stats is not None:
                stats.pages += 1
            if not page:
                return
            if limit is not None and collected + len(page) > limit:
                yield page[: limit - collected]
                return
            collected += len(page)
            yield page
            if len(page) < page_size:
                return
