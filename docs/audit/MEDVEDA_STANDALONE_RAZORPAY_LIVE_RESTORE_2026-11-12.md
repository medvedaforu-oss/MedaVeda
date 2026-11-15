# Standalone LIVE Razorpay restoration — 12 November 2026

Status: APK configuration and local checks pass. Live acceptance remains blocked by a deployed verifier/database compatibility defect and outstanding provider-setting checks. No real payment, hosted order creation, deployment, secret update, database write or build was initiated.

## Exact disable points and retained working configuration

- `mobile-app/app.config.js`: provider defaults to `disabled`; production/internal-testing/shrink-test reject provider activation.
- `mobile-app/eas.json`: production and internal-testing explicitly set `MEDVEDA_PAYMENT_PROVIDER=disabled`. Other existing standard profiles default off. All pre-existing build and submit profile values were compared with the task-start snapshot and are unchanged.
- `mobile-app/src/config/paymentProvider.ts`: previously Android Razorpay required the distinct `in.medveda.razorpaytest` package plus exact isolated-test flags. Buy/Pay visibility already consumes this provider gate.
- `mobile-app/src/services/paymentService.ts`: the retained non-Play order URL selected `create-order-nonplay-test` and rejected live checkout responses. The isolated service uses synthetic products/entitlements and cannot be used for live testing.
- Git commit `cd554e3` retains the earlier `create-order` → local WebView checkout → `verify-payment` configuration. The currently deployed original functions confirm this route still exists. No historical secret was copied out of Git.

Read-only Supabase inspection of `xbvenkfmesugrbjuufyw` found active `create-order` v23 (`verify_jwt=true`), `verify-payment` v68 and `razorpay-webhook` v50 (both `verify_jwt=false`; callback HMAC/provider verification and webhook HMAC run inside the functions). The deployed order handler accepts authenticated native requests; newer local order-handler source has different routing guards and must not be deployed for this restoration.

Existing server secrets remain server-side: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` and optional previous webhook secret. Their actual values/current validity were not retrieved or independently verified. The APK refuses any order response without `rzp_live_` and `isLiveMode=true`.

## This task's changes

1. `mobile-app/eas.json`: add only `razorpay-live-testing`, an internal release APK using the production EAS environment and existing production Supabase public configuration. No auto-increment or submit profile.
2. `mobile-app/scripts/check-staging-build.cjs`: require the exact live profile/distribution/production target/public configuration; reject other platforms, test-environment markers and server credential variables.
3. `mobile-app/app.config.js`: resolve the dedicated live distribution, profile extra, native channel and runtime; retain package and Firebase configuration.
4. `mobile-app/src/config/paymentProvider.ts`: permit live Android checkout only when the native application ID, native Expo Updates channel/runtime, profile/distribution/target extras and production URL all match. Live extras on production or internal-testing native channels stay disabled.
5. `mobile-app/src/services/paymentService.ts`: select existing `/create-order` only for this live binary; require a live response; retain routing headers, JWT, server pricing, fixed verification URL, verification, retry and entitlement handling.
6. `mobile-app/scripts/razorpay-live-testing-selftest.cjs`: exercise actual config/provider/service code with synthetic HTTP.
7. This report and `evidence/razorpay-live-restore-20261112/backend-entitlement.patch`: record verification and the proposed backend repair. The patch is for the downloaded deployed baseline, not the newer local backend source.

The native package stays `in.medveda.app` to preserve Firebase/authentication configuration. The APK shares the installed app identity, cannot coexist with the Play app, and may require a compatible signing key/version to install over it. No installation/uninstall was performed. Its channel is `razorpay-live-testing`; native runtime is `1.2.2-razorpay-live-testing`. Production and Closed Testing runtime/profile configuration remains unchanged. Channel/runtime checks follow the installed SDK's native `expo-updates` exports; [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/sdk/updates/).

## Verification results

- PASS new live regression, including exact config, Play-channel/OTA isolation, retained Firebase package, authenticated existing order endpoint, 100-paise server response, rejection of test keys/foreign verify URLs, and backend verdict requirement. The test first failed because the live profile was absent.
- PASS all seven `mobile-app/scripts/payment-*-selftest.cjs` scripts: poll, provider, request, routing, success-owner, summary, verdict.
- PASS `release-payments-disabled-selftest.cjs`, `mv007-billing-boundary-selftest.cjs`, `checkout-security-selftest.cjs`, `nonplay-test-isolation-selftest.cjs`.
- PASS `supabase/tests/razorpay-security-selftest.cjs` and `razorpay-routing-selftest.cjs`: real local HMAC/handlers with synthetic provider/database transport; forged signatures, uncaptured/wrong-order/wrong-currency/wrong-amount payments do not settle.
- PASS `PGHOST=/tmp/medveda-live-payment-pg PGPORT=55463 PGUSER=postgres python3 supabase/tests/run-mv003-local.py`: disposable PostgreSQL, real migrations/SQL and synthetic provider HTTP. Covers commitment across scopes, mismatched identity/amount/snapshot, compensation/reversal, duplicate callbacks/webhooks, concurrent settlement and SQL replay/refund checks. No hosted credentials forwarded. The direct `mv003-entitlement-selftest.cjs` invocation initially failed its required local-PG environment guard; the prescribed runner subsequently passed.
- PASS TypeScript `tsc --noEmit`; additionally invoked the TypeScript 6.0.3 compiler API directly: **310 root files, 0 diagnostics**. Environment emitted a user-bus warning; the explicit compiler result confirms checking completed.
- PASS Expo `@expo/config.getConfig` with exact profile variables and dotenv disabled: expected provider/package/channel/runtime and existing Firebase input. The Expo CLI JSON wrapper initially returned empty output in this environment; direct config evaluation succeeded.
- PASS downloaded deployed code harness for actual payment HMAC, webhook raw-body HMAC, capture and amount checks. The unpatched snapshot **failed** the entitlement postcondition regression; the proposed seven-line patch passes with zero real network requests.
- Existing failure: `razorpay-internal-test-selftest.cjs` rejects the existing Firebase file because it lacks a client for `in.medveda.razorpaytest`. Reproduced with this task's pre-edit `app.config.js`; also documented in the master audit. Left unchanged as requested. This is the old isolated test profile, not the new live profile.
- Task file whitespace checks pass. Whole-workspace `git diff --check` reports pre-existing trailing whitespace at `mobile-app/src/screens/store/StoreScreen.tsx:133`; left untouched.

The project has no aggregate mobile `npm test` script. The checks above are the targeted payment suites. Local SQL tests validate local source/migrations, not deployment parity.

## Required approval before live testing

**Confirmed blocker:** the deployed shared `settle.ts` returns success after a normal void `settle_razorpay_payment` return. The actual hosted database can return void for held/compensated payments without committing entitlement. The deployed verifier then says content is unlocked. A synthetic execution of the downloaded deployed verifier reproduced this false success.

Exact proposed action: redeploy **only** `verify-payment` and `razorpay-webhook` on `xbvenkfmesugrbjuufyw`, preserving both functions' `verify_jwt=false` settings and all existing secrets, using their downloaded deployed source plus the linked seven-line commitment patch. It calls the already-deployed service-only `razorpay_entitlement_committed(order_id,payment_id)` RPC and requires `true` before reporting success. Otherwise settlement remains a retryable failure. No schema, order route, Play function or setting changes are proposed. Do not deploy the workspace's newer full backend tree.

The complete review candidate is staged at `/tmp/medveda-live-backend-review/`, with `check.cjs`, `sha256.json`, original `settle.deployed.ts` and a minimal `supabase/` deployment tree. Run `node /tmp/medveda-live-backend-review/check.cjs` to repeat the synthetic check. It is **not deployed**. Re-fetch/check deployed versions before any approved deployment; reject unexpected drift. The persistent patch is [backend-entitlement.patch](evidence/razorpay-live-restore-20261112/backend-entitlement.patch).

These are shared live functions: the patch also changes website verification outcomes by refusing false success. Approval must cover that shared effect. A separate read-only code review found no additional APK code blocker and repeated both new synthetic regression checks successfully.

Additional acceptance checks, without changing anything: in Razorpay **Live** dashboard confirm the existing API key remains active, automatic capture is enabled (the retained implementation verifies capture; it does not capture manually), and the existing webhook is enabled at `https://xbvenkfmesugrbjuufyw.supabase.co/functions/v1/razorpay-webhook` for `payment.captured` and its previously configured refund/dispute events. Current provider settings, webhook delivery and deployed secret validity cannot be established from source alone. Ask approval before altering any setting. Four active ₹1 products were observed read-only; the selected tester's course, ownership and final quote must permit ₹1, with wallet use off. Do not change prices or trust a client-supplied amount.

After approved repair and those checks, the user performs the ₹1 transaction and confirms captured payment, paid order and successful entitlement in My Purchases. End-to-end LIVE order/capture/webhook delivery is **not yet verified**.

## APK build command

Use after the backend blocker and provider checks are resolved:

```bash
cd ~/AyurPulse/mobile-app
EXPO_NO_DOTENV=1 npx eas-cli build --platform android --profile razorpay-live-testing
```

The configured release APK format and profile command follow [Expo's APK build documentation](https://docs.expo.dev/build-reference/apk/). EAS remote build, signing/environment inputs, produced APK/native identity and device checkout remain untested. No build was started or real payment initiated.
