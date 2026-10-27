**MedVeda application security review — 20 October 2026**

**Product-model correction, 27 October 2026:** MCQs and videos are free. This
historical review's paid-MCQ entitlement proposal and unpaid-access finding are
superseded. Do not apply the paid-quiz proposals in this directory. Answer-key
confidentiality and server grading are separate requirements; see the later
[quiz/admin MFA report](../../audit/MEDVEDA_QUIZ_ANSWER_AND_ADMIN_MFA_FIX_20261023.md).
The original evidence below is retained as historical context.

**Verdict: NO-GO for launching this source with real payments under the requested content model.** A student with **zero purchases** can query MCQ questions and correct answers and submit a server-verified quiz attempt. Targeted notification text is also readable anonymously. Both were reproduced against the current migration chain in an isolated PostgreSQL database.

This reviews the **working tree, including existing uncommitted changes**, not just HEAD. Application code and deployment state were not changed. Proposed corrections are review artifacts in this directory; none has been deployed. File/line references below refer to the reviewed source. [source-manifest.json](source-manifest.json) records hashes for 554 source/config/test files. Older audit documents were not treated as proof that this version is safe.

**Evidence and limits**

- Built the full migration chain on disposable PostgreSQL 17 using the repository's Supabase stubs. Ran `supabase/tests/run-all.sh`: **ALL SUITES PASSED**, including the 23-check webhook harness and wallet/payment concurrency checks. [Output](database-tests.txt).
- Independently reproduced unpaid MCQ access, public targeted-message visibility, and retained identity data after account deletion. These are gaps in the existing test expectations. [Reproduction SQL](reproduce.sql), [results](reproduction-results.txt).
- Applied the proposed database fixes to a second disposable database. Tested unpaid denial, buyer access, verified submission, other-user denial, anonymous notification denial, audit insertion and password lockout. All passed. [Correction tests](verify-proposed-fixes.sql), [results](proposed-fix-tests.txt).
- Tested the proposed HTTP wrapper: exact-origin CORS, native calls, private-response headers, malformed/oversized JSON, and preservation of signed webhook bytes. **3 passed, 0 failed.** [Tests](httpSecurity_test.ts), [results](http-security-tests.txt).
- Ran fresh full `npm audit --json` against the admin, mobile and tooling lockfiles. Registry access required a sandbox retry; audits ultimately completed. [Admin](admin-panel-audit.json), [mobile](mobile-app-audit.json), [tooling](tooling-audit.json).
- Scanned tracked and nonignored untracked files for real private-key bodies, Supabase service-role JWTs and selected secret patterns, without printing values. No matches. This is a pattern scan, not proof that no arbitrary secret exists or that old credentials have been revoked. [Result](secret-scan.txt).
- No production mutation, live-user impersonation, real payment, live auth attack, public exploit or deployment was performed. PostgreSQL stubs do **not** reproduce hosted Auth, the Storage HTTP service, gateway JWT behavior or Vercel headers. No release APK/AAB or production web bundle was supplied for binary inspection.

**All 19 requested checks**

`PASS` means the reviewed source implements the control and no contrary result was found in the stated tests; it is not certification of the running deployment. `FAIL` means a specific source defect below. Unknown live settings are listed separately, rather than mislabeled as either safe or a proven vulnerability.

| # | Check | Status | Severity | Reason / finding |
|---|---|---|---|---|
| 1 | RLS on tables and correct policies | FAIL | Critical | All public tables in the reconstructed schema have RLS, but quiz and notification policies disclose protected content (F01, F02). Server-only tables intentionally have no client policies: default denial is correct. |
| 2 | Auth before private API reads/writes | FAIL | Low | Payment callback reads an order and reveals existence before checking its signature (F12); other reviewed private handlers authenticate users, admins or cron secrets. |
| 3 | Server enforcement of price/roles/access | FAIL | Critical | Prices and settlement are server-controlled, but paid MCQs use course membership as authorization (F01). |
| 4 | Rate limiting | FAIL | Medium | Exact password lockout is device-only; several limiters fail open and diagnostics have no per-admin rate gate (F05). Hosted Auth limits are not exported. |
| 5 | Type/length/input validation | FAIL | Medium | Public JSON handlers parse unbounded bodies before the limiter; valid JSON `null` also bypasses the assumed object shape (F10). |
| 6 | Parameterized queries | PASS | — | Runtime Supabase calls use filters/RPC parameters; local SQLite binds values. Dynamic SQL found in migrations uses fixed DDL or quoted internal identifiers, not client SQL strings. |
| 7 | Restricted CORS | FAIL | Medium | Shared `Access-Control-Allow-Origin: *` is returned with sessions, order details and signed URLs (F06). |
| 8 | HTTPS / Secure cookies / Android cleartext | PASS | — | Android config disables cleartext; PDF viewer sets `trustAllCerts={false}`; reviewed endpoints use HTTPS. No application cookie auth found, so Secure-cookie subcheck is N/A. Actual redirects/merged manifest still need evidence. |
| 9 | IDOR / ownership | FAIL | High | Orders, purchases, wallet and quiz attempts have ownership checks; targeted notification text escapes its audience (F02). |
| 10 | Production debug/data leakage | FAIL | Medium | Provider error bodies enter logs; mobile exception messages are only partially scrubbed (F08). Admin `window.supabase` itself is correctly DEV-only. |
| 11 | CAPTCHA on public auth/forms | FAIL | Medium | Signup/login/reset/OTP calls have no CAPTCHA token integration (F11). The contact page has no submission form; that subcheck is N/A. |
| 12 | Admin and billing audit | FAIL | Medium | Provider events/ledger/referral-settings audit exist, but general role, product, content and user-block mutations lack actor/change history (F07). |
| 13 | Private paid-file storage | PASS | — | Notes bucket is private; current restrictive policy blocks direct student storage reads; `get-note-url` checks entitlement before issuing a 120-second URL. Actual public-URL HTTP denial needs deployment verification. |
| 14 | Server admin authorization | PASS | — | SQL uses `am_i_admin()` backed by `admins.id=auth.uid()`; privileged Edge handlers verify membership. MFA enforcement for general admin actions is configurable, not mandatory by default. |
| 15 | Vulnerable packages | FAIL | High* | Admin: 1 high; mobile: 21 high entries arising from 2 advisories; tooling: 0 (F13). *Advisory severity; observed paths are principally build tooling. |
| 16 | Server upload checks | PASS | — | Authenticated admin upload checks size, PDF header/end marker and structure; large PDFs remain quarantined pending trusted validation. This is not an antivirus claim. |
| 17 | Main-file security review | FAIL | Critical | Review completed; the current main-file implementation contains the confirmed F01–F13 issues below. |
| 18 | Security headers | FAIL | Low | Both Vercel configs declare CSP/XFO/HSTS; shared Edge JSON responses omit these and `Cache-Control: no-store` (F06). JSON APIs have lower framing risk than HTML. |
| 19 | Webhook verification | PASS | — | Razorpay verifies raw-body HMAC before processing and re-fetches provider state. No inbound Google RTDN webhook exists in this source; that signature subcheck is N/A. Play recovery polls Google using OAuth and authenticated cron handlers. |

**App-specific checks**

| Extra | Status | Severity | Reason |
|---|---|---|---|
| E1 Secrets | PASS, current-source scope | — | Client configurations use publishable/anon keys; private keys are read from server environment. Pattern scan found no private keys in tracked/nonignored source. History, ignored build artifacts and rotation remain unverified. |
| E2 Edge JWT settings | PASS, source scope | — | Every explicitly `verify_jwt=false` function has handler authentication or Razorpay HMAC. `diagnose-play-matrix` has no explicit config stanza, but its handler checks JWT/admin/aal2; deployed setting is unknown. |
| E3 Payments/referrals/wallet | PASS, source and local-test scope | — | Server pricing, provider verification, unique token/payment bindings, transaction locks, wallet reservations and reversal paths are present; local concurrency/replay tests passed. This does not prove live Play permissions or successful real-device settlement. |
| E4 Content protection | FAIL | Critical | Unpaid quizzes are readable (F01); offline quizzes have no entitlement/grace gate and downloaded content is plaintext (F04). |
| E5 Auth | FAIL | High | Recovery tokens cross a hijackable custom scheme (F03); prescribed lockout is not server-wide (F05). OTP helper does set `shouldCreateUser:false`; native sessions use encryption with SecureStore-held keys. |
| E6 Device storage | FAIL | High | Plain SQLite, PDF/JSON files and signup email in AsyncStorage remain (F04). |
| E7 Privacy/deletion/logging/push | FAIL | High | Targeted notification disclosure, local residue, raw error logging and unoperated identity retention are present (F02, F04, F08, F09). Main profile/contact deletion and Auth cascades otherwise exist. |

**Fix order**

| Order | Finding | Severity | Reason to prioritize |
|---|---|---|---|
| 1 | F01 Paid MCQ entitlement bypass | Critical | Direct unpaid access to the entire question/answer content for the selected course. |
| 2 | F02 Targeted notifications become public | High | Potential cross-user personal/payment-message disclosure, including to anonymous readers. |
| 3 | F03 Recovery token custom-scheme handoff | High | A competing app can claim the scheme and receive account-recovery credentials. |
| 4 | F04 Offline storage/access/isolation | High | Paid content extraction, unbounded quiz offline use, retained personal activity after logout. |
| 5 | F05 Server auth lockout and abuse limits | Medium | Client lockout is bypassable through the Auth API; heavy diagnostic requests are unmetered. |
| 6 | F11 CAPTCHA integration | Medium | Public signup/auth abuse remains possible without a bot challenge in the flow. |
| 7 | F06 CORS/response headers; F10 bounded inputs | Medium / Low | Restrict cross-origin exposure and unauthenticated resource consumption. |
| 8 | F07 Audit; F08 safe logging; F09 retention | Medium | Establish attribution and stop avoidable personal-data retention/disclosure. |
| 9 | F13 dependency remediation | High advisory | Build-chain exposure needs remediation or a documented, tested mitigation; no demonstrated app payment forgery from these packages. |
| 10 | F12 order-existence oracle | Low | UUID knowledge is required and no order contents are returned, but signature verification is too late. |

**F01 — Unpaid MCQ reads and submissions**

Locations: `supabase/migrations/20260919120000_multi_course_and_referrals.sql:983` (`quiz_tests_public_read_active`); `supabase/migrations/20261020104000_course_wide_content_browsing.sql:35` (`has_content_access`, profile-course branch at 45); the same migration at `:219` (`submit_quiz_attempt`); `mobile-app/src/repositories/quizRepository.ts:12` and `:50` select the full question JSON.

The course-membership branch grants access without checking `purchases`. Restrictive publication policies only check active ancestors. They do not add payment authorization. The question JSON includes correct answers. The SECURITY DEFINER submission RPC also checks catalogue access rather than paid access.

Reproduction: the synthetic account had **0 purchase rows**, could read **1 answer-bearing quiz row**, and got `{"status":"verified","score":1,"total":1,"percentage":100}` from the submission RPC. This is independent of whether the UI displays a lock.

Correction: apply the F01 block in [proposed-database-fixes.sql](proposed-database-fixes.sql), followed by the complete replacement [proposed-quiz-submission.sql](proposed-quiz-submission.sql). This introduces an explicit product/quiz entitlement mapping, a restrictive read policy and an identical RPC gate. It is deliberately fail-closed until mappings are supplied.

**Missing business data:** the repository has no explicit quiz-to-product map, and `products.product_type` has no dedicated quiz value. Supply a reviewed `quiz_id,product_id` inventory; do not guess that every notes purchase unlocks every quiz in a year. Existing question-list queries will return only entitled quizzes under this correction. If locked quiz titles should remain browseable, add a metadata-only RPC/view that never returns `questions`; do not restore broad base-table reads.

**F02 — A targeted push is persisted as a public broadcast**

Locations: `supabase/functions/send-push-notification/index.ts:69` parses target IDs, `:94` inserts a notification without any audience, and `:101` applies targeting only to Expo tokens. Effective policy: `notifications_public_read_active`, originally in `supabase/migrations/20260701000000_baseline_live_schema.sql:718`; `20260927100000_f7_drop_legacy_admin_policies.sql:26` explicitly preserves the anonymous-readable twin. `mobile-app/src/services/notificationsService.ts:29` fetches every active message.

An admin sending a payment/support message to one student creates a row every student—and an unauthenticated REST caller—can read. The isolated anonymous-role SELECT returned the synthetic message. This proves the audience flaw, not that historical messages actually contain personal data.

Correction: the F02 SQL block adds `recipient_ids` and a restrictive audience policy. Pair it with the exact push-handler changes in [proposed-code-fixes.md](proposed-code-fixes.md). Also reject an explicitly empty recipient array instead of silently broadcasting it. Historical rows lack audience data: inspect them and deactivate any targeted/private messages; their intended recipients cannot be recovered from this table alone.

**F03 — Reset tokens are handed to any app claiming `medveda://`**

Locations: `website/assets/js/reset-password.js:5`, `:39`, `:63`; `mobile-app/app.json:10`; `mobile-app/src/navigation/AppNavigator.tsx:85`; `mobile-app/src/features/auth/authService.ts:83`.

The HTTPS bridge initially receives valid recovery tokens, but `openInApp()` appends the full access/refresh-token fragment to a custom-scheme URL. A separate Android app can register that scheme. The current app config has no verified HTTPS App Link association. Receiving this recovery session can enable account access/password replacement.

Correction: [proposed-code-fixes.md](proposed-code-fixes.md) removes the credential handoff and completes recovery entirely on the existing HTTPS form. The post-reset “open app” action carries no tokens. This is the smallest complete correction with current files. If native recovery is required, use verified HTTPS links and a PKCE flow; do not merely rename the custom scheme. The missing association file would be `website/.well-known/assetlinks.json`, populated with the actual Play signing-certificate fingerprint, plus `android.intentFilters` and an exported Auth redirect allowlist. [Android's verification requirements](https://developer.android.com/training/app-links/verify-applinks).

**F04 — Plaintext offline content, ungated quiz replay and local residue**

Locations:

- `mobile-app/src/config/database.ts:36`: ordinary `medveda_offline.db`, no SQLCipher/key.
- `mobile-app/src/utils/downloadManager.ts:219` saves PDF bytes directly; `:439` saves full quiz JSON; `:469` loads arbitrary supplied local quiz URI without user/entitlement/grace verification.
- `mobile-app/src/services/offlineNoteVerification.ts:9` and `:22`: note verification timestamps are editable AsyncStorage records. The seven-day check handles ordinary expiry/clock rollback, but has no server signature or protected integrity.
- `mobile-app/src/utils/pendingReferral.ts:19`: signup email stored in plaintext AsyncStorage.
- `mobile-app/src/services/authState.ts:24` calls `clearAllDownloads()` on logout, but `downloadManager.ts:363` deletes only the `downloads` table; `quiz_attempts_local` and `sync_queue` remain. `quizAttempts.ts:61` has no owner filter. No claim is made that an ordinary user can browse arbitrary app-private files without device access.

The current file sandbox and `allowBackup:false` reduce exposure, but do not encrypt the cache. Offline quizzes can continue after refund/grace expiry because their load path never checks either. Logout removes downloaded files but leaves activity/queued answers. Native session encryption is a positive control and does not encrypt these other stores.

Correction code is in [proposed-code-fixes.md](proposed-code-fixes.md): an **online-only release containment option**, SecureStore-backed pending referral storage, and complete logout cleanup. The containment disables persistent downloads/quiz replay and uses memory-only SQLite until a proper encrypted offline implementation is built. It changes feature availability and is not represented as a finished offline-preserving fix.

To retain offline mode, the missing implementation must include SQLCipher with a SecureStore-held key, authenticated encryption of PDF/quiz files, per-account ownership, authenticated server-issued expiry, revocation on reconnect, and removal of legacy plaintext files. SQLCipher alone does not encrypt the separate PDF/JSON files. A device already authorized to display content can still capture it; the seven-day policy cannot provide absolute DRM against a modified client. [Expo 57 SQLite configuration](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/).

**F05 — Lockout and heavy-endpoint limits are incomplete**

Locations: `mobile-app/src/features/auth/loginLockout.ts:65` and `:114`; `authService.ts:31` goes directly to `signInWithPassword`; `supabase/functions/_shared/rateLimit.ts:24` defaults to fail-open and `:33` implements it; `request-password-reset-by-mobile/index.ts:43` does not request fail-closed; `diagnose-play-matrix/handler.ts:59` and `diagnose-play-pricing/handler.ts:32` authenticate but do not rate-limit.

The five-failures/five-minutes then three-failures/fifteen-minutes policy exists only on the device. Clearing state or calling Supabase Auth directly bypasses it. The phone endpoint adds database limits, but an email password request does not traverse that function. This is **not** a claim that Supabase has no built-in limits; its Auth endpoint quotas are separate. The current code also allows most heavy endpoints through when the limiter fails.

Correction: F05 SQL in [proposed-database-fixes.sql](proposed-database-fixes.sql) enforces the requested password policy inside an Auth Password Verification hook, including concurrent attempts. Enable that hook in the project; installing the function alone does nothing. The exact hook entitlement/configuration is not available here. Keep backend OTP/reset quotas and enable CAPTCHA separately. Account-wide lockout allows deliberate denial of service to a known account; this is the tradeoff in the requested policy. [Supabase hook contract](https://supabase.com/docs/guides/auth/auth-hooks/password-verification-hook), [provider limits](https://supabase.com/docs/guides/auth/rate-limits).

Additional code in [proposed-code-fixes.md](proposed-code-fixes.md) makes the common limiter fail-closed and puts a per-user rate gate into the diagnostic entrypoints after token verification. `clientIp()` trusts proxy headers at `_shared/rateLimit.ts:9`; without evidence that the gateway strips/overwrites them, do not treat its IP bucket as unspoofable. The per-user/phone bucket and provider quota must remain authoritative.

**F06 — Wildcard CORS and missing private-response headers**

Locations: `supabase/functions/_shared/cors.ts:4` and `:24`; custom diagnostic responses copy the same wildcard in `diagnose-play-matrix/handler.ts:45` and `diagnose-play-service-account/index.ts:11`. `diagnose-play-pricing/handler.ts:13` and `razorpay-webhook/index.ts:18` also lack the requested API security headers.

This fails the requested own-domain policy. Wildcard CORS alone does **not** let a website extract a token from another origin, and no credentialed-cookie CORS exploit was demonstrated. It nevertheless permits arbitrary origins to read a response if they can send a valid bearer token or use a pre-auth endpoint.

Correction: [proposed-httpSecurity.ts](proposed-httpSecurity.ts) is a tested replacement boundary wrapper that removes inherited wildcard headers, uses exact allowed origins, adds no-store/nosniff/CSP/XFO/HSTS, and permits native requests without Origin while retaining authentication. Apply as shown in [proposed-code-fixes.md](proposed-code-fixes.md). Include the actual admin deployment origin in server configuration; it cannot be inferred reliably from `.vercel` project IDs. Do not allow all `*.vercel.app` previews.

`website/vercel.json` and `admin-panel/vercel.json` already declare the main website headers. No replacement website header policy is needed to fix the source-level gap. Live HTTP headers/redirects remain a deployment check.

**F07 — Incomplete admin/billing mutation attribution**

Locations: `supabase/migrations/20260928100000_referral_settings_limits_and_audit.sql:99` audits only referral-setting updates; `admin-panel/src/services/productService.ts:53` performs product CRUD; `admin-panel/src/services/userService.ts:25` updates blocked users; `supabase/migrations/20260924110000_critical2_orders_server_only.sql:224` defines `admin_set_order_status`. The effective trigger inventory has no general mutation audit.

The payment event inbox, immutable ledger and `resolved_by` fields are useful. They do not record who changed a price, added an admin, changed publication, or blocked a user. An order's `updated_at` is not an actor history.

Correction: F07 SQL in [proposed-database-fixes.sql](proposed-database-fixes.sql) adds append-only-for-clients audit storage and triggers across the actual administrative/billing tables. It records actor UUID, time, row, operation and selected changed fields, without copying contact details, purchase tokens or question bodies. Service/database activity is explicitly labeled when no user JWT exists. The push correction supplies `created_by` from the verified user. Service-role operators need distinct authenticated operator identities if human attribution is required; a shared service key cannot identify a person.

**F08 — Raw error messages can carry personal data into logs**

Locations: `supabase/functions/_shared/razorpay.ts:79`, `:104`, `:133` append entire provider error bodies to exceptions; `create-order/index.ts:122` and `verify-payment/index.ts:41` log those exceptions. `mobile-app/src/utils/logger.ts:20` and `:29` transmit error messages; `mobile-app/src/config/sentry.ts:17` scrubs selected patterns but not arbitrary names, opaque tokens or free-form content.

This proves a data-carrying path, not an observed production leak. A name or opaque secret in an upstream error message survives those regexes. `sendDefaultPii:false` does not sanitize application-supplied strings. DEV-only mobile console output and the disabled screenshot/trace settings are good.

Correction: [proposed-code-fixes.md](proposed-code-fixes.md) replaces provider-body exceptions with operation/status codes, projects logs to safe fields and reduces Sentry events to nonpersonal metadata. Push privacy is additionally addressed by F02; arbitrary administrative push text cannot be guaranteed PII-free without restricting templates/content.

**F09 — Identity retention cleanup exists only as an unused function**

Locations: `supabase/migrations/20260927130000_batch3b_antifarming.sql:50` stores email/phone hashes plus the original account UUID outside deletion cascades; `:91` uses a fixed prefix, not a secret salt; `20260922100000_phase1a_sync_and_order_security.sql:1933` omits those rows from `erase_user_data`; `20261020103000_first_purchase_identity_retention.sql:32` comments out the scheduling command.

Profile/contact records are removed, and verified attempts cascade when Auth deletes the user. Retaining limited fraud-prevention data can be an intentional requirement, but a purge function with no caller does not enforce a retention deadline. The local test left a **181-day-old identity row** after both erasure and Auth deletion. A phone hash is still identifying data, not anonymization.

Correction: [proposed-code-fixes.md](proposed-code-fixes.md) provides the scheduling SQL using the existing service-only purge function, with job-success verification. Hourly scheduling permits up to one hour of lag after 180 days. If policy requires deletion at account closure instead, that conflicts with the current anti-re-signup design and needs a chosen product policy; do not claim both guarantees. No legal conclusion about required retention is made here.

**F10 — Public request parsing is unbounded and assumes object JSON**

Locations: `supabase/functions/login-with-mobile/index.ts:36` followed by `:40`; `verify-payment/index.ts:52`; `create-play-order/index.ts:10`; `verify-play-purchase/index.ts:13`; webhook `razorpay-webhook/index.ts:119`. TypeScript casts do not validate JSON. `null` is valid JSON and property access throws; very large inputs are buffered before authorization/limiting in the public login path.

Correction: apply [proposed-httpSecurity.ts](proposed-httpSecurity.ts) to the entrypoints as specified in [proposed-code-fixes.md](proposed-code-fixes.md). It bounds streamed bytes independent of Content-Length, rejects nonobject JSON and keeps signed webhook bytes unchanged. Existing multipart/quarantine upload bounds remain in place. For callback IDs additionally validate `order_`, `pay_` and 64-character signature formats before provider calls (F12 code).

**F11 — No CAPTCHA token in the public auth flows**

Locations: `mobile-app/src/features/auth/authService.ts:49`, `:66`, `:126`, `:31`; `mobile-app/src/screens/auth/RegisterScreen.tsx:50`. The phone login/reset proxy similarly does not forward a CAPTCHA token to Supabase Auth.

Source contains no CAPTCHA acquisition component. If production CAPTCHA is disabled, these forms have no bot challenge; if it is enabled, the current calls cannot reliably complete the challenge-protected flow. The live setting is missing, so neither scenario is asserted as observed.

Correction: the exact SDK/proxy token plumbing is supplied in [proposed-code-fixes.md](proposed-code-fixes.md), together with the required server toggle. **Missing inputs:** chosen provider/site key, provider secret configured in Supabase Auth, and a token-producing native challenge component (`mobile-app/src/components/AuthCaptcha.tsx`, currently absent). A hardcoded token or a client-only “human” checkbox is not a valid correction. These missing settings prevent an honestly complete drop-in CAPTCHA UI from being supplied from the repository alone. [Supabase's supported CAPTCHA integration](https://supabase.com/docs/guides/auth/auth-captcha).

**F12 — Order existence is disclosed before callback authentication**

Location: `supabase/functions/verify-payment/index.ts:73` reads `orders` and `:78` returns a distinct 404 before signature checking at `:103`. With a valid-looking internal UUID and no signature, existing and nonexistent orders follow different responses.

No amount, email or purchase is exposed by this particular branch, and UUID guessing is impractical; severity is **Low**. It still violates the requested authenticate-before-private-read rule.

Correction: move callback field parsing/HMAC verification ahead of the order SELECT and return a uniform payment-verification error for mismatches. Keep recovery JWT verification and `order.user_id` checking. The ready replacement sequence is in [proposed-code-fixes.md](proposed-code-fixes.md). Do not change settlement to trust the callback amount.

**F13 — Dependency audit**

| Lockfile / exact entry | Installed | Advisory | Classification and action |
|---|---|---|---|
| `admin-panel/package-lock.json:2331`, `node_modules/source-map-js` | 1.2.1 | GHSA-68fv-2mgg-jv7q, high DoS | Dev dependency in CSS/source-map tooling. Update to 1.2.2; compatible with current `^1.2.1` ranges. |
| `mobile-app/package-lock.json:3299`, `node_modules/braces` | 3.0.3 | GHSA-vfj7-8cjw-p6xm, high stack-exhaustion DoS | Reached through micromatch/Metro tooling. Advisory lists **no patched release**. |
| `mobile-app/package-lock.json:5952`, `node_modules/node-forge` | 1.4.0 | GHSA-86w9-cpqp-85rv, high RSA verification issue | Reached through Expo CLI/code-signing tooling. Advisory lists **no patched release**. |
| `tooling/package-lock.json` | Current lock | None reported | 0 vulnerabilities in the registry response. |

The mobile report's 21 entries include transitive “metavulnerabilities” for Expo, Metro, React Native, Sentry and related packages. They derive from **two root advisories**. Do not describe this as 21 independent remote exploits or downgrade Expo to 44 / React Native to 0.72 because `npm audit fix --force` suggests it. These are not a compatible remediation for the Expo 57 project. `node-forge` is not the Web Crypto implementation used by your Razorpay HMAC verifier.

Ready commands for the admin fix and audit gate are in [proposed-code-fixes.md](proposed-code-fixes.md). For braces/node-forge, there is **no verified patched version to copy into package.json** as of this audit. Keep them unresolved until an upstream fix or reviewed pinned fork is validated. Restrict builds to trusted inputs, do not expose Metro publicly, and establish whether the vulnerable operations execute in the release artifact. These are mitigations, not a PASS.

Sources: [source-map-js 1.2.2 upstream release](https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2), [braces upstream issue](https://github.com/micromatch/braces/issues/70), [node-forge upstream issue](https://github.com/digitalbazaar/forge/issues/1149); exact advisory URLs and dependency paths are preserved in the three audit JSON files.

**Edge Function authentication inventory**

| Function | `verify_jwt` in source | Handler control |
|---|---|---|
| create-order | true | Verified Auth user; profile/course; server-priced order |
| create-play-order | true | Verified Auth user; service-only pricing RPC |
| verify-play-purchase | true | Verified user; order ownership; Google receipt/account/order binding |
| attach-external-token | true | Verified user; owner-bound RPC |
| get-note-url / get-video-url | true | Verified user; service-only access RPC |
| delete-account | true | `auth.getUser(token)`; erases only that UUID |
| verify-payment | false | HMAC callback or owner-authenticated recovery; F12 ordering issue |
| razorpay-webhook | false | Raw-body HMAC, current/previous secret; idempotent inbox and settlement |
| login-with-mobile | false | Password verification through Auth plus three database rate buckets |
| request-password-reset-by-mobile | false | Generic result; reset only to account's stored email; rate buckets |
| send-push-notification | false | Verified user, admin membership, configured MFA |
| upload-note-pdf | false | Verified user, admin membership, configured MFA |
| diagnose-play-service-account | false | Verified user, admin membership, mandatory aal2 |
| diagnose-play-pricing | true | Verified user, admin membership, mandatory aal2 |
| diagnose-play-matrix | Not declared | Verified user, admin membership, mandatory aal2; add explicit true stanza |
| sync-play-catalog | false | Constant-time comparison of 32+-character cron secret |
| report-external-transaction | false | Dedicated cron secret |
| play-payment-worker | false | Dedicated cron secret |

The `verify_jwt=false` settings are not themselves vulnerabilities. User authentication and webhook authentication are different mechanisms. No Google RTDN handler is present to audit; do not route Pub/Sub deliveries into a cron-secret function and call that signature verification.

**What is already working**

Server-only settlement/grant functions are revoked from client roles. Client writes to orders/purchases/payments are denied; profile triggers protect role/blocked/verified fields. Razorpay callback HMAC, provider capture status, order association, INR currency and exact server amount are checked. Play verification binds SKU/option, package, account hash, order hash, region, quantity and purchase state. Duplicate tokens/payment IDs cannot generate repeated grants. Wallet reservation and settlement use transaction/advisory locks; refunds/disputes reverse access. The corresponding existing local tests passed.

Private note access was tested at SQL authorization level, not through a production Storage URL. `getPublicUrl()` in admin upload code builds a legacy URL-shaped object identifier; it does not change the notes bucket to public. The current service-only storage-read migration supersedes older purchase-based object-read policies. Free videos are intentional in the requested model.

**Exact missing deployment evidence**

These are release-verification gaps, not additional invented source vulnerabilities:

1. Current schema-only database export **after all deployed migrations**, grants/RLS policies, bucket `public`, size/MIME settings and applied migration list. Existing `docs/live-schema/live_schema.sql` is a snapshot, not proof of this release. Need buyer/nonbuyer signed-URL and direct-public-URL HTTP results against disposable content.
2. Redacted Supabase Auth configuration export: rate limits, CAPTCHA/provider enablement, password hook, redirect allowlist, email confirmation and password policy. Do not include provider secrets. Need the actual email recovery template if it differs from the default.
3. Deployed Edge Function list, deployment timestamps/source digests and effective `verify_jwt` flags; actual admin browser origin. This proves current handlers/config are running.
4. Release APK/AAB or merged Android manifest and extracted JS bundle; verify debuggable/cleartext flags, no private keys, storage migration and ordinary offline/refund/account-switch behavior on a device. No device-level offline test was performed here.
5. Production HTTP header/redirect captures for `http://www.medveda.in`, `https://www.medveda.in/reset-password`, the actual admin URL, and representative Edge errors/successes. Need Vercel's configured deployment root to rule out old root-level/`github-original-website` pages being published.
6. Redacted Razorpay webhook subscription and recent sandbox delivery results; Play package/service-account API access, price-tier readback, worker/cron job successes and a license-tester purchase/refund lifecycle. Static checks cannot validate provider credentials or Play Console configuration.
7. `cron.job` plus recent `cron.job_run_details` for identity/analytics/payment retention; redacted operational retention settings for Auth logs, Edge logs, Sentry and backups. Need proof any previously exposed test credentials were revoked; `supabase/SECURITY_NOTICE.md:8` acknowledges an earlier test-key incident.
8. A pinned Edge dependency graph (`supabase/functions/deno.lock` or deployment resolver output). `npm:@supabase/supabase-js@2` floats; the application lockfile audits do not certify which package version an already-deployed Edge Function resolved.
9. The intended quiz-to-product inventory and CAPTCHA provider configuration/component described in F01/F11.

**Closing checklist**

| Check | Status | Severity |
|---|---|---|
| 1 | FAIL | Critical |
| 2 | FAIL | Low |
| 3 | FAIL | Critical |
| 4 | FAIL | Medium |
| 5 | FAIL | Medium |
| 6 | PASS | — |
| 7 | FAIL | Medium |
| 8 | PASS, source only | — |
| 9 | FAIL | High |
| 10 | FAIL | Medium |
| 11 | FAIL | Medium |
| 12 | FAIL | Medium |
| 13 | PASS, source/SQL only | — |
| 14 | PASS, source/SQL only | — |
| 15 | FAIL | High advisory |
| 16 | PASS, source only | — |
| 17 | FAIL | Critical |
| 18 | FAIL | Low |
| 19 | PASS, source/local harness | — |
| E1 / E2 / E3 | PASS within stated scope | — |
| E4 | FAIL | Critical |
| E5 / E6 / E7 | FAIL | High |

**Final verdict: NO-GO.** Resolve the paid-quiz bypass, targeted-message disclosure, recovery-token handoff and offline protection gaps first. Then close the other listed failures, provide the missing deployment evidence and retest real payment/refund lifecycles in provider test environments. Passing the current regression suite alone is insufficient: it passed while the unpaid-quiz and notification disclosures were reproducible.
