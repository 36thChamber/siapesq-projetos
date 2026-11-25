from __future__ import annotations

import csv
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "publish_s3.py"
SPEC = importlib.util.spec_from_file_location("publish_s3", SCRIPT)
publish_s3 = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = publish_s3
SPEC.loader.exec_module(publish_s3)


class PublishS3Tests(unittest.TestCase):
    def test_resolve_roots_from_base_uri(self) -> None:
        environment = {"S3_BASE_URI": "s3://bucket/modelos/"}
        self.assertEqual(
            publish_s3.resolve_s3_root("predictors", environment),
            "s3://bucket/modelos/predictors/daily",
        )
        self.assertEqual(
            publish_s3.resolve_s3_root("predictions", environment),
            "s3://bucket/modelos/predictions/daily",
        )

    def test_collect_predictors_places_manifest_last(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory)
            for name in ("CHL.nc", "so.nc", "thetao.nc", "depth.nc"):
                (source / name).write_bytes(b"netcdf")
            (source / "manifest.json").write_text("{}\n", encoding="utf-8")

            items = publish_s3.collect_predictor_items(source)

        self.assertEqual(
            [item.relative_key for item in items],
            ["CHL.nc", "so.nc", "thetao.nc", "depth.nc", "manifest.json"],
        )

    def test_collect_predictions_only_includes_successful_pairs(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory).resolve()
            successful = source / "thunnus_obesus"
            failed = source / "katsuwonus_pelamis"
            successful.mkdir()
            failed.mkdir()
            mean_file = successful / "thunnus_obesus_rf_2026-07-29_mean.tif"
            sd_file = successful / "thunnus_obesus_rf_2026-07-29_sd.tif"
            partial_file = failed / "katsuwonus_pelamis_rf_2026-07-29_mean.tif"
            for path in (mean_file, sd_file, partial_file):
                path.write_bytes(b"tiff")

            with (source / "run_summary.csv").open(
                "w", encoding="utf-8", newline=""
            ) as stream:
                writer = csv.DictWriter(
                    stream,
                    fieldnames=(
                        "species_id",
                        "status",
                        "mean_file",
                        "sd_file",
                    ),
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "species_id": "thunnus_obesus",
                        "status": "ok",
                        "mean_file": str(mean_file),
                        "sd_file": str(sd_file),
                    }
                )
                writer.writerow(
                    {
                        "species_id": "katsuwonus_pelamis",
                        "status": "erro",
                        "mean_file": str(partial_file),
                        "sd_file": "",
                    }
                )

            items = publish_s3.collect_prediction_items(source)

        self.assertEqual(
            [item.relative_key for item in items],
            [
                "thunnus_obesus/thunnus_obesus_rf_2026-07-29_mean.tif",
                "thunnus_obesus/thunnus_obesus_rf_2026-07-29_sd.tif",
                "run_summary.csv",
            ],
        )

    def test_rejects_output_outside_run_directory(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            source = root / "outputs"
            source.mkdir()
            external = root / "external_mean.tif"
            external.write_bytes(b"tiff")
            local_sd = source / "species" / "model_sd.tif"
            local_sd.parent.mkdir()
            local_sd.write_bytes(b"tiff")

            with (source / "run_summary.csv").open(
                "w", encoding="utf-8", newline=""
            ) as stream:
                writer = csv.DictWriter(
                    stream,
                    fieldnames=("species_id", "status", "mean_file", "sd_file"),
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "species_id": "species",
                        "status": "ok",
                        "mean_file": str(external),
                        "sd_file": str(local_sd),
                    }
                )

            with self.assertRaises(publish_s3.PublishError):
                publish_s3.collect_prediction_items(source)

    def test_publish_uses_dated_keys_and_preserves_order(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "thetao.nc"
            manifest = Path(directory) / "manifest.json"
            first.write_bytes(b"netcdf")
            manifest.write_text("{}\n", encoding="utf-8")
            items = [
                publish_s3.UploadItem(first.resolve(), "thetao.nc"),
                publish_s3.UploadItem(manifest.resolve(), "manifest.json"),
            ]

            remote_sizes = {
                "thetao.nc": first.stat().st_size,
                "manifest.json": manifest.stat().st_size,
            }

            def fake_run(command, **kwargs):
                if command[1] == "s3api":
                    key = command[command.index("--key") + 1]
                    return mock.Mock(stdout=str(remote_sizes[Path(key).name]))
                return mock.Mock(stdout="")

            with mock.patch.object(
                publish_s3.shutil, "which", return_value="/usr/bin/aws"
            ), mock.patch.object(
                publish_s3.subprocess,
                "run",
                side_effect=fake_run,
            ) as run:
                count = publish_s3.publish_items(
                    items,
                    "s3://bucket/predictors/daily/2026-07-29",
                )

        self.assertEqual(count, 2)
        upload_calls = [
            call for call in run.call_args_list if call.args[0][1:3] == ["s3", "cp"]
        ]
        head_calls = [
            call
            for call in run.call_args_list
            if call.args[0][1:3] == ["s3api", "head-object"]
        ]
        destinations = [call.args[0][4] for call in upload_calls]
        self.assertEqual(
            destinations,
            [
                "s3://bucket/predictors/daily/2026-07-29/thetao.nc",
                "s3://bucket/predictors/daily/2026-07-29/manifest.json",
            ],
        )
        self.assertEqual(len(head_calls), 2)
        for call in upload_calls + head_calls:
            self.assertTrue(call.kwargs["check"])

    def test_publish_rejects_remote_size_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "thetao.nc"
            source.write_bytes(b"netcdf")
            item = publish_s3.UploadItem(source.resolve(), "thetao.nc")

            with mock.patch.object(
                publish_s3.shutil, "which", return_value="/usr/bin/aws"
            ), mock.patch.object(
                publish_s3.subprocess,
                "run",
                side_effect=[mock.Mock(stdout=""), mock.Mock(stdout="1")],
            ):
                with self.assertRaises(publish_s3.PublishError):
                    publish_s3.publish_items(
                        [item],
                        "s3://bucket/predictors/daily/2026-07-29",
                    )


if __name__ == "__main__":
    unittest.main()
