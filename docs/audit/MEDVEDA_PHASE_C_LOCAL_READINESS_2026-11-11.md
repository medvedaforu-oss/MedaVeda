# MedVeda Phase C billing integration local readiness — 2026-11-11

**Final decision: NO-GO for production deployment or purchase activation. Local review package prepared and deterministic acceptance PASS. Purchases remain disabled.** No migration, function, schedule, secret, catalog or price was deployed or changed remotely. No real order, financial worker, provider receipt, authorization token or Google acceptance was created. No staging contact occurred.

Scope: `/home/ganeshp8545/AyurPulse`, Android `in.medveda.app`, future production target `xbvenkfmesugrbjuufyw`. This task made **no production connection**. Production statements below are explicitly inherited from the November 11 preflight/Phase A/Phase B evidence, not fresh observations. Public Google/Expo/Razorpay documentation and the exact public OpenIAP Maven POM/source archive were read. Credentials/environment files were not loaded into tests.

## 1. Local implementation status

Read the production deployment preflight, Phase A safety review, Phase B compatibility report, original full audit and available MV001/MV003–MV012 fix reports; inspected the actual migrations, handlers, native wrapper/dependency source, mobile routing, checkout WebView, settlement, reporting and test harnesses. No separate MV002 fix report exists: its original catalog discrepancy is a business decision, and **₹1/₹2/₹5 remain unchanged**. Followed `mobile-app/AGENTS.md` by reading the versioned Expo 57 reference before editing mobile code. No delegation or skill was used.

Four local corrections are included:

1. `create-play-order` and `attach-external-token` now enforce the existing server enrollment/acceptance/checkout opt-ins and application headers after Auth, before any reservation/token write. Missing approval defaults deny. Receipt verification, refunds and historical restoration retain their independent recovery paths.
2. Mobile Play HTTP requests now send native application ID/version, matching the dedicated Notes-choice route. No provider/build gate was enabled. Header assertions execute the real service with synthetic transport.
3. New `20261111100000_phase_c_final_mv003_commitment.sql` explicitly restores **every strong MV003 predicate after recovery**. It reuses the reviewed strong definition and ACL; no financial DML or capture backfill occurs.
4. New `20261111110000_phase_c_play_entitlement_snapshot.sql` snapshots new Play purchase entitlement from its immutable order and strengthens Play proof with exact provider/SKU and complete scope checks. The old Play settlement reads current product scope; the previous Razorpay snapshot trigger ignores Play. New real SQL tests change the product from chapter to subject between reservation and settlement and prove the original chapter is granted. The retained snapshot regression also passes. Existing purchases/readers are not rewritten.

LOCAL VERIFIED means actual source/real isolated PostgreSQL or a specified deterministic harness passed. It does not mean native installation, managed Supabase transport, enrollment or provider/API acceptance. Those remain **NOT VERIFIED**.

## 2. Exact SQL dependencies and ordering

The release [manifest](../../supabase/releases/phase-c-20261111/manifest.json) pins 66 prerequisite baseline migration files through `20261104110000` and seven separately copied review migrations. Baseline copies are prerequisites, not instructions to replay applied migrations. The required future sequence is **A1 → A2 → A3 → Notes choice → recovery → final MV003 → Play snapshot/proof**. The local runner exercises this ordering, including a deliberately retained failed-order/success contradiction and duplicate ownership.

| Order | Exact migration | SHA-256 |
| --- | --- | --- |
| A1 | `20261110100000_mv003_razorpay_entitlement_commitment.sql` | `82ae7f73d32c44b0fa627b3d1f33777ce7a2d41f0aef6c25826704ac8898dc0b` |
| A2 | `20261110120000_mv005_razorpay_order_transitions.sql` | `f266859f080e200cffad9ae17b833faa4ac9302d78ed4d641c6c750564984730` |
| A3 | `20261110130000_mv006_purchase_ownership_guard.sql` | `6c6e8704a424e1c0689dcbd3bd8c6ac5bf92ea48e76b2ff0c7cbdd6721609e4c` |
| C1 | `20261108100000_notes_choice_checkout.sql` | `bf0452bc97960bc15c7954d44303cb1009f7f8dfb66721ea627a6f952aff4427` |
| C2 | `20261109100000_billing_settlement_recovery.sql` | `d62c8f4b17c75bf75df01d73460646381d8154916d835ec1acebe136dac90dee` |
| C3 | `20261111100000_phase_c_final_mv003_commitment.sql` | `d47d7ee0e8d74e56752c16c034e38c996e7b6b81e029cbb2d309a43151b720f2` |
| C4 | `20261111110000_phase_c_play_entitlement_snapshot.sql` | `da4f56405f25e8e1a67f077d4ecce1e40ddbf2932efa16882e4ba8a2a2ed08c4` |

| Dependency / conflict | Required contract and risk |
| --- | --- |
| C1 reservation | Adds service-only, RLS-enabled `notes_choice_checkouts`, unique choice/order binding, `prepare_notes_choice_checkout(uuid,text,text,boolean,text)`, `record_notes_choice_authorization(text,timestamptz)` and `orders.ucb_transaction_time`. Requires baseline priced-order, immutable entitlement/tax snapshots, wallet/discount reservations, external token/ID fields and `payment_jobs(kind,target_id)` uniqueness. |
| C1 token/queue replacements | Replaces `attach_ucb_external_token(uuid,text,text)` and `enqueue_payment_jobs()`. Earlier same-signature routines lack the final null-expiry/global-reuse and capture recovery semantics. Signature existence alone is insufficient. |
| C2 schema | Adds `provider_events.blocks_entitlement`, `orders.external_report_test_purchase`; replaces direct external-token btree uniqueness with `orders_external_token_digest_unique` using `extensions.digest(...,'sha256')`. Requires pgcrypto in extensions and no conflicting existing token digests. Existing external-ID, provider-payment/order, purchase-order and Play-token unique indexes remain required and valid locally. |
| C2 RPC overwrite | Replaces Razorpay settlement, token attachment, queue enqueue and Razorpay proof; adds `play_entitlement_committed(text,text)` and authenticated owner-bound `get_my_play_fulfillment(text)`. Its Razorpay proof omits payment provider/order checks, captures, compensations and parked reversals. The runner reproduces that weaker overwrite and applies C3 afterward. |
| C3 final strong MV003 | Service-only SQL STABLE SECURITY DEFINER; trusted search path. Requires paid order, exact successful payment/purchase, provider IDs, owner/product/amount and full course/scope snapshot; denies inconsistent captures, every compensation and pending/parked reversal. No capture record is required for compatible historical purchases. Conservative pending partial-refund holds clear only after durable application. |
| C4 Play guard/proof | New `play_purchase_entitlement_from_order()` BEFORE INSERT trigger `purchases_play_order_snapshot`; final `play_entitlement_committed`. Runs before existing MV006 last ownership guard. Rejects malformed snapshots; sets exact order scope/course. Recovery must not run afterward and replace proof. Historical incomplete snapshots may fail stricter recovery proof; existing success-based Notes authorization remains intact. |
| A2/A3 preservation | Terminal Razorpay transition trigger plus READ COMMITTED advisory-lock ownership guard, including restoration. Historical index exception/duplicates and NULL-product legacy access remain. No future complete ownership index is included. |
| Financial/access closure | Existing orders/payments/purchases, profiles/products, content hierarchy/notes, wallet/referrals/identity/discount reservations, captures/compensations/provider inbox, refunds, Play jobs/void cursors/catalog tiers and metrics views. Existing Notes AAL/publication/storage signing rules remain authoritative. |
| Security | New reservation table: no anon/authenticated access, service role only. New proof/financial RPCs revoke PUBLIC/anon/authenticated; fulfillment RPC is account-bound authenticated/service. Existing client SELECT-only financial policies retained. Service-role handlers must establish Auth/ownership themselves; RLS does not constrain a service-role bug. |

[Dependency closure](evidence/phase-c-20261111/sql-dependency-closure.json) resolves **37 RPC/reader roots, 89 public routines and 41 relations**, conservatively expanding called routines, relation views and attached triggers. It retains normalized definition hashes and per-entrypoint RPC/table lists. [Real local schema inventory](evidence/phase-c-20261111/sql-schema-inventory.json) includes columns, indexes, RLS, policies, table ACLs, function owner/ACL/path/definer and trigger definitions; full local function definitions are retained separately. Managed Auth/Storage/cron internals are platform dependencies reproduced by the existing stub, not certified hosted behavior.

C1 uses one-time `CREATE TABLE`, so reapplication is deliberately not assumed safe. C3/C4 applied twice without changing financial/catalog fingerprints. C2 builds a unique digest index and replaces routines; possible duplicate-token/index-build/DDL-lock failures require preflight, not deletion/repair. Skip the isolated non-Play migration and future MV006 maintenance index. Older pending timestamps after A1/A2/A3 require explicit owner-reviewed ledger handling; never pre-mark them or use blanket `db push`.

## 3. Google Play India integration

India's program permits alternative billing **alongside Play** and requires package onboarding, trust/safety arrangements and reporting authorized transactions within 24 hours. India is distinct from the general pilot; no general-pilot business-registration requirement was inferred for this app. Enrollment/terms/payment profile, package/India opt-in and payment-method branding remain owner evidence. [Official India requirements](https://support.google.com/googleplay/android-developer/answer/13306652?hl=en).

The native API flow uses Play product details and offer token, Google-rendered choice, and an alternative-selection callback whose token is persisted before alternate checkout. Unsupported Play countries receive standard Play flow; a hand-built Razorpay selector cannot replace this flow. [Official native integration](https://developer.android.com/google/play/billing/alternative/alternative-billing-with-user-choice-in-app).

For a new November 11, 2026 release, Billing Library 7's extension has expired: a supported **8+** release is required. The historical 5.2 API feature minimum is insufficient for publishing. [Official version timeline](https://developer.android.com/google/play/billing/deprecation-faq).

Actual inspected chain: installed `expo-iap 3.4.4` → its Android Gradle dependency `openiap-google 1.3.26` → exact public Maven POM declares `billing-ktx 8.3.0`. The downloaded source maps init's user-choice program to USER_CHOICE, invokes `enableUserChoiceBilling` via reflection, forwards token/product IDs and launches BillingClient purchase flow. The Expo native wrapper installs listeners before connection; manifest retains BILLING permission. [Pinned native evidence](evidence/phase-c-20261111/native-inputs.json) contains POM/source hashes and URLs. This verifies declared upstream dependencies/source, **not the app's resolved release dependency graph or merged manifest**. Reflection failure is logged by the library, so device acceptance must demonstrate actual native choice.

| Requirement | Current local behavior / status |
| --- | --- |
| Choice/product mapping | Server creates owner/course/Notes-eligible Play order with fresh verified INR/IN SKU and BUY-option mapping. Client accepts exactly one standard, non-discount/non-rental/non-preorder offer at quoted INR micros. Real SQL and synthetic handler validation PASS. Console product readback/API permissions NOT VERIFIED. |
| Native callback races | Product/SKU and initiating account checked before and after durable storage; duplicate/in-flight callbacks coalesce. Native launch timeout retains pending attempt and avoids another launch. Harness PASS; real native timing NOT VERIFIED. |
| Selected Play | Purchase callbacks verify account/order obfuscation, SKU/option, country, quantity, purchase/completion state and timestamps server-side; exact commitment precedes consumption/success. Legacy v1 recovery retained, v2 used for option snapshots. Delayed/cancelled local orders can still settle a genuine receipt. Synthetic receipt validation and real SQL PASS. |
| Selected Razorpay | Only saved alternative callback context enters attachment and the dedicated Notes reservation endpoint. Same account/product, Indian buyer state and one-time transfer required. Existing WebView preserved. Price changes require explicit user reconfirmation before opening checkout. |
| Token lifecycle | Bounded opaque token, owner/product binding, reservation expiry/null-expiry rejection, digest uniqueness, same-token idempotent retry and one bound Razorpay order. Synthetic/SQL PASS. Reservation TTL is application policy, **not a claim of Google's token expiry**. |
| Genuine-token boundary | Only native callback supplies a token in the implemented app flow. Server checks format, authenticated ownership and uniqueness; headers/flags are not attestation and it cannot establish Google's cryptographic validity locally before Google reporting. No format-valid mock token is claimed genuine. Actual issuance/acceptance remains NOT VERIFIED. |
| Country/disclosures | Delegate eligibility and choice disclosures to Play; INR/IN receipt and Indian billing-state contracts restrict this implementation. Non-IN standard Play fallback must be tested; this backend does not support granting non-IN receipts. Owner must configure India-only offering/distribution appropriately. Rendered choice/logo/support/refund disclosures NOT VERIFIED. |
| Default off | Existing production build/provider gates unchanged; new server reservation/attachment defaults deny. Verification/reversal/restoration stay separate from permission to begin sales. |

## 4. Razorpay Notes-choice integration

Existing compatible pieces are retained: Auth-derived identity; Notes-only product/course/scope validation; server quote/reservation and exact INR/paise arithmetic; discount/wallet/tax snapshots; token transfer to one uniquely reserved order; exactly one provider CREATE claim. Ambiguous creation retries search by internal receipt and validate provider ID, receipt, amount, INR and all user/product/order/choice notes; they never issue another CREATE for that reservation. Changed quote requires explicit reconfirmation in Order Summary. ₹1/₹2/₹5 fixtures pass unchanged.

Callbacks validate order/payment HMAC; webhooks validate original raw bytes and support the previous secret for older retries. Provider GET facts then establish captured status, amount/currency and order binding. Durable capture precedes atomic settlement. Strong commitment, not a normal void RPC return, permits success. Authorization only queues reporting and never grants Notes or debits wallet. Refunds/disputes suspend/reverse/restore access through existing routines; compensation remains separate from entitlement. [Razorpay integration](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/), [webhook validation](https://razorpay.com/docs/webhooks/validate-test/).

Actual callback/webhook/HMAC with real local SQL PASS; ambiguous-creation/provider snapshots and authenticated authorization use synthetic transport. Actual Razorpay authorization, WebView checkout, provider retry delivery and payment-to-PDF acceptance are **NOT VERIFIED**. No real/test provider order was created.

## 5. External reporting

Stable `medveda_` internal-order-based IDs and database uniqueness preserve identity across retries. One-time token, INR pre-tax/tax snapshots, Indian state and transaction timestamp form the request. GET-before-CREATE and readback after ambiguous failures reconcile the same ID, package, amounts, address and timestamp. Google-derived output-only test markers must agree with server mode; no fake token/test flag is sent to Google. Refunds serialize by durable refund ID, reconcile partial pre-tax balances, and wait for original reporting; lost disputes enqueue a stable full-reversal identity. [Backend reporting requirements](https://developer.android.com/google/play/billing/outside-gpb-backend), [external creation API](https://developers.google.com/android-publisher/api-ref/rest/v3/externaltransactions/createexternaltransaction), [refund API](https://developers.google.com/android-publisher/api-ref/rest/v3/externaltransactions/refundexternaltransaction).

Authorization queues a report even while order is unpaid. Its timestamp is recorded once after provider status/amount validation, and queue deadlines survive later capture/retry. **Timestamp limitation:** existing authorization handling uses provider payment `created_at` as its stable conservative time anchor, not a separately exposed `authorized_at`; lost-dispute reversal time uses first local observation. Do not label these exact provider authorization/resolution instants. Owner/provider/API acceptance must validate timestamp semantics; the creation-time anchor generally advances the deadline rather than extending it. Genuine token validity, Google transactionTime acceptance, tax treatment and genuine refund/dispute acceptance remain **NOT VERIFIED**.

Durable reports/refunds jobs use deadline priority, expired-lease recovery, backoff and parking. Missing/mismatched reporting results and persistence errors do not count as completed jobs. Synthetic acceptance/rejection/timeout/ambiguous retry/duplicate/full-partial refund tests PASS; **no Google reporting API call was made**. The current monitoring helper is best effort, and the reporting queue-metrics read does not itself establish independent alert delivery. Operational monitoring is a production blocker.

## 6. Worker readiness

| Worker / phase | Dependencies and readiness |
| --- | --- |
| `report-external-transaction`: reports/refunds/events/compensate | Authenticated cron-secret handler, payment_jobs leases, authorization/capture/inbox and refund/compensation tables, reporting and settlement dependency closure. Real lease/backoff/parking SQL and synthetic handler idempotency PASS. No worker invoked remotely. |
| `play-payment-worker`: consume/reconcile/voids | Separate Play job queue, token uniqueness, void-token store/cursor, service RPCs and Google permissions. Local SQL cursor/lease/privilege and synthetic consumption/reconciliation tests PASS. |
| `sync-play-catalog` | Catalog queue leases, eligible paid Notes, regional config and Google product/BUY-option permissions. Packaged and Deno-checked; SQL queue/failure tests PASS. It writes to Google, so no invocation or schedule activation occurred. |
| Scheduling/monitoring | Owner must provide scheduler heartbeat, safe cadence/capacity, deadline/parked/backlog alerts, provider failures and cursor lag monitoring with observed delivery. Inherited Phase A/B evidence records inactive Play schedules; current state not refreshed. |

Reporting batch=40/concurrency=8; Play worker batch=20/concurrency=4. Existing queues use three-minute leases, twelve-attempt parking and exponential retry capped at one hour. Per-job multiple provider requests can exceed a simplistic single-request batch estimate; real load/timeout/lease-overlap acceptance is **NOT VERIFIED**. Do not claim the estimate guarantees deadline capacity. Prefer the dedicated Play worker for consume/reconcile/voids rather than activating overlapping legacy reporting-worker Play phases. Neither schedule is enabled here.

## 7. Local test commands and results

**48 isolated checks PASS:** 29 mobile Node suites, 17 backend Node suites including production-only reporting, mobile TypeScript and whitespace. **Combined real PostgreSQL runner PASS, 163 PASS markers** (suite assertions/notices, not 163 end-to-end transactions). Ten independently extracted archives pass cached/frozen Deno checks. Local bundling of ten entrypoints succeeds, 70 modules. Both Phase B and Phase C checksums pass.

```sh
python3 docs/audit/evidence/phase-c-20261111/run-regressions.py
PGHOST=/tmp/medveda-phase-a-final/socket PGPORT=55471 PGUSER=postgres \
  python3 supabase/tests/run-phase-c-local.py
python3 docs/audit/evidence/phase-c-20261111/build-dependencies.py
python3 scripts/prepare-phase-c-release.py
python3 docs/audit/evidence/phase-c-20261111/validate-release.py
sha256sum -c supabase/releases/phase-b-20261111/checksums.sha256
sha256sum -c supabase/releases/phase-c-20261111/checksums.sha256
git diff --check
```

Bundling command runs from `supabase/releases/phase-c-20261111`, with the ten manifest entrypoints: `deno bundle --platform deno --packages external --no-remote ... --outdir /tmp/medveda-phase-c-build`. All compilation is local; outputs are not Supabase deployment artifacts. [Regression results](evidence/phase-c-20261111/regression-results.json), [SQL log](evidence/phase-c-20261111/sql-acceptance.log), [archive checks](evidence/phase-c-20261111/archive-results.json), [bundle log](evidence/phase-c-20261111/bundle-build.log).

| Requested test area | Evidence / result |
| --- | --- |
| Choice reservation; both providers | Real service-role create_play_order, verified SKU/option/₹5, alternative transfer, Play exclusion after alternative, Razorpay settlement and Notes predicate PASS. |
| Wrong user/product; expired/reused tokens | Existing choice/recovery SQL plus gate/handler tests PASS, including long opaque token and global reuse denial. |
| Native callback races; pending/failed/cancelled | Actual mobile service/summary with synthetic native callbacks PASS; no native execution. |
| Play receipt verification | Actual verifier/validation with synthetic Google responses PASS; actual SQL settlement, immutable snapshot, duplicate charge/replay/refund PASS. |
| Razorpay callback/webhook signatures | Actual HMAC code, negative signatures, provider amount/order/status mismatch, callback/webhook and real SQL PASS. |
| Fulfillment, unlock, crash/retry | Exact proof/all four scopes, capture-only and post-commit interruption, duplicate/concurrent settlement and SQL Notes access PASS. Signed Storage/PDF device access NOT VERIFIED. |
| Refunds/reporting/retry/idempotency | Real reversal/queue SQL; synthetic full/partial reporting, ambiguous responses, persistence/lease loss and compensations PASS. Genuine API acceptance NOT VERIFIED. |
| Restart/reinstall restoration | Stored attempt, receipt lookup/account binding, server fulfillment/recovery and old purchase access harnesses PASS. Actual restart/reinstall/device receipt recovery NOT VERIFIED. |
| MV003–MV012 / disabled gates | Existing SQL prevention/history/restoration/races and focused mobile/backend suites PASS. No historical repair; standalone Play sale and production checkout remain blocked. |
| Dependency/config/whitespace | Every packaged literal Edge RPC/relation resolves; per-entrypoint imports/config/lock pinned, extracted Deno checks, release-disabled tests and diff check PASS. |

PostgreSQL 17.11 used a TCP-disabled `/tmp` Unix socket, fresh randomly named databases, retained production-compatible baseline plus synthetic fixtures, and credential-free subprocess environments. Databases are dropped in `finally`; the final scratch-database check returned none and the local cluster is stopped. Managed hosted Auth/PostgREST/cache/event hooks are not reproduced. Initial local socket restrictions required a narrowly approved local-only escalation. Early runner failures concerned missing fixture prerequisites and a legacy duplicate test counting all users; corrected setup and a separate buyer-scoped duplicate regression retain the intended ownership assertion. No application expectation was weakened. No automatic approval rejection remains outstanding.

## 8. Missing Console evidence

No package-specific enrollment/terms approval, India opt-in, payment profile/fee setup, approved logos/disclosures, trust/safety/support/fraud-dispute arrangement, Play signing identity/tester/track evidence, verified catalog/standard BUY-option readback, Android Publisher package permissions, or successful authentic external transaction/refund response is supplied. Prior catalog PATCH 403 evidence is not resolved by local SQL or OAuth source inspection. Server/build booleans cannot substitute for any of this evidence.

## 9. Native/device blockers

SDK environment paths point to missing `/home/ganeshp8545/Android`; `/usr/lib/android-sdk/platforms` is absent. ADB alone is insufficient. No APK/AAB, emulator/device flow, Play-delivered native choice, resolved release dependency graph, merged manifest, obfuscation/reflection behavior, WebView payment, TalkBack, production Auth/PDF retrieval or genuine restart/reinstall was executed. All are **NOT VERIFIED**. Do not certify a paid Android release from TypeScript/Node/POM checks.

## 10. Exact changed-file inventory and release artifacts

Five pre-existing files were modified narrowly, preserving their earlier fixes:

- `mobile-app/src/services/playBillingService.ts` — native app headers only.
- `mobile-app/scripts/notes-billing-choice-selftest.cjs` — app-header fixtures/assertions.
- `supabase/functions/create-play-order/index.ts` — approval gate.
- `supabase/functions/attach-external-token/index.ts` — approval gate.
- `supabase/tests/play-order-selftest.cjs` — explicit approved-gate mock for existing catalog-result tests.

New implementation/test/build files:

- `supabase/migrations/20261111100000_phase_c_final_mv003_commitment.sql`
- `supabase/migrations/20261111110000_phase_c_play_entitlement_snapshot.sql`
- `supabase/tests/phase-c-gates-selftest.cjs`
- `supabase/tests/phase-c-contracts.sql`
- `supabase/tests/phase-c-play-duplicates.sql`
- `supabase/tests/run-phase-c-local.py`
- `scripts/prepare-phase-c-release.py`

The exact exhaustive [changed-file inventory](evidence/phase-c-20261111/changed-file-inventory.json) includes this report, all new evidence, and every new release source/archive/config/SQL/dependency file. [Preservation evidence](evidence/phase-c-20261111/preservation.json) compares the initial 1,961-file snapshot. The other 1,956 snapshotted files remain byte-identical; no existing file was deleted. Website/admin, all old migrations, existing reports/evidence and every Phase B source/hash/archive are preserved.

Release root: [phase-c-20261111](../../supabase/releases/phase-c-20261111/README.md). Ten archives: create-play-order, attach-external-token, create-order-play-choice, verify-payment, razorpay-webhook, verify-play-purchase, report-external-transaction, play-payment-worker, sync-play-catalog and get-note-url. There are 26 unique TypeScript files, seven SQL copies, per-function JWT settings, nine-package pinned dependency lock, complete static SQL/schema inventories, and 239 mobile source/config/asset hashes. The existing website creation candidate is explicitly the unchanged Phase B B3 archive; it is not replaced by the broader current workspace handler. No activation/deployment script was added or executed.

Compatibility matrix: inherited production baseline alone → **BLOCKED** for Phase C; baseline+A1/A2/A3 → Phase B only; plus C1/C2 without C3 → **BLOCKED** weaker commitment; plus C1/C2/C3/C4 and exact bundles → **LOCAL VERIFIED**, managed/native/provider acceptance pending. Any unexpected schema/hash/config drift blocks rollout.

## 11. Manual owner requirements

Supply Console/provider evidence and independently verify package permissions, exact tax/timestamp treatment, enrollment, supported country behavior, trusted native choice and accepted reporting/refunds. Establish an isolated authorized native acceptance plan consistent with the no-staging restriction; genuine provider/device testing requires a separate scope, not credentials invented by this task. Review historical contradictions/duplicates without revoking legitimate access. Demonstrate complete current application/Auth/Storage metadata plus object/config/secrets recoverability, RPO/RTO and post-restore financial reconciliation policy. Appoint operator/observer and monitoring/incident owners before any deployment request.

## 12. Remaining production blockers and fail-safe

Inherited Phase A evidence reports no listed managed backup/PITR recovery point and incomplete earlier Auth restore; not refreshed or solved here. Phase A/B/C delivery, fresh production drift/security/cache checks, complete recovery evidence, historical decisions, authentic Console/API/provider acceptance, native build/device acceptance, timestamp/tax validation, scheduler capacity/lease behavior and independent alerts remain blockers. No issue is promoted to production-complete.

Keep purchases disabled on any failure. Preserve captures/inbox/queues and financial history. Before a future DDL commit, abort on failed prerequisites; after delivery prefer a separately reviewed forward fix. Never disable guards, delete financial facts/ledger entries, force entitlement, automatically run refunds/recovery, or restore old vulnerable bundles to hide an error. Any rollback must be a separately reviewed, hash-pinned compatible safe bundle/recovery procedure. No automatic inverse SQL or financial replay is provided.

## 13. Future deployment order and final decision

Only after separate owner authorization: recovery/drift review → Phase A process A1/A2/A3 → separately approved Phase B if applicable → atomic owner-reviewed C1/C2/C3/C4 dependency change → independent read-only postchecks → compatible receipt/reversal/reporting bundles and dormant workers → reservation/attachment/choice bundles with all gates still off. Catalog changes, worker scheduling, native release and purchase activation each require their own evidence and authorization; none follows automatically from this report. Details/configuration prerequisites and fail-safe are in the release README.

**GO for local technical review of the isolated artifacts. NO-GO for production deployment, paid release, worker enablement or Buy Now activation. Purchases stay disabled.**
