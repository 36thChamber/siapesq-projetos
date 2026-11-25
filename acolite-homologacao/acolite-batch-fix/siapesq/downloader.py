import requests
from siapesq.aoi import Aoi,AoiSquare,SpatialExtent,Position,SiapesqListReservatories,SiapesqListReservatoriesResponse,SiapesqListReservatoriesAreas
from turfpy.measurement import bbox
from geojson import Polygon


def GetBbox(posicoes: list[Position])->tuple[float,float,float,float]:
    pos_tuples=[(float(posicao['latitude']),float(posicao['longitude'])) for posicao in posicoes]
    p = Polygon([pos_tuples])
    b=bbox(p)
    """
        b[1] = west
        b[3] = east
        b[0] = south
        b[2] = north
    """
    return (b[1],b[3],b[0],b[2])

def CreateBbox(posicoes: list[Position])->bbox:
    pos_tuples=[(float(posicao['latitude']),float(posicao['longitude'])) for posicao in posicoes]
    p = Polygon([pos_tuples])
    b=bbox(p)
    return b

def CreatePolygon(posicoes: list[Position])->str:
    coordinates = [(float(pos['latitude']), float(pos['longitude'])) for pos in posicoes]
    if coordinates[0] != coordinates[-1]:
        coordinates.append(coordinates[0])
    coord_str = ", ".join(f"{x} {y}" for x, y in coordinates)
    polygon_str = f"POLYGON(({coord_str}))"
    return polygon_str

def get_reservatories(base_api:str,endpoint:str,api_key:str)->SiapesqListReservatoriesResponse:
    headers = {'x-api-key': api_key}
    url=f"{base_api}/{endpoint}"
    response = requests.get(url, headers=headers, timeout=(15, 60))
    response.raise_for_status()
    return response.json()

def get_reservatorio(base_api:str,endpoint:str,api_key:str)->SiapesqListReservatories:
    headers = {'x-api-key': api_key}
    url=f"{base_api}/{endpoint}"
    response = requests.get(url, headers=headers, timeout=(15, 60))
    response.raise_for_status()
    return response.json()

def get_reservatorio_area(base_api:str,endpoint:str,api_key:str,id_reservatorio:int)->SiapesqListReservatoriesAreas:
    headers = {'x-api-key': api_key}
    url=f"{base_api}/{endpoint}/{id_reservatorio}"
    response = requests.get(url, headers=headers, timeout=(15, 60))
    response.raise_for_status()
    return response.json()
    
def create_list(reservatorios:SiapesqListReservatories)->list[Aoi]:
    collection_id="SENTINEL2_L2A"
    crs="EPSG:4326"
    aoi_list=[]
    for reservatory in reservatorios:
        squares=[]
        if(reservatory.get('areas_alertas') is not None and len(reservatory.get('areas_alertas'))>0):
            for area in reservatory['areas_alertas']:
                bbox=CreateBbox(area.get('regiao_alerta'))
                squares.append(AoiSquare(id=area['id'],bbox=bbox))
        west,east,south,north=GetBbox(reservatory['posicoes'])
        Polyno=CreatePolygon(reservatory['posicoes'])
        spe=SpatialExtent(
            crs=crs,
            west=west,
            east=east,
            south=south,
            north=north
        )
        aoi=Aoi(
            id=reservatory['id'],
            name=reservatory['nome'],
            polygon=Polyno,
            collection_id=collection_id,
            spatial_extent=spe,
            squares=squares
        )
        aoi_list.append(aoi)
    return aoi_list
