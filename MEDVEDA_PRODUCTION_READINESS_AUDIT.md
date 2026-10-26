# MedVeda production readiness audit — NO-GO

Audit date: 20 October 2026 (UTC). Repository: `/home/ganeshp8545/AyurPulse`; HEAD `5bb3e3e`, **with the existing modified and untracked files included**. This is one audit pass of the current working tree, not certification of that commit or of deployed services. Existing reports were treated as historical context, not proof that their conclusions still hold.

Evidence labels: **CONFIRMED** means directly established in local source or this run's local checks. **PROBABLE/POSSIBLE** would indicate an inference; neither is needed for the findings below. **NOT VERIFIED** means owner, production, provider, Console, or final-artifact evidence is required. A confirmed source defect does not establish that the same version is deployed.

The audit made no deployment, purchase, live Google API request, production DB connection, price change, or commit. Repository writes are limited to this report. Builds/tests ran in `/tmp/medveda-audit-vkxctj9t`, with source copies and existing dependency directories linked read-only in intent; no packages were installed. Two existing cron self-test entrypoints attempted to initialize a local scratch DB before failing to connect; no successful DB write occurred. This was a scope deviation from the requested prohibition on DB writes/attempts, and those tests were not retried. Remaining SQL/migration execution was skipped. No credential values are included here.

## A. Executive summary

**Decision: NO-GO for public production today.** Passing compilation and mocked tests is useful evidence, but does not close these five release gates:

1. **EXT-01:** The established external Play catalog blocker prevents a complete Android paid-notes checkout and licensed billing qualification. Its root cause was deliberately not investigated.
2. **SEC-01:** A downloaded paid PDF remains readable without a bounded offline entitlement lifetime after a refund/void that the device has not observed.
3. **SEC-02:** A direct Storage read policy uses a weaker entitlement check than `get-note-url`, including omission of the blocked-account check.
4. **DB-01:** Account-deletion/retention disclosures omit identity hashes and the original account ID deliberately retained for fraud prevention.
5. **REL-01:** Deployed migrations/RLS/functions/jobs, mandatory admin MFA, monitoring, backups, Console declarations, and the exact uploaded AAB remain **NOT VERIFIED**. The final native binary and end-to-end billing evidence are unavailable in this audit.

Positive evidence: mobile TypeScript, mobile/admin lint, admin production compilation, all 20 Deno entrypoints, 39 Deno test cases, 33 Node self-test files, five additional Deno self-test scripts, and the 17-page local website link check passed. Two DB-dependent Node tests are blocked. Offline npm audit returned zero advisories but provides no fresh advisory-database assurance. No matching private keys or service-role JWTs were found by the bounded secret scan.

## B. Launch blockers — CRITICAL/HIGH only

No CRITICAL vulnerability was demonstrated. Estimates: S = up to one engineering day; M = roughly 2–5 days; L = more than five days or external dependency; estimates exclude waiting for providers.

| ID | Severity / evidence status | Launch impact | Required resolution | Effort |
|---|---|---|---|---|
| EXT-01 | HIGH / NOT VERIFIED here; owner-established external blocker | No qualified paid Android launch without usable Play products | Owner resolves the catalog/Console issue; then verify every existing Admin price has a matching active INR BUY option and passes licensed tests | L / provider timing unknown |
| SEC-01 | HIGH / CONFIRMED in source | Refund/void revocation has an unbounded offline exception | Define and implement a bounded offline license, expiry/revalidation and local-file handling; explicitly decide the permitted revocation delay | M |
| SEC-02 | HIGH / CONFIRMED in source | Blocked buyers can use a weaker direct content path if these policies are deployed | Remove the student direct-read policy or make its checks match the server access rule; verify all Storage read policies together | S–M |
| DB-01 | HIGH / CONFIRMED disclosure/source mismatch | Deletion promises and retained personal identifiers disagree | Choose a justified retention period and cleanup behavior; reconcile in-app/web disclosures and Data Safety with actual retained data | M |
| REL-01 | HIGH / NOT VERIFIED | Runtime security, settlement/revocation operations and the final binary cannot be signed off | Complete the exact owner checklist in K and gate evidence in M; a source audit cannot substitute for it | M plus provider/device time |

### EXT-01 — Play catalog blocks paid Android qualification

- **File:line:** `supabase/migrations/20261016100000_play_catalog_sync.sql:315`; `supabase/functions/create-play-order/index.ts:23`; `mobile-app/src/services/playBillingService.ts:94`.
- **Observed vs expected:** The supplied external blocker prevents product creation. The local order gate requires an active, recently verified, ready INR tier/BUY option at the stored product price. A missing tier returns pending/failed checkout messaging rather than a purchasable order. Expected: all sellable Notes prices have ready catalog entries.
- **Impact:** Buyers cannot prepare payment for affected prices, obtain a valid offer, complete checkout, or generate the licensed purchase evidence needed to qualify restore, consumption and refunds. Free videos and free previews are separate access paths. Existing verified entitlements are not automatically revoked just because catalog creation fails. Later Admin price changes/new price tiers also remain blocked; verification freshness expires after 24 hours unless refreshed.
- **Status:** **NOT VERIFIED** in provider/Console during this run; accepted as the owner's established external blocker. Pending bank verification remains an **unconfirmed hypothesis**, not a finding.
- **Recommended fix:** Owner pursues Google Play/Payments support and restores catalog availability without changing Admin prices or routing Android buyers to Razorpay.
- **Safe verification:** Owner first inspects Console/support status and catalog readiness. Subsequently, in an authorized licensed test release, confirm exact INR prices/options, purchase, recovery, consumption and reversal. No such calls/tests were performed here.

### REL-01 — Production and exact-artifact release evidence missing

- **File:line:** `supabase/config.toml:19`; `supabase/play_payment_cron_setup.sql:1`; `supabase/play_catalog_cron_setup.sql:1`; `mobile-app/eas.json:67`; `mobile-app/app.config.js:41`.
- **Observed vs expected:** Local source and setup SQL exist; this run has no live inventory of deployed versions, policies, job execution, alerts, backups or the uploaded binary. Expected: evidence tied to the precise release candidate and deployed backend.
- **Impact:** A clean local build could coexist with stale vulnerable policies, inactive refund workers, disabled MFA, incorrect native manifest or incomplete Console declarations. These are release uncertainties, **not claims that production is misconfigured**.
- **Status:** **NOT VERIFIED**.
- **Recommended fix:** Complete K, retain sanitized evidence and release hashes, and obtain the gate approvals in M.
- **Safe verification:** Owner uses read-only Console/dashboard inspection first. Device/provider lifecycle tests and restore exercises happen later in an expressly authorized test environment.

## C. Security findings

### SEC-01 — Offline paid-note access has no entitlement expiry

- **Severity / status:** **HIGH / CONFIRMED** local behavior; production prevalence **NOT VERIFIED**.
- **File:line:** `mobile-app/src/services/offlineNoteAccess.ts:6`, `:11`, `:27`; `mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx:45`, `:58`; `mobile-app/src/utils/downloadManager.ts:204`, `:215`.
- **Observed vs expected:** Same-owner downloads are allowed after a network/server failure unless an earlier 403 was persisted. No last-success timestamp or offline deadline is checked. A 403 is remembered and a 401 denies access, which is good, but a device kept offline never learns about a new refund/void. Expected under the supplied business rule: revocation must have a defined, bounded enforcement window.
- **Impact:** A refunded buyer can retain offline reading indefinitely while their local session/owner state remains usable. Downloaded PDFs are ordinary app-private PDF files; a signed URL's 120-second lifetime does not expire those bytes. This does **not** demonstrate access by a never-entitled free account.
- **Recommended fix:** Agree the offline grace period; enforce a server-issued expiring license with conservative clock handling and revalidation; invalidate/delete revoked copies and protect stored files according to the threat model. Already copied bytes cannot be recalled from outside the app.
- **Safe verification:** Use a mocked clock and mocked 403/401/timeout/503 responses: a previously downloaded same-owner note must stop opening after the approved deadline, survive only within grace, and remain denied after confirmed revocation. Later test refund/reconnect behavior on a licensed device.

### SEC-02 — Storage read policy omits blocked-account authorization

- **Severity / status:** **HIGH / CONFIRMED** source inconsistency; actual deployed policy behavior **NOT VERIFIED**.
- **File:line:** `supabase/migrations/20260930110000_low_grants_tightening.sql:44`; `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:859`; `supabase/migrations/20260924150000_free_preview.sql:53`; `supabase/migrations/20260701000000_baseline_live_schema.sql:684`.
- **Observed vs expected:** `notes_read_if_purchased` permits authenticated Storage SELECT for an active note when `user_owns_chapter` succeeds. That helper checks purchase status/scope/course, but not `profiles.blocked`; the notes metadata SELECT also lacks a blocked-account test. In contrast, `user_can_access_note`, used by `get-note-url`, explicitly rejects blocked profiles. Later trusted-upload migrations restrict Storage writes, not this SELECT path. Expected: every PDF access route enforces the same blocked-account and entitlement rules.
- **Impact:** A blocked purchaser holding a valid session can bypass `get-note-url` with an authenticated direct Storage request under the local policy chain. The direct client Storage API also means the Edge Function is not the exclusive signing/read boundary claimed by comments in `secureNotesService.ts`. An unpurchased free user is not granted this paid-file read by the reviewed policy.
- **Recommended fix:** Prefer service-mediated reads only, or centralize and apply identical authorization to direct Storage reads. Preserve free-preview/admin requirements and verify policy composition, not just one policy.
- **Safe verification:** Inspect `pg_policies` and bucket privacy read-only. In an isolated fixture DB, assert anon, free, paid, blocked-paid, refunded and wrong-account outcomes through both Storage and the function. Do not expose real PDF URLs/tokens in evidence.

### SEC-03 — Admin MFA is switchable and defaults off

- **Severity / status:** **MEDIUM / CONFIRMED** default; enforced production value **NOT VERIFIED**.
- **File:line:** `supabase/migrations/20261001100000_admin_mfa_aal2.sql:11`, `:26`, `:42`; `admin-panel/src/pages/Login.tsx:78`; `supabase/functions/upload-note-pdf/index.ts:37`.
- **Observed vs expected:** `require_mfa` is seeded false. `am_i_admin` and ordinary admin operations accept AAL1 while it is false, and enrollment can be skipped. Diagnostics enforce AAL2 unconditionally. Expected for production administration: MFA required at the server boundary.
- **Impact:** Password-only admin API access remains possible unless the owner enabled the switch. The presence of an enrollment UI is not proof of enforcement.
- **Recommended fix:** Enroll every admin, retain recovery access, then enable the existing owner-controlled requirement. This audit did not toggle it.
- **Safe verification:** Owner reads `admin_settings.require_mfa` and verified factor coverage; later verify AAL1 denial and AAL2 success against admin RLS/RPCs and functions.

### SEC-04 — Temporary credential/Publisher diagnostics remain in the release surface

- **Severity / status:** **LOW / CONFIRMED** presence and local authorization; deployment **NOT VERIFIED**.
- **File:line:** `admin-panel/src/pages/Settings.tsx:152`; `admin-panel/vercel.json:4`; `supabase/functions/diagnose-play-service-account/index.ts:39`; `supabase/functions/diagnose-play-pricing/handler.ts:30`; `supabase/functions/diagnose-play-matrix/handler.ts:64`; `supabase/config.toml:32`.
- **Observed vs expected:** Two diagnostic panels and a same-origin pricing rewrite remain. Three diagnostic function directories exist. All handlers verify an Auth user, admin membership and AAL2 before credential use. The service-account endpoint returns a bounded comparison result; pricing and matrix can make fixed Google calls. None is part of student checkout. Expected: only necessary production operator features remain, with explicit deployment configuration.
- **Impact:** Additional privileged maintenance surface and accidental provider calls; no unauthenticated credential disclosure was demonstrated. `diagnose-play-matrix` lacks an explicit local `verify_jwt` stanza, so its gateway setting must be inspected rather than assumed false.
- **Recommended fix:** Remove the two panels, proxy rewrite and all three temporary deployed functions before public launch, or retain them only under a documented operational need and explicit rate limits/gateway settings. Removing only the UI does not remove deployed endpoints.
- **Safe verification:** Static route/config inventory and deployed function inventory; inspect authentication failure behavior later with sanitized fixture sessions. No diagnostics were invoked live here.

### Security controls and coverage where no additional defect was established

| Area | Local evidence / result | Limit |
|---|---|---|
| Secrets | Pattern scan of 1,039 worktree files and 1,936 unique reachable history blobs: zero matching PEM private keys, service-role JWTs or selected provider-secret prefixes. Env key-name inspection shows public Supabase config in clients and ignored local Vercel OIDC-token files. Gitignore excludes env/credentials/native keys | Pattern-based, not entropy-complete; files over 15 MB and dependency directories excluded. No remote deleted/unreachable history, secret validity, CI secret inventory or final mobile bundle assurance |
| Public keys | Mobile `EXPO_PUBLIC_*` values reviewed are URL, publishable/anon key and optional public Sentry DSN; no service-role key was identified in client source | Public Supabase keys are expected; RLS/grants/rate limits are the access boundary |
| Session storage | `mobile-app/src/config/secureSessionStorage.ts:72`: native session blob encrypted with a fresh AES key stored in SecureStore; foreground auto-refresh in `mobile-app/src/config/supabase.ts:81` | Browser adapter uses unencrypted AsyncStorage; admin Supabase defaults persist browser sessions. Browser XSS would expose bearer sessions; this audit did not demonstrate XSS |
| Admin browser | React-rendered content; no `dangerouslySetInnerHTML`/`eval` sink found in reviewed app source. CSP/HSTS/frame denial/nosniff/noindex configured in `admin-panel/vercel.json`; Vite build has no generated `.map` files | Deployed headers, external scripts, host redirects, session lifetime and artifact exposure NOT VERIFIED. Authenticated APIs use bearer tokens, not ambient app cookies; no CSRF exploit demonstrated |
| Auth abuse | Mobile-number login uses fail-closed DB-backed IP/phone limits (`supabase/functions/login-with-mobile/index.ts:53`); reset uses generic responses and limits (`supabase/functions/request-password-reset-by-mobile/index.ts:43`); config sets password complexity | Supabase Auth direct-email/signup/OTP quotas, captcha, SMTP deliverability, leaked-password setting and trusted proxy/IP behavior require dashboard verification. Reset limiter fails open on DB error by design |
| Privilege escalation | Admin membership keyed by `admins.id`; profile guard protects role/block/verification/course fields; order/settlement writes restricted; service-only grants on settlement functions | Negative role tests were not executed against a DB. Schema drift/extra production policies could change outcomes |
| Mobile hardening | Cleartext disabled in dynamic config, backups disabled in app.json, `trustAllCerts={false}` for PDFs, app-wide screen-capture prevention; WebView navigation/HTML self-tests pass | Exact manifest/debuggable/exported components and screenshot protection must be checked on release binary. No root/tamper or Play Integrity gate was found; absence alone is not a release vulnerability |
| Paid files | Private notes bucket configured, purchase/free-preview authorization and 120-second function URLs; 300-second default admin preview URL | SEC-01/SEC-02 remain. Signed URLs are bearer capabilities and can be shared during validity; no claim of DRM or absolute copy prevention |
| Dependencies | npm locks exist; offline audit returned zero; Deno cached imports checked successfully | Fresh advisories and Deno transitive advisory review NOT VERIFIED; see API-02 |

## D. Payments findings — 403 root cause excluded

Payment verification/replay/refund implementation existence was accepted as established, as requested. This section summarizes routing, contracts and release consequences, rather than re-auditing that established logic.

### PAY-01 — Native-vs-website Razorpay routing depends on an optional header

- **Severity / status:** **MEDIUM / CONFIRMED** boundary limitation; behavior of installed older binaries **NOT VERIFIED**.
- **File:line:** `supabase/functions/create-order/index.ts:30`; `supabase/functions/_shared/paymentGate.ts:13`; `supabase/migrations/20261012100000_google_play_ucb.sql:43`; `mobile-app/src/config/paymentProvider.ts:9`; `mobile-app/src/services/paymentService.ts:75`.
- **Observed vs expected:** Current Android provider is unconditionally Play, navigation selects the Play screen, and the Razorpay client service rejects it. The server rejects `create-order` when `x-medveda-app-version` is present. With that header omitted, rollout configuration `require_ucb_for_razorpay=false` allows the website-style path. The code explicitly acknowledges it cannot identify a headerless Android client. Expected: accurately scoped assurance about supported Android releases and website access.
- **Impact:** A modified or older headerless caller can reach authenticated website order creation; this is **not proof of a Razorpay path in the current Android UI**. CORS or a claimed platform header cannot attest client identity. Conversely, switching the existing UCB flag on indiscriminately would also reject ordinary website callers missing a native version/choice.
- **Recommended fix:** Inventory installed release routes, retire unsupported versions, and document/design the website authentication/order boundary. Do not declare spoofable headers an anti-bypass security control, disable website checkout blindly, or re-enable dormant alternative billing as a workaround.
- **Safe verification:** Mock header-present/header-absent calls under each rollout configuration; inspect archived shipped code/artifacts and the actual website client. Later test supported signed binaries on a licensed track.

| Payment area | Evidence summary | Release status |
|---|---|---|
| Android provider | Android always returns `play`; production/internal EAS profiles select Play; dynamic config rejects Razorpay for Google Play build profiles; provider-specific Android runtime | PASS locally; exact uploaded artifact NOT VERIFIED |
| Server authority | Client sends product/order/token, not a trusted amount. Play order snapshots amount, SKU and BUY option; API reads back the order. V2 validation binds account/order hashes and option. Website orders price in DB | Established source mechanism; actual production deployment NOT VERIFIED |
| Replay/idempotency | Unique token/payment/order constraints and atomic settlement are present; regression/self-tests pass | DB concurrency suites not run; do not infer a live exactly-once guarantee |
| Pending/recovery | App handles pending, restores on startup/sign-in/resume, matches hashed account/order, and loads server purchases after local state loss | Mocked lifecycle/restore tests pass; reinstall/account-switch/device evidence NOT VERIFIED |
| Consumption | Server consumes after grant, records status and retries via worker; client avoids double finishTransaction. Reusable price SKU allows distinct notes at same price | Mocked consumption/worker tests pass; Google acceptance and deadlines NOT VERIFIED |
| Refunds/voids | Worker/reconciliation and Razorpay refund/dispute paths exist; durable provider-event inbox and signature checks use raw body HMAC (`supabase/functions/razorpay-webhook/index.ts:117`) | Production events, secret configuration, cron and latency NOT VERIFIED; offline exception SEC-01 |
| Razorpay amount/webhooks | Server creates priced order; raw-body signature before parsing; authenticated inbox, provider re-fetch and duplicate handling exist | Local mock checks pass; actual website client, webhook subscriptions/live-mode settings NOT VERIFIED |
| Website client | `website/` is a static marketing/legal/auth site; reviewed assets/pages do not contain a `create-order`/Razorpay checkout client | Separate website checkout source/deployment was not supplied or identifiable here. Backend summary is not full website checkout sign-off |

EXT-01 blocks new paid Android catalog qualification, not free-video publication or the independent website backend. Do not launch paid Android notes with a Razorpay fallback. Live price values were neither read nor changed.

## E. Database findings

### DB-01 — Retained identity data is omitted from deletion disclosures

- **Severity / status:** **HIGH / CONFIRMED** code/disclosure mismatch; actual retained rows and retention jobs **NOT VERIFIED**.
- **File:line:** `supabase/migrations/20260927130000_batch3b_antifarming.sql:50`; `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1933`; `supabase/DEPLOY_ORDER.md:75`; `website/delete-account.html:51`; `website/privacy-policy.html:80`; `mobile-app/src/screens/privacy/PrivacyScreen.tsx:108`.
- **Observed vs expected:** `first_purchase_identities` intentionally retains email/phone hashes and a non-FK `account_id` after deletion. The latest erase RPC does not remove them; no TTL purge was found. The migration itself says to treat phone hashes as personal data, and the deployment checklist says to disclose them. User-facing copy instead promises erasure with financial/legal-record exceptions, and the deletion page says everything else linked to the account is deleted. Expected: precise disclosure and implemented retention/deletion treatment for this data.
- **Impact:** Account deletion does not match the stated retained-data inventory; a residual original account identifier remains associated with persistent identity hashes. This is a demonstrated discrepancy, not a legal ruling on whether anti-fraud retention is permissible.
- **Recommended fix:** Owner chooses a justified fraud-data retention policy, expiry/deletion mechanism and identifier minimization; update source templates, generated web pages, mobile privacy copy, support procedure and Data Safety accordingly. Do not silently remove fraud controls or invent a legal exception.
- **Safe verification:** Read the deployed definition/retention job inventory; in an isolated fixture, delete a buyer and enumerate every remaining reference/hash, comparing it with the approved disclosures. No real account was deleted here.

### Migration and integrity review

- **57 migration files**, unique version prefixes; no duplicate version ID found. Filenames mix eight-digit and fourteen-digit timestamps. Repeated function replacements and `IF NOT EXISTS` baseline reconciliation are intentional patterns, not in themselves evidence of a conflict. Static review cannot certify fresh replay, upgrade replay or production ordering. Supabase CLI was unavailable; SQL tests require writes and were not authorized.
- Latest definitions were traced where older migrations conflict: the email-based `is_admin` function is dropped by `supabase/migrations/20260927100000_f7_drop_legacy_admin_policies.sql:54`; reviewed surviving SECURITY DEFINER definitions pin search_path. `supabase/migrations/20260930100000_medium_db_hardening.sql:18` also pins helper paths. This is a source check, not a catalog-wide runtime linter result; owner must check function privileges, owners and writable-schema CREATE rights.
- Token/payment ID uniqueness, purchase order uniqueness, provider consistency checks and order immutability are present. `supabase/migrations/20261012100000_google_play_ucb.sql:78` and `:93` protect Play tokens; the catalog migration has one active verified tier per price and snapshots BUY option. Advisory/row locks, `SKIP LOCKED`, leases and fenced completion are present. Atomicity of a DB RPC does not imply atomicity with a provider HTTP call; reconciliation remains necessary.
- Foreign-key/index hardening is provided by `supabase/migrations/20260930100000_medium_db_hardening.sql:80`; queue indexes and verified-attempt user/recent indexes are present. Query plans, production row counts, bloat and hot-query latency are NOT VERIFIED.
- Admin product prices feed server orders and exact INR offer matching. Catalog sync does not rewrite product prices. Product edit validation permits up to two decimal places (`admin-panel/src/components/ProductFormModal.tsx:229`). No live Admin/stored-price comparison was possible.
- Hard-delete services exist for products/content with confirmation. Retained orders/payments use SET NULL on account deletion; purchases/profile/referrals are removed, wallet/review flags use SET NULL, verified quiz attempts cascade from Auth. The Edge operation erases app data before separately deleting Auth and supports retries; those two provider operations are not one transaction. Full cascade behavior requires fixture SQL verification, especially DB-01 and post-deletion in-flight payments.
- Analytics/payment-session retention SQL and separate cron setup files exist. Presence of a setup script does not establish an enabled job. Backup tier, PITR, retention and restore timing remain NOT VERIFIED.

### Complete local public-table RLS inventory

All **46 public tables created by the migration set** have an `ENABLE ROW LEVEL SECURITY` statement; no `DISABLE ROW LEVEL SECURITY` statement was found. **Tables with RLS off in local source: none identified. Production tables with RLS off: NOT VERIFIED; no production list was retrieved.** Views and Supabase-managed Auth/Storage/system tables require separate deployed inspection.

| Table group | Every table in scope | Source posture |
|---|---|---|
| Catalog / config | `courses`, `years`, `subjects`, `chapters`, `notes`, `videos`, `products`, `quiz_tests`, `notifications`, `app_settings`, `app_config` | RLS enabled; public/active or authenticated metadata/config reads and admin writes. Metadata reads are not PDF-byte authorization |
| Identity / student state | `admins`, `profiles`, `push_tokens`, `quiz_scores`, `verified_quiz_attempts`, `analytics_events` | RLS enabled; admin/self ownership; analytic own-or-anon insert with limits; newer quiz scoring via validated RPC |
| Referral / wallet | `referral_settings`, `referrals`, `wallet_ledger`, `order_review_flags`, `first_purchase_identities`, `referral_settings_audit`, `wallet_order_reservations`, `first_discount_reservations` | RLS enabled; self/admin reads or no client access; protected writes and server-only identity records |
| Payments | `orders`, `purchases`, `payments`, `payment_sessions`, `razorpay_webhook_events`, `ucb_external_refunds`, `provider_events`, `payment_captures`, `payment_compensations`, `payment_jobs` | RLS enabled; own/admin reads where required; grants narrowed/server-only writes |
| Play / queues | `play_price_tiers`, `play_void_sweep_state`, `play_payment_jobs`, `play_void_tokens`, `play_recovery_cursor`, `play_price_sync`, `play_price_sync_logs` | RLS enabled; server-only work, limited admin catalog views/reads |
| Note upload | `note_upload_requests`, `note_pdf_validation_jobs` | RLS enabled; direct client privileges revoked; admin-authorized RPC/function lifecycle |
| Access infrastructure | `admin_settings`, `rate_limits` | RLS enabled; no ordinary client access; privileged helpers manage MFA configuration and rate-limit counters |

Broad/permissive policies needing explicit recognition:

- `app_config_public_read`: SELECT `USING (true)` to anon/authenticated (`supabase/migrations/20260920130000_app_config.sql:40`, reasserted in phase1a). Intentional; never put secrets here.
- `referral_settings_read_authenticated`: SELECT `USING (true)` to authenticated (`supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1265`). Intentional public-to-users program settings.
- `Authenticated users can read notes`: metadata SELECT for any signed-in user (`supabase/migrations/20260701000000_baseline_live_schema.sql:684`). Exposes stored PDF identifiers; does not alone authorize a private PDF download.
- Active catalog/notification metadata and thumbnail reads are deliberately broad. The original analytics `WITH CHECK (true)` policy is **dropped**, replaced by own-or-anon insertion (`supabase/migrations/20260926130000_batch1_hygiene.sql:17`); it is not reported as a surviving hole.
- Storage `notes_read_if_purchased` is a surviving permissive SELECT path: **SEC-02**. Public thumbnail SELECT is intentional. Notes writes and quarantine have restrictive policies in the 18 October migrations. Arbitrary extra deployed policies cannot be ruled out from this inventory.

## F. API / Edge Function findings

### API-01 — Mobile Play HTTP requests have no application deadline

- **Severity / status:** **MEDIUM / CONFIRMED**.
- **File:line:** `mobile-app/src/services/playBillingService.ts:71`, `:76`; `mobile-app/src/screens/payment/PlayBillingScreen.tsx:85`, `:114`.
- **Observed vs expected:** `authenticatedPost` awaits fetch/response JSON without AbortSignal/deadline; checkout holds `working=true` while preparing/paying. Expected: bounded network waits and a recoverable pending/error state.
- **Impact:** A stalled mobile connection can leave checkout spinning until the platform eventually fails it or the user exits. This is not evidence of an entitlement bypass.
- **Recommended fix:** Add bounded cancellation/deadlines and preserve ambiguous verification as recoverable pending; do not mark an already-charged purchase failed simply on timeout.
- **Safe verification:** Mock a fetch that never resolves, cancellation, delayed server success and app resume; verify controls recover and restore can settle once.

### API-02 — Edge dependency resolution is not fully reproducible

- **Severity / status:** **MEDIUM / CONFIRMED** local dependency declaration; deployed resolved tree **NOT VERIFIED**.
- **File:line:** `supabase/functions/_shared/supabaseAdmin.ts:1`; `supabase/workers/validate-note-pdf.ts:5`.
- **Observed vs expected:** Imports use `npm:@supabase/supabase-js@2`; no checked-in Deno lockfile was found. Checks in this audit use the already cached resolution. Expected: an exact/reviewed dependency tree associated with the release.
- **Impact:** A later deployment/check can resolve a different compatible SDK/transitive tree, complicating contract and vulnerability assurance. No specific vulnerable Deno dependency was established.
- **Recommended fix:** Pin reviewed versions and maintain an enforced lock/resolution inventory supported by the deployment workflow.
- **Safe verification:** Resolve/check offline from the approved lock/cache and compare dependency/deployment manifests; fresh advisory lookup requires a separately permitted network check.

### Complete function authentication inventory

`verify_jwt=false` is not treated as equivalent to unauthenticated access. Handlers were reviewed for their actual trust boundary.

| Function(s) | Local gateway setting | Handler boundary |
|---|---|---|
| `create-order`, `create-play-order`, `verify-play-purchase`, `attach-external-token` | true | Auth user from verified bearer; user-bound order/RPC checks and rate limits |
| `get-note-url`, `get-video-url` | true | Auth user, rate limit and server access RPC |
| `delete-account` | true | Auth getUser, caller-only ID, admin deletion refused |
| `upload-note-pdf`, `send-push-notification` | false | Auth getUser, admin membership, configured MFA requirement, limits |
| `login-with-mobile` | false | Pre-login password through Supabase Auth; fail-closed IP/phone limits |
| `request-password-reset-by-mobile` | false | Pre-login generic response and throttles; sends recovery only to account address |
| `verify-payment` | false | Signed callback and provider verification; unsigned recovery requires authenticated owner |
| `razorpay-webhook` | false | Raw-body HMAC and provider event processing |
| `sync-play-catalog` | false | Dedicated catalog cron secret |
| `play-payment-worker` | false | Dedicated payment cron secret with fixed-length comparison |
| `report-external-transaction` | false | Dedicated UCB cron secret; dormant/legacy payment support |
| `diagnose-play-service-account` | false | Verified Auth + admin + unconditional AAL2 |
| `diagnose-play-pricing` | true | Verified Auth + admin + unconditional AAL2; same-origin Vercel proxy |
| `diagnose-play-matrix` | Not explicitly set | Verified Auth + admin + unconditional AAL2 in handler; gateway deployment NOT VERIFIED |

All 19 function entrypoints and the standalone PDF worker passed Deno check. Local Play create/verify response field names agree with mobile `PlayOrder`/verification types; error translation includes pending/failed price tiers. Upload request IDs/statuses and admin handling have passing contract/self-tests. Production versions remain unverified.

Shared CORS is wildcard, without credentialed-cookie permission (`supabase/functions/_shared/cors.ts:3`). Bearer authentication remains mandatory on protected functions. This was not elevated into a generic CORS exploit. It omits `x-medveda-app-version`; any future browser client sending that header needs a preflight contract check. Pricing diagnostics intentionally omit cross-origin CORS and use the Vercel proxy. Google/Razorpay helpers use bounded provider requests; mobile Play deadline gap is API-01. Some handlers authenticate before their catch block and depend on platform handling for unexpected Auth failures; no reproducible crash was demonstrated.

Unused/dormant surface: `attachExternalToken` is exported but not used by the current Play-only UI; UCB reporting still supports historical data and must not be deleted without checking outstanding jobs/orders. `get-video-url` exists, while `VideosScreen` opens the fetched YouTube URL directly; the videos are free and the database remains their metadata gate. Temporary diagnostics are inventoried in SEC-04. Hardcoded production Supabase URLs appear in build/cron/proxy configuration deliberately; environment isolation must be checked before staging operations.

## G. Mobile app — functional, UI, configuration and performance

### MOB-01 — Admin Maintenance Mode has no mobile implementation

- **Severity / status:** **MEDIUM / CONFIRMED** source mismatch.
- **File:line:** `admin-panel/src/pages/Settings.tsx:130`; `admin-panel/src/services/settingsService.ts:59`; `mobile-app/App.tsx:69`; `mobile-app/src/services/appConfigService.ts:50`.
- **Observed vs expected:** Admin saves `maintenanceMode` to app_settings and promises a blocking maintenance screen. No mobile consumer of `maintenanceMode`/`maintenance_mode` was found. Root rendering only chooses force-update vs normal navigation; configuration fetch reads min version/store URL. Expected: the advertised maintenance switch changes app behavior.
- **Impact:** Owner cannot rely on this switch to stop student activity or contain a release incident. It is not a server payment kill switch either.
- **Recommended fix:** Implement and test maintenance behavior with support/retry semantics and separately decide server-side purchase gating, or remove the false operator promise until implemented.
- **Safe verification:** With mocked settings, test on/off transitions, startup, resume and offline behavior. Do not toggle production as an audit test.

### MOB-02 — Historical migrations still seed an obsolete Store URL

- **Severity / status:** **LOW / CONFIRMED** local seed mismatch; actual configured value **NOT VERIFIED**.
- **File:line:** `supabase/migrations/20260920130000_app_config.sql:61`; `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1652`; `admin-panel/src/services/settingsService.ts:39`; `mobile-app/src/services/appConfigService.ts:61`.
- **Observed vs expected:** Seeds use Android listing `com.medveda.app`; the real package is `in.medveda.app`. Admin loads the stored value without converting it. Current mobile code recognizes that specific stale URL and falls back to the correct listing. Expected: one correct stored listing URL for all consumers.
- **Impact:** Admin can display/preserve a stale Store URL; older or other consumers may use it. The current mobile fallback mitigates the direct update-link failure.
- **Recommended fix:** Owner checks the live key and corrects it if stale; add a forward migration/validation rather than rewriting applied migration history. No value was changed here.
- **Safe verification:** Read `app_config.store_url`; verify it matches the package of the published listing. `com.ayurpulse.app` was found only in historical reports/build evidence, not current runtime settings source. `com.medveda.app` in `app.json` is also an iOS bundle identifier, which is a separate platform identifier.

| Topic | Observed source evidence | What remains |
|---|---|---|
| Navigation/errors | Navigator ErrorBoundary, many loading/empty/error states, defensive PDF params; lifecycle/quiz-hook self-tests pass | No rendered-device or navigation E2E run. Some screens assume typed route params; no concrete crash reproduced |
| Offline/session | Catalog cache fallback, download integrity checks, account ownership cleanup, secure sessions, foreground refresh, restore triggers | SEC-01; prolonged offline expiry, shared-device race behavior and storage exhaustion need device qualification |
| Force update | Native installed version compared with remote min version; six-second check, ten-minute successful cache, fail-open on error | Suitable UX gate, not a security control or guaranteed emergency shutdown. Actual minimum/versionCode/store availability NOT VERIFIED |
| Labels/prices/languages | Notes paywalls and free-video labels exist; Play shows formatted provider price and exact INR match; English UI with AYUSH/course names | No translation completeness claim for Hindi/Marathi. Check wrapping and numeric formatting on real devices; no screenshot-based defect invented |
| Theme/layout/accessibility | Dark theme configured; some screens including PDF use white backgrounds. FlatLists used; forms include scrolling in reviewed flows | Small screens/tablets/font scaling/TalkBack/focus/contrast/keyboard behavior NOT VERIFIED. Icon-only controls need a device accessibility pass |
| Performance | Search builds a course catalog in memory (`mobile-app/src/services/searchService.ts:70`), chapters capped at 2,000, several repositories use unpaginated list reads; screen effects/timers commonly clean up | Search completeness at API row limits, low-memory behavior, large PDF loading, startup cost and native bundle size NOT VERIFIED; no measured regression claimed |
| Package/version | app.json version `1.2.0`, Android `in.medveda.app`; EAS remote version source with autoIncrement | Actual uploaded versionCode/versionName and signing identity NOT VERIFIED |
| Permissions/native build | Explicit INTERNET/POST_NOTIFICATIONS; several unwanted permissions blocked; expo-iap plugin; cleartext false and backup false configured | Generated/merged manifest including BILLING, unexpected transitive permissions, exported components, debuggable flag, targetSdk and native library ABI/page alignment NOT VERIFIED |
| Architecture/16 KB | Expo 57/RN 0.86 and native PDF/blob/IAP/reanimated packages in lock/config | Versions alone prove neither New Architecture compatibility nor 16 KB support. Test native build and final `.so`/ZIP alignment and device execution |
| OTA | Base appVersion runtime plus Android override `${version}-${paymentProvider}` (`mobile-app/app.config.js:41`); separates Razorpay and Play runtimes/channels | Native dependency changes still require a version/runtime bump. No local signing certificate was found; signing activates only if supplied. EAS signing files/env, channel mapping, final embedded runtime and rollback compatibility NOT VERIFIED |
| Shrinking/icons/push | R8/resource shrinking opt-in only for shrink-test; icons/splash assets exist; FCM is conditional on an external file/env | Production minification is not claimed enabled. Native smoke tests, icon rendering, FCM provisioning/push delivery NOT VERIFIED |

## H. Admin panel

### ADM-01 — Settings save spans two independent database operations

- **Severity / status:** **MEDIUM / CONFIRMED**.
- **File:line:** `admin-panel/src/services/settingsService.ts:43`, `:50`, `:59`.
- **Observed vs expected:** Save first upserts minimum version/store URL, then updates app_settings. Failure of the second call throws after the first succeeded. Expected: atomic operator save, or explicit partial-success reporting.
- **Impact:** Operator sees failure even though forced-update configuration may already have changed; retry/confusion during an incident can lock out users unexpectedly. No actual production partial save was observed.
- **Recommended fix:** Use one authorized transactional RPC, or split operations into clearly separate saves with accurate per-operation status.
- **Safe verification:** Stub the second request to fail and confirm first-request persistence is handled truthfully; test the transactional replacement in a fixture DB.

Admin build, lint and six self-test files pass. ProtectedRoute uses server `am_i_admin`, and actual write authorization is RLS/RPC-based rather than the UI flag. Product prices validate finite nonnegative two-decimal INR; server checkout requires a usable positive price/tier. Destructive product/content actions have confirmation; product mutations require affected-row confirmation. Role denial, MFA enrollment/challenge/recovery and error handling still need deployed/device tests.

Audit logging is present for referral settings and payment/catalog workflows, not demonstrated for every product-price/content/user mutation. Before public launch, define which administrative changes require an attributable before/after record. Vercel headers are configured and Vite emits split route chunks; deployed env/headers/rewrites are NOT VERIFIED. The successful temporary build omitted local env files, so it proves compilation/bundling, **not** a runnable production Supabase configuration. Actual local env key names were checked without printing values. Temporary settings panels are SEC-04; maintenance and split-save behavior are MOB-01/ADM-01.

## I. Google Play compliance — code/docs evidence only

“VERIFIED” below means local source presence only. No current-policy numerical deadline, Console acceptance or legal compliance is inferred from dependency versions or old reports. Current Play requirement applicability must be checked by the owner; no live Google API or Console access was used.

| Requirement | Local evidence | Verdict |
|---|---|---|
| Android digital-content billing | Forced Android Play provider, Play-only routes/build configuration; no current UI Razorpay fallback identified | VERIFIED in source; catalog/testing blocked; final AAB NOT VERIFIED |
| Free educational videos / paid notes | Free-video SQL and labels; notes preview/purchase rules | VERIFIED in source; eligibility/deployed data NOT VERIFIED |
| Privacy/Terms/refund links | `mobile-app/src/constants/legal.ts:19`; in-app legal screens; website privacy/terms/refund/delete-account pages | VERIFIED presence; public reachability/accurate final text NOT VERIFIED; DB-01 fails consistency |
| Data Safety inventory | `mobile-app/DATA_SAFETY_AUDIT.md` documents account/profile, purchase tokens/history, study/analytics/search, push and conditional crash collection | Worksheet present; Console collection/sharing/purpose/retention declarations NOT VERIFIED. Document also contains historical sections and must be reconciled to final build |
| Account deletion in app | Settings confirmation, caller-authenticated Edge erase/delete, explicit server success before local sign-out (`usersService.ts`) | VERIFIED mechanism; deployed erasure/cascades NOT VERIFIED; DB-01 unresolved |
| External deletion page | `https://www.medveda.in/delete-account`, local page describes in-app and email routes | VERIFIED local file/instructions; Console URL, public accessibility and actual support processing NOT VERIFIED |
| Refund terms | Local refund-policy page and refund legal URL | VERIFIED presence; compare final Google-vs-website provider wording and support process; no legal conclusion |
| Audience/children | Degree-level AYUSH intent; privacy copy discusses under-18 supervision | Console age groups, Families applicability, content rating, consent claims and actual audience NOT VERIFIED; an educational label does not settle audience classification |
| Permissions | Source list is limited; plugin/native dependencies can add permissions | Merged manifest and Console justifications NOT VERIFIED |
| targetSdk / Billing version / 16 KB | Native package/config evidence only | Current Play requirement and exact uploaded binary compliance NOT VERIFIED |
| Listing / reviewer access | Package/name/legal links available in source | Store name/screenshots/pricing/free-vs-paid claims, release notes, app-access reviewer credentials and pre-launch report NOT VERIFIED |

## J. Local test results

Commands below ran in the temporary source snapshot unless specified. Node `v22.23.1`; Deno `2.9.7` / TypeScript `6.0.3`. No npm install/update, Deno network permission, hosted test, migration application, build upload or live provider test was performed.

| Check | Exact command / invocation | Result and output summary |
|---|---|---|
| Mobile types | `cd mobile-app && ./node_modules/.bin/tsc --noEmit` | **PASS**, exit 0, no diagnostics |
| Admin types/build | `cd admin-panel && npm run build` (`tsc -b && vite build`) | **PASS**, exit 0; Vite 6.4.3, 185 modules, 4.29 s; main JS 468.06 kB / gzip 136.37 kB; CSS 22.48 kB. No source maps emitted. This is not a runtime/deployment test |
| Lint | `./tooling/node_modules/.bin/eslint mobile-app/App.tsx mobile-app/src admin-panel/src` | **PASS**, exit 0, no diagnostics under repository rule set |
| Node self-tests | For sorted glob union `mobile-app/scripts/*selftest*`, `admin-panel/scripts/*selftest*`, `supabase/tests/*selftest.cjs`, `scripts/*selftest*`: execute `node --experimental-strip-types <file>` with Python subprocess per file | **33 PASS / 2 BLOCKED** among 35 files after the fixture-copy correction below. Individual subprocess exit codes inspected; wrapper exit 0 was not used as suite success |
| Catalog fixture correction | Copied existing `docs/audit/evidence/play-403-release-20261019/manifest.json` into matching temp path; ran `node supabase/tests/play-catalog-worker-selftest.cjs` | **PASS**. First attempt failed ENOENT because the audit snapshot lacked the referenced manifest; not a repository defect. Corrected run passes mocked worker auth/retry/failure-persistence tests. No 403 root-cause investigation |
| Cron DB self-tests | `node --experimental-strip-types supabase/tests/play-cron-config-selftest.cjs`; same for `ucb-cron-config-selftest.cjs` | **BLOCKED**, each exits 1 at scratch DB creation with `psql: error`. No connection/write success. Not retried; see scope deviation above |
| Edge/worker type check | `deno check --cached-only --no-lock supabase/functions/*/index.ts supabase/workers/validate-note-pdf.ts` | **PASS**, exit 0; 19 Edge entrypoints + 1 worker |
| Deno cases | `deno test --cached-only --no-lock --allow-env supabase/tests/pdf-validation-test.ts supabase/tests/upload-body-test.ts supabase/tests/note-pdf-hash-test.ts supabase/tests/quarantine-worker-test.ts supabase/tests/upload-note-pdf-test.ts supabase/tests/play_catalog_unit_test.ts supabase/tests/play_catalog_api_test.ts supabase/tests/play_diagnostic_sanitization_review_test.ts supabase/functions/diagnose-play-pricing/handler_test.ts supabase/functions/diagnose-play-pricing/sanitize_test.ts` | **PASS**, exit 0, **39 passed / 0 failed**. Google/provider fetches mocked; no network permission |
| Additional Deno scripts | `deno run --cached-only --no-lock supabase/tests/payment-gate-selftest.ts`; same for `play-offer-selftest.ts`; add `--allow-env` for `razorpay-env-selftest.ts`, `razorpay-refund-selftest.ts`, `payment-backlog-load-selftest.ts` | **PASS**, all five scripts; rollout/missing-version, standard BUY offer, live/test env gate, ambiguous-refund retry and mocked backlog checks. Backlog model: 1,500 jobs, 1,575 calls, 41 modeled minutes; not real throughput |
| Website links | `node website/scripts/check-links.mjs` | **PASS**, exit 0: `OK: 17 pages checked, no problems`; local URLs/assets only |
| Dependency audit | In each of `mobile-app`, `admin-panel`, `tooling`: `npm audit --offline --json --ignore-scripts` | **PASS command / NOT VERIFIED freshness**, all exit 0, zero returned vulnerabilities; reported dependency totals 648 / 172 / 138. Cached/offline response does not prove absence of current advisories |
| Worktree/history secret scan | Inline Python: traverse repo excluding `.git`, dependencies and `.aws`, skip files >15 MB; redacted PEM/secret-prefix/JWT-role matching. Enumerate `git rev-list --objects --all`, read unique blobs via `git cat-file --batch`, same matching | **PASS bounded scan**, 1,039 worktree files and 1,936 reachable blobs; zero matching private-key/service-role/selected-secret-prefix findings. Env assignment names/tracking status inspected separately; no values printed |
| Static migration inventory | Inline Python over sorted `supabase/migrations/*.sql`: timestamp-prefix uniqueness, created-table/RLS enable inventory and latest function header review | **PASS limited static checks**, 57 unique versions, all 46 public tables have RLS enable source, no disable found; not SQL replay/lint certification |
| Migration lint / SQL/concurrency suites | `supabase db lint`, `supabase/tests/run-all.sh`, SQL check/concurrency scripts | **SKIPPED/BLOCKED**: no Supabase CLI; writes prohibited and no usable local DB connection established. `run-all.sh` creates/drops databases, applies migrations, inserts fixtures and mutates rows; deliberately not run |
| Hosted harnesses / staging tests | Hosted quiz/upload tests, provider smoke tests, deploy scripts | **SKIPPED**, require network/credentials/writes; not authorized |
| Final AAB/device/native checks | Android build/install, manifest, `.so`/ZIP alignment, installed billing lifecycle, device UI/performance | **BLOCKED**, no release AAB/APK/native build output available in audited app/artifact directories; remote artifacts not fetched |
| Fresh npm/Deno advisories | Online audit and Deno transitive advisory lookup | **SKIPPED**, local-only/network-restricted audit; do not mislabel offline zero results as full vulnerability clearance |

Node PASS inventory: all 13 mobile files (`checkout-html`, `offline-download`, `offline-owner`, `password-policy`, `payment-provider`, `payment-routing`, `play-lifecycle`, `play-restore`, `purchases`, `quiz-hooks`, `same-project-build`, `staging-build`, `verify-signature` self-tests); all 6 admin files (`mutation`, `pagination`, `pdf-validation`, `play-pricing-diagnostic`, `play-service-account-diagnostic`, `upload-error`); root `secret-scan-selftest.mjs`; 13 backend files (`compensation-worker`, `f10-coverage`, `google-reporting`, `play-catalog-worker`, `play-consumption`, `play-order`, `play-payment-worker`, `play-reconcile-fairness`, `play-service-account-diagnostic`, `play-verification`, `razorpay-routing`, `recovery`, `settle-timestamp`). The two remaining backend cron files are BLOCKED as above.

## K. NOT VERIFIED — exact owner checklist

These items require human/provider/deployed evidence. Their absence here is not a confirmed runtime fault. Do not paste secrets, raw tokens or paid-file capabilities into evidence.

- [ ] **Play catalog / external blocker:** Confirm exact package, current product-creation status, support case/error reference and Payments profile action items. Check whether bank verification is pending, completed or unrelated; do not present the hypothesis as confirmed. Do not repeat the already-established service-account/token/request-body investigation.
- [ ] **Price readiness:** Read every active eligible Notes product and current Admin price; compare `admin_play_billing_status`, active tier, INR amount, region IN, BUY option and verification timestamp. Confirm one intended offer, no rental/preorder/discount ambiguity. Do not edit existing prices to make the check pass.
- [ ] **Console billing tests:** After external unblock, use the exact candidate on internal testing with licensed testers: success, cancel, pending→success, offline verification, duplicate callback/token, cross-account rejection, reinstall restore, consume retry, refund/void and already-owned race/refund support. Confirm acknowledgements/consumption are accepted within applicable Play deadlines.
- [ ] **All production tables/policies:** In a read-only transaction, inventory `pg_class.relrowsecurity` for every public table, compare all 46 above, and enumerate additional tables/views. Export `pg_policies` for public/storage including permissive/restrictive mode, roles, commands, USING and WITH CHECK. Check grants/default privileges, SECURITY DEFINER owners/search_path/EXECUTE, schema CREATE rights and advisor results. Resolve SEC-02; do not merely confirm RLS is enabled.
- [ ] **Storage:** Inspect notes/quarantine privacy, size/type restrictions and every bucket-filterless policy. Check that free users cannot read paid objects via public or authenticated direct URLs and blocked/refunded users cannot use alternate reads. Ensure thumbnails contain no PDF copies. Capability URLs should not be logged or exported.
- [ ] **Migration drift:** Compare production migration versions and definitions with all 57 local files, including 19 October queue fencing/duplicate settlement. Record additional hotfixes and NOT VALID constraints. Run fresh+upgrade+concurrency SQL suites only in a separately authorized isolated DB, never against production for this audit.
- [ ] **Deployed function versions:** Inventory all 19 function names, hashes/config and gateway `verify_jwt` values; confirm caller auth/MFA/cron secret boundaries match this source. Remove temporary diagnostics before public launch. Check Vercel deployed commit and pricing rewrite removal, not only local files.
- [ ] **Auth/admin:** Read admin membership, `require_mfa`, verified MFA factor coverage, session/refresh configuration, Auth email verification, direct Auth brute-force/OTP/signup limits, SMTP and redirect allowlist. Verify production URL config for `/account-verified` and `/reset-password`. Confirm no student/admin privilege path bypasses the intended MFA gate.
- [ ] **Secrets/env:** Owner checks Supabase, EAS, Vercel, GitHub Actions and any worker environment directly: client bundles contain only public values; service role, Google credentials, Razorpay secret/webhook secrets and cron secrets remain server-side. Compare secret names and Vault/Edge consistency without exporting values; check key rotation/least privilege. Existing service-account identity correctness is accepted, not re-audited.
- [ ] **Jobs/queues:** Read cron schedules, enabled state, recent run statuses **and pg_net HTTP outcomes**, not just scheduler success. Cover Play catalog, consume/reconcile/voids, Razorpay recovery/compensation, any historical UCB jobs, analytics/session purge and PDF validator scheduling. Inspect parked jobs, oldest queue age, leases/cursor lag and retry counts. Confirm >10 MB PDFs reach ready state on the standalone resource-bounded validator; source existence is not worker deployment.
- [ ] **Razorpay/website:** Identify actual website checkout source/build and origin. Check server-priced order contract, header/CORS behavior, live-mode settings, webhook URL, configured event subscriptions, signature secrets and retries. Observe refund/dispute handling in an authorized environment, confirm no duplicate charge/grant and define handling for capture after account deletion.
- [ ] **Data/deletion:** Trace deletion across Auth/profile/purchases/quiz answers/analytics/referrals/wallet/queues/identity hashes/provider records/backups; reconcile DB-01 with published policy. Confirm financial-record retention, antifraud TTL and support deletion requests; do not infer those from an old checklist.
- [ ] **Monitoring:** Check final mobile `EXPO_PUBLIC_SENTRY_DSN`, backend `UCB_SENTRY_DSN`, alert destinations/on-call owner, delivery and PII scrubbing. Demonstrate a controlled non-PII event and parked-job/backlog alert in an authorized environment. Check admin errors and native crashes are observable. Source DSN hooks alone do not establish telemetry.
- [ ] **Backups/recovery:** Read actual Supabase backup/PITR plan, coverage, retention and most recent successful backup. Demonstrate a timed isolated restore including access to stored PDFs/config needed to serve content. Compare actual retention to the website's 90-day backup promise; record RPO/RTO and owner.
- [ ] **Exact AAB:** Obtain the exact uploaded file and SHA-256. Inspect package, versionCode/versionName, signing certificate, supported ABI, merged manifest (BILLING, targetSdk, cleartext=false, debuggable=false, exported components/intent filters/permissions), all native library page/ZIP alignment and Play's 16 KB check. Confirm New Architecture/native PDF/IAP compatibility by installation. Historical report artifacts do not certify this candidate.
- [ ] **OTA:** Confirm embedded runtime `1.2.0-play` (or deliberately bumped reviewed runtime), production channel and URL, signing certificate/private-key custody and signed-update behavior. Native dependency changes must advance runtime. Verify a compatible prior OTA can be restored; no Razorpay runtime/update should match Play builds.
- [ ] **Device QA:** Check login/recovery/expiry, course change, blocked users, paid/free notes, downloads/ownership, large PDFs, keyboard, 320–360 dp widths, tablets, font scaling, dark backgrounds, TalkBack labels/focus, degraded network and process death. Record device/OS/build and failures; run Play pre-launch reports.
- [ ] **Play declarations:** Inspect current targetSdk/Billing-library/deadline rules for this release; Data Safety categories/purposes/sharing/optional choices for final enabled SDKs; privacy/terms/refund/deletion URL reachability; app access reviewer credentials; content rating; audience/children/Families selections; permission declarations; listing claims/screenshots; test-track eligibility and outstanding Console errors. Every item is NOT VERIFIED here.
- [ ] **Support/rollback:** Assign response owners for paid-but-locked/duplicate/refund/deletion requests, approve compensation policy, verify support contacts, and rehearse M's compatible rollback without deleting financial ledgers or downgrading to Android Razorpay checkout.

## L. Prioritized plan — smallest useful sequence

**P0 — before any candidate is promoted toward release**

1. Hold public production; owner resolves EXT-01 externally. In parallel, fix SEC-01/SEC-02 and reconcile DB-01. These are targeted remediation items from this single audit, not a request for another audit cycle.
2. Freeze a concrete candidate with reviewed working-tree changes and backend definitions; pin dependencies (API-02), preserve Admin prices, and remove temporary diagnostic UI/proxy/functions from public-release scope (SEC-04).
3. Complete production read-only inventory for RLS/grants/functions/MFA/jobs and exact candidate binary/Console evidence (REL-01). Run DB replay/negative-access/concurrency checks only with separate isolated-test authorization. Resolve failures before promotion.

**P1 — before public launch**

4. Finish billing qualification on internal testing after catalog recovery; prove restore/consumption/refund operation and monitored queue progress. Qualify the separate website checkout source/deployment too.
5. Fix checkout deadlines (API-01), Maintenance Mode (MOB-01), atomic settings (ADM-01), and stale stored Store URL if present (MOB-02). Enable mandatory admin MFA after enrollment; establish audit records for sensitive admin changes.
6. Complete device/accessibility/native/OTA checks, Data Safety/legal consistency, support procedure, alert delivery and an isolated backup restore. Move through closed testing only with evidence gates satisfied.

**P2 — after a controlled launch**

7. Measure catalog/search limits, large-PDF memory, startup/crash/ANR and queue latency on representative devices. Add pagination/server search as measured need warrants. Evaluate R8 on shrink-test before production enablement. Reassess tamper resistance/watermarking against the paid-content threat model.

## M. Release strategy and rollback

| Stage | Entry / exit evidence |
|---|---|
| Internal testing | Exact signed Play-only AAB and backend candidate identified; HIGH source defects fixed; schema/RLS/MFA tests and native manifest/16 KB checks pass; catalog tiers ready at existing prices. Before exit, licensed billing lifecycle covers success/pending/cancel/retry/restore/account switch/refund/void/consumption; free videos/previews remain usable; alerting observes failures |
| Closed testing | Internal gate evidence complete. Representative students/devices exercise notes/downloads/video/quiz/auth/updates, small screens/accessibility, offline grace/revocation and support. Review pre-launch reports, crash/ANR rates, purchase-to-entitlement delays, consumption retries and refund latency against pre-agreed thresholds. Verify final Console/legal declarations and recovery rehearsal |
| Production | Owner signs off all HIGH gates and K items relevant to the candidate. Use staged rollout with a named monitor/support owner and explicit stop thresholds; expand only after real telemetry confirms stable auth/content/payment/queue operation. No automatic GO based on elapsed time |

Rollback plan: halt rollout first; keep payment verification, consumption, refunds/voids, provider inbox and reconciliation running so already-captured money is handled. Use a previously qualified **Play-only** app/runtime/backend combination. OTA rollback is allowed only within compatible native runtime/signing constraints; an installed native defect requires a store build with a higher versionCode. Current Maintenance Mode is not functional (MOB-01), so it cannot be assumed to contain an incident. Prepare and test a real server-side purchase stop that leaves existing entitlements/support/reconciliation working. Restore compatible function versions using release hashes; prefer forward DB corrections and keep financial/provider-event/entitlement ledgers intact. Database restore is last-resort recovery with an explicit post-backup payment reconciliation plan. Never roll back into an old Razorpay Android purchase flow or drop payment tables/queues to make an incident disappear.

## N. Final verdict

Verdicts reflect production readiness, not just successful compilation.

| Area | PASS / FAIL / NOT VERIFIED | Reason |
|---|---|---|
| Security | **FAIL** | SEC-01/SEC-02 content-access gaps; production MFA/policies not verified |
| Payments | **FAIL** | External catalog gate prevents paid Android qualification; actual provider lifecycle unverified |
| Database | **FAIL** | DB-01 deletion-disclosure mismatch; production drift/replay not verified |
| API | **FAIL** | API-01 unbounded mobile billing wait and API-02 unpinned Edge resolution remain; type/contract tests pass |
| Mobile | **FAIL** | Offline revocation and Maintenance Mode gaps; exact native candidate/device acceptance unverified |
| Admin panel | **FAIL** | Maintenance promise and partial settings-save behavior; build/lint/tests pass |
| Play compliance | **FAIL** | Billing qualification blocked and deletion disclosures inconsistent; Console/final-binary acceptance unverified |
| Operations | **NOT VERIFIED** | No live cron/alert delivery, backup restore, final telemetry or release rollback evidence |

**Can MedVeda go to production today? No.**

**Single first action:** Keep the production release on hold and have the owner resolve the established Play catalog blocker with Google Play/Payments support, without changing existing prices or enabling Android Razorpay fallback.
