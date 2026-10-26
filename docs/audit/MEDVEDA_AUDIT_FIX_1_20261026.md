# MedVeda audit-fix-1 — 26 October 2026

Local audit and targeted fixes on `audit-fix-1`, based on `cd554e3` plus the user's pre-existing working changes. **This is not a production certification or a claim that every bug has been found.** No real Android device, live database inspection, email delivery test, payment transaction, or deployment was performed. The reported production video failure cannot be conclusively attributed without its URL/device evidence.

## Safety and baseline

Created the requested branch before editing. Original tracked changes were saved in `/tmp/medveda-audit-baseline/existing-changes.patch`; original untracked files were archived in `/tmp/medveda-audit-baseline/untracked.tar.gz`. Those private snapshots are local only. The original recovery/MFA work, website edits, package script, audit documents, staging files and `tatus` were not staged in the fix commits.

Baseline: `cd mobile-app && npx --no-install tsc --noEmit` passed; `npm run lint --prefix tooling` passed; all **15** existing self-test/test scripts passed. Each script ran under `node --experimental-strip-types`. There is no general `npm test` script. Final checks include four additional scripts (19 total), typecheck and lint. Tracked-file secret scan and website link validation also passed (17 pages).

Machine-readable results are in [evidence/audit-fix-1-20261026](evidence/audit-fix-1-20261026). One intermediate sync test failed because its default-import mock lacked `__esModule`; the mock was corrected and the complete suite rerun successfully. The sync commit was amended to contain the passing test. This was a test-harness failure, not a baseline application error.

## Structure and critical-flow map

| Flow | Current implementation | Regression evidence / limitation |
| --- | --- | --- |
| Login/register/email OTP | `screens/auth`, `features/auth/authService.ts`, `identity.ts` | Existing recovery/password tests pass; login/register require device/server smoke test |
| Lockout | `features/auth/loginLockout.ts` | Code retains 5 failures → 5 min; subsequent 3 failures → 15 min; SecureStore on native; unchanged |
| Session refresh/logout | `config/supabase.ts`, `secureSessionStorage.ts`, `services/authState.ts` | Foreground refresh unchanged; ownership/logout test extended and passes |
| Password recovery | `ForgotPasswordScreen`, `authService`, `website/assets/js`, `deepLinkStore`, `ResetPasswordScreen` | Controller, mobile/web interaction, password policy and new link-order tests pass; live email unverified |
| Checkout/UPI | `paymentService.ts`, `PaymentCheckoutScreen.tsx`, checkout template/navigation | Checkout/provider/routing/signature tests pass; actual UPI handoff untested |
| Purchase grants/referrals/wallet | `supabase/functions/_shared/settle.ts`, `settle_razorpay_payment` RPC, purchase services/hooks | No `grantPurchase.ts` exists; current grant path uses server settlement. No backend changes; mock purchase tests pass |
| Google Play Billing | `playBillingService.ts`, `PlayBillingScreen.tsx`, provider config | Lifecycle/restore/provider tests pass; live Play catalog and transactions unverified |
| Paid notes/offline ownership | `secureNotesService`, `offlineNoteAccess`, download manager, SQLite | Download/owner/purchase regression scripts pass; real filesystem/native PDF test pending |
| Outbox/sync | `services/syncEngine.ts`, SQLite `sync_queue` | New overlapping-drain and network-rejection tests pass; no changes to settlement/grading |
| Push | `pushNotifications.ts`, `authState.ts`, app initialization | Re-login registration covered by ownership test; delivery requires configured FCM/device |
| Global search | `searchService.ts`, `useGlobalSearch.ts` | Code review only; unchanged; remaining cache isolation concern below |
| Home | `HomeScreen.tsx`, individual services/hooks | Independent sections reviewed. **React Query is not installed or used in this checkout**; no cache-library migration attempted |

Other roots: `admin-panel` manages content; `supabase/migrations` and `functions` define server behavior; `website` is the current static website; root HTML and `github-original-website` are older copies; `tooling` supplies lint/security checks.

## Video issue: evidence, fix and limits

The path is `public.videos.youtube_url` → `videosRepository.getVideosBySubject()` (`select *, subjects(title), years(title)`, active subject rows) → `toCamelCase` maps to `youtubeUrl` → `videosService.fetchVideosBySubject()` sorts → `VideosScreen` → `VideoCard.onPress` → external URL dispatcher. Search navigates to this same subject video screen.

There is **no video WebView/player** in this path. Inline playback, autoplay, embed referrer/baseUrl and WebView cleartext settings cannot explain this screen's current opening behavior. The admin accepts HTTPS YouTube watch/short/embed/live URLs; historical/imported rows may not obey that validation. No live row was inspected.

Confirmed code failure paths:

* Previously `Linking.canOpenURL(url) === false` prevented `openURL` from being attempted. Android package-visibility queries can fail separately from opening an activity. The repository already includes `withAndroidQueries.js` for HTTPS/HTTP/UPI; whether the affected installed binary contains that plugin output is unknown. Therefore a missing manifest query is **not established as the production root cause**.
* Stored values were passed without normalization, so scheme-less URLs, HTTP URLs, whitespace and unsupported/custom schemes were not handled safely. The tests reproduce normalization cases using synthetic data; they do not establish that those values exist in production.
* Opening failure had only a generic alert; list-fetch failure became an empty list without retry. On a subject change, old rows/loading state could remain visible during the request.

Fix: new `utils/videoLink.ts` trims and validates web URLs, upgrades HTTP to HTTPS, normalizes supported YouTube video formats to watch links (including timestamps/playlists), preserves Drive/Vimeo web-link paths and private-link parameters, rejects null/invalid/custom-scheme values, and directly calls `Linking.openURL` in a catch boundary. On rejection the user gets **Retry** and **Open in browser**, using the already-installed `expo-web-browser`; a browser rejection is caught too. Invalid rows get an actionable support message. Fetch failures now render a retry state; subject changes reset loading/data. Filtering is memoized and navigation parameters are typed. Videos remain `locked={false}` without a purchase check.

Tests cover watch/youtu.be/embed/shorts/live/privacy-enhanced links, HTTP/scheme-less links, missing values, malicious schemes, Drive/Vimeo preservation, timestamps, opening despite an unusable query API, retry and browser failure. A browser successfully launching does not prove that a private/deleted/geoblocked video can play.

RLS review: active video rows require authenticated course access and published parents under the repository migrations. `has_content_access` permits the chosen course plus owned course/year scope; this is not a video product charge. It does mean **all users/all courses/anonymous browsing** is not the current server rule. No RLS changes were made. Deployed migration state is unverified.

References: [React Native Linking](https://reactnative.dev/docs/linking), [Expo 57 WebBrowser](https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/), [required Expo 57 reference](https://docs.expo.dev/versions/v57.0.0/).

## Forgot password verdict: PARTIALLY FIXED

Present in the working checkout:

1. Email reset requests use `https://www.medveda.in/reset-password`; mobile-number reset Edge Function uses the same address. This differs from the older `medveda-website.vercel.app` address in the request.
2. The current `website` has a full HTTPS reset form plus user-tap handoff to `medveda://reset-password#...`. `auth-common.js` reads/removes the fragment; the controller keeps recovery material in memory. The generated recovery controller matches the mobile source under the existing build workflow.
3. Production app scheme `medveda`, Android package `in.medveda.app`, website scheme/store link and navigation prefix match. iOS bundle ID is `com.medveda.app` (a separate platform identifier). Historical Expo slug `ayurpulse` and package name `ayurpulse-mobile` are not UI text; changing them could affect build/update identity and was not attempted.
4. Custom scheme configuration is present; HTTPS intent filters are absent because HTTPS opens the bridge and a user tap opens the custom scheme. Native manifest of an installed build was not inspected.
5. Existing uncommitted recovery implementation imports sessions, checks assurance/MFA, validates an enrolled TOTP challenge, enforces the 8–32 character password policy, handles invalid/expired/used links, supports cleanup retry, signs out on success and sends the user back to Login. These are the user's existing changes, not new work claimed by this audit.
6. Fixed a confirmed race: the old module listener independently read the initial URL from a parent effect while React Navigation read it itself. Nothing guaranteed token storage before screen mount. Navigation now awaits the store's initial read and stores warm links synchronously before forwarding them. Listener cleanup is returned to navigation. A delayed initial read cannot overwrite a newer warm URL or restore cleared credentials. All call sites of the replaced initialization helper were updated.
7. Fixed rejected reset-request promises escaping `ForgotPasswordScreen`; the existing account-neutral response remains intact.

Remaining gaps: both live bridge URLs were inaccessible to the browsing tool; this is not proof of site downtime. Supabase Redirect URL allowlist, Send Email Hook status, Resend SMTP credentials/sender/domain configuration and actual delivery are dashboard/deployment state and were not available. An expired reset screen already mounted can retain its controller/ref when another reset link navigates to the same route; the current screen needs a deliberate new-recovery lifecycle test before changing the user's MFA controller. Reset UI uses a centered `View` without keyboard avoidance/scrolling, and its support link lacks a rejection handler. These are reported below rather than mixed into the pre-existing recovery edits.

Staging mismatch: `app.config.js` changes the package to `in.medveda.staging` and scheme to `medveda-staging`, while navigator, reset URL store and website still use production `medveda`. Staging recovery therefore needs a separate bridge/config arrangement; identifiers were not changed.

## Findings table

“Confirmed” refers to source/test evidence; live impact is only claimed where measured. No Critical exploit was established in this local pass.

| ID | File | Severity | Problem | Fix applied |
| --- | --- | --- | --- | --- |
| V1 | `screens/videos/VideosScreen.tsx` | High | URL query gate can suppress a valid open; raw URLs and no browser/retry fallback | Yes |
| V2 | `screens/videos/VideosScreen.tsx` | Medium | Fetch error appears as empty results; no retry; stale rows during subject transition | Yes |
| A1 | `features/auth/deepLinkStore.ts`, `navigation/AppNavigator.tsx` | High | Independent initial-URL reads allow recovery token/navigation ordering race | Yes |
| A2 | `screens/auth/ForgotPasswordScreen.tsx` | Medium | Thrown request promise escapes despite `finally` alert | Yes |
| O1 | `services/syncEngine.ts` | High | Guard acquired after connectivity await permits simultaneous queue drains | Yes |
| O2 | `services/syncEngine.ts` | Medium | Connectivity/outer database failure can reject fire-and-forget drain calls | Yes; retained rows retry later |
| P1 | `services/notificationsService.ts` | Medium | One storage preferences read per notification | Yes; one per fetch |
| A3 | `services/authState.ts` | High | Returned Supabase sign-out error ignored, local user cleared as if successful | Yes; propagate error before clearing |
| N1 | `services/authState.ts` | Medium | Same-user logout/login retains push-registration marker after token unregister | Yes; marker reset on successful/signaled logout |
| C1 | `screens/quiz/TestListScreen.tsx`, `services/searchService.ts`, quiz RPC migration | High | MCQs explicitly free; contradicts requested paid-per-product model | No; needs approved backend entitlement design |
| C2 | video RLS / `has_content_access` | Medium | Free video visibility is course/publication/auth scoped, not literally every user/course | No; product/access scope decision and RLS approval |
| A4 | `app.config.js`, navigator, website config | High (staging) | Staging custom scheme differs from hardcoded production recovery scheme | No; report before any identifier change |
| A5 | `screens/auth/ResetPasswordScreen.tsx` | Medium | New link on already-mounted reset route may keep prior recovery controller/tokens | No; needs screen lifecycle regression coverage around existing MFA edits |
| A6 | same reset screen | Medium | No keyboard-safe scrolling; support `openURL` rejection unhandled | No; device/layout validation and existing dirty file preserved |
| A7 | `screens/auth/SplashScreen.tsx` | Medium | `decideDestination()` rejection unhandled; getSession/link failure may strand splash | No; startup flow needs explicit retry UX and native failure tests |
| S1 | `services/searchService.ts`, `services/courseState.ts` | High | Search cache includes purchases but keys only by course; auth change does not clear that index | No; user-scoped cache migration/in-flight handling needs dedicated regression work; does not itself grant paid PDF access |
| S2 | search repositories | Medium | Whole-catalog queries without pagination can truncate beyond server row limits; search has 9 parallel sources | No; needs representative catalog fixtures and paging design |
| N2 | `services/pushNotifications.ts` | Medium | Notification-response setup helper has no caller and does not read a cold-start response | No; authenticated route allowlist/navigation lifecycle needed |
| O3 | `services/syncEngine.ts` | Medium | Non-quiz queued entities are not owner-filtered; failed rows marked synced after five attempts | No; outbox retention/account-switch semantics require dedicated migration/testing |
| O4 | same sync engine | Medium | Reading-progress read-then-upsert is not atomic across devices; read error ignored | No; server-side monotonic RPC requires approval |
| U1 | `hooks/useNetworkStatus.ts` | Low | Unknown reachability (`null`) treated as offline | No; shared UI behavior should be exercised across consumers |
| P2 | `screens/home/HomeScreen.tsx` | Medium | Years fetched twice; notifications fetched separately for list/count, with initial focus adding count fetch | No; preserve critical Home flow until cancellation/dedup tests exist |
| P3 | `components/BrandLogo.tsx`, assets | Low | Small on-screen logos decode large source PNGs | No; derive/review correctly sized brand assets separately |
| T1 | mobile/admin types and comments | Low | Many `any` tokens and obsolete Firestore commentary obscure current contracts | Video route typed; broad cleanup deferred |

## Performance measurements and decisions

| Measurement | Before | After | Interpretation |
| --- | --- | --- | --- |
| Preference reads for 100 typed notifications | 100 | 1 | 99% fewer reads; mock exercised actual service; same 50 enabled results |
| Android minified JS export, no bytecode | 6,770,010 bytes | 6,776,242 bytes | Diagnostic comparable export, not AAB/download/Hermes size |
| Android JS gzip | 1,674,655 bytes | 1,676,590 bytes | Local gzip comparison, not Play delivery size |
| Mobile asset source bytes | 5,020,939 | 5,020,939 | No image quality/branding changes |
| Video filtering | Every render | Only videos/search changes | Memoization; no device frame-time claim |
| Concurrent drains before first network resolution | Both can enter | One | Deterministic mocked concurrency test |

Bundle was exported with `npx --no-install expo export --platform android --output-dir /tmp/... --no-bytecode`. The temporary `--no-bytecode` measurement flag **does not alter production engine settings**. Hermes remains the installed Expo plugin's default; no engine override found. Source-derived startup work: static navigator imports all screens, SQLite initialization and legacy offline quiz cleanup precede ready, maintenance/update gates fetch status, Splash imposes a 1,200 ms minimum once mounted, push/session work and Play restore occur during startup. Device startup/re-render counts, FPS, memory and release AAB size remain unmeasured.

Assets: `splash.png` 1,678,819 B; adaptive icon 1,459,751 B; icon 978,337 B; favicon 813,005 B; header logo 91,027 B. Some are build assets rather than active screen assets, so source totals are not runtime memory measurements. No dependency was replaced solely on size guesses. Expo Image and React Query are not currently dependencies. Skeleton loops already use the native driver and stop on cleanup. Fixed-height `getItemLayout` would be unsafe for variable-height text cards; no blanket FlatList settings were imposed. Existing Android R8/resource shrinking remains opt-in via `ANDROID_SHRINK=1` and the `shrink-test` profile; enabling it in production without PDF/billing native tests would violate the stability requirement.

## Freshness and duplicate review

* “Latest remote code” could not be verified: `git ls-remote --heads origin` failed in this environment. The existing local branch was `fix/play-catalog-supported-regions`; the audit branch includes its current HEAD and preserves the working tree. File timestamps and prior audit filenames are not proof of deployment freshness.
* No live Firebase/Firestore client imports found in mobile/admin sources. Remaining mentions explain migration history or stale index guidance. Firebase/Google services configuration for Android push is intentional and must not be removed as old database code.
* `features/auth/ResetPasswordScreen.tsx` is an existing compatibility re-export of `screens/auth/ResetPasswordScreen.tsx`, not two active reset implementations. Preserved.
* `website/_src/pages` and generated `website/*.html` are intentional source/output pairs. `website/assets/js/recovery-flow.js` is intentionally copied from mobile recovery source. Preserved.
* Root HTML and `github-original-website` overlap the current website, but deployment root/external references were not proven absent. Preserved; do not delete recovery pages based only on import search.
* `tatus` and the numerous untracked earlier audit/staging artifacts predate this task. Preserved.
* `types/react-native-razorpay.d.ts` is a legacy declaration while checkout now uses WebView/Play; no runtime package is installed. Not removed because compiler/tool references and historical workflows were not exhaustively verified.
* `grantPurchase.ts` does not exist; the actual current settlement module and RPC were reviewed instead. Current quiz client requires `get_public_quiz_tests` from the October migration; deployment parity must be checked before shipping.
* Counts from a source scan: 215 mobile TS/TSX files with 158 `any` word occurrences, 117 admin TS/TSX files with 83 occurrences (includes comments, not a type-system diagnostic). Mobile console calls are concentrated in the logger; tracked-file secret scan passed. No claim that dashboard/ignored files were secret-scanned.
* No files were deleted: none of the apparent duplicates was proven safely disposable within available deployment evidence.

## Backend proposals requiring approval (not applied)

1. **Paid MCQs:** define explicit quiz-to-product entitlement mapping and bundle semantics; enforce ownership in quiz question-read and submit-attempt RPCs, metadata RLS as appropriate, download/revalidation policy and search/list UI. Preserve existing purchasers and define treatment of previously free downloads. A frontend lock alone is insufficient. A separate reviewed migration and rollback plan is required before implementation/deployment.
2. **Free-video scope:** decide whether published videos should be readable across courses or anonymously; review `videos_public_read_active`, restrictive ancestry policies and `has_content_access`. Avoid changing the shared helper without checking notes/quiz implications.
3. **Outbox:** make progress updates atomic/monotonic on the server; agree how to retain failed rows and partition all entities by owner. No schema/RPC changes proposed as an unreviewed quick fix.
4. **Recovery deployment:** verify the current bridge deployment, HTTPS redirect allowlist and email configuration. If Send Email Hook is still broken, prepare the precise dashboard change and Resend sender/domain verification for approval; do not infer that SMTP was configured from repository comments.

No SQL, RLS, Edge Function, package/scheme, billing-provider or production build-hardening changes were made. No payment was initiated, no email sent and no code deployed/pushed.

## Files changed by this task

* `mobile-app/src/utils/videoLink.ts` (new)
* `mobile-app/src/screens/videos/VideosScreen.tsx`
* `mobile-app/scripts/video-link-selftest.cjs` (new)
* `mobile-app/src/features/auth/deepLinkStore.ts`
* `mobile-app/src/navigation/AppNavigator.tsx`
* `mobile-app/scripts/deep-link-selftest.cjs` (new)
* `mobile-app/src/services/syncEngine.ts`
* `mobile-app/scripts/sync-concurrency-selftest.cjs` (new)
* `mobile-app/src/services/notificationsService.ts`
* `mobile-app/scripts/notification-reads-selftest.cjs` (new)
* `mobile-app/src/screens/auth/ForgotPasswordScreen.tsx`
* `mobile-app/src/services/authState.ts`
* `mobile-app/scripts/offline-owner-selftest.cjs`
* This report and its evidence directory.

The dirty recovery/website/package files shown by `git status` are pre-existing user work, not silently included in these commits. The commits depend on that current working checkout; do not deploy a partial branch snapshot that omits the user's uncommitted recovery files.

## Android manual test checklist

Use a staging/internal-test build with known test users/products; never exercise charge/refund tests against real users inadvertently.

- [ ] Fresh launch, background/resume, kill/relaunch, offline launch, maintenance/update retry; inspect Sentry for new exceptions.
- [ ] Register, password login, email OTP (unknown email must not create an account), expired OTP, wrong password lockout at 5 attempts; restart during lockout; after expiry confirm 3 failures → 15 min; successful login clears count.
- [ ] Forgot password by email and mobile number from Gmail in-app browser and Chrome. Test cold/warm app, expired/used/no-token link, wrong/weak/mismatched password, existing TOTP MFA, network failure/retry and cleanup failure. Confirm old password fails and new password logs in. Test a second link while Reset Password is already mounted (remaining finding A5).
- [ ] Confirm bridge remains usable without the app. Verify domain, allowed redirect URL, Send Email Hook/SMTP and actual inbox delivery. Check staging scheme separately.
- [ ] Videos: unpurchased user, watch/youtu.be/shorts/live/embed, legacy scheme-less URL, invalid/missing URL, Drive/Vimeo if used. Test YouTube installed/disabled, browser available/unavailable, airplane mode then retry, browser fallback and Android Back. Switch subjects rapidly; fetch failure must not appear as empty success. Confirm no purchase prompt.
- [ ] Notes: paid gate, free preview, purchase unlock, refund/revocation and owner-bound offline access. Record that MCQs are currently free until approved entitlement work ships.
- [ ] Play purchase success/cancel/pending/restore/account switch and background completion. In an authorized Razorpay build, test UPI app switch, lost callback/recovery polling, cancel, duplicate callback, wallet/referral amount, delayed capture and refund. Confirm one entitlement per payment.
- [ ] Download, interrupt/restart, storage full, offline reopen, reconnect sync, multiple simultaneous actions; confirm no duplicate attempts. Switch accounts and confirm paid files remain owner-bound.
- [ ] Logout success/failure; same-account re-login should register push again. Test permission denied/granted and actual push arrival; notification tap routing is an outstanding finding.
- [ ] Search each content type, course switch, account switch on same course, offline cached search and catalog beyond 1,000 rows. Look for prior-user purchase titles (S1).
- [ ] Home refresh, recommendations, purchased packages and notifications; small-screen keyboard/safe-area/font scaling; long lists. Profile cold-start/render duration with a release/internal build before claiming speed gains.

## Reversible fix commits

| Commit | Change |
| --- | --- |
| `d67cfc5` | Video URL normalization, retry/browser fallback and list errors |
| `1d020af` | Recovery link storage ordered before navigation |
| `b6f09f7` | Offline sync single-flight guard and background failure handling |
| `0657c16` | Notification preference reads reduced to one per fetch |
| `ed54d2d` | Reset-request transport rejection contained |
| `4ebef54` | Logout error handling and same-user push re-registration |

Final Android JS delta: +6,232 bytes (+0.092%); gzip delta +1,935 bytes. The measured performance gain is reduced storage work, not a smaller bundle. A shell user-bus warning appeared after export, but Expo completed with exit 0 and emitted the bundle/metadata. No APK/AAB was built.
