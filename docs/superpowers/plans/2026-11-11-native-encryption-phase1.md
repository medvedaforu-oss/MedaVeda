# Native encryption Phase 1 implementation plan

> **For agentic workers:** Use superpowers:executing-plans; implement inline, then obtain the separately requested independent security review. Do not execute later phases.

**Goal:** Add a dormant, independently executable native encryption core without connecting it to existing app storage.

**Architecture:** Kotlin/JCA core accepts native streams and an owner-key provider, authenticates bounded records, and publishes only verified ciphertext into a caller-created dedicated test vault. No Expo autolinking, application imports, OS key provisioning, HTTP, viewer, DB or migration integration in this increment.

**Tech Stack:** Cached Kotlin compiler/stdlib 2.1.20, JDK 21.0.12.1 host tests targeting JVM 17; JCA AES/GCM/NoPadding, SecureRandom, SHA-256. No added third-party runtime dependencies. Platform providers are OS-version-specific, not separately pinned libraries.

**Spec:** [native offline encryption design](../specs/2026-11-11-native-offline-encryption-design.md).

## Global constraints

- Phase 1 only. Existing PDFs/DBs/quiz/outbox/license behavior untouched. No migration, overwrite, delete or invalidation of existing app records.
- SQLCipher remains disabled; no frozen dependency, manifest, lockfile, payment, signing, Firebase, runtime/channel or production change.
- Production remains NO-GO. No native release build/deployment. No current-app activation.
- 256 KiB chunks, 100 MiB maximum, <=64 KiB metadata; AES-256-GCM, 96-bit nonce, 128-bit tags; random DEK/file UUID per attempt.
- Test builds/output live in /tmp. Only additive new module-core files, tests, runner and documentation are delivered.

## Verified dependency and compatibility boundary

Installed versions match mobile lockfile: Expo 57.0.32; expo-modules-core 57.0.25; RN 0.86.3; SecureStore and SQLite 57.0.4; PDF 7.0.4; blob-util 0.24.10. Exact SDK 57 reference and current Expo Modules reference were read. RN catalog declares Kotlin 2.1.20, AGP 8.12.0, minSdk 24, compile/target 36. No host build of this combination is claimed.

This host lacks usable Android platform/build tools and Swift. Only Kotlin/JVM compilation and native-JCA behavior can be verified here. The core's java.nio filesystem adapter requires Android API 26+ when eventually integrated; API 24/25 require a separately validated adapter or fail-closed capability denial. iOS implementation, Keystore/Keychain adapters, Expo module bridge/autolinking, native directory fsync behavior and real-device tests remain blocked. Do not write speculative uncompiled platform adapters or label this complete Phase 1 acceptance. No HTTP dependency is introduced; catalog OkHttp 4.9.2 is not a verified resolved runtime pin and is not used.

## Encryption/key decisions

Freeze explicit MVPDF/1 framing in a module format document before coding. Native owner root keys are supplied via a provider and never persisted/exported by the core; missing/locked key errors propagate as safe failures. Production provider must later use Keystore-wrapped random 32-byte Kpdf / device-only non-synchronizable Keychain, separately from Kdb and existing license keys. This increment uses process-memory test keys only, never SecureStore or platform aliases. Never auto-provision replacement keys on read/failure.

New random 32-byte DEK each write; root-key wrapping uses provider-generated random 96-bit nonce; data uses fresh random 32-bit file prefix plus uint64 counter (0 metadata, 1..N chunks, N+1 manifest). Wrap and data use different keys and domain-separated AAD; owner/note/version/length/key epoch/file ID bound. Restrict to canonical ASCII identifiers in v1 for deterministic encoding. Authenticate full file before returning any consumer-visible verification result. Reader has no plaintext file/output API in this increment. Final hash/chunk count/length and no trailing bytes required. Account revocation is serialized against publication; stale operation cannot publish.

## Budgets copied from specification

Core/network/decrypt working buffers <=4 MiB; at most two 256 KiB chunks queued. Transfer PSS growth <=32 MiB; JS heap growth <=5 MiB; 10-to-100 MiB transfer PSS increase <=8 MiB. Viewer delta <=128/192 MiB low/normal, absolute <=256/384 MiB. Android metric PSS; iOS physical footprint. Native lifecycle cleanup <=1 second (locked-I/O exception as specified). No device measurements are claimed in this phase.

| MiB | Low cold median/p95 | Low warm | Normal cold | Normal warm |
|---|---|---|---|---|
| 1 | 2/3 s | 1.5/2 s | 1/2 s | 0.8/1.5 s |
| 10 | 3/5 s | 2.5/4 s | 2/3 s | 1.5/2.5 s |
| 50 | 8/12 s | 7/10 s | 4/7 s | 3.5/6 s |
| 100 | 14/20 s | 12/18 s | 8/12 s | 7/10 s |

All values upper limits. 10 cold + 10 warm opens per size/device, 160 minimum Android opens; p95 nearest rank 10 of 10. Controlled encrypted throughput >=50% baseline and >=5/10 MiB/s low/normal over 10 transfers per cell. Tests here stream synthetic 1/10/50/100 MiB payloads with no full-file buffer; host timings/heap are diagnostics, not device budget acceptance.

## Rollback and preservation

No application imports or module registration: removing/reverting additive foundation source disables it without affecting existing files/keys. Failed writes leave ciphertext-only uncommitted parts; no automatic cleanup/sweep of any directory. Existing committed destination is never overwritten. Publish a new immutable random ID only after full authentication + fsync; use atomic no-clobber hard-link publication followed by directory flush, equivalent commit semantics to same-volume rename but without ATOMIC_MOVE replacement ambiguity. Unsupported hard links/directory fsync fail closed. A failure after link can leave a valid orphan: never report completion without directory flush; subsequent verification may reconcile explicitly. No DB completion claim is exposed. Later migration rollback remains compatible encrypted reader/forward fix, never plaintext conversion.

## Review focus

1. Missing/wrong owner key and tampered metadata must never fall back or create a key.
2. Truncated/reordered/duplicated records and malicious lengths must fail before publication with bounded reads/allocations.
3. Revocation racing with seal/publication must reject stale work.
4. Interrupted/fsync/disk failure must leave no plaintext and preserve prior committed outputs.
5. Relative paths, symlink roots/inputs and destination collisions must not escape the dedicated vault or overwrite existing files.

## Tasks and verification

### Task 1: executable failure-first contract tests and binary format

Create `mobile-app/modules/medveda-offline-vault/FORMAT.md`, `tests/FoundationTest.kt`, and `tests/run-host-tests.py`. Runner uses cached Kotlin 2.1.20 artifacts, no network/package installation, temp compiler outputs, host JCA; test state only under a newly created /tmp directory.

- [x] Write tests for actual container, state and file behavior; use an independent fixed Node AES-GCM wire fixture, independent expected metadata, no plaintext persist, bounds and all record-tamper classes.
- [x] Run runner before implementation and record missing-foundation failure; distinguish compilation RED from executed behavioral RED. Add later behavioral REDs against implemented core as new failure cases emerge.

### Task 2: native record codec, epochs and owner keys

Create `core/VaultModel.kt`, `core/PdfContainer.kt`, `core/AtomicVault.kt`. Interfaces: `OwnerKeyProvider.key(owner, epoch): SecretKey` (throws if absent); `OwnerSession.claim(owner): Ticket`, `revoke()`, `check(ticket)`, `commit(ticket, action)`; `PdfContainer.write(input, output, metadata, ownerKey, ticket, session)` and `verify(input, expected, ownerKey, ticket, session): VerifiedPdf`; `AtomicVault.seal(input, metadata, ticket): String`, `verify(id, metadata, ticket): VerifiedPdf`. No public decrypt/output API, migration, URL or DB APIs.

- [x] Implement smallest core satisfying tamper/nonce/metadata/state tests; validate lengths/identifiers before allocation, full final manifest, no source path parameters.
- [x] Compile/run tests and record executed green, with JVM limits; add bounds/corruption/epoch failure regressions before fixes.

### Task 3: crash-safe dedicated test vault

- [x] Test short/faulting stream, all durable-write boundaries, stale session at commit, no-clobber, symlink/namespace confinement and existing sentinel preservation.
- [x] Implement file adapter with new dedicated vault path, ciphertext-only writes, full verify before link publication, fsync and no overwrite; propagate safe generic errors without secret content. No directory sweep/delete/auto-recovery API.
- [x] Run generated streaming 1/10/50/100 MiB tests, nonce uniqueness over multiple attempts and owner transitions, truncation/tamper and filesystem failure suite.

### Task 4: independent security review and handoff

- [x] Fresh security reviewer inspects source/format/tests; classify findings. Fix substantive findings with focused RED/GREEN tests and rerun suite.
- [x] Verify existing source/config/package hashes against pre-work baseline; inspect additive-only diff; no app/runtime activation.
- [x] Save commands/results, preservation comparison, review findings and unresolved native/device gates in `docs/audit/native-encryption-phase1-20261111/REPORT.md`. Phase 1 runtime integration/secure-key/device acceptance is not certified. Stop here.

## Execution rulings

- User authorized conditional implementation plus independent review; no additional design-approval round or later-phase work.
- Existing checkout is dirty main with read-only git metadata. Keep changes additive in a dormant new module directory and test in /tmp rather than create/move branches or disturb unrelated work. No commit/stash/reset.
- Scope narrowed to independently executable Kotlin core because native SDK/Swift/device proof is unavailable. Do not claim OS key management or full Phase 1 complete. No autolinking/configuration or TypeScript app facade that could accidentally activate incomplete storage.
- Independent format-level Node/JCA interoperability vectors replace a primitive-only NIST wrapper test: they exercise this codec's actual AAD/nonce/framing in both directions. Node is host-only and adds no application dependency.
- Final evidence: 22 groups, Node verification and four forced JVM-halt/reopen boundaries pass; two independent-review findings fixed. Existing 312-file preservation baseline is unchanged. See the report for complete remaining native gates.
