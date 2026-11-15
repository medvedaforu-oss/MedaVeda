# Final independent adversarial mobile review

Source/test/git are read-only for this reviewer. Verdicts apply to isolated finding deltas in durable checkpoints, not unrelated dirty baseline changes. Existing website generated-controller parity test fails across the forbidden website scope; no website edits were made. Native/device, deployed bridge and backend acceptance are not established by Node harnesses.

## MOB-05 — APPROVE

Reviewed durable patch and current App.tsx. GestureHandlerRootView encloses all startup and navigation content with flex:1. Independently ran MOB-05.cjs: PASS. The harness checks root hierarchy; actual Swipeable archive gestures on Android development/release still require device verification.

## MOB-10 — APPROVE

Reviewed isolated push/auth delta. Failed signout resumes only a matching owner and exact generation handle; auth epoch also rejects stale A→B→A continuations. Registration marker is cleared and registration retried after rollback. Independently ran MOB-10.cjs: PASS, including returned signOut error, foreground re-registration, stale and reused handles and late rejection across A→B→A. Token deletion/registration uses captured bearer and serialized writes. Native token lifecycle and deployed RPC acceptance remain unverified.

## MOB-18 — APPROVE

The exact already_owned quote code now renders My Purchases, while disabled-provider/OS gates precede that render path. Independently ran MOB-18.cjs: PASS, exercising the quote response and actual action callback. No provider flag is enabled. Native purchases/deployed response parity remain unverified.

## MOB-04 — REJECT (owner lifetime regression)

The watchdog and late success path pass MOB-04.cjs, but new canShowAttempt compares owner ID only. Independently reproduced: start checkout as A, changeOwner(B), changeOwner(A), emit old attempt success; screen navigates PaymentSuccess for old lifetime. The auth subscription clears the timer but leaves currentAttempt and canShowAttempt accepts A again. Capture getAuthEpoch (or an equivalent monotonically increasing lifetime) when admitting/resuming an attempt and check it through callbacks/awaits. Add ABA and blurred/unmounted watchdog checks. Current test stubs billing service entirely, so persisted-attempt and post-dispatch launch ambiguity changes also lack direct behavioral verification. Native lost callback acceptance remains pending.

## MOB-15 — APPROVE

Reviewed all three isolated hunks. Free-preview enrichment drives the free filter and suppresses the locked note marker; downloaded IDs require completed status and local URI. Independently ran MOB-15.cjs: PASS, covering enrichment/filter/row and mixed download states. This is local metadata evidence, not proof the filesystem URI still exists.

## MOB-16 — APPROVE

The patch rotates a semicircle about the whole-disc center within complementary fixed masks; full-disc symmetry is removed. Independently ran MOB-16.cjs: PASS, sampling actual emitted geometry around the ring for 0/1/25/50/51/75/100%. The geometry harness models clipping/rotation; native rasterization, animation timing and accessibility remain device checks.

## MOB-06 — APPROVE current mobile behavior; checkpoint isolation caveat

Reviewed current mounted-screen revision subscription, synchronous disposal on new link, controller per-auth-client serialization and disposed post-await guards. Independently ran MOB-06.cjs and unchanged scripts/deep-link-selftest.cjs: PASS. The latter proves cold/warm URL precedence and clear-during-initial-read invalidation using separate readGeneration, so consuming a link does not replace its active controller. Strengthened test proves disposed pending setSession/updateUser cannot continue assurance/cleanup. Existing password recovery suite has a known website generated-controller parity failure outside authorized scope; no website changes made. Native stack/MFA device behavior remains unverified. Original MOB-06 patch/checkpoint begins after some controller edits already existed; orchestrator must reconstruct complete source delta against the authorized clean baseline before committing.

## MOB-07 — APPROVE client delta; external recovery dependency remains

App config exposes the installed scheme; navigator and exact reset-password store predicate share an allowlisted prefix and reject route lookalikes. Production identifiers are untouched. Independently ran MOB-07.cjs: PASS for staging and lookalike route; source inspection covers allowed production/isolated names and fail-closed mismatch. authService still uses the production HTTPS bridge. Build-specific bridge links and Supabase redirect allowlist are external dependencies; this approval does not claim working staging email recovery or deployed native manifest acceptance.

## MOB-20 — APPROVE

KeyboardAvoidingView and a flexGrow ScrollView provide keyboard-safe scrolling, with handled taps; support openURL rejection is caught and shown as a fixed fallback. Independently ran MOB-20.cjs: PASS for emitted wrappers. The test does not force support rejection or measure real keyboard layout; those limits are explicit. Small screen, landscape and large-font native checks remain pending.

## MOB-11 — APPROVE

Reviewed checkpoint/current serialization, immediate transfer invalidation, strict owned filename validation and delete-before-forget ordering. Independently reran strengthened MOB-11.cjs: PASS for paused partial removal, foreign/plain/encoded traversal rejection, failed deletion retaining row/pointer then successful retry, and deferred pause overlapping cancel without late row/state recreation. Native filesystem bytes and cancellation scheduling remain device checks.

## MOB-13 — APPROVE

Auth epoch rejects A→B→A stale claims; serialized claim/purge/marker operations hold admission closed through storage awaits and signout cleanup. Transfers and offline quiz writes check admission epoch after awaits and use distinct file names. Independently reran strengthened MOB-13.cjs: PASS for ABA paused at get/purge/set, cleanup remove overlapping B login, and actual download manager admission invalidated by ABA. An already-dispatched storage write cannot be canceled, but newer claims wait for it and publish the final owner before transfers are admitted. Native cleanup durability remains unverified.

## MOB-14 — REJECT client completion; BACKEND DEPENDENCY

Owner filtering and failure retention pass strengthened MOB-14.cjs (all entity types, actual repeated remote failures, owner-constrained deletes and progress fail-closed). However, all pending queries select the oldest 50 with no backoff or exclusion: 50 permanent reading_progress dependency failures monopolize every pass and starve later quiz attempts. Add capped retry cooldown applied before LIMIT (or cursor scan to 50 eligible rows); a bounded in-memory map is sufficient without schema change, with restart only resetting timing. Also capture initiating session bearer, recheck auth epoch after its await and bind that bearer to each RPC/write: current pre-dispatch owner checks do not stop Supabase asynchronously obtaining a newer account bearer. Current tests stub dispatch and do not prove this bearer invariant. Progress intentionally does no non-atomic read/upsert and must remain a documented backend dependency until an authorized atomic max-progress operation is reviewed and deployed.

## MOB-17 — REJECT verification gap pending lifecycle coverage

Core paging fix is sound by inspection: immutable ID cursor/upper bound, bounded exact count reconciliation, page aggregation and latest-five selection. Independently ran MOB-17.cjs: PASS601 rows through250 cap including older best. New hook also handles auth subscriptions, request invalidation and mounted lifecycle, but test fixes authEpoch at0 and makes subscription a no-op. There is no stale deferred page across A→B→A/unmount, overlapping refresh, or count/page-error test. Those are material for cross-owner publication and truthful totals; add behavioral coverage before approval. No implementation defect found in that portion during this review. Snapshot isolation under concurrent insert/delete is not proven; count changes fail closed.
