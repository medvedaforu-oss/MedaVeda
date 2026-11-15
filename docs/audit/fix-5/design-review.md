# Independent design review gate

Agent R (/root/d1) had no filesystem/shell tools. Root supplied the proposed design and then amendments; this is independent reasoning over supplied evidence, not independent full-source review.

First decision: REJECT pending legacy policy clarity, event order, enforceable journals, recursion prevention, zero-recovery idempotency, release locks, migration atomic abort, refund invariants, lock ordering and wrapper ownership.

Second decision: APPROVE amended design for implementation. Legacy permanent flag, target-specific expiry facts, monetary recovered-only reversal, durable zero recovery flag, separate refund credit and sorted prelocks resolve design objections. Requires implementation tests/review of capacity/sum enforcement, marker atomicity, all lock paths and ACLs. No implementation/release approval inferred.

Orchestrator approves the amended design for local implementation, subject to unchanged suites and user retry cap. No production operation is authorized.

Subsequent R decisions: approved preserving existing provider global recovery of unexpired released referral rewards (F8) while manual admin reversal remains original-remainder-only and C5 remains actual-money-only. Approved 36,500-day maximum with hold<=90, earning-at-maximum test and aggregate preflight. D2 independently approved propagating the already-released rejection result without changing monetary rejection semantics.

Implementation corrections discovered locally: owner-first erasure is required because FK anonymization acquires ledger rows; missing coordination deadlocked against admin reversal on the intermediate migration and was corrected. New consumption entries must use lots present at insertion, not filter them by a transaction's earlier start timestamp; only legacy replay uses created_at chronology. These are implementation corrections, not claims of pre-existing deployed failures.
