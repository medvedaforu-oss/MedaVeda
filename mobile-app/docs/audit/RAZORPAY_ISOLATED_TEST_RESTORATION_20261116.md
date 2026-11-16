# Isolated Razorpay testing investigation — 2026-11-16

Local investigation and regressions are complete. Actual provider checkout on an installed APK is **unverified**. Hosted checkout is blocked by intentionally disabled settings and undeployed isolated functions. No EAS build, deployment, hosted write, migration application, real payment, or credential inspection was performed. Local SQL tests used disposable databases and synthetic records only.

## Root cause and affected locations

| Location | Finding |
| --- | --- |
| `src/components/ProductPosterCard.tsx:51` | `paymentProvider === "disabled"` sets the unavailable state; lines 108–116 disable the button and render “Purchases unavailable”. |
| `app.config.js:22` | Missing provider configuration defaults to `disabled`. Lines 29–31 reject payment overrides for production, internal-testing and shrink-test. |
| `eas.json:51`, `eas.json:67` | Production and Play internal-testing explicitly configure disabled payments. Ordinary development/preview builds also default to disabled. |
| `src/config/paymentProvider.ts:21`, `:37` | Android Razorpay test checkout requires the installed `in.medveda.razorpaytest` package and matching distribution, profile, target, environment marker and backend URL. A normal Play binary cannot be enabled by supplying the test extras. |
| `eas.json:106` | Existing `razorpay-internal-test` profile already supplies the required test flags, internal APK distribution, development EAS environment and separate update channel. No duplicate profile is needed. |
| `supabase/functions/_shared/nonplayTestHandlers.ts:78` | New isolated orders also require the shared `purchase_settings.new_orders_enabled` switch. It is currently false. |
| `supabase/functions/_shared/nonplayTestConfig.ts:28` | Dedicated test configuration, test-mode credentials and user/product allowlists are required; production credential fallback is absent. |

The exact code condition behind the label is established. The installed APK's identity/configuration was not available, so the particular failed native/configuration predicate on the user's device cannot be identified from repository evidence alone. Backend settings do not directly produce this card label; they independently block a subsequent catalog/order request.

## Current hosted observations (read-only, 2026-11-16)

Project: `xbvenkfmesugrbjuufyw`.

- `purchase_settings.new_orders_enabled = false`.
- `nonplay_test_config.enabled = false` for `production-isolated-razorpay-test-v1`.
- All five dedicated functions are absent from the deployed function list: `create-order-nonplay-test`, `verify-payment-nonplay-test`, `razorpay-webhook-nonplay-test`, `nonplay-test-catalog`, `get-note-url-nonplay-test`.
- The test configuration table exists. Its presence does not prove every hosted schema/RPC/storage definition matches the local migration. No migration deployment is implied or authorized.
- Secret values, secret inventories, user records and payment histories were not queried. Provider credential/webhook configuration remains unverified.

## Existing flow reused

`ProductPosterCard/usePurchase` → `OrderSummaryScreen` → `paymentService.purchaseProduct` → `nonplayTestService.createTestOrder` → `create-order-nonplay-test` → existing WebView/`checkoutHtmlTemplate` → `verify-payment-nonplay-test` → `nonplay_test_observe_payment` → synthetic purchase catalog/entitlement → `get-note-url-nonplay-test`.

Server-owned synthetic pricing is snapshotted in paise; the provider adapter fixes and validates currency as INR. The client sends product identity, never an authoritative price. The provider order must match the owner, product, internal order, receipt, test environment, key and amount/currency. Callback HMAC verification precedes authoritative provider reads; settlement requires a captured payment. Authenticated recovery re-fetches payment facts without relying on a missing callback signature. Signed webhooks re-fetch provider facts and share the same SQL observation path.

The SQL path uses locks and unique owner/product, order and payment constraints to deduplicate entitlements. All isolated tables force RLS and deny direct client access; settlement RPCs are server-only. Notes URLs require an active, non-revoked entitlement and are limited to synthetic PDFs in the private test bucket. Synthetic purchases cannot unlock real Notes. My Purchases recovers attempts on focus; Notes refreshes ownership on focus. PaymentSuccess independently reads server purchase proof.

The test catalog is authenticated and allowlisted, with database-constrained prices. Quote/configuration failures block Pay. This change does not add a client-side substitute for account/provider eligibility or turn the unavailable label into a sales-enablement override.

## Files changed

1. `src/services/paymentService.ts:262`: isolated recovery now checks the original buyer before requesting verification and after the request completes or throws. If the account changes, it returns an unconfirmed/auth-required verdict. Ordinary recovery retains its URL validation and account checks.
2. `scripts/nonplay-test-isolation-selftest.cjs:55`: regression checks prevent HTTP after a buyer change and prevent a successful recovery verdict being accepted after an in-flight account change. The original-buyer assertion was observed failing before the fix, then passing afterward.
3. `scripts/nonplay-provider-security-selftest.cjs:1`: directly exercises the existing isolated provider adapter and HMAC implementation with synthetic HTTP. Covers wrong product/account/order/environment/price/currency/key bindings and false capture.
4. This report.

Build configuration, backend implementations, migrations, production gates and existing user/payment data were not changed.

## Verification

| Check | Result and scope |
| --- | --- |
| 19 existing mobile payment/entitlement suites | PASS; list below. Native/Auth/HTTP dependencies are fixtures. |
| New isolated provider security suite | PASS; actual adapter and HMAC, synthetic HTTP only. |
| Three backend Node regression harnesses | PASS: `razorpay-security-selftest.cjs`, `razorpay-routing-selftest.cjs`, `settle-timestamp-selftest.cjs`. Synthetic transports only. |
| `tsc --noEmit` | PASS. |
| `git diff --check` | PASS. |
| `supabase/tests/run-nonplay-test-local.py` | PASS on disposable PostgreSQL 18 with local Supabase stubs and mock provider HTTP. Nine handler tests passed, zero failed. |
| Migration repeatability/conflict checks in that runner | PASS; 32 conflict cases; compatible replay/concurrent installation, RLS/RPC privileges, rollback and unchanged financial-table fingerprints checked. |
| Actual isolated Razorpay provider transaction / installed APK | NOT RUN; hosted prerequisites absent. No end-to-end success claim. |

Existing mobile suites: `checkout-html`, `checkout-security`, `mv004-recovery`, `mv007-billing-boundary`, `mv008-ownership`, `nonplay-test-isolation`, `notes-entitlement`, `notes-open`, `payment-poll`, `payment-provider`, `payment-request`, `payment-routing`, `payment-success-owner`, `payment-summary`, `payment-verdict`, `purchases`, `purchases-unavailable-ui`, `razorpay-internal-test`, `release-payments-disabled` (all `-selftest` scripts).

| Requested scenario | Evidence |
| --- | --- |
| Buy Now visibility and checkout opening | Isolated profile/card → summary → test order → WebView route passed in the mobile harness. Actual provider UI not opened. |
| Cancellation, failure, pending, verified success | Mobile routing and isolated handler/SQL tests passed. Pending/failed/cancelled hints never grant; later capture can recover. |
| Invalid signature | Actual isolated HMAC and handler rejection passed. |
| Wrong amount/currency/product/account | Provider validation and handler/SQL ownership checks passed. |
| Duplicate callback/webhook replay and concurrent settlement | Actual isolated handlers + local SQL passed; one entitlement and event-identity conflict handling verified. |
| Network interruption | Durable owner-bound idempotency, one provider CREATE, receipt recovery after lost response, retry/pending behavior and account-switch regression passed. |
| Notes unlock after verified entitlement only | Local SQL/handler entitlement and signed-URL checks, stale client-unlock denial and real Notes isolation passed. |
| Google Play production gate stays disabled | Release/provider/billing-boundary suites passed; no production flags changed. |

Initial test-environment failures were resolved: the release gate suite requires the repository-root working directory; the disposable PostgreSQL setup initially lacked the expected `postgres` role. Interrupted database runs were not counted as passes. The final complete local runner exited 0. No remaining failures were observed in the checks listed above; no claim is made about unrelated audit suites.

Reproduction commands from `~/AyurPulse`:

```sh
node mobile-app/scripts/razorpay-internal-test-selftest.cjs
node mobile-app/scripts/nonplay-test-isolation-selftest.cjs
node mobile-app/scripts/nonplay-provider-security-selftest.cjs
node mobile-app/scripts/release-payments-disabled-selftest.cjs
PGHOST=/tmp PGPORT=55441 PGUSER=postgres python3 supabase/tests/run-nonplay-test-local.py
```

The database command requires a disposable local PostgreSQL server and Deno/psql. It creates/drops scratch databases and applies migrations only there; never point it at a hosted server.

## Remaining requirements and approval boundary

Before an actual provider test:

1. Review hosted test schema/RPC/Storage definitions against the existing isolated migration; propose only necessary changes. Deploy the five existing dedicated functions after explicit approval, preserving production endpoints and restrictions.
2. Configure dedicated server-only `NONPLAY_TEST_RAZORPAY_KEY_ID` (`rzp_test_`), `NONPLAY_TEST_RAZORPAY_KEY_SECRET`, `NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET`, `NONPLAY_TEST_ENVIRONMENT`, `NONPLAY_TEST_CHECKOUT_ENABLED`, `NONPLAY_TEST_USER_IDS` and `NONPLAY_TEST_PRODUCT_IDS` through the owner's secure provider/configuration workflow. Never place private credentials in Expo/EAS public variables or chat.
3. Provision only synthetic approved accounts/products/PDFs. Accounts require protected `app_metadata.medveda_nonplay_test`, an active DB test-user entry and server allowlisting; products require both DB and server allowlisting. Verify eligible course/account state and private synthetic storage.
4. Address the shared new-order switch explicitly. The current isolated handler requires `purchase_settings.new_orders_enabled=true`, while production must remain restricted. **Do not flip this global switch to test checkout.** An owner-approved gate design/configuration review is required before activation; no bypass or production activation is included here. The isolated DB and Edge switches must also be deliberately authorized.
5. Configure a test-mode Razorpay webhook for `razorpay-webhook-nonplay-test`, verify capture behavior and signed delivery, and test pending/capture/refund/replay against test resources only.
6. Validate the existing test package's Firebase file mapping and EAS development environment. The profile already targets the same hosted project but isolates financial records, credentials, package, channel and runtime; it is not a separate Supabase project. Confirm all provider variables remain server-side.
7. After separately approved APK build/install, perform a real Razorpay **test-mode** checkout with a synthetic product. Record server capture/entitlement proof, My Purchases refresh, Notes access, cancellation/failure/recovery and webhook behavior before claiming end-to-end readiness.

Google Play production/closed-testing sales remain blocked pending verified owner-specific policy/program eligibility and required integration/acceptance evidence. A successful non-Play synthetic transaction would not resolve those blockers. The existing `razorpay-live-testing` profile is outside this initial test scope and was not selected or changed.

## APK command (provided only; not executed)

From `~/AyurPulse/mobile-app`, after the separate build approval:

```sh
eas build --platform android --profile razorpay-internal-test
```

No new profile is proposed. Do not submit this APK to Google Play or substitute `production`, `internal-testing` or `razorpay-live-testing` for initial test-mode validation.

The requested exact Expo v57 reference was read before code changes: <https://docs.expo.dev/versions/v57.0.0/>.
