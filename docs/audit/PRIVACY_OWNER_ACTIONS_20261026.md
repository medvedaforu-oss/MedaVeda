# Privacy wording and owner operations

Only app/website text and its source contract test changed. No migration,
schema, RLS, function deployment, scheduler, provider or Console was changed.
The original 180-day retention policy and 8-year financial-record policy were
not re-decided here. Legal wording still requires owner review before publishing.

The app inventory and generated website privacy table now describe Supabase,
analytics/search terms and quiz selections, Expo/FCM/APNs push tokens, Sentry
(no tracing/screenshots/replay), intended Resend mail delivery, Google Play,
applicable Razorpay/legacy channels, identity hashes/account ID, support,
hashed rate-limit keys/provider metadata and local/website storage. Live Resend,
Sentry retention, region, backup retention and cleanup settings need owner
verification; local source alone does not prove them. In-app and external-email
deletion steps describe success/failure and retained exceptions consistently.

**Under-18 gap remains:** registration collects name/email/mobile/password,
course/year and optional referral details. No age/DOB check, parental identity
verification, consent recording or guardian approval flow was found. Existing
advisory wording (“under 18 … consent and supervision”) is aligned across app
and website; the unsupported web claim of *verifiable* consent was removed.
The owner must resolve intended audience/consent obligations and Console
declarations. No age restriction or consent flow was invented.

**180-day identity cleanup is not scheduled in source.** The existing migration
`20261020103000_first_purchase_identity_retention.sql` defines the service-only
purge and cutoff index, but the `cron.schedule` example is commented. It deletes
entire rows, including hashes/account ID, strictly older than 180 days from
`first_purchase_at` (including active accounts). Deletion does not reset that
clock. Current disclosures explicitly say automatic cleanup is unconfirmed;
they no longer promise an operational cutoff deletion. No live state was read.

Owner procedure in Supabase SQL Editor, first in an isolated staging project:

1. Verify project identity and reviewed migration provenance. Read prerequisites:

   ```sql
   select current_database(), current_user;
   select to_regclass('public.first_purchase_identities') as identity_table,
          to_regprocedure('public.purge_expired_first_purchase_identities()') as purge;
   select extname from pg_extension where extname = 'pg_cron';
   select pg_get_functiondef('public.purge_expired_first_purchase_identities()'::regprocedure);
   select count(*) as expired_rows,
          min(first_purchase_at) as oldest_expired_purchase
   from public.first_purchase_identities
   where first_purchase_at < now() - interval '180 days';
   ```

   If the table/function/index is missing, reconcile/apply the already-reviewed
   retention migration through the owner's approved migration process first.
   Do not paste an alternative schema or backfill old hashes. If pg_cron is
   absent, enable the supported extension in Dashboard → Database → Extensions
   as a separate owner operation before using the queries below.

2. Review function body and service-only EXECUTE grants. Inspect the existing
   job without printing command text (which can contain unrelated secrets):

   ```sql
   select
     has_function_privilege('anon', 'public.purge_expired_first_purchase_identities()', 'EXECUTE') as anon_can_execute,
     has_function_privilege('authenticated', 'public.purge_expired_first_purchase_identities()', 'EXECUTE') as authenticated_can_execute,
     has_function_privilege('service_role', 'public.purge_expired_first_purchase_identities()', 'EXECUTE') as service_can_execute;
   -- Expected: false, false, true. Stop and review grants if different.

   select jobid, jobname, schedule, active, username
   from cron.job where jobname = 'first-purchase-identity-retention';
   ```

3. Approve the deletion count, cadence and permitted lag. The following example
   runs hourly, so a healthy job can lag the cutoff by almost one hour, plus
   execution time; failures extend the lag. Running the purge permanently
   deletes rows and can affect future first-purchase eligibility. Validate the
   cutoff with synthetic staging records before approving production execution.
   Only after that owner approval, run:

   ```sql
   -- Optional initial catch-up, after reviewing the aggregate count above:
   select public.purge_expired_first_purchase_identities() as deleted_rows;

   -- Named scheduling updates only this named job if it already exists:
   select cron.schedule(
     'first-purchase-identity-retention',
     '0 * * * *',
     'select public.purge_expired_first_purchase_identities();'
   );
   ```

4. After at least two scheduled runs, inspect:

   ```sql
   select d.jobid, d.status, d.start_time, d.end_time, d.return_message
   from cron.job_run_details d
   join cron.job j using (jobid)
   where j.jobname = 'first-purchase-identity-retention'
   order by d.start_time desc limit 10;

   select count(*) as past_cutoff,
          count(*) filter (
            where first_purchase_at < now() - interval '180 days 1 hour'
          ) as past_hourly_lag,
          min(first_purchase_at) as oldest_purchase
   from public.first_purchase_identities
   where first_purchase_at < now() - interval '180 days';
   ```

   Alert the responsible operator on failed/missing hourly runs and any
   `past_hourly_lag > 0`; verify the provider's run-history retention. Retain
   aggregate evidence, not hashes/account IDs. Once the operation and cadence
   are proven, review/publicize the exact lag instead of the current unconfirmed
   wording. To stop only this job later, run
   `select cron.unschedule('first-purchase-identity-retention');`.
   Unscheduling cannot restore deleted records.

Analytics has a separate 12-month purge/scheduling migration; actual scheduled
operation and Sentry provider retention are still unverified. Do not treat the
identity procedure above as enabling analytics cleanup or payment jobs.
