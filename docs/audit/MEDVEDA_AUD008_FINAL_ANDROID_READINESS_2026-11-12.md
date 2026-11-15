# MedVeda AUD-008 and standalone Android build readiness

12 November 2026 UTC. **AUD-008: PARTIAL. Native acceptance and release: BLOCKED. No successfully built or device-tested APK exists from this work. Production readiness is not claimed.**

The latest remaining-bugs report and existing vault foundation were read. The dirty working tree, prior audit fixes, existing application data paths and Play production payment restrictions were preserved. Work was local source/test preparation. No production migration, deployment, cloud build, payment, refund, credential mutation or device-data deletion occurred.

## What exists and what was missing

| Boundary | Before this task | Current result |
| --- | --- | --- |
| Android Keystore | API-28+ nonexportable AES-GCM wrapping keys, unlocked-device admission, explicit creation, wrapped per-owner keys, encrypted key registry. Already implemented; not device accepted. | Reused by the new native content controller. Missing/locked keys still deny without replacement. Hardware/StrongBox backing is not claimed. |
| PDF container/atomic storage | MVPDF/1 bounded authenticated chunks, full manifest and immutable atomic ciphertext publication; dormant acquisition verified digest/length/expiry. | Added authenticated content catalog and coordinator; completed entry follows verified ciphertext and final owner/expiry/source admission. |
| Native acquisition | No transport adapter. | Added one-shot HTTPS source with configured host, no redirects or resume persistence, identity encoding, length/status checks, bounded reads/timeouts and cancellation ordered with final catalog commit. Real Android transport behavior is unaccepted. |
| Recovery | Key registry recovery; no content publication catalog. | Authenticated chained content generations, poisoned live state on ambiguous write, authenticated reopen, durable revoke tombstones and three forced-JVM-halt/reopen boundaries. Encrypted orphans/parts retained, never mistaken for completed rows. |
| Native viewing | No plaintext extraction/renderer lifecycle. | Full authentication before materialization, second authenticated extraction, dedicated private native workspace, retained cleanup lease and bounded PdfRenderer adapter. No path/descriptor/plaintext export to JS. Android adapter is uncompiled. |
| Legacy PDFs | No non-destructive import protocol. | Explicit native import with a current trusted owner/note/version/size/digest permit, new immutable ciphertext and authenticated catalog entry. Original stays unchanged. No scanning, auto-conversion, guessed ownership or removal. |
| App integration | Downloader still persists plaintext PDFs and signed URLs; viewer uses legacy file/remote paths. | **Still unconnected.** Bridge flags remain literal false, with no content-enabling API. No unsafe partial activation. |
| Native authorization/license | Backend `get-note-url` returns only URL and TTL; no native authorizer binding verified Auth owner to note/version/size/digest and offline license. | **Still missing.** `AcquisitionPermit` remains a trusted-native harness input, not a signed production credential. JS claims or a locally calculated hash cannot establish this trust. |

`AndroidVaultControl.prepareContentForHarness` now connects the existing OS lock, no-backup root, wrapping-key registry, content catalog and workspace into a native-only acceptance controller. Existing background/activity lease revocation is shared; screen-off receiver, transport cancellation and native renderer disposal are prepared. It is not a usable application integration or an accepted production coordinator.

## Preservation and explicit legacy rules

This task did not open or migrate an installed user's data. Existing `downloadManager.ts`, `authState.ts`, database/schema, offline-license/access services, quiz data paths and both application PDF viewers were left unchanged. Their initial/final source hashes are recorded separately. No user file was copied, deleted or rewritten. Synthetic tests prove byte-identical legacy-original preservation on import success and failures.

Legacy rules in the new dormant component:

1. Original files/rows remain authoritative legacy data until a separately integrated migration has proven conservation. Do not relabel old `.pdf` bytes as encrypted.
2. Import requires explicit native invocation, current trusted identity/access, exact metadata and trusted SHA-256. The complete input must match before catalog publication. Reject symlinks, changed/truncated/extra bytes, wrong owner/version/digest and expired admission.
3. Filenames, a global owner marker, old plaintext timestamps, local file existence and local hash calculation are insufficient owner/entitlement evidence. Unknown ownership stays preserved and blocked for explicit recovery/revalidation; do not assign it to whoever signs in next.
4. Import writes a separate immutable encrypted copy, fully verifies it, then durably records it. Any failure preserves the source and previous committed records; ambiguous catalog writes require authenticated reopen. No destructive rollback or replacement key.
5. Import **does not erase the retained plaintext original**. Therefore it does not close the device-at-rest finding. A final app migration needs an authenticated recovery/conservation protocol and explicit handling of retained originals/capabilities before activation.
6. No SQLite, quiz, learning/outbox or user-data migration was attempted. Such migration must preserve rows, IDs, WAL-committed data and owner provenance without inventing ownership or synced acknowledgements.

**Existing application limitation:** the unchanged legacy application still has automatic download purging on logout/account change, revocation deletion, and legacy quiz cleanup. This task does not certify those paths as preserving data. Before wiring the vault into app auth/storage, replace those transitions with owner-scoped suspension/quarantine and verify A→B→A conservation, including unsynced quizzes/user data. Simply suppressing purge while leaving a shared unscoped database readable would be unsafe. The new vault itself revokes leases/tombstones without deleting downloaded ciphertext or legacy originals.

## Security and failure behavior verified locally

- Wrong owner, changed note/version/length/key epoch, stale/foreign ticket, revoked owner, expired permit, altered ciphertext/chunks/manifest and missing keys deny. Complete authentication and trusted digest comparison precede renderer attachment.
- HTTP redirects, 206, 401/403/5xx, foreign origins, user info, unexpected port and wrong length reject. A cancellation after network EOF but before completion cannot publish a completed catalog entry. Final cancellation and journal publication are serialized.
- Temporary files exist only in a dedicated marked native workspace with private permissions under no-backup storage. Disposal closes native resources before deleting temporary files. Failed disposal is retained and blocks owner claim; retry succeeds. Late old view close cannot close a newer lease.
- Startup recovery sweeps only validated temporary `.view` entries in that marked workspace. Unknown files/symlinks cause a recovery failure, not broad cleanup. Existing PDFs/quizzes/user files are never swept.
- Interrupted input, file/catalog force failures, simulated storage-full and ambiguous publication retain previous content/originals. Complete ambiguous generations recover; corrupt finals deny rather than falling back. Three separate JVM halts cover content-journal file force, link and directory force; original foundation covers four blob-publication halt stages.
- Journal size/generation limits deny mutation rather than silently compact/delete. Old encrypted generations and orphan parts consume space. Whole-directory snapshot rollback or removal of a valid journal tail is not prevented. Production quota/recovery operations remain to be designed and accepted.

Independent source review identified cleanup ownership, raw-renderer close and cancellation publication races. They were corrected and reproduced in focused red/green tests. Final re-review found no further concrete defect in the revised paths. See `evidence/aud008-final-20261112/review.md`. This is not a native/device security certification.

## Verification evidence

All evidence is under `docs/audit/evidence/aud008-final-20261112/`.

| Check | Result | Evidence |
| --- | --- | --- |
| Existing broad mobile/security/payment/backend Node inventory | **123/123 commands passed** | `node-results.json`, `regression-node-*.log` |
| Mobile TypeScript, app/admin lint, configured mobile password tests | **Passed** | `mobile-tsc.log`, `lint.log`, `mobile-npm-test.log`, `regression-results.json` |
| Full database/payment regression suite | **Passed, exit 0** in new disposable PostgreSQL 17 cluster, all migrations + SQL + concurrency + provider fixtures + 25-check webhook harness | `database-full.log`, `database-result.json`, `run-database.py` |
| Additional Deno tests | **40 passed, 0 failed** | `deno-tests.log` |
| Native foundation | **Passed**: 22 focused host tests, Node/Kotlin format interop, four forced JVM halt/reopen boundaries | `final-foundation.log` |
| Native control | **Passed**: 11 shared-control groups and three key-journal halt/reopen stages | `final-control.log` |
| Native acquisition | **Passed** | `final-acquisition.log` |
| New content/legacy/view/transport tests | **Passed**, including three content-journal process halts | `final-content.log` |
| Final native/profile/offline/auth checks | **11/11 commands passed** | `final-results.json`, `final-summary.log` |
| Android artifact validator | **11 synthetic tests passed**; no real APK validated | `artifact-validator.log` |
| Expo autolinking | Module resolves as `medveda-offline-vault`, native bridge class present | `autolinking.json`; discovery is not compilation |
| Read-only SDK/Firebase/profile preflight | **Exit 2: local SDK incomplete**; genuine local Firebase client validates for package | `android-preflight.json`, `final-preflight.log` |
| Android native compile attempt | **FAILED, exit 1: SDK location not found** | `android-compile.log`, `android-compile-result.json` |
| Android instrumentation / install / device acceptance | **NOT RUN** | No APK/device artifact or native acceptance claim |

An intentional user interruption stopped the first long verification run; unfinished checks were rerun. The earlier PostgreSQL socket was absent, so the final database run used a new temporary cluster, stopped and removed afterward. Intermediate red tests and one Kotlin return-type compile error are retained as development evidence; final shared host checks pass. The Android build failure remains unresolved and is not counted as a regression PASS.

## Android SDK, Gradle, Firebase and signing

Confirmed local inputs: OpenJDK **21**, Node **22.23.1**, EAS CLI **24.14.0** (not upgraded); generated Gradle wrapper **9.3.1**; installed RN catalog AGP **8.12.0**, Kotlin **2.1.20**, compile/target SDK **36**, app min SDK **24**, build-tools **36.0.0**, NDK **27.1.12297006**. Vault operations deny below API **28**; unsupported devices must never get software/plaintext fallback. CMake **3.22.1** is the current native-toolchain requirement used in this handoff.

`ANDROID_HOME`/`ANDROID_SDK_ROOT` point to missing `/home/ganeshp8545/Android`; `/usr/lib/android-sdk` has platform-tools only. Platform SDK, build-tools, NDK, command-line SDK manager and CMake are missing at the configured root. The actual offline Gradle attempt reached project configuration and failed with **SDK location not found**. Cached Gradle/Kotlin compilation of build plugins is not vault compilation. No Gradle/R8/JNI/16KB/signature/install result is inferred.

No profile/config defect requiring a payment, package or dependency change was confirmed, so `eas.json`, `app.config.js`, signing configuration and production secrets were not changed by this task. Prior dirty edits remain intact. A read-only `android-vault-preflight.cjs` was added to make missing inputs reviewable. It checks file presence/configuration, not compiler/tool authenticity or acceptance.

### SDK installation commands — operator action, not performed

Use an isolated Linux x86-64 build machine or the existing user's intended SDK root. OpenJDK 21 already exists here. Download the command-line package from the official Android page and verify its published checksum; the following pinned bootstrap was listed during this review. Do not overwrite an existing SDK tools installation.

```bash
set -euo pipefail
export ANDROID_HOME="$HOME/Android"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
mkdir -p "$ANDROID_HOME/cmdline-tools"
MEDVEDA_SDK_BOOTSTRAP=$(mktemp -d)
curl --fail --location \
  https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip \
  --output "$MEDVEDA_SDK_BOOTSTRAP/tools.zip"
echo "4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583  $MEDVEDA_SDK_BOOTSTRAP/tools.zip" | sha256sum --check
unzip "$MEDVEDA_SDK_BOOTSTRAP/tools.zip" -d "$MEDVEDA_SDK_BOOTSTRAP/unpacked"
test ! -e "$ANDROID_HOME/cmdline-tools/latest"
mv "$MEDVEDA_SDK_BOOTSTRAP/unpacked/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" --install \
  'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' \
  'ndk;27.1.12297006' 'cmake;3.22.1'
java -version
sdkmanager --sdk_root="$ANDROID_HOME" --list_installed
cd /home/ganeshp8545/AyurPulse
node mobile-app/scripts/android-vault-preflight.cjs
cd mobile-app/android
./gradlew :medveda-offline-vault:compileDebugKotlin
./gradlew :medveda-offline-vault:compileDebugAndroidTestKotlin
```

Review SDK licenses interactively. The bootstrap checksum, extraction and `test` must succeed before proceeding. These commands describe missing tool installation; they have not been run. Future repository metadata may publish newer command-line tools; keep this pinned checksum or explicitly revalidate a replacement. [Official Android downloads](https://developer.android.com/studio#command-tools), [SDK manager usage](https://developer.android.com/tools/sdkmanager).

Compile the Android sources and instrumentation after provisioning; fix only reproduced errors. Run instrumentation only with synthetic data in an isolated app/device harness. Do not treat a compilation command written here as an executed PASS.

### Standalone profile and required inputs

The existing `razorpay-live-testing` profile resolves to internal distribution, standalone release APK (no development client), channel `razorpay-live-testing`, environment `production`, package `in.medveda.app`, runtime `1.2.2-razorpay-live-testing`, production backend and Razorpay live routing. It has no submit profile. The existing production/internal Play profiles still require payments **disabled**. Final profile/provider tests pass.

Required inputs:

- Existing authorized EAS login, or a securely supplied `EXPO_TOKEN` for CI; project access to the existing project ID in `app.json`. No token was read or changed here.
- The profile's exact `MEDVEDA_BUILD_TARGET=production`, `MEDVEDA_DISTRIBUTION=non-play-live-testing`, `MEDVEDA_PAYMENT_PROVIDER=razorpay`, plus its existing `EXPO_PUBLIC_SUPABASE_URL` and **public/publishable** key from `eas.json`. Do not substitute test-provider secrets, service-role keys or provider credentials.
- A genuine Firebase Android client file for **`in.medveda.app`**. Local `google-services.json` validates, but is ignored by git; cloud delivery is unverified. Supply/verify the existing EAS **file** variable `GOOGLE_SERVICES_JSON` in the selected `production` environment. A shell path on this workstation does not deliver that file to the cloud worker. Do not use the isolated `in.medveda.razorpaytest` client. No remote variable was created or changed.
- Existing approved Android release signing credentials for `in.medveda.app`; their availability and certificate were not queried. Profile defaults to EAS-managed credentials unless explicitly configured otherwise. Use existing credentials; do not generate/rotate keys to bypass a failure. Play service-account JSON is unnecessary for a standalone APK build without submit. FCM v1 sending credentials are a separate push acceptance input.
- Review actual source archive inclusion of the local module, plugins, release rules and assets, and exclusion of secrets. Autolinking passed locally; cloud archive/native build remain unverified. Review any existing OTA signing certificate requirements without changing production update/signing settings.

Exact cloud build command, after input verification (not executed):

```bash
cd /home/ganeshp8545/AyurPulse/mobile-app
eas build --platform android --profile razorpay-live-testing --non-interactive --freeze-credentials
```

`--freeze-credentials` makes missing existing CI credentials a blocker instead of permission to change them. Local alternative, after SDK provisioning, additionally needs a local readable Firebase file path and the same existing signing access:

```bash
GOOGLE_SERVICES_JSON=/absolute/path/to/genuine/in.medveda.app/google-services.json \
  eas build --platform android --profile razorpay-live-testing --local \
  --non-interactive --freeze-credentials --output /tmp/medveda-razorpay-live-testing.apk
```

Neither command deploys backend code or submits to Play. Neither activates encryption. The current profile can test existing standalone behavior, but **cannot test a completed AUD-008 journey because app integration is still missing**. Review [EAS Android build process](https://docs.expo.dev/build-reference/android-builds/), [file/environment input management](https://docs.expo.dev/eas/environment-variables/manage/), and [signing input requirements](https://docs.expo.dev/app-signing/local-credentials/).

## Device/artifact acceptance checklist — all outstanding

- [ ] Build succeeds for exact reviewed source, with native vault + instrumentation compiled. Record source inventory, build ID/logs, APK SHA-256, runtime/channel/package, version, certificate, SDK/NDK/JNI dependencies and 16KB support.
- [ ] Verify signature and install on dedicated test devices. This profile shares the production package. Use matching signing for an in-place upgrade; on certificate mismatch stop. Do not uninstall a user's installation or clear its app data to force acceptance.
- [ ] Inspect resolved Firebase input, app startup/restore, native module availability and literal disabled capabilities on the actual APK. No production secret or backend migration requirement is implied by build success.
- [ ] Complete native trusted Auth/permit/license integration first, with synthetic fixture authorization. Verify seven-day boundary, rollback, revocation/expiry, missing/corrupt/locked key and malformed claims. A signed URL alone is not an offline license.
- [ ] Complete ID-based application download/view integration without JS paths/URLs as authority or persisted signed URLs/resume blobs. Prove native wire-to-ciphertext flow and renderer lease lifecycle.
- [ ] A→logout→A, A→B→A, account change during download/decrypt/commit, refresh/session expiry, restart and offline use: no cross-owner read/list/write/callback and no download/quiz/learning/outbox loss. Preserve unknown provenance in explicit recovery state.
- [ ] Corrupt header/key/chunk/manifest/digest/length, swap/duplicate/remove chunks and truncate inputs: reject before render, no false completion or fallback.
- [ ] Inject full storage, failed flush/link/catalog write, ambiguous acknowledgement, interrupted network, 401/403, expiry and process kill at each publication stage. Preserve original/previous data and recover deterministically.
- [ ] Background/lock/navigation/JS-stall/disposal failures: revoke reads and dispose renderer, descriptor, bitmaps and plaintext within the accepted timing budget; failure blocks re-entry. Kill/reboot/startup sweep removes only dedicated view artifacts. Record native caches and retained descriptors, not just directory signatures.
- [ ] Upgrade representative legacy PDFs/quiz/SQLite WAL fixtures; exact row/file conservation, unknown-owner quarantine and interrupted migration recovery. No silent purge. Retained legacy plaintext explicitly prevents at-rest acceptance.
- [ ] Physical low-end and normal devices, supported OS boundary/current OS, 1/10/50/100 MiB PDF matrix: authenticated first render, peak native/graphics memory, scrolling, rotation, cleanup and resource limits. Apply the existing native-encryption design's budgets; do not relax them silently.
- [ ] Keep Play payment restrictions intact. Use synthetic provider tests; no real payments/refunds for this acceptance. A live-routing APK is not authorization to buy/refund against production.

## Exact next steps and conclusion

1. Provision SDK packages or choose an isolated EAS builder, verify genuine Firebase/file delivery and existing signing inputs; compile native adapters and instrumentation. The local SDK failure is a real blocker.
2. Complete the missing native authenticated authorization/license and app downloader/viewer/auth ownership integration. Do not trust JS permits or enable content flags to bypass the missing contract.
3. Finish the lossless owner-aware migration/recovery flow for existing legacy and learning data, including replacing legacy purge transitions. Preserve originals until conservation and recovery are explicit and accepted.
4. Build the standalone APK with the command above, verify/install its exact artifact and run the checklist using synthetic fixtures/devices. Record acceptance evidence before any activation change.
5. Only after these gates pass can a separately reviewed activation change be considered. Production deployment/migration/payment/secret changes remain outside this task.

**The new dormant components and local regressions materially advance AUD-008, but do not fix the currently active plaintext download path. AUD-008 remains PARTIAL, native/device acceptance BLOCKED, production NO-GO.**

## Changed files from this task

The complete incremental paths and SHA-256 values are in `evidence/aud008-final-20261112/changed-files.json`, compared with the initial snapshot. Prior unrelated dirty edits are not attributed to this task.

Modified existing native foundation files:

- `mobile-app/modules/medveda-offline-vault/core/AtomicVault.kt`
- `mobile-app/modules/medveda-offline-vault/core/PdfContainer.kt`
- `mobile-app/modules/medveda-offline-vault/integration/NativeLeases.kt`
- `mobile-app/modules/medveda-offline-vault/integration/VaultAcquisition.kt`
- `mobile-app/modules/medveda-offline-vault/android/src/main/java/in/medveda/offline/AndroidVaultControl.kt`
- `mobile-app/modules/medveda-offline-vault/android/src/main/java/in/medveda/offline/AndroidVaultLifecycle.kt`
- `mobile-app/modules/medveda-offline-vault/README.md`

New native components and tests:

- `mobile-app/modules/medveda-offline-vault/integration/ContentJournal.kt`
- `mobile-app/modules/medveda-offline-vault/integration/ContentCoordinator.kt`
- `mobile-app/modules/medveda-offline-vault/integration/ViewWorkspace.kt`
- `mobile-app/modules/medveda-offline-vault/integration/NativeHttpsSource.kt`
- `mobile-app/modules/medveda-offline-vault/android/src/main/java/in/medveda/offline/AndroidContentControl.kt`
- `mobile-app/modules/medveda-offline-vault/android/src/main/java/in/medveda/offline/AndroidPdfResource.kt`
- `mobile-app/modules/medveda-offline-vault/android/src/androidTest/java/in/medveda/offline/ContentSecurityTest.kt`
- `mobile-app/modules/medveda-offline-vault/tests/content/ContentTest.kt`
- `mobile-app/modules/medveda-offline-vault/tests/content/TransportTest.kt`
- `mobile-app/modules/medveda-offline-vault/tests/content/CrashTest.kt`
- `mobile-app/modules/medveda-offline-vault/tests/content/run-tests.py`

New build preflight and documentation:

- `mobile-app/scripts/android-vault-preflight.cjs`
- `mobile-app/scripts/android-vault-preflight-selftest.cjs`
- `mobile-app/modules/medveda-offline-vault/CONTENT_ACCEPTANCE.md`
- `docs/superpowers/plans/2026-11-12-aud008-final.md`
- This report, `docs/audit/MEDVEDA_AUD008_FINAL_ANDROID_READINESS_2026-11-12.md`
- Logs, command/result JSON, replay runners, initial hashes, review and preservation inventory under `docs/audit/evidence/aud008-final-20261112/`; `files.json` inventories evidence (excluding itself).

`preserved-paths.json` proves 12 key application/config files remained byte-identical to the task's initial snapshot, including the existing EAS/payment configuration, package/lockfile, database/auth/download/license/access and native/web PDF viewer files. This is source preservation evidence; it is not a device data backup or proof of unchanged runtime behavior on a device.
