# MedVeda Batch 1 — production migration execution preflight

**Verdict: NO-GO for production execution.** Safe technical preparation passes; recovery operations and complete recoverability are **BLOCKED**. Preparation approval is not execution approval.

Observed 12 November 2026 UTC, approximately 14:37–14:44. Production project: `xbvenkfmesugrbjuufyw`. No production migration, DDL/DML, function deployment, payment/refund, notification/test alert, secret change, backup creation/download/restore, or schedule change occurred. Production queries were metadata/aggregate SELECTs and read-only entitlement proofs. The backup and alert checks were Management API GETs; secret values/hashes were discarded, with only selected name-presence booleans retained.

## Exact candidate and dependencies

- Forward migration: `supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql`.
- SHA-256: **`310fbe7896829ba348ae928f31c81ddebfbbefad21aeb0824c257cbd2d6a700b`**.
- Byte-identical packaged copy: `supabase/releases/audit-batch1-20261112/sql/forward.sql`.
- The entire existing release manifest/checksum inventory passes. No reviewed migration or Edge candidate was edited during this preflight.
- All **76** production migration versions match the local pre-batch versions; newest is `20261111175746`. Batch version `20261112104610` is absent. Historical `20260801` name discrepancy remains unchanged: remote `razorpay_webhook_atomic_grant`, local `auth_verified_identities`. Do not rename/replay/repair that historical entry.
- All eight previously reviewed baseline RPC definitions/ACLs remain identical. The expanded local rebuild matches **11 current dependency RPCs** and **139 dependency-table column names/types**. Production snapshots retain 52 constraints, 42 indexes, eight policies and 16 triggers. Relevant financial indexes are valid/ready and constraints validated. Client roles cannot CREATE in public.

Required existing objects include orders/payments/purchases, wallet/referral/reservation tables, capture/event/compensation tables, and the retained legacy settlement. The migration calls `record_payment_capture`, `settle_razorpay_payment_legacy`, `reverse_payment`, `razorpay_entitlement_committed`, `content_is_published`, and `admin_mfa_required`; all were verified in the actual dependency snapshot and local rebuild. In particular, November recovery columns such as `blocks_entitlement` and the existing order snapshot/timestamp fields already exist; no predecessor migration is pending.

Outer SQL consists of **14 transaction/function-definition/ACL statements only**. It creates two service-only RPCs and replaces settlement/note authorization. DML text occurs inside stored function bodies and is not executed by installation. There is no top-level financial DML, destructive table/schema operation, backfill, price/snapshot change, job activation or external provider call. Runtime reversal routines intentionally revoke refunded purchases; this is not a financial-history rewrite during migration.

## Current production financial safety

Read-only snapshot:

| Aggregate | Observed |
| --- | --- |
| Orders / payments / purchases | 27 / 15 / 15 |
| Order states | 13 paid, 11 failed, 1 created, 2 cancelled |
| Paid Razorpay orders satisfying exact commitment | **13 / 13** |
| Wallet ledger rows / derived net amount | 0 / 0 |
| Successful purchases backed by refunded orders | 0 |
| Successful purchases backed by reversed/compensated captures | 0 |
| Capture rows | 1 granted; no unresolved capture |
| Provider inbox / compensation / unified jobs / Play jobs / external refunds | Empty |
| Unlinked reversal facts / overdue unified jobs / expired processing leases | 0 / 0 / 0 |
| Expired wallet reservations / discount reservations | 0 / 0 |
| UCB reports due / Play consumption due | 0 / 0 |

These are point-in-time invariants, not an assertion that old events cannot be missing from the provider. No customer/provider IDs, tokens or payloads were exported. The local preservation tests cover populated synthetic pending/parked facts and financial records even though these particular production queues are currently empty.

## Replay, rollback, concurrency and caller compatibility

Fresh complete `supabase/tests/run-all.sh`: **PASS**, all 77 migrations, payment/database/concurrency suites, Batch 1 candidate integration and the existing 25-check webhook harness.

Additional disposable PostgreSQL test: **19 checks PASS**, including:

- Full dependency RPC/ACL and column-type match to fresh production metadata.
- Forced error after all migration bodies rolls back definitions, ACLs and all financial/queue rows.
- Contended DDL with a 200 ms test lock timeout aborts without partial schema/data changes.
- Forward application and repeat application preserve populated financial, pending/parked inbox and queue fingerprints.
- Historical valid purchase remains readable.
- Exact deployed verifier v69 and webhook v51 work after migration: real current/previous HMAC code, JWT-free signed website callbacks, legacy recovery, duplicates, partial and full refunds. Provider GET transport is synthetic; PostgreSQL is real. Existing authentication/ownership behavior is preserved, including the known out-of-scope legacy recovery limitation.
- Migration coexists with an in-flight payment transaction.
- Four concurrent capture settlements produce one payment/purchase.
- Capture→refund and refund→capture interleavings deny paid PDF access and preserve correct wallet accounting.
- Four simultaneous full-refund calls restore wallet once.
- Compensation publication waits behind concurrent grant and cannot queue its refund.
- Local schema-only rollback restores original definitions/ACLs without undoing financial/queue rows; already reversed purchases remain revoked. Reapplying forward SQL preserves rows.
- Both new RPCs deny client-role execution and permit service_role.

The local rollback deliberately restores definitions containing known audit bugs. It proves transactional/structural reversibility only and is **not a safe routine production rollback recommendation**. Keep the forward authorization/reversal guards and durable facts; prefer an approved forward correction. Never restore financial data to undo refunds or erase migration history.

These tests use synthetic Auth/Storage stubs and provider transports; they are not a complete managed Supabase backup restoration or native/provider end-to-end acceptance. Initial local harness setup errors were corrected before the final successful run; no application/release source changed.

## Edge Function baseline

Every downloaded file is byte-identical to the reviewed baseline; metadata also matches:

| Function | Version | JWT gateway | Bundle SHA-256 |
| --- | --- | --- | --- |
| razorpay-webhook | 51 | false | `38b92030acc7ace0e8188b5dcbc0d9b6c0b3fc7bbf22b0a56e89a74cd5119252` |
| verify-payment | 69 | false | `ffe779d15b84698acc416aa90af0f33fbb7757952f2636d06bf6abc07e4effcb` |
| send-push-notification | 51 | false | `30b34655f50e47674ff32374596ba69e375e2e75d99658f8dd5ed3b2efa33ff1` |

The candidate verifier entrypoint remains unchanged, with identical payment helper copies in the two payment closures. SDK pinning and the immutable candidate archives are described in the reviewed release README. The deployed Play worker remains v3; the unified events/compensation/reporting worker is not deployed.

## Recovery queue inventory and monitoring requirements

The following covers production backend payment recovery, related durable cursors/holds and adjacent content retry queues found in current schema. Isolated non-Play test-lane records and device-local mobile queues are not production payment workers; this batch neither enables nor modifies them.

| Queue / durable obligation | Required observation and escalation signals | Current evidence |
| --- | --- | --- |
| `provider_events` | Pending/parked counts and oldest receipt; unknown linkage/classification; attempts, due retries, expired leases; full refund/lost/open dispute holds. Preserve event/object IDs privately. | Empty; candidate webhook populates it, v51 does not supply the new recovery protocol |
| `payment_captures` | Captured/reversal_pending/compensation_pending ages; exact order/payment amount and linkage; terminal marker consistency with purchase/ledger. | One granted, zero unresolved |
| `payment_compensations` | Pending/processing/parked ages, next attempt, lease expiry; stable request ID and authoritative refund evidence before any action. Queue presence is not refund completion. | Empty; automatic processor absent |
| `payment_jobs` | Separate `events/reports/refunds/consume/reconcile/compensate`; oldest deadline, overdue work, attempts, parked and expired leases. Also monitor captures/inbox directly when jobs were never enqueued. | Empty; unified worker not deployed |
| `ucb_external_refunds` and order external reporting states | Reporting status, attempts, oldest refund/provider time and report deadline; authoritative full/partial amounts. Never confuse Google reporting with initiating a provider refund. | No queued refunds/reports |
| `play_payment_jobs` and paid order consumption/recheck states | Consume/reconcile backlog, oldest unchecked purchase, retries, leases, parked jobs and last successful checks. | Empty; consume/reconcile cron jobs inactive |
| `play_void_tokens`, `play_void_sweep_state`, `play_recovery_cursor` | Void facts are durable truth, not a deletable retry queue. Monitor sweep coverage/watermark, page completion, cursor age, leases and errors. | Zero void tokens; sweep/cursor last updated Oct 13/15; void cron inactive |
| `play_price_sync` / `play_price_sync_logs` | Failed/pending/processing age, attempts/leases, verified tier readiness and last successful synchronization. No blind retry of price changes. | **Two failed rows**, oldest Oct 27; max attempts 3; catalog cron inactive |
| `notes_choice_checkouts` and authorization/reporting obligations on orders | Unresolved reservation/create/attach states, stale authorization deadlines and ambiguous provider creation. | Empty; choice handler is not part of this deployment |
| Wallet/first-discount reservations and `order_review_flags` | Expired holds, old unpaid orders, unique discount ownership, unrecovered referral credit and manual review age. They are not authorization to grant or refund. | No expired wallet hold, discount reservation or review flag |
| `note_pdf_validation_jobs` and `note_upload_requests` | Pending/processing validation age, retries, expired lease, failed/quarantined publication. Content operations owner; no financial replay. | No pending validation; six attached requests |

Existing mechanisms:

- Supabase HTTP/function/Postgres/Auth/Storage logging is observable. Read-only last-24-hour source counts include 38 function-edge log entries and 512 Postgres entries; presence is not alert delivery or successful processing.
- Durable table statuses, leases/deadlines and queue metric views provide polling inputs. The prepared `monitor-readonly.sql` reads aggregate state only, with read-only transaction and timeout. No monitoring service was installed or enabled.
- Existing backend `alertUcb` is best-effort Sentry code. **`UCB_SENTRY_DSN` is absent**; no notification was sent to test it. The Batch 1 deployed-derived payment candidate uses console logging and does not include a new Sentry integration.
- `PLAY_PAYMENT_CRON_SECRET` and `PLAY_CATALOG_CRON_SECRET` names exist, but their four relevant schedules are inactive. `UCB_REPORT_CRON_SECRET` is absent and unified recovery worker is absent. Secret-name presence does not prove value validity or successful delivery.
- Active analytics/session purge and wallet-credit-release jobs have recent successful run metadata. They do not drain the recovery queues above.
- Mobile error reporting does not establish backend queue monitoring. No configured monitored alert destination, independent receiver, owner, or SLA is confirmed.

**BLOCKED:** Primary operator, backup operator, independent escalation contact, monitored destination, observation interval, alert thresholds, acknowledgement/escalation/resolution targets, and monitored delivery acceptance. Do not substitute empty current queues for these requirements.

## Operator responsibilities and escalation procedure — prepared, unassigned

1. **Primary recovery operator:** During the approved window and observation period, compare version/hash/ACL and queue baselines, watch HTTP/SQL failures, paid commitment and refunded-access invariants, and every queue's age/deadline. Keep a private incident journal of exact IDs, amounts, provider fact timestamps and idempotency references.
2. **Triage:** Verify provider truth read-only; distinguish unlinked capture, valid paid grant, full/partial refund, open/won/lost dispute, additional payment, reporting-only failure and stale lease. Preserve all facts. Do not clear blocks, regrant purchases, expire reservations manually, force jobs done or refund to reduce backlog counts.
3. **Backup operator:** Take over when the primary cannot acknowledge within the owner-approved target. Verify the same journal and latest read-only state before acting; avoid two independent replay attempts.
4. **Incident lead and finance/security approvers:** Receive escalation for any financial/access invariant failure, unknown external outcome, aged reversal/compensation, missed reporting deadline, parked job or unavailable operator. Approve each production-changing correction separately. A suspected regression stops further deployment steps; source rollback/forward correction and any checkout pause require explicit authorization.
5. **Completion:** Reconcile provider capture/refund/dispute facts to order/payment/purchase/ledger state, prove no duplicate side effect and archive exact deployment/recovery hashes and evidence. Closure requires a verified disposition, not HTTP 2xx or an empty job list.

Owner must assign values for detection/acknowledgement/escalation targets and the paid/refund/reporting deadline thresholds. No numerical SLA is assumed here. Until assignment and monitored delivery proof exist, escalation cannot be declared operational.

## Backup/PITR and restore evidence

Fresh backup inventory GET at **2026-11-12 14:37:20 UTC** reports `pitr_enabled=false`, `backups=[]`, `physical_backup_data={}`. No usable managed recovery point is verifiable through this inventory. This does not establish that no owner-held external backup exists; its existence, currency, completeness and accessibility are unconfirmed.

Latest identified documented production-copy trial is [23 October](MEDVEDA_PRODUCTION_BACKUP_RESTORE_READINESS_20261023.md): original backup checksum checks and a partial public-table restore passed (46 tables/645 rows). Complete restore failed on missing managed Auth `audit_log_entries.ip_address`; loading user IDs did not restore accounts/sessions/identities. It does not cover the present 76-migration schema or establish a current complete recovery point. Later synthetic restore/replay logs are useful software tests, not evidence of a complete production backup restore.

**BLOCKED:** Current backup identity/UTC cutoff/status/retention/checksums, full managed Auth/Storage compatibility, private object bytes/config/key recovery, accessible escrow, accepted RPO/RTO and a complete successful isolated restore/reconciliation.

Safe verification procedure, **prepared only; not executed**:

1. Name backup custodian, privileged restore operator and independent observer. Select a specific existing backup or authorize a new consistent read-only export separately. Approve sensitive data access, encryption, protected location, retention and destruction; do not place dumps, users, password/session material, object URLs or secrets in this repository.
2. Record source/version and per-component UTC cutoffs, immutable digests, row/sequence/ledger manifests and available recovery range. Prove decryptability/access without displaying credentials. Database metadata backup does not include Storage object bytes; retain a separately protected matching object/version/size/hash inventory and bytes. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).
3. Provision a disposable, production-compatible Supabase stack with matching PostgreSQL/extensions and complete managed Auth/Storage schemas. Block all egress to production, staging, Razorpay/Google, email, push and alert services; disable copied cron/worker ingress in isolation before restoring. Plain PostgreSQL stubs do not satisfy managed-service restoration.
4. Use the supported version-specific restore procedure after reviewing CLI/service help. Restore all required roles, schemas, data, sequences, Auth identities/sessions/MFA, Storage metadata and object bytes; fail on the first error. Do not omit failed Auth tables, substitute minimal IDs or bypass constraints to claim completion.
5. Compare every manifest/digest and financial invariant; verify constraints, indexes, ACL/RLS/triggers, owner/foreign/anonymous Notes authorization, object hashes and permitted Auth behavior with inert outbound transports. Exercise the exact batch on synthetic fixtures in the restored environment without replaying real financial operations.
6. Build a provider gap journal covering backup cutoff through recovery cutoff. A database restore does not undo external captures/refunds or reporting. Classify ambiguous/later facts with finance, propose corrections separately, and never blind-replay refunds, reports, consumption or webhook events.
7. Measure restoration plus reconciliation time and recoverable lag per component; obtain owner acceptance of RPO/RTO and residual loss. Keep actual production restore and ingress/worker resumption separately approval-gated.

## Exact proposed deployment order

All steps below are **pending operational gate closure and new explicit execution approval**.

1. Approve exact hash, change reference, operator/observer, bounded lock/statement timeouts, incident window, backup/restore evidence and monitoring handoff. Select the privileged migration runner that records exact version `20261112104610` atomically with the migration. Do not create/repair migration history separately or run a blanket push.
2. Refresh read-only production history, dependencies, function source/metadata and financial/queue observations immediately before execution. Fail closed on unreviewed drift; legitimate live financial changes require fresh invariant review, not hard-coded row counts.
3. Apply **only the exact forward migration**, once, as its transaction, through that approved runner. Proposed deployment limits are a **2-second lock timeout and 15-second statement timeout**; they require owner acceptance. Local tests prove bounded abort semantics, not production duration. Any timeout/error aborts the transaction and stops deployment.
4. Read-only verification: exact ledger version/hash, two service-only RPCs, replaced function definitions, preserved ACLs/schema and no migration-induced financial/queue DML. Test input/proof checks must remain non-mutating; do not invoke settlement/refund on real identifiers as a smoke test.
5. If separately approved for function deployment, deploy only the prepared **send-push-notification** archive.
6. Deploy only the prepared **razorpay-webhook** archive.
7. Deploy only the prepared **verify-payment** archive.
8. After each function, re-download/hash source and confirm gateway/authentication invariants; run only authorized harmless negative guards. Observe queue/financial metrics with the assigned operators. No provider transaction, refund, notification or secret/schedule change is included.

Migration-first and mixed-version compatibility pass the exact deployed handler tests. Migration-only deployment does **not** close deployed AUD-009/010/014; those require later approved function deployments. No other function, worker, schedule or pending migration is part of this order.

## Rollback and minimum owner actions

Read the reviewed [rollback plan](../../supabase/releases/audit-batch1-20261112/README.md). Bounded transactional abort is first choice during migration failure. After commit, keep the safety SQL and durable facts while preparing an approved forward correction; data restoration is not routine code rollback. Preserve the targeted sender rejection. Verifier baseline restore is structurally compatible; baseline webhook/sender restore reopens known audit findings and is not routine safe rollback.

Minimum owner checklist:

- [ ] **BLOCKED — operations:** Assign primary, backup and incident/finance/security decision owners; confirm monitored destination, access and handoff.
- [ ] **BLOCKED — monitoring:** Accept observation interval, thresholds and response/escalation targets; approve and demonstrate monitored delivery independently. Decide who owns the two failed catalog rows/inactive Play recovery and whether historical obligations require separate work. No activation is implied.
- [ ] **BLOCKED — recovery:** Supply a current complete recovery point and authorize the protected isolated restore verification; accept demonstrated RPO/RTO and provider-gap reconciliation. PITR is currently off; choose an evidenced alternative or separately approve a recovery-capability change.
- [ ] **BLOCKED — release acceptance:** Confirm exact candidate hosted/service acceptance evidence or explicitly define the remaining validation gate. Local tests do not certify managed Supabase cache/Auth/Storage/provider behavior.
- [ ] **BLOCKED — execution plan:** Name privileged operator/observer and exact migration runner/history handling; accept change window, proposed timeouts, forward-correction/rollback policy and archive hashes.
- [ ] **NOT GRANTED — execution approval:** Only after these gates close, explicitly authorize the exact migration. Function deployments, refunds, alerts, settings or secret changes require their own stated scope.

**NO-GO remains in force.** No production-changing action will run without explicit approval.

Evidence: `docs/audit/evidence/audit-batch1-preflight-20261112/`, especially `artifact-verification.json`, `production-schema.json`, `production-operations.json`, `production-queues.json`, `backup-metadata.json`, `alert-config-metadata.json`, `log-source-counts.json`, `local-preflight-results.json`, `replay-rollback-concurrency.log` and `database.log`.
