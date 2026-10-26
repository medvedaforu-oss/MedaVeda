# MedVeda staging migration safety audit — 2026-10-23

## Verdict

**NO-GO for deployment today.** The static audit and staging-only SQL bundle are prepared, but the complete chain has not been replayed in an isolated Supabase-compatible database. The Supabase CLI is not installed in this workspace. Do not run the execution section until a clean replay and the preflight checks below pass. Nothing was deployed or changed in either project during this audit.

## History and target isolation

| Source | Recorded versions | Relevant difference |
| --- | ---: | --- |
| Local `supabase/migrations` | 62 | Three eight-digit versions (`20260718`, `20260721`, `20260801`); no identical version strings. |
| Production `xbvenkfmesugrbjuufyw` | 61 | Has 60 versions shared with local, plus remote-only `20260801` named `razorpay_webhook_atomic_grant`. That remote version has the same SQL as remote `20260801150000`, so production recorded the Razorpay migration twice. Local `20260801` is `auth_verified_identities`, a different migration; production did not record it. Production also lacks local `20261020104000`. |
| Staging `nsmsqsogedzohwboripd` | 0 | No `supabase_migrations` schema, no public tables, no custom Auth triggers, no Auth users, and no Storage buckets. Supabase `auth`/`storage` schemas and required roles exist. `pg_cron` and `pg_net` are absent. |

The checkout's `supabase/.temp/project-ref` is **production**. It was read and left unchanged. Production has 46 public tables and both `pg_cron` and `pg_net`; staging has neither extension. Remote checks used the Management API's migration GET endpoint and catalog-only SQL with `read_only=true`. No production data, credentials, or migration statements were copied to staging.

## Ordered inventory and dependencies

The inventory below is the exact lexical application order. Versions 01–05 build the baseline, payment, Auth profile, and Razorpay objects. Versions 06–13 build course/referral objects and the folded phase-1 schema. Versions 14–39 harden permissions and add pricing, wallet, referral, and admin support. Versions 40–52 add Play/UCB, payment job, catalog, and entitlement schema. Versions 53–62 add quiz, trusted uploads, catalog fences, maintenance, retention, and browsing policies.

```text
01  20260701000000_baseline_live_schema.sql
02  20260718_payment_backend.sql
03  20260721_admin_orders_purchases_access.sql
04  20260801150000_razorpay_webhook_atomic_grant.sql
05  20260801_auth_verified_identities.sql
06  20260919120000_multi_course_and_referrals.sql
07  20260919130000_referral_history_rpc.sql
08  20260920120000_null_year_course_fallback.sql
09  20260920130000_app_config.sql
10  20260920140000_default_new_profile_course.sql
11  20260921120000_analytics_retention.sql
12  20260921130000_account_deletion_support.sql
13  20260922100000_phase1a_sync_and_order_security.sql
14  20260923100000_signup_profile_fields.sql
15  20260924100000_critical1_lock_settlement_functions.sql
16  20260924110000_critical2_orders_server_only.sql
17  20260924120000_critical3_storage_profiles_rls.sql
18  20260924130000_signup_name_phone_and_backfill.sql
19  20260924140000_auth_rate_limits.sql
20  20260924150000_free_preview.sql
21  20260925100000_phase2_referral_config_and_product_type.sql
22  20260925110000_phase2_wallet_ledger.sql
23  20260925120000_phase2_orders_pricing_and_settlement.sql
24  20260925130000_drop_debug_whoami.sql
25  20260925140000_phase2_single_use_friend_discount.sql
26  20260926100000_batch1_refund_dispute_revoke_access.sql
27  20260926110000_batch1_settle_wallet_and_flags.sql
28  20260926120000_batch1_block_owned_product.sql
29  20260926130000_batch1_hygiene.sql
30  20260927100000_f7_drop_legacy_admin_policies.sql
31  20260927110000_f8_revoke_excess_grants.sql
32  20260927120000_batch3_referral_hardening.sql
33  20260927130000_batch3b_antifarming.sql
34  20260928100000_referral_settings_limits_and_audit.sql
35  20260928110000_referral_off_blocks_wallet.sql
36  20260929100000_high_phone_change_rpc_and_notes_storage.sql
37  20260930100000_medium_db_hardening.sql
38  20260930110000_low_grants_tightening.sql
39  20261001100000_admin_mfa_aal2.sql
40  20261012100000_google_play_ucb.sql
41  20261012110000_google_play_refunds.sql
42  20261012120000_ucb_partial_refunds.sql
43  20261013090000_ucb_atomic_completion.sql
44  20261013100000_wallet_reservations.sql
45  20261013110000_play_void_cursor.sql
46  20261014100000_payment_audit_capture_inbox.sql
47  20261014110000_payment_job_leases.sql
48  20261015100000_play_payment_jobs.sql
49  20261015120000_play_entitlement_order_snapshot.sql
50  20261016090000_free_video_access.sql
51  20261016100000_play_catalog_sync.sql
52  20261018100000_verified_quiz_attempts.sql
53  20261018110000_trusted_note_uploads.sql
54  20261018120000_note_upload_deleted_retry.sql
55  20261018130000_note_pdf_quarantine.sql
56  20261019150000_play_catalog_queue_fences.sql
57  20261019151000_play_duplicate_settlement_result.sql
58  20261020100000_notes_service_reads.sql
59  20261020101000_maintenance_mode_read.sql
60  20261020102000_correct_stale_store_url.sql
61  20261020103000_first_purchase_identity_retention.sql
62  20261020104000_course_wide_content_browsing.sql
```

Key dependencies: the baseline assumes hosted Supabase `auth`, `storage`, `extensions`, and standard roles. The Razorpay migration supplies purchase/payment columns required by multi-course and later settlement SQL. The local `20260801_auth_verified_identities` adds profile verification columns; `20260919120000` also adds them idempotently because production historically lacked that migration. `20260922100000` folds and replays much earlier schema work; retain it, as it also contains later security changes and preflight checks. Wallet tables/functions precede order pricing, refund, and referral migrations. Play price tiers precede catalog sync; the catalog sync changes the price-tier primary key and installs queue triggers. Verified attempts and note upload request tables precede their later access/validation changes. `20261020104000` depends on earlier course, content, purchase, and verified quiz attempt objects. A fresh staging replay should apply all 62 in order; do not skip the historical Auth or folded migrations.

## Risk findings across all SQL files

| Risk | Files / finding | Staging action |
| --- | --- | --- |
| Automatic scheduled database writes | `20260921120000` and folded `20260922100000` each try to install `pg_cron` and schedule analytics/payment-session purges. `20260925110000` installs `pg_cron` and schedules wallet-credit release. These can run automatically after commit. | Staging copies remove only these three complete `DO` setup blocks. The purge and wallet functions, tables, indexes, grants, and all later dependencies remain. No `pg_cron` extension is enabled. |
| Outbound HTTP / `pg_net` | No executable `pg_net`, `net.http_*`, HTTP request, Supabase URL, or hardcoded project ref occurs in the 62 migrations. `20261020103000` has a commented cron example only. | Keep the separate `supabase/*_cron_setup.sql` files out of the bundle. `play_catalog_cron_setup.sql` and `play_payment_cron_setup.sql` hardcode production Edge URLs; `ucb_cron_setup.sql` can schedule outbound requests. |
| Play catalog actions | `20261016100000_play_catalog_sync.sql` creates `play_price_sync` and log tables, queue functions, two queue triggers, and a one-time queue backfill. `20261019150000` adds queue fences. | Preserve schema and triggers; on empty staging catalog the backfill produces no work. Never deploy `sync-play-catalog`, a Play worker, or their cron; keep their secrets absent. A future product/notes write can queue locally but cannot create Play products without an external worker. |
| Payment actions | Razorpay settlement RPCs, payment triggers, UCB/Play job tables and workers' claim functions are created. `orders_02_tax_snapshot`, payment write guards, discount reservation, and purchase snapshot triggers execute on later row writes. | Preserve schema and security behavior. No Razorpay/Play Edge Functions, provider credentials, webhook registrations, or worker cron in staging. Do not create payment test rows as part of migration validation. |
| Destructive or privileged SQL | No executable top-level `DROP TABLE` or `TRUNCATE` was found. 51 files define or mention executable `SECURITY DEFINER` functions. Purge/account-deletion functions contain `DELETE`; other files drop/recreate policies, triggers, constraints, and grants. Early baseline grants are broad until later hardening migrations run. | Keep project unused by clients through the entire replay. Verify final RLS, grants, triggers, constraints, and functions; a partial replay is not a usable environment. Do not invoke deletion or settlement functions. |
| Production-only assumptions | Baseline was reconstructed from a production schema and assumes managed schemas/roles. Multi-course migration contains backfills and a BAMS seed; on empty staging these are benign. Some files reference `auth.users` and `storage.objects`. `20261018130000` creates only `note-quarantine`; baseline does not seed `notes` or `thumbnails` buckets. | Managed prerequisites exist on staging. Keep all backfill SQL; there are no production users or content to copy. Create empty staging `notes`/`thumbnails` buckets only under a separate, reviewed storage setup if app validation later needs them. |
| Production store listing | `20260920130000` and its folded copy seed a production Android store URL; `20261020102000` corrects it to the production package `in.medveda.app`. | Staging copies seed and correct to `in.medveda.staging`; no product or price changes occur. |

No migration contains a literal production Supabase credential. This statement covers migration SQL only, not `.env` files or Dashboard secrets. Static review cannot prove runtime trigger behavior or discover configuration outside these files. The staging project currently has no Auth users, Storage buckets, public tables, or custom Auth triggers, so there is no staging application data for backfills to transform.

## Prepared staging-only SQL

Run `python3 supabase/staging/prepare_migrations.py --output <empty-directory>` to make 62 ordered staging copies and a SHA-256 manifest next to that directory. The preparation script makes five file changes only: it removes the cron setup block from `20260921120000`, `20260922100000`, and `20260925110000`; and it changes the store URL seed/correction in `20260920130000`, `20260922100000`, and `20261020102000` (the folded file has both changes). It rejects changed cron block shapes, wrong file count, duplicate versions, a changed source file (against `reviewed-source-sha256.json`), and active SQL containing a production project ref, cron schedule, `pg_net`/`net.http_*`, or the old production store URL. Original migration files are untouched.

The generated bundle for this audit is `/tmp/medveda-staging-prepared-verified/migrations`, with `/tmp/medveda-staging-prepared-verified/migration-manifest.json`. Its 62 files passed the script's static checks. The bundle is a local artifact only; no SQL in it was run.

## Exact future staging-only execution plan — **do not run during this audit**

Prerequisites: complete a clean replay on a disposable Supabase-compatible environment, install a Supabase CLI version supporting `migration up --db-url`, verify the staging database password/URL through the staging Dashboard, and re-run the read-only history/catalog preflight. Keep staging app clients and all payment/catalog/worker functions disabled. Use a **direct** staging database host, not a pooler or the linked project.

```bash
cd /home/ganeshp8545/AyurPulse
STAGING_WORKDIR=/tmp/medveda-staging-deploy
mkdir -p "$STAGING_WORKDIR/supabase"
cp supabase/config.toml "$STAGING_WORKDIR/supabase/config.toml"
python3 supabase/staging/prepare_migrations.py --output "$STAGING_WORKDIR/supabase/migrations"

# Supply this value privately; never paste the password into a committed file.
read -rsp 'Staging direct Postgres URL: ' STAGING_DATABASE_URL; echo
export STAGING_DATABASE_URL
python3 - <<'PY'
import os, urllib.parse
u = urllib.parse.urlparse(os.environ['STAGING_DATABASE_URL'])
assert u.scheme in ('postgresql', 'postgres')
assert u.hostname == 'db.nsmsqsogedzohwboripd.supabase.co'
assert u.port == 5432 and u.path == '/postgres' and u.username == 'postgres'
assert 'xbvenkfmesugrbjuufyw' not in os.environ['STAGING_DATABASE_URL']
print('Explicit staging direct database host verified')
PY

# Read-only preflight: expect zero migration versions, no public tables, no pg_cron.
PGOPTIONS='-c default_transaction_read_only=on' psql "$STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc \
  "select (select count(*) from pg_tables where schemaname='public'),
          to_regclass('supabase_migrations.schema_migrations') is not null,
          exists(select 1 from pg_extension where extname='pg_cron');"
supabase --workdir "$STAGING_WORKDIR" migration list --db-url "$STAGING_DATABASE_URL"

# Deployment command after all gates pass; applies only the prepared 62 copies.
supabase --workdir "$STAGING_WORKDIR" migration up --db-url "$STAGING_DATABASE_URL" --include-all

# Read-only postflight; expect 62 versions, 46 public tables, no cron extension/job.
PGOPTIONS='-c default_transaction_read_only=on' psql "$STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc \
  "select count(*) from supabase_migrations.schema_migrations;
   select extname from pg_extension where extname in ('pg_cron','pg_net');
   select count(*) from pg_tables where schemaname='public';
   select to_regclass('cron.job') is null as no_cron_catalog;
   select tablename, rowsecurity from pg_tables
     where schemaname='public' and tablename in
       ('orders','purchases','payments','wallet_ledger','play_price_sync',
        'play_payment_jobs','note_pdf_validation_jobs','verified_quiz_attempts')
     order by tablename;
   select to_regprocedure('public.create_play_order(uuid,text)') is not null as play_order_rpc,
          to_regprocedure('public.purge_expired_first_purchase_identities()') is not null as retention_rpc;
   select tgname from pg_trigger where tgrelid='public.products'::regclass
     and tgname='products_queue_play_price' and not tgisinternal;"
unset STAGING_DATABASE_URL
```

Before the deployment command, compare `migration list` to the 62-file manifest; if staging is no longer empty, stop and re-audit. Afterward, verify RLS/policies on the application tables, Auth and Storage triggers/policies, expected constraints/indexes/functions, and absence of cron jobs. If any migration fails, leave staging inaccessible to clients and investigate; do not repair or skip a version blindly. Do not run `db push`, `migration repair`, any Edge deployment, cron setup SQL, or production data import.

The direct-host equality check and `--db-url` make the command independent of the production CLI link. It will fail closed for a production URL. This is a proposed command path; it has not been executed or runtime-tested in this audit.
