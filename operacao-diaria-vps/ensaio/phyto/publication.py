"""Prove complete scene products, then publish only an isolated run snapshot."""
import argparse
from datetime import datetime, timezone
import hashlib
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from urllib.parse import urlsplit

import rasterio

from runtime_state import fingerprint, read_json, state_root, write_json


KINDS = {"RGB": 3, "RGB_MASK": 3, "NDCI": 1, "NDVI": 1, "NDVI2": 1}


class PublicationError(RuntimeError):
    pass


def _digest(path):
    checksum = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            checksum.update(block)
    return checksum.hexdigest()


def publication_context(run_id):
    if not re.fullmatch(r"[a-f0-9]{32}", run_id):
        raise PublicationError("Identificador de execução inválido.")
    configured = os.getenv("ACOLITE_PUBLICATION_MANIFEST")
    token = os.getenv("ACOLITE_PUBLICATION_TOKEN")
    if bool(configured) != bool(token):
        raise PublicationError("Manifesto e token de publicação devem ser definidos juntos.")
    manifest = (Path(configured).resolve() if configured else
                state_root() / "publications" / run_id / "manifest.json")
    token = token or run_id
    directory = manifest.parent
    if (not re.fullmatch(r"[A-Za-z0-9_.-]{8,80}", token)
            or manifest.name != "manifest.json"
            or not directory.is_relative_to(state_root())
            or directory == state_root()):
        raise PublicationError("Destino de prova deve ser exclusivo e permanecer dentro do estado persistente.")
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    if manifest.exists() or (directory / "products").exists():
        raise PublicationError("Contexto de publicação já utilizado; não reutilizar prova de outra execução.")
    (directory / "products").mkdir(mode=0o700)
    return directory, manifest, token


def scene_directory(directory):
    return Path(tempfile.mkdtemp(prefix="scene-", dir=Path(directory) / "products"))


def _validate_tiff(path, kind):
    try:
        if path.is_symlink() or not path.is_file() or path.stat().st_size == 0:
            raise PublicationError(f"Produto {kind} ausente ou inválido.")
        with rasterio.open(path) as image:
            if (image.driver != "GTiff" or image.count != KINDS[kind]
                    or image.width <= 0 or image.height <= 0 or image.crs is None
                    or not all(math.isfinite(value) for value in image.transform)):
                raise PublicationError(f"Estrutura/georreferenciamento de {kind} inválido.")
            # Reading the header alone accepts truncated TIFFs. Read every block
            # and band without loading the entire image into memory.
            for band in image.indexes:
                for _, window in image.block_windows(band):
                    image.read(band, window=window)
            return image.width, image.height, image.crs.to_wkt(), tuple(image.transform)
    except PublicationError:
        raise
    except Exception:
        raise PublicationError(f"GeoTIFF {kind} não está integralmente legível.") from None


def _copy_atomic(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    staged = None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix=".product-", delete=False) as stream:
            staged = Path(stream.name)
            with source.open("rb") as incoming:
                shutil.copyfileobj(incoming, stream, length=1024 * 1024)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(staged, target)
    finally:
        if staged is not None:
            staged.unlink(missing_ok=True)


def _validate_set(paths):
    signatures = {kind: _validate_tiff(path, kind) for kind, path in paths.items()}
    if signatures["RGB"] != signatures["RGB_MASK"]:
        raise PublicationError("Grades de RGB e RGB_MASK divergentes.")
    if len({signatures[kind] for kind in ("NDCI", "NDVI", "NDVI2")}) != 1:
        raise PublicationError("Grades dos três índices divergentes.")


def complete_scene(scene_dir, base_name, products, *, aoi_id, acquisition, out_dir):
    scene_dir = Path(scene_dir).resolve()
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", base_name):
        raise PublicationError("Nome de produto inválido.")
    expected_indices = {f"{base_name}_{kind}.tif" for kind in ("NDCI", "NDVI", "NDVI2")}
    if len(products) != 3 or set(products) != expected_indices:
        raise PublicationError("Conjunto de índices retornado não corresponde à cena atual.")
    paths = {kind: scene_dir / f"{base_name}_{kind}.tif" for kind in KINDS}
    _validate_set(paths)
    directory = scene_dir.parent.parent
    if scene_dir.parent.name != "products" or not directory.is_relative_to(state_root()):
        raise PublicationError("Produtos fora do snapshot exclusivo da execução.")
    entries = []
    for kind, source in paths.items():
        entries.append({"kind": kind, "key": source.name,
                        "path": source.relative_to(directory).as_posix(),
                        "size": source.stat().st_size, "sha256": _digest(source)})
    # No old output is touched until all five new products have been read.
    for entry in entries:
        source = directory / entry["path"]
        _copy_atomic(source, Path(out_dir) / entry["key"])
        if _digest(source) != entry["sha256"]:
            raise PublicationError("Produto mudou durante a promoção; cena não será publicada.")
        source.chmod(0o400)
    return {"aoi_id": str(aoi_id), "acquisition": acquisition, "products": entries}


def write_publication(manifest_path, token, summary, out_dir):
    manifest_path = Path(manifest_path)
    proof = {"version": 1, "run_id": summary["run_id"], "token": token,
             "finished_at": summary["finished_at"], "exit_code": summary["exit_code"],
             "status": summary["status"], "out_dir": str(Path(out_dir).resolve()),
             "scenes": summary.get("publication_scenes", [])}
    try:
        write_json(manifest_path, proof)
    except BaseException:
        # If fsync failed after replace, do not leave apparently usable proof.
        manifest_path.unlink(missing_ok=True)
        raise


def _proof_entries(proof, directory):
    seen = set()
    collected = []
    scenes = proof.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise PublicationError("Nenhuma cena completa comprovada; publicação bloqueada.")
    for scene in scenes:
        entries = scene.get("products", [])
        if len(entries) != 5 or {entry.get("kind") for entry in entries} != set(KINDS):
            raise PublicationError("Prova não contém os cinco produtos esperados por cena.")
        bases = set()
        paths = {}
        for entry in entries:
            kind, key = entry["kind"], entry["key"]
            ending = f"_{kind}.tif"
            if (not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9_.-]+", key)
                    or not key.endswith(ending) or key in seen):
                raise PublicationError("Chave de produto inválida ou duplicada.")
            bases.add(key[:-len(ending)])
            seen.add(key)
            relative = Path(entry["path"])
            source = directory / relative
            if (relative.is_absolute() or ".." in relative.parts or source.name != key
                    or source.is_symlink() or not source.resolve().is_relative_to(directory / "products")
                    or any(parent.is_symlink() for parent in source.parents if parent.is_relative_to(directory))):
                raise PublicationError("Caminho de produto não pertence ao snapshot da execução.")
            if (not source.is_file() or source.stat().st_size != entry["size"]
                    or _digest(source) != entry["sha256"]):
                raise PublicationError("Bytes do produto não correspondem à prova da execução.")
            paths[kind] = source
            collected.append((entry, source))
        if len(bases) != 1:
            raise PublicationError("Produtos de cenas diferentes misturados na prova.")
        _validate_set(paths)
    return collected


def _publish(manifest_path, token, out_dir, destination, aws_bin, expected_exit, resume):
    manifest_path = Path(manifest_path).resolve()
    directory = manifest_path.parent
    proof = read_json(manifest_path)
    if (not proof or proof.get("version") != 1 or proof.get("token") != token
            or proof.get("exit_code") != expected_exit or expected_exit not in (0, 2)
            or proof.get("status") != ("completed" if expected_exit == 0 else "partial")
            or proof.get("out_dir") != str(Path(out_dir).resolve())
            or not re.fullmatch(r"[a-f0-9]{32}", str(proof.get("run_id")))):
        raise PublicationError("Manifesto não comprova esta execução e seu resultado.")
    try:
        finished = datetime.fromisoformat(proof["finished_at"])
        if finished.tzinfo is None:
            raise ValueError
        age = (datetime.now(timezone.utc) - finished).total_seconds()
        if age < -60 or (age > 3600 and not resume):
            raise ValueError
    except (KeyError, TypeError, ValueError):
        raise PublicationError("Prova de publicação expirada ou sem horário válido.") from None
    target = urlsplit(destination)
    if (target.scheme != "s3" or not target.netloc or target.username or target.password
            or target.query or target.fragment or ".." in target.path.split("/")):
        raise PublicationError("Destino S3 inválido.")
    entries = _proof_entries(proof, directory)
    # Out may be rewritten by another direct pipeline after its lock is released.
    # Snapshot every proven source before the first upload, then use only copies.
    verified = Path(tempfile.mkdtemp(prefix="verified-", dir=directory))
    for entry, source in entries:
        copied = verified / entry["key"]
        _copy_atomic(source, copied)
        if copied.stat().st_size != entry["size"] or _digest(copied) != entry["sha256"]:
            raise PublicationError("Snapshot mudou durante a cópia; nenhum upload foi iniciado.")
        copied.chmod(0o400)
    receipt_path = directory / f"publication-{fingerprint(destination)}.json"
    receipt = read_json(receipt_path) or {"version": 1, "run_id": proof["run_id"], "destination": destination, "products": {}}
    if (receipt.get("version") != 1 or receipt.get("run_id") != proof["run_id"]
            or receipt.get("destination") != destination):
        raise PublicationError("Recibo de publicação incompatível.")
    for entry, _ in entries:
        previous = receipt["products"].get(entry["key"])
        if previous and previous.get("sha256") == entry["sha256"] and previous.get("status") == "completed":
            continue
        receipt["products"][entry["key"]] = {"sha256": entry["sha256"], "status": "pending"}
        write_json(receipt_path, receipt)
        try:
            result = subprocess.run([aws_bin, "s3", "cp", str(verified / entry["key"]),
                                     destination.rstrip("/") + "/" + entry["key"]], timeout=1800)
        except Exception:
            raise PublicationError("Upload não confirmado; produtos preservados para retomar somente a publicação.") from None
        if result.returncode != 0:
            raise PublicationError("Upload falhou; produtos preservados para retomar somente a publicação.")
        receipt["products"][entry["key"]]["status"] = "completed"
        write_json(receipt_path, receipt)
    return receipt


def publish(manifest_path, token, out_dir, destination, aws_bin, expected_exit, *, resume=False):
    try:
        return _publish(manifest_path, token, out_dir, destination, aws_bin, expected_exit, resume)
    except PublicationError:
        raise
    except Exception:
        raise PublicationError("Não foi possível validar/finalizar a publicação; produtos preservados.") from None


def main():
    parser = argparse.ArgumentParser(description="Publish only the proven five-product scene snapshots.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--destination", required=True)
    parser.add_argument("--aws-bin", default="aws")
    parser.add_argument("--expected-exit", required=True, type=int, choices=(0, 2))
    parser.add_argument("--resume", action="store_true",
                        help="Explicitly resume this exact run's publication, revalidating proof and bytes even after one hour.")
    args = parser.parse_args()
    try:
        publish(args.manifest, args.token, args.out_dir, args.destination, args.aws_bin, args.expected_exit,
                resume=args.resume)
    except Exception as exc:
        detail = str(exc) if isinstance(exc, PublicationError) else type(exc).__name__
        print(f"Publicação bloqueada: {detail}", flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
