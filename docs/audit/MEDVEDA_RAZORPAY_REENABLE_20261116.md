# MedVeda Razorpay re-enable — 2026-11-16 UTC

## Outcome and evidence boundaries

Razorpay is re-enabled in the local Android build configuration and application routing. Standard `in.medveda.app` builds select Razorpay, use the live `create-order` endpoint, and expose the existing Notes purchase/checkout screens. Play Billing cannot be selected or initialized through these purchase/history gates. The separate test APK and its synthetic entitlements remain separate.

**Production purchase → unlock is NOT VERIFIED or activated by this change.** Read-only Supabase inspection confirmed `purchase_settings.new_orders_enabled=false` and older deployed payment-function source. Owner SQL, secret checks, deployment, a new binary, and device acceptance remain below. No hosted writes, secret changes, deployments, payments, refunds, commits, or pushes were performed. Existing uncommitted work was preserved, including the earlier recovery change in `paymentService.ts`.

Investigation covered mobile source/config/build profiles, admin source, website/payment HTML, Edge Functions, migrations and environment-variable names. `rg` is unavailable here; searches used `grep`, `find`, and Python. No secret values are included. Local test HTTP uses synthetic responses; passing it does not prove Razorpay or bank acceptance.

## 1. Root causes and disable points

References below use current working-tree line numbers; **before** references identify removed lines from the original file.

| Blocker | File:line | Why it blocks | Fix / current state |
| --- | --- | --- | --- |
| Production and internal testing explicitly disabled | `mobile-app/eas.json:51`, `:68` | Both profiles set `MEDVEDA_PAYMENT_PROVIDER=disabled`. | Set both to `razorpay`; internal target now `production`. |
| Default off and build-time rejection | `mobile-app/app.config.js:22`; before `:28-40` | Default was disabled; production/internal/shrink profiles rejected enabled payments, and ordinary Android Razorpay builds were rejected. | Default Razorpay; remove obsolete prohibitions; reject `play`. Explicit `disabled` remains supported. |
| Runtime rejects ordinary Android binaries | `mobile-app/src/config/paymentProvider.ts:11`, `:27`; before `:11-24`, `:37-45` | Razorpay required exact isolated-test identity or dedicated live-testing channel/runtime. Standard production became `disabled`. | Allow Android `in.medveda.app`, production target and exact production project URL with Razorpay configuration; retain isolated-test identity checks. UCB/restoration flags are false. |
| Wrong endpoint/key-mode fallback | `mobile-app/src/services/paymentService.ts:11`, `:99-105`, `:137`; before `:12`, `:139-141` | A normal build that was not the dedicated live-testing binary fell through to `create-order-nonplay-test` and expected test keys. | After the isolated early return, always use `create-order`, require live key/mode, reject legacy UCB arguments. |
| Backend explicitly demanded removed Play Billing | `supabase/functions/_shared/createOrderHandler.ts:33-37`; before `:40-42` | Presence of `x-medveda-app-version` returned HTTP 403 `play_billing_required`, including the dedicated live APK. | Remove this obsolete rejection; retain Auth, sales switch, pricing, ownership and remote config checks. This guard existed locally; the older deployed creator does not contain it. |
| Server sales switch off | `supabase/functions/_shared/newOrderGate.ts:4-9`; `supabase/migrations/20261114050000_fix4_new_sales_disabled.sql:3-7` | Live DB read returned singleton `{id:true,new_orders_enabled:false}`. Local creator fails closed before any order/provider work. | Owner SQL below. Not changed remotely. The old deployed creator lacks this gate, so its current DB false value alone does **not** prove hosted checkout is closed. |
| Optional remote UCB gate | `supabase/functions/_shared/paymentGate.ts:11-34`; `supabase/migrations/20261012100000_google_play_ucb.sql:43` | A true `require_ucb_for_razorpay` demands a Play choice; missing/malformed config also blocks. | Hosted read: `require_ucb_for_razorpay='false'`, `min_app_version='1.1.0'`. No current block; preserve false. |
| Hidden routes and disabled Notes UI | `mobile-app/src/navigation/AppNavigator.tsx:182-186`; UI table below | Disabled provider hides summary/checkout and disables buttons. | Correct provider at its source; no UI redesign needed. |
| Function deployment drift | Hosted `create-order` v23, `verify-payment` v69, `razorpay-webhook` v51 | ACTIVE means deployed, not current. Deployed creator lacks current sales/native guards; deployed recovery lacks current JWT ownership checks; deployed shared Razorpay code uses old `ALLOW_TEST_MODE` handling. | Deploy current creator/verifier/webhook after checking required secrets/RPCs. |
| Test-only gates deliberately off | `supabase/functions/_shared/nonplayTestConfig.ts:18-49`; `_shared/nonplayTestHandlers.ts:79-89`; migration `20261109120000_isolated_nonplay_test.sql:48-52`, `:144-161` | Isolated TEST lane requires secret gates, protected user metadata, server/DB allowlists, active synthetic content and DB enabled flag. Hosted DB test config is false. | Enable only for dedicated TEST acceptance; not a production dependency. |
| Restricted profiles remain closed | `mobile-app/eas.json:87`, `:139-153`; `mobile-app/scripts/check-staging-build.cjs:2-80`; `mobile-app/staging.env.template:4` | Staging validation remains disabled. Retained alpha profile requests `play` and is now rejected by app config. Legacy `same-project` target still requires disabled payments. Dedicated test/live profiles require their exact environment. | Intentional leftovers; use the documented Razorpay profiles, not alpha/staging/same-project. |

Additional valid admission failures remain: missing session; blocked/missing profile or course; inactive/wrong-course/unpublished product; already-owned product; pricing/referral/wallet errors; rate limits; malformed order, foreign verification URL, or wrong key mode. These are safeguards, not switches to bypass (`createOrderHandler.ts:31-33`, `:73-121`; `paymentService.ts:106-147`; publication migration `20261112150427_audit_checkout_publication_guard.sql:5-54`).

### Exact UI conditions and text

The exact literal **`Payment Unavailable` was not found in the current app source**. An installed older binary can have different text; its build identity was not inspected.

| Surface | Exact condition / text | Source |
| --- | --- | --- |
| Notes unlock options | `actionDisabled = paymentProvider === "disabled" || loading || status !== "success" || purchasing`; button text disabled-provider **`Unavailable`**, otherwise **`₹${product.price}`** | `mobile-app/src/components/UnlockOptionsPanel.tsx:53`, `:93-98` |
| Notes product card | `disabled={buying || purchasesUnavailable}`, where `purchasesUnavailable = paymentProvider === "disabled"`; text **`Purchases unavailable`**, **`Please wait…`**, or **`Buy Now`** | `mobile-app/src/components/ProductPosterCard.tsx:51`, `:108-116` |
| Full-year Store button | Disabled for owned/purchasing/disabled-provider; text **`New purchases unavailable`** or **`Buy Full Year Notes · ₹…`** | `mobile-app/src/screens/store/StoreScreen.tsx:82-90` |
| Purchase hook | Disabled provider shows alert **`Purchases unavailable`** and does not navigate | `mobile-app/src/hooks/usePurchase.ts:18-23` |
| Summary Pay | Uses quote/loading/attempt state; Android and non-disabled provider required. Text **`Pay ₹…`** via `formatRupees`, or **`Please wait…`** | `mobile-app/src/screens/payment/OrderSummaryScreen.tsx:259-267`, `:303-315`, `:435` |
| Checkout screen | Rejects when provider is neither Razorpay nor enabled UCB; text **`New purchases are unavailable in this app version.`** | `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx:35-40` |

The admin panel has no source usage of `purchase_settings.new_orders_enabled` or `require_ucb_for_razorpay`; use owner SQL, not an assumed admin toggle. Hosted `app_settings.maintenance_mode=false`; its legacy `razorpay_key_id` was unset/other rather than a recognized test/live prefix. Checkout gets its public key from the order response, not `app_settings`. Never put a Razorpay secret in the mobile environment.

## 2. Files changed

| File | Before → after |
| --- | --- |
| `mobile-app/app.config.js` | Default disabled / Android build rejection / optional Play plugin → Razorpay default, explicit disabled supported, Play selection rejected. |
| `mobile-app/eas.json` | Production/internal disabled → Razorpay production target; isolated TEST and dedicated live APK profiles retained. |
| `mobile-app/src/config/paymentProvider.ts` | Dedicated channel/provider approval gates → standard production Android Razorpay; Play purchase/restoration off; isolated TEST identity retained. |
| `mobile-app/src/services/paymentService.ts` | Dedicated-only live endpoint selection / UCB route option → live creator after isolated TEST early return; live-only key validation and UCB request rejection. Existing account-bound recovery edits preserved. |
| `supabase/functions/_shared/createOrderHandler.ts` | Native-header Play rejection → authenticated native Razorpay accepted through existing pricing/sales safeguards. |
| `mobile-app/scripts/razorpay-reenable-selftest.cjs` (new) | Exercises actual configuration → provider → purchase hook/service for production/internal/preview/live APK; rejects test keys and retired Play config; keeps isolated TEST selection. |
| `mobile-app/scripts/payment-provider-selftest.cjs`, `payment-routing-selftest.cjs`, `payment-request-selftest.cjs`, `release-payments-disabled-selftest.cjs` | Update old disabled/Play/test-endpoint expectations; retain disabled/no-network, foreign endpoint, malformed order, timeout and account checks. |
| `mobile-app/scripts/razorpay-internal-test-selftest.cjs`, `razorpay-live-testing-selftest.cjs`, `android-release-selftest.cjs`, `same-project-build-selftest.cjs` | Standard builds now enabled; preserve isolated TEST behavior, dedicated profile validation, release config and explicit legacy disabled-target checks. |
| `supabase/tests/razorpay-routing-selftest.cjs` | Native-header rejection expectation → native order acceptance plus disabled-sales, unauthenticated and remote-gate rejection checks. |
| This report | Findings, limitations and manual activation/test steps. |

No content access rules, offline rules, pricing algorithms, admin features, database migrations, dependency manifests or lockfiles changed. Other dirty/untracked files shown by `git status` predate this task. A task-start copy was used to distinguish our `paymentService.ts` changes from existing work.

## 3. Purchase → unlock verification

PASS below means the stated code/schema/test evidence passed. It does not mean an installed APK or a hosted financial transaction passed. Recovery and offline behavior are separated to cover all requested aspects in nine rows.

| # | Chain link | Result | Evidence / limits |
| --- | --- | --- | --- |
| 1 | Tap Notes purchase → authenticated order with server price | **PASS (local); NOT VERIFIABLE hosted** | `usePurchase.ts:18-27` → summary `:303-315` → `paymentService.ts:117-128` sends only product ID/wallet flag and bearer token. Server `createOrderHandler.ts:99-133` calls `create_priced_order` with verified user ID, rounds rupees ×100, requires ≥100 paise, creates INR order. Wallet/referral arithmetic stays in SQL, including reservations and server recomputation. Live DB sales false and secrets/device purchase not tested. |
| 2 | Razorpay opens; success/failure/cancel | **PASS (synthetic); NOT VERIFIABLE device** | `checkoutHtmlTemplate.ts:53-91`, `:136-191` loads HTTPS checkout.js and calls `rzp.open()`. Nonce-bound RN callbacks validate order/signature fields. Cancel returns to browsing; failure opens Payment Failed; server confirmation opens success. Dedicated TEST integration UI regression exercises these outcomes. |
| 3 | Server signature / authoritative payment checks | **PASS (local tests)** | HMAC-SHA256 verification in `_shared/razorpay.ts`; `verify-payment/index.ts` rejects invalid signature/order binding. `_shared/settle.ts:28-39` refetches captured payment and provider order, checks INR and amount. Razorpay security/recovery/MV004 tests pass, including forged signatures/raw-body changes. Hosted old verifier also has signed-callback checking, but needs redeploy for current recovery authorization. |
| 4 | Purchase grant and complete schema | **PASS (schema/code); NOT VERIFIABLE actual insertion** | No separate `grantPurchase.ts`/grant Edge Function is used. `_shared/settle.ts:95-141` calls `settle_razorpay_payment` and requires `razorpay_entitlement_committed`. `20261104100000_razorpay_snapshot_discount_retry.sql:240-251` inserts snapshot and amount with `ON CONFLICT(order_id) DO NOTHING`. Hosted schema has every required column, RLS and snapshot/ownership triggers. No test purchase inserted into production. Full local DB integration could not start. |
| 5 | UPI app switch, renderer loss and process-loss recovery | **PASS (local tests); NOT VERIFIABLE Android** | Checkout AppState/renderer/error handlers run coalesced recovery; `paymentService.ts:253-342` pins the buyer, refreshes Auth once on 401, bounds requests and retries. `recoverMyPendingPayments` reads recent owned server orders on My Purchases after route/process loss. Renderer loss does not itself prove financial failure. Actual Android termination/app-switch behavior requires acceptance below. |
| 6 | Purchased Notes unlock and refresh without restart | **PASS (code/local tests); NOT VERIFIABLE hosted storage** | Hosted `purchases` RLS selects own/admin rows; clients cannot grant access. Successful scopes filter ownership. `NotesScreen.tsx:45-47`, `ChaptersScreen.tsx:42-45`, MyPurchases focus effects re-read purchases. Success screen independently reads paid order + successful same-owner purchase. `get-note-url/index.ts:45-63` checks entitlement/AAL and signs private Notes bucket for 120 seconds. Hosted bucket confirmed private. Focus/return refresh is present; there is no claim of an instantaneous realtime push to every mounted screen. |
| 7 | Paid Notes offline grace, 7 days | **FAIL (pre-existing release behavior)** | `offlineNoteVerification.ts:6`, `:83` retains seven-day owner-bound secure-license expiry and its tests pass. But `secureNotesService.ts:10`, `:39-40` sets `PAID_NOTES_OFFLINE_ALLOWED=false`; `downloadManager.ts:145`, `:241`, `:344`, `:629` blocks/hides paid offline Notes. Do not advertise seven-day paid offline access for this release. Unchanged under payment-only scope. |
| 8 | Distinct cancel/failure/pending; bounded loading | **PASS (local tests), timing caveats** | Cancel returns without a failure screen; failed callback gives **Payment Failed**; ambiguous verification gives **Confirming Your Payment** with IDs/support and no pay-again instruction. Pending checks run every 8 seconds, with a nominal 10-minute attempt cap (`PaymentFailedScreen.tsx:35-36`, `:69-70`). Requests have 35-second deadlines; success readback has 15-second timeout. The cap counts attempts, so slow requests can make elapsed polling longer than ten minutes. Pending copy can remain visible after polling ends; initial CDN/checkout opening has no separate application-level watchdog. |
| 9 | Refunded, duplicate, already-owned | **PASS (code/synthetic tests); NOT VERIFIABLE real refund** | Summary handles already-owned state; SQL protects single order/payment grants and marks duplicate purchases non-success. Exact commitment proof prevents false success for compensation/reversal. Refund/dispute code re-fetches provider evidence and updates access. Purchases/success-owner/Razorpay tests pass. Replay, financial concurrency and real webhook/refund delivery require DB/provider acceptance; not inferred from TypeScript. |

Hosted `purchases` columns confirmed: `id`, `user_id`, `order_id`, `product_id`, `product_title`, `scope`, `chapter_id`, `subject_id`, `year_id`, `year_ids`, `course_id`, `amount`, `status`, `created_at`, `razorpay_order_id`. Hosted required RPC signatures were confirmed for quote, settlement, capture recording, provider inbox, entitlement commitment and Notes AAL access. No missing purchase column was found. This was read-only metadata evidence, not an executed grant.

Pricing trace: immutable list price → first-purchase friend discount → allowed wallet share/balance → final amount. See `20261013100000_wallet_reservations.sql:15-125` and subsequent pricing/snapshot wrappers. The server recalculates; summary refuses checkout when its quoted total differs from returned `amountPaise` (`OrderSummaryScreen.tsx:305-310`). The isolated TEST lane intentionally has no production referral/wallet effects, so its acceptance cannot validate real referral accounting.

### Checkout bridge and Android configuration

There is **no active hosted HTTPS UPI bridge page in this checkout path**. The app renders local HTML in WebView, loads Razorpay's HTTPS script, and intercepts UPI/wallet/intent links with `Linking`. `_shared/pages.ts` is retained legacy HTML, not the active creator response. No hosted bridge URL was supplied or discovered; its availability/dashboard setup is NOT VERIFIED. Adding a new hosted bridge would be new implementation outside this repair.

`app.json:13-18` declares `medveda` scheme and `in.medveda.app`; `:25-28` includes INTERNET/notifications. `plugins/withAndroidQueries.js:45-61` supplies browser and `upi` VIEW queries. Checkout allowlists UPI/wallet schemes, accepts only UPI intent schemes and known Play Store fallback hosts, and restricts HTTPS bank/provider navigation. Payment success/failure use RN navigation, not payment deep links. Navigator linking currently maps password recovery only (`AppNavigator.tsx:95-106`). Test APK uses `in.medveda.razorpaytest` / `medveda-razorpay-test`.

No `com.ayurpulse.app` reference was found in active mobile/payment/Edge/admin source or payment/build plugins checked. `ayurpulse` remains an Expo slug/package display identifier, which is not the Android application ID. Razorpay dashboard package/domain/UPI-method settings and the merged manifest of the next APK are NOT VERIFIED. No new permission is needed just to issue HTTPS orders; inspect native permission merging because retained `expo-iap` can still autolink.

Videos remain free (`VideosScreen.tsx:28-30`; `get-video-url/index.ts:5-6`), and MCQ stays free (`QuizScreen.tsx:34-35`). Those implementations were not edited; video and quiz regressions passed. Existing free Notes previews remain supported.

## 4. Hosted functions and secrets

Read-only `list_edge_functions` returned **22/22 ACTIVE**. Relevant deployed versions and gateway settings:

| Function | Exists / deployed | `verify_jwt` | Dependency / action |
| --- | --- | --- | --- |
| `create-order` | ACTIVE v23 | true | Production creator; downloaded source older than repo. Redeploy current handler. Keep JWT verification. |
| `verify-payment` | ACTIVE v69 | false | Signed callback and authenticated recovery. Redeploy current version; unsigned recovery in old deployed source is not owner-bound. |
| `razorpay-webhook` | ACTIVE v51 | false | Raw-body HMAC; redeploy current shared settlement/inbox/refund logic. |
| `get-note-url` | ACTIVE v20 | true | Downloaded handler uses Notes AAL entitlement RPC/private signed URLs. No change needed for this repair. |
| `create-order-nonplay-test` | ACTIVE v1 | true | Isolated synthetic tables/allowlists only; deployed handler predates local separate new-test-order gate. Redeploy before TEST activation. |
| `verify-payment-nonplay-test` | ACTIVE v1 | true | Isolated verification/recovery; independent of production switches. |
| `razorpay-webhook-nonplay-test` | ACTIVE v1 | false | Dedicated TEST HMAC; never use live webhook secret here. |
| `nonplay-test-catalog` | ACTIVE v1 | true | Only isolated test catalog/history/quotes. |
| `get-note-url-nonplay-test` | ACTIVE v1 | true | Synthetic private PDF access. |
| `grant purchase` | No separate deployed function | n/a | Service-only settlement RPC performs grant. |
| `create-order-play-choice`, `attach-external-token`, `report-external-transaction` | Local source/config; absent from returned deployed list | See `supabase/config.toml` | Retained Play/UCB code; restored standard Razorpay does not call these. |

Other returned ACTIVE functions: `send-push-notification`, `delete-account`, `get-video-url`, `login-with-mobile`, `request-password-reset-by-mobile`, `create-play-order`, `verify-play-purchase`, `sync-play-catalog`, `play-payment-worker`, `upload-note-pdf`, `diagnose-play-service-account`, `diagnose-play-pricing`, `diagnose-play-matrix`. Their presence does not mean the app selects Play. No unrelated redeployment/removal performed.

The five test functions import isolated test handlers, not live pricing/settlement. The repaired production client does not depend on those functions or their flags/credentials.

| Environment / secrets expected | Purpose and verified limit |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Platform-injected server environment (`_shared/supabaseAdmin.ts:8-12`). Never put service role in client. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `APP_ENV` | Current live helper requires `APP_ENV=production` with `rzp_live_`; staging helper allows `APP_ENV=staging` with `rzp_test_`. `_shared/razorpay.ts:11-55`. Production client rejects test response. |
| `RAZORPAY_WEBHOOK_SECRET` | Live raw-body HMAC, distinct from API secret. Optional `RAZORPAY_WEBHOOK_PREVIOUS_SECRET` only during rotation retry window. |
| `NONPLAY_TEST_ENVIRONMENT`, `NONPLAY_TEST_CHECKOUT_ENABLED`, `NONPLAY_TEST_NEW_ORDERS_ENABLED` | Test environment identity, overall test access, separate new-test-order gate. Use exact string values below. |
| `NONPLAY_TEST_RAZORPAY_KEY_ID`, `NONPLAY_TEST_RAZORPAY_KEY_SECRET`, `NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET` | Isolated `rzp_test_` credentials; no fallback to live keys. |
| `NONPLAY_TEST_USER_IDS`, `NONPLAY_TEST_PRODUCT_IDS` | CSV allowlists in addition to DB eligibility/protected `medveda_nonplay_test` app metadata. |
| `ALLOW_TEST_MODE` | Older deployed helper accepts test keys only with this opt-in. Current repo intentionally ignores it and uses APP_ENV. Do not use this to put test keys into the live lane. |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `MEDVEDA_PAYMENT_PROVIDER`, `MEDVEDA_BUILD_TARGET` | Mobile public project/build settings. Razorpay public key ID comes from server response; no mobile Razorpay API/webhook secret. |

**Hosted secret presence, key/account pairing and actual test/live mode are NOT VERIFIED.** Supabase connector exposes no secret-list capability here. Cached CLI attempts failed before help/version due a write to read-only `~/.supabase/telemetry.json`; no secret values were requested or output. Use Dashboard → project → Edge Functions → Secrets, or `supabase secrets list --project-ref xbvenkfmesugrbjuufyw` on your workstation (shows names/digests, not values). Confirm key prefix privately in Razorpay Dashboard and that the same-mode pair is configured; do not paste secrets into this report.

## 5. Owner activation steps — not executed

Perform secret checks and deploy current functions before enabling new sales. No broad `db push` is required by this repair; do not apply unrelated pending migrations as a shortcut.

```sh
# Repo root. Run with an authenticated Supabase CLI.
supabase secrets list --project-ref xbvenkfmesugrbjuufyw
# Only set/replace values that are missing or wrong, using your LIVE account:
supabase secrets set --project-ref xbvenkfmesugrbjuufyw \
  APP_ENV=production \
  RAZORPAY_KEY_ID='rzp_live_<YOUR_KEY_ID>' \
  RAZORPAY_KEY_SECRET='<YOUR_MATCHING_LIVE_API_SECRET>' \
  RAZORPAY_WEBHOOK_SECRET='<YOUR_LIVE_WEBHOOK_SECRET>'

supabase functions deploy create-order --project-ref xbvenkfmesugrbjuufyw
supabase functions deploy verify-payment --no-verify-jwt --project-ref xbvenkfmesugrbjuufyw
supabase functions deploy razorpay-webhook --no-verify-jwt --project-ref xbvenkfmesugrbjuufyw
```

Creator keeps gateway JWT checks; verifier/webhook need `--no-verify-jwt` because the signed callback/webhook does not carry a Supabase session. Recovery still checks Auth and owner in the handler. Config explicitly records these settings in `supabase/config.toml`. CLI deployment/secret syntax was cross-checked against [Supabase deploy reference](https://supabase.com/docs/reference/cli/supabase-functions-deploy) and [secrets reference](https://supabase.com/docs/reference/cli/supabase-secrets-set); read your installed CLI help if using a different major version.

Owner SQL Editor, exact target `xbvenkfmesugrbjuufyw` (non-destructive configuration only):

```sql
begin;
insert into public.app_config(key,value)
values ('require_ucb_for_razorpay','false')
on conflict(key) do update set value=excluded.value;
insert into public.purchase_settings(id,new_orders_enabled)
values (true,true)
on conflict(id) do update set new_orders_enabled=excluded.new_orders_enabled;
commit;

select id,new_orders_enabled from public.purchase_settings;
select key,value from public.app_config
where key in ('require_ucb_for_razorpay','min_app_version');
```

Expected: singleton true, UCB false, valid version string. Current minimum is already `1.1.0`; do not invent a different minimum to enable payments. To stop **new** sales later: `update public.purchase_settings set new_orders_enabled=false where id=true;` after current creator deployment. Verification/recovery must remain deployed and available.

Razorpay LIVE Dashboard: check account activation, allowed domain/payment-method configuration and automatic capture. Configure live webhook URL `https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/razorpay-webhook` with its matching webhook secret. Subscribe to `payment.captured`, `refund.processed`, and the supported `payment.dispute.*` events; `payment.authorized` is handled for retained reporting but does not itself grant access. Check actual delivery logs/2xx responses. Dashboard settings have not been inspected.

A new native build is needed to replace installed disabled binaries and carry the evaluated provider/runtime configuration. Production AAB command: `cd mobile-app` then `npx eas-cli build --platform android --profile production`. Do not assume an old disabled-runtime OTA update enables that binary. Publishing/submitting a build is not performed here; distribution decisions remain yours.

## 6. Exact acceptance plan

### A. Razorpay TEST mode — dedicated isolated APK

Use existing `razorpay-internal-test`, not production with replaced credentials. It builds an APK with `in.medveda.razorpaytest`, isolated channel/runtime/environment and the same Supabase project, but synthetic catalog/notes/entitlements. It cannot unlock real production Notes and intentionally does not exercise real wallet/referrals.

1. In the owner SQL Editor, inspect existing `nonplay_test_*` fixtures first. Use a dedicated test Auth user with a complete, unblocked profile/course and active subject/year in that course. Configure only that user's protected **app metadata** `medveda_nonplay_test=true` (not user-editable `user_metadata`), and insert/activate its `nonplay_test_users` row. Sign out/in afterwards. Do not use a student account.
2. Create a synthetic test product/Notes association if none exists, preserving real products/chapters. Upload a harmless fixture PDF privately into `nonplay-test-notes` with an object path such as `synthetic/acceptance/notes.pdf`. Template SQL below uses owner-supplied UUID/IDs; run only after substituting them.

```sql
-- Only dedicated test fixtures. All placeholders must be replaced first.
insert into public.nonplay_test_users(user_id,active)
values ('<TEST_AUTH_USER_UUID>'::uuid,true)
on conflict(user_id) do update set active=true;
update auth.users
set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)
  || '{"medveda_nonplay_test":true}'::jsonb
where id='<TEST_AUTH_USER_UUID>'::uuid;

insert into public.nonplay_test_products
  (title,price_paise,subject_id,year_id,course_id,active)
values ('[TEST] Razorpay acceptance Notes',100,
        '<SUBJECT_ID>','<YEAR_ID>','<COURSE_ID>',true)
returning id,chapter_id;
-- Copy returned id as <TEST_PRODUCT_ID>; do not use a real chapter/product ID.
insert into public.nonplay_test_notes(product_id,title,object_path,active)
values ('<TEST_PRODUCT_ID>','[TEST] Acceptance PDF',
        'synthetic/acceptance/notes.pdf',true);
update public.nonplay_test_config set enabled=true
where environment='production-isolated-razorpay-test-v1';
```

3. Configure isolated TEST secrets and redeploy these five functions so the new-test-order gate is present everywhere. Leave live `RAZORPAY_*` credentials intact.

```sh
supabase secrets set --project-ref xbvenkfmesugrbjuufyw \
  NONPLAY_TEST_ENVIRONMENT=production-isolated-razorpay-test-v1 \
  NONPLAY_TEST_CHECKOUT_ENABLED=true \
  NONPLAY_TEST_NEW_ORDERS_ENABLED=true \
  NONPLAY_TEST_RAZORPAY_KEY_ID='rzp_test_<YOUR_TEST_KEY_ID>' \
  NONPLAY_TEST_RAZORPAY_KEY_SECRET='<MATCHING_TEST_API_SECRET>' \
  NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET='<DISTINCT_TEST_WEBHOOK_SECRET_AT_LEAST_32_CHARACTERS>' \
  NONPLAY_TEST_USER_IDS='<TEST_AUTH_USER_UUID>' \
  NONPLAY_TEST_PRODUCT_IDS='<TEST_PRODUCT_ID>'

supabase functions deploy create-order-nonplay-test --project-ref xbvenkfmesugrbjuufyw
supabase functions deploy verify-payment-nonplay-test --project-ref xbvenkfmesugrbjuufyw
supabase functions deploy razorpay-webhook-nonplay-test --no-verify-jwt --project-ref xbvenkfmesugrbjuufyw
supabase functions deploy nonplay-test-catalog --project-ref xbvenkfmesugrbjuufyw
supabase functions deploy get-note-url-nonplay-test --project-ref xbvenkfmesugrbjuufyw

cd mobile-app
npx eas-cli build --platform android --profile razorpay-internal-test
```

4. The test profile expects its matching Firebase file/client, not a production Firebase client. Supply the `in.medveda.razorpaytest` `GOOGLE_SERVICES_JSON` EAS file variable (development environment) or the matching local `firebase-test/google-services.json` according to `app.config.js`. Do not disable validation to build. Configure Razorpay TEST dashboard webhook to `https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/razorpay-webhook-nonplay-test` using the isolated webhook secret.
5. Install APK alongside production. Log in as the allowlisted test user, select its matching course/year, open synthetic Notes product and tap Buy Now → Pay. Require visible TEST MODE banner and a TEST order in Razorpay Dashboard.
6. Prefer test card **4100 2800 0000 1007**, CVV **123**, any future expiry (for example **12/30**), and the simulated bank Success/Failure controls or **1234** test OTP where asked. Razorpay documents arbitrary CVV/future expiry and simulated outcomes; do not enter a real card. See [official test-card instructions](https://razorpay.com/docs/payments/payments/test-card-details).
7. If test UPI-ID entry is offered, use **success@razorpay** and **failure@razorpay**. Test keys do not exercise real PhonePe/GPay UPI app payments. Razorpay explicitly notes cancellation in its TEST UPI flow can resolve successfully, so do not use that to certify real UPI cancellation. Use modal dismissal for local cancel behavior and LIVE acceptance for actual handoff/cancel. See [official test-UPI instructions](https://razorpay.com/docs/payments/payments/test-upi-details).
8. Success must create one isolated paid order/entitlement, show success only after readback, and open the synthetic PDF. Failure must not grant. Dismissal returns to browsing. Disable new TEST orders and verify existing pending recovery still works. Replay the same signed webhook through Razorpay's resend control: no duplicate entitlement. Inspect `nonplay_test_orders`, `nonplay_test_attempts`, `nonplay_test_entitlements`; normal `purchases`, wallet and referral rows must remain unchanged.
9. End acceptance by setting `NONPLAY_TEST_NEW_ORDERS_ENABLED=false`; keep verification/webhook available to finish pending attempts before turning off overall TEST access. Do not delete paid/pending records to retry; use a fresh synthetic product/test case.

### B. LIVE acceptance — dedicated live APK, controlled amount

```sh
cd mobile-app
npx eas-cli build --platform android --profile razorpay-live-testing
```

This existing profile uses `in.medveda.app`, production catalog/entitlements and **live keys**. It may replace the installed app only when signing is compatible; otherwise use the correctly signed distribution or a test device. It is not a test-money APK. No build was started here.

1. Finish the activation steps above. Use a dedicated buyer without that product already owned. Prefer the lowest-priced existing **Notes** product. If you explicitly choose ₹1, configure a separate active Notes product with a valid published course/scope and a PDF; do not silently reprice a product used by students. The server enforces minimum 100 paise; verify the displayed final total before paying.
2. Tap purchase → summary → Pay once. Check product ID, buyer, INR amount and live order on Dashboard. Confirm no Play chooser and no TEST MODE banner. With referral/wallet enabled, compare the DB order snapshot with the quote and provider amount; test wallet on/off and eligible friend discount in separate controlled orders. Isolated TEST did not verify these financial paths.
3. Complete the chosen LIVE UPI/card payment with your own authorized instrument. This charges real money; no invented test credentials. Verify `orders.status='paid'`, one matching `payments` record and `purchases.status='success'`, and the exact entitlement commitment. Return to Notes and open PDF without restarting. Verify Videos and MCQ still open freely.
4. Repeat cancel/failure separately without completing payment. Confirm no successful purchase/grant and distinct return/failure UI. For a captured payment whose callback is interrupted, simulate network loss, return from a real UPI app and exercise Android **Don't keep activities** or process termination on a test device. Reopen My Purchases; recovery must confirm the same order, not create a new one. Pending screen must retain order/reference and warn against paying again.
5. Refund the captured acceptance payment in Razorpay LIVE Dashboard → Payments → select the recorded payment → Issue Refund → full captured amount → confirm. Use normal refund unless you deliberately choose another available option. Verify provider refund reaches processed and `refund.processed` is delivered; refresh the app and check revoked paid entitlement. A partial refund follows existing partial-refund rules, so use a full refund for this revocation test. See [Razorpay dashboard payment actions](https://razorpay.com/docs/payments/payments/dashboard/) and [official refund instructions](https://github.com/razorpay/markdown-docs/blob/master/payments/refunds/issue.md). Do not promise immediate bank credit or reimbursement of fees.
6. Retry the old callback/recovery after refund; it must not restore access or crash. Try buying an already-owned product before refund; it must show ownership and avoid another checkout. Capture screenshots, order/payment/refund IDs and delivery results privately, never secret keys/session tokens.

Read-only grant check after replacing the order placeholder:

```sql
select o.id,o.status,o.product_id,o.amount,o.list_price,o.referral_discount,
       o.wallet_amount,o.razorpay_order_id,
       p.status as purchase_status,p.amount as purchase_amount
from public.orders o left join public.purchases p on p.order_id=o.id
where o.id='<INTERNAL_ORDER_ID>';
```

## 7. Checks run and remaining limitations

| Check | Result |
| --- | --- |
| Mobile `./node_modules/.bin/tsc --noEmit` | PASS, exit 0, including a fresh final run. |
| Admin `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json` | PASS, exit 0. |
| `npm run lint --prefix tooling` | PASS, exit 0. |
| `npm test` in admin-panel | PASS, exit 0. |
| `npm run test:password-recovery` in mobile-app | PASS: 26 tests; password-policy checks also pass. |
| Focused mobile/Edge/HTML/Razorpay regression invocations | PASS: 32/32 final invocations. Deno selftest programs use top-level assertions (their framework summary says 0 registered tests); they ran and exited 0, not a claim of a counted Deno test suite. |
| `deno check --cached-only` for creator/verifier/webhook | PASS, exit 0. |
| `node mobile-app/scripts/closed-testing-selftest.cjs` | Aggregate invocation FAILED: child `spawnSync ... EPERM` in this environment. A clean-environment retry had the same restriction. All 30 constituent scripts then ran individually and PASSED, exit 0. Do not report the aggregate command as passed. |
| `bash supabase/tests/run-all.sh` | NOT VERIFIED: exit 2, local `psql` could not create its disposable database because no local PostgreSQL server was reachable. No hosted fallback used. SQL integration/concurrency tests therefore did not execute in this run. |
| Secret-list/CLI help attempts | NOT VERIFIED: cached Supabase CLI telemetry write hit read-only home directory before normal startup. No remote secret changes attempted. |
| Real APK build, installed native module/manifest, actual provider HTTP/webhook/UPI/refund | NOT RUN. Use acceptance plan; do not infer from mocks or ACTIVE status. |
| `git diff --check` | PASS. |
| Independent code review | No important introduced bugs or materially false report claims found. Reviewer independently reran the re-enable and Edge routing regressions; both passed. |

Final 32 focused invocations: mobile `payment-provider`, `payment-routing`, `release-payments-disabled`, `razorpay-internal-test`, `razorpay-live-testing`, `nonplay-test-isolation`, `nonplay-provider-security`, `purchases-unavailable-ui`, `payment-poll`, `payment-request`, `checkout-security`, `payment-verdict`, `payment-summary`, `payment-success-owner`, `notes-entitlement`, `notes-open`, `purchases`, `offline-license-storage`, `quiz-hooks`, `video-tap`, `deep-link`, `same-project-build`, `android-release`, `razorpay-reenable`; Edge `razorpay-routing`, `razorpay-security`, `recovery`, `mv004-recovery`, `mv005-create-order`, `notes-choice-order`; checkout HTML; combined Razorpay environment/refund/order-recovery/payment-gate programs. Paths use the existing `*-selftest.cjs` naming except the documented HTML/Deno files.

The 30 individually passing aggregate constituents are `android-release`, `auth-recovery`, `login-network`, `login-submit`, `auth-state-race`, `deep-link`, `course-state-race`, `course-year-selection`, `course-year-confirmation`, `course-year-picker-race`, `notes-open`, `notes-entitlement`, `pdf-lifecycle`, `pdf-remote-retry`, `offline-owner`, `offline-download`, `download-actions`, `purchases`, `purchases-unavailable-ui`, `release-payments-disabled`, `quiz-editing`, `quiz-input`, `quiz-hooks`, `navigation-lazy`, `route-validation`, `load-resource`, `list-states`, `video-data`, `video-link`, `video-tap` (overlap with focused checks; not 62 distinct suites).

Initial failures in provider/routing/request/release-disabled/dedicated-APK tests reflected old expected disabled production, Play-only error text, isolated-test endpoint/key fixtures or dedicated-only channel identity. Those expectations were updated for the requested behavior and rerun; none remains a known assertion failure among the checks listed above. A regression test failed against the original production configuration before implementation and passes now. Transient logs/results live in `/tmp/medveda-razorpay-reenable/`; this Markdown is the single new audit report.

## 8. Ranked risks and retained Play leftovers

| Severity | Risk / required action |
| --- | --- |
| High | Hosted creator/verifier/webhook differ from current repo. Old recovery lacks current owner-bound authorization, and old creator ignores the new-sales switch. Deploy the current set together and recheck source/settings before acceptance. |
| High | Real live credential pairing, capture policy, webhook delivery and end-to-end entitlement grant remain unverified. The app can be enabled locally while payment creation still fails remotely. Complete owner activation and controlled LIVE acceptance. |
| High for the requested offline expectation | Seven-day helper exists but paid offline access is explicitly disabled. This repair does not restore it. |
| Medium | Existing `expo-iap` package/native dependency can still be bundled/autolinked even though the provider/restore gates are off. TypeScript/source imports resolve; a new Android build/merged manifest has not been checked. |
| Medium | Pending polling is attempt-count based and may exceed ten elapsed minutes on a slow connection. CDN/initial checkout has no separate app watchdog. Device/network acceptance is needed; no unrelated recovery refactor performed. |
| Medium | Standard live creator checks active/product-course/publication but does not itself restrict `product_type` to Notes. Hosted product metadata showed active Notes/Notes-bundle plus four active `other` products. Current free Video/MCQ flows do not invoke checkout; review legacy catalog entries before selling them. No catalog/type rewrite performed. |
| Medium | UI ownership refresh happens on focus/resume/readback, not guaranteed instant realtime delivery to every screen. Confirm same-device unlock after return and delayed webhook arrival. |
| Low | Retained alpha build profile now fails explicitly because it requests retired Play Billing. Use documented Razorpay profiles. Historical Play receipt restoration is intentionally off, so any real historical Play purchase needing restoration requires separate support work. |

Retained, not deleted:

- `mobile-app/package.json:33` and lockfile: `expo-iap@3.4.4`. No `react-native-iap`/`react-native-billing` import was found in checked active source.
- `mobile-app/src/services/playBillingService.ts:5`, `:86`, `:355-359`: type imports and lazy dynamic native import; related `playOfferSelection.ts`, `indiaBillingStates.ts`. The native import is not a top-level side effect; normal restored Razorpay path does not call it.
- `OrderSummaryScreen.tsx:22`, `:197`, `:223`, `:271`, `:375`: retained unreachable Play/UCB choice UI/listener code. `PaymentFailedScreen.tsx` has historical `provider==='play'` recheck handling. `MyPurchasesScreen.tsx:73` still contains restore code guarded by now-false `playRestorationEnabled`.
- `paymentProvider.ts:5` retains the `play` type member so old branches compile, but selector never returns it; `:26`, `:30` keep restoration/UCB off. Removed only the provider/config branches that blocked the requested Razorpay path.
- `mobile-app/eas.json:139-153` alpha Play validation profile and related enrollment extras in `app.config.js`; legacy checks in `scripts/check-staging-build.cjs`. The alpha profile is now rejected, not silently used for Razorpay.
- Supabase Play/UCB function directories/config: `create-play-order`, `verify-play-purchase`, `create-order-play-choice`, `attach-external-token`, `report-external-transaction`, `play-payment-worker`, `sync-play-catalog`, `diagnose-play-*`; shared Play/catalog/reporting/Notes-choice helpers. Historical external-token orders may still need this code for accounting/recovery.
- Play/UCB schema, migrations, order/payment provider/token/SKU columns, catalog tiers/sync/jobs and `require_ucb_for_razorpay` remain. The live flag was verified false. Worker/cron configuration was not modified or fully audited here.
- Admin Play diagnostic/catalog/billing support and Play service-account/package-name environment templates remain. They do not decide the restored mobile Razorpay provider.
- Legacy hosted-payment HTML `_shared/pages.ts` and historical payment/billing tests/docs remain. No active hosted bridge was verified.

Diff review: five production/config files changed, eight existing mobile regression files updated, one existing Edge routing test updated, one mobile regression script added, and this report added. Existing dirty files outside that list are not part of this repair. No commit or push.
