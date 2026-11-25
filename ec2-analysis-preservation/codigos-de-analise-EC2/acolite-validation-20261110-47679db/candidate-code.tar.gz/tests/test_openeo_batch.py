"""Offline contracts for durable openEO submission, recovery and result reuse."""
from copy import deepcopy
import os
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np
import pytest
import xarray as xr
from openeo.rest.datacube import DataCube

from downloader import batch, copernicus
import runtime_state
from runtime_state import StateError, exclusive_lock, fingerprint, read_json, state_root, write_json


BACKEND = "https://openeo.test/openeo/1.2"


def scientific_cube():
    times = np.array(["2026-11-03T10:00", "2026-11-04T11:00"], dtype="datetime64[ns]")
    return xr.Dataset(
        {"B04": (("t", "y", "x"), np.arange(8, dtype="float32").reshape(2, 2, 2)),
         "B05": (("t", "y", "x"), np.arange(8, dtype="float32").reshape(2, 2, 2) + 10)},
        coords={"t": times, "x": [500000., 500010.], "y": [7000010., 7000000.]},
        attrs={"Conventions": "CF-1.8", "description": "Sentinel-2 L2A, unmodified cube"},
    )


class Asset:
    def __init__(self, key="cube.nc", data=None, failures=0, media_type=None):
        self.key = key
        self.media_type = media_type or ("application/x-netcdf" if key.endswith(".nc") else "application/json")
        self.data = scientific_cube() if data is None else data
        self.failures = failures
        self.calls = []

    def download(self, target, **kwargs):
        target = Path(target)
        self.calls.append((target, kwargs))
        if self.failures:
            self.failures -= 1
            target.write_bytes(b"incomplete")
            raise OSError("offline simulated interrupted download")
        if isinstance(self.data, xr.Dataset):
            self.data.to_netcdf(target)
        else:
            target.write_bytes(self.data)
        return target


class Results:
    def __init__(self, assets=None):
        self.assets = assets if assets is not None else [Asset()]
        self.metadata = {"stac_version": "1.0.0", "properties": {"processing:facility": "offline"},
                         "assets": {a.key: {"type": a.media_type, "href": f"https://download.test/{a.key}"}
                                    for a in self.assets}}

    def get_assets(self):
        return self.assets

    def get_metadata(self):
        return deepcopy(self.metadata)


class Job:
    def __init__(self, statuses=None, assets=None):
        self.job_id = "j-offline-165"
        self.statuses = list(statuses or ["created", "queued", "running", "finished"])
        self.status_calls = 0
        self.start = Mock()
        self.stop = Mock()
        self.delete = Mock()
        self.results = Results(assets)
        self.graph = None

    def status(self):
        self.status_calls += 1
        if len(self.statuses) > 1:
            return self.statuses.pop(0)
        return self.statuses[0]

    def get_results(self):
        return self.results

    def describe(self):
        return {"id": self.job_id, "process": {"process_graph": self.graph}}


class Cube:
    def __init__(self, job, graph=None, shared=None):
        self.job = job
        self.graph = graph or {"loadcollection1": {"process_id": "load_collection", "arguments": {
            "id": "SENTINEL2_L2A", "temporal_extent": ["2026-11-02", "2026-11-07"],
            "spatial_extent": {"west": -52, "east": -51, "south": -25, "north": -24},
            "properties": {"eo:cloud_cover": {"process_graph": {
                "lte1": {"process_id": "lte", "arguments": {"x": {"from_parameter": "value"}, "y": 100}, "result": True}
            }}},
        }, "result": True}}
        self.shared = shared if shared is not None else {"creates": [], "failure": None, "saves": []}

    def save_result(self, **kwargs):
        self.shared["saves"].append(kwargs)
        graph = deepcopy(self.graph)
        graph["loadcollection1"].pop("result", None)
        graph["saveresult1"] = {"process_id": "save_result", "arguments": {
            "data": {"from_node": "loadcollection1"}, "format": kwargs["format"], "options": {}}, "result": True}
        return Cube(self.job, graph, self.shared)

    def flat_graph(self):
        return deepcopy(self.graph)

    def create_job(self, *, title):
        self.shared["creates"].append({"title": title})
        self.job.graph = deepcopy(self.graph)
        if self.shared["failure"]:
            raise self.shared["failure"]
        return self.job


@pytest.fixture
def offline(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("ACOLITE_STATE_DIR", str(tmp_path / "durable-state"))
    monkeypatch.setenv("OPENEO_JOB_TIMEOUT_SECONDS", "10")
    monkeypatch.setenv("OPENEO_POLL_INTERVAL_SECONDS", "1")
    clock = SimpleNamespace(now=0.)

    def sleep(seconds):
        clock.now += seconds

    monkeypatch.setattr(batch, "time", SimpleNamespace(monotonic=lambda: clock.now, sleep=sleep))
    connection = Mock()
    connection.root_url = BACKEND
    job = Job()
    connection.job.return_value = job
    cube = Cube(job)
    return SimpleNamespace(root=tmp_path / "durable-state", connection=connection, job=job, cube=cube, clock=clock)


def download(offline, cube=None, **kwargs):
    return batch.download_batch_netcdf(
        offline.connection, cube or offline.cube, aoi_id=kwargs.pop("aoi_id", 165),
        backend_url=kwargs.pop("backend_url", BACKEND), client_id=kwargs.pop("client_id", "offline-client"), **kwargs,
    )


def manifest(offline):
    paths = list(offline.root.glob("openeo/*/job.json"))
    assert len(paths) == 1
    return paths[0], read_json(paths[0])


def expire(offline, status="running"):
    offline.job.statuses = [status]
    with pytest.raises(batch.BatchJobPending, match="espera local expirou"):
        download(offline)


def test_submission_persists_id_before_start_and_only_adds_netcdf_save(offline):
    original = deepcopy(offline.cube.graph)

    def persisted_before_start():
        _, saved = manifest(offline)
        assert saved["job_id"] == offline.job.job_id
        assert saved["start_attempted"] is True

    offline.job.start.side_effect = persisted_before_start
    path = download(offline)
    _, saved = manifest(offline)
    assert saved["phase"] == "downloaded"
    assert offline.cube.graph == original
    assert offline.cube.shared["saves"] == [{"format": "NetCDF"}]
    assert len(offline.cube.shared["creates"]) == 1
    assert set(offline.cube.shared["creates"][0]) == {"title"}
    load = saved["request"]["graph"]["loadcollection1"]["arguments"]
    assert load == original["loadcollection1"]["arguments"]
    assert "bands" not in load
    assert load["temporal_extent"] == ["2026-11-02", "2026-11-07"]
    with xr.open_dataset(path) as actual:
        xr.testing.assert_identical(actual, scientific_cube())
    offline.job.start.assert_called_once_with()
    offline.job.stop.assert_not_called()
    offline.job.delete.assert_not_called()


@pytest.mark.parametrize("status", ["queued", "running"])
def test_timeout_then_resume_reuses_id_without_start_or_create(offline, status):
    expire(offline, status)
    path, saved = manifest(offline)
    assert saved["job_id"] == offline.job.job_id
    offline.job.statuses = ["finished"]
    result = download(offline)
    assert result.exists()
    assert len(offline.cube.shared["creates"]) == 1
    offline.connection.job.assert_called_once_with(saved["job_id"])
    offline.job.start.assert_not_called()
    offline.job.stop.assert_not_called()
    offline.job.delete.assert_not_called()
    assert read_json(path)["phase"] == "downloaded"


@pytest.mark.parametrize("status", ["error", "canceled", "unexpected"])
def test_terminal_or_unknown_state_never_restarts_or_resubmits(offline, status):
    offline.job.statuses = [status]
    for _ in range(2):
        with pytest.raises(batch.BatchJobError):
            download(offline)
    assert len(offline.cube.shared["creates"]) == 1
    offline.job.start.assert_not_called()
    offline.job.stop.assert_not_called()


def test_lost_start_response_does_not_repeat_start_post(offline):
    offline.job.statuses = ["created"]
    offline.job.start.side_effect = OSError("simulated lost response")
    with pytest.raises(batch.BatchJobError):
        download(offline)
    waited = offline.clock.now
    with pytest.raises(batch.BatchJobPending, match="início anterior incerto"):
        download(offline)
    assert offline.clock.now == waited, "uncertain start must fail immediately on the next invocation"
    offline.job.start.assert_called_once_with()
    assert len(offline.cube.shared["creates"]) == 1


def lose_create_response(offline):
    offline.cube.shared["failure"] = OSError("lost response with sensitive URL that must not escape")
    with pytest.raises(batch.BatchJobError, match="criação incerta") as caught:
        download(offline)
    assert "sensitive URL" not in str(caught.value)
    path, saved = manifest(offline)
    assert saved["job_id"] is None
    assert saved["phase"] == "creating"
    return path, saved


def test_lost_create_response_recovers_all_pages_and_validates_graph(offline):
    _, saved = lose_create_response(offline)
    offline.job.statuses = ["finished"]
    offline.connection.get.side_effect = [
        SimpleNamespace(json=lambda: {"jobs": [{"id": "unrelated", "title": "other"}],
                                      "links": [{"rel": "next", "href": "https://openeo.test/openeo/1.2/jobs?page=2"}]}),
        SimpleNamespace(json=lambda: {"jobs": [{"id": offline.job.job_id, "title": saved["title"]}], "links": []}),
    ]
    result = download(offline)
    assert result.exists()
    assert offline.connection.get.call_count == 2
    offline.connection.job.assert_called_once_with(offline.job.job_id)
    assert len(offline.cube.shared["creates"]) == 1
    assert manifest(offline)[1]["job_id"] == offline.job.job_id


def test_recovery_uses_discovered_api_root_and_relative_next_link(offline):
    configured_backend = "https://openeo.test"
    offline.cube.shared["failure"] = OSError("lost response")
    with pytest.raises(batch.BatchJobError):
        download(offline, backend_url=configured_backend)
    _, saved = manifest(offline)
    offline.job.statuses = ["finished"]
    offline.connection.get.side_effect = [
        SimpleNamespace(json=lambda: {"jobs": [], "links": [{"rel": "next", "href": "?page=2"}]}),
        SimpleNamespace(json=lambda: {"jobs": [{"id": offline.job.job_id, "title": saved["title"]}], "links": []}),
    ]
    assert download(offline, backend_url=configured_backend).exists()
    urls = [call.args[0] for call in offline.connection.get.call_args_list]
    assert urls == [BACKEND + "/jobs", BACKEND + "/jobs?page=2"]
    assert len(offline.cube.shared["creates"]) == 1


@pytest.mark.parametrize("count", [0, 2])
def test_ambiguous_create_with_no_or_multiple_matches_fails_closed(offline, count):
    _, saved = lose_create_response(offline)
    offline.connection.get.return_value.json.return_value = {
        "jobs": [{"id": f"j-{index}", "title": saved["title"]} for index in range(count)], "links": []}
    with pytest.raises(batch.BatchJobError, match=f"{count} jobs"):
        download(offline)
    offline.connection.job.assert_not_called()
    assert len(offline.cube.shared["creates"]) == 1


def test_recovery_rejects_matching_title_with_different_scientific_graph(offline):
    _, saved = lose_create_response(offline)
    offline.connection.get.return_value.json.return_value = {
        "jobs": [{"id": offline.job.job_id, "title": saved["title"]}], "links": []}
    offline.job.graph = {"wrong": {"process_id": "load_collection", "arguments": {"bands": ["B04"]}}}
    with pytest.raises(batch.BatchJobError, match="grafo diferente"):
        download(offline)
    assert len(offline.cube.shared["creates"]) == 1


@pytest.mark.parametrize("next_link", ["https://different.test/jobs", "https://openeo.test/jobs"])
def test_recovery_rejects_external_or_cyclic_pagination(offline, next_link):
    lose_create_response(offline)
    offline.connection.get.return_value.json.return_value = {
        "jobs": [], "links": [{"rel": "next", "href": next_link}]}
    with pytest.raises(batch.BatchJobError, match="Paginação"):
        download(offline)
    assert len(offline.cube.shared["creates"]) == 1


def test_download_interruption_reuses_job_and_completed_assets(offline):
    netcdf = Asset()
    auxiliary = Asset("provenance.json", b'{"calibration":"unchanged"}', failures=1)
    offline.job.results = Results([netcdf, auxiliary])
    offline.job.statuses = ["finished"]
    with pytest.raises(batch.BatchJobError, match="falha ao consultar/iniciar/baixar"):
        download(offline)
    _, saved = manifest(offline)
    assert saved["job_id"] == offline.job.job_id
    assert len(netcdf.calls) == 1
    result = download(offline)
    assert result.exists()
    assert len(netcdf.calls) == 1
    assert len(auxiliary.calls) == 2
    assert all(kwargs["redact_url_logging"] for _, kwargs in netcdf.calls + auxiliary.calls)
    receipt = read_json(result.parent / "receipt.json")
    assert receipt["complete"]
    assert len(receipt["assets"]) == 2
    assert read_json(result.parent / "job-results.json") == offline.job.results.metadata
    assert (result.parent / "asset-0001.json").read_bytes() == auxiliary.data
    assert len(offline.cube.shared["creates"]) == 1


def test_cached_result_is_reused_without_remote_calls_and_corruption_blocks(offline):
    result = download(offline)
    offline.connection.reset_mock()
    status_calls = offline.job.status_calls
    assert download(offline) == result
    offline.connection.job.assert_not_called()
    assert offline.job.status_calls == status_calls
    assert len(offline.job.results.assets[0].calls) == 1
    result.write_bytes(b"corrupted")
    with pytest.raises(batch.BatchJobError, match="Integridade"):
        download(offline)
    assert len(offline.cube.shared["creates"]) == 1


def test_crash_after_result_promotion_recovers_without_a_remote_call(offline):
    result = download(offline)
    path, saved = manifest(offline)
    saved["phase"] = "monitoring"
    write_json(path, saved)
    offline.connection.reset_mock()
    assert download(offline) == result
    assert read_json(path)["phase"] == "downloaded"
    offline.connection.job.assert_not_called()


@pytest.mark.parametrize("damage", ["missing", "changed"])
def test_cached_metadata_loss_or_corruption_blocks_processing(offline, damage):
    result = download(offline)
    metadata = result.parent / "job-results.json"
    if damage == "missing":
        metadata.unlink()
    else:
        metadata.write_text('{"wrong":"metadata"}', encoding="utf-8")
    offline.connection.reset_mock()
    with pytest.raises(batch.BatchJobError, match="Integridade dos metadados"):
        download(offline)
    offline.connection.job.assert_not_called()
    assert len(offline.cube.shared["creates"]) == 1


def test_real_python_client_graph_is_submitted_as_netcdf_batch_without_scientific_changes(offline):
    offline.connection.list_output_formats.return_value = {"NetCDF": {}}
    offline.connection.capabilities.return_value.supports_endpoint.return_value = False
    cube = DataCube.load_collection(
        "SENTINEL2_L2A", connection=offline.connection, fetch_metadata=False,
        temporal_extent=["2026-11-02", "2026-11-07"],
        spatial_extent={"west": -52, "east": -51, "south": -25, "north": -24},
        max_cloud_cover=100,
    )
    original = cube.flat_graph()
    offline.job.statuses = ["finished"]

    def submit(**kwargs):
        offline.job.graph = kwargs["process_graph"]
        return offline.job

    offline.connection.create_job.side_effect = submit
    assert download(offline, cube).exists()
    offline.connection.create_job.assert_called_once()
    graph = offline.connection.create_job.call_args.kwargs["process_graph"]
    submitted_load = next(node for node in graph.values() if node["process_id"] == "load_collection")
    original_load = next(node for node in original.values() if node["process_id"] == "load_collection")
    assert submitted_load["arguments"] == original_load["arguments"]
    assert "bands" not in submitted_load["arguments"]
    save = next(node for node in graph.values() if node["process_id"] == "save_result")
    assert save["arguments"]["format"] == "NetCDF"
    assert cube.flat_graph() == original
    offline.connection.download.assert_not_called()


@pytest.mark.parametrize("assets", [[], [Asset("one.nc"), Asset("two.nc")]])
def test_no_or_multiple_netcdf_assets_are_not_silently_selected(offline, assets):
    offline.job.results = Results(assets)
    offline.job.statuses = ["finished"]
    with pytest.raises(batch.BatchJobError, match="esperava um NetCDF"):
        download(offline)
    path, saved = manifest(offline)
    assert (path.parent / "download.partial" / "job-results.json").exists()
    assert not (path.parent / "results").exists()
    assert saved["job_id"] == offline.job.job_id
    assert all(not asset.calls for asset in assets)


def test_pending_previous_interval_blocks_new_overlapping_submission(offline):
    expire(offline)
    changed = deepcopy(offline.cube.graph)
    changed["loadcollection1"]["arguments"]["temporal_extent"] = ["2026-11-03", "2026-11-08"]
    another = Cube(offline.job, changed)
    with pytest.raises(batch.BatchJobPending, match="ACOLITE_START_DATE"):
        download(offline, another)
    assert not another.shared["creates"]
    assert len(offline.cube.shared["creates"]) == 1


@pytest.mark.parametrize("terminal", ["error", "canceled"])
def test_terminal_previous_interval_allows_new_window_without_restarting_old_job(offline, terminal):
    offline.job.statuses = [terminal]
    with pytest.raises(batch.BatchJobError):
        download(offline)
    changed = deepcopy(offline.cube.graph)
    changed["loadcollection1"]["arguments"]["temporal_extent"] = ["2026-11-03", "2026-11-08"]
    new_job = Job(["finished"])
    new_job.job_id = "j-new-window"
    new_cube = Cube(new_job, changed)
    assert download(offline, new_cube).exists()
    assert len(new_cube.shared["creates"]) == 1
    assert len(offline.cube.shared["creates"]) == 1
    offline.job.start.assert_not_called()
    offline.job.stop.assert_not_called()


def test_corrupted_manifest_never_causes_a_fresh_create(offline):
    expire(offline)
    path, _ = manifest(offline)
    path.write_text("{incomplete", encoding="utf-8")
    with pytest.raises(ValueError):
        download(offline)
    assert len(offline.cube.shared["creates"]) == 1


@pytest.mark.parametrize("value", ["0", "-1", "nan", "inf"])
def test_invalid_wait_budget_is_rejected_before_submission(offline, monkeypatch, value):
    monkeypatch.setenv("OPENEO_JOB_TIMEOUT_SECONDS", value)
    with pytest.raises(ValueError):
        download(offline)
    assert not offline.cube.shared["creates"]


def test_state_atomic_replace_and_lock_release(offline):
    target = offline.root / "ledger.json"
    write_json(target, {"value": 1})
    write_json(target, {"value": 2})
    assert read_json(target) == {"value": 2}
    assert not list(target.parent.glob(".state-*"))
    lock = offline.root / "exclusive.lock"
    with exclusive_lock(lock):
        with pytest.raises(StateError):
            with exclusive_lock(lock):
                pytest.fail("a held lock must not be acquired twice")
    with exclusive_lock(lock):
        pass
    assert fingerprint({"b": 2, "a": 1}) == fingerprint({"a": 1, "b": 2})


def test_failed_atomic_state_replace_preserves_previous_record_and_removes_staging(offline, monkeypatch):
    target = offline.root / "ledger.json"
    write_json(target, {"completed": True})
    monkeypatch.setattr(runtime_state, "os", SimpleNamespace(
        name=os.name, fsync=os.fsync, replace=Mock(side_effect=OSError("simulated disk failure")),
    ))
    with pytest.raises(OSError):
        write_json(target, {"completed": False})
    assert read_json(target) == {"completed": True}
    assert not list(target.parent.glob(".state-*"))


def test_intent_persistence_failure_prevents_submission(offline, monkeypatch):
    monkeypatch.setattr(batch, "write_json", Mock(side_effect=OSError("simulated disk full")))
    with pytest.raises(OSError):
        download(offline)
    assert not offline.cube.shared["creates"]


@pytest.mark.parametrize("directory", ["tmp/state", "out/state"])
def test_state_cannot_live_under_cleaned_product_directories(offline, monkeypatch, directory):
    monkeypatch.setenv("ACOLITE_STATE_DIR", directory)
    with pytest.raises(StateError):
        state_root()


def test_copernicus_adapter_keeps_collection_bands_window_and_scene_metadata(offline, monkeypatch):
    path = Path("original.nc")
    original = scientific_cube()
    original.to_netcdf(path)
    for name, value in [("OPENEO_BACKEND_URL", BACKEND), ("OPENEO_CLIENT_ID", "test-client"),
                        ("OPENEO_CLIENT_SECRET", "offline-secret")]:
        monkeypatch.setenv(name, value)
    connection = Mock()
    monkeypatch.setattr(copernicus.openeo, "connect", Mock(return_value=connection))
    downloader = Mock(return_value=path)
    monkeypatch.setattr(copernicus, "download_batch_netcdf", downloader)
    aoi = {"id": 165, "collection_id": "SENTINEL2_L2A", "spatial_extent": {
        "west": -52, "east": -51, "south": -25, "north": -24}}
    paths = copernicus.download_netcdf(aoi, "2026-11-02", "2026-11-07", "ALL_30_DAYS")
    connection.load_collection.assert_called_once_with(
        "SENTINEL2_L2A", temporal_extent=["2026-11-02", "2026-11-07"],
        spatial_extent=aoi["spatial_extent"], max_cloud_cover=100,
    )
    assert path.exists(), "raw durable source must survive scene extraction"
    assert len(paths) == 2
    for index, output in enumerate(paths):
        with xr.open_dataset(output) as actual:
            xr.testing.assert_identical(actual, original.isel(t=index))
    downloader.assert_called_once()
