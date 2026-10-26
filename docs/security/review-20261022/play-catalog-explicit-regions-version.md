# MedVeda: remove the catalog price-conversion dependency

Date: 2026-10-22 UTC. Package: `in.medveda.app`.
Local feature branch: `fix/play-catalog-supported-regions`.

Verdict: locally validated and suitable for a separately authorized staging evaluation. **Not production ready; billing is not declared resolved.** No deployment, hosted migration, production data change, cron activation or real purchase was performed. Existing worktree changes were preserved; the files below describe this task's incremental changes.

## Version source and the approved requirement correction

The requested supported-regions listing API could not be found in the current Android Publisher v3 REST reference or Google's discovery schema (revision `20260924`). The monetization resource lists `convertRegionPrices`, without a supported-regions listing method. Do not implement a guessed `/supportedRegions` endpoint.

After this finding, the user explicitly approved: “Use an explicitly configured, documented version; fail closed if missing or rejected.” That replaces the original requirement to fetch a version from a supported-regions API.

**API endpoint used to obtain regionsVersion: none.** Creation now reads `PLAY_CATALOG_REGIONS_VERSION` from the server environment. There is no default, automatic version selection, conversion fallback, scraping, cached conversion result or guessed version.

The allowlist currently contains only `2022/02`, which Google's historical discovery description explicitly documented. Current documentation describes version compatibility but does not promise that this particular value is accepted for this app today. It is a historical documented candidate, not a live-verified current version. The Google-supported-locations portal and actual staging response must be checked before rollout. Adding another version requires code review of the IN/INR mapping and tests; changing the environment alone cannot introduce an unreviewed version.

Primary references checked:

- [Current monetization methods](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization).
- [Current Google discovery schema](https://raw.githubusercontent.com/googleapis/google-api-go-client/main/androidpublisher/v3/androidpublisher-api.json).
- [RegionsVersion contract](https://developers.google.com/android-publisher/api-ref/rest/v3/RegionsVersion): explicitly supplied version, with compatibility for older supported configurations.
- [Google discovery history documenting 2022/02](https://chromium.googlesource.com/external/github.com/google/google-api-go-client/+/0386e0fba6d3ca3073953a1a8a95f658bc223d09/androidpublisher/v3/androidpublisher-api.json).
- [Supported locations help](https://support.google.com/googleplay/android-developer/answer/10532353), which links to the [supported-locations portal](https://play.google.com/supported-locations?hl=en). The portal is rendered dynamically; its live table was not extracted during this review.

## Files changed by this task

| File | Change |
| --- | --- |
| `supabase/functions/_shared/playCatalog.ts` | Remove conversion from creation; require explicit reviewed version; validate creation and activation bodies; tighten Money, identity and BUY checks. |
| `supabase/functions/sync-play-catalog/index.ts` | Pass the expected SKU into draft validation and expected price into activation validation; classify local configuration errors as terminal. |
| `supabase/functions/.env.example` | Document the new variable, leaving its example value empty. No actual `.env` file changed. |
| `supabase/tests/play_catalog_unit_test.ts` | Reject malformed Money, wrong identity, mixed BUY/rental options, duplicate India entries and invalid states. |
| `supabase/tests/play_catalog_api_test.ts` | Assert no conversion request; exact INR Money serialization; API authorization/error classification; reject incomplete/malformed success bodies. |
| `supabase/tests/play-catalog-creation-selftest.cjs` | New real worker + catalog + Google wrapper integration harness with mocked network/database, 122 scenarios. |
| `supabase/tests/play_catalog_failure_access_checks.sql` | New local SQL assertions that provisioning failures and readiness do not create purchases or grant paid notes access. |
| `supabase/tests/run-all.sh` | Include the catalog Deno tests, new worker integration harness and failure/access SQL suite. |
| `docs/security/review-20261022/play-catalog-explicit-regions-version.md` | This report and staging checklist. |
| `docs/security/review-20261022/evidence/local-test-suite.log` | Successful complete local runner output. |
| `docs/security/review-20261022/evidence/catalog-tests.log` | Focused catalog test output. |

`_shared/googlePlay.ts`, the Admin price-management implementation, SQL migrations, payment verification, settlement, entitlement code and cron configuration were not modified by this task. Some already had unrelated changes when work started; those were retained.

## API compatibility and resulting behavior

The implementation retains the current One-Time Products API rather than using legacy `inappproducts`:

1. `GET /androidpublisher/v3/applications/in.medveda.app/oneTimeProducts/{sku}` reads the existing product. Only HTTP 404 means missing; malformed success bodies and identity mismatches throw.
2. For a missing product, `PATCH /androidpublisher/v3/applications/in.medveda.app/onetimeproducts/{sku}?allowMissing=true&updateMask=listings,purchaseOptions&regionsVersion.version=2022%2F02` submits the explicitly configured version. Missing or unreviewed configuration stops before this write.
3. The request contains exactly the configured INR amount as Money, one `IN` regional config with `AVAILABLE`, and a BUY option retaining `legacyCompatible: true` and `multiQuantityEnabled: false`. It supplies no foreign currencies or future-region pricing. Only the existing title/description and purchase options are sent; output-only state/version fields are omitted.
4. Creation requires a correctly identified product with the exact price/India/BUY configuration and the requested output version. The existing GET read-back after creation remains mandatory.
5. A matching DRAFT option can be activated through `POST /androidpublisher/v3/applications/in.medveda.app/oneTimeProducts/{sku}/purchaseOptions:batchUpdateStates`. The response must contain one correctly identified ACTIVE BUY product with the exact INR price and India availability. The independent GET read-back after activation remains mandatory.
6. Only a matching, ACTIVE, single BUY option with exactly one AVAILABLE India entry at the configured INR amount can reach `finish_play_price_sync`. Rental union conflicts, multiple purchase options, duplicate India entries, malformed monetary values and incorrect prices fail verification.

Google JSON may omit default-valued protobuf fields, such as zero nanos or false multi-quantity; these remain supported. Additive fields unrelated to the readiness decision are tolerated. Decimal Money values must have integer nanos within range and exact paise precision; numeric units, negative/overflowing nanos and unsafe units are rejected.

Existing matching ACTIVE or DRAFT products can be recovered without the new version setting, because they do not require creation. This preserves replay recovery if Google accepted a write before a transient failure. Existing mismatched known tiers still rotate to a new versioned SKU; unknown collisions remain terminal. No existing Google product is intentionally repriced.

Contracts checked: [PATCH](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/patch), [GET](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts/get), [purchase options and regional configuration](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts), [activation](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts.purchaseOptions/batchUpdateStates).

## Database review and security findings

Reviewed the complete current catalog worker/helper, Admin product-price save/status/retry path, and the relevant migration chain: the original Play tiers, catalog synchronization, queue fences, order entitlement snapshots, current settlement function and current paid-note access function. No database function needed modification.

The reviewed functions include `play_notes_product_eligible`, `play_price_has_eligible_product`, `queue_play_price_sync`, product/note queue triggers, `retry_play_price_sync`, `claim_play_price_sync`, `requeue_stale_play_price_sync`, `rotate_play_price_sku`, `finish_play_price_sync`, `fail_play_price_sync`, `create_play_order`, order price/BUY-option immutability triggers, `settle_play_purchase`, `play_purchase_entitlement_from_order` and `user_can_access_note`. Also reviewed the create-order, purchase-verification and signed-note-URL handlers.

- Product price storage and Admin edits remain the source of truth. No price, scope, SKU-generation SQL, historical order snapshot or existing entitlement changed.
- The worker still checks its dedicated cron secret before database/provider work. Catalog RPCs remain service-only; Admin retry retains its existing authorization gate.
- SKU reuse/rotation, queue eligibility, claim leases, finish fences, backoff, stale rechecks and failure persistence are preserved. The new configuration error is terminal and uses the existing failed-state transition, requiring correction and an authorized manual retry.
- Google 400 (including rejected/stale/unsupported versions), 401 and 403 stay terminal. Network failures, 409, 429 and 5xx keep their current retry classification. There is no alternate version retry or permission bypass. A 404 read-back after a write never means ready. Invalid success responses use the existing bounded queue retry policy (failure after the attempt limit).
- Missing configuration cannot mark a newly created tier ready. API failures, invalid responses and expired leases cannot reach successful completion. An activation can succeed externally while local recording fails; the next attempt reads the same SKU and safely resumes.
- Catalog synchronization writes no order, payment or purchase. SQL tests prove both failed/retrying jobs and a newly ready tier leave an unentitled synthetic user without paid notes access. Existing valid paid purchases retain their normal access/recovery path.
- Payment verification still binds the Google receipt to the user, order, SKU, BUY option, India, purchase state and refund state before settlement. Catalog readiness does not substitute for receipt verification.
- Logs retain the existing sanitized error metadata; no new credential, purchase-token or free-form provider-message logging was added.

This is a local implementation review, not an independent external security audit.

## Local validation

Environment: Node `22.23.1`, Deno `2.9.7` / TypeScript `6.0.3`, PostgreSQL `17.11`.

A fresh PostgreSQL cluster was created under `/tmp/medveda-regions-pg`, listening on localhost port `55439`. The runner built and dropped its own `ap_ci_*` scratch database from repository migrations and synthetic seed data. No production connection parameters or production credentials were used.

| Check | Result |
| --- | --- |
| `PGHOST=127.0.0.1 PGPORT=55439 PGUSER=postgres bash supabase/tests/run-all.sh` | PASS: `ALL SUITES PASSED`; 28 SQL suites and all configured function/payment/concurrency harnesses. The 14 legacy-counted SQL suites account for 570 assertions; other SQL suites use exceptions/assertions without a numeric summary. |
| `deno test --cached-only --allow-env supabase/tests/play_catalog_unit_test.ts supabase/tests/play_catalog_api_test.ts` | PASS: 5 tests, including multiple malformed/authorization/price cases inside each test. No network permission. |
| `node supabase/tests/play-catalog-creation-selftest.cjs` | PASS: 122 scenarios, executing the real worker/catalog/Google wrapper with synthetic OAuth and mocked HTTP/database. |
| `deno check --cached-only supabase/functions/sync-play-catalog/index.ts` | PASS. |
| Admin Panel `npm test` | PASS: validation, product mutations, pagination and billing diagnostic tests. |
| Mobile payment-provider, play-restore, payment-routing and play-lifecycle selftests | PASS: package/provider routing, pending receipts, cancellation, restore, process death and duplicate callback recovery. |
| `git diff --check` | PASS. |

During test development, a new entitlement fixture initially reused the already-entitled seed buyer; it was corrected to use a new unentitled user. A test spread-type error was also corrected. The final complete runner passed after these corrections. No application failure was suppressed or skipped to obtain that result.

Logs: [complete runner](evidence/local-test-suite.log), [focused catalog tests](evidence/catalog-tests.log).

## Remaining Google authorization and operational risks

Removing conversion removes that specific permission dependency. It does not establish authorization for OAuth, One-Time Product GET/PATCH/activation, receipt verification, consumption or other billing APIs. All existing authentication, app-level Play permissions, Cloud API enablement and account restrictions still apply. Required OAuth scope remains `https://www.googleapis.com/auth/androidpublisher`.

No real Google catalog/authorization request was made. `2022/02` is historically documented, and its current acceptance for `in.medveda.app` is unverified. Google can reject a version, a price outside its allowed limits, a listing or account/app state. Math/serialization tests at numeric boundaries do not claim those amounts satisfy Google's regional price limits. Strict mutation-response checks may stop provisioning if actual Google responses omit or change required fields; staging must confirm that behavior rather than relaxing verification without evidence.

The pre-existing PATCH-with-allowMissing mechanism and random reserved SKUs are retained. Google still permits updates through PATCH if another actor creates the same reserved SKU between GET and PATCH. Avoid concurrent Console automation for these reserved IDs; this change does not introduce a conditional-create mechanism.

The dedicated pricing diagnostic endpoints still explicitly call conversion when manually invoked; they are outside the synchronization dependency path and were intentionally retained. Do not interpret their existing conversion 403 as a failed test of the new path, or invoke them as part of staging catalog provisioning.

## Staging validation steps (not executed)

1. Reconfirm the official supported-locations/version information and IN/INR mapping. Select a reviewed version explicitly in staging, for example `PLAY_CATALOG_REGIONS_VERSION=2022/02` only after that review. An empty setting is intentionally unusable for new products.
2. Use an isolated staging Supabase database and synthetic content/users. Keep all billing cron jobs off. Any staging function deployment or Google catalog write requires a separate authorized rollout; none is authorized or performed by this report.
3. Plan the Play-side isolation carefully: this implementation deliberately locks the package to `in.medveda.app`. A staging Supabase backend alone does **not** isolate that app's Google catalog. Use only explicitly approved staging fixture SKUs under that app, with no real customer product or price changes.
4. Manually run one approved synthetic price job. Record only sanitized operation/status/request IDs. Confirm no `pricing:convertRegionPrices` request occurs; confirm the explicit version appears in the PATCH query and Google returns that version.
5. Verify PATCH payload/response and both GET read-backs: exact configured INR Money, India AVAILABLE, one BUY option, DRAFT-to-ACTIVE through the dedicated activation endpoint, no foreign/future prices. Confirm readiness occurs only after final GET and a valid lease.
6. Replay that same job: verify the SKU is reused with no duplicate product or repricing. Simulate transient failure/timeout after write using mocks or a staging proxy and confirm recovery uses read-back. Exercise a price edit only on the synthetic Admin fixture and verify a new price/SKU without altering the old tier.
7. Test missing/unreviewed configuration and injected Google 400/401/403, 409/429/5xx, malformed responses and expired leases. Verify terminal versus backoff behavior, the authorized Admin retry path, no checkout for a failed/stale tier, and no notes entitlement for either failed or ready catalog fixtures.
8. Re-run receipt/ownership/refund/entitlement tests against synthetic fixtures. Do not trigger real purchases. Any later license-tester purchase validation needs a separate approved test plan.

## Production readiness verdict

**Do not deploy this change yet or declare billing resolved.** The local implementation and regression suite pass. Production readiness still requires separately authorized staging proof of the configured version, successful Google GET/PATCH/activation permissions and response shapes, preserved Admin behavior and end-to-end payment/entitlement gates. No production migration is required for this code change. Keep cron activation and production rollout separate from this review.
