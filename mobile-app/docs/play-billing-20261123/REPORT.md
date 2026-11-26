# MedVeda standalone Google Play Billing implementation

2026-11-23. **App integration implemented; test backend changes prepared; cloud build not submitted.** Native compilation and real Google Play purchases have not been performed. This is not a claim of end-to-end working billing.

## Implementation

The Play testing distribution initializes standard Billing, loads one matching standard INR BUY offer, shows Google's formatted price, persists an owner-bound attempt before dispatch and sends the purchase token to a dedicated server verifier. Pending purchases never unlock. Explicit cancellation permits retry; ambiguous dispatch/network failures retain recovery state and block replacement payment. Concurrent callbacks coalesce; persistent uniqueness/idempotency remain server responsibilities.

Account/order hashes bind receipts to the authenticated purchaser and server-created order. Auth epochs suppress work after account changes, including A→B→A. An independent reviewer reproduced a stale in-memory guard that blocked B after A's purchase; the fix retains A's durable hint and permits B's checkout. Its regression was observed failing and then passing.

Launch/resume and My Purchases reconcile eligible receipts. If Google already consumed the purchase but the server response was lost, an owner-scoped committed-fulfillment RPC can recover it. The app never grants from native success alone and never calls client finish/consume. Existing ownership reads refresh on focus/resume. Existing Notes authorization/download mechanisms remain in use.

Recovered components reused: the isolated `adapted/playBillingService.ts` lifecycle factory, `ports.ts` structural native interface, and byte-identical `playOfferSelection.ts`; original provenance is historical commit `56ef326c41f492b2395bfa94e8f2376c72f2861d`. The service was adapted for standalone checkout, removing all UCB listener/context/external-token behavior. The recovered offline tests were adapted and extended for standalone routing, strict success, consumed-response recovery and account switching.

## Dependencies and routing

Only `expo-iap` **3.4.4** was added/pinned. Its recovered OpenIAP Google dependency is **1.3.26**. No Expo, React Native, Kotlin, Gradle or SDK upgrade/override was made. Lockfile comparison shows just the root IAP entry and its package entry.

`play-billing-testing` is the sole Play profile: Android package `in.medveda.app`, build target `play-testing`, distribution marker `google-play-testing`, EAS environment `preview`. The client checks those fields and the fixed backend origin. These checks select UI; the server independently authorizes the authenticated UUID. UCB flags remain false and cannot activate Play. Play's route table does not register Razorpay checkout. No Razorpay fallback exists.

Existing profiles and Razorpay checkout/order/verification/webhook/recovery sources remain intact. Native IAP is excluded through Expo autolinking by default. Only the exact Play EAS cloud pre-install hook enables native inclusion in the builder's package manifest; local/source manifests retain exclusion. Both actual Android autolinking outputs were checked: IAP absent for default builds, present for the prepared Play cloud manifest. Existing Razorpay runtime strings remain unchanged; Play uses `1.2.2-standalone-play-testing-v1` and disables OTA updates.

## Backend status

Read-only connected Supabase inspection confirmed the deployed `verify-play-purchase` v4 lacks the newer local committed-entitlement proof. It has **not** been changed. The live database contains compatible signatures for `create_play_order`, `settle_play_purchase`, `play_entitlement_committed` and `get_my_play_fulfillment`. Authenticated clients cannot execute the order creation or settlement RPC; they can call the owner-scoped fulfillment RPC. No database mutation, migration or function deployment occurred.

Two **new, undeployed** endpoint sources are prepared under `backend/`:

- `create-standalone-play-order`: reuses current order eligibility, catalog-price snapshot, publication/ownership and atomic RPC contracts. It has its own default-off server flag and authenticated UUID allowlist; it never enables historical UCB gates.
- `verify-standalone-play-purchase`: reuses the current local ownership/token/SKU/BUY-option/Google verification, settlement, committed-entitlement and consumption logic. It requires the same server allowlist and Google's `testPurchaseContext` before settlement. Real-money receipts cannot unlock through this test endpoint.

Existing shared helpers and database contracts are reused unchanged. Deployment payloads bundle exact helper copies for **only the new endpoint bundles**. No new migration is proposed. The server Play service-account contents and Google API permissions have not been read or exercised; actual verification remains unproven. Catalog readiness and the existing global sales gate must be checked before checkout, without changing production settings as a workaround.

See [DEPLOYMENT.md](DEPLOYMENT.md) for exact plugin payloads, shell alternatives and explicit approval boundaries. Deploying these endpoints to the existing backend is a hosted change requiring the user's approval. They default off; enabling new test flags and authorizing QA UUIDs also requires approval. Approved test purchases will create real database orders/entitlements for those QA accounts.

## Focused validation

| Check | Result |
| --- | --- |
| `node scripts/play-billing-tests/lifecycle.test.cjs` | **27/27 pass**; synthetic native/HTTP/storage only. |
| `node scripts/play-billing-tests/summary.cjs` | Pass: Google price, duplicate dispatch, pending/no premature success, foreign-account suppression. |
| `node scripts/play-billing-tests/routing.cjs` | Pass: exact testing profile, Android identity, no Play Razorpay route, unchanged Razorpay profile behavior. |
| `node scripts/play-billing-tests/backend.cjs` | Pass: default-off, server UUID allowlist, authentication, global sales and Notes gates, server-priced contract. |
| `node scripts/play-billing-tests/verification.cjs` | Pass: 5 assertion groups, real staged verifier; rejects non-test receipts and unauthorized users; ownership/option/token/pending failures cannot settle; commitment precedes consumption. |
| `node scripts/play-billing-tests/build-inputs.cjs` | Pass: actual autolinking exclusion/inclusion, cloud-only hook, Firebase validation, upload rules and lock pin. Subprocess execution required sandbox escalation. |
| TypeScript | Pass, strict no-emit check of modified application entrypoints and their dependencies, bounded to 512 MiB heap. |
| Existing backend tests | All 6 pass: play-order, play-verification, play-consumption, play-body, play-payment-worker and billing-recovery-worker. Synthetic handler tests; no database tests executed. |
| Existing Razorpay checks | payment-provider, razorpay-internal-test, razorpay-live-testing, nonplay-provider-security, payment-summary, payment-poll and retired-billing-ui pass. |
| Ownership/history/navigation | MV007, MV008 **20/20**, MV012 **24/24**, audit-navigation and navigation-lazy pass. Navigation test strengthened for the separate Play summary and absence of Play-distribution Razorpay checkout. |

TypeScript command, from mobile-app:

```bash
node --max-old-space-size=512 node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --skipLibCheck --jsx react-jsx --moduleResolution bundler --module preserve --target es2022 --esModuleInterop --allowSyntheticDefaultImports --moduleSuffixes .native,.android, src/services/playBillingService.ts src/screens/payment/PlayOrderSummaryScreen.tsx src/navigation/AppNavigator.tsx src/screens/purchases/MyPurchasesScreen.tsx
```

Existing root-relative tests must be run from `/home/ganeshp8545/AyurPulse`. No unrelated full-project suite or native compilation was run. Initial CLI checks exposed TypeScript 6's required `--ignoreConfig`, structural API types and test-runner subprocess sandbox restrictions; final checks pass with the proper command/type contracts. Tests were not disabled. Native compatibility still requires the approved remote build.

## EAS readiness and actual status

- Authenticated Expo owner account verified. Existing project ID is unchanged.
- One existing default remote keystore and certificate fingerprint metadata found for `in.medveda.app`; no key material downloaded, generated or replaced. FCM v1 credential presence verified. Match the upload certificate with Play Console before track upload.
- `eas config -p android --profile play-billing-testing --json` passes. It resolves store distribution, AAB, preview environment, remote credentials and `autoIncrement:false`. No submit profile exists for this testing profile.
- Remote Android versionCode **15** read only; unchanged. If already used in Play, a separate versionCode approval is needed for track upload.
- Preview has no EAS environment variables. Existing local `google-services.json` validates for `in.medveda.app` and is explicitly included in the app-only archive. Firebase contents/configuration unchanged.
- Actual `eas build:inspect --stage archive` completed with `EAS_NO_VCS=1` and an explicit mobile-app `EAS_PROJECT_ROOT`. The **7.2 MiB / 411-file** archive contains source/assets/config/Firebase and excludes native outputs, node_modules, service-account/signing secrets, docs/backups and validation workspaces. Final runtime input bytes match the inspected archive. Only small test/report additions followed it.
- Disk remained approximately **1.8 GiB free**; no SDK/cache deletion or large validation-workspace copy occurred. No Android/Kotlin build command was run.
- **Cloud build: not submitted; no build URL.** Endpoint deployment, QA/license setup and a separate one-build authorization remain gates. Build allowances/possible overage cost were not established; do not submit a paid overage without an amount and approval.

## Preservation and remaining work

SHA-256 baseline comparison confirms all existing backend function and migration files, Question Papers feature source, existing payment/ownership/download/auth sources, and Firebase configuration are preserved except the specifically listed application integration files. Existing user changes were retained. The entire recovered backup (**339 files including audit metadata**) matches its starting hashes; isolated and native-validation workspaces were not modified. No commit/push, production activation, deployment, migration, Play publishing or signing replacement occurred.

Exact application and artifact paths are in [FILES.md](FILES.md). Validation evidence and metadata are local; no purchase tokens or secrets are included.

Before real testing: approve deployment of the two default-off endpoints, supply/approve QA Auth UUIDs and test-only flags, verify Google API credentials/catalog state, configure Play license testers plus track access, confirm upload signing/versionCode, then authorize one EAS cloud build with its cost treatment. Track upload/publication remains separately gated. Execute the complete [license-test matrix](LICENSE-TESTING.md), including successful/cancelled/pending/duplicate/already-owned/account-switch/restart/network/restore and rejected-verification cases. **No real purchase or server Google API verification has passed yet.**

Documentation consulted: [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/), [versioned app config](https://docs.expo.dev/versions/v57.0.0/config/app/), [EAS exclusions](https://docs.expo.dev/build-reference/easignore/), [Supabase changelog](https://supabase.com/changelog.md), [Edge Function authorization](https://supabase.com/docs/guides/functions/auth), and the Google references linked in the test matrix.
