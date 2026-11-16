# Isolated create-order gate fix — local verification, 2026-11-16

Follow-up: [completed local regression verification](NONPLAY_GATE_VERIFICATION_20261116.md) resolves the database-fixture, Edge-suite and mobile execution blockers recorded below. This document retains the original implementation-time results; it is not the final verification status.

Implemented locally. Database verification is incomplete; this is not a deployment or payment activation approval.

## Behavior and scope

`nonplayTestHandlers.ts` no longer imports or calls the production `newOrdersEnabled` helper. Only isolated creation reads the server environment variable `NONPLAY_TEST_NEW_ORDERS_ENABLED`. It must equal exactly `"true"`; missing, false, malformed and throwing/unavailable reads return HTTP 403 with `sales_disabled`. The check follows package/Auth verification and precedes eligibility RPCs (including rate-limit writes), body reads, reservations and provider work. It is evaluated per request.

The broader isolated configuration gate, environment/project binding, test credential validation, allowlists, protected app_metadata/database eligibility, ownership, server pricing, signature/capture validation and settlement logic remain unchanged. Verification, recovery and refund webhooks do not read the create-only variable. Their existing authorization and global isolated gate still apply.

No production handlers, `newOrderGate.ts`, migrations, hosted records, secrets or switches were changed. Production `purchase_settings.new_orders_enabled=false` was left untouched, without a hosted read to reconfirm its value. No deployment, APK/AAB build or live payment occurred. No private credentials were read or printed. All provider/Auth fixtures use synthetic values and mocked HTTP.

## Exact files changed by this task

1. `supabase/functions/_shared/nonplayTestHandlers.ts` — replace shared production sales check with the dedicated, fail-closed create gate.
2. `supabase/tests/support/nonplay_test_db.ts` — remove the fixture that forced production sales true; the adapter now rejects every non-isolated table.
3. `supabase/tests/nonplay-test-integration.ts` — use the dedicated gate in fixtures; add creation-disabled verification/recovery/refund/replay coverage; strengthen payment ID and provider account/product/order binding rejection.
4. `supabase/tests/nonplay-create-gate-test.ts` — new tests against actual handlers/config/provider/HMAC with synthetic database/Auth/HTTP transports, requiring no permissions or database.
5. `scripts/nonplay-test-secrets.example.env` — document the new server-only variable with a disabled default; all credential placeholders remain empty.
6. `docs/audit/NONPLAY_CREATE_GATE_FIX_20261116.md` — this report.

Pre-existing working-tree changes were preserved: `mobile-app/src/services/paymentService.ts`, `mobile-app/scripts/nonplay-test-isolation-selftest.cjs`, `mobile-app/scripts/nonplay-provider-security-selftest.cjs`, `mobile-app/docs/audit/RAZORPAY_ISOLATED_TEST_RESTORATION_20261116.md`, and `docs/audit/MEDVEDA_APP_AUDIT_20261114.md`. They are not changes authored for this task. The first two diffs were compared before/after and are identical.

## Test evidence

- RED: the initial 12 gate regressions failed against the original handler: authorized creation was blocked by the false production switch; denial paths touched production settings. An initial test type error was corrected before this behavioral RED run.
- GREEN: `deno test --cached-only supabase/tests/nonplay-create-gate-test.ts` — **17 passed, 0 failed**. Covers exact true success with a false production fixture, ten absent/malformed/false cases, unavailable environment access, zero body/database/provider work on gate denial, and continued verification/recovery/refund processing with five disabled/unavailable gate states. These are transport-level tests; they do not establish PostgreSQL entitlement correctness.
- `deno check --cached-only` for all five isolated entrypoints plus the two isolated test files — passed. The database integration file was checked again after its final edit.
- `cd mobile-app && ./node_modules/.bin/tsc --noEmit` — passed.
- `cd mobile-app && npm run test:password-recovery` — passed: 26 tests, plus 24 password pattern checks with zero failures.
- Five Deno regression programs passed: `payment-gate-selftest.ts`, `razorpay-env-selftest.ts`, `razorpay-refund-selftest.ts`, `razorpay-order-recovery-selftest.ts`, `payment-backlog-load-selftest.ts`. Run with `deno run --cached-only --allow-env` under an environment containing only PATH, so environment fixtures could not inspect inherited private values; no network permission was granted.
- Thirteen Node Edge regression suites passed: `razorpay-security`, `razorpay-routing`, `notes-choice-order`, `play-order`, `play-verification`, `play-body`, `billing-recovery-worker`, `recovery`, `mv004-recovery`, `mv005-create-order`, `mv006-restoration`, `phase-b-recovery`, `p0-reversal` (each `supabase/tests/<name>-selftest.cjs`).
- `git diff --check` — passed.

The targeted mobile run passed 24 of 25 suite invocations. Passing scripts (`mobile-app/scripts/<name>-selftest.cjs`): `nonplay-test-isolation`, `nonplay-provider-security`, `razorpay-internal-test`, `release-payments-disabled`, `payment-provider`, `payment-routing`, `payment-request`, `payment-poll`, `payment-verdict`, `payment-summary`, `payment-success-owner`, `checkout-security`, `purchases`, `notes-entitlement`, `notes-billing-choice`, `mv004-recovery`, `mv007-billing-boundary`, `mv008-ownership`, `mv009-store`, `mv012-history`, `razorpay-live-testing`, `same-project-build`, `wallet-terms`, `wallet-expired-ui`.

The `closed-testing-selftest.cjs` aggregate runner failed to spawn Node children (`spawnSync /usr/local/bin/node EPERM`) and was stopped at the 25-second timeout. Before timeout it reported spawn failures for: `android-release`, `auth-recovery`, `login-network`, `login-submit`, `auth-state-race`, `deep-link`, `course-state-race`, `course-year-selection`, `course-year-confirmation`, `course-year-picker-race`, `notes-open`, `notes-entitlement`, `pdf-lifecycle`, `pdf-remote-retry`, `offline-owner`, `offline-download`, `download-actions`, `purchases`. These are runner permission errors, not successful executions of those child tests. All 30 children were subsequently invoked directly; results follow.

Direct closed-testing child execution: **22 passed; 8 timed out at 30 seconds**. Timed-out scripts: `auth-recovery-selftest.cjs`, `login-network-selftest.cjs`, `auth-state-race-selftest.cjs`, `deep-link-selftest.cjs`, `course-state-race-selftest.cjs`, `course-year-selection-selftest.cjs`, `course-year-confirmation-selftest.cjs`, `notes-entitlement-selftest.cjs`. `notes-entitlement` emitted a PASS assertion before timing out; its prior targeted invocation exited zero, but this later invocation did not complete. Other timeout logs contained no test verdict. These timeouts are unresolved and are not counted as passes.

Passing direct children: `android-release`, `login-submit`, `course-year-picker-race`, `notes-open`, `pdf-lifecycle`, `pdf-remote-retry`, `offline-owner`, `offline-download`, `download-actions`, `purchases`, `purchases-unavailable-ui`, `release-payments-disabled`, `quiz-editing`, `quiz-input`, `quiz-hooks`, `navigation-lazy`, `route-validation`, `load-resource`, `list-states`, `video-data`, `video-link`, `video-tap`.

## Failures and remaining blockers

The mobile aggregate spawn failure and eight direct-child timeouts above remain reported. Four broader Edge suites also failed; no controls or unrelated fixtures were changed to bypass them:

- `supabase/tests/phase-b-handlers-selftest.cjs`: startup assertion requires `PGHOST` under `/tmp/`; no initialized disposable test database was available.
- `supabase/tests/b-to-c-handlers-selftest.cjs`: same local database fixture prerequisite assertion.
- `supabase/tests/audit-batch1-selftest.cjs`: `local host required` fixture prerequisite assertion.
- `supabase/tests/phase-c-gates-selftest.cjs`: harness rejects `Unexpected import ../_shared/newOrderGate.ts` in a production entrypoint. Its mock map does not include that existing import. This task did not modify that entrypoint or test.

Database and SQL isolation tests were not run. The existing stopped cluster at `/tmp/medveda-checkout-pg` was started locally to inspect database names only; it contained only `postgres`, with no reusable initialized test database. A first sandboxed start failed due to socket permissions and the first connection used a nonexistent local role; the permitted local start and fixture postgres role succeeded. No records or schemas were changed. The cluster was no longer running at final inspection.

`run-nonplay-test-local.py`, `run-all.sh` and repeatability runners initialize schemas by applying migrations. They were deliberately not invoked because this task prohibits applying migrations. To finish SQL/PostgreSQL verification under the same restrictions, supply an already initialized, disposable local fixture database. Remaining unverified behavior includes actual SQL entitlement settlement/refund revocation, concurrent reservation/provider creation, database webhook replay idempotency, RLS and complete financial-table fingerprints. Existing SQL/integration tests cover these, but compilation or synthetic transports cannot replace executing them.

The broader mobile runner and type checks were restarted after intentional turn interruptions. A mistaken formatter path from the mobile working directory produced `No target files found`; formatting was rerun successfully from the repository root. Shell startup also emitted a user-bus permission warning; the subsequent non-login TypeScript run exited zero.

## Coverage boundaries

- Production shared gate false: exercised by the handler test's false settings fixture; the corrected handler never queries that table. No hosted gate was activated.
- Wrong account/product/amount/signature/payment: provider/HMAC and existing payment security harnesses passed. Stronger actual-PostgreSQL denial tests are added but remain unexecuted.
- Duplicate taps/retry identity and Play distribution boundaries: exercised by local mobile regressions. Header checks are routing hints, not device attestation; the server still requires verified Auth and protected server/database eligibility.
- Production financial records, existing users and Notes: no hosted write was attempted; the real PostgreSQL row-fingerprint proof remains blocked as described above.

## Final review

Self-reviewed the scoped diff and regression expectations. Fixed the new mismatched-payment fixture to keep the signed callback ID constant while changing the provider response ID; otherwise a genuinely different but correctly signed payment would have been incorrectly expected to fail. No production validation was relaxed. Final `git diff --check` passed; the new gate suite remained 17/17 green. No independent reviewer was used.

## Local rollback

Revert only the changes in the five implementation/test/example files listed above; delete the new gate test and this report if unwanted. Preserve all pre-existing mobile/audit work. For tracked files that had no pre-existing edits (`nonplayTestHandlers.ts`, `nonplay_test_db.ts`, `nonplay-test-integration.ts`, and the example env file), restoring their pre-task versions reverts the fix. Do not use a repository-wide reset or clean. No hosted rollback, migration rollback or secret/switch change is needed because none was performed. Restoring the old handler restores its dependency on the production sales gate and therefore blocks isolated creation while production sales remain false.
