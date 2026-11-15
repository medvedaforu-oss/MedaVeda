# MedVeda production audit fix batch 1

Date: 12 November 2026 UTC. Scope: **AUD-009, AUD-010, AUD-012, AUD-014 only**.

**Local fixes and reviewed release candidates are complete. Nothing was deployed.** No production SQL mutation, payment/refund, notification send, secrets change, production setting change, or unrelated feature implementation occurred. Existing dirty and untracked work was preserved.

## Findings, reproductions, and fixes

| Finding | Observed before fix | Final behavior and regression |
| --- | --- | --- |
| AUD-009 | Exact downloaded webhook/helper accepted valid synthetic HMAC refund/open/lost-dispute events with SQL `unknown_payment`, returned 204, and wrote no durable inbox fact. Null/unrecognized RPC results were also acknowledged. | Authenticated inbox persists before provider lookup; only closed accepted outcomes acknowledge. Unlinked or unknown outcomes retry. Real handler/PostgreSQL tests cover early full refund/open/lost dispute, duplicates, handler reload, capture hold, later won dispute, and null/unknown results. |
| AUD-010 | Baseline handler returned 204 for unknown local order and amount mismatch; new regression observed zero capture/compensation rows. | Provider-authoritative capture persists independently. A service-only transaction locks/rechecks current order and capture before atomically publishing unique compensation plus disposition. Storage failures retry; attach/settle race cannot compensate a purchase already granted. Terminal compensation/reversal states are preserved. |
| AUD-012 | Actual SQL after the original 76 migrations: before `paid/success/proof=true/access=true`; marker-based fallback produced `refunded/reversed/purchase=success/proof=false/access=true`. Historical refunded order with successful purchase also reproduced signing access. | Full-refund fallback atomically reverses purchase/wallet/referral effects with capture marker. Settlement also invokes reversal for classified early reversals. Chargeback precedence includes both revoked purchases and classified lost facts, even after a failed reversal RPC. Note authorization excludes each refunded/reversed/compensated purchase's backing order/capture, protecting inconsistent historical rows without rewriting financial data. |
| AUD-014 | Exact deployed sender inserted recipient-free active public-feed content for a targeted request; regression returned 200 versus expected 400. | Broadcast-only sender rejects any supplied targeting property, including empty/null/invalid values, before inserts or token reads. Ordinary authorized broadcasts remain supported. No recipient-scoped feature or public-feed RLS redesign was added. |

The first baseline regression run produced 13 failing payment groups and the targeted-notification failure before code fixes. Original SQL marker/access reproduction was also executed before fixing it. Two initial review findings—stale compensation publication and chargeback wallet restoration—were reproduced before correction. A further classified-lost-fact/reversal-failure edge was reproduced in `evidence/audit-batch1-20261112/review-lost-red.log` and now passes.

## Verification

| Check | Result |
| --- | --- |
| Complete `supabase/tests/run-all.sh` | **PASS**, all 77 migrations, existing SQL suites, wallet/discount/payment concurrency, Play/billing regressions and 25-check webhook harness; new batch integration registered in this runner |
| Batch candidate real handler/provider GET/HMAC + PostgreSQL | **PASS**, 18 groups, plus refund/accounting/authorization SQL checks |
| Same batch cases against workspace handlers | **PASS**, including owner-authenticated recovery |
| Fresh production compatibility | **PASS**, all eight effective baseline RPC definitions and ACLs match the local rebuild before applying new migration |
| Migration repeatability | **PASS**, financial/catalog fingerprints unchanged on repeat application |
| Targeted mobile/backend Node commands | **58/58 PASS**; exact commands/exit codes in evidence `node-results.json` |
| Candidate targeted-notification rejection/broadcast/admin gate | **PASS**, all eight targeting cases rejected with zero inserts/token reads |
| Local push delivery regression | **PASS**; existing MFA/ticket behavior retained locally |
| Mobile TypeScript | **PASS**, no emit |
| Admin application + Node TypeScript | **PASS**, no emit |
| Deno local relevant entrypoints + worker | **PASS**, cached/frozen dependencies |
| Deno three exact candidate entrypoints | **PASS**, cached/frozen release lock |
| Release checksums and identical payment helper copies | **PASS** |
| Scoped whitespace check | **PASS** |

Actual provider HTTP, Auth and push transport are synthetic. PostgreSQL transactions and signature code are real. No native-device, hosted mutation, real provider settlement/refund or notification-delivery acceptance is claimed. Historical rollout-specific tests needing their own old-schema runners were not claimed as standalone Node passes; the current full database suite and this batch's deployed-schema integration were run with their required local environment.

Commands, with a disposable local PostgreSQL 17 Unix socket:

```sh
env -i PATH="$PATH" HOME="$HOME" PGHOST=/tmp/medveda-batch1-pg PGPORT=55447 PGUSER=postgres bash supabase/tests/run-all.sh
env -i PATH="$PATH" HOME="$HOME" PGHOST=/tmp/medveda-batch1-pg PGPORT=55447 PGUSER=postgres AUDIT_BATCH1_ROOT=supabase/functions python3 supabase/tests/run-audit-batch1-local.py
P0_RELEASE_ROOT=supabase/releases/audit-batch1-20261112/candidate/send-push-notification node supabase/tests/p0-notification-selftest.cjs
node supabase/tests/p1-push-delivery-selftest.cjs
node mobile-app/node_modules/typescript/bin/tsc -p mobile-app/tsconfig.json --noEmit --incremental false
node admin-panel/node_modules/typescript/bin/tsc -p admin-panel/tsconfig.app.json --noEmit --incremental false
node admin-panel/node_modules/typescript/bin/tsc -p admin-panel/tsconfig.node.json --noEmit --incremental false
```

Deno commands and exit codes are recorded in evidence `verification-results.json`; the 58 Node commands are enumerated separately. Logs are retained under `docs/audit/evidence/audit-batch1-20261112/`. Earlier temporary audit logs were cleared between turns; decisive original before-fix outcomes are recorded above and in this session's tool results. The final runs were repeated into repository evidence.

## Exact changes

Incremental modifications to pre-existing files (their earlier dirty changes belong to the existing workspace):

- `supabase/functions/_shared/settle.ts`: marker-only full refund becomes atomic reversal RPC; unmatched capture compensation becomes locked/rechecked RPC.
- `supabase/functions/send-push-notification/index.ts`: reject even null targeting property; correct broadcast request comment.
- `supabase/tests/p0-notification-selftest.cjs`: add null/scalar targeting rejection cases.
- `supabase/tests/razorpay-security-selftest.cjs`: mock the new queue RPC result.
- `supabase/tests/settle-timestamp-selftest.cjs`: mock the new queue RPC result.
- `supabase/tests/run-all.sh`: register this batch's release-handler/PostgreSQL regression runner.

New implementation/test files:

- `supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql`
- `supabase/tests/audit-batch1-selftest.cjs`
- `supabase/tests/audit-batch1-refund.sql`
- `supabase/tests/run-audit-batch1-local.py`

New documentation:

- This report.
- `docs/superpowers/plans/2026-11-12-audit-batch1.md`
- Every evidence file listed in `docs/audit/evidence/audit-batch1-20261112/files.sha256`.

New isolated release directory: `supabase/releases/audit-batch1-20261112/`. Its `manifest.json` and `checksums.sha256` enumerate every baseline/candidate source, frozen dependency file, SQL copy, deployment plan, provenance file and source archive. The manifest/checksum files themselves are additional release metadata. Seven candidate files differ from downloaded deployed source:

- `candidate/razorpay-webhook/functions/_shared/settle.ts`
- `candidate/razorpay-webhook/functions/_shared/supabaseAdmin.ts`
- `candidate/razorpay-webhook/functions/razorpay-webhook/index.ts`
- `candidate/verify-payment/functions/_shared/settle.ts`
- `candidate/verify-payment/functions/_shared/supabaseAdmin.ts`
- `candidate/send-push-notification/functions/_shared/supabaseAdmin.ts`
- `candidate/send-push-notification/functions/send-push-notification/index.ts`

The three `supabaseAdmin.ts` changes pin the existing locally tested SDK to 2.118.0. Deployed source used the broad `@2` specifier; the historical resolved remote SDK bytes cannot be inferred from a source download. No library was installed/upgraded in the application workspace. The verifier entrypoint, provider GET/signature implementations, browser/mobile request and response formats, pricing and authentication/ownership gates remain unchanged within the deployed-derived candidates. The candidates deliberately exclude unrelated local UCB/checkout/sender changes.

## Deployed compatibility and migration requirement

Read-only production inspection confirmed webhook **v51**, verifier **v69**, sender **v51**, existing recovery table columns, notification public-read policy and the eight RPC definitions/ACLs. Bundle hashes/source closures are captured in the release inventory and baseline directories. The deployed signing handler uses the unchanged `user_can_access_note` contract and 120-second URL TTL.

One forward migration is required **before** the payment bundles. It creates service-only `reverse_refunded_capture(text)` and `queue_capture_compensation(text)`, and replaces only settlement and note-access definitions. It changes no table schema, RLS policy, price, purchase snapshot, schedule, setting or existing financial row. Do not push unrelated pending migrations.

## Review, deployment, rollback, remaining risks

An independent reviewer inspected the scoped code and deployment/rollback plan, identified material races, and re-reviewed their fixes. Final review: **no remaining material findings**. Review is source/plan review, not independent hosted acceptance.

The reviewed executable sequence, per-function staging details, approval gates, monitoring and rollback conditions are in `supabase/releases/audit-batch1-20261112/README.md`. Complete frozen candidate source archives and checksums are prepared. **Await explicit deployment approval; do not deploy automatically.**

Remaining limits:

- The deployed worker v3 does not drain provider-event/capture/compensation recovery. This batch relies on durable records, provider retries and a named operator. No automatic refund/worker/schedule activation is included. Queued compensation does not mean refunded; aged backlog must be owned before rollout.
- Existing signed URLs may work for 120 seconds; previously copied/offline PDFs cannot be recalled. Existing offline licenses can last seven days. This patch denies new paid signing requests; it does not solve AUD-008 offline encryption/revocation.
- Existing historical refund/accounting inconsistencies are denied by signing guards but not financially backfilled. Previously published targeted content cannot be reliably identified without recipient metadata; approved investigation/redaction is separate.
- Other audit findings, including deployed AUD-011, AUD-015 and AUD-016, remain open by scope. This batch does not establish overall production readiness.
- Hosted test acceptance and genuine provider/device journeys remain required before approving a public release. No such operations were authorized or executed here.
- Keep forward SQL guards and durable facts during rollback. Restoring unsafe baseline webhook/sender code reopens known findings; the plan explicitly requires incident approval and compensating operational controls rather than representing that as a safe routine rollback. Never roll back ledger data or regrant refunded access.
