# DATABASE PUSH READINESS

Audit date: 2026-11-11 UTC. Scope: current working tree, including pre-existing uncommitted changes. **Audit only; no deployment authorization.**

**CAN I SAFELY RUN `supabase db push` RIGHT NOW? NO — BLOCKED.** Do not use a blanket timestamp sweep for this release.

## Pending files and intended sequence

The repository has 74 migrations. The pinned production baseline contains 66 through `20261104110000`; fresh production evidence, where obtained, is recorded in the execution ledger and must be rechecked immediately before any future operation.

| Pending filename | Role | Delivery constraint |
|---|---|---|
| 20261108100000_notes_choice_checkout.sql | C1 | After A1/A2/A3, inside atomic C |
| 20261109100000_billing_settlement_recovery.sql | C2 | Replaces commitment semantics; never expose alone |
| 20261109120000_isolated_nonplay_test.sql | Separate test installer | EXCLUDED from seven-migration production package |
| 20261110100000_mv003_razorpay_entitlement_commitment.sql | A1 | First; strong service-only proof |
| 20261110120000_mv005_razorpay_order_transitions.sql | A2 | Second; terminal/captured status protection |
| 20261110130000_mv006_purchase_ownership_guard.sql | A3 | Third; keyed ownership/advisory locking |
| 20261111100000_phase_c_final_mv003_commitment.sql | C3 | Restore final strong proof in same C transaction |
| 20261111110000_phase_c_play_entitlement_snapshot.sql | C4 | Final Play snapshot/proof |

Intended sequence is baseline 66 → atomic A1/A2/A3 → 69 → separately verified B delivery → atomic C1/C2/C3/C4 → 73 → separately approved compatible Edge delivery/resume. The excluded test installer explains 74 local files versus 73 final production versions. Its installation is not implicitly authorized. Future full ownership index under `supabase/maintenance` is also a separate operation. Timestamp order differs from the reviewed staged sequence; migration-ledger repair/pre-marking is not a safe substitute.

## Independently reproduced release behavior

[docs/audit/production-execution-20261111/03-phase-c-atomic.sql:34](/home/ganeshp8545/AyurPulse/docs/audit/production-execution-20261111/03-phase-c-atomic.sql:34) compares hashes of untrimmed function definitions against trimmed collector identities. Matching baseline fails at `accounts_share_network`. After only correcting that comparison in the disposable copy, [docs/audit/production-execution-20261111/03-phase-c-atomic.sql:169](/home/ganeshp8545/AyurPulse/docs/audit/production-execution-20261111/03-phase-c-atomic.sql:169) and line 1283 fail `FOREACH t IN ARRAY[...]` parsing. Correct syntax requires `IN ARRAY ARRAY[...]`.

The separate corrected wrapper has SHA-256 `93dc2a645aa3ec0b266c8fc9356243fa83026b007b73399e90ae0948d4a23b72`. Derivative validation checks only 126 trim expressions and two ARRAY keywords change; approved original artifacts remain untouched. It is a technical candidate, not a newly approved production package.

Fresh tests reproduced 126 exact baseline function preimages; atomic A 66→69; corrected C 69→73; seven exact ledger source arrays; strong final MV003 bodies/ACLs; refusal on post-success retry; missing gate refusal; each C-stage forced rollback; synthetic historical public-table row fingerprints unchanged. Fresh drift/interruption/lock evidence and any harness limitations are listed in `evidence/TEST_EXECUTION.md`; prior logs alone are not proof of reproduction.

The procedure uses 2-second lock and 15-second statement/idle transaction limits. C schema changes can block order readers. An independent observer sees strong A and 69 ledger versions while C2 is uncommitted; MVCC does not expose the weaker uncommitted body. This does not measure production lock duration, account for real traffic or prove a hosted network failure at COMMIT is recoverable.

## Exact blockers

1. Original execution wrapper is defective. Independently review the separate corrected candidate and incorporate its identity plus the compatible four-function upgrade into a newly approved execution manifest/runbook.
2. Confirm current target identity, exact migration source ledger, all function owners/search paths/ACLs, triggers, RLS, index validity and dependencies. A retained baseline is not a current drift check.
3. Demonstrate a current compatible restore covering application schema/data, managed Auth identities/config, Storage metadata AND object bytes, policies, secrets/config references and approved RPO/RTO. Existing partial restore evidence is insufficient.
4. Drain ingress and independently authorized financial workers across the transaction and compatible delivery boundary, with durable provider retries. The Buy Now flag does not stop a cron-authenticated worker.
5. Keep complete C atomic: C2 must not become a committed externally visible weaker proof. Never infer compatibility merely from an unchanged RPC signature.
6. Deliver pinned source/import/JWT closures, not a broad workspace deployment. The current workspace helper still acknowledges unknown reversal outcomes; original B omits new choice-reporting behavior.
7. Name operator, observer, incident owner, window and post-check/resume conditions; review advisory lock ordering and hosted workload capacity.
8. Resolve unknown commit outcome by an independent exact full-ledger/function/ACL/column/index/data inspection. Never rerun blindly after a lost connection, and never rewind financial history to force a retry.

## Financial history / recovery

The A/C wrappers do not intentionally rewrite old financial records; synthetic preservation tests verify existing products/prices/orders/payments/purchases/wallet/referrals/capture/compensation/inbox rows remain unchanged across migration. New nullable reporting fields are excluded from canonical old-row fingerprints. That is scoped evidence, not certification of the live data or a full restore.

Existing success-on-unpaid contradictions and duplicate successes must be investigated using provider evidence and approved forward reconciliation. Do not delete, deduplicate, replay accounting or revoke historical access automatically. Keep additive guards after failure; review every old-handler rollback against the final schema. Post-migration validation must include exact ledger sources, function identities, ACLs/RLS/triggers/indexes, owned Notes access, queue integrity, provider recovery, unchanged history and controlled worker resume.

## Fresh production observation supplement

[Read-only production evidence](evidence/production-readonly.json) confirms 66 versions through `20261104110000`, no `razorpay_entitlement_committed` RPC, deployed verify-payment v68 / webhook v50 / create-order v23, and seven bundle hashes. The verifier/webhook do not contain the reviewed commitment call. Two successful purchases are linked to non-paid orders and one duplicate-success ownership group exists. These records were neither exposed individually nor modified. This establishes deployment/data gaps, not genuine provider settlement acceptance.

The current `require_ucb_for_razorpay=false` setting is not a payment kill switch. Active wallet-credit cron must be considered in quiescence. Live credentials/account/webhook dashboard activation remain UNKNOWN; no real charge or worker invocation occurred.
