# Payment commitment and entitlement security

Date: 2026-11-11 UTC. P0 only. Local synthetic PostgreSQL/provider evidence; no production/staging connection, deployment, financial transaction, credential change, worker/schedule activation, Android build upload or payment activation. Existing approved artifacts and financial history were preserved. **Local verification is not production protection or acceptance.**


MV003's current exact proof binds paid Razorpay order, successful Razorpay payment, successful committed purchase, user, product, amount, nonempty provider references, course and full chapter/subject/year/bundle snapshot. It validates matching existing capture facts, rejects every compensation state, and denies unresolved reversal evidence. Legitimate historical purchases need no invented capture marker. New D changes only classification of already provider-verified nonblocking pending reversals, leaving all exact-identity predicates and service-only ACLs intact.

[supabase/functions/_shared/settle.ts](/home/ganeshp8545/AyurPulse/supabase/functions/_shared/settle.ts:96) proves commitment before replay and after settlement. An authorization, a capture, a void SQL return, a granted marker, Google reporting completion or a client success screen cannot establish success. Missing/throwing RPC, mismatched snapshot, failed SQL and interrupted recovery remain pending/retryable. The trusted PDF path authenticates the user, invokes backend Notes authorization and only then signs an object URL: [supabase/functions/get-note-url/index.ts](/home/ganeshp8545/AyurPulse/supabase/functions/get-note-url/index.ts:32), [supabase/functions/get-note-url/index.ts](/home/ganeshp8545/AyurPulse/supabase/functions/get-note-url/index.ts:43), [supabase/functions/get-note-url/index.ts](/home/ganeshp8545/AyurPulse/supabase/functions/get-note-url/index.ts:58). Existing private Storage policy checks pass in `readiness_validation`.

MV004 [supabase/functions/verify-payment/index.ts](/home/ganeshp8545/AyurPulse/supabase/functions/verify-payment/index.ts:83) authenticates recovery and filters order ID plus verified owner before provider work. Wrong-owner/nonexistent requests share denial behavior. Signed callback remains HMAC-authenticated without gateway JWT. Mobile recovery pins the initiating account and permits one bounded refresh; account switching cannot navigate to success from stale work. No frontend authorization logic changed here.

| Scenario | Fresh evidence / result |
|---|---|
| Correct payment/order/user/product/INR amount/provider refs/scope/snapshot | Actual SQL/helper/callback/webhook passes, all four scopes; `mv003-006.log`, `proof.log` |
| Wrong user/product/course/scope/payment/order/amount/currency/provider | Exact SQL proof false; callback/webhook deny; foreign-user recovery denied before provider; retained grants unchanged |
| Client success / stale unlocked route | Mobile Notes entitlement tests enforce authoritative server denial; no client-side purchase write grants access |
| Authorization without capture / capture without settlement | No false success; owner recovery finishes capture-only state; missing committed purchase remains pending |
| Void/error/failed SQL transaction | Missing/throwing proof, forced SQL error and failed ownership write roll back; normal void return cannot unlock |
| Compensation/refund/dispute/reversal | Compensation in every state denies; open dispute suspends, won legitimate restoration succeeds, full refund/lost dispute stays terminal; early partial/won recovery now passes |
| Duplicate callback/webhook/concurrent settlement/restoration | Independent-session serialization and one durable successful ownership; replay idempotence; conflicting restoration rolls back |
| Interrupted recovery / account switch | Capture-only and post-commit retry pass without duplicate grant; expired/forged/missing identity and switched account denied |
| Unknown reversal/provider mismatch | Strict recognized-result lists retain non-2xx/inbox/worker retries; only durable compensation/reversal dispositions acknowledge |
| Legitimate historical purchase / legacy NULL-product scope | Backend access and restoration preserved, no history normalization or destructive replay |

Actual HMAC computation and tamper rejection execute locally. Auth/provider/Supabase client HTTP transports are synthetic; local SQL functions/roles/triggers/transactions are real. Hosted gateway/Auth/cache/Storage/native and live payment-to-Notes behavior remain UNKNOWN, not passed.
