# providers/__init__.py - Registro (registry) de providers
#
# Mapeia o NOME de cada fonte para a sua CLASSE de provider. O `manager` consulta
# este registro para instanciar apenas os providers ligados na configuração.
#
# Os providers concretos são adicionados nas etapas seguintes (Etapa 3 em
# diante). O registro é montado de forma tolerante: se um módulo de provider
# ainda não existe, ele é simplesmente ignorado aqui (não quebra o import do
# pacote), permitindo desenvolver/validar a infraestrutura antes dos conectores.

from __future__ import annotations

from typing import Type

from ..base import BaseProvider

# Nome do provider -> caminho "modulo:Classe" (import tardio para tolerar
# módulos ainda inexistentes durante o desenvolvimento incremental).
_PROVIDER_PATHS: dict[str, str] = {
    "gbif": "occurrences.providers.gbif.provider:GBIFProvider",
    "obis": "occurrences.providers.obis.provider:OBISProvider",
    "specieslink": "occurrences.providers.specieslink.provider:SpeciesLinkProvider",
    "sibbr": "occurrences.providers.sibbr.provider:SiBBrProvider",
    "inaturalist": "occurrences.providers.inaturalist.provider:INaturalistProvider",
    "bold": "occurrences.providers.bold.provider:BOLDProvider",
    "bien": "occurrences.providers.bien.provider:BIENProvider",
    "vertnet": "occurrences.providers.vertnet.provider:VertNetProvider",
    "idigbio": "occurrences.providers.idigbio.provider:IDigBioProvider",
    "ebird": "occurrences.providers.ebird.provider:EBirdProvider",
    "atlas": "occurrences.providers.atlas_australia.provider:AtlasAustraliaProvider",
    "noaa": "occurrences.providers.noaa.provider:NOAAProvider",
    "emodnet": "occurrences.providers.emodnet.provider:EMODnetProvider",
    "ices": "occurrences.providers.ices.provider:ICESProvider",
    "dryad": "occurrences.providers.dryad.provider:DryadProvider",
    "zenodo": "occurrences.providers.zenodo.provider:ZenodoProvider",
    "figshare": "occurrences.providers.figshare.provider:FigshareProvider",
    "pangaea": "occurrences.providers.pangaea.provider:PangaeaProvider",
}


def _import_class(path: str) -> Type[BaseProvider]:
    """Importa 'pacote.modulo:Classe' e devolve a classe."""
    module_path, _, class_name = path.partition(":")
    module = __import__(module_path, fromlist=[class_name])
    return getattr(module, class_name)


def get_provider_class(name: str) -> Type[BaseProvider]:
    """Retorna a classe de um provider pelo nome (levanta se não registrado/implementado)."""
    if name not in _PROVIDER_PATHS:
        raise KeyError(f"provider desconhecido: {name!r}")
    return _import_class(_PROVIDER_PATHS[name])


def available_providers() -> list[str]:
    """Nomes de todos os providers registrados (implementados ou não)."""
    return list(_PROVIDER_PATHS)


def build_providers(names: list[str], config) -> list[BaseProvider]:
    """
    Instancia os providers pedidos que já estiverem implementados.

    Providers cujo módulo ainda não existe são ignorados com aviso — permite
    rodar a infraestrutura antes de todos os conectores estarem prontos.
    """
    from ..logs import get_logger
    logger = get_logger("occurrences.registry")

    instances: list[BaseProvider] = []
    for name in names:
        if name not in _PROVIDER_PATHS:
            logger.warning("provider desconhecido ignorado: %s", name)
            continue
        try:
            cls = _import_class(_PROVIDER_PATHS[name])
        except Exception as exc:  # noqa: BLE001 - módulo ainda não implementado
            logger.warning("provider '%s' ainda não implementado: %s", name, exc)
            continue
        instances.append(cls(config))
    return instances
