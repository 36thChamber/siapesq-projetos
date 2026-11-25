"""Offline regression checks for the temporal-mode port to fix-main."""
from datetime import date, datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch

import numpy as np
import pytest
import rasterio
import xarray as xr
from rasterio.transform import from_origin

import acolite
from downloader import copernicus, sentinel
from image_processor.GTiff_images import extrair_bandas_tiff
from image_processor.alertas import extrair_data, extrair_tipo


@pytest.mark.parametrize('mode,days', [('LATEST', 5), ('ALL_30_DAYS', 30)])
def test_configuration(mode, days):
    assert acolite.normalize_temporal_mode(' '+mode.lower()+' ') == mode
    start, end = acolite.get_date_range(mode)
    assert date.fromisoformat(end) - date.fromisoformat(start) == timedelta(days=days)
    assert acolite.parse_aoi_ids(['165', '541']) == [165, 541]


def test_invalid_configuration():
    assert acolite.normalize_temporal_mode(None) == 'LATEST'
    assert acolite.parse_aoi_ids([]) is None
    with pytest.raises(ValueError):
        acolite.normalize_temporal_mode('invalid')
    with pytest.raises(ValueError):
        acolite.parse_aoi_ids(['bad'])


@pytest.mark.parametrize('mode,count', [('LATEST', 1), ('ALL_30_DAYS', 3)])
def test_netcdf_sorts_and_selects_real_nanosecond_timestamps(tmp_path, monkeypatch, mode, count):
    monkeypatch.chdir(tmp_path)
    for key in ['OPENEO_BACKEND_URL', 'OPENEO_CLIENT_ID', 'OPENEO_CLIENT_SECRET']:
        monkeypatch.setenv(key, 'offline-test')
    times = np.array(['2026-09-02T14:00', '2026-09-01T09:00', '2026-09-02T09:00'], dtype='datetime64[ns]')
    ds = xr.Dataset({'B04': ('t', [30., 10., 20.])}, coords={'t': times})
    ds.attrs['Conventions'] = 'CF-1.8'
    ds.B04.attrs.update({'long_name': 'red reflectance', 'grid_mapping': 'crs'})
    ds['crs'] = xr.DataArray(0, attrs={'spatial_ref': 'EPSG:32722'})
    connection = Mock()
    def cached_batch(*args, **kwargs):
        path = tmp_path / 'raw-cube.nc'
        ds.to_netcdf(path)
        return path
    aoi = {'id': 165, 'collection_id': 'SENTINEL2_L2A',
           'spatial_extent': {'west': 0, 'east': 1, 'south': 0, 'north': 1, 'crs': 'EPSG:4326'}}
    with patch.object(copernicus.openeo, 'connect', return_value=connection), \
         patch.object(copernicus, 'download_batch_netcdf', side_effect=cached_batch):
        paths = copernicus.download_netcdf(aoi, '2026-08-08', '2026-09-08', mode)
    connection.load_collection.assert_called_once_with(
        'SENTINEL2_L2A', temporal_extent=['2026-08-08', '2026-09-08'],
        spatial_extent=aoi['spatial_extent'], max_cloud_cover=100)
    assert len(paths) == count
    assert len(set(paths)) == count
    values = []
    for path in paths:
        with xr.open_dataset(path) as result:
            values.append(result.B04.item())
            assert result.attrs == ds.attrs
            assert result.B04.attrs == ds.B04.attrs
            assert result.crs.attrs == ds.crs.attrs
            assert np.issubdtype(result.t.dtype, np.datetime64)
    assert values == ([30.] if mode == 'LATEST' else [10., 20., 30.])
    assert Path('raw-cube.nc').exists()


def test_empty_netcdf_reports_failure(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    for key in ['OPENEO_BACKEND_URL', 'OPENEO_CLIENT_ID', 'OPENEO_CLIENT_SECRET']:
        monkeypatch.setenv(key, 'offline-test')
    ds = xr.Dataset(coords={'t': np.array([], dtype='datetime64[ns]')})
    connection = Mock()
    raw = tmp_path / 'raw-cube.nc'
    ds.to_netcdf(raw)
    with patch.object(copernicus.openeo, 'connect', return_value=connection), \
         patch.object(copernicus, 'download_batch_netcdf', return_value=raw):
        with pytest.raises(ValueError, match='Nenhuma cena'):
            copernicus.download_netcdf({'id': 165}, '2026-08-08', '2026-09-08')


def test_subsecond_netcdf_acquisitions_do_not_overwrite(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    for key in ['OPENEO_BACKEND_URL', 'OPENEO_CLIENT_ID', 'OPENEO_CLIENT_SECRET']:
        monkeypatch.setenv(key, 'offline-test')
    times = np.array(['2026-09-02T09:00:00.123', '2026-09-02T09:00:00.456'], dtype='datetime64[ns]')
    ds = xr.Dataset({'B04': ('t', [10., 20.])}, coords={'t': times})
    raw = tmp_path / 'raw-cube.nc'
    ds.to_netcdf(raw)
    with patch.object(copernicus.openeo, 'connect', return_value=Mock()), \
         patch.object(copernicus, 'download_batch_netcdf', return_value=raw):
        paths = copernicus.download_netcdf({'id': 165}, '2026-08-08', '2026-09-08', 'ALL_30_DAYS')
    assert len(set(paths)) == 2
    for index, path in enumerate(paths):
        with xr.open_dataset(path) as result:
            xr.testing.assert_identical(result, ds.isel(t=index))


def test_sentinel_iso_dates_and_selection():
    dates = ['2026-09-02T14:00:00.123Z', '2026-09-01T09:00:00Z', '2026-09-02T14:00:00.123Z']
    catalog = Mock()
    catalog.search.return_value = [{'properties': {'datetime': d}} for d in dates]
    with patch.object(sentinel, 'SentinelHubCatalog', return_value=catalog):
        all_dates = sentinel.list_scene_dates(None, None, '2026-08-08', '2026-09-08', 'ALL_30_DAYS')
        latest = sentinel.list_scene_dates(None, None, '2026-08-08', '2026-09-08', 'LATEST')
    assert len(all_dates) == 2
    assert latest == [all_dates[-1]]
    assert sentinel.format_scene_date(dates[0]) == '2026_09_02'


def test_sentinel_requests_distinct_acquisitions(tmp_path):
    request = Mock()
    request.return_value.get_data.return_value = []
    with patch.object(sentinel, 'SentinelHubRequest', request):
        for hour in [9, 14]:
            scene = datetime.fromisoformat(f'2026-09-02T{hour:02}:00:00+00:00')
            with pytest.raises(ValueError, match='Nenhuma cena'):
                sentinel.download_scene_tiff({'id': 165}, str(tmp_path), None, (2, 2), None, '', scene, 'ALL_30_DAYS')
    intervals = [c.kwargs['time_interval'] for c in request.input_data.call_args_list]
    assert intervals[0] != intervals[1]


def test_same_day_raster_outputs_do_not_overwrite(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    out = tmp_path / 'out'
    out.mkdir()
    names = []
    for hour in ['09', '14']:
        path = tmp_path / f'S2_165_2026_09_02_MSI_L2A_{hour}_00_00.tif'
        data = np.ones((13, 2, 2), dtype='float32')
        data[-1] = 6
        with rasterio.open(path, 'w', driver='GTiff', count=13, height=2, width=2, dtype='float32', crs='EPSG:32722', transform=from_origin(500000, 7000000, 10, 10)) as dst:
            dst.write(data)
        _, name = extrair_bandas_tiff(165, str(path), str(out))
        names.append(name)
        assert extrair_data(name+'_NDCI.tif') == datetime(2026, 9, 2)
        assert extrair_tipo(name+'_NDCI.tif') == 'ndci'
    assert len(set(names)) == 2
    assert len(list(out.glob('*RGB.tif'))) == 2


@pytest.mark.parametrize('provider', ['SENTINELHUB', 'COPERNICUS'])
def test_pipeline_processes_each_scene_with_fix_main_alerts(provider, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv('ACOLITE_STATE_DIR', str(tmp_path / 'state'))
    monkeypatch.setenv('SIAPESQ_BASE_API', 'https://api.example.test')
    monkeypatch.setenv('SIAPESQ_API_KEY', 'offline-test')
    monkeypatch.delenv('ACOLITE_PUBLICATION_MANIFEST', raising=False)
    monkeypatch.delenv('ACOLITE_PUBLICATION_TOKEN', raising=False)
    aoi = {'id': '165', 'name': 'test', 'squares': [{'id': 1, 'bbox': [0, 0, 1, 1]}, {'id': 2, 'bbox': [1, 1, 2, 2]}]}
    notifier = Mock()
    def write_product(path, count):
        with rasterio.open(path, 'w', driver='GTiff', count=count, height=2, width=2,
                           dtype='float32', crs='EPSG:32722', transform=from_origin(500000, 7000000, 10, 10)) as product:
            product.write(np.ones((count, 2, 2), dtype='float32'))
    def extract(**kwargs):
        scene_path = kwargs.get('netcdf_path', kwargs.get('geotiff_path'))
        base = '165_2026_09_01' if 'one.' in scene_path else '165_2026_09_02'
        for kind in ['RGB', 'RGB_MASK']:
            write_product(Path(kwargs['out']) / f'{base}_{kind}.tif', 3)
        return 'bands', base
    def calculate(bands, base, out):
        names = tuple(f'{base}_{kind}.tif' for kind in ['NDCI', 'NDVI', 'NDVI2'])
        for name in names:
            write_product(Path(out) / name, 1)
        return names
    with patch.object(acolite, 'get_selected_AOI', return_value=[aoi]), \
         patch.object(acolite, 'download_sentinel', return_value=['one.tif', 'two.tif']), \
         patch.object(acolite, 'download_netcdf', return_value=['one.nc', 'two.nc']), \
         patch.object(acolite, 'extrair_bandas_tiff', side_effect=extract) as tiff, \
         patch.object(acolite, 'extrair_bandas_netcdf', side_effect=extract) as netcdf, \
         patch.object(acolite, 'calcular_indices_e_salvar', side_effect=calculate) as indices, \
         patch.object(acolite, 'read_scene_acquisition', side_effect=lambda path, provider: '2026-09-01T09:00:00Z' if 'one.' in path else '2026-09-02T09:00:00Z'), \
         patch.object(acolite, 'enviar_alerta') as alerts:
        result = acolite.run_process([165], notifier, provider, 'ALL_30_DAYS')
    assert (tiff if provider == 'SENTINELHUB' else netcdf).call_count == 2
    assert indices.call_count == 2
    assert alerts.call_count == 12
    assert result['exit_code'] == 0
    assert result['aois'][0]['products_generated'] == 10
    assert all(len(scene['products']) == 5 for scene in result['publication_scenes'])
    assert all(call.kwargs['tiff_path'] != 'out' for call in alerts.call_args_list)
    assert 'Número de áreas processadas: 1' in notifier.send_message.call_args.args[0]
