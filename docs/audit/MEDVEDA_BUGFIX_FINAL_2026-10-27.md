# MedVeda final bug fixes — 27 October 2026

This is a source/local-test audit and fix report. Paid-release approval remains blocked by B03 and the hosted/device gates below.

Consolidated `perf-size-1` into `audit-fix-1` by fast-forward to `f9d6193`, preserving every commit. Full consolidated baseline passed before creating `bugfix-final-1`. No database, RLS, deployed Edge Function, Console setting or production data was changed.

Paid release remains **NO-GO**. B03 PDF/license encryption is **not implemented**. The current resumable downloader writes plaintext; encrypt-after-download would violate the requirement. The installed blob transformer buffers the entire PDF and requires a native transformer. No device was attached for large-PDF memory/latency, force-stop or keystore tests. Under the user's explicit rule against applying unverified behavior changes, the encryption replacement requires owner approval of the native implementation and device acceptance plan. Existing seven-day expiry, rollback checks, owner cleanup and integrity checks are retained. No encryption round-trip/migration/performance pass is claimed.

Earlier baseline and checks 01–05 passed in this conversation, but their `/tmp` logs were lost when the execution environment restarted. Retained fresh summaries from check 06 onward are in `evidence/bugfix-final-20261027/`. The first isolated-snapshot scan (07) encountered EISDIR on node_modules symlinks; after correcting the snapshot ignore rules, the identical scan passed with 1,136 files and zero matches. This harness failure is recorded, not a waived application failure.

The shared dependency symlink also let Expo AppEntry resolve the working-tree App during snapshot exports 07–21. Those initial exports are superseded by repeats with an equivalent snapshot-local entry. The temporary entry is excluded from snapshot TypeScript discovery: otherwise its direct Expo implementation import causes dependency-internal type errors. This exclusion changes no product source or compiler option. The initial check-22 attempt reported type errors inside Expo after the temporary entry imported its implementation; no final summary survived the restart. Baseline-repeat/22 were rerun with the corrected harness. Later cold builds were interrupted because concurrent runs competed for memory, then repeated with two check threads/two Metro workers. Checks 01–06 used the working tree directly. No failed product check is waived. A [bundle content sanity check](evidence/bugfix-final-20261027/bundle-snapshot-sanity.json) verifies that a message introduced in commit 14 is absent in 12/13 and present in 14.

## Audit scope and findings

Source-wide inventory/search covered mobile screens/hooks/services/repositories, admin hooks/pages/services, and all 20 Edge entrypoints/shared helpers. Risk-focused tracing covered auth/recovery, navigation, payments, downloaded notes, quiz sync, search, notification routing and mutation/error paths. Evidence below is source and local mocked behavior, not device/hosted acceptance. No Critical exploit was demonstrated; the existing Critical paid-launch catalog gate remains open. The audit cannot prove the absence of every bug.

| ID | File / evidence | Severity | Problem | Fix applied |
|---|---|---|---|---|
| F01 | [mobile-app/src/services/playBillingService.ts:343](../../mobile-app/src/services/playBillingService.ts#L343) | High | Native product reads could leave checkout waiting indefinitely. | Yes: 15-second deadline, explicit retry message; late result cannot initiate payment. |
| F02 | [mobile-app/src/services/playBillingService.ts:395](../../mobile-app/src/services/playBillingService.ts#L395) | Medium | Session/order/native recovery reads had no application deadline. | Yes: each read bounded; settlement unchanged. |
| F03 | [mobile-app/src/screens/payment/PlayBillingScreen.tsx:32](../../mobile-app/src/screens/payment/PlayBillingScreen.tsx#L32) | High | Checkout could remain spinning after a lost native callback; state-only tap guard admitted same-frame duplicates. | Yes: synchronous guard, 30-second UI watchdog, recovery action, cancellation message, account-bound preparation. Native callbacks remain available for late success. |
| F04 | [mobile-app/src/navigation/withRouteValidation.tsx:6](../../mobile-app/src/navigation/withRouteValidation.tsx#L6) | Medium | Missing/non-string IDs or invalid modes reached destructuring/effects. | Yes: route guard rejects before mounting content; safe Back/Home action. |
| F05 | [mobile-app/src/screens/years/YearsScreen.tsx:59](../../mobile-app/src/screens/years/YearsScreen.tsx#L59) | Medium | Pull-to-refresh was absent despite Retry support. | Yes: six lists use their existing reload paths. Tests exercise each screen's loading/error/empty/populated states. |
| F06 | [admin-panel/src/hooks/useRequestGuard.ts:4](../../admin-panel/src/hooks/useRequestGuard.ts#L4) | Medium | Old filter/request responses could overwrite newer list data or update after unmount. | Yes: per-scope request sequence and lifetime guard. |
| F07 | [admin-panel/src/context/AuthContext.tsx:27](../../admin-panel/src/context/AuthContext.tsx#L27) | High | Late admin/bootstrap reads could restore stale UI authorization after signout/account switch. | Yes: invalidate results; clear prior authorization while checking. Server policies unchanged. |
| F08 | [mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx:41](../../mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx#L41) | High | In-flight offline access check could reveal a document again after background/auth invalidation. | Yes: generation and foreground guards; missing/empty/corrupt/expired/revoked messages. Native cleanup remains B03. |
| F09 | [mobile-app/src/hooks/useDownloads.ts:70](../../mobile-app/src/hooks/useDownloads.ts#L70) | Medium | Storage/native rejection from pause/resume/retry/cancel/remove/clear escaped event handlers. | Yes: recoverable alert and successful refresh; manager semantics unchanged. |
| F10 | [mobile-app/src/screens/auth/LoginScreen.tsx:131](../../mobile-app/src/screens/auth/LoginScreen.tsx#L131) | Medium | SecureStore lookup outside catch; duplicate submit before loading state committed. | Yes: synchronous guard and handled secure read failures; same lockout policy. |
| F11 | [admin-panel/src/pages/Notes.tsx:142](../../admin-panel/src/pages/Notes.tsx#L142) | Medium | Error text told users to retry but supplied no Retry action. | Yes: accessible error block with existing reload. |
| F12 | [mobile-app/src/screens/quiz/QuizScreen.tsx:81](../../mobile-app/src/screens/quiz/QuizScreen.tsx#L81) | Medium | Valid JSON with missing/malformed question arrays/options could crash. | Yes: shape checks before QuizSession; valid questions unaffected. |
| F13 | [mobile-app/src/services/authState.ts:13](../../mobile-app/src/services/authState.ts#L13) | High | Stale bootstrap or blocked-profile response could replace/sign out a newer account. | Yes: auth-event precedence and current-owner check before enforcement. |
| F14 | [mobile-app/src/screens/notes/NotesScreen.tsx:124](../../mobile-app/src/screens/notes/NotesScreen.tsx#L124) | High | Late signed-URL response could navigate after blur/account change; duplicate opens. | Yes: focus/owner/tap guards and actionable access errors. A separate regression closes blur/refocus revival and prevents obsolete cleanup from releasing a newer tap guard. |
| F15 | [supabase/functions/create-play-order/index.ts:10](../../supabase/functions/create-play-order/index.ts#L10) | Medium | JSON null/primitive bodies could throw before validation. | Yes in source: reject non-object requests with 400 before processing. Deployment needs approval. |
| F16 | [mobile-app/src/components/NoteCard.tsx:59](../../mobile-app/src/components/NoteCard.tsx#L59) | Medium | Missing accessible labels/roles and nested note actions impaired independent focus. | Yes in source; device TalkBack and font-scale acceptance pending. |
| F17 | [mobile-app/src/screens/payment/PlayBillingScreen.tsx:134](../../mobile-app/src/screens/payment/PlayBillingScreen.tsx#L134); [status polling:59](../../mobile-app/src/screens/payment/PaymentFailedScreen.tsx#L59) | Medium | Already-owned quote appeared unavailable; overlapping status checks could navigate after leaving. | Yes: dedicated owned action, focused/coalesced polling, explicit terminal message. |
| F18 | [mobile-app/src/screens/profile/EditProfileScreen.tsx:78](../../mobile-app/src/screens/profile/EditProfileScreen.tsx#L78) | Medium | Auth update error was ignored and duplicate save allowed; could report misleading success. | Yes: inspect returned error, guard submit and account, require nonblank name. |
| B03 | [mobile-app/src/utils/downloadManager.ts:220](../../mobile-app/src/utils/downloadManager.ts#L220) | High | Paid PDF bytes and license timestamps remain plaintext; viewer uses native temporary files. | **Needs approval / not fixed**: authenticated streaming encryption plus native lifecycle acceptance; plan below. |
| B01/B02 | Prior production catalog/worker evidence, `docs/audit/MEDVEDA_PRODUCTION_READINESS_2026-10-26.md` | Critical/High release gates | Paid launch catalog/403 and operational worker readiness remain unqualified. | **Needs approval**: Console/provider/hosted investigation; no live action taken. |
| B04/B05/B06 | Existing retention/migration/MFA source and deployment plan | High | Retention operation, deployed authorization boundaries and mandatory admin MFA need validation/approval. | **Needs approval**: exact procedures below. |
| B07–B10 | [Prior release gates](MEDVEDA_PRODUCTION_READINESS_2026-10-26.md) | High | Full restore, final binary/Store acceptance, public legal/auth/deletion qualification and symbolicated monitoring remain unverified. | **Needs approval**: hosted/device/service work below; no closure claimed. |
| B11–B13 | Consolidated notification/list tests and `supabase/deno.json`, `supabase/deno.lock` | Medium | Earlier notification routing, list error states and dependency reproducibility findings. | Already addressed in consolidated source; local regressions pass. Device/hosted deployment acceptance remains open. |
| B14 | Diagnostic handlers/configuration; deletion rate-limit tests | Medium | Investigation surface remains operational pending 403 resolution. | Retained as requested, with admin/AAL2 tests and retirement markers; deployment/throttle qualification remains an owner gate. |
| B15 | `create-order/index.ts`; Android release guard regression | Medium | Optional platform/version header is not server-side platform attestation. | Android client guard verified locally. **Needs approval** for a separate server-controlled website checkout boundary; changing legacy routing is outside the UI-only fix. |
| D01 | [supabase/functions/diagnose-play-matrix/index.ts:1](../../supabase/functions/diagnose-play-matrix/index.ts#L1) | Low | Investigation endpoints need explicit retirement marker and authorization coverage. | Yes: REMOVE_AFTER_INVESTIGATION retained with verified admin + AAL2 tests; no removal/deployment. |
| P01 | [mobile-app/src/config/paymentProvider.ts:8](../../mobile-app/src/config/paymentProvider.ts#L8) | High invariant | Android must never create/open Razorpay checkout. | No production fix needed: release-mode integration tests prove current config/service/screen guards; website/legacy unchanged. |
| L01 | [mobile-app/src/components/StaggerItem.tsx:29](../../mobile-app/src/components/StaggerItem.tsx#L29) | Low | Animation work is not explicitly stopped on effect cleanup. | No: nonblocking polish; native animation behavior not qualified in this pass. |

### Rechecked paths without a new demonstrated defect

YouTube normalization/open tests cover youtu.be, watch?v, mobile hosts, shorts, playlists, whitespace/hidden characters, native fallback, browser fallback and actual card-to-opener tap wiring. Free video and MCQ cards remain free even with legacy lock flags. Local tests do not establish actual Android overlay/gesture behavior.

Downloads retain fresh URL authorization, partial/non-PDF/size checks, duplicate coalescing, generation invalidation, seven-day grace, rollback invalidation, denial, account ownership and old quiz cleanup. Quiz queue concurrency/offline scoring tests remain passing. Crash/restart/native disk-full acceptance remains manual. Unowned notes still use server authorization; local UI ownership is only a hint.

Notification allowlisting, cold-start/live-response deduplication and login/onboarding routing tests remain passing. Password recovery, reset precedence, MFA recovery, OTP/account-neutral responses, password validation, maintenance and force-update tests remain passing. Search pagination/cache/course-owner scoping tests remain passing. Contact Facebook placeholders were already removed; internal AyurPulse package/slug identifiers are retained to preserve application identity. Social links/support ownership require owner confirmation, not guessed replacements.

## Intentionally unchanged / needs my approval

No schema, migration, RLS, hosted data, deployment, Console setting, real payment/refund, email or push was changed. Billing grant/verification/settlement algorithms are unchanged; the Edge change only rejects malformed request bodies. Website and Razorpay order/verification/provider logic remain intact. The shared payment-status screen receives UI-only polling cleanup, with both Play and legacy recovery paths exercised locally. No dependency upgrade or new native module was added.

### B03 — concrete encryption design and acceptance gate

Approve a native-compatible authenticated streaming file path and a signed internal test build before replacing the working downloader. Required implementation:

1. Generate a random per-user key; store only the key in expo-secure-store under an owner-scoped identifier. Use authenticated encryption (e.g. chunked AES-GCM with independently unique nonces and authenticated owner/note/version/chunk-order/final-length data). Never use unauthenticated CTR alone. Keep license/checkedAt/lastSeenAt data encrypted and authenticated with the owner key, preserving seven-day expiry and persisted rollback denial.
2. Encrypt incoming response chunks before any persistent write. The current Expo resumable download writes plaintext and cannot simply be wrapped with post-download encryption. Installed blob-util's transform path buffers the complete response and needs a native transformer; it does not establish bounded memory for large PDFs. Select/validate a native streaming implementation, preserving fresh URL authorization, integrity, cancellation and generation checks.
3. Write ciphertext to an incomplete file, verify full response/header/length and authentication, then atomically publish the completed path. On process death, retain only ciphertext; safely restart incomplete transfers. Do not add DB schema to do this without separate approval.
4. Existing plaintext downloads must be marked for re-download or migrated using bounded encrypted writes followed by verified cleanup. Remove orphan plaintext and native viewer caches on upgrade/startup. Never count plaintext legacy rows as protected downloads. Test missing keys and interrupted migration without crashes.
5. Authenticate every chunk before exposing it. Decrypt only to a private temporary viewing file; remove on close/blur/background/logout/account switch and purge leftovers before next launch. Account change must invalidate in-flight decryption before it can publish a file. Process kill cannot run JavaScript cleanup, so startup cleanup and native lifecycle handling are mandatory.
6. Measure at least 1/10/50/100 MB representative PDFs on low-end and normal Android devices: 10 cold and 10 warm opens each, median/p95 time to first rendered page, peak memory, file size and cleanup. Repeat with airplane mode, expired grace, clock rollback, refund/revoke, storage full, background, force-stop, reboot, upgrade and account switch. Accept latency/memory budgets before shipping. No before/after PDF numbers or encryption round-trip pass is available from this session.

### Hosted/Console actions — instructions only, not executed

- Reconcile deployed migration history and exact function bodies against `supabase/DEPLOY_ORDER.md` before applying anything; use a disposable hosted staging project for the anon/student/owner/refunded/admin-AAL1/admin-AAL2 matrix. Do not reset, repair history, weaken RLS or replay pending migrations blindly.
- After source review and staging tests, separately approve deploying `create-play-order` and `verify-play-purchase` from this revision using the established deployment process. Example commands: `supabase functions deploy create-play-order --project-ref <approved-project>` and `supabase functions deploy verify-play-purchase --project-ref <approved-project>`. Diagnostic marker comments require no operational change. Existing deployment configuration/auth gates must be retained.
- With a verified AAL2 owner account, resolve Play 403 using the existing sanitized diagnostic matrix; confirm service-account app scope, API enablement, package/track, monetization setup and active INR BUY offers. Do not create/activate products as a read-only check. Then use licensed internal testers for success/cancel/pending/kill-relaunch/restore/refund/void acceptance. Confirm exact production binary is Play-only.
- Read job state and aggregate backlog without printing secret-bearing commands. Enable only specifically approved Play workers after catalog and settlement staging acceptance. Existing exact worker setup and rollout instructions: `supabase/play_payment_cron_setup.sql` and `supabase/DEPLOY_ORDER.md`; do not blanket-enable cron jobs.
- Verify all admin accounts have usable MFA enrollment/recovery, stage the switch, then approve the existing setting update below. Test AAL1 denial and AAL2 success before production rollout.

```sql
-- Owner-approved operation only; not executed here.
begin;
select public.set_admin_mfa_required(true); -- refuses if an admin lacks a verified factor
select id, require_mfa from public.admin_settings where id = true;
commit;
```

- Retention requires legal/product approval of the existing fixed 180-day cutoff from first purchase, including active accounts and immediate eligibility of old rows. After verifying the existing purge migration/function and service-only grants in staging, approve the cadence and alert owner. This operation irreversibly removes expired identity rows; it is not included in this code change.

```sql
-- Read-only checks first; avoid selecting cron command/credentials.
select jobid, jobname, schedule, active from cron.job
where jobname = 'first-purchase-identity-retention';
select count(*) as overdue from public.first_purchase_identities
where first_purchase_at < now() - interval '180 days';
-- Only after separately approved migration, cutoff, cadence and monitoring:
select cron.schedule('first-purchase-identity-retention', '0 * * * *',
  'select public.purge_expired_first_purchase_identities();');
```

Verify scheduled-run status, overdue count and alerts; hourly cadence permits up to one hour plus runtime cutoff lag. The full existing plan is in `PRIVACY_OWNER_ACTIONS_20261026.md` and the retention section of `supabase/DEPLOY_ORDER.md`. No retention SQL was run.

### Other inherited release gates

B07: approve a disposable compatible restore target, restore full database/Auth/Storage metadata and object bytes, then verify synthetic login, signed PDF retrieval, purchases, FK counts and recovery time; follow `MEDVEDA_PRODUCTION_BACKUP_RESTORE_READINESS_20261023.md`. Never restore over production.

B08: after B03 and hosted gates pass, build the approved release profile, record source/artifact hash, versionCode and signing certificate, inspect permissions/native libraries, install through the internal track and finish the checklist below. Owner must approve Store declarations, rights, reviewer account and rollout. No signed AAB or upload was produced here.

B09: owner must verify published legal/bridge URLs on real networks, actual audience/consent wording and sender/redirect configuration. Use synthetic staging accounts for signup/reset/deletion and enumerate retained records/files. Do not change legal claims or erase live users as a test.

B10: approve Sentry/EAS credentials and project configuration, follow the existing `SENTRY_SETUP.md` integration and configure the approved release build and demonstrate a sanitized symbolicated test event plus delivery of payment backlog alerts. The consolidated source already includes Sentry Metro/plugin integration; operational symbolication and alert delivery are not certified by local builds.

B15: if server-enforced website-only Razorpay access is required, approve an authenticated server-controlled web checkout boundary and legacy migration plan. Test omitted/spoofed platform headers and active legacy clients in staging before changing the endpoint. The Android test proves application control flow, not platform attestation against arbitrary HTTP callers.

## Android manual acceptance checklist

Every checkbox below is **pending**, not a local test pass. Record source hash, binary hash/versionCode, device/OS/ABI, install/upgrade path, account, network and result.

- [ ] Login/register/email verification/OTP/lockout: invalid fields, wrong credentials, secure storage unavailable, rapid submit, font scale 1.3+, keyboard, Back, recovery after failure.
- [ ] Forgot/reset: cold/warm logged-in/logged-out links, used/expired/malformed links, MFA, token cleanup and correct destination. Confirm reset never opens the wrong account.
- [ ] Content lists: initial loading, true empty, offline/error, Retry, pull-to-refresh, reconnect and rapid course/year changes. Check all six lists and search.
- [ ] YouTube installed/absent/disabled browser: watch/shorts/playlist/mobile URLs, hidden pasted characters, fallback, card tap and Back; free MCQ/videos never show a paid gate.
- [ ] Free MCQ: valid/malformed/offline download, answer submission once, airplane-mode queue, reconnect, account switch while sync is in flight and server-confirmed score.
- [ ] Notes preview/unowned/owned access, download progress, same-frame duplicate taps, pause/retry/cancel, partial download, file removal/corruption, storage full and very large PDF.
- [ ] **Encryption release gate:** approve/implement B03 first; inspect encrypted PDF/license storage, old-download migration, temporary-file deletion on close/background/logout/kill-relaunch, missing key, integrity tampering, seven-day expiry and clock rollback. Current branch does not pass this gate.
- [ ] Checkout native product stall, quote/session stall, pending/cancel/fail/already-owned, offline before/after payment, double tap, process kill/relaunch, restore, late callback, account switch, refund/revoke. Never pay again while unconfirmed; use My Purchases recovery.
- [ ] Verify purchase success with server order/grant, one receipt/token/order handling and worker settlement. Test Android release cannot open/create Razorpay checkout; legacy/website test separately.
- [ ] Notification delivery and tap while foreground/background/killed, logged out/onboarding/recovery, malformed payload, duplicate tap, permission denied and account switch. Confirm no stale-account pushes.
- [ ] Profile save failure/partial update, invalid name/phone, duplicate save, logout/account switch, account deletion retry and retained-data behavior on synthetic staging accounts.
- [ ] Maintenance/force-update at launch/resume, offline fallback, Retry, valid Store destination and Back handling.
- [ ] Low-end phone, small screen, tablet, font scale 1.3+/2.0, dark palette, safe areas and TalkBack focus order on login, notes and purchase screens. Verify separate note Open/Download/Remove actions, button labels, pending messages, scrollability and keyboard overlap.
- [ ] Clean install/upgrade, native PDF/keystore behavior, 16 KB page-size compatibility, memory/ANR, native symbolication and real provider/push/email behavior. JS export does not certify these.

## Regression inventory

Run `python3 scripts/check-readiness-local.py --full` with installed dependencies/cache. It executes both mobile/admin TypeScript checks, lint, Android export, admin build, all discovered local Node self-tests, 20 Deno entrypoint checks, 40 Deno unit cases, five Deno scripts, website links and secret patterns. Hosted DB-writing/SQL/provider tests stay excluded under the user's no-production/no-schema instruction; see each results file for the exact exclusion inventory.

Regression suites cover password recovery/identity/password policy/lockout submission; YouTube parser/open/tap; notifications/tap routing; free quiz/hooks/offline sync; note access/download/expiry/ownership/PDF lifecycle; payment providers/restore/lifecycle/UI; search/cache/pagination; account-deletion source rate limiting; logout/account switch; maintenance/force-update; admin mutations/filter races/auth/retry; diagnostic auth/redaction. Device/provider checklist above covers what local mocks cannot establish.

## File safety and validation boundaries

The changes are limited to the following responsibilities. Tests execute real transpiled service/hook/screen code with synthetic storage/network/native dependencies; they do not charge users or call production. Existing baseline tests were retained.

| Files | Change and why existing behavior is preserved |
|---|---|
| `playBillingService.ts` | Existing 15-second deadline reused for product/status reads only. No native purchase timeout/cancellation, receipt validation, grant or settlement change. |
| `PlayBillingScreen.tsx`, `PaymentFailedScreen.tsx` | UI watchdog, synchronous tap guard, focused status reads and explicit actions. Pending never grants access and never triggers a replacement purchase. Late verified success remains handled. Shared legacy status polling is also tested. |
| `withRouteValidation.tsx`; Years, Subjects, Chapters, ChapterDetails, Notes, Videos, TestList | Invalid routes are rejected before content effects. Valid IDs/modes keep the same inner screen and fetch/navigation behavior. Pull refresh calls existing retry; free flags and lazy screen loading remain. |
| `NotesScreen.tsx`, `PdfViewerScreen.native.tsx` | Suppress obsolete signed-URL/access results and explain access/file failures; keep backend authorization, offline grace, renderer and PDF cache setting. No encryption claim. |
| `useDownloads.ts` | Catch rejected existing manager actions and report retry; no download/storage format change. |
| `authState.ts`, `LoginScreen.tsx`, `EditProfileScreen.tsx`, `QuizScreen.tsx` | Ignore superseded account responses, serialize submit, inspect returned error, validate input shape. Existing auth/lockout/profile/quiz business logic retained. |
| `CustomButton.tsx`, `CustomInput.tsx`, `NoteCard.tsx` | Explicit roles/names/disabled state, flexible minimum heights, separate sibling note actions. Existing handlers preserved and exercised. |
| Admin `useRequestGuard.ts`; useYears/useSubjects/useChapters/useNotes/useVideos/useQuiz/useUsers/useOrders/useProducts | Scope/sequence/lifetime guard for reads only; mutations still call existing services and retain truthful mutation-refresh messages. |
| Admin `AuthContext.tsx`; Years/Subjects/Chapters/Notes/Videos/Quiz/Orders/Users pages | Obsolete admin checks cannot restore UI access; Retry invokes existing reload. No admin privileges/RLS changed. |
| `create-play-order/index.ts`, `verify-play-purchase/index.ts` | Input shape rejection only. Existing valid-body paths and verification/settlement tests pass. Source changes are not deployed. |
| Three diagnostic `index.ts` files | Comments only; verified admin/AAL2 handlers retained. New matrix authorization tests supplement existing pricing/service-account tests. |
| New/extended `mobile-app/scripts/*selftest.cjs`, `admin-panel/scripts/*selftest.cjs`, `supabase/tests/*selftest.cjs`, `ui-harness.cjs` | Local regression coverage only. Android release guard combines real provider resolution with navigation/service/checkout behavior, using `__DEV__: false`. |
| This report and `evidence/bugfix-final-20261027/` | Audit/check evidence only; no product runtime effect. |

Expo SDK instructions were read before changes: [version 57 reference](https://docs.expo.dev/versions/v57.0.0/). No native package/API migration was introduced.

## Commits and retained check evidence

The consolidated base is `f9d6193`. Each row is a separate change with a regression test (or diagnostics authorization proof). The full suite was run after each source/test commit; all final results pass, including the corrected export evidence described above. Missing original logs are explicitly marked. The report/evidence commit is documentation only and is checked after committing.

| Check | Commit | Change | Evidence |
|---|---|---|---|
| 01 | `f87f763` | fix(billing): bound Play product fetch and allow retry | Passed in session; original temporary logs lost |
| 02 | `184b85d` | fix(billing): bound pending order status reads | Passed in session; original temporary logs lost |
| 03 | `5c1b703` | fix(checkout): recover stalled Play UI and prevent duplicate taps | Passed in session; original temporary logs lost |
| 04 | `46fe611` | fix(navigation): reject malformed content routes before loading | Passed in session; original temporary logs lost |
| 05 | `8cfb9f7` | fix(lists): enable pull-to-refresh on all content lists | Passed in session; original temporary logs lost |
| 06 | `4df7e83` | fix(admin): ignore stale filtered list responses | [check 06](evidence/bugfix-final-20261027/check-06.json) |
| 07 | `c91e826` | fix(admin): invalidate authorization reads on account changes | [check 07](evidence/bugfix-final-20261027/check-07.json) |
| 08 | `eeb852c` | fix(pdf): invalidate stale access checks and explain file failures | [check 08](evidence/bugfix-final-20261027/check-08.json) |
| 09 | `0ab7d27` | fix(downloads): handle native storage action failures | [check 09](evidence/bugfix-final-20261027/check-09.json) |
| 10 | `98e7344` | fix(login): guard secure-store reads and duplicate submissions | [check 10](evidence/bugfix-final-20261027/check-10.json) |
| 11 | `2ea0099` | fix(admin): expose retries on content and account list errors | [check 11](evidence/bugfix-final-20261027/check-11.json) |
| 12 | `9abafee` | fix(quiz): reject malformed question data before rendering | [check 12](evidence/bugfix-final-20261027/check-12.json) |
| 13 | `cf82d2c` | fix(auth): ignore stale bootstrap and blocked-account responses | [check 13](evidence/bugfix-final-20261027/check-13.json) |
| 14 | `a10657e` | fix(notes): ignore signed URL results after navigation or account change | [check 14](evidence/bugfix-final-20261027/check-14.json) |
| 15 | `29d8ae1` | fix(api): reject null Play request bodies before processing | [check 15](evidence/bugfix-final-20261027/check-15.json) |
| 16 | `6f73372` | fix(accessibility): name form controls and separate note actions | [check 16](evidence/bugfix-final-20261027/check-16.json) |
| 17 | `495f792` | chore(diagnostics): mark retirement and verify matrix authorization | [check 17](evidence/bugfix-final-20261027/check-17.json) |
| 18 | `4d495dd` | test(billing): prove release Android cannot start Razorpay checkout | [check 18](evidence/bugfix-final-20261027/check-18.json) |
| 19 | `a185bb6` | fix(checkout): direct already-owned items to purchase recovery | [check 19](evidence/bugfix-final-20261027/check-19.json) |
| 20 | `ed1b294` | fix(profile): report auth update failures and guard duplicate saves | [check 20](evidence/bugfix-final-20261027/check-20.json) |
| 21 | `ada23b6` | fix(payment-ui): coalesce status polls and ignore blurred results | [check 21](evidence/bugfix-final-20261027/check-21.json) |
| 22 | `1630573` | fix(notes): invalidate opens across blur and refocus | [check 22](evidence/bugfix-final-20261027/check-22.json) |

## Verification and before/after measurements

The [fresh consolidated baseline](evidence/bugfix-final-20261027/check-baseline-repeat.json) and [latest source commit](evidence/bugfix-final-20261027/check-22.json) both pass the complete local suite. Baseline: 55 Node test files; final: 73. Both include 40 Deno unit cases, five local Deno scripts, 20 checked Edge/worker entrypoints, mobile and both admin TypeScript configurations, lint, Android export, admin build, 17 website pages and secret scanning including archives. Final source snapshot: 88 successful commands/checks and zero potential-secret matches across 1,150 files. The documentation commit is checked again against the working tree after committing.

| Measure | Consolidated `f9d6193` | Final source `1630573` | Change |
|---|---:|---:|---:|
| Android Hermes bundle, bytes | 7,898,293 | 7,914,328 | +16,035 (+0.203%) |
| Admin built assets total, bytes | 636,552 | 639,462 | +2,910 (+0.457%) |

Both measurements use the same installed dependencies, sanitized environment and equivalent snapshot-local Expo entry. Admin size is the sum of generated asset bytes, not transfer/gzip size. Hermes bytes are exported JavaScript bytecode, not AAB/install size. No dependency/native asset changed. Build wall-clock timings in the JSON vary with cold caches and concurrent work and are not user-performance benchmarks. No fresh signed AAB, startup/frame/memory measurement or PDF open-time measurement was produced. B03 is unchanged, so there is no encryption before/after comparison.

## Exact changed-file inventory

Paths below cover the 22 source/test commits relative to the consolidated base; their safety rationale is grouped in the file table above.

```text
admin-panel/scripts/auth-race-selftest.cjs
admin-panel/scripts/list-retry-selftest.cjs
admin-panel/scripts/request-race-selftest.cjs
admin-panel/src/context/AuthContext.tsx
admin-panel/src/hooks/useChapters.ts
admin-panel/src/hooks/useNotes.ts
admin-panel/src/hooks/useOrders.ts
admin-panel/src/hooks/useProducts.ts
admin-panel/src/hooks/useQuiz.ts
admin-panel/src/hooks/useRequestGuard.ts
admin-panel/src/hooks/useSubjects.ts
admin-panel/src/hooks/useUsers.ts
admin-panel/src/hooks/useVideos.ts
admin-panel/src/hooks/useYears.ts
admin-panel/src/pages/Chapters.tsx
admin-panel/src/pages/Notes.tsx
admin-panel/src/pages/Orders.tsx
admin-panel/src/pages/Quiz.tsx
admin-panel/src/pages/Subjects.tsx
admin-panel/src/pages/Users.tsx
admin-panel/src/pages/Videos.tsx
admin-panel/src/pages/Years.tsx
mobile-app/scripts/accessibility-selftest.cjs
mobile-app/scripts/auth-state-race-selftest.cjs
mobile-app/scripts/billing-ui-selftest.cjs
mobile-app/scripts/download-actions-selftest.cjs
mobile-app/scripts/list-states-selftest.cjs
mobile-app/scripts/login-submit-selftest.cjs
mobile-app/scripts/notes-open-selftest.cjs
mobile-app/scripts/payment-poll-selftest.cjs
mobile-app/scripts/pdf-lifecycle-selftest.cjs
mobile-app/scripts/play-lifecycle-selftest.cjs
mobile-app/scripts/profile-save-selftest.cjs
mobile-app/scripts/quiz-input-selftest.cjs
mobile-app/scripts/release-play-only-selftest.cjs
mobile-app/scripts/route-validation-selftest.cjs
mobile-app/scripts/ui-harness.cjs
mobile-app/scripts/video-tap-selftest.cjs
mobile-app/src/components/CustomButton.tsx
mobile-app/src/components/CustomInput.tsx
mobile-app/src/components/NoteCard.tsx
mobile-app/src/hooks/useDownloads.ts
mobile-app/src/navigation/withRouteValidation.tsx
mobile-app/src/screens/auth/LoginScreen.tsx
mobile-app/src/screens/chapters/ChaptersScreen.tsx
mobile-app/src/screens/details/ChapterDetailsScreen.tsx
mobile-app/src/screens/notes/NotesScreen.tsx
mobile-app/src/screens/payment/PaymentFailedScreen.tsx
mobile-app/src/screens/payment/PlayBillingScreen.tsx
mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx
mobile-app/src/screens/profile/EditProfileScreen.tsx
mobile-app/src/screens/quiz/QuizScreen.tsx
mobile-app/src/screens/quiz/TestListScreen.tsx
mobile-app/src/screens/subjects/SubjectsScreen.tsx
mobile-app/src/screens/videos/VideosScreen.tsx
mobile-app/src/screens/years/YearsScreen.tsx
mobile-app/src/services/authState.ts
mobile-app/src/services/playBillingService.ts
supabase/functions/create-play-order/index.ts
supabase/functions/diagnose-play-matrix/index.ts
supabase/functions/diagnose-play-pricing/index.ts
supabase/functions/diagnose-play-service-account/index.ts
supabase/functions/verify-play-purchase/index.ts
supabase/tests/diagnostic-auth-selftest.cjs
supabase/tests/play-body-selftest.cjs
```
