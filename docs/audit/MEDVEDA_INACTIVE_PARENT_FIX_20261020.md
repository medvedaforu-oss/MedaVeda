MedVeda inactive-parent publication fix — 2026-10-20 UTC

**The confirmed online publication leak is fixed and locally verified. GO for isolated staging validation; NO-GO for production deployment until hosted/device acceptance checks pass.** Nothing was deployed, no new AAB was generated, and no production data, pricing, purchases, or student accounts were changed. This report supersedes the inactive-parent blocker and stale-test assessment in the earlier course-wide reports; those reports and their evidence remain historical records.

The exact root cause had two parts. Catalogue policies required the content row's own `active` flag and `has_content_access(course_id, year_id)`, but did not validate the whole parent chain. Removing the registration-year gate therefore exposed active children of an inactive year. Separately, the SECURITY DEFINER note/video/quiz functions bypassed catalogue RLS and omitted some parent-publication checks. A purchase or a preview flag could consequently authorize an otherwise active note under an inactive parent.

Only the **pending** `20261020104000_course_wide_content_browsing.sql` migration was updated. A fresh read-only history comparison confirmed it remained unapplied on linked project `xbvenkfmesugrbjuufyw`: 62 local / 61 remote versions, with only this migration pending. No already-applied migration was edited.

Files changed for this request:

| File | Change |
| --- | --- |
| `supabase/migrations/20261020104000_course_wide_content_browsing.sql` | Add shared ancestry predicate, six restrictive catalogue SELECT policies, and publication gates in the access functions. |
| `supabase/tests/content_publication_checks.sql` | New rollback-only hierarchy, ownership, all-year browsing, cross-course, and privilege regression suite. |
| `supabase/tests/content-url-publication-selftest.cjs` | New actual-handler tests backed by real local service-role SQL authorization; Auth/Storage transport are fixture doubles. |
| `supabase/tests/high_phone_and_notes_checks.sql` | Retain/correct stale direct-storage assertion and add buyer/nonbuyer service authorization checks. |
| `supabase/tests/run-all.sh` | Register both new test suites; preserve the runner's pre-existing changes. |
| `docs/audit/MEDVEDA_PDF_STORAGE_TEST_ASSESSMENT_20261020.md` | Separate explanation of the stale test, its correction, and verification limits. |
| `docs/audit/MEDVEDA_INACTIVE_PARENT_FIX_20261020.md` | This report. |
| `docs/audit/evidence/publication-parent-fix-20261020/` | Migration hash/diff, read-only history, baseline/fixed regressions, and validation logs. |

SQL changes:

- `content_is_published(course, year, subject, chapter)` validates active ancestors and consistent course/year/subject relationships using indexed parent IDs. NULL subject/chapter parameters mean those levels do not apply; missing or mismatched required parents fail closed. A NULL year is supported only for course-wide scopes. The function is STABLE SECURITY DEFINER with a fixed search path and fully qualified tables, preventing recursive RLS during parent checks. Execution is granted to authenticated/service roles and denied to PUBLIC/anon; it returns only a boolean and grants no content or purchase entitlement.
- `has_content_access` retains the registration-year-independent profile branch and the original successful-purchase predicates. Non-admin access additionally requires an active course and applicable year. Admin management remains available.
- Restrictive authenticated SELECT policies are added for subjects, chapters, notes, videos, quiz tests, and products. They compose with the existing permissive course/entitlement policies; existing write policies are unchanged. Subjects require their course/year; chapters require their subject and ancestors; notes require their chapter and every ancestor. Each item must also be active. Admins retain draft management through an explicit admin exception.
- Product guards follow their existing scope relationships. Chapter/subject/year products require their applicable ancestors; bundles require **every referenced year** to remain active in the same active course. No product prices or purchase scopes are changed.
- `user_can_access_note`, `user_can_access_video`, and fresh `submit_quiz_attempt` submissions apply the same ancestry predicate explicitly, since their privileged execution bypasses RLS. Notes still require a paid entitlement or an eligible free preview. Videos remain free. Videos and tests are subject-scoped in this schema and have no chapter foreign key, so unrelated chapter deactivation does not hide them.

Existing authenticated catalogue queries, global Search, recommendations, and direct ID requests receive the new RLS guards automatically. No frontend or search-query rewrite was necessary. The existing years policy already requires an active year and active course. Registration year remains stored in profiles; it does not gate browsing. Existing accounts benefit on their next online read without re-registration.

Regression evidence:

| Check | Result |
| --- | --- |
| New hierarchy suite against the pre-fix migration | FAIL as expected: a direct subject ID remains visible under an inactive course. |
| New hierarchy suite with the revised migration | **PASS: 1,384 assertions.** |
| Original reported inactive-year reproduction | Fixed: year, subject, chapter, and note all return 0 visible rows for the unpurchased student. |
| Every registered year against all four active course years | PASS; stored registration year unchanged. Existing course-wide suite also passes. |
| Course/year/subject/chapter individually inactive with active descendants | PASS for catalogue/direct IDs, paid notes, previews, free videos, quiz RPCs, and applicable product scopes. |
| Inactive individual note/video/test/product | PASS. |
| Existing chapter/subject/year/bundle purchases under inactive ancestors | Publication denied; entitlement remains stored; republishing restores authorized access without purchase edits. |
| Bundle with inactive second referenced year | Hidden; independent active-year catalogue remains available. |
| Cross-course access, spoofed ancestry, missing/deleted IDs | Denied in the new tests; retained scoped prior-course purchases pass the existing course-wide suite. |
| Direct note/video URL handlers | **PASS: 41 cases**, real service-role SQL decisions with mocked Auth/Storage transport. Denied requests perform no signing/content read and return no URL. |
| Stale PDF storage suite after documented correction | **0 FAIL / 23 PASS**; original direct-storage and phone checks retained. |
| Fresh database from all migrations + full `supabase/tests/run-all.sh` | **ALL SUITES PASSED**, including catalogue, quiz, grants, RLS, Play/Razorpay security, refunds, concurrency, and webhook harnesses. |
| Mobile TypeScript (`tsc --noEmit`) | PASS. |
| Repository lint (`npm run lint --prefix tooling`) | PASS. |
| Admin TypeScript/Vite production build and `npm test` | PASS. |
| Deno checks of note/video URL endpoints | PASS. |
| Mobile purchases, payment-provider/routing, Play restore/lifecycle, offline download/ownership, and quiz-hooks self-tests | PASS. |
| New Node handler-test syntax and `git diff --check` | PASS. |

Purchase verification is separate from publication. The migration does not modify `user_owns_chapter`, billing verification, order settlement, purchase records, refund processing, or pricing. Tests cover original purchase boundaries including same-year siblings and retained prior-course scopes. During unpublishing, a buyer still owns the original chapter but cannot obtain protected content; the purchase JSON stays unchanged. A refunded purchase does not regain access when content is republished. Service-only URL helpers remain unavailable to client roles, private notes storage remains private, and the restrictive notes-storage policy remains intact. Admin draft management is preserved; privileged administrators are intentionally allowed to inspect drafts through their existing management paths.

Bypass investigation and remaining limits:

- Direct PostgREST-style ID queries and broad catalogue/search reads are denied by RLS when any applicable parent is unpublished. Forged course/year/subject identifiers cannot bypass consistent ancestry checks.
- Edge requests cannot authorize a note by supplying `userId`, `unlocked`, or another browsing year. The existing handler derives identity from Auth and calls the service-only SQL predicate before signing. Its failure paths deny access without exposing URLs. Real hosted Auth/Storage transport was not used in the automated harness.
- The database enforces publication **at new online authorization/read time**. Previously issued signed URLs remain bearer capabilities until their existing expiry (120 seconds for note links). A change made after an authorization decision cannot recall that URL or bytes already downloaded. This limitation is unchanged by the fix.
- Existing cached catalogue metadata may remain visible until refresh or while offline. Previously verified offline notes retain the existing seven-day network-error grace; online 401/403 denial removes access and invalidates the download. This task preserves the established offline policy rather than claiming immediate offline revocation. Offline self-tests passed.
- Videos are external YouTube links in the existing application. Hiding a catalogue row or denying new URL requests cannot revoke a link already learned or make a third-party public video private.
- Existing verified quiz-attempt retries may return the student's already-stored score after unpublishing/deletion. This preserves idempotent history and does not return new questions or permit a new unpublished submission.
- No live staging/device acceptance, real signed PDF response, native playback, load measurement at production catalogue size, or real billing purchase was performed. SQL helpers use existing primary-key lookups; production-size query latency should be checked in staging.

Staging readiness: the migration builds from scratch and all local automated checks pass. Before applying, verify the target staging migration history: if any environment already applied the older `20261020104000` content, use a reviewed forward correction there rather than altering its applied history. The linked remote checked in this task has not applied it.

For a verified isolated staging project, first inspect the plan using the installed CLI:

```sh
SB=/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/.bin/supabase
: "${STAGING_PROJECT_REF:?Set the isolated staging project ref}"
"$SB" db push --project-ref "$STAGING_PROJECT_REF" --dry-run --skip-vault
```

After explicit staging deployment authorization and plan review, the corresponding apply command is `"$SB" db push --project-ref "$STAGING_PROJECT_REF" --skip-vault`. Neither command was executed against staging/production in this fix. `db push` applies all pending migrations; review the entire list. No Edge redeployment or new AAB is needed for the SQL behavior.

Staging acceptance must cover all four registered years, all browsing modes/search/deep links, each inactive ancestor independently with a purchased and unpurchased account, individual inactive items, bundle member years, republishing, wrong-course requests, actual buyer PDF/viewer/download success, nonbuyer/blocked/refunded denial, client Storage signing denial, URL expiry, quiz completion, admin draft editing, cache refresh, and expected offline grace behavior. Use staging fixtures and existing sandbox entitlements; do not alter production data or prices.

**Recommendation: GO for isolated staging validation. Production deployment remains NO-GO pending those hosted/device acceptance results.** The previous inactive-parent blocker is resolved in code and automated tests; this is not a claim that the deployed application has already received or passed the fix. If browsing must later be reverted, retain the new publication guards and private-storage restrictions and use a reviewed forward migration; do not reopen direct Storage or unpublished-content access.
