# MedVeda release gates

Current source handoff: 8 November 2026. This checklist supersedes removed audit
summaries and old Play-only/UCB rollout plans. It does not certify a deployed
service, signed artifact or payment. Dated runbook observations are historical;
obtain fresh inventories before using their commands.

## Production Android build

From the repository root:

```sh
cd mobile-app
npx eas-cli build --platform android --profile production
```

The production profile selects the production EAS environment, an Android
`app-bundle`, remote versioning with auto-increment, the production channel and
disabled new purchases. `internal-testing` also uses the production backend with
purchases disabled; it is not isolated staging. Building and release approval are
separate steps. The production **submit** profile currently targets the **internal**
Play track; inspect `mobile-app/eas.json` before submission.

Use the [submission guide](../mobile-app/PLAY_STORE_SUBMISSION.md) for signing,
Firebase, listing and reviewer access. Verify package `in.medveda.app`, a
versionCode above all accepted Play artifacts, certificate, SHA-256, merged
permissions, native dependencies and 16 KB compatibility on the exact AAB.
The Notes purchase work restores `expo-iap`/BillingClient. Check the billing
dependency, merged permission and native runtime on the exact new artifact.
A JS export or generated manifest is not final native-artifact evidence.

## Purchase and historical transaction boundaries

- Production and Play internal testing must show purchases unavailable, open no
  checkout/external payment link, and preserve existing account-bound Notes.
  Videos and MCQs are free.
- The distinct `razorpay-internal-test` APK has local routing, a separate native
  package/runtime/channel and staging backend. It needs a real staging public
  key. It now targets the isolated `create-order-nonplay-test` endpoint, prepared
  locally with an exact staging-project/test-key/server-opt-in/account-allowlist gate.
  Standard `create-order` retains the native guard in repository source.
  Follow the [current setup and evidence](audit/MEDVEDA_STARTUP_PAYMENTS_2026-11-08.md);
  staging is paused and hosted payment acceptance remains blocked.
- Retain historical Play verification, consumption, pending-purchase,
  void/refund/dispute and external-reporting obligations. Inventory installed
  clients, queues, credentials, jobs and provider duties before backend retirement.
  RTDN is not implemented; live polling/void-sweep operation needs verification.
- Alternative-billing enrolment remains unconfirmed by the owner. The locally
  restored Notes-only Play/UCB flow stays disabled in existing Play profiles.
  Its Alpha validation profile also refuses to build without enrolment confirmation
  and a real isolated staging key. See the [Notes billing-choice handoff](audit/MEDVEDA_NOTES_BILLING_CHOICE_2026-11-08.md)
  for exact deployment prerequisites, local evidence and device acceptance.
- Use the [Razorpay deployment and rollback handoff](audit/MEDVEDA_RAZORPAY_FIXES_2026-11-04.md)
  for the prepared migration, four affected Edge bundles, backup and acceptance.
  Confirm `APP_ENV=production` with live keys or `APP_ENV=staging` with test keys;
  `ALLOW_TEST_MODE` is ignored. Maintain disabled Play purchasing during rollout.
- Keep referral/wallet rollout disabled until economics and compensation
  procedures are approved; confirm `referral_settings.enabled` live. Approve
  full automatic-refund policy, operator, customer message and response deadline.
  Provider acceptance must prove marker lookup/retries avoid duplicate refunds.
  November reservation transfer supersedes the old proposal to consume a first
  discount permanently after a failed unpaid checkout.

## Deployment and operational acceptance still required

| Gate | Required evidence / procedure |
|---|---|
| Project and access | Fresh read-only Management API access on 8 November confirms production `xbvenkfmesugrbjuufyw` is active and staging `nsmsqsogedzohwboripd` is INACTIVE. Staging payment functions and payment secret names are absent. Production create-order v23 lacks the repository native guard and APP_ENV validation; it contains older ALLOW_TEST_MODE logic. Do not infer deployed parity from local checks. See the [current evidence](audit/MEDVEDA_STARTUP_PAYMENTS_2026-11-08.md). |
| Migration provenance | Refresh local/remote histories and compare definitions, grants, RLS and prerequisites. Never blindly push every pending file. The historical `20260801` same-version/body mismatch needs object-level review, not history repair. |
| Staging isolation | Follow [staging preparation](../supabase/staging/README.md) and its [safety review](../supabase/staging/MIGRATION_SAFETY_AUDIT.md). Refresh the frozen manifest/preparation logic for the current inventory; historical counts are not today's expected count. Use synthetic accounts and test-only integrations. |
| Quiz/admin URL cutover | Follow the [compatibility and rollback procedure](audit/MEDVEDA_RELEASE_COMPATIBILITY_STAGING_READINESS_20261023.md). Prove hosted answer-free RPCs, old/new client behavior, AAL1/AAL2 and private Storage access. Never restore raw answer reads or public Notes. Local quiz-file cleanup still needs device-upgrade acceptance; copies outside app-managed storage cannot be recalled. |
| Course/year persistence | Stage `supabase/migrations/20261104110000_course_year_profile_confirmation.sql`. The client requires a fresh exact profile match; hosted caller-only missing-profile repair and authenticated save/refresh remain unverified. Run course-year selection/confirmation scripts and `supabase/tests/course-year-profile-selftest.sh` against disposable PostgreSQL. |
| Razorpay settlement | Stage `supabase/migrations/20261104100000_razorpay_snapshot_discount_retry.sql` with snapshot, retry, concurrency, callback/refund and legacy-client acceptance from its handoff. Preserve historical financial rows. |
| Real payment acceptance | For a permitted isolated non-Play distribution, prove genuine test checkout → capture → webhook/server verification → exact purchase → authorized Notes bytes → My Purchases. Include cancel/pending, duplicate delivery, refund and process death. Hosted/device acceptance is unverified. |
| Backup/recovery | Use the [backup guide](phase0/BACKUP_GUIDE.md). The [restore limitation](audit/MEDVEDA_PRODUCTION_BACKUP_RESTORE_READINESS_20261023.md) remains: application-table restore passed, complete managed Auth/Storage restore did not. Verify object bytes, external configuration and recovery time in a compatible isolated environment. |
| Admin MFA | Follow [ADMIN_MFA.md](security/ADMIN_MFA.md), enroll/recover all admin factors and verify RLS, quiz, upload, push and URL enforcement. Historical default/off observations do not establish today's setting. |
| Workers and alerts | Inspect consume/reconcile/void/refund/reporting queues, oldest pending age, parked jobs and successful scheduled runs. Do not invoke the catalog worker as a read-only probe or blindly restart terminal jobs. |
| Google catalog incident | The [PATCH 403 incident](audit/MEDVEDA_PLAY_PATCH_403_2026-10-27.md) is unresolved. Preserve sanitized evidence; application UUIDs are not Google request IDs. [Catalog setup](PLAY_CATALOG_SYNC_SETUP.md) supports separately reviewed backend operations; mobile Billing need not be restored for diagnosis. |
| Privacy/retention | Resolve operator/address/grievance details, audience/minor handling, provider region/retention and deletion exceptions using the [roadmap](ADULTS_ONLY_PRIVACY_ROADMAP.md), [deletion proposal](ACCOUNT_DELETION_CHANGE_PROPOSAL.md) and [identity-cleanup procedure](audit/PRIVACY_OWNER_ACTIONS_20261026.md). Prove identity/analytics schedules and lag before retention promises. |
| Auth/site/deletion | Verify SMTP/Resend, Auth hooks/redirects, recovery/MFA, legal/bridge URLs and monitored outside-app deletion requests. Test synthetic in-app deletion and enumerate retained server/device records. |
| Monitoring | Follow [SENTRY_SETUP.md](../SENTRY_SETUP.md). Prove symbolicated native/JS release events and backend alerts without exposing private data. |
| Dependencies/diagnostics | Re-run current dependency/security checks; dated advisory counts are not release evidence. Use frozen `supabase/deno.lock` with a compatible toolchain. Keep the [diagnostic retirement procedure](audit/DIAGNOSTICS_RETIREMENT_20261026.md) until investigation/support obligations close. |
| Device/Console | Complete the [device checklist](../REAL_DEVICE_RELEASE_TEST_CHECKLIST.md) and [performance checklist](audit/MEDVEDA_PERF_ANDROID_CHECKLIST_2026-10-27.md) on the exact new binary. Verify push, recovery, offline upgrade, account switch, reviewer access, declarations, listing and pre-launch results. |

## Unresolved offline PDF encryption requirement

Paid PDFs and license timestamps still lack the requested encrypted local
storage. Seven-day/account gates do not satisfy this requirement. Acceptance:

1. Protect a random per-user key in OS secure storage. Authenticate encrypted
   chunks and owner/note/version/order/length metadata. Protect license,
   checked-at/last-seen-at data while retaining expiry/clock-rollback denial.
2. Encrypt network chunks before persistent writes. The resumable downloader
   writes plaintext; post-download encryption is insufficient. Validate native
   streaming with bounded large-PDF memory; the installed blob transformer
   buffers the full response and requires a native transformer.
3. Publish completed ciphertext atomically after integrity/length checks. On
   interruption, retain only incomplete ciphertext and safely retry.
4. Migrate/invalidate legacy plaintext, clean orphan/native-viewer caches and
   test missing keys and interrupted migration. Do not count old rows as secure.
5. Authenticate before exposing content; decrypt only to a private temporary
   viewing file. Clean it on close/background/logout/account switch, invalidate
   in-flight work on account changes and purge leftovers on next startup after
   process death. Native lifecycle handling is required.
6. Test 1/10/50/100 MB PDFs on low-end and normal Android devices, ten cold/warm
   opens each. Record median/p95 first-page latency and peak memory; cover expiry,
   clock rollback, revoke/refund, disk full, restart/reboot and upgrade. Agree
   latency/memory budgets before shipping.

This Markdown cleanup supplies no encryption implementation or release approval.
Resolve applicable gates with fresh evidence and record the reviewer/artifact.
