# Backend deployment order and operations

## Current operational constraints — preserved 16 November 2026

This section supersedes conflicting historical guidance below. It preserves pending
operational requirements from the Markdown cleanup candidates; it is not a new
audit, hosted-state verification, deployment authorization or release approval.
Dated reports do not establish present production state. Reinventory source,
project, hosted functions, migrations, settings and jobs before any operation.

### Current application and release boundary

The latest local cleanup removes native Play Billing/IAP, restore and diagnostic
UI, while retaining historical provider decoding and backend financial recovery.
Notes use the existing Razorpay chain; paid Notes remain ONLINE ONLY
(`PAID_NOTES_OFFLINE_ALLOWED=false`). Free previews/quizzes retain offline support.
Do not reactivate Play/UCB or native restore to preserve historical records.
Keep financial schema, provider secrets, settlements, webhook inbox, purchases,
refund/dispute/reporting/recovery duties and all existing catalog types intact.
Four active `other` catalog entries were reported; do not silently filter/delete
or reclassify them. Historical Play counts/obligations require fresh inspection.

Native runtime IDs now carry `no-iap-v1`; retain that compatibility boundary.
OTA cannot remove native Billing permissions from installed binaries. The latest
report records a successful disposable merged release manifest/dependency check,
not a signed APK/AAB build or physical-device acceptance. Qualify the exact new
binary: package/versionCode/certificate, Firebase/FCM, runtime/channel, manifest
without BILLING, native 16 KB support, source maps, push and Play Console policy.
Real-device Razorpay purchase -> capture -> verified owned purchase -> protected
Notes readback, cancel/pending/late webhook, duplicate delivery, process death,
refund/revocation and account changes remain unverified for that binary. Provider
operations and release builds require their own authorization.

Older free-only plans require `purchase_settings.new_orders_enabled=false`;
later Razorpay work changes local routing. This cleanup chooses neither production
sales state nor release scope. Verify the actual profile/settings and obtain a
reviewed release decision; do not infer activation from source or old reports.
Hosted creator/verifier/webhook parity, live key pairing, capture policy and
entitlement delivery remain unproven. Pending polling uses attempt counts rather
than a strict elapsed-time bound; test slow networks and checkout interruptions.

### Pending hosted retirement, not executed by local cleanup

The three local `diagnose-play-*` routes were removed, but hosted retirement is
still a manual pending operation. First release/verify the admin panel without its
rewrite and check external callers. Capture exact original function source/JWT
settings for recovery; then review deletion of only `diagnose-play-service-account`,
`diagnose-play-pricing`, and `diagnose-play-matrix` on the explicitly named target.
Discover installed CLI flags with `--version` and `functions delete --help`;
never use prune or delete other functions/secrets as incidental cleanup.

Four inactive cron jobs were reported: (8, play-catalog-sync), (9, play-consume),
(10, play-reconcile), (11, play-voids). Before any separately approved removal,
privately save their definitions and recheck IDs, names, inactive status and target.
In a transaction remove only exact inactive ID/name matches; require four true
`cron.unschedule` results or roll back. Preserve all other jobs. Recovery may
restore definitions only INACTIVE. Never print secret-bearing cron command text.
Historical backend settlement/recovery/reporting retirement is a separate decision.

Google catalog PATCH 403 remains unexplained by retained evidence: the UUID in
its log is an application correlation ID, not a verified Google request ID.
The original upstream message/request ID and runtime regions version were not
recovered. Sanitized evidence remains under
`docs/audit/evidence/play-patch-403-20261027/production-readonly.json`.
Do not invoke catalog workers/retry jobs as read-only diagnostics: they can write
Google products. Local diagnostic removal does not resolve the incident.

### Reviewed schema boundaries and isolated staging

Production is `xbvenkfmesugrbjuufyw`; isolated staging is
`nsmsqsogedzohwboripd`. The linked CLI project was production and staging was
reported inactive; recheck both. Use explicit target identity. Staging needs its
own publishable key, package/channel, env and deployment configuration; do not
ship staging assets under production admin CSP/config. Never expose service keys
through VITE_/EXPO_PUBLIC_ variables. Source placeholders intentionally block
unqualified staging builds. Inspect remote EAS environment/file inputs privately.

The prior free-only v1 reviewed pending migration order is retained for scope
review, not automatic application. Apply only absent, verified prerequisites,
through migration-history-aware delivery, with per-step staging acceptance:

1. `20261112104610_audit_batch1_refund_revocation.sql`
2. `20261112150427_audit_checkout_publication_guard.sql`
3. `20261114040000_fix3_content_push_and_delete_guards.sql`
4. `20261114040100_fix3_flag_resolution_row_count.sql`
5. `20261114050000_fix4_new_sales_disabled.sql`
6. `20261114050200_fix4_notification_requests.sql`
7. `20261114050300_fix4_snapshot_rpcs.sql`

Keep retained migrations byte-identical; never blanket-push or rewrite history.
The historical `20260801` version/body mismatch needs object-level provenance
review. Stage reversal/settlement authority before matching guarded handlers,
then matching admin/mobile. Verify refund/duplicate/capture/publication/owner/AAL
and blocked-user boundaries with synthetic data, notification reservation/replay,
accurate affected-row results and snapshot privacy. Preserve source/config JWT
settings at the selected revision; dated runbooks disagree on upload gateway
settings, so inspect the exact bundle/config and independent bearer/admin/MFA
checks. `verify-payment`, `razorpay-webhook` and push paths need their independent
HMAC/auth guards when gateway verification is disabled.

The report-external-transaction Fix 3 overlay is `index.fix3.ts` plus shared
`paymentQueueFix3.ts`; canonical old handlers do not automatically include it.
Review source selection/import closure and invocation deadlines before any worker
activation. Use `supabase/checks/ucb_postdeploy_checks.fix3.sql` for its matching
candidate. Historical A->B->C->D financial packages require fresh drift, private
finance crosswalk/receipts and exact artifact approval; no report grants execution.

Free-only v1 explicitly EXCLUDES retention scheduling migration
`20261114050400_fix4_identity_retention_schedule.sql`, wallet migration
`20261114090000_fix5_wallet_expiry_facts.sql`, optional owner-policy SQL and
blocked candidates. These files remain untouched in the repository. Several
older migrations execute cron.schedule; staging preparation must prevent
unapproved jobs. Catalog/payment cron setup SQL contains production URLs and
must not run on staging. Paid-video Batch 2 stays held outside migrations;
its far-future filename is a placeholder, not a deployable release timestamp.
Moving it would require fresh timestamp, guard paths, old-client compatibility
and keeping existing videos free. Do not apply it as routine pending SQL.

### Unresolved security, privacy and monetary decisions

MOB-12 session envelope v2 uses unauthenticated AES-CTR; owner deferred AEAD to
v1.1. It remains a storage-tampering risk, not a forged-server-JWT claim. Future
v3 needs reviewed compatible AES-GCM, strict schema/AAD/context/generation binding,
server-validated legacy migration, owner/auth-epoch checks, key-first publication
and interruption/locked-key tests. Offline/transient refresh must preserve v2;
never recursively refresh from storage.getItem. No unauthenticated shadow writes.
Old readers cannot read v3; rollback needs a compatible bridge or may force login.
No dependency installation, migration, key rotation or logout is authorized here.

MOB-08 preferences are device-wide; background/killed delivery lacks server
preference authority. Foreground filtering needs matching sender deployment;
submitted notifications cannot reliably be recalled. Server preference design
and product/default/conflict decisions remain deferred. CFG-02 minimatch10
build-tool exposure needs current audit, artifact-bound runtime exclusion and
signed residual-risk acceptance; old advisory counts are not current evidence.
Full SQL/export completion and old analytics fixture failures were unproven in
the latest Fix 6 handoff; do not convert those into passes by deleting reports.

Wallet historical expiry/hold/reversal exposure remains separate from new sales.
Canonical no-expiry is NULL; UI zero normalizes to NULL, direct DB zero is invalid.
Fix 5 changes balance functions to potentially write lazy expiry facts: do not
use them as read-only probes. Preserve immutable ledger amounts/times and stamped
legacy dates. Rehearse the exact backfill on an authorized isolated history copy,
run full/concurrency checks and 19 staging smoke markers, and stop on preflight
abort. Rollback after posted monetary facts is forward-only; never restore old
time-filter arithmetic/delete facts. Rejection after release does not automatically
claw back credit. Finance must approve refund/compensation policy and reconcile
FIN-001/FIN-002/FIN-G001, provider gaps and ambiguous acknowledgements before any
replay/refund. Keep optional policy and failed candidates quarantined.

The dormant encrypted PDF vault has not been activated/accepted. It is not proof
that legacy plaintext is encrypted. Preserve unknown-owner data and interrupted
migration evidence; do not auto-evict/reset/replace keys. Paid-online-only cleanup
needs physical-device verification of completed/partial/temp/native-viewer bytes,
retry on disk failure, account A->B->A and preserving free content. Also qualify
recovery/deep-link/MFA cold/warm lifecycle, SQLite result/outbox atomicity across
kill/restart, notification gestures, low-end performance, large text/keyboard,
expiry/clock rollback/revocation and native rendering. Host mocks do not close
these gates or the dormant vault activation requirement.

Before admin MFA activation, deploy all guards, enroll every admin, test recovery
and AAL1 denial/AAL2 success. Enable only after explicit operational approval.
Break-glass disabling of `set_admin_mfa_required` is an incident decision; restore
enforcement after factor recovery, rather than leaving it off. Keep answer-free
quiz access and private Notes; never restore broad grants/public storage.

Resolve audience/minor consent (no verified age/guardian flow), operator/address/
grievance details, provider region/retention, deletion exceptions and actual
outside-app deletion handling. Preserve the 180-day first-purchase identity clock
and 8-year financial-policy decision pending legal review; account deletion does
not reset first_purchase_at. Do not promise automatic purge without verified
scheduler operation. Identity purge removes whole rows strictly older than 180
days, including active accounts, and may affect eligibility. Review counts/body/
service-only grants, synthetic boundary tests and approved cadence/lag first.
The newer scheduling migration may enable cron even though an older example was
commented. Monitor two successful runs and cutoff/lag aggregates; failures extend
lag and unscheduling cannot restore deleted rows. Analytics 12-month cleanup and
Sentry retention are separate unverified operations. Verify hosted Auth redirects,
SMTP, fixed-scheme bridges and website headers; source config is not live proof.

### Additional preservation checks before approved deletion

The three locally edited mobile documents and two untracked cleanup reports were
rechecked against this record before deletion. Their pending requirements are
preserved here; stale claims about retaining expo-iap/native restore are superseded
by the current no-IAP source boundary, not adopted as current instructions.

- Validate actual release data collection/sharing, network/SDK behavior and Console
  declarations against `mobile-app/src/constants/privacyInventory.ts`, current
  packages and enabled providers; earlier worksheets are source-only evidence.
  Notification preferences/read/archive state and pending-referral email/code have
  local persistence; deletion/logout/device residue need real-device verification.
  Free-preview checked offline grace is at most seven days; legacy downloads need
  online validation, clock rollback denies grace, and confirmed 401/403 invalidates
  verification and removes the local download. Quiz downloads must exclude answers.
- For any separately approved external billing/reporting operation, preserve the
  order's buyer state, authorized amount/currency and immutable tax snapshot. Prior
  owner guidance was GST 0%; verify actual policy/config before relying on it.
  Never recompute historical tax from list price or later settings, and never
  expose card/UPI/bank credentials to app storage or logs. Play distribution policy,
  enrollment/eligibility and listing/reviewer wording require explicit review of
  the actual Razorpay-enabled binary; contradictory old listing drafts do not
  certify eligibility. Reviewer credentials belong only in the Console.
- Available public-site source is `website/`; `github-original-website` was excluded
  from earlier copy edits. A separate owner `medveda-website` repository/deployment,
  stored notifications, remote product descriptions, artwork, screenshots and
  translations were not verified. Do not claim all public wording was corrected.
- Current Store selection can choose among duplicate offers without explicit order;
  the reported Sanskrit typed-Notes/other overlap needs device/catalog review.
  Do not deactivate/reclassify the four `other` products casually: it can change
  valid sales and wallet eligibility. Any future exact-ID deactivation requires
  saved states, affected-row review and rollback; existing triggers may enqueue
  dormant catalog work, which must not be cleared by invoking a worker.
- Empty current Play/external-token tables do not prove absence of old binaries'
  unsubmitted receipts, archived orders or external provider obligations. Do not
  delete backend verification/consume/void/reporting or their keys without private
  archive/provider reconciliation and an approved replacement/support disposition.
  Edge secrets are distinct from Vault, Google Cloud and EAS submission credentials.
  Secret removal is last, after dependency proof and a secure recoverable source;
  listing digests cannot recover a deleted secret. Preserve all Razorpay/shared
  credentials. Restoring function source/JWT and inactive job definitions requires
  captured artifacts; never reactivate native Billing/cron as rollback.
- The earlier cleanup's native merge evidence remains in
  `docs/audit/medveda-cleanup-phase2-20261116/`: `native-verification.json`,
  `AndroidManifest.release.merged.xml`, `manifest-merger-release-report.txt`,
  `manifest-merge-both-ndks.log` and `autolinking.json`. Protected input hashes remain
  in `protected-files.json`. Install-referrer and WebView PaymentRequest queries
  are retained dependencies, not evidence of Play Billing. These observations
  still do not prove a packaged release or installed-device purchase acceptance.

### Release verification prerequisites after documentation cleanup

CI still references already-missing `mobile-app/scripts/play-catalog-contract-selftest.cjs`
and `mobile-app/scripts/notes-billing-choice-selftest.cjs`; restore or replace their
coverage through a separately reviewed implementation change, never by silencing
checks. Current local validation also exposes stale disabled-provider assertions,
admin analytics/poll fixtures, a missing legacy Play-offer/diagnostic test and a
SQL deletion-wrapper assertion. Qualified entitlement testing returns HTTP 500
where 400 is expected. Investigate these unchanged tests/source contracts before
claiming a fully passing release; documentation deletion resolves none of them.

### Recovery and operational acceptance

A full production-compatible DB/Auth/Storage restore remains unproven; partial
application-table imports do not satisfy it. Obtain a coordinated hashed recovery
manifest for DB/roles/extensions/ACL/RLS/sequences, Auth identity/MFA, Storage
metadata AND object bytes/versions, runtime/JWT/endpoint settings and accessible
private key escrow. Rehearse with provider/email/push egress and jobs/gates off;
plain PostgreSQL stubs are insufficient for managed Auth/Storage acceptance.
Reconcile provider effects since each component cutoff using a finance-owned
journal: a DB restore cannot reverse captures/refunds/consumed tokens. Never
blindly replay ambiguous outcomes. PITR was reported off and needs fresh review.
Proposed RPO <=5 minutes/RTO <=4 hours were unaccepted targets, not measured
promises. Require named operator/observer/incident owners, monitored alerts,
accepted thresholds/window/lock budget, actual restore measurements and signed
finance/security/release acceptance. Resume ingress, jobs and sales separately.
Previously committed test credentials must remain revoked; no real key belongs
in clients, audit output or Git. Preserve signing/Firebase/env inputs privately.



Current handoff: 4 November 2026. Read [release gates](#current-operational-constraints--preserved-16-november-2026)
first. The September matrix below documents migration dependencies, not current
hosted state. Refresh project/history/schema and verify restorable backups before
any write. The linked production ref must not be used implicitly for staging.

## Current deployment handoffs

- [Isolated staging](#reviewed-schema-boundaries-and-isolated-staging) and [migration safety](#reviewed-schema-boundaries-and-isolated-staging).
- [Quiz/admin URL cutover and forward recovery](#reviewed-schema-boundaries-and-isolated-staging).
- [Razorpay snapshot/retry migration, Edge deployment and rollback](#current-operational-constraints--preserved-16-november-2026).
- Course/year repair: review `migrations/20261104110000_course_year_profile_confirmation.sql`
  against current deployed history; validate caller-only profile creation and
  exact saved IDs in staging before hosted rollout.

Stage only the exact reviewed pending SQL in a separate temporary CLI project;
copy the required configuration, validate the target and dry-run, then apply
through the migration-history-aware workflow. Do not move files out of the
shared checkout, blindly push all pending migrations or use standalone DDL that
omits migration history. Verify grants, counts and dependencies after each step.

## Trusted PDF upload and quarantine deployment

Review these dependencies against live history; do not replay already-applied SQL:

1. `20261018110000_trusted_note_uploads.sql` makes Notes private, restricts direct
   client writes and introduces trusted upload/save state. Coordinate an admin
   upload maintenance window; old direct-upload clients intentionally stop working.
2. `20261018120000_note_upload_deleted_retry.sql` hardens deleted-note/retry paths.
3. `20261018130000_note_pdf_quarantine.sql` adds private quarantine, validation
   queues and service-only leases/RPCs. Keep ambiguous objects and ledger intact.
4. Deploy only the reviewed `upload-note-pdf` after its schema exists; its
   `verify_jwt=false` gateway retains independent bearer/admin/MFA authentication.
   Verify deployed authentication, hash/size match on ambiguous-upload retry,
   invalid/oversized input denial and duplicate-request behavior.
5. Operate `workers/validate-note-pdf.ts` in a supervised private Deno runtime,
   not as an Edge Function. Source currently requires the exact production URL,
   private service-role credentials and `MEDVEDA_VALIDATOR_APPROVAL` equal to
   `APPROVED_QUARANTINE_VALIDATOR`. That flag is a technical guard, not approval.
   The production guard must not be bypassed to claim isolated staging acceptance;
   a separately reviewed staging worker arrangement is needed for that rehearsal.
   Give at least 512 MiB initially, OS CPU/memory limits and a five-minute hard
   deadline. Each invocation processes at most one job; supervise repeat execution.
6. Deploy/enable the new admin upload flow only when schema, function and validator
   are ready. Test draft create/edit/publish/delete, retries and refresh errors.
   Publishing `active=true` affects the shared catalog; use controlled visibility.

Keep over-10 MiB upload use disabled until hosted 1/10/near-50 MiB memory,
timeout/network failure, duplicate worker/stale lease, denied-read and signed
retrieval tests pass. Quarantine uses ten-minute leases and five attempts;
structural/hash PDF validation is not malware scanning. On failure, stop the
worker/new upload UI, retain queues/objects and repair forward; never reopen
public Storage or discard ambiguous objects as routine rollback.

## Historical Play payment support worker

Mobile Billing removal does not retire existing transaction obligations.
`functions/play-payment-worker/index.ts` handles authenticated `consume`,
`reconcile` and `voids` phases; it does not accept caller-supplied purchase IDs.
Review deployed schema/prerequisites including
`20261015100000_play_payment_jobs.sql`, worker revision and queue state first.

Required server secret names: `PLAY_PAYMENT_CRON_SECRET` (32+ characters),
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`; injected Supabase
service credentials stay server-side. `UCB_SENTRY_DSN` supplies best-effort alerts.
The worker's `verify_jwt=false` route authenticates the dedicated
`x-play-payment-cron-secret` header. Current `play_payment_cron_setup.sql` reads
Vault **`PLAY_PAYMENT_CRON_SECRET`** and must match the Edge secret; older
lowercase Vault-name instructions are superseded. Inspect script contents and
project URL before use. Executing that SQL enables jobs; it is not a read-only
health check.

Before any approved scheduling, inventory existing job IDs/names and avoid
running old `ucb-consume`/`ucb-reconcile` alongside the replacement phases.
Enable only the reviewed job, observe at least two successful runs, queue leases,
consumption/reversal and alert behavior, then proceed to the next. On anomaly,
deactivate only that job and preserve queued records. Catalog scheduling is a
separate decision: `sync-play-catalog` can create/activate/rotate products and
must not be invoked as a diagnostic. See [catalog setup](#historical-play-payment-support-worker).

Monitor `play_recovery_metrics`, parked `play_payment_jobs`, void cursor age,
provider failures and Sentry. Parked work needs operator review; a cursor beyond
Google's retained history requires investigation, not blind advancement. Verify
actual service-account/package access and legitimate historical transaction
recovery/refund outcomes. Refresh batches/retries/leases from current source;
old report constants are not current capacity evidence. Retain unrelated
Razorpay/reporting/refund jobs and financial records during any worker change.

## Historical September migration matrix

The following observations and test commands refer to the dated rollout. Use
current source/deployed inventories and the handoffs above for new operations.

`supabase db push` applies EVERY pending migration, and the CLI refuses to push one that is older than
one already applied. Migrations first, then functions, then the admin panel, then the mobile app.
**Batch 2 (paid videos) is held: see the held-video restrictions in the current staging section; it is not in
`supabase/migrations/` on purpose (its file name is a far-future placeholder).**

## State of live when this was written (2026-09-21, from `supabase migration list --linked`)
* Applied: everything up to and including `20260927100000` (Stages 1 and 2 below).
* NOT applied: `20260927110000` `120000` `130000` `20260928100000` `20260928110000` (Stages 3 to 7).
* **`referral_settings.enabled` is `true` on live right now**, and Batch 3 / 3b (referral hardening and
  anti-farming) are not applied yet. Referral is therefore running without them. Either deploy Stages 4 and 5
  before anyone can farm it, or switch the program off in the admin panel until they are live.
  (`require_verified_phone` does not exist yet on live; it defaults to false when Stage 4 adds it.)

## Staging: `db push` cannot pick files
All stage files are now in `supabase/migrations/`, so a plain `supabase db push` would apply every pending stage at
once (in the right order, but with no chance to verify between stages). To deploy one reviewed stage, use the separate temporary CLI project described above,
confirm the dry-run lists only that stage, apply it through the approved migration
workflow and verify its recorded history and schema before proceeding.

| Stage | Migration | Functions / builds | Needs first |
|---|---|---|---|
| 1. Batch 1 (money paths + hygiene) - APPLIED | `20260926100000` `110000` `120000` `130000` | `razorpay-webhook`, `create-order` | Razorpay: subscribe the webhook to `payment.dispute.created / .under_review / .action_required / .won / .lost / .closed`; confirm the API key can read disputes |
| 2. F7 (drop `is_admin()`) - APPLIED | `20260927100000` | - | - |
| 3. F8 (revoke excess grants) | `20260927110000` | - | - |
| 4. Batch 3 (referral hardening) | `20260927120000` | - | - |
| 5. Batch 3b (anti-farming) | `20260927130000` | - | Stage 4 |
| 6. Referral limits + audit | `20260928100000` | - | - (independent of 4/5, but deploy after them) |
| 7. Referral off blocks wallet | `20260928110000` | - | **Stage 5** (re-issues its `create_priced_order` / `quote_my_order`; it refuses to run without it) |
| 8. Admin panel build | - | `cd admin-panel && npm run build`, publish `dist/` | Stage 6 (the change log needs the audit table; the form itself still works without it) |
| 9. Mobile build | - | EAS build / Play release | Stage 7 for the full behaviour (see below) |

Stage 9 does not need a minimum-version gate: an old build keeps working (it only shows a wallet toggle that the
server, after Stage 7, quotes as unavailable while the program is off).

## Verify after each stage (read-only: `supabase db query --linked "..."`)
1. Stage 1: `select to_regprocedure('public.handle_payment_dispute(text,text)') is not null, (select count(*) from purchases where status is null), to_regclass('public.purchases_one_success_per_product') is not null;`
   -> `t | 0 | t`. End to end: buy a Rs 1 test product with a non-admin test account, refund it fully in Razorpay:
   the purchase must become `refunded` and the note/video must lock. A partial refund must change nothing.
2. Stage 2: `select to_regprocedure('public.is_admin()') is null;` -> `t`; log in to the admin panel and save a setting (App Settings page).
3. Stage 3 (F8):
   `select count(*) from pg_class c where relnamespace='public'::regnamespace and relkind='r' and has_table_privilege('authenticated', c.oid, 'TRUNCATE');` -> `0`
   `select count(*) from pg_class c where relnamespace='public'::regnamespace and relkind='r' and relname <> 'analytics_events' and (has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE'));` -> `0`
   App still logs pre-login events; the admin panel still edits content.
4. Stage 4 (Batch 3):
   `select column_default from information_schema.columns where table_name='referral_settings' and column_name='require_verified_phone';` -> `false`
   `select count(*) from pg_policies where tablename='referrals' and policyname='referrals_read_own';` -> `0` (students read referrals through the RPCs only)
   `select exists(select 1 from pg_constraint where conname='profiles_referral_code_upper');` -> `t`
   In the app: Refer & Earn still lists referrals (RPC); the admin Referrals page still lists them.
5. Stage 5 (Batch 3b):
   `select to_regclass('public.first_purchase_identities') is not null, to_regprocedure('public.has_prior_purchase_identity(uuid)') is not null, has_table_privilege('authenticated','public.first_purchase_identities','SELECT');` -> `t | t | f`
   `select (select count(*) from first_purchase_identities), (select count(distinct user_id) from purchases where status='success');` -> first number = second x (1 or 2) (hashes of email and/or phone per buyer)
6. Stage 6 (limits + audit):
   `select (select count(*) from pg_constraint where conrelid='public.referral_settings'::regclass and conname like 'referral\_settings\_%\_range'), (select relrowsecurity from pg_class where oid='public.referral_settings_audit'::regclass), has_table_privilege('authenticated','public.referral_settings_audit','INSERT'), exists(select 1 from pg_trigger where tgname='referral_settings_audit_trg');` -> `7 | t | f | t`
   The CHECK really bites (must ERROR, changes nothing): `update public.referral_settings set wallet_max_percent = 0 where id = true;`
   -> `violates check constraint "referral_settings_wallet_max_percent_range"`.
   After the first real save in the admin panel: `select changed_by_email, old_values, new_values from public.referral_settings_audit order by id desc limit 1;` -> your admin email and only the changed columns.
7. Stage 7 (referral off blocks wallet):
   `select (select prosrc like '%p_use_wallet and v_set.enabled%' from pg_proc where proname='create_priced_order'), (select prosrc like '%v_set.enabled and v_product.product_type%' from pg_proc where proname='quote_my_order');` -> `t | t`
   Behaviour (uses a test account that has a wallet balance; switch the program off, then back on):
   in the app open Order Summary on a notes product -> no "use referral balance" toggle while off, toggle back when on;
   the Referral screen still shows the balance while off.
8. Stage 8 (admin panel): open Referrals -> the form shows the saved numbers (no defaults flash); type wallet 0 or discount 60 ->
   red message under the field and Save disabled; wallet 70 -> confirmation dialog with the Rs 499 example -> Save anyway ->
   "Recent changes" shows the new entry at the top (matches the Stage 6 audit query).
9. Stage 9 (mobile): Referral screen, Order Summary and Referral terms show the numbers currently saved in the admin panel
   (change one in the admin panel, reopen the screen: it updates with no app restart); program off -> no Refer & Earn entry in
   Profile and no wallet toggle at checkout.

## Before referral is (re-)enabled / while it is on
* Decide `require_verified_phone` (no phone-verification flow exists; 0 of 22 profiles are verified; the switch exists after Stage 4).
* The admin panel has NO screen for `order_review_flags` (discount_reused, duplicate_purchase,
  referral_shared_network, ...). Until one exists: `select * from order_review_flags where resolved_at is null;`
* `first_purchase_identities`: see the DB-01 retention review below; the new purge is prepared only.
* F8 default-privileges caveat: `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` is expected to be denied on hosted Supabase (NOTICE only).
* Orders created while the program was on keep the wallet amount they were priced with, even if the program is switched
  off before the student pays (Razorpay was already asked for that exact amount). New orders and quotes get no wallet.

## Tests
`supabase/tests/*.sql` (psql, each rolled back; newer ones end with "N FAIL, M PASS"): `f7_checks`, `f8_checks`,
`batch1_checks`, `batch3_checks`, `batch3b_checks`, `referral_limits_checks`, `referral_off_wallet_checks`,
`phase2_referral_wallet_checks`. Also `batch3_race.sh`, `batch3b_backfill.sh`, `webhook-harness/run.sh`,
`delete-account-harness/`. Build the scratch database from the migrations in order (inspect each test harness and its explicit local setup).

## Release configuration that lives outside the repo (owner-only, set in dashboards / EAS)
* **Sentry**: `npx eas-cli env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value <DSN> --visibility plaintext`, then rebuild. Without it release builds report nothing.
* **Android push**: put `google-services.json` in `mobile-app/` (or EAS file variable `GOOGLE_SERVICES_JSON`) and upload the FCM V1 service-account key with `eas credentials`.
* **OTA code signing**: generate a certificate (steps at the top of `mobile-app/app.config.js`), keep the private key outside git, ship a new store build, then publish with `eas update --private-key-path`.
* **Supabase Auth** (Authentication -> Sign In / Providers): Password requirements = min 8 with lower, upper, digit and symbol; leaked-password protection ON; email confirmation ON. Phone OTP needs an SMS provider (Twilio / MSG91 / ...) before the app can verify numbers; the database side (`sync_profile_mobile_verified`) is already in place.
* **App versions**: the user-visible version lives in `mobile-app/app.json` (`expo.version`, kept equal to `package.json`); the Android `versionCode` is owned by EAS (`appVersionSource: remote`, `autoIncrement` on the production profile; `npx eas-cli build:version:get -p android -e production` shows it), so it is not set in the repo. `app_config.min_app_version` must never exceed the newest version that is live on Play.
* **R8 / resource shrinking** is not on for production. Build the `shrink-test` profile (`eas build -p android --profile shrink-test`), test login, notes open + download, checkout, push, then ask for it to be enabled on `production`.

## DB-01 retention — prepared for owner/legal review, not applied

New forward migration: `20261020103000_first_purchase_identity_retention.sql`.
It defines a service-role-only purge and an age index, with NO purge invocation,
NO scheduler changes and NO payment/referral RPC changes. The cron.schedule
pattern is commented SQL for separate owner review. No DB writes were run.

Disclosure draft: fraud-prevention email/phone hashes and original account ID
are kept up to 180 days after account deletion, then deleted. Expiry is measured
from `first_purchase_at`, so deletion can occur sooner after account deletion.
There is no reliable account-deletion timestamp in this table. This is a fixed
180-day identity-record lifetime, including active accounts, not a fresh 180-day
window on deletion. Existing old rows become eligible immediately on first run.
Do not publish the retention promise until the purge is enabled, its cadence and
cutoff lag are accepted, and failures are monitored; preparing this SQL alone
provides no runtime retention guarantee. Owner/legal review of all draft wording
is required; this change makes no new legal claim.

Anti-abuse review: `record_purchase_identity` uses ON CONFLICT DO NOTHING;
`has_prior_purchase_identity` matches email/phone hashes from other accounts.
Hashes younger than the cutoff keep working unchanged. After 180 days and purge,
a returning identity may qualify again for a first-purchase discount/referral
credit, subject to all other existing eligibility checks. A later successful
purchase may record it again. Existing purchases/orders/referrals are untouched;
active accounts' purchase-history checks remain in place. Never NULL account_id
alone: the existing SQL `<>` guard would stop matching NULL. Whole-row deletion
minimizes both the hashes and account ID at expiry without that interim bypass.

Rollback: use a NEW forward migration, unschedule only the named retention job
if separately enabled, drop the purge function, then drop its age index. See exact
commented SQL in the migration. Purged data cannot be restored by rollback;
do not reconstruct expired identities from financial history. The existing
anti-abuse helpers/schema/grants are unchanged.

Validation is source-only and uses in-memory model tests, with no PostgreSQL
writes, migration replay, live cron checks or deployments. Runtime SQL behavior
and privileges remain for an owner-approved isolated database validation.

### DB-01 post-deploy step — NOT executed; separate owner approval required

After migration `20261020103000` is deployed and the retention cutoff, operational
cadence and monitoring are approved, enable the named job separately. The SQL
below is deliberately commented: it schedules destructive whole-row deletion;
it is not part of migration application. The hourly example can lag the cutoff
by up to one hour plus runtime; accept that lag before publishing a deadline.
Existing expired rows will be removed on the first successful run.

```sql
-- POST-DEPLOY ONLY: review/approve before uncommenting and running.
-- select cron.schedule(
--   'first-purchase-identity-retention',
--   '0 * * * *',
--   'select public.purge_expired_first_purchase_identities();'
-- );
```

Read-only verification after scheduling and after the first scheduled run:

```sql
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'first-purchase-identity-retention';

select r.status, r.return_message, r.start_time, r.end_time
from cron.job_run_details r
join cron.job j on j.jobid = r.jobid
where j.jobname = 'first-purchase-identity-retention'
order by r.start_time desc
limit 5;

select count(*) as expired_rows, min(first_purchase_at) as oldest_expired
from public.first_purchase_identities
where first_purchase_at < now() - interval '180 days';
```

Expect exactly one active job with the reviewed schedule/command and a successful
completed run. Assess expired rows against that run's cutoff and accepted lag:
new rows can age past the cutoff between hourly runs. Missing run history is not
success. Monitor job failures and retention lag; these SELECTs do not invoke purge.
