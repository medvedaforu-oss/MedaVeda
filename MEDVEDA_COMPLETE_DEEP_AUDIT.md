# MedVeda complete deep audit

**Audit date:** 2026-10-18 UTC. **Mode:** read only except this report and temporary Metro output under `/tmp`. **Evidence boundary:** repository at audit time, local checks, and two previously captured read-only production snapshots at 07:39–07:40 UTC. The production snapshots are dated evidence, not a live query performed during this audit. No customer account, purchase, database write, deployment, AAB upload, or Play Console change was made. Existing uncommitted work was preserved.

## A. Executive Summary

**Assessment: NO-GO for Play Internal Testing distribution, closed testing, and production.** Further isolated local and staging testing can proceed. No confirmed P0 payment bypass was found in the inspected source. Play purchase settlement requires Google API verification before the service-role `settle_play_purchase` RPC; Razorpay settlement rechecks a captured provider payment. These source protections still require live RLS, deployed-code, and device verification.

The 07:40 UTC production snapshot recorded all four Play cron jobs inactive, no verified price tiers, and a ₹1.00 catalog row pending with zero attempts. The 07:39 snapshot had 13 active Edge Functions while source has 16, and lacked the three migrations dated 2026-10-18. Current live state is **not verified**. The reported later `Google Play API 403` and SKU `notes_1_00_v_066f5677fba745d696d1504b7600f8f7` cannot be tied to an API operation from the available logs: the worker discards the Google response body and operation name. A 403 is classified as terminal until an admin explicitly retries it.

**Confirmed issue counts:** P0 0, P1 4, P2 4, P3 1. These count source defects and dated operational findings, not unverified hypotheses. The most important gaps are a current Play Console/catalog readback, an installed AAB and licensed-tester checkout, live RLS negative tests, and a staging PostgreSQL suite.

## B. Project Architecture

| Area | Implementation and dependencies | Main flow |
|---|---|---|
| Android app | `mobile-app`, Expo 57, React Native 0.86, React 19, `expo-iap` 3.4.4, Supabase JS, React Navigation, SQLite, PDF reader, notifications | `AppEntry` → `AppNavigator` → auth, catalog, notes, video, quiz, purchases, offline downloads, search, settings |
| Admin | `admin-panel`, Vite/React/TypeScript, Supabase JS | Auth → `am_i_admin()` → admin RLS/RPC → courses, years, subjects, chapters, notes, videos, products, quiz, users, orders, analytics, settings, referrals, notifications |
| Backend | `supabase/functions` (16 HTTP functions), `_shared` helpers, one PDF validator worker | Authenticated student/admin calls, secret-authenticated cron functions, signed Razorpay webhook, Google/Razorpay provider APIs |
| Database | 55 SQL migrations, PostgreSQL/RLS, Storage | profiles → catalog/content → orders/payments/purchases → entitlement RPCs → signed PDF URL; quiz answers → server-scored attempts |
| Website | `website` static generator and 17 built pages; `github-original-website` legacy copy | Legal/help/account deletion/reset pages; no website checkout implementation found in current `website` source |
| Delivery | EAS profiles and GitHub Actions | Android `in.medveda.app`; production/internal-testing profiles select Play, Razorpay distribution profile selects Razorpay |

Play flow: `usePurchase.buy` → `PlayBillingScreen.prepare` → `create-play-order` → `create_play_order` (price/SKU snapshot) → Android `fetchProducts` and exact INR offer check → `requestPurchase` → `verify-play-purchase` → Google purchase GET/V2 validation → `settle_play_purchase` → payment/purchase row → `get-note-url` → private Storage signed URL. Razorpay flow: `OrderSummary` → `create-order` → Razorpay WebView → `verify-payment` or signed webhook → provider readback → `settle_razorpay_payment` → purchase. Free videos use `get-video-url` and `user_can_access_video`, without purchase gating.

## C. Audit Coverage Matrix

| Component | Status | Evidence/limit |
|---|---|---|
| Mobile navigation, payment, content, auth, quiz, offline | Inspected; static tests | TypeScript, Metro export, route/service/RPC trace; no device |
| Admin product, content, auth, upload, notification paths | Inspected; static tests | TypeScript and selftests; no browser session |
| All 16 Edge Function entry points and shared payment/catalog helpers | Inventoried; type checked | `deno check` passed; deployed state only from dated snapshot |
| SQL migrations, RLS, storage, functions | Inspected; production snapshot | 55 migration files; no live SQL connection or scratch PostgreSQL |
| Google Play catalog, purchase, refunds | Static and mock tested | No Console or licensed tester; reported 403 lacks response detail |
| Razorpay | Static and mock tested | No real transaction; website checkout not established from current source |
| Website/legal | Static test | 17 pages pass link checker; current hosted version unverified |
| Release artifact | Blocked | No APK/AAB or native Android project found; manifest/signature cannot be inspected |
| CI/dependencies/secrets | Inspected | Local offline checks; remote audit freshness unverified |

## D. Complete Codebase Findings

The mobile source type-checks and exports an Android Hermes bundle. Admin source type-checks and its selftests pass. The route guard uses the build-time payment provider, with Play as default. No source-level automatic Razorpay fallback was found after a Play error. The Play purchase service has no call site for `restorePlayPurchases()` outside its definition (MV-03). Download retry/resume reuses a signed URL that expires after 120 seconds (MV-05). The current quiz uses server-scored attempts, while the legacy score table remains client-writable (MV-07).

The repository has no mobile or admin ESLint script or CI lint step (MV-09). `TODO/FIXME/HACK` scan of source returned no actionable marker; comments and existing report prose should not be treated as defects. A source secret-pattern scan found two marker-literal matches in the Google service-account parser and a test fixture, not exposed keys (MV-08). Environment files and values were not copied into this report.

## E. Google Play Billing Deep Audit

`expo-iap` is configured as an Expo plugin. Android identity is `in.medveda.app`. The client installs purchase listeners once per JS process and retries a failed connection. It requests a single one-time in-app SKU and one standard BUY offer, checks INR microprice against the server order, and supplies hashed user/order identifiers. A pending purchase is not settled. Cancellation closes the screen. The backend validates JWT/user/order/product/SKU/token, queries Google's V2 purchase for new orders, checks state, SKU, BUY option, no offer, quantity, refundable state, India, account and order hashes, and completion time before calling the service-only settlement RPC. Existing pre-option orders have a V1 recovery branch. SQL locks the order, rejects token reuse across orders, and creates the purchase atomically. Consumption follows settlement; failed consumption is queued for a worker. Voids/refunds are handled by `play-payment-worker` and `reverse_play_payment`. This establishes a source-level server-verification invariant, **not** a live proof.

Catalog synchronization: eligible paid-note prices queue in `play_price_sync`; `sync-play-catalog` claims one job, calls Google GET, possibly `pricing:convertRegionPrices`, PATCH create/update, activation, GET readback, and only then marks a tier verified. [Google's GET](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/get), [PATCH](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/patch), [price conversion](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization/convertRegionPrices), and [activation](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts.purchaseOptions/batchUpdateStates?hl=en) documentation support the endpoint forms used in source. Google API scope is `androidpublisher`; the code obtains a service-account OAuth token. OAuth scope presence does **not** prove Play Console app permissions.

**403 investigation:** The first possible Google operation is product GET. Subsequent possibilities are convert-price POST, PATCH, activation POST, or GET readback. `googleRequest` throws only status; `sync-play-catalog` stores `Google Play API 403`, without operation, Google error reason, or request ID. Therefore the exact failing operation, permission, and cause are **unconfirmed**. The code treats 403 as nonretryable, and `fail_play_price_sync` marks it `failed`; manual `retry_play_price_sync` can requeue after permissions are corrected. The 07:40 snapshot predates the reported failure and shows price ₹1.00 **pending, attempts 0**, no verified tiers, and inactive Play cron. It does not prove the later SKU's current row state. Do not attribute the 403 solely to an invitation until the Google error payload and app-level permissions are checked. No AAB means Billing permission and embedded BillingClient version in the final artifact are **not verified**.

## F. Razorpay and Android Payment Routing

Current `usePurchase` selects `PlayBilling` for Play builds and `OrderSummary` for Razorpay builds. `AppNavigator` registers the Razorpay summary/checkout screens only for the Razorpay provider. `OrderSummary.pay` also rejects non-Razorpay builds. Production and internal-testing EAS profiles set `MEDVEDA_PAYMENT_PROVIDER=play`, and `app.config.js` rejects a Razorpay provider when `EAS_BUILD_PROFILE` is production or internal-testing. The separate `razorpay-distribution` APK profile explicitly selects Razorpay, and the Razorpay backend remains present. No Play failure branch falls back to Razorpay in current source.

The reported Android Razorpay success can be explained by a legacy build or dedicated Razorpay distribution build, or by an existing Razorpay entitlement visible in a later Play build; none is proven without the installed package's build metadata and order/payment provider rows. A successful Razorpay transaction can create a valid purchase independently of Play catalog readiness, because these are separate server paths. Server `create-order` and `verify-payment` use `paymentGate`/UCB settings, but current live settings and installed headers were not checked. Preserve website Razorpay and approved prices. Do not infer Play policy violation from this report alone; verify the actual Play-distributed AAB and tester flow.

## G. Database and RLS Audit

The 07:39 UTC read-only snapshot lists 51 applied migrations, ending at `20261016100000`; local source has 55, including four 2026-10-18 migrations (verified quiz attempts, trusted uploads, deleted-upload retry, PDF quarantine). The dated snapshot lists 43 RLS table entries, a private `notes` bucket, public `thumbnails`, 28 notes, 4 videos, 1 quiz, 10 products, and 25 profiles. These counts and states can change. It reports PITR disabled; daily-backup policy and restore capability were not established. The operational snapshot lists 25 storage objects without an exact note reference, **candidates only**: versions/quarantine/other legal objects require inspection before any deletion.

Source policies restrict orders/purchases to owner or admin; service-role-only Play settlement/create-order functions are explicitly revoked from anon/authenticated. Admin checks use `admins.id = auth.uid()`, optionally AAL2. `verified_quiz_attempts` is read-only to clients and inserts through a security-definer scoring RPC. `user_can_access_note` requires a nonblocked profile, active note, and free preview/admin/successful purchase; Storage `notes` is private in the snapshot. Source `notes` metadata includes `pdf_url`, but a public-style path is not a public download from a private bucket. Live anonymous/authenticated negative tests, actual grants/function definitions, current migrations, indexes, cron schedules, backup restore, and row anomalies remain **not verified**. No unauthorized SQL was executed.

## H. Edge Function Inventory and Findings

The `verify_jwt` column is source configuration, not a fresh deployed setting. All paths are `supabase/functions/<name>/index.ts`.

| Function | Caller and purpose | Auth/privileged operation | Snapshot deployment / result |
|---|---|---|---|
| `create-order` | Razorpay client order | JWT; service RPC/order/provider call | ACTIVE; static inspected |
| `verify-payment` | Razorpay callback/recovery | HMAC+provider readback or owner JWT; settlement | ACTIVE; mock recovery tested |
| `razorpay-webhook` | Provider webhook | Raw-body HMAC; settlement/refund/dispute | ACTIVE; static inspected |
| `create-play-order` | Play client | JWT; service `create_play_order` | ACTIVE; static inspected |
| `verify-play-purchase` | Play client | JWT; Google GET then service settlement | ACTIVE; negative validation tested |
| `sync-play-catalog` | Cron | 32+ character shared secret; catalog Google API/RPC | ACTIVE; 403 stage unknown |
| `play-payment-worker` | Cron | 32+ character shared secret; consume/reconcile/void | ACTIVE; mocks pass, cron inactive at snapshot |
| `attach-external-token` | UCB client flow | JWT; order binding | Absent in snapshot; current need/deployment unknown |
| `report-external-transaction` | UCB cron | Shared secret; Google external reporting | Absent in snapshot; current need/deployment unknown |
| `get-note-url` | Notes/PDF screens | JWT; entitlement RPC; private signed URL | ACTIVE; live denial not tested |
| `get-video-url` | Video screen | JWT; free active-video RPC | ACTIVE; live playback not tested |
| `upload-note-pdf` | Admin | Function JWT, admin/MFA, validated/quarantined upload | Absent in snapshot; local work uncommitted |
| `delete-account` | Student | JWT; own-account deletion | ACTIVE; live deletion intentionally not tested |
| `login-with-mobile` | Prelogin | No gateway JWT; password checked by Supabase Auth | ACTIVE; live auth not tested |
| `request-password-reset-by-mobile` | Prelogin | No gateway JWT; sends owner reset mail | ACTIVE; live mail not tested |
| `send-push-notification` | Admin | Function JWT/admin check; Expo push | ACTIVE; live push not tested |

Function-wide `deno check` passed for all 16 plus the PDF validator. Input bounds, rate limits, and idempotency vary by function; the table does not claim live execution. Shared secrets required by name include `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`, `PLAY_CATALOG_CRON_SECRET`, `PLAY_PAYMENT_CRON_SECRET`, Supabase service role credentials, Razorpay keys/webhook secret, and UCB reporting secret where enabled. Secret values and deployment presence were not inspected.

Additional per-function control inventory (all functions require Supabase URL/service-role configuration through the shared admin client; `verify_jwt=false` functions perform their own authentication as described above):

| Function | Input / database / external dependency | Rate, retry, error, and test conclusion |
|---|---|---|
| `attach-external-token` | Order/token binding through `attach_ucb_external_token` | User/order check and rate limit; no live call; **NOT VERIFIED** |
| `create-order` | Product ID and optional UCB choice; `create_priced_order`, Razorpay order API | User limit; order fails on provider error; mock paths only; **NOT VERIFIED live** |
| `create-play-order` | Product ID; product eligibility and `create_play_order` | User limit; returns pending-tier code; **NOT VERIFIED live** |
| `delete-account` | Caller identity; `erase_user_data`/Auth deletion | State changing; intentionally not called; **NOT VERIFIED** |
| `get-note-url` | Note ID; `user_can_access_note`, Storage signer | User limit and 120-second URL; live denial **NOT VERIFIED** |
| `get-video-url` | Video ID; `user_can_access_video`, video URL | User limit; live playback **NOT VERIFIED** |
| `login-with-mobile` | Mobile/password; profile lookup and Supabase Auth | IP/account limiting in source; real auth **NOT VERIFIED** |
| `play-payment-worker` | `phase` enum; jobs, Google purchase/void APIs | Bounded concurrency/leases, retry/park; mock cases PASS; live cron **NOT VERIFIED** |
| `razorpay-webhook` | Raw signed event; provider event/settlement RPCs | HMAC and idempotent event handling; live webhook **NOT VERIFIED** |
| `report-external-transaction` | Secret-authenticated queue/void phases; Google external transactions | Queue leases/retry; absent in snapshot; **NOT VERIFIED** |
| `request-password-reset-by-mobile` | Mobile; profile/Auth mail request | Rate limited, neutral response; delivery **NOT VERIFIED** |
| `send-push-notification` | Admin notification request; admin/settings/tokens and Expo | Admin check, rate limit; delivery **NOT VERIFIED** |
| `sync-play-catalog` | Cron secret; queue/RPCs and Google catalog API | One job/call, lease, terminal 403; local catalog unit tests PASS; live stage **NOT VERIFIED** |
| `upload-note-pdf` | Admin multipart or quarantine JSON; storage/validation requests | Admin/MFA check, size/hash/rate checks; 17 local PDF/worker cases PASS; absent in snapshot |
| `verify-payment` | Signed callback or owner recovery; Razorpay readback/settlement | Rate limited, idempotent RPC; mock unauthorized recovery PASS; live **NOT VERIFIED** |
| `verify-play-purchase` | Order, product, token; Google GET and settlement RPC | User limit, token/order binding, server verification; unit negatives PASS; live **NOT VERIFIED** |

Only the Google helper explicitly applies a 15-second HTTP timeout in the inspected payment path. Other function/provider timeouts, hosted rate-limit persistence, CORS preflight behavior, and deployed environment variables require staging or hosted verification; none was inferred from a function's existence.

## I. Authentication and Security Audit

Mobile Supabase session handling, secure-store adapter, registration/login/reset, blocked-user sign-out, profile/admin checks, and deletion entry points were reviewed. Admin UI asks `am_i_admin`; database policies/RPCs also check it, so a hidden UI button is not the authorization boundary. MFA is conditional on `admin_settings.require_mfa`; the snapshot did not establish whether it was enabled. Backend payments obtain identity from verified JWT, not body `user_id`. Source HTTPS endpoints and disabled Android cleartext traffic are configured; final native manifest is unavailable. No production-user login, password reset email, device token, deep-link redirect, storage bypass, rate-limit abuse, or account deletion test was performed. The CI secret regex produced two false-positive literals; it did not reveal credentials.

## J. Notes, PDFs, Videos and Entitlements

Paid note listing → purchase check → `get-note-url` → 120-second private Storage URL is implemented. The server is the access boundary even when the mobile list shows an unlocked card. Downloaded PDFs are stored in app document storage for offline use; sign-out/account switch purges them, but a refund while the same user remains signed in does not recheck local files (MV-06). Retry/resume after signed-URL expiry can fail until the URL is refreshed (MV-05). Free videos are deliberately purchase-independent in the latest `user_can_access_video` migration. Video URL availability and playback on a device are unverified. Do not make free videos paid.

## K. Admin Panel Audit

Admin routes/services cover content hierarchy, uploads, videos, product prices, billing status and retry, orders, users, quiz, referrals, notifications, analytics, and settings. Product writes go through admin RLS. Admin billing status reads `admin_play_billing_status`; retry calls `retry_play_price_sync`. Price propagation is: `productService.updateProduct` → product trigger → `play_price_sync` → cron worker → Google API/readback → verified tier → Play product discovery → purchase/settlement. The dated snapshot blocks this at inactive cron and missing tier. Browser rendering, actual admin AAL2 session, file upload, price edit, and live Google propagation were not tested; approved prices were untouched.

## L. Quiz and Other Feature Audits

The latest local SQL adds `submit_quiz_attempt`: it validates owner/profile, revision, answer length/indexes, computes score from server questions, and makes an attempt ID idempotent. Mobile queues answers offline and distinguishes verified, stale, rejected, and legacy results; stats use verified scores. The dated production snapshot lacks this migration, so deployed quiz verification cannot be claimed. Legacy `quiz_scores` retains own-row client writes (MV-07), though current stats use it only for a legacy count. Search, downloads, reminders, notifications, referral wallet, and profile flows were mapped at service/repository level; device and live-backend behavior remain unverified.

## M. Internal Testing Results

Environment: local Linux workspace, Node 22.23.1, Deno, installed `node_modules`; network and PostgreSQL service unavailable. PASS means the stated local check passed only.

| Exact command | Result | Evidence / limit |
|---|---|---|
| `mobile-app/node_modules/.bin/tsc --noEmit -p mobile-app/tsconfig.json` (run in `mobile-app` as `./node_modules/.bin/tsc --noEmit -p tsconfig.json`) | PASS | No TypeScript diagnostics |
| `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json` in `admin-panel` | PASS | No TypeScript diagnostics |
| `npm test` in `admin-panel` | PASS | PDF/video/quiz/upload, mutation and pagination selftests |
| `for f in supabase/functions/*/index.ts supabase/workers/validate-note-pdf.ts; do deno check "$f"; done` | PASS | 16 functions + 1 worker |
| `deno test --no-check supabase/tests/play_catalog_unit_test.ts supabase/tests/play-offer-selftest.ts supabase/tests/payment-gate-selftest.ts supabase/tests/upload-note-pdf-test.ts` | PASS | 9 Deno test cases; two files also print selftest output |
| `deno test --no-check supabase/tests/quarantine-worker-test.ts supabase/tests/note-pdf-hash-test.ts supabase/tests/upload-body-test.ts supabase/tests/pdf-validation-test.ts` | PASS | 17 cases |
| In `mobile-app`: `node --experimental-strip-types scripts/checkout-html-selftest.mjs && node --experimental-strip-types scripts/password-policy-selftest.mjs && node scripts/verify-signature-selftest.js && node scripts/same-project-build-selftest.cjs && node scripts/staging-build-selftest.cjs && node scripts/payment-provider-selftest.cjs && node scripts/play-restore-selftest.cjs && node scripts/purchases-selftest.cjs` | PASS | Mock/static behavior only |
| `node supabase/tests/play-payment-worker-selftest.cjs` | PASS | Mock consume, retry, void, lease/race cases |
| In root: `node supabase/tests/play-consumption-selftest.cjs; node supabase/tests/play-reconcile-fairness-selftest.cjs; node supabase/tests/compensation-worker-selftest.cjs; node supabase/tests/recovery-selftest.cjs` | PASS | All four exited zero; mock paths only |
| In root: `deno run --allow-env supabase/tests/play-offer-selftest.ts; deno run --allow-env supabase/tests/payment-gate-selftest.ts` | PASS | Source-level offer/gate cases |
| `CI=1 ./node_modules/.bin/expo export --platform android --output-dir /tmp/medveda-audit-export` in `mobile-app` | PASS | 9,006,427-byte Hermes bundle; 39 assets; **not an AAB** |
| `./node_modules/.bin/expo install --check` in `mobile-app` | PASS with limit | Local dependency map; offline version check unreliable |
| `node scripts/check-links.mjs` in `website` | PASS | 17 built HTML pages |
| `npm audit --offline --omit=dev --audit-level=high` in `admin-panel` | PASS with limit | Cached advisory data reported zero; current online advisories unverified |
| CI `git grep` secret-pattern command | FAIL | Two parser/fixture marker literals; MV-08 |
| `node supabase/tests/play-cron-config-selftest.cjs` | BLOCKED | Cannot create scratch database; `pg_isready` reports no server at 127.0.0.1:5432 |
| `supabase/tests/run-all.sh` and SQL RLS suites | NOT RUN | Requires local PostgreSQL and creates/drops scratch DB; unavailable |
| ESLint, native build/AAB, device, Play Console, real transaction | NOT VERIFIED | No lint setup, Android artifact/device/Console access |

No broad test suite was treated as proof of production functionality. The secret scan's two matches are marker strings, not secret values.

## N. Dead Code and Unwanted File Cleanup List

**No deletion was performed.** Reference checks included source, config, CI, and runtime conventions. Sizes are on-disk file sizes; savings are only estimated for candidates that could be removed after owner review.

| Candidate | Size | References and risk | Decision / confidence |
|---|---:|---|---|
| `admin-panel/src/assets/react.svg` | 4,126 B | No source/config reference found; starter asset | REVIEW REQUIRED / medium |
| `admin-panel/src/assets/vite.svg` | 8,709 B | No source/config reference found; starter asset | REVIEW REQUIRED / medium |
| `admin-panel/src/assets/hero.png` | 13,057 B | No source/config reference found; inspect CSS/build before removal | REVIEW REQUIRED / medium |
| `github-original-website/` | 41,049 B across six files | No current build entry point found; may be historical/legal reference | REVIEW REQUIRED / medium |
| `admin-panel/dist/` | 642,916 B | Generated output; may be local preview/deployment artifact | REVIEW REQUIRED / high as generated |
| `tatus` | 15,915 B | Pre-existing untracked file; contents deliberately not read | REVIEW REQUIRED / low |
| `mobile-app/assets/favicon.png` | 813,005 B | Expo web asset convention; despite Android focus may be needed | KEEP / high |

The first four listed review candidates total **66,941 B** if all prove removable. The generated `dist` size is separate and may be recreated. No APK/AAB was found. Uncommitted upload work is **KEEP** pending its owner's workflow, not a cleanup target.

## O. Performance and Stability

Measured local Metro output is about 9 MB Hermes plus 39 assets; this is not installed download size or startup time. Largest bundled assets include adaptive icon ~1.5 MB and icon ~978 KB; vector icon fonts include MaterialCommunityIcons ~1.3 MB. No profiling of startup, memory, network, DB EXPLAIN plans, PDF render time, low-memory kills, or crash/ANR was possible. Catalog worker performs one job per invocation and uses bounded timeouts; disabled scheduling stops progress. Purchase listener errors can be swallowed in a catch, leaving no user-visible recovery cue. Stale signed URLs affect delayed downloads. Source uses some full-table client fetches for search/stats; quantify with live data before labeling them bottlenecks.

## P. Google Play Policy and Release Readiness

Source package, production Play provider, runtime-version separation, and checkout guard are coherent. Final AAB manifest, `com.android.vending.BILLING` permission, signing certificate, version code, target SDK, product activation, license testers, track configuration, Data Safety declaration, privacy/deletion URL, store listing, and Play policy review are **not verified**. The dedicated Razorpay Android APK path exists; verify it is not distributed through Play for paid digital notes. A valid website Razorpay purchase may produce an entitlement visible in the Play app; policy treatment needs an actual distribution/path review, not an assumption. Source account-deletion flow and website deletion page exist; operational deletion and published link were not tested.

## Q. Complete Issue Register

Each entry states observed/expected behavior, root cause, evidence, impact, remediation, regression and verification. A dated operational finding is not asserted to be current.

### P0 — none confirmed

### P1 — high

**MV-01 — Play cron inactive in dated production snapshot.** Component: catalog and payment recovery. Observed: at 07:40 UTC `play-catalog-sync`, `play-consume`, `play-reconcile`, `play-voids` all had `active=false`; ₹1.00 queue pending/attempts 0, no verified tiers. Expected: scheduled processing and monitored backlog. Root cause: schedules disabled at capture; why and current state unconfirmed. Evidence: `docs/audit/evidence/production-operations-readonly.json`, `supabase/functions/sync-play-catalog/index.ts:58`, `play-payment-worker/index.ts:242`. Impact: checkout can lack a SKU; consumption/void recovery can stop. Security/Play: refund access may linger and purchase recovery fails. Fix: review and enable correct secret-authenticated schedules only after isolated verification, then read back queue/metrics. Regression: catalog ready, worker phases run, failed jobs alert; verify current production. **Status: confirmed at snapshot, current NOT VERIFIED.**

**MV-02 — deployed schema/functions lag local source at snapshot.** Component: database/Edge releases. Observed: snapshot had 51 applied migrations through `20261016100000` and 13 active functions; local has 55 migrations and 16 functions. `attach-external-token`, `report-external-transaction`, `upload-note-pdf` were absent from the function list; 2026-10-18 quiz/upload migrations absent. Expected: release's dependent functions and schema deployed together. Root cause: release drift at capture, deployment plan unconfirmed. Evidence: `docs/audit/evidence/production-readonly.json`; local `supabase/migrations/20261018100000_verified_quiz_attempts.sql:20`, `supabase/functions/upload-note-pdf/index.ts:19`. Impact: latest quiz/upload/UCB paths can fail if shipped. Security/Play: unverified deployed enforcement. Fix: reconcile deployment history and dependencies in staging, deploy in order only with explicit approval. Regression: schema/function inventory and end-to-end flows. **Status: confirmed at snapshot, current NOT VERIFIED.**

**MV-03 — no automatic Play restore invocation.** Component: Android purchase recovery. Observed: `restorePlayPurchases()` is defined but has no call site; connection is opened from checkout/recheck and `getAvailablePurchases` runs only inside restore/recheck. Expected: unconsumed purchases are checked after app restart/login and account match, especially after process death. Root cause: restore service not wired to lifecycle. Evidence: `mobile-app/src/services/playBillingService.ts:304`, repository-wide call-site search. Impact: paid purchase may remain ungranted until a narrow manual path is reached. Security/Play: no bypass; reliability and financial support burden. Fix: invoke safe restore on authenticated Android startup/resume with bounded retries and visible pending state. Regression: mock process death after purchase, restart, same/different user, pending/cancelled/consumed. **Status: source confirmed; device consequence NOT VERIFIED.**

**MV-04 — Google 403 is terminal and loses diagnostic stage.** Component: Play catalog. Observed: `googleRequest` throws only status, catalog worker logs/stores `Google Play API 403`, classifies it nonretryable, and SQL marks the job failed. Expected: safe operation/reason metadata and recoverable admin action after permission repair. Root cause: status-only error and static retry classification. Evidence: `supabase/functions/_shared/googlePlay.ts:69-84`, `sync-play-catalog/index.ts:24-81`, `supabase/migrations/20261016100000_play_catalog_sync.sql:244-259`. Impact: catalog remains blocked; reported SKU's exact failing operation cannot be established. Security/Play: blocks compliant checkout, no evidence of bypass. Fix: record sanitized operation, Google reason/request ID, alert failed status, validate Play app permissions, then admin retry. Regression: mocked 403 at GET/conversion/PATCH/activation/readback; retry after authorization repair. **Status: source confirmed; reported live 403 stage/job status NOT VERIFIED.**

### P2 — medium

**MV-05 — expired signed URL reused for PDF retry/resume.** Component: offline notes. Observed: download row stores `source_url`; resume/retry feeds it back after the 120-second `get-note-url` TTL. Expected: refresh entitlement and URL before a late restart. Root cause: cached ephemeral URL. Evidence: `mobile-app/src/utils/downloadManager.ts:83,189-207,289-312,347-364`; `supabase/functions/get-note-url/index.ts:12-13`. Impact: paid download may repeatedly fail after delay. Security/Play: none; refreshed URL must still check entitlement. Fix: store note ID and request a new URL on resume/retry; handle partial download semantics. Regression: retry at >120 seconds online, offline, refunded, and account-switch cases. **Status: source confirmed; device reproduction NOT VERIFIED.**

**MV-06 — same-session offline PDF can outlive refund.** Component: entitlement revocation. Observed: completed local note opens directly; purge happens on sign-out/account switch, not on refund. Expected: explicit offline license/revocation policy, with online recheck where feasible. Root cause: permanent local file without a revocation signal. Evidence: `mobile-app/src/screens/downloads/DownloadsScreen.tsx:74-78`, `NotesScreen.tsx:113-120`, `services/authState.ts:14-54`. Impact: refunded user can retain a previously downloaded copy on the same device. Security/Play: entitlement-revocation limitation; already-downloaded bytes cannot be fully recalled. Fix: define offline access window and purge on known reversal/online entitlement refresh; disclose unavoidable offline limits. Regression: refund then online refresh, offline period, logout, account switch. **Status: source confirmed; live refund/device NOT VERIFIED.**

**MV-07 — legacy quiz scores remain self-writable.** Component: quiz/RLS. Observed: authenticated users retain own-row write policy/grants on `quiz_scores`, while new verified attempts are server-only. Expected: no directly changeable score used as verified result. Root cause: backward-compatible legacy policy. Evidence: `supabase/migrations/20260701000000_baseline_live_schema.sql:894-897`, `20260930110000_low_grants_tightening.sql:15`, `mobile-app/src/hooks/useQuizStats.ts:36-48`. Impact: a user can tamper with legacy rows/count; current average/best use verified rows. Security/Play: data-integrity risk limited by current UI separation. Fix: retire client writes after compatibility window and label legacy data unverified. Regression: ordinary user cannot write verified or retired legacy score; old builds handled. **Status: source confirmed; live grant test NOT VERIFIED.**

**MV-08 — CI secret-pattern gate fails on literals.** Component: CI. Observed: exact CI `git grep` pattern returned two matches in `googlePlay.ts` parser and `play_catalog_api_test.ts` fixture; no key material was displayed. Expected: scanner passes safe marker literals and catches actual secrets. Root cause: regex matches `BEGIN PRIVATE KEY` in legitimate source/test text. Evidence: `.github/workflows/ci.yml:79-86`; local scan exit 1, two paths. Impact: secrets-scan job stays red and can hide true regressions. Security/Play: weak signal, not a confirmed leak. Fix: use a scanner/allowlist that recognizes context without weakening real-key detection. Regression: safe literals pass; seeded fake private key fails. **Status: locally confirmed; remote CI run NOT VERIFIED.**

### P3 — low

**MV-09 — no ESLint audit gate.** Component: code quality. Observed: package scripts and CI have typechecks/selftests but no lint command. Expected: consistent lint checks for React hooks/imports and unused code. Root cause: tooling not configured. Evidence: `mobile-app/package.json`, `admin-panel/package.json`, `.github/workflows/ci.yml:8-60`. Impact: maintainability and missed static hints. Security/Play: indirect. Fix: add a scoped lint configuration in a separate authorized change. Regression: lint passes with known rules; no release claim from lint alone. **Status: source confirmed.**

## R. Root Cause Analysis

**Catalog blocker:** Admin price → SQL trigger → queue. At 07:40, ₹1.00 was pending and the catalog cron inactive, so no worker could claim it. A later reported `Google Play API 403` implies a Google request was attempted at some later state, but available evidence does not show which request or Google's reason. The worker would mark that 403 failed, requiring admin retry. Missing ready tier makes `create_play_order` return `price_tier_pending`, preventing compliant checkout. Verify current queue/logs/cron/Google response before acting.

**Razorpay success while Play catalog failed:** The paths are independent. A Razorpay-capable Android build can call `create-order`, open WebView, and settle through Razorpay, producing a success purchase that unlocks notes even with no Play tier. Current Play profile has no Razorpay navigation fallback. Installed build provenance, actual order provider, and whether an older entitlement predated the observed UI are unverified.

**Purchase after process death:** Google can charge while local verification is interrupted. The receipt remains unconsumed, and backend would verify it when submitted, but the exported restore function is never called automatically. This is a confirmed source recovery gap; real device timing and Billing listener replay are unverified.

## S. Prioritized Remediation Roadmap

1. Freeze release decision; capture current read-only Play cron, queue, logs, verified tiers, deployed function/migration inventory, and Console product/permission state. Identify the actual 403 operation safely.
2. Repair catalog credential/app permissions and worker scheduling in staging; add safe stage diagnostics; prove ₹1.00 and all approved prices read back exact active BUY options. Preserve approved prices.
3. Reconcile migration and Edge deployment dependencies; verify notes/upload/quiz/UCB functions and RLS in isolated staging before any production deployment.
4. Add authenticated Android restore lifecycle and test process-death/pending/refund/duplicate cases. Exercise real licensed-tester purchases without customer accounts.
5. Fix signed-URL retry, define offline refund access policy, retire legacy score writes, and repair the CI scanner.
6. Only after these gates, build and inspect the actual AAB, run device matrix, then review Play Console policy/listing/data declarations.

## T. Regression Test Plan

For each payment fix: mock Google pending/purchased/refunded/voided/consumed, wrong SKU/option/account/order/region/quantity/time, token replay, duplicate callbacks, consumption 409, API 403/429/5xx, lease expiry, and concurrent settlement. In a disposable Supabase project, assert nonbuyer and cross-user denial for orders, purchases, prices, verified quiz scores, notes Storage, and admin RPCs. For Android, test cold launch/restart during checkout, same and different account restore, multi-device entitlement, price change propagation, and Razorpay isolation in a Play-distributed build. For content, test signed-URL expiry, offline resume, refunds, free videos, and account deletion. Use real licensed testers only after Console products and track are verified; no real-money test was authorized.

## U. Manual Tests and Access Required

Required read-only access: current Supabase `play_price_sync`, `play_price_sync_logs`, `play_price_tiers`, `play_payment_jobs`, `play_recovery_metrics`, cron jobs/runs, migration history, RLS/grants/Storage, Edge deployment logs and secret **names**; Google Play Console API access/linked service account/app role, one-time product state and purchase option, license-testers and internal track; installed AAB and manifest/signing/version; disposable student/admin accounts in staging; physical Android device. For the reported SKU, correlate the exact job timestamp and Google request stage with a sanitized error reason/request ID, then inspect retry eligibility. Check legal pages and Data Safety on the published listing. No Play Console, device, production customer, or real payment was used here.

Manual Internal Testing matrix: splash/onboarding; register/login/logout/reset/deep link; course/year selection; home/search/catalog; paid note locked, free preview, purchase success/cancel/pending/error, interrupted checkout, restore, duplicate and refund; PDF open/download/expired URL/offline/account switch; free video playback/network loss; quiz revision/submit/retry/score; notifications/push and preferences; profile/settings/account deletion; admin login/MFA, product price/status/retry, notes upload/quarantine, video/quiz/users/orders; low-memory/background/rotation and poor network. Record device model, Android version, build hash, order/provider, server log correlation, and expected versus actual without exposing user data.

## V. Final Release Gate

| Gate | Result | Why |
|---|---|---|
| Android build | NOT VERIFIED | Metro export passed; no native AAB |
| Billing permission | NOT VERIFIED | No final manifest |
| Google Play catalog | FAIL at dated snapshot / current NOT VERIFIED | No tier; cron inactive then; reported 403 unresolved |
| Google Play checkout | NOT VERIFIED | No tester/device |
| Server-side purchase verification | PASS source / live NOT VERIFIED | Google GET before settlement; mocks only |
| Entitlement security | PASS source / live NOT VERIFIED | Service settlement/RLS source; live negatives absent |
| Razorpay isolation | PASS current Play source / artifact NOT VERIFIED | Build-time guard; installed build unknown |
| Database RLS | NOT VERIFIED | Migration/snapshot only; no role tests |
| Edge Functions | FAIL at dated snapshot / current NOT VERIFIED | 3 local functions absent then |
| Admin Panel | PASS local checks / live NOT VERIFIED | Typecheck/selftests only |
| Notes and videos | PASS source / device NOT VERIFIED | Private notes/free video design; no live playback |
| Authentication | PASS source checks / live NOT VERIFIED | No account tests |
| Account deletion | NOT VERIFIED | Source/page only; no destructive test |
| Internal Testing | NOT VERIFIED | No Play track/device run |
| Play policy readiness | NOT VERIFIED | Actual AAB/listing/declarations absent |

## W. Final Verdict

1. **Further isolated internal testing: GO** for local/staging checks with disposable accounts and no real purchase.
2. **Google Play Internal Testing distribution: NO-GO** until catalog/cron/deployment state is current and verified, restore is addressed, and an AAB/device tester path passes.
3. **Closed testing: NO-GO**; Internal Testing evidence and security negatives are missing.
4. **Production release: NO-GO**; payment, artifact, RLS, policy, backup/recovery, and device gates are not established.

The report records only accessible evidence. It does not claim that the reported Razorpay event came from a Play-distributed build or that the 403 is caused by any particular invitation or permission. No application source, configuration, migration, production data, price, or existing user file was changed by this audit.
