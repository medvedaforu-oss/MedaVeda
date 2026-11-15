# Phase 1B dormant native control integration

Production NO-GO. No content, download, database or viewer operation is exported.
The registered bridge performs no storage/key initialization. Existing app code
imports none of this module. Local Expo autolinking will include the inert bridge
in a future native build; this is an intentional change from Phase 1's unregistered
source. No app/config/package/lockfile upgrade or prebuild is required here.

## Platform boundary

Locked source references: Expo 57.0.32 / Expo Modules Core 57.0.25 / React Native
0.86.3. Build metadata follows installed Expo modules. Discovery does not certify
native compilation. `capabilities()` always returns contentEnabled=false and
nativeAccepted=false. iOS platformSupported=false until its coordinator exists.
Android reports supported policy APIs only at API 28+; API 24–27 denies key/control
operations. API 26/27 have NIO but lack Keystore unlocked-device-required policy.
No optional fallback, software KEK or key-on-missing behavior exists.

Android harness-only `AndroidVaultControl.open(context, initializeNew)` uses
`Context.noBackupFilesDir/medveda-phase1b`, canonical paths, private permissions,
and an exclusive file lock. Normal open never initializes missing state. Explicit
initialization requires a new directory and a missing dedicated registry Keystore
alias. Failed/crashed initialization is preserved and blocked for explicit recovery;
there is no reset or delete command. Lock release and lease invalidation happen on
close. The Expo bridge shares its in-memory lifecycle gate but never opens it.

`AndroidKeys` generates 256-bit nonexportable Android Keystore wrapping keys with
GCM, no padding, randomized encryption and unlocked-device-required policy. Keys
are checked for device/user lock and challenge-readback. Hardware/StrongBox backing
is **not** asserted; provider/device behavior and lock races need instrumentation.
Each owner/epoch gets an independent random Kpdf wrapped by its own opaque KEK.
Unwrapped Kpdf exists transiently in native memory, never JS. JVM/provider copies
cannot be guaranteed zeroized. Kdb, learning storage and recovery keys are outside
this increment; no learning key is provisioned, changed or deleted.

## Registry and key lifecycle

`integration/Registry.kt` defines MVREG/1: magic `MVREG001` (8 bytes), uint64 BE
generation, 32-byte SHA-256 of the entire previous generation (zero for first),
12-byte provider-generated GCM nonce, ciphertext and full 16-byte tag. The first
48 bytes are AAD. Decrypted payload is Java DataOutput canonical full-state snapshot:
uint32 count; per entry modified-UTF owner (ASCII identifiers only), uint32 epoch,
modified-UTF 32-hex opaque alias and directory, uint8 state (0 pending,1 active,2
retired), uint32 envelope size and envelope. Modified UTF equals uint16-length ASCII
for these permitted strings. Pending envelope size=0; active/retired size=60.
Count<=1024, encoded generation<=1 MiB, maximum 4096 immutable generations.
Reaching limits denies mutation; no unreviewed compaction or silent reset.

An owner envelope is nonce(12)||AES-256-GCM(Kpdf(32))||tag(16). AAD is ASCII
`MVOWNER001:<owner>:<epoch>:<alias>:<directory>` using decimal positive epoch.
The per-owner KEK is distinct from the registry KEK. Opaque directory IDs are
reserved mappings only; no owner PDF directory or content file is created here.

Provision persists PENDING intent **before** key creation; then generates/wraps
Kpdf, performs AEAD readback, and persists ACTIVE. Failure retains PENDING and denies
that owner/epoch. Reopen authenticates every consecutive generation and chain link;
partial files are ignored, malformed finals deny, and no older generation is used
as fallback. A complete final whose acknowledgment failed is replayed, which is
safe because the caller never received an owner/content admission. Other owners
remain isolated. Missing/locked/corrupt keys never cause replacement. RETIRED is a
durable deny tombstone retaining encrypted material and KEK: secure deletion and
PDF purge require the later cleanup transaction and are **not implemented**.

`DurableGenerations` uses CREATE_NEW ciphertext parts, file force, atomic no-clobber
hard link and directory force. It retains encrypted parts and old generations.
Directory creation forces both new directory and its parent. Any publication
uncertainty poisons live registry reads/writes until authenticated reopen. An OS
file lock is required around the controller lifetime; shared host tests use one
coordinator. No API promises hostile-process filesystem safety or resistance to
whole-directory snapshot rollback/truncation of a valid tail. Disk pressure,
retained parts and exhausted bounds block rather than erase recovery evidence.
Physical power-loss behavior remains a device gate.

## Native leases

`NativeLeases` accepts only native AutoCloseable resources and native tickets,
permits one attachment, revokes admission before disposal and retains failed
resources for retry. Cleanup failure blocks subsequent claims. Android module
background/activity destruction/module destruction invalidates the shared gate.
No plaintext file is materialized, URI exposed, renderer attached or viewer cache
swept. Lock broadcast observation, process/activity edge cases, renderer/fd disposal,
startup sweep, deferred protected-data deletion and the <=1-second stalled-JS
requirement remain gates. These hooks alone do not satisfy view acceptance.

## iOS preparation

`MVPDFVerifier.swift` independently implements bounded streaming MVPDF/1 verification
with CryptoKit, exact expected metadata, chunk sequence, final manifest/digest and
EOF validation. Admission is supplied by future trusted native coordination. There
is no writer, plaintext output, registry coordinator or enabled viewing capability.
`KeychainKeys` provides explicit opaque-alias creation and lookup using
WhenUnlockedThisDeviceOnly, non-synchronizable items; no update/delete/fallback.
Its caller must implement durable PENDING/ACTIVE publication before use. Swift
bridge stays unavailable and does no key/file work. Protected-data/scene lifecycle,
backup exclusion, durable Swift registry and writer parity remain unimplemented.

`ios/Tests/reference.mvp` is a 285-byte synthetic deterministic fixture from the
existing independent Node codec, SHA-256
`a3dcf01a15697030b0c8780c33715c4f0846a565e6a0fb74358ae1b5b3d114f4`.
Its root key is 32 bytes of 0x42; metadata owner-a/note-1/version 3/length 5/epoch 1/
identity sha256:synthetic-v3; plaintext `%PDF-`. This fixture is not sensitive.
XCTest covers its digest, every-byte mutation/truncation, trailing data and revoked
admission. No Swift/XCTest execution or Swift interoperability PASS is claimed.

## Verification commands

New shared-control suite only (does not repeat foundation tests):
`python3 mobile-app/modules/medveda-offline-vault/tests/phase1b/run-tests.py`.
It compiles actual shared Kotlin with cached 2.1.20, synthetic host JCA keys, and
host NIO. Three separate JVM process-halt/reopen cases cover journal file force,
link and directory force. These are not native device power-loss tests.

Android instrumentation source uses the platform AndroidTestCase/runner, no new
test-library dependency. Run only in an isolated synthetic debug harness after
SDK compatibility compilation. It uses unique test aliases/no-backup directories
and deliberately retains synthetic artifacts; never point it at a real app vault.
Native tests have not run. No release build is authorized.

Native acceptance requires actual locked Android/iOS builds and device testing;
see the incremental report for every remaining gate. No pre-existing file/data
migration or deletion, SQLCipher enablement, application activation, deployment,
payment/Firebase/signing/financial operation is part of this increment.
