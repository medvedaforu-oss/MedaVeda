"""Restore the archived production bundle only after explicit rollback approval."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute-approved-production-change", action="store_true")
    parser.add_argument("--expected-version", type=int, required=True)
    args = parser.parse_args()
    if not args.execute_approved_production_change:
        parser.error("Explicit rollback approval and the write guard are required")
    root = Path(__file__).resolve().parent.parent / "play-403-release-20261019-r2"
    manifest = json.loads((root / "manifest.json").read_text())
    compressed = (root / "production-v2.eszip.gz").read_bytes()
    assert hashlib.sha256(compressed).hexdigest() == manifest["archive_sha256"]["production-v2.eszip.gz"]
    bundle = gzip.decompress(compressed)
    assert hashlib.sha256(bundle).hexdigest() == manifest["production_bundle_sha256"]
    token = (Path.home() / ".supabase/access-token").read_text().strip()
    url = "https://api.supabase.com/v1/projects/xbvenkfmesugrbjuufyw/functions/sync-play-catalog"
    headers = {"Authorization": "Bearer " + token}
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=25) as response:
        current = json.load(response)
    assert current["version"] == args.expected_version, "Deployment version changed"
    assert current["id"] == "f0e3d974-a8e8-436c-9063-6943e4b36a08", "Wrong function"
    query = urllib.parse.urlencode({"verify_jwt": "false", "entrypoint_path": "functions/sync-play-catalog/index.ts"})
    request = urllib.request.Request(url + "?" + query, data=bundle, method="PATCH",
        headers={**headers, "Content-Type": "application/vnd.denoland.eszip"})
    with urllib.request.urlopen(request, timeout=45) as response:
        print(json.dumps({"rollback_http_status": response.status}))
    # No automatic retry or business-data rollback. Verify the new version separately.


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Rollback HTTP {error.code}; raw response omitted. Read metadata before any further write.")
    except Exception as error:
        raise SystemExit(f"Rollback stopped: {type(error).__name__}. Read metadata; do not repeat the write automatically.")
