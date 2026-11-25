from __future__ import annotations

from pathlib import Path
import os
import unittest


PAYLOAD = Path(__file__).resolve().parents[1]
SYSTEMD_DIRECTORY = Path(
    os.environ.get("SIAPESQ_SYSTEMD_DIR", PAYLOAD / "systemd")
)


class Ec2ScheduleStaticTests(unittest.TestCase):
    def test_daily_runner_requires_and_marks_both_s3_publications(self) -> None:
        text = (PAYLOAD / "scripts" / "run_daily.sh").read_text(encoding="utf-8")
        self.assertIn('REQUIRE_S3_PUBLISH:-true', text)
        self.assertIn('predictors=verified', text)
        self.assertIn('predictions=verified', text)
        self.assertLess(
            text.index('predictions_published="true"'),
            text.index('Rodada autorizada para desligamento'),
        )

    def test_stop_script_requires_verified_marker(self) -> None:
        text = (
            PAYLOAD / "scripts" / "stop_instance_after_success.sh"
        ).read_text(encoding="utf-8")
        self.assertIn("last-successful-s3-run", text)
        self.assertIn("grep -qx 'predictors=verified'", text)
        self.assertIn("grep -qx 'predictions=verified'", text)
        self.assertIn("systemctl --no-block poweroff", text)

    def test_daily_service_stops_only_on_success(self) -> None:
        text = (
            SYSTEMD_DIRECTORY / "siapesq-models-daily.service"
            if (SYSTEMD_DIRECTORY / "siapesq-models-daily.service").exists()
            else SYSTEMD_DIRECTORY / "siapesq-models-daily.service.template"
        ).read_text(encoding="utf-8")
        self.assertIn("OnSuccess=siapesq-models-stop-after-success.service", text)
        self.assertNotIn("OnFailure=", text)

    def test_timer_runs_at_fourteen_brasilia(self) -> None:
        text = (
            SYSTEMD_DIRECTORY / "siapesq-models-daily.timer"
        ).read_text(encoding="utf-8")
        self.assertIn("OnCalendar=*-*-* 14:00:00 America/Sao_Paulo", text)
        self.assertIn("RandomizedDelaySec=0", text)


if __name__ == "__main__":
    unittest.main()
