# MedVeda / AyurPulse — complete production readiness and bug audit

Audit date: **12 November 2026 (UTC)**. Repository: `/home/ganeshp8545/AyurPulse`. Mobile application: `mobile-app`.

## A. Executive summary

**Overall readiness: NOT READY. Release recommendation: NO-GO.**

The application has substantial implemented functionality and meaningful regression coverage. TypeScript, ESLint, all 76 migrations in a disposable PostgreSQL database, the existing database suite, and many synthetic payment/UI regressions pass. Nevertheless, fresh targeted reproductions establish payment-reversal, account-isolation, notification-privacy, reminder, and settings defects. Passing local tests also conceal material differences in deployed backend code.

| Measure | Result and counting rule |
| --- | --- |
| Confirmed bugs | **20**, one row per AUD-001–AUD-020 below; related manifestations grouped under their underlying defect |
| Critical / high / medium / low | **0 / 7 / 11 / 2**; no demonstrated universal takeover or arbitrary financial theft was found; absence of such a finding is not proof of absence |
| Suspected or operational risks | **18**, R01–R18; excluded from confirmed-bug count |
| Unverified complete workflows | **16**, E01–E16; substeps have evidence, but no complete native/provider journey was executed |
| Screens without native runtime acceptance | **40 source screen implementations**, including platform-specific PDF implementations and root gates; these are not 40 independent user workflows |
| Blocked acceptance rows | **28**: E01–E16 plus G17–G28; named acceptance rows, not a count of every possible test permutation |
| Production release blockers | **10**, PB01–PB10; grouped release gates rather than individual bug count |
| Readiness percentage | **Not assigned.** Test-command pass rates cannot measure production readiness, and native/provider evidence is missing |

The seven-line entitlement patch **is deployed** in `verify-payment` v69 and `razorpay-webhook` v51. Both exact downloaded helpers contain the commitment RPC and reject false/errored proof. Fresh production read-only SQL found **13 paid Razorpay orders, all 13 satisfying the commitment predicate**, and a deliberately invalid proof returned false. This verifies source presence and existing database invariants, not new payment execution. Other deployed payment and notification paths retain defects already addressed differently in local source.

New purchases remain deliberately disabled in the existing production and Play internal-testing profiles. The separate `razorpay-live-testing` APK profile enables Razorpay for a standalone distribution. Disabled sales are intentional restrictions, not dead buttons. The current standalone LIVE path has not completed a real checkout or signed Android artifact acceptance.

**Scope and safety.** Application/configuration/migration/dependency files were not changed. No deployment, real payment/refund, push notification, real account creation/deletion, production SQL mutation, build submission, package installation/upgrade, or Git cleanup occurred. Only this requested report is added to the repository. Temporary scripts, logs, synthetic files, and disposable PostgreSQL databases were used under `/tmp`; scratch databases were removed and the audit-only server was stopped. Some sandbox network/socket checks initially failed; read-only network checks and disposable local SQL later ran successfully outside those restrictions. No automatic approval rejection remained unresolved.

The audited source is commit `54c33cbbc0c9c21eaa66f8bf2be285bd2e46e1f8` **plus the pre-existing dirty and untracked working tree**. HEAD alone does not identify this implementation. Prior audit documents were treated as leads. Current observations supersede stale claims about missing local Firebase, unpatched deployed entitlement success, or an unconditional current Gradle failure.

## B. Complete feature audit and repository inventory

Evidence levels: **source** = current implementation inspected; **synthetic** = real code with mocked transport/platform/storage; **local SQL** = disposable PostgreSQL with Supabase stubs and synthetic fixtures; **live metadata** = actual read-only management/catalog SQL; **live HTTP** = actual endpoint response. None implies a physical-device end-to-end pass. IMPLEMENTED describes code availability, PARTIAL incomplete integration/acceptance, BROKEN a confirmed defect, and UNVERIFIED insufficient execution evidence.

| Feature | Implementation | Tests/evidence | Live verified | Status |
| --- | --- | --- | --- | --- |
| Startup, DB initialization, interrupted-download recovery | Root initialization, retry/error boundary, lazy screens | Typecheck, startup/readiness/navigation harnesses | No native startup | IMPLEMENTED / UNVERIFIED |
| Email login / registration / verification | Supabase Auth, validation, neutral responses, duplicate-submit guard | Login/register/password policy tests | No account/email operation | IMPLEMENTED / UNVERIFIED |
| Mobile-number login | Edge lookup + Auth password sign-in | Mock transport; null-body repro | Deployed source downloaded | BROKEN malformed request, AUD-019 |
| Session persistence / foreground refresh | Encrypted native storage; refresh AppState listener | Auth race/recovery tests; failed-write repro | No multi-device token refresh | BROKEN failure atomicity, AUD-007 |
| Logout / account change | Push cleanup, signout, file purge, owner check | Owner tests; actual StackRouter repro | No live signout | BROKEN navigation isolation, AUD-003 |
| Password recovery / MFA | Shared controller, deep-link queue, browser bridge | Recovery/deep-link/password tests | Hosted pages HTTP 200 only | IMPLEMENTED / UNVERIFIED |
| Profile / password / course-year editing | Caller-bound repositories/RPCs; onboarding gate | Course/race/confirmation mocks, local SQL | No profile changes | IMPLEMENTED / UNVERIFIED |
| Account deletion | Verified caller, erase RPC + Auth admin delete | Local SQL deletion tests | Definition/source only; never invoked | PARTIAL privacy/lifecycle acceptance |
| Catalog: courses, years, subjects, chapters | Repositories/cache/services, publication filters | List/search/route/pagination tests; local SQL | RLS/publication definitions | IMPLEMENTED / UNVERIFIED UI |
| Home / search / filters | Recent/recommended/year products, search debounce | Search lazy/race/list tests | No rendered native UI | IMPLEMENTED / UNVERIFIED |
| Free PDF preview / paid PDF signing | Auth + publication/scope ownership; 120-second URL | URL/ownership mocks and local SQL | Private bucket/RLS and deployed signing source | IMPLEMENTED; authorization exceptions below |
| PDF rendering and lifecycle | Native PDF viewer; web iframe; retry; lifecycle invalidation | Viewer/remote retry mocks | No PDF bytes rendered | UNVERIFIED |
| PDF download / offline read | SQLite, fresh signed URLs, progress, failure cleanup, license checks | Download/owner/license tests | No device download | PARTIAL; plaintext AUD-008 |
| Native encrypted vault | Authenticated container/control foundation, inert registered bridge | 22 foundation groups + 11 control groups, JVM halt/reopen tests | No native device/build acceptance | PARTIAL, content disabled |
| Videos | Free subject-scoped YouTube handoff/fallback | URL normalization/tap/data tests | Channel GET 200; no native handoff | IMPLEMENTED / UNVERIFIED |
| Quizzes / offline attempts | Answer-free questions, local queue, server-scored RPC | Hooks/input/editing/sync and SQL tests | No hosted attempt | IMPLEMENTED / UNVERIFIED |
| Store / buy options / order summary | Ownership and provider gates; server quotes | Catalog/options/ownership/payment tests | No order creation | IMPLEMENTED, current production sales disabled |
| Razorpay signed callback / capture commitment | Actual HMAC + provider amount/currency + RPC proof | 13 fresh exact-deployed synthetic checks; local SQL | v69/source, guard responses, 13/13 historic proof | PARTIAL; AUD-009–AUD-013 |
| Razorpay webhook / refunds / disputes | Authenticity and provider re-fetch; local durable protocol | Existing suite + targeted deployed/SQL repros | v51 source and invalid-signature rejection | BROKEN reversal/recovery gaps |
| Play Billing / UCB / catalog/reporting | Retained local verification/report/consumption/recovery | Local SQL + mocked Google calls; no Google purchase | Deployed inventory; jobs inactive | PARTIAL / UNVERIFIED, disabled in Play profiles |
| Purchase history / restoration | Owner-scoped order/purchase reads; pending recovery | Purchase/history/ownership tests | No user history fetched | IMPLEMENTED / UNVERIFIED native/provider |
| Notifications / push | Expo tokens backed by Android Firebase; admin Edge sender | Routing/lifecycle mocks, deployed sender repro | Remote sender/policy source only | BROKEN targeted privacy/ticket accounting |
| Notification preferences | Device-local category settings | Actual concurrent-write repro | No real notification sent | BROKEN, AUD-004 |
| Study reminders | Permission, channel, persisted local reminder choice | Actual installed SDK parser reproduction | No real schedule invoked | BROKEN, AUD-001/AUD-002 |
| Referral / wallet / terms | Share, balance/history/settings, atomic server economics | SQL wallet/discount concurrency | No credits moved; term error source proof | BROKEN error state AUD-005; economics acceptance pending |
| Contact / share / social / legal / update links | Mail composer, HTTPS/application handoffs | Source/link/video mocks; public HTTP GETs | Website/social reachability only | IMPLEMENTED; native handoff UNVERIFIED |
| Admin console | 17 pages; membership/MFA-aware UI; CRUD/analytics/upload | Typecheck/lint/admin selftests; Settings repro | No hosted admin operation | BROKEN initial settings failure, AUD-017 |
| Website / email verification bridge | Static pages, shared auth controller, source CSP | 17-page local link check; invalid-token repro | Ten hosted pages and security headers | BROKEN verification claim, AUD-020 |
| Android / EAS / Firebase | Locked Expo/RN, release plugin, strict profile/package checks | Public config/autolinking/profile matrix/validator fixtures | No exact APK/AAB or EAS secret verification | PARTIAL; test profile AUD-018 |
| CI / secrets / dependencies / monitoring | Actions, lockfiles, narrow scanner, Sentry scrubbing | Fresh local checks and npm advisory queries | Registry read-only; no telemetry event | PARTIAL; coverage/operations risks |

### Architecture and inventory coverage

Mobile has **220 `src` files**, **40 screen TSX files**, navigation and typed routes, shared UI components, repositories, hooks and services. It uses React Navigation, hook/local state, an auth-user cache/subscriptions, shared course/year state and repository caches; no separate Redux-style store was found. SQLite holds download metadata, attempts and an outbox; AsyncStorage holds preferences/discovery/cache data; SecureStore holds native session encryption keys and offline-license facts. The screen and full module inventory is appended below.

Backend has **25 local Edge entrypoints**, **64 files under `supabase/functions`**, a quarantine worker, **76 migrations**, SQL/concurrency/handler suites, staging helpers, maintenance code and frozen release bundles. Production currently lists **17 deployed functions**; eight local entrypoints are absent there: `attach-external-token`, `create-order-play-choice`, `report-external-transaction`, and the five isolated non-Play test entrypoints. Their presence locally does not enable them remotely. Test-lane/catalog and Play/UCB activation require coordinated reviewed deployment, not blindly deploying everything.

Admin has **122 source files** and 17 pages. Website has source templates, generated HTML, JS auth helpers, a generator and local link checker. Root HTML and `github-original-website` are additional legacy copies; deployment root selection remains an operational check. Native vault has **30 source/config/test files**, shared Kotlin core/control, Android bridge/adapters and partial Apple foundation. Native platform acceptance is outstanding.

Documentation/build/operations reviewed include the master audit, release gates, real-device checklist, Auth checklist, privacy/deletion/retention documents, deployment and rollback manifests, EAS/Expo configuration, release plugin/ProGuard, CI, lockfiles and prior native logs. Historical archives/generated caches and dependency vendor trees are inventory/context, not independently certified releases. Detailed review focused on reachable behavior and trust boundaries; this report is not formal line-by-line verification of every historical artifact or exhaustive tapping of every UI permutation. Every application module is inventoried; blocked modules are explicitly identified.

### Dead code, duplication, placeholders and dependency observations

- The vault is registered native build input but has no active app content integration. `contentEnabled=false` and `nativeAccepted=false` are deliberate, and its passing foundation tests cannot certify PDF encryption.
- `markStaleIfVersionChanged` exists, but versioned content invalidation and effective cache refresh need lifecycle acceptance. Generic bookmark/reading/watch outbox branches have no demonstrated complete user-facing production workflow; the actual remote public table list does not include their target tables. They are incomplete scaffolding rather than a confirmed current reachable failure.
- Shared constants and UI handlers duplicate social/store URLs; root/legacy website files duplicate current generated pages. Unused exports/comments were not counted as bugs without a reachable failure. `onBlockedSignOut` lacks screen subscribers; the global navigation effect is covered in AUD-003.
- Input `placeholder` strings and default-context no-ops are not missing functionality. A local quiz score of zero is an unverified initial value that is replaced by server verification, not proof of fabricated scoring. Disabled Play sales and screenshot-specific builds are intentional gated paths.
- No broken imports were reported by fresh mobile/admin TypeScript or all local Edge typechecks. That does not verify native linkage. `react-native-blob-util`, Billing and the dormant vault still affect the native binary even when app paths are gated.
- Production dependency audit: five moderate mobile findings, zero high/critical; admin zero. Tooling-only advisories were not separately queried. See Security Findings for exact package scope and limitations.

## C. Confirmed bug register

Severity is consequence-based, not an invented probability. HIGH means financial/content-integrity or meaningful account/privacy impact, or a broken main implemented feature. MEDIUM means a bounded correctness/reliability/accessibility defect. LOW means misleading/error UX with no established security bypass. Deployed-source line numbers refer to the freshly downloaded function bundle, not an assumption that the workspace version is deployed.

| Bug | Severity | Affected scope | Location |
| --- | --- | --- | --- |
| AUD-001 — Daily reminder uses an unsupported trigger shape | HIGH | Mobile, both native platforms | `mobile-app/src/services/studyReminderService.ts:152` |
| AUD-002 — Reminder scheduling rejection leaves controls permanently busy | MEDIUM | Mobile | `mobile-app/src/screens/reminder/StudyReminderScreen.tsx:66` |
| AUD-003 — Logout/delete leaves previous private screens and profile state reachable | HIGH | Mobile privacy/navigation | `mobile-app/src/screens/settings/SettingsScreen.tsx:77` |
| AUD-004 — Concurrent notification preference changes lose persisted choices | MEDIUM | Mobile local preferences | `mobile-app/src/utils/notificationPreferences.ts:48` |
| AUD-005 — Referral Terms has permanent loading state after request failure | MEDIUM | Mobile | `mobile-app/src/screens/referral/ReferralTermsScreen.tsx:32` |
| AUD-006 — Multiple icon actions and switches lack accessible names | MEDIUM | Mobile accessibility | `mobile-app/src/components/SideDrawer.tsx:278` |
| AUD-007 — Failed session ciphertext write destroys the previous valid key/blob pair | MEDIUM | Mobile native session persistence | `mobile-app/src/config/secureSessionStorage.ts:67` |
| AUD-008 — Paid offline PDFs are persisted in plaintext; encrypted vault is not integrated | HIGH | Mobile retained content-security requirement | `mobile-app/src/utils/downloadManager.ts:204` |
| AUD-009 — Deployed webhook drops reversals received before payment linkage | HIGH | Deployed razorpay-webhook v51 / shared helper | `deployed functions/razorpay-webhook/index.ts:144` |
| AUD-010 — Deployed webhook acknowledges captured-money mismatches without recovery record | HIGH | Deployed webhook v51 / helper shared with v69 | `deployed functions/razorpay-webhook/index.ts:200` |
| AUD-011 — Deployed unsigned recovery has no user ownership authorization | MEDIUM | Deployed verify-payment v69 | `deployed functions/verify-payment/index.ts:50` |
| AUD-012 — Fully refunded capture fallback leaves successful purchase and PDF access | HIGH | Workspace helper + current SQL; fallback not in deployed v69/v51 helper | `supabase/functions/_shared/settle.ts:49` |
| AUD-013 — Checkout can charge for content with unpublished ancestors | MEDIUM | Workspace and deployed create-order; current SQL | `supabase/functions/_shared/createOrderHandler.ts:89` |
| AUD-014 — Deployed targeted notification content is inserted into global readable feed | HIGH | Deployed send-push-notification v51 / notifications RLS | `deployed functions/send-push-notification/index.ts:85` |
| AUD-015 — Deployed push sender ignores configured MFA requirement | MEDIUM | Deployed send-push-notification v51, conditional configuration | `deployed functions/send-push-notification/index.ts:36` |
| AUD-016 — Deployed push sender reports rejected tickets as pushed and continues after feed failure | MEDIUM | Deployed send-push-notification v51 | `deployed functions/send-push-notification/index.ts:118` |
| AUD-017 — Admin Settings failed first read permits saving destructive blank defaults | MEDIUM | Admin console | `admin-panel/src/hooks/useSettings.ts:35` |
| AUD-018 — Isolated Razorpay test profile selects mismatched default Firebase client | MEDIUM | Build configuration / isolated test lane only | `mobile-app/app.config.js:74` |
| AUD-019 — Mobile login JSON null raises uncaught handler exception | LOW | Workspace and deployed login-with-mobile v18 | `supabase/functions/login-with-mobile/index.ts:40` |
| AUD-020 — Email verification website claims success for invalid or failed token verification | LOW | Website current source | `website/assets/js/account-verified.js:14` |

### AUD-001 — Daily reminder uses an unsupported trigger shape

**Severity:** HIGH. **Affected:** Mobile, both native platforms. **Location:** `mobile-app/src/services/studyReminderService.ts:152`.

**Reproduction:** Enable a study reminder for a future time on a native build with permission. Inspect the scheduled trigger using the installed SDK parser. Android receives a channel-only trigger; iOS rejects it.

**Root cause:** Object has hour/minute/repeats but no trigger type, hidden by a CalendarTriggerInput cast. Installed expo-notifications parser falls through to Android channel trigger; Android delegate immediately delivers that non-schedulable trigger.

**User impact:** The promised daily reminder does not repeat; Android may notify immediately and again on restoration. iOS scheduling fails.

**Evidence:** node /tmp/medveda-reminder-repro.cjs: Android {type:channel,channelId:study-reminders}; iOS TypeError requiring type/channelId. Actual installed SDK parser, platform mocked; no real notification scheduled.

**Minimal fix (not applied):** Use the installed SDK's explicit supported DAILY trigger shape and verify the next scheduled fire time.

**Required regression:** Actual SDK parser assertions for both platforms plus physical-device future-time/repeat/reboot and permission-denial acceptance.


### AUD-002 — Reminder scheduling rejection leaves controls permanently busy

**Severity:** MEDIUM. **Affected:** Mobile. **Location:** `mobile-app/src/screens/reminder/StudyReminderScreen.tsx:66`.

**Reproduction:** Make enableStudyReminder/disableStudyReminder reject (SDK error, OS/storage failure). Toggle or change enabled reminder time.

**Root cause:** Saving is set true before awaits, reset only on success; no try/catch/finally at lines 66–90 or 106–109. Launch restoration is also called without rejection handling in AppNavigator.

**User impact:** Spinner replaces controls indefinitely; rejected operation lacks actionable recovery. Independent of correcting the trigger shape.

**Evidence:** Control flow inspected; AUD-001 provides a concrete installed-SDK rejection on iOS. This is a source-proven error branch, not a claimed device observation.

**Minimal fix (not applied):** Catch service failures, keep prior persisted state, display retry/error, and always clear saving in finally; handle launch promises.

**Required regression:** Rejected permission/storage/schedule/cancel/time-change mocks recover UI and preserve persisted choice; device error acceptance.


### AUD-003 — Logout/delete leaves previous private screens and profile state reachable

**Severity:** HIGH. **Affected:** Mobile privacy/navigation. **Location:** `mobile-app/src/screens/settings/SettingsScreen.tsx:77`.

**Reproduction:** Home → Profile → Settings, log out, press Android Back. The same applies to delete at Settings:97, Profile logout :58 and drawer logout :145.

**Root cause:** replace(Login) changes only top stack entry. AppNavigator:169 places auth/private routes in one unrestricted stack, with no global auth reset. Profile:43 returns on no user without clearing its retained profile state.

**User impact:** Signed-out user can return to private UI and previous profile details. This does not establish backend RLS bypass or access to purged paid files.

**Evidence:** node /tmp/medveda-logout-repro.cjs uses installed StackRouter: [Home,Profile,Settings] → [Home,Profile,Login] → Back → Profile.

**Minimal fix (not applied):** Central auth-aware route groups/reset on signout/session loss and clear account-scoped presentation state; retain required password-recovery routing.

**Required regression:** Every logout/delete/expired/blocked path empties private stack; actual two-account Back/deep-link/foreground tests.


### AUD-004 — Concurrent notification preference changes lose persisted choices

**Severity:** MEDIUM. **Affected:** Mobile local preferences. **Location:** `mobile-app/src/utils/notificationPreferences.ts:48`.

**Reproduction:** Disable new_notes and offer in quick succession while storage is pending; reopen preferences.

**Root cause:** Each setter reads and overwrites the entire stored object independently; screen optimistic updates permit overlapping writes without serialization/rollback.

**User impact:** One disabled category becomes enabled again despite the earlier UI state.

**Evidence:** node /tmp/medveda-preferences-repro.cjs executes actual module with memory storage: concurrent false/false persists new_notes=true, offer=false.

**Minimal fix (not applied):** Serialize read-modify-write or persist through one authoritative state owner; handle persistence failures visibly.

**Required regression:** Deferred overlapping writes, out-of-order completion and storage rejection preserve all chosen categories.


### AUD-005 — Referral Terms has permanent loading state after request failure

**Severity:** MEDIUM. **Affected:** Mobile. **Location:** `mobile-app/src/screens/referral/ReferralTermsScreen.tsx:32`.

**Reproduction:** Open Referral Terms offline or force getReferralSettings rejection/null response.

**Root cause:** settings=null represents loading, failure and missing response; catch sets null and the render branch at :35 always shows spinner.

**User impact:** Terms never become readable and there is no error/retry path after failure.

**Evidence:** Exact fetch catch/render control flow; native layout/request not executed.

**Minimal fix (not applied):** Separate loading/error/empty/data states and offer retry plus appropriate readable terms fallback.

**Required regression:** Rejected, null, successful and retry-success responses render distinct non-stuck states.


### AUD-006 — Multiple icon actions and switches lack accessible names

**Severity:** MEDIUM. **Affected:** Mobile accessibility. **Location:** `mobile-app/src/components/SideDrawer.tsx:278`.

**Reproduction:** Use TalkBack to focus drawer social icons, Downloads action icons, search back/filter and notification/reminder switches.

**Root cause:** Icon-only/emoji controls lack semantic labels/roles; switch category text has no explicit label relationship. Downloads:282, Search:130 and NotificationPreferences:47 are additional examples. Drawer targets are 40×40.

**User impact:** Actions such as pause/resume/retry/delete or category switches can be ambiguous or unusable to assistive technology.

**Evidence:** Missing props confirmed statically; exact speech and touch ergonomics require a device. Named Contact/BottomNav controls demonstrate the existing correct pattern.

**Minimal fix (not applied):** Add explicit action/category names, appropriate roles/state and adequate touch targets using current shared controls.

**Required regression:** Semantic render assertions for named controls and actual TalkBack traversal/activation on all affected screens.


### AUD-007 — Failed session ciphertext write destroys the previous valid key/blob pair

**Severity:** MEDIUM. **Affected:** Mobile native session persistence. **Location:** `mobile-app/src/config/secureSessionStorage.ts:67`.

**Reproduction:** Persist a valid session. Allow new SecureStore key write, then fail AsyncStorage.setItem during token refresh. Restore the previous blob.

**Root cause:** encrypt overwrites the only key before ciphertext persistence at :107–108; two stores have no versioned publication/rollback. Old ciphertext remains encrypted under the lost key.

**User impact:** Previous valid session becomes unreadable/corrupt and student may be unexpectedly logged out after process restart. No token disclosure demonstrated.

**Evidence:** node /tmp/medveda-session-storage-repro.cjs executes actual adapter/AES with synthetic memory stores: failed ciphertext write leaves restored payload not equal to old session and invalid JSON.

**Minimal fix (not applied):** Publish a recoverable versioned key/blob generation or retain old key until the new ciphertext is durable; keep fail-closed corruption behavior.

**Required regression:** Fault injection at each key/blob write/delete boundary, concurrent refresh ordering and restart reads preserve one complete valid session.


### AUD-008 — Paid offline PDFs are persisted in plaintext; encrypted vault is not integrated

**Severity:** HIGH. **Affected:** Mobile retained content-security requirement. **Location:** `mobile-app/src/utils/downloadManager.ts:204`.

**Reproduction:** Download an authorized paid note. Inspect app-managed note bytes in a controlled test/device environment: downloader writes .pdf directly and validates plaintext %PDF- before marking complete.

**Root cause:** DownloadResumable writes to persistent note PDF path (:220–228); native viewer reads that path. No vault content integration exists; module index:8 explicitly declares contentEnabled=false/nativeAccepted=false.

**User impact:** Downloaded paid bytes are unencrypted at rest and extractable by an actor with app-filesystem access. Owner/license UI checks do not encrypt bytes. This is not a claim that a normal unrelated Android app can read the sandbox.

**Evidence:** Current transfer path/header check :248 and local viewer source; module imports searched; foundation tests pass only dormant container/control. Existing release gates explicitly retain encryption as a requirement.

**Minimal fix (not applied):** Integrate authenticated streaming encryption before persistent writes, atomic ciphertext publication, owner/version/license metadata, native leased temporary viewing and legacy/cache cleanup. Post-download encryption alone is insufficient.

**Required regression:** Ciphertext-only partial/completed files; missing/wrong keys; tamper/truncation; low storage; process death; logout/account switch; cache cleanup; large PDFs on low-end Android.


### AUD-009 — Deployed webhook drops reversals received before payment linkage

**Severity:** HIGH. **Affected:** Deployed razorpay-webhook v51 / shared helper. **Location:** `deployed functions/razorpay-webhook/index.ts:144`.

**Reproduction:** Authentic refund/open/lost-dispute event arrives before captured settlement links razorpay_payment_id. SQL returns unknown_payment; helper reports success and webhook 204. Later capture has no remembered dispute fact.

**Root cause:** Deployed _shared/settle.ts:89–102/:121–137 treats any RPC status as ok=true, including unknown/null; handler :144–147/:164–167 acknowledges and has no durable provider inbox write.

**User impact:** Open/lost dispute can be forgotten and later paid access granted; full-refund-first is acknowledged without durable recovery disposition. No such real customer event was triggered.

**Evidence:** node /tmp/medveda-backend-repro.cjs runs exact downloaded helper/webhook with valid synthetic HMAC: refund/dispute unknown_payment → 204 and no inbox write. Local source has a different durable protocol.

**Minimal fix (not applied):** Persist authenticated reversal inbox first, classify closed accepted outcomes, retain retry/reconciliation for unknown linkage and apply verified reversal before entitlement.

**Required regression:** Real handler + scratch SQL: refund/open/lost before capture, null/unknown outcomes, retries/restarts and duplicate events; no committed access during blocking reversal.


### AUD-010 — Deployed webhook acknowledges captured-money mismatches without recovery record

**Severity:** HIGH. **Affected:** Deployed webhook v51 / helper shared with v69. **Location:** `deployed functions/razorpay-webhook/index.ts:200`.

**Reproduction:** A genuine captured event arrives for a provider order not attached locally or with a local/provider amount mismatch. Helper returns 404/400 and webhook acknowledges 204.

**Root cause:** Deployed settle.ts:25–46 looks up local order and rejects before recording capture; webhook :200–206 classifies non-5xx as permanent success. It creates no durable inbox/capture/compensation fact for the rejected captured money.

**User impact:** Provider stops retrying while money may be captured without content or automatic compensation/recovery.

**Evidence:** Exact downloaded branch inspection; existing local suite specifically covers durable unknown-order compensation in the newer workspace helper, proving source parity matters. No live captured event was replayed.

**Minimal fix (not applied):** Record provider-authoritative capture identity before local disposition, queue refund/review for mismatch and acknowledge only a durable safe disposition.

**Required regression:** Unknown/unattached order, amount mismatch, attach race and crash after provider read preserve capture and compensation/review record; retries never duplicate refund.


### AUD-011 — Deployed unsigned recovery has no user ownership authorization

**Severity:** MEDIUM. **Affected:** Deployed verify-payment v69. **Location:** `deployed functions/verify-payment/index.ts:50`.

**Reproduction:** A caller who knows another order UUID submits recover=true without JWT; verifier queries that order and asks provider/settles. Invalid/missing callback signature can also distinguish lookup outcomes before HMAC.

**Root cause:** Released legacy recovery path has rate limits but no verified caller/owner check; order lookup precedes callback HMAC at :69–82.

**User impact:** Known-order status/amount disclosure, unauthorized recovery/provider work and exhaustion of order-wide limit. UUID entropy limits discovery. Entitlement remains assigned to original owner; no entitlement theft proved.

**Evidence:** Fresh deployed source; current local ownership tests pass for newer source and cannot certify v69. Deliberately no real user UUID request was made.

**Minimal fix (not applied):** Require verified owner JWT for unsigned recovery; preserve authenticated signed callback compatibility and avoid an existence oracle before signature validation.

**Required regression:** Anonymous/other-owner/owner recovery; malformed callbacks against existing/nonexistent IDs indistinguishable; no foreign provider calls or limiter denial of owner recovery.


### AUD-012 — Fully refunded capture fallback leaves successful purchase and PDF access

**Severity:** HIGH. **Affected:** Workspace helper + current SQL; fallback not in deployed v69/v51 helper. **Location:** `supabase/functions/_shared/settle.ts:49`.

**Reproduction:** Create/settle a synthetic purchase, miss its refund webhook, then reconcile an authoritative fully-refunded provider payment through the local fallback. Capture is marked reversed and settlement invoked.

**Root cause:** 20261109100000_billing_settlement_recovery.sql:120–130 sets order refunded/capture reversed but does not invoke reverse_payment/update purchase. user_can_access_note checks successful purchase, not order/capture state.

**User impact:** Order/proof say refunded/uncommitted while purchase remains success and signing authorization still grants Notes. A later correct refund webhook repairs it; missing webhook can leave access indefinitely.

**Evidence:** python3 /tmp/medveda-backend-sql-repro.py against all 76 migrations: before paid/success/proof=true/access=true; after refunded/reversed/purchase=success/proof=false/access=true. Provider transition itself synthetic, SQL real.

**Minimal fix (not applied):** Apply authoritative full refund through one atomic reversal routine including purchase/wallet/referral semantics, rather than updating marker rows only.

**Required regression:** Actual local helper + SQL: initial grant, missed refund event, provider-refunded fallback, repeat/restart; access false, purchase revoked, wallet restored once and referral reversal correct.


### AUD-013 — Checkout can charge for content with unpublished ancestors

**Severity:** MEDIUM. **Affected:** Workspace and deployed create-order; current SQL. **Location:** `supabase/functions/_shared/createOrderHandler.ts:89`.

**Reproduction:** Unpublish a chapter while its active product remains active. Submit known/stale productId through authorized checkout, settle captured amount, then request paid note.

**Root cause:** Service-role product admission checks product.active/course only; create_priced_order retained implementation in 20261013100000_wallet_reservations.sql:34–39 also lacks publication ancestry. RLS hides listing but service role bypasses it. PDF access correctly checks ancestry.

**User impact:** A stale cart/direct request can pay successfully and obtain a successful purchase yet cannot read the promised content.

**Evidence:** Actual scratch SQL after all 76 migrations: chapter_active=false/product_active=true; create_priced_order ok → paid/success purchase → note_access=false. Deployed create-order:44–58 shares omission.

**Minimal fix (not applied):** Validate published product scope/ancestors server-side before creating a new payable order; retain explicit recovery policy for legitimate orders created before unpublication.

**Required regression:** Inactive each ancestor rejects new/stale checkout before provider POST; valid published scope succeeds; in-flight pre-unpublication capture remains safely recoverable.


### AUD-014 — Deployed targeted notification content is inserted into global readable feed

**Severity:** HIGH. **Affected:** Deployed send-push-notification v51 / notifications RLS. **Location:** `deployed functions/send-push-notification/index.ts:85`.

**Reproduction:** Authorized admin submits a synthetic targeted message with targetUserIds. Only token query is filtered; notifications insert has no recipient and active=true.

**Root cause:** Handler :62–68 accepts recipients; :85–87 persists global row. Live notifications_public_read_active policy exposes active rows to public readers, without recipient isolation.

**User impact:** Any sensitive targeted message could be visible to other students/public feed readers. Audit used synthetic content only and did not send/persist production notification.

**Evidence:** Fresh deployed source + live policy metadata; actual-handler mock recorded recipient-free global insert. Existing local p0 notification regression against deployed source FAILS 200 vs expected 400; same local source regression passes.

**Minimal fix (not applied):** Reject targeted requests in broadcast-only product or implement recipient-scoped rows/RLS/read APIs; do not rely on admin UI hiding the parameter.

**Required regression:** Targeted request never enters public feed; student B/anon cannot read A-only content; invalid/empty targets fail before writes; normal authorized broadcast retained.


### AUD-015 — Deployed push sender ignores configured MFA requirement

**Severity:** MEDIUM. **Affected:** Deployed send-push-notification v51, conditional configuration. **Location:** `deployed functions/send-push-notification/index.ts:36`.

**Reproduction:** In a disposable/synthetic setting with require_mfa=true, call sender as valid admin AAL1. It verifies membership only and writes/sends with service role.

**Root cause:** No admin_settings read or AAL2 decision; service role bypasses am_i_admin MFA RLS. Local sender includes the omitted enforcement.

**User impact:** If MFA is enabled, a password-only admin session can still broadcast through this privileged endpoint. Fresh live require_mfa=false means this is a confirmed latent branch defect, not a demonstrated bypass of a currently enabled production rule.

**Evidence:** Exact deployed handler accepted mocked AAL1 admin and made zero MFA-setting reads; actual live am_i_admin definition checks admin_mfa_required/AAL2.

**Minimal fix (not applied):** Read MFA setting fail-closed and enforce AAL2 from same verified token before side effects; review enroll/recovery before enabling policy.

**Required regression:** require_mfa on/off, AAL1/AAL2, settings-read failure and non-admin; assert denied cases make no insert/token/provider calls.


### AUD-016 — Deployed push sender reports rejected tickets as pushed and continues after feed failure

**Severity:** MEDIUM. **Affected:** Deployed send-push-notification v51. **Location:** `deployed functions/send-push-notification/index.ts:118`.

**Reproduction:** Mock Expo HTTP200 with DeviceNotRegistered per-ticket error. Sender increments sent by chunk size. Separately make feed insert fail; handler logs then proceeds to send.

**Root cause:** HTTP success is treated as ticket acceptance; body never parsed. Feed persistence error at :88 is nonterminal.

**User impact:** Admin receives false send counts, invalid tokens retained, and push/in-app feed can disagree. Accepted ticket still would not prove delivery.

**Evidence:** Actual deployed handler synthetic response returns pushed=1 for rejected ticket; source feed failure fallthrough confirmed. Local p1 regression covers corrected implementation but not deployed source.

**Minimal fix (not applied):** Parse and validate ticket array, count accepted/failed separately, remove invalid tokens and fail before send if required feed persistence fails; later poll receipts.

**Required regression:** Mixed/rejected/malformed tickets, HTTP failure, insert failure, invalid-token cleanup, timeout and partial-batch retry; no delivery claim from ticket acceptance.


### AUD-017 — Admin Settings failed first read permits saving destructive blank defaults

**Severity:** MEDIUM. **Affected:** Admin console. **Location:** `admin-panel/src/hooks/useSettings.ts:35`.

**Reproduction:** Initial getSettings rejects. Enter only valid minimum version/store URL and Save; blank general fields and maintenanceMode=false are submitted.

**Root cause:** Fallback settings initialized empty; read error clears loading but hasLoaded=false. Settings.tsx:53 blocks only while loading&&!hasLoaded; handler :29 and Save :147/hook :43 lack a loaded-baseline guard.

**User impact:** Transient read failure can overwrite support/legal/app fields and disable deliberately enabled maintenance.

**Evidence:** node /tmp/medveda-settings-repro.cjs executes actual page/hook/validators with recording service mock: updateSettings called with blank supportEmail and false maintenance after initial read rejection.

**Minimal fix (not applied):** Disable editing/save until first successful baseline read; guard handler and service hook; preserve a prior good baseline on refresh failure.

**Required regression:** Initial fail, forbidden programmatic save, retry success and later refresh failure; no overwrite from guessed defaults.


### AUD-018 — Isolated Razorpay test profile selects mismatched default Firebase client

**Severity:** MEDIUM. **Affected:** Build configuration / isolated test lane only. **Location:** `mobile-app/app.config.js:74`.

**Reproduction:** Evaluate app.config with exact razorpay-internal-test profile while current local google-services.json exists and no explicit GOOGLE_SERVICES_JSON path overrides it.

**Root cause:** Profile uses in.medveda.razorpaytest but fallback Firebase contains only in.medveda.app; strict validator correctly rejects. Genuine firebase-test/google-services.json is present but not selected by default.

**User impact:** Isolated test profile/config selftest fails; this is not proof production/live-testing build config fails.

**Evidence:** Fresh exact-profile matrix and razorpay-internal-test-selftest: Firebase client configuration must contain exactly one client for in.medveda.razorpaytest. Production/live-testing profile config passes.

**Minimal fix (not applied):** Explicitly select genuine matching test input through approved profile/workflow or omit push for that scope if intentional. Preserve validation, live/test separation and existing Play profiles.

**Required regression:** All profiles with production Firebase present/absent and correct/wrong explicit file; hermetic staging fixtures; no fake Firebase client.


### AUD-019 — Mobile login JSON null raises uncaught handler exception

**Severity:** LOW. **Affected:** Workspace and deployed login-with-mobile v18. **Location:** `supabase/functions/login-with-mobile/index.ts:40`.

**Reproduction:** Pass POST JSON body null to actual handler with synthetic dependencies.

**Root cause:** req.json result is typed but not runtime-object-validated; body.mobileNumber dereferenced after parse catch and before exception handling.

**User impact:** Malformed request gets internal failure instead of stable generic invalid-credentials response; avoidable server errors. No auth bypass inferred.

**Evidence:** node /tmp/medveda-login-null-repro.cjs: local and freshly downloaded deployed handler both throw TypeError before Auth/DB/provider calls. No real credential request sent.

**Minimal fix (not applied):** Validate nonnull nonarray object before field reads and return generic invalid request/credentials result.

**Required regression:** null/scalar/array/malformed/object with invalid fields all return controlled status and no lookup/provider call.


### AUD-020 — Email verification website claims success for invalid or failed token verification

**Severity:** LOW. **Affected:** Website current source. **Location:** `website/assets/js/account-verified.js:14`.

**Reproduction:** Load script with signup-type fragment and a synthetic invalid access token; getUser returns error or rejects network.

**Root cause:** state-success displayed before verification; failed getUser only omits email and is ignored.

**User impact:** User is falsely told email verification succeeded. No session/entitlement creation or authentication bypass demonstrated.

**Evidence:** node /tmp/medveda-website-verification-repro.cjs executes actual script: invalid-token result and network rejection both retain state-success. Hosted page HTTP200 does not test this token flow.

**Minimal fix (not applied):** Show verifying state, await verified user outcome, handle invalid/expired token and retryable network error before claiming success.

**Required regression:** Valid signup/email-change token, invalid/expired/missing token, network rejection and retry preserve truthful page states.


## D. Risk register and production failure prediction

These **18 risks** are separate from confirmed bugs. Risk is a review priority; incidence is unmeasured. No numerical probabilities are assigned.

| ID | Scenario / evidence and risk | Impact | Detection | Mitigation and recovery |
| --- | --- | --- | --- | --- |
| R01 | Captured payment + missing/delayed webhook or app killed after checkout; HIGH, confirmed underlying gaps AUD-009/010 | Charged but locked or stale access | Provider capture-to-order-to-purchase reconciliation; oldest unresolved age | Durable inbox/capture/compensation, retry with stable IDs; provider-authoritative manual reconciliation; never grant based on client callback alone |
| R02 | Deployed old handlers do not populate current Notes-choice authorization/refund reporting; HIGH if UCB enabled; not an observed missed deadline | External reporting/consumption/reversal obligation unmet | Compare bundle/DB contract; report/consume/refund queue ages and provider Console | Keep Play sales gated; release compatible handlers/workers as one reviewed change; recover unreported provider facts idempotently |
| R03 | Four Play/catalog cron jobs inactive live; no recovery/compensation schedule demonstrated; HIGH if historical obligations exist | Pending transactions or voids not reconciled | Read-only queue age, successful job history and provider inventory | Inventory installed clients/obligations before retirement; approve worker rollout; reconcile historical backlog |
| R04 | Local Firebase file ignored by archive; remote EAS file variable and FCM v1 credential unverified; HIGH | Build loses push config or device token/delivery fails | EAS selected-environment metadata, archive/package match, test-device receipts | Provision genuine correct file in authorized workflow; rebuild exact artifact; test token rotate/logout/delivery |
| R05 | Current native module/SDK/Billing/PDF/R8 combination has no compiled signed artifact; HIGH | Release-only build/link/startup/crash | Native compile + final merged manifest + exact APK installation | Locked build outside this audit, inspect dependency graph/JNI/16KB/signature; retain rollback artifact |
| R06 | PDF storage full/interruption/process death or unbounded viewer memory; HIGH; no measured device benchmark | Lost downloads, failure to read, OOM/ANR | File/length/header failures, native crash/heap/first-page latency | Encrypted atomic write/cleanup; bounded native rendering; safe redownload; test low-storage/large files |
| R07 | No fresh SMTP/redirect/session-expiry/multi-device/deletion acceptance; HIGH | Locked accounts or incomplete erasure | Synthetic hosted tests, mail delivery evidence, retained-record inventory | Verify approved test account flows; fix retry/retention gaps; do not delete real accounts for audit |
| R08 | Existing paid PDF download can remain usable offline up to seven days after revocation; signed URL lives 120 seconds; MEDIUM | Bounded delayed revocation, copied bytes cannot be recalled | Foreground access check, secure license age, denied marker | Explicit revocation window; online refresh; owner/license validation; remove denied content; communicate limits |
| R09 | Shared-device recent searches/chapters/read IDs/preferences/local attempt metadata survive account change; MEDIUM | Prior student's device-local activity visible | Account-A/B same-course test and SQLite/cache inventory | Agree account vs device scope; owner-partition or purge personal state; validate retained queues do not sync as another user |
| R10 | Home parallel requests lack comprehensive owner/course generation checks; MEDIUM, not reproduced | Late old-course data overwrites dashboard | Controlled slow old response after course switch | Generation-bound result commits and stale discard; refresh visible course |
| R11 | Small screens, keyboard, font scaling, modals, dark theme and hardware Back not executed; MEDIUM | Hidden submit controls, clipped text, inaccessible navigation | Device matrix/TalkBack/layout screenshots | Test fixed non-scroll profile/recovery forms; keyboard-aware scroll and semantics as needed |
| R12 | Admin large catalog/status single-query cap and all-row analytics client aggregation; MEDIUM, dataset threshold not measured | Missing sync statuses, slow dashboards | >PostgREST-cap fixture; query timing/heap | Paginate statuses with stable order, aggregate server-side when measured; retry incomplete views |
| R13 | Expo push acceptance is not device receipt; no receipt-polling workflow established; MEDIUM | Silent loss/invalid tokens/duplicate resend | Receipt errors, token age, dedup IDs, device counts | Parse tickets then receipts; cleanup invalid tokens; retry with deduplication and logged disposition |
| R14 | No demonstrated full Auth/Storage backup restoration; HIGH | Data loss/long outage recovery | Managed backup/PITR inventory and isolated restore drill with object bytes | Verify backups include required data and external config; approve drill, record recovery objectives/operator |
| R15 | Admin `require_mfa=false` and leaked-password protection disabled in fresh live reads; HIGH security posture gap, not proof of compromise | Password/session theft has greater blast radius | Settings/advisor read; AAL1/AAL2 enforcement acceptance | Agree and enable policy only with owner approval; first fix sender MFA gap, enroll/recover factors; monitor privileged operations |
| R16 | Secret scanner misses modern `sb_secret_`/GitHub formats; optional OTA signing/Sentry remote provisioning unverified; MEDIUM | Undetected future leak, unauthenticated OTA trust, invisible crashes | Extend synthetic scanner fixtures; inspect source/release inventory and signing metadata; symbolicated test crash | Expand patterns without exposing values; release signing policy and monitoring; rotate only if actual exposure found and approved |
| R17 | Historical migration `20260801` remote name differs; dirty/untracked implementation and stale handoffs; MEDIUM | Wrong bundle/migration assumptions during release | Definition/ACL/source hash comparison, exact archive manifest | Freeze reviewed source; review effective objects; do not repair history or push migrations solely because filenames differ |
| R18 | Public Play listing GET returned 404, while website/social HTTPS GETs succeeded; MEDIUM release/discovery uncertainty | Rate/share/download/update link may not reach public listing | Unauthenticated listing + intended country/test-track Console checks | Confirm publish/availability plan; distinguish private testing from public release; validate actual device handoff and unsupported-app behavior |

Server downtime/API timeout is covered by R01/R03/R06/R07; duplicates/concurrent purchases have local SQL evidence but no real provider acceptance. Fresh performance advisors reported 48 unused indexes (INFO), 39 multiple-permissive-policy warnings and one duplicate-index group. These are review leads, not measured latency or authorization vulnerabilities. Do not remove indexes based only on limited usage counters.

## E. Security findings

Confirmed vulnerabilities and integrity gaps are AUD-003 (residual private UI), AUD-008 (plaintext paid PDFs), AUD-009/010/012/013 (financial/reversal/access consistency), AUD-011 (unsigned cross-owner recovery), AUD-014 (targeted feed disclosure), AUD-015 (conditional admin MFA bypass), and AUD-007/017 (state corruption under failure). The bug register supplies minimal fixes and regression requirements. No live exploit against users was attempted.

Positive current evidence:

- All **57 public tables** in the fresh catalog query have RLS enabled. Twenty-nine policy-free backend/test tables are default-deny to ordinary client roles; their advisor INFO count is not automatically a security hole. FORCE RLS is enabled on isolated test tables. Service-role code still requires its own authorization.
- Student purchases/orders/wallet/profiles use ownership predicates; privileged settlement and entitlement commitment RPCs are denied to `anon`/`authenticated`, allowed to `service_role`. Purchase/payment/provider identifiers have uniqueness/foreign-key controls; new ownership guards and terminal order transitions pass local concurrent tests.
- Notes, quarantine and isolated-test storage buckets are private. Ordinary clients cannot directly read the paid Notes bucket; service signing checks verified caller, blocked status, published ancestry and purchase scope. Public thumbnails are expected public data. Paid URL TTL is 120 seconds. No signed paid URL was requested or exposed by this audit.
- The commitment proof checks order/payment/purchase identities, user/product/amount/provider and immutable scope snapshot; capture states, compensation and blocking/parked reversals deny proof. Invalid IDs return false. It is SECURITY DEFINER with an explicit safe search path and service-only ACL.
- Download errors use a fixed message rather than persisting signed URLs from native exceptions. Native session blobs are encrypted, with their random key in SecureStore; offline-license timestamps are already in SecureStore. Encryption alone does not resolve AUD-007 atomicity or AUD-008 unencrypted content.
- Client checkout data is not proof of capture. Deployed callback HMAC is fixed-width/constant-time and bound to provider order; actual provider amount/currency/status is re-fetched. The webhook authenticates raw body signature before processing and supports previous-secret rotation. JWT gateway disabled on these two endpoints is deliberate custom verification, not itself proof of vulnerability.
- Public website responses have CSP, HSTS and expected auth-page `no-referrer`/`no-store`. Source recovery controller clears fragments and uses bounded recovery/MFA states. This does not validate SMTP or native cold-link behavior.
- Fresh secret scan of tracked **and untracked nonignored** inventory found no values recognized by its limited patterns. Ignored env, private keys/signing stores, Git history and arbitrary unknown secret formats are not covered. Client publishable/anon configuration is not a service-role secret.

Fresh online npm audits (not cached prior results): mobile `--omit=dev` returned **5 moderate, 0 high, 0 critical** across `expo`, `@expo/fingerprint`, `glob`, `minimatch`, `react-native-blob-util`; admin full audit returned **0**. Some package entries are transitive metawarnings for the same underlying issue, not five distinct exploitable app vulnerabilities. The glob cancellation and minimatch amplification advisory paths are filesystem/pattern-processing concerns; no attacker-controlled reachable app exploit was established. See [glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249). No upgrade was performed. Edge dependencies were typechecked against the existing Deno cache/lock, not given a fresh comprehensive advisory scan.

Fresh Supabase security advisors: RLS/no-policy 29 INFO; three anonymous and 28 authenticated SECURITY DEFINER warnings; leaked-password protection disabled. Several definer RPCs are intentionally callable wrappers with internal caller/admin checks. Read-only metadata and local permission tests did not establish a blanket RPC bypass. Metrics views lacking security_invoker are service-only by grants in inspected metadata; the admin billing view has security_invoker=true. Do not count every advisor warning as a confirmed vulnerability.

Primary reference checks used where current platform behavior matters: [Expo SDK 57 notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase changelog](https://supabase.com/changelog.md), and [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738). Play policy applicability/enrollment cannot be certified by these sources or source flags alone.

## F. Production configuration and deployment consistency

### Supabase/database

- Production project is active/healthy, PostgreSQL 17; staging is INACTIVE. Read-only inventory reports 76 applied versions, matching all local version identifiers. **75 version/name pairs match; `20260801` has a historical name discrepancy.** Matching history does not prove byte-identical SQL; no historical migration was reapplied remotely.
- Effective proof, RLS, bucket, critical RPC grants, ownership/settlement constraints and indexes were inspected. Full migrations applied from scratch locally; real managed Auth/Storage behavior remains separately unverified.
- Fresh admin setting `require_mfa=false`; leaked-password protection is disabled. Whether to change either setting requires explicit owner action and full enforcement/rollback review.
- Existing analytics/payment-session purge and wallet-credit release jobs are active. `play-consume`, `play-reconcile`, `play-voids`, `play-catalog-sync` are inactive. One capture row exists, zero unresolved by the queried status predicate; this snapshot cannot certify historical provider completeness.
- Backups, PITR retention, project resource limits, SMTP and Auth redirect allowlists, Vault secret validity and deployment IAM were not established. No secret values were requested.

### Deployed payment source

| Function | Fresh version | Bundle SHA-256 | Observed |
| --- | --- | --- | --- |
| verify-payment | 69 | `ffe779d15b84698acc416aa90af0f33fbb7757952f2636d06bf6abc07e4effcb` | ACTIVE, verify_jwt=false, seven-line proof present |
| razorpay-webhook | 51 | `38b92030acc7ace0e8188b5dcbc0d9b6c0b3fc7bbf22b0a56e89a74cd5119252` | ACTIVE, verify_jwt=false, seven-line proof present |
| create-order | 23 | Captured in fresh remote inventory | Older monolithic handler; current native/choice/version guard is not deployed |
| send-push-notification | 51 | Captured in fresh remote inventory | Older sender with AUD-014–AUD-016 |

Deployed Razorpay helper retains `ALLOW_TEST_MODE` compatibility and lacks the local strict APP_ENV protocol; do not apply local-secret expectations to that bundle without checking its actual source. Credential validity/live mode/auto-capture/webhook dashboard delivery and retry configuration were **not** verified. Required settings include appropriate live/test key pair and webhook signing secret, previous-secret rotation if used, and approved stable refund recovery policy. No credential value is included here. The isolated test lane requires its own protected credentials, DB/product/user allowlists, server gates and private bucket; five local test endpoints are not currently deployed.

### Environment-variable inventory (names only)

| Scope | Inputs identified | Fresh status / verification limit |
| --- | --- | --- |
| Mobile public client | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Selected production profile/config resolves; public client configuration is expected; values omitted |
| Mobile telemetry/screenshot control | `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_DISABLE_SCREENSHOT_BLOCK` | Remote telemetry provisioning unverified; screenshot override is explicit screenshots profile behavior |
| Admin public client | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Source configured; hosted environment values/identity unverified; never place service-role credentials here |
| Build/profile routing | `EAS_BUILD_PROFILE`, `EAS_BUILD_PLATFORM`, `MEDVEDA_BUILD_TARGET`, `MEDVEDA_DISTRIBUTION`, `MEDVEDA_PAYMENT_PROVIDER`, `MEDVEDA_NONPLAY_TEST_ENVIRONMENT`, `MEDVEDA_INDIA_UCB_ENROLLED`, `MEDVEDA_UCB_TEST_ACCEPTED`, `ANDROID_SHRINK` | Exact profile matrix recorded; production/Play disabled; test-package mismatch and staging gates described below |
| Genuine native/release file inputs | `GOOGLE_SERVICES_JSON`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`; upload-signing and optional OTA certificate inputs | Firebase local structural checks pass for production; EAS file/FCM/signing/service-account availability unverified; no private contents printed |
| Supabase Edge runtime | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | Runtime/source dependencies identified; injected secret validity not independently queried; privileged key must remain server-side |
| Razorpay | `APP_ENV`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_WEBHOOK_PREVIOUS_SECRET`, legacy deployed `ALLOW_TEST_MODE` | Local and remote mode rules differ; five guard probes do not prove key mode/validity/capture. Do not blindly set flags from a different bundle's instructions |
| Play/reporting/workers | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`, `PLAY_CATALOG_REGIONS_VERSION`, `PLAY_CATALOG_CRON_SECRET`, `PLAY_PAYMENT_CRON_SECRET`, `UCB_REPORT_CRON_SECRET`, `UCB_SENTRY_DSN` | Credential/IAM/provider operation unverified; four named jobs currently inactive |
| Notes-choice enrollment gates | `PLAY_INDIA_UCB_ENROLLED`, `ENABLE_PLAY_CHOICE_TEST`, `PLAY_CHOICE_TEST_USER_IDS`, `PLAY_CHOICE_TEST_ACCEPTED`, `ENABLE_PLAY_CHOICE_CHECKOUT` | Source-only approvals are not proof of Console enrollment; relevant local entrypoint is not deployed |
| Isolated non-Play test lane | `NONPLAY_TEST_ENVIRONMENT`, `NONPLAY_TEST_CHECKOUT_ENABLED`, `NONPLAY_TEST_RAZORPAY_KEY_ID`, `NONPLAY_TEST_RAZORPAY_KEY_SECRET`, `NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET`, `NONPLAY_TEST_USER_IDS`, `NONPLAY_TEST_PRODUCT_IDS` | Separate keys/server allowlists + protected metadata/DB gates required; current local functions absent remotely; provisioning unverified |

This identifies literal runtime/config/template inputs, not test-harness-only variables or automatic Node/Expo system variables. Remote secret presence was not inferred from local `.env` files. No secret-value inventory is embedded in this report.

### Android, EAS and Firebase

- Production package `in.medveda.app`, version name `1.2.2`; Android runtime `1.2.2-disabled-notes-choice-v1`. EAS uses remote versioning and production auto-increment. The next remote versionCode, accepted Play version and upload certificate are unverified. Generated ignored Gradle `versionCode 1` and debug signing template are not evidence that EAS release signing will be wrong.
- `production` builds AAB with payments disabled. `internal-testing` also disables sales and uses the existing production backend, not staging. Both named submit profiles currently target **internal** track. Do not infer closed/public release from the profile name.
- `razorpay-live-testing` builds an internal APK against production, provider=razorpay, same package, distinct runtime/channel, no submit profile. It cannot coexist as a second app beside a Play build using that package; install-as-update depends on signing/version compatibility. Preserve existing Play profile restrictions.
- `razorpay-internal-test` uses `in.medveda.razorpaytest`, separate runtime/channel and isolated production test tables. Current default local Firebase file contains only `in.medveda.app`, causing AUD-018. The genuine `firebase-test/google-services.json` contains matching test and production clients but must be selected through an approved build input.
- `staging-validation` and `alpha-payment-validation` are intentionally blocked by placeholder staging publishable key/enrollment gates; staging additionally refuses a local production Firebase file. These are expected protection, not defects to bypass. Do not install a replacement dummy Firebase configuration.
- Local production `google-services.json` is present and structurally valid. It is ignored; EAS archive inclusion/file-variable availability, matching Firebase ownership/API restrictions and FCM v1 server credentials are unverified. Public client config does not prove delivery.
- Installed React Native catalog declares min SDK 24, target/compile SDK 36; vault platform support is gated to Android API>=28. Final merged SDK values/permissions require a native artifact. Source blocks broad external storage/media/overlay permissions, disables backup, denies cleartext, enables R8/resource shrinking and narrow keep rules.
- `medveda-offline-vault/android/build.gradle:1` applies Android library + Expo module plugin, `:8` namespace, `:10` min SDK 24, `:11` versionName and `:14` core/control source sets. The installed Expo plugin supplies SDK defaults. The previous `versionName` correction is present. No fresh unconditional compileSdk/versionName defect was established.
- Prior final native compile log fails in Gradle socket/file-lock startup **before project evaluation**. It proves environment failure, not successful compilation or a current library source error. Autolinking discovers vault/Expo/Billing; native compile, JNI/R8/16KB ABI, process restart, merged permissions and release-only PDF/Billing compatibility remain blocked pending an exact artifact. No native build/prebuild was run.
- Production Sentry DSN, native symbol upload and signed OTA certificate availability are unverified. Source suppresses default PII and scrubs exception messages; optional config does not prove deployed crash visibility.

## G. Executed tests and evidence

### Fresh result summary

| Command/group | Result | Count / boundary |
| --- | --- | --- |
| `/tmp/medveda-audit-run.py` commands listed in Appendix 3 | **134 PASS, 2 FAIL** | 136 commands: 123 Node test files + 13 checks/Deno runners; not 136 end-to-end flows |
| Mobile + two admin TypeScript commands | PASS | No emit, incremental=false; zero compile errors reported |
| ESLint mobile App/src + admin/src | PASS | Exit 0; no native/platform enforcement |
| Deno all local Edge entrypoints + worker check | PASS | 25 entrypoints + worker; cached existing dependency graph |
| Deno unit group | PASS | **40 passed, 0 failed**, synthetic transports, no allow-net |
| Android bundle validator selftest | PASS | **11 tests**, synthetic ZIP/XML/config; no actual AAB |
| Existing complete database runner | PASS | All 76 migrations + stub + seed; **43 top-level PASS summaries**, nested tests included; 14 SQL summaries alone total **570 assertions**, not total suite assertion count |
| Existing MV003 commitment/repeatability runner | PASS | Separate local DB; standalone migration twice, actual helper/HMAC/local SQL; retained snapshot/refund/replay checks |
| Existing MV005 transitions/history runner | PASS | Separate local DB; terminal transitions, duplicates, refund/dispute and commitment mismatch tests |
| Targeted B5/B6 SQL repro | PASS **as bug reproduction** | Separate fully migrated scratch DB; two defects demonstrated; not a passing application acceptance test |
| Exact freshly downloaded v69/v51 synthetic tests | PASS | **13 checks** of real HMAC/provider validation/proof branches, no real provider calls |
| Existing targeted-notification regression against deployed sender | **FAIL expected behavior** | Actual 200 vs expected 400; same regression passes against local source |
| Native vault foundation | PASS | **22 groups**, independent Node/Kotlin codec + four forced JVM-halt boundaries; no Keystore/device |
| Native vault shared control | PASS | **11 groups** + three journal halt/reopen cases; no Android/Swift acceptance |
| Targeted auth/router/preferences/reminder/settings/website repros | PASS **as bug reproduction** | Exact commands below; memory/platform/provider doubles only |
| Online `npm audit`, mobile production deps | PASS threshold | **5 moderate / 0 high / 0 critical**; no package changes |
| Online `npm audit`, admin all deps | PASS | **0 advisories** |
| Current nonignored tracked+untracked secret scan | PASS limited pattern set | Not ignored env/history/unknown-format scan |
| Expo public production config, offline package compatibility, autolink | PASS | Offline compatibility warns reliability limited; no compilation |
| Actual payment guard HTTP probes | PASS | **5/5**: GET 405, empty POST 400 for both; forged non-payment event signature 401 |
| Public website/social/store HTTP GETs | Mixed | **14 HTTP 200, 1 HTTP 404**; Play listing 404; no app handoff or authenticated workflow |
| `adb devices -l` outside socket sandbox | PASS discovery, UI BLOCKED | Empty attached-device list; no emulator executable found |
| `git diff --check` | FAIL, pre-existing formatting only | `mobile-app/src/screens/store/StoreScreen.tsx:133` trailing whitespace in the existing working-tree diff; left untouched, excluded from product bug counts |

The two local runner failures are `mobile-app/scripts/razorpay-internal-test-selftest.cjs` (missing matching default Firebase client) and `mobile-app/scripts/staging-build-selftest.cjs` (guard rejects local production Firebase). The latter demonstrates an environment-dependent test fixture assumption/safety gate, not proof the production profile is broken. Neither was hidden by deleting/renaming the real Firebase file.

The full database runner contains synthetic Auth/Storage stubs and real PostgreSQL transactions; provider APIs are mocked. Its successful webhook concurrency harness has 25 checks, but the **local** handler is under test there. The fresh deployed-source probes were run separately; conflating these would hide AUD-009/010/014–016. Modelled backlog output (1,500 mocked jobs, 41 minutes) is simulation, **not measured production throughput**.

Exact additional commands, from repository root unless a working directory is specified:

```sh
env -i PATH="$PATH" HOME="$HOME" PGHOST=/tmp/medveda-audit-pg PGPORT=55447 PGUSER=postgres bash supabase/tests/run-all.sh
env -i PATH="$PATH" HOME="$HOME" PGHOST=/tmp/medveda-audit-pg PGPORT=55447 PGUSER=postgres python3 supabase/tests/run-mv003-local.py
env -i PATH="$PATH" HOME="$HOME" PGHOST=/tmp/medveda-audit-pg PGPORT=55447 PGUSER=postgres python3 supabase/tests/run-mv005-local.py
python3 /tmp/medveda-backend-sql-repro.py
node /tmp/medveda-deployed-payment-audit.cjs
node /tmp/medveda-backend-repro.cjs
P0_RELEASE_ROOT=/tmp/medveda-current-remote/send-push-notification node supabase/tests/p0-notification-selftest.cjs
node /tmp/medveda-login-null-repro.cjs
node /tmp/medveda-reminder-repro.cjs
node /tmp/medveda-logout-repro.cjs
node /tmp/medveda-preferences-repro.cjs
node /tmp/medveda-session-storage-repro.cjs
node /tmp/medveda-settings-repro.cjs
node /tmp/medveda-profile-config-repro.cjs
node /tmp/medveda-website-verification-repro.cjs
python3 mobile-app/modules/medveda-offline-vault/tests/run-host-tests.py
python3 mobile-app/modules/medveda-offline-vault/tests/phase1b/run-tests.py
git ls-files -z --cached --others --exclude-standard | node scripts/scan-secrets.mjs --stdin
python3 /tmp/medveda-audit-health.py
python3 /tmp/medveda-links-audit.py
adb devices -l
```

In `mobile-app`:

```sh
npm audit --omit=dev --audit-level=high --json
EXPO_NO_DOTENV=1 CI=1 EAS_BUILD_PROFILE=production MEDVEDA_PAYMENT_PROVIDER=disabled node node_modules/expo/bin/cli config --type public --json
EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 CI=1 node node_modules/expo/bin/cli install --check
node node_modules/expo-modules-autolinking/bin/expo-modules-autolinking resolve --platform android --json
```

In `admin-panel`: `npm audit --audit-level=high --json`.

Initial sandbox attempts at network audits/HTTP, ADB and PostgreSQL sockets were BLOCKED by DNS/socket restrictions, then retried successfully with scoped execution outside the sandbox. Those initial failures are not app defects. Supabase project/function/migration/advisor/source access and production SQL were all read-only via the connected Supabase tool. Schema queries returned metadata/aggregate facts, not user profiles, tokens or purchase IDs. An initial aggregate query referenced `payment_provider`; the actual column is `provider`; corrected read succeeded. No failed query mutated production.

Temporary exact logs are under `/tmp/medveda-audit-tests`, `/tmp/medveda-audit-database.log`, `/tmp/medveda-audit-mv003.log`, `/tmp/medveda-audit-mv005.log`, `/tmp/medveda-backend-sql-repro.log`, `/tmp/medveda-audit-deployed-payment.log`, `/tmp/medveda-audit-health-results.json`, `/tmp/medveda-audit-links-results.json` and vault/dependency logs. `/tmp` is ephemeral; the command ledger, decisive results and source identifiers are embedded in this report. The audit's exact source inventory includes untracked implementation; fresh release CI must run against a preserved reviewed snapshot.

### Complete native end-to-end test matrix

Every scenario below is **BLOCKED as a whole**; the evidence column records safely executed substeps. No transaction/account mutation was authorized for this audit.

| ID | Workflow | Safe evidence | Exact remaining acceptance step |
| --- | --- | --- | --- |
| E01 | Registration → login → profile | Validation/login/recovery mocks | On test backend/account, register, receive email, verify, sign in, edit profile, kill/reopen, check exact saved profile |
| E02 | Browse notes → free PDF | Catalog/source/URL/SQL authorization checks | On exact APK signed into approved account, navigate every content level, open real free preview and render pages |
| E03 | Paid note → checkout | Gates, summary and mock order tests | In authorized isolated/test distribution, select real configured test product, confirm server-priced order and checkout; Play production must remain disabled |
| E04 | Verified payment → entitlement → PDF | 13 deployed synthetic checks, SQL commitment tests, 13/13 historic proofs | Separately approved test payment and later owner-run minimal LIVE acceptance; compare provider capture, server proof, purchase and actual Notes bytes |
| E05 | Purchase → restart → restore | Purchase/owner/recovery mocks | With approved fixture purchase, force-stop/kill during/after checkout, restart, verify server history and owner-bound access |
| E06 | Purchase → download → offline read | Real SQLite-in-memory/mocked filesystem tests; plaintext gap confirmed | After encryption work, actual device download, airplane mode, restart/reboot, read; validate file format/owner/expiry |
| E07 | Cancel payment → no entitlement | Mock cancel/status/SQL tests | Cancel provider checkout in test mode; check no successful purchase and released holds; repeat cancellation taps |
| E08 | Failed payment → no entitlement | Mock negative HMAC/status/amount and SQL tests | Provider test decline/network failure; inspect exact order/history/wallet and no paid access |
| E09 | Duplicate callback → no duplicate entitlement | Real concurrent SQL/session tests + handler mocks | Approved sandbox duplicate provider delivery/retry against deployed test release; verify one entitlement/debit and response idempotence |
| E10 | User A purchase → User B denied | SQL/RLS/ownership tests; logout leak repro | Two approved test users on exact APK and remote test backend; direct note signing/file access, account switch/back/cold restart |
| E11 | Logout → login → purchase restore | Owner purge and history mocks | Logout fixture account, Back/deep-link attempts, log back in, restore approved purchases; ensure previous user's UI/files gone |
| E12 | Expired session → recovery | Foreground refresh/recovery mocks; storage failure repro | Expire test access/session, background overnight/kill, renew or login; expire during checkout without wrong-owner recovery |
| E13 | No internet → recovery | Download/list/error/retry mocks; local SQL | Device airplane mode, slow/lossy network, offline launch/read, interrupted transfer, reconnect; inspect pending state and cleanup |
| E14 | Firebase push → destination | Token/routing mocks, package config, deployed sender findings | Approval to send one test-device notification; foreground/background/terminated tap, permission denial/token rotation/logout and receipt validation |
| E15 | Contact/social → correct app | Public GETs, URL/video normalization tests | Physical device with/without mail, WhatsApp, YouTube/browser/Telegram installed; retain draft/cancel; send no unsolicited messages |
| E16 | Release APK → install/startup/use | Config/autolink/11 synthetic AAB validator tests | Approved exact native build, verify signing/version/manifest/ABI, install on low-end/current Android, cold/warm use and pre-launch checks |

Additional blocked acceptance rows (12): **G17** native Gradle/R8/JNI/16KB artifact; **G18** Keystore/locked-device/power-loss vault; **G19** Firebase/EAS credential and actual delivery; **G20** remote version/signing/archive inputs; **G21** hosted SMTP/MFA/deletion retention; **G22** deployed admin AAL1/AAL2/student isolation/upload; **G23** full Auth/Storage restore drill; **G24** low-end FPS/startup/heap/PDF/battery measurements; **G25** provider auto-capture/webhook/refund/dispute dashboards and approved payment acceptance; **G26** Play enrollment/listing/country/track/reviewer/data-safety review; **G27** encrypted vault content pipeline; **G28** all native app schemes, keyboard/layout/accessibility/background/process-death matrix. These overlap journey prerequisites by design and are counted as named acceptance rows, not unique risk events.

## H. Production release blockers

| ID | Mandatory gate | Closure evidence |
| --- | --- | --- |
| PB01 | Resolve capture/refund/dispute/access integrity AUD-009/010/012/013 | Real handler + disposable DB regressions for event ordering, unknown order/mismatch, refunded fallback, unpublished stale cart; then approved provider acceptance |
| PB02 | Prevent targeted notification disclosure and enforce privileged sender policy AUD-014/015/016 | Deployed-source contract + synthetic second-user/anon/AAL1/AAL2/ticket tests; authorized device test |
| PB03 | Correct account navigation/session persistence AUD-003/007 | Reset/gate auth stack, stale-state and key-write failure regressions; two-account device test |
| PB04 | Complete retained paid-PDF encryption requirement AUD-008 | Ciphertext-only transfers, atomic publication, native temporary-view lifecycle/legacy cleanup and low-end device acceptance |
| PB05 | Restore implemented reminder behavior AUD-001/002 | Explicit SDK-supported daily trigger, recoverable UI on rejection, real device daily/reboot acceptance |
| PB06 | Reproducible configuration/CI and build input delivery | Resolve AUD-018 test file selection, hermetic staging fixtures, genuine selected EAS Firebase input and reviewed source manifest |
| PB07 | Produce and validate exact signed release artifact | Native compile/install/startup and E01–E16 applicable device evidence; signing/version/SDK/permissions/R8/ABI |
| PB08 | Reconcile deployed source with database and intended sales scope | Reviewed per-function hashes/ACL/contracts, historical Play obligations/worker status; no bulk unreviewed deploy |
| PB09 | Operational security, Auth/privacy, monitoring and recovery signoff | MFA policy, leaked-password decision, SMTP/redirect/deletion/retention acceptance, backup restore, alerts/receipts/on-call owner |
| PB10 | Distribution/provider public-release acceptance | Preserve disabled Play purchasing until policy approved; verify listing/track and standalone separation; no GO for paid sales without approved genuine provider acceptance |

AUD-004/005/006/017/019/020 also require tracked resolution or an explicit bounded release decision. Admin settings failure deserves early correction because it can change maintenance/support configuration. A deliberately limited, purchase-disabled testing build does not satisfy the requested public production-ready verdict.

## I. Fix priority

- **P0:** financial/reversal/content integrity and privacy: AUD-008/009/010/012/014. Agree narrow fixes and failure regressions first. Never deploy the whole current workspace solely because local checks pass.
- **P1:** AUD-001/003/007/013/015/017/018 and release-contract parity/critical operations. Harden account-bound transitions and server checkout admission; preserve in-flight legitimate purchases and existing Play restrictions.
- **P2:** AUD-002/004/005/006/011/016, failure UX, accessibility and exact device acceptance. Complete notification receipt and monitoring behavior with defined operational ownership.
- **P3:** AUD-019/020 and remaining scanner/documentation cleanup. Do not weaken validators or hide test failures to make the release appear ready.

## J. Final actionable checklist

Completed in this audit:

- [x] Inventory mobile screens/source, admin/website/native/backend/migrations/build/test/ops files and reachable interactions.
- [x] Fresh mobile/admin typechecks, lint, 123 Node file commands, Deno checks/40 tests, 11 validator fixtures and two native host suites.
- [x] Apply all 76 migrations and run existing SQL/handler/concurrency suites in disposable local DB; separate commitment/transition runners.
- [x] Fresh read-only production function inventory/source, migration versions, RLS, storage, key constraints/RPC ACL/definitions, job state and aggregate commitments.
- [x] Validate seven-line patch presence/false-proof behavior and five harmless live guard responses.
- [x] Online npm vulnerability queries; limited current-inventory secret scan; public link/header checks.
- [x] Reproduce defects independently of generic passing tests; separate local-only code, deployed behavior and risks.
- [x] Preserve existing work and make no application fixes or production mutations.

Remaining / blocked:

- [ ] Review and approve narrowly scoped fixes for AUD-001–AUD-020; implement only after approval.
- [ ] Resolve PB01–PB10 and retain exact source/build/deploy hashes and rollback evidence.
- [ ] Run E01–E16 and G17–G28 using approved disposable/test accounts and exact native artifact.
- [ ] Obtain explicit approval before any live transaction, notification send, deployment, credentials/settings change, native build submission or publication.
- [ ] Capture actual startup/frame/heap/PDF/network/battery results; no performance certification from simulated timings.
- [ ] Reaudit deployed source and schema after separately approved fixes/deployments; no GO based on repository parity alone.

## K. Smallest safe next actions

1. Approve a first correction batch limited to **payment-reversal/capture consistency and targeted-notification disclosure** (AUD-009/010/012/014), with regression tests and an exact deployed-vs-local compatibility review. This is a request for future scope, not permission already assumed.
2. Fix auth stack/session storage, reminder trigger/error UI, server publication admission and admin Settings read-failure gate; select the genuine isolated Firebase input and make tests independent of local production files. Rerun the targeted tests and required suites.
3. Complete the retained encrypted paid-PDF pipeline and native lifecycle. Passing dormant Kotlin foundations is insufficient. Validate the exact native artifact before any store/provider acceptance.
4. Prepare a concrete reviewed deployment manifest and migration/ACL diff, rollback and operational checks; obtain deployment approval only after that result is reviewable. Preserve disabled Play purchasing.
5. With approved test accounts/device and provider test environment, execute the matrix. A separately authorized minimal LIVE test can then verify capture → server commitment → entitlement → PDF, followed by approved reversal/recovery checks. Do not infer capture from checkout UI success.
6. Complete operational/privacy/Play Console gates and make a new evidence-based GO/NO-GO decision for the exact public release.

## L. Final verdict

1. **Is MedVeda currently production-ready? No.** Confirmed integrity/privacy bugs and missing native/provider acceptance support NOT READY.
2. **Are all screens/buttons functional? No such claim is supported.** Reminder/preference/referral/logout/settings/verification defects are demonstrated. All 40 screen implementations await native runtime acceptance.
3. **Are payments production-safe? Not established.** The entitlement false-success patch is present and passes its checks; deployed reversal/capture recovery still has confirmed defects, and no real new payment was initiated.
4. **Are PDF/offline features reliable? Not certified.** Authorization and failure controls exist; plaintext storage, refunded purchase revocation and missing device rendering/encryption evidence block a production-grade claim.
5. **Are Firebase/Supabase correctly configured? Partially verified.** Production schema/RLS/storage/proof facts were checked, but deployed handler parity and operational jobs need work. Firebase local package config passes for production; isolated test default fails; EAS/FCM/device delivery is unverified.
6. **Can it be released to real users today? NO-GO for public production release.** A controlled testing distribution is a separate decision and cannot be described as production readiness.
7. **What remains?** Resolve the confirmed bugs and ten release gates, then complete the 16 full workflows plus the additional acceptance rows on the exact artifact and deployed configuration.

No fixes are authorized by this report. **Next step: review and approve the narrowly scoped first correction batch described in K.1.**

## Appendix 1. Every mobile screen: static action and navigation review

All entries below have **native UI execution UNVERIFIED**. “Implemented” means a handler/data/render path is present and inspected, not that every click was physically exercised. For every screen, actual load/back/keyboard/overflow/small-screen/scroll/modal/theme/accessibility/foreground and duplicate-tap behavior remains in E/G acceptance unless a specific synthetic test is named. The app uses a fixed dark theme; a complete light-theme implementation was not found and is not claimed.

| Source screen | Main reachable controls/behavior reviewed | Static status / known issue |
| --- | --- | --- |
| `mobile-app/src/screens/about/AboutScreen.tsx` | Read app details; shared legal/contact links where present | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/auth/ForgotPasswordScreen.tsx` | Identifier form, request recovery, return Login | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/auth/LoginScreen.tsx` | Email/mobile + password, visibility, sign in, forgot, register, email OTP/verification states | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/auth/RegisterScreen.tsx` | Name/email/mobile/password/referral form, register, terms/privacy, login | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/auth/ResetPasswordScreen.tsx` | Recovery/MFA states, OTP submit/retry, password/visibility, save, return login/support | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/auth/SplashScreen.tsx` | Restore session, retry/error, route auth/course/home/recovery | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/chapters/ChaptersScreen.tsx` | Load/retry, select chapter or direct Notes, study-header Back | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/contact/ContactScreen.tsx` | Name/email/message form → mail composer; social/WhatsApp/legal links; unsupported/error handling | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/details/ChapterDetailsScreen.tsx` | Notes, free Video, free MCQ shortcuts; Back | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/downloads/DownloadsScreen.tsx` | All/Notes/Quizzes filters, read/play, pause/resume/retry/cancel/delete/clear confirmations, storage summary | BROKEN: AUD-006/008 |
| `mobile-app/src/screens/home/HomeScreen.tsx` | Drawer/profile/search/notifications, course/year, Notes/Video/MCQ, chapter/product/recommended/latest, Store/purchases, refresh | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/maintenance/MaintenanceScreen.tsx` | Retry availability; root gate | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/notes/NotesScreen.tsx` | Open free/owned PDF, download/action; buy-options panel when permitted; locked/error/retry | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/notifications/NotificationPreferencesScreen.tsx` | Category switches, read saved state, Back | BROKEN: AUD-004/006 |
| `mobile-app/src/screens/notifications/NotificationsScreen.tsx` | Read/tap notification, mark read/archive, refresh/retry, preferences gear | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/onboarding/SelectCourseYearScreen.tsx` | Course/year picker, confirm/continue, change/onboarding modes, save/error/retry | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/payment/OrderSummaryScreen.tsx` | Quote, buyer-state/options, wallet selection, confirm buy, provider/test gate, pending/error navigation | PARTIAL: provider/profile-gated; device/provider acceptance blocked |
| `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx` | WebView/native billing launch, cancel/Back, provider intents, callback/pending/retry/foreground recovery | PARTIAL: provider/profile-gated; device/provider acceptance blocked |
| `mobile-app/src/screens/payment/PaymentFailedScreen.tsx` | Retry/recheck pending, purchases/home return, cancellation/failure state | PARTIAL: provider/profile-gated; device/provider acceptance blocked |
| `mobile-app/src/screens/payment/PaymentSuccessScreen.tsx` | Independent entitlement confirmation, open library/continue, owner-bound recovery state | PARTIAL: provider/profile-gated; device/provider acceptance blocked |
| `mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx` | Native page render, fresh remote retry, local ownership/license, back/background/auth invalidation | BROKEN: AUD-008 |
| `mobile-app/src/screens/pdf/PdfViewerScreen.web.tsx` | Browser iframe render and retry, lifecycle/owner invalidation | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/privacy/PrivacyScreen.tsx` | Read policy; legal web links through shared controls | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/profile/ChangePasswordScreen.tsx` | Validate password fields/visibility, save, success/error, return | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/profile/EditProfileScreen.tsx` | Name/mobile/profile fields, validate/save/error, return | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/profile/ProfileScreen.tsx` | Edit/change password/course, purchases/downloads/referral/about, share, logout | BROKEN: AUD-003 |
| `mobile-app/src/screens/purchases/MyPurchasesScreen.tsx` | History states, refresh/retry, active/pending/failed/refunded purchase behavior and resource navigation | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/quiz/QuizScreen.tsx` | Question select/edit, prev/next, timed progress, submit guard, result/sync state | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/quiz/TestListScreen.tsx` | Select free test, download offline, loading/error/empty and header Back | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/referral/ReferralScreen.tsx` | Balance/history, copy/share referral, terms, refresh; program-disabled state | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/referral/ReferralTermsScreen.tsx` | Load terms/configured web link, Back | BROKEN: AUD-005 |
| `mobile-app/src/screens/reminder/StudyReminderScreen.tsx` | Enable switch, permission/settings, time picker/change, schedule/cancel | BROKEN: AUD-001/002/006 |
| `mobile-app/src/screens/search/SearchScreen.tsx` | Query/clear, filter controls, select chapter/content/product, recent searches, retry/Back | BROKEN: AUD-006 |
| `mobile-app/src/screens/settings/SettingsScreen.tsx` | Profile-related links, notifications/reminder/download/legal/contact/share/rate, logout/delete confirmation | BROKEN: AUD-003 |
| `mobile-app/src/screens/store/StoreScreen.tsx` | Catalog/filter, owned/error/empty/pending, product/buy option and summary when permitted | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/subjects/SubjectsScreen.tsx` | List/filter subject, select Chapters or direct videos/test list, Back | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/terms/TermsScreen.tsx` | Read terms and linked legal pages | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/update/UpdateRequiredScreen.tsx` | Open configured update URL; force-update root gate | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/videos/VideosScreen.tsx` | Select validated YouTube video, native/browser fallback, failure retry/copy | IMPLEMENTED; runtime UNVERIFIED |
| `mobile-app/src/screens/years/YearsScreen.tsx` | Academic-year list and mode-preserving Subjects navigation, loading/error/empty | IMPLEMENTED; runtime UNVERIFIED |

## Appendix 2. Source, route, backend and migration inventory


### Mobile source — all 220 files

- `mobile-app/src/components/BottomNav.tsx`
- `mobile-app/src/components/BrandLogo.tsx`
- `mobile-app/src/components/ChapterCard.tsx`
- `mobile-app/src/components/ConfirmationDialog.tsx`
- `mobile-app/src/components/ContinueLearningCard.tsx`
- `mobile-app/src/components/CustomButton.tsx`
- `mobile-app/src/components/CustomInput.tsx`
- `mobile-app/src/components/DailyQuoteCard.tsx`
- `mobile-app/src/components/EmptyState.tsx`
- `mobile-app/src/components/ErrorBoundary.tsx`
- `mobile-app/src/components/ErrorState.tsx`
- `mobile-app/src/components/FeatureCard.tsx`
- `mobile-app/src/components/FilterChip.tsx`
- `mobile-app/src/components/GradientBackground.tsx`
- `mobile-app/src/components/HomeHeader.tsx`
- `mobile-app/src/components/LoadError.tsx`
- `mobile-app/src/components/MiniChapterCard.tsx`
- `mobile-app/src/components/NoteCard.tsx`
- `mobile-app/src/components/NotificationBell.tsx`
- `mobile-app/src/components/NotificationRow.tsx`
- `mobile-app/src/components/OptionCard.tsx`
- `mobile-app/src/components/ProductCard.tsx`
- `mobile-app/src/components/ProductPosterCard.tsx`
- `mobile-app/src/components/ProfileAvatar.tsx`
- `mobile-app/src/components/ProfileMenuCard.tsx`
- `mobile-app/src/components/ProgressBar.tsx`
- `mobile-app/src/components/ProgressRing.tsx`
- `mobile-app/src/components/PurchaseOwnershipStatus.tsx`
- `mobile-app/src/components/SearchBar.tsx`
- `mobile-app/src/components/SectionHeader.tsx`
- `mobile-app/src/components/SettingsItem.tsx`
- `mobile-app/src/components/SideDrawer.tsx`
- `mobile-app/src/components/Skeleton.tsx`
- `mobile-app/src/components/StaggerItem.tsx`
- `mobile-app/src/components/StatCard.tsx`
- `mobile-app/src/components/StreakBadge.tsx`
- `mobile-app/src/components/StudentProfileCard.tsx`
- `mobile-app/src/components/SubjectCard.tsx`
- `mobile-app/src/components/TestCard.tsx`
- `mobile-app/src/components/UnlockOptionsPanel.tsx`
- `mobile-app/src/components/VideoCard.tsx`
- `mobile-app/src/components/WebLink.tsx`
- `mobile-app/src/components/YearCard.tsx`
- `mobile-app/src/components/motion/AnimatedPressable.tsx`
- `mobile-app/src/components/motion/FadeSlideIn.tsx`
- `mobile-app/src/components/motion/SuccessBurst.tsx`
- `mobile-app/src/components/search/HighlightedText.tsx`
- `mobile-app/src/components/search/RecentSearchesRow.tsx`
- `mobile-app/src/components/search/SearchEmptyState.tsx`
- `mobile-app/src/components/search/SearchFiltersSheet.tsx`
- `mobile-app/src/components/search/SearchResultRow.tsx`
- `mobile-app/src/config/database.ts`
- `mobile-app/src/config/paymentProvider.ts`
- `mobile-app/src/config/secureSessionStorage.ts`
- `mobile-app/src/config/sentry.ts`
- `mobile-app/src/config/supabase.ts`
- `mobile-app/src/constants/legal.ts`
- `mobile-app/src/constants/privacyInventory.ts`
- `mobile-app/src/features/auth/authFetch.ts`
- `mobile-app/src/features/auth/authService.ts`
- `mobile-app/src/features/auth/deepLinkStore.ts`
- `mobile-app/src/features/auth/identity.ts`
- `mobile-app/src/features/auth/loginLockout.ts`
- `mobile-app/src/features/auth/recoveryFlow.d.ts`
- `mobile-app/src/features/auth/recoveryFlow.js`
- `mobile-app/src/hooks/useBuyOptions.ts`
- `mobile-app/src/hooks/useCourseYear.ts`
- `mobile-app/src/hooks/useDebounce.ts`
- `mobile-app/src/hooks/useDownloads.ts`
- `mobile-app/src/hooks/useForceUpdate.ts`
- `mobile-app/src/hooks/useGlobalSearch.ts`
- `mobile-app/src/hooks/useLoadResource.ts`
- `mobile-app/src/hooks/useMaintenanceMode.ts`
- `mobile-app/src/hooks/useNetworkStatus.ts`
- `mobile-app/src/hooks/useNotificationRouting.ts`
- `mobile-app/src/hooks/usePreventScreenshot.ts`
- `mobile-app/src/hooks/usePurchase.ts`
- `mobile-app/src/hooks/usePurchaseResource.ts`
- `mobile-app/src/hooks/usePurchases.ts`
- `mobile-app/src/hooks/useQuizStats.ts`
- `mobile-app/src/hooks/useStoreCatalog.ts`
- `mobile-app/src/hooks/useStreak.ts`
- `mobile-app/src/navigation/AppNavigator.tsx`
- `mobile-app/src/navigation/withRouteValidation.tsx`
- `mobile-app/src/repositories/chaptersRepository.ts`
- `mobile-app/src/repositories/coursesRepository.ts`
- `mobile-app/src/repositories/notesRepository.ts`
- `mobile-app/src/repositories/ordersRepository.ts`
- `mobile-app/src/repositories/productsRepository.ts`
- `mobile-app/src/repositories/purchasesRepository.ts`
- `mobile-app/src/repositories/quizRepository.ts`
- `mobile-app/src/repositories/referralsRepository.ts`
- `mobile-app/src/repositories/searchCatalogRepository.ts`
- `mobile-app/src/repositories/searchPagination.ts`
- `mobile-app/src/repositories/subjectsRepository.ts`
- `mobile-app/src/repositories/usersRepository.ts`
- `mobile-app/src/repositories/videosRepository.ts`
- `mobile-app/src/repositories/yearsRepository.ts`
- `mobile-app/src/screens/about/AboutScreen.tsx`
- `mobile-app/src/screens/auth/ForgotPasswordScreen.tsx`
- `mobile-app/src/screens/auth/LoginScreen.tsx`
- `mobile-app/src/screens/auth/RegisterScreen.tsx`
- `mobile-app/src/screens/auth/ResetPasswordScreen.tsx`
- `mobile-app/src/screens/auth/SplashScreen.tsx`
- `mobile-app/src/screens/chapters/ChaptersScreen.tsx`
- `mobile-app/src/screens/contact/ContactScreen.tsx`
- `mobile-app/src/screens/details/ChapterDetailsScreen.tsx`
- `mobile-app/src/screens/downloads/DownloadsScreen.tsx`
- `mobile-app/src/screens/home/HomeScreen.tsx`
- `mobile-app/src/screens/maintenance/MaintenanceScreen.tsx`
- `mobile-app/src/screens/notes/NotesScreen.tsx`
- `mobile-app/src/screens/notifications/NotificationPreferencesScreen.tsx`
- `mobile-app/src/screens/notifications/NotificationsScreen.tsx`
- `mobile-app/src/screens/onboarding/SelectCourseYearScreen.tsx`
- `mobile-app/src/screens/payment/OrderSummaryScreen.tsx`
- `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx`
- `mobile-app/src/screens/payment/PaymentFailedScreen.tsx`
- `mobile-app/src/screens/payment/PaymentSuccessScreen.tsx`
- `mobile-app/src/screens/payment/checkoutHtmlTemplate.ts`
- `mobile-app/src/screens/payment/checkoutNavigation.ts`
- `mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx`
- `mobile-app/src/screens/pdf/PdfViewerScreen.web.tsx`
- `mobile-app/src/screens/privacy/PrivacyScreen.tsx`
- `mobile-app/src/screens/profile/ChangePasswordScreen.tsx`
- `mobile-app/src/screens/profile/EditProfileScreen.tsx`
- `mobile-app/src/screens/profile/ProfileScreen.tsx`
- `mobile-app/src/screens/purchases/MyPurchasesScreen.tsx`
- `mobile-app/src/screens/quiz/QuizScreen.tsx`
- `mobile-app/src/screens/quiz/TestListScreen.tsx`
- `mobile-app/src/screens/referral/ReferralScreen.tsx`
- `mobile-app/src/screens/referral/ReferralTermsScreen.tsx`
- `mobile-app/src/screens/reminder/StudyReminderScreen.tsx`
- `mobile-app/src/screens/search/SearchScreen.tsx`
- `mobile-app/src/screens/settings/SettingsScreen.tsx`
- `mobile-app/src/screens/store/StoreScreen.tsx`
- `mobile-app/src/screens/subjects/SubjectsScreen.tsx`
- `mobile-app/src/screens/terms/TermsScreen.tsx`
- `mobile-app/src/screens/update/UpdateRequiredScreen.tsx`
- `mobile-app/src/screens/videos/VideosScreen.tsx`
- `mobile-app/src/screens/years/YearsScreen.tsx`
- `mobile-app/src/services/analyticsService.ts`
- `mobile-app/src/services/appConfigService.ts`
- `mobile-app/src/services/authState.ts`
- `mobile-app/src/services/chaptersService.ts`
- `mobile-app/src/services/courseState.ts`
- `mobile-app/src/services/coursesService.ts`
- `mobile-app/src/services/indiaBillingStates.ts`
- `mobile-app/src/services/maintenanceService.ts`
- `mobile-app/src/services/nonplayTestService.ts`
- `mobile-app/src/services/notesService.ts`
- `mobile-app/src/services/notificationRouting.ts`
- `mobile-app/src/services/notificationsService.ts`
- `mobile-app/src/services/offlineNoteAccess.ts`
- `mobile-app/src/services/offlineNoteVerification.ts`
- `mobile-app/src/services/ordersService.ts`
- `mobile-app/src/services/paymentService.ts`
- `mobile-app/src/services/playBillingService.ts`
- `mobile-app/src/services/playOfferSelection.ts`
- `mobile-app/src/services/productsService.ts`
- `mobile-app/src/services/purchasesService.ts`
- `mobile-app/src/services/pushNotifications.ts`
- `mobile-app/src/services/quizAttempts.ts`
- `mobile-app/src/services/quizService.ts`
- `mobile-app/src/services/referralsService.ts`
- `mobile-app/src/services/searchService.ts`
- `mobile-app/src/services/secureNotesService.ts`
- `mobile-app/src/services/storeCatalogService.ts`
- `mobile-app/src/services/studyReminderService.ts`
- `mobile-app/src/services/subjectsService.ts`
- `mobile-app/src/services/syncEngine.ts`
- `mobile-app/src/services/usersService.ts`
- `mobile-app/src/services/videosService.ts`
- `mobile-app/src/services/yearsService.ts`
- `mobile-app/src/theme/colors.ts`
- `mobile-app/src/theme/fonts.ts`
- `mobile-app/src/theme/motion.ts`
- `mobile-app/src/theme/radius.ts`
- `mobile-app/src/theme/shadows.ts`
- `mobile-app/src/theme/spacing.ts`
- `mobile-app/src/theme/typography.ts`
- `mobile-app/src/types/chapter.ts`
- `mobile-app/src/types/course.ts`
- `mobile-app/src/types/index.ts`
- `mobile-app/src/types/navigation.ts`
- `mobile-app/src/types/note.ts`
- `mobile-app/src/types/offline.ts`
- `mobile-app/src/types/order.ts`
- `mobile-app/src/types/product.ts`
- `mobile-app/src/types/purchase.ts`
- `mobile-app/src/types/quiz.ts`
- `mobile-app/src/types/referral.ts`
- `mobile-app/src/types/search.ts`
- `mobile-app/src/types/subject.ts`
- `mobile-app/src/types/user.ts`
- `mobile-app/src/types/video.ts`
- `mobile-app/src/types/year.ts`
- `mobile-app/src/utils/caseConvert.ts`
- `mobile-app/src/utils/dailyQuote.ts`
- `mobile-app/src/utils/downloadManager.ts`
- `mobile-app/src/utils/gradient.ts`
- `mobile-app/src/utils/localCache.ts`
- `mobile-app/src/utils/logger.ts`
- `mobile-app/src/utils/notificationPreferences.ts`
- `mobile-app/src/utils/passwordStrength.ts`
- `mobile-app/src/utils/pendingReferral.ts`
- `mobile-app/src/utils/phone.ts`
- `mobile-app/src/utils/recentActivity.ts`
- `mobile-app/src/utils/recentSearches.ts`
- `mobile-app/src/utils/streakTracker.ts`
- `mobile-app/src/utils/textMatch.ts`
- `mobile-app/src/utils/version.ts`
- `mobile-app/src/utils/videoDiagnostics.ts`
- `mobile-app/src/utils/videoLink.ts`
- `mobile-app/src/utils/videoUrl.ts`
- `mobile-app/src/validation/contactSchema.ts`
- `mobile-app/src/validation/forgotPasswordSchema.ts`
- `mobile-app/src/validation/loginSchema.ts`
- `mobile-app/src/validation/passwordPolicy.ts`
- `mobile-app/src/validation/registerSchema.ts`
- `mobile-app/src/validation/resetPasswordSchema.ts`

### Admin source — all 122 files

- `admin-panel/src/App.tsx`
- `admin-panel/src/components/Button.tsx`
- `admin-panel/src/components/ChapterFormModal.tsx`
- `admin-panel/src/components/ChapterPicker.tsx`
- `admin-panel/src/components/ChapterTable.tsx`
- `admin-panel/src/components/ConfirmDialog.tsx`
- `admin-panel/src/components/CourseFormModal.tsx`
- `admin-panel/src/components/CoursePicker.tsx`
- `admin-panel/src/components/CourseTable.tsx`
- `admin-panel/src/components/Header.tsx`
- `admin-panel/src/components/Input.tsx`
- `admin-panel/src/components/LookupStatus.tsx`
- `admin-panel/src/components/Modal.tsx`
- `admin-panel/src/components/NoteFormModal.tsx`
- `admin-panel/src/components/NotesHeader.tsx`
- `admin-panel/src/components/NotesTable.tsx`
- `admin-panel/src/components/OrderFilter.tsx`
- `admin-panel/src/components/OrdersTable.tsx`
- `admin-panel/src/components/PlayPricingDiagnostic.tsx`
- `admin-panel/src/components/PlayServiceAccountDiagnostic.tsx`
- `admin-panel/src/components/ProductFilter.tsx`
- `admin-panel/src/components/ProductFormModal.tsx`
- `admin-panel/src/components/ProductHeader.tsx`
- `admin-panel/src/components/ProductTable.tsx`
- `admin-panel/src/components/ProtectedRoute.tsx`
- `admin-panel/src/components/QuizFormModal.tsx`
- `admin-panel/src/components/QuizHeader.tsx`
- `admin-panel/src/components/QuizTable.tsx`
- `admin-panel/src/components/RouteErrorBoundary.tsx`
- `admin-panel/src/components/SearchBar.tsx`
- `admin-panel/src/components/Sidebar.tsx`
- `admin-panel/src/components/StatCard.tsx`
- `admin-panel/src/components/SubjectFormModal.tsx`
- `admin-panel/src/components/SubjectPicker.tsx`
- `admin-panel/src/components/SubjectTable.tsx`
- `admin-panel/src/components/TopProductsTable.tsx`
- `admin-panel/src/components/UsersTable.tsx`
- `admin-panel/src/components/VideoFormModal.tsx`
- `admin-panel/src/components/VideosHeader.tsx`
- `admin-panel/src/components/VideosTable.tsx`
- `admin-panel/src/components/YearFormModal.tsx`
- `admin-panel/src/components/YearTable.tsx`
- `admin-panel/src/config/supabase.ts`
- `admin-panel/src/context/AuthContext.tsx`
- `admin-panel/src/hooks/useAnalytics.ts`
- `admin-panel/src/hooks/useChapters.ts`
- `admin-panel/src/hooks/useCourses.ts`
- `admin-panel/src/hooks/useDashboard.ts`
- `admin-panel/src/hooks/useDialogFocus.ts`
- `admin-panel/src/hooks/useNotes.ts`
- `admin-panel/src/hooks/useOrders.ts`
- `admin-panel/src/hooks/useProducts.ts`
- `admin-panel/src/hooks/useQuiz.ts`
- `admin-panel/src/hooks/useReferrals.ts`
- `admin-panel/src/hooks/useRequestGuard.ts`
- `admin-panel/src/hooks/useSettings.ts`
- `admin-panel/src/hooks/useSubjects.ts`
- `admin-panel/src/hooks/useUsers.ts`
- `admin-panel/src/hooks/useVideos.ts`
- `admin-panel/src/hooks/useYears.ts`
- `admin-panel/src/index.css`
- `admin-panel/src/layouts/AdminLayout.tsx`
- `admin-panel/src/main.tsx`
- `admin-panel/src/pages/Analytics.tsx`
- `admin-panel/src/pages/Chapters.tsx`
- `admin-panel/src/pages/Courses.tsx`
- `admin-panel/src/pages/Dashboard.tsx`
- `admin-panel/src/pages/Login.tsx`
- `admin-panel/src/pages/Notes.tsx`
- `admin-panel/src/pages/Notifications.tsx`
- `admin-panel/src/pages/Orders.tsx`
- `admin-panel/src/pages/Products.tsx`
- `admin-panel/src/pages/Quiz.tsx`
- `admin-panel/src/pages/Referrals.tsx`
- `admin-panel/src/pages/ReviewFlags.tsx`
- `admin-panel/src/pages/Settings.tsx`
- `admin-panel/src/pages/Subjects.tsx`
- `admin-panel/src/pages/Users.tsx`
- `admin-panel/src/pages/Videos.tsx`
- `admin-panel/src/pages/Years.tsx`
- `admin-panel/src/services/analyticsService.ts`
- `admin-panel/src/services/chapterService.ts`
- `admin-panel/src/services/courseService.ts`
- `admin-panel/src/services/dashboardService.ts`
- `admin-panel/src/services/noteService.ts`
- `admin-panel/src/services/notificationService.ts`
- `admin-panel/src/services/orderService.ts`
- `admin-panel/src/services/playBillingSyncService.ts`
- `admin-panel/src/services/playPricingDiagnostic.ts`
- `admin-panel/src/services/playServiceAccountDiagnostic.ts`
- `admin-panel/src/services/productService.ts`
- `admin-panel/src/services/quizService.ts`
- `admin-panel/src/services/referralService.ts`
- `admin-panel/src/services/reviewFlagService.ts`
- `admin-panel/src/services/settingsService.ts`
- `admin-panel/src/services/storageService.ts`
- `admin-panel/src/services/subjectService.ts`
- `admin-panel/src/services/uploadError.ts`
- `admin-panel/src/services/userService.ts`
- `admin-panel/src/services/videoService.ts`
- `admin-panel/src/services/yearService.ts`
- `admin-panel/src/src/vite-env.d.ts`
- `admin-panel/src/types/chapter.ts`
- `admin-panel/src/types/course.ts`
- `admin-panel/src/types/filters.ts`
- `admin-panel/src/types/note.ts`
- `admin-panel/src/types/order.ts`
- `admin-panel/src/types/product.ts`
- `admin-panel/src/types/quiz.ts`
- `admin-panel/src/types/referral.ts`
- `admin-panel/src/types/settings.ts`
- `admin-panel/src/types/subject.ts`
- `admin-panel/src/types/user.ts`
- `admin-panel/src/types/video.ts`
- `admin-panel/src/types/year.ts`
- `admin-panel/src/utils/appVersion.ts`
- `admin-panel/src/utils/caseConvert.ts`
- `admin-panel/src/utils/filters.ts`
- `admin-panel/src/utils/pdfValidation.ts`
- `admin-panel/src/utils/quizValidation.ts`
- `admin-panel/src/utils/referralLimits.ts`
- `admin-panel/src/utils/videoUrl.ts`

### Native vault source/config/tests — 30 files

- `mobile-app/modules/medveda-offline-vault/FORMAT.md`
- `mobile-app/modules/medveda-offline-vault/PHASE1B.md`
- `mobile-app/modules/medveda-offline-vault/README.md`
- `mobile-app/modules/medveda-offline-vault/android/build.gradle`
- `mobile-app/modules/medveda-offline-vault/android/src/androidTest/java/in/medveda/offline/NativeSecurityTest.kt`
- `mobile-app/modules/medveda-offline-vault/android/src/main/java/expo/modules/medvedaoffline/MedvedaOfflineVaultModule.kt`
- `mobile-app/modules/medveda-offline-vault/android/src/main/java/in/medveda/offline/AndroidKeys.kt`
- `mobile-app/modules/medveda-offline-vault/android/src/main/java/in/medveda/offline/AndroidVaultControl.kt`
- `mobile-app/modules/medveda-offline-vault/android/src/main/java/in/medveda/offline/AndroidVaultLifecycle.kt`
- `mobile-app/modules/medveda-offline-vault/core/AtomicVault.kt`
- `mobile-app/modules/medveda-offline-vault/core/PdfContainer.kt`
- `mobile-app/modules/medveda-offline-vault/core/VaultModel.kt`
- `mobile-app/modules/medveda-offline-vault/expo-module.config.json`
- `mobile-app/modules/medveda-offline-vault/index.ts`
- `mobile-app/modules/medveda-offline-vault/integration/DurableGenerations.kt`
- `mobile-app/modules/medveda-offline-vault/integration/NativeLeases.kt`
- `mobile-app/modules/medveda-offline-vault/integration/OwnerKeys.kt`
- `mobile-app/modules/medveda-offline-vault/integration/Registry.kt`
- `mobile-app/modules/medveda-offline-vault/ios/KeychainKeys.swift`
- `mobile-app/modules/medveda-offline-vault/ios/MVPDFVerifier.swift`
- `mobile-app/modules/medveda-offline-vault/ios/MedvedaOfflineVault.podspec`
- `mobile-app/modules/medveda-offline-vault/ios/MedvedaOfflineVaultModule.swift`
- `mobile-app/modules/medveda-offline-vault/ios/Tests/ContainerTests.swift`
- `mobile-app/modules/medveda-offline-vault/ios/Tests/reference.mvp`
- `mobile-app/modules/medveda-offline-vault/package.json`
- `mobile-app/modules/medveda-offline-vault/tests/FoundationTest.kt`
- `mobile-app/modules/medveda-offline-vault/tests/phase1b/Phase1BTest.kt`
- `mobile-app/modules/medveda-offline-vault/tests/phase1b/run-tests.py`
- `mobile-app/modules/medveda-offline-vault/tests/reference-codec.cjs`
- `mobile-app/modules/medveda-offline-vault/tests/run-host-tests.py`

### Local Edge functions and shared modules — 64 files

- `supabase/functions/.env.example`
- `supabase/functions/_shared/boundedFormData.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/createOrderHandler.ts`
- `supabase/functions/_shared/externalReporting.ts`
- `supabase/functions/_shared/googlePlay.ts`
- `supabase/functions/_shared/nonPlayTestCheckout.ts`
- `supabase/functions/_shared/nonplayTestConfig.ts`
- `supabase/functions/_shared/nonplayTestHandlers.ts`
- `supabase/functions/_shared/nonplayTestProvider.ts`
- `supabase/functions/_shared/nonplayTestRuntime.ts`
- `supabase/functions/_shared/notePdfHash.ts`
- `supabase/functions/_shared/notePdfUpload.ts`
- `supabase/functions/_shared/noteQuarantine.ts`
- `supabase/functions/_shared/notesChoiceAuthorization.ts`
- `supabase/functions/_shared/notesChoiceGate.ts`
- `supabase/functions/_shared/notesChoiceOrder.ts`
- `supabase/functions/_shared/pages.ts`
- `supabase/functions/_shared/paymentGate.ts`
- `supabase/functions/_shared/paymentQueue.ts`
- `supabase/functions/_shared/phone.ts`
- `supabase/functions/_shared/playCatalog.ts`
- `supabase/functions/_shared/playPurchaseValidation.ts`
- `supabase/functions/_shared/processNotePdfJob.ts`
- `supabase/functions/_shared/rateLimit.ts`
- `supabase/functions/_shared/razorpay.ts`
- `supabase/functions/_shared/settle.ts`
- `supabase/functions/_shared/supabaseAdmin.ts`
- `supabase/functions/_shared/ucbAlert.ts`
- `supabase/functions/_shared/ucbStates.ts`
- `supabase/functions/_shared/validatePdfStructure.ts`
- `supabase/functions/attach-external-token/index.ts`
- `supabase/functions/create-order/index.ts`
- `supabase/functions/create-order-nonplay-test/index.ts`
- `supabase/functions/create-order-play-choice/index.ts`
- `supabase/functions/create-play-order/index.ts`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/deno.d.ts`
- `supabase/functions/diagnose-play-matrix/handler.ts`
- `supabase/functions/diagnose-play-matrix/index.ts`
- `supabase/functions/diagnose-play-pricing/README.md`
- `supabase/functions/diagnose-play-pricing/handler.ts`
- `supabase/functions/diagnose-play-pricing/handler_test.ts`
- `supabase/functions/diagnose-play-pricing/index.ts`
- `supabase/functions/diagnose-play-pricing/sanitize.ts`
- `supabase/functions/diagnose-play-pricing/sanitize_test.ts`
- `supabase/functions/diagnose-play-service-account/README.md`
- `supabase/functions/diagnose-play-service-account/index.ts`
- `supabase/functions/get-note-url/index.ts`
- `supabase/functions/get-note-url-nonplay-test/index.ts`
- `supabase/functions/get-video-url/index.ts`
- `supabase/functions/login-with-mobile/index.ts`
- `supabase/functions/nonplay-test-catalog/index.ts`
- `supabase/functions/play-payment-worker/index.ts`
- `supabase/functions/razorpay-webhook/index.ts`
- `supabase/functions/razorpay-webhook-nonplay-test/index.ts`
- `supabase/functions/report-external-transaction/index.ts`
- `supabase/functions/request-password-reset-by-mobile/index.ts`
- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/sync-play-catalog/index.ts`
- `supabase/functions/upload-note-pdf/index.ts`
- `supabase/functions/verify-payment/index.ts`
- `supabase/functions/verify-payment-nonplay-test/index.ts`
- `supabase/functions/verify-play-purchase/index.ts`

### All 76 migration files, lexical application order

- `supabase/migrations/20260701000000_baseline_live_schema.sql`
- `supabase/migrations/20260718_payment_backend.sql`
- `supabase/migrations/20260721_admin_orders_purchases_access.sql`
- `supabase/migrations/20260801150000_razorpay_webhook_atomic_grant.sql`
- `supabase/migrations/20260801_auth_verified_identities.sql`
- `supabase/migrations/20260919120000_multi_course_and_referrals.sql`
- `supabase/migrations/20260919130000_referral_history_rpc.sql`
- `supabase/migrations/20260920120000_null_year_course_fallback.sql`
- `supabase/migrations/20260920130000_app_config.sql`
- `supabase/migrations/20260920140000_default_new_profile_course.sql`
- `supabase/migrations/20260921120000_analytics_retention.sql`
- `supabase/migrations/20260921130000_account_deletion_support.sql`
- `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql`
- `supabase/migrations/20260923100000_signup_profile_fields.sql`
- `supabase/migrations/20260924100000_critical1_lock_settlement_functions.sql`
- `supabase/migrations/20260924110000_critical2_orders_server_only.sql`
- `supabase/migrations/20260924120000_critical3_storage_profiles_rls.sql`
- `supabase/migrations/20260924130000_signup_name_phone_and_backfill.sql`
- `supabase/migrations/20260924140000_auth_rate_limits.sql`
- `supabase/migrations/20260924150000_free_preview.sql`
- `supabase/migrations/20260925100000_phase2_referral_config_and_product_type.sql`
- `supabase/migrations/20260925110000_phase2_wallet_ledger.sql`
- `supabase/migrations/20260925120000_phase2_orders_pricing_and_settlement.sql`
- `supabase/migrations/20260925130000_drop_debug_whoami.sql`
- `supabase/migrations/20260925140000_phase2_single_use_friend_discount.sql`
- `supabase/migrations/20260926100000_batch1_refund_dispute_revoke_access.sql`
- `supabase/migrations/20260926110000_batch1_settle_wallet_and_flags.sql`
- `supabase/migrations/20260926120000_batch1_block_owned_product.sql`
- `supabase/migrations/20260926130000_batch1_hygiene.sql`
- `supabase/migrations/20260927100000_f7_drop_legacy_admin_policies.sql`
- `supabase/migrations/20260927110000_f8_revoke_excess_grants.sql`
- `supabase/migrations/20260927120000_batch3_referral_hardening.sql`
- `supabase/migrations/20260927130000_batch3b_antifarming.sql`
- `supabase/migrations/20260928100000_referral_settings_limits_and_audit.sql`
- `supabase/migrations/20260928110000_referral_off_blocks_wallet.sql`
- `supabase/migrations/20260929100000_high_phone_change_rpc_and_notes_storage.sql`
- `supabase/migrations/20260930100000_medium_db_hardening.sql`
- `supabase/migrations/20260930110000_low_grants_tightening.sql`
- `supabase/migrations/20261001100000_admin_mfa_aal2.sql`
- `supabase/migrations/20261012100000_google_play_ucb.sql`
- `supabase/migrations/20261012110000_google_play_refunds.sql`
- `supabase/migrations/20261012120000_ucb_partial_refunds.sql`
- `supabase/migrations/20261013090000_ucb_atomic_completion.sql`
- `supabase/migrations/20261013100000_wallet_reservations.sql`
- `supabase/migrations/20261013110000_play_void_cursor.sql`
- `supabase/migrations/20261014100000_payment_audit_capture_inbox.sql`
- `supabase/migrations/20261014110000_payment_job_leases.sql`
- `supabase/migrations/20261015100000_play_payment_jobs.sql`
- `supabase/migrations/20261015120000_play_entitlement_order_snapshot.sql`
- `supabase/migrations/20261016090000_free_video_access.sql`
- `supabase/migrations/20261016100000_play_catalog_sync.sql`
- `supabase/migrations/20261018100000_verified_quiz_attempts.sql`
- `supabase/migrations/20261018110000_trusted_note_uploads.sql`
- `supabase/migrations/20261018120000_note_upload_deleted_retry.sql`
- `supabase/migrations/20261018130000_note_pdf_quarantine.sql`
- `supabase/migrations/20261019150000_play_catalog_queue_fences.sql`
- `supabase/migrations/20261019151000_play_duplicate_settlement_result.sql`
- `supabase/migrations/20261020100000_notes_service_reads.sql`
- `supabase/migrations/20261020101000_maintenance_mode_read.sql`
- `supabase/migrations/20261020102000_correct_stale_store_url.sql`
- `supabase/migrations/20261020103000_first_purchase_identity_retention.sql`
- `supabase/migrations/20261020104000_course_wide_content_browsing.sql`
- `supabase/migrations/20261020105000_quiz_answer_read_boundary.sql`
- `supabase/migrations/20261020110000_admin_url_mfa.sql`
- `supabase/migrations/20261104100000_razorpay_snapshot_discount_retry.sql`
- `supabase/migrations/20261104110000_course_year_profile_confirmation.sql`
- `supabase/migrations/20261108100000_notes_choice_checkout.sql`
- `supabase/migrations/20261109100000_billing_settlement_recovery.sql`
- `supabase/migrations/20261109120000_isolated_nonplay_test.sql`
- `supabase/migrations/20261110100000_mv003_razorpay_entitlement_commitment.sql`
- `supabase/migrations/20261110120000_mv005_razorpay_order_transitions.sql`
- `supabase/migrations/20261110130000_mv006_purchase_ownership_guard.sql`
- `supabase/migrations/20261111100000_phase_c_final_mv003_commitment.sql`
- `supabase/migrations/20261111110000_phase_c_play_entitlement_snapshot.sql`
- `supabase/migrations/20261111120000_p0_classified_reversal_commitment.sql`
- `supabase/migrations/20261111175746_all_row_foreign_key_indexes.sql`

### Current website templates/scripts (generated public HTML additionally link-checked)

- `website/_src/faq.mjs`
- `website/_src/icons.mjs`
- `website/_src/pages/404.html`
- `website/_src/pages/about.html`
- `website/_src/pages/account-verified.html`
- `website/_src/pages/contact.html`
- `website/_src/pages/courses.html`
- `website/_src/pages/delete-account.html`
- `website/_src/pages/disclaimer.html`
- `website/_src/pages/download.html`
- `website/_src/pages/faq.html`
- `website/_src/pages/features.html`
- `website/_src/pages/how-it-works.html`
- `website/_src/pages/index.html`
- `website/_src/pages/privacy-policy.html`
- `website/_src/pages/refund-policy.html`
- `website/_src/pages/reset-password.html`
- `website/_src/pages/shipping-policy.html`
- `website/_src/pages/terms.html`

### Website browser scripts

- `website/assets/js/account-verified.js`
- `website/assets/js/auth-common.js`
- `website/assets/js/config.js`
- `website/assets/js/recovery-flow.js`
- `website/assets/js/reset-password.js`
- `website/assets/js/site.js`

### Website build/check scripts

- `website/scripts/build.mjs`
- `website/scripts/check-links.mjs`

### Registered stack routes (conditional payment routes included)

`About`, `ChangePassword`, `ChapterDetails`, `Chapters`, `Contact`, `Downloads`, `EditProfile`, `ForgotPassword`, `Home`, `Login`, `MyPurchases`, `Notes`, `NotificationPreferences`, `Notifications`, `OrderSummary`, `PaymentCheckout`, `PaymentFailed`, `PaymentSuccess`, `PdfViewer`, `Privacy`, `Profile`, `Quiz`, `QuizTests`, `Referral`, `ReferralTerms`, `Register`, `ResetPassword`, `Search`, `SelectCourseYear`, `Settings`, `Splash`, `Store`, `StudyReminder`, `Subjects`, `Terms`, `Videos`, `Years`.

Typed params: `mobile-app/src/types/navigation.ts`; study-route validation: navigation guard modules. Maintenance and forced-update are root gates, not ordinary stack names. Native/web PdfViewer resolve by platform. Recovery deep-link routing is custom and must be tested cold/warm.

### Additional repository areas and explicit review boundaries

| Area | Inventory/review disposition |
| --- | --- |
| App/config/build roots | App.tsx, index.ts, package/locks/TS/babel/metro, app.json/app.config/eas, plugins and ProGuard reviewed; generated ignored Android/iOS is not final artifact |
| Supabase workers/tests/staging/maintenance/releases | Worker and shared contracts typechecked, test scripts inspected, current suites executed; frozen release trees compared as context; no staging/deployment scripts invoked |
| tooling/scripts/.github | ESLint, custom test harnesses, secret scanner, local readiness/CI and operational deployment scripts inspected; no installer/upgrader/deployer invoked |
| website generated HTML and root/github-original-website copies | 17 current website HTML pages locally checked; ten public routes live GET-tested; duplicates not assumed deployed; no generator overwrite performed |
| docs / root audit and release guides | Historical claims reconciled to fresh evidence; native failure, deployment, policy/retention, device/backup/ops material reviewed; archives not independently re-certified |
| assets/vendor/caches/ignored env/signing files | Existence/package selection inspected as applicable; no exhaustive binary/malware audit, no secret values printed, no private key exported |
| .git/.agents/.codex/.aws and IDE control material | Git state and applicable AGENTS guidance inspected; private environment/control directories not dumped or modified; no history cleanup |

Current selected application/config/migration manifest: **545 files**, SHA-256 of UTF-8 sorted `relative-path SP sha256` lines (without trailing newline): `2323ea18676b5384378c942d5486691d0f0d195933de58213d3fe6d428c1ac2c`. Exact temporary manifest: `/tmp/medveda-audit-source-manifest.txt`. This fingerprints selected reviewed input, not ignored EAS credentials, all documentation or a finished build archive.


## Appendix 3. Exact 136-command local execution ledger

Paths in commands are relative to the working directory shown. Node suites are synthetic/source checks (many execute actual transpiled app/handler code); none is a real payment or device test. Test counts are not standardized across custom scripts, so a file with PASS output is counted as one command, not an invented assertion total. The 40-test Deno group and 11-test Python group have explicit framework counts. Additional commands and database boundaries are in G.

| # | Working directory (relative to repository) | Exact command | Result |
| --- | --- | --- | --- |
| 1 | `.` | `node --experimental-strip-types mobile-app/scripts/accessibility-selftest.cjs` | PASS |
| 2 | `.` | `node --experimental-strip-types mobile-app/scripts/android-release-selftest.cjs` | PASS |
| 3 | `.` | `node --experimental-strip-types mobile-app/scripts/auth-recovery-selftest.cjs` | PASS |
| 4 | `.` | `node --experimental-strip-types mobile-app/scripts/auth-state-race-selftest.cjs` | PASS |
| 5 | `.` | `node --experimental-strip-types mobile-app/scripts/checkout-html-selftest.mjs` | PASS |
| 6 | `.` | `node --experimental-strip-types mobile-app/scripts/checkout-security-selftest.cjs` | PASS |
| 7 | `.` | `node --experimental-strip-types mobile-app/scripts/course-state-race-selftest.cjs` | PASS |
| 8 | `.` | `node --experimental-strip-types mobile-app/scripts/course-year-confirmation-selftest.cjs` | PASS |
| 9 | `.` | `node --experimental-strip-types mobile-app/scripts/course-year-picker-race-selftest.cjs` | PASS |
| 10 | `.` | `node --experimental-strip-types mobile-app/scripts/course-year-selection-selftest.cjs` | PASS |
| 11 | `.` | `node --experimental-strip-types mobile-app/scripts/deep-link-selftest.cjs` | PASS |
| 12 | `.` | `node --experimental-strip-types mobile-app/scripts/download-actions-selftest.cjs` | PASS |
| 13 | `.` | `node --experimental-strip-types mobile-app/scripts/firebase-config-selftest.cjs` | PASS |
| 14 | `.` | `node --experimental-strip-types mobile-app/scripts/list-states-selftest.cjs` | PASS |
| 15 | `.` | `node --experimental-strip-types mobile-app/scripts/load-resource-selftest.cjs` | PASS |
| 16 | `.` | `node --experimental-strip-types mobile-app/scripts/login-network-selftest.cjs` | PASS |
| 17 | `.` | `node --experimental-strip-types mobile-app/scripts/login-submit-selftest.cjs` | PASS |
| 18 | `.` | `node --experimental-strip-types mobile-app/scripts/mv004-recovery-selftest.cjs` | PASS |
| 19 | `.` | `node --experimental-strip-types mobile-app/scripts/mv007-billing-boundary-selftest.cjs` | PASS |
| 20 | `.` | `node --experimental-strip-types mobile-app/scripts/mv008-ownership-selftest.cjs` | PASS |
| 21 | `.` | `node --experimental-strip-types mobile-app/scripts/mv009-store-selftest.cjs` | PASS |
| 22 | `.` | `node --experimental-strip-types mobile-app/scripts/mv010-options-selftest.cjs` | PASS |
| 23 | `.` | `node --experimental-strip-types mobile-app/scripts/mv011-accessibility-selftest.cjs` | PASS |
| 24 | `.` | `node --experimental-strip-types mobile-app/scripts/mv012-history-selftest.cjs` | PASS |
| 25 | `.` | `node --experimental-strip-types mobile-app/scripts/navigation-lazy-selftest.cjs` | PASS |
| 26 | `.` | `node --experimental-strip-types mobile-app/scripts/nonplay-test-isolation-selftest.cjs` | PASS |
| 27 | `.` | `node --experimental-strip-types mobile-app/scripts/notes-billing-choice-selftest.cjs` | PASS |
| 28 | `.` | `node --experimental-strip-types mobile-app/scripts/notes-entitlement-selftest.cjs` | PASS |
| 29 | `.` | `node --experimental-strip-types mobile-app/scripts/notes-open-selftest.cjs` | PASS |
| 30 | `.` | `node --experimental-strip-types mobile-app/scripts/notification-account-hook-selftest.cjs` | PASS |
| 31 | `.` | `node --experimental-strip-types mobile-app/scripts/notification-inflight-selftest.cjs` | PASS |
| 32 | `.` | `node --experimental-strip-types mobile-app/scripts/notification-preferences-selftest.cjs` | PASS |
| 33 | `.` | `node --experimental-strip-types mobile-app/scripts/notification-reads-selftest.cjs` | PASS |
| 34 | `.` | `node --experimental-strip-types mobile-app/scripts/notification-routing-selftest.cjs` | PASS |
| 35 | `.` | `node --experimental-strip-types mobile-app/scripts/offline-download-selftest.cjs` | PASS |
| 36 | `.` | `node --experimental-strip-types mobile-app/scripts/offline-license-storage-selftest.cjs` | PASS |
| 37 | `.` | `node --experimental-strip-types mobile-app/scripts/offline-owner-selftest.cjs` | PASS |
| 38 | `.` | `node --experimental-strip-types mobile-app/scripts/p2-registration-selftest.cjs` | PASS |
| 39 | `.` | `node --experimental-strip-types mobile-app/scripts/password-policy-selftest.mjs` | PASS |
| 40 | `.` | `node --experimental-strip-types mobile-app/scripts/password-recovery.test.cjs` | PASS |
| 41 | `.` | `node --experimental-strip-types mobile-app/scripts/payment-poll-selftest.cjs` | PASS |
| 42 | `.` | `node --experimental-strip-types mobile-app/scripts/payment-provider-selftest.cjs` | PASS |
| 43 | `.` | `node --experimental-strip-types mobile-app/scripts/payment-request-selftest.cjs` | PASS |
| 44 | `.` | `node --experimental-strip-types mobile-app/scripts/payment-routing-selftest.cjs` | PASS |
| 45 | `.` | `node --experimental-strip-types mobile-app/scripts/payment-success-owner-selftest.cjs` | PASS |
| 46 | `.` | `node --experimental-strip-types mobile-app/scripts/payment-summary-selftest.cjs` | PASS |
| 47 | `.` | `node --experimental-strip-types mobile-app/scripts/payment-verdict-selftest.cjs` | PASS |
| 48 | `.` | `node --experimental-strip-types mobile-app/scripts/pdf-lifecycle-selftest.cjs` | PASS |
| 49 | `.` | `node --experimental-strip-types mobile-app/scripts/pdf-remote-retry-selftest.cjs` | PASS |
| 50 | `.` | `node --experimental-strip-types mobile-app/scripts/play-catalog-contract-selftest.cjs` | PASS |
| 51 | `.` | `node --experimental-strip-types mobile-app/scripts/profile-save-selftest.cjs` | PASS |
| 52 | `.` | `node --experimental-strip-types mobile-app/scripts/purchases-selftest.cjs` | PASS |
| 53 | `.` | `node --experimental-strip-types mobile-app/scripts/purchases-unavailable-ui-selftest.cjs` | PASS |
| 54 | `.` | `node --experimental-strip-types mobile-app/scripts/push-lifecycle-selftest.cjs` | PASS |
| 55 | `.` | `node --experimental-strip-types mobile-app/scripts/quiz-editing-selftest.cjs` | PASS |
| 56 | `.` | `node --experimental-strip-types mobile-app/scripts/quiz-hooks-selftest.cjs` | PASS |
| 57 | `.` | `node --experimental-strip-types mobile-app/scripts/quiz-input-selftest.cjs` | PASS |
| 58 | `.` | `node --experimental-strip-types mobile-app/scripts/razorpay-internal-test-selftest.cjs` | FAIL (exit 1) |
| 59 | `.` | `node --experimental-strip-types mobile-app/scripts/razorpay-live-testing-selftest.cjs` | PASS |
| 60 | `.` | `node --experimental-strip-types mobile-app/scripts/readiness-selftest.cjs` | PASS |
| 61 | `.` | `node --experimental-strip-types mobile-app/scripts/release-payments-disabled-selftest.cjs` | PASS |
| 62 | `.` | `node --experimental-strip-types mobile-app/scripts/route-validation-selftest.cjs` | PASS |
| 63 | `.` | `node --experimental-strip-types mobile-app/scripts/same-project-build-selftest.cjs` | PASS |
| 64 | `.` | `node --experimental-strip-types mobile-app/scripts/search-cache-selftest.cjs` | PASS |
| 65 | `.` | `node --experimental-strip-types mobile-app/scripts/search-lazy-hook-selftest.cjs` | PASS |
| 66 | `.` | `node --experimental-strip-types mobile-app/scripts/search-pagination-selftest.cjs` | PASS |
| 67 | `.` | `node --experimental-strip-types mobile-app/scripts/sentry-config-selftest.cjs` | PASS |
| 68 | `.` | `node --experimental-strip-types mobile-app/scripts/staging-build-selftest.cjs` | FAIL (exit 1) |
| 69 | `.` | `node --experimental-strip-types mobile-app/scripts/startup-availability-selftest.cjs` | PASS |
| 70 | `.` | `node --experimental-strip-types mobile-app/scripts/sync-concurrency-selftest.cjs` | PASS |
| 71 | `.` | `node --experimental-strip-types mobile-app/scripts/verify-signature-selftest.js` | PASS |
| 72 | `.` | `node --experimental-strip-types mobile-app/scripts/video-data-selftest.cjs` | PASS |
| 73 | `.` | `node --experimental-strip-types mobile-app/scripts/video-link-selftest.cjs` | PASS |
| 74 | `.` | `node --experimental-strip-types mobile-app/scripts/video-tap-selftest.cjs` | PASS |
| 75 | `.` | `node --experimental-strip-types mobile-app/scripts/years-inflight-selftest.cjs` | PASS |
| 76 | `.` | `node --experimental-strip-types admin-panel/scripts/auth-race-selftest.cjs` | PASS |
| 77 | `.` | `node --experimental-strip-types admin-panel/scripts/batch2-selftest.cjs` | PASS |
| 78 | `.` | `node --experimental-strip-types admin-panel/scripts/list-retry-selftest.cjs` | PASS |
| 79 | `.` | `node --experimental-strip-types admin-panel/scripts/mutation-selftest.cjs` | PASS |
| 80 | `.` | `node --experimental-strip-types admin-panel/scripts/p1-financial-ui-selftest.cjs` | PASS |
| 81 | `.` | `node --experimental-strip-types admin-panel/scripts/pagination-selftest.cjs` | PASS |
| 82 | `.` | `node --experimental-strip-types admin-panel/scripts/pdf-validation-selftest.mjs` | PASS |
| 83 | `.` | `node --experimental-strip-types admin-panel/scripts/play-pricing-diagnostic-selftest.cjs` | PASS |
| 84 | `.` | `node --experimental-strip-types admin-panel/scripts/play-service-account-diagnostic-selftest.cjs` | PASS |
| 85 | `.` | `node --experimental-strip-types admin-panel/scripts/request-race-selftest.cjs` | PASS |
| 86 | `.` | `node --experimental-strip-types admin-panel/scripts/settings-save-selftest.cjs` | PASS |
| 87 | `.` | `node --experimental-strip-types admin-panel/scripts/upload-error-selftest.mjs` | PASS |
| 88 | `.` | `node --experimental-strip-types scripts/p2-admin-labels-selftest.cjs` | PASS |
| 89 | `.` | `node --experimental-strip-types scripts/p2-performance-selftest.cjs` | PASS |
| 90 | `.` | `node --experimental-strip-types scripts/p2-quality-selftest.cjs` | PASS |
| 91 | `.` | `node --experimental-strip-types scripts/secret-scan-selftest.mjs` | PASS |
| 92 | `.` | `node --experimental-strip-types supabase/tests/b-to-c-reporting-selftest.cjs` | PASS |
| 93 | `.` | `node --experimental-strip-types supabase/tests/b-to-c-worker-selftest.cjs` | PASS |
| 94 | `.` | `node --experimental-strip-types supabase/tests/billing-recovery-worker-selftest.cjs` | PASS |
| 95 | `.` | `node --experimental-strip-types supabase/tests/compensation-worker-selftest.cjs` | PASS |
| 96 | `.` | `node --experimental-strip-types supabase/tests/delete-account-rate-limit-selftest.cjs` | PASS |
| 97 | `.` | `node --experimental-strip-types supabase/tests/diagnostic-auth-selftest.cjs` | PASS |
| 98 | `.` | `node --experimental-strip-types supabase/tests/f10-coverage-selftest.cjs` | PASS |
| 99 | `.` | `node --experimental-strip-types supabase/tests/google-reporting-selftest.cjs` | PASS |
| 100 | `.` | `node --experimental-strip-types supabase/tests/identity-retention-selftest.cjs` | PASS |
| 101 | `.` | `node --experimental-strip-types supabase/tests/mv004-recovery-selftest.cjs` | PASS |
| 102 | `.` | `node --experimental-strip-types supabase/tests/mv005-create-order-selftest.cjs` | PASS |
| 103 | `.` | `node --experimental-strip-types supabase/tests/mv006-restoration-selftest.cjs` | PASS |
| 104 | `.` | `node --experimental-strip-types supabase/tests/notes-choice-order-selftest.cjs` | PASS |
| 105 | `.` | `node --experimental-strip-types supabase/tests/p0-notification-selftest.cjs` | PASS |
| 106 | `.` | `node --experimental-strip-types supabase/tests/p0-reversal-selftest.cjs` | PASS |
| 107 | `.` | `node --experimental-strip-types supabase/tests/p1-push-delivery-selftest.cjs` | PASS |
| 108 | `.` | `node --experimental-strip-types supabase/tests/phase-b-recovery-selftest.cjs` | PASS |
| 109 | `.` | `node --experimental-strip-types supabase/tests/phase-c-gates-selftest.cjs` | PASS |
| 110 | `.` | `node --experimental-strip-types supabase/tests/play-body-selftest.cjs` | PASS |
| 111 | `.` | `node --experimental-strip-types supabase/tests/play-catalog-creation-selftest.cjs` | PASS |
| 112 | `.` | `node --experimental-strip-types supabase/tests/play-catalog-worker-selftest.cjs` | PASS |
| 113 | `.` | `node --experimental-strip-types supabase/tests/play-consumption-selftest.cjs` | PASS |
| 114 | `.` | `node --experimental-strip-types supabase/tests/play-order-selftest.cjs` | PASS |
| 115 | `.` | `node --experimental-strip-types supabase/tests/play-payment-worker-selftest.cjs` | PASS |
| 116 | `.` | `node --experimental-strip-types supabase/tests/play-reconcile-fairness-selftest.cjs` | PASS |
| 117 | `.` | `node --experimental-strip-types supabase/tests/play-service-account-diagnostic-selftest.cjs` | PASS |
| 118 | `.` | `node --experimental-strip-types supabase/tests/play-verification-selftest.cjs` | PASS |
| 119 | `.` | `node --experimental-strip-types supabase/tests/razorpay-routing-selftest.cjs` | PASS |
| 120 | `.` | `node --experimental-strip-types supabase/tests/razorpay-security-selftest.cjs` | PASS |
| 121 | `.` | `node --experimental-strip-types supabase/tests/readiness-migrations-selftest.cjs` | PASS |
| 122 | `.` | `node --experimental-strip-types supabase/tests/recovery-selftest.cjs` | PASS |
| 123 | `.` | `node --experimental-strip-types supabase/tests/settle-timestamp-selftest.cjs` | PASS |
| 124 | `mobile-app` | `node node_modules/typescript/bin/tsc --noEmit --incremental false` | PASS |
| 125 | `admin-panel` | `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --incremental false` | PASS |
| 126 | `admin-panel` | `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --incremental false` | PASS |
| 127 | `.` | `node tooling/node_modules/eslint/bin/eslint.js mobile-app/App.tsx mobile-app/src admin-panel/src` | PASS |
| 128 | `.` | `node website/scripts/check-links.mjs` | PASS |
| 129 | `.` | `python3 mobile-app/scripts/android-bundle-validator-selftest.py` | PASS |
| 130 | `.` | `deno check --cached-only --config supabase/deno.json supabase/functions/attach-external-token/index.ts supabase/functions/create-order/index.ts supabase/functions/create-order-nonplay-test/index.ts supabase/functions/create-order-play-choice/index.ts supabase/functions/create-play-order/index.ts supabase/functions/delete-account/index.ts supabase/functions/diagnose-play-matrix/index.ts supabase/functions/diagnose-play-pricing/index.ts supabase/functions/diagnose-play-service-account/index.ts supabase/functions/get-note-url/index.ts supabase/functions/get-note-url-nonplay-test/index.ts supabase/functions/get-video-url/index.ts supabase/functions/login-with-mobile/index.ts supabase/functions/nonplay-test-catalog/index.ts supabase/functions/play-payment-worker/index.ts supabase/functions/razorpay-webhook/index.ts supabase/functions/razorpay-webhook-nonplay-test/index.ts supabase/functions/report-external-transaction/index.ts supabase/functions/request-password-reset-by-mobile/index.ts supabase/functions/send-push-notification/index.ts supabase/functions/sync-play-catalog/index.ts supabase/functions/upload-note-pdf/index.ts supabase/functions/verify-payment/index.ts supabase/functions/verify-payment-nonplay-test/index.ts supabase/functions/verify-play-purchase/index.ts supabase/workers/validate-note-pdf.ts` | PASS |
| 131 | `.` | `deno test --cached-only --config supabase/deno.json --allow-read --allow-env supabase/functions/diagnose-play-pricing/handler_test.ts supabase/functions/diagnose-play-pricing/sanitize_test.ts supabase/tests/play_catalog_api_test.ts supabase/tests/play_catalog_unit_test.ts supabase/tests/play_diagnostic_sanitization_review_test.ts supabase/tests/note-pdf-hash-test.ts supabase/tests/pdf-validation-test.ts supabase/tests/quarantine-worker-test.ts supabase/tests/upload-body-test.ts supabase/tests/upload-note-pdf-test.ts` | PASS |
| 132 | `.` | `deno run --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/payment-backlog-load-selftest.ts` | PASS |
| 133 | `.` | `deno run --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/payment-gate-selftest.ts` | PASS |
| 134 | `.` | `deno run --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/razorpay-env-selftest.ts` | PASS |
| 135 | `.` | `deno run --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/razorpay-refund-selftest.ts` | PASS |
| 136 | `.` | `deno run --cached-only --config supabase/deno.json --allow-read --allow-env supabase/tests/razorpay-order-recovery-selftest.ts` | PASS |

## Appendix 4. Live read-only evidence recap

### Deployed functions — fresh inventory

| Function | Version | Status | JWT gateway | SHA-256 |
| --- | --- | --- | --- | --- |
| `create-order` | 23 | ACTIVE | True | `0ae5361b0c38b0c4d91f6817d637a2d5ed81d0e3ec9868130634bc858b727a0c` |
| `create-play-order` | 3 | ACTIVE | True | `741dca94778da063a30abe7d2e196d05e9d06d4fc5d03b6702d020f3175206c2` |
| `delete-account` | 19 | ACTIVE | True | `d2422e8b7f719c425cdcca3735097a9266c99c97ef9e375526af61a2b8150f55` |
| `diagnose-play-matrix` | 3 | ACTIVE | True | `559d11e203ac8c04ec67ea77e63457143ba4b13a7144ce1237550dff03aa16ea` |
| `diagnose-play-pricing` | 2 | ACTIVE | True | `7a993631b80d8836e70cca6da913ad3ec5255cfefb322b8a7ed9b3168207dff4` |
| `diagnose-play-service-account` | 2 | ACTIVE | False | `09630d382e0222321ea892208b25a41e407d4ece72e01b6f99eee1262a46c577` |
| `get-note-url` | 20 | ACTIVE | True | `8ff16efbb4c7f3de042cce2987f1941796f88ac5919b0851161bfe8e2a4543d6` |
| `get-video-url` | 20 | ACTIVE | True | `e7467d99db3e4fbbee543c54ccc1e7f27aa63410376cd1063ea4a9e12aaa20e2` |
| `login-with-mobile` | 18 | ACTIVE | False | `d84c72bd1455c5616d319860153b0345ac68d693f57761dfa95151eae8ed020d` |
| `play-payment-worker` | 3 | ACTIVE | False | `27c88fc007237798492b4b659652b3f7bef8135c9476ffdc3b412e40b353285a` |
| `razorpay-webhook` | 51 | ACTIVE | False | `38b92030acc7ace0e8188b5dcbc0d9b6c0b3fc7bbf22b0a56e89a74cd5119252` |
| `request-password-reset-by-mobile` | 18 | ACTIVE | False | `5c29e7bfb3d38fff47d63328c534af9728861b88240bd2db1cc7b75c838d7d60` |
| `send-push-notification` | 51 | ACTIVE | False | `30b34655f50e47674ff32374596ba69e375e2e75d99658f8dd5ed3b2efa33ff1` |
| `sync-play-catalog` | 6 | ACTIVE | False | `047fdb4f69edfa83af1c0314b1a716158b08b655ec95ae0db56ca28c7a4efef5` |
| `upload-note-pdf` | 3 | ACTIVE | False | `8b51d39dbd79852d383450443590afac754a52089f55975ab7371efe08f492af` |
| `verify-payment` | 69 | ACTIVE | False | `ffe779d15b84698acc416aa90af0f33fbb7757952f2636d06bf6abc07e4effcb` |
| `verify-play-purchase` | 3 | ACTIVE | True | `6dd4a7d25fb53d39d00ed56d3104825cb851336dedaaf5bf64b329ebe8740d4f` |

All 17 bundles were freshly downloaded for source comparison. JWT gateway=false requires an endpoint-specific verified caller, provider signature or secret gate; it does not mean public mutation is intended. Source inspection and safe negative guards do not certify configured secrets or successful external integration.

### Live guard requests (no order/payment identifiers)

| Function / case | Observed | Expected |
| --- | --- | --- |
| verify-payment GET method-guard | 405 | 405 |
| verify-payment POST empty-body | 400 | 400 |
| razorpay-webhook GET method-guard | 405 | 405 |
| razorpay-webhook POST empty-body | 400 | 400 |
| razorpay-webhook POST forged-signature | 401 | 401 |

### Public links — actual read-only GET

| URL | HTTP | Scope of conclusion |
| --- | --- | --- |
| https://www.medveda.in/ | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://www.medveda.in/privacy-policy | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://www.medveda.in/terms | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://www.medveda.in/refund-policy | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://www.medveda.in/shipping-policy | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://www.medveda.in/disclaimer | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://www.medveda.in/delete-account | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://www.medveda.in/contact | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://www.medveda.in/reset-password | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://www.medveda.in/account-verified | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://play.google.com/store/apps/details?id=in.medveda.app | 404 | Public listing unavailable from audit request; closed/country availability not determined |
| https://youtube.com/@thedisturbingmedico | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| https://t.me/medveda_26 | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| Configured Instagram profile (handle omitted) | 200 | HTTP reachability only; native handoff/ownership/action unverified |
| Configured WhatsApp endpoint (business number omitted) | 200 | HTTP reachability only; native handoff/ownership/action unverified |

Ten website pages returned CSP/HSTS; both auth bridge paths returned no-referrer/no-store. Search/web-fetch access initially failed, so final reachability comes from the successful direct HTTP requests above, not from search snippets. A social HTTP200 can be a login/interstitial and does not establish channel ownership or native application resolution. No email/message was sent.

