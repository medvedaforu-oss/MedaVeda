# RAZORPAY PAYMENT AUDIT

Audit date: 2026-11-11 UTC. Scope: current working tree, including pre-existing uncommitted changes. **Audit only; no deployment authorization.**

**Source implementation: VERIFIED. Live production activation: UNKNOWN unless separately observed; the production Android source build is VERIFIED disabled. End-to-end production readiness: BLOCKED.**

## Complete flow and trust boundaries

1. `OrderSummaryScreen` obtains a server quote and selects a permitted provider. Build/runtime policy lives at [mobile-app/src/config/paymentProvider.ts:26](/home/ganeshp8545/AyurPulse/mobile-app/src/config/paymentProvider.ts:26) and [mobile-app/eas.json:51](/home/ganeshp8545/AyurPulse/mobile-app/eas.json:51).
2. `paymentService` sends product identity, not an authoritative price. [supabase/functions/_shared/createOrderHandler.ts:105](/home/ganeshp8545/AyurPulse/supabase/functions/_shared/createOrderHandler.ts:105) calls service-only `create_priced_order`; product, scope, course, discount, wallet and expiry snapshots are server-owned. Ordinary Android headers are rejected on the website route. Headers are routing hints, not platform attestation.
3. Server creates a Razorpay order with the exact paise amount and binds its ID to the internal order. Provider transport has bounded timeouts. [supabase/functions/_shared/razorpay.ts:10](/home/ganeshp8545/AyurPulse/supabase/functions/_shared/razorpay.ts:10) requires explicit APP_ENV and corresponding live/test prefix. This is a mode guard, not evidence of the configured account or credential ownership.
4. Checkout HTML uses Razorpay HTTPS checkout.js, nonce-bound native bridge handling and same-project verification URL validation. No direct native Razorpay SDK is installed. The mobile guards and synthetic WebView harness pass; real UPI/app-switch/native checkout was not executed.
5. [supabase/functions/verify-payment/index.ts:75](/home/ganeshp8545/AyurPulse/supabase/functions/verify-payment/index.ts:75) distinguishes a provider-HMAC signed callback from unsigned owner recovery. Recovery uses Auth.getUser and filters by authenticated owner. Foreign and nonexistent orders have the same response. Callback signature does not let a client change the stored product/owner.
6. [supabase/functions/_shared/settle.ts:24](/home/ganeshp8545/AyurPulse/supabase/functions/_shared/settle.ts:24) re-fetches provider payment and order, checks capture, INR, exact amount and order binding, records capture, and invokes transactional settlement. Authorization alone is refused. Server capture is required; client success messages cannot grant purchases.
7. `razorpay_entitlement_committed(text,text)` requires matching paid order, successful payment and purchase, owner/product/amount/provider/order/scope snapshot and absence of incompatible capture, compensation or unresolved reversal facts. A void RPC return is never proof. A historical purchase may validly predate capture markers.
8. [supabase/functions/razorpay-webhook/index.ts:108](/home/ganeshp8545/AyurPulse/supabase/functions/razorpay-webhook/index.ts:108) verifies raw body HMAC before parsing, records durable event identity/hash, then runs the same settlement. Previous webhook secret supports legitimate retry during rotation; signatures do not establish deployment/account configuration.
9. Purchases and signed Notes delivery use database ownership, independently of the success screen. See the Notes audit.

## Required integration checks

| Requirement | Local result | Hosted/live qualification |
|---|---|---|
| Source/backend wiring | VERIFIED | Deployed closure must match approved schema |
| Correct mode/account | Guard tested | Actual APP_ENV/key/account/KYC UNKNOWN; no secrets read |
| Credential management | Server Deno env; no client service-role secret found by scan | Rotation, dashboard access and active secret values UNKNOWN |
| Deployment | Archives/manifests available | Fresh metadata section in execution evidence; source existence is insufficient |
| Activation/Buy Now | Production Android disabled | Server/dashboard/live enablement UNKNOWN |
| Callback HMAC/raw webhook HMAC | VERIFIED synthetic actual code | Actual registered URL/subscriptions and delivery history UNKNOWN |
| Captured exact INR amount/order | VERIFIED synthetic and SQL paths | Genuine provider acceptance unverified |
| Failed/authorized/cancelled | No client grant; capture required | A late real capture can recover an unpaid cancelled/failed attempt under server rules; cancellation is not provider reversal |
| Pending/interrupted checkout | Owner recovery and polling tested | Native kill/restart/provider retry acceptance unverified |
| Duplicate webhook/callback | SQL/handler idempotence tested | Production new ownership guard deployment must be verified |
| Refund/dispute | SQL rules + candidate retry paths tested | Current workspace unknown-reversal defect; genuine reversal unverified |
| Concurrent same-product grant | New guard passes local races | Existing duplicates are preserved; deployment of guard separate |
| Rate limits | Present; negative paths covered in retained/current suites | Capacity, trusted IP headers and observed abuse behavior unverified |
| Worker/scheduler | Auth/lease/retry mocks + SQL tested | Cron activation, heartbeat, backlog and alert delivery not certified |

## Refund and dispute semantics

Full refund revokes success access and reverses supported accounting; partial refund retains access. Open/under-review disputes suspend access; won disputes restore only eligible ownership; lost disputes reverse. Closed/unclassified provider state needs a documented operator policy. Capture and compensation alone never qualify as an entitlement.

**HIGH — current workspace defect:** [supabase/functions/_shared/settle.ts:239](/home/ganeshp8545/AyurPulse/supabase/functions/_shared/settle.ts:239) and line 314 return `ok:true` for `unknown_payment`. The webhook can acknowledge and the worker can finish a reversal job without resolved settlement. [Independent reproduction](evidence/unknown-reversal-reproduction.log) compares current helper with compatible archive: workspace succeeds, candidate returns 503. Do not treat broad workspace deployment as the reviewed upgrade.

## Direct production answer

**IS RAZORPAY CURRENTLY ENABLED IN PRODUCTION? UNKNOWN for the actual live service/account. VERIFIED OFF in the current production Android build configuration.** A deployed endpoint, a key-shaped string, healthy project status or a public download link cannot prove payment activation. No provider dashboard credentials, secret values, real checkout or real financial transaction were accessed.

The separate non-Play test APK/profile has isolated package/data/test endpoints. Its existence does not activate production sales. Staging points to another project with placeholder public configuration and was not used. Neither deployed-test nor live capture-to-Notes acceptance is claimed.

Google's current India program requires completed onboarding, per-app opt-in, Play alongside the alternative and reporting authorized transactions within 24 hours. MedVeda-specific compliance remains unverified. [Official India requirements](https://support.google.com/googleplay/android-developer/answer/13306652?hl=en). Razorpay requires server signature verification and captured payment confirmation before fulfillment; the local candidate follows those boundaries. [Official integration guidance](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps).

## Fresh production observation supplement

[Read-only production evidence](evidence/production-readonly.json) confirms 66 versions through `20261104110000`, no `razorpay_entitlement_committed` RPC, deployed verify-payment v68 / webhook v50 / create-order v23, and seven bundle hashes. The verifier/webhook do not contain the reviewed commitment call. Two successful purchases are linked to non-paid orders and one duplicate-success ownership group exists. These records were neither exposed individually nor modified. This establishes deployment/data gaps, not genuine provider settlement acceptance.

The current `require_ucb_for_razorpay=false` setting is not a payment kill switch. Active wallet-credit cron must be considered in quiescence. Live credentials/account/webhook dashboard activation remain UNKNOWN; no real charge or worker invocation occurred.
