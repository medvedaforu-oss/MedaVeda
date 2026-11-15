# MOB-14 — client safety fixed; BACKEND DEPENDENCY

Same verifier: `node mobile-app/__tests__/MOB-14.cjs`, PASS (raw after/MOB-14.log). Before log records a foreign non-quiz row being sent.

Every entity is filtered by payload user_id and checked again before sending. Owner epoch changes stop draining and prevent publishing completion of a stale result. Failed rows retain synced_at NULL regardless of attempt count; corrupt/missing-owner rows remain pending for explicit repair. Unsupported entities/operations and missing IDs fail safely. Deletes include user_id.

Reading-progress writes are deliberately blocked and retained with a clear error until an authorized atomic max-progress server RPC exists. No schema or RPC was added. Backend contract must derive owner from auth.uid(), validate content/progress and operation, apply MAX(existing, incoming) in one atomic statement, and define delete/reset behavior separately. Client must await that RPC and check epoch before marking synced. No claim that concurrent-device progress is solved server-side.

Checkpoints include source before/after plus incremental patch. Original queue has no available retry timestamp/dead-letter schema, so failures remain pending and retry at the existing bounded drain cadence; future backoff/dead-letter UX is a follow-up.
