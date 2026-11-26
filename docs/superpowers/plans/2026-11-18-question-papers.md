# Question Papers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, task by task.

**Goal:** Integrate free full-subject papers for signed-in students and isolated Admin management.
**Architecture:** Independent table/private bucket with resource-scoped policies; separate UI/services. Existing catalog and am_i_admin are consumed unchanged. Only five existing integration files receive additions.
**Tech Stack:** Existing React, React Native/Expo 57, Supabase, TypeScript, PostgreSQL.
**Spec:** docs/superpowers/specs/2026-11-18-question-papers-design.md plus user's conditional approval, 2026-11-18.

## Global Constraints

All ten mandatory approval conditions apply. Published papers are FREE for all authenticated students. Preserve the 3,088-file baseline except HomeScreen.tsx, AppNavigator.tsx, navigation.ts, admin App.tsx and Sidebar.tsx. No old tables/migrations/security/payment implementations may change. Local development only; no deployment/release builds/remote database operations. No package/config changes, staging or commits. Work in approved audit-5 checkout to preserve its current behavior and dependencies.

## Review Focus

- Cross-account and course changes: invalidate stale reads and PDF capabilities in UI.
- Concurrent duplicate saves: unique normalized database identity plus useful errors.
- Replacement failure: old paper remains valid; uncertain writes never delete possibly attached PDFs.
- Unpublish/delete: next signed link denied; already issued 120-second links/downloaded copies persist.
- Storage policies: isolate this bucket without altering any unrelated resource's effective access.

### Task 1: Baseline, tests and isolated backend

**Files:** New migration `supabase/migrations/<timestamp>_question_papers.sql`; new `supabase/tests/question_papers_checks.sql`, `supabase/tests/question-papers-local.py`; new `scripts/question-papers-scope-check.py`.
**Interfaces:** question_papers(id uuid, subject_id text, exam_year integer, exam_month integer, paper_type text, paper_number text, object_path text, published boolean, created_at timestamptz, updated_at timestamptz). Private bucket question-papers. No redundant course/year fields.
- [x] Write SQL assertions for anonymous/student mutations, draft visibility, active catalog, Admin/MFA, normalized duplicate validation, object immutability, and unrelated policies.
- [x] Run against old local schema; expect missing question_papers.
- [x] Create new metadata table, constraints/indexes/trigger scoped to new table, RLS and private bucket policies. Use existing am_i_admin, no redefinition.
- [x] Run local migration chain plus SQL assertions; expect PASS. Runner accepts only loopback/scratch Unix socket and creates disposable database.
- [x] Scope checker compares recorded hashes and only permits five existing integration files; validates these diffs are additive.

### Task 2: Admin management

**Files:** New `admin-panel/src/features/question-papers/{types,service}.ts`, `QuestionPapersPage.tsx`, `QuestionPaperForm.tsx`; new `admin-panel/scripts/question-papers-selftest.cjs`. Add imports/route in App.tsx and one Sidebar entry.
**Interfaces:** listPapers(filters,page) returns rows/count; savePaper(input,file?,existing?) returns saved row; deletePaper(id), setPublication(id,published), paperUrl(id,download?) return authorized results. Catalog options consume existing getCourses/getYears/getSubjects unchanged.
- [x] Test validation, normalization, filtered pagination, upload isolation/upsert false, save/replace/error behavior, and URL authorization before signing. Run before module exists: expect missing implementation.
- [x] Implement metadata helpers and service; preserve old object on replacement; retain uploads on uncertain save error rather than risk data loss.
- [x] Implement accessible form and paginated list/search/filter UI, preview/download, confirmed delete, publish/unpublish, stale request cancellation.
- [x] Add only sidebar/route wiring. Run new harness, admin tests and TypeScript check; expect PASS or identify baseline failures.

### Task 3: Student flow and downloads

**Files:** New `mobile-app/src/features/question-papers/{types,service}.ts`, `QuestionPaperYearsScreen.tsx`, `QuestionPaperSubjectsScreen.tsx`, `QuestionPaperSessionsScreen.tsx`, `QuestionPaperPdfScreen.{native,web}.tsx`, `download.{native,web}.ts`, UI/hooks as needed; new `mobile-app/scripts/question-papers-selftest.cjs`. Three minimal integration edits: Home Quick Access card, new signed-in routes, new route types.
**Interfaces:** listPapers(subjectId) reads all published rows with pagination; groupSessions(rows) gives descending year/month; getPaperUrl(id,download?) rechecks published visibility then signs for 120 seconds. Screen route parameters carry IDs and display titles, never arbitrary PDF URLs.
- [x] Test full pagination, grouping, rejection of invalid IDs, unpublished denial before signing, account changes and failed downloads. Run before implementation: expect missing module.
- [x] Implement read-only service, reusable async request invalidation, catalog/screens, isolated viewers. Native download uses installed file APIs; web uses download signed response. No Notes/Downloads changes.
- [x] Add new Home card at position one and lazy signed-in routes/types. Assert original Home minus insertion equals baseline, Year Cards/callbacks unchanged.
- [x] Run module tests, navigation/PDF regressions and mobile TypeScript check; expect PASS or record exact baseline failures.

### Task 4: Review, regression and preservation

**Files:** New `docs/audit/question-papers-20261118/{progress,verification}.md` and optional module-only test additions.
- [x] Review full changes for every user condition; resolve findings within scope. Fresh reviewer per executing-plans skill; no modifications delegated.
- [x] Run all new tests, existing relevant regressions, both compiler checks and scope checker; record commands and outputs.
- [x] Compare all 3,088 original states; verify only five approved integration files differ and changes are insertions.
- [x] Report all files and limits, especially no real-device/hosted Storage E2E or remote migration application. No completion claims beyond observed evidence.

## Execution rulings

Design approved conditionally. Proceed continuously inline; no extra review approval needed for this mechanical plan. Preserve approved current checkout rather than introducing a clean checkout that omits user changes. Skill scratch helpers that edit .gitignore are not permitted; use new progress.md in this module's audit directory. No commits requested or required. Migration CLI availability will be checked without dependency upgrades.
