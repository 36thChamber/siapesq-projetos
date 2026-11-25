"""Low-rate, read-only HTTP checks. Never follows a redirect into a false success."""
import argparse
import datetime
import json
import time
import urllib.error
import urllib.request
from pathlib import Path


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


TARGETS = [
    ("https://api.example.invalid/v1/health", 200, {"status": "ok"}),
    ("https://api.example.invalid/health", 200, {"status": "ok"}),
    ("https://api.example.invalid/v1/phytoBloom/reservatorios", 401, None),
    ("https://api.example.invalid/api/project.all", 401, None),
]


def probe(url, expected_status, expected_body):
    started = time.monotonic()
    row = {"utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "url": url}
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "SIAPESQ-availability-audit/1.0"})
        try:
            response = urllib.request.build_opener(NoRedirect).open(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            row.update(status=response.code, content_type=response.headers.get("Content-Type"),
                       location=response.headers.get("Location"))
            data = response.read(4096)
            row["expected_response"] = response.code == expected_status
            if expected_body is not None:
                try:
                    row["expected_response"] &= json.loads(data) == expected_body
                except (ValueError, UnicodeDecodeError):
                    row["expected_response"] = False
    except Exception as error:
        row.update(error=type(error).__name__, expected_response=False)
    row["seconds"] = round(time.monotonic() - started, 3)
    return row


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=1)
    parser.add_argument("--interval", type=float, default=10)
    args = parser.parse_args()
    output = Path(__file__).with_name("probe-history.jsonl")
    for iteration in range(args.rounds):
        for target in TARGETS:
            row = probe(*target)
            with output.open("a") as handle:
                handle.write(json.dumps(row) + "\n")
            print(json.dumps(row), flush=True)
        if iteration + 1 < args.rounds:
            time.sleep(max(args.interval, 1))
