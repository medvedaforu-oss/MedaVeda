# MedVeda Phase A final safety review — 2026-11-11

**Overall Phase A deployment readiness: BLOCKED. Nothing is AUTHORIZED TO DEPLOY.** All three unchanged migration artifacts are **TECHNICALLY REVIEWED** and pass isolated acceptance on the production-compatible baseline. Current backup/recovery readiness is not demonstrated, and the privileged operator, recovery/window approval and explicit production execution authorization are outstanding. Passing local tests does not approve deployment.

| Artifact | Final deployment status | Technical result |
| --- | --- | --- |
| A1 — MV003 commitment proof | **BLOCKED** | Hash integrity, baseline compatibility, service-only predicate and local acceptance PASS |
| A2 — MV005 order transition guard | **BLOCKED** | Hash integrity, trigger compatibility, terminal-state protection and local acceptance PASS |
| A3 — MV006 ownership guard | **BLOCKED** | Hash integrity, historical-preserving grant protection and local acceptance PASS |

These statuses apply to production execution readiness, not a discovered SQL defect. No artifact changes were needed. Phase A alone does not deliver the callback/recovery/creation-handler fixes or make payments safe to enable. Historical inconsistency repair and the future ownership index remain separate, excluded work.

Scope: `/home/ganeshp8545/AyurPulse`; only production project **`xbvenkfmesugrbjuufyw`**. Read the November 11 production deployment preflight, its deployment manifest/checksums, complete three SQL artifacts and MV003/MV005/MV006 fix reports, applicable production-read-only queries, baseline migrations, acceptance harnesses and October 23 backup/restore readiness report. Existing source changes were preserved. All timestamps below are UTC.

Artifact integrity:

| Order / exact source path | SHA-256 |
| --- | --- |
| A1 `supabase/migrations/20261110100000_mv003_razorpay_entitlement_commitment.sql` | `82ae7f73d32c44b0fa627b3d1f33777ce7a2d41f0aef6c25826704ac8898dc0b` |
| A2 `supabase/migrations/20261110120000_mv005_razorpay_order_transitions.sql` | `f266859f080e200cffad9ae17b833faa4ac9302d78ed4d641c6c750564984730` |
| A3 `supabase/migrations/20261110130000_mv006_purchase_ownership_guard.sql` | `6c6e8704a424e1c0689dcbd3bd8c6ac5bf92ea48e76b2ff0c7cbdd6721609e4c` |

All three source files equal their reviewed copies under `production-preflight-20261111/review-package/migrations/` byte for byte and match both the manifest and all six scoped candidate-checksum entries. No unexpected artifact drift. Evidence: [artifact-integrity.json](evidence/phase-a-final-20261111/artifact-integrity.json), [candidate-checksum-verification.json](evidence/phase-a-final-20261111/candidate-checksum-verification.json). Other candidate-checksum entries do not enter Phase A.

Production baseline compatibility:

Fresh schema/bundle snapshot: **2026-11-11 04:08:27 UTC**, compared with pinned **03:52:06 UTC**. Additional safety, operational/backup and DDL-hook reads were performed during this review; their evidence records individual observation times. Identity remains **MedVeda**, `xbvenkfmesugrbjuufyw`, **ACTIVE_HEALTHY**, **ap-northeast-2**, PostgreSQL **17.6**. All SQL inspection used the Management API with `read_only:true`, explicit READ ONLY transactions, bounded statements, SELECTs and ROLLBACK. The observed SQL role is **supabase_read_only_user**, transaction read-only **on**. No production write connection or financial function was invoked.

[baseline-diff.json](evidence/phase-a-final-20261111/baseline-diff.json) records **no drift in any pinned section**: exact 66 migration versions through `20261104110000`; all 126 public function definition hashes, ACLs/owners/configuration; inspected columns and nullability; constraints, indexes/predicates; RLS/policies/table grants; order/purchase trigger definitions; relevant table presence; active price distribution; inconsistency aggregates; cron state; all 17 Edge Function metadata entries; seven deployed bundle hashes. Arrays were compared by content independent of ordering. Additional current index-definition hashes, trigger enablement, schema/default privileges and event-hook definitions extend the evidence; those fields were not all captured in the earlier snapshot, so no historical equality is claimed for previously unrecorded fields. Any later drift requires blocking and re-review, even if legitimate.

Required orders/payments/purchases/captures/compensations/provider-event tables and referenced columns exist. Status/provider fields used by the guards are NOT NULL; purchases.product_id remains nullable for historical scope access. No November 8/9 choice/recovery column or RPC is required. The baseline's eight previously inspected settlement/creation/refund/dispute/Notes function definitions also matched the rebuilt local baseline in the acceptance runner. Existing indexes are valid/ready, including purchase-order uniqueness, provider references and the partial ownership index with its historical exception. No index is removed or rebuilt.

Production financial observations remain:

| Predicate | Value |
| --- | ---: |
| Orders / payments / purchases | 27 / 15 / 15 |
| Orders paid / failed / cancelled / created | 13 / 11 / 2 / 1 |
| Successful payments / purchases | 15 / 15 |
| Successful purchases attached to non-paid / failed orders | 2 / 2 |
| Duplicate successful user/product groups | 1 |
| Paid orders without success purchase / success owner mismatch | 0 / 0 |
| Successful NULL-product purchases | 0 |
| Active products at ₹1 / ₹2 / ₹5 | 4 / 7 / 2 |

These are invariants to preserve during a coordinated DDL-only window, not a request to improve historical numbers. No customer/payment identifiers are retained in this review's new evidence. Existing paid-purchase and Notes authorization readers are unchanged. `user_can_access_note` and its AAL variant retain service-only contracts; deployed `get-note-url` remains v20, JWT=true. Live signing/PDF retrieval was not probed. Access preservation is supported by unchanged production reader definitions and actual local Notes predicate/restoration tests, not a claim of live authenticated device acceptance.

Relevant deployed functions are unchanged: `create-order` v23 JWT=true; `verify-payment` v68 and `razorpay-webhook` v50 JWT=false; `get-note-url` v20 JWT=true; `create-play-order`, `verify-play-purchase`, `play-payment-worker` v3. The proof RPC and both new triggers are still absent. Deployed callback/webhook bundles still lack the new commitment call. This review does not certify those old bundles as complete fixes. The inactive Play consume/reconcile/void/catalog schedules remain inactive; existing active `release-wallet-credits` and retention jobs were only observed, not altered or invoked. Default isolation is READ COMMITTED; this does not prove the isolation of every externally managed writer.

Complete SQL/security/locking review:

| Artifact | Behavior and limits |
| --- | --- |
| A1 | Adds `razorpay_entitlement_committed(text,text)` boolean, SQL STABLE SECURITY DEFINER. Requires the exact paid Razorpay order, matching successful payment/purchase, owner/product/amount/provider identities and complete immutable entitlement snapshot. Missing historical capture markers are allowed; existing inconsistent/reversal captures, any compensation and unresolved pending/parked reversal facts deny proof. Applied reversal handling relies on durable purchase state, preserving legitimate partial refunds/disputes won. No settlement, capture backfill, access-reader replacement or historical repair. Snapshot proof does not promise access cannot change after a later refund. |
| A2 | Adds `guard_razorpay_order_transition()` and enabled BEFORE UPDATE OF status trigger `orders_03_razorpay_transition`. Rejects paid → unpaid, refunded → other states, and transitions to unpaid states when a visible capture exists, with 23514 and no privileged bypass. Same-status updates return unchanged; existing failed/success history remains. Order row locking protects against late failure after committed settlement. Capture-only insertion is not a universal cross-table serialization barrier; the trigger neither verifies a provider nor grants entitlement. |
| A3 | Adds VOLATILE SECURITY DEFINER `guard_purchase_success_ownership()` and BEFORE INSERT/UPDATE trigger `purchases_zz_success_ownership`, after current snapshot triggers. New keyed successes/restorations use the existing `wallet:<user>` transaction advisory lock and a fresh READ COMMITTED ownership check, including the historical index exception. Conflicts raise 23505 and abort the caller transaction; higher-isolation keyed grants fail closed with 40001. Existing successful metadata updates, non-success reversals and legacy NULL keys retain semantics. Same-order insert replay relies on the unchanged unique order index; ON CONFLICT updates still pass through the UPDATE guard. Existing historical duplicates remain grandfathered. |

All three functions fix `search_path=pg_catalog, public, pg_temp`, qualify application tables and use no dynamic SQL. PUBLIC/anon/authenticated EXECUTE is revoked. A1 explicitly grants service_role; the production postgres default function ACL also grants service_role to the trigger functions. Expected owner is postgres, matching existing relevant table/function ownership. Clients lack CREATE on public, limiting search-path object shadowing. Service-role direct financial writes and superusers disabling triggers remain trusted administrative boundaries, not protections supplied by RLS or these guards. No new client financial write policy or grant is introduced.

A1 → A2 → A3 is the approved review order; A2/A3 do not intrinsically call A1. Runtime settlement/creation/reversal/dispute routines share wallet-before-order locking; the A3 advisory lock is reentrant for those callers. Direct/bulk privileged writes can instead hold purchase rows before acquiring that lock and can deadlock; the correct outcome is rollback and operator investigation, not guard bypass. A2 executes after existing order identity/entitlement guards; A3 sorts last among the current purchase BEFORE triggers. Trigger ordering must be rechecked after any schema change.

Expected DDL side effects are explicit: new function catalog entries/default owner grants, ACL revocations/grant, new trigger catalog entries and dependencies, normal catalog/WAL/cache invalidation, bounded DDL relation locks, and prevention errors on formerly accepted invalid future writes. Replaying A2/A3 drops/recreates their named triggers transactionally (new OIDs), and CREATE OR REPLACE would replace same-signature functions; unexpected existing objects therefore block the proposed first-install operator wrapper. No table scan for ownership uniqueness/index build, table rewrite, financial DML, new table/column/index/constraint/policy, historical trigger firing or worker activation occurs.

Seven enabled production DDL event hooks were read in full: PostgREST DDL/drop watchers can enqueue schema-reload NOTIFYs at commit; extension-specific pg_cron/pg_net/pg_graphql hooks only act for their matching extension events; GraphQL placeholder restoration only concerns GraphQL drops; the public automatic-RLS hook only acts on table creation. These three function/trigger DDL bodies do not request extension or table changes. No provider network call is made by the inspected hook paths. Evidence: [production-ddl-hooks.json](evidence/phase-a-final-20261111/production-ddl-hooks.json). Hosted hook execution/cache propagation is not reproduced by the local Supabase stub.

Backup and operational recovery: **BLOCKED**.

The fresh backup inventory GET reports **`pitr_enabled=false`, `backups=[]`, `physical_backup_data={}`**. This establishes no available managed backup or PITR recovery point through the inspected response; it does not prove no owner-held external backup exists. No current successful external backup/restore evidence was found in the reviewed reports. No backup was created, downloaded or restored.

The [October 23 restore report](MEDVEDA_PRODUCTION_BACKUP_RESTORE_READINESS_20261023.md) proves only a partial application-table restore: 46 application COPY sections/645 rows and FK checks passed, while complete data restore failed because the local managed Auth schema lacked `audit_log_entries.ip_address`. Loading only Auth IDs did not restore accounts/sessions/identities. That old dump and its hashes cannot certify today's database or a complete recovery path.

Owner requirements before readiness: current backup identity/time/status and retention; demonstrated compatible full application/managed Auth/Storage metadata restore in isolation locally; object-byte/configuration/secrets recovery references; documented RPO/RTO and handling of financial/provider facts after a recovery point; PITR evidence or an approved demonstrated alternative; named privileged operator and independent observer; bounded DDL/incident window and explicit signed package approval. Any backup creation or restore requires separate authorization. No account upgrade, recovery change or restore is implied by this report. Supabase documents that database backups exclude Storage object bytes and that restoration capability depends on the configured recovery service; platform documentation is not evidence this project has it enabled. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups), [restore-to-new-project documentation](https://supabase.com/docs/guides/platform/clone-project).

Local acceptance: **PASS**.

A fresh PostgreSQL **17.11** cluster used only `/tmp/medveda-phase-a-final/socket`, port 55471, with TCP listening disabled. Unique scratch databases were built from retained baseline migrations through `20261104110000` and synthetic fixtures; no hosted data or credentials were forwarded. The local SQL differs in patch version from hosted 17.6 and uses Supabase Auth/Storage/cron stubs; this is compatibility evidence, not a managed-service recovery or deployment rehearsal. Sandbox DNS/local socket restrictions were resolved by approved narrowly scoped network/socket escalations; no auto-review rejection occurred.

The exact three files were applied twice in order, preserving pre-existing orders/payments/purchases/products/wallet/referral fingerprints, including seeded historical contradictions and duplicates. No excluded future ownership-index migration was run. Actual handler/HMAC code used mocked provider/Auth/HTTP transports; real SQL, triggers, transactions and independent PostgreSQL sessions supplied database behavior. No real provider or cloud write endpoint was contacted.

| Acceptance requirement | Fresh result |
| --- | --- |
| Baseline and A1 → A2 → A3; repeatability | PASS; baseline defect reproduction, twice-applied exact artifacts, unchanged financial/catalog fingerprints |
| Successful paid orders; all four scopes | PASS; exact commitment, immutable owner/product/amount/scope checks |
| Late failures; failed/cancelled later capture | PASS; terminal status guard and both concurrency orders |
| Duplicate ownership and same-order replay | PASS; historical-exception insert/restore races, distinct-order settlement compensation, INSERT ON CONFLICT |
| Historical inconsistent records; legitimate purchases | PASS; existing records/access preserved, proof fails closed where appropriate |
| Notes authorization and restoration | PASS; actual local Notes predicate plus mobile restoration/authoritative-denial regressions |
| Refund/reversal/dispute | PASS; partial/full refund, open/won/lost dispute, no regrant after reversal, remaining historical success preserves access |
| Transaction rollback | PASS; forced settlement exception removes partial financial work; forced error after all three DDL bodies restores function ACLs/trigger OIDs |
| Lock timeout | PASS; blocked advisory grant rolls back with no purchase; exact A2 DDL timeout leaves previous trigger intact |
| Security grants and isolation | PASS; trusted owner/path/definer, no client execute, service proof access; RR/SERIALIZABLE keyed grants fail closed |
| MV003 commitment / MV005 status / MV006 ownership | PASS; complete existing focused actual-SQL suites |
| Proposed operator transaction | PASS; absent-approval refusal, exact three DDL+ledger atomic commit, unchanged financial/catalog fingerprints, repeat-run refusal |

[local-acceptance.log](evidence/phase-a-final-20261111/local-acceptance.log) contains **148 PASS assertions/notices**. [operator-local.log](evidence/phase-a-final-20261111/operator-local.log) records the separately tested proposed wrapper. Seven additional focused Node suites all passed: MV006 restoration, MV005 create-order, Razorpay security, mobile Notes entitlement, purchases, payment verdict and payments-disabled release checks; [regression-results.json](evidence/phase-a-final-20261111/regression-results.json). No claim is made about live provider/Auth/native acceptance. Tests are not production authorization.

Operator runbook: [MEDVEDA_PHASE_A_OPERATOR_RUNBOOK_2026-11-11.md](MEDVEDA_PHASE_A_OPERATOR_RUNBOOK_2026-11-11.md).

Exact repository path: `docs/audit/MEDVEDA_PHASE_A_OPERATOR_RUNBOOK_2026-11-11.md`. It specifies approvals, backup/recovery, production identity, all hashes, drift checks, lock/timeout controls, independent read-only verification, unchanged financial aggregates, expected definitions/ACLs, ledger rules, stop/failure response and fail-safe. The proposed atomic SQL is `docs/audit/evidence/phase-a-final-20261111/operator-phase-a-proposed.sql`, SHA-256 **`1473150ed92b6ee08b18e66be2042e99d19e0e66e8ef957f61f4f78fa20bcb05`**. It only removes each source's outer BEGIN/COMMIT to wrap the unchanged DDL bodies and exact-source ledger records together. Its local approval-reference interlock is not owner authorization. It has **never executed in production**.

Pending owner approvals: recovery procedure/evidence and RPO/RTO; named operator/observer and caller/isolation compatibility; exact source and derived-wrapper hashes; DDL locking window/incident ownership; separately explicit authorization for actual production execution after fresh drift checks. None has been granted in this chat. If executed later, the only allowable ledger delta is the three actually executed versions in the same transaction; no repair, pre-marking or unrelated pending-file sweep.

Exact deployment exclusions: all migrations except A1/A2/A3, specifically `20261108100000_notes_choice_checkout.sql`, `20261109100000_billing_settlement_recovery.sql`, `20261109120000_isolated_nonplay_test.sql`; `supabase/maintenance/mv006_future_unique_ownership.sql`; every Edge Function deployment; Phase B/C; financial/provider/worker operations and schedule changes; historical repair/canonicalization/backfill; migration history repair; blanket db push; Buy Now/payment gate activation; catalog and ₹1/₹2/₹5 price changes; website/admin/mobile deployment; staging; backup creation/restore without separate authorization. Existing source changes, purchases and Notes contracts remain intact.

**Exact next owner action:** supply current backup and compatible complete restore evidence, appoint the privileged operator and independent observer, and approve the exact package/recovery/locking window. Then request a fresh final read-only drift review and grant production execution as a separate explicit action. **Do not deploy now and do not proceed automatically to Phase B.**

Changed-file inventory follows. All changes made by this review are new audit/runbook/evidence files; no existing migration, application, test, website or admin file was edited. Machine-readable inventory and preservation results are retained alongside the evidence.

- `docs/audit/MEDVEDA_PHASE_A_FINAL_SAFETY_REVIEW_2026-11-11.md`
- `docs/audit/MEDVEDA_PHASE_A_OPERATOR_RUNBOOK_2026-11-11.md`
- `docs/audit/evidence/phase-a-final-20261111/artifact-integrity.json`
- `docs/audit/evidence/phase-a-final-20261111/baseline-diff.json`
- `docs/audit/evidence/phase-a-final-20261111/candidate-checksum-verification.json`
- `docs/audit/evidence/phase-a-final-20261111/changed-file-inventory.json`
- `docs/audit/evidence/phase-a-final-20261111/diff-check.log`
- `docs/audit/evidence/phase-a-final-20261111/expected-phase-a-metadata.json`
- `docs/audit/evidence/phase-a-final-20261111/extra-local-checks.py`
- `docs/audit/evidence/phase-a-final-20261111/independent-postchecks-readonly.sql`
- `docs/audit/evidence/phase-a-final-20261111/initial-file-hashes.json`
- `docs/audit/evidence/phase-a-final-20261111/initial-git-status.txt`
- `docs/audit/evidence/phase-a-final-20261111/inspect-ddl-hooks-readonly.py`
- `docs/audit/evidence/phase-a-final-20261111/inspect-operational-readonly.py`
- `docs/audit/evidence/phase-a-final-20261111/inspect-production-readonly.py`
- `docs/audit/evidence/phase-a-final-20261111/inspect-safety-readonly.py`
- `docs/audit/evidence/phase-a-final-20261111/operator-package-checksums.sha256`
- `docs/audit/evidence/phase-a-final-20261111/operator-phase-a-proposed.sql`
- `docs/audit/evidence/phase-a-final-20261111/prepare-operator-sql.py`
- `docs/audit/evidence/phase-a-final-20261111/preservation.json`
- `docs/audit/evidence/phase-a-final-20261111/production-ddl-hooks.json`
- `docs/audit/evidence/phase-a-final-20261111/production-operational.json`
- `docs/audit/evidence/phase-a-final-20261111/production-readonly.json`
- `docs/audit/evidence/phase-a-final-20261111/production-safety.json`
- `docs/audit/evidence/phase-a-final-20261111/regression-results.json`
- `docs/audit/evidence/phase-a-final-20261111/run-phase-a-local.py`
- `docs/audit/evidence/phase-a-final-20261111/test-operator-local.py`

Preservation verification: **1371 pre-existing files byte-for-byte unchanged**. Final repository `git diff --check` passed. The disposable scratch databases were dropped and the review-owned local PostgreSQL cluster was stopped after testing. No deployment or financial operation occurred.
