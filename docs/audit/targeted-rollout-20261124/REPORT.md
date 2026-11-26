# MEDVEDA targeted corrections and safe rollout preparation — 2026-11-24

**Both Admin findings corrected. Release HOLD.** No production writes, migration application, Edge/Admin deployment, cron/payment activation, catalog writes, purchases, builds, credential replacement, commits or pushes occurred. Existing user changes/deletions were preserved. No production records or Storage objects were exported.

1. **Corrections.** P2: billing view returns authoritative `p.revision AS product_revision`; service validates revisions; page and table require equality with displayed revision, discard superseded responses, hide status during list refresh/errors and refresh products on mismatch. Existing optimistic revision RPC/locking and server Admin/MFA authorization remain. P3: concise form guidance explains Notes/Notes bundle billing and referral eligibility, verified readiness, legacy classification review and free videos.

2. **Exact changed source/test/config files:**

   - `admin-panel/package.json`
   - `admin-panel/src/pages/Products.tsx`
   - `admin-panel/src/services/playBillingSyncService.ts`
   - `admin-panel/src/types/playBilling.ts`
   - `admin-panel/src/components/ProductTable.tsx`
   - `admin-panel/src/components/ProductFormModal.tsx`
   - `admin-panel/scripts/product-readiness-selftest.cjs`
   - `admin-panel/scripts/product-readiness-race-selftest.cjs`
   - `admin-panel/scripts/product-classification-selftest.cjs`
   - `admin-panel/scripts/batch2-selftest.cjs`
   - `supabase/config.toml`
   - `supabase/migrations/20261124064112_admin_catalog_readiness_and_revisions.sql`
   - `supabase/tests/admin_catalog_remediation_checks.sql`

   Additional generated evidence, reports, code snapshots, SQL compensation and frozen archive live only in `docs/audit/targeted-rollout-20261124/`. Existing terminal recovery migration and existing product-concurrency test were used unchanged.

3. **Validation.** Admin TypeScript, full Admin lint/build and standard npm test passed. Four billing/classification regression scripts are now part of npm test. The initial new readiness tests failed on the missing authoritative revision and remote price mismatch, then passed after correction. Coverage: changed price/publication, remote concurrent edit, out-of-order/delayed response, missing/invalid/mismatched revisions, failure/unmount, legacy classification/bundle behavior. Existing request/auth races and batch2 passed. Local SQL readiness/revision/authorization, terminal recovery and MFA suites passed (MFA 23/23); real concurrent sessions produced one accepted edit and one revision conflict. Three required Edge candidates typechecked; five focused billing test suites passed, including 48 standalone cases. Expected injected-failure logs in worker tests are covered assertions, not test failures. See checks.json and final-verification.json. The batch2 fixture initially lacked new productRevision values; it was corrected and passed. No unresolved observed test failures.

4. **Independent review.** A separate reviewer found no additional actionable issue in the two corrections and reviewed the compensating SQL against captured live definitions/grants. Hosted authenticated behavior is not claimed tested. The new race test mocks useProducts; real scope handling was statically reviewed and existing request-race tests passed. See independent-review.md.

5. **Backup.** Existing account confirms PITR=false/backups=[]/WAL-G=true. Safest available owner-controlled path is native pg_dump plus separate object and configuration/code preservation; no paid service needed. Measured DB 20.3 MiB, 62 objects/318.1 MiB. Estimate 0.6–1 GiB per complete backup, 1–2 GiB with encrypted duplicate; require >=5 GiB persistent encrypted workspace for backup/restore. Current root has only ~1.7 GB free. No recoverable production backup was taken. See backup-and-restore.md for exact approval-dependent commands and coverage checks.

6. **Recovery.** Owner-approved isolated Supabase/PostgreSQL 17 environment, compatible extensions/roles, outbound provider traffic blocked, schedulers/payment/mail disabled. Validate schema/Auth/RLS/grants/RPCs/triggers, financial snapshots/records/entitlements, all object paths/bytes/hashes/ownership, deployed bundles/JWT settings, external Auth/secrets configuration and current Admin artifact. Actual production-data/object restore remains mandatory. Prepared compensating SQL preserves revision/MFA and financial records; both scripts passed synthetic clone rehearsal only. Current Admin deployment retained as dpl_GD4eQfZLfUdo7cxY3L2VeUvdFexF at admin.medveda.in; metadata alone is not a full artifact backup.

7. **Existing diagnostic.** Current hosted Admin → sign in as authorized Admin and finish MFA → Settings → Google Play service account identity (temporary) → Verify service account identity. Require HTTP 200 **and service_account_matches_expected=true**. Return only those fields. Expected email/cloud project remain unconfirmed until then; no key/token reading is required. Local cleanup removed the temporary control, so use current hosted Admin before rollout. Details in owner-runbook.md.

8. **Google owner actions.** Check existing medveda-play-billing Cloud project/IAM identity, Android Publisher API, Play app in.medveda.app, app and Billing permissions, current one-time products/BUY options with exact India/INR prices. Identity diagnostic does not prove Google API/catalog authority. No replacement credentials, product creation or catalog PATCH retry. License testers/track and unused versionCode are prerequisites for later separately authorized testing/builds, not actions performed here. See Google's API setup reference in owner-runbook.md.

9. **Only pending migrations, in order:** 20261124063324_play_terminal_recovery.sql; 20261124064112_admin_catalog_readiness_and_revisions.sql. Readiness migration updated in place. 86 hosted applied versions compared. No extra migration created or applied.

10. **Required functions:** verify-standalone-play-purchase (JWT=true, user/QA gate, V2 receipt/option/commitment/duplicate proof); verify-play-purchase (JWT=true, same changed validation/duplicate proof for legacy callers); play-payment-worker (JWT=false, server secret, consumption/reconciliation/void recovery). All required shared dependencies captured. report-external-transaction excluded: mixed alternative-billing/Razorpay workflow, not needed for standalone; not currently deployed. create-standalone-play-order live entrypoint unchanged, no redeploy needed. Existing Razorpay unchanged. CLI 3.1.0 syntax verified: --remote=xbvenkfmesugrbjuufyw; exact future commands in owner-runbook.md. Nothing deployed.

11. **Configuration.** Missing PLAY_STANDALONE_TEST_ENABLED and PLAY_STANDALONE_TEST_USER_IDS are necessary for this approved tester lane but must remain unset until separately authorized. Existing Google config names and PLAY_PAYMENT_CRON_SECRET are present; values/identity/API access and scheduler alignment remain unverified. Missing UCB_REPORT_CRON_SECRET is not a standalone blocker; do not add it. Missing UCB_SENTRY_DSN is optional alerting with log fallback. Global sales gate, authorized QA identity, exact-price fresh catalog readiness and package correctness must be satisfied for later checkout without altering Razorpay behavior. Full necessity matrix in owner-runbook.md.

12. **Remaining blockers.** Approved encrypted export and successful isolated production-data/object/config recovery; successful runtime identity diagnostic and Google permission/catalog checks; intentional QA enable/allowlist configuration; coordinated revision migration and matching Admin deployment; exact separate deployment authorization. Full live Play sales are outside this tester candidate. Source freeze and local tests do not authorize cron/payment activation or purchases. Candidate has 297 verified files; manifest/archive hashes and relative dependencies match current validated source. The archive remains HOLD.

13. **Exact next owner action.** Run the existing hosted Admin identity diagnostic and return only HTTP status plus service_account_matches_expected. Then approve a specified encrypted destination with >=5 GiB free and an isolated restore environment if confidential backup/export validation should proceed. Do not send credentials or student information.
