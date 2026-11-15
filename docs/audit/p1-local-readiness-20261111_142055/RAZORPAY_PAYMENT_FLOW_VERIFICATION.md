# Razorpay payment-flow verification

Date: 2026-11-11 UTC. P1 local only. Synthetic accounts/payments and isolated PostgreSQL; no production/staging calls, financial APIs, deployment, payment activation, cloud/native build, credentials upload or publication. Production purchases remain disabled. Local verification is not production acceptance.

**Synthetic contracts pass. Genuine merchant/provider/device integration NOT VERIFIED.**

Order Summary quotes server prices and rechecks amount before checkout. Alternative checkout waits for matching native choice and server token attachment. The new owner checks prevent a switched session from continuing that asynchronous summary path. PaymentCheckout validates route data, allowlisted verification URL, nonce/origin and structured callback; WebView callback cannot itself grant Notes. PaymentSuccess separately reads authoritative owner-bound paid order/successful purchase evidence and clears stale account details. PaymentFailed/pending recovery uses the original order and authenticates ownership before provider lookup. Disabled builds exclude checkout routes and refuse order/purchase initiation at service/UI/config boundaries.

Server verification retains raw HMAC/signature checks and re-fetches authoritative capture/order/INR/amount. SQL commitment binds order, payment, purchase, user, product, amount, provider references and immutable course/scope snapshot. Capture/paid markers alone are insufficient. Duplicate success cannot bypass compensation/reversal proof. No financial SQL or settlement helper was changed in P1.

| Required scenario | Fresh local evidence / expected contract |
|---|---|
| Captured success | MV003 helper/HMAC/actual handler + SQL; paid and exact committed entitlement required. |
| Failed/cancelled/authorized but uncaptured | payment-verdict/poll/request; notes-choice authorization, Phase B/C SQL: no entitlement until capture+commitment. |
| Duplicate callback/webhook | HMAC/webhook harness (25 checks), settlement/retry concurrency; one grant/ledger business effect. |
| Wrong amount/order/account/product | Razorpay-security, actual Phase B handlers, MV003/ownership SQL; reject or durable compensation; never success on mismatch. |
| Network/provider timeout | payment-request, recovery, notes-choice-order, actual handler fixtures; retain ambiguous order and retry/reconcile original provider receipt. |
| WebView interruption / backgrounding | Synthetic callback loss, polling deadlines, unmount/resume and pending-order recovery contracts pass. Actual Android WebView/UPI lifecycle is **NOT VERIFIED**. |
| Account switching | Checkout security, success-owner, MV004/MV008, new summary/Play checks; no stale private success or checkout continuation. |
| Retry after ambiguous completion | Stable original provider order/idempotency; provider receipt lookup; no new charge inferred from missing callback. |
| Settlement failure | Exact proof failure returns retryable/pending; paid/captured UI markers cannot grant. |
| Reversal/refund/dispute | P0 reversal, compensation, actual SQL/webhook, immutable scope/refund/replay tests; unknown outcomes retry; full reversal cannot regrant; tested nonblocking partial/won recovery retained. |
| Purchase restoration | Owner history/purchase refresh plus authoritative server proof; historical missing-capture compatibility and existing legitimate ownership retained. |

Read `database.log`, `mv003-006.log`, `phase-b.log`, `phase-c.log`, final checks and initial reproduction logs. These use real local PostgreSQL transactions/roles and synthetic HTTP/Auth/provider transports. Managed gateway, merchant KYC/mode, webhook secret/registration/delivery, actual capture/refund/dispute/settlement and physical-device behavior remain NOT VERIFIED. No genuine Razorpay endpoint was called.

Preserved catalog is exactly ₹1/₹2/₹5 where specified; test fixtures also contain other synthetic amounts to exercise security/math. Those fixture values do not change the catalog. Production finance anomalies remain unresolved and cannot be fixed from a passing synthetic payment suite.
