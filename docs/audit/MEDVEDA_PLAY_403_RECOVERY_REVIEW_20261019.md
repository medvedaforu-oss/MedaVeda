# MedVeda Google Play 403: read-only recovery review

Verified **19 October 2026, 12:48:53 UTC**. This is a focused incident recovery review. **No production write, rollback retry, function invocation, job retry, cron change, authentication bypass, or credential creation occurred.** Reads used the existing authorized Management API credential; the expired Admin Panel JWT was not used or refreshed.

## Current authoritative production state

| Item | Readback |
|---|---|
| Project | `xbvenkfmesugrbjuufyw` |
| Function | `sync-play-catalog`, ID `f0e3d974-a8e8-436c-9063-6943e4b36a08` |
| Deployment | **ACTIVE v3**, `verify_jwt=false`; deployment timestamp still 05:15:00.163 UTC |
| Source | All five application TS sources and the dependency import map match the frozen r2 manifest |
| Current bundle SHA-256 | `25eeb7fc54b95113d93703376563d6d673f2bb4a3ce5f06655fbcd3265a1d23f`, identical in the initial and final reads of this review |
| Catalog cron | Job 8 `play-catalog-sync`, inactive, original every-minute schedule retained |
| ₹1 job | `notes_1_00_v_066f5677fba745d696d1504b7600f8f7`, `buy`, pending, attempts 1; no lease; last updated 05:15:54.547020 UTC |
| ₹2 job | `notes_2_00_v_d93112f242a94a9b83d5bb2c31ef11a3`, `buy`, failed, attempts 1; no lease; monitored fields/timestamps unchanged from the previous final snapshot |
| Outstanding work | 0 queued pg_net requests across the project; no running catalog cron SQL or active catalog SQL session; no job leases |
| Queue events since pause | Only the approved ₹1 `queued` event; no subsequent `claimed`, `failed`, `retry`, `rotated`, or `verified` event |
| Catalog cron history | Last start 05:11:00.019091 UTC, completed 05:11:00.039064 UTC; no later run |
| pg_net responses | Latest retained response is 05:11:00.039016 UTC; none after the pause |

Management API function metadata was read before and after final verification and was unchanged. The current bundle differs from the archived original-v2 bundle, and its downloaded source matches r2. **The original v2 rollback has not taken effect.** This conclusion comes from service readback, independently of the earlier command exit status.

## Recent relevant logs and outstanding-request limits

Explicit log window: **05:11:32–12:46:43 UTC**, with both start and end parameters supplied. `function_edge_logs` contains exactly the two previously recorded v3 authentication probes: GET 405 at 05:15:19.774 UTC and unauthenticated POST 401 at 05:15:22.299 UTC. Runtime events are the corresponding two boots and two shutdowns; both executions shut down by 05:16:34.761 UTC. No `play_catalog_failure` diagnostic event was recorded. No new endpoint probe was sent during this review.

There is no observed authorized invocation or worker execution since the pause. The queue and job/event history support this, but an empty pg_net queue alone cannot prove that no HTTP request is in flight: requests are removed upon execution. The configured response retention setting is six hours, so retained responses are not a complete historical audit. See [Supabase pg_net documentation](https://supabase.com/docs/guides/database/extensions/pg_net#analyzing-responses).

Two initial field-discovery log queries used unsupported metadata syntax and returned backend errors; corrected ClickHouse `log_attributes` queries produced the invocation/runtime evidence above. One redundant aggregate-count query timed out; the complete invocation list had already returned successfully. No failed query caused a production write. The old frozen collector supplies only a start timestamp; this review explicitly supplied both boundaries because the [current API schema](https://api.supabase.com/api/v1-json) documents a one-minute fallback when a complete range is absent. No frozen operator file was modified.

## Other scheduled and external callers

All seven `cron.job` entries were inspected without returning commands or secrets. Only paused job 8 references the catalog endpoint, cron-secret name, or header. Active jobs 1, 2, and 5 perform retention/wallet tasks; their inspected function bodies/helper references contain no HTTP, dynamic SQL, or catalog invocation. Other Play jobs 9–11 remain inactive. No stored function referencing the catalog endpoint/secret/header and no HTTP webhook trigger was found. The repository CI workflow contains build/test/scan jobs and no production catalog invoker.

These checks establish **no other identified project/repository scheduled caller**. They cannot establish that every external caller is absent. The owner's answer about external schedulers/integrations was **Unknown**. There is no complete inventory of holders of `PLAY_CATALOG_CRON_SECRET` or independently managed schedules.

The v3 `authorized()` implementation is byte-identical to the verified v2 guard. It requires a POST with the exact existing `x-play-catalog-cron-secret` value, with at least 32 characters, before any queue RPC. Ordinary callers without that secret fail before work. However, **any caller holding that secret can still invoke this publicly reachable endpoint while cron is paused**. The expired Admin Panel JWT does not revoke the independent cron secret. The endpoint has no pause flag tied to `cron.job.active`. No authentication bypass was tested or attempted.

## Is immediate rollback necessary?

**No immediate rollback is justified by the present evidence.** The observed deployment is the reviewed r2 source, its original authentication guard and retry policy are preserved, and it has no autonomous queue-processing timer. Diagnostics execute only when an authorized request reaches the handler. The frozen validation record confirms 20 production-v2 retry-parity cases; it was hash-verified rather than rerunning a full audit.

It is reasonable to retain r2 v3 temporarily in this observed idle state while job 8 stays paused and manual invocation/product/PDF-change restrictions remain in force. This is a conditional containment assessment, **not a guarantee that the endpoint is disabled**. Full external-caller assurance is incomplete. Returning to v2 would retain the same endpoint authentication and ability to consume the pending ₹1 job, so rollback does not close that uncertainty or provide a kill switch. It adds another deployment write without a demonstrated containment benefit here.

## What the previous network failure proves

The preserved rollback stderr is only `Rollback stopped: URLError`; exit code 1 was recorded at 05:25:15.693797 UTC. The saved procedure first performs a metadata GET, then constructs and submits one ESZIP PATCH. Both network operations share the same generic exception handler. No underlying error reason/errno, traceback, phase marker, upload-start record, request ID, or server acknowledgement was retained.

Consequently, **the failure's exact transport cause and phase cannot be determined**. A `URLError` is consistent with a transport/proxy/DNS/TLS connection failure, but none is established. The GET may have failed before any upload; alternatively the PATCH may have been attempted and the reply lost or the request rejected. The request **may have reached** the deployment service. Current readback proves it did not produce the intended restored deployment; it does not prove that no PATCH bytes ever reached the service. Project runtime logs do not provide a Management API upload receipt. The published Management API schema exposes function readback but no relevant per-upload submission history, and no provider-side request trace was available here.

The rollback uses the existing management credential, not the expired Admin Panel JWT; admin-session expiry therefore does not explain the recorded rollback transport exception. Current successful management reads establish connectivity now, not the cause of the earlier failure. **The failed rollback write was not repeated.**

## Minimum recovery plan and single recommended next action

**Recommended next action: confirm the external caller and cron-secret custody inventory, read-only, while retaining the verified paused v3 state.** Identify all systems/operators with the existing secret and confirm that no independent scheduler or manual caller will run. This review found no need to change production first. Keep job 8 paused and the ₹1/₹2 states intact. Google 403 diagnosis remains deferred until this containment gap is resolved and a separately approved execution window exists.

No new admin session is needed for these management reads. Any future Admin Panel operation needs a genuine fresh authorized session; no session is created or impersonated here. Any production modification, including another rollback attempt, requires new explicit approval. No pending job should be retried or consumed as part of recovery verification.

### Prepared rollback commands — only if separately approved and justified

These commands are documented only; **none of the following writes were executed in this review**. The existing rollback entry point remains the reviewed procedure. Use a coordinated window with no product/PDF edits, deployments, or manual callers. A new source/version/auth/queue/lease/request drift requires stopping and refreshing the plan.

From `/home/ganeshp8545/AyurPulse`, establish a fresh source directory, download read-only, and validate the current candidate plus the preserved rollback artifacts:

```sh
mkdir -p /tmp/medveda-recovery-pre-rollback/supabase
/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/@supabase/cli-linux-x64/bin/supabase functions download sync-play-catalog --project-ref xbvenkfmesugrbjuufyw --workdir /tmp/medveda-recovery-pre-rollback --use-api
python3 docs/audit/evidence/play-403-recovery-readonly-20261019/verify_recovery.py --mode candidate --source-dir /tmp/medveda-recovery-pre-rollback --output /tmp/medveda-recovery-pre-rollback-check.json
```

Use fresh, unused local directory/output paths; stop if any command fails. The verifier requires ACTIVE v3, same function ID and authentication, six matching r2 application/dependency-map files, unchanged pending ₹1/failed ₹2 states and timestamps, no leases/queued requests/running catalog SQL, and verified archive/operator hashes. It reads function metadata again at the end to detect deployment drift.

**Only after a new explicit approval**, the sole rollback write would be:

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/rollback.py --expected-version 3 --execute-approved-production-change
```

This uploads the saved raw bundle once to the same function. Expected original raw ESZIP SHA-256: `a7e299ca54793bae4d83187599b2212849ac73ca34243d7fba2e86f735069a69`; compressed artifact SHA-256: `6edc0dd5527034f703c5d0288dbd86014d7d4ef8975dd5a5a15a8fc3f9b93a89`. The procedure preserves `verify_jwt=false` and targets `functions/sync-play-catalog/index.ts`. It remains unproven as a successful production restoration. It does not resume cron or undo queue/catalog effects. Do not repeat it on an error, timeout, or ambiguous result.

After that one approved write, even if its result is ambiguous, perform only readback:

```sh
python3 docs/audit/evidence/play-403-single-job-20261019/control.py metadata
python3 docs/audit/evidence/play-403-single-job-20261019/control.py preflight
python3 docs/audit/evidence/play-403-single-job-20261019/control.py monitor --request-id 0
mkdir -p /tmp/medveda-recovery-post-rollback/supabase
/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/@supabase/cli-linux-x64/bin/supabase functions download sync-play-catalog --project-ref xbvenkfmesugrbjuufyw --workdir /tmp/medveda-recovery-post-rollback --use-api
python3 docs/audit/evidence/play-403-recovery-readonly-20261019/verify_recovery.py --mode rollback --source-dir /tmp/medveda-recovery-post-rollback --output /tmp/medveda-recovery-post-rollback-check.json
```

Require a new ACTIVE version greater than 3, the same function ID/authentication, all five original-v2 application sources and the original raw bundle hash, unchanged jobs/timestamps, no leases or queued/running work, and cron still paused. A rollback creates a new version carrying original-v2 code; it does not restore version number 2. A verification mismatch means stop/report, with no automatic second write. This verification does not call the function endpoint or contact Google.

No rollback is currently recommended. The commands are a reviewable contingency, not authorization or an action to execute next. The Google API 403 operation and reason remain unknown; no credential, permission, API-enablement, pricing, or payment correction is proposed.

[Read-only verification evidence and summary](evidence/play-403-recovery-readonly-20261019/recovery-summary.json).
