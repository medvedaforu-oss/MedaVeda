# Phase C local review package — 2026-11-11

Status: LOCAL REVIEW ONLY. Production activation and deployment: NO-GO.
Do not run hosted workers, create provider orders, activate checkout, or use staging.
No deployment/activation script is included. `scripts/prepare-phase-c-release.py`
only copies local sources, computes dependency closures and creates source archives.

Exact source/config/package hashes and per-entrypoint import closures are in
`manifest.json`. Check `checksums.sha256` from repository root. Each tar contains
one entrypoint, its full TypeScript import closure, pinned Deno lock and its own
single-function `supabase/config.toml`. Archives are source candidates, not
Supabase ESZIPs or Android binaries. All external imports are pinned
`npm:@supabase/supabase-js@2.118.0`; the nine-package integrity closure is retained.
The mobile source/asset/config/lock inventory pins the currently disabled app.
No credentials or hosted receipts are supplied.

Prerequisite baseline: 66 retained migrations through 20261104110000. These are
prerequisites, not instructions to replay them against an existing database.
Baseline source hashes are in the manifest. The separately reviewed website
`create-order` remains Phase B B3; Phase C uses `create-order-play-choice`.
Do not replace B1/B2/B3 with broad workspace files on the old schema.

Future owner-reviewed order (NOT executed or authorized):

1. Demonstrate current complete recovery/restore readiness; inspect fresh production
   identity/schema/ACL/index/trigger/drift and migration ledger. Resolve historical
   decisions separately. Keep app and server new-purchase gates off.
2. Phase A A1 -> A2 -> A3, using that phase's independently reviewed process.
   Phase B delivery, if separately authorized, remains its own package.
3. Notes choice 20261108100000 -> recovery 20261109100000 -> final strong MV003
   20261111100000 -> Play snapshot/proof 20261111110000. Do not sort unapplied files
   by timestamp after A1/A2/A3 are recorded. Do not use blanket `db push` or repair
   the ledger to pretend these older pending migrations already ran.
   Notes choice is a one-time CREATE TABLE and is not repeatable; confirm absence.
   Recovery overwrites the proof RPC and token/queue functions; final overrides
   must follow it. Review these four bodies as one atomic dependency change after
   stripping only outer transaction wrappers; otherwise keep all affected entrypoints
   quiescent until every postcheck passes. No combined deployment wrapper is supplied.
4. Independently verify definitions, service ACLs, RLS, valid uniqueness indexes,
   READ COMMITTED writers, preserved financial/catalog fingerprints and schema-cache
   visibility before delivering any Phase C bundle. No historical financial DML.
5. Review verifier/webhook/reporting dependencies as a unit. Then compatible
   receipt/reversal handlers and dormant workers before new reservation/attachment/
   choice entrypoints; keep every schedule and new-purchase gate disabled.
   Unchanged `get-note-url` is an explicitly pinned preservation dependency.
6. Future catalog permission/Console/device/reporting acceptance and scheduling need
   separate owner authorization. A new paid app release or activation is excluded.

Configuration prerequisites (names only, never load hosted credentials locally):

- Injected SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; future production identity
  must be xbvenkfmesugrbjuufyw; APP_ENV=production.
- RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in the correct provider mode;
  RAZORPAY_WEBHOOK_SECRET and optional RAZORPAY_WEBHOOK_SECRET_PREVIOUS. Capture,
  authorized, refund and dispute webhook event delivery needs owner evidence.
- GOOGLE_PLAY_PACKAGE_NAME=in.medveda.app; GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  Android Publisher enabled with package-specific purchase/catalog/external reporting
  permissions. A successful OAuth token does not establish API permission.
- PLAY_CATALOG_REGIONS_VERSION for regional price conversion; verified INR/IN
  standard BUY options mapped in play_price_tiers/play_price_sync. Preserve ₹1/₹2/₹5.
- UCB_REPORT_CRON_SECRET, PLAY_PAYMENT_CRON_SECRET, PLAY_CATALOG_CRON_SECRET
  are distinct secrets, each at least 32 characters. Do not configure schedules here.
- UCB_SENTRY_DSN and independently observed scheduler/queue-age/deadline/parked-job
  monitoring need an operational owner. Best-effort in-handler alerts cannot detect
  a scheduler that never runs or prove alert delivery.
- Leave PLAY_INDIA_UCB_ENROLLED, PLAY_CHOICE_TEST_ACCEPTED,
  ENABLE_PLAY_CHOICE_CHECKOUT unset/false; these switches are approvals, not evidence.
  Do not set app medvedaPaymentProvider=play or its enrollment/acceptance opt-ins.
  `require_ucb_for_razorpay`/`min_app_version` must have reviewed authoritative values.
  Never change existing website gates solely to activate Android.

Worker dependency plan, not a schedule installation:

- report-external-transaction phases reports/refunds/events/compensate: durable
  authorization/capture/inbox/refund/compensation recovery; cadence/capacity must
  satisfy the 24-hour authorization reporting deadline. Existing batch 40, concurrency
  8, 3-minute leases, 12-attempt parking, backoff 60 seconds capped at 3600 seconds.
- play-payment-worker consume/reconcile/voids: separate durable Play jobs and cursor.
  Use this queue for Play consume/reconcile, avoiding overlapping legacy UCB phases.
- sync-play-catalog: prerequisite verified SKU/BUY-option/INR mapping and refresh;
  it writes to Google and must not run without separate authorization.
- Monitor overdue authorization jobs, refund order, parked jobs, oldest deadline,
  cursor lag, provider/API failure and scheduler heartbeat outside these functions.

Fail-safe: keep new purchases disabled on any drift, incomplete deployment, API
permission error, failed acceptance or absent monitoring. Preserve captures, inbox,
queues and all history. Retry the same durable identities only through a separately
authorized operation. No automatic inverse SQL, trigger disablement, price changes,
financial replay/refund, table restore or rollback to a vulnerable pre-Phase-B
bundle. Before commit, abort on failed preconditions; after delivery prefer a reviewed
forward correction or an independently checked compatible safe bundle. Account/Auth/
Storage recovery and provider facts after a recovery point require a demonstrated
owner-approved plan. Source archives and local tests do not prove this readiness.

Detailed status, evidence and remaining blockers:
`docs/audit/MEDVEDA_PHASE_C_LOCAL_READINESS_2026-11-11.md`.
