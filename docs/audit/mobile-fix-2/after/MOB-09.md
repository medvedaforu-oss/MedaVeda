# MOB-09 — locally fixed

Same verifier PASS is recorded in after/MOB-09.log. Local quiz-attempt persistence and outbox enqueue use one synchronous SQLite transaction, and draining starts only after commit. The enqueue helper performs no drain inside the transaction. Checkpoint patch preserves the incremental change. Transaction rollback and server verification remain distinct; no server schema changed.
