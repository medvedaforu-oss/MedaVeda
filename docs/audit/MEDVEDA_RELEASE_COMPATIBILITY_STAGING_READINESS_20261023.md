# Quiz and admin URL migration: compatibility and recovery

Retained operational handoff, refreshed 4 November 2026. Hosted cutover and
old/new installed-client acceptance remain unverified. The original October
migration counts, local line numbers and temporary bundles are not current
release preconditions. Re-inventory the current checkout and both hosted targets.
Use the [release gates](../RELEASE_GATES.md) for the current build/purchase boundary.

## Migration provenance and dependencies

The relevant security transitions are, in dependency order:

1. `20261020104000_course_wide_content_browsing.sql`: same-course browsing across
   active years, publication guards and access helpers.
2. `20261020105000_quiz_answer_read_boundary.sql`: safe student quiz RPC,
   admin-only answer RPC and removal of raw student answer reads.
3. `20261020110000_admin_url_mfa.sql`: AAL-aware service-only URL helpers.

Refresh live migration history and compare definitions, grants and policies
before deciding which are pending. The archived remote version `20260801` named
`razorpay_webhook_atomic_grant` differs from local
`20260801_auth_verified_identities.sql`; equal version numbers do not prove equal
SQL. Do not replay, rename or repair that recorded version during this rollout.
Inspect actual prerequisite columns/functions and the later idempotent profile
setup. See [staging safety review](../../supabase/staging/MIGRATION_SAFETY_AUDIT.md).

The staging preparation script and hash manifest were frozen for an older
inventory. Refresh/review all current files and isolation edits before replay;
a plain disposable PostgreSQL pass does not establish hosted Supabase readiness.
Always target staging `nsmsqsogedzohwboripd` explicitly, independently of the
production link `xbvenkfmesugrbjuufyw`.

## Client compatibility boundary

Old mobile/admin clients that select raw quiz `*` fail after answer-read
revocation. Old local grading also requires the secret answer key; withholding
it cannot preserve that scoring contract. New clients use `get_public_quiz_tests`
and server grading, while the updated admin uses `get_admin_quiz_tests`.
Deploying those clients before the RPC exists causes missing-RPC errors.

Inventory actual released binaries, admin deployment and active readers. Either
prepare an additive, reviewed server capability before client rollout and prove
old-reader retirement, or explicitly accept/communicate an old-client quiz
outage. A force-update prompt alone is insufficient: offline/running clients
and failed config reads can continue. Never return answers to retain old local
scoring. Any new compatibility migration is forward-only reviewed work.

Current source includes startup cleanup of old quiz files; test an upgrade from
an actual answer-bearing old binary across all device accounts/courses. Cover
orphan/missing files, interrupted cleanup, offline startup, account switch and
backup/restore. Avoid wiping unrelated Notes. Copies already outside
app-managed storage cannot be recalled; record that residual exposure.

## URL helpers and deployment sequence

Migration `1100` keeps hardened service-only two-argument note/video helpers and
adds AAL-aware variants. Updated `get-note-url` and `get-video-url` require those
new helpers, so deploy schema first. Edge-first deployment produces missing-RPC
errors. During schema-first transition, older handlers can temporarily deny
admin-only previews even for AAL2 admins; student entitlement paths remain the
intended contract and require hosted tests.

The updated handlers must derive AAL from the verified bearer session, never
body input, and preserve their gateway authentication. Already-issued signed
Notes URLs can survive their 120-second TTL. Direct free video URLs can be
retained outside the app; URL-discovery authorization cannot recall them.

1. Capture current history, schema/grants/RLS, private bucket state, helper
   signatures and exact client/Edge versions. Stop on drift or unknown target.
2. Rehearse the reviewed migration and client cutover in isolated staging with
   synthetic users, old/new mobile, old/new admin and both handler versions.
3. Prove the matrix below, file cleanup and accepted old-client behavior.
4. After the cutover is accepted, apply only the reviewed pending migrations in
   dependency order, then dependent handlers/panel/mobile in the tested sequence.
   Monitor errors and authorization after each step; never blindly push pending SQL.

## Required hosted and device evidence

| Identity/content | Expected result |
|---|---|
| Anonymous, blocked or cross-course student | No protected quiz/Notes access or admin answers. |
| Published own-course content, including other years | Safe quiz metadata/questions; free video; paid Notes only with valid scope or explicit preview. |
| Student direct raw quiz `questions` or `select('*')` | Denied; no answer-bearing response. |
| Refunded/failed/other-account purchase | No paid Notes entitlement. Free quiz/video follows course/publication rules. |
| Admin AAL1 while MFA is required | No admin answer or admin-only signed URL privilege. |
| Admin AAL2 while MFA is required | Intended authorized admin editing, answers and preview paths. |
| Inactive/unpublished content or ancestor | Denied to students; admin editing only through its policy. |

Also test real PostgREST filtering/pagination/body shapes, invalid/expired tokens,
server grading/revision conflicts, offline attempts/reconnect, installed old-build
behavior, cold/warm URL opens, signed URL expiry and source/client upgrade paths.
Keep sanitized status/body-shape evidence without answer keys or credentials.

## Stop and rollback rules

- After answer-read revocation, never restore raw quiz SELECT or old answer-bearing
  responses. Halt rollout and correct forward; a temporary disabled quiz feature
  must preserve the answer boundary.
- After AAL URL hardening, an old Edge handler can temporarily deny admin-only
  previews. Prefer the fixed forward handler; never restore insecure SQL helpers,
  public Notes or permissive Storage policies as routine rollback.
- Stop on history/order/body drift, failed RLS/payment/AAL tests, broken staging
  isolation or an unaccepted old-client outage. Retain financial and grading data.
- Obtain a restorable backup and rehearse recovery. Local checks alone prove
  neither deployed security nor safe rollback; see the [backup limitation](MEDVEDA_PRODUCTION_BACKUP_RESTORE_READINESS_20261023.md).
