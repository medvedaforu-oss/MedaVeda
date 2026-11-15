# Production recovery readiness — BLOCKED

Date: 2026-11-11 UTC. P0 only. Local synthetic PostgreSQL/provider evidence; no production/staging connection, deployment, financial transaction, credential change, worker/schedule activation, Android build upload or payment activation. Existing approved artifacts and financial history were preserved. **Local verification is not production protection or acceptance.**


No complete current production recovery point is demonstrated. Prior Phase A evidence reported `pitr_enabled=false`, empty managed backups and empty physical backup metadata. Those findings have not been independently resolved; current cloud settings/inventory are UNKNOWN because no production connection occurred.

Local metadata-only inventory found `medveda-secure-backups/2026-10-23/`: roles.sql (358 bytes), schema.sql (299303), data.sql (252122), SHA256SUMS.txt (228). No dump contents were read, private data exported or restore attempted. This demonstrates file presence only. The retained October 23 restore report states the complete data restore failed because managed Auth `audit_log_entries.ip_address` was absent in the cached image; only 46 public COPY sections/645 rows and minimal Auth IDs were restored. Auth IDs are not working identities/sessions/config. The reports contain no demonstrated complete compatible recovery of current managed Auth and Storage objects.

The earlier BACKUP_GUIDE's suggestion that some Supabase warnings are normal is insufficient for acceptance. Do not ignore managed schema errors, replace Auth with IDs, drop managed constraints or create dummy Auth columns to make row counts pass. Current exact compatible schema/service versions and real identity/Storage behavior must be demonstrated in a separately approved isolated rehearsal.

## Required recovery components

| Component | Required evidence | Current status |
|---|---|---|
| Application DB/ledger | Consistent current snapshot, full schema/data/extensions/roles/functions/ACL/RLS/triggers/indexes/sequence state and exact migration statements | October 23 partial/old evidence only; current point BLOCKED |
| Managed Auth | Compatible managed schema/version and complete permitted account/identity/MFA/session data plus Auth service configuration, hooks, JWT/signing references, redirect/provider/SMTP settings | Prior full restore failed; current BLOCKED |
| Storage metadata | Buckets/object/version metadata, private flags, policy composition and schema compatibility | Prior SQL dump reportedly includes rows; successful complete restore unproven |
| Object bytes | Immutable object/version inventory and hashes at coordinated point; Notes/thumbnail bytes, encryption/key recovery | No demonstrated matching copy |
| Runtime/config | Exact function sources/dependencies/JWT/gates, project settings, external service endpoint configuration, alerts and scheduler state | Candidates pinned; full recovery configuration unproven |
| Secrets/keys | Secure vault recovery/access references for Auth/provider/cron/storage/SMTP/signing; no values in audit | Availability/restore capability UNKNOWN; no creation/rotation authorized |
| Provider accounting | Merchant order/capture/refund/dispute evidence and durable idempotency/retry state after snapshot cutoff | Requires owner/provider reconciliation; DB restore cannot rewind provider money |

## Owner-approved RPO/RTO contract

Proposed approval targets, **not accepted guarantees**: before any payment delivery, require a consistent recovery point immediately before the window and a demonstrated financial-state RPO target of at most 5 minutes during later paid operation, backed by independently recoverable provider facts. Any alternative requires explicit owner acceptance of the measured loss/reconciliation window. Target critical Auth + application + private Notes recovery RTO at most 4 hours, including provider reconciliation and access verification before resume. Record measured times, snapshot/byte cutoffs, loss window, exclusions, capacity and owner acceptance; never claim these objectives are achieved from a synthetic restore.

## Operator-ready isolated rehearsal checklist

1. Obtain separate explicit authorization for the named existing backup copy and the isolated target. Backup creation, settings changes, new exports and restore operations are not authorized here. Assign owner/operator/observer and secure evidence retention.
2. Pin backup identity/time/consistency boundaries, file sizes/checksums/signatures, encryption and key-access references. Check headers/restore catalogs in a sandbox without executing unreviewed dump hooks; verify provenance and that paths/commands cannot reach hosted/staging endpoints. Record omissions.
3. Provision an approved disposable compatible Supabase stack with the matching managed PostgreSQL/Auth/Storage schema and extension versions. Block outbound provider/email/push/webhook traffic; keep all workers/crons off, use isolated endpoints, no production secrets. Validate compatibility before data import.
4. Restore permitted roles/extensions and schema in documented platform-supported order, then managed Auth identities and application data with dependencies respected. Preserve circular-FK procedure and validate every FK afterward; do not count NOT VALID constraints as verified.
5. Restore Storage metadata and matching object bytes; validate object hashes, versions, bucket privacy/policies and database-object joins. Reconcile all missing/unreferenced objects without deletion.
6. Restore exact runtime/function/config/JWT and secure secret references only within approved isolation. Auth password/JWT/MFA/reset and private Notes object-read tests need controlled accounts and inert external transports; do not send real mail/push or transact.
7. Check table counts and canonical hashes, financial references/conservation/snapshots, exact ledger and routines/ACL/RLS/triggers/index validity, sequences, historical access and cross-user denial. Fail the rehearsal on any unknown managed-schema error or missing component.
8. Compare provider facts since the recovery cutoff in a protected reconciliation ledger. Hold ingress; classify captures, pending callbacks, authorizations, reports, refunds/disputes and consumed Play tokens; retain original idempotency IDs. Do not blindly replay settlement or refund a second time. Lost local queue acknowledgements do not prove provider work was absent.
9. Measure restore/reconciliation/verification durations and actual recoverable cutoff. Owner/observer sign RPO/RTO and explicit remaining gaps. Destroy or securely retain the private isolated copy only under its approved retention procedure.
10. Before real disaster use, separately approve target identity, backup point, expected loss, provider reconciliation and staged Auth/Storage/application/worker resume. Preserve incident evidence. A local synthetic PostgreSQL build does not prove this managed recovery.

**Restore gate: BLOCKED.** Available files have no complete current compatible recovery evidence and no task-specific authorization to restore private production data. No settings, backups or private records were changed. Continue P0 prevention review while this owner gate remains open.
