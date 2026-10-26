# MedVeda Google Play 403: diagnostic release r2

Prepared 19 October 2026 UTC. **Awaiting explicit approval. No production change or Google request has been made during this preparation.** This revision replaces the earlier candidate and execution instructions in this file. The previous plan/operator files are preserved as historical evidence under `evidence/play-403-release-20261019-r2`; they are not current execution instructions.

## Reviewed changes and scope

The HTTP 408 and OAuth 4xx policy changes were **not necessary** for diagnosis and have been removed:

| Failure | Production v2 policy retained in r2 |
|---|---|
| Catalog HTTP 408 | Terminal |
| Catalog HTTP 403 and other nonretryable 4xx | Terminal |
| Catalog HTTP 409, 429, 5xx | Retryable |
| Transport failure | Retryable |
| OAuth HTTP failure, including 4xx | Retryable, matching the old generic-error path |

The revised worker regression compares the actual candidate class/handler with the checksum-verified production-v2 handler over **20 catalog/OAuth cases**. Authentication, queue RPC sequence and retry decisions match. Pricing, product payloads, activation/readback, idempotency/leases and settlement logic remain unchanged. Only `sync-play-catalog` is deployed; other functions importing the shared client retain their existing deployed bundles.

The diagnostic record contains operation, HTTP status, an allowlisted reason, local correlation UUID, job/lease identifiers and **bounded, sanitized structured details**. `google.rpc.ErrorInfo` can retain only known reason/domain labels, the exact `androidpublisher.googleapis.com` service, and a validated numeric `projects/{number}` consumer resource or the known intended project resource. Other recognized details retain type only. Up to four details are retained from at most eight input entries. Unknown fields/reasons, free-form messages, links, request-info payloads, arbitrary metadata, keys and tokens are dropped. See [Google's error-details guidance](https://google.aip.dev/193#statusdetails).

The worker emits one JSON diagnostic payload after the static `play_catalog_failure` marker. The operator log reader reconstructs the same allowed fields and never prints the complete log message. The persisted database message remains the existing sanitized operation/status/reason/UUID string, below its 300-character limit; structured details are collected from logs, not silently appended to that database field. A local UUID is not a Google-issued request ID. A consumer project in Google's response does not by itself establish the service-account email.

The prior runtime identity/API-enablement limitations remain: no original JSON or authorized Google Cloud session is available here; Supabase secret digests cannot reveal `client_email`/`project_id`. No missing permission, disabled API or wrong credential is inferred. The intended account is `medveda-play-billing@medveda-play-billing.iam.gserviceaccount.com`, project `medveda-play-billing`, package `in.medveda.app`.

## Frozen artifacts

Use only [`evidence/play-403-release-20261019-r2/manifest.json`](evidence/play-403-release-20261019-r2/manifest.json) and its archives for the next approval:

- `candidate-source.tar.gz`: revised three-file diagnostic source, minimal config and production-version dependency pin.
- `diagnostics.patch`: exact diff against downloaded production v2 source.
- `rollback-source.tar.gz` and `production-v2.eszip.gz`: **unchanged bytes/checksums** from the verified production rollback backup.
- `production-metadata.json`: baseline function identity/configuration.

The original raw bundle SHA-256 remains `a7e299ca54793bae4d83187599b2212849ac73ca34243d7fba2e86f735069a69`. The candidate pins Supabase JS to the observed production version `2.118.0`. Archive/file hashes and source parity must pass immediately before use. Original r1 artifacts are retained for provenance, not deployment.

Validation passed: five Deno catalog/sanitization tests, 20 worker retry-parity cases, candidate type-checking with cached production-version dependencies, authentication/catalog source comparisons, structured-detail collector redaction and mutation guards. Full results and test-source hashes are in `validation.json`. The r2 candidate archive SHA-256 is `266ee71e6613721f69380eca2fb9c36266edec791f2550fa8b10050d739f188e`.

Operator commands are in [`evidence/play-403-single-job-20261019/control.py`](evidence/play-403-single-job-20261019/control.py), with inspectable SQL and a separate operator manifest. `rollback.py` now reads the r2 rollback manifest. There is **no resume action**: recurring catalog cron stays paused after the controlled attempt. No other cron is changed.

## Approval boundary and exact job

Future explicit approval must cover: pausing existing catalog cron job 8, deploying this one diagnostic function, one authenticated admin requeue of the exact ₹1 SKU, one worker invocation, and immediate rollback on an unexpected condition. Approval does **not** cover ₹2 retry, enabling/resuming any recurring job, changing credentials/secrets/permissions, unrelated payment changes or a root-cause correction. Production remains unchanged until that approval is received.

```text
Supabase project: xbvenkfmesugrbjuufyw
Function ID:      f0e3d974-a8e8-436c-9063-6943e4b36a08
Function slug:    sync-play-catalog
Baseline:         ACTIVE v2, verify_jwt=false
Price/job key:    INR 1.00
Candidate SKU:    notes_1_00_v_066f5677fba745d696d1504b7600f8f7
Purchase option:  buy
Baseline job:     failed, attempts=1, no lease
Catalog cron:     jobid=8, play-catalog-sync, every minute
Excluded job:     INR 2.00, failed, attempts=1; must remain unchanged
```

The worker has no price selector. Require the ₹1 job to be the sole runnable job and coordinate a window without Admin product/PDF changes or other manual invocations. An authorized attempt can make several Google requests and may create/update/activate the ₹1 product if the current denial no longer occurs. A code rollback cannot undo external catalog changes.

## Commands before any production write

Run from `/home/ganeshp8545/AyurPulse`. These checks are local or read-only. There is no valid admin JWT file configured in the current agent session. A genuine existing authorized Admin Panel session must be made available privately before executing the approved window; pass only its file path through `MEDVEDA_ADMIN_JWT_FILE`, never its token contents. `check-admin` validates the session and calls the read-only `am_i_admin` RPC. No impersonation or service-role override is used. If this prerequisite is unavailable, stop **before pausing or deploying**.

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py metadata
python3 docs/audit/evidence/play-403-single-job-20261019/control.py verify-baseline
python3 docs/audit/evidence/play-403-single-job-20261019/control.py preflight
python3 docs/audit/evidence/play-403-single-job-20261019/control.py monitor --request-id 0
# Configure only the privately held admin-token file path, not a token value:
# export MEDVEDA_ADMIN_JWT_FILE=/secure/operator/admin-session.jwt
python3 docs/audit/evidence/play-403-single-job-20261019/control.py check-admin
```

Refresh the deployed bundle/source and require the recorded v2 baseline, function ID, authentication and two job states. Abort on drift; do not replace the saved rollback backup silently. Verify/extract the candidate and rollback locally:

```sh
python3 - <<'PY'
from pathlib import Path
import hashlib, json, tarfile
root = Path('docs/audit/evidence/play-403-release-20261019-r2')
m = json.loads((root / 'manifest.json').read_text())
for name, expected in m['archive_sha256'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name
ops = Path('docs/audit/evidence/play-403-single-job-20261019')
assert hashlib.sha256((ops / 'manifest.json').read_bytes()).hexdigest() == m['operator_manifest_sha256']
operator_manifest = json.loads((ops / 'manifest.json').read_text())
for name, expected in operator_manifest['files_sha256'].items():
    assert hashlib.sha256((ops / name).read_bytes()).hexdigest() == expected, name
for kind in ('candidate', 'rollback'):
    dest = Path('/tmp/medveda-play-403-approved-r2') / kind
    assert not dest.exists(), 'Use a fresh extraction directory'
    dest.mkdir(parents=True)
    with tarfile.open(root / f'{kind}-source.tar.gz') as archive:
        archive.extractall(dest, filter='data')
    for name, expected in m['files'][kind].items():
        assert hashlib.sha256((dest / name).read_bytes()).hexdigest() == expected, name
print('R2 source and rollback archives verified')
PY
deno check --cached-only \
  --import-map /tmp/medveda-play-403-approved-r2/candidate/supabase/functions/import_map.json \
  /tmp/medveda-play-403-approved-r2/candidate/supabase/functions/sync-play-catalog/index.ts
```

## Approved execution only

**Production write 1: pause existing catalog cron, never enable it.** The guard requires exactly the known two failed jobs, no leases, and the expected active job 8:

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py pause \
  --expected-version 2 --execute-approved-production-change
```

Record `paused_at`. Drain for at least three minutes, checking read-only preflight approximately every ten seconds. Require no queued catalog HTTP request, running cron SQL, outstanding lease or job-state change. Cron SQL completion alone does not establish HTTP completion. Keep the no-concurrent-changes window in force.

**Production write 2: deploy only the reviewed r2 diagnostic function.** Supabase CLI 2.120.0 flags were verified; [CLI reference](https://supabase.com/docs/reference/cli/supabase-functions-deploy):

```sh
/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/@supabase/cli-linux-x64/bin/supabase \
  functions deploy sync-play-catalog \
  --project-ref xbvenkfmesugrbjuufyw \
  --workdir /tmp/medveda-play-403-approved-r2/candidate \
  --import-map /tmp/medveda-play-403-approved-r2/candidate/supabase/functions/import_map.json \
  --no-verify-jwt --use-api
```

**Read-only deployment verification:**

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py metadata > /tmp/medveda-403-r2-deployment.json
MEDVEDA_DIAG_VERSION="$(python3 -c 'import json; print(int(json.load(open("/tmp/medveda-403-r2-deployment.json"))["version"]))')"
python3 docs/audit/evidence/play-403-single-job-20261019/control.py preflight
curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}\n' \
  https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/sync-play-catalog
curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}\n' \
  --request POST --header 'Content-Type: application/json' --data '{}' \
  https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/sync-play-catalog
```

Require new ACTIVE version, same function ID, `verify_jwt=false`, GET 405, unauthenticated POST 401, unchanged queue and paused cron. These HTTP checks exit before queue RPCs and do not contact Google. Download source to a fresh local directory and compare all five application sources:

```sh
mkdir -p /tmp/medveda-403-r2-postdeploy/supabase
/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/@supabase/cli-linux-x64/bin/supabase \
  functions download sync-play-catalog --project-ref xbvenkfmesugrbjuufyw \
  --workdir /tmp/medveda-403-r2-postdeploy --use-api
python3 - <<'PY'
import hashlib, json
from pathlib import Path
m = json.loads(Path('docs/audit/evidence/play-403-release-20261019-r2/manifest.json').read_text())
for name, expected in m['files']['candidate'].items():
    if name.endswith('.ts'):
        assert hashlib.sha256((Path('/tmp/medveda-403-r2-postdeploy') / name).read_bytes()).hexdigest() == expected, name
print('Deployed source matches r2')
PY
```

**Production write 3: exactly one ₹1 admin requeue**, authenticated using the previously verified existing session:

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py retry-one \
  --expected-version "$MEDVEDA_DIAG_VERSION" --execute-approved-production-change
python3 docs/audit/evidence/play-403-single-job-20261019/control.py preflight
```

This invokes only `retry_play_price_sync({p_price:1.00})`, enforcing existing admin/eligibility checks. Require same ₹1 SKU/option, `pending`, attempts still 1, no lease, ₹2 unchanged, cron paused. Stop on false/ambiguous results; never repeat a write automatically.

**Production write 4: enqueue one worker request:**

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py invoke-one \
  --expected-version "$MEDVEDA_DIAG_VERSION" --execute-approved-production-change
```

The SQL rechecks sole-job isolation and uses the existing Vault cron secret inside the database without returning it. It calls `net.http_post` once; the HTTP request begins after commit. See [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net). Record the returned request ID. Its 120-second HTTP timeout is not proof of server-side cancellation. No automatic retry is permitted.

**Read-only monitoring:** set `MEDVEDA_HTTP_REQUEST_ID` to that integer and `MEDVEDA_DIAG_SINCE` to the UTC timestamp immediately before invocation (`YYYY-MM-DDTHH:MM:SSZ`):

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py monitor \
  --request-id "$MEDVEDA_HTTP_REQUEST_ID"
python3 docs/audit/evidence/play-403-single-job-20261019/control.py logs \
  --since "$MEDVEDA_DIAG_SINCE"
```

Observe at approximately ten-second intervals for up to three minutes. Capture the exact operation, status, sanitized reason, local request UUID, structured details, lease/job, function version and UTC timestamp. Preserve the pg_net request ID separately. A generic `PERMISSION_DENIED`, unknown detail, truncated/missing log or malformed payload is missing evidence, not a proven cause. Database `safe_error` provides operation/status/reason/UUID if the structured log is unavailable. Never fetch/log raw bodies or arbitrary metadata to compensate.

## Expected changes and stop conditions

| Event | Expected ₹1 database effect |
|---|---|
| Admin requeue | `failed → pending`; clear old error; update due/update timestamps; append `queued`; attempts remain 1. |
| One worker claim | `pending → running`; attempts **1 → 2**; new three-minute lease; append `claimed`. |
| Catalog 403 or 408 | `running → failed`; lease cleared; sanitized error/backoff; append `failed`. |
| OAuth/other retryable failure | `running → pending`; lease cleared; sanitized error/backoff; append `retry`. **Cron stays paused, so no second attempt.** |
| Verified success | `running → ready`; clear lease/error; sync timestamp; verified India/INR BUY tier upsert and `verified`. |

₹2 must retain its SKU, failed state, attempt count and timestamps. No product price/active flag, order, payment settlement, purchase, entitlement, schema, permission, credential or unrelated cron is changed by the operator commands. The worker's existing catalog flow can make external product writes before a later failure. Unexpected SKU rotation requires stopping and preserving evidence.

Stop on baseline/source/version/auth drift, another runnable job, ₹2 changes, attempts above 2, unexpected rotation/data changes, secret-bearing output, false RPC, timeout/ambiguous outcome, missing required diagnostics or an outstanding lease after the window. Do not retry an uncertain write. Keep catalog cron paused in all outcomes; **no recurring job is enabled or resumed**.

## Immediate rollback after an unexpected condition

Before deployment, a failed precondition means stop without deploying. After deployment, stop the sequence and follow the reviewed raw-bundle rollback. Keep cron paused; an in-flight invocation may continue because rollback is not cancellation. If the deployment result is ambiguous, first read metadata to determine whether the new version exists.

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/rollback.py \
  --expected-version "$MEDVEDA_DIAG_VERSION" --execute-approved-production-change
python3 docs/audit/evidence/play-403-single-job-20261019/control.py metadata
python3 docs/audit/evidence/play-403-single-job-20261019/control.py monitor \
  --request-id "${MEDVEDA_HTTP_REQUEST_ID:-0}"
```

Rollback is a **production function write**: one `PATCH` uploads the checksum-verified saved ESZIP to the same function with `verify_jwt=false` and entrypoint `functions/sync-play-catalog/index.ts`. The API accepts binary ESZIP updates; [Management API schema](https://api.supabase.com/api/v1-json). This write procedure remains prepared, not production-tested. A rollback creates a new version; it does not restore version number 2 or undo Google/DB effects. Do not repeat an ambiguous rollback response automatically.

Read back ACTIVE status, unchanged authentication and restored source/error behavior. Keep cron paused. If authentication drift prevents a normal diagnostic command, rollback's independent metadata/version guard still permits restoring the archived authentication setting. Stop/report any rollback failure; do not improvise production changes.

After collecting evidence, recommend only the minimum evidenced correction. Any credential, API-enablement, permission or other production correction requires separate approval. No fix is claimed until a real authorized Google request succeeds and the relevant catalog stage is verified.
