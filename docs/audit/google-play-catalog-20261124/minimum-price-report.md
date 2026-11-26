# MedVeda Google Play minimum-price and catalog compatibility fix

2026-11-24 UTC. **Local candidate prepared; production release HOLD.** This is a focused follow-up, not a repeated application audit. No production database writes, Google product mutations, hosted migration application, deployment, activation, purchases, AAB/native build, credential replacement, commits or pushes occurred. SQL definitions and synthetic tests ran only on disposable local PostgreSQL. Existing user changes/deletions were retained.

## 1. Exact validation changes

A new **unapplied** migration adds `public.play_price_validation(numeric)`, the single India paid-price policy: INR **4.00 through 84,000.00 inclusive**, exact two-decimal precision, no rounding. The policy uses the already captured Google India rows for regions versions 2022/02 and 2026/01 in `google-public-india-price-range.json`; the worker's explicit reviewed-version allowlist remains 2022/02. Google's [supported-locations reference](https://support.google.com/googleplay/android-developer/answer/10532353?hl=en) directs operators to that public price table. New versions/range changes require review of both policy and version configuration, never a secret/version change automatically.

The existing `play_notes_product_eligible` helper consumes this policy, covering paid checkout, product/Notes trigger eligibility, claim, Admin retry, stale requeue and verified-tier finalization through their existing callers. Direct `queue_play_price_sync` also refuses unsupported prices before generating any reservation/log. No existing rows are backfilled, repriced, deleted or replayed by the new migration.

The catalog worker calls the same validation RPC before eligibility/OAuth/Google GET/PATCH/activation. Unsupported, malformed or unavailable validation is a terminal configuration failure; it never requests a Google operation and never automatically retries. Existing Google error retry/auth/lease/receipt checks remain in place. `priceCents` and low-level Money serialization still validate syntax only; they are not commercial eligibility checks.

The Admin invoker view returns `unsupported_price` with a policy-generated message, while free products still return `free`. Current product revision remains in every readiness row. The client adds the unsupported label and projects only the numeric price summary from the server; arbitrary provider/error suffixes are discarded. It does not copy the numeric pricing rule into frontend validation. Free/Razorpay product creation remains permitted. Publication alone cannot imply Ready; exact fresh verified mapping and revision equality remain required.

## 2. Files changed

Production source:

- `supabase/migrations/20261124142010_play_india_price_validation.sql` — new additive policy/eligibility/queue/view definitions; no hosted application.
- `supabase/functions/sync-play-catalog/index.ts` — fail-closed policy RPC before Google access.
- `admin-panel/src/services/playBillingSyncService.ts` — unsupported state and safe server-derived summary.
- `admin-panel/src/types/playBilling.ts` — unsupported state type.
- `admin-panel/src/components/ProductTable.tsx` — Unsupported Play price label.

Tests:

- `supabase/tests/play_india_price_validation_checks.sql` — new rollback-only SQL scenarios.
- `supabase/tests/play-catalog-creation-selftest.cjs` — rejected prices, missing policy, supported prices and readback.
- `supabase/tests/play-catalog-worker-selftest.cjs` — new RPC in existing permission/lease parity fixture.
- `supabase/tests/run-all.sh` — register new SQL test.
- `admin-panel/scripts/product-readiness-selftest.cjs` — unsupported state, numeric summary and redaction.

Supporting changes: this report, `minimum-price-plan.md`, `unsupported-product-inventory.md`, replacement `controlled-retry.txt`, change/diagnostic/hosted inventory evidence, focused logs, freeze script and new release archive/manifest/checksum. Historical `REPORT.txt` now points to this follow-up; old request JSON remains historical evidence only. Admin dist was rebuilt locally for the frozen candidate. The machine-readable exact source inventory is `minimum-price-changes.json`.

## 3. Existing unsupported inventory

[Full per-product inventory](unsupported-product-inventory.md) lists all names, exact IDs, prices, publication, order/purchase and entitlement counts. All 11 INR 1/2 products are published and none is Play checkout eligible. Four cost INR 1; seven cost INR 2. There are **26 historical orders, 14 purchases, 14 successful entitlement records**, all purchases linked to Razorpay orders; zero matching isolated-test entitlements. Counts are records, not unique students. No student identities are exposed.

Only BAMS 1st Year Notes and BAMS 2nd Year Notes currently satisfy Notes content/classification eligibility; both are INR 1. The other nine also need content/classification review. A price increase alone will not make them billable. There are two INR 5 Notes products but both scopes have zero Notes, so neither is a suitable existing test product.

The INR 1 failed job retains attempts=3 and SKU `notes_1_00_v_066f5677fba745d696d1504b7600f8f7`; INR 2 retains attempts=2 and SKU `notes_2_00_v_d93112f242a94a9b83d5bb2c31ef11a3`. Both leases/sync times remain null. Zero verified hosted tiers. Final aggregate read reconfirmed these facts and no candidate insertion.

## 4. Focused verification

Observed RED first: SQL asserted “INR 1 became Play eligible”; real-worker fixture returned retry instead of terminal rejection; Admin lacked Unsupported Play price. After implementation:

| Check | Result |
|---|---|
| New disposable SQL pricing suite | PASS: free, INR 1/2/3.99 rejection, 4/5/10/20/4.01/137.25/84000 support, upper-bound/precision/null/NaN rejection, queue/retry/claim/requeue/finish/checkout guards |
| Existing focused SQL suites | PASS: catalog sync, queue fences, failure access, Admin revision/readiness, Play entitlement snapshots, Razorpay snapshot/retry, Play payment guards — 7 suites plus the new suite |
| Concurrent real PostgreSQL sessions | PASS: one shared price job/reservation, no forged tier; one Admin revision winner and stale conflict |
| Real catalog worker with mock Google/DB | PASS: 135 scenarios, including no Google access for rejected prices/missing policy, exact supported prices, readback, idempotency, rotation and lease fences |
| Worker error/auth tests | PASS: 20 permission/retry cases plus persistence, lease and diagnostic checks |
| Deno catalog/receipt/sanitization | PASS: 12 tests; cached-only, no network permission |
| Play order and verification handlers | PASS: readiness/ownership/SKU/BUY/refund/receipt/settlement guards |
| Standalone Play regressions | PASS: 48 focused cases, default-off QA gates preserved |
| Razorpay security and routing | PASS: signature/capture/amount/currency/account binding and existing route gates |
| Admin `npm test` | PASS: readiness, races, revisions, classification and existing registered suites |
| Admin `npm run build` | PASS: TypeScript and Vite production build, local only |
| Catalog worker Deno typecheck | PASS: cached-only/frozen dependencies |

Logs/results are in `minimum-price-tests/`. The reviewer independently reran creation, worker and Admin readiness tests and found no Critical/Important implementation issue. Their test-gap finding was addressed with a valid matching unsupported running lease: finish returns false and leaves job/tier unchanged. That strengthened SQL test passed. Real Google acceptance/device purchases were not tested. The full-project audit/test matrix was not repeated.

## 5. Razorpay preservation

No Razorpay source, configuration, credentials, deployment or gate changed. Baseline hashes show no mobile/Razorpay/Question Papers source changes in this task. The SQL test creates ordinary Razorpay orders at exact INR 1, 2 and 5 and asserts unchanged amount/list-price/provider. The existing snapshot/retry suite verifies original authorized scope and amount even after catalog edits, late captures, duplicate/refund behavior and ownership guards. Routing/security suites pass. No real charge occurred.

## 6. Entitlement preservation and future price migration

No products/orders/purchases/entitlements are updated by the migration. SQL snapshot comparisons and settlement tests confirm price/publication edits do not rewrite existing orders or purchases, and existing providers grant the authorized order snapshot. Existing 14 low-price entitlement records remain present and successful in final hosted inspection. This does not imply a live purchase test.

The exact proposed owner migration plan is in `unsupported-product-inventory.md`: leave all prices unchanged now; first accept the INR 5 test tier; then seek per-ID approval to move the two already eligible year Notes products from INR 1 to INR 5 using current-revision Admin edits. Keep the remaining nine unchanged pending content/classification review and per-ID price decisions. Never delete/retry the old failed jobs. Existing purchases keep their price/scope/access and pending payments keep their order amounts.

A future product-price edit also changes **new Razorpay quotes**, because product pricing is shared. Owner approval must explicitly acknowledge that effect. If Razorpay must remain INR 1/2 for new sales while Play becomes INR 5, a separate provider-pricing design is needed; this task preserves current Razorpay behavior and does not introduce that feature.

## 7. Exact Admin diagnostic instructions

The current public Admin asset `/assets/index-cW8ZpO8D.js` and `s` client export were freshly checked. Sign in at **https://admin.medveda.in**, complete MFA, open browser Developer Tools → Console, and run once:

```js
const {s: medvedaClient} = await import('/assets/index-cW8ZpO8D.js');
const medvedaMatrix = await medvedaClient.functions.invoke(
  'diagnose-play-matrix', {body:{}});
console.log(JSON.stringify({
  data: medvedaMatrix.data, error: medvedaMatrix.error?.message
}, null, 2));
```

Share only the sanitized result. If a later Admin deployment changes the asset/export, stop and report the import error; never inspect/copy session storage or tokens. Do not invoke the completed service-account identity diagnostic or click Retry.

Fresh management-source inspection confirms matrix ACTIVE v4, gateway JWT=true, verified Admin plus unconditional aal2. It runs tokeninfo, legacy list, one-time-product list(pageSize=1) and non-mutating INR 1 conversion. Inspect each operation status/body. The conversion input is historical diagnostic behavior, not an INR 1 retry or permission to provision that price.

**Live list/GET remains pending.** No owner MFA session or usable runtime credential is available here. Management tools inspect source but cannot impersonate an Admin or invoke Google with the hosted token. The existing matrix cannot GET arbitrary SKUs or paginate; extra body fields are ignored. Exact supported [GET](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/get) and [list](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/list) URLs and the access limitation are recorded in `controlled-retry.txt`. An existing authorized runtime read facility or separately approved diagnostic extension/deployment is needed for exact GETs. No extension was deployed or deleted diagnostic restored. Play Console owner inspection is useful but uses a different identity.

## 8. Recommended supported-price catalog test

`controlled-retry.txt` replaces the old INR 1 retry plan. Propose ONE new INR 5 Notes candidate on the existing eligible BAMS 2nd Year scope. The proposed UUID is local only; no product, job or Google SKU was reserved. Owner must approve the candidate insertion and normal catalog visibility, since it must be published for the existing workflow and may appear to Razorpay users too.

After approved creation, inspect its actual price-shared reserved SKU and seek explicit approval naming that SKU for exactly one worker invocation. No retry RPC if already pending. Require global queue isolation, no cron activation, and stop on failure/timeout without a second POST. Mutation inventory includes product/queue/log insertion, claim/lease/attempt, at most one Google PATCH and conditional activation, genuine independent GET readback, then worker-created verified tier/status/log. No direct tier forgery or order/purchase mutations. Later candidate deactivation needs separate approval; retain all records.

Acceptance requires exact package/SKU, one ACTIVE standard `buy`, no rent/multiquantity, IN AVAILABLE, INR units=5/nanos=0, authoritative verified server tier and Ready for the current Admin product revision. Same-price Notes reuse the tier. Other supported prices enter the existing automatic queue; INR 4/5/10/20 are examples, not mandatory fixed tiers. A new supported product requires no per-product manual SKU.

## 9. Remaining HTTP 403 blocker

The historical PATCH response is `403 PERMISSION_DENIED`, “The caller does not have permission”, without diagnostic detail naming the missing cause. The owner-confirmed identity, pricing HTTP 200 and all four grants are accepted; no repeat identity investigation is needed. There has been no new catalog write under the confirmed grants. The INR 4 minimum is an independent commercial constraint and is not established as the cause of that historical permission error. Read/conversion success cannot resolve or disprove the write blocker. Only a separately approved supported-price write and genuine readback can establish current acceptance. Do not grant blanket Cloud Owner/Play Admin or replace credentials speculatively.

## 10. Frozen candidate and deployment requirements

New frozen candidate: `/tmp/medveda-supported-price-release-20261124-r3`.
Durable artifacts: `supported-price-release/release-candidate.tar.gz`, `release-manifest.json`, `release-candidate.sha256`, `verification.json`.

**304 file hashes** match current source, frozen directory and archive. Archive SHA-256:
`49ab36b3ad2c6fc370251dee249d137886efe2a6177a18f3400813506b4ba4cc`.
Previous 297-file candidate archive remains unchanged:
`c4bb909fa9fcb72f1563d48b96d057835bab97d9208cee435098ec7c2c247b87`.
No environment/credential files are packaged. Old candidate/runbook are retained as history; use the new manifest for this combined release.

After owner-approved backup/isolated restore and separate deployment authorization, apply exactly these pending migrations in order:

1. `20261124063324_play_terminal_recovery.sql`
2. `20261124064112_admin_catalog_readiness_and_revisions.sql`
3. `20261124142010_play_india_price_validation.sql`

All three remain unapplied in hosted migration history. Deploy the frozen matching Admin and four named functions: `verify-standalone-play-purchase` (JWT=true), `verify-play-purchase` (JWT=true), `play-payment-worker` (JWT=false, existing private payment secret) and **newly required `sync-play-catalog`** (JWT=false, existing private catalog secret). Preserve schema-before-worker ordering: unavailable policy RPC fails closed. Review deployed dependency hashes/JWT/auth settings after deployment. No additional service credential is needed. Do not deploy unrelated functions or Question Papers/Razorpay changes.

The previous backup/restore runbook still governs confidential recovery exports. Update its old RC path to r3 when preparing a separately approved execution; do not run the old two-migration/three-function release as the complete pricing fix. Preserve prior deployment for rollback; older catalog worker alone does not enforce the new policy, so a rollback must retain SQL queue/eligibility protection and leave catalog invocation inactive. Never compensate by restoring unsafe unconditional Admin edits or deleting historical records.

Recovery/tester server configuration, explicit QA allowlist, track/license tester/India eligibility and all payment/cron activation approvals remain separate prerequisites. Keep four Play schedules and payment gates unchanged now. Catalog cron will eventually need separately approved activation/monitoring for unattended Admin-to-Google synchronization; source support and queue insertion alone do not activate it. With cron held off, eligible new prices queue but cannot automatically reach Google until an approved invocation occurs.

## 11. AAB requirement

**No additional AAB is required for this pricing/Admin/backend fix or for adding future backend-managed Notes products.** Dynamic SKU/price-tier lookup is retained; no hardcoded SKU list is added. The prior separately documented corrected release AAB requirement for earlier mobile fixes remains in force. An older AAB is not thereby certified. No EAS build, native compilation or upload occurred here.

## 12. Exact next owner action

Run the existing read-only matrix above from the signed-in MFA Admin and return only its sanitized output. Then supply the approved encrypted backup/isolated restore destination and review the proposed INR 5 candidate's scope/visibility. Do not authorize INR 1/2 retries, reprice existing products, create Google products, deploy, activate cron/payments or purchase yet. Candidate insertion and the exact-SKU single provisioning attempt require later explicit approvals after prerequisites are complete.

**Production release remains HOLD until backup, deployment, catalog acceptance and device purchase testing are completed.**
