"""Fail-closed delivery journal for SIAPESQ's non-idempotent alert POSTs.

A pending record is intentionally never retried automatically. The server may
have accepted the POST even when the client did not receive its response.
"""
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from runtime_state import exclusive_lock, fingerprint, read_json, state_root, write_json


class AlertDeliveryPending(RuntimeError):
    """A previous delivery requires reconciliation against SIAPESQ."""


def normalize_acquisition(value):
    """Represent the scientific acquisition instant independently of filenames."""
    import pandas as pd
    instant = pd.Timestamp(value)
    if pd.isna(instant):
        raise ValueError("Timestamp de aquisição ausente.")
    instant = instant.tz_localize("UTC") if instant.tzinfo is None else instant.tz_convert("UTC")
    return instant.isoformat(timespec="nanoseconds")


def read_scene_acquisition(scene_path, provider):
    if provider == "COPERNICUS":
        import xarray as xr
        with xr.open_dataset(scene_path) as dataset:
            if "t" not in dataset.coords or dataset.t.size != 1:
                raise ValueError("A cena NetCDF deve conter exatamente uma aquisição temporal.")
            return normalize_acquisition(dataset.t.values.reshape(-1)[0])
    metadata = read_json(Path(str(scene_path) + ".scene.json"))
    if not metadata or metadata.get("version") != 1:
        raise ValueError("Metadados temporais Sentinel ausentes; não é seguro deduplicar os alertas.")
    if "acquisitions" in metadata:
        instants = {normalize_acquisition(value) for value in metadata["acquisitions"]}
        if len(instants) != 1:
            raise ValueError("Resposta Sentinel sem aquisição única; não é seguro deduplicar os alertas.")
        return instants.pop()
    if not metadata.get("acquisition"):
        raise ValueError("Metadados temporais Sentinel ausentes; não é seguro deduplicar os alertas.")
    return normalize_acquisition(metadata["acquisition"])


def delivery_identity(*, base_api, endpoint, provider, aoi_id, acquisition,
                      product, area_id, bbox):
    target = urlsplit(base_api)
    if (target.scheme.lower() not in {"http", "https"} or not target.hostname
            or target.username or target.password or target.query or target.fragment):
        raise ValueError("SIAPESQ_BASE_API deve ser uma URL HTTP sem credenciais, query ou fragmento.")
    host = target.hostname.lower()
    if ":" in host:
        host = f"[{host}]"
    if target.port and (target.scheme.lower(), target.port) not in {("https", 443), ("http", 80)}:
        host += f":{target.port}"
    normalized_target = urlunsplit((target.scheme.lower(), host,
                                   target.path.rstrip("/") + "/" + endpoint.strip("/"), "", ""))
    return {
        "target": normalized_target,
        "provider": provider.upper(),
        "aoi_id": str(aoi_id),
        "acquisition": normalize_acquisition(acquisition),
        "product": Path(product).stem.rsplit("_", 1)[-1].lower(),
        "area_id": str(area_id),
        "bbox": [float(value) for value in bbox],
    }


def deliver_once(identity, send):
    """Return True for a newly acknowledged delivery, False for a prior one.

    This journal prevents automatic duplicate submissions; it cannot make a
    remote POST exactly once. A crash or any send exception leaves `pending`.
    """
    key = fingerprint(identity)
    directory = state_root() / "alerts"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{key}.json"
    with exclusive_lock(directory / f"{key}.lock"):
        record = read_json(path)
        if record is not None:
            if record.get("version") != 1 or record.get("request") != identity:
                raise AlertDeliveryPending(f"Registro de alerta inválido; reconciliar {path}.")
            if record.get("status") == "completed":
                return False
            raise AlertDeliveryPending(f"Envio anterior sem confirmação; reconciliar {path} antes de repetir.")
        record = {"version": 1, "request": identity, "status": "pending"}
        write_json(path, record)
        try:
            send()
        except Exception as exc:
            # Persist no provider response, credential, or error message.
            record["error_type"] = type(exc).__name__
            write_json(path, record)
            raise
        record["status"] = "completed"
        write_json(path, record)
        return True
