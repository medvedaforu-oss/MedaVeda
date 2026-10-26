# MedVeda r2 diagnostic execution result — 19 October 2026 UTC

Execution stopped on an admin-session revalidation timeout before worker submission. The conditional rollback command also returned a network error. Final live readback confirms diagnostic **v3 remains ACTIVE**; the production v2 bundle was **not restored**. No failed or ambiguous write was repeated.

## Approved changes executed

1. Paused only catalog cron job 8, `play-catalog-sync`, at **05:11:32.242772 UTC**. Seventeen drain observations over **181.5 seconds** showed unchanged jobs, no leases, no queued catalog HTTP, and no running catalog cron SQL.
2. Deployed only the frozen r2 `sync-play-catalog` to project `xbvenkfmesugrbjuufyw`, advancing ACTIVE v2 to ACTIVE v3. Candidate archive SHA-256: `266ee71e6613721f69380eca2fb9c36266edec791f2550fa8b10050d739f188e`. All five application source hashes matched after download; `verify_jwt=false` and function identity were preserved. GET returned 405 and unauthenticated POST returned 401 before queue processing.
3. Revalidated the authorized admin session, then performed exactly one `retry_play_price_sync({p_price:1.00})`. RPC returned true. At **05:15:54.547020 UTC**, SKU `notes_1_00_v_066f5677fba745d696d1504b7600f8f7`, option `buy`, changed from failed to pending; attempts remained 1, no lease, previous error cleared, and one queued event was appended.

## Stop condition and rollback

The additional live admin-session check immediately before worker submission raised `TimeoutError`. The invocation wrapper stopped before its write-attempt marker, metadata/invocation preflight, or `net.http_post`. **Zero worker requests were submitted.** The validation check was not repeated and no Google catalog request was initiated by this diagnostic run.

The separately authorized rollback command was invoked once with `--expected-version 3`, using the reviewed checksum-verified original-v2 ESZIP procedure. It returned exit code 1 and sanitized error `Rollback stopped: URLError`. The script does not expose whether the network error occurred during metadata retrieval or upload; no successful upload was confirmed. No rollback retry was attempted. Subsequent live metadata still showed ACTIVE v3, proving restoration had not taken effect at readback.

## Final verified state

Read-only snapshots were captured at **05:25:46–05:25:50 UTC**:

| Item | Verified state |
|---|---|
| Function | `sync-play-catalog`, ACTIVE v3, `verify_jwt=false`, unchanged function ID |
| Catalog cron | Job 8 inactive; schedule unchanged; never resumed |
| ₹1 job | Same SKU and `buy` option; pending, attempts 1; no lease; last update 05:15:54.547020 UTC |
| ₹2 job | Same SKU and `buy` option; failed, attempts 1; no lease; timestamps and monitored fields unchanged |
| Outstanding work | 0 queued catalog HTTP; 0 running catalog cron SQL; no job leases |
| Verified price tiers | None in the monitored ₹1/₹2 tiers |
| Worker invocation count | 0 submitted; no new worker claim event |
| Rollback | Not restored; diagnostic v3 remains deployed |

No credentials, secrets, permissions, pricing, schema, unrelated payment logic, or other cron jobs were changed. No requeue, invocation, deployment, or rollback write was repeated. The ₹1 pending state was left intact because another queue write was outside the approved stop behavior.

## Diagnostic finding and next boundary

No new Google API error was obtained, so the exact failing Google operation and error reason remain unconfirmed. The older retained `Google Play API 403` does not identify either. No credential/API/permission cause is inferred and no speculative correction was made.

The session file was not copied or exposed. Its expiry is **05:27:11 UTC** on 19 October 2026; a fresh authorized session is required for any later admin operation once expired. Any further production step requires renewed instructions because this execution stopped and the user explicitly prohibited repeating failed or ambiguous writes. In particular, do not repeat rollback, invoke the pending job, or resume cron from this report.

Sanitized snapshots and the execution summary are in [the execution evidence directory](evidence/play-403-execution-20261019T0510/execution-summary.json). Frozen r2 artifacts and the reviewed operator files remain unchanged.
