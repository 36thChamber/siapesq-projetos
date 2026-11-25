from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "cleanup_local_artifacts.py"
RUN_DAILY = (Path(__file__).resolve().parents[1] / "scripts" / "run_daily.sh").read_text(
    encoding="utf-8"
)
SPEC = importlib.util.spec_from_file_location("cleanup_local_artifacts", SCRIPT)
cleanup = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = cleanup
SPEC.loader.exec_module(cleanup)


class CleanupLocalArtifactsTests(unittest.TestCase):
    def make_project(self, root: Path) -> Path:
        project = root / "models"
        (project / "data" / "daily").mkdir(parents=True)
        (project / "outputs").mkdir()
        return project

    def test_removes_dated_predictors_and_current_link(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = self.make_project(Path(directory))
            source = project / "data" / "daily" / "2026-07-29"
            source.mkdir()
            (source / "CHL.nc").write_bytes(b"data")
            (project / "data" / "daily" / "current").symlink_to(source.name)

            cleanup.cleanup_local_artifacts(
                project_root=project,
                source=source,
                kind="predictors",
                prediction_date="2026-07-29",
            )

            self.assertFalse(source.exists())
            self.assertFalse((project / "data" / "daily" / "current").exists())

    def test_dry_run_preserves_predictions(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = self.make_project(Path(directory))
            source = project / "outputs" / "2026-07-29"
            source.mkdir()

            cleanup.cleanup_local_artifacts(
                project_root=project,
                source=source,
                kind="predictions",
                prediction_date="2026-07-29",
                dry_run=True,
            )

            self.assertTrue(source.is_dir())

    def test_rejects_directory_outside_expected_root(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = self.make_project(root)
            outside = root / "2026-07-29"
            outside.mkdir()

            with self.assertRaises(cleanup.CleanupError):
                cleanup.cleanup_local_artifacts(
                    project_root=project,
                    source=outside,
                    kind="predictions",
                    prediction_date="2026-07-29",
                )

    def test_rejects_mismatched_date(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = self.make_project(Path(directory))
            source = project / "outputs" / "2026-07-29"
            source.mkdir()

            with self.assertRaises(cleanup.CleanupError):
                cleanup.cleanup_local_artifacts(
                    project_root=project,
                    source=source,
                    kind="predictions",
                    prediction_date="2026-07-30",
                )

    def test_daily_cleanup_requires_both_successful_publications(self) -> None:
        self.assertIn('predictors_published="false"', RUN_DAILY)
        self.assertIn('predictions_published="false"', RUN_DAILY)
        self.assertIn(
            '[[ "${predictors_published}" == "true" && '
            '"${predictions_published}" == "true" ]]',
            RUN_DAILY,
        )
        cleanup_position = RUN_DAILY.index('DELETE_LOCAL_AFTER_S3:-true')
        prediction_guard = RUN_DAILY.index('[[ "${prediction_status}" -ne 0 ]]')
        upload_guard = RUN_DAILY.index('[[ "${s3_publish_failed}" == "true" ]]')
        self.assertGreater(cleanup_position, prediction_guard)
        self.assertGreater(cleanup_position, upload_guard)


if __name__ == "__main__":
    unittest.main()
