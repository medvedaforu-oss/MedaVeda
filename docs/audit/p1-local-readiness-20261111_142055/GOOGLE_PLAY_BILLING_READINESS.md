# Google Play Billing and native user choice

Date: 2026-11-11 UTC. P1 local only. Synthetic accounts/payments and isolated PostgreSQL; no production/staging calls, financial APIs, deployment, payment activation, cloud/native build, credentials upload or publication. Production purchases remain disabled. Local verification is not production acceptance.

**FIXED AND LOCALLY VERIFIED for bounded synthetic contracts. Native/provider/Console acceptance NOT VERIFIED. Sales disabled.**

The retained service creates an authoritative server order, uses its SKU/amount, fetches that exact native Android product, requires INR and exactly one standard matching-price BUY offer, initializes user-choice billing, and calls the native request. Alternative processing requires the actual listener shape: one matching SKU and an external token, deduplicated and persisted under the initiating user/order. Server token attachment/choice SQL binds user, product and order and rejects replay; client state grants nothing. The synthetic token values in tests are fixture inputs only, never presented as issued Google tokens.

New confirmed race: account switched during AsyncStorage attempt save, after the last prelaunch identity check. Before-fix test proves nativeRequests increases (5 versus 4). The service now rechecks session/attempt after storage before native launch. Resume also rechecks after storage reads. Alternative summary checks owner before/after token attachment, provider order response and final navigation. createPlayOrder accepts the initiating user constraint. `play-storage-race-before.log`, `notes-billing-choice`, `play-catalog-contract`, summary/request/ownership suites cover these paths.

| Scenario | Local result / boundary |
|---|---|
| Wrong/missing SKU; wrong currency | Exact native product match or fail closed; catalog-contract test passes. |
| Wrong/multiple/discount/rental/preorder offer; price mismatch | Standard offer selection fails; ₹1/₹2/₹5 exact fixture prices accepted; no substitution. |
| Missing enrollment/acceptance | Production config/runtime gates reject purchase work before HTTP/native launch; hostile production provider overrides rejected. |
| Genuine alternative callback requirement | Wrong SKU/malformed callback rejected; duplicate callback produces one effective alternative flow; different token cannot replace the stored choice. |
| Cancel | Native synthetic cancellation emits cancel; no entitlement. |
| Pending | Receipt pending emits pending and never verifies/grants success. |
| Interrupted native request / timeout | Attempt remains durable; pending guidance; no immediate second purchase launch. |
| Account switch | Pre-callback, during choice save, during launch save, verification and history/unmount checks pass. |
| Reinstall-style Play recovery | Empty local attempt store plus hashed account/order receipt identifies server order; verification restores success without starting a new purchase. Device reinstall is NOT VERIFIED. |
| External token replay | Notes choice SQL/concurrency rejects conflicting/replayed binding; duplicate same request remains idempotent. |
| Unsupported country / Billing version | Native-unavailable failure path is synthetically checked. Actual country/package/program eligibility and native API behavior are **NOT VERIFIED**; no fake version/country bypass added. |
| Google Play selection | Synthetic receipt uses server verification/committed fulfillment; server consumption follows atomic grant, never client-only success. Genuine receipt/consume acceptance NOT VERIFIED. |

Historical receipt restoration remains independent of new-sale permission in the retained service. Android UI restoration gates and My Purchases behavior are preserved. A reinstall cannot recreate a genuine external-choice token locally; authoritative pending-order recovery is required, never token invention or a second checkout merely because local storage is empty.

Native inputs: expo-iap 3.4.4 → OpenIAP Google 1.3.26 → retained POM billing-ktx 8.3.0; installed Gradle/manifest/Kotlin/version input hashes unchanged. Billing permission retained. Actual releaseRuntimeClasspath/dependencyInsight remains **NOT VERIFIED**. No lower-version compatibility claim is made from a POM. The owner must prove the exact resolved graph and Google's native UI/callback on the final installed distribution.

[Google's user-choice integration guidance](https://developer.android.com/google/play/billing/alternative/alternative-billing-with-user-choice-in-app) specifies native initialization/listener flow. It does not establish this owner's India program enrollment, per-app opt-in, product approval, reporting acceptance or policy compliance. Those remain OWNER ACTION REQUIRED. Catalog values were not changed. No native choice sheet, genuine transaction/token/report, Play upload or payment activation occurred.
