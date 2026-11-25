# manager.py - Orquestrador da aquisição multi-fonte
#
# Junta todas as peças: instancia os providers ligados, baixa de todos EM
# PARALELO (cada um isolado — se um falha, os demais continuam), une os
# resultados, deduplica, valida, limpa (reuso do pacote `cleaning/`) e exporta.
#
# Pode ser usado por código (`OccurrenceManager(config).run("Especie X")`) ou
# pela linha de comando (`python -m occurrences ...`, ver `__main__.py`).

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

import pandas as pd

from . import cleaner as cleaner_mod
from . import deduplicator, validator
from .config import OccurrencesConfig
from .exporter import export
from .logs import RunReport, get_logger
from .merger import merge_frames
from .models import empty_frame
from .providers import build_providers


def _enforce_year_window(df: pd.DataFrame, year_range: tuple[int, int]) -> pd.DataFrame:
    """
    Remove registros com ano CONHECIDO fora de `year_range` (mantém ano ausente).

    Garante a janela temporal de forma consistente entre todas as fontes, mesmo
    quando alguma não filtra por ano na própria API.
    """
    if df.empty or "year" not in df.columns:
        return df
    year = pd.to_numeric(df["year"], errors="coerce")
    keep = year.isna() | ((year >= year_range[0]) & (year <= year_range[1]))
    return df[keep].reset_index(drop=True)


class RunResult:
    """Resultado de uma execução: o DataFrame final e o relatório."""

    def __init__(self, df: pd.DataFrame, report: RunReport, output_csv: Optional[str]):
        self.df = df
        self.report = report
        self.output_csv = output_csv


class OccurrenceManager:
    """Coordena a coleta de ocorrências de múltiplas fontes."""

    def __init__(self, config: OccurrencesConfig, providers: Optional[list] = None):
        self.config = config
        self.logger = get_logger("occurrences.manager")
        # `providers` explícito facilita testes (injeção de dummies).
        if providers is not None:
            self.providers = providers
        else:
            self.providers = build_providers(config.enabled_providers(), config)

    def run(
        self,
        species: str,
        lon_range: Optional[tuple[float, float]] = None,
        lat_range: Optional[tuple[float, float]] = None,
        year_range: Optional[tuple[int, int]] = None,
        export_result: bool = True,
    ) -> RunResult:
        """
        Executa a aquisição completa para `species`.

        As janelas de busca caem para os valores da configuração quando não
        informadas. Retorna um `RunResult` com o DataFrame final e o relatório.
        """
        lon_range = lon_range or self.config.lon_range
        lat_range = lat_range or self.config.lat_range
        year_range = year_range or self.config.year_range

        report = RunReport(species=species)

        if not self.providers:
            self.logger.warning("nenhum provider ligado/implementado — nada a fazer.")
            return RunResult(empty_frame(), report, None)

        self.logger.info(
            "coletando '%s' de %d provider(s): %s",
            species, len(self.providers), [p.name for p in self.providers],
        )

        # 1) Download PARALELO, isolando falhas por provider.
        frames: list[pd.DataFrame] = []
        raw_by_provider: dict[str, pd.DataFrame] = {}
        with ThreadPoolExecutor(max_workers=self.config.parallelism) as pool:
            futures = {
                pool.submit(p.fetch, species, lon_range, lat_range, year_range): p
                for p in self.providers
            }
            for future in as_completed(futures):
                provider = futures[future]
                df, stats = future.result()  # fetch nunca levanta (captura interna)
                report.providers.append(stats)
                if not df.empty:
                    frames.append(df)
                    raw_by_provider[provider.name] = df

        report.total_downloaded = sum(s.downloaded for s in report.providers)

        # 2) União
        merged = merge_frames(frames)
        # Rede de segurança da janela temporal: algumas fontes (ex.: SpeciesLink)
        # não filtram ano na API. Aqui removemos registros cujo ano é CONHECIDO e
        # está fora de `year_range`; registros sem ano são preservados.
        merged = _enforce_year_window(merged, year_range)
        report.total_after_merge = len(merged)

        # 3) Deduplicação — prioridade = ordem dos providers configurados (a duplicata
        #    mantida é a da fonte de maior prioridade; resultado DETERMINÍSTICO).
        if self.config.deduplicate:
            prioridade = [p.name for p in self.providers]
            merged, dedup_report = deduplicator.deduplicate(
                merged, self.config.dedup_level, provider_priority=prioridade)
            report.dedup_report = dedup_report
        report.total_after_dedup = len(merged)

        # 4) Validação (marca quality_flags, não remove)
        merged = validator.validate(merged)

        # 5) Limpeza (reuso do pacote cleaning/)
        cleaned, cleaning_report = cleaner_mod.clean(
            merged, self.config.cleaning, enabled=self.config.clean
        )
        report.cleaning_report = cleaning_report
        report.total_after_clean = len(cleaned)

        # 6) Exportação
        output_csv = None
        if export_result:
            output_csv = export(
                cleaned, species, self.config.output_dir,
                report=report, raw_by_provider=raw_by_provider,
            )

        self.logger.info(
            "concluído: baixados=%d merge=%d dedup=%d limpo=%d",
            report.total_downloaded, report.total_after_merge,
            report.total_after_dedup, report.total_after_clean,
        )
        return RunResult(cleaned, report, output_csv)
