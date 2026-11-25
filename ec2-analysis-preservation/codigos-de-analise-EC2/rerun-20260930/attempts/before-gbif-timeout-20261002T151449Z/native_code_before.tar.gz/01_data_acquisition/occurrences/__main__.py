# __main__.py - Ponto de entrada por linha de comando
#
# Executa a aquisição multi-fonte de forma autônoma (processo independente):
#
#   python -m occurrences --config occurrences/config.example.yaml \
#       --species "Pomatomus saltatrix"
#
# Também permite sobrescrever pela linha de comando os parâmetros mais comuns
# (janela geográfica/temporal, diretório de saída) e listar os providers com
# `--list-providers`.
#
# Deve ser executado a partir de `01_data_acquisition/` (convenção do projeto),
# para que os pacotes irmãos `occurrences/` e `cleaning/` sejam importáveis.

from __future__ import annotations

import argparse
import sys

from .config import OccurrencesConfig
from .logs import get_logger
from .manager import OccurrenceManager
from .providers import available_providers, get_provider_class

_logger = get_logger("occurrences")


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="occurrences",
        description="Aquisição multi-fonte de ocorrências de espécies (SDM/SIAPESQ).",
    )
    p.add_argument("--config", type=str, default=None,
                   help="Caminho do YAML de configuração. Se omitido, usa os padrões.")
    p.add_argument("--species", type=str, default=None,
                   help="Nome científico da espécie a coletar.")
    p.add_argument("--min-lon", type=float, default=None)
    p.add_argument("--min-lat", type=float, default=None)
    p.add_argument("--max-lon", type=float, default=None)
    p.add_argument("--max-lat", type=float, default=None)
    p.add_argument("--min-year", type=int, default=None)
    p.add_argument("--max-year", type=int, default=None)
    p.add_argument("--output-dir", type=str, default=None,
                   help="Sobrescreve o diretório de saída da configuração.")
    p.add_argument("--no-cache", action="store_true", help="Desliga o cache de download.")
    p.add_argument("--list-providers", action="store_true",
                   help="Lista os providers registrados e sai.")
    return p


def _print_providers(config: OccurrencesConfig) -> None:
    print("Providers registrados:")
    for name in available_providers():
        status = "ligado" if config.providers.get(name) else "desligado"
        try:
            meta = get_provider_class(name).metadata_spec
            impl = "implementado" if meta.implemented else "esqueleto"
            print(f"  - {name:<14} [{status:<9}] {impl:<12} ({meta.priority}) {meta.title}")
        except Exception:
            print(f"  - {name:<14} [{status:<9}] (ainda não implementado)")


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    config = (
        OccurrencesConfig.from_yaml(args.config) if args.config
        else OccurrencesConfig()
    )

    # Overrides de linha de comando (têm precedência sobre o YAML).
    if args.output_dir:
        config.output_dir = args.output_dir
    if args.no_cache:
        config.use_cache = False
    if None not in (args.min_lon, args.max_lon):
        config.lon_range = (args.min_lon, args.max_lon)
    if None not in (args.min_lat, args.max_lat):
        config.lat_range = (args.min_lat, args.max_lat)
    if None not in (args.min_year, args.max_year):
        config.year_range = (args.min_year, args.max_year)

    if args.list_providers:
        _print_providers(config)
        return 0

    if not args.species:
        _logger.error("informe --species (ou use --list-providers).")
        return 2

    result = OccurrenceManager(config).run(args.species)
    if result.output_csv:
        print(f"\nCSV unificado: {result.output_csv}")
        print(f"Registros finais: {len(result.df)}")
    else:
        print("\nNenhum resultado (verifique os providers ligados/implementados).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
