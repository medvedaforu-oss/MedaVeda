# Real Google Play testing — not yet executed

Prerequisites: approved standalone test endpoints and server UUID allowlist; working Google API service account; active India/INR BUY options and fresh price-tier mapping; matching package/upload signature; Android device with current Play Store; approved Google license testers who are also opted into the chosen internal/closed testing track. Track publication/upload is a separate approval and has not occurred.

Use the AAB from the authorized cloud build on the approved testing track. Confirm the downloading/purchasing Google account is the license tester and the purchase dialog clearly identifies a test purchase. A testing-track account alone can incur real charges. License testers can sometimes sideload matching-package APKs, but a sideload alone does not establish the full store-distribution environment. See [Google's billing test guide](https://developer.android.com/google/play/billing/test).

Record app version, test account aliases, order ID, redacted token identifier, Google response state, entitlement proof and consumption status. Do not record bearer tokens, full purchase tokens or service-account material.

| Case | Required observed result |
| --- | --- |
| Successful test purchase | Google reports PURCHASED with testPurchaseContext; server matches account/order/SKU/BUY option, commits entitlement, then consumes; app refreshes owned content. |
| Cancelled dialog | No grant; original durable hint clears after explicit native cancellation; retry allowed. |
| Pending approval | Slow test payment method; no verification success/grant/consumption while pending; resume/restore settles only after purchase completes. |
| Duplicate callback/token replay | One durable grant; idempotent same-order replay; no additional credit or duplicate purchase. |
| Already-owned content/SKU | Existing content blocks a replacement order; unresolved Play-owned SKU leads to restore/support, never Razorpay fallback. |
| Account A to B, then A | B cannot verify/unlock A's receipt; B's own checkout remains available; A's durable recovery survives. |
| Restart during checkout | Authenticated original owner restores via stored attempt or account/order hashes in server history. |
| Network interruption | Disconnect during dispatch/verification/body read; show unconfirmed state, retain hint, prevent duplicate payment. |
| Response lost after server consumption | Native receipt may disappear; owner-scoped committed-fulfillment RPC recovers success and clears durable hint. |
| Restore/reconciliation | Launch, app resume and My Purchases recover eligible unconsumed receipts; existing grants remain readable. |
| Incorrect server ownership/SKU/token/option | Server rejects; no settlement, consumption or client-side entitlement. |
| Server failure / missing entitlement proof | Pending retry; no unauthorized unlock or premature consumption. |
| Real-money receipt / non-allowlisted user | New test verifier rejects before settlement; default-off gate prevents new standalone orders. |
| Notes and Question Papers | Purchased Notes open/download through existing server authorization; unrelated Question Papers/auth/download paths remain usable. |
| Razorpay regression | Existing permitted non-Play distributions retain their original checkout, verification and recovery. No Play screen routes to Razorpay. |

The server's reusable price-tier SKU is consumable; the purchased Notes entitlement is permanent subject to refund/revocation. Server consumption acknowledges the transaction after committed entitlement. The client must never consume/finish it independently. Google documents `testPurchaseContext` as present only for test purchases in the [ProductPurchaseV2 reference](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.productsv2).
