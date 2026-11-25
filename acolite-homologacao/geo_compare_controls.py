"""Compare existing native original/staged crop evidence without rerunning rasters."""
import itertools
import json
from pathlib import Path
import sys

from native_geo_comparison import compare_pair, save_json

root = Path(sys.argv[1]).resolve()
comparisons = []
for revision, form, cutline in itertools.product(
        ("R4", "R30", "C"), ("geotiff", "netcdf_cf_variable", "netcdf_crs_coordinate"), ("rect", "poly")):
    left_path = root / f"{revision}-{form}-original_{cutline}"
    right_path = root / f"{revision}-{form}-staged_{cutline}"
    left = json.loads((left_path / "report.json").read_text(encoding="utf-8"))
    right = json.loads((right_path / "report.json").read_text(encoding="utf-8"))
    comparison = compare_pair(left, right, left_path, right_path)
    comparisons.append({"revision": revision, "format": form, "cutline": cutline, **comparison})
summary = {"status": "passed" if all(row["status"] == "passed" for row in comparisons) else "failed",
           "comparison_count": len(comparisons), "comparisons": comparisons,
           "scope": "Read-only comparison of already generated arrays/masks/metadata, original in-place vs staged destination"}
save_json(root / "control_comparisons.json", summary)
print(json.dumps({"status": summary["status"], "count": len(comparisons)}, indent=2))
raise SystemExit(0 if summary["status"] == "passed" else 1)
