# CI failure repair, 2026-11-17

Scope: local fixes only, based on origin/main d5536ed075422ccb54c7cfd609dfc829f9757fe1. Original audit-5 checkout and its uncommitted cleanup are preserved. No commits, hosted changes, or payment configuration changes are authorized.

## Investigation and verification plan

1. Compare runs 44053878493 and 42471059333, including failures hidden by earlier failing steps.
2. Retain revoked deletion RPC grants; update the stale assertion and exercise actual role denial plus the existing caller-bound, fail-closed deletion handler test.
3. Forward only PGPASSWORD/PGPASSFILE in the isolated Python runner. Test against disposable local PostgreSQL 17 with SCRAM authentication.
4. Resolve the UI harness compiler from the source package and install locked mobile dependencies in database CI, retaining all legacy payment regressions.
5. Update stale analytics mocks to the server snapshot contract. Move arithmetic/completeness assertions to actual SQL, with course and MFA denial checks.
6. Execute CI commands, record every failure and blocker, inspect the final diff and original checkout preservation. Stop before commit/push/deploy.

## Coverage changes

No tests removed. The old analytics client-pagination assumptions are replaced by SQL aggregation checks for >1000 rows, 0.10 + 0.20 exact paise totals, paid-only totals, status counts, course filtering, empty results and admin/MFA authorization. Client tests retain snapshot/error handling and order status UI coverage. The account deletion suite now tests the intended revoked client access, rather than requesting restoration of a bypass around the rate-limited endpoint. The existing delete-account-rate-limit handler test is added to run-all.sh.

Results and final proposed commit inventory will be recorded after verification.

## Root causes and classification

| Failure | Classification | Evidence and correction |
|---|---|---|
| `delete_my_account wrapper missing or exposed to anon` | Stale test, not evidence of an authorization exposure | `20261114040000_fix3_content_push_and_delete_guards.sql` deliberately revoked PUBLIC/anon/authenticated execution. The function still exists. Preserve the revocation and assert actual permission denial for authenticated/anon; service-only erasure remains available. Existing erasure fixtures still check other users are untouched, anonymous financial retention, admin refusal, retry and late-capture compensation. Run the caller-bound, fail-closed deletion endpoint regression in CI. |
| `fe_sendauth: no password supplied` in audit batch1 | Incorrect harness environment configuration | Python constructed an allowlisted child environment without PGPASSWORD. Forward only optional PGPASSWORD/PGPASSFILE while retaining the explicit local-host restriction. Workflow already supplies the disposable postgres service password; no production credential is needed. |
| Database Node `MODULE_NOT_FOUND` | Missing dependency caused by CI configuration | Database job set up Node but never installed its locked TypeScript dependency. Actual handler harnesses use mobile-app's compiler, directly or through ui-harness. Install with `npm ci --prefix mobile-app`. No tests are removed. |
| Admin `Cannot find module 'typescript'` | Incorrect shared harness module resolution | Admin installs its own compiler, but shared mobile ui-harness previously eagerly required the mobile compiler. Resolve from the source package, falling back to the backend harness's mobile compiler. Admin-only dependency installation was verified before mobile installation completed. |
| `supabase.rpc is not a function` | Stale analytics mocks | Analytics now calls `get_admin_analytics`; old tests mocked `.from()` pagination. Production SQL aggregates exact numeric paise under `am_i_admin()`; restoring client aggregation would regress completeness/authorization behavior. Test the RPC boundary and use real SQL for arithmetic, >1000-row completeness, course filtering and MFA/student/anon denial. |
| Internal profile expected `same-project` | Stale configuration assertion | Main already uses production target/Razorpay. Assert that existing contract; preserve staging-disabled and production-key rejection checks. |
| Firebase and Notes configuration expected `disabled` | Stale tests following existing Razorpay restoration | Update expectations to current main, retain explicit disabled mode and retired Play rejection. Keep all native legacy choice/receipt recovery regressions. No app configuration changed. |
| Internal Razorpay config needed a private Firebase file | Incorrect test fixture configuration | Supply a synthetic validated Firebase client per package, clean it on exit, and resolve EAS inherited profiles in the test. No real Firebase file or payment credentials are required. |
| Local passfile integration authentication failure | Incorrect adapter environment configuration | The Deno database adapter retained PGPASSWORD but dropped PGPASSFILE under `clearEnv`. Add PGPASSFILE to its narrow allowlist. Targeted 10 actual-handler/PostgreSQL tests passed with SCRAM/passfile authentication. |

No broken production implementation or new business logic/security defect was established by these failures. Production functions, migrations, grants, credentials, activation and prices are unchanged.

The missing compiler affects these retained database harnesses: billing-recovery-worker, notes-choice-order, settle-timestamp, google-reporting, play-consumption, recovery, play-reconcile-fairness, compensation-worker, play-payment-worker, play-catalog-worker, play-catalog-creation, play-service-account-diagnostic, play-order, play-verification, audit-login-body, audit-push-policy, p1-push-delivery, mv004-recovery, razorpay-routing, razorpay-security, content-url-publication, p0-reversal and p0-notification. The added delete-account-rate-limit harness uses the same installed compiler. These are dependency/configuration failures; they do not justify deleting historical financial/recovery coverage.

## Current versus previous run

Read-only GitHub CLI metadata identified these commits:

- Current [44053878493](https://github.com/medvedaforu-oss/MedaVeda/actions/runs/44053878493): d5536ed075422ccb54c7cfd609dfc829f9757fe1. Failed database, mobile quality selftest and admin financial selftest. Passed quality, website, Edge Functions and secret scan.
- Previous [42471059333](https://github.com/medvedaforu-oss/MedaVeda/actions/runs/42471059333): 54c33cbbc0c9c21eaa66f8bf2be285bd2e46e1f8. Failed quality on duplicate imports in RouteErrorBoundary, mobile on npm audit (13 findings, 3 high), and both database/Edge during Deno setup (Edge log records HTTP 504). Admin, website and secret scan passed.

The new analytics RPC, later deletion revocation, audit-batch runner and additional CI selftest steps postdate the previous commit. Their stale assertions/environment gaps are newly introduced since that run. The missing database dependency installation is inherited CI configuration: the previous workflow also had no install, but its Deno setup failure masked downstream results. The current admin compiler-resolution failure is newly observed in an added CI step. Previous lint and high-severity audit failures do not reproduce in the current local checks. The current audit still reports three moderate mobile findings (@expo/fingerprint, expo, minimatch), below the unchanged high threshold; admin reports none. No blanket audit suppression or forced dependency upgrade was applied.

Full current database job logs could not be re-downloaded after environment restart because GitHub's temporary Azure blob log endpoint was unreachable. Current step metadata and the failure excerpts inspected earlier are available; previous individual quality/mobile/Edge logs were saved. Distinguish unavailable logs from test success.

## Verification evidence

Evidence logs are stored outside proposed commit contents in `build/ci-evidence/` of the original checkout. Some early attempts were interrupted or used incomplete npm installs; only completed final commands count.

| Check | Result |
|---|---|
| Locked admin/mobile/tooling dependency installs | PASS; mobile final install exit 0, 651 packages |
| Admin `npm run build` | PASS, TypeScript + Vite |
| Admin `npm test` | PASS, including pagination, diagnostic authorization, wallet/referral checks |
| Admin financial UI selftest | PASS, RPC snapshot/error validation and read-only provider states |
| Mobile workflow tests | PASS, all 32 non-install/non-audit command steps, including TypeScript and 30/30 closed-testing suites |
| Quality `npm run lint --prefix tooling` | PASS, exit 0 |
| Website build and links | PASS, 17 pages checked; generated sitemap dates reverted |
| Every Edge index + PDF worker `deno check` | PASS |
| CI Edge Deno suites | PASS, 19 tests, zero failures |
| Secret scanner selftest and tracked-file scan | PASS |
| Admin npm audit high threshold | PASS, zero findings |
| Mobile npm audit production high threshold | PASS, zero high/critical; three moderate findings remain |
| All database migrations and SQL suites | PASS, including deletion, new analytics, grants/MFA, payment settlement, isolation and legacy Play checks |
| Non-Play handler/PostgreSQL integration with passfile | PASS, 10 tests, zero failures |
| Full final database suite | PASS, `ALL SUITES PASSED`, exit 0 (`database-complete.log`) |
| Optional Android JS export | BLOCKED, timeout 180 seconds after Metro startup, exit 124; no native build performed |
| Original audit-5 status and tracked binary diff | PASS, byte-for-byte comparison against captured baseline |

## Exact proposed commit contents

Proposed title: `fix(ci): restore isolated harness dependencies and current security contracts`

Only these files are proposed. Nothing is staged or committed:

1. `.github/workflows/ci.yml` — install locked mobile compiler dependencies in database job.
2. `admin-panel/scripts/p1-financial-ui-selftest.cjs` — current analytics RPC/error contract; retain order UI assertions.
3. `mobile-app/scripts/ui-harness.cjs` — source-package compiler resolution.
4. `mobile-app/scripts/firebase-config-selftest.cjs` — existing production provider expectation.
5. `mobile-app/scripts/notes-billing-choice-selftest.cjs` — existing provider gates; retain legacy billing/recovery behavior tests.
6. `mobile-app/scripts/razorpay-internal-test-selftest.cjs` — synthetic Firebase configuration and inherited EAS fixtures.
7. `mobile-app/scripts/staging-build-selftest.cjs` — existing internal profile target expectation.
8. `scripts/p2-quality-selftest.cjs` — current analytics RPC boundary.
9. `supabase/tests/account_deletion_checks.sql` — revoked client grants and actual role denial.
10. `supabase/tests/admin_analytics_checks.sql` — new real financial/authorization SQL regression coverage.
11. `supabase/tests/run-all.sh` — execute analytics SQL and deletion rate-limit regression.
12. `supabase/tests/run-audit-batch1-local.py` — narrow PostgreSQL authentication forwarding.
13. `supabase/tests/support/nonplay_test_db.ts` — passfile forwarding for disposable integration adapter.
14. `docs/audit/CI_FAILURE_REPAIR_20261117.md` — this report.

Excluded: original audit-5 edits/Markdown cleanup, package manifests and lockfiles, migrations, generated bundles/sitemap changes, evidence logs, private local database passfile and databases. No test was removed or skipped. Optional development commands do not alter the workflow audit thresholds.

## Review

Independent reviewer reported no findings after checking every changed code file and the new SQL suite. Reviewer separately reran financial UI, deletion rate-limit and internal Razorpay harnesses successfully. No obsolete regression suites were removed.

## Remaining limits and release recommendation

The optional local Android JavaScript export exceeded its explicit 180-second limit after Metro startup (exit 124). No native APK/AAB build, signing, device acceptance, real payment, hosted migration or deployment was performed. This does not invalidate passing mobile CI TypeScript/regression checks, but it prevents declaring the Android release artifact ready. Mobile audit retains three moderate findings; the existing CI high threshold remains enforced. A fresh GitHub Actions run of these uncommitted changes remains unperformed by instruction.

- Website: **GO for the local CI checks**; build and all page links passed. Publishing remains outside authorization.
- Admin: **GO for the local CI checks**; build, tests, financial contract and high-threshold audit passed. Deployment remains outside authorization.
- Mobile: **GO for the 32 CI test steps**, **NO-GO for release certification** until a successful native/release artifact build and device/payment acceptance. The optional JS export timeout is explicitly unresolved.
- Database: **GO for local CI verification**; the complete migration, SQL, concurrency and handler run passed with exit 0. **NO-GO for hosted migration/deployment**: this patch contains no production migration and does not certify hosted schema state.

No commit, staging, push, merge, force operation, hosted Supabase change, production migration, payment credential/activation/pricing change, or infrastructure modification was made.

Reproduction (from isolated worktree): `npm ci --prefix admin-panel`, `npm ci --prefix mobile-app`, `npm ci --prefix tooling`; then run `.github/workflows/ci.yml` commands in their specified directories. For database verification use only a disposable PostgreSQL 17 superuser on loopback, with PGHOST/PGPORT/PGUSER and either PGPASSWORD or a private PGPASSFILE, then `supabase/tests/run-all.sh`. The local test server used port 55439 and SCRAM; no hosted Supabase connection was used. PostgreSQL documents these libpq authentication settings in its [environment-variable reference](https://www.postgresql.org/docs/current/libpq-envars.html).

## Final verification result

`database-complete.log` ends with `PASS webhook-harness (25 checks)`, `ALL SUITES PASSED`, `EXIT=0`. This is the completed whole-run result after all code changes; earlier interrupted/incomplete logs are not used to claim success. Independent targeted passfile integration also passed 10/10 tests. The existing workflow PGPASSWORD path is forwarded by the same narrow environment construction; the additional standalone password-only repeat was interrupted and is not claimed as a separately completed test.

Final original-checkout preservation: audit-5 remains the checked-out branch; porcelain status and tracked binary diff match the baseline byte-for-byte. Exactly 12 tracked files plus the two new files in the inventory are proposed, with no staged changes. The worktree is `/home/ganeshp8545/AyurPulse/build/ci-actions-fix` on `ci/actions-fix-durable`.
