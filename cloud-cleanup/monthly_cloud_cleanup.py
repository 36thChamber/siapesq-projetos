#!/usr/bin/env python3
"""Run a full, auditable cloud cleanup of s3://example-bucket."""
import csv
import datetime as dt
import os
from pathlib import Path
import shutil
import subprocess

BASE = Path(__file__).resolve().parent
REPORT = BASE / "cloud_cleanup_report.csv"
MANIFEST = BASE / "cloud_cleanup_delete_manifest.txt"
DELETED = BASE / "cloud_cleanup_deleted.txt"
HISTORY = BASE / "cloud_cleanup_history"
ANALYZE = BASE / "cloud_cleanup_s3.py"
DELETE = BASE / "delete_cloud_manifest.py"
VERIFY = BASE / "verify_cloud_cleanup.py"


def run(script: Path) -> None:
    subprocess.run(["/usr/bin/python3", str(script)], check=True)


def report_count() -> int:
    if not REPORT.exists():
        return 0
    with REPORT.open(newline="", encoding="utf-8") as fh:
        return len({row["mask_key"] for row in csv.DictReader(fh)})


def mask_count() -> int:
    proc = subprocess.run(
        ["/usr/local/bin/aws", "s3", "ls", "s3://example-bucket", "--recursive"],
        check=True, text=True, capture_output=True,
    )
    return sum(
        1 for line in proc.stdout.splitlines()
        if line.split(maxsplit=3)[-1].endswith("_RGB_MASK.tif")
    )


def main() -> None:
    started = dt.datetime.now(dt.timezone.utc)
    stamp = started.strftime("%Y%m%dT%H%M%SZ")
    archive = HISTORY / stamp
    archive.mkdir(parents=True, exist_ok=False)

    # Archive the previous run and force a complete recalculation, including
    # objects that may have been overwritten under an existing S3 key.
    for path in (REPORT, MANIFEST, DELETED):
        if path.exists():
            shutil.move(path, archive / path.name)

    expected = mask_count()
    for _ in range(20):
        run(ANALYZE)
        if report_count() == expected:
            break
    else:
        raise RuntimeError(
            f"analysis incomplete: {report_count()} of {expected} masks"
        )

    run(DELETE)
    run(VERIFY)
    print(
        f"monthly cleanup completed at {dt.datetime.now(dt.timezone.utc).isoformat()} "
        f"masks={expected} report={REPORT} manifest={MANIFEST} deleted={DELETED}"
    )


if __name__ == "__main__":
    main()
