"""Durable local state shared by downloads and non-idempotent deliveries."""
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import tempfile


class StateError(RuntimeError):
    pass


def _json_default(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    raise TypeError(f"Unsupported state value: {type(value).__name__}")


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False, allow_nan=False, default=_json_default)


def fingerprint(value):
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def state_root():
    root = Path(os.getenv("ACOLITE_STATE_DIR", "state")).expanduser().resolve()
    for cleaned in (Path.cwd() / "tmp", Path.cwd() / "out"):
        if root.is_relative_to(cleaned.resolve()):
            raise StateError("ACOLITE_STATE_DIR deve ficar fora de tmp e out.")
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    return root


def read_json(path):
    path = Path(path)
    if not path.exists():
        return None
    with path.open(encoding="utf-8") as stream:
        result = json.load(stream)
    if not isinstance(result, dict):
        raise StateError(f"Estado inválido: {path}")
    return result


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    staged = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                         prefix=".state-", delete=False) as stream:
            staged = Path(stream.name)
            stream.write(canonical_json(value) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(staged, path)
        if os.name != "nt":
            # Newly created parent entries must survive a power loss too: losing
            # the intent/ledger directory could otherwise permit another POST.
            for directory in (path.parent, *path.parent.parents):
                descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
                try:
                    os.fsync(descriptor)
                finally:
                    os.close(descriptor)
    finally:
        if staged is not None:
            staged.unlink(missing_ok=True)


@contextmanager
def exclusive_lock(path):
    """Nonblocking OS lock, released even when the process is killed."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with path.open("a+b") as stream:
        if stream.seek(0, os.SEEK_END) == 0:
            stream.write(b"0")
            stream.flush()
        stream.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            raise StateError(f"Outra execução mantém o lock: {path}") from exc
        try:
            yield
        finally:
            stream.seek(0)
            if os.name == "nt":
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream, fcntl.LOCK_UN)
