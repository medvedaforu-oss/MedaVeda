# Owner runbook — HOLD, no execution authorization granted

## 1. Run the existing authenticated identity diagnostic now

The existing production Admin at **https://admin.medveda.in** still contains the diagnostic (verified in the hosted Settings JavaScript); local cleanup intentionally removed that temporary UI, so perform this on the **current hosted Admin before any new Admin rollout**. Its live endpoint `diagnose-play-service-account` is ACTIVE v3, gateway `verify_jwt=false`; the handler itself verifies the Supabase Auth session, checks membership in `public.admins`, and requires `aal2` unconditionally before reading the configured credential. It is GET-only, no-store and returns only a boolean. The diagnostic is not a catalog sync/retry.

1. Open the existing production Admin, sign in with the authorized owner/Admin account and complete MFA.
2. Open **Settings** and find **Google Play service account identity (temporary)**.
3. Click **Verify service account identity** once. Do not click pricing, catalog synchronization, Retry sync, PATCH or product creation controls.
4. Require both **HTTP status: 200** and **service_account_matches_expected: true**. Share only those two fields. 401/403 means session/Admin/MFA failure; a successful false or any error leaves identity unconfirmed. Reauthenticate/MFA for auth errors; do not replace credentials to resolve a false result.

Expected configured email is `medveda-play-billing@medveda-play-billing.iam.gserviceaccount.com`. Expected Cloud project is `medveda-play-billing`. These remain source expectations until the diagnostic succeeds and the owner checks the existing IAM identity/project. The boolean validates the configured JSON client_email only; it does not validate key health, OAuth/token exchange, Google API authorization, Cloud project ownership or catalog PATCH permissions. Do not open/copy service-account JSON, keys, JWTs, access tokens or browser storage. No browser-console token extraction is needed. If the existing control is absent for the signed-in authorized owner, stop and report the UI/HTTP problem; do not restore deleted diagnostic source or deploy replacement credentials.

## 2. Verify the existing Google setup without product writes

In the **existing** Google Cloud project `medveda-play-billing`, check the IAM service account above and that Google Play Android Developer API (`androidpublisher.googleapis.com`) is enabled. Do not create a new account/key/project. In Play Console **Users and permissions**, verify that the same existing identity has access to `in.medveda.app` and the Billing API permissions **View financial data, orders, and cancellation survey responses** and **Manage orders and subscriptions**. Confirm necessary app/catalog management permissions separately if catalog provisioning will later be authorized. Google no longer requires linking the developer account to a Cloud project merely to access the API. See [Google's API setup and Billing permissions](https://developers.google.com/android-publisher/getting_started).

Inspect existing one-time products and BUY purchase options read-only: SKU/option identity, India availability, INR amount matching each paid Notes price, publication/activation state and recent verified readback. Existing catalog permission failures remain a blocker; no catalog PATCH retry or product creation is authorized here. If catalog changes are needed, obtain a separately scoped authorization. For any future approved test, verify the license-tester account and testing track; production billing/payment activation and purchases are outside this task. Confirm an unused versionCode before a future separately authorized build/upload (existing evidence says 15; console acceptance remains unverified). No new EAS/native build is needed for these Admin fixes.

## 3. Approve and validate backup/recovery before deployment

Read `backup-and-restore.md`: exact owner commands, 0.6–1 GiB backup estimate, >=5 GiB persistent encrypted workspace, separate Storage objects/config/bundles and isolated validation. Required owner decision: approve the confidential database/Auth/Storage export to a specified encrypted destination and the isolated validation environment. No paid plan or PITR is needed or authorized. Code/grant snapshots and synthetic compensation rehearsal do not satisfy production recovery.

## 4. Missing or unverified configuration

Only secret **names**, not values/digests, were inspected.

| Item | Evidence | Needed for standalone Play? |
| --- | --- | --- |
| GOOGLE_PLAY_SERVICE_ACCOUNT_JSON | Name present; runtime email/key/API permissions unverified | Yes; run the existing diagnostic and owner permissions checks; no replacement |
| GOOGLE_PLAY_PACKAGE_NAME | Name present; actual value not read; code requires in.medveda.app | Yes |
| PLAY_STANDALONE_TEST_ENABLED | Absent | Yes for this license-test lane; explicit `true` only after separate activation authorization |
| PLAY_STANDALONE_TEST_USER_IDS | Absent | Yes for this license-test lane; exact approved QA Auth UUID allowlist, owner supplied privately |
| PLAY_PAYMENT_CRON_SECRET | Name present; value/length and scheduler alignment unverified | Yes for authenticated worker invocation and scheduled recovery; deployment alone must not activate cron |
| PLAY_CATALOG_CRON_SECRET, PLAY_CATALOG_REGIONS_VERSION | Names present; runtime correctness unverified | Existing catalog provisioning/reverification path; not a UCB prerequisite; no retry/activation authorized |
| UCB_REPORT_CRON_SECRET | Absent | **No** for standalone; do not create it or deploy the alternative-billing reporter for this release |
| UCB_SENTRY_DSN | Absent | Optional server alerting helper also used by Play worker; logs provide fallback; not a settlement prerequisite |
| SUPABASE_URL / SERVICE_ROLE_KEY and platform Auth/JWT dependencies | Platform names present; values not inspected | Yes; preserve existing owner-held configuration |
| Global new-orders gate | Existing server boundary in create-standalone-play-order retained; gate value not changed | Must permit any later owner-approved checkout; do not toggle it as a workaround, because Razorpay also depends on release sales policy |
| Verified Notes classification, publication and India/INR BUY mapping | Must be checked for intended existing SKUs | Yes; classification/publication alone cannot prove billing readiness |
| UCB tokens/enrollment/external-choice flags/reporting schedules | Separate workflow | **No** for standalone; leave inactive/unchanged |

The current standalone endpoints intentionally require Google testPurchaseContext and a server allowlist. This is a license-test release candidate, not authorization to enable unrestricted live Play purchases. Existing Razorpay source, settings, webhooks, credentials and deployments are untouched.

## 5. Exact frozen release and future commands

Frozen candidate `/tmp/medveda-targeted-release-20261124-r2`, with durable `release-candidate.tar.gz`, `release-manifest.json` and SHA-256 file beside this runbook. Source/dependency hashes include the Admin and its verified built dist; no .env, tokens, node_modules or .vercel credentials included. All 86 applied migration versions are represented; the only pending versions, in order, are:

1. `20261124063324_play_terminal_recovery.sql` — duplicate proof helper and fulfillment terminal response.
2. `20261124064112_admin_catalog_readiness_and_revisions.sql` — revision column/trigger/edit RPC plus sanitized revision-bearing Admin invoker view.

The readiness migration was updated in place; no extra migration was created. The first migration must precede the three function deployments because verifiers call play_duplicate_recorded. Existing play_entitlement_committed/complete_play_purchase/refund/queue RPCs and shared helpers are prerequisites already represented in the applied schema. Migration ordering/dependency checks are static plus local fixture regressions; no hosted migration dry run or migration application occurred here.

Required named functions:

| Function | Reason | JWT/auth |
| --- | --- | --- |
| verify-standalone-play-purchase | Test-lane V2 option/receipt validation, commitment and terminal duplicate result | Gateway true + verified user/session + server QA allowlist |
| verify-play-purchase | Existing verifier uses the changed validation helper and duplicate proof too | Gateway true + verified user and order ownership |
| play-payment-worker | V1/V2 recovery validation before consumption; reconcile/void/reversal recovery | Gateway false + constant-time x-play-payment-cron-secret check, configured secret >=32 characters |

Shared files are bundled per function; changing a helper in the repository does not update deployed functions. Candidate has the complete relative dependency closure (10 source files), pinned `@supabase/supabase-js@2.118.0`, captured Deno configuration and frozen lockfile. Deno check passed with that lock. Actual server-produced bundle/version/hash and JWT settings must be checked against the approved source after any future authorized deployment; no deployment has been used to verify bundling here.

`create-standalone-play-order` live entrypoint is byte-identical to current local entrypoint and needs no redeployment for these fixes. `report-external-transaction` is not currently deployed and is excluded: it mixes alternative billing report/refund phases and Razorpay compensation/events with older Play consume/reconcile paths, while the dedicated Play worker provides standalone consume/reconcile/void recovery. Do not activate/report UCB or change Razorpay recovery infrastructure as part of this release. No `index.fix3.ts` entrypoint is required for standalone.

These commands are **prepared only**. Run only after backup/restore validation, configuration/Google prerequisites, coordinated Admin readiness and separate owner deployment authorization. Installed CLI is **3.1.0**, checked against its actual --help output. It uses `--remote`, **not** the earlier `--project-ref` syntax. No CLI installation/upgrade is needed.

```bash
SB=/home/ganeshp8545/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-linux-x64/bin/supabase
RC=/tmp/medveda-targeted-release-20261124-r2
# If /tmp was lost, checksum and extract the durable archive, then set RC accordingly.
"$SB" db push --remote=xbvenkfmesugrbjuufyw --skip-vault --dry-run --workdir "$RC"
# STOP unless the output contains exactly the two pending migrations above, in order.
# The following commands perform production changes and require separate authorization.
"$SB" db push --remote=xbvenkfmesugrbjuufyw --skip-vault --workdir "$RC"
"$SB" functions deploy verify-standalone-play-purchase verify-play-purchase --remote=xbvenkfmesugrbjuufyw --use-api --workdir "$RC"
"$SB" functions deploy play-payment-worker --remote=xbvenkfmesugrbjuufyw --use-api --no-verify-jwt --workdir "$RC"
```

Never omit function names (that deploys all), use --prune, --include-all, --include-seed, --include-roles or a blanket function deployment. Do not add reporter deployment or cron activation. The proposed dry run was not executed because deployment prerequisites remain open; installed syntax is verified, hosted execution is not claimed.

Coordinate an Admin product-edit maintenance window. Prepare the corrected Admin from the frozen artifact using the existing Vercel project `prj_aa6oG0V0hruQHmDEn3GSfnw19IHG` (`admin_panel-medveda`) and existing protected environment. Do not run an unlinked candidate through a command that could create another project. First install/verify the revision schema and server permissions, then publish the matching Admin through the owner's existing approved deployment process and require open Admin tabs to reload. Old clients' unconditional UPDATE must stay denied; the new client fails closed against an older server. Verify Admin/student/MFA/anon denial and matching row/readiness revisions with approved synthetic reads before reopening editing. Readiness/migration deployment is coordinated; there is no backward-compatible period for old unconditional edit clients. Preserve the current deployment for emergency reference, but rolling back to it alone cannot safely restore product editing after revision enforcement.

Release remains **HOLD** until the recovery, runtime identity/Google permissions, intended tester configuration, exact deployment authorization and coordinated Admin prerequisites are satisfied. Separate owner authorization is still required for any cron/payment activation or purchase testing even after source deployment.

**Exact next owner action:** On the current hosted Admin, run Settings → Verify service account identity and return only HTTP status plus service_account_matches_expected. Then approve a named encrypted backup destination with >=5 GiB free and an isolated recovery environment if production export/recovery validation should proceed. No secret or student data should be pasted here.
