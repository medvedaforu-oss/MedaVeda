# MedVeda isolated staging validation — 2026-10-20 UTC

**Stopped at Phase 1. Production recommendation: NO-GO.** No isolated staging project is available to the currently authenticated Supabase account. No migrations, backups, hosted fixture changes, purchases, pricing changes, or Android builds were performed.

Read both requested audit reports. The inactive-parent report supersedes the earlier parent-publication failure; its local passing results do not establish hosted acceptance.

| Requested result | Current finding |
| --- | --- |
| Staging identification | None confirmed. Read-only `supabase projects list --output json` returned exactly one accessible project. Projects outside this account/token's visibility cannot be ruled out. |
| Current project | `MedVeda`, ref `xbvenkfmesugrbjuufyw`, region `ap-northeast-2`, status `ACTIVE_HEALTHY`. This is the production target in `mobile-app/eas.json`. |
| CLI configuration | Installed CLI v2.120.0 at `/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/.bin/supabase`; `supabase/.temp/project-ref` links production. `supabase/config.toml` contains Auth and Edge JWT configuration, not a separate staging target. |
| Environment isolation | Admin `.env`, mobile `.env`, and every EAS build profile use the production ref. No staging variable names were found in the inspected local environment files or process environment. A distinct staging database, keys, storage, Auth users, and payment configuration are therefore unverified. |
| Migration deployment | NOT RUN. There are 62 local SQL migrations. Prior audit recorded 61 remote versions and only `20261020104000` pending; production migration history was not queried again. No staging history exists to verify. |
| Hosted tests | NOT RUN: all-year browsing, inactive ancestors/items, paid locks, valid entitlements, refunds/revocation, cross-course restrictions, signed PDF delivery/expiry, videos, quizzes/tests, search/navigation/cache. |
| Device validation | BLOCKED. No APK/AAB was found within three repository directory levels. Every configured Android profile targets production; `internal-testing` explicitly selects `same-project`. No existing isolated staging build was established, and remote EAS build inventory was not queried. |
| Security regressions | No new hosted security result. Prior report records 1,384 SQL publication assertions, 41 handler cases, and a passing local full suite. Those historical results were not rerun here. |
| Production recommendation | NO-GO until isolation, hosted security/functionality checks, and Android acceptance are demonstrated. |

The account project list was obtained read-only with telemetry disabled. The initial sandbox attempt failed on the CLI telemetry file; a direct API attempt failed on restricted DNS. The subsequent approved read-only CLI call succeeded. No student rows, payment secrets, PDF bytes, or signed URLs were requested. Secret values were not included in this report.

Pending migration SHA-256: `5d7428d45beeffdbff1ee6bcb3ebdc21d56ed7cbea8111221578530f42aa2b49`.

## Required staging setup

1. If a staging project already exists under another account or organization, supply its non-secret project ref and arrange CLI access. Otherwise create a new Supabase project named `MedVeda Staging` in the Dashboard, using a new database password. Do not restore production data into it. Record its ref and confirm it differs from `xbvenkfmesugrbjuufyw`.
2. Store its URL, publishable/anon key, server-only service credential, and database password in separate staging secret storage. Verify each key belongs to staging; never put service credentials in mobile/admin frontend variables. Keep this checkout's production link untouched; use explicit `--project-ref` targets for supported commands or a separate staging workspace.
3. Inventory the fresh project's Auth users, database contents, Storage buckets/objects, Edge secrets, Vault entries, and scheduled jobs. Require synthetic data only. Create fresh staging student users registered in each course year, an unrelated-course student, a blocked student, and a staging admin with required MFA. Never copy real student identities or Auth sessions. Preserve registration-year values during acceptance.
4. Before applying anything, inspect all migration files for data inserts, outbound URLs, cron jobs, and payment configuration. A fresh project needs the complete reviewed migration chain, not just the last migration. Do not enable production-directed jobs, webhooks, push, email, analytics, or payment integrations. Do not run `supabase/tests/run-all.sh` against hosted staging: it creates/drops scratch databases and uses local Auth/Storage stubs.
5. On staging, provision the private `notes` bucket and other application-required buckets with the repository's reviewed policies. Upload only synthetic PDFs/assets. Deploy required Edge handlers, including `get-note-url` and `get-video-url`, with the repository JWT settings. The SQL-only change needs no redeployment on an already configured environment; a fresh project still needs its initial handlers and storage setup.
6. Set staging `APP_ENV=staging`. Leave live Razorpay and production Google Play service-account credentials absent. For content validation use synthetic staging entitlements covering chapter/subject/year/bundle, successful/refunded/revoked cases; do not invent real settlement proof or execute live billing. If testing the actual payment lifecycle later, configure a separately verified sandbox/license-testing path first. No production purchase/pricing changes are authorized.
7. Point a separate admin deployment/local admin session to staging using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Verify the resolved hostname before login. Use fresh sessions and storage so cached production identities/content cannot contaminate results.

Supabase documents separate projects for staging and production: [Managing environments](https://supabase.com/docs/guides/deployment/managing-environments).

## Deployment sequence after isolation is established

These are future instructions, not commands executed in this task. Obtain staging credentials through secret storage, not command-line literals or this report.

```bash
SB=/home/ganeshp8545/.npm/_npx/b96a6bd565c470ce/node_modules/.bin/supabase
export SUPABASE_TELEMETRY_DISABLED=1
export DO_NOT_TRACK=1
: "${STAGING_PROJECT_REF:?Set the verified isolated staging project ref}"
test "$STAGING_PROJECT_REF" != xbvenkfmesugrbjuufyw || exit 1
"$SB" projects list --output json
"$SB" migration list --help
"$SB" db push --project-ref "$STAGING_PROJECT_REF" --dry-run --skip-vault
```

Inspect migration history using an explicit staging target supported by `migration list --help`, or a separate staging-only workspace linked to that ref. Verify applied versions and relevant live function definitions. If the older body of `20261020104000` was already applied there, stop and prepare a reviewed forward correction; do not rewrite its history.

Back up staging before application: use a protected directory (`umask 077`), `db dump --project-ref "$STAGING_PROJECT_REF" --file <schema-backup>`, and `db dump --project-ref "$STAGING_PROJECT_REF" --data-only --file <data-backup>`. Capture affected function definitions, policies, grants, migration history, staging Auth fixtures and Storage fixture objects separately as needed; SQL dumps are not a complete Auth/Storage object backup. Verify restore usability and keep backups outside tracked source. For an empty project, record the empty baseline. Review the entire dry-run list, especially fresh-project prerequisites.

Only after the isolation checks, backup, and plan review pass:

```bash
"$SB" db push --project-ref "$STAGING_PROJECT_REF" --skip-vault
```

Recheck history and actual definitions for `content_is_published`, `has_content_access`, `user_can_access_note`, `user_can_access_video`, and `submit_quiz_attempt`; inspect restrictive SELECT policies, RLS, admin draft handling, service-only helper grants, and private Storage policies. Do not use migration repair, remote reset, `--include-all`, or seeds as a shortcut.

Execute the requested hosted matrix with real staging Auth sessions, not service-role catalogue queries. Test students across all years, unrelated courses and retained purchased scopes; each inactive ancestor and item independently; paid nonbuyer/buyer/refunded/revoked/blocked access; actual authorized PDF bytes and unauthorized refusal; direct client Storage/signing denial; URL expiry; external video playback; quiz submission; search/deep links/navigation; refresh/restart and existing offline cache behavior. Record status codes and assertions without retaining tokens or signed URLs. Republish synthetic content and verify entitlement records remain unchanged.

Previously issued note URLs can remain valid for their 120-second lifetime. Previously verified offline notes retain the existing seven-day network-error grace; online denial must invalidate access. A learned public YouTube URL cannot be revoked by database publication controls. These are acceptance constraints, not immediate-revocation guarantees.

## Android build requirements

An existing binary is usable only if its build metadata/resolved configuration prove it points to the isolated staging ref with staging credentials. The current profile names do not provide this assurance. A backend-only migration can be tested with an already compatible staging binary, but none was confirmed here.

If a new device build is needed, add this dedicated profile to `mobile-app/eas.json` after substituting verified non-secret frontend values. First audit the EAS `preview` environment and uploaded build inputs to ensure they contain no production credentials. Do not inherit the current `preview` profile's production endpoint.

```json
"staging-validation": {
  "distribution": "internal",
  "environment": "preview",
  "android": { "buildType": "apk" },
  "channel": "staging-validation",
  "env": {
    "MEDVEDA_BUILD_TARGET": "staging",
    "MEDVEDA_PAYMENT_PROVIDER": "play",
    "EXPO_PUBLIC_SUPABASE_URL": "https://<STAGING_PROJECT_REF>.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<STAGING_PUBLISHABLE_KEY>"
  }
}
```

Then, from `mobile-app`, load the same profile values into the shell and run:

```bash
npm ci
node scripts/check-staging-build.cjs
npx expo config --type public
npx eas-cli build --platform android --profile staging-validation
```

Review resolved configuration before starting the build; the staging guard requires both URL and key to differ from production. Keep the distinct staging update channel and avoid submitting this build to Play. Install the resulting APK on a test device (`adb install -r <downloaded-staging.apk>`), clear prior app data or use a dedicated test device, and log in only with staging users. The existing Android package is `in.medveda.app`, so installation can replace the production app on that device. Verify the backend hostname and run viewer/download/video/quiz/cache acceptance.

Expo documents internal APK distribution: [Internal distribution](https://docs.expo.dev/build/internal-distribution/). No profile was changed and no APK or AAB was created. An AAB requires separate approval under this task.

## Remaining blockers

An accessible isolated project/ref; verified staging credentials, database, storage and synthetic users; safe staging-only integrations; reviewed migration history/plan and backup; initial staging Edge/storage deployment; hosted authorization/content/cache evidence; a verified staging Android binary and device results. Stop remains in effect until the Phase 1 isolation gate passes.
