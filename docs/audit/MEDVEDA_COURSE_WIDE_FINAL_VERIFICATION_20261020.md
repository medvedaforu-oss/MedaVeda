MedVeda final verification before course-wide browsing deployment — 2026-10-20 UTC

**Recommendation: NO-GO for production deployment.** The browsing change and purchase boundary pass their existing regressions, but a new local reproduction shows that active child content can become visible under an inactive academic year. Resolve and test parent publication semantics before deployment. The earlier audit's inactive-content claim covered each row's own `active` flag; it did not establish inactive-parent protection.

This was a verification task. No feature code, migrations, test source, pricing, student profiles, purchase records, or production data were modified. No migration was applied remotely and no AAB was built. Remote operations were migration-history listing, a dry-run with vault updates skipped, and schema/aggregate SELECT statements inside read-only transactions. Supabase CLI initializes its temporary login role for database connections; this is normal CLI authentication, not an application migration or data change. Scratch-database fixtures were local only and rolled back or removed.

**Migration identified:** `supabase/migrations/20261020104000_course_wide_content_browsing.sql`. It replaces `has_content_access`, `user_can_access_note`, `user_can_access_video`, and `submit_quiz_attempt` transactionally. It does not change tables, row policies, profiles, purchases, pricing, billing, or refund implementations. The exact reviewed file hash is in the evidence directory.

Security findings:

| Boundary | Finding |
| --- | --- |
| Registration year | PASS: the profile branch now checks only `profiles.id = auth.uid()` and matching `course_id`. The stored registration year is not consulted. |
| Existing users | PASS: the replacement function is evaluated on subsequent reads for existing accounts. No profile update, purchase migration, re-registration, or new AAB is needed for backend behavior. Existing offline caches need an online refresh. |
| Purchase entitlements | PASS: comparison against the deployed pre-migration definition shows the entire successful-purchase branch unchanged. Chapter, subject, year, and bundle boundaries, refunds, same-year siblings, and retained prior-course purchases pass local regressions. |
| Cross-course browsing | PASS for the proposed helper: course matching remains mandatory unless an existing successful purchase covers the requested year or the caller is an admin. Retained prior-course purchases are deliberate existing entitlement exceptions, not access to arbitrary unrelated courses. |
| Paid PDF authorization | PASS at database/policy level: the note purchase branch is unchanged; nonblocked account and active note are required. Signed-URL note/video helpers remain service-only. Preview access becomes course-scoped. |
| Client RLS | Remote-confirmed: enabled on content, profiles, purchases, and storage objects. `anon` and `authenticated` are neither superusers nor BYPASSRLS roles. Content SELECT policies retain `active = true AND has_content_access(...)`; ALL policies remain admin-only. |
| Own-row publication flag | PASS: inactive subjects, chapters, notes, videos, quizzes, and products remain hidden in existing local tests. |
| Parent publication flag | **FAIL / release blocker:** policies do not require the containing year/course/subject/chapter to be active. See reproduction below. |
| Writes and privileges | PASS in existing local regressions: no student catalogue writes, no direct protected-profile changes, no grants to anonymous content helpers or student note/video URL helpers. |
| Real signed PDF delivery and device playback | Not established by SQL tests. Requires staging HTTP/device checks; no real buyer session was used during this verification. |

The parent-publication reproduction uses a new unpurchased local student registered in a different active BAMS year. An existing target year is then made inactive while its subject, chapter, and note remain active. With the old helper, the year and its children return zero visible rows. With the proposed helper, the inactive year remains hidden but the active subject, chapter, and note each return one visible row. Course-wide Search, Latest Updates, and direct ID queries can therefore surface catalogue entries beneath the hidden year. This is enabled by pre-existing row-only publication policies and exposed more broadly by removing the year gate. It does not demonstrate unpaid PDF bytes being unlocked.

The admin `yearService.updateYear` updates the year row without cascading child flags, so the scenario is supported by existing management code. No implementation fix was made, as requested. The release must define and enforce inactive-parent behavior, with tests for inactive course, year, subject, and chapter across catalogue queries, direct links, previews, videos, quizzes, and paid PDF authorization where applicable. At the time of the read-only remote aggregate check there were **0** active subjects under inactive years, **0** active chapters under inactive subjects, and **0** active notes under inactive chapters. Those counts show the tested mismatch is not currently present in those remote relationships; they do not make the policy safe for future admin edits or prove other relationships are consistent.

**Pre-existing PDF database test failure:** `supabase/tests/high_phone_and_notes_checks.sql` asserts “buyer can read the exact object” and expects one storage row. The already-deployed `20261020100000_notes_service_reads.sql` intentionally removed `notes_read_if_purchased` and added a restrictive `notes_service_reads_only` SELECT policy for PUBLIC. For a non-admin, the notes-bucket predicate is false regardless of purchase. This prevents bypassing blocked-account checks through direct Storage reads or self-service signed URLs.

Independent local runs produced the same **1 FAIL / 20 PASS before and after** the course-wide migration. The remote snapshot confirms the notes bucket is private, the restrictive policy exists, and the legacy purchased-reader policy is absent. This failure is an outdated test expectation, unrelated to the browsing migration. Denying direct access is the intended security behavior; restoring the old permissive reader would weaken it.

Functionality is preserved in the inspected client: `NotesScreen` resolves fresh URLs through `getSecureNoteUrl`, and downloads also call that function. `get-note-url` validates the caller through Auth, derives the user ID from that validated identity, checks `user_can_access_note`, and only then signs the storage object for 120 seconds. An ownership route parameter cannot authorize the backend. The stale suite should eventually assert direct denial even for buyers, and separately verify authorized service-mediated delivery and unauthorized refusal. Do not change production storage policy to satisfy the old assertion.

**PDF access conclusion:** no new unpaid-PDF authorization bypass was found. Direct anonymous/student reads are denied by the actual remote policy; clients cannot execute the privileged note helper; missing, inactive, blocked, unpurchased, and refunded cases are denied by the relevant existing checks/tests. A universal “no unauthorized access is possible” guarantee is not supported: the deployed Edge Function source and real authenticated Storage responses were not independently exercised here, existing signed URLs are bearer capabilities valid until expiry, and the parent-publication gap remains unresolved. The currently deployed preview helper still has the older cross-course-free-preview behavior; this pending migration tightens it. No positive production URL was minted or PDF downloaded during verification.

**Remote migration status:** linked project `xbvenkfmesugrbjuufyw`, CLI v2.120.0. There are **62 local migrations and 61 remote migrations**, with no remote-only entries. All local versions through `20261020103000_first_purchase_identity_retention.sql` are recorded remotely. Only `20261020104000_course_wide_content_browsing.sql` is pending. Remote definitions of the four affected functions match their expected local pre-migration bodies. History alone does not prove every migration's content is identical; the relevant current functions, policies, and privileges were separately inspected.

The read-only deployment dry-run returned exactly:

```json
{"upToDate":false,"dryRun":true,"migrations":["20261020104000_course_wide_content_browsing.sql"],"seeds":[],"roles":[]}
```

**Exact next step:** resolve the inactive-parent publication gap and its regression coverage in a separate authorized change, then validate in staging. Do not run the production push below while this report is NO-GO. The pre-existing PDF test should be reconciled with service-mediated delivery so CI can report a meaningful clean result.

Commands for the subsequent approved deployment, shown only and not executed here:

```sh
cd /home/ganeshp8545/AyurPulse
SB=/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/.bin/supabase

# Set this to the actual isolated staging project; none was supplied or assumed.
: "${STAGING_PROJECT_REF:?Set the verified isolated staging project ref}"
"$SB" db push --project-ref "$STAGING_PROJECT_REF" --dry-run --skip-vault
# Review every pending file; a fresh staging project may require earlier migrations.
# After blockers are resolved and the staging plan is approved:
"$SB" db push --project-ref "$STAGING_PROJECT_REF" --skip-vault

# Only after staging passes and production deployment is approved:
"$SB" migration list --linked
"$SB" db push --project-ref xbvenkfmesugrbjuufyw --dry-run --skip-vault
# Stop if the plan differs from the approved release migration list.
"$SB" db push --project-ref xbvenkfmesugrbjuufyw --skip-vault
"$SB" migration list --linked
```

`db push` applies all pending migrations, so do not assume that a future dry-run will still contain only this file. Do not use `--include-all`, `--include-seed`, migration repair, reset, or vault updates for this release. The migration calls existing database functions from already-deployed endpoints; this SQL-only behavior change requires no Edge Function redeployment. Client copy changes can follow the normal client release process. Any subsequent code fix changes this deployment plan and must be reviewed before pushing.

Staging checklist:

1. Confirm an isolated project, approved migration plan, private notes bucket, RLS flags, complete policy composition, and service-only URL helper privileges. Save the pre-release function definitions and grants.
2. Use existing staging accounts registered in each of Years 1, 2, 3, and Final. Browse all years through Home and all three Years modes. Confirm stored course/year is unchanged without re-registration.
3. Exercise Subjects, Chapters, Notes, Videos, quizzes, Store, search/year filters, incoming direct links, back navigation, refresh, restart, and existing offline caches. Publish a test item in a different year and confirm it appears after refresh.
4. Exercise inactive course/year/subject/chapter relationships with active descendants, each row's own inactive flag, and removed test items. Confirm all intended administrative restrictions survive search, direct ID requests, and URL endpoints. The inactive-year case currently fails locally.
5. Verify unrelated-course catalogue, quizzes, preview URLs, and video URLs are denied. Verify a retained prior-course purchase keeps exactly its original scope.
6. Using actual staging HTTP calls, verify anonymous, nonbuyer, blocked, refunded, inactive, and wrong-course cases cannot obtain protected PDFs. Verify direct Storage download, listing, public URLs, and client signed-URL creation cannot bypass the service endpoint.
7. For entitled buyers in every purchase scope, verify `get-note-url`, viewer, and download succeed across allowed years, sibling unpaid content stays locked, permitted previews work, free videos play, and quizzes score correctly. Confirm signed URLs expire. Use staging fixtures/sandbox only; do not modify production purchases/pricing.
8. Rerun the database/security regressions and reconcile the stale direct-storage assertion with the current architecture. Release only after the tests, hierarchy cases, and device/HTTP checks pass.

Rollback plan:

- Nothing is deployed yet, so no rollback is currently needed. The new migration is transactional: a failing application rolls back its function replacements.
- A review-only SQL candidate is provided at `docs/audit/rollback_course_wide_browsing_review_only.sql`, outside the migration directory. It contains the actual pre-deployment `has_content_access` definition captured remotely, wrapped in a transaction. It restores the profile-year catalogue gate and preserves admin/purchase branches.
- If production has already been deployed and needs reversal, use a **new, reviewed forward migration** containing that candidate after checking for intervening function changes. Do not edit applied migration history or delete the applied version. For example, create `supabase/migrations/20261020105000_restore_registration_year_catalogue_gate.sql` from the candidate only if that version remains unused and newer than every applied version; otherwise choose a newer valid version. Review `db push --dry-run --skip-vault` before the approved push.
- Keep the new preview/video/quiz cross-course checks, private bucket, restrictive storage policy, service-only privileges, and paid-note entitlements. Do not restore insecure cross-course URL behavior or the legacy direct-storage policy. No profile, purchase, refund, or pricing data rollback is required.
- Recheck RLS, paid-note locks and buyer signed-URL delivery after reversal. Existing valid signed URLs remain usable for their remaining lifetime (normally at most 120 seconds); rollback does not recall already downloaded files. Refresh catalogue caches. Client guidance text can be reverted separately if the restrictive behavior remains in place.

Evidence: `docs/audit/evidence/course-wide-final-verification-20261020/` contains schema-only remote snapshots, aggregate checks, read-only SQL, migration history and dry-run output, pre/post test results, the inactive-parent reproduction, and the reviewed migration hash. Existing course-wide tests pass; `verified_content_checks.sql` reports **0 FAIL / 53 PASS**. The new publication reproduction is a separate failing security requirement, not a reason to reclassify the stale storage assertion as a browsing regression.
