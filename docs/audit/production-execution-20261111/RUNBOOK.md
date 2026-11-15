# Production migration execution runbook — 2026-11-11 UTC

**PREPARED FOR INDEPENDENT REVIEW. NO-GO FOR EXECUTION. No production authorization is granted.**

Target exclusively `/home/ganeshp8545/AyurPulse`, Supabase **xbvenkfmesugrbjuufyw**, MedVeda, ap-northeast-2. Retained observations show PostgreSQL 17.6. This preparation opened no database connection and executed no SQL, migration, deployment, worker, financial route, backup or restore. All production facts below are inherited evidence, not a fresh observation.

Read `manifest.json`, `SHA256SUMS`, `expected-final-functions.json`, `baseline-function-preimages.json`, and this whole runbook. Paths within this runbook are relative to `docs/audit/production-execution-20261111/` unless prefixed otherwise. Source copies are review inputs, never standalone execution commands.

## Reviewed inputs and interpretation

Read the November 11 production deployment preflight, Phase A final safety review and operator runbook, Phase B Edge compatibility report, Phase C local readiness report and Phase C release README/manifest. November 10 migration-repeatability and October 23 recovery reports were also examined. Their paths/hashes are in `review-inputs.sha256`.

The repository contains **eight pending migration files** after the retained 66-version baseline: seven approved-for-review A/C candidates and one isolated non-Play installer. No separately titled “eight-migration review” was found. The eight-file scope is reconciled using those retained reviews and the seven-file Phase C manifest; if the owner means another review, its identity and reconciliation remain a blocker. The older preflight's C3/C4/C5 descriptions are superseded for this package by the Phase C manifest's two new forward migrations. A1 is never re-recorded as C3.

## Exact order and stop points

| Stage | Explicit file | Ledger result |
| --- | --- | --- |
| A1 | `sources/20261110100000_mv003_razorpay_entitlement_commitment.sql` | Add 20261110100000 |
| A2 | `sources/20261110120000_mv005_razorpay_order_transitions.sql` | Add 20261110120000 |
| A3 | `sources/20261110130000_mv006_purchase_ownership_guard.sql` | Add 20261110130000; total 69 |
| STOP | Independent A postchecks, then **separately approved B1 → B2 → B3** | No SQL ledger delta |
| C1 | `sources/20261108100000_notes_choice_checkout.sql` | Add 20261108100000 |
| C2 | `sources/20261109100000_billing_settlement_recovery.sql` | Add 20261109100000 |
| C3 | `sources/20261111100000_phase_c_final_mv003_commitment.sql` | Add 20261111100000 |
| C4 | `sources/20261111110000_phase_c_play_entitlement_snapshot.sql` | Add 20261111110000; total 73 |
| STOP | Independent C postchecks and explicit resume decision | No automatic deployment/activation |

A1/A2/A3 execute together in `01-phase-a.sql`, an exact copy of the previously reviewed atomic Phase A wrapper. C1/C2/C3/C4 execute together in `03-phase-c-atomic.sql`, a newly prepared wrapper. Never include the self-committing source files inside another transaction. Both wrappers are psql scripts, not SQL-editor pastes. Do not run the numbered files in a loop.

The isolated `20261109120000_isolated_nonplay_test.sql` is completely excluded from SQL sources, execution and ledger changes. No future MV006 complete ownership index, unrelated migration, historical repair, test-price change, function deployment, worker enablement, Buy Now or AAB publication is part of this execution package.

## Mandatory prerequisites — every item is blocking until signed

1. Owner signs `APPROVAL-TEMPLATE.md` for the exact `SHA256SUMS` digest and separate A/B/C decisions. Name a privileged migration operator, independent read-only observer, incident owner, approved UTC start/end and lock budget. Actual execution requires a new explicit instruction; this preparation request supplies none. A setting containing a change reference is an interlock, not approval or authentication.
2. Demonstrate a current recovery point: identity/time/status/retention, complete compatible application + managed Auth + Storage metadata restore in isolated LOCAL infrastructure, object bytes, Edge/config/Auth/secrets recovery references, accepted RPO/RTO, and financial/provider reconciliation after the recovery point. PITR range or an approved demonstrated alternative must be evidenced. Retained Phase A evidence reports PITR=false and no listed backup; October 23 complete restore failed on Auth schema compatibility. Neither is sufficient. Backup creation/restoration needs separate authorization; no staging or restore-over-production drill.
3. Obtain an approved change window including the brief reader outage from ACCESS EXCLUSIVE locks, bounded callback interruption, ingress handling, alerts and incident response. Verify all financial writers and READ COMMITTED isolation; direct/bulk service writers can deadlock with wallet-before-order locking. No automatic retries, timeout increases, backend termination or trigger bypass.
4. **Before C, prove operational quiescence and draining**, with a separately approved, tested ingress/worker control procedure. Include verify-payment (signed callbacks and unsigned recovery), razorpay-webhook, all order creation/choice/token routes, Play receipt verification, external reporting, compensation/recovery/reversal/dispute handlers, all schedulers and direct service-role/admin financial writers. Inventory active requests, queued retries and DB transactions/prepared transactions. Preserve provider delivery by a verified durable-ingress method or documented provider retry guarantees/retention; do not acknowledge dropped events or assume provider retries indefinitely. Maintain Notes read access except the short database-lock interval. Buy Now off and `require_ucb_for_razorpay=false` do **not** prove global quiescence. No existing tested quiescence mechanism was found; naming references in PGOPTIONS cannot create one. This is a current blocker, not an instruction to deploy a maintenance switch now.
5. Rehearse the **exact newly derived C wrapper** on an authorized compatible isolated local baseline with synthetic fixtures, including success, forced rollback after C2, missing approvals, lock timeout, concurrent attempts, source/ledger drift, duplicate token/index failure and disconnect/commit-ambiguity investigation. This task ran only offline checks; earlier Phase C source tests did not test this new wrapper. Managed Auth/hooks/cache acceptance and hosted lock duration remain unverified. A rehearsal is a prerequisite, not performed here.
6. Separately approve and independently verify Phase B delivery before C: exact source archives, full closures, JWT settings, runtime mode/secret metadata and dependency contracts. No production financial probe is a health check. B1/B2 JWT=false, B3 JWT=true. Inspect actual hosted source/config; archive hashes do not equal compiled hosted ESZIP hashes. Record reviewed semantic/source comparison and deployed bundle hashes/versions. B delivery is outside this package and may not occur automatically.

## Identity, source and drift gates

The operator privately configures libpq services with `sslmode=verify-full` and an independently verified CA. Use direct `db.xbvenkfmesugrbjuufyw.supabase.co` or verified project-qualified session-pooler mapping; never transaction pooling. `postgres` database name alone does not establish project identity. The execution role is the approved attributable `postgres`; the observer uses read-only credentials. Independently verify Management API project ID/name/region/healthy status. Never print credentials, load `.env` into this preparation, or retain customer/provider identifiers in shared evidence.

From repository root, offline checks immediately before each authorized stage:

```sh
sha256sum -c docs/audit/production-execution-20261111/SHA256SUMS
sha256sum -c docs/audit/production-execution-20261111/review-inputs.sha256
python3 docs/audit/production-execution-20261111/verify-offline.py
sha256sum -c supabase/releases/phase-b-20261111/checksums.sha256
sha256sum -c supabase/releases/phase-c-20261111/checksums.sha256
```

Any difference blocks; do not regenerate hashes to proceed. The Phase C release's disabled mobile inventory may drift independently as fixes continue; review/re-pin that scope separately without changing these SQL inputs.

Use the existing inspected collectors `docs/audit/evidence/phase-a-final-20261111/{inspect-production-readonly.py,inspect-safety-readonly.py,inspect-operational-readonly.py,inspect-ddl-hooks-readonly.py}` only after a new read-only inspection is authorized. Copy/review their output destinations into a NEW restricted directory; never overwrite retained evidence. Their credentials and fixed project must be independently checked. Use `read_only:true`, READ ONLY transactions, bounded SELECTs and ROLLBACK. No financial RPC, proof RPC, worker, signer/PDF or provider endpoint invocation.

Compare canonical content, including all 66 exact baseline versions and ledger schema `(version text, statements text[], name text)` with version uniqueness; all 126 public function definitions/ACLs/owners/config; columns/nullability/defaults; valid/ready index definitions/predicates; constraints; all triggers/order/enablement; RLS/policies/table/schema/default ACLs; event hooks; prices; minimized history; schedules; project config; Edge metadata and sampled actual bundles. Pinned observations: November 11 Phase B 04:30:28 UTC, Phase A operational/DDL/security snapshots, and original preflight. Hash all retained snapshots and retain full private preimages, not just hashes.

Before A: no A objects; exact baseline 66. Before C: baseline UNION A exactly 69; original full A ledger sources must match manifest MD5s; A guards/proof and independently approved Phase B delivery present; baseline Play snapshot trigger/function **already exist** and must match preimages. C1 table/new routines/columns and C2 digest index/Play fulfillment/proof must be absent. The C wrapper pins all original 126 function preimages, plus A1 prosrc, but does not replace the complete fresh schema/config/hook drift review.

C2 prerequisite: pgcrypto `extensions.digest(text,text)` and the valid existing `orders_external_token_unique` index; compare uniqueness predicates and actual existing token digest duplicate groups using read-only aggregation without exporting tokens. Hash collision or duplicate digest means STOP, never delete/edit tokens. C2 builds an ordinary unique index transactionally before dropping the old one: no concurrent index command, financial DML or price rewrite. Current dataset size/index build time must fit the approved 15-second statement budget. Do not silently switch to CREATE INDEX CONCURRENTLY or raise the limit.

Expected preserved historical observations are orders/payments/purchases 27/15/15; statuses paid/failed/cancelled/created 13/11/2/1; success payments/purchases 15/15; success purchase on non-paid/failed order 2/2; duplicate success group 1; paid-without-success/owner mismatch 0/0; successful NULL product 0; active ₹1/₹2/₹5 counts 4/7/2. These are inherited, not fresh. Legitimate changes still require baseline re-review. No historical reconciliation is authorized. Retain restricted row fingerprints for all application/wallet/referral/reservation and managed user data before/after under the approved privacy policy. C wrapper additionally compares nine financial/catalog/queue table fingerprints in-transaction, excluding only the three newly added nullable fields.

## Transaction and weak-proof safety

A wrapper: READ COMMITTED, lock_timeout=2s, statement_timeout=15s, idle_in_transaction_session_timeout=15s; ledger SHARE ROW EXCLUSIVE → orders ACCESS EXCLUSIVE → purchases ACCESS EXCLUSIVE. C wrapper uses the same sequence, then provider_events ACCESS EXCLUSIVE. Reader blocking and DDL notifications/WAL/catalog invalidations are expected. Statement/lock timeouts are per operation, not a total window limit. The named observer enforces the approved overall deadline; no timeout increase/automatic session kill.

C2's weaker proof exists **only inside the single uncommitted C transaction**; no payment function is invoked by the wrapper. C3 replaces it before final catalog checks and COMMIT. External callers cannot observe a committed C2-only definition. The strong C3 function body is byte-identical to A1 (`prosrc` MD5 49b01fbcc7a5e71bd527366fd342a6e9); source SHA-256s remain distinct because comments differ. Before commit the wrapper checks final bodies, owner, paths and execute access for all nine C functions, Play trigger, token index and exact 73-version set. Any failure aborts C1–C4 and all four ledger INSERTs together. Existing/in-flight requests and cached plans still require the separately verified quiescence/draining gate; table locks alone are not that proof.

**Do not commit C1/C2 separately, split C3 into a later maintenance window, or resume affected handlers before independent postchecks establish the strong proof.** Do not use the weaker proof even briefly for an acceptance payment. C4 retains A2/A3 and replaces the existing Play snapshot trigger transactionally.

C1/C2 contain SECURITY DEFINER functions with `search_path=public`, unlike the hardened C3/C4 functions. Preserve reviewed bytes; independently verify untrusted roles lack public CREATE, no hostile shadow objects/default privileges, trusted postgres ownership and intended exact service-only ACLs. C2 authenticated `get_my_play_fulfillment` must remain owner-bound using auth.uid. Any drift or unacceptable trust boundary requires a new reviewed forward migration, not an operator edit.

## Future manual execution — prohibited until every gate passes

These are future command templates, never run by this preparation. Replace references with actual signed, setting-safe identifiers. Independently configured services must identify this production project and TLS role. Do not copy placeholders as approvals.

Phase A only, after new explicit A execution authorization:

```sh
PGSERVICE=medveda_phase_a_owner \
PGOPTIONS='-c medveda.phase_a_owner_approval=SIGNED_A_REFERENCE' \
psql -X -v ON_ERROR_STOP=1 -f docs/audit/production-execution-20261111/01-phase-a.sql
```

STOP. Observer runs `02-phase-a-postchecks-readonly.sql` through its read-only service, repeats full drift review and checks original Phase A runbook metadata (three functions, two triggers, exact 69 versions, unchanged data/readers/prices). No automatic Phase B. Separately authorize B1→B2→B3 using `supabase/releases/phase-b-20261111/manifest.json` and the Phase B compatibility report. Record verified actual delivery/config/cache evidence. This package supplies no B deploy command.

Phase C only, after new explicit C execution authorization and proven quiescence:

```sh
PGSERVICE=medveda_phase_c_owner \
PGOPTIONS='-c medveda.c_owner_approval=SIGNED_C_REFERENCE -c medveda.recovery_evidence=VERIFIED_RECOVERY_REFERENCE -c medveda.window_approval=APPROVED_WINDOW_REFERENCE -c medveda.phase_b_verified=VERIFIED_B_REFERENCE -c medveda.quiescence_evidence=DRAINED_INGRESS_REFERENCE -c medveda.drift_approval=VERIFIED_DRIFT_REFERENCE' \
psql -X -v ON_ERROR_STOP=1 -f docs/audit/production-execution-20261111/03-phase-c-atomic.sql
```

Keep a restricted transcript, exit status, UTC start/end, operator identity, signed package hash and all approval references. Never add `--single-transaction` around files with their own transaction boundaries. Do not use a shell pipeline that hides psql exit status. No automatic retry.

## Exact ledger handling — older C1/C2 are genuinely executed

The ledger is an exact set, not a high-water mark: 66 → 69 after A → unchanged 69 after B → 73 after C. Every wrapper inserts each version/name and original complete UTF-8 source text into a one-element statements text array **after** that file's actual body succeeds, within the same outer transaction. Only the sources' outer BEGIN/COMMIT lines are removed from execution; comments and all DDL bodies are retained. No original A source runs again in C. C3/C4 use new forward versions. All original 66 rows, names and statement arrays must be retained unchanged.

C1/C2 can truthfully enter the ledger after newer A versions because their SQL actually executes then. Version timestamps describe filenames, not observed execution chronology; retain the signed transcript/order separately because this ledger has no execution timestamp column. Validate all seven names/source MD5s against manifest and exact sets, never MAX(version). Do not use repair --status applied, INSERT without SQL, ON CONFLICT DO NOTHING, delete/reinsert A rows, rename historical migrations, blanket db push, include-all, or scripts/ucb-deploy.sh. Future CLI workflows must account for the intentional excluded gap; never repair or apply it to silence a CLI warning.

## Independent postchecks and resume gate

Use a separate read-only connection and identity verification. Run `04-phase-c-postchecks-readonly.sql`; it executes catalog checks/SELECTs, never the financial/proof application functions. Review the outputs against source and `expected-final-functions.json`, including return types/languages/volatility, all effective and explicit grants, paths/owners, complete normalized definitions, final strong MV003, Play proof/snapshot, preserved A2/A3 trigger definitions/order and original ownership-index exception. Compare all original 66 ledger rows byte-for-byte and each of the seven source ledger MD5s. Verify exact 73-version set; excluded version absent. The observer must independently compare full source/ledger content, not rely solely on the wrapper's checks.

Expected delta only: C1 notes_choice_checkouts with PK/FKs/unique/check/defaults, RLS and service-only grants, empty; orders.ucb_transaction_time; orders.external_report_test_purchase; provider_events.blocks_entitlement (all nullable, no default/backfill); token digest unique index replacing direct token index; nine final C function contracts; recreation of Play snapshot trigger; four C ledger rows. No other index/policy/constraint/reader/client-write changes. Run fresh schema/security/event-hook/financial/price fingerprints; verify unrelated public functions and Notes readers unchanged. The C postcheck pins 122 untouched baseline functions; A2/A3 are verified separately using the Phase A metadata. Verify cache propagation through non-mutating metadata/log evidence; do not invoke a proof/payment function as a probe.

Inspect Edge actual bundle/config inventory and dormant schedules; A/B remain pinned until separately authorized C delivery. B verifier/webhook compatibility against C replacement settlement/inbox/queue semantics must be demonstrated explicitly in rehearsal before resume: Phase B was tested on baseline+A only, and Phase C tests exercised broader candidates. Passing those separately is not proof of this transition state. Keep affected entrypoints quiescent until a hash-pinned compatible set and schema/cache acceptance are independently reviewed. If that requires Phase C handler delivery, it needs its own approval and review; SQL commit does not authorize it. Then incident/change owner may explicitly resume only previously approved handlers at their prior permissions, with purchase gates still off and no worker activation. This package contains no resume/deploy automation.

## Failure, rollback and fail-safe

Before COMMIT: any timeout, deadlock, 40001, privilege/definition/ACL/index error, lost quiescence, window expiry or drift means STOP. A live failed transaction must ROLLBACK or close; verify its backend ends and locks clear. No automatic rerun, source edits, trigger disablement or index drop to force success. A failed C transaction must leave all 69 prior versions, strong A1 proof and all pre-existing objects/data unchanged, with no C table/columns/index/versions. A2/A3 persist.

Disconnect around COMMIT: outcome UNKNOWN, not failed/applied. A new independent read-only observer checks exact ledger set, seven full-source records, all definitions/ACLs/triggers/indexes/columns and private data fingerprints. For C either all four versions and complete final contracts committed, or none did; mixed outcomes are an incident. Never rerun to discover the result or repair history. Keep ingress quiescent until incident resolution.

After commit: preserve additive A guards and the **strong C3 proof**, keep new purchases disabled, stop rollout and investigate forward. No automatic inverse SQL is supplied: dropping C objects can break stored queued facts/new columns/function consumers; restoring old B bundles reintroduces unauthorized recovery/false success. No deletion of financial facts/queues/inbox/idempotency keys, ledger cosmetics, replay/refund, forced entitlement or restore-overwrite. A safe forward fix or compatible rollback bundle must be separately reviewed/hash-pinned with current dependency/preimage checks and owner approval. Whole-database recovery is incident-owned, using demonstrated recoverability and reconciliation of all subsequent provider captures/refunds/disputes; it is not routine DDL rollback.

## Current decision and unresolved risks

Recovery evidence, operator/observer appointment, signed exact artifact approval, approved UTC window, fresh drift/identity checks, proven ingress/quiescence/drain/retry controls, exact C-wrapper rehearsal and B→C transition compatibility/resume acceptance remain **BLOCKING**. Also resolve the requested eight-migration review identity if different from the mapped eight-file inventory. No production state was refreshed. Correct live secrets, managed hooks/cache behavior, connection mapping/isolation and tested safe rollback bundle are unverified operator assumptions.

Authentic Console/enrollment/catalog/report/refund acceptance, timestamp/tax treatment, native/device acceptance, scheduler capacity/leases and independent alerts remain separate blockers for eventual C function delivery/payment activation; SQL installation alone proves none of them. The Phase C authorization timestamp uses payment creation time, not an asserted exact authorized_at. Historical contradictions/duplicates remain preserved owner decisions, never cleanup prerequisites silently performed here.

**NO-GO FOR EXECUTION. Do not proceed automatically.**
