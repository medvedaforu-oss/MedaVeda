# MedVeda quiz-answer and admin URL MFA fixes — 2026-10-23 UTC

## Result

**Implementation: PASS locally. Production: NO-GO pending a coordinated client release and hosted validation.** No production or staging database command, migration repair, Edge deployment, secret edit, or production data write was performed. The pre-existing pending migration `20261020104000_course_wide_content_browsing.sql` remains byte-identical at SHA-256 `5d7428d45beeffdbff1ee6bcb3ebdc21d56ed7cbea8111221578530f42aa2b49`.

The release order is `20261020104000_course_wide_content_browsing.sql` → `20261020105000_quiz_answer_read_boundary.sql` → `20261020110000_admin_url_mfa.sql`. These are forward-only versioned files. The two new migrations compiled and passed all local SQL suites on a disposable PostgreSQL 18 cluster created under `/tmp`; the cluster had no hosted connection. Production history was not changed or rechecked during this implementation.

## What changed

| Files | Change |
| --- | --- |
| `supabase/migrations/20261020105000_quiz_answer_read_boundary.sql:5-7` | Remove PUBLIC/anon/authenticated table-level quiz SELECT and grant authenticated users only safe metadata columns. This blocks raw `questions`, `select('*')`, and relationship/API reads of the answer JSON. Admin editing retains write policies, while answer reads move to a checked RPC. |
| Same file `:9-41` | Add an authenticated student RPC returning only `question` and `options` per item. It checks nonblocked profile, active course/year/subject/test, and existing course/purchase access. Extra JSON keys such as `answer`, `answer_key`, and `explanation` are never copied into the response. An empty filter returns nothing. |
| Same file `:43-59` | Add admin-only answer read RPC guarded by `am_i_admin()`, including the existing AAL2 requirement when enabled. |
| `supabase/migrations/20261020110000_admin_url_mfa.sql:6-95` | Replace existing two-argument service-only note/video helpers so membership grants admin access only while MFA is off. Add separate service-only helpers that accept AAL for verified AAL2 admin sessions. Same-course previews/free videos and successful paid-note scopes remain available through ordinary student rules. |
| `supabase/functions/get-note-url/index.ts:9,43-47`; `supabase/functions/get-video-url/index.ts:7,27-31` | After verifying the bearer token, pass its AAL to the new service-only helper. A caller-supplied body value cannot set AAL. Older deployed handlers keep calling the two-argument helpers, which fail closed for admin-only content when MFA is enabled. |
| `mobile-app/src/repositories/quizRepository.ts:5-15,23-54`; `mobile-app/src/types/quiz.ts:5-9`; `mobile-app/src/types/navigation.ts:82-90` | Quiz list/detail fetches use the allowlisted RPC. Search still queries only safe metadata columns. Student types no longer contain `answer`. |
| `mobile-app/src/screens/quiz/QuizScreen.tsx:142-168,234-271,330-337`; `mobile-app/src/components/OptionCard.tsx:17-48` | Keep question/options/timer/navigation UI, show selected choice without local correctness reveal, submit selected indices, and show a score only after server verification. Offline/pending attempts display an unverified result rather than a fabricated local score. |
| `mobile-app/src/utils/downloadManager.ts:420-456,486-495` | Store only question text/options in new offline quizzes and scrub an older quiz file when the new client opens it. Previously distributed files or copies outside app storage cannot be recalled. |
| `admin-panel/src/services/quizService.ts:11-16` | Admin quiz listing uses the MFA-gated answer RPC; add/update/delete still use existing admin RLS. |
| `supabase/tests/quiz_answer_and_admin_mfa_checks.sql:1-140`; `supabase/tests/content-url-publication-selftest.cjs:13-125`; `supabase/tests/run-all.sh:44-50` | Add disposable SQL cases for raw-column denial, strict JSON allowlist, own/other year, other course, server grading, student/admin AAL1/admin AAL2, paid/refunded notes, free videos, and service-only grants. Extend actual handler harness with admin AAL1/AAL2 decisions. |
| `mobile-app/src/screens/quiz/TestListScreen.tsx:28-32`; `mobile-app/src/services/quizService.ts:13-18` | Correct comments to describe answer-free playable questions. |

## Validation evidence

- `supabase/tests/run-all.sh` against disposable PostgreSQL 18: **ALL SUITES PASSED**, including `quiz_answer_and_admin_mfa_checks`, the earlier course-wide/publication/payment suites, and the URL handler harness (**45 cases**). Full output: `docs/audit/evidence/medveda-security-fixes-20261023/local-disposable-full-suite.txt`.
- Mobile `tsc --noEmit -p tsconfig.json`: **PASS**; admin panel `tsc --noEmit -p tsconfig.json`: **PASS**; `deno check` for both changed URL handlers: **PASS**; `mobile-app/scripts/quiz-hooks-selftest.cjs`: **PASS**; `git diff --check`: **PASS**.
- The database regression proves that an authenticated student can read quiz metadata, cannot SELECT `questions` or `*` from the raw table, receives only question/options through the RPC, cannot call the admin RPC, and cannot submit another course's quiz. It proves an AAL1 admin cannot use the answer RPC or admin-only URL path when MFA is enabled, while AAL2 can. It also checks successful purchase and refund behavior. The Edge harness verifies the AAL decision is wired through the handlers; Auth and Storage transport are mocked there.

## 20260801 history investigation

`supabase/staging/MIGRATION_SAFETY_AUDIT.md:9-15,86` and the prior read-only audit record that remote version `20260801` names `razorpay_webhook_atomic_grant` and duplicates remote `20260801150000`, whereas local `20260801_auth_verified_identities.sql:1-32` contains profile verification SQL. The later `20260919120000_multi_course_and_referrals.sql:88-99` adds the needed profile columns idempotently, so the new security migrations do not require replaying the local Auth file. Matching migration versions do not prove identical bodies. No migration history was edited or repaired. The new migrations require the pending course-wide helper `content_is_published`, so they must not be applied ahead of `20261020104000`.

## Remaining blockers and rollout constraints

1. **Old mobile builds are incompatible with the secure quiz SELECT grant.** They call `quiz_tests.select('*')` and locally compare `question.answer`. The database revocation must be coordinated with availability/enforcement of the updated client; otherwise old clients will fail to load quizzes. Keeping their raw answer access would leave the confirmed leak open. A deployed client/device and PostgREST check is still required. The new client cannot fetch quizzes until the new RPC exists.
2. The updated note/video Edge handlers require the new `*_with_aal` RPCs. Deploying code first would return an error; migration `20261020110000` must exist before those handlers are released. Old deployed handlers remain safe for admin-only paths after that migration but cannot serve an AAL2 admin through the old two-argument signature.
3. Hosted production policy/grant drift, PostgREST RPC shapes, actual Auth token AAL, notes bucket privacy, signed URL behavior, client minimum-version enforcement, and real-device/offline behavior are **BLOCKED** until an isolated hosted acceptance test and a release review. The local PostgreSQL stub cannot prove those managed-service details. Existing downloaded answer-bearing files remain readable on devices until opened by the updated app; copies outside managed storage cannot be withdrawn.
4. Before any deployment, reverify linked history and confirm exactly these three pending migrations in the stated order. Inspect live `quiz_tests` grants and function/policy definitions, then test in isolated staging with student, purchaser, refunded, blocked, other-course, admin AAL1 and admin AAL2 accounts. Do not infer production readiness solely from the local suite.

**Production GO/NO-GO: NO-GO** until the compatibility and hosted checks above pass. No price, billing, or unrelated feature was intentionally changed in this work. The shared working tree already contained many unrelated edits; they were left in place.
