"""Fail-closed boot-aware lifecycle markers, serialized by an OS file lock."""
import argparse
import os
from pathlib import Path
import re
from runtime_state import exclusive_lock

UUID = re.compile(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}")


def boot_id():
    path = Path(os.getenv("ACOLITE_BOOT_ID_FILE", "/proc/sys/kernel/random/boot_id"))
    value = path.read_text(encoding="ascii").strip()
    if not UUID.fullmatch(value):
        raise ValueError("Invalid kernel boot ID")
    return value


def inspect(directory, daily):
    expected = {"boot-id", "owner"} if daily else {"boot-id"}
    if directory.is_symlink() or not directory.is_dir():
        raise ValueError("Unsafe lifecycle lock directory")
    entries = list(directory.iterdir())
    if {item.name for item in entries} != expected:
        raise ValueError("Missing or unexpected lifecycle markers")
    if any(item.is_symlink() or not item.is_file() for item in entries):
        raise ValueError("Unsafe lifecycle marker")
    previous = (directory / "boot-id").read_text(encoding="ascii").strip()
    if not UUID.fullmatch(previous):
        raise ValueError("Invalid recorded boot ID")
    owner = (directory / "owner").read_text(encoding="ascii").strip() if daily else None
    if daily and (not owner or not owner.isascii() or not owner.isdigit()):
        raise ValueError("Invalid lifecycle owner")
    return previous, owner


def operate(state, kind, action, owner=None):
    state = Path(state)
    if kind not in {"daily", "wrapper"}:
        raise ValueError("Unsupported lock")
    daily = kind == "daily"
    if daily and (not owner or not owner.isascii() or not owner.isdigit()):
        raise ValueError("Owner must be a process ID")
    current = boot_id()
    state.mkdir(parents=True, exist_ok=True)
    guard = state / ".lifecycle-guard.lock"
    if guard.is_symlink():
        raise ValueError("Unsafe lifecycle guard")
    directory = state / (kind + ".lock-dir")
    # Nonblocking OS lock: a competing recovery attempt fails rather than
    # deleting a newly acquired lock. The persistent guard file is harmless.
    with exclusive_lock(guard):
        if action == "release":
            previous, actual_owner = inspect(directory, daily)
            if previous != current or (daily and actual_owner != owner):
                raise ValueError("Lifecycle ownership mismatch")
        elif action == "acquire":
            if directory.exists() or directory.is_symlink():
                previous, _ = inspect(directory, daily)
                if previous == current:
                    raise ValueError("Lifecycle lock is held in this boot")
            else:
                previous = None
        else:
            raise ValueError("Unsupported lock operation")
        if action == "release" or previous is not None:
            # Only the exact validated marker files. Never recursive removal.
            if daily:
                (directory / "owner").unlink()
            (directory / "boot-id").unlink()
            directory.rmdir()
        if action == "acquire":
            directory.mkdir(mode=0o700)
            markers = {"boot-id": current}
            if daily:
                markers["owner"] = owner
            for name, value in markers.items():
                with (directory / name).open("x", encoding="ascii") as stream:
                    stream.write(value + "\n")
                    stream.flush()
                    os.fsync(stream.fileno())
            if os.name != "nt":
                for path in (directory, state):
                    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
                    try:
                        os.fsync(fd)
                    finally:
                        os.close(fd)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["acquire", "release"])
    parser.add_argument("kind", choices=["daily", "wrapper"])
    parser.add_argument("--state", required=True)
    parser.add_argument("--owner")
    args = parser.parse_args()
    try:
        operate(args.state, args.kind, args.action, args.owner)
    except Exception as exc:
        print("Lifecycle lock refused: " + type(exc).__name__)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
