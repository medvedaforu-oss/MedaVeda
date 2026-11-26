# Question Paper module — local verification, 2026-11-18

> Remediation addendum (2026-11-18): see [P1/P2 remediation](remediation.md) for server signing/byte validation, concurrency, revised lifecycle evidence, exact remediation inventory and current NO-GO gates. Statements below describe the earlier implementation and are superseded where the addendum differs.

Implemented locally under the approved additive-only design. No deployment, remote migration, production configuration change, release build, staging, commit or push was performed. The separate CI worktree is untouched.

## Result

- Students: first Quick Access card → academic year → subject → examination year/month → full subject PDF preview/download. Published papers are free for signed-in students; no purchase, subscription, payment or entitlement checks. No chapter-wise papers.
- Admin: separate Question Papers page with academic year/subject/course context, exam year/month, optional type/number, upload/preview, edit/replace/delete, publish/unpublish, search/filter and pagination.
- Resources: new metadata table and private question-papers bucket. Existing Admin/MFA predicate and catalog access policies are consumed unchanged. All new rows default to unpublished. PDFs use immutable paths, unique normalized identities and 120-second authorized signed URLs.
- Existing Home content, including Year Cards and existing Quick Access callbacks, is byte-identical after removing the single new card.

## Checks

| Command | Result |
| --- | --- |
| `python3 scripts/question-papers-scope-check.py` | PASS, exit 0 |
| `node admin-panel/scripts/question-papers-selftest.cjs` | PASS, exit 0 |
| `node admin-panel/scripts/question-papers-ui-selftest.cjs` | PASS, exit 0 |
| `node admin-panel/scripts/question-papers-form-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/question-papers-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/question-papers-ui-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/question-papers-download-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/navigation-lazy-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/audit-navigation-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/pdf-lifecycle-selftest.cjs` | PASS, exit 0 |
| `node mobile-app/scripts/pdf-remote-retry-selftest.cjs` | PASS, exit 0 |
| `npm test --prefix admin-panel` | PASS, exit 0 |
| `node mobile-app/node_modules/typescript/bin/tsc -p mobile-app/tsconfig.json --noEmit --pretty false` | PASS, exit 0 |
| `node admin-panel/node_modules/typescript/bin/tsc -p admin-panel/tsconfig.app.json --noEmit --pretty false` | PASS, exit 0 |
| `python3 supabase/tests/question-papers-local.py --regression` | PASS in disposable PostgreSQL 17 cluster |
| `git diff --check -- <five integration files>` | PASS, exit 0 |

SQL verification rebuilt every existing migration plus the new migration against the existing Supabase test stub. Before/after snapshots prove existing table definitions/grants, RLS policies, public function definitions/grants and bucket definitions unchanged. Overlapping duplicate-save transactions produce exactly one winner. Tests cover Admin upload/replace/delete, normalized identity (including tabs/newlines), invalid metadata, missing PDFs, immutable/referenced objects, student write denial, draft/unpublish/active-subject visibility, MFA denial, anonymous isolation and unchanged thumbnail access.

Existing SQL suites passed: `content_publication_checks`, `course_wide_browsing_checks`, `quiz_answer_and_admin_mfa_checks`, `admin_mfa_checks`, `high_phone_and_notes_checks`. Test fixture data and hosted Storage grant emulation are confined to disposable test databases; the product migration has no changes to existing table grants.

All six module harnesses passed. The Admin suite also verifies existing PDF/upload validation, mutations, pagination and legacy Notes management. Existing mobile tests verify lazy route registration/provider gates, account-bound navigation, PDF lifecycle and expired-link recovery. Both TypeScript projects compile without emitting artifacts.

Observed regression sequence: new service/SQL/download tests initially failed for missing resources. Additional tests reproduced then fixed preview clearing, replacement validation timing, rapid duplicate preview clicks, SQL whitespace normalization and web HTTP failure handling. Web downloader verifies HTTP status, PDF MIME/size/signature, and account/course scope before exporting a Blob.

## Independent review

One read-only reviewer inspected the module and original-state preservation. It found two P2 issues (SQL boundary whitespace normalization and web download error observability). Both were reproduced, fixed and rechecked; reviewer confirmed no outstanding findings. No review changes were delegated.

## Preservation

Initial HEAD: `d5536ed075422ccb54c7cfd609dfc829f9757fe1`, branch `audit-5`. Baseline records 3,088 pre-existing file states and 311 expanded Git status entries (301 grouped). All 3,083 states outside the five approved integration files remain exact, including absent/deleted files. The five integration files differ only by insertions. No existing authentication, security, RLS, payment, entitlement, encryption, Notes, Quiz, Videos or Downloads implementation was edited. No dependency/configuration/applied migration changes were made.

## Verification limits and resource lifecycle

- No Android/iOS device or browser E2E session was run. Native PDF rendering, Android folder chooser, iOS export menu and browser PDF embedding still require device/browser acceptance checks.
- SQL uses the existing local Supabase schema stub rather than a hosted Storage HTTP service. Hosted API behavior, CORS and deployment are unverified. No remote backend was contacted for testing. Documentation reads and an isolated CLI download were the only external setup operations.
- The migration was applied only to disposable test clusters. Existing configured hosted environments do not gain this table/bucket until a separately authorized migration application. Do not deploy the UI before preparing its backend under a separate approval.
- Unpublishing/deleting prevents subsequent authorized URL creation. Previously issued URLs can remain valid for 120 seconds; downloaded copies cannot be revoked.
- Replacement/deletion retains prior PDFs privately. Ambiguous save failures retain uploaded objects rather than risk deleting committed content. Any later orphan cleanup requires separate authorization. The iOS export menu retains its temporary free PDF in OS-managed cache so the menu can consume it.
- Full repository/financial/release suites were not rerun; no regressions were observed in the executed checks. This is local implementation verification, not production certification.

## File inventory (5 existing integration files, 38 new files)

Every file below belongs to this module or its audit/test artifacts. Pre-existing unrelated changes are excluded.

### Existing files — insertions only

- `admin-panel/src/App.tsx`
- `admin-panel/src/components/Sidebar.tsx`
- `mobile-app/src/navigation/AppNavigator.tsx`
- `mobile-app/src/screens/home/HomeScreen.tsx`
- `mobile-app/src/types/navigation.ts`

### New files

- `admin-panel/scripts/question-papers-form-selftest.cjs`
- `admin-panel/scripts/question-papers-selftest.cjs`
- `admin-panel/scripts/question-papers-ui-selftest.cjs`
- `admin-panel/src/features/question-papers/QuestionPaperForm.tsx`
- `admin-panel/src/features/question-papers/QuestionPapersPage.tsx`
- `admin-panel/src/features/question-papers/service.ts`
- `admin-panel/src/features/question-papers/types.ts`
- `docs/audit/question-papers-20261118/initial-file-hashes.json`
- `docs/audit/question-papers-20261118/initial-git-status.txt`
- `docs/audit/question-papers-20261118/integration-baseline/admin-panel/src/App.tsx`
- `docs/audit/question-papers-20261118/integration-baseline/admin-panel/src/components/Sidebar.tsx`
- `docs/audit/question-papers-20261118/integration-baseline/mobile-app/src/navigation/AppNavigator.tsx`
- `docs/audit/question-papers-20261118/integration-baseline/mobile-app/src/screens/home/HomeScreen.tsx`
- `docs/audit/question-papers-20261118/integration-baseline/mobile-app/src/types/navigation.ts`
- `docs/audit/question-papers-20261118/progress.md`
- `docs/audit/question-papers-20261118/verification.md`
- `docs/superpowers/plans/2026-11-18-question-papers.md`
- `docs/superpowers/specs/2026-11-18-question-papers-design.md`
- `mobile-app/scripts/question-papers-download-selftest.cjs`
- `mobile-app/scripts/question-papers-selftest.cjs`
- `mobile-app/scripts/question-papers-ui-selftest.cjs`
- `mobile-app/src/features/question-papers/PaperLayout.tsx`
- `mobile-app/src/features/question-papers/download.native.ts`
- `mobile-app/src/features/question-papers/download.web.ts`
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.native.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.web.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperSessionsScreen.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperSubjectsScreen.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperYearsScreen.tsx`
- `mobile-app/src/features/question-papers/service.ts`
- `mobile-app/src/features/question-papers/types.ts`
- `mobile-app/src/features/question-papers/usePaperPdf.ts`
- `mobile-app/src/features/question-papers/usePaperResource.ts`
- `scripts/question-papers-scope-check.py`
- `scripts/question-papers-verify.py`
- `supabase/migrations/20261118172019_question_papers.sql`
- `supabase/tests/question-papers-local.py`
- `supabase/tests/question_papers_checks.sql`

Raw local command output: `/tmp/qp-verification-results.json`, `/tmp/qp-verification.log`, `/tmp/qp-db-final.log`. Original tracked-diff backup: `/tmp/medveda-question-papers-initial.patch`. These temporary artifacts are not part of the change set.
