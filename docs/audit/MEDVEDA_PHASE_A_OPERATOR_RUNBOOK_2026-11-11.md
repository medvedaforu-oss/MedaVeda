# MedVeda Phase A operator runbook — 2026-11-11

**BLOCKED. Prepared for review; production execution is NOT AUTHORIZED.** This document grants no approval. Resolve the final safety report's recovery and operator-approval blockers first. Do not proceed to Phase B. All times are UTC.

Repository root: `/home/ganeshp8545/AyurPulse`. Sole production project: **`xbvenkfmesugrbjuufyw`**, name **MedVeda**, region **ap-northeast-2**. Database observed PostgreSQL 17.6. No staging access is permitted.

1. **Obtain approvals and demonstrate recovery.** The owner must sign a change reference identifying the three hashes below, the derived operator SQL hash, named privileged operator and independent read-only observer, accepted 2-second lock/15-second statement limits, maintenance window, incident contact and abort policy. Separately obtain the current backup identifier/time/status, retention and achievable RPO/RTO, PITR capability/range or an explicitly approved demonstrated alternative, and a successful compatible restore rehearsal covering application tables, managed Auth and Storage metadata. Preserve Notes object bytes and external project/Auth/secret/configuration recovery references separately. Use a compatible isolated LOCAL restore environment; never staging. Backup creation or restoration is a separate authorization, absent here. Do not restore over production as a drill. The October 23 application-only restore is insufficient: complete restore failed on `auth.audit_log_entries.ip_address`. Current backup-list GET returned `backups=[]`, `pitr_enabled=false`, `physical_backup_data={}`. Resolve that evidence gap, rather than assuming a backup exists.

2. **Coordinate the window.** Keep checkout/Buy Now disabled. Prevent concurrent schema deployment and unreviewed financial maintenance. Inventory current writers and their isolation. Settlement/dispute/reversal acquire the wallet/user advisory lock before order rows; new keyed purchase successes must use READ COMMITTED. Direct/bulk privileged updates may acquire rows before the ownership advisory lock and deadlock; no bypass/retry automation is approved. A2 deliberately makes stale privileged failure writes raise 23514. Approve the operational effect on currently deployed error handlers; SQL-only Phase A does not deliver their later code fixes. Existing `release-wallet-credits` is active; Play consume/reconcile/void/catalog jobs are inactive. Do not change any job automatically. If writer coordination requires a schedule or operational change, obtain its separate approval before the window. Do not use a financial worker as a health check.

3. **Verify production identity independently.** Using Management API GET `/v1/projects/xbvenkfmesugrbjuufyw`, require the exact ID/name/region above and healthy status. Review the privately configured database service connection: a direct project host `db.xbvenkfmesugrbjuufyw.supabase.co`, or independently verified production session-pooler mapping with the correct project-qualified user. Enforce TLS identity verification and use a direct/session connection, never transaction pooling. A database called `postgres` alone does not identify a project. The selected execution role must be `postgres` and must be attributable to the named approved human/operator. The audit role `supabase_read_only_user` is not a migration operator. Never print connection secrets. No write connection was opened by this review.

4. **Verify exact artifacts, including reviewed copies.** Compare against the original deployment manifest and candidate-checksum file, then recompute SHA-256 immediately before execution. Abort on any difference. Use only these sources in this order:

| Order | Source in `supabase/migrations/` | SHA-256 |
| --- | --- | --- |
| A1 | `20261110100000_mv003_razorpay_entitlement_commitment.sql` | `82ae7f73d32c44b0fa627b3d1f33777ce7a2d41f0aef6c25826704ac8898dc0b` |
| A2 | `20261110120000_mv005_razorpay_order_transitions.sql` | `f266859f080e200cffad9ae17b833faa4ac9302d78ed4d641c6c750564984730` |
| A3 | `20261110130000_mv006_purchase_ownership_guard.sql` | `6c6e8704a424e1c0689dcbd3bd8c6ac5bf92ea48e76b2ff0c7cbdd6721609e4c` |

The matching reviewed copies are under `docs/audit/evidence/production-preflight-20261111/review-package/migrations/`. The six scoped candidate-checksum entries passed. Other entries in that broad candidate file are excluded from this deployment.

5. **Take a fresh read-only drift snapshot.** Use the inspected `inspect-production-readonly.py`, `inspect-safety-readonly.py`, `inspect-operational-readonly.py` and `inspect-ddl-hooks-readonly.py` from `docs/audit/evidence/phase-a-final-20261111/`, copied into a NEW restricted evidence directory so pinned evidence is not overwritten. Review those fixed-project scripts before use. They issue metadata GETs and `/database/query` requests with `read_only:true`, `BEGIN TRANSACTION READ ONLY`, timeout and ROLLBACK. No execution routes are allowed. Compare all arrays canonically by content, not response ordering. Compare with `production-preflight-20261111/production-readonly.json`, its `production-safety.json`, and the final review's additional operational/DDL-hook snapshots. Require exact migration versions (all 66, latest `20261104110000`), RPC definitions/owners/ACLs, columns/nullability, constraints, valid indexes/predicates, RLS/policies/grants, triggers/order/enablement, schema/default ACLs, event hooks, catalog prices, relevant function versions and bundle hashes. No Phase A function or trigger may already exist. The ledger schema must still be `(version text, statements text[], name text)` with its existing uniqueness. Any drift blocks this reviewed package pending new review, including legitimate financial aggregate changes; do not edit the expected baseline to continue.

6. **Retain preimages and confirm the expected no-change baseline.** In restricted operator evidence retain full schema/function/ACL definitions and the existing index exception predicate, not only hashes; redact identifiers in shared reports. Retain financial preservation evidence under the owner's approved policy without exporting customer records to this repository. Expected aggregates:

| Predicate | Expected |
| --- | ---: |
| Orders / payments / purchases | 27 / 15 / 15 |
| Orders paid / failed / cancelled / created | 13 / 11 / 2 / 1 |
| Successful payments / purchases | 15 / 15 |
| Success purchase attached to non-paid / failed order | 2 / 2 |
| Duplicate successful user/product groups | 1 |
| Paid order without success purchase / success owner mismatch | 0 / 0 |
| Successful purchases with NULL product | 0 |
| Active products at ₹1 / ₹2 / ₹5 | 4 / 7 / 2 |

Neither historical inconsistency is repaired by Phase A. Preserve every existing purchase and Notes access contract; retain the exceptional historical ownership index unchanged. No reconciliation prerequisite is satisfied merely by installing prevention guards.

7. **Review the explicit transaction artifact.** Proposed execution artifact: `docs/audit/evidence/phase-a-final-20261111/operator-phase-a-proposed.sql`. Its hash is in `operator-package-checksums.sha256`. It was generated offline by `prepare-operator-sql.py`, which asserts source hashes and byte equality to reviewed copies. The only source transformation removes each artifact's single outer `begin;` and `commit;`; every DDL body stays unchanged and ordered A1 → A2 → A3. One outer transaction wraps all three and their ledger INSERTs. Each ledger row stores the original complete source SQL, exact version and filename suffix. This wrapper itself requires explicit owner review and hash approval; it is not an extra application migration.

The wrapper requires role `postgres` and a nonempty `medveda.phase_a_owner_approval` setting. That setting is an interlock/reference, **not authentication or proof of approval**. It sets READ COMMITTED, `lock_timeout='2s'`, `statement_timeout='15s'`, `idle_in_transaction_session_timeout='15s'`. It locks the ledger SHARE ROW EXCLUSIVE, then orders and purchases ACCESS EXCLUSIVE in that fixed order, blocking readers as well as writers for the short transaction. It checks the exact 66-version baseline and absent target objects before DDL. Timeouts are per statement/lock attempt, not a whole-package duration limit. An observing operator must enforce the approved window; never raise limits or terminate other sessions automatically. This package makes no financial DML, table/index/constraint changes, or worker calls. Normal database catalog/WAL updates and PostgREST schema-reload notifications are expected.

8. **Only after new explicit production authorization, the named operator may execute the exact approved transaction once.** The following is a future command, **not executed by this review**. `medveda_phase_a_owner` must already be a privately configured and identity-verified libpq service, and `OWNER_CHANGE_REFERENCE` must be replaced with the actual signed approval reference (a single setting-safe identifier). Do not create a connection or run this command before steps 1–7 pass.

```sh
cd /home/ganeshp8545/AyurPulse
sha256sum -c docs/audit/evidence/phase-a-final-20261111/operator-package-checksums.sha256
PGSERVICE=medveda_phase_a_owner \
PGOPTIONS='-c medveda.phase_a_owner_approval=OWNER_CHANGE_REFERENCE' \
psql -X -v ON_ERROR_STOP=1 \
  -f docs/audit/evidence/phase-a-final-20261111/operator-phase-a-proposed.sql
```

Retain the complete restricted operator transcript, approval reference, start/end UTC times, operator identity and exact package hash. No glob, pending-migration discovery, `db push`, deployment helper or function deployment belongs in this command. Do not manually include original self-committing files inside an outer transaction; their COMMITs would defeat atomic ledger recording.

9. **Enforce migration ledger rules.** All three ledger rows commit only after their corresponding actual DDL bodies execute successfully, in the same outer transaction. Expected version set is exactly the pinned 66 versions UNION `20261110100000`, `20261110120000`, `20261110130000` (69 versions). Earlier November 8/9 files remain unapplied. Never infer completeness from the highest version. Never run history repair, pre-record versions, use `ON CONFLICT DO NOTHING` to hide an unexpected version, or mark a failed/uncertain execution applied. The wrapper refuses a second execution because the original baseline no longer matches. Do not rerun it to resolve uncertainty.

10. **Verify independently through read-only access after commit.** A different observer revalidates project identity and runs `independent-postchecks-readonly.sql`, plus the full drift snapshot from step 5 into new evidence files. These are metadata/aggregate SELECTs; do not invoke any new RPC or production financial function, even with dummy arguments. Compare the following three function definitions against the complete reviewed source and `expected-phase-a-metadata.json`; the MD5s below fingerprint PostgreSQL-normalized metadata, while source approval uses SHA-256.

| Function | Return / volatility | Definition MD5 |
| --- | --- | --- |
| `razorpay_entitlement_committed(text,text)` | boolean / STABLE | `4f63d2cbdb0a7981d24a1396ed19e574` |
| `guard_razorpay_order_transition()` | trigger / VOLATILE | `e6a7ff4b405381c6e996b941ed238cd8` |
| `guard_purchase_success_ownership()` | trigger / VOLATILE | `eb30b1cf1653f4329b9741705fb68bf9` |

All must be owner `postgres`, SECURITY DEFINER, `search_path=pg_catalog, public, pg_temp`, ACL `{postgres=X/postgres,service_role=X/postgres}` and no PUBLIC/anon/authenticated execute. Service-role trigger-function EXECUTE is inherited from observed postgres defaults; trigger attachment does not give clients direct financial write access. Require enabled origin-mode triggers:

```sql
CREATE TRIGGER orders_03_razorpay_transition
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION guard_razorpay_order_transition();
CREATE TRIGGER purchases_zz_success_ownership
BEFORE INSERT OR UPDATE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION guard_purchase_success_ownership();
```

Require the purchase guard to sort after existing BEFORE snapshot triggers. Existing triggers remain; A2 follows order identity/entitlement guards and precedes later order triggers. No new index, constraint, table, RLS policy, financial row change, price change or access-reader replacement is expected. Existing 126 public RPC definitions/ACLs remain unchanged except adding the three new functions (129 total if no unrelated changes). The 17 deployed Edge versions and seven sampled bundle hashes stay unchanged. Check existing `user_can_access_note`/AAL-reader definition hashes and signer v20 JWT=true; do not request a live signed PDF URL. PostgREST notifications may require observing cache propagation; inspect metadata/cache logs without invoking payment/proof routes. Keep the rollout stopped if cache visibility cannot be established without writes.

11. **Stop immediately on errors or unexpected evidence.** Stop for wrong identity, source drift, schema/ACL/hook/index drift, missing recovery evidence, unapproved operator/window, unexpected writer isolation, lock/statement timeout, deadlock, 40001, permission/DDL error, trigger replacement collision, unexpected ledger count, disconnect/unknown commit result, changed financial aggregates/prices/access readers, or any error spike affecting existing access. No automatic retry, blocker cancellation, timeout increase, repair, trigger disabling or financial probe is allowed.

12. **Failure response and fail-safe.** Before COMMIT, any error aborts the package; issue ROLLBACK on a surviving failed session or close it, then independently verify none of the three DDL/ledger changes committed. A connection loss at COMMIT is an unknown outcome: compare all three definitions/triggers and exact ledger rows from a new read-only snapshot before any further action. With this atomic wrapper, partial results are unexpected and require incident investigation. Do not repair history to make it look consistent. Preserve operator logs, lock/error evidence and immutable financial history.

After a successful commit, retain the additive proof and guards, keep checkout disabled, stop further rollout, and investigate forward. Do not restore an old false-success helper, disable a guard to force a grant, remove the exceptional index, or overwrite financial history from backup. A later DDL-only inverse requires separate owner approval, exact current dependencies/definition/ACL preconditions and review of removal consequences. Because all three objects were absent at the approved baseline, a potential inverse concerns only these three functions/two triggers; it must not touch existing settlement/readers/indexes/tables or delete ledger records as cosmetic rollback. No inverse SQL is authorized here. Whole-database recovery is an incident-owner decision using the demonstrated procedure and reconciliation of transactions/provider reversals after the restore point; it is not routine rollback for additive DDL.

13. **Prohibited throughout.** No staging; cloud writes during this review; production financial INSERT/UPDATE/DELETE or reconciliation; migration history repair or recording unexecuted migrations; blanket `supabase db push`; `scripts/ucb-deploy.sh`; unrelated pending migrations; `20261108100000_notes_choice_checkout.sql`, `20261109100000_billing_settlement_recovery.sql`, `20261109120000_isolated_nonplay_test.sql`; `supabase/maintenance/mv006_future_unique_ownership.sql`; Edge deployments (including Phase B); Razorpay/Google financial endpoints; verify/recovery/webhook/worker/signer probes; schedule/gate/payment activation; Buy Now; catalog/₹1/₹2/₹5 changes; website/admin/mobile deployment; historical purchase/access changes; backup creation/restore without separate authorization; automatic progression to another phase.

**Next owner action:** provide current recoverability evidence and a successful compatible isolated local restore procedure, nominate the migration operator/observer, and approve the exact hash-pinned package and bounded window. Then request a new final read-only drift review and explicitly authorize production execution separately. Until those steps complete, do not execute step 8.
