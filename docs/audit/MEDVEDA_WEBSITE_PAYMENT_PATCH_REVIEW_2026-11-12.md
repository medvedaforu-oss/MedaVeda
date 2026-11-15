# Website compatibility review — 12 November 2026

Result: the reviewed entitlement-only patch passes the targeted compatibility checks. No function was deployed; no live payment, order, secret, setting or schema was changed. This review added evidence/documentation only.

## Source and scope

Fresh read-only downloads still show `verify-payment` v68 and `razorpay-webhook` v50 in project `xbvenkfmesugrbjuufyw`. Both preserve `verify_jwt=false`, with their existing callback/provider and webhook HMAC verification.

Recursive comparison of the downloaded deployment source and the candidate finds exactly **seven added lines in `functions/_shared/settle.ts`**, immediately after settlement succeeds. No other function dependency differs. The persistent [exact patch](evidence/razorpay-live-restore-20261112/backend-entitlement.patch) matches that fresh comparison. Both entry points, CORS, response formatting, signature validation, rate limits, provider requests, refund/dispute helpers and credential handling are unchanged. Order creation is outside the deployment candidate.

The new RPC is a read-only proof. It does not create/revoke entitlement, change pricing, apply a refund or move wallet balances. It checks the exact payment/order/purchase commitment already maintained by the database. The existing service-only SQL function exists in production. Read-only aggregate inspection found all **13 currently paid Razorpay orders with successful purchases** satisfy it; this is an aggregate compatibility observation, not a live provider check.

## Observable behavior

| Condition | Before | Candidate |
| --- | --- | --- |
| Valid, captured payment with committed entitlement | Callback HTTP 200, existing success JSON; webhook 204 | Identical |
| Invalid signature, amount, currency or order | Existing rejection | Identical |
| Existing refund/dispute events | Existing handling | Identical |
| Valid duplicate callbacks/webhooks | Existing idempotent grant/response | Identical in tested cases |
| SQL settlement returns void without committed entitlement | Incorrect success | Helper 503; existing wrappers return callback HTTP 500 with `success:false`, webhook HTTP 500 for retry |
| Commitment RPC missing/errored | No check | Same failure/retry behavior as uncommitted entitlement |

This is intentionally not identical behavior for false-success cases. A compensated, reversed or held capture must not say content was unlocked. The minimal candidate treats every uncommitted outcome as retryable; terminal compensation/reversal cases may therefore cause repeated webhook retries rather than a final acknowledgement. It introduces no new response fields or authentication requirements. Existing website callers can use their current signed callback or recovery payloads without a JWT change. Recovery authorization has not been redesigned by this patch.

## Executed tests

1. **PASS exact deployed-versus-candidate differential harness:** 24 request scenarios plus duplicate-delivery and false/errored-commitment groups. Tests execute actual downloaded handlers and HMAC implementation; only provider/database transport is synthetic. Exact HTTP status/body equality is asserted for successful website callbacks without JWT, legacy recovery, capture webhooks, previous webhook secret, invalid/missing signatures, invalid/swapped orders, method/CORS, uncaptured payments, amount/currency mismatch, provider/database errors, unrelated events, partial/full refunds and won/lost disputes. See [parity results](evidence/razorpay-live-restore-20261112/website-parity-results.log).
2. **PASS candidate and deployed baseline with real disposable PostgreSQL settlement:** fresh payment; repeated callback/webhook; exactly one successful purchase; committed entitlement; legacy purchase with no capture marker. The baseline reproduces false success after a synthetic purchase deletion and normal void settlement; the candidate returns failure. Provider transport remains synthetic. See [staged SQL results](evidence/razorpay-live-restore-20261112/website-staged-sql-results.log).
3. **PASS existing shared-backend scripts:** `razorpay-routing-selftest.cjs`, `razorpay-security-selftest.cjs`, `settle-timestamp-selftest.cjs`, `recovery-selftest.cjs`, `razorpay-env-selftest.ts`, `razorpay-refund-selftest.ts`, `razorpay-order-recovery-selftest.ts`.
4. **PASS existing PostgreSQL webhook harness:** 25 checks including partial/full refunds, disputes, replay, invalid signatures, provider outage, reversal ordering and interleaved refund/capture handling. **PASS** `razorpay_snapshot_retry_checks.sql`, `referral_off_wallet_checks.sql` (0 FAIL, 19 PASS), and `referral_switch_off_paths.sql`. See [PostgreSQL output](evidence/razorpay-live-restore-20261112/website-postgres-results.log).

Tests in points 3–4 exercise the existing workspace source, which is newer than production. They are supporting regressions, not proof that the old deployed snapshot implements every newer feature. Points 1–2 specifically exercise the proposed deployment candidate against the actual deployed baseline. No dedicated website frontend checkout test suite was found in this checkout; the shared order/verification/webhook regressions are the available website payment tests. Browser/device checkout, live capture settings and real webhook delivery remain outside this local review.

## Rollback plan — no execution authorized

1. Before a future approved deployment, recheck project ID, deployed versions/source hashes and both `verify_jwt=false` settings. Abort on unexpected drift. Keep both original bundles; do not deploy the newer workspace backend.
2. The exact original sources from v68/v50 and a two-function configuration are preserved in [backend-before-review.tar.gz](evidence/razorpay-live-restore-20261112/backend-before-review.tar.gz). Verify the archive and individual files with [rollback-manifest.json](evidence/razorpay-live-restore-20261112/rollback-manifest.json). The expanded original tree is `/tmp/medveda-live-backend-rollback/supabase/`; the candidate remains `/tmp/medveda-live-backend-review/supabase/`.
3. If valid committed purchases begin failing or the commitment lookup causes unexpected errors/retries, redeploy **both** original `verify-payment` and `razorpay-webhook` bundles from that backup to `xbvenkfmesugrbjuufyw`, preserving `verify_jwt=false`. Supabase will assign new deployment versions; rollback restores source bytes, not the old version counters. Recheck restored source hashes.
4. Leave secrets, webhook dashboard settings, order creation, Play functions, schema, orders, payments, wallet entries and purchases unchanged. No database rollback/delete is needed or proposed. Reverting code does not undo settled payments or entitlements.
5. Verify restored callback/webhook behavior with synthetic tests and inspect delivery/errors read-only. Reconcile any payment already in flight before requesting another payment. Code rollback restores the original false-success defect, so it is an emergency recovery step, not the permanent fix.

No deployment is authorized by this review. The candidate is reviewable, but live capture, existing secret validity and provider webhook settings still need their separate checks before the user's manual ₹1 acceptance transaction.
