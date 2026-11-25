from enum import Enum
from datetime import datetime

class NivelCritico(Enum):
    Amarelo = "Possivel presença de vegetação"
    Laranja = "Presença de vegetação"
    Vermelho = "Presença de vegetação em grande quantidade"
    
class Alerta:
    def __init__(
        self,
        id_reservatorio:int,
        data_alerta:datetime,
        hora_alerta:datetime,
        nivel_critico:str,
        tipo:str,
        id_area_alerta: int
    ):
        self.id_reservatorio=id_reservatorio
        self.data_alerta=datetime.isoformat(data_alerta)
        self.hora_alerta=datetime.isoformat(hora_alerta)
        self.nivel_critico=nivel_critico
        self.tipo=tipo
        self.id_area_alerta=id_area_alerta