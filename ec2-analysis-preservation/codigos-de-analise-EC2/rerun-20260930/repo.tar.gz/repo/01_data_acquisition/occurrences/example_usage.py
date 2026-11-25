# example_usage.py - Exemplos de uso da camada de ocorrências (por código)
#
# Rode a partir de 01_data_acquisition/:
#     python -m occurrences.example_usage
#
# Mostra três formas de uso. Os exemplos que acessam a internet estão comentados
# por padrão para não disparar downloads reais sem intenção — descomente para
# executar de verdade.

from __future__ import annotations

from occurrences import OccurrenceManager, OccurrencesConfig


def exemplo_1_config_em_codigo() -> None:
    """Configura tudo em código e coleta de GBIF + OBIS numa região."""
    config = OccurrencesConfig(
        providers={"gbif": True, "obis": True, "inaturalist": False,
                   "specieslink": False, "sibbr": False, "bold": False},
        limit_per_provider=50,
        output_dir="occurrences_out",
    )
    result = OccurrenceManager(config).run(
        "Pomatomus saltatrix",
        lon_range=(-60, -30), lat_range=(-40, -10), year_range=(2000, 2020),
    )
    print(f"Registros finais: {len(result.df)}")
    print(f"CSV: {result.output_csv}")


def exemplo_2_config_yaml() -> None:
    """Carrega a configuração de um arquivo YAML."""
    config = OccurrencesConfig.from_yaml("occurrences/config.example.yaml")
    result = OccurrenceManager(config).run("Pomatomus saltatrix")
    print(f"Registros finais: {len(result.df)}")


def exemplo_3_sem_exportar() -> None:
    """Obtém o DataFrame na memória, sem gravar arquivos (export_result=False)."""
    config = OccurrencesConfig(
        providers={"gbif": True}, limit_per_provider=20, use_cache=False,
    )
    result = OccurrenceManager(config).run(
        "Pomatomus saltatrix", export_result=False,
    )
    # `result.df` está no modelo único; use direto no seu código.
    print(result.df[["species", "decimalLatitude", "decimalLongitude", "year",
                     "provider"]].head())


if __name__ == "__main__":
    # Descomente o exemplo que quiser executar (fazem downloads reais):
    # exemplo_1_config_em_codigo()
    # exemplo_2_config_yaml()
    # exemplo_3_sem_exportar()
    print("Edite example_usage.py e descomente um dos exemplos para executar.")
