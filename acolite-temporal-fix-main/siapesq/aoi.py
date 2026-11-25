from typing import TypedDict
from datetime import datetime
from turfpy.measurement import bbox
class SpatialExtent(TypedDict):
    west: float
    east: float
    south: float
    north: float
    crs: str

class AoiSquare(TypedDict):
    bbox:bbox
    id: int
class Aoi(TypedDict):
    id: int
    name: str
    sigla: str
    Polyno: str
    collection_id: str
    spatial_extent: SpatialExtent
    squares: list[AoiSquare]


class Position(TypedDict):
    latitude: str
    longitude: str

class AreaAlerta(TypedDict):
    id:int
    id_reservatorio:int
    nome: str
    regiao_alerta: list[Position]
    createdAt: datetime
    updatedAt: datetime
    
class SiapesqListReservatories(TypedDict):
    id:str
    id_usuario: int
    nome: str
    fluxo_hidrico: float
    potencia_geradora: float
    responsavel_ambiental: str
    empresa_manejo: str
    posicoes: list[Position]
    areas_alertas: list[AreaAlerta]
    criado_em: datetime
    atualizado_em: datetime
    deletado_em: datetime | None
    areas: list[AreaAlerta]
    
class SiapesqListReservatoriesResponse(TypedDict):
    reservatorios: list[SiapesqListReservatories]
    total: int

class SiapesqListReservatoriesAreas(TypedDict):
    alertas: list[AreaAlerta]