# MedVeda billing fixes and verification — 9 November 2026

## A. Final status

**Local billing source fixes verified. Production and payment-enabled Alpha: NO-GO.**
Nothing was deployed, submitted, charged, enrolled, enabled or changed remotely.
Staging was not accessed, activated, created, migrated or used. Local tests used a
new disposable PostgreSQL 17 cluster on localhost:55439, synthetic records and
mock provider HTTP. They are not payment acceptance evidence.

| Area | Status |
| --- | --- |
| Billing source | Confirmed defects listed below fixed locally; billing regressions, mobile types/lint, Edge checks and Android JS export pass. |
| Razorpay WebView | Existing implementation retained and locally verified, including response validation, callbacks, failures and recovery. Native WebView/UPI/bank handoffs remain **NOT VERIFIED**. |
| Google Play | Existing expo-iap integration retained; launch serialization, timeout and committed-entitlement recovery fixed. Real products, native dependency resolution and licensed purchases remain **NOT VERIFIED**. |
| Settlement | Row/advisory locks, immutable snapshots and existing financial constraints retained. Success now requires a matching committed payment and purchase. Replay and independent-session concurrency pass. |
| Reporting | Durable authorization/capture recovery, safe refund retries, persistence checks and concurrent-result protection implemented. Hosted scheduler/API operation remains **NOT VERIFIED**. |
| Production | Disabled release guards unchanged. No production approval or hosted parity claim. |
| Alpha | Source is ready for the next owner-controlled preparation stage; the current payment-enabled validation profile remains blocked by external prerequisites. No new APK/AAB built. |

Read `mobile-app/AGENTS.md`, its required Expo SDK 57 documentation, retained
complete/security/Play audits, the November Razorpay handoff and the November 8
Notes choice/startup handoffs. Reviewed current source and existing Git changes.
The starting tree already contained extensive uncommitted work. The file inventory
below is this task's delta against a saved starting hash manifest, including edits
to files that were already untracked. Earlier dated reports were not overwritten.

## B. Resolved issue checklist

All rows below are **fixed locally**. Deployment remains separate.

| ID | Severity | Root cause | Exact fix | Files | Test evidence |
| --- | --- | --- | --- | --- | --- |
| B01 | High | A void settlement return or paid accounting row did not independently prove a committed Notes purchase. | Add service-only Razorpay/Play fulfillment predicates matching owner, product, amount, payment identity and entitlement snapshot; check after settlement. Pending/missing proof cannot return success or consume Play receipts. | `supabase/migrations/20261109100000_billing_settlement_recovery.sql`, `supabase/functions/_shared/settle.ts`, `supabase/functions/verify-play-purchase/index.ts` | `billing-settlement-recovery.sql`, `settle-timestamp-selftest.cjs`, `play-verification-selftest.cjs`. |
| B02 | High | A recorded capture could survive a crash without any durable settlement sweep; authorization events were not recovered by the events worker. | Queue capture-only targets and captured/authorized inbox events through the existing leased events schedule; re-fetch provider facts and retry settlement/reporting. Authorization-only failed reports remain discoverable before capture. | New migration; `supabase/functions/report-external-transaction/index.ts` | New SQL and `billing-recovery-worker-selftest.cjs`; existing queue, webhook and concurrency suites. |
| B03 | High | Busy/ordered refund claims returned skipped; the worker treated skips as completed jobs. | A busy/unavailable refund throws for retry; an already reported refund returns confirmed completion. Workers require explicit reported results and reject lost leases. | `supabase/functions/_shared/externalReporting.ts`, `supabase/functions/report-external-transaction/index.ts` | `google-reporting-selftest.cjs`, `billing-recovery-worker-selftest.cjs`. |
| B04 | High | Compensation capture updates and legacy full-refund report updates ignored database errors. | Check persistence before returning completion; failed writes retain retryable jobs and the stable provider refund identity. | Same reporting files | New worker regression and `compensation-worker-selftest.cjs`; Google success/database-failure/retry regression. |
| B05 | High | A slower failed reporting attempt could overwrite a concurrent reported result. | Conditional failed-state writes preserve reported original/refund outcomes; reconcile stable external IDs before retrying. | `supabase/functions/_shared/externalReporting.ts` | Reporting regression explicitly simulates a concurrent successful report and failed persistence. |
| B06 | High | A second capture for one order could replace its primary payment identity or be mistaken for the existing entitlement. | Serialize by user/order; queue the additional capture for compensation without replacing the original payment, purchase, amount or wallet debit. | New migration | SQL proves original fulfillment stays valid, extra payment cannot prove fulfillment and compensation is queued once. |
| B07 | High | Raw refund/dispute event existence was treated as a permanent reversal, including partial refunds and disputes later won. Replays could mark valid orders refunded. | Persist provider-validated blocking facts. Hold uncertain/open disputes without a grant or irreversible refund; link the verified capture for inbox recovery. Full refunds/lost disputes reverse; won disputes clear holds; verified partial refunds preserve valid access. Granted replays preserve their purchase state. | New migration; `supabase/functions/_shared/settle.ts` | 25 real-handler/local-SQL webhook checks, including early partial refund, early full refund, open→won dispute, refund/GET interleaving and replay. |
| B08 | High | Refund entitlement/accounting mutation preceded refund-object validation for ordinary Razorpay orders. | Fetch and bind the processed refund's payment, amount, currency and time before any refund mutation, then persist its authoritative blocking fact. | `supabase/functions/_shared/settle.ts` | Existing actual-handler refund/dispute tests and SQL reversal suites. |
| B09 | High | WebView messages lacked an origin/checkout capability check and callback shape/order validation. | Require local-page origin, per-checkout 128-bit nonce, object shape, matching order and well-formed payment/signature. Server HMAC/provider verification remains mandatory. Validate checkout route values and fixed verification endpoint before opening. | `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx`, `mobile-app/src/screens/payment/checkoutHtmlTemplate.ts` | `checkout-security-selftest.cjs`, actual-HMAC backend tests and updated verdict/internal-routing fixtures. |
| B10 | Medium | Late asynchronous completions could navigate after checkout/summary unmount; renderer failure could leave a dead checkout. | Ignore settled/unmounted work, memoize the HTML/source across state renders and send unconfirmed renderer/load failures into the existing pending recovery screen. Handle popup/navigation through the existing allowlist; disable file access and mixed content. | Checkout and summary screens | Checkout security/verdict, summary and pending-poll fixtures. No layout or Buy Now route redesign. |
| B11 | Medium | Two native Play launches could race before initialization/storage completed; launch waits could hang; malformed saved choices could poison recovery. | Serialize before asynchronous work, reject an unresolved duplicate launch, bind launch to the current account, bound the native wait while retaining ambiguous attempts, and discard malformed saved JSON safely. | `mobile-app/src/services/playBillingService.ts` | Native fixture tests cover concurrent/duplicate launches, both choice modes, saved choices, pending receipts and cancellation. |
| B12 | High | Paid Play rechecks trusted order status alone, including possible duplicate/missing purchases. A create response could outlive its initiating account. | Add authenticated owner-bound `get_my_play_fulfillment`; use its committed proof for paid rechecks. Recheck the signed-in account after Razorpay order creation. | New migration; both mobile billing services | SQL tests deny missing/foreign fulfillment; existing account-switch, restore, request and Notes entitlement fixtures. |
| B13 | Medium | Token attachment accepted null expiry; the 4096-character API contract exceeded PostgreSQL's direct btree token key limit; cross-account unique races surfaced as generic failures. | Deny missing/expired choices and missing SKU; retain owner/product binding; replace direct token index with fixed-width SHA-256 uniqueness before dropping the old index; return conflict on token reuse and unique races. | New migration; `supabase/functions/attach-external-token/index.ts` | Real SQL tests attach an incompressible 3840-character token, reject reuse/null expiry and verify service-only grants. Existing choice concurrency tests pass. |
| B14 | Medium | Null/array callback/attachment/sweep/webhook bodies could crash before a defined error response; synthetic capture job names could collide with arbitrary webhook IDs. | Validate object shape and reject the reserved capture namespace/oversized event IDs. | `supabase/functions/verify-payment/index.ts`, `supabase/functions/attach-external-token/index.ts`, `supabase/functions/report-external-transaction/index.ts`, `supabase/functions/razorpay-webhook/index.ts` | Body, security, worker and webhook regressions; Edge checks. |
| B15 | High | Reporting did not persist Google's test-purchase classification; a delayed authorized webhook for an already refunded payment could never reconcile. | Validate Google's output-only test marker against the explicit server environment and persist it with reported status. Accept provider-confirmed refunded payments when recovering their original authorization report. No test marker/token is fabricated. | `supabase/functions/_shared/externalReporting.ts`, `supabase/functions/_shared/googlePlay.ts`, `supabase/functions/_shared/notesChoiceAuthorization.ts`, new migration | Test/live result mismatch and marker persistence regressions; refunded authorization replay fixture. |
| B16 | High | An ambiguous Notes provider CREATE permanently required manual attachment despite a supported receipt lookup. Fresh provider responses/conditional attachment were incompletely confirmed. | Retry by read-only exact receipt lookup; verify provider amount/currency/status and all immutable owner/product/order/choice notes. Confirm canonical DB attachment. Empty, conflicting, truncated or mismatched results stay pending; never repeat CREATE for that choice. | `supabase/functions/_shared/notesChoiceOrder.ts`, `supabase/functions/_shared/razorpay.ts` | Updated choice handler fixtures and new real-helper `razorpay-order-recovery-selftest.ts`: lost response recovers one order; duplicates/truncation/mismatch are refused. |
| B17 | Medium | Provider error response bodies could flow into settlement/worker logs. | Omit raw Razorpay error bodies; retain operation/status. Remove raw SQL settlement/refund/dispute messages and persist fixed reporting failure labels. | Razorpay, settlement and external reporting helpers | Synthetic sensitive-provider-body rejection test and changed-file secret scan. |
| B18 | Medium | The deployment helper omitted the prepared Notes choice function; new regressions were not wired into routine checks. | Include `create-order-play-choice` in the existing guarded helper; wire focused checkout and backend/SQL regressions into CI/runners. Only the helper's dry-run mode was executed. | `scripts/ucb-deploy.sh`, `.github/workflows/ci.yml`, `supabase/tests/run-all.sh` | Shell syntax, dry-run inspection and complete local runner. |
| B19 | High | The standard website order handler retained an optional UCB-body path without the dedicated route's enrolment gates. | Apply the same fail-closed eligibility check before legacy choice lookups/writes; reject malformed bodies. Ordinary website requests and the native header guard retain their existing behavior. | `supabase/functions/_shared/createOrderHandler.ts`, `supabase/tests/razorpay-routing-selftest.cjs` | Actual handler fixture proves optional legacy UCB cannot create an order while gated; ordinary website and non-Play routing regressions remain passing. |

The existing user ownership checks, service-only financial writes, HMAC checks,
RLS, fixed INR pricing, wallet reservations/caps and immutable order snapshots
remain. Client callbacks never insert purchases or grant Notes.

## C. Incomplete or blocked items

| Category | Remaining item |
| --- | --- |
| Fixed locally | All confirmed defects in B01–B19. No known unresolved locally actionable billing defect remains from this review. |
| Requires deployment | Reviewed migration chain and matched Edge/mobile source; live schema/function drift must be reconciled first. Missing hosted migrations/functions are deployment prerequisites, not proof that this local source is running. |
| Requires Play Console products | Owner-approved real Notes products, INR BUY offers/mappings, license testers and API authorization. No identifiers or prices were manufactured. |
| Requires authorized device testing | Exact native build, BillingClient connection/reconnection, Play choice, pending/restore/consume, Razorpay WebView origin/navigation, UPI/bank handoffs, process death and real authorized Notes bytes. ADB lists no devices. |
| Requires production credentials/operational evidence | Correct merchant mode/capture/webhook delivery; Google Publisher access; cron/Vault/alert configuration and successful scheduled runs. None was probed with real transactions. |
| Requires owner approval | Authoritative pricing and any catalog changes; reviewed rollout/deployment; refund operations and acceptance evidence. |
| Owner-managed exclusions | Programme eligibility/enrolment and staging availability/configuration remain unchanged. This work includes no enrolment procedure or staging activation/deployment step. Existing enrolment-dependent routes remain disabled. |

An opaque external token has no local cryptographic verification endpoint in the
retained integration. Attachment validates shape, ownership, expiry and global
reuse; the genuine native listener supplies it, and Google validates it during
reporting. Local fixtures are not proof of a valid Google token. The owner must
use actual license testers; Google's test marker is output-only. The code checks
that marker after Google's response, so it cannot preclassify a non-license token
before that first API call. Correct tester allowlisting remains an external prerequisite.

## Pricing and preservation

The user's intended Chapter/Subject/Year/Bundle amounts are **₹49/₹149/₹499/₹599**.
They are not treated as approval to rewrite the catalog. The retained reports
mention lower production amounts; the exact current remote amounts and Play
catalog were **not independently re-read in this task**.

Runtime authority remains `products.price` → server quote/priced order and stored
discount/wallet/tax snapshot → provider amount → settlement payment/purchase amount.
Play uses the server-created order and verified tier/BUY offer mapping, with the
native offer price matched before launch. Local scope, rounding, negative/underfunded
amount, wallet/referral concurrency and changed-price confirmation suites pass.
No pricing function, percentage, referral balance rule, wallet cap or catalog row
was changed. **The discrepancy requires an owner-approved price matrix and actual
catalog reconciliation before payment activation.**

Starting hashes prove that startup/splash/onboarding/authentication, free-video
and MCQ screens, Notes/PDF content and entitlement readers, website checkout,
package manifests/lockfiles, Expo configuration and release payment guards were
not changed by this task. Existing unrelated uncommitted work remains. The new
migration was applied twice to a populated synthetic baseline with identical
purchase/payment/order/product/wallet/referral fingerprints afterward.

## D. Exact files changed

See the generated inventory immediately below. Paths are relative to the
repository root; Modified means changed against this task's starting tree,
including pre-existing untracked source. No file was removed.

- **Modified** `.github/workflows/ci.yml`
- **Modified** `mobile-app/scripts/notes-billing-choice-selftest.cjs`
- **Modified** `mobile-app/scripts/payment-verdict-selftest.cjs`
- **Modified** `mobile-app/scripts/razorpay-internal-test-selftest.cjs`
- **Modified** `mobile-app/src/screens/payment/OrderSummaryScreen.tsx`
- **Modified** `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx`
- **Modified** `mobile-app/src/screens/payment/checkoutHtmlTemplate.ts`
- **Modified** `mobile-app/src/services/paymentService.ts`
- **Modified** `mobile-app/src/services/playBillingService.ts`
- **Modified** `scripts/ucb-deploy.sh`
- **Modified** `supabase/functions/_shared/createOrderHandler.ts`
- **Modified** `supabase/functions/_shared/externalReporting.ts`
- **Modified** `supabase/functions/_shared/googlePlay.ts`
- **Modified** `supabase/functions/_shared/notesChoiceAuthorization.ts`
- **Modified** `supabase/functions/_shared/notesChoiceOrder.ts`
- **Modified** `supabase/functions/_shared/razorpay.ts`
- **Modified** `supabase/functions/_shared/settle.ts`
- **Modified** `supabase/functions/attach-external-token/index.ts`
- **Modified** `supabase/functions/razorpay-webhook/index.ts`
- **Modified** `supabase/functions/report-external-transaction/index.ts`
- **Modified** `supabase/functions/verify-payment/index.ts`
- **Modified** `supabase/functions/verify-play-purchase/index.ts`
- **Modified** `supabase/tests/compensation-worker-selftest.cjs`
- **Modified** `supabase/tests/google-reporting-selftest.cjs`
- **Modified** `supabase/tests/notes-choice-order-selftest.cjs`
- **Modified** `supabase/tests/play-consumption-selftest.cjs`
- **Modified** `supabase/tests/play-reconcile-fairness-selftest.cjs`
- **Modified** `supabase/tests/play-verification-selftest.cjs`
- **Modified** `supabase/tests/razorpay-routing-selftest.cjs`
- **Modified** `supabase/tests/razorpay-security-selftest.cjs`
- **Modified** `supabase/tests/run-all.sh`
- **Modified** `supabase/tests/settle-timestamp-selftest.cjs`
- **Modified** `supabase/tests/webhook-harness/run.mjs`
- **Added** `docs/audit/MEDVEDA_BILLING_FIXES_2026-11-09.md`
- **Added** `docs/audit/evidence/billing-fixes-20261109/android-export.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/android-release.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/billing-recovery-worker.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/changed-files.json`
- **Added** `docs/audit/evidence/billing-fixes-20261109/checkout-html.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/checkout-security.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/checks.json`
- **Added** `docs/audit/evidence/billing-fixes-20261109/database-baseline.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/database-final.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/device.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/edge-types.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/local-suites.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/mobile-lint.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/mobile-types.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/navigation-lazy.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/notes-billing-choice.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/notes-choice-order.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/notes-entitlement.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/notes-open.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/offline-download.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/offline-owner.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/payment-poll.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/payment-provider.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/payment-request.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/payment-routing.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/payment-summary.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/payment-verdict.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/play-body.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/preservation.json`
- **Added** `docs/audit/evidence/billing-fixes-20261109/purchases-unavailable-ui.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/purchases.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/quiz-editing.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/quiz-hooks.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/razorpay-internal-test.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/razorpay-security.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/receipt-reconciliation.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/release-payments-disabled.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/reporting.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/repository-lint.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/route-validation.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/routing.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/same-project-build.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/secret-scan.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/secret-scanner-selftest.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/source-manifest.json`
- **Added** `docs/audit/evidence/billing-fixes-20261109/staging-build.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/startup-availability.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/upgrade.json`
- **Added** `docs/audit/evidence/billing-fixes-20261109/upgrade.log`
- **Added** `docs/audit/evidence/billing-fixes-20261109/validation.json`
- **Added** `mobile-app/scripts/checkout-security-selftest.cjs`
- **Added** `supabase/migrations/20261109100000_billing_settlement_recovery.sql`
- **Added** `supabase/tests/billing-recovery-worker-selftest.cjs`
- **Added** `supabase/tests/billing-settlement-recovery.sql`
- **Added** `supabase/tests/razorpay-order-recovery-selftest.ts`

## E. Tests and evidence

Evidence directory: [billing-fixes-20261109](evidence/billing-fixes-20261109/).

| Result | Check / scope |
| --- | --- |
| PASS | Fresh PostgreSQL 17: every migration, all existing SQL suites and focused settlement/token/fulfillment tests; final runner ends `ALL SUITES PASSED`. |
| PASS | Independent-session wallet, discount, replacement-order, Notes choice and duplicate settlement concurrency tests. |
| PASS | 25 actual webhook-handler checks backed by local SQL; HTTP/Auth/provider responses are mocked. |
| PASS | 28 mobile/backend standalone suites, including checkout, choice, pending polling, request deadlines, disabled/profile guards, legacy Notes/owned access, navigation, free-feature regression and Android release configuration fixtures. Individual cases and commands are in `checks.json`/`local-suites.log`. |
| PASS | Real receipt-lookup helper with mocked HTTP; exact receipt, no second CREATE, malformed/conflicting/truncated result denial and provider-error redaction. |
| PASS | Google report retry, duplicate/partial refund, busy claim, database persistence failure, test marker and concurrent reported-result protection fixtures. |
| PASS | Mobile TypeScript; ESLint across `mobile-app/App.tsx` and `mobile-app/src`; frozen-lock Deno checks for 11 billing/order/catalog Edge entrypoints. |
| PASS | Android Hermes JS export with purchases disabled. This is not a native build or a signed/released artifact. |
| PASS | Forward upgrade applied twice on populated synthetic data; no financial, product-price or entitlement row changes; focused SQL regressions pass afterward. |
| PASS | Changed-file secret scan, scanner self-test, shell syntax and Git whitespace checks. |
| FAIL, unrelated | Repository-wide ESLint: pre-existing duplicate imports in `admin-panel/src/components/RouteErrorBoundary.tsx:2` and `admin-panel/src/hooks/useDashboard.ts:5`. Their starting/current hashes match. Left untouched. Mobile/billing lint passes. |
| NOT VERIFIED | Native Android compilation/resolved Billing Library in a current APK/AAB; real-device UPI/WebView behavior; genuine Razorpay/Play payment; hosted unlock/PDF bytes; deployed RLS/migration parity; real Google reporting/refund/void/catalog jobs and credentials. |
| Excluded | Staging execution and owner-managed enrolment. No production test was substituted. |

Intermediate failed attempts (the local fixture role, a non-immutable index
expression and outdated fixture contracts) were corrected and superseded by the
final passing runs. They are not represented as final billing failures.

## F. Production preparation — instructions only, not executed

1. Keep production/internal purchase provider and enrolment-dependent enable
   flags disabled. Owner reviews the pricing discrepancy, source inventory and
   new migration hash. Confirm an actual restorable backup, migration provenance,
   existing definitions/grants and historical incomplete snapshot/compensation
   cases. Do not guess or rewrite existing entitlement ownership.
2. Reconcile the billing prerequisites in migration order. The retained
   `20261104100000_razorpay_snapshot_discount_retry.sql` and
   `20261108100000_notes_choice_checkout.sql` must be present before
   `20261109100000_billing_settlement_recovery.sql`. Older capture-inbox,
   wallet-reservation, Play snapshot and payment-job migrations are prerequisites.
   Do not blanket-push unrelated pending migrations or edit migration history.
3. Through the owner's reviewed migration pipeline, apply only the approved
   missing billing files. Each file includes its own transaction. An equivalent
   single-artifact command for an already reviewed connection service is:

   ```sh
   PGOPTIONS='-c lock_timeout=5s -c statement_timeout=60s' \
     psql 'service=OWNER_REVIEWED_BILLING_TARGET' -X -v ON_ERROR_STOP=1 \
     -f supabase/migrations/20261109100000_billing_settlement_recovery.sql
   ```

   Record the correct migration ledger entry through the normal pipeline. Check
   the two added nullable columns, replacement token index, six RPC definitions,
   service-only proof/settlement grants and caller-only Play fulfillment. Compare
   historical financial/entitlement fingerprints. Never grant from a client or
   turn a pending/refund case into a synthetic successful purchase.
4. Deploy the matched reviewed bundles only after schema verification. The
   billing helper now lists the choice route. These are future commands; the
   project ref must be independently reviewed, not inferred from a local link:

   ```sh
   supabase functions deploy create-order --project-ref "$REVIEWED_PROJECT_REF"
   supabase functions deploy create-order-play-choice --project-ref "$REVIEWED_PROJECT_REF"
   supabase functions deploy create-play-order --project-ref "$REVIEWED_PROJECT_REF"
   supabase functions deploy verify-play-purchase --project-ref "$REVIEWED_PROJECT_REF"
   supabase functions deploy attach-external-token --project-ref "$REVIEWED_PROJECT_REF"
   supabase functions deploy report-external-transaction --project-ref "$REVIEWED_PROJECT_REF" --no-verify-jwt
   supabase functions deploy razorpay-webhook --project-ref "$REVIEWED_PROJECT_REF" --no-verify-jwt
   supabase functions deploy verify-payment --project-ref "$REVIEWED_PROJECT_REF" --no-verify-jwt
   ```

   Retain signed webhook authentication, signed callbacks/authenticated recovery
   and cron-secret authentication for the three no-gateway-JWT functions. Existing
   Play payment/catalog workers need matching reviewed source and configuration
   if deployed versions differ; neither was activated here. The non-Play test
   endpoint is not part of a production activation procedure.
5. Owner verifies `APP_ENV=production`, matching live Razorpay key/secret and
   current/previous webhook secrets, automatic capture, and required webhook
   events: authorized/captured, refund.processed and dispute lifecycle. Verify
   `GOOGLE_PLAY_PACKAGE_NAME=in.medveda.app`, server-only Publisher credentials,
   actual verified INR product/BUY mappings, `UCB_REPORT_CRON_SECRET`,
   `PLAY_PAYMENT_CRON_SECRET`, `PLAY_CATALOG_CRON_SECRET` and alert configuration.
   Supabase service credentials remain server-only. No secret values belong in
   Expo or the repository. Do not flip eligibility/test-acceptance flags based on
   the existence of an Alpha track or local fixture results.
6. Future scheduling artifacts are `supabase/ucb_cron_setup.sql`,
   `supabase/play_payment_cron_setup.sql` and
   `supabase/play_catalog_cron_setup.sql`. Owner provisions the named Vault secrets
   and independently authorizes scheduling; **no jobs were activated here**.
   Existing `ucb-events` also drains capture/authorization recovery; no new phase
   is required. Inspect completed runs, oldest deadline, leases/parked jobs,
   report/refund rows, Play consumption/void cursor and catalog read-back. A
   skipped helper result or an HTTP response alone is not successful reporting.
7. Only after the excluded owner-managed prerequisites and authorized isolated
   test setup are satisfied, build the approved native test artifact and perform
   genuine license/test-mode device acceptance. Preserve Google-managed choice,
   existing Buy Now navigation and Razorpay WebView. Do not use production as a
   substitute for missing staging/test infrastructure. Native dependency changes
   already present before this task require a new native build; an old AAB or JS
   export does not establish compatibility. No build/upload/submit command was
   run here. Payment activation needs a separate owner go/no-go decision.

Rollback preparation: keep new sales disabled, retain capture/reversal/reporting
recovery, prefer a corrective forward migration and use backed-up function
versions/ACLs if rollback is approved. Do not erase captures, purchases, wallet
entries or migration history. The added columns and fixed-width index are
compatible with historical rows; reverting to the known false-fulfillment or
reversal bugs is not an acceptable data repair strategy.

## G. Remaining risks

- Hosted schema/code/configuration and scheduler parity are unverified. Applying
  Edge source without its RPC/column migration deliberately fails closed.
- Receipt lookup can remain empty or conflicting after an ambiguous provider
  outcome. It remains pending without another CREATE. Owner/provider review is
  required if it never becomes uniquely reconcilable; absence is not proof that
  a previous HTTP request never ran.
- Existing historical incomplete/mismatched snapshots are not rewritten. They
  require private owner case review; existing valid entitlement rows/readers are
  preserved. Missing fulfillment proof is never advertised as successful access.
- Open/unknown disputes hold entitlement. Closed disputes retain the existing
  manual-decision behavior. Parked jobs/deadline alerts need an operator; retries
  do not authorize unlimited silent failure.
- Real BillingClient, native callbacks, UPI app switches/bank domains, release
  shrinking and process-death behavior require device/native-artifact evidence.
- Current polling/void/catalog/reporting jobs need verified real operation. RTDN
  remains outside the retained polling architecture. The previously reported
  Google catalog permission/403 incident has not been resolved by local mocks.
- Price approval, real products/credentials, eligibility and authorized testing
  remain external release gates. No successful real purchase is claimed.

## H. Final verdict

1. **All locally fixable billing defects resolved?** Yes for the confirmed B01–B19
   findings in this reviewed source; external acceptance and the unrelated admin
   lint errors remain explicitly open.
2. **Settlement idempotent?** Yes in local SQL, replay and independent-session
   concurrency tests, including wallet debits and compensation identities.
3. **Correct Notes unlocked once?** A verified capture plus successful committed
   settlement creates the correct snapshot-bound purchase once in local tests.
   Failed/cancelled/pending/uncommitted payments do not grant. Real hosted unlock
   remains NOT VERIFIED.
4. **Razorpay Android checkout locally ready?** Yes at source/fixture/export level;
   native WebView and UPI compatibility remain NOT VERIFIED.
5. **Reporting retries safe?** Implemented and locally tested; real scheduling,
   credentials and Google/Razorpay acceptance remain NOT VERIFIED.
6. **Prices/features preserved?** Yes. No catalog/price/discount/wallet-cap change,
   navigation redesign or unrelated product behavior change. Pricing discrepancy
   still needs owner approval.
7. **Unrelated files changed?** No task-introduced unrelated changes; starting
   uncommitted work preserved.
8. **Anything deployed?** No. No remote writes, purchase activation, native release
   build, Play submission or job activation.
9. **Alpha ready for authorized testing?** Source is locally prepared; the current
   payment-enabled Alpha setup is **not ready to execute** until owner-managed
   prerequisites, products, credentials and a device are available. Guards stay.
10. **Single next owner action:** Confirm and approve the authoritative Notes price
    matrix by reconciling the actual catalog with ₹49/₹149/₹499/₹599 before
    deployment/activation planning. This task grants no authority to change it.

Official contracts consulted: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[Google-managed user choice](https://developer.android.com/google/play/billing/alternative/alternative-billing-with-user-choice-in-app),
[Google backend reporting](https://developer.android.com/google/play/billing/outside-gpb-backend),
[external transaction resource and output-only test marker](https://developers.google.com/android-publisher/api-ref/rest/v3/externaltransactions),
and [Razorpay's receipt-search contract](https://github.com/razorpay/markdown-docs/blob/master/api/orders/fetch-all.md).
These contracts do not establish the owner's eligibility, valid token, deployed
configuration or real transaction acceptance.
