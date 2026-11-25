"""External availability and backup monitoring. Credentials come from Secrets Manager."""
import base64
import datetime as dt
import json
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

MAX_BODY = 2 * 1024 * 1024


class SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        old = urllib.parse.urlsplit(req.full_url)
        new = urllib.parse.urlsplit(newurl)
        if (old.scheme, old.netloc) != (new.scheme, new.netloc):
            raise urllib.error.HTTPError(req.full_url, code, "Cross-origin redirect refused", headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def valid_origin(value):
    u = urllib.parse.urlsplit(value)
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.query or u.fragment or u.path not in ("", "/"):
        raise ValueError("HTTPS origin required")
    return value.rstrip("/")


def probe_target(target, opener=None):
    origin = valid_origin(target["origin"])
    opener = opener or urllib.request.build_opener(SameOriginRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    headers = {"User-Agent": "SIAPESQ-availability-monitor/1.0", "Cache-Control": "no-cache"}
    if target.get("basic_user"):
        headers["Authorization"] = "Basic " + base64.b64encode((target["basic_user"] + ":" + target["basic_password"]).encode()).decode()
    checks = []
    started = time.monotonic()
    try:
        for path, kind in [("/login", "html"), ("/api/planos/ativos", "json")]:
            with opener.open(urllib.request.Request(origin + path, headers=headers), timeout=12) as response:
                body = response.read(MAX_BODY + 1)
                if response.status != 200 or len(body) > MAX_BODY:
                    return {"healthy": False, "reason": "http_or_size", "checks": checks}
                if kind == "html" and b"<html" not in body.lower():
                    return {"healthy": False, "reason": "unexpected_login_body", "checks": checks}
                if kind == "json":
                    data = json.loads(body)
                    if not isinstance(data, list):
                        return {"healthy": False, "reason": "unexpected_api_body", "checks": checks}
                checks.append({"path": path, "status": response.status})
        return {"healthy": True, "checks": checks, "duration_ms": round((time.monotonic() - started) * 1000)}
    except (OSError, ValueError, urllib.error.URLError):
        return {"healthy": False, "reason": "request_failed", "checks": checks}


def backup_health(status, now):
    try:
        if status.get("marker") != "siapesq-cog-backup-status-v1":
            return False, "invalid_status"
        updated = dt.datetime.fromisoformat(status["updatedAt"].replace("Z", "+00:00"))
        success = dt.datetime.fromisoformat(status["lastSuccess"].replace("Z", "+00:00"))
        heartbeat_age = (now - updated).total_seconds()
        backup_age = (now - success).total_seconds()
        if heartbeat_age < -300 or backup_age < -300:
            return False, "future_clock"
        if heartbeat_age > 45 * 60:
            return False, "heartbeat_stale"
        if backup_age > 26 * 3600:
            return False, "backup_stale"
        if int(status.get("failures", 0)) >= 2:
            return False, "repeated_backup_failures"
        return True, "ok"
    except (KeyError, TypeError, ValueError):
        return False, "invalid_status"


def lambda_handler(event, context):
    import boto3
    secret = boto3.client("secretsmanager").get_secret_value(SecretId=os.environ["MONITOR_SECRET_ARN"])
    config = json.loads(secret["SecretString"])
    metrics = []
    results = {}
    for target in config["targets"]:
        result = probe_target(target)
        results[target["name"]] = result
        metrics.append({"MetricName": "Availability", "Dimensions": [{"Name": "Target", "Value": target["name"]}], "Value": int(result["healthy"]), "Unit": "Count"})
    try:
        response = boto3.client("s3").get_object(Bucket=config["backup_bucket"], Key="status/backup.json")
        body = response["Body"].read(32769)
        if len(body) > 32768:
            raise ValueError("Status too large")
        ok, reason = backup_health(json.loads(body), dt.datetime.now(dt.timezone.utc))
    except Exception:
        ok, reason = False, "status_unavailable"
    results["backup"] = {"healthy": ok, "reason": reason}
    metrics.append({"MetricName": "BackupHealthy", "Dimensions": [{"Name": "Target", "Value": "clone"}], "Value": int(ok), "Unit": "Count"})
    boto3.client("cloudwatch").put_metric_data(Namespace="SIAPESQ/Platform", MetricData=metrics)
    # Never log credentials, headers, signed URLs, or backup contents.
    print(json.dumps({"event": "platform_probe", "results": results}))
    return results
