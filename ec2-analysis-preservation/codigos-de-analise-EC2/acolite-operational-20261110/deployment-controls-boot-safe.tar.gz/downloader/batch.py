"""Resumable openEO jobs. A local timeout never cancels remote processing."""
import hashlib
import json
import logging
import math
import os
from pathlib import Path
import re
import tempfile
import time
from urllib.parse import urljoin, urlsplit

import xarray as xr

from runtime_state import canonical_json, exclusive_lock, fingerprint, read_json, state_root, write_json


class BatchJobError(RuntimeError):
    pass


class BatchJobPending(BatchJobError):
    pass


def _positive_setting(name, default):
    value = float(os.getenv(name, default))
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{name} deve ser positivo e finito.")
    return value


def _sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def job_creation_options():
    """Optional provider controls, persisted in the creation intent.

    Budget is a provider request, not a guaranteed billing cap. Unconfigured
    controls never change scientific identity or invalidate a completed cache.
    """
    options = {}
    if "OPENEO_MAX_EXECUTORS" in os.environ:
        raw = os.environ["OPENEO_MAX_EXECUTORS"]
        if not re.fullmatch(r"[0-9]+", raw) or int(raw) < 2:
            raise ValueError("OPENEO_MAX_EXECUTORS must be an integer >= 2.")
        options["job_options"] = {"max-executors": int(raw)}
    if "OPENEO_JOB_BUDGET" in os.environ:
        options["budget"] = _positive_setting("OPENEO_JOB_BUDGET", "")
    return options


def _recover_job(connection, title, graph, backend):
    """Resolve a lost POST response without ever issuing a second create."""
    api_root = connection.root_url.rstrip("/")
    page_url = api_root + "/jobs"
    seen = set()
    candidates = []
    origin = urlsplit(api_root)
    while page_url:
        absolute = urljoin(api_root + "/", page_url)
        parsed = urlsplit(absolute)
        if (parsed.scheme, parsed.netloc) != (origin.scheme, origin.netloc) or absolute in seen:
            raise BatchJobError("Paginação de jobs inválida; criação bloqueada para evitar duplicação.")
        seen.add(absolute)
        page = connection.get(page_url, expected_status=200).json()
        if not isinstance(page.get("jobs"), list):
            raise BatchJobError("Listagem de jobs inválida; criação bloqueada.")
        candidates.extend(job["id"] for job in page["jobs"] if job.get("title") == title)
        links = [link["href"] for link in page.get("links", []) if link.get("rel") == "next"]
        if len(links) > 1:
            raise BatchJobError("Paginação de jobs ambígua; criação bloqueada.")
        page_url = urljoin(absolute, links[0]) if links else None
    candidates = list(dict.fromkeys(candidates))
    if len(candidates) != 1:
        raise BatchJobError(
            f"Criação anterior incerta: {len(candidates)} jobs com o título {title}. "
            "Reconciliar no provedor e no estado local antes de tentar novamente."
        )
    job = connection.job(candidates[0])
    description = job.describe()
    actual = description.get("process", {}).get("process_graph")
    if canonical_json(actual) != canonical_json(graph):
        raise BatchJobError("Job recuperado tem grafo diferente; recuperação bloqueada.")
    return job


def _cached_result(folder):
    receipt = read_json(folder / "receipt.json")
    if not receipt or not receipt.get("complete"):
        raise BatchJobError("Recibo de download ausente/incompleto; preservar estado para inspeção.")
    metadata_path = folder / "job-results.json"
    if not metadata_path.is_file() or _sha256(metadata_path) != receipt.get("metadata_sha256"):
        raise BatchJobError("Integridade dos metadados do cache inválida; preservar estado para inspeção.")
    for entry in receipt["assets"]:
        path = folder / entry["file"]
        if path.parent != folder or not path.is_file() or _sha256(path) != entry["sha256"]:
            raise BatchJobError("Integridade do cache inválida; recuperar assets do mesmo job após inspeção.")
    path = folder / receipt["netcdf"]
    with xr.open_dataset(path) as dataset:
        if "t" not in dataset.coords:
            raise BatchJobError("Resultado NetCDF não possui coordenada temporal t.")
    return path


def _write_provider_metadata(path, metadata):
    """Preserve provider nonfinite numbers in private download evidence only.

    Python's JSON NaN/Infinity extension round-trips the decoded provider
    values, without replacing nodata or touching raster/scientific values.
    This is not canonical state or a request fingerprint. Its exact stored
    bytes are verified by the strict download receipt's SHA256.
    """
    staged = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix=".provider-metadata-", delete=False) as stream:
            staged = Path(stream.name)
            json.dump(metadata, stream, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False, allow_nan=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(staged, path)
        if os.name != "nt":
            for directory in (path.parent, *path.parent.parents):
                descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
                try:
                    os.fsync(descriptor)
                finally:
                    os.close(descriptor)
    finally:
        if staged is not None:
            staged.unlink(missing_ok=True)


def _download_results(job, folder):
    results = folder / "results"
    if results.exists():
        return _cached_result(results)
    staged = folder / "download.partial"
    staged.mkdir(exist_ok=True)
    job_results = job.get_results()
    metadata = job_results.get_metadata()
    # Retain STAC and auxiliary assets without publishing private/signed links.
    _write_provider_metadata(staged / "job-results.json", metadata)
    assets = job_results.get_assets()
    netcdf = [asset for asset in assets if
              str(asset.key).lower().endswith(".nc") or "netcdf" in str(asset.media_type).lower()]
    if len(netcdf) != 1:
        raise BatchJobError(
            f"Job {job.job_id}: esperava um NetCDF do cubo inteiro, recebeu {len(netcdf)}. "
            "Metadados preservados; revisão necessária, sem descartar/mesclar aquisições."
        )
    previous = read_json(staged / "receipt.json") or {"assets": []}
    previous = {entry["key"]: entry for entry in previous["assets"]}
    receipt = {"assets": [], "complete": False, "netcdf": None,
               "metadata_sha256": _sha256(staged / "job-results.json")}
    for index, asset in enumerate(assets):
        suffix = ".nc" if asset is netcdf[0] else Path(str(asset.key)).suffix
        if not re.fullmatch(r"\.[A-Za-z0-9]{1,10}", suffix):
            suffix = ".bin"
        filename = f"asset-{index:04}{suffix}"
        target = staged / filename
        entry = previous.get(asset.key)
        if not (entry and entry["file"] == filename and target.is_file()
                and _sha256(target) == entry["sha256"]):
            partial = target.with_suffix(target.suffix + ".part")
            partial.unlink(missing_ok=True)
            asset.download(partial, redact_url_logging=True)
            if not partial.is_file() or partial.stat().st_size == 0:
                raise BatchJobError(f"Job {job.job_id}: asset vazio ou ausente.")
            with partial.open("r+b") as stream:
                os.fsync(stream.fileno())
            os.replace(partial, target)
            entry = {"key": asset.key, "file": filename, "sha256": _sha256(target)}
        receipt["assets"].append(entry)
        if asset is netcdf[0]:
            receipt["netcdf"] = filename
        write_json(staged / "receipt.json", receipt)
    receipt["complete"] = True
    write_json(staged / "receipt.json", receipt)
    _cached_result(staged)
    os.replace(staged, results)
    return _cached_result(results)


def download_batch_netcdf(connection, cube, *, aoi_id, backend_url, client_id):
    creation_options = job_creation_options()
    timeout = _positive_setting("OPENEO_JOB_TIMEOUT_SECONDS", "3600")
    interval = _positive_setting("OPENEO_POLL_INTERVAL_SECONDS", "30")
    backend_url = backend_url.rstrip("/")
    parsed = urlsplit(backend_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password or parsed.query:
        raise ValueError("OPENEO_BACKEND_URL deve ser uma URL sem credenciais/query.")
    saved = cube.save_result(format="NetCDF")
    request = {"backend": backend_url, "account": fingerprint(client_id),
               "aoi_id": str(aoi_id), "graph": saved.flat_graph()}
    key = fingerprint(request)
    jobs_root = state_root() / "openeo"
    jobs_root.mkdir(exist_ok=True)
    # Serialize AOI requests as well as identical requests (including direct callers).
    namespace = fingerprint({k: request[k] for k in ("backend", "account", "aoi_id")})
    with exclusive_lock(jobs_root / f"{namespace}.lock"):
        folder = jobs_root / key
        folder.mkdir(exist_ok=True)
        manifest_path = folder / "job.json"
        manifest = read_json(manifest_path)
        for other_path in jobs_root.glob("*/job.json"):
            if other_path == manifest_path:
                continue
            other = read_json(other_path)
            other_request = other["request"]
            if (all(other_request[k] == request[k] for k in ("backend", "account", "aoi_id"))
                    and other.get("phase") != "downloaded"
                    and other.get("status") not in {"error", "canceled"}):
                raise BatchJobPending(
                    f"AOI {aoi_id}: job anterior pendente em {other_path}. "
                    "Retome com ACOLITE_START_DATE/ACOLITE_END_DATE do grafo original antes de novo intervalo."
                )
        if manifest is None:
            manifest = {"version": 1, "fingerprint": key, "request": request,
                        "title": f"acolite:{key}", "phase": "creating", "job_id": None,
                        "creation_options": creation_options}
            # This intent deliberately makes a lost create response fail closed.
            write_json(manifest_path, manifest)
            try:
                job = saved.create_job(title=manifest["title"], **creation_options)
            except Exception:
                raise BatchJobError(f"AOI {aoi_id}: criação incerta. Intent salvo em {manifest_path}; retome para reconciliar.") from None
            manifest["job_id"] = job.job_id
            manifest["phase"] = "created"
            write_json(manifest_path, manifest)
        else:
            if (manifest.get("version") != 1 or manifest.get("fingerprint") != key
                    or canonical_json(manifest.get("request")) != canonical_json(request)):
                raise BatchJobError("Manifesto de job incompatível; criação bloqueada.")
            if (folder / "results").exists():
                path = _cached_result(folder / "results")
                manifest["phase"] = "downloaded"
                write_json(manifest_path, manifest)
                return path
            if canonical_json(manifest.get("creation_options", {})) != canonical_json(creation_options):
                raise BatchJobPending(
                    "Existing job uses different resource controls; resume with its saved controls. "
                    "No replacement job was created."
                )
            try:
                job = (connection.job(manifest["job_id"]) if manifest.get("job_id")
                       else _recover_job(connection, manifest["title"], request["graph"], backend_url))
            except BatchJobError:
                raise
            except Exception:
                raise BatchJobError(f"AOI {aoi_id}: não foi possível recuperar o job; estado preservado.") from None
            manifest["job_id"] = job.job_id
            write_json(manifest_path, manifest)
        logging.info("[ID %s] openEO batch job %s; estado %s", aoi_id, job.job_id, manifest_path)
        deadline = time.monotonic() + timeout
        started_this_run = False
        try:
            while True:
                status = job.status()
                manifest["status"] = status
                write_json(manifest_path, manifest)
                if status == "finished":
                    break
                if status in {"error", "canceled"}:
                    raise BatchJobError(f"Job {job.job_id}: {status}; não será reiniciado automaticamente.")
                if status == "created":
                    if manifest.get("start_attempted") and not started_this_run:
                        raise BatchJobPending(
                            f"Job {job.job_id}: início anterior incerto; reconciliar no provedor antes de repetir o POST de início."
                        )
                    if not manifest.get("start_attempted"):
                        manifest["start_attempted"] = True
                        write_json(manifest_path, manifest)
                        job.start()
                        started_this_run = True
                        manifest["phase"] = "monitoring"
                        write_json(manifest_path, manifest)
                elif status not in {"queued", "running"}:
                    raise BatchJobError(f"Job {job.job_id}: estado desconhecido; processamento preservado.")
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise BatchJobPending(f"Job {job.job_id}: espera local expirou; job remoto preservado para retomada.")
                time.sleep(min(interval, remaining))
            path = _download_results(job, folder)
        except BatchJobError:
            raise
        except Exception:
            raise BatchJobError(f"Job {job.job_id}: falha ao consultar/iniciar/baixar; retome usando o estado salvo.") from None
        manifest["phase"] = "downloaded"
        write_json(manifest_path, manifest)
        return path
