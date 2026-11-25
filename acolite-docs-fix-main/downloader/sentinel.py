import os
import shutil
import tarfile
import json
from datetime import datetime
from siapesq.aoi import Aoi
from sentinelhub import SHConfig
from sentinelhub import (
    CRS,
    BBox,
    DataCollection,
    MimeType,
    MosaickingOrder,
    SentinelHubRequest,
    bbox_to_dimensions,
)
def calculate_resolution_for_fixed_size(bbox, fixed_size=(2000, 2000)):
    """
    Calcula a resolução necessária para garantir que o tamanho do bbox seja fixado em `fixed_size`.

    Args:
        coords (tuple): Coordenadas do bbox (west, south, east, north).
        fixed_size (tuple): Tamanho fixo desejado (width, height) em pixels.

    Returns:
        float: Resolução calculada para alcançar o tamanho fixo.
    """
    bbox_size = bbox_to_dimensions(bbox, resolution=10)
    resolution_x = bbox_size[0] / fixed_size[0]
    resolution_y = bbox_size[1] / fixed_size[1]
    resolution = max(resolution_x, resolution_y)
    return resolution


def format_scene_date(scene_date: str) -> str:
    """Converte um timestamp ISO 8601 do Sentinel para AAAA_MM_DD."""
    normalized_date = (
        f"{scene_date[:-1]}+00:00"
        if scene_date.endswith("Z")
        else scene_date
    )
    return datetime.fromisoformat(normalized_date).strftime("%Y_%m_%d")


def download_sentinel(
    aoi: Aoi,
    start_date: datetime,
    end_date: datetime
) -> str:
    client_id = os.getenv("SENTINEL_HUB_CLIENT_ID")
    if not client_id:
        raise ValueError("Variável de ambiente SENTINEL_HUB_CLIENT_ID não definida.")
    
    client_secret = os.getenv("SENTINEL_HUB_CLIENT_SECRET")
    if not client_secret:
        raise ValueError("Variável de ambiente SENTINEL_HUB_CLIENT_SECRET não definida.")
    
    config = SHConfig(sh_client_id=client_id,sh_client_secret=client_secret)
    if not config.sh_client_id or not config.sh_client_secret:
        print("Warning! To use Process API, please provide the credentials (OAuth client ID and client secret).")
    
    temp_dir = os.path.join("tmp", "netcdf", str(aoi.get('id')))
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    else:
        shutil.rmtree(temp_dir)
        os.makedirs(temp_dir)
    
    print(f"Area of interest is {aoi.get('spatial_extent')}")
    west=aoi.get('spatial_extent').get('west')
    east=aoi.get('spatial_extent').get('east')
    south=aoi.get('spatial_extent').get('south')
    north=aoi.get('spatial_extent').get('north')
    coords = (west,south,east,north)
    bbox = BBox(bbox=coords, crs=CRS.WGS84)
    size=(1920,1080)
    resolution = calculate_resolution_for_fixed_size(bbox, size)
    print(f"Image shape at {resolution} m resolution: {size} pixels")
    evalscript_all_bands = """
        //VERSION=3
        function setup() {
            return {
                input: [{
                    bands: ["B01","B02","B03","B04","B05","B06","B07","B08","B8A","B09","B11","B12","SCL"],
                    units: "DN",
                    resolution: 10
                }],
                output: {
                    id: "default",
                    bands: 13,
                    sampleType: "FLOAT32"
                }
            };
        }
        
        function updateOutputMetadata(scenes, inputMetadata, outputMetadata) {
           outputMetadata.userData = { "scenes":  scenes.tiles }
        };

        function evaluatePixel(sample) {
            return [sample.B01,
                    sample.B02,
                    sample.B03,
                    sample.B04,
                    sample.B05,
                    sample.B06,
                    sample.B07,
                    sample.B08,
                    sample.B8A,
                    sample.B09,
                    sample.B11,
                    sample.B12,
                    sample.SCL
            ];
        }
    """
    request = SentinelHubRequest(
        data_folder=temp_dir,
        evalscript=evalscript_all_bands,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=DataCollection.SENTINEL2_L2A,
                time_interval=(start_date, end_date),
                mosaicking_order=MosaickingOrder.MOST_RECENT,
            )
        ],
        responses=[
            SentinelHubRequest.output_response("default", MimeType.TIFF),
            SentinelHubRequest.output_response("userdata", MimeType.JSON)
        ],
        bbox=bbox,
        size=size,
        config=config,
    )
    body = request.get_data(save_data=True,max_threads=4)
    if len(body)>0 and len(os.listdir(temp_dir))>0:
        hashed_directory=os.listdir(temp_dir)[0]
        for file in os.listdir(os.path.join(temp_dir,hashed_directory)):
            if file.endswith(".tar"):
                shutil.move(os.path.join(temp_dir,hashed_directory,file),os.path.join(temp_dir,file))
            else:
                os.remove(os.path.join(temp_dir,hashed_directory,file))
        os.rmdir(os.path.join(temp_dir,hashed_directory))
        tarfile_path = os.path.join(temp_dir, "response.tar")
        with tarfile.open(tarfile_path, "r") as tar:
            tar.extractall(temp_dir)
        os.remove(tarfile_path)
        date=datetime.now().strftime("%Y_%m_%d")
        tif_default_path=os.path.join(temp_dir,'default.tif')
        metadata_path=os.path.join(temp_dir,'userdata.json')
        with open(metadata_path,'r') as f:
            metadata = json.load(f)
            scenes = metadata.get('scenes')
            if len(scenes)>0:
                scene = scenes[0]
                print(f"Scene: {scene.get('date')}")
                date = format_scene_date(scene.get('date'))
        new_tif_name=f"S2_{aoi.get('id')}_{date}_MSI_L2A.tif"
        os.rename(tif_default_path,os.path.join(temp_dir,new_tif_name))
        os.remove(metadata_path)
        print(f"Downloaded {os.path.join(temp_dir,new_tif_name)}")
    return os.path.join(temp_dir,new_tif_name)





