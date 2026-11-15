# Audit fix batch 1 — deployment and rollback plan

Status: **LOCAL CANDIDATE; DEPLOYMENT NOT AUTHORIZED**. Scope is AUD-009/010/012/014.

Only the three named Edge functions below are candidates. Do not deploy from the main workspace: it contains unrelated pending changes. Each candidate directory contains a complete function-specific source closure; the verifier entrypoint is byte-identical to deployed v69. Baseline directories are freshly downloaded rollback source, not reconstructed HEAD files.

## Compatibility and intended behavior

Production project: `xbvenkfmesugrbjuufyw`. Baselines: webhook v51, verifier v69, sender v51. Exact bundle hashes and JWT gateway values are in `deployed-inventory.json`. All three retain `verify_jwt=false` and their existing handler authentication/signature gates. Sender remains broadcast-only; any supplied `targetUserIds` property, including null or empty, returns 400 before feed/token writes.

The production RPC definitions and ACLs captured read-only are in `production-contracts.json`. The disposable runner compares all eight definitions and ACLs before the new migration, then applies all 77 migrations, checks repeatability, and exercises real handlers/PostgreSQL. Existing payment/capture/event/compensation tables and unique keys are reused. New service-only RPCs are `reverse_refunded_capture(text)` and `queue_capture_compensation(text)`; the existing settlement and note-access functions are replaced with narrow guards. No historical financial rows are rewritten.

The original downloaded source specifies Supabase JS `@2`. Candidates pin the already locally tested `2.118.0` and include its frozen Deno lock. This is the only dependency-source change; remotely resolved historical SDK bytes are not recoverable from the source download. Exact candidates must be tested in an approved isolated environment before hosted rollout.

Captures/mismatch dispositions are recorded before acknowledgement. Unknown reversal outcomes remain retryable. A queue entry is a durable recovery obligation, **not evidence that a refund happened**. The deployed Play worker v3 lacks event/capture/compensation processing. This batch does not deploy a worker, activate schedules, or perform refunds; webhook retries plus a named operator provide recovery until a separately reviewed worker release. Open/parked facts may deliberately leave a customer pending rather than grant.

## Review and approval gates

1. Review this exact candidate, migration, report, tests and file hashes; resolve all material review findings. Record the deployment approval separately. Approval of this plan alone does not authorize a payment, refund, notification, settings change, historical repair, or unrelated deployment.
2. Immediately before deployment, repeat read-only version/hash and RPC/ACL/schema comparisons. If production differs from the captured baseline, stop and review the diff. Confirm a named operator owns aged provider inbox/capture/compensation items; otherwise postpone rollout.
3. Verify backup/PITR availability and capture current function source/metadata outside the temporary directory. Retain this release manifest and migration checksum.
4. In an independently approved disposable Supabase environment, apply this migration only and deploy these exact function closures; run callback/retry/dispute/refund/notification rejection acceptance with synthetic/test fixtures. Do not exercise production transactions or send push as part of deployment verification.

## Deployment sequence — execute only after approval

1. Apply **only** `supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql` as a single transaction. Do not run a blanket migration push or replay historical migrations. Record the migration version and exact SQL hash through the normal approved migration system.
2. Read-only checks: service_role alone can execute the two new RPCs; the eight existing RPC ACLs are preserved; note-access and settlement definitions contain the new guards; no financial-row DML occurred during migration. Invalid note/user input must continue to return false.
3. Stage each `candidate/<slug>/functions` closure separately into a clean temporary Supabase project layout, alongside this release's `deno.json` and `deno.lock`. Configure only that slug with `verify_jwt=false`, matching its deployed gateway state. Check the full source manifest. Never include a sibling function from the dirty workspace.
4. Deploy `send-push-notification` first, then `razorpay-webhook`, then `verify-payment`, using the normal approved deployment tool. The same payment helper is present in both payment closures; the migration is backward compatible while those two functions are mixed-version.
5. Download each newly deployed bundle read-only. Compare all source files with the candidate manifest and record returned versions/hashes. Confirm unchanged gateway settings. Verify method/empty-body/forged-signature guards only; no production event replay, real payment/refund, signed paid URL, or notification send.
6. Read-only aggregate monitoring: HTTP 5xx rate; oldest pending/parked provider event; captured/reversal_pending ages; compensation count/age; paid/refunded orders versus successful purchases; refunds/chargebacks versus note authorization. Existing inconsistent refunded purchases are denied by the new signing guard; accounting repair requires separate approval.
7. The operator correlates unresolved records with provider-authoritative evidence, classifies ambiguous identities, and proposes a separately approved repair/refund. Never blind-replay compensation jobs or infer a capture/refund from client UI. Do not call queued work “automatically recovered.”

## Rollback / incident response

- Trigger rollback review for unexpected valid-callback failures, a new SQL error/deadlock trend, unauthorized feed insertion, unexpected purchase revocation, or inconsistent capture/compensation state. Record exact IDs privately in the approved incident system; retain durable provider/capture/queue facts.
- Keep the forward SQL safety guards by default. Existing deployed v69/v51 callers remain compatible with them. Roll back the verifier source to its exact baseline closure if necessary; the verifier entrypoint is unchanged, and old helper behavior remains a known limitation.
- Keep the sender's targeting rejection. Restoring its unguarded v51 baseline reopens AUD-014 and is not an acceptable routine rollback. Its isolated candidate can remain deployed while payment rollback is investigated.
- Prefer a reviewed corrective webhook bundle over reverting to its unsafe baseline. A last-resort baseline webhook restore reopens AUD-009/010, so requires an explicit incident decision and active manual capture/reversal reconciliation; it is not represented as safe closure. Obtain separate approval if temporary checkout suspension/settings changes are necessary.
- Do not drop recovery tables/RPCs, delete inbox/capture/compensation rows, undo wallet ledger entries, regrant refunded purchases, or roll back data from a snapshot. Do not revert the note-access guard merely to restore paid UI success.
- If the new SQL itself is implicated, inspect locks/errors and prepare a forward correction in an isolated database. Restoring the old settlement/note-access definitions would reopen AUD-012; any such emergency action needs explicit approval and compensating authorization controls.
- After rollback, re-download and hash exact source, repeat read-only ACL/authorization checks, monitor backlog, and reconcile all events received during the deployment window. No historical refund or ledger repair is automatic.

## Known limits retained outside this batch

AUD-011 unsigned legacy recovery, AUD-015 sender MFA policy and AUD-016 ticket accounting remain unchanged in the deployed-derived candidates. Other audit findings remain open. Existing signed URLs can remain valid for 120 seconds; previously obtained/copied/offline bytes cannot be recalled by this backend change, and the app's existing offline license may last up to seven days. New paid signing requests are denied after a full refund. Physical-device and genuine provider acceptance remain unexecuted.
