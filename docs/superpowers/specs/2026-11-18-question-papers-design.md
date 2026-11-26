# MedVeda Full Subject Question Papers — proposed design

Status: conditionally approved by the user and implemented locally, 2026-11-18.
No remote migrations or deployments authorized. See the verification report for final file paths and limits.

## Scope and checkout

Implement in `/home/ganeshp8545/AyurPulse`, branch `audit-5`, initial HEAD
`d5536ed075422ccb54c7cfd609dfc829f9757fe1`. The IDE's CI report belongs to
the separate `build/ci-actions-fix` worktree; leave that worktree untouched.
The initial checkout has 301 grouped Git status entries (311 with all untracked
files expanded). Preserve every
pre-existing change, deletion, and untracked file.

Baseline: `docs/audit/question-papers-20261118/initial-git-status.txt` and
`initial-file-hashes.json` in that directory. A binary tracked-change backup
is at `/tmp/medveda-question-papers-initial.patch`; do not commit that backup.

## Approaches

Recommended: separate Question Paper metadata, private storage, student screens,
PDF viewer/download flow, and Admin management. Read existing academic catalog
data and call existing authorization checks without changing their behavior.
This fits the additive-only requirement.

Reusing Notes records, Notes uploads, or the Notes PDF viewer is rejected:
those paths have entitlement, trusted-upload, encryption, and download behavior
that must remain untouched. Public PDF URLs are rejected because unpublished
papers would remain directly accessible.

The user approved this isolated approach with ten mandatory protection conditions.

## Student experience

Insert one new FeatureCard immediately after the Quick Access heading in
`mobile-app/src/screens/home/HomeScreen.tsx`, before PDF Notes. Preserve all
other Home content byte for byte, including Year Cards and their callbacks.

Flow: Question Papers → Academic Year → Subject → examination year/month →
paper selection, if multiple types/numbers → full subject PDF preview/download.
Use the current course for the academic year list; show all active years in
that course. Subjects come from the selected year. No chapter field or chapter
navigation exists in this module.

Proposed access default: signed-in students may read published papers under
active course/year/subject catalog entries, without a purchase requirement.
Do not read or write subscriptions, purchases, prices, or entitlements.
Students cannot read drafts or mutate metadata/storage. Anonymous access denied.

New routes are registered alongside the existing signed-in routes without
changing route guards. Dedicated native and web PDF viewers use the installed
PDF/platform libraries. Download is an explicit action with a platform-specific
save flow and failure feedback, independent of the existing Downloads module.
Do not change global screenshot protection or offline encryption.

Lists and viewers include loading, empty, error, retry, and back states.
Ignore stale requests after selection/account changes. Refresh publication
access before issuing URLs; handle expiry with retry. Signed PDF links expire
after 120 seconds; already issued links may work until expiry after unpublish.
Downloaded copies cannot be revoked.

## Admin experience

Add a separate `/question-papers` route inside the existing ProtectedRoute and
AdminLayout; add a Sidebar link without changing existing entries.

Management supports course context, academic year, subject, exam year, month,
optional paper type/number, PDF upload, preview, edit, delete, publish/unpublish,
search, filters, and paginated results. Course/year changes clear dependent
selections. New papers default to unpublished. Explicitly confirm deletion.
Report failed mutations and preserve form inputs; disable repeat submissions.

PDFs use a new bucket only, immutable unique object names, and no upsert.
Validate PDF MIME, signature, and size (50 MiB maximum). Replacement uploads
first; update metadata only after successful upload. On metadata failure,
remove only that newly uploaded object if safe. Never delete a previous PDF
before a replacement has been saved. Retain detached objects for later
separately authorized cleanup, avoiding partial-failure data loss.

Delete removes only the selected Question Paper metadata record, withdrawing
student access. No existing data or existing storage objects are deleted.

## Data and isolated access rules

One new `public.question_papers` table: UUID id; existing subject reference
(text id); examination year (1900–9999); month (1–12); optional normalized
paper type and number represented as non-null trimmed strings; immutable PDF
object path; published flag; created/updated timestamps. Derive academic year
and course from subject joins rather than trusting redundant client values.
Use non-cascading foreign keys; do not add columns or constraints to existing
tables. Reject invalid subject/year combinations in the new service/server path.

Unique database key on subject, examination year, examination month, normalized
paper type and number prevents concurrent duplicates. Client checks improve
feedback; the database remains authoritative. Add indexes only on the new table.

New table policies: published/catalog-visible reads for authenticated students;
all metadata management requires the existing `public.am_i_admin()` predicate,
including its existing MFA requirement. Never redefine that function or change
authentication, authorization, or existing RLS policies.

New private bucket `question-papers` with a PDF MIME allowlist and 50 MiB limit.
Add uniquely named storage policies scoped to that bucket, allowing Admin
uploads/reads and student reads only when the object is referenced by a visible,
published paper. New restrictive guards must evaluate true for other buckets.
Existing storage policies remain unchanged. Review their combined behavior in
local tests; stop if isolation would require changing an existing policy.
Do not permit replacement of referenced objects. Store object paths, never
public URLs. Generate short-lived signed URLs through authorized Storage APIs.

One new local migration only. Generate its filename with the local Supabase CLI
when available; no remote connection, migration application, or production SQL.
Fail on conflicting pre-existing resource definitions rather than overwriting.

## Proposed file-level implementation sequence

1. Backend and access tests:
   - New `supabase/migrations/<CLI timestamp>_question_papers.sql`.
   - New `supabase/tests/question_papers_checks.sql`: role denial, Admin/MFA,
     publication, catalog scope, duplicate races/constraints, foreign keys,
     private storage, and unrelated bucket access preservation.
   - New `scripts/question-papers-scope-check.py`: compare baseline and assert
     product edits are limited to the approved integration files/new resources.
2. Admin module:
   - New `admin-panel/src/features/question-papers/types.ts`, `service.ts`,
     `QuestionPapersPage.tsx`, and `QuestionPaperForm.tsx`.
   - New `admin-panel/scripts/question-papers-selftest.cjs` using existing
     harness patterns for filters, validation, CRUD failure, duplicates, upload
     replacement, pagination and stale requests.
   - Minimal additions only to `admin-panel/src/App.tsx` and
     `admin-panel/src/components/Sidebar.tsx`.
3. Student module:
   - New `mobile-app/src/features/question-papers/service.ts`, `types.ts`,
     `QuestionPaperYearsScreen.tsx`, `QuestionPaperSubjectsScreen.tsx`,
     `QuestionPaperSessionsScreen.tsx`, `QuestionPaperPdfScreen.native.tsx`,
     `QuestionPaperPdfScreen.web.tsx`, and platform download helpers if needed.
   - New `mobile-app/scripts/question-papers-selftest.cjs` covering course/year
     scoping, complete session grouping, publication failures, PDF expiry,
     preview/download and preservation of existing Home card callbacks.
   - Minimal additions only to `mobile-app/src/navigation/AppNavigator.tsx`,
     `mobile-app/src/types/navigation.ts`, and the Home Quick Access insertion.
4. Verification and reporting:
   - New `docs/audit/question-papers-20261118/verification.md` records every
     module file, commands, results, baseline comparison and remaining limits.
   - Run new harnesses, both TypeScript checks, relevant existing Home/navigation,
     PDF and Admin regressions; run SQL tests on a disposable local database.
   - Check source and status against initial hashes; existing modified/deleted
     files outside the five approved integration files must match the baseline.
   - If local infrastructure is unavailable, report the exact unverified tests;
     do not substitute remote tests or claim end-to-end completion.

Before implementation, turn this file map into the task-by-task implementation
plan after design approval, with exact test commands and interface signatures.
Read the project's required Expo v57 docs and current Supabase docs before code.
No dependency or configuration changes are planned. If a platform save API or
authorization requirement needs a protected change, stop and seek approval.

## Execution boundaries

Do not deploy, publish, push, apply remote migrations, build release APK/AAB,
activate payments, edit old migrations, or change any protected business logic.
Do not stage or commit existing user changes. The module is locally integrated
after implementation; backend availability requires a separately authorized
migration application. This document records a proposal, not completed work.
