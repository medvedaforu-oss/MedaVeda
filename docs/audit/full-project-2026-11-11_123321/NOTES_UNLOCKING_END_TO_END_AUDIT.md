# NOTES UNLOCKING END TO END AUDIT

Audit date: 2026-11-11 UTC. Scope: current working tree, including pre-existing uncommitted changes. **Audit only; no deployment authorization.**

**DOES A SUCCESSFUL RAZORPAY PAYMENT ACTUALLY UNLOCK THE CORRECT NOTES? VERIFIED in the isolated synthetic handler/PostgreSQL scenarios for the reviewed compatible contracts. UNKNOWN in deployed test and live production.** A provider success toast, authorization or captured payment without committed matching entitlement is insufficient.

## Environment-specific verdict

| Environment | Verdict | Evidence / unresolved condition |
|---|---|---|
| Local synthetic | VERIFIED WORKING for tested scope | Actual callback/webhook/HMAC/settlement code, synthetic provider/Auth transport, real service-role PostgreSQL and ownership RPCs; fresh atomic and SQL logs |
| Deployed test | BLOCKED | No authorized complete test identity/provider fixture/native environment acceptance performed; no staging functions invoked |
| Live production | UNKNOWN / launch BLOCKED | No real payment made; deployed contract gaps and operational gates must be reconciled; production Android source disables sales |

## Flow traced

`NotesScreen / ChapterDetailsScreen → UnlockOptionsPanel → OrderSummary → provider order → checkout → signed callback/webhook or authenticated recovery → provider capture GET → SQL settlement → exact commitment proof → purchases read → signed Notes URL`.

[mobile-app/src/services/purchasesService.ts:72](/home/ganeshp8545/AyurPulse/mobile-app/src/services/purchasesService.ts:72) maps successful chapter/subject/year/bundle scopes. [mobile-app/src/hooks/usePurchases.ts:1](/home/ganeshp8545/AyurPulse/mobile-app/src/hooks/usePurchases.ts:1) filters by current course. [mobile-app/src/hooks/usePurchaseResource.ts:17](/home/ganeshp8545/AyurPulse/mobile-app/src/hooks/usePurchaseResource.ts:17) masks old-account data immediately, uses generation checks, bounded reads, context/auth subscriptions and resume refresh. Same-context read failure may retain last confirmed ownership with an explicit error; that cached UI state does not authorize storage.

[supabase/functions/get-note-url/index.ts:49](/home/ganeshp8545/AyurPulse/supabase/functions/get-note-url/index.ts:49) verifies the actual Auth user and calls `user_can_access_note_with_aal`; unauthorized, blocked, inactive/unpublished or out-of-scope content is denied by the SQL contract. It signs private Notes objects for 120 seconds only after authorization. Real managed Storage signing/object bytes were not tested locally; local stubs do not prove object availability or hosted policy behavior.

[mobile-app/src/screens/payment/PaymentSuccessScreen.tsx:45](/home/ganeshp8545/AyurPulse/mobile-app/src/screens/payment/PaymentSuccessScreen.tsx:45) rechecks authenticated owner, paid order, successful purchase and matching amount. Route parameters cannot independently display confirmed success. Owner-switch regression passes.

## Safety and recovery matrix

| Scenario | Independently established local behavior | Remaining limit |
|---|---|---|
| Valid captured purchase | Matching purchase/owner/scope settles and SQL reader permits intended Notes | Real Storage signing and native rendering unverified |
| Authorization only | Refused as entitlement; choice reporting can queue without a purchase | Genuine authorization timestamp/report acceptance unknown |
| Fake client success | No grant without HMAC/provider facts/SQL proof | Modified clients cannot change server RPC authorization |
| Wrong amount/order/currency | Rejected; mismatched captures can queue compensation | Compensation execution deliberately never invoked remotely |
| Wrong owner/product | Recovery/commitment and storage ownership checks deny | Full managed Auth/IDOR penetration testing outstanding |
| Failed/cancelled checkout without capture | No purchase | Late captured charge is a different state and may recover safely |
| Replay/concurrent delivery | One committed grant, token/order binding and ownership locking | Existing historical duplicate rows intentionally preserved |
| Interrupted checkout | Owner-authenticated provider lookup retries | Real app termination/UPI switch not tested |
| Login/logout/restart | Persisted server entitlement plus auth/context refresh code and isolated regressions | Real device persistent session/restart journey unexecuted |
| Historical success | Retained reader access and fingerprints tested on synthetic contradictory/duplicate history | No automatic historical financial repair; production restoration not certified |
| Refund/dispute | Full revoke, partial retain, suspend/won restoration rules tested in SQL/candidate | Workspace unknown reversal acknowledgement remains a defect |
| Offline refund revocation | Denied server check deletes local access; recent confirmed owner can use grace while offline | Up to seven days delayed revocation is explicit local policy, not immediate offline enforcement |

Offline grace is defined in [mobile-app/src/services/offlineNoteVerification.ts:3](/home/ganeshp8545/AyurPulse/mobile-app/src/services/offlineNoteVerification.ts:3) and used by `offlineNoteAccess.ts`. This tradeoff requires an approved access policy and real device testing. A rooted device/local file extractor is outside the app's ordinary authorization boundary; screenshot blocking is not DRM certification.

No synthetic test here establishes that every real Notes object, product scope, legacy purchase or published row is correctly configured. Before activation, use a controlled accepted test account to prove exact product scope, private object delivery, refresh/library visibility, logout/restart, duplicate callback/webhook, interruption and reversal policy in the intended deployment. No production transaction is authorized by this report.

## Fresh production observation supplement

[Read-only production evidence](evidence/production-readonly.json) confirms 66 versions through `20261104110000`, no `razorpay_entitlement_committed` RPC, deployed verify-payment v68 / webhook v50 / create-order v23, and seven bundle hashes. The verifier/webhook do not contain the reviewed commitment call. Two successful purchases are linked to non-paid orders and one duplicate-success ownership group exists. These records were neither exposed individually nor modified. This establishes deployment/data gaps, not genuine provider settlement acceptance.

The current `require_ucb_for_razorpay=false` setting is not a payment kill switch. Active wallet-credit cron must be considered in quiescence. Live credentials/account/webhook dashboard activation remain UNKNOWN; no real charge or worker invocation occurred.
