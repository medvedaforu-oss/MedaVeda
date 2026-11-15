# Isolated test migration repeatability — 10 November 2026

Local migration verification: **PASS**, including the final uninterrupted expanded run.
Production deployment preflight: **FAIL / blocked**, for the remaining prerequisites
in H. Nothing deployed, enabled, built, or submitted. No production SQL executed.

This report supersedes the repeatability blocker and rerun prohibition in the
November 9 isolation handoff and November 10 default-OFF preflight. Earlier
reports remain historical.

## A. Exact failure and root cause

Reproduced the original installer twice on disposable localhost PostgreSQL 17,
with the existing migration chain through `20261104110000` and synthetic seed data:

```text
ERROR: 42P07: relation "nonplay_test_config" already exists
```

The first unconditional `CREATE TABLE public.nonplay_test_config` fails on replay.
The subsequent unconditional table/index/function/trigger/policy creation and
configuration/bucket inserts have the same replay problem. A transaction prevents
partially committed failures; it cannot make a completed installation repeatable.

## B. Exact files modified

Implementation and regression files:

- `supabase/migrations/20261109120000_isolated_nonplay_test.sql`
- `supabase/tests/run-nonplay-test-local.py`
- `supabase/tests/nonplay-test-repeatability.py` (added)
- `docs/audit/MEDVEDA_MIGRATION_REPEATABILITY_PREFLIGHT_2026-11-10.md` (added)

Added task-specific evidence under
`docs/audit/evidence/migration-repeatability-20261110/`, including the reproducible
read-only metadata and fail-closed handler probes. The final artifact manifest
enumerates those exact files and their SHA-256 values. Logs may be Git-ignored.
The old audits/evidence and unrelated working-tree changes are preserved.

No mobile/UI/navigation/checkout, live payment handler, pricing/discount/wallet/
referral/entitlement implementation, cron, or other migration was edited.
All thirteen other inputs in the earlier fourteen-file deployment manifest match
their prior SHA-256 values. The original installer DDL reconstructs byte-for-byte
to SHA-256 `314b7ad593123d7a8391e26132aa05bdeabc14d7461b73fc1e4be30fa62800d4`.

## C. SQL statements fixed

The ten `CREATE TABLE` statements, seven explicit `CREATE INDEX` statements, seven
`CREATE FUNCTION` statements, snapshot `CREATE TRIGGER`, restrictive storage
`CREATE POLICY`, config/bucket inserts, and isolated-object privilege setup now
execute only when the entire isolated namespace, bucket and policy are absent.
The installation statements themselves retain their original definitions.

A migration-specific transaction advisory lock serializes concurrent applications.
An existing installation is accepted only when its catalog contract exactly
matches the original successful installation, with its configuration present/OFF.
Successful replay performs no DDL, DML, `REVOKE`, or `GRANT`.

The contract fingerprints normalized catalog definitions: column types/defaults/
nullability/identity, validated constraints, indexes, RLS/forced RLS, ownership,
table/column/sequence/function privileges, function definitions and settings,
trigger definitions/enabled state, table policies/rules, sequence configuration,
and the private bucket/restrictive storage policy. Function overloads and extra
objects in the isolated namespace cause a mismatch. Caller search path is pinned
transaction-locally; sequence positions and operational records are excluded from
definition comparison and preserved without resetting them.

An incompatible or partial installation raises SQLSTATE `55000`, identifies the
conflicting object, and reports expected/observed definition-security digests.
There is no blind `IF NOT EXISTS`, broad exception handler, function replacement,
object repair, or production `DROP`/`CREATE` cycle. A compatible single table or
bucket alone is deliberately rejected: the original transactional installer cannot
normally leave a partial committed installation. Unexpected enablement or a
missing config row also raises a clear error without changing the gate.

The contract was generated and verified on PostgreSQL 17, matching production's
recorded major version. Different ownership, defaults, grants or catalog rendering
must be reviewed if encountered; incompatibility is never automatically repaired.

## D. First application

PASS in completed local runs against the clean observed-production baseline.
No pending November 8/9 Play billing migration is needed. Existing live data
fingerprints remain unchanged; all new gates start OFF. The complete regression
runner also applies the corrected migration to a fresh full-chain database.

## E. Second application

PASS in completed local runs: same database, original-installer compatibility,
populated synthetic records, and two concurrent initial applications. A replay
also succeeds with `default_transaction_read_only=on` and a different caller search
path. Schema, grants, catalog object identities, live/test rows, audit records,
permanent provider claims, revoked entitlement and sequence positions are preserved.

## F. Security and regression results

- Final uninterrupted expanded isolation verification: PASS, all 32 incompatible/
  partial object cases rejected without changing their pre-existing state; nine
  actual handler/PostgreSQL integration cases passed, zero failures.
- Added actual-role probe: PASS. RLS denies client reads/writes even after temporary
  grants; authenticated/anonymous RPC execution is denied; service-role access
  works and the database OFF gate remains enforced. Probe grants roll back.
- Existing isolation SQL: PASS. Forced RLS/service-only RPCs, restrictive Storage
  denial despite a permissive policy, immutable prices/order ownership, test/live
  financial separation, no wallet/referral use, deduplication, delayed capture,
  extra-capture/refund handling, reversal and real paid Notes denial.
- Recovery: PASS in completed runs. Injected failure before COMMIT rolls back the
  entire first installation; retry and replay succeed. Conflicts retain all data,
  grants and definitions. No teardown or provider-claim clearing is required.
- Complete `supabase/tests/run-all.sh`: **PASS**, serial rerun ended
  `ALL SUITES PASSED`, including SQL/payment/Play/wallet/referral/concurrency and
  webhook regressions. The first parallel attempt timed out in the unchanged
  `razorpay-retry-concurrency.py` lock-observation harness; its failed log is retained.
  Both interleavings and the entire runner pass serially; no harness was weakened.
- All five dedicated Edge entrypoint type checks: PASS.
- All 35 actual-handler OFF/missing/invalid configuration checks: PASS; zero Auth,
  database or provider calls across all five endpoints.
- Seventeen mobile payment/checkout/Notes/purchases/routing/release regression
  scripts: PASS; individual results are in `mobile-payment-results.json`.
- Python syntax and `git diff --check`: PASS when recorded.

SQL fixtures ran only on disposable localhost databases. Provider HTTP was mocked.
No real provider payment, APK/native build, device test or deployment is claimed.

## G. Updated production deployment preflight

**Local migration preflight: PASS. Production deployment preflight: FAIL / blocked.**
The original repeatability failure is reproduced and corrected; final local
repeatability, security and regression checks pass.

Production metadata was refreshed through Management API **GET** requests only.
The project is `xbvenkfmesugrbjuufyw`, MedVeda, `ACTIVE_HEALTHY`, `ap-northeast-2`.
All seventeen function versions/settings and credential-digest fingerprints match
the preceding audit; the five dedicated functions and all `NONPLAY_TEST_*` secrets
are absent. This establishes an absent server enable gate, not a freshly observed
database false row. Before/after identity, all seventeen function versions/settings
and credential-digest fingerprints match; both observations are retained.

The task explicitly forbids production SQL, including SELECTs. Therefore current
schema, migration ledger, database gate and financial row fingerprints were **not**
queried or recertified. Prior evidence (ledger through `20261104110000`, absent
isolated objects and unchanged financial fingerprints) remains historical. This
limitation prevents an unconditional production deployment PASS.

## H. Remaining deployment prerequisites

1. Owner review of the corrected migration and frozen deployment hashes.
2. A fresh owner-provided read-only schema/ledger/default-privilege and gate snapshot
   for compatibility/dependency review; current financial preservation evidence.
3. Explicit separate authorization for the exact migration and five dedicated
   functions; the two unrelated pending billing migrations remain excluded.
4. A validated pinned Supabase CLI and securely supplied operator connection.
   No CLI was installed or credentials changed here.
5. For a later separately authorized test activation: dedicated Test Mode keys and
   webhook, protected synthetic accounts/allowlists, synthetic catalog and fabricated
   PDFs, and physical-device acceptance. Both gates stay OFF during preparation.

Containment remains leaving the lane OFF and retaining its schema/audit records.
On conflict, stop and review; never repair owners/grants/functions/policies in place,
delete financial/entitlement data, clear claims, or revert migration history merely
to force a replay. Partial function deployment recovery remains governed by the
prior default-OFF preflight. None of those operations was performed.

## I. Single next action

Obtain an owner-generated read-only production
schema/ledger/default-privilege and gate snapshot for the final compatibility review.
Do not deploy or enable the lane on the strength of this local correction alone.
