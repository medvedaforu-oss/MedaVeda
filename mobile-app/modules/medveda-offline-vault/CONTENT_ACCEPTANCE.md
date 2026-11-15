# Dormant Android PDF content acceptance components

**Not activated. AUD-008 PARTIAL; Android acceptance BLOCKED.**

The Expo bridge still exports only capabilities/invalidate. Both `contentEnabled`
and `nativeAccepted` remain literal `false`. No app downloader, viewer, auth,
SQLite, quiz or legacy data path invokes the new content coordinator. No JS
caller may construct a trusted permit or select a native host/path.

`ContentCoordinator` joins the existing `VaultAcquisition` and immutable
`AtomicVault` with `ContentJournal`. A completed record is published only after
MVPDF full authentication/digest verification and final owner, expiry and source
checks. Native HTTP cancellation and final journal publication share a monitor;
owner revocation and completion share `OwnerSession.commit`. Failed acknowledgement
poisons live journal state until authenticated reopen. Encrypted orphan blobs and
parts are retained. There is no auto-eviction, reset, key replacement or fallback.

`ContentJournal` uses a distinct `MVCAT001` AAD domain with the existing registry
wrapping key. Each generation is magic(8), sequence uint64 BE, previous SHA-256(32),
then provider nonce(12), AES-GCM ciphertext and tag(16). Payload is DataOutput:
entry count uint32; each entry is modified-UTF file ID, owner, note, version uint64,
length uint64, key epoch uint32, modified-UTF identity and revoked boolean. IDs and
metadata use the existing bounds, max 1024 entries, 1 MiB generation and 4096
generations. Reopen authenticates every consecutive final; incomplete parts are
ignored. Corruption/missing interior generations deny; it cannot detect removal of
a complete valid tail or whole-directory rollback. Keys are lookup-only.

Native HTTPS acquisition accepts only a configured HTTPS host, default/443 port,
no user info/fragment, status 200, identity encoding and matching supplied length.
It rejects redirects and never uses OS download tasks/resume persistence. Timeouts
and disabled connection caching are explicit. The signed URL stays in native
memory. Host tests use fake HttpsURLConnection; real Android cache, TLS, cookie,
proxy and cancellation behavior still require device verification.

Viewing authenticates the entire file before materialization, then authenticates
again while writing a new mode-0600 temporary file in a mode-0700 marked workspace
under the controller's no-backup root. No renderer attaches until complete. The
workspace is retained by `NativeLeases` before any plaintext creation. Disposal
closes renderer/descriptor before removal and retries partial cleanup idempotently;
failure blocks new admission. Ticket-bound release prevents a late old close from
disposing a newer view. Startup sweep touches only validated `.view` entries in
this marked workspace; unknown files/symlinks block recovery. Existing PDFs,
quizzes, registry generations and databases are never swept.

`AndroidContentControl` is a native acceptance-harness entry obtained from
`AndroidVaultControl.prepareContentForHarness`; it is not an Expo API. It uses
existing API-28+ Keystore policy, canonical no-backup paths and the parent's OS
lock. Initialization is explicit and new-only; partial initialization is preserved
and requires recovery investigation. It adds screen-off invalidation alongside
existing native background/activity invalidation. `AndroidViewLease.close()`
disposes the entire workspace; bounded PdfRenderer bitmaps have caller-owned
lifetimes. No stalled-JS timing, bitmap-screen disposal, reboot, Keystore/OS lock,
16 KB library or app UI result has been accepted.

Legacy import is explicitly requested by trusted native code with a current
owner/note/version/length/SHA-256 permit. Every byte must match. It creates a new
ciphertext/catalog entry and leaves the source byte-identical on success/failure.
Unknown ownership, old timestamps, filenames and local hashes cannot issue a
permit. There is no directory scanner, automatic conversion, cleanup of legacy
originals or DB migration. Retained originals remain plaintext; import is not a
claim of complete device encryption or a final migration rollout protocol.

Remaining activation requirements: native authenticated permit/license issuance
and validation (the current server returns only URL/TTL); production Auth/owner
binding and seven-day/rollback/revoke policy; actual app downloader and native
viewer integration without plaintext/capability persistence; data-conserving legacy
and learning-storage ownership handling; Android build/instrumentation/physical
acceptance. No boolean or environment flag is an approval mechanism.

Run from repository root:

```sh
python3 mobile-app/modules/medveda-offline-vault/tests/content/run-tests.py
```

This compiles shared Kotlin with cached Kotlin 2.1.20, uses host JCA/NIO and a 48 MiB
heap, and forces three JVM publication halt/reopen boundaries. It does not compile
Android adapters. `ContentSecurityTest.kt` is additional instrumentation source,
uncompiled/unexecuted until the Android SDK and isolated device harness exist.

See the full result, input requirements and acceptance checklist in
[the 12 November report](../../../docs/audit/MEDVEDA_AUD008_FINAL_ANDROID_READINESS_2026-11-12.md).
