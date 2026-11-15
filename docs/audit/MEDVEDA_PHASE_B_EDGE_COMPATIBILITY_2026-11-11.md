# MedVeda Phase B Edge compatibility — 2026-11-11

**B1 / B2 / B3: LOCAL VERIFIED for the reviewed production baseline plus exactly Phase A A1/A2/A3. Production delivery: NOT DEPLOYED / NOT VERIFIED. Production rollout: BLOCKED pending operational prerequisites and separate authorization. Buy Now remains disabled.**

This is a local compatibility/security package, not payment readiness or deployment approval. No migration/function deployment, production record write, financial reconciliation, gate/price change, staging access, real payment/recovery/webhook/worker invocation or website/admin edit occurred. All pre-existing working-tree files remain unchanged; the exact new-file inventory is linked below.

## 1. Independently inspected baseline

Read the production preflight, Phase A final safety review and operator runbook, and every MV003–MV012 report (including MV007's qualified billing-removal status). Inspected broad local sources, focused tests, retained migrations, deployed source-map modules and fresh production metadata independently.
Fresh production schema/bundle evidence: **2026-11-11T04:30:28.328284+00:00**. Target: `xbvenkfmesugrbjuufyw`, MedVeda, ACTIVE_HEALTHY, ap-northeast-2. All pinned sections match the Phase A final snapshot, including 66 migration versions through `20261104110000`, 126 public function hashes/ACLs/owners/configuration, financial columns/constraints/indexes/RLS/grants/triggers, catalog price distribution, minimized historical aggregates, cron state, 17 function metadata entries and seven sampled bundle hashes. A1/A2/A3 objects remain absent. [Drift comparison](evidence/phase-b-20261111/baseline-diff.json), [schema evidence](evidence/phase-b-20261111/production-readonly.json), [read-only role/configuration evidence](evidence/phase-b-20261111/production-safety.json).
Production metadata access used only fixed-project Management API GETs and SQL with `read_only:true`, explicit `BEGIN TRANSACTION READ ONLY`, bounded statements, SELECT and ROLLBACK. The observed role is `supabase_read_only_user` and read-only is on. Provider/Auth financial routes were never contacted. No project secrets were printed or retained. Raw ESZIPs and full function-definition inspection stayed under private `/tmp/medveda-phase-b-deployed`; repository evidence retains source hashes, schema metadata and synthetic test logs.

| Function | Deployed baseline | Gateway JWT | Deployed ESZIP SHA-256 |
| --- | --- | --- | --- |
| verify-payment | v68 | false | `58de9c73ac117519954b14424ca8423ca0e73040bd4a734f17ead149c1956389` |
| razorpay-webhook | v50 | false | `26deb8b909151f385bc91d09d2be7a466e47376bc6e15689d0a876b192cf4c51` |
| create-order | v23 | true | `3e793ac2aa958fc77b8210d5b154c9fe555a5825016d5dd7b695ef6dad2e7677` |

The deployed callback/webhook share the same old helper, which accepts a non-error void settlement return as success. Deployed unsigned recovery has no owner authentication. Deployed create-order has three unconditional failure updates. These observations establish the patch need; none of the deployed bundles is certified by this report.

## 2. Narrow candidate behavior and status

| Candidate | Local status | Implemented compatibility/security behavior |
| --- | --- | --- |
| B1 verify-payment | LOCAL VERIFIED | Reuses MV004 actual Auth.getUser verification and owner-filtered unsigned recovery. Missing/expired/forged JWT returns 401; foreign/missing orders share 404. Signed callbacks retain real Razorpay HMAC and work without JWT. Success requires MV003 exact committed proof, provider capture/order/INR/amount checks and matched local order. Compensation/reversal never returns success; transient outcomes remain pending/error. Legacy successful JSON fields retained. |
| B2 razorpay-webhook | LOCAL VERIFIED | Retains exact raw-body HMAC verification, optional previous-secret support and authenticated durable inbox. Uses the same hash-identical candidate MV003 helper as B1. Real SQL handles idempotent capture/refund/dispute transitions. Only committed grants, durable compensation/reversal outcomes and correctly ignored authenticated events receive acknowledgement. Transient/mismatched capture outcomes and unknown-payment refunds/disputes return retryable failures. |
| B3 create-order | LOCAL VERIFIED | Based on the freshly extracted deployed source, with the same website request and success response. All three failure writes add `status=created`. Existing JWT and SQL-authoritative pricing retained. Preserves local Android header rejection and rejects future UCB-choice input without importing choice/test routes. |

B1/B2 retain the reviewed MV003 proof calls before/after settlement, historical committed-purchase skip, missing-entitlement failure, capture/compensation classification and historical failed/cancelled-success manual-review branch. The shared helper is a **compatibility extraction**, not byte-identical to the broad local helper: only undeployed Notes-choice authorization, external-reporting calls/closure and `blocks_entitlement` writes are removed; unknown refund/dispute outcomes additionally fail closed. The exact proof RPC is unchanged. Both candidates import the **same reviewed extracted helper**; neither substitutes a void-return success heuristic. [Exact helper projection diff](evidence/phase-b-20261111/_shared_settle.ts.diff).

Removed reporting calls are absent from these deployed baseline bundles. No deployed reporting behavior is replaced. Existing separate reporting/worker bundles are untouched. This package does not implement future Notes-choice/UCB reporting architecture or authorize new Android purchases. No `notes_choice_*`, `ucb_transaction_time`, `external_report_test_purchase`, `record_notes_choice_authorization` or `provider_events.blocks_entitlement` dependency remains. The helper's retained `external_transaction_token` selection is already present in the target schema; it introduces no new choice behavior.

Historical successful purchases and Notes readers are unchanged. A historical successful purchase attached to a failed/cancelled order is preserved and returns manual-review failure rather than replaying accounting or queuing compensation. Historical paid purchases without capture markers retain proof and skip destructive settlement replay. Existing duplicates remain separate historical records; no repair or canonicalization occurs.

B3 keeps ordinary website callers unchanged (`productId`, optional `useWallet`, no app-version header); body monetary fields cannot set the charge. An Android header is a routing boundary, not reliable platform attestation: omitted headers cannot prove a client is a website. Existing client/provider disabled gates remain essential. No website source was edited. Anonymous unsigned recovery is intentionally incompatible and remains rejected; legacy clients must authenticate recovery or use a valid signed callback. B1 does not apply new-purchase gates to existing purchases.

## 3. Exact artifacts, inventories and hashes

Isolated release root: `supabase/releases/phase-b-20261111/`. Broad implementations under `supabase/functions/` are byte-for-byte preserved. No deployment script was added.

[Complete manifest](../../supabase/releases/phase-b-20261111/manifest.json) records each function's entire transitive import list, every source hash, external packages/integrities, configuration, environment prerequisites, archive hash and local compiled-output hash. [Checksums](../../supabase/releases/phase-b-20261111/checksums.sha256) cover every release file. Closure SHA-256 hashes the sorted UTF-8 lines `SOURCE_SHA256  relative/source/path\n` for all files in that candidate's TypeScript import closure.

| Candidate | Entrypoint SHA-256 | Complete source-closure SHA-256 |
| --- | --- | --- |
| B1 | `4c99c5ca0b6568741448977165ebb2558f57e8b0173e38cafab7dd7c1450372a` | `37a01ae11a163433c77ab150e6600ef66235837f3c077661ec9f091c09e5dfe8` |
| B2 | `a9d1221581b3c5955e2020c39dc440b48cd4bafe3db1d6a18e4bf2366103a9d4` | `62612f9abd52e11e859e1988c32d781b4f0eed6e5cb9d197e8b6e9a3f9f9545c` |
| B3 | `63221e542d583f6b77c2c1703a3f1cb7f49d7aff5226aa2e95c2def27e4b4398` | `0cb977cf0e7df3fda5bf90905da23107d5fbc7247e4e114c93f9684270cc99a1` |

Exact source inventories (paths relative to the release root):

| Source | Used by | SHA-256 |
| --- | --- | --- |
| `functions/_shared/cors.ts` | B1, B3 | `b39957920ab50ff2f51fe20f64adb8ad90ed0db99c2076a938af9f0418f22c5f` |
| `functions/_shared/rateLimit.ts` | B1, B3 | `931d0ed483595b6aa4c7ea72ea2768390f9e5e75cde10f4bcd5d225db54e2ea3` |
| `functions/_shared/razorpay.ts` | B1, B2, B3 | `66ba2463606862b57daaaff1bb029bf640fbe066b7f422baed93f653d2ca6f77` |
| `functions/_shared/settle.ts` | B1, B2 | `c16b4238ba56512a9ebb48f76111f9040c8d6e809b7889afc132071d6aeec3da` |
| `functions/_shared/supabaseAdmin.ts` | B1, B2, B3 | `8e3eb8faf1f9e568820a4b701524433d5c4758ee01f2488c97b6eb6d69c6d791` |
| `functions/_shared/ucbAlert.ts` | B1, B2 | `c1b7ebba7ed4a75ad3570ac4b9c2998d87d6e1974375c91d176d8b42ca298ef8` |
| `functions/create-order/index.ts` | B3 | `63221e542d583f6b77c2c1703a3f1cb7f49d7aff5226aa2e95c2def27e4b4398` |
| `functions/razorpay-webhook/index.ts` | B2 | `a9d1221581b3c5955e2020c39dc440b48cd4bafe3db1d6a18e4bf2366103a9d4` |
| `functions/verify-payment/index.ts` | B1 | `4c99c5ca0b6568741448977165ebb2558f57e8b0173e38cafab7dd7c1450372a` |

Each source archive contains only its own entrypoint, the listed transitive shared modules, its single-function `supabase/config.toml`, and the isolated `deno.json`/`deno.lock`. Archives contain no migration, unrelated entrypoint or deployment helper.

| Archive | SHA-256 |
| --- | --- |
| `supabase/releases/phase-b-20261111/artifacts/B1-verify-payment-source.tar` | `e1d0ede56f0eeb873492b639a86ca8b81e723cd08c5c3f81bba7c34a357f5ab1` |
| `supabase/releases/phase-b-20261111/artifacts/B2-razorpay-webhook-source.tar` | `c7e04f3fad722e73e030d453112ff429a8f8280f987a9e726d3acd0b75000d4a` |
| `supabase/releases/phase-b-20261111/artifacts/B3-create-order-source.tar` | `72e5c74183d814a3a54cc4819647951f429e935925d3c612b1b976d4a086a9ef` |

Shared configuration hashes:

| File | SHA-256 |
| --- | --- |
| `config.toml` | `096f81b769cd161462aa37b3a953192f94bc46792d72ea861f642650906315fd` |
| `deno.json` | `c8db67544fd9a052ae87a644e256402e0a380f2bec03943f79eedfad40d60378` |
| `deno.lock` | `46a8cce8704f9a42b532dd1a96b6e6bf8f92d414d9be97e604c128bea7652ade` |

The only runtime external import is `npm:@supabase/supabase-js@2.118.0`, already pinned in the current repository. The isolated frozen lock contains nine packages: Supabase client/Auth/Functions/PostgREST/Realtime/Storage 2.118.0, Phoenix 0.4.5, iceberg-js 0.8.1 and tslib 2.8.1. Their full versions, dependency edges and integrity digests are in the manifest. Deployed source uses floating `@2`; the candidate pin makes the dependency resolution explicit and is a runtime compatibility risk to review separately from SQL. Actual Auth/SQL transports in handler tests are synthetic adapters; no hosted SDK integration acceptance is claimed.

## 4. SQL dependency matrix

Target is current production **plus exactly** A1 → A2 → A3. No November 8/9 migration or future ownership-index maintenance is included.

| Required object/contract | Candidate | Source / expected behavior |
| --- | --- | --- |
| `razorpay_entitlement_committed(text,text)` | B1/B2 | A1: service-only boolean SECURITY DEFINER exact order/payment/purchase/snapshot proof; no capture marker required for compatible history; compensation and unresolved reversals deny proof |
| `guard_razorpay_order_transition()` / `orders_03_razorpay_transition` | B1/B2/B3 indirectly | A2: terminal/captured order transition protection; conditional B3 updates avoid invalid regressions |
| `guard_purchase_success_ownership()` / `purchases_zz_success_ownership` | B1/B2 indirectly | A3: shared advisory ownership lock, fresh READ COMMITTED check, duplicate/restoration prevention, retained historical exceptions |
| `settle_razorpay_payment(text,text,text,bigint,timestamptz)` | B1/B2 | Existing void-return service-only RPC; delegates to retained legacy routine; normal return alone never proves entitlement |
| `record_payment_capture(text,text,bigint,timestamptz)` | B1/B2 | Existing durable idempotent capture fact |
| `record_provider_event(...)` | B2 | Existing authenticated inbox; immutable payload hash / event identity; no blocks_entitlement column |
| `handle_payment_refund(...)`, `handle_payment_dispute(...)`, `reverse_payment(...)` | B2 | Existing service-only reversible accounting/access contracts; actual status result parsed; unknown outcomes retry |
| `create_priced_order(uuid,text,boolean)` and legacy pricing | B3 | Existing SQL-authoritative catalog/discount/wallet pricing and immutable order snapshot |
| `rate_limit_hit(text,integer,integer)` | B1/B3 | Existing limiter; recovery fails closed when limiter is unavailable |
| orders / purchases / payments | B1/B2/B3 | Existing owner/product/amount/provider references, scope snapshot and statuses; current RLS/service grants and unique provider/order indexes retained |
| payment_captures / payment_compensations / provider_events | B1/B2 | Existing capture states, compensation queue and authenticated inbox; no new columns |
| profiles / products | B3 | Existing profile identity/course/block and active-product/course columns |
| wallet ledger, referral/discount reservations, identity hashes, review flags, webhook event tables | RPC transitive dependencies | Existing baseline accounting routines and triggers, preserved verbatim |
| `user_can_access_note` and publication/MFA helpers | Preservation checks | Existing Notes authorization unchanged; real SQL access/restoration checks pass |

[Full SQL dependency closure](evidence/phase-b-20261111/sql-dependency-closure.json) contains **37** exact normalized definition SHA-256s and call/trigger edges. All 34 pre-existing reachable definitions match fresh production; the other three are exactly Phase A. The scan includes trigger functions attached to written tables, strips comments/literals before finding calls, and the relevant source was also inspected for dynamic execution/external side effects. Managed `auth.uid`/`auth.jwt` and PostgreSQL/pgcrypto primitives remain platform dependencies reproduced with the existing local stub; they are not new SQL objects.

The retained baseline dump's `normalize_phone(text)` lacks production's existing search_path and has different body line endings. `supabase/tests/support/phase_b_production_normalize_phone.sql` reproduces the exact freshly read production definition locally before tests. It is explicitly a **local baseline fixture, not a fourth migration or deployment prerequisite**. The corrected 37-definition comparison passes byte-hash checks. An initial overinclusive scanner treated a `delete_my_account()` comment as a call; stripping comments/literals corrected that false edge. No payment dependency was waived.

Exact Phase A source prerequisites:

| Order | Migration | SHA-256 |
| --- | --- | --- |
| A1 | `20261110100000_mv003_razorpay_entitlement_commitment.sql` | `82ae7f73d32c44b0fa627b3d1f33777ce7a2d41f0aef6c25826704ac8898dc0b` |
| A2 | `20261110120000_mv005_razorpay_order_transitions.sql` | `f266859f080e200cffad9ae17b833faa4ac9302d78ed4d641c6c750564984730` |
| A3 | `20261110130000_mv006_purchase_ownership_guard.sql` | `6c6e8704a424e1c0689dcbd3bd8c6ac5bf92ea48e76b2ff0c7cbdd6721609e4c` |

## 5. Handler, SQL and regression results

**Final combined local runner: PASS, 228 PASS lines/notices.** Counts describe suite groups/assertions, not native/provider end-to-end tests. **26 additional checks PASS**: 25 focused Node suites and mobile TypeScript. [Actual handler/SQL log](evidence/phase-b-20261111/local-acceptance.log), [additional results](evidence/phase-b-20261111/regression-results.json).

The runner creates a unique scratch database on PostgreSQL 17.11 at `/tmp/medveda-phase-a-final/socket:55471` with TCP disabled. It loads only the retained baseline through `20261104110000`, the exact observed baseline normalization definition and synthetic fixtures, then exactly A1/A2/A3 (each twice for repeatability). Financial/catalog fingerprints remain unchanged across prevention migrations. It never forwards hosted credentials. The database is dropped in `finally`; the test cluster is stopped after completion.

Candidate handlers, shared settlement, Razorpay cryptography, Auth-header helper, CORS, rate limiter and provider helper are executed from actual isolated candidate source. Candidate database operations execute real SQL under **service_role with its request role claim**; fixture construction/corruption uses the privileged local test connection. Supabase/Auth transport and provider HTTP are synthetic and fail on unexpected network behavior. Synthetic provider POST is allowed only for the in-memory order-creation response, never as a real network request. HMAC uses real Node/Web Crypto with synthetic secrets; JWT signatures/expiry are validated by a synthetic Auth fixture called through the actual Auth-header helper.

| Requested coverage | Final result |
| --- | --- |
| Actual B1/B2/B3 handlers on baseline+A1/A2/A3 | PASS; real SQL/ACL/trigger behavior, no undeployed contracts |
| Valid signed callback without user JWT | PASS; committed entitlement and legacy success fields |
| Owner unsigned recovery | PASS; valid authenticated owner recovers capture-only interrupted settlement |
| Missing/expired/forged JWT; raw token/Basic scheme; Auth outage | PASS; 401 before order/provider/settlement |
| Wrong-owner and missing order; forged body user ID | PASS; identical 404 and owner-filtered query; provider never reached |
| Invalid callback HMAC; exact raw webhook HMAC; tampered payload | PASS; rejected before provider/inbox; real cryptography |
| Captured payment with exact successful purchase, all four scopes | PASS; matched owner/product/amount/provider/course/snapshot |
| Void compensation-only settlement | PASS; callback never succeeds; webhook acknowledges only durable queue/reversal |
| Granted marker but missing/wrong purchase; missing/erroring proof RPC | PASS; false success prevented; pending/retryable response |
| Provider capture status/order/amount/currency mismatch | PASS; no commitment or acknowledgement of unresolved capture |
| Duplicate callback/webhook; concurrent settlement | PASS; one purchase/accounting grant; exact same webhook bytes replayed |
| Partial/full refund webhook and duplicate | PASS; partial retains proof; full revokes and cannot regrant |
| Dispute open/won/duplicate/lost | PASS; access suspension/restoration/reversal, exact proof follows state |
| Refund arriving before local settlement | PASS; pending inbox and retryable failure, no lost acknowledgement |
| Historical paid purchase with no capture marker | PASS; proof retained, destructive settlement replay skipped |
| Historical failed/success contradictions and duplicate ownership | PASS; rows/Notes access preserved; manual review required; no reconciliation |
| Actual B3 failure branches × created/paid/refunded | PASS; nine cases, real conditional updates; terminal order rows byte-identical |
| Order-status races; duplicate ownership/restoration races | PASS; independent PostgreSQL sessions; transactional rollback and retry checks |
| Website API fields and ₹1/₹2/₹5 price fixtures | PASS; exact legacy success field inventory, body amount ignored, server-authoritative prices |
| Android app header and future choice input | PASS; rejected without new orders; client purchase gates remain disabled |
| MV003/MV004/MV005/MV006 | PASS; existing and candidate-focused SQL/handler regressions |
| MV007–MV012; Notes/purchases; payment-disabled Android | PASS; focused Node suites, no native execution |
| TypeScript and dependency checks | PASS; Deno 2.9.7 frozen/cached checks, mobile TypeScript, nine-package closure |
| Local build and standalone archives | PASS; Deno bundled 53 modules for three outputs; all archives independently extracted/type-checked |
| Artifact checksums; preservation; diff whitespace | PASS; final preservation and diff evidence linked below |

Commands (local only, no deployment):

```sh
PGHOST=/tmp/medveda-phase-a-final/socket PGPORT=55471 PGUSER=postgres python3 supabase/tests/run-phase-b-local.py
python3 docs/audit/evidence/phase-b-20261111/run-regressions.py
python3 docs/audit/evidence/phase-b-20261111/validate-archives.py
sha256sum -c supabase/releases/phase-b-20261111/checksums.sha256
git diff --check
```

Local source check/build commands run inside `supabase/releases/phase-b-20261111`:

```sh
deno check --cached-only functions/create-order/index.ts functions/verify-payment/index.ts functions/razorpay-webhook/index.ts
deno bundle --platform deno --packages external --no-remote functions/create-order/index.ts functions/verify-payment/index.ts functions/razorpay-webhook/index.ts --outdir /tmp/medveda-phase-b-build
```

[Build log](evidence/phase-b-20261111/bundle-build.log), [Deno check](evidence/phase-b-20261111/deno-check.log), [independent archive checks](evidence/phase-b-20261111/archive-validation.log). Bundling emits JavaScript for local validation; these outputs are not hosted Supabase ESZIP deployment artifacts. Reviewed source archives remain the release candidates.

Initial test-launcher issues were corrected without weakening assertions: overlapping synthetic IDs were separated; the PG-dependent history suite was moved to the database runner; duplicate webhook fixtures now reuse identical signed bytes; dependency parsing ignores SQL comments and the observed normalization definition is reproduced exactly. Sandbox DNS/socket restrictions were resolved with narrowly scoped escalations for read-only metadata, a local socket and compiler package download. The automatic approval review for local database shutdown timed out without execution; its permitted single retry succeeded. No action remains blocked by automatic approval.

## 6. Function configuration and deployment prerequisites

B1 gateway `verify_jwt=false` is required for JWT-free signed callbacks; unsigned recovery authenticates inside the handler. B2 gateway `verify_jwt=false` is required for Razorpay HMAC webhooks. B3 retains `verify_jwt=true` and handler Auth verification. Changing these to a blanket setting would break legitimate callers or weaken authentication. Each archive contains its exact single-function configuration.

Runtime requires injected `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, existing correct live Razorpay ID/secret, and explicit `APP_ENV=production`. `ALLOW_TEST_MODE` cannot bypass that provider-mode check. B2 additionally requires the correct webhook secret and optionally the previous secret for the existing retry window. `UCB_SENTRY_DSN` is optional best-effort alert transport for B1/B2; it has no schema dependency. No secret was set or changed; configured secret correctness is NOT VERIFIED by local fixtures. CORS behavior remains the current shared contract.

Before any future rollout: retain current raw bundle/config preimages privately; independently verify source/config/archive hashes and the complete import closure; inspect fresh production schema/ACL/index/trigger/cache drift; establish service-role execution and READ COMMITTED writer compatibility; verify exact A1/A2/A3 delivery with independent read-only metadata. Current baseline alone is insufficient for B1/B2. A missing proof RPC fails closed but would interrupt verification/recovery, so it is not an acceptable planned deployment state.

## 7. Remaining blockers, risks and owner actions

No deterministic local compatibility requirement remains failing. Production rollout remains **BLOCKED** by unproven current recoverability, absent Phase A delivery and absent separate production authorization. The earlier review observed PITR disabled/no listed managed backups and only incomplete historical managed-Auth restore evidence. This session did not refresh backups or prove a recovery procedure. Existing evidence is not deployment approval. Owner must supply a current recovery point and demonstrate compatible application/Auth/Storage-metadata restoration in isolation, with object/config/secrets recovery references, RPO/RTO and financial/provider handling after a restore point.

Other practical limits: local PostgreSQL 17.11 differs from hosted 17.6; managed Auth/PostgREST/cache/DDL hooks are stubbed or unexecuted; native Android/device/provider/Google acceptance is unverified. SDK pinning, legacy unsigned recovery's intentional 401, possible webhook retries for unresolved mismatches and alert configuration require operator review. No actual HTTP SDK transport, installed website checkout, Google reporting or physical-device purchase is certified. Proof establishes exact commitment at its database snapshot; later authenticated refunds/disputes can change access. Existing two failed-order/success contradictions and the historical duplicate group remain unresolved owner decisions.

Required **future** order, subject to new authorization (not executed here):

1. Owner resolves recovery/restore evidence, names privileged operator/independent observer and approves exact artifacts/window; perform a fresh read-only drift review.
2. Follow the separately reviewed Phase A process: exactly A1 → A2 → A3, with atomic DDL/ledger recording and independent read-only postchecks. No broad November 8/9 file sweep.
3. Review/authorize B1 → B2 → B3 separately, using only these complete function-specific source archives/configurations after proving the Phase A contracts. Recheck gateway settings and cache visibility; do not use production financial probes.
4. Keep Android purchases disabled. Do not proceed to payment activation, compliance/reporting rollout, worker scheduling or historical reconciliation automatically.

Fail-safe/rollback: stop rollout and keep disabled gates and additive SQL guards on any drift, type/config mismatch, elevated errors, ambiguous deployment outcome or changed existing access. Preserve immutable financial records and pending authenticated inbox/compensation facts. Before a deployment commits, abort the release if prerequisites fail. After delivery, prefer a reviewed forward correction; no automatic function rollback, SQL inverse, worker invocation or financial replay is authorized. Restoring old B1/B2 bundles would restore unauthorized recovery/false-success behavior and is not a safe default rollback. A B3 rollback would lose conditional failure updates/Android routing protection even though A2 still guards terminal states. Any rollback needs an independently reviewed, hash-pinned safe version, current dependency/config checks and separate owner approval. Never disable guards, restore financial tables, delete migration history or force a grant to make an error disappear.

## 8. Exact task-attributable changed files

Every task-attributable repository file is new; no pre-existing source/report/config/migration/test was overwritten. [Complete path inventory](evidence/phase-b-20261111/changed-file-inventory.json) enumerates the exact report, release, test and evidence files. [Preservation evidence](evidence/phase-b-20261111/preservation.json) compares the initial snapshot against every pre-existing file. The release manifest/checksum list provides the complete reviewable source inventory; evidence generation scripts and all final logs are retained.

New executable/test sources:

- `supabase/releases/phase-b-20261111/functions/verify-payment/index.ts`
- `supabase/releases/phase-b-20261111/functions/razorpay-webhook/index.ts`
- `supabase/releases/phase-b-20261111/functions/create-order/index.ts`
- `supabase/releases/phase-b-20261111/functions/_shared/{cors,rateLimit,razorpay,settle,supabaseAdmin,ucbAlert}.ts` (six explicit paths in the manifest)
- `supabase/tests/run-phase-b-local.py`
- `supabase/tests/phase-b-dependencies-local.py`
- `supabase/tests/phase-b-handlers-selftest.cjs`
- `supabase/tests/phase-b-recovery-selftest.cjs`
- `supabase/tests/phase-b-history-selftest.cjs`
- `supabase/tests/support/phase_b_production_normalize_phone.sql` (local baseline fixture only)

New configuration/artifacts: isolated `config.toml`, `deno.json`, `deno.lock`, `manifest.json`, `checksums.sha256` and the three source tar archives listed above. Other new files are this report and the exact evidence-directory inventory. No mobile, website, admin-panel, existing migration or broad Edge Function change is attributable to this session.

Owner next action: review these local candidates and evidence while leaving purchases disabled; resolve recovery prerequisites before requesting any production authorization. **No production deployment or payment readiness is claimed.**
