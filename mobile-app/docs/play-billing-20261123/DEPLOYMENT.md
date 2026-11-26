# Approval-required deployment and build commands

Nothing in this file has been deployed or submitted. The existing project is `xbvenkfmesugrbjuufyw`; these proposed test endpoints run against its existing database. Authorized license-test purchases will create orders and entitlements for the approved QA accounts in that database.

Preferred deployment uses the connected Supabase plugin. `deployment-payloads.json` contains the **exact two arguments** for `mcp__codex_apps__supabase_deploy_edge_function`, including entrypoints, unchanged helper sources, Deno configuration and lockfile. For each approved endpoint, pass its object directly. Both set `verify_jwt: true`; the handler also validates the bearer token with Supabase Auth. Recheck that the new names remain absent before deploying. Do not deploy any existing function or apply migrations.

Alternative shell commands, after approval and with an authenticated Supabase CLI available, from the repository root:

```bash
mkdir -p supabase/functions/create-standalone-play-order supabase/functions/verify-standalone-play-purchase
cp mobile-app/docs/play-billing-20261123/backend/create-standalone-play-order/index.ts supabase/functions/create-standalone-play-order/index.ts
cp mobile-app/docs/play-billing-20261123/backend/verify-standalone-play-purchase/index.ts supabase/functions/verify-standalone-play-purchase/index.ts
supabase functions deploy create-standalone-play-order --project-ref xbvenkfmesugrbjuufyw
supabase functions deploy verify-standalone-play-purchase --project-ref xbvenkfmesugrbjuufyw
```

The CLI is currently unavailable locally. Use the connected plugin rather than installing it unnecessarily. Copying source into the parent repository also requires filesystem permission outside the current writable mobile-app root.

Both endpoints default off. Do not enable them or change existing credentials without explicit authorization. To permit only approved QA users, the owner must supply exact Supabase Auth UUIDs and authorize these new server settings:

```dotenv
PLAY_STANDALONE_TEST_ENABLED=true
PLAY_STANDALONE_TEST_USER_IDS=<comma-separated-approved-auth-UUIDs>
```

Do not put that environment file in the upload directory. Existing `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and `GOOGLE_PLAY_PACKAGE_NAME=in.medveda.app` must be valid on the server; their contents have not been read or changed. Do not set UCB flags. The new verifier additionally requires Google's `testPurchaseContext` before settlement, so real-money receipts cannot unlock through this test endpoint. Verify license-tester setup before opening checkout; server rejection cannot prevent Google from charging an incorrectly configured purchasing account.

After deployment, verify unauthenticated/disabled/foreign-account rejection without creating orders. Authenticated checkout and purchase testing require the approved QA account and Google license tester setup. Confirm active, fresh India/INR price tiers and the existing global sales gate; do not change it as a workaround if disabled.

Only after all gates pass, request **separate authorization for one cloud build**, using this command from mobile-app:

```bash
EAS_NO_VCS=1 EAS_PROJECT_ROOT=/home/ganeshp8545/AyurPulse/mobile-app eas build --platform android --profile play-billing-testing --non-interactive --no-wait
```

This uses remote compilation, preview environment, existing remote signing credentials and app-only upload exclusions. It produces an AAB; it does not submit to Play. No `--auto-submit`, `--local` or version increment. It consumes an Android EAS build allowance/credit; possible charges depend on the account plan and remaining quota, which have not been verified. Do not approve a paid overage without a quoted amount. A failed paid build must not trigger automatic resubmission.

Current remote versionCode is **15**, preserved. If Play already used 15, an owner-approved new versionCode is required before uploading a testing release. Do not increment it automatically. Match the existing EAS upload certificate against Play Console before track upload; credential presence alone does not prove Play will accept the artifact.

Rollback of test access: obtain approval to set only `PLAY_STANDALONE_TEST_ENABLED=false`. Preserve purchases and recovery records. Do not delete orders, entitlements, backups, deployed legacy endpoints or credentials.
