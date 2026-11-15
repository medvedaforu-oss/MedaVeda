# Dormant native encryption foundation

**Not connected to the application. Not a release-ready Expo module. Production NO-GO.**

This Phase 1 increment implements only the independently executable Kotlin/JCA
format, owner-session admission and host filesystem foundation. There is no
`expo-module.config.json`, package installation, autolinking or app import.
Existing downloads, SQLite, quiz/outbox records, licenses and payments are untouched.

Read [FORMAT.md](FORMAT.md) and the [Phase 1 plan](../../../docs/superpowers/plans/2026-11-11-native-encryption-phase1.md).
The complete native encryption specification lives in
[the design](../../../docs/superpowers/specs/2026-11-11-native-offline-encryption-design.md).

Run from repository root:

```sh
python3 mobile-app/modules/medveda-offline-vault/tests/run-host-tests.py
```

The offline runner compiles actual Kotlin using cached Kotlin 2.1.20 artifacts,
tests with host JCA under `-Xmx48m`, validates an independent Node built-in crypto
codec in both directions, and halts/reopens separate JVMs at publication boundaries.
All files are synthetic under fresh `/tmp` directories. No Gradle/native release
build, app launch, network, npm install or real device-data access is involved.
Compiler cache is required; the runner does not download dependencies.

`OwnerKeyProvider` is lookup-only. Test keys live in the test process. A missing
key produces a safe generic failure; there is no replacement-key or plaintext
fallback. Core callers are trusted native code: `claim` does not authenticate a
user or establish an entitlement. No plaintext extraction/view API exists.

`AtomicVault.create` requires a new dedicated absolute directory and fails if
it already exists. `open` accepts only a dedicated marked directory. Outputs use
random IDs, CREATE_NEW parts and no-clobber immutable publication. Only the current
call's newly created part link may be removed after commit. Errors leave encrypted
artifacts for explicit future reconciliation; no directory scanning, sweeping,
overwrite, migration or recovery import occurs. Final directory-flush failure
can leave valid orphan ciphertext despite a failed call; retry is a fresh attempt.
This is not a database transaction or whole-device rollback defense.

The host NIO adapter requires Android API 26+ if eventually compiled into Android;
API 24/25 need a validated native adapter or capability denial. It relies on
app-private trusted directory ownership; hostile same-process directory renames
are outside the contract. Platform durability/backup/permissions must be proven
on device, even though host fsync/failure/process-halt tests pass.

Still required before full Phase 1 acceptance: Android/Expo bridge compilation,
Keystore key provisioning/registry and loss/lock behavior; Swift/CryptoKit/Keychain
implementation and shared vectors; authenticated durable registry/journal
recovery; native lifecycle admission and dedicated view-lease cleanup; private
no-backup directory provisioning and real-device evidence. They were not implemented
speculatively because this host lacks usable Android SDK and Swift tooling.
HTTP acquisition, license/application activation, all legacy migration, SQLCipher,
quiz/outbox changes and native viewing belong to later approved phases.

No automatic rollback action is installed. Reverting this additive dormant source
has no application data consequence. Future activated formats must retain a
compatible encrypted reader and must never downgrade to plaintext storage.

## Phase 1B increment

The original Phase 1 description above records the prior unregistered foundation.
[Phase 1B](PHASE1B.md) adds an **inert registered Expo control bridge**, Android
Keystore/control adapters, a shared encrypted journal and native resource leases,
and an unverified Swift verifier/Keychain preparation. The original `core/` is
unchanged. No existing download or viewer flow imports or invokes this module.
Content remains disabled, native acceptance remains pending, production NO-GO.
Run the **new** focused suite with
`python3 mobile-app/modules/medveda-offline-vault/tests/phase1b/run-tests.py`.

## Dormant content acceptance increment — 12 November 2026

[Content components and remaining gates](CONTENT_ACCEPTANCE.md) add a native
content journal/coordinator, strict HTTPS adapter, explicit non-destructive legacy
import, native temporary-view workspace and Android PdfRenderer lease adapter.
The application remains unconnected and capabilities remain false. Shared host
verification is separate from the blocked Android SDK compilation/device gate.
