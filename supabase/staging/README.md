# Isolated staging preparation

Target project: `nsmsqsogedzohwboripd` (`https://nsmsqsogedzohwboripd.supabase.co`).
Production: `xbvenkfmesugrbjuufyw`. The checkout's `supabase/.temp/project-ref`
still points to production. Never rely on the implicit linked project for staging.

## Local configuration

- Admin uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in
  `admin-panel/src/config/supabase.ts`. Copy `admin-panel/staging.env.template` to
  ignored `admin-panel/.env.staging.local`, insert only the staging publishable
  key, and use `npm run build:staging`. Vite staging mode checks the exact URL,
  target marker and key against the known production publishable key. The
  existing `admin-panel/.env` remains production.
  `admin-panel/vercel.json` has a production-only diagnostic rewrite and CSP;
  `admin-panel/staging.vercel.template.json` is a separate staging deployment
  reference with neither a payment diagnostic rewrite nor a production host.
  A staging deployment must use a separate deployment root/configuration;
  deploying the staging `dist/` with the current `vercel.json` is unsafe.
- Mobile uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in
  `mobile-app/src/config/supabase.ts`. The `staging-validation` EAS profile pins
  the staging URL, `MEDVEDA_BUILD_TARGET=staging`, payment provider `disabled`,
  a distinct Android package/channel, and a blocking key placeholder. Its key
  must be replaced with the staging publishable key before a future build.
  `mobile-app/staging.env.template` is a reference, not an automatically loaded
  `.env`. Keep `mobile-app/.env` and existing EAS profiles untouched. Inspect
  the remote EAS `preview` environment before building; this local checkout
  cannot establish what remote variables or file secrets it contains.
- Edge deployment settings are described by `edge-functions.json` and
  `edge.env.template`. They do not alter `supabase/config.toml`, set hosted
  secrets, or deploy functions. A future deployment must name
  `--project-ref nsmsqsogedzohwboripd` explicitly and select only reviewed
  functions from `initialFunctions`. The Supabase runtime injects its own URL
  and service credentials. Set `APP_ENV=staging` only in staging secret storage
  before a future deployment. Leave Play, Razorpay, worker, and cron secrets
  absent. No payment, catalog, worker, push, or diagnostic function belongs in
  the initial deployment.

Publishable keys are frontend values; a service-role or secret key must never
be used in `VITE_` or `EXPO_PUBLIC_` variables. The local guards reject the
known production key and URL, but a new publishable key is opaque: its project
ownership must be checked against the staging Dashboard before replacing the
placeholder. The mobile profile currently cannot build with the placeholder.

## Migration review before any database work

The staging Management API showed zero recorded migrations. This checkout has
62 SQL files in `supabase/migrations`; the baseline
`20260701000000_baseline_live_schema.sql` expects Supabase's `auth`, `storage`,
and `extensions` schemas and roles. It does not create Storage bucket rows.
Later migrations depend on earlier tables and functions, so the full ordered
chain needs a reviewed staging plan. A blanket `db push` is unsafe here.

These migration files contain executable `cron.schedule` calls:

- `20260921120000_analytics_retention.sql` schedules analytics and payment
  session purges.
- `20260922100000_phase1a_sync_and_order_security.sql` repeats those jobs.
- `20260925110000_phase2_wallet_ledger.sql` schedules wallet-credit release.

`20261020103000_first_purchase_identity_retention.sql` contains a commented
schedule example only. No schedule was enabled during this preparation.
Before any future migration application, review and stage a forward-safe plan
that prevents all cron activation until explicitly authorized; do not edit
applied migration history or run the current chain unexamined.

The separate `supabase/play_catalog_cron_setup.sql` and
`supabase/play_payment_cron_setup.sql` hardcode production function URLs. Never
run them on staging. A staging-specific scheduler design would need staging
URLs, staging-only secrets, explicit authorization, and a separate Play catalog
isolation decision. The current SKU generator uses a shared `notes_<price>_v_`
namespace; the mobile staging app uses `in.medveda.staging` and disables
checkout. Google Play catalog creation is outside this setup.

No migrations, Edge Functions, Vault values, buckets, Auth users, or cron jobs
were created or changed by these files.
