# MedVeda catalog 403: focused continuation and diagnostic release plan

Prepared 19 October 2026 UTC. **Review only: nothing in the deployment, reproduction or rollback sections has been executed.** This continues [the investigation](MEDVEDA_GOOGLE_PLAY_403_INVESTIGATION_20261019.md); it does not repeat the project audit.

**Latest focused review:** use [the controlled ₹1 execution sequence](#controlled-1-execution-sequence--prepared-not-authorized) below for the next approval. It adds a reviewed temporary cron pause, one admin requeue, one worker invocation and conditional resume. The original unpaused deployment discussion below does not authorize those changes.

## Current conclusion

The actual Google rejection cause remains unknown. No missing permission, disabled API or wrong credential has been established. The intended identity remains:

```text
client_email: medveda-play-billing@medveda-play-billing.iam.gserviceaccount.com
project_id:   medveda-play-billing
package:      in.medveda.app
```

Fresh authenticated reads confirm production `sync-play-catalog` is still ACTIVE v2 with `verify_jwt=false`. The downloaded production bundle has the same SHA-256 as the previous investigation: `a7e299ca54793bae4d83187599b2212849ac73ca34243d7fba2e86f735069a69`.

At **2026-10-19 03:30:41 UTC**, both ₹1 and ₹2 jobs remained failed with one attempt. Catalog cron job 8 remains active every minute. No job was invoked or retried by this investigation.

## Credential identity and API enablement: specific access limits

The user could not locate the original Google JSON. The unrelated `/home/ganeshp8545/.claude/.credentials.json` was not opened.

The existing Supabase login can read Edge secret **digests**, not runtime plaintext. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is still present, last updated `2026-10-17T15:58:27.792Z`. Its digest cannot establish `client_email` or `project_id`.

Additional authorized searches found:

- No Google credential variable in the relevant local `.env` files; `.env.example` contains configuration names only.
- No Google Cloud CLI configuration or Google credential environment variable.
- Vault names matching Google, service account, Play or billing contain only `PLAY_CATALOG_CRON_SECRET` and `PLAY_PAYMENT_CRON_SECRET`. No decrypted secret contents were selected.
- No credential/Google-related columns or tables in the checked `public`/`vault` schema metadata.

Thus **the configured Supabase account cannot yet be matched to the Play Console account**. The user's confirmation establishes the intended account's Console access, not which account is inside the runtime secret. No existing read-only identity endpoint exists in the current worker.

A secure way to finish this verification is either:

1. Locate an authorized copy of the exact JSON secret value, compare its byte digest with Supabase's digest entirely in memory, and output only the two identity fields and match booleans. A differently serialized JSON file can have a different digest despite the same semantic fields; a mismatch is not proof of a different account.
2. Separately approve and review a narrowly scoped runtime identity/read-only Google probe that emits only these fields and sanitized diagnostics. Such a probe would need a code deployment; it is **not included** in the existing diagnostic candidate prepared here. It must bypass all queue, rotation, creation, activation and finish/fail RPCs. Do not call the existing worker POST to discover its identity.

Neither path requires generating credentials, rotating keys or replacing Supabase secrets. Do not recover keys by dumping logs, environment variables or unrelated credential stores.

**API enablement is unverified.** No authorized Google Cloud session is available here. On an operator workstation with existing Cloud read access, these read-only commands establish project identity and enabled-service membership:

```sh
gcloud projects describe medveda-play-billing --format='json(projectId,projectNumber)'
gcloud services list --enabled --project=medveda-play-billing \
  --filter='config.name=androidpublisher.googleapis.com' \
  --format='json(config.name,state)'
```

A successful complete enabled-services query containing this service establishes enablement at that time. Authentication, permission or query errors do not establish disablement. Alternatively use `GET https://serviceusage.googleapis.com/v1/projects/{PROJECT_NUMBER}/services/androidpublisher.googleapis.com` and inspect `state`; the endpoint requires `serviceusage.services.get` and an appropriate Cloud OAuth scope. References: [gcloud services list](https://docs.cloud.google.com/sdk/gcloud/reference/services/list), [Service Usage GET](https://docs.cloud.google.com/service-usage/docs/reference/rest/v1/services/get). No enablement command is authorized or proposed for execution now.

## Review of the existing diagnostics

The candidate changes only three application source files: `_shared/googlePlay.ts`, `_shared/playCatalog.ts`, and `sync-play-catalog/index.ts`. The other two shared files match the downloaded production source. No endpoint path, package, product payload, price, activation rule or queue RPC was changed by the diagnostic diff.

Confirmed handling of Google errors:

- Only static operation labels, numeric status, an allowlisted reason and a local random UUID reach the Google error message. Raw provider messages, response bodies, URL paths, credentials, purchase tokens, OAuth descriptions and unknown reasons are discarded.
- Worker logs add price-job and lease identifiers and retry eligibility. The UUID is a **local correlation identifier**, not a Google-issued request ID.
- The worker persists the sanitized message through the existing failure RPC. A 403 remains terminal. The wrapper also explicitly classifies network/408 errors as retryable and labels OAuth failures; this differs from the old handling and is part of the reviewed candidate.
- `google.rpc.ErrorInfo` / `error.details` are currently discarded. A result of `PERMISSION_DENIED` alone may still be insufficient to identify API disablement or another restriction. Do not call that generic value a root cause.
- Operation/reason safety depends on the controlled source call sites; operation names are TypeScript literals supplied by application code, not request input.

Re-run validation: four Deno catalog/API tests passed; the catalog worker mock suite passed. Tests include sensitive sentinel messages, unknown reasons, OAuth errors, network errors and stage-specific failures, with intercepted fetch calls. The isolated candidate also passed `deno check` with the production-version import map. Artifact/archive hashes and the Python snippets below were verified locally. No real Google request occurred.

## Prepared release artifacts

The artifacts are in [`evidence/play-403-release-20261019`](evidence/play-403-release-20261019/manifest.json):

| Artifact | Purpose |
|---|---|
| `manifest.json` | Source and archive hashes, exact target, baseline version, authentication and CLI version |
| `production-metadata.json` | Downloaded baseline function identity/configuration |
| `readonly-evidence.json` | Focused Vault/schema/catalog/cron metadata snapshot |
| `diagnostics.patch` | Three-file diff against downloaded production source |
| `candidate-source.tar.gz` | Isolated diagnostic release source and minimal configuration |
| `rollback-source.tar.gz` | Downloaded production source and minimal configuration |
| `production-v2.eszip.gz` | Original downloadable production bundle, including bundled dependencies |

The candidate import map pins `npm:@supabase/supabase-js@2` to `npm:@supabase/supabase-js@2.118.0`, the version observed in the production bundle, to avoid upgrading that direct dependency while bundling. The raw bundle is retained for rollback so restoring code does not require resolving dependency ranges again. Archive and raw-bundle hashes are recorded in the manifest. No secret values are included.

Supabase CLI **2.120.0** is available locally. Its download/deploy flags were checked using local help and [the CLI reference](https://supabase.com/docs/reference/cli/supabase-functions-deploy). The source download was performed into `/tmp`, without overwriting the working tree.

## Deployment plan — requires explicit deployment approval

1. Review `diagnostics.patch`, the manifest and the limitations above. Approval for this candidate is limited to deploying **one function**, `sync-play-catalog`, in `xbvenkfmesugrbjuufyw`. It does not authorize credential changes, permission changes, cron edits, a job retry or a Google write attempt.
2. Refresh baseline metadata and source immediately beforehand. Stop if version, authentication, bundle/source hashes, secret timestamps or catalog state differ. Revalidate the rollback artifact against the current deployed version rather than overwriting the saved v2 backup.
3. Read the queue in a read-only transaction. Require both known jobs still failed, with no pending/running jobs or outstanding leases. The cron remains active: coordinate a window without new catalog-affecting changes. If the queue can run, deployment can expose queued work to the new code; stop for an explicitly approved execution/maintenance window. Do not silently pause cron.
4. Verify and extract the archives locally using the following **non-production** preparation. Run it from repository root:

```sh
python3 - <<'PY'
from pathlib import Path
import hashlib, json, tarfile
root = Path('docs/audit/evidence/play-403-release-20261019')
manifest = json.loads((root / 'manifest.json').read_text())
for name, expected in manifest['archive_sha256'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name
for kind in ('candidate', 'rollback'):
    dest = Path('/tmp/medveda-play-403-approved') / kind
    assert not dest.exists(), 'Choose a fresh extraction directory'
    dest.mkdir(parents=True)
    with tarfile.open(root / f'{kind}-source.tar.gz') as archive:
        archive.extractall(dest, filter='data')
    for name, expected in manifest['files'][kind].items():
        assert hashlib.sha256((dest / name).read_bytes()).hexdigest() == expected, name
print('Release and rollback sources verified locally')
PY
```

5. Type-check the extracted candidate, then execute only the following deployment **after explicit approval**. Use the existing secure Supabase login; do not put tokens or cron secrets in command arguments:

```sh
deno check \
  --import-map /tmp/medveda-play-403-approved/candidate/supabase/functions/import_map.json \
  /tmp/medveda-play-403-approved/candidate/supabase/functions/sync-play-catalog/index.ts

/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/@supabase/cli-linux-x64/bin/supabase \
  functions deploy sync-play-catalog \
  --project-ref xbvenkfmesugrbjuufyw \
  --workdir /tmp/medveda-play-403-approved/candidate \
  --import-map /tmp/medveda-play-403-approved/candidate/supabase/functions/import_map.json \
  --no-verify-jwt --use-api
```

6. Read metadata and downloaded source back: require ACTIVE status, a new version, `verify_jwt=false`, the reviewed operation labels/error sanitizer and unchanged cron-secret authorization. Compare the three source files, not just the presence of strings. An unauthenticated GET can safely check the handler's existing 405 response; it does not invoke queue RPCs and does not test Google.
7. Read queue state and runtime logs. Do not call the authorized worker POST as a health check. Existing failed rows must remain failed until separate retry approval. A cron response with `processed:0` is expected and establishes no Google API success.

## Rollback plan — also requires explicit authorization

Rollback triggers include failure to boot, changed authentication behavior, diagnostic leakage or an unexpected source mismatch. Stop reproduction and preserve sanitized evidence. If leak containment or cron changes are needed, obtain approval for that specific action; the source rollback below does not stop cron.

Use the saved **raw v2 ESZIP**, rather than a generic Git checkout or an all-functions deployment. The Management API schema supports binary ESZIP updates at `PATCH /v1/projects/{ref}/functions/{function_slug}` with `verify_jwt` and `entrypoint_path` query parameters. The bundle's entry module is `functions/sync-play-catalog/index.ts`. Reference: [Supabase Management API schema](https://api.supabase.com/api/v1-json). The write operation below is prepared, not production-tested or executed.

After rollback approval, run this from repository root. It checks the saved bundle hash, uses the existing login privately, prints only status, and makes exactly one write request:

```sh
python3 - <<'PY'
from pathlib import Path
import gzip, hashlib, json, urllib.parse, urllib.request
root = Path('docs/audit/evidence/play-403-release-20261019')
manifest = json.loads((root / 'manifest.json').read_text())
bundle = gzip.decompress((root / 'production-v2.eszip.gz').read_bytes())
assert hashlib.sha256(bundle).hexdigest() == manifest['production_bundle_sha256']
token = (Path.home() / '.supabase/access-token').read_text().strip()
query = urllib.parse.urlencode({
    'verify_jwt': 'false',
    'entrypoint_path': 'functions/sync-play-catalog/index.ts',
})
url = ('https://api.supabase.com/v1/projects/xbvenkfmesugrbjuufyw/'
       'functions/sync-play-catalog?' + query)
req = urllib.request.Request(url, data=bundle, method='PATCH', headers={
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/vnd.denoland.eszip',
})
with urllib.request.urlopen(req, timeout=60) as response:
    print('Rollback HTTP status:', response.status)
PY
```

Read back ACTIVE status, `verify_jwt=false`, the restored source/error behavior and unchanged queue/cron configuration. A rollback creates a new deployment version; the version number will not revert to 2. Inspect source if the API reserializes the downloaded bundle. Do not automatically retry a failed rollback request: read the deployed version first to determine whether the request was applied.

The fallback source restore is the same single-function CLI deploy with `--workdir /tmp/medveda-play-403-approved/rollback --no-verify-jwt --use-api`, using no candidate import-map flag. This rebuilds dependencies and is not byte-identical restoration; review resolved dependencies before approving that fallback. A code rollback does not undo Google product changes or database transitions from separately approved catalog execution. Never delete tiers/products or reset jobs as part of source rollback.

## Evidence collection after an approved deployment

Deployment approval alone is insufficient to produce a new error for these terminal jobs. Do not retry ₹1 or ₹2 automatically. First finish runtime identity and Cloud enablement verification through an authorized secure route.

If a direct read-only GET with the same verified credential becomes possible, use the exact product GET in the investigation report. Record its outcome without running the catalog worker. A 404 is evidence that this read returned no product; it does not authorize creating one. A 200 is proof of that read's success only.

If the user separately approves one write-capable catalog reproduction, agree on one exact price/SKU, who invokes the existing admin retry action, and a monitoring window. Do not infer that a deployment approval authorizes this. Collect the next `play_catalog_failure` record and matching queue failure:

```text
UTC timestamp; project; deployed version; price/job; lease;
operation; HTTP status; allowlisted Google reason;
requestId (local correlation UUID); retryable flag
```

The collection query should select `timestamp,event_message` from the unified `logs` table, filter `source='function_logs'` and the static `play_catalog_failure` marker, and retain only the fields above. For a missing log, inspect the persisted sanitized `last_error`. Do not print raw request headers/bodies or complete provider responses. For `PERMISSION_DENIED`/`unclassified`, obtain an independently authenticated enablement result or separately review a bounded `ErrorInfo` sanitizer; the existing candidate cannot recover discarded structured details.

## Root-cause and correction gate

Recommend a production correction only after evidence identifies it:

| Confirmed evidence | Minimum correction to propose, subject to approval |
|---|---|
| Actual configured identity differs from intended identity | Correct only the credential binding after confirming the intended account; do not broadly add permissions or rotate unrelated keys. |
| Verified consumer project's Android Publisher service is disabled / explicit service-disabled error | Enable that service in the demonstrated consumer project. |
| Exact app/operation denial on the verified intended account, supported by grant evidence | Correct only the demonstrated grant/scope/account restriction. Active status alone and generic 403 are insufficient. |
| Specific endpoint/app eligibility, policy or quota error | Apply only the corresponding documented correction. |
| Generic 403 with no discriminating reason | Keep the cause open and request the missing structured evidence. |

No correction is currently justified by confirmed evidence. Do not claim the 403 is fixed until a **real, authorized Google request succeeds**. A successful read does not establish that creation/activation works; catalog readiness additionally requires an authorized active India BUY-option readback at the exact price. No such success is claimed here.

## Controlled ₹1 execution sequence — prepared, not authorized

### Verification completed for this approval review

- All three archive hashes, every archived file hash, the raw rollback-bundle hash, the exact `diagnostics.patch`, and current source parity **PASS**. The prepared release artifacts were not changed during this review.
- Parsed-source comparison, removing only diagnostic operation parameters/type imports and equivalent trailing `undefined` arguments, confirms identical worker `authorized`, `rpc`, `sync` and complete catalog-module behavior. CORS and the Supabase auth client are byte-identical. Purchase verification/payment settlement functions are not in this deployment; no payment function, database function, index or schema is deployed.
- All six live catalog RPC bodies match the reviewed migration, including lease checks, SKU rotation, price verification, attempt counting and tier upsert behavior.
- Error-path review and the added `play_diagnostic_sanitization_review_test.ts` confirm that raw JSON/HTML bodies, structured secret fields, OAuth descriptions, network-exception text, URL/purchase-token sentinels, OAuth-token sentinels and a generated private key do not appear in the sanitized error object/message/stack. Five Deno tests and the worker mock suite **PASS**. This finding applies to the reviewed diagnostic data flow; it is not a guarantee about every unrelated library failure or external logging system.
- **Behavior caveat:** the candidate is not strictly logging-only. HTTP 408 changes from terminal to retryable. OAuth 4xx failures change from the old generic retry path to terminal Google errors. Typical transport failures remain retryable; 403 catalog errors remain terminal. Approval must acknowledge these differences, or a separately reviewed source revision is needed. The original archives/checksums were preserved.
- Latest successful live reads at **03:41 UTC on 19 October** show v2, both jobs failed/attempts=1, no leases, no queued catalog HTTP request and no running catalog cron SQL. Both prepared read-only operator queries executed successfully. A protected eligibility-helper read was denied by the read-only database role; no permission change or impersonation was attempted. The authenticated admin retry RPC will enforce eligibility if later authorized.
- Google Cloud CLI/session/ADC and Google credential environment values remain absent. Supabase secret metadata still cannot reveal the configured account. Identity and API enablement remain **unverified**, not incorrectly configured by inference. No real Google verification request occurred.

The prepared operator commands are in [`evidence/play-403-single-job-20261019`](evidence/play-403-single-job-20261019/control.py). Their SQL is inspectable alongside the scripts. They use the existing Supabase login without printing it, never retry HTTP requests automatically, and require an explicit write guard for mutation modes. The guard is **not** a substitute for user approval. Mutation commands and rollback have not been production-tested or executed.

### Exact job and permitted scope

```text
Supabase project: xbvenkfmesugrbjuufyw
Function ID:      f0e3d974-a8e8-436c-9063-6943e4b36a08
Function slug:    sync-play-catalog
Price/job key:    1.00 INR
Candidate SKU:   notes_1_00_v_066f5677fba745d696d1504b7600f8f7
BUY option:      buy
Baseline state:  failed, attempts=1, no lease
Catalog cron:    jobid=8, play-catalog-sync, active=true, * * * * *
Excluded job:    2.00 INR; must remain failed, attempts=1, same SKU/timestamps
```

The worker accepts no price selector. Isolation therefore requires catalog cron paused, no existing/in-flight invocations, the ₹1 job as the sole runnable job, and a coordinated window with no Admin product/PDF/catalog changes or other manual worker invocations. If those conditions cannot be maintained, **do not perform the retry**. A one-job attempt can contain several Google HTTP requests and can create/activate a Google product if the current denial no longer occurs.

Future approval should expressly cover the temporary cron pause, single-function diagnostic deployment, one admin requeue of this SKU, one worker invocation, immediate source rollback on the listed triggers, and conditional restoration of the original cron state. Deployment-only approval does not authorize the retry sequence. No keys, secrets, permissions or product prices are changed by the operator commands; the worker can write its usual Google catalog and tier state during the approved attempt.

### Commands in order

Run from `/home/ganeshp8545/AyurPulse`. First verify/extract the frozen archives using the local preparation block earlier in this document. Refresh the source/bundle baseline; abort if it no longer matches v2 and the recorded rollback hash.

**Read-only:**

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py metadata
python3 docs/audit/evidence/play-403-single-job-20261019/control.py preflight
python3 docs/audit/evidence/play-403-single-job-20261019/control.py monitor --request-id 0
```

**Production write 1 — pause only catalog cron job 8**, after explicit approval:

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py pause \
  --expected-version 2 --execute-approved-production-change
```

Record `paused_at`. Allow **at least three minutes** for existing work to drain, observing with the read-only preflight command. Require zero queued HTTP requests, zero running cron SQL, no leases and both jobs still at their baseline. SQL scheduling success does not prove an asynchronous HTTP call has finished. Do not run another worker while waiting. The pause must remain in place throughout deployment and the one-job attempt.

**Production write 2 — deploy exactly the frozen candidate**, after source type-checking as shown earlier:

```sh
/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/@supabase/cli-linux-x64/bin/supabase \
  functions deploy sync-play-catalog \
  --project-ref xbvenkfmesugrbjuufyw \
  --workdir /tmp/medveda-play-403-approved/candidate \
  --import-map /tmp/medveda-play-403-approved/candidate/supabase/functions/import_map.json \
  --no-verify-jwt --use-api
```

**Read-only post-deployment verification:**

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py metadata > /tmp/medveda-403-deployment.json
MEDVEDA_DIAG_VERSION="$(python3 -c 'import json; print(int(json.load(open("/tmp/medveda-403-deployment.json"))["version"]))')"
python3 docs/audit/evidence/play-403-single-job-20261019/control.py preflight
curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}\n' \
  https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/sync-play-catalog
curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}\n' \
  --request POST --header 'Content-Type: application/json' --data '{}' \
  https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/sync-play-catalog
```

Require a new ACTIVE version, the same function ID, `verify_jwt=false`, GET 405, unauthenticated POST 401, unchanged jobs, and cron still paused. Those two HTTP checks cannot reach queue RPCs because method/auth checks precede them. Neither tests Google. Download the deployed source into a **fresh local directory** and compare the three changed files with the candidate hashes before proceeding:

```sh
mkdir -p /tmp/medveda-403-postdeploy/supabase
/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/@supabase/cli-linux-x64/bin/supabase \
  functions download sync-play-catalog --project-ref xbvenkfmesugrbjuufyw \
  --workdir /tmp/medveda-403-postdeploy --use-api
python3 - <<'PY'
import hashlib, json
from pathlib import Path
m = json.loads(Path('docs/audit/evidence/play-403-release-20261019/manifest.json').read_text())
for name in m['changed_sources']:
    assert hashlib.sha256((Path('/tmp/medveda-403-postdeploy') / name).read_bytes()).hexdigest() == m['files']['candidate'][name], name
print('Deployed diagnostic source matches the reviewed candidate')
PY
```

If runtime identity/Cloud verification is still unavailable, record that limitation. A separately approved controlled reproduction can collect the rejection; its result must not be attributed to the intended account until runtime identity is established. It must not trigger speculative permission changes.

**Production write 3 — requeue ₹1 once through its existing authenticated admin RPC:**

An existing valid Admin Panel user session is required. `MEDVEDA_ADMIN_JWT_FILE` must identify a privately held session-token file on the operator's workstation; the current investigation has no such session. Do not paste its contents, use a service-role override or impersonate an admin. The command checks the session with Auth and `am_i_admin`, then calls only `retry_play_price_sync({p_price:1.00})`. If an authorized session is unavailable, stop before requeueing.

```sh
# Set only this path, never the JWT value, in the operator environment:
# export MEDVEDA_ADMIN_JWT_FILE=/secure/operator/admin-session.jwt
python3 docs/audit/evidence/play-403-single-job-20261019/control.py retry-one \
  --expected-version "$MEDVEDA_DIAG_VERSION" --execute-approved-production-change
python3 docs/audit/evidence/play-403-single-job-20261019/control.py preflight
```

Require ₹1 `pending`, attempts still 1, same SKU/option, no lease; ₹2 unchanged; cron paused. A false/ambiguous RPC response stops the sequence. Never rerun the RPC automatically.

**Production write 4 — enqueue one worker HTTP request:**

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py invoke-one \
  --expected-version "$MEDVEDA_DIAG_VERSION" --execute-approved-production-change
```

The command checks the fixed job/cron baseline again, then uses existing `net.http_post` and the existing Vault cron secret inside the database. It returns only the asynchronous request ID; no secret/header value is selected into the response. The request starts after commit, as documented for [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net). The outgoing request timeout is 120 seconds; it is **not** proof of server-side cancellation if it expires. Do not run this command twice.

**Read-only monitoring:** set `MEDVEDA_HTTP_REQUEST_ID` to the returned integer and `MEDVEDA_DIAG_SINCE` to the UTC timestamp just before invocation, then run:

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py monitor \
  --request-id "$MEDVEDA_HTTP_REQUEST_ID"
python3 docs/audit/evidence/play-403-single-job-20261019/control.py logs \
  --since "$MEDVEDA_DIAG_SINCE"
```

Observe every 10 seconds for up to three minutes; each observation is read-only. Record the exact operation, HTTP status, allowlisted Google reason and local UUID from `safe_error`, along with the job/lease, function version, timestamps and pg_net request ID. The queue's `safe_error` is authoritative for all allowlisted reasons; the additional log display intentionally recognizes only a subset of reason labels. No raw provider body or complete log message is printed.

### Expected database changes and stop conditions

| Step/outcome | Expected changes |
|---|---|
| Admin requeue | Only ₹1: `failed → pending`; clear `last_error`; update `next_attempt_at/updated_at`; append one `queued/admin retry` event. Attempts stay 1. |
| Single claim | Only ₹1: `pending → running`; attempts **1 → 2**; new lease UUID and three-minute expiry; append `claimed`. |
| Google 403 | Only ₹1: `running → failed`; sanitized operation/status/reason/UUID stored; lease cleared; backoff timestamp updated; append `failed`. No further attempt. |
| Retryable failure | Only ₹1: `running → pending`; lease cleared; sanitized error/backoff and `retry` event. **Leave cron paused** so there is no second attempt. |
| Successful verification | Only ₹1: `running → ready`; lease/error cleared; sync timestamp; active verified INR/IN BUY tier upsert and `verified` event. Existing SKU-rotation logic can rotate a previously used incompatible SKU and deactivate historical tiers; stop/report if observed. |

Product price/active flags, orders, payment settlements, entitlements, purchases and ₹2 must not change because of these commands. Worker catalog operations may still create/update/activate the ₹1 Play product before a later-stage failure. Preserve that evidence; a source rollback cannot undo those external effects.

Stop immediately on: wrong source/version/auth response; another runnable job; any ₹2 change; attempts above 2; unexpected SKU rotation; false RPC; missing/ambiguous HTTP response; timeout; lease still running after the observation window; unexpected data mutation; sensitive log content; or generic diagnostics that do not discriminate the cause. A normal sanitized 403 is a diagnostic result, not itself a reason to roll back safe logging. `PERMISSION_DENIED` alone does not prove missing permissions.

### Immediate rollback and restoration

If the future approval includes rollback-on-trigger, run the following immediately for an unexpected diagnostic-function behavior. First ensure no new invocation is issued and keep catalog cron paused. An already running function may continue; deployment/rollback is not cancellation.

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/rollback.py \
  --expected-version "$MEDVEDA_DIAG_VERSION" --execute-approved-production-change
python3 docs/audit/evidence/play-403-single-job-20261019/control.py metadata
python3 docs/audit/evidence/play-403-single-job-20261019/control.py monitor \
  --request-id "$MEDVEDA_HTTP_REQUEST_ID"
```

This is a **production function write** restoring the checksum-verified raw v2 bundle, preserving `verify_jwt=false`. The rollback deployment gets a new version number. Read back restored source/authentication as described in the earlier rollback section. If rollback's HTTP result is ambiguous, inspect metadata before any further write. Do not reset attempt counters or repair/delete Google products as part of rollback.

When all work is terminal (`failed` or `ready`), no lease/in-flight request remains, ₹2 is unchanged, and the approved window is complete, restore the **original active=true** state with the verified current function version (diagnostic version if retained, or the actual rollback version). Set `MEDVEDA_CURRENT_VERSION` from a fresh metadata read:

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py resume \
  --expected-version "$MEDVEDA_CURRENT_VERSION" --execute-approved-production-change
python3 docs/audit/evidence/play-403-single-job-20261019/control.py preflight
```

Resume is a **production scheduling write**. Its guard refuses while any job is pending/running or has a lease, or an invocation remains queued/running. If the single attempt is retryable/pending, leave cron paused and report that state; obtain a separate decision rather than scheduling another attempt or silently marking it failed. A paused cron may need to remain paused after the observation window. No other cron is changed.

This full sequence is prepared for review only. **No pause, deploy, requeue, invocation, resume or rollback was executed.** No fix is claimed until a real authorized Google request succeeds and the relevant catalog stage is verified.
