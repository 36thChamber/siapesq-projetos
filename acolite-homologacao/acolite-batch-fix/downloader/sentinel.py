import os
import shutil
import tarfile
import json
from datetime import datetime, timedelta
from siapesq.aoi import Aoi
from runtime_state import write_json
from sentinelhub import SHConfig
from sentinelhub import (
    CRS,
    BBox,
    DataCollection,
    MimeType,
    MosaickingOrder,
    SentinelHubCatalog,
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


def build_evalscript_all_bands() -> str:
    return """
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


def list_scene_dates(
    config: SHConfig,
    bbox: BBox,
    start_date: datetime,
    end_date: datetime,
    temporal_mode: str
) -> list[datetime]:
    catalog = SentinelHubCatalog(config=config)
    search_iterator = catalog.search(
        DataCollection.SENTINEL2_L2A,
        bbox=bbox,
        time=(start_date, end_date),
        fields={"include": ["properties.datetime"], "exclude": []},
    )

    scene_dates = []
    seen_datetimes = set()
    for result in search_iterator:
        date_str = result["properties"]["datetime"]
        if date_str in seen_datetimes:
            continue
        seen_datetimes.add(date_str)
        scene_datetime = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        scene_dates.append(scene_datetime)

    scene_dates.sort()
    if temporal_mode == "LATEST" and len(scene_dates) > 0:
        return [scene_dates[-1]]

    return scene_dates


def download_scene_tiff(
    aoi: Aoi,
    temp_dir: str,
    bbox: BBox,
    size: tuple[int, int],
    config: SHConfig,
    evalscript_all_bands: str,
    scene_date: datetime,
    temporal_mode: str
) -> str:
    fraction = f"_{scene_date.microsecond:06d}".rstrip('0') if scene_date.microsecond else ""
    scene_suffix = scene_date.strftime("%Y_%m_%d_%H_%M_%S") + fraction
    scene_temp_dir = os.path.join(temp_dir, scene_suffix)
    if os.path.exists(scene_temp_dir):
        shutil.rmtree(scene_temp_dir)
    os.makedirs(scene_temp_dir, exist_ok=True)

    # Target the catalog acquisition, including when several occur on one day.
    scene_start = (scene_date - timedelta(seconds=1)).isoformat()
    scene_end = (scene_date + timedelta(seconds=1)).isoformat()

    request = SentinelHubRequest(
        data_folder=scene_temp_dir,
        evalscript=evalscript_all_bands,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=DataCollection.SENTINEL2_L2A,
                time_interval=(scene_start, scene_end),
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
    body = request.get_data(save_data=True, max_threads=4)
    if len(body) > 0 and len(os.listdir(scene_temp_dir)) > 0:
        hashed_directory = os.listdir(scene_temp_dir)[0]
        hashed_directory_path = os.path.join(scene_temp_dir, hashed_directory)
        for file in os.listdir(hashed_directory_path):
            origin_path = os.path.join(hashed_directory_path, file)
            if file.endswith(".tar"):
                shutil.move(origin_path, os.path.join(scene_temp_dir, file))
            else:
                os.remove(origin_path)
        os.rmdir(hashed_directory_path)
        tarfile_path = os.path.join(scene_temp_dir, "response.tar")
        with tarfile.open(tarfile_path, "r") as tar:
            tar.extractall(scene_temp_dir)
        os.remove(tarfile_path)
        date = scene_date.strftime("%Y_%m_%d")
        tif_default_path = os.path.join(scene_temp_dir, 'default.tif')
        metadata_path = os.path.join(scene_temp_dir, 'userdata.json')
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
            scenes = metadata.get('scenes')
            if len(scenes) > 0:
                scene = scenes[0]
                print(f"Scene: {scene.get('date')}")
                date = format_scene_date(scene.get('date'))
        new_tif_name = f"S2_{aoi.get('id')}_{date}_MSI_L2A.tif"
        if temporal_mode == "ALL_30_DAYS":
            time_suffix = scene_date.strftime("%H_%M_%S") + fraction
            new_tif_name = f"S2_{aoi.get('id')}_{date}_MSI_L2A_{time_suffix}.tif"
        output_path = os.path.join(temp_dir, new_tif_name)
        if os.path.exists(output_path):
            os.remove(output_path)
        os.rename(tif_default_path, output_path)
        # LATEST filenames omit the acquisition time. Preserve the requested
        # and returned instants separately so alert retries identify
        # the same scientific scene even when its filename changes. A response
        # with several acquisition instants will require explicit review.
        write_json(output_path + ".scene.json", {
            "version": 1,
            "requested_acquisition": scene_date.isoformat(),
            "acquisitions": sorted({scene["date"] for scene in scenes if scene.get("date")}),
            "source": "sentinelhub-response",
        })
        os.remove(metadata_path)
        shutil.rmtree(scene_temp_dir)
        print(f"Downloaded {output_path}")
        return output_path
    raise ValueError(f"Nenhuma cena encontrada para a AOI {aoi.get('id')} na data {scene_date.date()}")


def download_sentinel(
    aoi: Aoi,
    start_date: datetime,
    end_date: datetime,
    temporal_mode: str = "LATEST"
) -> list[str]:
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
    evalscript_all_bands = build_evalscript_all_bands()
    scene_dates = list_scene_dates(config, bbox, start_date, end_date, temporal_mode)
    if len(scene_dates) == 0:
        raise ValueError(f"Nenhuma cena encontrada para a AOI {aoi.get('id')} no intervalo informado.")

    downloaded_files = []
    for scene_date in scene_dates:
        downloaded_files.append(
            download_scene_tiff(
                aoi=aoi,
                temp_dir=temp_dir,
                bbox=bbox,
                size=size,
                config=config,
                evalscript_all_bands=evalscript_all_bands,
                scene_date=scene_date,
                temporal_mode=temporal_mode,
            )
        )

    return downloaded_files


