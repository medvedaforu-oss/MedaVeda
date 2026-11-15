# MedVeda master audit and pending work

Audit date: **12 November 2026, UTC**. Repository: `/home/ganeshp8545/AyurPulse`.
Source commit: `54c33cbbc0c9c21eaa66f8bf2be285bd2e46e1f8`, **plus the pre-existing dirty working tree and untracked implementation**. The commit alone does not identify the audited application.

**Final release verdict: BLOCKED.** Local static and synthetic checks provide useful evidence, but the current PDF path does not satisfy the retained encryption requirement, the Firebase archive path needs correction or verified remote provisioning, and native/hosted acceptance is outstanding. No production Android build was attempted. An unconditional Gradle build failure was **not** reproduced.

This report creates no permission to deploy, apply migrations, enable payments, change credentials, or publish. Application code, configuration, tests, assets, SQL and lockfiles were not edited. Only individually reviewed Markdown deletions and this new report are task changes. Historical documents retained for workflow or integrity dependencies are not current readiness certificates.

## 1. Project overview

| Area | Actual implementation |
|---|---|
| Mobile | Expo `~57.0.32`, React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3`; React Navigation native stack, React Hook Form/Yup; package version `1.2.2` |
| Content | Course/year/subject/chapter catalog; private PDF Notes, free YouTube videos and free quizzes; product/purchase history and retained payment integrations |
| Local data | Expo SQLite/WAL, AsyncStorage, Expo SecureStore, resumable FileSystem downloads; native `react-native-pdf`/blob-util; answer-free quiz files and server-scored queued attempts |
| Native preparation | Local Expo module `mobile-app/modules/medveda-offline-vault`; Kotlin MVPDF/1 authenticated-container core, registry, owner/key controls, Android bridge, partial Apple implementation; content capabilities remain disabled |
| Backend | Supabase Auth, Postgres migrations/RLS/RPCs, private Storage, Deno Edge Functions, PDF quarantine worker; **76** migration files locally |
| Payments | Razorpay, retained Google Play/UCB verification/reporting/recovery code, durable queues and isolated non-Play test lane; **new purchases disabled in production and Play internal-testing profiles** |
| Push | Expo notification client/token registration; Firebase Android client configuration; admin-only Edge broadcast sender using Expo Push Service; local OS study reminders |
| Admin | React/Vite/TypeScript/Tailwind, Supabase browser client, membership/MFA-aware route guard and backend enforcement |
| Website | Static HTML/CSS/JS under `website/`, source templates/build script, legal pages, verification and password-recovery bridge; additional root/`github-original-website` copies are not established as active deployment roots |
| Operations | GitHub Actions for lint, mobile/admin checks, website, Deno/SQL tests and secrets scanning; EAS build/update profiles; Vercel configuration; frozen backend release candidates |

Dependency declarations were compared with installed/locked packages and the local Expo compatibility checker. Native dependency resolution and actual artifact compatibility still need build evidence. A retained package or literal import is not proof that a feature is enabled.

## 2. Current project status

| Feature | Source status | Evidence and limits |
|---|---|---|
| Startup | Implemented | `mobile-app/App.tsx:31` initializes SQLite, removes legacy answer-bearing quizzes, recovers downloads and starts sync; retry UI on failure; web skips native DB work |
| Auth/login/registration | Implemented, device/hosted acceptance pending | Email/password, mobile Edge login, email OTP for existing accounts, generic registration failure, duplicate-submit guard and shared password policy; `features/auth/authService.ts:30`, `screens/auth/RegisterScreen.tsx:40` |
| Session restore/lifecycle | Implemented with confirmed storage failure case | SecureStore-backed encrypted session adapter, initial-event race guard, foreground refresh, Splash retry; AUD-003 remains |
| Recovery | Implemented | HTTPS email landing page and `medveda://reset-password`, shared recovery controller, MFA challenge and AAL checks; actual SMTP, redirects and native cold/warm links not exercised |
| Navigation/catalog | Implemented | Deferred native screen loading, course/year persistence checks, search/pagination/error/retry states; no confirmed broken intended route found in inspected code/tests |
| Notes/ownership | Implemented with security gap | Server-only fresh signed URL; exact current owner and seven-day/rollback-denial checks; downloads and viewer lifecycle guards; PDF persistence remains plaintext (AUD-001) |
| Offline licenses | ALREADY FIXED in current source | `services/offlineNoteVerification.ts:43` writes owner/note/check timestamps to SecureStore; AsyncStorage holds discovery markers, not trusted timestamps. Older reports saying licenses are still plaintext are superseded |
| Native vault | INTENTIONALLY DISABLED for content | `modules/medveda-offline-vault/index.ts:3` and Android bridge capabilities return `contentEnabled=false`, `nativeAccepted=false`; no application download/viewer import uses the vault |
| Quiz | Implemented | Answer-free public questions/download sanitization, local answer queue, server-scored RPC and stale/rejected/unverified states. `score: 0` in `QuizScreen.tsx:163` is an unverified placeholder, not a fabricated production score |
| Video | Implemented/free | Online YouTube handoff/fallback. Held paid-video SQL is outside the migration stream and intentionally excluded |
| Purchases | INTENTIONALLY DISABLED for new sales | Production configuration and runtime checks deny checkout. Existing purchase history and Notes access remain implemented. Disabled Buy actions are not unfinished handlers |
| Notifications | Implemented with delivery gaps | Token rotation, account generation, serialized bearer-bound writes, logout removal, foreground retry and sanitized tap routing; broadcast sender counts accepted tickets, not delivery; no receipt-polling workflow found |
| Contact | Implemented as mail composer | `screens/contact/ContactScreen.tsx:61` opens `mailto:` and retains draft; no backend support-ticket/email API is implemented or implied by composer success |
| Maintenance/update | Implemented | Root hooks check settings; force-update intentionally fails open on unavailable settings. This is not a server authorization control |
| Account deletion | Partial lifecycle coverage | Verified-user Edge deletion and Auth deletion, followed by local signout/download cleanup; newer reservation identifiers/local learning data remain outside comprehensive cleanup (AUD-005) |
| Admin | Implemented, hosted verification pending | CRUD, user blocking, financial views, referrals/review flags, broadcasts, settings and Play diagnostics. No verified production mock-data replacement found |

Searches covered TODO/FIXME/HACK/XXX, unimplemented/placeholder/dummy/mock wording, disabled paths, empty handlers, errors and API call sites. Input placeholder strings, default context no-ops, synthetic test fixtures, the unverified quiz score and deliberately disabled payment/vault paths were not counted as bugs. Historical TODO comments do not independently establish current defects.

## 3. Android AAB readiness

| Check | Result |
|---|---|
| Android identity | `in.medveda.app`; versionName `1.2.2`; production runtime `1.2.2-disabled-notes-choice-v1` |
| EAS production | `android.buildType=app-bundle`, production environment/channel, remote version source, `autoIncrement=true`, payments disabled |
| Closed-testing submission | Both named submit profiles currently target Play **internal**, not closed testing. Select the intended closed track explicitly when release submission is separately authorized |
| Version code | Generated ignored Android template says `versionCode 1`; EAS remote version is authoritative for EAS builds. Remote next version and highest accepted Play version are UNVERIFIED |
| Signing | Generated local Gradle uses debug signing template. EAS-managed upload signing must be independently verified; the template alone is not a confirmed EAS signing bug. No upload key/certificate was accessed or changed |
| SDK | Installed React Native version catalog specifies min 24, target/compile 36, NDK `27.1.12297006`; generated wrapper is Gradle `9.3.1`. Final resolved Gradle plugin graph/merged SDK values remain unbuilt |
| Release optimization | `app.config.js:85` enables R8/resource shrinking, cleartext denial and narrow ProGuard rules; plugin selects optimize template and resizable activity; mapping/manifest-merger artifact paths configured |
| Permissions | Source requests Internet/notifications, disables backup, blocks overlay/external-storage/media permissions. Final transitive merged permissions must be checked on the real bundle |
| Billing | **Retained**, not removed: `expo-iap 3.4.4` is present and Android autolinking resolves it even with purchases disabled. Bundle-validator fixtures explicitly require retained Billing permission. Do not remove it based on an older checklist |
| Custom vault | Android autolinking resolves `medveda-offline-vault 0.1.0` and corrected classifier `expo.modules.medvedaoffline.MedvedaOfflineVaultModule` |
| Known versionName error | **ALREADY FIXED at source**: `modules/medveda-offline-vault/android/build.gradle:11` contains `versionName '0.1.0'` inside `defaultConfig`, with minSdk 24 and test runner. It was not changed |
| Known missing `release` component | **UNVERIFIED current build outcome**. Modern module Gradle plugin is declared; installed legacy publishing helper guards a missing component. No Gradle configuration/build was run to certify the original two-error chain is fully resolved |
| Firebase file | Exists; checks returned project match for `medveda-9c1fe` and Android client match for `in.medveda.app`. No file contents or API keys are included here |
| Expo Firebase resolution | Actual `expo config --type public --json` returned `android.googleServicesFile=./google-services.json` for production |
| Firebase archive | **Default local archive exclusion confirmed**: `mobile-app/.gitignore:15`; no root/app `.easignore`; Git does not track the file. Actual EAS archive inspection failed at Expo API DNS. Remote `GOOGLE_SERVICES_JSON` provisioning is UNVERIFIED (AUD-002) |
| FCM V1 | Firebase Android client JSON does not prove server-side FCM V1 credentials are uploaded to the correct EAS application; not inspected remotely |
| Compatibility | Installed Expo offline dependency check exited 0 with “Dependencies are up to date”; it warns offline validation is unreliable. This is not native compilation evidence |
| Acceptance | No signed AAB, bundletool/ELF/16 KB inspection, R8 runtime test, Play install, upload certificate, pre-launch result or physical-device notification/PDF test was produced |

An AAB can compile without FCM credentials and without enabling purchases. Producing a bundle is separate from proving push works and approving distribution. No source-level unconditional AAB blocker is asserted from the existing debug template, absent local submission service-account JSON, or disabled features.

EAS defaults to Git ignore rules unless overridden; a file variable is an alternative delivery mechanism. See [Expo archive rules](https://docs.expo.dev/build-reference/easignore/) and [Expo FCM V1 setup](https://docs.expo.dev/push-notifications/fcm-credentials/). Local ignore evidence does not establish the contents of an inaccessible remote environment.

## 4. Confirmed bugs and errors

Severity: P0 build blocker/critical security/severe loss; P1 major functionality; P2 important non-blocking defect; P3 minor. CONFIRMED identifies demonstrated source behavior or a reproduced local failure, not a claim that the currently deployed service exhibits it.

### AUD-001 — P1 — CONFIRMED — Production PDF persistence bypasses dormant encryption

- **Locations:** `mobile-app/src/utils/downloadManager.ts:220`; `mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx:167`; `mobile-app/modules/medveda-offline-vault/index.ts:3`.
- **Description/root cause:** The active downloader passes a PDF filesystem URI directly to Expo DownloadResumable. The viewer receives plain `file://`/HTTPS sources. The vault exists but exposes no active content integration. App sandboxing and screenshots prevention do not provide the separately required authenticated storage encryption.
- **Affected feature:** Paid Notes download, offline reading and native viewer cache/privacy requirements. Exposure requires access to device files; no remote entitlement bypass is claimed.
- **Minimum fix:** Complete native ciphertext-before-write download and authenticated read integration, owner/key binding, atomic publication and lifecycle cleanup; migrate or invalidate existing plaintext. Do not relabel the current files as encrypted or enable the dormant capability flag alone.
- **Validation:** Source path inspection confirms plaintext destination; host vault tests pass independently. Acceptance requires native 1/10/50/100 MiB runs, absence of plaintext in persistent files/partials/caches, account transitions, process death, corruption, disk-full and cleanup timing.
- **Gates:** Does not itself prevent compilation. Blocks satisfying the repository's retained secure-offline release requirement; resolve before releasing offline paid PDFs to Closed Testing/production under that requirement.

### AUD-002 — P1 — CONFIRMED local exclusion; UNVERIFIED remote workaround — Firebase archive handoff

- **Locations:** `mobile-app/.gitignore:15`; `mobile-app/app.config.js:66`; `mobile-app/app.config.js:74`.
- **Description/root cause:** Valid local Firebase configuration is ignored, and neither root nor mobile directory supplies `.easignore`. Local Expo config therefore sees a file that the default Git-filtered upload excludes. On a remote builder without a file variable, this optional configuration is omitted, so Android push registration is not configured as it was locally.
- **Affected feature:** Remote release Android push initialization/token issuance. Existing remote file variables could already avoid this; their existence is not established.
- **Minimum fix:** Either configure/verify the genuine `GOOGLE_SERVICES_JSON` file variable in each intended EAS environment, or add a narrowly reviewed `.easignore` inclusion for the Android **client** JSON while carrying forward all secret exclusions. Do not include service-account/private-key JSON.
- **Validation:** Git `check-ignore -v` reproduces the exclusion; local Expo output resolves the expected path. Rerun archive inspection, verify delivery of genuine input at build time without dumping it, then real-device token registration. Check the correct Firebase project/package again on that builder.
- **Gates:** Resolve the handoff before requesting the release candidate. Not a demonstrated unconditional compilation failure. Closed Testing with working push requires verification.

### AUD-003 — P2 — CONFIRMED — Failed session save destroys the previous readable session

- **Locations:** `mobile-app/src/config/secureSessionStorage.ts:59`, `:67`, `:101`, `:108`; caller `mobile-app/src/config/supabase.ts:32`.
- **Description/root cause:** Every save generates and commits a new AES key to the same SecureStore slot before writing the new ciphertext to AsyncStorage. If the ciphertext write fails or the process dies between those operations, the old ciphertext survives with the wrong key. The next restore cannot recover the previously valid session.
- **Affected feature:** Login/session refresh and killed-app session restoration during storage failure/interruption.
- **Minimum fix:** Serialize save/remove and use versioned key slots with a ciphertext record referencing its committed key generation; retain the prior readable pair until the new record commits. Reconcile orphan generations on restart. Do not reuse a single CTR key with the existing constant counter, and do not merely reorder the same two destructive writes.
- **Validation:** A synthetic VM test loaded the real adapter, saved session A, injected AsyncStorage failure while saving B, and asserted A could no longer be read. No credentials, real native storage or backend calls were used. Future regression must preserve A on failure and cover interruption/concurrent refresh/remove.
- **Gates:** No AAB compilation blocker; fix before production, preferably before Closed Testing session acceptance. No cross-account access or long-term entitlement loss is claimed.

### AUD-004 — P2 — CONFIRMED — Profile self-tests depend on absence of the owner's Firebase file

- **Locations:** `mobile-app/scripts/staging-build-selftest.cjs:52`; `mobile-app/scripts/razorpay-internal-test-selftest.cjs:13`; configuration guards `mobile-app/app.config.js:68` and `:76`.
- **Description/root cause:** Both tests evaluate real app configuration against the repository filesystem. Once the valid production Firebase file exists, staging intentionally rejects it and the isolated Razorpay package fails its package-match check. The tests do not isolate Firebase discovery with appropriate fixtures.
- **Affected feature:** Local validation of staging and non-Play profiles. The production isolation guards correctly refuse mismatched input; do not weaken them to make tests green. A clean CI checkout may pass because the ignored production file is absent.
- **Minimum fix:** Run profile configuration tests in isolated filesystem/config fixtures and explicitly test presence/absence of production Firebase input, plus the intended refusal cases. Supply a synthetic matching test-package client only in test context.
- **Validation:** Exact two scripts failed with stack traces at the configuration guards; production Android/Firebase self-tests passed. Rerun the same tests with an owner's local Firebase file present and absent after a separately authorized test-only change.
- **Gates:** No production AAB blocker demonstrated. Resolve before relying on a clean local readiness suite; actual staging builds additionally need their own reviewed environment/key setup.

### AUD-005 — P2 — CONFIRMED residual data; policy impact UNVERIFIED — Account deletion is not comprehensive

- **Locations:** `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1933`; `supabase/migrations/20261013100000_wallet_reservations.sql:3`; `supabase/migrations/20261014100000_payment_audit_capture_inbox.sql:62`; `mobile-app/src/services/usersService.ts:94`; `mobile-app/src/utils/downloadManager.ts:351`; `mobile-app/src/config/database.ts:96`.
- **Description/root cause:** The latest local erase function explicitly deletes/anonymizes an older table set. Wallet-order and first-discount reservation tables hold user UUIDs without Auth/profile deletion FKs and have no corresponding erase step. Client signout clears download files/rows and licenses, but does not erase local quiz attempts/outbox/other learning records. Deletion has grown across separately implemented subsystems without one complete retention contract.
- **Affected feature:** Account-deletion completeness and privacy disclosures; not evidence that another account can currently read a deleted user's local attempts through a screen.
- **Minimum fix:** Approve a precise delete/anonymize/retain matrix for newer reservations, financial references, fraud-prevention identities and device learning data; add a forward migration for required server cleanup and a dedicated owner-scoped local deletion workflow after confirmed deletion. Preserve accounting/provider obligations; do not blindly wipe all financial rows or use the shared DB reset on normal logout.
- **Validation:** Traced the latest function definitions, FK declarations and client deletion/signout callers. No database writes/replay were performed. Future synthetic tests must exercise all populated related tables, partial Auth deletion/retry and local interrupted cleanup, checking permitted retention explicitly.
- **Gates:** Does not block AAB generation. Resolve the retention decision and required cleanup before production deletion/privacy claims; include this in Closed Testing acceptance with synthetic accounts.

**Confirmed unresolved counts: P0 0; P1 2; P2 3; P3 0.** AUD-002 counts only its confirmed local handoff defect; it is not a claim that remote FCM is definitely broken. No confirmed P0 was invented from missing deployment evidence.

## 5. Incomplete features and functions

| Item | Evidence/status | Remaining work |
|---|---|---|
| Encrypted offline Notes | AUD-001; CONFIRMED incomplete integration | Native downloader/renderer bridge, trusted owner admission, migration, cache cleanup and device acceptance |
| Native platform vault | `android/.../MedvedaOfflineVaultModule.kt:17`, `ios/MedvedaOfflineVaultModule.swift`, `PHASE1B.md`; INTENTIONALLY DISABLED | Android instrumentation, lock/lifecycle guarantees and lower-API behavior; iOS coordinator/writer and lifecycle parity. Android policy support starts at API 28 even though library minSdk is 24; do not activate across unsupported APIs |
| Push delivery reconciliation | `supabase/functions/send-push-notification/index.ts:125`; CONFIRMED absent receipt lifecycle | Ticket IDs are inspected transiently, not durably polled. Add/review receipt/monitoring handling if delivery reporting is a requirement; device delivery remains unverified |
| Targeted notifications | Same sender `:69`; INTENTIONALLY DISABLED | Explicit 400 before persistence/token lookup. Recipient-scoped feed/storage/RLS is not implemented; broadcast-only content must remain non-sensitive |
| Play RTDN | No RTDN receiver/subscription integration found in current functions | Polling/void-worker paths exist; do not classify lack of RTDN alone as broken while polling is the intended path. Prove queue cadence and reversal handling remotely |
| Direct support submission | Contact mailto handoff; intentionally external | No server ticket queue or in-app mail delivery service. Mailbox operation is a human acceptance gap |
| Staging preparation | `supabase/staging/prepare_migrations.py:68`; intentionally fails closed | Script pins 62 unique migrations while checkout has 76. Re-review the new chain, cron removal, project isolation and source-hash manifest before expanding it. Do not change the count alone or run blanket migrations |
| Alternative billing activation | Configuration and server gates; INTENTIONALLY DISABLED | Owner/program/region/Console acceptance and exact hosted contract delivery; not needed merely to compile the disabled-purchase AAB |
| Deletion/retention | AUD-005; CONFIRMED partial lifecycle | Server/device retention matrix and completion/retry evidence |

No empty payment handler, dummy production API success, or mock catalog was verified as an active intended production feature. Current source includes real API integrations; their hosted deployment remains a separate question.

## 6. Security findings

AUD-001 and AUD-005 are the confirmed privacy/content-protection gaps; AUD-003 is a confirmed availability issue in security storage. No current service-role token/private-key leak was reported by the executed scanner. The scanner is pattern-based (PEM, known live-key patterns and service-role JWTs), not a guarantee against every secret type; ignored environment files were not dumped.

Verified controls include owner-scoped signed Notes URLs; 120-second URL TTL; verified bearer identity before service-role actions; optional admin AAL2 enforcement; profile protected-column triggers; service-only financial settlement/proof RPCs; foreign-owner purchase prevention; account-generation checks around downloads/push writes; SecureStore offline license records; generic mobile-login/registration errors; endpoint rate limiting; quarantined PDF validation; and sanitized notification navigation.

The dormant native registry authenticates present generations but has no independent monotonic anchor for valid-tail removal/whole-directory rollback. Retired keys/material are retained tombstones; secure deletion and physical power-loss guarantees are not established. Its content-disabled bridge must not be described as rollback-resistant production encryption.

The session adapter uses AES-CTR without authenticated ciphertext framing. This is a design-hardening concern under local-storage tampering, not a verified server authentication bypass. A versioned authenticated record format deserves review when AUD-003 is fixed, without weakening server JWT validation.

Live RLS/ACLs, admin MFA requirement, Auth hooks/SMTP/redirects, Storage bucket policies and service-secret custody were not accessed. Their absence cannot be inferred from local defaults. No account deletion, provider transaction, notification, or credential operation was performed.

Retained privacy drafts describe an adult-only proposal; actual registration has no age field/check, and current Terms allow guardian-supervised use (`screens/terms/TermsScreen.tsx:44`). This is a verified product/disclosure mismatch with the **proposal**, not proof of a legally required age gate. Confirm the intended audience, operator/contact/grievance information, actual provider regions/retention and Console declarations before publishing approved legal copy. No legal compliance conclusion is made.

## 7. Supabase findings

Source inspection covered migrations, public-table declarations/RLS, privileged functions/grants, mobile/admin literal RPC calls, Edge authorization and release candidates. A static contract inventory found **47 distinct literal RPC names** with corresponding function declarations somewhere in the local migration chain. This does not prove final installed signatures, grants, overload resolution or hosted deployment order.

- RLS is explicitly enabled on catalog/profile/financial/quiz tables. The ten non-Play test tables use a dynamic loop enabling and forcing RLS and revoking public/anon/authenticated grants (`20261109120000_isolated_nonplay_test.sql:134`); a simple table-name grep would falsely report them unprotected.
- `am_i_admin()` checks the trusted `admins` table and, when configured, JWT AAL2. Client-editable user metadata is not used to grant admin access in the inspected path.
- `get-note-url/index.ts:43` calls `user_can_access_note_with_aal` using the verified caller and AAL, then signs the private Notes object. Mobile retries request new authorization rather than constructing public URLs.
- Verified quiz attempts use ownership RLS, answer-free retrieval, revision checks and server scoring. The later table's Auth cascade should not be mistaken for a missing manual delete in the old erase function.
- Current financial helpers require capture/order/payment/purchase commitment, immutable scope snapshots, idempotent durable identities, reversal classification and service-only proof. Ownership triggers prevent a new successful duplicate while preserving historical exceptions.
- `20261111100000_phase_c_final_mv003_commitment.sql`, `20261111110000_phase_c_play_entitlement_snapshot.sql` and `20261111120000_p0_classified_reversal_commitment.sql` override earlier definitions. Deployment must deliver reviewed compatible units, not sort every pending source file and assume each intermediate state is safe.
- Retained staged packages specify A/B/C/P0 boundaries, source closures, hash/ledger guards and quiescence. Their preconditions are historical reviewed baselines, **not this audit's observation of a live migration count**. The foreign-key index addon `20261111175746_all_row_foreign_key_indexes.sql` and isolated test lane need their own reviewed delivery scope.
- Fresh hosted migration inventory, drift, full managed Auth/Storage restore rehearsal, provider reconciliation, queue-age/parked-job alerts and operational ownership remain required. Prior documents' observed financial cases, production function versions and counts were not treated as current facts or closed by local tests.

No SQL replay, migration, live read query, database write or Edge deployment was executed. Existing SQL/concurrency/harness tests were inspected but database-dependent suites were intentionally excluded under this audit's no-write restriction.

## 8. Push notification findings

The Firebase client file now exists and matches the requested project/package. Older claims that the local file is missing are **ALREADY FIXED**. Archive delivery remains AUD-002. FCM V1 credentials are a separate EAS/server setup; do not confuse the Android client JSON with a service-account private key.

`services/pushNotifications.ts:43` synchronously invalidates registration epochs across accounts; Android channel setup precedes the permission request, token rotation fetches a new Expo token, foreground retries transient failures, and writes use the initiating user's bearer. Logout serializes deletion before signout. Expo Go/web are intentionally skipped.

`send-push-notification/index.ts:31` verifies Auth, admin membership, optional AAL2 and rate limit before collecting tokens. Targeted recipients are refused before any feed write; feed persistence failure prevents push. Token reads paginate, sends chunk at 100, rejected tickets are counted, and immediate DeviceNotRegistered failures remove stale tokens. Admin UI correctly says “accepted” and does not claim device delivery.

Remaining acceptance: verify genuine FCM V1 credentials against the same Firebase/EAS app, Play signing-certificate API restrictions where applicable, actual token upsert and rotation, denied/granted permissions, foreground/background/killed-app display/tap, logout/shared-device behavior, and receipt/device evidence. No arbitrary background JS notification task was found; OS-rendered notifications and tap retrieval are implemented, so that absence alone is not a bug. Category preferences currently filter the local inbox; do not promise server-side per-category push subscriptions.

## 9. Admin panel findings

Implemented protected routes: dashboard, courses, years, subjects, chapters, users, referrals, review flags, Notes, videos, quiz, orders, products, notifications, analytics and settings. Lazy pages render within the layout's Suspense/error boundary. `ProtectedRoute` is a UX guard; backend RLS/RPC/Edge checks are the authority.

Auth context generations reject stale identity/AAL responses. Login has membership/MFA enrollment/challenge handling. User blocking calls a profile update and requires a returned row. Content forms perform real mutations; PDF upload validates/quarantines content through dedicated backend contracts. Shared focus/label/error controls are implemented and covered by local suites.

Analytics fetches all pages, sums paise and validates amounts; orders expose only unpaid failed/cancelled actions through `admin_set_order_status`, not arbitrary paid/refunded mutation. Financial UI regressions passed. Broadcast UI reports accepted/rejected ticket counts accurately.

No current P0/P1 admin defect was independently reproduced. Remaining work is hosted AAL1/AAL2/student isolation, upload/quarantine IAM/large-PDF handling, actual dashboard correctness against known data, deep-route reload/security headers and AUD-005 operational privacy decisions. Source/mock tests do not establish a deployed admin's authorization or correct live provider state.

## 10. Testing results

All scripts were inspected before execution. No install/upgrade, prebuild, production build, migration, SQL write, deployment, push send or credential mutation ran. Temporary evidence and synthetic fixtures were written under `/tmp`; no external project documentation was deleted.

| Command (repository root unless stated) | Fresh result |
|---|---|
| `cd mobile-app && node node_modules/typescript/bin/tsc --noEmit --incremental false` | PASS, exit 0 |
| `cd admin-panel && node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --incremental false` | PASS, exit 0 |
| `cd admin-panel && node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --incremental false` | PASS, exit 0 |
| `node tooling/node_modules/eslint/bin/eslint.js mobile-app/App.tsx mobile-app/src admin-panel/src` | PASS, exit 0 |
| 122 commands individually listed in the execution ledger below, `node --experimental-strip-types <path>` | **120 pass; 2 fail**, AUD-004. These are test files/commands, not 122 end-to-end journeys |
| `python3 mobile-app/scripts/android-bundle-validator-selftest.py` | PASS, 11 tests; synthetic ZIP/XML/config only |
| `deno check --cached-only --config supabase/deno.json supabase/functions/*/index.ts supabase/workers/validate-note-pdf.ts` | PASS, 25 function entrypoints plus worker |
| `deno test --cached-only --config supabase/deno.json --allow-read --allow-env` with ten paths in the ledger | PASS, 40 tests; no `--allow-net` |
| `python3 mobile-app/modules/medveda-offline-vault/tests/run-host-tests.py` | PASS, 22 foundation groups, Node/Kotlin fixture verification and four forced-JVM-halt cases |
| `python3 mobile-app/modules/medveda-offline-vault/tests/phase1b/run-tests.py` | PASS, 11 control groups and three journal halt/reopen cases |
| `node website/scripts/check-links.mjs` | PASS, 17 pages |
| `node scripts/scan-secrets.mjs` | Did not run scanner successfully: exit 2, child Git inventory unavailable |
| `git ls-files -z --cached --others --exclude-standard` passed as stdin to `node scripts/scan-secrets.mjs --stdin` | PASS, exit 0, tracked and untracked nonignored file inventory; not an ignored-env/history audit |
| `cd mobile-app && EXPO_NO_DOTENV=1 CI=1 EAS_BUILD_PROFILE=production MEDVEDA_PAYMENT_PROVIDER=disabled node node_modules/expo/bin/cli config --type public --json` | PASS; captured locally without exposing JSON values in this report; correct package/Firebase path |
| `cd mobile-app && EXPO_NO_DOTENV=1 CI=1 node node_modules/expo/bin/cli install --check --offline` | CLI argument failure, exit 1: `--offline` unsupported here; not a dependency defect |
| `cd mobile-app && EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 CI=1 node node_modules/expo/bin/cli install --check` | PASS, offline compatibility caveat |
| `cd mobile-app && node node_modules/expo-modules-autolinking/bin/expo-modules-autolinking resolve --platform android --json` | PASS; vault, Modules Core and expo-iap discovered |
| `eas build:inspect --help` | PASS; confirmed archive stage does not run a native build |
| `cd mobile-app && EXPO_NO_DOTENV=1 CI=1 EAS_NO_VCS=0 eas build:inspect --platform android --profile production --stage archive --output /tmp/medveda-eas-archive-audit` | BLOCKED, exit 1: GraphQL request DNS `EAI_AGAIN api.expo.dev`; no archive inclusion certificate |
| Synthetic real-adapter session write-failure probe | PASS as reproduction: demonstrated AUD-003; not a passing assertion of desired application behavior |

The optional full readiness runner was **not run**: it discovers additional database-dependent scripts, secret scans and optional exports/builds beyond this task's validation scope. Node database tests containing `psql`, SQL runners, real-provider smoke scripts, hosted deletion and full migration rehearsals were excluded. Android Gradle/native instrumentation, Swift/XCTest, emulator/device tests, final AAB inspection, Play Console/FCM/EAS remote credential checks, online registry audits, live schema/RLS tests and hosted E2E remain NOT RUN. No prior audit's “passed” test was counted as a fresh result.

The two failing tests were not retried by hiding/removing the owner's real Firebase file. Tests, guards and runtime behavior were left unchanged.

## 11. Required fixes

### Must resolve before requesting the intended AAB candidate

1. Close AUD-002's build-input delivery path or provide verifiable existing EAS file-variable evidence. Confirm production environment/project/package without logging contents.
2. Confirm actual remote version code and upload signing identity. Use the locked source and exact intended EAS profile. No unconditional Gradle code change is justified by this audit; preserve the existing vault versionName correction.
3. Establish a reproducible native build in an allowed environment, then validate the signed artifact and retained Billing/native modules. This audit did not execute that build.

### Must resolve before Closed Testing acceptance

1. AUD-001: complete the required protected offline PDF path before distributing that functionality as secure. Dormant host crypto is not feature completion.
2. Verify Firebase/FCM token registration and actual foreground/background/killed-app delivery, signed release/device behavior, account isolation, recovery and offline migration on the same candidate.
3. Test AUD-003 session persistence failure/recovery and AUD-005 deletion/retention with synthetic accounts; fix the confirmed defects before accepting their affected promises. AUD-004 should be fixed so local readiness results are reproducible.
4. Obtain hosted Auth/Storage/RLS/admin-MFA acceptance and correct reviewer access. Review all served legal/disclosure/Console information for the actual disabled-payment release.
5. Choose the closed-testing track explicitly; current EAS submit defaults select internal.

### Must resolve before production release or backend/payment activation

1. Close all applicable confirmed findings and the device/hosted evidence gates.
2. Independently compare deployed SQL/function/ACL/RLS identities with reviewed staged units, establish fresh drift/recovery/quiescence/unknown-commit procedures, then separately approve any deployment. Do not use blanket `supabase db push` on this checkout.
3. Reconcile historical payment obligations privately, prove managed Auth/Storage recovery, scheduler/queue health and alert delivery. A disabled sales UI does not retire prior receipts/refunds/reporting.
4. If payments are ever enabled, obtain owner/program approval, permitted distribution/region decisions, per-package provider credentials/catalog permission and controlled capture/refund/void/duplicate/reporting acceptance. Keep existing production gates disabled until then.
5. Refresh the staging migration review rather than bypassing its 62-version safety check; production and staging identities must remain separate.

### Optional improvements

Review authenticated session ciphertext framing with AUD-003; add durable Expo receipt handling if delivery visibility is required; document/implement a future support-ticket service only if desired; expand RPC/Edge contract checks beyond literal-name presence. Existing local inbox mute behavior and intentional lack of targeted broadcasts must be described accurately.

## 12. Exact fix plan — proposed only, not applied

| Issue | Smallest safe change set | Required regression/acceptance |
|---|---|---|
| AUD-001 | Complete the already-separated native content download/read APIs and wire `downloadManager`/native viewer to them; keep disabled until accepted; add owner-bound ciphertext publication, plaintext migration/invalidation and native cache cleanup. Avoid unrelated payment/DB changes | Device ciphertext inspection and interrupted migration, revoke/refund, seven-day expiry/clock rollback, 1/10/50/100 MiB memory/latency and stalled-JS cleanup. Agree device budgets before claiming completion |
| AUD-002 | Prefer verify/provision genuine environment file input if remote custody already exists; otherwise one narrow `.easignore` allow rule with existing exclusions preserved. No Firebase content changes required | EAS archive/build-input evidence, package/project boolean checks and real token upsert; never upload private service-account JSON as an app asset |
| AUD-003 | Change only secure-session adapter record/key-generation handling and necessary adapter regression tests. Atomic referenced generation plus serialization/recovery retains old valid state across failed writes; preserve readable legacy sessions for migration | Inject native-key write failure, ciphertext failure, process interruption, refresh/save/remove overlap; previous committed session must remain readable. Unique counter/nonce requirements must remain safe |
| AUD-004 | Test-only filesystem/config fixtures around staging/non-Play configuration evaluation; explicit expected denial when mismatched real Firebase config exists | Same two scripts green with file present/absent, and invalid staging/package inputs still rejected. Do not weaken runtime guards |
| AUD-005 | One reviewed forward server cleanup migration plus dedicated account-deletion local cleanup; decide each retained identifier/table first, retain provider reconciliation/audit necessities | Populated related tables + verified permitted retention; no unrelated owner/financial damage; erased/Auth-pending/retry cases; local cleanup crash recovery |

No application patch, migration, installation, deployment or test-file edit is included in this audit. Some fixes require native integration or retention decisions; describing them as a one-line flag change would be unsafe and inaccurate.

## 13. Release readiness checklist

- [x] Current source/configuration inspected; existing working-tree changes preserved.
- [x] Local Firebase file exists and matches project/package; Expo resolves it.
- [x] Vault Gradle defaultConfig versionName correction verified unchanged.
- [x] Local TypeScript, lint, Edge static checks and selected synthetic suites executed.
- [ ] Firebase input proven on EAS worker/archive; FCM V1 credentials independently verified.
- [ ] AUD-001 protected offline content integration and AUD-003/AUD-005 acceptance completed.
- [ ] AUD-004 local profile tests made independent of owner filesystem input.
- [ ] Exact signed production AAB built with correct package/version/upload certificate; bundle hash recorded.
- [ ] Final target SDK, permissions, retained Billing modules, backup/debug flags, R8/mapping and native 16 KB compatibility checked on artifact.
- [ ] Real Play-installed clean/upgrade candidate tested: Auth/MFA/recovery, ownership, PDF/offline/account switch/deletion, push and lifecycle.
- [ ] Hosted schema/ACL/RLS/Storage/function parity and complete recovery verified without assuming old report observations remain current.
- [ ] New purchases stay disabled; existing legitimate access/recovery works.
- [ ] Legal URLs, audience/retention declarations, Data Safety, reviewer credentials and Play pre-launch evidence approved.
- [ ] Correct **closed-testing** track chosen and publication separately authorized.

## 14. Final verdict

**BLOCKED for claiming Closed Testing or production readiness.** AUD-001 remains an unmet explicit offline security requirement; AUD-002 has a confirmed local/default handoff defect with unverified remote provisioning; session/deletion issues and real-device/hosted acceptance remain open.

**AAB generation itself: INSUFFICIENT EVIDENCE.** Configuration/static checks are encouraging and the requested Gradle versionName correction exists, but no native build ran and no final signed artifact was inspected. This report does not assert the original missing-release-component error still occurs, nor that a production build now succeeds.

## 15. Audit date and evidence

Date: **2026-11-12 UTC**. Commit and dirty-worktree scope are recorded above. Before any validation, the audit captured Git porcelain status (including untracked files), a project-file inventory and SHA-256 values. Full Markdown text was read into the audit inventory before decisions, with content/purpose/reference review and relevant findings traced back to current source. The scan included ignored project-owned documentation as well as Git-tracked/untracked files; symlink entries were not followed.

Excluded directory names: `node_modules`, `.git`, `.expo`, `.next`, `dist`, `build`, `vendor`, `.cache`, `.gradle`, `.venv`, `venv`, `coverage`; generated/dependency outputs were not treated as project documentation inputs. No third-party package Markdown was deleted. Audit narratives under project-owned `docs/audit` were considered because cleanup of those reports was explicitly requested. No `.markdown` or `.mdx` documentation file was discovered in the resulting inventory.

Current source/config/test indexing covered 898 text files outside generated audit/release copies, including 477 mobile/admin/Edge/migration TypeScript/SQL files. Detailed findings are bounded to inspected implementations, callers and executed checks. Full runtime coverage, every dynamic RPC overload, all deployed rows/policies, every native dependency behavior and absence of undiscovered bugs cannot be certified by repository inspection. Delegated sessions exposed no usable tools and produced no findings; all evidence in this report comes from the primary session's actual work.

Technical documentation consulted: [Expo ignore/archive rules](https://docs.expo.dev/build-reference/easignore/), [Expo FCM V1 setup](https://docs.expo.dev/push-notifications/fcm-credentials/) and the [Supabase changelog](https://supabase.com/changelog.md). Findings rely primarily on the actual checkout and local checks. No package/API migration was undertaken.

Temporary baseline/test/config evidence is under `/tmp/medveda-audit-*` and `/tmp/medveda-doc-*`; it is ephemeral, not an additional repository report. The self-contained inventory, test ledger and final preservation result follow.

### Markdown cleanup policy and retained-document caveats

The final scan found **189 original Markdown files**: **58 deleted**, **131 retained unchanged**, plus this **one new master report** (132 final Markdown files). Two deployment/distribution guides initially considered for removal were retained after a final workflow-reference check.

Retention includes agent instructions, source/SQL/config references, named artifact/checksum inputs, documentation consumed by release-integrity automation, unfinished native design/format contracts and unique legal/operational review material whose importance could not confidently be dismissed. A stale report can therefore remain for provenance without being the current release authority.

Historical whole-checkout hash/status inventories are evidence snapshots, not build dependencies. Their references to removed obsolete narratives are preserved as history. Active release manifests/checksum lists and explicit release-integrity input corpora were protected. Obsolete report-generation scripts may recreate deleted narratives if deliberately rerun; they were neither executed nor edited. Some retained documents have historical links to removed reports; the exact deleted-path inventory below is the lookup record, and current verified findings are here. No source import, live build/CI/test input or pinned named release artifact was deliberately removed.

Retained text is intentionally unchanged, including existing user edits. In particular, `REAL_DEVICE_RELEASE_TEST_CHECKLIST.md:34` still says the final binary should have no Billing SDK/permission, whereas current autolinking and bundle-validation policy retain it; use this report's verified configuration, not that old checklist entry. Older staging/Razorpay profile descriptions, plaintext-license claims, migration counts and deployment observations must likewise be checked against this report/current source. This cleanup did not silently rewrite historical approval or legal documents.

### Appendix A — exact Markdown inventory and decisions

The table below records each original path, tracked/untracked state, content-derived purpose, reference evidence/classification and final KEEP/DELETE decision. “No active dependency identified” does not mean no historical document ever mentioned the path. Retention by review/workflow uncertainty is distinguished from a runtime dependency.


| Exact relative path | Git state | Purpose from content | References / classification / reason | Decision |
|---|---|---|---|---|
| `ADMIN_PANEL_DEPLOYMENT.md` | tracked | Admin panel — Vercel deployment | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `README.md` | tracked | MedVeda repository structure and workflow entry point | essential / conservative retention. Repository entry point and workflow index; package-relative release README checksums do not refer to this root file | **KEEP** |
| `REAL_DEVICE_RELEASE_TEST_CHECKLIST.md` | tracked | Real-device release test checklist | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `SENTRY_SETUP.md` | tracked | Source maps and EAS release verification (26 October 2026) | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `SUPABASE_AUTH_PRODUCTION_CHECKLIST.md` | tracked | Supabase Auth — production checklist (owner) | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `admin-panel/README.md` | tracked | MedVeda admin panel | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/ACCOUNT_DELETION_CHANGE_PROPOSAL.md` | tracked | Account deletion: proposed server change and deployment gate | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/ACCOUNT_DELETION_PAGE_REVIEW.md` | tracked | Account & Data Deletion page — replacement for review | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/ADULTS_ONLY_PRIVACY_ROADMAP.md` | tracked | MedVeda adult-audience privacy and Play review | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/GOOGLE_PLAY_DATA_SAFETY_CHECKLIST.md` | tracked | Google Play Data Safety worksheet — MedVeda | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/PLAY_CATALOG_SYNC_SETUP.md` | tracked | MedVeda Play catalog synchronization: setup and release handoff | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/PRIVACY_POLICY_DRAFT.md` | tracked | MedVeda Privacy Policy — Draft for Legal Review | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/RELEASE_GATES.md` | tracked | MedVeda release gates | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Pre-existing user modification preserved byte-for-byte | **KEEP** |
| `docs/TERMS_REVIEW_DRAFT.md` | tracked | MedVeda Terms & Conditions — review copy | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/audit/DIAGNOSTICS_RETIREMENT_20261026.md` | tracked | Diagnostic surface and later retirement | essential / conservative retention. No active source/config/CI/test input identified. Unique unresolved operational procedure referenced by retained release gates | **KEEP** |
| `docs/audit/MEDVEDA_ANDROID_IDE_TOOLCHAIN_2026-11-10.md` | untracked | Local Android / VS Code Toolchain Audit | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_ANDROID_NATIVE_RELEASE_READINESS_2026-11-11.md` | untracked | MedVeda Android native release readiness — 2026-11-11 | essential / conservative retention. References: `docs/audit/evidence/android-native-20261111/artifact-manifest.json`. Named artifact/provenance manifest docs/audit/evidence/android-native-20261111/artifact-manifest.json | **KEEP** |
| `docs/audit/MEDVEDA_ANDROID_RELEASE_BLOCKER_FIX_2026-11-11.md` | untracked | MedVeda Android release blocker fixes — 2026-11-11 | essential / conservative retention. References: `docs/audit/evidence/android-blocker-fix-20261111/artifact-manifest.json`. Named artifact/provenance manifest docs/audit/evidence/android-blocker-fix-20261111/artifact-manifest.json | **KEEP** |
| `docs/audit/MEDVEDA_BILLING_FIXES_2026-11-09.md` | untracked | MedVeda billing fixes and verification — 9 November 2026 | essential / conservative retention. References: `docs/audit/evidence/billing-fixes-20261109/source-manifest.json`. Named artifact/provenance manifest docs/audit/evidence/billing-fixes-20261109/source-manifest.json | **KEEP** |
| `docs/audit/MEDVEDA_B_TO_C_ATOMIC_REHEARSAL_2026-11-11.md` | untracked | MEDVEDA — Final B-to-C compatibility and atomic migration rehearsal | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_CLOSED_TESTING_2026-11-08.md` | untracked | **MedVeda closed-testing preparation — 8 November 2026** | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MIGRATION_REPEATABILITY_PREFLIGHT_2026-11-10.md` | untracked | Isolated test migration repeatability — 10 November 2026 | essential / conservative retention. References: `docs/audit/evidence/migration-repeatability-20261110/artifact-manifest.json`. Named artifact/provenance manifest docs/audit/evidence/migration-repeatability-20261110/artifact-manifest.json | **KEEP** |
| `docs/audit/MEDVEDA_MOBILE_PRODUCTION_FULL_AUDIT_2026-11-10.md` | untracked | MedVeda Android production audit — 2026-11-10 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MOBILE_RELEASE_REVIEW_2026-11-04.md` | tracked | **NO-GO for the production AAB — 4 November 2026.** Android remote push configuration is missing. One reproduced course/year selection race was fixed; | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MV001_PAYMENT_READINESS_2026-11-11.md` | untracked | MV001 — production payment readiness — 2026-11-11 | essential / conservative retention. References: `docs/audit/evidence/mv001-20261111/artifact-manifest.json`. Named artifact/provenance manifest docs/audit/evidence/mv001-20261111/artifact-manifest.json | **KEEP** |
| `docs/audit/MEDVEDA_MV003_LOCAL_FIX_2026-11-10.md` | untracked | MV003 — local entitlement commitment fix — 2026-11-10 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MV004_LOCAL_FIX_2026-11-10.md` | untracked | MV004 — payment recovery authorization — 2026-11-10 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MV005_LOCAL_FIX_2026-11-10.md` | untracked | MV005 — Razorpay financial state consistency — 2026-11-10 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MV006_LOCAL_FIX_2026-11-10.md` | untracked | MV006 — successful purchase ownership — 2026-11-10 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MV007_GOOGLE_PLAY_BILLING_REMOVAL_2026-11-11.md` | untracked | MV007 — Google Play Billing removal gate and safe cleanup — 2026-11-11 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MV008_LOCAL_FIX_2026-11-10.md` | untracked | MV008 — purchase ownership refresh race — 2026-11-10 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MV009_LOCAL_FIX_2026-11-11.md` | untracked | MV009 — Store network, empty and retry handling — 2026-11-11 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MV010_LOCAL_FIX_2026-11-11.md` | untracked | MV010 — Notes purchase options errors, retry and isolation — 2026-11-11 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MV011_LOCAL_FIX_2026-11-11.md` | untracked | MV011 — Purchase action contrast, semantics and readability — 2026-11-11 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_MV012_LOCAL_FIX_2026-11-11.md` | untracked | MV012 — My Purchases chronological sorting — 2026-11-11 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_NONPLAY_TEST_ISOLATION_2026-11-09.md` | untracked | Isolated Razorpay Test Mode implementation — 9 November 2026 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_NOTES_BILLING_CHOICE_2026-11-08.md` | untracked | Paid Notes billing choice — 8 November 2026 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_PERF_ANDROID_CHECKLIST_2026-10-27.md` | tracked | Android regression and performance checklist — 27 October 2026 | essential / conservative retention. No active source/config/CI/test input identified. Unique unresolved operational procedure referenced by retained release gates | **KEEP** |
| `docs/audit/MEDVEDA_PHASE_A_FINAL_SAFETY_REVIEW_2026-11-11.md` | untracked | MedVeda Phase A final safety review — 2026-11-11 | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/MEDVEDA_PHASE_A_OPERATOR_RUNBOOK_2026-11-11.md` | untracked | MedVeda Phase A operator runbook — 2026-11-11 | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/MEDVEDA_PHASE_B_EDGE_COMPATIBILITY_2026-11-11.md` | untracked | MedVeda Phase B Edge compatibility — 2026-11-11 | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/MEDVEDA_PHASE_C_LOCAL_READINESS_2026-11-11.md` | untracked | MedVeda Phase C billing integration local readiness — 2026-11-11 | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/MEDVEDA_PLAY_PATCH_403_2026-10-27.md` | tracked | MedVeda One-time Products PATCH 403 | essential / conservative retention. No active source/config/CI/test input identified. Unique unresolved operational procedure referenced by retained release gates | **KEEP** |
| `docs/audit/MEDVEDA_PRODUCTION_BACKUP_RESTORE_READINESS_20261023.md` | tracked | MedVeda backup restore audit — 2026-10-23 | essential / conservative retention. No active source/config/CI/test input identified. Unique unresolved operational procedure referenced by retained release gates | **KEEP** |
| `docs/audit/MEDVEDA_PRODUCTION_BUY_NOW_ACTIVATION_READINESS_2026-11-11.md` | untracked | MedVeda production Buy Now activation readiness — 2026-11-11 | essential / conservative retention. References: `docs/audit/evidence/buy-now-activation-20261111/artifact-manifest.json`. Named artifact/provenance manifest docs/audit/evidence/buy-now-activation-20261111/artifact-manifest.json | **KEEP** |
| `docs/audit/MEDVEDA_PRODUCTION_DEFAULT_OFF_PREFLIGHT_2026-11-10.md` | untracked | Production default-OFF preflight — 10 November 2026 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_PRODUCTION_DEPLOYMENT_PREFLIGHT_2026-11-11.md` | untracked | MedVeda production deployment preflight — 2026-11-11 | essential / conservative retention. References: `docs/audit/evidence/production-preflight-20261111/artifact-manifest.json`. Named artifact/provenance manifest docs/audit/evidence/production-preflight-20261111/artifact-manifest.json | **KEEP** |
| `docs/audit/MEDVEDA_PRODUCTION_MIGRATION_EXECUTION_PACKAGE_2026-11-11.md` | untracked | Production migration execution package — 2026-11-11 UTC | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/MEDVEDA_RAZORPAY_FIXES_2026-11-04.md` | tracked | Razorpay deployment, acceptance and rollback handoff | essential / conservative retention. References: `docs/RELEASE_GATES.md`, `REAL_DEVICE_RELEASE_TEST_CHECKLIST.md`. Explicit deployment/rollback and isolated-distribution workflow used by retained release gates and real-device checklist; dated facts require revalidation | **KEEP** |
| `docs/audit/MEDVEDA_RAZORPAY_INTERNAL_TEST_ROUTING_2026-11-04.md` | tracked | **Local routing enabled for the new `razorpay-internal-test` Android profile. Hosted payment and Notes unlock remain UNVERIFIED.** | essential / conservative retention. References: `docs/RELEASE_GATES.md`, `REAL_DEVICE_RELEASE_TEST_CHECKLIST.md`. Explicit deployment/rollback and isolated-distribution workflow used by retained release gates and real-device checklist; dated facts require revalidation | **KEEP** |
| `docs/audit/MEDVEDA_RELEASE_COMPATIBILITY_STAGING_READINESS_20261023.md` | tracked | Quiz and admin URL migration: compatibility and recovery | essential / conservative retention. No active source/config/CI/test input identified. Unique unresolved operational procedure referenced by retained release gates | **KEEP** |
| `docs/audit/MEDVEDA_STARTUP_PAYMENTS_2026-11-08.md` | untracked | MedVeda startup and Notes checkout — 8 November 2026 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/PRIVACY_OWNER_ACTIONS_20261026.md` | tracked | Privacy wording and owner operations | essential / conservative retention. No active source/config/CI/test input identified. Unique unresolved operational procedure referenced by retained release gates | **KEEP** |
| `docs/audit/android-build-preflight-20261111_161541/AAB_VALIDATION_PLAN.md` | untracked | Validation of the future genuine AAB | essential / conservative retention. References: `docs/audit/android-build-preflight-20261111_161541/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/android-build-preflight-20261111_161541/SHA256SUMS | **KEEP** |
| `docs/audit/android-build-preflight-20261111_161541/ANDROID_CONFIGURATION.md` | untracked | Android configuration and native consistency | essential / conservative retention. References: `docs/audit/android-build-preflight-20261111_161541/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/android-build-preflight-20261111_161541/SHA256SUMS | **KEEP** |
| `docs/audit/android-build-preflight-20261111_161541/BUILD_GO_NO_GO.md` | untracked | Android build GO / NO-GO | essential / conservative retention. References: `docs/audit/android-build-preflight-20261111_161541/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/android-build-preflight-20261111_161541/SHA256SUMS | **KEEP** |
| `docs/audit/android-build-preflight-20261111_161541/EAS_BUILD_PREFLIGHT.md` | untracked | EAS production build preflight | essential / conservative retention. References: `docs/audit/android-build-preflight-20261111_161541/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/android-build-preflight-20261111_161541/SHA256SUMS | **KEEP** |
| `docs/audit/android-build-preflight-20261111_161541/FIREBASE_FCM_REQUIREMENTS.md` | untracked | Firebase client and FCM v1 requirements | essential / conservative retention. References: `docs/audit/android-build-preflight-20261111_161541/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/android-build-preflight-20261111_161541/SHA256SUMS | **KEEP** |
| `docs/audit/android-build-preflight-20261111_161541/MISSING_OWNER_INPUTS.md` | untracked | Missing owner inputs and secure setup sequence | essential / conservative retention. References: `docs/audit/android-build-preflight-20261111_161541/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/android-build-preflight-20261111_161541/SHA256SUMS | **KEEP** |
| `docs/audit/android-build-preflight-20261111_161541/README.md` | untracked | Android build preflight — owner handoff | essential / conservative retention. References: `docs/audit/android-build-preflight-20261111_161541/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/android-build-preflight-20261111_161541/SHA256SUMS | **KEEP** |
| `docs/audit/android-build-preflight-20261111_161541/TEST_RESULTS.md` | untracked | Android preflight test results | essential / conservative retention. References: `docs/audit/android-build-preflight-20261111_161541/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/android-build-preflight-20261111_161541/SHA256SUMS | **KEEP** |
| `docs/audit/android-native-toolchain-readiness-20261111/COMMANDS.md` | untracked | Proposed commands — approval required before provisioning or compilation | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/android-native-toolchain-readiness-20261111/REPORT.md` | untracked | MEDVEDA / AyurPulse — Android native toolchain readiness | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/evidence/b-to-c-atomic-20261111/README.md` | untracked | Local atomic B-to-C rehearsal evidence | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/evidence/diagnostic-401-20261020/README.md` | tracked | Admin diagnostic 401 release snapshot | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/final-local-blockers-20261111/DESIGN-PLAN.md` | untracked | Final local blockers: approved narrow fix and implementation plan | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/final-local-blockers-20261111/REPORT.md` | untracked | MEDVEDA / AyurPulse — final local blocker increment, 11 November 2026 UTC | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/final-local-blockers-20261111/evidence/review.md` | untracked | Independent scoped review | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/full-project-2026-11-11_123321/ANDROID_AND_FRONTEND_AUDIT.md` | untracked | ANDROID AND FRONTEND AUDIT | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/full-project-2026-11-11_123321/COMPLETE_PROJECT_DEEP_AUDIT.md` | untracked | COMPLETE PROJECT DEEP AUDIT | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/full-project-2026-11-11_123321/DATABASE_PUSH_READINESS.md` | untracked | DATABASE PUSH READINESS | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/full-project-2026-11-11_123321/FEATURE_COMPLETENESS_MATRIX.md` | untracked | FEATURE COMPLETENESS MATRIX | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/full-project-2026-11-11_123321/NOTES_UNLOCKING_END_TO_END_AUDIT.md` | untracked | NOTES UNLOCKING END TO END AUDIT | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/full-project-2026-11-11_123321/PRODUCTION_READINESS_GO_NO_GO.md` | untracked | PRODUCTION READINESS GO NO GO | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/full-project-2026-11-11_123321/RAZORPAY_PAYMENT_AUDIT.md` | untracked | RAZORPAY PAYMENT AUDIT | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/full-project-2026-11-11_123321/README.md` | untracked | MEDVEDA / AyurPulse independent audit — 2026-11-11 | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/full-project-2026-11-11_123321/REMAINING_WORK_PRIORITY_CHECKLIST.md` | untracked | REMAINING WORK PRIORITY CHECKLIST | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/full-project-2026-11-11_123321/SECURITY_AND_BUG_REPORT.md` | untracked | SECURITY AND BUG REPORT | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/full-project-2026-11-11_123321/evidence/TEST_EXECUTION.md` | untracked | Fresh test execution ledger | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/full-project-2026-11-11_123321/evidence/reproduced-atomic/README.md` | untracked | Local atomic B-to-C rehearsal evidence | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/native-encryption-phase1-20261111/REPORT.md` | untracked | Native offline encryption — Phase 1 foundation increment | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/native-encryption-phase1-20261111/security-review.md` | untracked | Independent security review — dormant native encryption core | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/native-encryption-phase1b-20261111/REPORT.md` | untracked | MEDVEDA / AyurPulse — incremental Phase 1B native integration | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/native-encryption-phase1b-20261111/security-review.md` | untracked | Phase 1B independent security review — 2026-11-11 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/native-encryption-phase1c-20261111/REPORT.md` | untracked | MEDVEDA / AyurPulse — incremental Phase 1C Android native verification | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/native-encryption-phase1c-20261111/security-review.md` | untracked | Phase 1C independent security review — 2026-11-11 | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p0-closure-20261111_134419/FINANCIAL_RECONCILIATION_REQUIREMENTS.md` | untracked | Financial reconciliation requirements | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p0-closure-20261111_134419/FULL_RECOVERY_AND_RESTORE_PLAN.md` | untracked | Full recovery and restore plan | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p0-closure-20261111_134419/INDEPENDENT_P0_VERIFICATION.md` | untracked | Independent P0 verification | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p0-closure-20261111_134419/MIGRATION_74_SAFETY_REVIEW.md` | untracked | Migration 74 safety review | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p0-closure-20261111_134419/P0_FINAL_GO_NO_GO.md` | untracked | Final P0 closure and production decision | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p0-closure-20261111_134419/P0_OWNER_ACTION_CHECKLIST.md` | untracked | P0 owner action checklist | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p0-closure-20261111_134419/README.md` | untracked | Independent P0 closure verification — 2026-11-11 UTC | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p0-closure-20261111_134419/RELEASE_PACKAGE_INTEGRITY.md` | untracked | Release package integrity | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p0-closure-20261111_134419/evidence/COMMANDS.md` | untracked | Execution ledger | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p0-critical-remediation-20261111_131014/CRITICAL_SECURITY_FIXES.md` | untracked | Critical/high security remediation | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/DATABASE_TEST_FAILURES_AND_FIXES.md` | untracked | Database failures and fixes | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/FILE_CHANGE_INVENTORY.md` | untracked | Exact task file inventory and preservation | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/FINANCIAL_INTEGRITY_FINDINGS.md` | untracked | Financial integrity findings | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/P0_EXECUTIVE_SUMMARY.md` | untracked | P0 executive summary | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/P0_REMAINING_BLOCKERS.md` | untracked | Remaining P0 blockers — production NO-GO | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/PAYMENT_ENTITLEMENT_SECURITY.md` | untracked | Payment commitment and entitlement security | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/PHASE_A_B_C_COMPATIBILITY_REVIEW.md` | untracked | A/B/C compatibility review and P0 forward dependency | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/PRODUCTION_RECOVERY_READINESS.md` | untracked | Production recovery readiness — BLOCKED | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/README.md` | untracked | MEDVEDA / AyurPulse — P0 critical remediation | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/RELEASE_PACKAGE_REVIEW.md` | untracked | Review-ready P0 package | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p0-critical-remediation-20261111_131014/TEST_RESULTS.md` | untracked | Test results and reproducibility | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/evidence/verify-artifacts.py`, `docs/audit/remaining-readiness-20261111/evidence/check-integrity.py`, `docs/audit/p0-closure-20261111_134419/evidence/check-integrity.py`. Prior evidence explicitly consumed by retained release-integrity automation; preserve its input corpus | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/ANDROID_RELEASE_ACCEPTANCE_PLAN.md` | untracked | Future payment-disabled Android release acceptance plan | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/ANDROID_RELEASE_READINESS.md` | untracked | Android release engineering | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/COMPLETE_TEST_RESULTS.md` | untracked | Complete local verification and limits | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/FILE_CHANGE_INVENTORY.md` | untracked | Exact P1 file change inventory | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/FIREBASE_FCM_READINESS.md` | untracked | Firebase and FCM readiness | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/GOOGLE_PLAY_BILLING_READINESS.md` | untracked | Google Play Billing and native user choice | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/MOBILE_RELIABILITY_AND_ACCESSIBILITY.md` | untracked | Mobile reliability and accessibility | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/NOTES_ENTITLEMENT_AND_PDF_SECURITY.md` | untracked | Notes ownership and protected PDF security | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/P1_EXECUTIVE_SUMMARY.md` | untracked | P1 executive answers | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/P1_FINAL_GO_NO_GO.md` | untracked | P1 final decision | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/P1_REMAINING_BLOCKERS.md` | untracked | P1 remaining blockers and owner actions | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/RAZORPAY_PAYMENT_FLOW_VERIFICATION.md` | untracked | Razorpay payment-flow verification | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/README.md` | untracked | P1 local remediation and Android acceptance preparation | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p1-local-readiness-20261111_142055/REPORTING_WORKERS_AND_MONITORING.md` | untracked | Reporting workers and operational acceptance | essential / conservative retention. References: `docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json`. Relative artifact manifest docs/audit/p1-local-readiness-20261111_142055/evidence/final-artifact-manifest.json | **KEEP** |
| `docs/audit/p2-final-quality-20261111_150037/ACCESSIBILITY_AUDIT.md` | untracked | Accessibility in tested scope | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/ADMIN_DASHBOARD_VERIFICATION.md` | untracked | Admin verification | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/CI_AND_BUILD_VERIFICATION.md` | untracked | CI/build evidence | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/CODE_QUALITY_FIXES.md` | untracked | Code correctness | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/END_TO_END_TEST_RESULTS.md` | untracked | Local journey results | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/FILE_CHANGE_INVENTORY.md` | untracked | P2 file inventory | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/FINAL_PROJECT_READINESS.md` | untracked | Final readiness | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/FULL_PROJECT_TEST_MATRIX.md` | untracked | Full command matrix | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/P2_EXECUTIVE_SUMMARY.md` | untracked | P2 executive answers | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/PERFORMANCE_OPTIMIZATION.md` | untracked | Measured local optimization | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/README.md` | untracked | P2 final quality and regression | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/REMAINING_EXTERNAL_BLOCKERS.md` | untracked | Remaining acceptance gates | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/SECURITY_REGRESSION.md` | untracked | Security/P0/P1 regression | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/p2-final-quality-20261111_150037/UI_UX_FIXES.md` | untracked | P2 UI and workflow fixes | superseded audit / temporary report. No active source/config/CI/test input identified. Historical audit, implementation recap or temporary evidence narrative; current verified findings consolidated; no live source/CI/test/build input identified | **DELETE** |
| `docs/audit/payment-migration-preflight/REPORT.md` | untracked | MedVeda production payment migration preflight | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/payment-migration-preflight/closure/SHA256SUMS; Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/audit/payment-migration-preflight/closure/APPROVAL_PACKAGE.md` | untracked | Approval cover sheet — not signed, no execution authority | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/payment-migration-preflight/closure/SHA256SUMS; Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/audit/payment-migration-preflight/closure/ARTIFACTS.md` | untracked | Frozen staged package review | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/payment-migration-preflight/closure/SHA256SUMS; Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/audit/payment-migration-preflight/closure/COMMANDS.md` | untracked | Verification command record | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/payment-migration-preflight/closure/SHA256SUMS; Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/audit/payment-migration-preflight/closure/DRIFT_REVIEW.md` | untracked | Read-only live drift review — approval required before execution | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/payment-migration-preflight/closure/SHA256SUMS; Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/audit/payment-migration-preflight/closure/PLAN.md` | untracked | Payment blocker closure verification plan | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/payment-migration-preflight/closure/SHA256SUMS; Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/audit/payment-migration-preflight/closure/RECONCILIATION.md` | untracked | Private read-only reconciliation and provider checklist | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/payment-migration-preflight/closure/SHA256SUMS; Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/audit/payment-migration-preflight/closure/RESTORE_REHEARSAL.md` | untracked | Coordinated recovery rehearsal and acceptance | essential / conservative retention. References: `docs/audit/payment-migration-preflight/closure/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/payment-migration-preflight/closure/SHA256SUMS; Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/audit/production-execution-20261111/APPROVAL-TEMPLATE.md` | untracked | Unsigned approval record — NOT AUTHORIZATION | essential / conservative retention. References: `docs/audit/production-execution-20261111/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/production-execution-20261111/SHA256SUMS; Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/audit/production-execution-20261111/RUNBOOK.md` | untracked | Production migration execution runbook — 2026-11-11 UTC | essential / conservative retention. References: `docs/audit/production-execution-20261111/SHA256SUMS`, `supabase/releases/p0-critical-20261111_131014/manifest.json`. Pinned by exact checksum inventory docs/audit/production-execution-20261111/SHA256SUMS; Named artifact/provenance manifest supabase/releases/p0-critical-20261111_131014/manifest.json; Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/audit/remaining-readiness-20261111/PLAN.md` | untracked | Remaining local readiness verification | essential / conservative retention. References: `docs/audit/remaining-readiness-20261111/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/remaining-readiness-20261111/SHA256SUMS | **KEEP** |
| `docs/audit/remaining-readiness-20261111/REPORT.md` | untracked | MEDVEDA / AyurPulse remaining readiness — 11 November 2026 UTC | essential / conservative retention. References: `docs/audit/remaining-readiness-20261111/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/remaining-readiness-20261111/SHA256SUMS | **KEEP** |
| `docs/audit/remaining-readiness-20261111/evidence/code-review.md` | untracked | Independent review | essential / conservative retention. References: `docs/audit/remaining-readiness-20261111/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/remaining-readiness-20261111/SHA256SUMS | **KEEP** |
| `docs/audit/remaining-readiness-20261111/evidence/command-matrix.md` | untracked | Recorded command matrix | essential / conservative retention. References: `docs/audit/remaining-readiness-20261111/SHA256SUMS`. Pinned by exact checksum inventory docs/audit/remaining-readiness-20261111/SHA256SUMS | **KEEP** |
| `docs/legacy-sql/README.md` | tracked | Historical SQL kept for reference only. These files were loose in `supabase/migrations/` without a | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/multi-course-analysis.md` | tracked | Multi-Course Upgrade — Phase 1 Analysis | essential / conservative retention. References: `supabase/migrations/20260919120000_multi_course_and_referrals.sql`, `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Source/configuration reference supabase/migrations/20260919120000_multi_course_and_referrals.sql; Source/configuration reference supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql | **KEEP** |
| `docs/multi-course-changes.md` | tracked | Multi-Course Upgrade — Final Report | essential / conservative retention. References: `supabase/migrations/20260920120000_null_year_course_fallback.sql`, `supabase/migrations/20260920140000_default_new_profile_course.sql`, `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Source/configuration reference supabase/migrations/20260920120000_null_year_course_fallback.sql; Source/configuration reference supabase/migrations/20260920140000_default_new_profile_course.sql; Source/configuration reference supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql | **KEEP** |
| `docs/phase0/BACKUP_GUIDE.md` | tracked | Phase 0 — Backup and abuse check (do this before ANY production change) | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/phase1/APPLY_AND_VERIFY.md` | tracked | Phase 1 — Apply and verify, in two steps (REVIEW ONLY: nothing here has touched production) | essential / conservative retention. References: `docs/phase1/repair_clobbered_orders.sql`, `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Source/configuration reference docs/phase1/repair_clobbered_orders.sql; Source/configuration reference supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql | **KEEP** |
| `docs/phase1/OLD_BUILD_COMPATIBILITY.md` | tracked | Old app builds: what they use, and what Phase 1A / 1B do to them | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/phase1/queries/old_builds_from_logs.md` | tracked | Which app builds are alive, and do any still use public note URLs? | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/phase2/REFERRAL_WALLET.md` | tracked | Phase 2 — Referral rewards + wallet | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/security/ADMIN_MFA.md` | tracked | Admin MFA (AAL2) | essential / conservative retention. References: `admin-panel/src/pages/Login.tsx`, `supabase/migrations/20261001100000_admin_mfa_aal2.sql`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Source/configuration reference admin-panel/src/pages/Login.tsx; Source/configuration reference supabase/migrations/20261001100000_admin_mfa_aal2.sql | **KEEP** |
| `docs/security/PASSWORD_POLICY.md` | tracked | Password policy — what is enforced where | essential / conservative retention. References: `mobile-app/src/validation/passwordPolicy.ts`, `supabase/config.toml`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Source/configuration reference supabase/config.toml; Source/configuration reference mobile-app/src/validation/passwordPolicy.ts | **KEEP** |
| `docs/security/PASSWORD_RECOVERY_MFA.md` | tracked | Password recovery MFA fix — local verification | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/security/SECURITY_FIX_NOTES.md` | tracked | MedVeda security fixes (audit round 1) | essential / conservative retention. References: `supabase/migrations/20260924110000_critical2_orders_server_only.sql`, `supabase/migrations/20260924150000_free_preview.sql`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Source/configuration reference supabase/migrations/20260924110000_critical2_orders_server_only.sql; Source/configuration reference supabase/migrations/20260924150000_free_preview.sql | **KEEP** |
| `docs/security/review-20261020/README.md` | tracked | Historical security review — product-model correction | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `docs/superpowers/plans/2026-11-11-native-encryption-phase1.md` | untracked | Native encryption Phase 1 implementation plan | essential / conservative retention. No active source/config/CI/test input identified. Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/superpowers/plans/2026-11-11-native-encryption-phase1b.md` | untracked | Native encryption Phase 1B implementation plan | essential / conservative retention. No active source/config/CI/test input identified. Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `docs/superpowers/specs/2026-11-11-native-offline-encryption-design.md` | untracked | MEDVEDA / AyurPulse — native offline encryption design | essential / conservative retention. No active source/config/CI/test input identified. Current incomplete native design or reviewed migration execution/recovery workflow | **KEEP** |
| `mobile-app/AGENTS.md` | tracked | Expo HAS CHANGED | essential / conservative retention. References: `docs/audit/evidence/closed-testing-20261108/source-manifest.json`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Agent instruction discovery; CLAUDE includes AGENTS; Named artifact/provenance manifest docs/audit/evidence/closed-testing-20261108/source-manifest.json | **KEEP** |
| `mobile-app/CLAUDE.md` | tracked | @AGENTS.md | essential / conservative retention. References: `docs/audit/evidence/closed-testing-20261108/source-manifest.json`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Agent instruction discovery; CLAUDE includes AGENTS; Named artifact/provenance manifest docs/audit/evidence/closed-testing-20261108/source-manifest.json | **KEEP** |
| `mobile-app/DATA_SAFETY_AUDIT.md` | tracked | MedVeda Google Play Data Safety Audit | essential / conservative retention. References: `docs/audit/evidence/closed-testing-20261108/source-manifest.json`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Pre-existing user modification preserved byte-for-byte; Named artifact/provenance manifest docs/audit/evidence/closed-testing-20261108/source-manifest.json | **KEEP** |
| `mobile-app/OFFLINE_MODE_SETUP.md` | tracked | Offline content setup and verification | essential / conservative retention. References: `docs/audit/evidence/closed-testing-20261108/source-manifest.json`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Named artifact/provenance manifest docs/audit/evidence/closed-testing-20261108/source-manifest.json | **KEEP** |
| `mobile-app/PLAY_STORE_SUBMISSION.md` | tracked | MedVeda — Play Store Submission Guide | essential / conservative retention. References: `docs/audit/evidence/closed-testing-20261108/source-manifest.json`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Pre-existing user modification preserved byte-for-byte; Named artifact/provenance manifest docs/audit/evidence/closed-testing-20261108/source-manifest.json | **KEEP** |
| `mobile-app/modules/medveda-offline-vault/FORMAT.md` | untracked | MVPDF/1 foundation wire format | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `mobile-app/modules/medveda-offline-vault/PHASE1B.md` | untracked | Phase 1B dormant native control integration | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `mobile-app/modules/medveda-offline-vault/README.md` | untracked | Dormant native encryption foundation | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `scripts/ucb-secrets-set.md` | tracked | Set UCB Edge Function secrets | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `supabase/DEPLOY_ORDER.md` | tracked | Backend deployment order and operations | essential / conservative retention. References: `mobile-app/src/config/sentry.ts`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Source/configuration reference mobile-app/src/config/sentry.ts | **KEEP** |
| `supabase/SECURITY_NOTICE.md` | tracked | Secrets handling | essential / conservative retention. References: `supabase/functions/_shared/razorpay.ts`, `supabase/releases/b-to-c-compatible-20261111/functions/_shared/razorpay.ts`, `supabase/releases/p0-critical-20261111_131014/functions/_shared/razorpay.ts`, `supabase/releases/phase-b-20261111/functions/_shared/razorpay.ts`, `supabase/releases/phase-c-20261111/functions/_shared/razorpay.ts`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Source/configuration reference supabase/functions/_shared/razorpay.ts; Source/configuration reference supabase/releases/phase-b-20261111/functions/_shared/razorpay.ts; Source/configuration reference supabase/releases/phase-c-20261111/functions/_shared/razorpay.ts; Source/configuration reference supabase/releases/b-to-c-compatible-20261111/functions/_shared/razorpay.ts; Source/configuration reference supabase/releases/p0-critical-20261111_131014/functions/_shared/razorpay.ts | **KEEP** |
| `supabase/functions/diagnose-play-pricing/README.md` | tracked | Pricing conversion diagnostic (prepared; not deployed) | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `supabase/functions/diagnose-play-service-account/README.md` | tracked | `GET /functions/v1/diagnose-play-service-account` checks the runtime | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `supabase/held/batch2-videos/README.md` | tracked | Batch 2 (paid videos) - HELD INDEFINITELY, NOT DEPLOYED | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `supabase/releases/b-to-c-compatible-20261111/README.md` | untracked | B-to-C compatible upgrade candidate | essential / conservative retention. References: `supabase/releases/b-to-c-compatible-20261111/checksums.sha256`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Pinned by exact checksum inventory supabase/releases/b-to-c-compatible-20261111/checksums.sha256 | **KEEP** |
| `supabase/releases/p0-critical-20261111_131014/README.md` | untracked | P0 release review candidate — 2026-11-11 | essential / conservative retention. References: `supabase/releases/p0-critical-20261111_131014/checksums.sha256`, `supabase/releases/p0-critical-20261111_131014/manifest.json`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Pinned by exact checksum inventory supabase/releases/p0-critical-20261111_131014/checksums.sha256; Relative artifact manifest supabase/releases/p0-critical-20261111_131014/manifest.json | **KEEP** |
| `supabase/releases/p0-critical-20261111_131014/RUNBOOK.md` | untracked | Operator review runbook — execution prohibited without separate approval | essential / conservative retention. References: `supabase/releases/p0-critical-20261111_131014/checksums.sha256`, `supabase/releases/p0-critical-20261111_131014/manifest.json`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Pinned by exact checksum inventory supabase/releases/p0-critical-20261111_131014/checksums.sha256; Relative artifact manifest supabase/releases/p0-critical-20261111_131014/manifest.json | **KEEP** |
| `supabase/releases/phase-c-20261111/README.md` | untracked | Phase C local review package — 2026-11-11 | essential / conservative retention. References: `supabase/releases/phase-c-20261111/checksums.sha256`. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively; Pinned by exact checksum inventory supabase/releases/phase-c-20261111/checksums.sha256 | **KEEP** |
| `supabase/staging/MIGRATION_SAFETY_AUDIT.md` | tracked | MedVeda staging migration safety audit — 2026-10-23 | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `supabase/staging/README.md` | tracked | Isolated staging preparation | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `supabase/tests/delete-account-harness/README.md` | tracked | Runs supabase/functions/delete-account/index.ts on Node 22 against a scratch Postgres | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `supabase/tests/legacy/README.md` | tracked | Retired suites. They assert database states from before later hardening (pre-lockdown grants, | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `website/DEPLOYMENT_CHECKLIST.md` | tracked | Website deployment checklist (owner) | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |
| `website/README.md` | tracked | MedVeda website (www.medveda.in) | essential / conservative retention. No active source/config/CI/test input identified. Unique current workflow, legal review, safety, schema provenance, format or setup reference; importance retained conservatively | **KEEP** |

### Appendix B — exact retained original Markdown paths

```text
ADMIN_PANEL_DEPLOYMENT.md
README.md
REAL_DEVICE_RELEASE_TEST_CHECKLIST.md
SENTRY_SETUP.md
SUPABASE_AUTH_PRODUCTION_CHECKLIST.md
admin-panel/README.md
docs/ACCOUNT_DELETION_CHANGE_PROPOSAL.md
docs/ACCOUNT_DELETION_PAGE_REVIEW.md
docs/ADULTS_ONLY_PRIVACY_ROADMAP.md
docs/GOOGLE_PLAY_DATA_SAFETY_CHECKLIST.md
docs/PLAY_CATALOG_SYNC_SETUP.md
docs/PRIVACY_POLICY_DRAFT.md
docs/RELEASE_GATES.md
docs/TERMS_REVIEW_DRAFT.md
docs/audit/DIAGNOSTICS_RETIREMENT_20261026.md
docs/audit/MEDVEDA_ANDROID_NATIVE_RELEASE_READINESS_2026-11-11.md
docs/audit/MEDVEDA_ANDROID_RELEASE_BLOCKER_FIX_2026-11-11.md
docs/audit/MEDVEDA_BILLING_FIXES_2026-11-09.md
docs/audit/MEDVEDA_MIGRATION_REPEATABILITY_PREFLIGHT_2026-11-10.md
docs/audit/MEDVEDA_MV001_PAYMENT_READINESS_2026-11-11.md
docs/audit/MEDVEDA_PERF_ANDROID_CHECKLIST_2026-10-27.md
docs/audit/MEDVEDA_PHASE_A_FINAL_SAFETY_REVIEW_2026-11-11.md
docs/audit/MEDVEDA_PHASE_A_OPERATOR_RUNBOOK_2026-11-11.md
docs/audit/MEDVEDA_PHASE_B_EDGE_COMPATIBILITY_2026-11-11.md
docs/audit/MEDVEDA_PHASE_C_LOCAL_READINESS_2026-11-11.md
docs/audit/MEDVEDA_PLAY_PATCH_403_2026-10-27.md
docs/audit/MEDVEDA_PRODUCTION_BACKUP_RESTORE_READINESS_20261023.md
docs/audit/MEDVEDA_PRODUCTION_BUY_NOW_ACTIVATION_READINESS_2026-11-11.md
docs/audit/MEDVEDA_PRODUCTION_DEPLOYMENT_PREFLIGHT_2026-11-11.md
docs/audit/MEDVEDA_RAZORPAY_FIXES_2026-11-04.md
docs/audit/MEDVEDA_RAZORPAY_INTERNAL_TEST_ROUTING_2026-11-04.md
docs/audit/MEDVEDA_RELEASE_COMPATIBILITY_STAGING_READINESS_20261023.md
docs/audit/PRIVACY_OWNER_ACTIONS_20261026.md
docs/audit/android-build-preflight-20261111_161541/AAB_VALIDATION_PLAN.md
docs/audit/android-build-preflight-20261111_161541/ANDROID_CONFIGURATION.md
docs/audit/android-build-preflight-20261111_161541/BUILD_GO_NO_GO.md
docs/audit/android-build-preflight-20261111_161541/EAS_BUILD_PREFLIGHT.md
docs/audit/android-build-preflight-20261111_161541/FIREBASE_FCM_REQUIREMENTS.md
docs/audit/android-build-preflight-20261111_161541/MISSING_OWNER_INPUTS.md
docs/audit/android-build-preflight-20261111_161541/README.md
docs/audit/android-build-preflight-20261111_161541/TEST_RESULTS.md
docs/audit/full-project-2026-11-11_123321/ANDROID_AND_FRONTEND_AUDIT.md
docs/audit/full-project-2026-11-11_123321/COMPLETE_PROJECT_DEEP_AUDIT.md
docs/audit/full-project-2026-11-11_123321/DATABASE_PUSH_READINESS.md
docs/audit/full-project-2026-11-11_123321/FEATURE_COMPLETENESS_MATRIX.md
docs/audit/full-project-2026-11-11_123321/NOTES_UNLOCKING_END_TO_END_AUDIT.md
docs/audit/full-project-2026-11-11_123321/PRODUCTION_READINESS_GO_NO_GO.md
docs/audit/full-project-2026-11-11_123321/RAZORPAY_PAYMENT_AUDIT.md
docs/audit/full-project-2026-11-11_123321/README.md
docs/audit/full-project-2026-11-11_123321/REMAINING_WORK_PRIORITY_CHECKLIST.md
docs/audit/full-project-2026-11-11_123321/SECURITY_AND_BUG_REPORT.md
docs/audit/p0-critical-remediation-20261111_131014/CRITICAL_SECURITY_FIXES.md
docs/audit/p0-critical-remediation-20261111_131014/DATABASE_TEST_FAILURES_AND_FIXES.md
docs/audit/p0-critical-remediation-20261111_131014/FILE_CHANGE_INVENTORY.md
docs/audit/p0-critical-remediation-20261111_131014/FINANCIAL_INTEGRITY_FINDINGS.md
docs/audit/p0-critical-remediation-20261111_131014/P0_EXECUTIVE_SUMMARY.md
docs/audit/p0-critical-remediation-20261111_131014/P0_REMAINING_BLOCKERS.md
docs/audit/p0-critical-remediation-20261111_131014/PAYMENT_ENTITLEMENT_SECURITY.md
docs/audit/p0-critical-remediation-20261111_131014/PHASE_A_B_C_COMPATIBILITY_REVIEW.md
docs/audit/p0-critical-remediation-20261111_131014/PRODUCTION_RECOVERY_READINESS.md
docs/audit/p0-critical-remediation-20261111_131014/README.md
docs/audit/p0-critical-remediation-20261111_131014/RELEASE_PACKAGE_REVIEW.md
docs/audit/p0-critical-remediation-20261111_131014/TEST_RESULTS.md
docs/audit/p1-local-readiness-20261111_142055/ANDROID_RELEASE_ACCEPTANCE_PLAN.md
docs/audit/p1-local-readiness-20261111_142055/ANDROID_RELEASE_READINESS.md
docs/audit/p1-local-readiness-20261111_142055/COMPLETE_TEST_RESULTS.md
docs/audit/p1-local-readiness-20261111_142055/FILE_CHANGE_INVENTORY.md
docs/audit/p1-local-readiness-20261111_142055/FIREBASE_FCM_READINESS.md
docs/audit/p1-local-readiness-20261111_142055/GOOGLE_PLAY_BILLING_READINESS.md
docs/audit/p1-local-readiness-20261111_142055/MOBILE_RELIABILITY_AND_ACCESSIBILITY.md
docs/audit/p1-local-readiness-20261111_142055/NOTES_ENTITLEMENT_AND_PDF_SECURITY.md
docs/audit/p1-local-readiness-20261111_142055/P1_EXECUTIVE_SUMMARY.md
docs/audit/p1-local-readiness-20261111_142055/P1_FINAL_GO_NO_GO.md
docs/audit/p1-local-readiness-20261111_142055/P1_REMAINING_BLOCKERS.md
docs/audit/p1-local-readiness-20261111_142055/RAZORPAY_PAYMENT_FLOW_VERIFICATION.md
docs/audit/p1-local-readiness-20261111_142055/README.md
docs/audit/p1-local-readiness-20261111_142055/REPORTING_WORKERS_AND_MONITORING.md
docs/audit/payment-migration-preflight/REPORT.md
docs/audit/payment-migration-preflight/closure/APPROVAL_PACKAGE.md
docs/audit/payment-migration-preflight/closure/ARTIFACTS.md
docs/audit/payment-migration-preflight/closure/COMMANDS.md
docs/audit/payment-migration-preflight/closure/DRIFT_REVIEW.md
docs/audit/payment-migration-preflight/closure/PLAN.md
docs/audit/payment-migration-preflight/closure/RECONCILIATION.md
docs/audit/payment-migration-preflight/closure/RESTORE_REHEARSAL.md
docs/audit/production-execution-20261111/APPROVAL-TEMPLATE.md
docs/audit/production-execution-20261111/RUNBOOK.md
docs/audit/remaining-readiness-20261111/PLAN.md
docs/audit/remaining-readiness-20261111/REPORT.md
docs/audit/remaining-readiness-20261111/evidence/code-review.md
docs/audit/remaining-readiness-20261111/evidence/command-matrix.md
docs/legacy-sql/README.md
docs/multi-course-analysis.md
docs/multi-course-changes.md
docs/phase0/BACKUP_GUIDE.md
docs/phase1/APPLY_AND_VERIFY.md
docs/phase1/OLD_BUILD_COMPATIBILITY.md
docs/phase1/queries/old_builds_from_logs.md
docs/phase2/REFERRAL_WALLET.md
docs/security/ADMIN_MFA.md
docs/security/PASSWORD_POLICY.md
docs/security/PASSWORD_RECOVERY_MFA.md
docs/security/SECURITY_FIX_NOTES.md
docs/security/review-20261020/README.md
docs/superpowers/plans/2026-11-11-native-encryption-phase1.md
docs/superpowers/plans/2026-11-11-native-encryption-phase1b.md
docs/superpowers/specs/2026-11-11-native-offline-encryption-design.md
mobile-app/AGENTS.md
mobile-app/CLAUDE.md
mobile-app/DATA_SAFETY_AUDIT.md
mobile-app/OFFLINE_MODE_SETUP.md
mobile-app/PLAY_STORE_SUBMISSION.md
mobile-app/modules/medveda-offline-vault/FORMAT.md
mobile-app/modules/medveda-offline-vault/PHASE1B.md
mobile-app/modules/medveda-offline-vault/README.md
scripts/ucb-secrets-set.md
supabase/DEPLOY_ORDER.md
supabase/SECURITY_NOTICE.md
supabase/functions/diagnose-play-pricing/README.md
supabase/functions/diagnose-play-service-account/README.md
supabase/held/batch2-videos/README.md
supabase/releases/b-to-c-compatible-20261111/README.md
supabase/releases/p0-critical-20261111_131014/README.md
supabase/releases/p0-critical-20261111_131014/RUNBOOK.md
supabase/releases/phase-c-20261111/README.md
supabase/staging/MIGRATION_SAFETY_AUDIT.md
supabase/staging/README.md
supabase/tests/delete-account-harness/README.md
supabase/tests/legacy/README.md
website/DEPLOYMENT_CHECKLIST.md
website/README.md
```

New file retained in addition: `MEDVEDA_MASTER_AUDIT_AND_PENDING_WORK.md`.

### Appendix C — exact deleted Markdown paths

```text
docs/audit/MEDVEDA_ANDROID_IDE_TOOLCHAIN_2026-11-10.md
docs/audit/MEDVEDA_B_TO_C_ATOMIC_REHEARSAL_2026-11-11.md
docs/audit/MEDVEDA_CLOSED_TESTING_2026-11-08.md
docs/audit/MEDVEDA_MOBILE_PRODUCTION_FULL_AUDIT_2026-11-10.md
docs/audit/MEDVEDA_MOBILE_RELEASE_REVIEW_2026-11-04.md
docs/audit/MEDVEDA_MV003_LOCAL_FIX_2026-11-10.md
docs/audit/MEDVEDA_MV004_LOCAL_FIX_2026-11-10.md
docs/audit/MEDVEDA_MV005_LOCAL_FIX_2026-11-10.md
docs/audit/MEDVEDA_MV006_LOCAL_FIX_2026-11-10.md
docs/audit/MEDVEDA_MV007_GOOGLE_PLAY_BILLING_REMOVAL_2026-11-11.md
docs/audit/MEDVEDA_MV008_LOCAL_FIX_2026-11-10.md
docs/audit/MEDVEDA_MV009_LOCAL_FIX_2026-11-11.md
docs/audit/MEDVEDA_MV010_LOCAL_FIX_2026-11-11.md
docs/audit/MEDVEDA_MV011_LOCAL_FIX_2026-11-11.md
docs/audit/MEDVEDA_MV012_LOCAL_FIX_2026-11-11.md
docs/audit/MEDVEDA_NONPLAY_TEST_ISOLATION_2026-11-09.md
docs/audit/MEDVEDA_NOTES_BILLING_CHOICE_2026-11-08.md
docs/audit/MEDVEDA_PRODUCTION_DEFAULT_OFF_PREFLIGHT_2026-11-10.md
docs/audit/MEDVEDA_PRODUCTION_MIGRATION_EXECUTION_PACKAGE_2026-11-11.md
docs/audit/MEDVEDA_STARTUP_PAYMENTS_2026-11-08.md
docs/audit/android-native-toolchain-readiness-20261111/COMMANDS.md
docs/audit/android-native-toolchain-readiness-20261111/REPORT.md
docs/audit/evidence/b-to-c-atomic-20261111/README.md
docs/audit/evidence/diagnostic-401-20261020/README.md
docs/audit/final-local-blockers-20261111/DESIGN-PLAN.md
docs/audit/final-local-blockers-20261111/REPORT.md
docs/audit/final-local-blockers-20261111/evidence/review.md
docs/audit/full-project-2026-11-11_123321/evidence/TEST_EXECUTION.md
docs/audit/full-project-2026-11-11_123321/evidence/reproduced-atomic/README.md
docs/audit/native-encryption-phase1-20261111/REPORT.md
docs/audit/native-encryption-phase1-20261111/security-review.md
docs/audit/native-encryption-phase1b-20261111/REPORT.md
docs/audit/native-encryption-phase1b-20261111/security-review.md
docs/audit/native-encryption-phase1c-20261111/REPORT.md
docs/audit/native-encryption-phase1c-20261111/security-review.md
docs/audit/p0-closure-20261111_134419/FINANCIAL_RECONCILIATION_REQUIREMENTS.md
docs/audit/p0-closure-20261111_134419/FULL_RECOVERY_AND_RESTORE_PLAN.md
docs/audit/p0-closure-20261111_134419/INDEPENDENT_P0_VERIFICATION.md
docs/audit/p0-closure-20261111_134419/MIGRATION_74_SAFETY_REVIEW.md
docs/audit/p0-closure-20261111_134419/P0_FINAL_GO_NO_GO.md
docs/audit/p0-closure-20261111_134419/P0_OWNER_ACTION_CHECKLIST.md
docs/audit/p0-closure-20261111_134419/README.md
docs/audit/p0-closure-20261111_134419/RELEASE_PACKAGE_INTEGRITY.md
docs/audit/p0-closure-20261111_134419/evidence/COMMANDS.md
docs/audit/p2-final-quality-20261111_150037/ACCESSIBILITY_AUDIT.md
docs/audit/p2-final-quality-20261111_150037/ADMIN_DASHBOARD_VERIFICATION.md
docs/audit/p2-final-quality-20261111_150037/CI_AND_BUILD_VERIFICATION.md
docs/audit/p2-final-quality-20261111_150037/CODE_QUALITY_FIXES.md
docs/audit/p2-final-quality-20261111_150037/END_TO_END_TEST_RESULTS.md
docs/audit/p2-final-quality-20261111_150037/FILE_CHANGE_INVENTORY.md
docs/audit/p2-final-quality-20261111_150037/FINAL_PROJECT_READINESS.md
docs/audit/p2-final-quality-20261111_150037/FULL_PROJECT_TEST_MATRIX.md
docs/audit/p2-final-quality-20261111_150037/P2_EXECUTIVE_SUMMARY.md
docs/audit/p2-final-quality-20261111_150037/PERFORMANCE_OPTIMIZATION.md
docs/audit/p2-final-quality-20261111_150037/README.md
docs/audit/p2-final-quality-20261111_150037/REMAINING_EXTERNAL_BLOCKERS.md
docs/audit/p2-final-quality-20261111_150037/SECURITY_REGRESSION.md
docs/audit/p2-final-quality-20261111_150037/UI_UX_FIXES.md
```

### Appendix D — fresh Node test command ledger

All commands ran from repository root with `EXPO_NO_DOTENV=1`, `CI=1` and a sanitized inherited environment containing only PATH/HOME/LANG/TMPDIR/DENO_DIR where available. No PG credentials were inherited. Logs were held under `/tmp/medveda-audit-tests`.

| Exact command | Exit | Result |
|---|---:|---|
| `node --experimental-strip-types admin-panel/scripts/pdf-validation-selftest.mjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/mutation-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/pagination-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/play-pricing-diagnostic-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/play-service-account-diagnostic-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/settings-save-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/upload-error-selftest.mjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/auth-race-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/batch2-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/list-retry-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/request-race-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types admin-panel/scripts/p1-financial-ui-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/recovery-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/f10-coverage-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/google-reporting-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/settle-timestamp-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/play-reconcile-fairness-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/compensation-worker-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/play-payment-worker-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/play-consumption-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/play-order-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/play-verification-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/razorpay-routing-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/readiness-migrations-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/delete-account-rate-limit-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/diagnostic-auth-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/identity-retention-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/play-body-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/play-catalog-creation-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/play-catalog-worker-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/play-service-account-diagnostic-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/razorpay-security-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/notes-choice-order-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/billing-recovery-worker-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/mv004-recovery-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/mv005-create-order-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/mv006-restoration-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/phase-b-recovery-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/phase-c-gates-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/b-to-c-reporting-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/b-to-c-worker-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/p0-reversal-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/p0-notification-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types supabase/tests/p1-push-delivery-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/verify-signature-selftest.js` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/checkout-html-selftest.mjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/password-policy-selftest.mjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/purchases-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/same-project-build-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/offline-download-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/quiz-hooks-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/readiness-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/staging-build-selftest.cjs` | 1 | FAIL — AUD-004 |
| `node --experimental-strip-types mobile-app/scripts/accessibility-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/auth-state-race-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/course-state-race-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/course-year-confirmation-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/course-year-picker-race-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/course-year-selection-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/deep-link-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/download-actions-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/list-states-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/load-resource-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/login-submit-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/navigation-lazy-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notes-open-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notification-inflight-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notification-preferences-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notification-reads-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notification-routing-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/offline-owner-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/password-recovery.test.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-poll-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-provider-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-request-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-routing-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-summary-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-verdict-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/pdf-lifecycle-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/profile-save-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/purchases-unavailable-ui-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/quiz-input-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/razorpay-internal-test-selftest.cjs` | 1 | FAIL — AUD-004 |
| `node --experimental-strip-types mobile-app/scripts/release-payments-disabled-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/route-validation-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/search-cache-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/search-lazy-hook-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/search-pagination-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/sentry-config-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/sync-concurrency-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/video-data-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/video-link-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/video-tap-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/years-inflight-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/quiz-editing-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/pdf-remote-retry-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/auth-recovery-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/login-network-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/android-release-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notes-entitlement-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/startup-availability-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notes-billing-choice-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/checkout-security-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/nonplay-test-isolation-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv004-recovery-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv008-ownership-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv009-store-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv010-options-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv011-accessibility-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv012-history-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv007-billing-boundary-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-success-owner-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/push-lifecycle-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/firebase-config-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/play-catalog-contract-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notification-account-hook-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/p2-registration-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/offline-license-storage-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types scripts/secret-scan-selftest.mjs` | 0 | PASS |
| `node --experimental-strip-types scripts/p2-quality-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types scripts/p2-performance-selftest.cjs` | 0 | PASS |
| `node --experimental-strip-types scripts/p2-admin-labels-selftest.cjs` | 0 | PASS |

### Appendix E — exact Deno unit-test invocation

```sh
deno test --cached-only --config supabase/deno.json --allow-read --allow-env supabase/functions/diagnose-play-pricing/handler_test.ts supabase/functions/diagnose-play-pricing/sanitize_test.ts supabase/tests/play_catalog_api_test.ts supabase/tests/play_catalog_unit_test.ts supabase/tests/play_diagnostic_sanitization_review_test.ts supabase/tests/note-pdf-hash-test.ts supabase/tests/pdf-validation-test.ts supabase/tests/quarantine-worker-test.ts supabase/tests/upload-body-test.ts supabase/tests/upload-note-pdf-test.ts
```

Result: **40 passed; 0 failed**, exit 0. Catalog/provider/storage HTTP is mocked; actual network permission was not granted.

### Appendix F — reproducible session-storage fault probe

This exact inline Node probe ran with exit 0, proving the failure behavior rather than fixing it:

```sh
node --no-warnings - <<'JS'
const {load}=require('./mobile-app/scripts/ui-harness.cjs');const assert=require('node:assert/strict');const {webcrypto}=require('node:crypto');
const a=new Map(),s=new Map();let fail=false;
const mod=load('mobile-app/src/config/secureSessionStorage.ts',{'react-native-get-random-values':{},'aes-js':require('./mobile-app/node_modules/aes-js'),'react-native':{Platform:{OS:'android'}},'expo-secure-store':{setItemAsync:async(k,v)=>s.set(k,v),getItemAsync:async k=>s.get(k),deleteItemAsync:async k=>s.delete(k)},'@react-native-async-storage/async-storage':{getItem:async k=>a.get(k),setItem:async(k,v)=>{if(fail)throw new Error('synthetic write failure');a.set(k,v)},removeItem:async k=>a.delete(k)}},{crypto:webcrypto});
(async()=>{const store=mod.secureSessionStorage;await store.setItem('fixture-session','synthetic-session-A');assert.equal(await store.getItem('fixture-session'),'synthetic-session-A');fail=true;await assert.rejects(()=>store.setItem('fixture-session','synthetic-session-B'));const after=await store.getItem('fixture-session');assert.notEqual(after,'synthetic-session-A');console.log('CONFIRMED: failed ciphertext write invalidates prior valid session because SecureStore key was already replaced; no actual credentials used.');})();
JS
```

### Appendix G — audit-start source fingerprints

These hashes identify selected working-tree inputs, not just the HEAD commit. Retained original Markdown files are also checked byte-for-byte against the audit-start snapshot in final verification.

| Input | SHA-256 at audit start |
|---|---|
| `mobile-app/scripts/ui-harness.cjs` | `79f8eeae5fa7fd98b3484c32eb60b2f5ba1c9e5a51da7e192e8ae84a09c3b2a0` |
| `mobile-app/App.tsx` | `dd05b5bc4a9c55832c0e00503cdeb64417f2e741eb27adab53f39feeff8b40b5` |
| `mobile-app/app.config.js` | `3c9b22fbb92ffa3ef8a0be6b92b8622632f324990afacc14911bede036c70b3f` |
| `mobile-app/app.json` | `87edff40f924260c91f63f35482e9fcf8f727847973a6ece63b76450729685e6` |
| `mobile-app/eas.json` | `8825dfe69af4849df5033458ea06f2df04953ba4369c8a62baff61e2fb38863a` |
| `mobile-app/package.json` | `5326e0fe2362f51badb814fba669f4e0f71cd62a4556fc5fbaf18c2e1c801283` |
| `mobile-app/package-lock.json` | `9c31167671de53e8741e5854e60cf88efeae94474994d8a2fb7e018f5debaf91` |
| `mobile-app/modules/medveda-offline-vault/android/build.gradle` | `a053a2ac0c0ca7a896640b3e5274a29c12f9e159d958397d3835e6178f5e3db9` |
| `mobile-app/src/config/secureSessionStorage.ts` | `7710dcda7e99217295b76bca29b309cc0e7e018675c20dff283dd4363e3f77ef` |
| `mobile-app/src/utils/downloadManager.ts` | `8a6c0b089a04a2ead8a48f034bd2bc2e00828d2e876c2f6caef7c7eb3114909b` |
| `admin-panel/package-lock.json` | `800d6f8c0abb4d3f45ad3ca46afe28a31c9532c3c3eb6995598f5c12f25c6aa0` |
| `supabase/config.toml` | `c5570f01e75a5571df8359f27fec548c08cf25cf525b6da083aa20e529843f7c` |
| `supabase/functions/send-push-notification/index.ts` | `78d2a1c6a7c33bac280a2814f8334f71d4d56fa09dcf13216a1fe4e8a1b3e00a` |
| `supabase/migrations/20261111120000_p0_classified_reversal_commitment.sql` | `ee522a5c7a9b9361de69942d5e1607314747a3c8813dcbc046ed68ca1320240f` |

### Appendix H — final cleanup and preservation verification

Fresh full rescan and SHA-256 comparison against the audit-start working tree:

- Original project-owned Markdown: **189** (54 tracked, 135 untracked).
- Individually removed: **58** (2 tracked, 56 untracked); exact paths in Appendix C.
- Original Markdown retained **byte-identically: 131** (52 tracked, 79 untracked); exact paths in Appendix B.
- Exactly one new repository file: `MEDVEDA_MASTER_AUDIT_AND_PENDING_WORK.md`.
- Final project-owned Markdown: **132**. No further DELETE decision remains on disk.
- All other inventoried original files remain present and byte-identical to the audit-start state. No source/configuration/test/SQL/JSON/YAML/assets/lockfile edit or deletion was made by this task.
- No exact deleted path occurs in the inspected current source/config/CI/test/release-manifest files outside historical audit snapshots. Named release checksum and integrity inputs remain present.
- Symlink targets were not followed/deleted; no directory deletion, external project-file deletion, staging, commit, reset, clean, migration, deployment or production build occurred. `/tmp` held only audit scratch/validation artifacts; it would be inaccurate to claim no temporary external writes occurred.
- `git diff --check`: **exit 2**, pre-existing trailing whitespace at `mobile-app/src/screens/store/StoreScreen.tsx:133`. Its source hash equals the audit-start hash. It was not fixed because source edits are unauthorized.

Task-only tracked diff:

```text
 docs/audit/MEDVEDA_MOBILE_RELEASE_REVIEW_2026-11-04.md | 29 deletions
 docs/audit/evidence/diagnostic-401-20261020/README.md   | 61 deletions
 2 files changed, 90 deletions(-)
```

The report is untracked and therefore absent from `git diff --stat`; the 56 removed untracked reports also do not appear in a tracked Git diff. Total task filesystem delta is **59 Markdown paths**: 58 deletions plus one addition. All existing tracked modifications and surviving untracked user files are preserved.

Expanded Git status counts (including every nonignored untracked file; directories expanded):

| Porcelain state | Audit start | Audit end |
|---|---:|---:|
| ` D` | 0 | 2 |
| ` M` | 167 | 167 |
| `??` | 1057 | 1002 |

Final complete tracked diff summary **includes pre-existing user changes**; those changes were not authored by this audit:

```text
 .github/workflows/ci.yml                           |  23 +-
 admin-panel/package-lock.json                      |  14 +-
 admin-panel/src/components/ChapterFormModal.tsx    |   4 +-
 admin-panel/src/components/ChapterPicker.tsx       |   6 +-
 admin-panel/src/components/ConfirmDialog.tsx       |   9 +-
 admin-panel/src/components/CourseFormModal.tsx     |   2 +-
 admin-panel/src/components/CoursePicker.tsx        |  10 +-
 admin-panel/src/components/Input.tsx               |  12 +-
 admin-panel/src/components/Modal.tsx               |   9 +-
 admin-panel/src/components/NoteFormModal.tsx       |   2 +-
 admin-panel/src/components/NotesTable.tsx          |   5 +-
 admin-panel/src/components/OrderFilter.tsx         |   6 +-
 admin-panel/src/components/OrdersTable.tsx         |  21 +-
 admin-panel/src/components/ProductFilter.tsx       |   2 +-
 admin-panel/src/components/ProductFormModal.tsx    |  25 +-
 admin-panel/src/components/QuizFormModal.tsx       |   6 +-
 admin-panel/src/components/RouteErrorBoundary.tsx  |   3 +-
 admin-panel/src/components/SearchBar.tsx           |   2 +-
 admin-panel/src/components/SubjectFormModal.tsx    |   4 +-
 admin-panel/src/components/SubjectPicker.tsx       |   4 +-
 admin-panel/src/components/TopProductsTable.tsx    |   4 +-
 admin-panel/src/components/YearFormModal.tsx       |   2 +-
 admin-panel/src/hooks/useDashboard.ts              |   3 +-
 admin-panel/src/pages/Analytics.tsx                |   8 +-
 admin-panel/src/pages/Chapters.tsx                 |   4 +-
 admin-panel/src/pages/Courses.tsx                  |   2 +-
 admin-panel/src/pages/Login.tsx                    |   6 +-
 admin-panel/src/pages/Notes.tsx                    |   2 +-
 admin-panel/src/pages/Notifications.tsx            |   8 +-
 admin-panel/src/pages/Quiz.tsx                     |   2 +-
 admin-panel/src/pages/Referrals.tsx                |   2 +-
 admin-panel/src/pages/ReviewFlags.tsx              |   2 +-
 admin-panel/src/pages/Subjects.tsx                 |   2 +-
 admin-panel/src/pages/Videos.tsx                   |   2 +-
 admin-panel/src/services/analyticsService.ts       |  26 +-
 admin-panel/src/services/orderService.ts           |   1 +
 admin-panel/src/services/referralService.ts        |  10 +-
 admin-panel/src/types/order.ts                     |   2 +-
 docs/RELEASE_GATES.md                              |  23 +-
 .../MEDVEDA_MOBILE_RELEASE_REVIEW_2026-11-04.md    |  29 -
 .../evidence/diagnostic-401-20261020/README.md     |  61 --
 mobile-app/App.tsx                                 |   8 +-
 mobile-app/DATA_SAFETY_AUDIT.md                    |  14 +-
 mobile-app/PLAY_STORE_SUBMISSION.md                |  23 +-
 mobile-app/app.config.js                           |  68 +-
 mobile-app/app.json                                |   7 +-
 mobile-app/eas.json                                |  39 +-
 mobile-app/package-lock.json                       | 786 +++++++++++++++------
 mobile-app/package.json                            |  14 +-
 mobile-app/scripts/auth-state-race-selftest.cjs    |   5 +-
 mobile-app/scripts/check-staging-build.cjs         |  26 +-
 mobile-app/scripts/list-states-selftest.cjs        |   2 +-
 mobile-app/scripts/login-submit-selftest.cjs       |   2 +-
 mobile-app/scripts/navigation-lazy-selftest.cjs    |   7 +-
 mobile-app/scripts/notes-open-selftest.cjs         |   4 +-
 .../scripts/notification-preferences-selftest.cjs  |   2 +-
 .../scripts/notification-routing-selftest.cjs      |  15 +-
 mobile-app/scripts/offline-download-selftest.cjs   |  32 +-
 mobile-app/scripts/offline-owner-selftest.cjs      |   6 +-
 mobile-app/scripts/payment-poll-selftest.cjs       |   2 +-
 mobile-app/scripts/payment-provider-selftest.cjs   |  14 +-
 mobile-app/scripts/payment-request-selftest.cjs    |  11 +-
 mobile-app/scripts/payment-routing-selftest.cjs    |   6 +-
 mobile-app/scripts/payment-summary-selftest.cjs    |   2 +
 mobile-app/scripts/payment-verdict-selftest.cjs    |  13 +-
 mobile-app/scripts/pdf-lifecycle-selftest.cjs      |   5 +-
 mobile-app/scripts/purchases-selftest.cjs          |   2 +-
 .../scripts/purchases-unavailable-ui-selftest.cjs  |   8 +-
 .../scripts/razorpay-internal-test-selftest.cjs    |  75 +-
 mobile-app/scripts/readiness-selftest.cjs          |   6 +-
 .../scripts/release-payments-disabled-selftest.cjs |  10 +-
 mobile-app/scripts/search-lazy-hook-selftest.cjs   |  12 +-
 mobile-app/scripts/staging-build-selftest.cjs      |   2 +-
 mobile-app/scripts/ui-harness.cjs                  |   9 +-
 mobile-app/src/components/BottomNav.tsx            |   9 +-
 mobile-app/src/components/ConfirmationDialog.tsx   |  25 +-
 mobile-app/src/components/CustomButton.tsx         |   4 +-
 mobile-app/src/components/ErrorState.tsx           |  13 +-
 mobile-app/src/components/ProductCard.tsx          |  16 +-
 mobile-app/src/components/ProductPosterCard.tsx    | 102 +--
 mobile-app/src/components/SettingsItem.tsx         |   4 +
 mobile-app/src/components/SideDrawer.tsx           |  15 +-
 mobile-app/src/components/UnlockOptionsPanel.tsx   | 107 +--
 mobile-app/src/config/paymentProvider.ts           |  25 +-
 mobile-app/src/config/supabase.ts                  |   2 +
 mobile-app/src/features/auth/authService.ts        |   1 +
 mobile-app/src/hooks/useGlobalSearch.ts            |  21 +-
 mobile-app/src/hooks/useMaintenanceMode.ts         |   4 +-
 mobile-app/src/hooks/useNotificationRouting.ts     |  17 +-
 mobile-app/src/hooks/usePurchases.ts               |  28 +-
 mobile-app/src/navigation/AppNavigator.tsx         |  33 +-
 mobile-app/src/repositories/chaptersRepository.ts  |   7 +-
 mobile-app/src/repositories/notesRepository.ts     |   5 +
 mobile-app/src/repositories/productsRepository.ts  |  15 +-
 mobile-app/src/repositories/purchasesRepository.ts |   7 +-
 mobile-app/src/repositories/referralsRepository.ts |   3 +
 mobile-app/src/repositories/usersRepository.ts     |   1 +
 mobile-app/src/screens/auth/LoginScreen.tsx        |  27 +-
 mobile-app/src/screens/auth/RegisterScreen.tsx     |  37 +-
 mobile-app/src/screens/auth/SplashScreen.tsx       |  21 +-
 mobile-app/src/screens/chapters/ChaptersScreen.tsx |   6 +-
 mobile-app/src/screens/contact/ContactScreen.tsx   |  29 +-
 .../src/screens/details/ChapterDetailsScreen.tsx   | 127 +---
 mobile-app/src/screens/home/HomeScreen.tsx         |  18 +-
 .../src/screens/maintenance/MaintenanceScreen.tsx  |   2 +-
 mobile-app/src/screens/notes/NotesScreen.tsx       |  15 +-
 .../screens/notifications/NotificationsScreen.tsx  |  27 +-
 .../src/screens/payment/OrderSummaryScreen.tsx     | 163 ++++-
 .../src/screens/payment/PaymentCheckoutScreen.tsx  |  83 ++-
 .../src/screens/payment/PaymentFailedScreen.tsx    |  34 +-
 .../src/screens/payment/PaymentSuccessScreen.tsx   |  43 +-
 .../src/screens/payment/checkoutHtmlTemplate.ts    |   2 +
 .../src/screens/pdf/PdfViewerScreen.native.tsx     | 233 +++---
 mobile-app/src/screens/pdf/PdfViewerScreen.web.tsx | 106 +--
 .../src/screens/purchases/MyPurchasesScreen.tsx    |  32 +-
 mobile-app/src/screens/quiz/QuizScreen.tsx         |  35 +-
 mobile-app/src/screens/quiz/TestListScreen.tsx     |   2 +-
 mobile-app/src/screens/search/SearchScreen.tsx     |   5 +
 mobile-app/src/screens/settings/SettingsScreen.tsx |  31 +-
 mobile-app/src/screens/store/StoreScreen.tsx       | 105 +--
 mobile-app/src/screens/subjects/SubjectsScreen.tsx |   2 +-
 mobile-app/src/screens/videos/VideosScreen.tsx     |   2 +-
 mobile-app/src/screens/years/YearsScreen.tsx       |   2 +-
 mobile-app/src/services/authState.ts               |  27 +-
 mobile-app/src/services/chaptersService.ts         |   3 +
 mobile-app/src/services/maintenanceService.ts      |   4 +
 mobile-app/src/services/notificationRouting.ts     |  30 +
 mobile-app/src/services/notificationsService.ts    |   7 +-
 mobile-app/src/services/offlineNoteVerification.ts | 105 ++-
 mobile-app/src/services/ordersService.ts           |  11 +-
 mobile-app/src/services/paymentService.ts          | 115 ++-
 mobile-app/src/services/productsService.ts         |  19 +-
 mobile-app/src/services/purchasesService.ts        |  27 +-
 mobile-app/src/services/pushNotifications.ts       | 157 ++--
 mobile-app/src/services/secureNotesService.ts      |   5 +
 mobile-app/src/services/studyReminderService.ts    |  15 +-
 mobile-app/src/types/navigation.ts                 |   2 +
 mobile-app/src/utils/downloadManager.ts            |   5 +-
 scripts/ucb-deploy.sh                              |   3 +-
 supabase/config.toml                               |  21 +
 supabase/functions/_shared/externalReporting.ts    |  59 +-
 supabase/functions/_shared/googlePlay.ts           |   1 +
 supabase/functions/_shared/razorpay.ts             |  25 +-
 supabase/functions/_shared/settle.ts               | 153 +++-
 supabase/functions/attach-external-token/index.ts  |   9 +-
 supabase/functions/create-order/index.ts           | 178 +----
 supabase/functions/create-play-order/index.ts      |   2 +
 supabase/functions/razorpay-webhook/index.ts       |  25 +-
 .../functions/report-external-transaction/index.ts |  44 +-
 supabase/functions/send-push-notification/index.ts |  45 +-
 supabase/functions/verify-payment/index.ts         |  57 +-
 supabase/functions/verify-play-purchase/index.ts   |   7 +
 supabase/tests/batch1_checks.sql                   |  20 +-
 supabase/tests/compensation-worker-selftest.cjs    |   1 +
 supabase/tests/critical_fixes_checks.sql           |   3 +-
 supabase/tests/google-reporting-selftest.cjs       |  29 +-
 supabase/tests/play-body-selftest.cjs              |   1 +
 supabase/tests/play-consumption-selftest.cjs       |   2 +-
 supabase/tests/play-order-selftest.cjs             |   1 +
 .../tests/play-reconcile-fairness-selftest.cjs     |   1 +
 supabase/tests/play-verification-selftest.cjs      |   4 +
 .../play_catalog_migration_legacy_selftest.sh      |   5 +-
 supabase/tests/razorpay-routing-selftest.cjs       |  69 +-
 supabase/tests/razorpay-security-selftest.cjs      |  20 +-
 supabase/tests/recovery-selftest.cjs               |   5 +-
 supabase/tests/run-all.sh                          |  29 +-
 supabase/tests/settle-timestamp-selftest.cjs       |   9 +-
 supabase/tests/webhook-harness/run.mjs             |  38 +-
 supabase/tests/webhook-harness/run.sh              |   1 +
 169 files changed, 2923 insertions(+), 1736 deletions(-)
```

Final `git status --short` (untracked directories grouped by Git):

```text
 M .github/workflows/ci.yml
 M admin-panel/package-lock.json
 M admin-panel/src/components/ChapterFormModal.tsx
 M admin-panel/src/components/ChapterPicker.tsx
 M admin-panel/src/components/ConfirmDialog.tsx
 M admin-panel/src/components/CourseFormModal.tsx
 M admin-panel/src/components/CoursePicker.tsx
 M admin-panel/src/components/Input.tsx
 M admin-panel/src/components/Modal.tsx
 M admin-panel/src/components/NoteFormModal.tsx
 M admin-panel/src/components/NotesTable.tsx
 M admin-panel/src/components/OrderFilter.tsx
 M admin-panel/src/components/OrdersTable.tsx
 M admin-panel/src/components/ProductFilter.tsx
 M admin-panel/src/components/ProductFormModal.tsx
 M admin-panel/src/components/QuizFormModal.tsx
 M admin-panel/src/components/RouteErrorBoundary.tsx
 M admin-panel/src/components/SearchBar.tsx
 M admin-panel/src/components/SubjectFormModal.tsx
 M admin-panel/src/components/SubjectPicker.tsx
 M admin-panel/src/components/TopProductsTable.tsx
 M admin-panel/src/components/YearFormModal.tsx
 M admin-panel/src/hooks/useDashboard.ts
 M admin-panel/src/pages/Analytics.tsx
 M admin-panel/src/pages/Chapters.tsx
 M admin-panel/src/pages/Courses.tsx
 M admin-panel/src/pages/Login.tsx
 M admin-panel/src/pages/Notes.tsx
 M admin-panel/src/pages/Notifications.tsx
 M admin-panel/src/pages/Quiz.tsx
 M admin-panel/src/pages/Referrals.tsx
 M admin-panel/src/pages/ReviewFlags.tsx
 M admin-panel/src/pages/Subjects.tsx
 M admin-panel/src/pages/Videos.tsx
 M admin-panel/src/services/analyticsService.ts
 M admin-panel/src/services/orderService.ts
 M admin-panel/src/services/referralService.ts
 M admin-panel/src/types/order.ts
 M docs/RELEASE_GATES.md
 D docs/audit/MEDVEDA_MOBILE_RELEASE_REVIEW_2026-11-04.md
 D docs/audit/evidence/diagnostic-401-20261020/README.md
 M mobile-app/App.tsx
 M mobile-app/DATA_SAFETY_AUDIT.md
 M mobile-app/PLAY_STORE_SUBMISSION.md
 M mobile-app/app.config.js
 M mobile-app/app.json
 M mobile-app/eas.json
 M mobile-app/package-lock.json
 M mobile-app/package.json
 M mobile-app/scripts/auth-state-race-selftest.cjs
 M mobile-app/scripts/check-staging-build.cjs
 M mobile-app/scripts/list-states-selftest.cjs
 M mobile-app/scripts/login-submit-selftest.cjs
 M mobile-app/scripts/navigation-lazy-selftest.cjs
 M mobile-app/scripts/notes-open-selftest.cjs
 M mobile-app/scripts/notification-preferences-selftest.cjs
 M mobile-app/scripts/notification-routing-selftest.cjs
 M mobile-app/scripts/offline-download-selftest.cjs
 M mobile-app/scripts/offline-owner-selftest.cjs
 M mobile-app/scripts/payment-poll-selftest.cjs
 M mobile-app/scripts/payment-provider-selftest.cjs
 M mobile-app/scripts/payment-request-selftest.cjs
 M mobile-app/scripts/payment-routing-selftest.cjs
 M mobile-app/scripts/payment-summary-selftest.cjs
 M mobile-app/scripts/payment-verdict-selftest.cjs
 M mobile-app/scripts/pdf-lifecycle-selftest.cjs
 M mobile-app/scripts/purchases-selftest.cjs
 M mobile-app/scripts/purchases-unavailable-ui-selftest.cjs
 M mobile-app/scripts/razorpay-internal-test-selftest.cjs
 M mobile-app/scripts/readiness-selftest.cjs
 M mobile-app/scripts/release-payments-disabled-selftest.cjs
 M mobile-app/scripts/search-lazy-hook-selftest.cjs
 M mobile-app/scripts/staging-build-selftest.cjs
 M mobile-app/scripts/ui-harness.cjs
 M mobile-app/src/components/BottomNav.tsx
 M mobile-app/src/components/ConfirmationDialog.tsx
 M mobile-app/src/components/CustomButton.tsx
 M mobile-app/src/components/ErrorState.tsx
 M mobile-app/src/components/ProductCard.tsx
 M mobile-app/src/components/ProductPosterCard.tsx
 M mobile-app/src/components/SettingsItem.tsx
 M mobile-app/src/components/SideDrawer.tsx
 M mobile-app/src/components/UnlockOptionsPanel.tsx
 M mobile-app/src/config/paymentProvider.ts
 M mobile-app/src/config/supabase.ts
 M mobile-app/src/features/auth/authService.ts
 M mobile-app/src/hooks/useGlobalSearch.ts
 M mobile-app/src/hooks/useMaintenanceMode.ts
 M mobile-app/src/hooks/useNotificationRouting.ts
 M mobile-app/src/hooks/usePurchases.ts
 M mobile-app/src/navigation/AppNavigator.tsx
 M mobile-app/src/repositories/chaptersRepository.ts
 M mobile-app/src/repositories/notesRepository.ts
 M mobile-app/src/repositories/productsRepository.ts
 M mobile-app/src/repositories/purchasesRepository.ts
 M mobile-app/src/repositories/referralsRepository.ts
 M mobile-app/src/repositories/usersRepository.ts
 M mobile-app/src/screens/auth/LoginScreen.tsx
 M mobile-app/src/screens/auth/RegisterScreen.tsx
 M mobile-app/src/screens/auth/SplashScreen.tsx
 M mobile-app/src/screens/chapters/ChaptersScreen.tsx
 M mobile-app/src/screens/contact/ContactScreen.tsx
 M mobile-app/src/screens/details/ChapterDetailsScreen.tsx
 M mobile-app/src/screens/home/HomeScreen.tsx
 M mobile-app/src/screens/maintenance/MaintenanceScreen.tsx
 M mobile-app/src/screens/notes/NotesScreen.tsx
 M mobile-app/src/screens/notifications/NotificationsScreen.tsx
 M mobile-app/src/screens/payment/OrderSummaryScreen.tsx
 M mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx
 M mobile-app/src/screens/payment/PaymentFailedScreen.tsx
 M mobile-app/src/screens/payment/PaymentSuccessScreen.tsx
 M mobile-app/src/screens/payment/checkoutHtmlTemplate.ts
 M mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx
 M mobile-app/src/screens/pdf/PdfViewerScreen.web.tsx
 M mobile-app/src/screens/purchases/MyPurchasesScreen.tsx
 M mobile-app/src/screens/quiz/QuizScreen.tsx
 M mobile-app/src/screens/quiz/TestListScreen.tsx
 M mobile-app/src/screens/search/SearchScreen.tsx
 M mobile-app/src/screens/settings/SettingsScreen.tsx
 M mobile-app/src/screens/store/StoreScreen.tsx
 M mobile-app/src/screens/subjects/SubjectsScreen.tsx
 M mobile-app/src/screens/videos/VideosScreen.tsx
 M mobile-app/src/screens/years/YearsScreen.tsx
 M mobile-app/src/services/authState.ts
 M mobile-app/src/services/chaptersService.ts
 M mobile-app/src/services/maintenanceService.ts
 M mobile-app/src/services/notificationRouting.ts
 M mobile-app/src/services/notificationsService.ts
 M mobile-app/src/services/offlineNoteVerification.ts
 M mobile-app/src/services/ordersService.ts
 M mobile-app/src/services/paymentService.ts
 M mobile-app/src/services/productsService.ts
 M mobile-app/src/services/purchasesService.ts
 M mobile-app/src/services/pushNotifications.ts
 M mobile-app/src/services/secureNotesService.ts
 M mobile-app/src/services/studyReminderService.ts
 M mobile-app/src/types/navigation.ts
 M mobile-app/src/utils/downloadManager.ts
 M scripts/ucb-deploy.sh
 M supabase/config.toml
 M supabase/functions/_shared/externalReporting.ts
 M supabase/functions/_shared/googlePlay.ts
 M supabase/functions/_shared/razorpay.ts
 M supabase/functions/_shared/settle.ts
 M supabase/functions/attach-external-token/index.ts
 M supabase/functions/create-order/index.ts
 M supabase/functions/create-play-order/index.ts
 M supabase/functions/razorpay-webhook/index.ts
 M supabase/functions/report-external-transaction/index.ts
 M supabase/functions/send-push-notification/index.ts
 M supabase/functions/verify-payment/index.ts
 M supabase/functions/verify-play-purchase/index.ts
 M supabase/tests/batch1_checks.sql
 M supabase/tests/compensation-worker-selftest.cjs
 M supabase/tests/critical_fixes_checks.sql
 M supabase/tests/google-reporting-selftest.cjs
 M supabase/tests/play-body-selftest.cjs
 M supabase/tests/play-consumption-selftest.cjs
 M supabase/tests/play-order-selftest.cjs
 M supabase/tests/play-reconcile-fairness-selftest.cjs
 M supabase/tests/play-verification-selftest.cjs
 M supabase/tests/play_catalog_migration_legacy_selftest.sh
 M supabase/tests/razorpay-routing-selftest.cjs
 M supabase/tests/razorpay-security-selftest.cjs
 M supabase/tests/recovery-selftest.cjs
 M supabase/tests/run-all.sh
 M supabase/tests/settle-timestamp-selftest.cjs
 M supabase/tests/webhook-harness/run.mjs
 M supabase/tests/webhook-harness/run.sh
?? MEDVEDA_MASTER_AUDIT_AND_PENDING_WORK.md
?? admin-panel/scripts/p1-financial-ui-selftest.cjs
?? admin-panel/src/hooks/useDialogFocus.ts
?? docs/audit/MEDVEDA_ANDROID_NATIVE_RELEASE_READINESS_2026-11-11.md
?? docs/audit/MEDVEDA_ANDROID_RELEASE_BLOCKER_FIX_2026-11-11.md
?? docs/audit/MEDVEDA_BILLING_FIXES_2026-11-09.md
?? docs/audit/MEDVEDA_MIGRATION_REPEATABILITY_PREFLIGHT_2026-11-10.md
?? docs/audit/MEDVEDA_MV001_PAYMENT_READINESS_2026-11-11.md
?? docs/audit/MEDVEDA_PHASE_A_FINAL_SAFETY_REVIEW_2026-11-11.md
?? docs/audit/MEDVEDA_PHASE_A_OPERATOR_RUNBOOK_2026-11-11.md
?? docs/audit/MEDVEDA_PHASE_B_EDGE_COMPATIBILITY_2026-11-11.md
?? docs/audit/MEDVEDA_PHASE_C_LOCAL_READINESS_2026-11-11.md
?? docs/audit/MEDVEDA_PRODUCTION_BUY_NOW_ACTIVATION_READINESS_2026-11-11.md
?? docs/audit/MEDVEDA_PRODUCTION_DEPLOYMENT_PREFLIGHT_2026-11-11.md
?? docs/audit/android-build-preflight-20261111_161541/
?? docs/audit/android-native-toolchain-readiness-20261111/
?? docs/audit/evidence/android-blocker-fix-20261111/
?? docs/audit/evidence/android-native-20261111/
?? docs/audit/evidence/b-to-c-atomic-20261111/
?? docs/audit/evidence/billing-fixes-20261109/
?? docs/audit/evidence/buy-now-activation-20261111/
?? docs/audit/evidence/closed-testing-20261108/
?? docs/audit/evidence/migration-repeatability-20261110/
?? docs/audit/evidence/mv001-20261111/
?? docs/audit/evidence/mv006-20261110/
?? docs/audit/evidence/nonplay-test-isolation-20261109/
?? docs/audit/evidence/notes-billing-choice-20261108/
?? docs/audit/evidence/phase-a-final-20261111/
?? docs/audit/evidence/phase-b-20261111/
?? docs/audit/evidence/phase-c-20261111/
?? docs/audit/evidence/production-default-off-20261110/
?? docs/audit/evidence/production-preflight-20261111/
?? docs/audit/evidence/startup-payments-20261108/
?? docs/audit/final-local-blockers-20261111/
?? docs/audit/full-project-2026-11-11_123321/
?? docs/audit/native-encryption-phase1-20261111/
?? docs/audit/native-encryption-phase1b-20261111/
?? docs/audit/native-encryption-phase1c-20261111/
?? docs/audit/p0-closure-20261111_134419/
?? docs/audit/p0-critical-remediation-20261111_131014/
?? docs/audit/p1-local-readiness-20261111_142055/
?? docs/audit/p2-final-quality-20261111_150037/
?? docs/audit/payment-migration-preflight/
?? docs/audit/production-execution-20261111/
?? docs/audit/remaining-readiness-20261111/
?? docs/superpowers/
?? mobile-app/modules/
?? mobile-app/plugins/withAndroidRelease.js
?? mobile-app/release-rules.pro
?? mobile-app/scripts/VerifyAndroidBundleSignature.java
?? mobile-app/scripts/android-bundle-validator-selftest.py
?? mobile-app/scripts/android-release-selftest.cjs
?? mobile-app/scripts/auth-recovery-selftest.cjs
?? mobile-app/scripts/checkout-security-selftest.cjs
?? mobile-app/scripts/closed-testing-selftest.cjs
?? mobile-app/scripts/firebase-config-selftest.cjs
?? mobile-app/scripts/firebase-config.cjs
?? mobile-app/scripts/inspect-android-bundle.py
?? mobile-app/scripts/login-network-selftest.cjs
?? mobile-app/scripts/mv004-recovery-selftest.cjs
?? mobile-app/scripts/mv007-billing-boundary-selftest.cjs
?? mobile-app/scripts/mv008-ownership-selftest.cjs
?? mobile-app/scripts/mv009-store-selftest.cjs
?? mobile-app/scripts/mv010-options-selftest.cjs
?? mobile-app/scripts/mv011-accessibility-selftest.cjs
?? mobile-app/scripts/mv012-history-selftest.cjs
?? mobile-app/scripts/nonplay-test-isolation-selftest.cjs
?? mobile-app/scripts/notes-billing-choice-selftest.cjs
?? mobile-app/scripts/notes-entitlement-selftest.cjs
?? mobile-app/scripts/notification-account-hook-selftest.cjs
?? mobile-app/scripts/offline-license-storage-selftest.cjs
?? mobile-app/scripts/p2-registration-selftest.cjs
?? mobile-app/scripts/payment-success-owner-selftest.cjs
?? mobile-app/scripts/pdf-remote-retry-selftest.cjs
?? mobile-app/scripts/play-catalog-contract-selftest.cjs
?? mobile-app/scripts/push-lifecycle-selftest.cjs
?? mobile-app/scripts/quiz-editing-selftest.cjs
?? mobile-app/scripts/startup-availability-selftest.cjs
?? mobile-app/scripts/startup-web-smoke.cjs
?? mobile-app/src/components/PurchaseOwnershipStatus.tsx
?? mobile-app/src/features/auth/authFetch.ts
?? mobile-app/src/hooks/useBuyOptions.ts
?? mobile-app/src/hooks/usePurchaseResource.ts
?? mobile-app/src/hooks/useStoreCatalog.ts
?? mobile-app/src/repositories/ordersRepository.ts
?? mobile-app/src/services/indiaBillingStates.ts
?? mobile-app/src/services/nonplayTestService.ts
?? mobile-app/src/services/playBillingService.ts
?? mobile-app/src/services/playOfferSelection.ts
?? mobile-app/src/services/storeCatalogService.ts
?? scripts/nonplay-test-secrets.example.env
?? scripts/p2-admin-labels-selftest.cjs
?? scripts/p2-performance-selftest.cjs
?? scripts/p2-quality-selftest.cjs
?? scripts/prepare-phase-c-release.py
?? supabase/functions/_shared/createOrderHandler.ts
?? supabase/functions/_shared/nonPlayTestCheckout.ts
?? supabase/functions/_shared/nonplayTestConfig.ts
?? supabase/functions/_shared/nonplayTestHandlers.ts
?? supabase/functions/_shared/nonplayTestProvider.ts
?? supabase/functions/_shared/nonplayTestRuntime.ts
?? supabase/functions/_shared/notesChoiceAuthorization.ts
?? supabase/functions/_shared/notesChoiceGate.ts
?? supabase/functions/_shared/notesChoiceOrder.ts
?? supabase/functions/create-order-nonplay-test/
?? supabase/functions/create-order-play-choice/
?? supabase/functions/get-note-url-nonplay-test/
?? supabase/functions/nonplay-test-catalog/
?? supabase/functions/razorpay-webhook-nonplay-test/
?? supabase/functions/verify-payment-nonplay-test/
?? supabase/maintenance/
?? supabase/migrations/20261108100000_notes_choice_checkout.sql
?? supabase/migrations/20261109100000_billing_settlement_recovery.sql
?? supabase/migrations/20261109120000_isolated_nonplay_test.sql
?? supabase/migrations/20261110100000_mv003_razorpay_entitlement_commitment.sql
?? supabase/migrations/20261110120000_mv005_razorpay_order_transitions.sql
?? supabase/migrations/20261110130000_mv006_purchase_ownership_guard.sql
?? supabase/migrations/20261111100000_phase_c_final_mv003_commitment.sql
?? supabase/migrations/20261111110000_phase_c_play_entitlement_snapshot.sql
?? supabase/migrations/20261111120000_p0_classified_reversal_commitment.sql
?? supabase/migrations/20261111175746_all_row_foreign_key_indexes.sql
?? supabase/releases/
?? supabase/tests/b-to-c-handlers-selftest.cjs
?? supabase/tests/b-to-c-reporting-selftest.cjs
?? supabase/tests/b-to-c-worker-selftest.cjs
?? supabase/tests/billing-recovery-worker-selftest.cjs
?? supabase/tests/billing-settlement-recovery.sql
?? supabase/tests/fk-index-coverage.sql
?? supabase/tests/mv003-entitlement-selftest.cjs
?? supabase/tests/mv004-recovery-selftest.cjs
?? supabase/tests/mv005-create-order-selftest.cjs
?? supabase/tests/mv005-history-selftest.cjs
?? supabase/tests/mv005-production-readonly.sql
?? supabase/tests/mv005-transitions-local.py
?? supabase/tests/mv006-ownership-local.py
?? supabase/tests/mv006-production-readonly.sql
?? supabase/tests/mv006-restoration-selftest.cjs
?? supabase/tests/nonplay-test-integration.ts
?? supabase/tests/nonplay-test-isolation.sql
?? supabase/tests/nonplay-test-repeatability.py
?? supabase/tests/notes-choice-checkout.sql
?? supabase/tests/notes-choice-concurrency.py
?? supabase/tests/notes-choice-order-selftest.cjs
?? supabase/tests/p0-classified-reversal.sql
?? supabase/tests/p0-notification-selftest.cjs
?? supabase/tests/p0-reversal-selftest.cjs
?? supabase/tests/p1-push-delivery-selftest.cjs
?? supabase/tests/phase-b-dependencies-local.py
?? supabase/tests/phase-b-handlers-selftest.cjs
?? supabase/tests/phase-b-history-selftest.cjs
?? supabase/tests/phase-b-recovery-selftest.cjs
?? supabase/tests/phase-c-contracts.sql
?? supabase/tests/phase-c-gates-selftest.cjs
?? supabase/tests/phase-c-play-duplicates.sql
?? supabase/tests/razorpay-order-recovery-selftest.ts
?? supabase/tests/run-mv001-local.py
?? supabase/tests/run-mv003-local.py
?? supabase/tests/run-mv005-local.py
?? supabase/tests/run-mv006-local.py
?? supabase/tests/run-nonplay-test-local.py
?? supabase/tests/run-phase-b-local.py
?? supabase/tests/run-phase-c-local.py
?? supabase/tests/support/nonplay_test_db.ts
?? supabase/tests/support/phase_b_production_normalize_phone.sql
```
