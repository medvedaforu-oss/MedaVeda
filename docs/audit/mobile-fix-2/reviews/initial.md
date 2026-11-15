# Initial independent mobile review

Reviewed against the durable per-finding before/after checkpoints and incremental patches. Approval concerns the isolated finding delta; it does not authorize staging pre-existing dirty changes. Native/device acceptance remains unverified.

## MOB-09 — APPROVE

The patch moves local quiz insertion and outbox insertion into one synchronous transaction on the singleton database connection. `enqueueForSync` performs only the insert; `drainQueue` starts after `withTransactionSync` returns. An enqueue exception propagates and rolls back both writes. Existing standalone `queueForSync` callers retain their immediate-drain behavior. The before log records failed rollback and the after log passes an injected outbox-failure rollback plus successful post-commit drain check. This test mocks SQLite and the sync module; native SQLite crash recovery and server acceptance are not proven. Current syncEngine changes for other findings must be isolated from this reviewed patch before committing.

## MOB-19 — APPROVE

The exact audited predicate is corrected: connected with unknown reachability remains online, explicit unreachable or disconnected remains offline. Before log fails connected=true/reachable=null; after log passes null/true/false reachability and disconnected/unknown connection cases. Hook harness proves state mapping, not native NetInfo transition timing.

## MOB-01 — APPROVE

The isolated patch moves all authentication/recovery screens into a constant-key group while keeping protected screens in the owner-keyed group. This removes the audited owner-transition route-key invalidation and preserves owner separation for protected navigation. Before log fails on signed-out→A; after log verifies stable ResetPassword group keys through A→B→signed-out and distinct Home group keys. This is declaration/hook-harness evidence only: actual mounted NavigationContainer/native stack controller preservation, cold/warm links, MFA and cleanup still require device/integration testing. The source checkpoints for 01/03/08 were reconstructed by reversing recorded patches, as disclosed in checkpoints/reconstruction-note.md; they are not original captured baseline source images.

## MOB-03 — APPROVE

Historical restore eligibility now depends on Android production package identity independently of the checkout provider. Checkout retains both explicit configuredProvider=play and prior user-choice approval gates. The caller in MyPurchases uses the restored eligibility flag; ensurePlayBilling connects without user-choice options when sales are disabled. Before log fails disabled-provider restore eligibility. Independent review run of `node mobile-app/__tests__/MOB-03.cjs` passes, covering disabled and enabled production Android plus iOS and alternate package exclusions. The test proves config gates only; historical native receipts, generated release module inclusion and backend fulfillment remain unverified. The expo-iap package is installed and its config plugin is only explicitly added for play-provider builds; native disabled-provider build validation remains necessary before claiming restoration works on device.

## MOB-08 — APPROVE isolated fix; REJECT committing mixed handler hunk

The isolated patch preserves broadcast/dedup gating and additionally checks persisted preferences only for validated category types; unknown/local untyped payloads preserve their previous behavior. Before log fails muted Offer presentation and after log passes mute/enabled/untyped banner, list and sound mapping. Background OS delivery remains outside this client fix, as the owner explicitly documents. The test mocks the category utility and presentation gate, so it does not prove real storage latency, native foreground presentation or background suppression. The git diff against HEAD mixes pre-existing broadcast/dedup behavior with the new preference check in the same handler. Commit only if the orchestrator can prove the isolated patch applies without committing those existing dirty changes; otherwise keep MOB-08 blocked from commit under the user's explicit preservation instruction.
