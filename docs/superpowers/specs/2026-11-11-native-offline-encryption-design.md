# MEDVEDA / AyurPulse — native offline encryption design

Date: 11 November 2026 UTC. **PROPOSED; awaiting approval. Production remains NO-GO.**

This is a design and minimal implementation sequence, not authorization to implement, install packages, rebuild, publish, migrate real devices, or change production. No device acceptance is claimed. The recommended choices and numerical budgets below are proposals for approval.

## 1. Scope and existing evidence

Read [final local blocker report](../../audit/final-local-blockers-20261111/REPORT.md) and [release gates](../../RELEASE_GATES.md). Treat the report's completed SecureStore license change as the current baseline; the older license wording in RELEASE_GATES does not undo it. Retain its seven-day expiry, clock-rollback denial, server-only trust creation, invalidation tombstones, and cleanup failure/retry behavior. Do not repeat completed audits or rewrite that service as part of this design.

Source observations used to place the design, not new audit certification:

| Current path | Relevant boundary |
|---|---|
| `mobile-app/src/utils/downloadManager.ts` | Legacy Expo DownloadResumable writes PDF plaintext before validation; SQLite stores source URLs; AsyncStorage stores resumable request state. Existing JS operation/generation guards need native counterparts. |
| `mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx` | Both remote HTTPS and local file URIs reach react-native-pdf. `cache:false` cannot certify native cache cleanup. Installed package's JS wrapper downloads remote PDFs into cache `.tmp` and `.pdf`; local file URI takes a direct path. |
| `mobile-app/src/config/database.ts` | Singleton unkeyed `medveda_offline.db`, WAL, five tables; local quiz/history/bookmark/progress rows lack owner columns. `resetDatabase()` deletes learning/outbox data and must not be used for migration/logout. |
| `mobile-app/src/services/quizAttempts.ts` | Answer insert and outbox enqueue are separate operations. Migration must preserve both existing states; future writes need one transaction. |
| `mobile-app/src/services/syncEngine.ts` | Outbox includes owner in some payloads; malformed payloads and exhausted non-quiz retries can currently be marked synced. Do not run this drain during migration; new preservation semantics must park failures instead. |
| `mobile-app/src/services/authState.ts`, `mobile-app/App.tsx` | Owner claim/cleanup is asynchronous; startup currently opens DB before owner hydration. Replace offline readiness ordering and isolate learning storage before any repository/sync access. |

No payments, financial rows, production services, frozen packages/lockfiles, signing keys or Firebase credentials may be changed under this proposal. Payment recovery-context, referral/session encryption, general activity metadata and unrelated advisories remain separate open work. Passing this design's tests alone never opens production.

## 2. Approaches and recommendation

1. **Recommended:** an app-owned Kotlin/Swift Expo module for streaming AEAD files, secure key handles, durable publication and native view leases; existing expo-sqlite compiled with SQLCipher for learning data. Reuse react-native-pdf only with a validated local lease. Small explicit native surface; requires native builds, migration work, and security review of the file format.
2. Established streaming-AEAD library plus custom downloader/view lifecycle integration. Reduces bespoke crypto framing if one library provides authenticated chunk order/finalization on both platforms. Tink/platform-specific alternatives require a separate cross-platform format/dependency assessment; no compatible drop-in dependency has been proven in this checkout. Adoption would require revising the approved format/tests.
3. Encrypted random-access renderer/provider. Avoids full temporary plaintext and can improve first-page latency, but requires a new PDF renderer integration on both platforms, including seek semantics. Defer unless the temporary-file route fails cleanup/performance acceptance.

Whole-file JS/base64 encryption, post-download encryption, the installed blob-util transformer, and SQLCipher-plugin-only conversion do not meet the requirements. Installed blob-util explicitly selects full-response memory buffering for transformation. Do not change frozen dependencies to try these approaches.

V1 deliberately restarts interrupted PDF transfers with a fresh authorization. Resume UI must say “Restart download”; no opaque platform resume blobs. True HTTP range continuation is a later phase, not a prerequisite for safely shipping encrypted offline storage.

## 3. Security invariants and limitations

- Every new PDF network byte that reaches app-managed persistent storage is already authenticated ciphertext. HTTP caches, OS download managers and native viewer remote downloads are excluded from the transfer path.
- A final PDF is visible only after all chunk tags, ordering, exact byte count and authenticated completion manifest validate. No partially verified plaintext reaches the renderer.
- A signed URL is a capability, not ownership evidence. A file key is also not a license. Every open still requires the existing owner/license policy.
- Account B cannot list, open, mutate or sync A's learning data, PDFs, temporary leases or recovery records. Auth transitions revoke native handles before opening B's namespace.
- No migration, logout, retry limit, malformed record, missing key or disk-full error automatically destroys unsynced learning records.
- Missing/wrong keys never trigger an empty replacement DB, plaintext fallback, or “migration complete”.
- Protect extracted app files and casual shared-device access. Rooted devices, a compromised app process, screen capture outside existing controls, OS snapshots, flash remanence and malicious full-device rollback are outside the guarantee. Authenticated files do not provide hardware anti-rollback or immediate offline refund/revocation awareness.
- Existing plaintext can exist while its upgrade migration is incomplete. Such an installation is not encryption-complete and cannot claim acceptance. Unlinking files cannot certify physical flash erasure.

## 4. Native dependencies and Expo compatibility

Observed installed versions: Expo 57.0.32, RN 0.86.3, expo-sqlite 57.0.4, expo-secure-store 57.0.4, react-native-pdf 7.0.4, react-native-blob-util 0.24.10. Manifests use compatible ranges in several places; use the exact locked tree for later experiments.

| Component | Proposed dependency / integration | Compatibility gate |
|---|---|---|
| Native bridge | New local Expo module, Kotlin + Swift, via Expo Modules API | Async worker I/O, native lifecycle hooks, RN 0.86 architecture and cancellation; no file payload over JS bridge. |
| AEAD/key management | Android JCA `AES/GCM/NoPadding`, SecureRandom, Android Keystore; iOS CryptoKit AES.GCM, SecRandomCopyBytes, Keychain | 256-bit keys, 96-bit nonce, full 128-bit tags; native cross-platform vectors; hardware backing recorded, never assumed. No new JS crypto library. |
| HTTP | Android dedicated OkHttp streaming client using SDK-compatible resolved version; iOS ephemeral foreground URLSession data task | Reuse existing native dependency only if supported; otherwise explicit approval for a pin. No response-body logger/cache interceptor. On iOS do not use download tasks/background sessions that stage plaintext files. |
| Database | Existing expo-sqlite config plugin proposed as `["expo-sqlite", {"useSQLCipher": true}]` | New binary required; key before any schema/WAL access. Discover exact bundled SQLCipher/crypto versions, licenses, compile flags and symbols in isolated build. Keep default authenticated pages, no plaintext DB header. |
| Viewer | Existing react-native-pdf local-file path, plus app-owned native lease/controller | Prove native close/dispose, cache locations and bounded page bitmap retention. If upstream exposes insufficient disposal control, app-owned native adapter is required; changing/forking frozen packages needs separate approval. |
| Durable files | App-private no-backup directories, native fd I/O, same-volume rename + flush | 0600 files / private dirs, canonical path and symlink checks, iOS file protection; atomicity/power-loss behavior proven per supported filesystem. |

Expo's [SDK 57 SQLite documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) supports SQLCipher on Android/iOS with a rebuilt binary and excludes SQLCipher from Expo Go. The [Expo Modules API](https://docs.expo.dev/modules/overview/) supplies Kotlin/Swift integration. These are supported mechanisms, not certification of this exact combined build. No Expo major upgrade is proposed.

New native capability requires a distinct runtime version on each platform and a capability check before offline initialization. Current app.config.js sets an Android runtime explicitly; an appVersion-only OTA boundary is insufficient if the version is reused. Old runtimes must not receive new storage code. No existing production runtime/channel, signing or Firebase configuration changes now. Later build work uses synthetic local fixtures and isolated debug/test identity; `internal-testing` points at production and is unsuitable for this work.

SQLCipher integration starts with the existing JS SQLite API: retrieve only the small per-owner DB key from SecureStore, supply a strictly validated hex key immediately on open, then discard JS references; no SQL tracing, telemetry, generic statement logging or key strings in errors. PDF keys remain native behind opaque handles. JS strings cannot be reliably zeroized: this is an explicit process-memory limitation, not an at-rest fallback. A native-only SQLCipher key setter is a hardening option if required, but must link to the same bundled SQLCipher rather than a second incompatible SQLite library.

## 5. Keys, ownership and account transitions

### Key hierarchy and persistence

- Allocate independent random 32-byte `Kpdf(owner, epoch)` and `Kdb(owner, epoch)`. Never derive from password, user ID, device ID, access token or license timestamp. Separate lifetimes allow PDF purge without destroying unsynced answers.
- Native PDF root key: Android Keystore-wrapped key material; iOS non-synchronizable `WhenUnlockedThisDeviceOnly` Keychain item. `Kdb` is a small SecureStore record with equivalent device-only policy where supported. Do not change existing license records/keys.
- Each PDF attempt gets a fresh random file DEK and file UUID. Wrap DEK with Kpdf using AEAD and fresh nonce; authenticate owner, file UUID, note/version and key epoch. Never persist an unwrapped DEK. No key material in filenames, resume state or ordinary SQLite/AsyncStorage.
- An independent device recovery key protects legacy multi-owner/unknown-owner quarantine and migration manifests. It grants the migrator access, never grants the active user ownership. Unknown rows cannot be claimed merely by signing in.
- Opaque random directory IDs; owner-to-directory/key-reference mapping in an authenticated encrypted registry. File sizes, counts, times and access patterns remain observable filesystem metadata; padding/traffic-analysis protection is out of scope. Existing license discovery IDs remain the report's documented metadata boundary.
- Key creation is two-phase: persist key, read back and verify a challenge, then publish encrypted registry reference. Crash-created unreferenced keys are reconciled, not mistaken for empty storage. Registry/manifest writes use AEAD, fresh nonces and atomic generations. Preserve prior valid generation until the next generation is durable.

### Transition barrier

One serialized offline coordinator owns `{owner, sessionEpoch, storageEpoch, ready}`. Native transfers and view leases carry these epochs. JS auth state alone cannot authorize a native commit.

On logout/account change: synchronously revoke old native epoch and blank/detach viewer; pause sync and block repository entry; cancel/await transfers and decryptors; close viewer descriptors and remove plaintext; close the old DB after pending transactions finish or roll back; purge old paid PDFs/license records under existing policy; remove Kpdf only after retryable cleanup state is durable. Preserve Kdb and the encrypted learning DB. Only then open B's key/DB, reconcile, and mark B ready. Late callbacks cannot recreate A's files, rows or URL state. Repeated transitions serialize and coalesce safely; deletion failure blocks offline readiness and leaves a cleanup tombstone for retry.

Keep A's encrypted learning DB inaccessible while B is active; A may regain access after authenticating again. Releasing an in-memory key is not deleting its durable key. No shared global `getDb()` can implicitly return the previous owner's DB. Unknown legacy data stays in quarantine. “Clear Downloads” purges paid assets/licenses only; deleting unsynced learning data requires a separate explicit, informed operation, outside automatic cleanup.

Native admission relies on the trusted app's authenticated owner binding, not an untrusted filename or AsyncStorage owner string. It does not claim to resist hostile JS running inside the process.

## 6. Versioned authenticated PDF container

Proposed format `MVPDF/1`; freeze a binary specification and shared test vectors before implementation. Encode integers big-endian, fixed-width and length-prefixed variable data, with canonical UTF-8 identifiers and explicit bounds. Reject unknown format/algorithm, duplicate fields, oversized headers and integer overflow before allocation. Maximum supported PDF v1 is **100 MiB (104,857,600 bytes)**; header/manifest at most 64 KiB each; larger input fails safely with a clear message.

1. Fixed outer header: magic, format/algorithm IDs, random file UUID, key epoch and wrapped DEK. Encrypt owner/note/content version/total length, expected validator or trusted content digest and content identity in a DEK-authenticated metadata envelope. The outer header is included in AEAD AAD. Authenticated owner must match the coordinator before any content use. Content version is immutable for this file; never update a failed row's version and relabel old bytes as current.
2. Chunk size **256 KiB**, final chunk may be shorter. Nonce is file-local 32-bit random prefix plus 64-bit record counter under a new random DEK for every attempt. Reserve counter 0 for metadata, counters 1..N for data, N+1 for final manifest. Wrap nonce belongs to a different key and is independently random. Set explicit counter/file-size limits; never rewrite a record with the same key/counter.
3. Each chunk uses AES-256-GCM, full tag. AAD includes domain `MVPDF/1/data`, authenticated header digest, file UUID, owner, note, content version, expected total length, chunk index and exact chunk plaintext length. “Order” here means chunk sequence; no payment order or financial identifier is needed. Detect reordered, swapped, duplicated, missing and cross-owner/version chunks.
4. Final encrypted/authenticated manifest records chunk count, exact total plaintext length, final chunk length and SHA-256 of plaintext computed incrementally. Require exactly one manifest, contiguous indices and no trailing bytes. A digest is an additional completion check, not a substitute for AEAD or a server-authenticated expected content identity.
5. Header identity/length come from a validated HTTPS response and current authorization. Require exact uncompressed Content-Length and `Accept-Encoding: identity` in v1; absent/contradictory length, encoded bodies, HTML, non-200 initial responses, size overflow and PDF magic mismatch fail safely. If current service cannot provide immutable content version plus length, stop for a separately approved contract change; restart-only does not waive authenticated version binding. Never invent a trusted server digest from the downloaded bytes. The current `getSecureNoteUrl()` facade returns only a URL: phase 0 must establish the actual version-to-object binding, not assume it exists. No endpoint deployment is authorized here.

Native stream buffers a chunk, seals it completely, then writes only ciphertext + tag to `.part`. Network, crypto and disk queues use backpressure: at most two chunks in flight, no full response buffers, base64, JS array buffers or plaintext disk spools. Compute header/PDF magic checks in memory. A bad chunk is never written as plaintext.

After EOF: verify length/response, seal manifest, flush file; reopen and authenticate the complete container by streaming; same-volume atomic rename to immutable `.mvp`; flush containing directory; transactionally publish the owner DB download row. Registry/DB reference stores format, file UUID and key epoch. Prior completed version remains authoritative until the replacement is verified and referenced. If file publication succeeds but DB commit fails, the new ciphertext is an orphan, reconciled by authenticated identity on startup; never guess that a `.part` is complete. Row + file are not claimed to be one filesystem transaction.

Strictly no append after crash with the old DEK/counters in v1. Delete/reconcile partial ciphertext, allocate a new attempt/key and reauthorize. A ciphertext file is not evidence that online authorization occurred recently.

## 7. Download and viewing path

### Network and capabilities

The current server entitlement endpoint remains the authority. Pass a fresh signed URL transiently to native transfer; never persist it in `downloads.source_url`, navigation persistence, AsyncStorage, native task serialization, HTTP cache, cookies, redirect logs, crash breadcrumbs or telemetry. Keep the legacy schema field empty until schema cleanup. Sanitize native errors at origin. On redirects use an explicit host/scheme policy and never forward authorization credentials cross-origin. Use normal platform TLS validation; do not enable trust-all.

Android uses an app-owned streaming response body and explicit encrypted sink, no DownloadManager, cache or `bytes()`/string body calls. iOS uses an ephemeral data task with URLCache/cookies disabled, bounded callback buffering and flow control; foreground-only in v1, cancel on background. No OS resumable download blobs are saved, even encrypted, in v1. Remote “read now” goes through this same encrypted path before the viewer gets a local lease; never pass HTTPS sources to react-native-pdf. Memory-only reading before completion is deferred.

### View lease and cleanup

1. Capture owner/epochs and pass existing license check. If server denies access, keep existing denial/invalidation behavior; encryption does not prolong access.
2. First streaming pass verifies every tag, structure, manifest and total digest with no plaintext persistence. Then second bounded streaming pass decrypts authenticated chunks into a random private no-backup `view-leases/<lease-id>.tmp` file. Use the same opened immutable container descriptor; reject inode/size changes; recheck tags/digest during the second pass. Do not expose partial `.tmp` to viewer.
3. Flush completed temp file, recheck epochs/license freshness, atomically publish lease file and hand local URI only to the mounted viewer. Limit to one active plaintext lease and one PDF transfer across the app. Never share it through an exported provider, external intent, WebView or public directory.
4. Native lease controller owns renderer disposal and all open fds. On close, navigation disposal, inactive/background, screen lock/protected-data unavailability, logout, account switch, entitlement expiry/known revoke or viewer error: invalidate epoch, blank/detach renderer, stop decryption, close fds, remove lease and any proven related caches. iOS handles inactive/scene transitions before background snapshots; Android uses activity/process lifecycle and secure window policy. JS effects are supplementary.
5. Native startup sweeps lease directory and enumerated viewer/downloader cache locations **before navigation or sync readiness**. Sweep `.tmp`, prior lease files, interrupted decrypt output, thumbnails and known legacy remote `.pdf`/`.tmp` caches. Do not delete unrelated SDK caches by a broad filename pattern. Build a native cache inventory in phase 0; an unidentified possible plaintext cache blocks acceptance.
6. Cleanup failure keeps the offline coordinator locked and retries. A process-kill cannot be guaranteed to execute callbacks: private plaintext may remain until the next startup sweep, protected by OS sandbox/file protection meanwhile. Never promise immediate erasure after SIGKILL or power loss. On normal lifecycle events, target cleanup within 1 second and deny new work immediately; this deadline is an acceptance condition, not a guarantee without measurement.

Temporary plaintext is an explicitly allowed viewing exception, never a durable offline asset. No memory mapping or rendering implementation may silently copy the entire file into RAM. Renderer page/bitmap caches need a bounded working set; close releases them. If the installed viewer cannot satisfy this, phase 0 fails and the native viewer adapter/random-access alternative must be approved before continuing.

## 8. Legacy PDFs and metadata

Before migration, stop old downloaders and block all legacy viewer routes. Inventory app-managed notes, partials, DB references and native viewer caches using canonical paths; preserve a durable encrypted inventory and status per file. Unknown paths never become arbitrary read/delete targets.

- **Known owner + trusted content binding:** do not trust the old global owner marker alone. Use server-validated owner/note/object version/length/digest or equivalent reliable provenance. Stream-encrypt the original into a new container; independently verify decrypted digest/length against the original and validated identity; commit encrypted reference; only then unlink original. During conversion original remains private and non-viewable. A formerly valid SecureStore license does not by itself bind legacy PDF bytes to a particular version.
- **Ownership/version cannot be established offline:** seal original bytes and its recovery metadata into an authenticated encrypted quarantine under the device recovery key, verify by a full decrypt/hash comparison, publish a recoverable inventory entry, then unlink plaintext. Unknown owner remains inaccessible to every account until a separately defined ownership reconciliation succeeds. Never assign it to whoever next signs in. Online verified redownload is preferred; quarantined bytes do not become licensed content automatically.
- **Old partials/cache copies:** classify as incomplete, never usable PDF. Verify completed counterpart if present. Otherwise notify user that the download needs restarting. Quarantine unverifiable complete-looking originals rather than discard them; explicit confirmation is required for destructive discard. Known expendable partial transfer bytes may be discarded under the documented restart policy; never treat a completed legacy row as a partial based on extension alone.
- Disk full, encryption/key failure or interruption leaves original intact and blocked, with retry visible. If ciphertext is committed and unlink fails, mark `plaintext_cleanup_pending` and deny encryption-complete status. Recover by verifying existing destination and retrying deletion, not encrypting or deleting blindly.

UI reports migrated / restart needed / preserved but ownership unknown / cleanup pending, with counts. Users must not discover a missing offline library only after migration. No completed file disappears without replacement, recoverable quarantine, or an explicit informed discard. A verified encrypted quarantine is preservation, not a claim of usability or ownership.

Legacy `medveda:resume:*` values and source URLs are read only by the migrator, never reused as authorization. Do not import URLs into new active metadata. Remove resume values after old jobs are cancelled and any referenced completed bytes are protected; invalidate corresponding old transfer state. Remove capability-bearing SQLite fields through the encrypted DB conversion, not a plaintext UPDATE that leaves old WAL/free pages behind. Sweep legacy native URL/download caches before declaring confidentiality. Existing OS backups cannot be retrospectively erased.

## 9. SQLCipher conversion and unsynced learning data

### Storage structure

Use one SQLCipher DB per proven owner, plus a separate encrypted legacy recovery DB for mixed/unknown records. A single device-keyed DB with SQL owner filters alone is insufficient for the requested key isolation. Owner-bound DB registry prevents cross-account handle reuse. New learning tables/outbox include explicit owner and schema version; outbox references attempt ID. Keep original IDs/payload bytes, answers, question revisions, retry counts, timestamps, verification/sync flags and relationships during conversion. Preserve bookmarks/progress and unknown tables too; do not migrate only the obvious two tables.

No attribution based on current login, chronology, quiz ID, course or last global owner. Outbox `payload.user_id` can establish a candidate owner when it is well-formed and consistent with trusted provenance; join local attempt by exact attempt ID, detect conflicting duplicates. Unowned attempts/bookmarks/progress, malformed JSON and conflicting records go into encrypted quarantine with their original bytes. Explicitly show that recovery is pending. Do not parse/re-serialize corrupt payloads into “empty answers”.

### Crash-safe migration protocol

Native startup lock and encrypted journal use states `DISCOVERED -> SNAPSHOT_SEALED -> EXPORTED -> VERIFIED -> COMMITTED -> PLAINTEXT_CLEANED -> READY`. Every state records migration UUID, source fingerprint/generation, destination IDs, counts/hashes, key references, schema versions and pending cleanup. State publication is atomic and flushed. Every state transition is idempotent; absence/corruption of journal never authorizes deleting files.

1. Gate every DB caller, stop sync/listeners and old download writes, finish or roll back transactions, close **all** connections. Acquire exclusive migration lock; a remaining handle or `SQLITE_BUSY` pauses migration. Native startup also prevents import-time/background callers from opening the old singleton.
2. Verify free space using actual source DB + WAL + SHM + journals and proposed destinations. Initial conservative reserve: **3 × source-bundle bytes + 64 MiB**, plus calculated per-owner split/index overhead and any PDF being migrated. Recheck during writes; this estimate cannot prevent ENOSPC races. Serialize DB and PDF migration to bound space. If insufficient, block conversion with Retry/free-space guidance; never reset DB.
3. With writers stopped, stream-seal an exact raw recovery bundle of source DB, WAL, SHM and any rollback journal, with file-presence manifest, sizes and hashes. Verify encrypted bundle and persist its recovery key before altering the source. No new plaintext backup or SQL dump. The SHM is included as recovery evidence; SQLite rebuilds it rather than treating its copied contents as authoritative.
4. Open source with SQLCipher in explicit plaintext-import mode only; let SQLite recover valid committed WAL/journal state. Integrity-check source, checkpoint WAL with a checked `wal_checkpoint(TRUNCATE)` result; if busy/error, stop with complete source bundle preserved. Do not delete WAL/SHM manually before recovery/checkpoint. Uncommitted transactions are rolled back by SQLite, never promoted as unsynced answers.
5. Attach a new keyed recovery DB and use `sqlcipher_export()` for a complete logical copy, not `rekey` on plaintext and not `cipher_migrate` (which serves older encrypted formats). Explicitly copy/verify `user_version`, application ID, schema/index/trigger definitions, sequence values, foreign keys and relevant settings. Enable memory-only temporary storage before export; no plaintext spill files. Export runs in a stable source snapshot; normal writers remain blocked.
6. Close, flush and reopen encrypted destination using its key. Require nonempty expected `cipher_version`, successful actual keyed schema read, `cipher_integrity_check` with no errors, SQLite integrity check `ok`, foreign-key check with no rows, table counts and canonical row-by-row typed hashes matching the recovered source. Raw payload BLOB/TEXT bytes and null/type distinctions must match. Wrong/no key must fail an actual schema/data read; an accepted PRAGMA alone proves nothing. Do not store answer hashes in plaintext evidence.
7. From this encrypted recovery DB, transactionally copy proven-owner subsets to new per-owner keyed DBs; retain unknown/conflicting records and an immutable provenance map in recovery. Preserve the full encrypted recovery snapshot until each subset verifies. Per-owner DB + quarantine totals must exactly cover all source rows without accidental dedupe/loss; unknown schema remains preserved in recovery. Active owner projections explicitly scrub `downloads.source_url` and invalidate old resume fields; their originals survive only in the sealed recovery evidence, not operational metadata. Verify and record these narrowly permitted field transformations against the exact-copy checkpoint rather than expecting identical active URL fields. Learning/outbox payloads are not rewritten by this scrub. Target schema changes are separately validated after the exact-copy checkpoint.
8. Publish an encrypted registry generation referencing all verified destinations after fsync/close/rename on the same volume and directory flush. Until then the old source is authoritative and gated. After commit, destinations are authoritative; never reopen old plaintext as live fallback. Reopen destinations once more and reconcile journal/registry before admitting writes.
9. With all source handles closed and verified encrypted raw + logical recovery available, unlink old plaintext DB, WAL, SHM, journals and any discovered plaintext backup/temp artifacts. Deletion failures leave `PLAINTEXT_CLEANUP_PENDING`; do not say migration is secure/complete. Never rename only the DB while accidentally reusing old sidecars. New databases have distinct basenames/directories.
10. Exclude new DBs, WAL/SHM, recovery bundles, encrypted registry and view/PDF files from Android backup/data extraction and iOS backup. Existing `allowBackup:false` is a starting point, not proof of exact merged backup rules. Verify artifacts and restore behavior on device. Keep encrypted recovery while unattributed/unsynced records remain; no automatic TTL purge. Retention deliberately includes original legacy capability fields inside the sealed exact-copy evidence only. Recovery archives have no normal UI/query/sync access and never supply a URL to a downloader; an explicit recovery tool must reauthorize and scrub operational imports. This is an encrypted-evidence retention exception, not permission to persist new signed URLs. Eventual recovery retention/destructive discard requires an explicit policy decision.

SQLCipher encrypts DB/WAL page payloads, while SHM contains index/locking metadata, not an assurance of zero metadata leakage. File-backed temporary stores must be disabled and tested; see [SQLCipher's design](https://www.zetetic.net/sqlcipher/design/). Verify actual runtime/compile configuration, including `temp_store=MEMORY`, page authentication enabled, no plaintext-header option and bounded page cache. Disable tracing; reject SQLCipher absence instead of continuing ordinary SQLite. Migration mechanics and settings checks follow the [SQLCipher API](https://www.zetetic.net/sqlcipher/sqlcipher-api/).

### Ongoing quiz/outbox semantics

Replace separate answer insert/enqueue with **one owner DB transaction**, with no network work inside it. Commit makes both durable or neither; only then schedule sync. Stable original attempt/queue IDs support replay. Mark synced only after a recognized server acknowledgement or separately recorded terminal business outcome; preserve answers and terminal reason for stale/rejected attempts. Invalid JSON, retry exhaustion and transport errors remain parked/retryable with original payload, never silently marked synced.

Sync captures owner/epoch and DB handle, authenticates as that owner, and rechecks before each request and acknowledgement write. Transition closes admission before token switch, cancels/joins current work, and prevents a callback from updating a newly opened DB. An already accepted server request may finish: replay using the same attempt ID reconciles it; do not manufacture a new ID. No production RPC/schema changes are proposed; demonstrate existing server deduplication with synthetic fixtures before acceptance. Unknown-owner records are never submitted.

An offline quiz submission cannot be acknowledged locally if encrypted persistence failed: retain the in-memory answer UI, show save failure and Retry; do not reset the quiz or report success. Migration cannot recover an outbox row that an older binary never committed; preserve orphan answer rows and show recovery status rather than inventing unverifiable revisions/ownership.

## 10. Failure recovery and rollback

| Failure | Required behavior |
|---|---|
| Kill mid PDF transfer | Only incomplete ciphertext; startup finds `.part`, marks restart needed, uses fresh authorization/DEK. Previous completed copy survives. |
| Kill during verification/decrypt/view | No published partial plaintext; startup native sweep removes every lease before app readiness. Background callbacks are not assumed after kill. |
| Kill at any DB journal/rename/key boundary | Recover highest authenticated committed registry; verify referenced destinations; resume exact pending stage. Before commit use frozen source, after commit use encrypted destinations. Never infer completion from filename or empty DB. |
| ENOSPC at write/fsync/rename/DB commit | Propagate failure, keep authoritative originals/last committed encrypted data; no success indicator. Remove only expendable uncommitted outputs, keep diagnostic state non-sensitive, Retry after space available. |
| Keychain locked / transient Keystore error | Locked/retry state; no new keys replacing existing ones, no deletion or plaintext fallback. Retry after unlock. |
| Permanently lost PDF key | Block opens, mark encrypted assets inaccessible; explain redownload after authorization. No unauthorized online/public fallback. Removal of inaccessible copies is an explicit informed action or existing paid-content purge policy. |
| Permanently lost DB/recovery key | Preserve ciphertext, manifest and key references, report that unsynced work cannot currently be decrypted. Account re-login cannot reconstruct a random lost key. Never wipe/recreate DB or promise recovery. Any secure export/reset requires a separate explicit decision. |
| Corrupt DB/PDF/tag/manifest | Fail closed, preserve encrypted evidence and prior good generation. Do not silently delete learning data or use corrupted partial output. |
| Cleanup failure | Deny new offline work, keep retry tombstone; cleanup may retry without granting another owner access. |
| Upgrade or unsupported downgrade | Forward reader checks format/schema/runtime. Unsupported binary must not create a parallel plaintext DB. App-level flag cannot enforce an arbitrary old binary's behavior. |

**Rollback is feature disable plus compatible encrypted reader, not decryption to plaintext.** Before migration commit, cancel and keep source gated for retry. After commit, keep new keys, formats and databases; a tested compatible build can disable new downloads/migrations while retaining learning saves, sync and encrypted reads. Do not restore a stale pre-migration DB over subsequent answers. Keep recovery snapshots encrypted and merge/reconcile by stable identity if repair is required.

Never OTA-roll back to the current plaintext-storage binary after conversion. Runtime/capability gates isolate new code; release operations must supply an encryption-capable forward-fix build. An old user-installed binary is not controlled by these gates and cannot be certified safe. There is no generic downgrade guarantee. Disable offline features safely if a vulnerability is found; no fallback to remote native-viewer plaintext caches. Recovery snapshots are not rollback permission and are not a source for server financial restoration.

SecureStore is not an irreplaceable-data backup. Its platform uninstall/restore and inaccessible-key behavior require explicit tests; see [SDK 57 SecureStore documentation](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/). Device-only, non-backed-up keys imply **permanent loss of unsynced data is possible after uninstall/device loss/key destruction**. This design prevents silent deletion, but cannot guarantee recovery without a separately approved backup/escrow design. No escrow/server key service is included.

## 11. Exact acceptance criteria

All criteria are mandatory for applicable native platforms. Use synthetic accounts/notes, local fault-injection endpoints and isolated test builds. Evidence records commit, binary SHA-256, package/runtime ID, resolved native dependencies, OS/device/RAM, free space, encryption format/schema, test fixture hashes and test timestamps. No credentials, URLs, answers or private production data in logs. Mocks/Node tests supplement, never replace device proof.

### A. Crypto, files and capabilities

- Cross-platform known-answer/container vectors decrypt byte-identically. Bit flips in header, wrapped DEK, any tag/ciphertext/manifest; wrong owner/note/version/length; swapped/duplicate/missing chunks; truncation at every record boundary and trailing bytes all deny open **before renderer attachment**. Fuzzed bounds cause no crash/unbounded allocation.
- Instrument file writes and sample app directories during transfer/abort/failure: no PDF plaintext signature or injected canary appears outside the explicit view/legacy migration exception. Confirm no OS download task/cache writes; native source inspection corroborates device sampling. Data signatures alone are insufficient proof.
- Every completion is full authenticated container + committed owner reference. Kill at each publish boundary yields either previous usable version or recoverable new ciphertext, never a false completed row.
- After new transfer/restart/pause/error/view and migration cleanup, capability canaries occur zero times in active owner SQLite logical data/free pages/WAL, AsyncStorage, native caches/task state, logs/crash reports or migration manifests. The sole legacy exception is original values inside authenticated encrypted exact-copy recovery evidence, inaccessible to normal query/view/sync paths; prove archive ciphertext reveals no canary and no original plaintext bundle survives. Deliberately check legacy URL expiry is not used as a confidentiality claim. New URLs may exist transiently in process memory only.
- No-key/wrong-key SQLite queries fail; correct key yields expected records; modified encrypted DB/WAL pages are rejected when read. Inspect SHM for metadata and prove no injected answer/payload canaries; SHM need not look random. File-backed SQL temp tests leave zero plaintext spill artifacts.

### B. Ownership, licenses and lifecycle

- A->B->A, sign-out, expired session and account switch during network/decrypt/DB commit/sync callbacks produce zero cross-owner reads, listings, writes or requests. A's unsynced learning rows remain intact for A. Existing license regressions still pass unchanged.
- Test seven-day boundary, clock rollback, missing/malformed license, explicit revoke/refund denial (simulate entitlement outcomes without touching payments), background while expiry elapses and foreground recheck. Known denial immediately invalidates view lease; offline access follows existing policy and does not claim instant offline revocation.
- With JS thread deliberately stalled, native close/background/lock/account invalidation prevents new reads immediately and removes plaintext/known viewer caches within **1 second**, including fds no longer readable after disposal. If platform lock permits no I/O, readiness stays locked until deferred deletion succeeds after unlock; record this exception and prove no reopen meanwhile.
- Force-stop/kill/reboot at each view stage: zero leases accessible to the viewer before startup sweep; after sweep zero plaintext leftovers in enumerated app-managed locations. No expectation of callback execution at kill time. Normal navigation close and native rendering failure satisfy the same sweep/lease rules.

### C. Migration, data conservation and faults

- Fixture includes all five tables, extra schema objects, synced/unsynced attempts, mixed owners, missing owners, conflicting owner joins, malformed payload/answers, old revisions, empty values, orphan attempts, old URL/resume values, PDFs with/without rows, and committed records present only in WAL.
- Exact-copy encrypted checkpoint matches schema/settings and every typed row digest; per-owner plus quarantine conservation accounts for **100% of source records**. All original IDs/answers/revisions/flags/retry counts/timestamps preserved; corrupted records remain byte-identical in quarantine. Zero fabricated synced acknowledgements or owner assignments.
- Inject process kill before/after every numbered migration step and every journal/fsync/rename, plus 100 randomized interruption runs per platform. After restart: either resume safely or show explicit recovery required; never empty DB, silently dropped row, plaintext live fallback or success before cleanup.
- Inject disk-full at every write/flush/commit, permission failure, busy DB handle, partial key creation, missing/mismatched key, locked device and corrupt journal/registry. Last authoritative data stays readable with its valid key or preserved with accurate error state; Retry is idempotent.
- Duplicate/replayed outbox requests preserve stable IDs and yield one server result using an isolated fixture service. Kill after remote acknowledgement before local mark; replay reconciles. A durable new answer has exactly one matching durable outbox row when eligible, or neither on rolled-back transaction.
- Upgrade from the current installed schema with WAL/SHM and legacy files; cleanup leaves zero live plaintext DB/PDF/capability copies in scoped paths. All unowned data is visibly preserved/blocked. Unsupported downgrade is explicitly reported as unsupported and never presented as a recovery method.

### D. Real-device performance matrix and proposed budgets

Define MB here as MiB: fixtures are exactly **1, 10, 50, 100 × 1,048,576 bytes**. Use valid PDFs with representative vector, text and image pages, including useful first/last-page markers; add an image-heavy/large-dimension stress set. Record pages/image dimensions/compression so size alone cannot hide renderer risk. Reject pathological document resources safely instead of bypassing encryption.

Minimum Android devices: one physical 2–3 GB RAM low-end supported handset and one physical 6–8 GB normal handset. Test oldest supported OS and a current OS across the matrix, plus a 16 KB page-size environment for all native libraries. If iOS ships, repeat the same matrix on the oldest supported physical iPhone and a current iPhone; Android results cannot approve iOS.

For **each size on each device**: 10 cold opens (fresh process, lease absent; record OS cache state, do not call it a cold disk cache without evidence) and 10 warm opens (same process, previous viewer closed and lease removed; no retained plaintext shortcut). Minimum Android count = **160 opens**, reported separately per cell, not pooled. p95 uses nearest rank, rank 10 for 10 samples. Measure offline tap-to-first-rendered-page including license lookup, complete authentication, decryption and render; exclude network only for this offline metric.

| Size | Low-end cold median / p95 | Low-end warm median / p95 | Normal cold median / p95 | Normal warm median / p95 |
|---|---|---|---|---|
| 1 MiB | <=2 / 3 s | <=1.5 / 2 s | <=1 / 2 s | <=0.8 / 1.5 s |
| 10 MiB | <=3 / 5 s | <=2.5 / 4 s | <=2 / 3 s | <=1.5 / 2.5 s |
| 50 MiB | <=8 / 12 s | <=7 / 10 s | <=4 / 7 s | <=3.5 / 6 s |
| 100 MiB | <=14 / 20 s | <=12 / 18 s | <=8 / 12 s | <=7 / 10 s |

These budgets need approval before implementation benchmarking and cannot be quietly raised to fit results. Failure requires optimization or an explicit design/budget revision; never skip authentication to improve latency.

- Native transfer/crypto/decrypt working buffers total **<=4 MiB**, with at most two 256 KiB chunks queued. Transfer-only peak process PSS increase **<=32 MiB**, JS heap increase **<=5 MiB** over settled baseline for every size; compare 10 vs 100 MiB transfer PSS increase **<=8 MiB**. Account for network TLS/native queues in measurements.
- Whole-viewer peak PSS increase **<=128 MiB low-end / <=192 MiB normal**, and absolute peak process PSS **<=256 MiB / <=384 MiB** respectively, across initial render and first/middle/last page navigation, fast scrolling, zoom, rotations and reopen. All runs: no OOM, ANR, unbounded page cache or file-size-proportional plaintext heap. Measure Java/Kotlin/ObjC/native allocations, JS heap, bitmaps and process memory; JS heap alone is inadequate.
- Memory metric: Android uses process PSS (including native/graphics categories), with allocation instrumentation to catch short-lived peaks; iOS uses peak physical footprint (`phys_footprint`, corroborated with Instruments), not PSS. For iOS, the oldest supported iPhone uses the low-end thresholds and the current iPhone uses normal thresholds, with the same numeric limits for transfer, growth and whole-viewer footprint. Define each run's baseline as the median of 5 seconds settled on the note list after startup reconciliation, before starting download/open; retain the process lifetime high-water and sampled trace through cleanup. Do not substitute RSS or JS heap for the named metric. Use <=100 ms sampling plus allocator/high-water evidence; instrumentation overhead is recorded. These iOS thresholds are proposals, measured independently rather than inferred from Android results.
- With local TLS fixture endpoint capable of >=20 MiB/s and measured unencrypted transport baseline, encrypted download throughput **>=50% of baseline and >=5 MiB/s low-end / >=10 MiB/s normal**, excluding authorization setup, over 10 transfers per size/device; report median/p95 total elapsed and all failures. Test interrupted/slow network, 401/403, expired URL, changed response length, large error body and disk-full separately.
- Every size additionally passes close/background/kill/reboot, expiry/rollback, upgrade and disk-full cases. No hidden remote viewer fallback when authentication, memory or latency limits fail.

## 12. Minimal safe implementation sequence (after approval only)

No phase authorizes rollout by itself. Keep old production behavior untouched while building in an isolated test runtime; no dual-writing new plaintext as a compatibility measure.

| Phase | Concrete deliverable / proposed files | Exit gate |
|---|---|---|
| 0 — compatibility proof | Isolated native test harness for exact Expo/RN tree; verify SQLCipher build, key-before-query, native HTTP backpressure, react-native-pdf local close/disposal/cache inventory, backup configuration, 16 KB native libs. Freeze format vectors and budgets. No user-data migration. | Both platforms' critical APIs proven, or stop and revise dependency/viewer choice. No frozen-package change without separate approval. |
| 1 — coordinator and format | New `mobile-app/modules/medveda-offline-vault/` Kotlin/Swift module; new `src/services/offlineStorageCoordinator.ts`, typed facade `src/services/nativeOfflineVault.ts`; native epochs, key registry, AEAD container writer/reader, native lease sweep, durable journal and failure injection. | Crypto/tamper/owner tests; no plaintext write in streaming harness; crash/key lifecycle tests. |
| 2 — database preservation | Proposed `src/services/offlineDatabaseMigration.ts`, owner DB resolver behind `src/config/database.ts`; gate `App.tsx` and auth offline entry; isolated SQLCipher plugin/runtime config. Raw encrypted recovery bundle, complete logical export, owner partition/quarantine and verified cleanup. | Section C conservation/WAL/interruption tests; keys and capability checks work before any repository opens. |
| 3 — learning writes and sync | Adapt `quizAttempts.ts`, `syncEngine.ts`, all DB consumers and auth startup to owner handles; transactional answer/outbox save, parked failures and epoch-bound acknowledgements. Preserve durable learning DB on logout. | Mixed-owner, orphan, failed-save, retry/replay and account-switch tests; no reset path loses unsynced data. |
| 4 — encrypted acquisition and legacy assets | Replace only note transfer in `downloadManager.ts`; empty URL fields, remove old resumable persistence, native streaming sink, immutable completion publication; encrypted legacy PDF quarantine/conversion and URL/cache cleanup. Adapt download types/hooks/UI to explicit restart/recovery states. | No persistent network plaintext, no persisted URL capability, legacy originals conserved and cleanup verified. Existing license behavior regression passes. |
| 5 — encrypted local viewing | Adapt `PdfViewerScreen.native.tsx`, typed navigation and every note-open route to note ID + native view lease; remove HTTPS viewer source, native lifecycle disposal and cache inventory enforcement. | No unauthenticated render; stalled-JS cleanup, late callback, kill/startup and account-switch proof. |
| 6 — acceptance and handoff | Physical-device matrix, fault runs, exact-artifact dependency/backup evidence, compatible rollback build exercise and reviewed recovery UI. Update only relevant gate evidence after verification. | Every A–D criterion accepted, no outstanding plaintext-cleanup state; all unrelated mandatory gates still evaluated independently. Production remains NO-GO until separately authorized and all gates pass. |

The first usable test build combines phases 1–5: shipping a new downloader before the secure viewer/DB/cleanup path exists is unsafe. Serial DB then one-file-at-a-time PDF migration bounds disk use. Defer true resume, key escrow and random-access rendering; do not defer preservation, authenticated completion, owner barriers, SQLCipher sidecars, lifecycle cleanup or device evidence.

### Later true-resume requirements

If separately approved: persist only encrypted owner-bound transfer UUID, file/key epoch, committed chunk count/byte offset, immutable server version, strong ETag, exact total length and format; no signed URL/auth headers/cookies/platform resume blob. Fresh entitlement URL every resume, validated Range/If-Range request, exact 206 Content-Range/ETag/version/length match, identity encoding. On 200, weak/missing/changed validator, expiry or mismatch, restart with new UUID/DEK.

Never reuse GCM key/counter after a crash where a chunk might already have been sealed: preserve old segments immutable and allocate fresh DEK per resumed segment, with a final authenticated segment-order/offset/length manifest; or restart entirely. A saved offset alone cannot prove nonce safety. Resume is not complete until segment substitution, rollback, gap/overlap, interrupted metadata commit and account-switch tests pass. Confidentiality is mandatory even when resume is deferred.

## 13. Approval decisions and remaining risks

Approve/revise the recommended native-module + SQLCipher approach; restart-only v1; encrypted quarantine instead of guessing legacy ownership; separate PDF/learning key lifetimes; device-only key-loss limitation; unsupported old-binary downgrade; and the numerical acceptance budgets. These are proposed engineering choices, not prior user approvals.

Largest implementation risks are native viewer disposal/cache behavior, exact SDK SQLCipher build/linking and migration compatibility, auth/DB initialization races, unprovable legacy ownership, GCM nonce reuse on retries, durable publication under ENOSPC/process death, and unintentionally retaining capabilities in native logs/caches. Compatibility proof and a focused independent design/native crypto review precede real-user migration. Approval of this document permits a later implementation task only within explicitly agreed scope; it does not authorize production, payment/financial changes, dependency unfreezing, credential access or release.
