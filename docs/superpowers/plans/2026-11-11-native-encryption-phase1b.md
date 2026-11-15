# Native encryption Phase 1B implementation plan

> Execute inline with test-driven development and an independent final security review. This continues the user's authorized dormant Phase 1 implementation; no activation, dependency installation, release, migration or destructive operation.

**Spec:** `docs/superpowers/specs/2026-11-11-native-offline-encryption-design.md`, bounded by the Phase 1B request.

**Architecture:** Preserve `core/` byte-for-byte. Add a platform-independent control layer for an encrypted append-only registry and two-phase owner-key provisioning. Android binds it to Keystore and app-private no-backup NIO storage on API 26+. Register an inert Expo bridge exposing capability/epoch invalidation only, without a JS claim/provision/file API. Prepare Swift Keychain/CryptoKit primitives and a strict MVPDF/1 verifier; iOS remains capability-denied until native acceptance.

**Choices:** API 24/25 denial avoids unverified NIO substitution. Immutable authenticated generations preserve prior registry states instead of replacing a single file. Pending intent precedes key creation; recovery blocks pending owners and never creates replacements. Revocation tombstones keys without deleting them. New platform sources cannot constitute compatibility PASS without a real SDK compile. Native view leases currently own resource disposal only; no plaintext materialization or viewer integration is authorized here.

## Global constraints

Expo 57.0.32, Expo Modules Core 57.0.25, RN 0.86.3 and every package/lockfile remain unchanged. MVPDF/1 remains unchanged. No old PDF/DB/WAL/quiz/outbox/license/provider data access. SQLCipher remains disabled. No app flow imports. Production NO-GO.

## Review focus

- Missing/corrupt registry or key after restart must deny, never reset or regenerate.
- Interrupted key creation must retain durable pending intent and isolate other owners.
- Publication failures must poison the live registry until authenticated reopen.
- Native invalidation must revoke admission before disposing resources; disposal failure blocks readiness and retries.
- Autolinking and API availability are distinct from native compilation and device acceptance.

## Tasks

1. Add `integration/Registry.kt`, `OwnerKeys.kt`, `NativeLeases.kt` and focused synthetic host tests under `tests/phase1b/`. First run missing-symbol RED, then exercise tampering, discontinuity, key loss, pending recovery, owner isolation, lifecycle and publication faults. Do not rerun the unchanged foundation suite.
2. Add Android Keystore, durable generation store, no-backup controller and inert Expo module in `android/`; add registration/build metadata and an unimported typed facade. Add instrumentation tests for actual Keystore and native filesystem recovery. Attempt offline compile only; report exact tooling blocker.
3. Add Swift Keychain/CryptoKit and interoperable MVPDF/1 verification plus XCTest vectors. Native tests remain unverified when Swift/Xcode are unavailable; capability remains denied.
4. Run only the new focused suite, locked autolinking discovery, metadata/facade checks and preservation comparison. Obtain independent security review of new files, address substantive findings and document evidence and remaining native/device gates in the incremental report.

No commits are necessary in this dirty shared checkout. Preserve evidence of test commands, failures and limitations. A host test of shared control logic is not Android/iOS acceptance.
