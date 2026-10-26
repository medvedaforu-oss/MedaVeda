"""Prepared operator commands. Production writes require separate user approval.

The command-line write guard prevents accidental execution; it is not approval.
No retries are performed, including after a timeout or an ambiguous response.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

REF = "xbvenkfmesugrbjuufyw"
SKU = "notes_1_00_v_066f5677fba745d696d1504b7600f8f7"
ROOT = Path(__file__).resolve().parent
WRITES = {"pause", "retry-one", "invoke-one"}
POLICY = json.loads((ROOT / "error-detail-policy.json").read_text())


def http(url, token, data=None, headers=None):
    request = urllib.request.Request(url, data=None if data is None else json.dumps(data).encode(),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.load(response)


def management(path, data=None):
    token = (Path.home() / ".supabase/access-token").read_text().strip()
    return http("https://api.supabase.com/v1/projects/" + REF + path, token, data)


def database(sql, write=False):
    # Even read-only database calls use HTTP POST, but the transaction is read-only.
    statement = ("BEGIN;\n" if write else "BEGIN TRANSACTION READ ONLY;\n")
    statement += sql + ("\nCOMMIT;" if write else "\nROLLBACK;")
    return management("/database/query", {"query": statement, "read_only": not write})


def verify_baseline():
    function = management("/functions/sync-play-catalog")
    assert function["version"] == 2 and function["status"] == "ACTIVE", "Production baseline changed"
    assert function["id"] == "f0e3d974-a8e8-436c-9063-6943e4b36a08" and function["verify_jwt"] is False
    manifest = json.loads((ROOT.parent / "play-403-release-20261019-r2/manifest.json").read_text())
    token = (Path.home() / ".supabase/access-token").read_text().strip()
    request = urllib.request.Request("https://api.supabase.com/v1/projects/" + REF +
        "/functions/sync-play-catalog/body", headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(request, timeout=25) as response:
        digest = hashlib.sha256(response.read()).hexdigest()
    assert digest == manifest["production_bundle_sha256"], "Production rollback baseline changed"
    print(json.dumps({"baseline_verified": True, "version": 2, "bundle_sha256": digest}))


def one_rupee_precondition(preflight, pending=False):
    jobs = preflight[0]["preflight"]["catalog"]
    cron = preflight[0]["preflight"]["cron"]
    assert len(cron) == 1 and cron[0]["jobid"] == 8 and not cron[0]["active"], "Catalog cron must be paused"
    assert len(jobs) == 2, "Catalog inventory changed"
    one = next(job for job in jobs if float(job["price_inr"]) == 1)
    two = next(job for job in jobs if float(job["price_inr"]) == 2)
    assert one["candidate_sku"] == SKU and one["purchase_option_id"] == "buy", "One-rupee identity changed"
    assert one["status"] == ("pending" if pending else "failed") and one["attempts"] == 1, "One-rupee state changed"
    assert two["status"] == "failed" and two["attempts"] == 1, "Two-rupee state changed"
    assert two["candidate_sku"] == "notes_2_00_v_d93112f242a94a9b83d5bb2c31ef11a3", "Two-rupee identity changed"
    assert all(job["lease_id"] is None and job["lease_until"] is None for job in jobs), "Outstanding lease"
    state = preflight[0]["preflight"]
    assert state["queued_catalog_http"] == 0 and state["running_catalog_cron_sql"] == 0, "Outstanding invocation"


def admin_session():
    # A genuine current admin session is required. No impersonation or role override.
    token_path = Path(os.environ["MEDVEDA_ADMIN_JWT_FILE"])
    token = token_path.read_text().strip()
    env_path = Path(__file__).resolve().parents[4] / "mobile-app/.env"
    values = {}
    for line in env_path.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    assert values["EXPO_PUBLIC_SUPABASE_URL"].rstrip("/") == "https://" + REF + ".supabase.co", "Wrong API project"
    headers = {"apikey": values["EXPO_PUBLIC_SUPABASE_ANON_KEY"]}
    base = "https://" + REF + ".supabase.co"
    user = http(base + "/auth/v1/user", token, headers=headers)
    assert user.get("id"), "No valid authenticated user"
    assert http(base + "/rest/v1/rpc/am_i_admin", token, {}, headers) is True, "Admin session required"
    return base, token, headers


def retry_one():
    one_rupee_precondition(database((ROOT / "preflight.sql").read_text()))
    base, token, headers = admin_session()
    result = http(base + "/rest/v1/rpc/retry_play_price_sync", token, {"p_price": 1.00}, headers)
    assert result is True, "Retry RPC did not requeue the approved job"
    print(json.dumps({"price_inr": "1.00", "requeued": True}))


def safe_log(message):
    marker = "play_catalog_failure"
    payload = json.loads(message[message.index(marker) + len(marker):].strip())
    assert isinstance(payload, dict), "Expected a structured diagnostic event"
    operation = payload.get("operation")
    assert operation in POLICY["operations"], "Unrecognized operation"
    status = payload.get("status")
    assert type(status) is int and 0 <= status <= 599, "Invalid HTTP status"
    reason = payload.get("reason")
    reason = reason if reason in POLICY["reasons"] else "unclassified"
    request_id = payload.get("requestId", "")
    assert isinstance(request_id, str) and re.fullmatch(r"[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}", request_id)
    details = []
    for entry in payload.get("details", [])[:4]:
        if not isinstance(entry, dict) or entry.get("type") not in POLICY["detail_types"]:
            continue
        detail = {"type": entry["type"]}
        if detail["type"] == "ErrorInfo":
            if entry.get("reason") in POLICY["detail_reasons"]:
                detail["reason"] = entry["reason"]
            if entry.get("domain") in POLICY["domains"]:
                detail["domain"] = entry["domain"]
            if entry.get("service") == "androidpublisher.googleapis.com":
                detail["service"] = entry["service"]
            consumer = entry.get("consumer")
            if isinstance(consumer, str) and (re.fullmatch(r"projects/[0-9]{6,20}", consumer)
                    or consumer == "projects/medveda-play-billing"):
                detail["consumer"] = consumer
        details.append(detail)
    job_id = str(payload.get("jobId", ""))
    assert re.fullmatch(r"[0-9]{1,8}(?:\.[0-9]{1,2})?", job_id), "Invalid job identifier"
    lease = payload.get("leaseId", "")
    assert isinstance(lease, str) and re.fullmatch(r"[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}", lease)
    return {"operation": operation, "http_status": status, "reason": reason,
        "requestId": request_id, "details": details, "jobId": job_id, "leaseId": lease,
        "unexpected_job": job_id not in ("1", "1.0", "1.00")}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["metadata", "verify-baseline", "preflight", "monitor", "logs", "check-admin", *sorted(WRITES)])
    parser.add_argument("--execute-approved-production-change", action="store_true")
    parser.add_argument("--expected-version", type=int)
    parser.add_argument("--request-id", type=int, default=0)
    parser.add_argument("--since", default="2026-10-19T00:00:00Z")
    args = parser.parse_args()
    if args.action in WRITES:
        if not args.execute_approved_production_change:
            parser.error("Explicit user approval and --execute-approved-production-change are required")
        assert args.expected_version is not None, "Provide the verified deployed version"
        function = management("/functions/sync-play-catalog")
        assert function["version"] == args.expected_version and function["status"] == "ACTIVE", "Deployment changed"
        assert function["verify_jwt"] is False and function["id"] == "f0e3d974-a8e8-436c-9063-6943e4b36a08", "Function/authentication changed"
    if args.action == "verify-baseline":
        verify_baseline()
    elif args.action == "metadata":
        function = management("/functions/sync-play-catalog")
        print(json.dumps({name: function.get(name) for name in
            ["id", "slug", "version", "status", "verify_jwt", "updated_at"]}, indent=2))
    elif args.action == "check-admin":
        admin_session()
        print(json.dumps({"admin_session_verified": True}))
    elif args.action == "retry-one":
        retry_one()
    elif args.action == "logs":
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", args.since), "Use an exact UTC timestamp"
        sql = ("select timestamp,event_message from logs where source='function_logs' "
               "and event_message like '%play_catalog_failure%' order by timestamp desc limit 20")
        result = management("/analytics/endpoints/logs?" + urllib.parse.urlencode({"sql": sql, "iso_timestamp_start": args.since}))
        assert "error" not in result, "Log query failed; raw backend response omitted"
        for row in result.get("result", []):
            try:
                diagnostic = safe_log(row.get("event_message", ""))
            except (ValueError, TypeError, KeyError, AssertionError):
                diagnostic = {"structured_log_unavailable": True}
            print(json.dumps({"timestamp": row.get("timestamp"), **diagnostic}))
    else:
        sql = (ROOT / (args.action + ".sql")).read_text()
        assert args.request_id >= 0, "Request ID must be nonnegative"
        sql = sql.replace("__REQUEST_ID__", str(args.request_id))
        print(json.dumps(database(sql, args.action in WRITES), indent=2))


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        raise SystemExit(f"HTTP {error.code}; raw response omitted. Do not retry a write automatically.")
    except Exception as error:
        # Do not render exception messages that could contain filesystem contents or credentials.
        raise SystemExit(f"Stopped: {type(error).__name__}. Inspect safe preflight evidence before continuing.")
