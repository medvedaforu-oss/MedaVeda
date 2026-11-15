# MedVeda full repository audit — 13 November 2026

## 1. Executive summary

**NO-GO for the intended paid/UCB Google Play release.** Current production build profiles deliberately disable new purchases; the requested two-provider experience is not an enabled production feature. Independently, paid offline PDFs remain plaintext, importing a recovery session can evict the reset screen, historical Play restoration is disabled with new sales, and deployed backend code trails reviewed refund, recovery-authentication and notification protections. Production metadata confirms missing/inactive payment recovery jobs, an absent identity-retention schedule and disabled mandatory admin MFA. These are release blockers even though TypeScript, lint, the full-current-schema SQL/webhook/concurrency suite and native vault host tests pass. This is an evidence-based source/configuration review, not certification of an installed binary, real payment, email delivery or Play Console enrollment.

### Scope, identity and evidence boundary

Audit target: current working tree at Git HEAD `54c33cb`, including the extensive pre-existing tracked and untracked changes. Application code, existing configuration, migration files and dependencies were not edited; only this report and audit evidence were added. Source hashes were compared after review: **no non-documentation file changed since the audit inventory**. No branch, commit, deployment, production data mutation, real charge/refund, email, push or account deletion was performed.

**Reviewed files: {{REVIEWED}} unique files**, listed in [reviewed-files.txt](evidence/full-audit-2026-11-13/reviewed-files.txt). Coverage includes all **220 mobile source files**, **122 admin source files including CSS**, **61 backend TS/JS files**, **all 78 canonical migrations**, app/build/plugins/native vault runtime, website sources/generated pages, legacy pages and relevant operational scripts. [coverage.json](evidence/full-audit-2026-11-13/coverage.json) shows zero missing code files in the four principal source trees. The wider automated text inventory covers 5,257 files; these are **not** counted as 5,257 manually reviewed files.

Every distinct migration body/DDL/policy/grant was reviewed in migration order. One consolidated September migration contains exact repeated spans: [the SQL ledger](evidence/full-audit-2026-11-13/sql-sept19-24-reviewed.txt) records original/folded ranges and hashes; all differences were read. The 17 generated website pages were checked byte-for-byte against the fully reviewed generator/templates; repeated generated layouts were reviewed through that composition, not claimed as 17 independent line-by-line readings. Historical `supabase/releases`, old audit logs, dependency internals and binary artifacts were not each re-audited as independent current runtime modules. Current canonical code and retrieved active Edge bundles were compared separately. Tests were executed as described below; not every test helper was independently audited as production code.

Both requested earlier reports were read first from history because they were removed from the current tree:

- `5460921:docs/audit/MEDVEDA_AUDIT_FIX_1_20261026.md`.
- `8a6161f^:docs/audit/MEDVEDA_BUGFIX_FINAL_2026-10-27.md` — the historical filename contains hyphens; the requested `...20261027.md` path does not exist.

Scope corrections verified from code: there is no `grantPurchase.ts`; grants run through `_shared/settle.ts` and privileged SQL settlement RPCs. React Query is not installed or used; current caching uses service/module state and hooks. Email-OTP helpers exist with `shouldCreateUser:false`, but there is no active screen/route calling them in this checkout. The active hosted auth/legal domain is `www.medveda.in`; the older `medveda-website.vercel.app` URLs returned 404 during this audit.

Production reads used connected Supabase tools for schema, RLS, grants, function definitions, buckets, migration/function deployment metadata and selected configuration/job metadata. No student records, tokens, credentials, payment rows or secret-bearing cron commands were selected. Effective rules are confirmed; actual affected-user counts and provider/Console state remain unverified. Exact live evidence is retained in `backend-*.json`.

## 2. Findings sorted by severity

{{COUNTS}}

Counts cover distinct current findings. The historical fixed-item verification in section 6 and manual acceptance checks in section 7 are separate; duplicate gates are not counted twice. Conditional findings explicitly state their required build, scale, expiry configuration or storage-attacker assumptions. “Confirmed” can mean a demonstrated source rule or deployed metadata discrepancy; it does not imply a live exploit was attempted.

{{FINDINGS_TABLE}}

## 3. Detailed findings and proposed changes

All diffs below are **proposals, not applied changes**. Small patches are concrete code proposals. Larger native encryption, wallet allocation, idempotency and aggregation changes specify contracts that require implementation and tests during Phase 2; the named proposed interfaces/RPCs are not falsely represented as already existing or paste-ready fixes. Deployment diffs describe the reviewed source/configuration replacement, not authorization to deploy.

### Mobile application

{{MOBILE_DETAILS}}

### Supabase, payments and deployed state

{{BACKEND_DETAILS}}

### Admin panel and hosted pages

The legacy page findings apply to the source copies. Tested canonical `www.medveda.in` pages serve the modern implementation; **no live legacy-XSS exposure was demonstrated**. Other historical host aliases/deployment roots remain a manual inventory check.

{{ADMIN_WEB_DETAILS}}

### Build, dependencies and test infrastructure

{{ROOT_DETAILS}}

## 4. Payment sequence and failure points

```text
Student -> Notes -> entitlement check
  owned/free preview -> get-note-url -> private signed URL (180s) -> viewer
  unowned -> provider gate
    standard production/internal-testing: disabled -> purchase-unavailable UI
    approved native Play/UCB build or dedicated non-Play test build -> quote

Client -> quote_my_order(productId,useWallet) [NO client price authority]
  unavailable/blocked/unpublished -> deny
  already_owned -> must open purchases [MOB-18: current screen only Retry]
  quote/network error -> retry; no charge
  quote ready -> synchronous submit guard

PLAY/UCB PATH:
  Client -> create-play-order(JWT,productId)
    -> auth/rollout gates -> SQL locks/publication/catalog checks -> order snapshot
    403/catalog not ready -> fail before native payment [manual Play-403 checks]
    current deployment lacks some current gates/endpoints [BACK-04]
  Client -> native catalog fetch (15s deadline) -> exact SKU/INR offer match
    missing/mismatched offer/timeout -> fail before charge
  Client -> BillingClient user-choice integration/native purchase UI
    cancel/error -> listener -> restore button/retry after known terminal result
    promise resolves, callback lost -> recovery required [MOB-04: UI can stick]
    account changes -> drop old result; native receipt still needs owner recovery
    pending purchase -> pending UI; NEVER grant
    Google payment -> verify-play-purchase(JWT,token,order,product)
      -> Google API -> validate purchased state, SKU, quantity/account binding
      -> atomic settle_play_purchase -> purchase/order committed
      -> consume/acknowledge after commitment; failed call -> durable worker retry
      -> success screen only for verified server success
      refund/void -> worker Google verification -> reverse entitlement/wallet/referral
      inactive consume/reconcile/void jobs [BACK-03] threaten recovery/deadline
    alternative selected -> durable external token + buyer-state/context
      -> attach-external-token -> create-order-play-choice -> Razorpay below
      missing deployed functions/report worker -> broken flow [BACK-04/BACK-03]
      amount changed -> reconfirm reserved server price; do not silently charge

RAZORPAY PATH (non-Play or enrolled user-choice alternative):
  Client -> authorized create-order endpoint (product + wallet flag, no amount)
    -> verified user -> server-priced SQL order/reservations -> Razorpay order API
    ambiguous create response -> receipt-based GET recovery, not blind second POST
    unknown/duplicate receipt -> fail closed/manual recovery
    unauthorized build/header -> source gates; headers are NOT attestation
  Client -> WebView checkout with server order/currency/amount
    blocked origin/invalid postMessage -> reject
    UPI app switch -> WebView renderer/callback may disappear
      app resume -> bounded owner recovery polling -> pending/terminal state
      uncertain status -> 'confirming' recovery, no replacement payment
    cancel/checkout failure -> status check; late capture can still settle

  SUCCESS CALLBACK -> verify-payment
    signed callback: HMAC-SHA256(order_id|payment_id), fixed-width compare
    unsigned recovery: verified JWT + owned internal order in CURRENT source
      [BACK-16: live older recovery lacks this owner/auth check]
    invalid signature/auth -> reject before financial mutation
    provider GET -> captured? correct order/currency/amount? -> reject mismatch
    full refund/dispute -> reverse; never grant [BACK-01 live SQL gap]
    DB/provider outage -> fail closed/pending; retry same payment
    settleCapturedPayment -> service RPC -> row/advisory locks + snapshots
      atomic order/payment/purchase + wallet debit/referral transition
      duplicate -> verify exact committed entitlement; never grant from UI flag
      capture without eligible grant -> durable compensation/reversal queue
      transaction failure -> rollback -> retry
    -> confirmed success only after owner-bound entitlement commitment

  WEBHOOK, independent of client:
    raw body -> HMAC verify (current/previous secret rotation window)
    -> validate event -> durable provider inbox -> provider GET -> same settlement
    callback/webhook race -> SQL serialization/idempotency -> one grant/debit
    duplicate/replayed event -> recognized recorded outcome; no second reward
    refund/dispute before linkage -> retain inbox/retry, not permanent ACK
      [BACK-02: live older handler ACKs unknown outcome without durable inbox]
    partial refund -> apply documented partial policy, not blanket full revoke
    full refund/lost dispute -> revoke purchase/access + correct financial reversal
    dispute won -> only explicit authorized restoration path
    invalid/unrecognized RPC outcome -> retryable response; no false success

RECOVERY/REPORTING:
  cron -> claim leased bounded jobs -> settle/report/consume/refund/reconcile
    provider timeout/429/5xx -> retain with retry/backoff; parked job -> alert
    expired lease/process kill -> replay idempotently
    native/store restore -> server verification, never trust client receipt alone
      [MOB-03: disabled-sales production currently disables this restore caller]
    UCB -> external transaction report/refund report to Google, exact amounts/tax
      absent/inactive deployed workers -> operations incomplete [BACK-03]
      batch budget currently undercounts serial calls [BACK-09]
```

This diagram covers current source intent and identifies known live deviations. It does not assert provider acceptance, enrollment, successful real UPI recovery, or delivery of refunds. The three-day Play acknowledgment requirement must be tested from `PURCHASED`, not `PENDING`; recurring subscriptions are not the configured per-product notes model. See [Google purchase processing](https://developer.android.com/google/play/billing/integrate), [one-time lifecycle](https://developer.android.com/google/play/billing/lifecycle/one-time), [UCB integration](https://developer.android.com/google/play/billing/alternative/alternative-billing-with-user-choice-in-app), and [Razorpay webhook validation/idempotency](https://razorpay.com/docs/webhooks/validate-test).

### Schema versus financial queries

{{SCHEMA_CHECK}}

## 5. RLS and permission matrix

The following matrix is based on retrieved production metadata, not merely the migration filenames. All **57 public tables have RLS enabled**. `admin` means an authenticated user for whom `am_i_admin()` is true; it is not a distinct SQL role. MFA is currently optional by production configuration (BACK-06). Service role bypasses RLS but remains subject to explicit SQL constraints/triggers. Public read policies using `true` on intended public configuration/broadcasts are not automatically vulnerabilities; targeted data in the broadcast table is the separate BACK-05 defect. Profiles cannot self-edit protected balance/admin/purchase fields through the reviewed protected-field triggers.

{{EFFECTIVE_MATRIX}}

### Public RPC execution authority

An EXECUTE grant alone is not row authority: each user/admin RPC must additionally validate `auth.uid()`/`am_i_admin()`. Definer routines and search paths were reviewed through the final migration chain; legacy pricing/settlement helpers have client execution revoked. The table below records every retrieved live public RPC, including routines not exposed to client roles. Exact policy expressions, column-only quiz grants and SQL metadata are in the backend JSON evidence.

{{RPC_MATRIX}}

### Storage

Observed: `notes` and `note-quarantine` are private PDF buckets capped at 50 MiB; `nonplay-test-notes` is private PDF-only capped at 10 MiB; `thumbnails` is public and has no bucket MIME/size restriction. Admin-only write/preview boundaries are separate from paid-student note authority. Student note metadata/object paths are not authorization to fetch private bytes. Signed note URLs are bearer capabilities until expiry; a refund does not retroactively cancel a previously issued URL, so verify the short TTL and stop issuance immediately after revocation. Offline access separately has the seven-day grace and B03 protection gap. No public paid-note bucket was found in retrieved metadata. No production storage object bytes were downloaded.

## 6. Verification of earlier audit fixes

Each row is one historical finding/fix, checked against current code and, where available, deployed metadata. “Source verified” does not close the device/provider acceptance boundary. Superseded product decisions are preserved as superseded, not turned into new requirements.

{{PRIOR_TABLE}}

## 7. Manual checks needed

All unchecked items below are **UNVERIFIED — needs manual check**. Exact read-only production metadata already collected does not need to be guessed or re-certified from screenshots. Use synthetic accounts/test-mode or an owner-approved internal test plan for mutating checks; this audit did not authorize charges, deletion, settings changes or deployment.

### Supabase dashboard and deployment

- [ ] **Auth → URL Configuration:** inspect Site URL and every allowed redirect. Confirm exact `https://www.medveda.in/reset-password` and `/account-verified`; inventory older Vercel/wildcard redirects and staging schemes. Do not infer the allowlist from `PASSWORD_RESET_REDIRECT_URL`.
- [ ] **Auth → Email / SMTP and Send Email Hook:** identify whether SMTP or a hook actually sends mail. In the active provider/Resend dashboard check verified sending domain, DNS SPF/DKIM/DMARC, sender address, API credential status, quotas and last sanitized delivery outcome. A missing repository SMTP password is expected; no credential value belongs in this report.
- [ ] **Auth → Security/password policy and Rate Limits:** verify server-enforced minimum/maximum/strength, reset token expiry, resend limits, signup/OTP behavior, leaked-password settings where supported and session/JWT lifetime. Replay an expired/used synthetic link. Direct Auth API calls must not bypass mandatory profile/identity requirements. `shouldCreateUser:false` in a caller is not an account-wide server policy; signup is intentionally enabled for registration.
- [ ] **Auth brute-force acceptance:** compare email/password direct Auth calls with the mobile-number Edge path. The latter source limits IP 20/10min, IP+phone 5/10min, phone 30/10min. Test generic errors/timing and trusted forwarded-IP handling. Clearing app data/reinstall/changing device bypasses the local SecureStore lockout; validate server controls independently.
- [ ] **Database → migrations/functions:** reconcile the recorded live migration list and definitions with the exact release manifest. Stage the missing November refund/publication protections, not a blind replay of the whole migration directory. Reproduce full-refund/lost-dispute/missed-webhook ordering and compare entitlement status. Count contradictory states only in a separately authorized privacy-preserving query.
- [ ] **Edge Functions:** compare deployed code hash/version and `verify_jwt` to the deployment table below. Functions without gateway JWT must verify their own HMAC, verified user JWT or exact server cron secret as appropriate. Confirm publishable-key versus gateway-JWT behavior with the actual deployed gateway; never disable verification globally to remove a 401.
- [ ] **Admin security:** verify enrollment and recovery for every admin using counts/status only; then stage AAL1 denial, AAL2 success, non-admin AAL2 denial for tables, RPCs, diagnostics and push. Deploy handler guards before any separately approved MFA-flag activation. Current `require_mfa=false` is confirmed, not an open factual question.
- [ ] **Cron/operations:** qualify inactive Play jobs, missing UCB/report/refund processors and retention scheduling in staging; verify last-success time, leased/stuck/parked age, retry exhaustion and alert delivery. Confirm the 180-day cutoff is from `first_purchase_at`, not a new 180 days after deletion. No retention job was enabled by this audit.
- [ ] **Storage:** with anon/student/owner/refunded/admin AAL1/admin AAL2 synthetic sessions, test direct object denial, signed URL issuance and expiry, path ownership, PDF MIME/structure/50MiB cap and quarantine rejection. Include traversal-style encoded paths and mismatched note/object references without uploading harmful files.
- [ ] **Deletion:** synthetic student deletes twice, with failure after SQL erase and before Auth deletion. Verify Auth/profile/purchases/referrals/push/quiz/analytics erasure and retained anonymized accounting/fraud records, plus native local cleanup. Shared catalog PDFs are not user-owned uploads to delete. Check the legacy `delete_my_account` behavior and retained-session token consequences. Admin deletion must remain blocked.
- [ ] **Restore drill:** restore DB/Auth/Storage metadata AND object bytes to a disposable compatible target, then test synthetic login, paid-note access, FK consistency and recovery time. A backup setting alone is not restore evidence.

### Razorpay dashboard

- [ ] In the correct Test/Live dashboard, match app environment, key-ID mode and configured webhook URL to the intended distribution; inspect names/status only. Production must never silently accept a test key. Confirm webhook event subscriptions include relevant captured/refund/dispute states and secret-rotation retention.
- [ ] Execute owner-approved test-mode success, cancellation, late capture, partial/full refund, dispute won/lost, duplicate/reordered webhook, callback loss and ambiguous order/refund HTTP response. Check one order/purchase/debit/reward and actual refund completion, not just a queued status.
- [ ] On Android UPI, switch app, background/kill WebView/app, deny callback, return slowly and lose network after capture. Confirm owner recovery, pending wording, eventual entitlement and no repeated charge. Do not accept a client `postMessage` as financial proof.

### Google Play Console and Google Cloud

- [ ] **Cloud Console → APIs & Services:** confirm Android Publisher API enablement in the service-account project. **Play Console → Users and permissions/API access:** verify the exact service-account email has access to package `in.medveda.app` and the required catalog/order/financial permissions. Project IAM alone does not prove per-app Play authority.
- [ ] **403 diagnosis:** retain sanitized HTTP status/method/path/error reason for token acquisition, catalog list/get/patch/create, and `monetization:convertRegionPrices` independently. Compare service-account email, package, product/offer IDs, `regionsVersion`, Money units/nanos and Indian regional pricing. Current and retrieved deployed catalog helpers match; conversion is in diagnostics rather than the sync path. No actual provider 403 was reproduced here, so neither conversion nor permissions is declared the established cause.
- [ ] **Monetize → Products → One-time products:** confirm generated notes SKU/purchase option/BUY offer is active, INR price matches server paise conversion and the release uses one-time products rather than subscriptions. Check inactive/draft/regional-unavailable/old SKU responses separately.
- [ ] **Alternative billing/program enrollment:** establish the actual India eligibility/program enrollment, required disclosures and Google-provided user-choice UI before enabling UCB flags. Test the standard Play and alternative selections, external token binding and timely transaction/refund reporting. Current disabled builds are not evidence of a compliant enabled flow.
- [ ] **License testing/internal track:** test purchased/pending/cancel, missing callback, process kill, restore on another device, account switch, acknowledge/consume retry and refund/void. Verify acknowledgment within three days of PURCHASED; do not acknowledge pending transactions or consume before committed delivery.
- [ ] **App content/Store listing:** review actual audience/content rating, educational-not-medical claim, app-access reviewer credentials with an already unlocked Note, Data safety, privacy/deletion URLs, purchase-unavailable wording, SDK disclosures and permission justification against the exact submitted build. Keep review credentials out of Git.

### Real-device, final binary, website and monitoring

- [ ] Build the exact approved EAS profile and record source digest, AAB digest, package, versionCode and signing certificate. EAS remotely manages/increments versionCode; the absent local integer is not proof of a missing Store version. Verify native manifest target SDK against the current Play requirement (API 36 for standard new submissions/updates as of this audit), exported components, queries, cleartext=false, backup=false and only justified permissions. [Current target requirement](https://support.google.com/googleplay/android-developer/answer/11926878).
- [ ] Validate the final release's 64-bit libraries, 16 KiB ELF/ZIP page alignment, AAB delivery size, Android 14–16 behavior, Hermes, R8/resource shrinking and PDF/IAP JNI/reflection. R8 is now enabled in app.config.js; this corrects the earlier “opt-in only” report. Host tests do not prove native compilation or device acceptance.
- [ ] Verify FCM package/config on EAS builder, push permission denied/granted, token refresh, logout failure/success, 11th-device registration, foreground/background/killed delivery and category mute. Tap routing must wait through authentication/onboarding and reject arbitrary destinations.
- [ ] Verify PDF extraction resistance/backup, screenshot and recording block on the actual paid viewer, 7-day expiry, clock rollback/forward, key loss, root-device limits, upgrade/legacy plaintext cleanup, force-stop/reboot, 1/10/50/100MiB PDFs, interrupted transfer/storage full and pause→cancel cleanup. B03 cannot be closed by passing dormant native host tests.
- [ ] Recovery from Gmail in-app browser and Chrome: cold/warm, signed out and A→B, second link while reset is mounted, MFA, expired/used/no token, network and cleanup failures. Confirm actual new password works and old one fails; verify no Home navigation interrupts recovery.
- [ ] YouTube: use the failing row's exact stored URL privately; normalize watch/youtu.be/embed/shorts/live/mobile/nocookie/bare ID/whitespace. Test YouTube installed/disabled, HTTPS fallback, default browser, offline/error and Back. The opening path is external Linking, not an embedded player. Android `<queries>` affects `canOpenURL`, not proof that `openURL` fails. Private/deleted/geoblocked/embed-restricted content requires provider/device evidence; current parser/tap tests do not identify the historic production cause.
- [ ] Small/landscape/tablet/large-font/TalkBack testing for every screen and form, Hindi/Marathi strings where content supplies them, dark palette, keyboard and nested gesture handling. No runtime RTL/locale/small-screen certification was performed.
- [ ] Vercel project settings: inventory root/output folders and all custom/old aliases. Canonical tested URLs passed HTTP/header checks; check all untested aliases plus `/privacy`, `/refunds` and `.html` routes before retiring duplicate pages. Test token-free page loads, hash removal, no-store/no-referrer and fixed-origin redirects; do not log real fragments.
- [ ] Sentry/EAS: confirm actual injected DSN, source-map/native-symbol upload, correct release/dist and sanitized symbolication from a test event. Inspect beforeSend output for user/request/breadcrumb URLs; verify alerts and account retention. Check OTA code-signing certificate exists in the final build and updates are signed. Optional source hooks do not prove operational setup.

### Recorded Edge deployment comparison

{{EDGE_TABLE}}

## 8. Prioritized fix plan

Effort estimates are engineering time after reproduction/setup, not elapsed approval/provider-review time. Use the findings' real IDs in one-finding commits only after report approval; do not turn an operational switch into an automatic production action.

| Priority | Findings / action | Estimate | Acceptance |
|---|---|---|---|
| P0 | BACK-01/02/16: stage exact refund SQL + verifier/webhook owner/inbox protections | 2–4 days | Real SQL duplicate/reordering/refund tests; owned recovery; no false grants/ACKs |
| P0 | BACK-05/06: deploy privacy/MFA-aware push boundary, qualify admin enrollment/recovery | 1–2 days + owner rollout | Targeted send rejected; AAL1 denied/AAL2 admin allowed; non-admin denied |
| P0 | MOB-01: keep recovery route/controller alive across owner transitions | 1–2 days | Mounted cold/warm signed-out/A→B + MFA + cleanup tests |
| P0 | MOB-02/B03: complete authenticated native acquisition/viewing/license integration and legacy cleanup | 10–20 days + device matrix | Ciphertext-only durable writes; authenticated licenses; kill/expiry/key-loss/memory tests |
| P0 | MOB-03/04/18: preserve historical restoration; recover uncertain native outcomes; owned-item action | 2–4 days | Disabled-sales restore; lost callback; no repeat charge; correct owner routing |
| P0 | BACK-03/04: qualify full Play/UCB/compensation deployment and monitored workers, then policy/Console acceptance | 3–5 days + provider access | Exact bundle/schema parity; licensed device transactions; complete refund/report lifecycle |
| P0 | Final AAB/device/Play/SMTP/reset/restore/monitoring gates in section 7 | 3–5 days + external review | Artifact-bound evidence, not historical report sign-off |
| P1 | BACK-08 identity retention scheduler/legal cutoff qualification | 0.5–1 day + owner review | Correct 180-day rule, monitored successful purge in staging |
| P1 | BACK-09/10/11/12/13/15: job budget, block scope, wallet expiry/hold, flag result and device limit | 3–6 days | Atomic accounting/allocation fixtures; latency budget; blocked API and 11-device tests |
| P1 | MOB-05/06/07/08/09/10/11/12/13/14/17/20: gesture/recovery/offline/push/storage/statistics | 5–8 days | Focus/account/failure injection, native UI and persistence assertions |
| P1 | ADM-01/02/03/04/07/08/09 and WEB-01/02/03/04 | 3–5 days | Idempotent sends, correct MRP/settings/pagination and safe modern/legacy pages |
| P1 | CFG-01/02: compatible SDK/security dependency updates | 1–2 days | Doctor/audit/type/lint/build/native smoke |
| P2 | MOB-15/16/19, ADM-05/06, BACK-14/17, QA-01; branding/obsolete comment cleanup | 1–3 days | Accurate labels/ring/network state/readiness, truthful Retry, passing fixture-compatible suites |

Phase 2 has **not** started. After explicit approval: create the requested new branch, implement one finding per small commit with its ID, run tsc/lint/tests after each batch, and write `docs/audit/MEDVEDA_FIX_REPORT.md`. No fixes are silently included with this audit.

## 9. Fresh verification results and raw evidence

{{CHECKS_TABLE}}

The initial runner recorded 169 commands: 154 exit-zero, 10 exit-one, 4 timeout and 1 prerequisite exit-two. Four time-limited native checks were subsequently rerun serially and **all passed**. The default DB command initially lacked a running local server; the full final disposable-Postgres run **passed**. Six directly discovered DB harness files refused to run without their dedicated local environment; correct historical wrappers were then invoked, and MV003/Phase B/Phase C each stop at the same 500-versus-400 assertion (QA-01). These raw failures remain in evidence. Do not summarize the entire discovered suite as “all tests passed.”

The 140 discovered Node test files include 134 direct passes and those six DB-prerequisite cases. Fresh Deno entrypoint checks cover 25 Edge entrypoints plus the validator worker; the expanded Deno unit suite reports **46 passed, 0 failed**. The full SQL suite builds all 78 migrations, tests RLS/financial/account-deletion/quiz behavior, provider mocks, concurrency and webhook harnesses, ending **ALL SUITES PASSED**. Native vault host tests prove host-side behavior of dormant code, not that the app uses encrypted acquisition or that Android/iOS release instrumentation passed.

Commands ran with credential-free test environments. Initial DNS/subprocess/socket sandbox failures were rerun with the required public registry/local-process access. Online Expo compatibility results supersede the initial cached-manifest pass. No dependency update, `npm audit fix`, generated native prebuild write, production mutation or deployment was run. Expo `config --type prebuild` evaluates configuration; it is not a native build.

**Raw output:** [raw-check-results.md](evidence/full-audit-2026-11-13/raw-check-results.md) contains the complete retained command logs, including errors and final reruns. [checks.json](evidence/full-audit-2026-11-13/checks.json) contains the initial aggregate; individual `*.result.json` contain every final rerun's exit code/timing. [wallet-expiry-repro.log](evidence/full-audit-2026-11-13/wallet-expiry-repro.log) records the actual SQL-function reproduction (`actual_available:0`, `expected_available:100`). [public-pages.json](evidence/full-audit-2026-11-13/public-pages.json) records public GET/header results without tokens or page bodies.

### Branding, comments, logs and secret checks

[markers.md](evidence/full-audit-2026-11-13/markers.md) and [markers.json](evidence/full-audit-2026-11-13/markers.json) list **every matched** AyurPulse string, TODO/FIXME/HACK marker, console call and placeholder marker in the scanned text inventory, with path/line and credential-like lines suppressed. Counts: **7,619 AyurPulse matches**, **6 TODO/FIXME/HACK matches**, **818 console calls**, **221 placeholder markers**. Most branding matches are historical audit paths/logs; test logs and HTML input placeholders are not automatically defects. The real legacy user-facing scheme defect is WEB-02. Retained `ayurpulse` Expo slug/npm package IDs, historical fraud-hash domain separator and corrective old-package regexes have compatibility meaning; do not rename them blindly.

The production mobile logger is development-gated and Sentry uses scrubbers; backend operational console statements still exist and are included in the inventory. No plaintext credential log was established from the reviewed runtime. Sentry runtime payload and vendor logs remain a section-7 manual check.

Tracked-file secret scanner passed. The expanded scanner found **zero recognized private-key/service-role/secret-token pattern matches** across 5,257 current text files and **3,830 historical Git blobs / 60,409,007 bytes**. This is pattern evidence, not proof that no arbitrary unlabeled secret can exist; binary/compressed historical artifacts are not all decoded by this scanner. The `.env` inventory records names and tracked status only: real local env files are ignored, examples tracked. Publishable/anon keys are public client identifiers, not service-role secrets; values are redacted from retained config logs. No private credential value was copied into the audit.

### Closing coverage record

Total reviewed: **{{REVIEWED}} unique files**. Findings: **{{COUNTS_INLINE}}**. All current principal source modules and canonical migrations are accounted for by the ledgers; generated/duplicate review methods and excluded archival artifacts are disclosed above. Provider, dashboard, final-artifact and real-device items explicitly marked unverified remain release gates.
