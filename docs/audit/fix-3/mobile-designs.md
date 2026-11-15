# Mobile v1 policy and external acceptance

Release mode: **free-only**. Build/provider flags are unchanged; videos and MCQs remain free, purchases remain disabled. No paid-notes rollout is authorized.

## MOB-02 / B03

**BLOCKED: two verification failures; attempted guard reverted.** Root cause confirmed: transferDownload obtains an entitled URL and writes persistent plaintext PDF bytes. Disabling sales does not prevent historical owners downloading paid notes. An attempted offline-purpose guard passed its targeted test, but broader regression verification failed first on redundant URL issuance, then on revoked-resume error handling. Under the owner's two-failure cap, the attempt was stopped and only this session's changes in downloadManager, secureNotesService and offlineNoteAccess were removed. Earlier owner fixes remain intact.

The intended free-only policy is **no paid-note downloads in v1**, but this checkout does not yet enforce that policy. It must not be described as compliant or release-qualified. The retained targeted test now fails and proves the unresolved path. No dependency or vault was activated. Do not ship historical paid-note offline acquisition without a reviewed guard or the full qualified vault below. Website copy no longer advertises buying; it makes no unsupported claim that note download has been disabled.

Before paid notes: owner/content/revision-bound server acquisition permits and offline licenses; native HTTPS streaming directly to authenticated ciphertext, never encryption after plaintext download; bounded private viewer workspaces with crash/logout cleanup. Preserve seven-day license and clock-rollback rules, durable interrupted legacy-cleanup/re-download journal, refund/revocation enforcement and wrong-owner denial. Qualify both platform implementations and binary behavior before replacing the guard.

## MOB-07: fixed hosted bridge per build

Resolve the exact build's scheme with dotenv disabled from Expo config. Production is `medveda`; staging uses app.config.js's resolved profile-specific scheme, not one guessed from its package. Navigator/store already share the scheme. The repaired legacy bridges target production **medveda://reset-password**, consume fragment callbacks only, and do not serve staging builds.

1. Inventory all hosted/custom-domain/legacy reset aliases and deployment roots. Separate fixed-origin bridge paths per build; never select native schemes from URL parameters.
2. Owner deploys the reviewed production bridge and a separately fixed staging bridge matching its binary. Scrub fragments synchronously, keep credentials in memory, hand off only on a real tap, and exclude them from DOM/storage/analytics/logs.
3. Owner adds exact HTTPS bridge redirects in each environment's Auth allowlist, avoiding broad wildcards. Preserve the working production callback while validating profiles. No allowlist changed here.
4. Fresh staging reset email: cold/warm Gmail/browser, signed-out and A-to-B, MFA, expired link replaced by fresh link. Exact binary receives its callback and controller survives session import.
5. Rollback: previous qualified fixed bridge/allowlist entry; never vulnerable legacy HTML. Keep generated controller/binary compatible.

## MOB-08: background mutes — DESIGN ONLY

Foreground presentation consults preferences. Background OS presentation precedes JavaScript suppression. Persist category preferences per authenticated owner with owner-only RLS and version ordering; specify unknown-category defaults. Resolve current token ownership and preference immediately before dispatch, including scheduled jobs. Never persist targeted text in the public broadcast table. Background delivery preferences and broadcast-feed visibility need distinct contracts. Stage muted/unmuted/unknown categories with app killed and token reassignment. No sender rollout occurred.

## MOB-12: authenticated session envelope — DESIGN ONLY

V2 AES-CTR is unauthenticated. No crypto dependency/code changed. SDK57 candidate: native expo-crypto AES-GCM, https://docs.expo.dev/versions/v57.0.0/sdk/crypto/ . Resolve the compatible package through Expo's installer during a separate implementation; no version is assumed here.

V3 strict bounded schema: version 3, algorithm A256GCM, random generation identifier, 96-bit nonce, ciphertext, 128-bit tag. Fresh 256-bit key per generation; canonical AAD binds app/domain separator, storage key, version, algorithm and generation. Keys stay in immutable SecureStore generation names. Per-key serialization: persist key first, publish complete envelope as commit point, then remove old key. Ambiguous publication retains both keys until restart resolves the published envelope. Locked/unavailable keystore does not erase storage. Removal unpublishes blob before best-effort key cleanup. Unknown/malformed v3 never downgrades to CTR. Never log keys, session content or envelopes.

Legacy/v2 migration requires a fresh server-authenticated refresh before publishing v3. Offline migration defers while preserving old storage; JSON parsing does not authenticate CTR. Test independent nonce/tag/AAD/key/generation/version tampering, cross-storage-key substitution, publication interruption, concurrent read/write/remove, locked keystore and actual Android/iOS restart. AEAD does not prevent replay of an old valid envelope; server revocation remains authoritative. See also mobile-fix-2/after/MOB-12.md.

## MOB-14: monotonic progress RPC — DESIGN ONLY

The client retains progress outbox rows with dependency backoff and never performs a non-atomic upsert. Migration search finds **no server reading_progress or watch_history table**. The generic outbox payload does not establish page/percentage/position units, content-revision binding or reset semantics. Wiring an invented table/RPC could reinterpret existing offline activity. Leave progress dispatch disabled under the owner's explicit safe fallback.

Required new migration after the contract is approved:
- Unique owner/content/revision key, bounded finite normalized progress; user_id derives only from auth.uid(), never caller-supplied owner.
- `sync_max_progress(p_content_kind,p_content_id,p_content_revision,p_progress)` returns authoritative normalized progress. SECURITY DEFINER only if required to avoid recursive publication/owner lookup, fixed `search_path=pg_catalog,public,pg_temp`, PUBLIC/anon EXECUTE revoked, authenticated granted. Reject missing auth/profile, blocked/revoked/unpublished content and invalid/out-of-range/NaN numbers before writes.
- Atomic `INSERT ... ON CONFLICT ... DO UPDATE SET progress=greatest(existing.progress,excluded.progress)`. RLS owner SELECT; no direct student writes. Any future UPDATE policy needs both USING and WITH CHECK bound to auth.uid(). No caller owner reassignment.
- Reset/delete is a distinct generation-bound operation; stale monotonic replays cannot restore deleted/reset progress. Decide content-revision normalization explicitly.
- Disposable SQL tests: concurrent high/low writes, replay, foreign/missing JWT, blocked/revoked content, invalid numbers, reset-generation ordering, publication races and old revisions. Then client uses captured-owner bearer/epoch guards; missing RPC (PGRST202/undefined function) retains row and dependency backoff without read/upsert fallback. Acknowledge only authoritative success.

No executable migration is fabricated for an unresolved data contract. Owner decisions: units, content/revision identity, reset/delete behavior, and “furthest position” versus “last read” wording.

## MOB-17 bounded lifetime statistics

At most 5,000 verified attempts use exact count/stable-ID cursor/lifecycle guards. Larger histories return an explicit error before page reads; no sample is labeled lifetime totals. Server aggregate remains DESIGN ONLY: exact count, sum/mean, max, latest five and legacy count from one statement/snapshot with auth.uid() binding and blocked-user rules.

## Exact device checks

- Recovery signed-out/A-to-B, cold/warm, pending import replaced by fresh link, MFA/cleanup; build-specific bridge and allowlist.
- Historical Play restoration in disabled-sales binary, checkout denied; lost callback at 30s then late success, blur/restart and A-to-B-to-A.
- Swipe archive under gesture root; foreground category mute; failed logout permits same-owner push retry without stale-owner registration.
- Pause/cancel overlap, failed deletion then retry, traversal rejection, account-switch admission fencing; after a future fix, new/resume/retry paid note produces no URL/PDF and old local paid note obeys the approved policy; quiz offline still works.
- Ring 0/1/25/50/51/75/100%; keyboard/landscape/large-text reset/MFA; support-link failure fallback.
- Inject failed SQLite outbox insert: both result/outbox roll back. Kill/relaunch around commit then reconnect: exactly one verified attempt. Search free-preview/completed-download badges and unknown reachability behavior.
