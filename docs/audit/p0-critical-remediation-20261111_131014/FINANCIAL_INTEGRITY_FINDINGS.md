# Financial integrity findings

Date: 2026-11-11 UTC. P0 only. Local synthetic PostgreSQL/provider evidence; no production/staging connection, deployment, financial transaction, credential change, worker/schedule activation, Android build upload or payment activation. Existing approved artifacts and financial history were preserved. **Local verification is not production protection or acceptance.**


## Evidence and state model

Previous read-only production observation `2026-11-11T12:37:42.621010+00:00` reported 66 ledger versions, two successful purchases linked to non-paid orders, and one duplicate-success owner/product group. See [docs/audit/full-project-2026-11-11_123321/evidence/production-readonly.json](/home/ganeshp8545/AyurPulse/docs/audit/full-project-2026-11-11_123321/evidence/production-readonly.json). These are inherited aggregate facts, not newly queried records. Exact current counts, original writer, merchant capture/refund facts and case overlap remain UNKNOWN. Do not infer fraud, correct canonical ownership or provider settlement from status strings.

Orders hold server-priced immutable entitlement/price snapshots. Successful payment records bind order/user/product/amount/provider references. Successful purchases authorize the recorded course/scope. Captures record independently fetched provider facts; compensation rows preserve non-entitling captured payments. Provider inbox, durable jobs, refund reporting and wallet/referral ledgers retain reversals/retries. A paid order or capture marker alone is insufficient proof.

The reproducible historical risk paths are: a late failed/cancelled write could downgrade a paid order before MV005; the old partial ownership index excludes a historical purchase key and can admit a new success beside it before MV006. These reproduce possible mechanisms, not the actual provenance of the reported anomalies. Existing contradictory successful purchases remain accessible and return manual-review/pending on settlement replay rather than rewriting accounting or queuing a speculative refund.

MV005 [supabase/migrations/20261110120000_mv005_razorpay_order_transitions.sql](/home/ganeshp8545/AyurPulse/supabase/migrations/20261110120000_mv005_razorpay_order_transitions.sql:4) prevents future terminal-state downgrades. MV006 [supabase/migrations/20261110130000_mv006_purchase_ownership_guard.sql](/home/ganeshp8545/AyurPulse/supabase/migrations/20261110130000_mv006_purchase_ownership_guard.sql:5) uses the wallet advisory-lock namespace and a fresh READ COMMITTED snapshot for all new keyed success transitions, including restoration. Transaction-snapshot isolation grants fail closed; metadata updates on existing historical successes and legacy NULL-key scopes remain compatible. The future complete unique index is excluded from release; its synthetic test is not authorization to alter real duplicates.

## Fresh local verification

`evidence/mv003-006.log`: baseline defect reproduction; migrations twice; unchanged financial/catalog fingerprints; all four entitlement scopes; paid/failed/cancelled/expired states; concurrent failure-vs-settlement in both orders; duplicate callbacks/webhooks; compensation; refund/open/won/lost dispute; generic ownership INSERT/UPDATE/ON CONFLICT races; SQL rollback; repeated restoration; historical access. `evidence/atomic.log` verifies preservation through A/C. `evidence/proof.log` and `forward-ledger.log` verify the new D migration preserves rows and exact proof.

New defect: C3's unconditional pending-reversal denial made a verified partial refund or won dispute block its own settlement transaction. [supabase/migrations/20261111120000_p0_classified_reversal_commitment.sql](/home/ganeshp8545/AyurPulse/supabase/migrations/20261111120000_p0_classified_reversal_commitment.sql:51) exempts only trusted nonblocking pending classifications; every identity/snapshot/capture/compensation predicate remains. Parked/unknown/blocking reversals deny commitment. Actual webhook→SQL partial/won recovery passes afterward. Full refunds and lost disputes cannot regrant.

No historical financial row was repaired, deleted, canonicalized or revoked. Synthetic test mutations occur only in disposable databases. Current source readers intentionally preserve legitimate legacy access; moving a genuine historical payment to duplicate could break replay or future reversal behavior and is not an automatic remedy.

## Privacy-safe reconciliation cases

Create private cases **P0-FIN-001** and **P0-FIN-002** for the two earlier success/nonpaid contradictions, and **P0-FIN-G001** for the duplicate-success group. Do not assume these are three separate users or nonoverlapping records. Public evidence contains aggregate counts only. Each case is OPEN / provider evidence missing.

Use this template separately for each case:

| Required field | Operator entry / requirement |
|---|---|
| Internal case identifier | One opaque internal case ID; no public customer/provider identifiers |
| Current database facts | Authorized read-only timestamp, target identity, private row keys/preimages and evidence hashes; order/payment/purchase states, exact references, amount/currency, scope snapshot, wallet/referral entries, captures, compensation, inbox/refund/dispute facts; aggregate public summary |
| Required provider evidence | Correct merchant/account and independently obtained exact order/payment capture/authorization, amount/currency, timestamps, settlement, refund IDs/amount/status, dispute/chargeback state; stable source and retrieval time; no invented facts |
| Conflicting facts | Explain successful purchase vs unpaid order or multiple independent successful payments for one ownership key; distinguish missing evidence from contradiction |
| Potential entitlement impact | Current accessible Notes/course/scope, surviving legitimate ownership after any proposed refund/reversal, replay behavior, downloaded/offline access and affected account |
| Resolution options | Evidence-backed no-change/hold, narrowly reviewed forward status correction, separately authorized provider financial disposition, or explicit replacement-entitlement policy; retain all history; never arbitrarily select oldest/minimum ID |
| Human approval | Named owner and independent financial/security reviewer, exact private preimages/counts/evidence hashes, approved entitlement/replay/future-reversal policy, recovery reference and bounded execution plan |
| Audit trail | Append-only protected case history: actor/time/reason, evidence hashes, approval IDs, proposed and actual deltas, provider references, transaction/outcome and observer; secrets and PII stay private |
| Post-resolution verification | Independent read-only exact financial conservation/reference/snapshot checks, Notes owner/foreign-user access, reversal/replay behavior, preserved payment/purchase/refund/dispute/wallet history and no new duplicate group |

Never run historical settlement replay or the future full unique index to make these cases disappear. Any real disposition is a new, separately authorized action.
