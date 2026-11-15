# Approved entitlement patch deployment — 12 November 2026

Status: **both approved functions deployed and verified** in Supabase project `xbvenkfmesugrbjuufyw`. No real payment, hosted order creation, APK build, secret update, schema change or unrelated deployment was initiated.

## Deployment and drift checks

| Function | Reviewed remote version before deployment | Deployed version | Status | verify_jwt |
| --- | --- | --- | --- | --- |
| `verify-payment` | 68 | 69 | ACTIVE | false, preserved |
| `razorpay-webhook` | 50 | 51 | ACTIVE | false, preserved |

Fresh pre-deployment bundle hashes matched the reviewed hashes:

- Verifier v68: `12ee195447da08ac9953e383a0d24378d45430edef52a9086aa038f9715a6c62`.
- Webhook v50: `c6d8811e22f89c5966d16118547a21eccad89ab03a7733a147a5c89f3d19d276`.

The complete function source contents also matched the reviewed baseline. Deployment payloads used the fresh remote source bytes, preserving original EOF bytes; the only source change was the seven approved additions to `functions/_shared/settle.ts`. Each function retained its own original dependency list. The webhook baseline was checked again immediately before its deployment. No workspace backend implementation was uploaded.

Post-deployment downloads matched every uploaded source file byte for byte. Function IDs, `verify_jwt=false` and the absence of an import map were preserved. New bundle hashes:

- Verifier v69: `ffe779d15b84698acc416aa90af0f33fbb7757952f2636d06bf6abc07e4effcb`.
- Webhook v51: `38b92030acc7ace0e8188b5dcbc0d9b6c0b3fc7bbf22b0a56e89a74cd5119252`.

The deployment API only replaced these two function bundles. No secret-management, schema-migration, database-write or production-settings operations were performed. Existing website order creation, Play production/Closed Testing configuration, Firebase, authentication, PDFs, notifications and UI were untouched.

## Safe post-deployment verification

All five live HTTP health probes passed. Their requests contain no order/payment identifiers and stop before settlement, rate-limit RPCs or provider API calls:

| Probe | Expected / observed |
| --- | --- |
| `GET verify-payment` | 405 / 405 |
| `POST verify-payment` with `{}` | 400 / 400 |
| `GET razorpay-webhook` | 405 / 405 |
| `POST razorpay-webhook` with `{}` and no provider headers | 400 / 400 |
| Synthetic health event with a forged webhook signature | 401 / 401 |

The forged event has type `medveda.healthcheck`; it is not a payment event. Its signature was rejected before any event/database processing. A bounded post-deployment log query found five function-edge request entries, two ordinary function log entries and one warning; no error-level function entries were returned in that window. The test intentionally exercises the invalid-signature warning path. This small observation window is not ongoing production monitoring.

Read-only SQL verification returned:

- Existing paid Razorpay orders with successful purchases: **13**.
- Those satisfying `razorpay_entitlement_committed`: **13**.
- Deliberately invalid order/payment proof: **false**.
- Commitment RPC: `SECURITY DEFINER`; executable by `service_role`, denied to `anon` and `authenticated`.

The exact newly downloaded deployed files were then used for synthetic post-deployment tests. The actual callback HMAC, webhook HMAC, provider capture/amount checks and false-commitment rejection passed. The website differential suite also passed: **24 unchanged request scenarios**, duplicate callback/webhook response compatibility, and fail-closed false/errored commitment checks for both functions. All provider/database transport in those harnesses was synthetic; no real network payment request was made by them.

The successful website payment response is unchanged in tested scenarios. The approved change refuses false success after an uncommitted or errored proof. The helper's 503 result is translated by the existing wrappers to callback HTTP 500 with `success:false` and webhook HTTP 500 for retry. Terminal compensation/reversal cases can consequently generate repeated webhook retries, as recorded in the approved compatibility review.

## Evidence and rollback

Evidence is in [razorpay-live-deployment-20261112](evidence/razorpay-live-deployment-20261112/deployment-metadata.json):

- [Deployment metadata](evidence/razorpay-live-deployment-20261112/deployment-metadata.json).
- [Exact deployed diff](evidence/razorpay-live-deployment-20261112/exact-deployed.patch), identical to the approved persistent patch.
- [Live health responses](evidence/razorpay-live-deployment-20261112/safe-health-results.json).
- [Exact original-source rollback bundle](evidence/razorpay-live-deployment-20261112/backend-before.tar.gz).
- [Deployed-source bundle](evidence/razorpay-live-deployment-20261112/backend-deployed.tar.gz).
- [Archive and file hashes](evidence/razorpay-live-deployment-20261112/bundle-manifests.json).

If rollback becomes necessary, restore both original function bundles from `backend-before.tar.gz`, preserving `verify_jwt=false` and all secrets. Supabase assigns new deployment version counters. Do not revert schema or delete/rewrite any order, payment, wallet or entitlement record. A code rollback restores the original false-success defect. No rollback was needed or performed.

## Remaining acceptance limits

No deployment or non-charging health blocker was found. Existing live API credential validity, Razorpay auto-capture/dashboard settings, actual captured-payment settlement and real webhook delivery remain unverified by these deliberately non-charging checks. A signed successful LIVE transaction was not replayed or fabricated against production. The user's manual ₹1 acceptance test remains pending. The APK build remains unstarted, as instructed.
