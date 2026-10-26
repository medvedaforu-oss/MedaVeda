MedVeda course-wide academic content browsing — 2026-10-20

Implemented locally. **Not yet verified for production release.** No hosted database, student accounts, real purchases, prices, billing integrations, or deployed applications were changed. The working tree already contained extensive unrelated changes; those were preserved.

The root cause was `public.has_content_access(course_id, year_id)`, most recently defined by `20260922100000_phase1a_sync_and_order_security.sql` (its NULL-year fallback section). Its profile branch required the content year to equal `profiles.year_id` whenever the profile year was set. The active-row SELECT policies for `subjects`, `chapters`, `notes`, `videos`, and `quiz_tests`, and the scope-specific `products_public_read_active` policy, call that helper. Consequently students could see year cards but not another year's catalogue without a covering purchase. Profiles with a NULL year already had course-wide catalogue visibility.

The new migration removes only the year comparison from the profile branch. The course must still match. The helper signature, admin access, and existing purchase-based visibility branch are preserved, including scoped access retained after a student changes course. Registration year remains stored and validated in the profile. Browsing does not write the profile or grant entitlements.

The audit also found service-role bypasses of course isolation: `user_can_access_video` allowed any active video to any nonblocked student, `submit_quiz_attempt` checked existence without course eligibility, and free note previews were available across courses through `user_can_access_note`. The migration adds explicit course/access checks there. Videos remain free across all years of the selected course, with existing purchase-based access to prior courses retained. Paid-note authorization is unchanged; only the free-preview branch is course-scoped. Existing blocked-account checks, active flags, quiz scoring, duplicate-attempt handling, rate limits, PDF quarantine, private storage restrictions, and function privileges remain in place. Quiz attempts already recorded retain their existing idempotent retry behavior.

Files changed for this request:

| File | Change |
| --- | --- |
| `supabase/migrations/20261020104000_course_wide_content_browsing.sql` | Transactional, additive migration replacing four functions; no schema/data deletion or purchase/profile updates. |
| `mobile-app/src/screens/years/YearsScreen.tsx` | Replace obsolete registration-year restriction text with course-wide browsing and paid-note guidance. |
| `supabase/tests/course_wide_browsing_checks.sql` | New rollback-only database regression suite. |
| `supabase/tests/null_year_fallback_checks.sql` | Update the obsolete assertion that setting a profile year must restrict visibility. |
| `supabase/tests/run-all.sh` | Add the new regression to the existing runner; preserve pre-existing runner changes. |
| `website/_src/pages/features.html` | Correct public description of year browsing. |
| `website/features.html` | Regenerated corresponding public page. |
| `docs/audit/MEDVEDA_COURSE_WIDE_BROWSING_20261020.md` | This report. |

Frontend audit: registration/login and `courseState.ts` continue to store/load profile course and year and enforce onboarding completion. Home and Years fetch years by course; Store iterates those years. Subjects use the selected route year; Chapters and Notes use their selected parent IDs. Video and quiz screens use selected subjects/tests. Search builds its index from active course-scoped catalogue queries; year filters are user-selected, and refreshing fetches fresh data. Navigation passes the browsing year rather than rewriting the profile. Home's recommendation ranking may prefer the profile year but does not restrict the catalogue. Existing network-first catalogue caches refresh online; an offline cache cannot discover materials never fetched. Admin course/year/subject/chapter relationships and management code need no change.

Verification completed:

| Check | Result |
| --- | --- |
| All migrations from an empty disposable PostgreSQL 17 database | PASS. |
| New regression without the migration | FAIL as expected: Year 1 profile sees only one subject rather than four. |
| New regression with the migration | PASS, including strengthened same-year sibling and retained prior-course purchase cases. |
| Every registration year (1, 2, 3, Final) against all four content years | PASS for subjects, chapters, notes catalogue, videos, quizzes, and products. |
| Existing account, unchanged stored year, no re-registration | PASS in database fixtures. |
| Paid notes locked without purchase | PASS across all four years; direct private storage access remains denied. |
| Chapter, subject, year, bundle purchases | PASS: exact scope, same-subject and other-subject siblings, refunds, retained prior-course access. |
| Free videos and quizzes across years | PASS for video authorization and server-scored quiz submission. |
| Other-course catalogue, video URL authorization, previews, quiz submission | Denied without an existing covering entitlement. |
| Inactive catalogue rows | Hidden across all six affected tables; inactive video authorization denied. |
| Anonymous/helper privileges and unauthorized writes | PASS; service-only URL helpers remain service-only, catalogue insert and protected profile writes remain denied. |
| Full existing database/edge/concurrency/webhook runner | Completed with one pre-existing failure; all other suites passed. |
| `npm run lint --prefix tooling` | PASS. |
| `cd mobile-app && ./node_modules/.bin/tsc --noEmit` | PASS. |
| `cd admin-panel && npm run build` | PASS, TypeScript and Vite production build. |
| `cd admin-panel && npm test` | PASS. |
| Mobile purchases, payment-provider, payment-routing, Play restore/lifecycle, quiz-hooks self-tests | PASS. |
| `cd mobile-app && CI=1 EXPO_NO_TELEMETRY=1 ./node_modules/.bin/expo export --platform android --output-dir /tmp/medveda-year-android-export` | PASS, Android Hermes bundle exported. This is not a signed native AAB build. |
| `cd website && node scripts/build.mjs && node scripts/check-links.mjs` | PASS, 17 pages, no link problems. |
| `git diff --check` | PASS. |

The full runner's sole failure is `high_phone_and_notes_checks.sql`: “buyer can read the exact object,” with 1 FAIL / 20 PASS. A second scratch database built **without** this request's migration reproduces the identical failure. The pre-existing `20261020100000_notes_service_reads.sql` migration denies direct student PDF storage reads, including purchased PDFs, and requires the service-mediated note URL endpoint. That old assertion expects the previous behavior. It was left unchanged; weakening storage access to satisfy it would violate the current security design.

Reproduce database verification with a disposable PostgreSQL superuser connection:

```sh
PGHOST=<local-host-or-socket> PGPORT=<local-port> PGUSER=postgres bash supabase/tests/run-all.sh
```

The new suite can also run independently against a migrated disposable database with `psql -X -v ON_ERROR_STOP=1 -f supabase/tests/course_wide_browsing_checks.sql`. It rolls back all fixture changes. This session used a Unix-socket-only PostgreSQL instance under `/tmp/medveda-year-pg`; no hosted database was contacted.

Remaining release work: apply/review the migration in staging with the actual pending migration order, then exercise existing student accounts from each year on a device: Home, all three Years modes, subject/chapter drill-down, search with year filters, navigation/back behavior, incoming links, refresh/restart, free video playback, quiz completion, locked/owned PDF viewing and downloads. Verify newly published materials appear in the intended year. Real device interactions, hosted RLS state, actual video playback, signed PDF delivery, native signed release build, and real billing transactions were not exercised here. Existing purchase and billing suites passed, but this is not a claim of end-to-end production billing verification.

The backend fix and local automated validation are complete. Production readiness remains unconfirmed until the legacy test expectation is reconciled and staging/device verification succeeds. Deployment was not performed.
