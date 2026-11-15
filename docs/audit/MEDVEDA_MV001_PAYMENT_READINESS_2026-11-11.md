# MV001 — production payment readiness — 2026-11-11

**NO-GO. Production Buy Now remains disabled.** Safe local guards and deterministic regressions pass. Production payment activation is **BLOCKED** by missing Google Play enrollment/acceptance evidence, undeployed backend contracts and workers, unresolved financial history, and native/device acceptance gaps. No production payment-to-Notes success is claimed.

## Scope and preservation

Independently inspected the working tree, original full November 10 audit, every MV003–MV012 report (including MV007), mobile Android instructions, actual payment/choice/recovery/ownership code, local migrations, and fresh read-only production metadata/definitions/bundles. Read the required [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) before editing mobile code. No skill or delegation was needed. `rg` is unavailable; used bounded reads, find, grep and Python.

Only production project `xbvenkfmesugrbjuufyw` was contacted. Staging was never contacted; no staging configuration or credential file was loaded. Other-environment branches encountered during source review were not executed. The existing reporting suite gained a production-only mode so its staging fixture branch did not run. Synthetic approval flags and choice tokens exist only inside isolated test harnesses; they are not Google authorization or enrollment evidence.

Production inspection used Management API GETs for identity/function metadata/deployed bundles and a database metadata/aggregate query with `read_only:true`, `BEGIN TRANSACTION READ ONLY`, a 15-second statement timeout, SELECTs and ROLLBACK. No financial RPC, Auth, recovery, signer, worker, provider or payment execution endpoint was invoked. Bundles/definitions were inspected in memory; retained evidence contains hashes, structural booleans, schema metadata and minimized aggregates, without customer/provider identifiers or secrets. The collector privately reads the existing Management API token file; it never prints or saves the token. No credentials, purchase flags or Console settings were changed.

No production data writes, migration/function deployments, real/provider-test payments, refunds, APK/AAB builds, uploads, releases, website/admin edits, Git resets/stashes/checkouts/commits or financial reconciliation occurred. The disposable local PostgreSQL cluster used a `/tmp` Unix socket with TCP disabled, unique scratch databases, synthetic records and credential-free test environments. Scratch databases were dropped and the cluster stopped. Sandbox DNS/socket restrictions required approved read-only-network/local-socket escalations; no automatic approval rejection occurred.

A start-of-task SHA-256 snapshot covered 1,682 pre-existing files excluding dependency/Git/generated build/cache trees. Exactly five pre-existing files changed, listed below; 1,677 remain byte-for-byte unchanged and none were deleted. Earlier changes inside those five files were retained. All previous reports, migrations, MV003–MV006 implementation, purchase/access readers, prices, configuration, dependencies, website and admin files remain unchanged.

## Exact task changes

| File | Change |
| --- | --- |
| `mobile-app/src/services/playBillingService.ts` | Reject malformed native choice product lists. Check the initiating account and active attempt before persisting an alternative choice and again after storage, before emitting a checkout event. Keep the original owner's durable attempt for recovery if the account changes during storage. |
| `mobile-app/scripts/notes-billing-choice-selftest.cjs` | Add malformed native callback, account switch before callback and account switch during storage tests. Prove zero alternative checkout events/verification and retained owner recovery. Existing native choice, Play selection, pending, cancel, crash and price-reconfirmation coverage remains. |
| `supabase/functions/_shared/notesChoiceOrder.ts` | Independently validate reserved order owner/product/provider, created status, finite future expiry, safe exact INR/paise values and price-minus-discount-minus-wallet arithmetic before provider CREATE or reuse. Terminal/expired orders return a check-My-Purchases response. SQL already checks ordinary expiry/status; these are additional handler contract defenses. |
| `supabase/tests/notes-choice-order-selftest.cjs` | Replace staging policy fixtures with in-memory production-policy fixtures. Add terminal/expired/foreign/malformed reservation denials, preserve exact ₹1/₹2/₹5 charges, and retain server-price, duplicate retry, ambiguous provider creation/recovery and authorization-report-only assertions. |
| `supabase/tests/google-reporting-selftest.cjs` | Add `--production-only` to skip its staging fixture branch while retaining the original default suite. Production reporting/refund/persistence assertions unchanged. |
| `supabase/tests/run-mv001-local.py` — new | Reproducible credential-free 44-suite Node regression runner plus TypeScript/whitespace checks; separate `--choice-sql` mode builds only a disposable local schema and runs real Notes-choice/recovery/snapshot SQL. |
| `docs/audit/MEDVEDA_MV001_PAYMENT_READINESS_2026-11-11.md` — new | This report. |
| `docs/audit/evidence/mv001-20261111/inspect-production-readonly.py` — new | Restricted production-only read-only collector; never calls execution routes. |
| Same evidence directory — new artifacts | `production-readonly.json`, `deployment-drift.json`, `local-results.json`, `sql-results.json`, `preservation.json`, `artifact-manifest.json`; command logs `local-00.log` through `local-45.log`, `sql-regressions.log`, `choice-sql.log` (logs may be Git-ignored). |

## Google Play India requirements and unresolved approvals

Review date: November 11, 2026 UTC. The applicable program for this repository's intended flow is **India alternative billing alongside Google Play Billing**, implemented with alternative billing **with user choice** APIs. No India Razorpay-only exception or other program approval was provided. Search results for newer billing-choice/external-link or other-region programs do not establish this package's eligibility. [India program](https://support.google.com/googleplay/android-developer/answer/13306652?hl=en).

| Requirement | Local implementation / remaining evidence |
| --- | --- |
| Play Billing remains available alongside the alternative | `expo-iap@3.4.4`, listeners, product/offer lookup, selected Play purchase processing, verification and historical restoration remain. MV007's standalone-sales block is preserved. Native resolved Billing dependency and working Play selection are unverified. |
| Enrollment/terms/package and country settings | Owner must provide completed onboarding confirmation, accepted terms/payment profile, `in.medveda.app` India opt-in and country targeting evidence. Build booleans are not approval. **BLOCKED.** |
| Trust/safety, fraud support and service fees | Owner must confirm PCI DSS certification requirements, fraud reporting/support operation and adjusted Google fee invoicing obligations. No account evidence inspected. **BLOCKED.** |
| Native payment-method choice | Retained service initializes `user-choice-billing`, launches the mapped standard offer and handles Google's native choice callback. Google renders the choice/information UX; selecting Play must continue Play, and Razorpay must wait for the alternative callback. No custom radio-button substitute was introduced. |
| Country eligibility | Google checks Play country/package configuration. Indian billing-state input supplies tax context, not country or enrollment proof. Owner must demonstrate India-only Console configuration and ineligible-country behavior; no IP/client-field workaround. **BLOCKED.** |
| SKU/product mapping | `create-play-order` returns the server order/SKU/purchase-option/price. `fetchMatchingPlayProduct` validates an INR standard offer; obfuscated account/order identifiers bind receipt fulfillment to the product/scope snapshot. Razorpay choice reservation binds the same owner/product and authoritative quote. Actual active Console products/options at preserved prices remain **NOT VERIFIED**. |
| External transaction token | Native callback supplies the opaque token; it is saved per account, sent to `attach-external-token`, and bound server-side to the choice/order. Duplicate/different-product callbacks cannot create a new choice. No token generation or fabricated production authorization was added. Local length/product/context checks are not independent Google token validation; genuine token/report acceptance still needs owner-authorized program testing. |
| Authorized-transaction reporting | India API-integrated transactions must be reported within **24 hours of authorization**. Captured-only reporting is insufficient for long authorization-to-capture gaps. Local authorization webhook handler records durable reporting work without granting Notes; token, stable external ID, provider time, INR pre-tax/tax and Indian administrative area feed reporting. Deployed route/scheduler/Google receipts absent or unverified. **BLOCKED.** |
| Refund/reversal reporting | Backend must report full/partial external refunds against the original external transaction ID; partial reporting uses the refunded pre-tax amount. Local refund IDs, claims, reconciliation and state checks are retained. Owner must confirm treatment/timing of disputes, chargebacks, reversals and accepted program-specific refund deadlines; reviewed public API pages do not establish a separate universal refund deadline. Local jobs target 24 hours, which is an implementation SLA, not evidence of accepted terms. **BLOCKED.** |
| Disclosures and support | Google-rendered choice screens must be used, with actual merchant/payment-method assets and applicable management URLs. App terms/privacy/contact/refund routes exist but currently describe disabled/separate-distribution purchases. Before activation, owner must approve accurate India UCB wording, provider responsibility, support/fraud/refund contacts and effective policy; no website/admin changes made. |

The India program source supports enrollment, trust/safety, fees and the authorization deadline above. [India requirements](https://support.google.com/googleplay/android-developer/answer/13306652?hl=en). The exact native setup, Play-country behavior, product details/offer and native token callback are documented in the [user-choice client guide](https://developer.android.com/google/play/billing/alternative/alternative-billing-with-user-choice-in-app). Backend initial token/transaction-ID, tax/state and full/partial refund contracts are documented in the [backend guide](https://developer.android.com/google/play/billing/outside-gpb-backend) and [refund API](https://developers.google.com/android-publisher/api-ref/rest/v3/externaltransactions/refund).

**Manual-reporting nuance:** the currently retrieved enrollment overview lists India's manual sunset as **TBA**, and the India page still describes monthly manual reporting by the fifth business day. Do not claim a published India migration deadline that the source does not give. This implementation deliberately requires the API path requested here; no manual workaround or enrollment exemption is assumed. Obtain the owner's current program instructions before release. [Onboarding and migration table](https://support.google.com/googleplay/android-developer/answer/13821247?hl=en).

The client guide's API floor of Billing 5.2 is not the release-support floor. The current deprecation table gives Billing 7 an extension deadline of November 1, 2026; a new release now needs a supported version (8 or later under that table). Installed expo-iap references OpenIAP Google 1.3.26, which is **not** a verified BillingClient version. Resolve and inspect the actual Gradle dependency/merged manifest of the intended native artifact. No dependency was removed/upgraded based on a guess. [Official Billing version support](https://developer.android.com/google/play/billing/deprecation-faq).

Google permits different provider prices; this repository currently validates the Play offer against its server Play-order price and Razorpay against the server quote. Preserve ₹1/₹2/₹5 exactly. Owner must verify supported, active Play offers and applicable minimum-price constraints for those prices. If unavailable, stop for an approved product/pricing design; do not silently raise prices, substitute an unrelated SKU or bypass Play.

## Fresh production compatibility evidence

Snapshot: `production-readonly.json`, observed `2026-11-11T03:37:25Z`. Identity: MedVeda, correct project, ACTIVE_HEALTHY, ap-northeast-2. Latest migration remains **20261104110000**. All 17 deployed function versions/gateway settings are retained in evidence. Feature booleans are source-pattern observations, not a substitute for endpoint execution or a comprehensive source equivalence proof.

| Contract | Deployed / local mismatch |
| --- | --- |
| MV003 exact commitment | `razorpay_entitlement_committed` absent. Live `settle_razorpay_payment(text,text,text,bigint,timestamptz)` returns **void**, service-only, SECURITY DEFINER. Live full-definition trimmed SHA-256 `25457888b99e1ee22dd93f6d2ad939c5cddd86916349f46d229846437d85e0da` (hashing the entire definition differs from earlier reports' body-only hash). Local helper requires independent committed purchase proof. Verifier/webhook bundles lack that RPC marker. **Incompatible.** |
| MV004 recovery | Deployed `verify-payment` remains v68, `verify_jwt=false`, without local `recoveryUser` marker; prior audited unsigned recovery finding remains unresolved. Local verified-JWT owner-filtered recovery, bounded refresh and account guards are not deployed. Retain HMAC callback support without user JWT; do not fix this by blindly enabling gateway JWT. |
| MV005 transitions | Live order trigger inventory lacks the local Razorpay terminal-status trigger. Local creation's conditional failure writes and helper manual-review hold differ from legacy creation v23/helper bundles. Two success purchases remain linked to non-paid orders. |
| MV006 ownership | Standalone ownership guard migration absent. Historical duplicate successful user/product group count remains one. Prevention does not canonicalize historical rows. Existing paid access must remain until individually reviewed reconciliation. |
| Choice reservation and authorization | `notes_choice_checkouts`, `prepare_notes_choice_checkout` and `record_notes_choice_authorization` absent. `create-order-play-choice` and `attach-external-token` absent. Legacy service-only `bind_ucb_razorpay_order` exists but does not satisfy the dedicated mobile reservation contract. |
| Play order/receipt contracts | `create-play-order` v3 and `verify-play-purchase` v3 exist, JWT required. Local create response validation/Notes-only eligibility, updated verification/reporting/recovery dependencies and `get_my_play_fulfillment` are not proven compatible; the fulfillment RPC is absent in discovery. Local exact-price mapping and receipt tests do not prove Console products or API authorization. |
| Webhook | `razorpay-webhook` v50, gateway JWT false; HMAC and shared settlement markers present, commitment/reporting authorization markers absent. Dashboard event subscription, secret validity, real delivery/retries unverified; no webhook called. |
| Reporting/recovery workers | `payment_jobs`, `ucb_external_refunds`, capture/compensation/event tables and older queue RPCs exist. Local `report-external-transaction` absent. `play-payment-worker` v3 exists, but consume/reconcile/void/catalog cron jobs are inactive; no active external-report/event-recovery scheduler was observed. Presence of queue tables is not operational reporting. |
| Notes signer/access | `get-note-url` v20, JWT required; service-only note/AAL predicates present. Durable successful scoped purchases remain the access model. No signer/access reader was edited; fresh actual-user PDF access is unverified. |
| Catalog/history | Active prices remain ₹1 × 4, ₹2 × 7, ₹5 × 2; no price writes. Two order contradictions and one duplicate group remain. Provider evidence needed; no capture/refund/reconciliation inference from ledger aggregates. |

Complete migration/file inventory differences for the inspected project are in `deployment-drift.json`:

- Pending locally: `20261108100000_notes_choice_checkout.sql`, `20261109100000_billing_settlement_recovery.sql`, `20261109120000_isolated_nonplay_test.sql`, `20261110100000_mv003_razorpay_entitlement_commitment.sql`, `20261110120000_mv005_razorpay_order_transitions.sql`, `20261110130000_mv006_purchase_ownership_guard.sql`.
- Local-only function directories: `attach-external-token`, `create-order-play-choice`, `report-external-transaction`, and the five isolated non-Play functions (`create-order-nonplay-test`, `get-note-url-nonplay-test`, `nonplay-test-catalog`, `razorpay-webhook-nonplay-test`, `verify-payment-nonplay-test`). The isolated test lane is not a production Android purchase path and is not needed for this rollout.
- Modified shared helpers are bundled into callers; deploying a shared file alone is insufficient. Never deploy this entire dirty workspace. Existing deployed function names do not prove their current local implementation is deployed.

## Prepared flow and limits

The retained future flow is Notes → current catalog price → fresh `quote_my_order` → server Play order and exact matching INR offer → Google's native choice. A Play selection uses Play verification; an alternative callback saves/binds the token and Indian tax state, then the dedicated server reservation computes Razorpay paise. Changed totals require explicit reconfirmation. Razorpay callback alone grants nothing: trusted HMAC/provider capture verification, actual SQL settlement and MV003 commitment must all succeed. Success UI independently reads paid order and successful matching purchase. Notes refreshes authoritative scopes and the server signer still decides PDF access.

Pending/authorized/cancelled/failed/uncommitted/compensation outcomes cannot manufacture success in the tested local flow. Duplicate callback/webhook/settlement delivery is idempotent. Server purchases provide login/restart/reinstall restoration by design; account-scoped native attempts and authenticated order recovery preserve ambiguous checkout outcomes. Physical restart/reinstall and real provider completion remain unverified.

The new account checks prevent stale native choice events opening checkout for a switched account, including storage interruption. The new handler checks reject stale/malformed reservations before provider work, even when a stale/mock RPC response says `ok:true`. They grant no entitlement, change no catalog and activate no checkout.

**The owner-dependent branch remains BLOCKED.** Genuine native tokens, approved enrollment, accepted reporting, correct country targeting, production RPC deployment and native/device evidence cannot be created by local code/mocks. Existing source does not constitute an activation-ready approved release.

## Verification commands and results

From repository root, final commands:

```sh
python3 docs/audit/evidence/mv001-20261111/inspect-production-readonly.py
python3 supabase/tests/run-mv001-local.py
PGHOST=/tmp/mv003 PGPORT=55443 PGUSER=postgres python3 supabase/tests/run-mv006-local.py
PGHOST=/tmp/mv003 PGPORT=55443 PGUSER=postgres python3 supabase/tests/run-mv001-local.py --choice-sql
```

Results: **44 Node suites PASS, TypeScript PASS, git diff --check PASS; combined MV003/MV005/MV006 SQL runner PASS (143 reported PASS lines/notices); future choice/recovery/snapshot SQL PASS (16 reported PASS lines/notices).** Counts are reported groups, not independent device end-to-end assertions. `local-results.json` records every exact command, exit code and log. Reporting ran with `--production-only`. Both SQL runners create/drop unique databases; the new choice runner applies the production baseline plus Notes-choice/recovery and MV003/MV005/MV006 migrations only. No hosted credentials reach these tests. Provider/Auth/Supabase transport is synthetic; SQL, handlers, HMAC and mobile services/components are real code.

Cluster lifecycle, local only:

```sh
/usr/lib/postgresql/17/bin/pg_ctl -D /tmp/mv003/pgdata -l /tmp/mv001/postgres.log -o "-k /tmp/mv003 -p 55443 -h ''" start
/usr/lib/postgresql/17/bin/pg_ctl -D /tmp/mv003/pgdata stop -m fast
```

Initial sandbox network/socket attempts failed; authorized restricted escalations completed the same reads/local tests. No failing payment test was bypassed. The cluster is stopped. Native SDK inspection finds only `/usr/lib/android-sdk/platform-tools`, with configured `/home/ganeshp8545/Android` absent; no SDK download/build/device mutation was attempted.

| Required deterministic scenario | Passing local evidence |
| --- | --- |
| Razorpay creation contracts, authoritative pricing, INR/paise | Notes-choice handler suite, MV005 creation suite, payment request/summary/provider suites; exact ₹1/₹2/₹5, injected client amounts ignored, mismatched provider snapshot denied. |
| Valid/invalid choice and India restrictions | Native product-bound callback/duplicate/malformed tests; production approval gates; invalid state/order/owner/product/expiry denied; real Notes-choice SQL token/owner/snapshot guards. Console country eligibility itself remains unverified. |
| Valid signed callbacks / invalid signatures | Actual MV003 helper/callback/webhook/HMAC + real SQL; MV004 and Razorpay security suites. |
| Cancellation, pending, authorization, capture | Native choice/Play receipt and checkout/verdict/poll suites; authorization queues reporting without settlement; capture requires real committed SQL. |
| Committed entitlement / compensation-only | Actual MV003 SQL proof across chapter/subject/year/bundle; missing/mismatched proof fails closed; real compensation-only normal return never unlocks. |
| Duplicate callbacks / webhooks | Actual HMAC/inbox/helper/SQL replay and independent-session settlement tests; one durable purchase. |
| Refund/reversal | Actual partial/full refund and dispute SQL, commitment denial/replay, ownership restoration; synthetic Google partial refunds/duplicate refund reconciliation/persistence tests. |
| Crash during checkout | Native request timeout retains owner attempt; ambiguous provider CREATE cannot issue a second CREATE; capture-only and post-commit interruption recover through real SQL; worker retries until commitment. |
| Authenticated recovery / switching accounts | Backend JWT/owner/HMAC suite and mobile bounded-refresh/account-switch tests; new native callback-before/during-storage account switch tests. |
| Notes unlock scope / restoration / existing access | Four real SQL scopes, cross-owner/snapshot denial, unchanged server access predicate, repository/service reloading, MV006 historical duplicate/refund behavior, MV008 fresh ownership and signer-denial/PDF suites. Device reinstall not simulated as a live result. |
| Disabled production Buy Now | MV007 boundary, release-disabled, routing/provider, unavailable UI and Notes option/accessibility suites: disabled provider and omitted checkout routes remain. No configuration changed. |

Previous regressions independently rerun: MV003 exact commitment PASS; MV004 authenticated recovery PASS; MV005 consistency protection PASS; MV006 duplicate ownership prevention PASS; MV007 compliance-safe retained billing boundary PASS; MV008 20 groups PASS; MV009 26 groups PASS; MV010 30 groups PASS; MV011 15 groups plus baseline accessibility PASS; MV012 24 groups PASS. These remain **local** results; no previous fix was deployed by this task.

## Release readiness matrix

Verdicts describe the requested production payment-enabled Android release. Local evidence is separately qualified.

| # | Area | Verdict | Explicit evidence / remaining limit |
| --- | --- | --- | --- |
| 1 | Google Play compliance | **BLOCKED** | Applicable India alongside-Play path identified; enrollment, actual UX/reporting/support acceptance missing. |
| 2 | Play Console enrollment | **NOT VERIFIED** | No Console access, onboarding confirmation or package/India enrollment evidence. Blocks activation. |
| 3 | Google Play Billing integration | **BLOCKED** | Retained local UCB/Play selection/restoration tests PASS; actual supported native Billing graph and approved device flow missing. |
| 4 | Razorpay checkout | **BLOCKED** | Local WebView/server-choice contracts PASS; production mobile route disabled; genuine choice/live lifecycle unverified. |
| 5 | Production order creation | **BLOCKED** | Dedicated choice endpoint and reservation RPC absent; no creation invoked. Legacy endpoint existence insufficient. |
| 6 | Server-side verification | **FAIL** | v68 lacks required local commitment contract; commitment RPC absent and prior recovery flaw unresolved. Local fixed regressions PASS. |
| 7 | Webhook settlement | **FAIL** | v50 lacks commitment/reporting changes; provider delivery/retry unverified. Local HMAC/SQL regressions PASS. |
| 8 | Entitlement commitment | **FAIL** | Required proof RPC absent; deployed void settlement outcome insufficient. Local exact proof PASS. |
| 9 | Notes unlock | **NOT VERIFIED** | Durable predicates present and local scope/denial tests PASS; no live payment-to-authorized-PDF cycle. |
| 10 | Purchase restoration | **NOT VERIFIED** | Local account/scope/recovery tests PASS; actual login/restart/reinstall/device cycle not performed. |
| 11 | Refund/reversal consistency | **BLOCKED** | Local SQL/refund reporting PASS; reporting route/scheduler absent, real provider/report evidence and historical consistency unresolved. |
| 12 | Historical financial reconciliation | **FAIL** | Fresh aggregates still show two non-paid/success contradictions and one duplicate ownership group. No repairs authorized/executed. |
| 13 | Android native build | **BLOCKED** | Usable SDK absent; exact Billing dependency, merged manifest/R8/artifact unverified; no AAB built. |
| 14 | Physical device testing | **NOT VERIFIED** | No device purchase, UPI, crash/resume, TalkBack, restart or reinstall executed. |
| 15 | Production deployment readiness | **BLOCKED** | Coordinated backend plan, Console evidence, reconciliation decisions and native/operational acceptance outstanding. |

## Safe owner-approved implementation and deployment plan — not executed

1. **Owner evidence before activation:** confirm India-only app/form-factor eligibility, completed program onboarding/terms/payment profile, package opt-in and country settings, PCI/fraud/support requirements, provider disclosures and refund/reversal obligations. Obtain screenshots/exports/confirmation privately. Verify actual supported Play price tiers/options at unchanged ₹1/₹2/₹5 and the real Razorpay merchant/capture/webhook configuration without changing credentials. Failure/missing approval keeps activation blocked.
2. **Prepare a narrowly reviewed artifact:** isolate task-attributable changes from the dirty workspace while retaining every prior fix. Inventory transitive Edge bundle dependencies and actual production schema/ACLs. This is not approval for a blanket migration push or deployment script. No website/admin change is required for the local patch; any future public disclosure updates need their own authorized scope.
3. **First backend rollout, separately approved with purchases still off:** deploy standalone MV003 proof RPC, MV005 status protection and MV006 new-grant backstop in that dependency order after repeatability/ACL review. Deploy the compatible MV003/MV004/MV005 callback/webhook helper deltas together, preserving public HMAC callback handling and verified-JWT ownership on unsigned recovery. Confirm schema-cache visibility read-only before exposing a helper requiring a new RPC. Avoid accidentally bundling newer choice/recovery calls during this minimal security rollout.
4. **Future UCB backend rollout, separately approved with purchases off:** review November 8 Notes-choice and November 9 recovery migration operations against production; install choice before recovery and reapply/review the stronger standalone MV003 definition last so the older recovery proof cannot overwrite it. Preserve MV005/MV006 guards. The tested clean combination is baseline → Notes-choice → recovery → MV003 → MV005 → MV006. Do not deploy the isolated non-Play migration/functions for this flow. Then deploy reviewed choice/token/Play-order/Play-verifier/reporting-worker and matching callback/webhook bundles only after all their SQL/ACL dependencies exist. Do not run functions as a migration check.
5. **Operational reporting approval:** separately review scheduling/worker authentication, authorized-event subscription and durable retry/backfill, 24-hour reporting deadlines, alerts for oldest/parked jobs, original-report-before-refund ordering, external-ID idempotency, compensation and provider reversal handling. Prove genuine accepted Google reports/refunds and an agreed test/refund plan only under separately granted provider/financial-test authorization. Enabling workers can settle/refund/report historical facts; it is itself an independently approved operation, not an innocuous health check.
6. **Historical reconciliation remains a separate financial task:** owner privately verifies each affected payment/refund/dispute in Razorpay and preserves immutable preimages/evidence/audit linkage. Follow MV005/MV006 approval plans; preserve successful Notes access while evidence is unresolved. Do not replay settlement, revoke history, choose a canonical row, enable the future complete unique index or issue compensation to make counts agree. MV006 canonicalization also needs the documented historical replay/retained-payment and future-reversal policy before any demotion.
7. **Native/device acceptance, separately approved:** provision SDK and verify supported actual Billing version, manifest/package/signing/runtime/R8 graph and a clean intended artifact. Use the approved India Play testing arrangement and genuine native choice tokens; no staging project is needed or authorized. Test both provider selections, ineligible countries, exact offers, cancellation/pending/duplicate callbacks, UPI background/process death, authenticated recovery, four scopes, existing purchases, refund/reversal, logout/login, restart/reinstall and accessibility. Production remains disabled; no AAB publication is authorized here.
8. **Final activation requires another explicit owner decision:** present exact reviewed source/schema/function hashes, Console evidence, native/device results, reconciliation outcomes, reporting receipts/monitoring and rollback procedure. Only then propose a controlled activation with a separate flag-change approval. This report authorizes no deployment, worker execution, financial test or flag change.

## Rollback strategy

Current rollback is simply retain the production disabled gate; this task deployed nothing. Local edits are individually reviewable against the start snapshot; never reset the whole dirty tree.

For a future approved rollout, record pre-deploy function/schema hashes and exports, gateway settings and rollback artifacts. Keep new-purchase routes off during failures. Prefer forward-compatible additive RPCs/guards and a reviewed prior safe function bundle; never roll back to a false-success/unauthenticated verifier merely to clear errors. A missing proof must remain pending/retryable, without new payment prompts. Preserve callbacks, authenticated owner recovery and durable reporting/reversal obligations for money already received.

Do not drop entitlement/financial tables, delete captures/reports/jobs, revert paid statuses, disable ownership protection or revoke legitimate purchases as a rollback. If schedules or reporting fail, retain facts and use an explicitly approved retry/backfill plan within program deadlines. Provider refunds/compensation and historical repairs require independent financial authorization. Coordinate schema/function compatibility before any rollback; the older recovery migration's proof must not overwrite MV003. Existing source/native runtimes and pending historical receipts must remain compatible.

**Exact remaining blockers:** owner-specific India enrollment/package/country/trust/support approval; active supported Play product/price mapping and native Billing version; missing production commitment/status/ownership/choice/recovery/reporting contracts; undeployed matching verifier/webhook/Play handlers and operational reporting/reversal workers; two historical order contradictions and one duplicate group with no approved provider-backed resolution; absent native build/device/payment/reporting acceptance. **Final decision: NO-GO. Keep production Buy Now disabled.**
