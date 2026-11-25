#!/usr/bin/env python3
# env_providers — Registry/Factory dos providers de variáveis ambientais (etapa 03)
#
# Mapeia o NOME de cada variável para sua CLASSE de provider (Strategy). O
# orquestrador `captura_ambiental.py` consulta este registro para instanciar e
# aplicar apenas os providers pedidos, em ordem. Import tardio: um provider com
# dependência ausente não quebra o pacote.
#
# Adicionar uma variável nova = criar `env_providers/<x>.py` (subclasse de
# EnvProvider) e registrar 1 linha aqui.

from __future__ import annotations

from typing import Type

from .base import EnvProvider, CaptureContext  # noqa: F401 (reexport)

_PROVIDER_PATHS: dict[str, str] = {
    "era5": "env_providers.era5:ERA5Provider",
    "ndvi": "env_providers.ndvi:NDVIProvider",
    "altitude": "env_providers.altitude:AltitudeProvider",
    "slope": "env_providers.slope:SlopeProvider",
    "soilgrids": "env_providers.soilgrids:SoilGridsProvider",
    "sdtb": "env_providers.sdtb:SDTBProvider",
    "mapbiomas": "env_providers.mapbiomas:MapBiomasProvider",
    "worldcover": "env_providers.worldcover:WorldCoverProvider",
}

# Perfil CONTINENTAL padrão (ordem das colunas no CSV final). Solo = SoilGrids
# (clay/awc: QUALIDADE) + SDTB (profundidade até a rocha: ESPESSURA). Uso e Ocupação do
# Solo = MapBiomas (Brasil) + WorldCover (global), ambos SEMPRE capturados.
DEFAULT_CONTINENTAL = ["era5", "ndvi", "altitude", "slope", "soilgrids", "sdtb",
                       "mapbiomas", "worldcover"]


def _import_class(path: str) -> Type[EnvProvider]:
    module_path, _, class_name = path.partition(":")
    module = __import__(module_path, fromlist=[class_name])
    return getattr(module, class_name)


def get_provider(name: str) -> EnvProvider:
    """Instancia um provider pelo nome (levanta se desconhecido)."""
    if name not in _PROVIDER_PATHS:
        raise KeyError(f"variável ambiental desconhecida: {name!r} "
                       f"(disponíveis: {list(_PROVIDER_PATHS)})")
    return _import_class(_PROVIDER_PATHS[name])()


def build_providers(names: list[str]) -> list[EnvProvider]:
    """Instancia a lista de providers pedidos (ignora nomes desconhecidos com aviso)."""
    out = []
    for name in names:
        try:
            out.append(get_provider(name))
        except Exception as exc:  # noqa: BLE001
            print(f"[env_providers] ignorando '{name}': {exc}")
    return out


def available() -> list[str]:
    return list(_PROVIDER_PATHS)
