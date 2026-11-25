"""No external sends: exact-run reporting, wrapper evidence and host lifecycle."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from types import SimpleNamespace

import pytest
import operational_report as report
from runtime_state import fingerprint, read_json, write_json
from test_run_wrapper import bash, wrapper_env, run_wrapper, shell_script

ROOT = Path(__file__).resolve().parents[1]

@pytest.fixture
def evidence(tmp_path):
    state = tmp_path / "state"
    outcome = state / "invocations" / "daily.test" / "outcome.json"
    report.initialize(outcome, state)
    manifest = state / "publication.test" / "manifest.json"
    run_id = "a" * 32
    report.update(outcome, manifest=str(manifest), token="token", destination="s3://test", wrapper_exit=0,
                  pipeline_exit="0", publication_exit="0")
    write_json(manifest, {"run_id": run_id, "token": "token", "scenes": [{"products": [{"key": "165_product.tif", "sha256": "abc"}]}]})
    write_json(state / "runs" / (run_id + ".json"), {"run_id": run_id, "requested_ids": [165,541,542],
              "aois": [{"id": str(i), "status": "completed", "products_generated": 5} for i in [165,541,542]]})
    write_json(manifest.parent / ("publication-" + fingerprint("s3://test") + ".json"),
               {"run_id": run_id, "destination": "s3://test", "products": {"165_product.tif": {"sha256": "abc", "status": "completed"}}})
    return state, outcome, manifest


def test_report_exact_proof_and_remote_pending(evidence):
    state, outcome, manifest = evidence
    write_json(state / "openeo" / "one" / "job.json", {"request": {"aoi_id": "541"}, "job_id": "j-existing", "status": "running"})
    write_json(state / "openeo" / "other" / "job.json", {"request": {"aoi_id": "999"}, "job_id": "j-outside", "status": "running"})
    text = report.build_report(outcome)
    assert "S3 receipt acknowledged: 1/1" in text
    assert "j-existing" in text and "j-outside" not in text
    assert "last observed running" in text
    assert len(text.encode()) < 8192


def test_mismatched_summary_never_falls_back_to_latest(evidence):
    state, outcome, manifest = evidence
    value = read_json(manifest)
    value["token"] = "other"
    write_json(manifest, value)
    assert "NOT confirmed" in report.build_report(outcome)
    assert "AOI 165: completed" not in report.build_report(outcome)


@pytest.mark.parametrize("result", [0, 1, "timeout"])
def test_sns_bounded_file_argument_no_retry(evidence, monkeypatch, result):
    state, outcome, manifest = evidence
    calls = []
    def execute(args, **kwargs):
        calls.append((args, kwargs))
        if result == "timeout":
            raise subprocess.TimeoutExpired(args, 60)
        return SimpleNamespace(returncode=result)
    monkeypatch.setattr(report.subprocess, "run", execute)
    assert report.notify(outcome, "aws-stub") == (0 if result == 0 else 1)
    assert len(calls) == 1 and calls[0][1]["timeout"] == 60
    assert calls[0][0][-1].startswith("file://")
    assert read_json(outcome)["notification"] == {0: "accepted", 1: "failed", "timeout": "uncertain_timeout"}[result]


@pytest.mark.parametrize("pipeline,publisher,expected", [(0,0,0), (2,0,2), (1,0,1), (0,1,1)])
def test_run_wrapper_exact_outcome(bash, wrapper_env, pipeline, publisher, expected):
    project, env = wrapper_env
    shutil.copyfile(ROOT / "operational_report.py", project / "operational_report.py")
    old = Path(env["PYTHON_BIN"]).read_text()
    Path(env["PYTHON_BIN"]).write_text(old.replace('if [ "$1" != acolite.py ]; then exec "$@"; fi',
        'case "$1" in *operational_report.py) exec "$REAL_PYTHON" "$@";; esac\nif [ "$1" != acolite.py ]; then exec "$@"; fi'), newline="\n")
    env["REAL_PYTHON"] = sys.executable
    env["PYTHONPATH"] = str(ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    outcome = project / "invocations" / "outcome.json"
    report.initialize(outcome, Path(env["ACOLITE_STATE_DIR"]))
    env.update(ACOLITE_OUTCOME_PATH=outcome.as_posix(), PYTHON_STATUS=str(pipeline), PUBLISHER_STATUS=str(publisher))
    result = run_wrapper(bash, env, "165", "541", "542")
    assert result.returncode == expected, result.stderr
    record = read_json(outcome)
    assert record["wrapper_exit"] == expected
    assert record["pipeline_exit"] == str(pipeline)
    assert record["publication_exit"] == (str(publisher) if pipeline in (0,2) else "not_attempted")
    assert record["token"] == Path(record["manifest"]).parent.name


@pytest.mark.parametrize("status,maintenance,notify_fail", [(0,False,False),(2,False,False),(1,False,True),(0,True,False)])
def test_lifecycle_reports_then_stops_unless_maintenance(bash, tmp_path, status, maintenance, notify_fail):
    project = tmp_path / "project"
    config = tmp_path / "config"
    project.mkdir(); config.mkdir()
    (config / "production-enabled").write_text("enabled")
    calls = tmp_path / "calls"
    python = shell_script(project / "python", 'if [ "$1" = -c ]; then exit 0; fi\nprintf "%s\\n" "$2" >> "$CALLS"\nif [ "$2" = notify ]; then exit "$NOTIFY_STATUS"; fi\nexit 0\n')
    shell_script(project / "run-production.sh", 'printf "pipeline\\n" >> "$CALLS"; exit "$STATUS"\n')
    shell_script(project / "timeout", 'shift; exec "$@"\n')
    shutdown = shell_script(project / "shutdown", 'printf "shutdown\\n" >> "$CALLS"; exit 0\n')
    env = os.environ.copy()
    env.update(ACOLITE_DIR=project.as_posix(), ACOLITE_OPERATIONS_DIR=config.as_posix(),
               ACOLITE_STATE_DIR=(tmp_path / "state").as_posix(), PYTHON_BIN=python,
               ACOLITE_SHUTDOWN_COMMAND=shutdown, CALLS=calls.as_posix(), STATUS=str(status),
               NOTIFY_STATUS="1" if notify_fail else "0", ACOLITE_RECONCILE_ALERTS="1",
               OPENEO_MAX_EXECUTORS="2", OPENEO_JOB_BUDGET="20")
    env["PATH"] = project.as_posix() + os.pathsep + env.get("PATH", "")
    if maintenance:
        (config / "maintenance").touch()
    result = subprocess.run([bash, "-c", 'PATH="/usr/bin:$PATH"; export PATH; exec "$@"', "test", bash,
                             (ROOT / "deployment/run-acolite-daily.sh").as_posix()], env=env, capture_output=True, text=True, timeout=20)
    assert result.returncode == status, result.stderr
    if maintenance:
        assert not calls.exists()
    else:
        assert calls.read_text().splitlines() == ["init", "pipeline", "close", "notify", "can-stop", "shutdown"]

@pytest.mark.parametrize("denial", ["disabled", "invalid-controls", "daily-lock-held", "wrapper-lock-lost"])
def test_denied_daily_never_stops_another_run(bash, tmp_path, denial):
    project = tmp_path / "project"
    config = tmp_path / "config"
    state = tmp_path / "state"
    project.mkdir(); config.mkdir(); state.mkdir()
    (config / "production-enabled").write_text("enabled")
    calls = tmp_path / "calls"
    python = shell_script(project / "python", '''
if [ "$1" = -c ]; then exit "$PREFLIGHT_STATUS"; fi
printf '%s\\n' "$2" >> "$CALLS"
if [ "$2" = can-stop ]; then exit 1; fi
exit 0
''')
    shell_script(project / "run-production.sh", 'printf "pipeline-denied\\n" >> "$CALLS"; exit 1\n')
    shell_script(project / "timeout", 'shift; exec "$@"\n')
    shutdown = shell_script(project / "shutdown", 'printf "shutdown\\n" >> "$CALLS"; exit 0\n')
    env = os.environ.copy()
    env.update(ACOLITE_DIR=project.as_posix(), ACOLITE_OPERATIONS_DIR=config.as_posix(),
               ACOLITE_STATE_DIR=state.as_posix(), PYTHON_BIN=python,
               ACOLITE_SHUTDOWN_COMMAND=shutdown, CALLS=calls.as_posix(),
               PREFLIGHT_STATUS="1" if denial == "invalid-controls" else "0",
               ACOLITE_RECONCILE_ALERTS="1", OPENEO_MAX_EXECUTORS="1" if denial == "invalid-controls" else "2",
               OPENEO_JOB_BUDGET="20")
    env["PATH"] = project.as_posix() + os.pathsep + env.get("PATH", "")
    if denial == "disabled":
        (config / "production-enabled").unlink()
    if denial == "daily-lock-held":
        (state / "daily.lock-dir").mkdir()
        (state / "daily.lock-dir" / "first-owner").write_text("active")
    result = subprocess.run([bash, "-c", 'PATH="/usr/bin:$PATH"; export PATH; exec "$@"', "test", bash,
                             (ROOT / "deployment/run-acolite-daily.sh").as_posix()], env=env, capture_output=True, text=True, timeout=20)
    assert result.returncode == 1, result.stderr
    events = calls.read_text().splitlines() if calls.exists() else []
    assert "shutdown" not in events
    if denial != "wrapper-lock-lost":
        assert events == []
    else:
        assert events == ["init", "pipeline-denied", "close", "notify", "can-stop"]
    if denial == "daily-lock-held":
        assert (state / "daily.lock-dir" / "first-owner").read_text() == "active"
    else:
        assert not (state / "daily.lock-dir").exists()


def test_shutdown_authority_requires_actual_wrapper_link(tmp_path, monkeypatch):
    path = tmp_path / "outcome.json"
    report.initialize(path, tmp_path / "state")
    monkeypatch.setattr(sys, "argv", ["report", "can-stop", "--outcome", str(path)])
    assert report.main() == 1
    report.update(path, wrapper_owned=True)
    assert report.main() == 0


def test_inner_wrapper_lock_loser_never_gains_shutdown_authority(bash, wrapper_env, monkeypatch):
    project, env = wrapper_env
    state = Path(env["ACOLITE_STATE_DIR"])
    (state / "wrapper.lock-dir").mkdir(parents=True)
    outcome = project / "invocations" / "denied.json"
    report.initialize(outcome, state)
    env["ACOLITE_OUTCOME_PATH"] = outcome.as_posix()
    result = run_wrapper(bash, env, "165", "541", "542")
    assert result.returncode == 1
    monkeypatch.setattr(sys, "argv", ["report", "can-stop", "--outcome", str(outcome)])
    assert report.main() == 1
    assert not (project / "python-calls").exists()
    assert (state / "wrapper.lock-dir").exists()

@pytest.mark.parametrize("matching", [False, True])
def test_direct_wrapper_respects_daily_lifecycle_owner(bash, wrapper_env, matching):
    project, env = wrapper_env
    state = Path(env["ACOLITE_STATE_DIR"])
    (state / "daily.lock-dir").mkdir(parents=True)
    (state / "daily.lock-dir" / "owner").write_text("12345\n")
    if matching:
        env["ACOLITE_DAILY_OWNER"] = "12345"
    else:
        env.pop("ACOLITE_DAILY_OWNER", None)
    result = run_wrapper(bash, env, "165", "541", "542")
    assert result.returncode == (0 if matching else 1), result.stderr
    assert (project / "python-calls").exists() is matching
    assert (state / "daily.lock-dir" / "owner").read_text().strip() == "12345"


def test_daily_owner_rechecked_after_inner_lock_acquisition(bash, wrapper_env):
    project, env = wrapper_env
    hooks = project / "hooks"
    hooks.mkdir()
    shell_script(hooks / "mkdir", '''
/usr/bin/mkdir "$@" || exit $?
case "$1" in */wrapper.lock-dir)
    /usr/bin/mkdir "$ACOLITE_STATE_DIR/daily.lock-dir"
    printf 'other-owner\\n' > "$ACOLITE_STATE_DIR/daily.lock-dir/owner"
    ;;
esac
''')
    env["HOOKS"] = hooks.as_posix()
    env.pop("ACOLITE_DAILY_OWNER", None)
    result = subprocess.run([bash, "-c", 'HOOKS=$(cd "$HOOKS" && pwd); PATH="$HOOKS:/usr/bin:$PATH"; export PATH; exec "$@"', "test", bash,
                             (ROOT / "run.sh").as_posix(), "165", "541", "542"], env=env, capture_output=True, text=True, timeout=20)
    assert result.returncode == 1, result.stderr
    assert not (project / "python-calls").exists()
    state = Path(env["ACOLITE_STATE_DIR"])
    assert not (state / "wrapper.lock-dir").exists()
    assert (state / "daily.lock-dir" / "owner").read_text().strip() == "other-owner"
