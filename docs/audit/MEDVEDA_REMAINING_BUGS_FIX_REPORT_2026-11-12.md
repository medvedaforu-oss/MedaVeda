# MedVeda remaining audit bug fix report

Date: **12 November 2026 UTC**. Scope: the 16 remaining findings in the complete production readiness audit. Existing Batch 1 fixes and unrelated dirty work were preserved.

## Result and counting

**15 of the requested 16 bugs have local source fixes. AUD-008 remains OPEN / PARTIAL, with native acceptance BLOCKED. Including the four preserved Batch 1 fixes, 19 of 20 audit bugs are fixed locally; one remains. Production release: NO-GO.**

“Fixed locally” means the code correction has passing local regressions. It does not mean deployed, device verified, or accepted for public release. Device acceptance remains outstanding for mobile behavior. AUD-008 is excluded from the fixed count because the application still uses its existing plaintext offline download/view path.

No production SQL, function deployment, payment, refund, notification, secret/settings change, backup operation, native build request or deletion of existing user data was performed. SQL tests use fresh disposable PostgreSQL 17 databases and synthetic fixtures. Auth, provider and Expo transports in regressions are synthetic. Public documentation was consulted; production was not queried during this task.

## Per-finding reproduction, fix, and acceptance

The files named below are relative to the repository. Evidence is under `docs/audit/evidence/remaining-bugs-20261112/`.

| Finding | Reproduced before correction | Local correction and regression | Status |
| --- | --- | --- | --- |
| AUD-001 | Missing explicit daily trigger type; regression failed for Android before parsing the installed SDK trigger. | Explicit `SchedulableTriggerInputTypes.DAILY`; actual installed Expo parser tested for Android and iOS with expected hour/minute. Serializes scheduling/restoration. | FIXED locally; future-time/daily/reboot behavior requires devices. |
| AUD-002 | Rejected scheduling left no switch after busy state; initial-read rejection was unhandled. Independent review also reproduced stale launch restoration re-enabling a disabled reminder. | Screen catches load/schedule/cancel/time-change failure, offers load retry, retains displayed prior choice/time and clears busy state in `finally`. Service schedules before cancelling the old reminder, restores the prior schedule on storage failure where OS permits, publishes settings/identifier together, and serializes the entire restoration decision. Global launch rejection handled. Tests cover failed schedule/cancel/storage, read retry and paused OS query versus disable. | FIXED locally; OS rollback/error behavior remains device acceptance. |
| AUD-003 | Baseline navigation render retained Profile after signout. Original installed-router replace behavior leaves prior private entries. | Auth identity subscription removes private routes while signed out. Account-keyed route group discards route instances across owner changes; password recovery remains available. Profile clears old data and rejects stale completion. Tests exercise actual navigator registrations and installed StackRouter: previous route keys removed; Back cannot recover private history. | FIXED locally; two-account Back/deep-link/foreground device test pending. |
| AUD-004 | Concurrent false/false preference writes restored one category to true. | Serialized read-modify-write chain; failed reads/writes cannot publish defaults; queue recovers after failure. UI waits for durable result, disables controls while saving and shows failure. Overlap/write-rejection tests pass. | FIXED locally. |
| AUD-005 | Rejected/null terms response retained a spinner. | Separate loading/error/data state, retry and successful retry rendering. Configured terms URL behavior preserved; no invented economic terms on failure. | FIXED locally. |
| AUD-006 | Preference switch lacked its category name; baseline download/social render tests lacked action roles/names. | Explicit names for category/reminder switches, download actions, social links, search Back/filter and reminder time. Search expanded state exposed; download/social targets increased to 48×48. Behavioral semantic tests cover actions and handlers. | FIXED locally; TalkBack/touch traversal pending. |
| AUD-007 | Failed ciphertext publication left the previous blob decrypting with the wrong replaced key. | Immutable random key generations, generation reference in atomically published blob and serialized reads/writes/removes. Previous key is removed only after successful publication; ambiguous failures retain recoverable generations. Legacy blobs remain readable. Tests cover failed key/blob writes, ambiguous commit, failed removal, restart, concurrency and legacy upgrade. | FIXED locally; real Keystore lock/process/refresh acceptance pending. |
| AUD-008 | Existing downloader persists `.pdf` plaintext; native bridge advertises `contentEnabled=false` and `nativeAccepted=false`. Acquisition regression initially failed compilation because coordinator was absent. No device-byte reproduction is claimed. | Added dormant `VaultAcquisition` using existing `AtomicVault`/MVPDF authenticated streaming container. Input flows directly into encryption; expected digest, length, owner ticket, key epoch and expiry are checked, with no plaintext path API. Host tests reject truncation/tamper/wrong digest/expired admission/missing key/revocation, close input and preserve prior committed ciphertext. **Application download/view flows remain unchanged and encryption remains disabled.** | **OPEN / PARTIAL / BLOCKED.** Missing native transport, trusted permit/license integration, leased rendering, legacy migration and device acceptance prevent safe activation. |
| AUD-011 | Old prepared verifier candidate reached provider work without verified owner; anonymous request failed the new Auth-before-provider regression. Local newer handler already enforced ownership. | Separate combined verifier candidate adopts verified-owner recovery and signature-before-order-lookup admission while retaining Batch 1 settlement helper/response. Wrong-owner and missing-order responses match; body identity ignored; owner-scoped recovery limiting; invalid callbacks do not look up orders. JWT-free valid signed website callbacks remain supported. | FIXED locally in deployable source candidate; deployment required. |
| AUD-013 | Real SQL admitted a new priced order with unpublished course/product ancestor. | New migration locks and checks active product/course and target-scope ancestors before pricing or order mutation. Covers chapter/subject/year/bundle and all bundle years; same admission guard added to Play creation. Existing order snapshots/settlement remain unchanged. SQL tests verify rejection without order insert and successful recovery of an order admitted before unpublication. | FIXED locally; migration required. |
| AUD-015 | Old prepared sender accepted AAL1 with MFA required. | Combined sender verifies Auth/admin, fails closed on error/missing/malformed MFA settings and enforces AAL2 when required, before insertion/token/provider work. Tests cover on/off, AAL1/AAL2, nonadmin and policy failures. Production MFA setting was not changed. | FIXED locally; deployment required. |
| AUD-016 | Old sender counted two tickets as pushed when one was rejected; feed failure continued sending. Extended test exposed empty-ticket acceptance. | Combined sender stops on feed insert failure, counts valid nonempty accepted ticket IDs, reports failures, removes unregistered tokens and validates array cardinality. Network/timeout ambiguity retains prior batch counts, reports `unknown`, and does not retry the ambiguous batch. Admin text separates rejected/unknown from accepted; accepted tickets do not claim delivery. | FIXED locally; sender/admin delivery required. Receipt polling/device delivery remain operational gates. |
| AUD-017 | Actual settings hook allowed programmatic save after initial read failure. | Hook and page guard saving until successful baseline load; fieldset/Save disabled before baseline/during refresh. Retry supported; failed later refresh retains trusted prior settings. Tests verify zero initial-failure writes, retry and preservation. | FIXED locally; admin delivery required. |
| AUD-018 | Isolated profile selected production-only Firebase client and rejected test package. | Profile resolves genuine local `firebase-test/google-services.json` for `in.medveda.razorpaytest`; explicit EAS file input still takes precedence and is validated. Production fallback is not used for test app. Invalid explicit input rejects. | FIXED locally; **cloud input delivery unverified**: ignored local file is not an EAS-upload guarantee. Supply matching EAS file variable before cloud build. |
| AUD-019 | JSON `null` threw on `body.mobileNumber`. | Validates non-null object/non-array JSON before field access. Null, arrays, primitives, malformed JSON and invalid fields return the existing generic 401 without DB/Auth work. | FIXED locally; login function deployment required. |
| AUD-020 | Invalid/unavailable Auth result still entered success state. | Shows loading, then requires successful `getUser` plus confirmed email before success. Missing SDK/user/confirmation, rejected token and transport rejection show error. Empty fragment remains neutral. Website build/link checks pass. | FIXED locally; website delivery required. |

Before/after evidence: `mobile-red.log`, `navigation-red.log`, `icons-red.log`, `settings-red.log`, `firebase-red.log`, `login-red.log`, `website-red.log`, `recovery-red.log`, `push-policy-red.log`, `push-tickets-red.log`, `push-extended-red.log`, `checkout-red.log`, `vault-acquisition-red.log`, `reminder-load-red.log`, `reminder-race-red.log`, and the corresponding final regression logs. Red logs are deliberate reproductions, not final verification failures. Some cases are transport/platform simulations, explicitly not device reproduction.

## Validation results

| Check | Final result / evidence |
| --- | --- |
| Focused offline verification driver | **28/28 commands PASS**, `verification-results.json`; mobile/admin TypeScript, whole application lint, all workspace Edge entrypoints/worker checks, candidate checks and focused behavioral/native-host regressions. |
| Existing broad Node regression inventory | **123/123 commands PASS** in the final rerun; `node-results.json` / `node-summary.log` enumerate every command and exit. Initial run was 121/123; the stale signed-out navigation fixture and non-hermetic staging fixture were corrected, preserving assertions and production guards. |
| Full backend/database suite | **PASS**, `database-full.log`, exit `0`; all **78 migrations** build in disposable PostgreSQL, SQL suites, payment/wallet/discount concurrency, Play/billing and **25-check webhook harness**. New publication/login/push/recovery regressions are registered in `run-all.sh`. |
| Combined candidates with actual PostgreSQL | **PASS**, `candidate-database.log`, exit `0`; preserved Batch 1 handler/settlement/SQL cases plus owner recovery run against new candidate closures. |
| New migration replay and ACL | **PASS**, `migration-replay.log`: all 78 migrations, repeated forward application, unchanged synthetic financial/catalog/content fingerprints, anon/authenticated denial and service_role execution, all ancestry scopes and existing-order recovery. |
| Deno regression tests | **40 passed, 0 failed**, `deno-tests.log`, `additional-results.json`. |
| Native foundation | **22 focused host tests PASS**, independent Node/Kotlin AES-GCM codec interoperability and four forced-JVM-halt/reopen boundaries; `final-vault-run-host-tests.py.log`. |
| Native control | **11 shared-control groups PASS**, three journal halt/reopen stages; `final-vault-phase1b-run-tests.py.log`. |
| New dormant acquisition | **PASS**, `final-vault-acquisition-run-tests.py.log`; no Android/iOS/device result implied. |
| Admin standard tests and build | **PASS**, `admin-test.log`, `admin-build-final.log`; application and Node TypeScript also checked separately. |
| Mobile configured password recovery command | **PASS**, `mobile-npm-test.log`; broader mobile behavior is covered above. |
| Website | **PASS**, local build and link check: **17 pages, no link problems**; Auth verification negative/success regressions pass. Generated sitemap was restored to its prior bytes to avoid unrelated publication-date changes. |
| Android artifact validator fixtures | **11 tests PASS**, `android-validator.log`; synthetic artifacts, not a built APK/AAB. |
| Security and artifact preservation | Changed-source secret scan PASS (values never printed); new candidate checksums PASS; original Batch 1 checksum inventory PASS; scoped changed-file whitespace check PASS. |

Initial database attempts had harness issues: missing `HOME` for the Batch 1 runner, bootstrap-role-dependent ACL ordering, and editing the shell runner while an earlier run was active. These were corrected with an isolated clean `postgres` bootstrap cluster and a fresh complete run. No privilege assertion was relaxed and no security rule was bypassed. Earlier test syntax/mock mistakes were corrected before final verification. An existing unrelated StoreScreen whitespace issue remains untouched; it does not occur in this task's edits.

Independent read-only review found the reminder restore/disable race, which was reproduced and fixed before final verification. Final review found no other substantive issue in the reviewed fixes. Initial reminder-read recovery was completed subsequently and independently rechecked.

**New application regressions detected after final corrections: none in executed checks.** This statement does not cover native/device/provider workflows that were not run. Full original broad-run history and intentional red logs remain available; command counts are not presented as end-to-end readiness percentages.

## Security assessment

Local corrections address private route retention, session key/blob failure atomicity, unsigned cross-owner recovery, unpublished checkout admission, configured MFA enforcement, unsafe Settings fallback, and false verification/send claims. Batch 1 reversal/refund access guards and broadcast-only targeting rejection remain intact. No price, wallet/referral economics, entitlement snapshot, payment-provider setting or public purchase activation was changed.

**Remaining confirmed security bug:** paid offline PDFs in the existing application are still plaintext at rest (AUD-008). The new coordinator is dormant and does not remediate existing retained plaintext. There is no plaintext-to-encrypted migration, automatic purge or lossy conversion. Native acceptance and legacy preservation must be established before activation. Previously issued signed URLs/offline licenses retain their existing bounded behavior; these changes do not remotely recall copied files.

Key generations left after an ambiguous storage failure may be orphaned; they are retained rather than risking loss of the current durable session. Session atomicity correction is not a claim of whole-device rollback protection. Push timeout outcomes remain explicitly unknown; do not blindly retry broadcasts based on a missing acknowledgement. Receipt processing and monitored delivery remain outstanding operational acceptance, rather than inferred delivery from HTTP/ticket success.

## Database and delivery requirements

New migration: **`supabase/migrations/20261112150427_audit_checkout_publication_guard.sql`**.

SHA-256: `214479eff8f239d892d41ff3be438f9df9a3d4662f4950d27496828e57bc2a2d`.

It creates service-only publication locking/checking and replaces the existing pricing/Play creation definitions. It adds no tables, data backfill, destructive operation, schedule, setting or price change. It preserves the existing pricing/discount/wallet and Play eligibility bodies. Active publication ancestors remain shared-locked through order insertion; unpublication that already committed rejects new checkout. Existing admitted payments remain recoverable.

The existing Batch 1 migration **`20261112104610_audit_batch1_refund_revocation.sql`** is also still required according to its preflight. It was not altered. Both are locally validated; neither was applied to production here. Do not run a blanket database push, replay old migrations or repair the historical migration-name discrepancy. Before approval, refresh read-only deployed schema/history/source compatibility and review the exact execution scope and operational gates.

Prepared combined closures are in **`supabase/releases/audit-remaining-20261112/`**, with complete `manifest.json` and `checksums.sha256`:

- `verify-payment`: AUD-011 plus preserved Batch 1 settlement fixes; valid JWT-free signed website callbacks still work.
- `send-push-notification`: AUD-015/016 plus preserved AUD-014 broadcast rejection.
- `razorpay-webhook`: byte-identical Batch 1 candidate, retaining AUD-009/010. No unrelated local worker/UCB changes were swept in.

Additional future delivery: `login-with-mobile` for AUD-019; website assets for AUD-020; admin assets for AUD-017 and improved notification outcomes; a separately built and accepted mobile release for AUD-001–007/018. The database-side AUD-013 guard protects the deployed `create_priced_order` contract before provider creation and does not itself require changing the website checkout request format or deploying create-order.

No function, frontend, mobile build or migration is authorized for production execution by this report. Original Batch 1 archives/manifests remain unchanged. Candidate source is reviewable preparation, not release approval.

## Android build blockers and native workflows

Fresh filesystem check: `ANDROID_HOME` and `ANDROID_SDK_ROOT` both point to absent `/home/ganeshp8545/Android`; `/usr/lib/android-sdk/platforms`, `build-tools`, and `ndk` are absent. **Local native compilation is BLOCKED.** Cached Kotlin/JCA host tests are not Android/Expo compilation. No APK/AAB, Gradle/R8/JNI/16KB-page compatibility or signed-artifact/install test was produced.

A future EAS cloud build can supply its own SDK, but its exact source archive, matching Firebase file input/FCM credentials, signing and compiled native module compatibility were not verified here. The local isolated Firebase file is git-ignored; configure the genuine matching EAS `GOOGLE_SERVICES_JSON` file input rather than assuming local fallback is uploaded. Production credentials/settings were not inspected or changed. Missing local SDK does not by itself prove a cloud compilation failure.

**AUD-008 acceptance remains BLOCKED:** native HTTP streaming and cancellation; trusted owner/license/version/digest permit issuance; no-backup native coordinator/registry integration; native leased temporary renderer and cache lifecycle; startup/process/background/lock cleanup; lossless legacy-download migration/rollback; Android compilation/instrumentation; iOS writer/coordinator parity where supported; large PDFs/low storage/low-end device acceptance. Do not set `contentEnabled` or `nativeAccepted` true or wire this incomplete pipeline into existing downloads.

The original E01–E16 complete journeys remain unverified as complete native workflows: registration/verification/profile; content/free PDF navigation; checkout; provider payment-to-entitlement-to-PDF; restart restore; encrypted download/offline read; cancelled payment; failed payment; duplicate callback; cross-account denial; logout/login restore; expired session; network-loss recovery; push-to-destination; contact/social intents; signed APK install/startup/use. Also outstanding: daily reminder future fire/repeat/reboot/permission denial, TalkBack, native Keystore failure/lock behavior, protected PDF lifecycle, screenshots, rotation, process death and real-device resource/performance measurements. No real payment/refund/notification was used to fill those gaps.

## Production deployment blockers

1. Complete AUD-008 safely and obtain native/device acceptance; current plaintext offline path keeps the retained encryption release requirement open.
2. Close build-input/signing/archive/native compilation and exact-artifact installation acceptance. Local source/config checks alone cannot certify an Android build.
3. Separately review and explicitly approve the precise two migrations and function/frontend/mobile delivery scope; deployed old handlers remain unchanged by this work.
4. Complete approved hosted Auth/MFA/Storage, two-account privacy, reminder, notification/receipt and provider acceptance. Preserve disabled/unapproved purchasing boundaries.
5. Resolve recovery operations ownership, queue monitoring/alert delivery, escalation targets and deployment observation/rollback responsibilities from the Batch 1 preflight. Empty prior queues are not monitoring acceptance; no worker, schedule, refund or alert was activated.
6. **Existing backup/recovery blocker, reported only:** the preflight records PITR off, no verifiable usable managed backup in its inventory, and no current complete managed Auth/Storage restore acceptance. This evidence was inherited, not refreshed. No backup infrastructure was touched or remediation attempted.
7. Retain other public-distribution, Auth/privacy/retention, historical Play recovery and operational gates from the audit until their owners provide acceptance. Local bug counts do not close those gates.

## Exact changed files

The following lists are this task's incremental edits, not every pre-existing dirty file. `evidence/remaining-bugs-20261112/changed-files.json` records the exact code/test/plan/candidate paths and SHA-256 values. Candidate files are additionally enumerated in their release manifest. Generated admin build/cache files are validation output, not source changes.

### Modified application/config files

- `mobile-app/app.config.js`
- `mobile-app/src/config/secureSessionStorage.ts`
- `mobile-app/src/navigation/AppNavigator.tsx`
- `mobile-app/src/services/studyReminderService.ts`
- `mobile-app/src/utils/notificationPreferences.ts`
- `mobile-app/src/components/SideDrawer.tsx`
- `mobile-app/src/screens/downloads/DownloadsScreen.tsx`
- `mobile-app/src/screens/notifications/NotificationPreferencesScreen.tsx`
- `mobile-app/src/screens/profile/ProfileScreen.tsx`
- `mobile-app/src/screens/referral/ReferralTermsScreen.tsx`
- `mobile-app/src/screens/reminder/StudyReminderScreen.tsx`
- `mobile-app/src/screens/search/SearchScreen.tsx`
- `admin-panel/src/hooks/useSettings.ts`
- `admin-panel/src/pages/Settings.tsx`
- `admin-panel/src/pages/Notifications.tsx`
- `supabase/functions/login-with-mobile/index.ts`
- `supabase/functions/send-push-notification/index.ts`
- `website/assets/js/account-verified.js`

### Modified regression runners

- `mobile-app/scripts/navigation-lazy-selftest.cjs`
- `mobile-app/scripts/staging-build-selftest.cjs`
- `supabase/tests/mv004-recovery-selftest.cjs`
- `supabase/tests/p1-push-delivery-selftest.cjs`
- `supabase/tests/run-all.sh`

### New implementation, migration and tests

- `mobile-app/modules/medveda-offline-vault/integration/VaultAcquisition.kt`
- `mobile-app/modules/medveda-offline-vault/tests/acquisition/AcquisitionTest.kt`
- `mobile-app/modules/medveda-offline-vault/tests/acquisition/run-tests.py`
- `mobile-app/scripts/remaining-audit-selftest.cjs`
- `mobile-app/scripts/audit-reminder-service-selftest.cjs`
- `mobile-app/scripts/audit-navigation-selftest.cjs`
- `mobile-app/scripts/audit-icon-controls-selftest.cjs`
- `mobile-app/scripts/audit-firebase-profile-selftest.cjs`
- `admin-panel/scripts/audit-settings-selftest.cjs`
- `website/scripts/account-verified-selftest.cjs`
- `supabase/migrations/20261112150427_audit_checkout_publication_guard.sql`
- `supabase/tests/audit-checkout-publication.sql`
- `supabase/tests/run-remaining-audit-local.py`
- `supabase/tests/audit-login-body-selftest.cjs`
- `supabase/tests/audit-push-policy-selftest.cjs`
- `scripts/check-remaining-audit-local.py`

### New combined release files

- `supabase/releases/audit-remaining-20261112/README.md`
- `supabase/releases/audit-remaining-20261112/candidate/razorpay-webhook/functions/_shared/razorpay.ts`
- `supabase/releases/audit-remaining-20261112/candidate/razorpay-webhook/functions/_shared/settle.ts`
- `supabase/releases/audit-remaining-20261112/candidate/razorpay-webhook/functions/_shared/supabaseAdmin.ts`
- `supabase/releases/audit-remaining-20261112/candidate/razorpay-webhook/functions/razorpay-webhook/index.ts`
- `supabase/releases/audit-remaining-20261112/candidate/send-push-notification/functions/_shared/cors.ts`
- `supabase/releases/audit-remaining-20261112/candidate/send-push-notification/functions/_shared/rateLimit.ts`
- `supabase/releases/audit-remaining-20261112/candidate/send-push-notification/functions/_shared/supabaseAdmin.ts`
- `supabase/releases/audit-remaining-20261112/candidate/send-push-notification/functions/send-push-notification/index.ts`
- `supabase/releases/audit-remaining-20261112/candidate/verify-payment/functions/_shared/cors.ts`
- `supabase/releases/audit-remaining-20261112/candidate/verify-payment/functions/_shared/rateLimit.ts`
- `supabase/releases/audit-remaining-20261112/candidate/verify-payment/functions/_shared/razorpay.ts`
- `supabase/releases/audit-remaining-20261112/candidate/verify-payment/functions/_shared/settle.ts`
- `supabase/releases/audit-remaining-20261112/candidate/verify-payment/functions/_shared/supabaseAdmin.ts`
- `supabase/releases/audit-remaining-20261112/candidate/verify-payment/functions/verify-payment/index.ts`
- `supabase/releases/audit-remaining-20261112/checksums.sha256`
- `supabase/releases/audit-remaining-20261112/deno.json`
- `supabase/releases/audit-remaining-20261112/deno.lock`
- `supabase/releases/audit-remaining-20261112/manifest.json`

### Documentation and evidence

- `docs/superpowers/plans/2026-11-12-remaining-audit-bugs.md`
- `docs/audit/MEDVEDA_REMAINING_BUGS_FIX_REPORT_2026-11-12.md`
- Every file under `docs/audit/evidence/remaining-bugs-20261112/` is enumerated in `files.json`, including exact commands/exits, red/green logs, initial status, source fingerprints and final verification outputs. `files.json` itself is additional inventory metadata.

## Final answers

1. **Are all 20 audit bugs fixed in the working tree? No.** Nineteen have local fixes; AUD-008 remains open/partial. Fifteen of this request's sixteen are locally fixed; four Batch 1 fixes are preserved. Device acceptance is still pending for mobile fixes.
2. **Which fixes still require deployment?** Both reviewed database migrations; the combined verifier/webhook/sender candidates; corrected login handler; website/admin assets; and a separately built/accepted mobile release. No deployments occurred. Encryption must remain disabled until complete.
3. **Is the app ready for an Android APK build? Not certified or locally build-ready.** Local SDK/platform/build-tools/NDK are missing. A separately authorized cloud build can use its own tooling after exact source/Firebase/signing inputs are verified; native compilation and artifact acceptance remain unproven.
4. **Is it ready for production release? No.** AUD-008, native/provider/hosted acceptance, operational/recovery gates and approved delivery remain blockers.
5. **Exact next step:** provision or select an isolated Android build/device test environment with matching genuine Firebase input, then finish the native vault transport/permit/view/legacy-preservation integration and run its device acceptance **before activation**. Keep existing downloads intact. Production migrations/deployments remain separately approval-gated after operational blockers close.
