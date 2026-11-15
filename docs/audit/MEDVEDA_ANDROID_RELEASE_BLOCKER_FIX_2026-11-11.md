# MedVeda Android release blocker fixes — 2026-11-11

**Locally fixable verification defects: FIXED. Current decision: NO-GO for a release-ready payment-disabled AAB build until genuine Firebase/FCM inputs are supplied and checked, followed by separate build authorization.** Local SDK absence does not prevent a future EAS cloud build. No current-source native compilation or device acceptance is claimed.

Scope: `mobile-app/`, production package **`in.medveda.app`**. Read the Android native readiness report, Phase A final safety review/operator runbook, Phase B compatibility, Phase C readiness, MV001 and MV007 reports. Prior payment/deployment observations remain inherited evidence; no production database or backend was contacted. Followed `mobile-app/AGENTS.md` by reading the versioned Expo 57 reference before edits.

No staging access, backend deployment, production record write, purchase/payment, Buy Now activation, build request, AAB publication, Firebase Console change or credential upload occurred. Razorpay, retained Play Billing, MV001–MV012 implementation, ₹1/₹2/₹5 prices, identity, dependencies, profiles, website/admin and all other pre-existing work were preserved. Changes affect tests/inspection tooling and new audit evidence only.

## 1. Exact stale Auth mock fix

Original failure reproduced: `TypeError: getCurrentUser is not a function` in `nonplay-test-isolation-selftest.cjs`, at its recovery call. `paymentService.recoverPayment(verifyUrl, internalOrderId, expectedUserId = getCurrentUser()?.id)` evaluates its default parameter before entering the isolated-test branch. Production `authState.getCurrentUser(): User | null` is a synchronous, Auth-listener-maintained accessor. Normal recovery additionally validates session identity/token, pins the original account, and permits only one 401 refresh/retry.

Only the outdated `./authState` fixture in that suite changed:

```js
// Before
'./authState': {}
// After: follows the same mutable synthetic identity as the session mock
'./authState': { getCurrentUser: () => uid ? { id: uid } : null }
```

No assertion changed; no authentication code, recovery implementation or access control changed. The original suite now passes all five groups, including route/Auth isolation, account switching, live-response rejection, dedicated verification/recovery, historical purchase access and server-owned success proof. Surrounding Auth, recovery, checkout and ownership regressions also pass.

## 2. Exact AAB validator correction

`mobile-app/scripts/inspect-android-bundle.py` no longer asserts that final `com.android.vending.BILLING` must be absent. Final-manifest validation now **requires** it for the retained `expo-iap` design. Removing Billing to pass inspection is explicitly invalid.

When `--manifest` is supplied, `--release-config` is now mandatory: provide the resolved production Expo JSON for the **same build**, retaining its SHA-256 in the inspection report. Supplying config without a manifest also fails. Config must explicitly show:

- Manifest and Expo Android package `in.medveda.app`.
- `medvedaPaymentProvider=disabled`, `medvedaDistribution=standard`, `medvedaBuildTarget=production`.
- Both enrollment/acceptance flags boolean `false`.
- Android runtime `<version>-disabled-notes-choice-v1` (currently `1.2.2-disabled-notes-choice-v1`).

Enabled standalone Play/Razorpay providers, alternate distributions, wrong runtime/package, missing evidence and unexpected permissions fail. A fixed permission allowlist covers app declarations and reviewed native-library permissions; both ordinary and SDK-qualified permission declarations are inspected. Existing identity/version/orientation/R8/mapping checks remain. No dependency, native manifest or permission was removed.

Permission provenance: current installed manifests/Gradle declarations plus the retained v13 manifest-merger report establish the expected inventory: IAP Billing; Expo notifications/Firebase/ShortcutBadger notification, wake/boot and launcher badge permissions; BlobUtil network/Wi-Fi; screen capture detection; SecureStore's AndroidX biometric permissions; Expo application's install-referrer permission; AndroidX's package-specific receiver isolation permission. Broad storage/media, overlay, camera/microphone and any other unreviewed permission remain rejected. The old merger log's **removal directives** are not treated as approved final permissions. This list is an inspection baseline, not proof of the future merged manifest or Play approval.

Permission presence proves neither enabled purchases nor the absence of obsolete executable paths. `mv007-billing-boundary`, provider/routing, Notes-choice and release-payments-disabled suites separately execute the existing standalone-sales denials and retained history/choice boundaries. The validator labels its result **manifest/config checks only**: the caller must bind config to the exact artifact and separately verify compiled guards/device behavior. Metadata-only inspection without `--manifest` is not final release acceptance.

New fixture suite: `python3 mobile-app/scripts/android-bundle-validator-selftest.py`. **11 tests PASS**, including subcases: retained Billing accepted; missing Billing denied; unexpected camera/mic/overlay/storage/custom permissions denied; SDK-qualified unexpected permission denied; reviewed library permissions accepted; disabled config accepted; Play/Razorpay/missing providers denied; absent config denied; alternate distributions/targets and true/string approval flags denied; wrong runtime/package denied; raw and Expo-wrapped JSON accepted. Fixtures are temporary synthetic ZIP/XML/config files, not compiled or publishable AABs, and are deleted automatically.

Future exact-artifact inspection, after separately authorized build and bundletool manifest extraction:

```sh
python3 mobile-app/scripts/inspect-android-bundle.py /secure/path/MedVeda.aab \
  --manifest /secure/path/manifest.xml \
  --release-config /secure/path/expo-production-for-that-build.json \
  --expect-optimized --min-version-code 13 \
  --mapping-dir /secure/path/exact-build-mapping \
  --output /secure/path/bundle-inspection.json
```

`13` is the inherited previous remote/artifact code, not a fresh highest-Play-upload claim; refresh that comparison before use. No old AAB was relabeled as current-source verification. **Manifest inspection never establishes Google Play policy approval.**

## 3. Firebase / FCM status

Fresh local checks and authenticated **read-only metadata-only** EAS query confirm:

| Input | Result |
| --- | --- |
| Expected Firebase Android application | Exactly **`in.medveda.app`** |
| Local `google-services.json` | No matching file found in the workspace search, excluding dependency/credential/cache directories |
| Shell `GOOGLE_SERVICES_JSON` | Absent |
| Resolved production `android.googleServicesFile` | Absent |
| Project/account production EAS variable metadata | Both empty; no existing production `GOOGLE_SERVICES_JSON` file variable |
| Package-specific FCM v1 credential | Absent (`googleServiceAccountKeyForFcmV1=null`) |
| Matching Firebase project ID | **Unknown: owner must identify/confirm it.** EAS project ID is not Firebase project ID |
| Existing EAS upload signing | Default non-legacy JKS metadata still present; fingerprint unchanged from prior audit |

Evidence: [local input status](evidence/android-blocker-fix-20261111/local-input-status.json), [fresh EAS metadata](evidence/android-blocker-fix-20261111/eas-remote-metadata.json), [resolved Expo config](evidence/android-blocker-fix-20261111/expo-public.json). Metadata transport initially encountered sandbox DNS restrictions; the identical read-only query succeeded with network escalation. It selected no environment values, key bytes, passwords, aliases or service-account contents. No automatic approval rejection occurred.

Existing `app.config.js` already supports `GOOGLE_SERVICES_JSON` (takes precedence) or `mobile-app/google-services.json`. No integration code change is needed to accept the genuine input. Missing Firebase is not established as a Gradle compile failure; it blocks configured remote-push/release completeness. Push registration/delivery and account routing remain unverified.

## 4. Safe owner actions for Firebase

1. In the owner's **existing intended production Firebase project**, open Project settings → General → Your apps. Select the Android app whose package is exactly `in.medveda.app`; download its genuine `google-services.json`. Do not choose the isolated-test package or use the Supabase/Expo project IDs as Firebase IDs. If no matching Android app exists, stop for an explicitly approved Console registration; no project/app is created by this task. [Firebase Android setup](https://firebase.google.com/docs/android/setup).
2. Privately verify the downloaded JSON has a client with `client_info.android_client_info.package_name == "in.medveda.app"`, and `project_info.project_id`/`project_number` match that intended Firebase project. Confirm it is Android client configuration, not a service-account key. Never paste JSON or keys into chat/logs. The client file contains Firebase identifiers, distinct from the private FCM server credential.
3. For local config, place the genuine client file at the already ignored `mobile-app/google-services.json`, or set `GOOGLE_SERVICES_JSON` to its absolute path outside the repository. An outside local path does **not** provision a cloud worker. Do not hand-edit generated `android/`; Expo consumes `android.googleServicesFile` during native generation. Confirm `git check-ignore mobile-app/google-services.json` before using the local fallback.
4. For cloud builds, the owner may manually create a **project-scoped production file variable** named `GOOGLE_SERVICES_JSON` in EAS. The current CLI supports this command; it is documentation only and was **not executed**:

   ```sh
   cd /home/ganeshp8545/AyurPulse/mobile-app
   eas env:set production --scope project --name GOOGLE_SERVICES_JSON \
     --type file --visibility secret --value /secure/path/google-services.json
   ```

   Run only after approving that upload. EAS materializes the file and supplies its worker path. Secret file variables are unavailable during local CLI config resolution; absence there alone after setup is not evidence of worker absence. Confirm the actual production worker input without printing contents. A git-ignored local fallback must not be assumed included in the EAS upload. [Expo file environment guidance](https://docs.expo.dev/eas/environment-variables/).
5. Separately configure **FCM v1 server credentials from the same Firebase project**. Prefer an existing approved usable credential; do not rotate/create a key unnecessarily. Owner workflow: `eas credentials` → Android → production → Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1) → upload the approved key. Confirm Firebase Cloud Messaging API availability and appropriate project access privately. Any key generation/API/Console change needs its own authorization. Store the private key outside the workspace/upload archive; never put it in `GOOGLE_SERVICES_JSON`, `EXPO_PUBLIC_*`, app config or Git. Keep Android signing and Play submission credentials separate. [Expo FCM v1 instructions](https://docs.expo.dev/push-notifications/fcm-credentials/).
6. Re-resolve the disabled production configuration, check the file/package/project privately and verify EAS FCM metadata. After an authorized build, separately authorize physical-device push registration/delivery/tap/account-switch tests: registration writes the existing backend token record and was not executed here.

## 5. Local verification

**87/87 credential-free checks PASS**: all previously selected 86 checks now pass, plus the validator fixture suite. [Exact commands, exits and logs](evidence/android-blocker-fix-20261111/check-results.json); [reproducible runner](evidence/android-blocker-fix-20261111/run-checks.py).

| Group | Result |
| --- | --- |
| Mobile deterministic checks | **65/65 PASS**, including the original stale-mock suite, Auth/deep links/session races, MV004 and MV007–MV012, protected Notes/PDF/account ownership, Store retry/accessibility/history, free videos, notification regressions and payment guards |
| Backend deterministic checks | **17/17 PASS**: Razorpay security/routing/recovery, Play order/verification/consumption/reconciliation, Notes choice and ₹1/₹2/₹5, commitment-related restoration and worker/reporting mocks; reporting uses `--production-only` |
| TypeScript | PASS: `node mobile-app/node_modules/typescript/bin/tsc --noEmit -p mobile-app/tsconfig.json` |
| Dependency tree | PASS: `npm ls --depth=0 --offline --ignore-scripts` |
| Expo dependency compatibility | PASS: offline `expo install --check`; offline validation limitation retained |
| Validator fixtures | PASS: 11 unittest methods, plus parameterized rejection cases; final rerun after permission-provenance review also PASS |
| Expo production public config / plugin introspection | Both PASS with only explicit production profile variables, `EXPO_NO_DOTENV=1`, `EXPO_OFFLINE=1`; no native regeneration |
| Package-lock consistency | PASS: root dependency/devDependency declarations agree; sampled installed Expo/RN/React/IAP/WebView/notifications versions equal lock |
| Retained native Billing inputs | PASS: all five installed wrapper/manifest/version/Kotlin hashes match prior native audit; actual resolved release graph remains unverified |
| `git diff --check` | PASS |
| Local native compilation | **BLOCKED**: configured SDK roots absent; alternate SDK has no platforms/build-tools. No SDK install, prebuild, Gradle compile, emulator or memory-heavy native work attempted |

The source-compatible suites protect MV001's owner/token/price/payment-disabled boundaries and MV003–MV012's local fixes. MV002's catalog/pricing business decision remains unchanged; no separate MV002 fix suite/report exists. Online doctor/vulnerability audit, native execution, actual hosted Auth/Storage and provider acceptance are not inferred from these local tests.

**Fresh real PostgreSQL regressions also PASS:** Phase B runner exit 0, **228 PASS markers**; Phase C runner exit 0, **163 PASS markers** (assertions/notices, not end-to-end provider transactions). [SQL results](evidence/android-blocker-fix-20261111/sql-results.json), [Phase B log](evidence/android-blocker-fix-20261111/phase-b-sql.log), [Phase C log](evidence/android-blocker-fix-20261111/phase-c-sql.log).

Used existing PostgreSQL 17.11 on `/tmp/medveda-phase-a-final/socket`, port 55471, TCP disabled. Each existing runner created and dropped a unique synthetic database; no hosted data/credentials were used. Phase B covered exact Phase A migration repeatability, financial/catalog fingerprint preservation, actual MV003 helper/callback/webhook/HMAC, MV004 authenticated recovery, MV005 transitions/history/races, MV006 ownership/restoration/concurrency, snapshot/refund/replay, ACLs, lock timeout and DDL rollback. Phase C covered retained Notes-choice/recovery/final MV003 ordering, Play entitlement snapshots/duplicates, worker queue SQL, grants and concurrency. Its runner was executed with only its evidence destination redirected so prior evidence stayed unchanged. Local schema/function inventories contain synthetic schema definitions, not credential contents. Managed Auth/Storage/cron remain test stubs; no production or device acceptance is inferred.

Commands (only local socket access required sandbox escalation):

```sh
PGHOST=/tmp/medveda-phase-a-final/socket PGPORT=55471 PGUSER=postgres \
  python3 supabase/tests/run-phase-b-local.py
PGHOST=/tmp/medveda-phase-a-final/socket PGPORT=55471 PGUSER=postgres \
  python3 docs/audit/evidence/android-blocker-fix-20261111/run-phase-c.py
```

The test cluster was stopped after successful completion. No prior test data cluster was deleted.

## 6. Remaining blockers and build prerequisites

| Classification | Status / next action |
| --- | --- |
| Locally fixable Auth fixture | **FIXED / VERIFIED** |
| Locally fixable final-manifest inspector | **FIXED / VERIFIED** with synthetic CLI fixtures |
| Missing owner-provided Firebase/FCM | **OPEN** — supply real package/project-matched Android client config and FCM v1 credential; no substitute generated |
| Local Android SDK | **BLOCKED locally** — prefer separately approved EAS cloud compilation; local installation needs separate resource/approval review |
| Unverified native behavior | **OPEN** — actual release compile, dependency graph, merged manifest, R8/reflection/JNI, ABI/16 KB alignment, exact signature and device tests |
| Google Play policy/Console | **OPEN for payment activation/publication** — owner-specific India program/package/product/policy acceptance remains unverified; permission presence cannot satisfy it |
| Production backend dependencies | **OPEN for payment activation** — Phase A/B/C approvals, recovery/backup readiness, schema/functions/choice/reporting/workers and historical review remain as documented; none was deployed/refreshed here |
| Separate cloud-build authorization | **REQUIRED and absent** — no automatic next build |

Backend deployment/payment policy approval are not prerequisites to packaging a candidate with purchases disabled; they remain independent activation/publication gates. Do not bypass or deploy them to clear a mobile build checklist. Broader prior release gates (including offline paid-PDF encryption, privacy/operational acceptance and device performance) remain open where previously documented.

Before requesting one cloud build: resolve Firebase/FCM input, review the exact dirty source snapshot and ensure new/untracked plugins/services/release rules are included, exclude private keys/env material, confirm production package/channel/runtime/provider, existing remote upload certificate and next version code, and confirm production EAS access. Preserve the dirty workspace; do not reset/stash/clean it. No upload archive was generated here. Clear conflicting ambient distribution/target/enrollment/acceptance overrides; do not load unrelated dotenv values. Profile remains `environment=production`, app-bundle, auto-increment and production channel. A cloud worker supplies its SDK; its actual toolchain/compilation remains to be observed.

Existing upload-certificate SHA-256, metadata verified again:

`8C:95:98:E4:EA:07:22:BC:D6:F2:69:0B:10:60:B0:01:D9:FF:F6:19:F7:C1:8B:4B:3B:B5:B0:92:A4:CB:F3:00`

After those prerequisites and **separate explicit build approval**, the exact future command is:

```sh
cd /home/ganeshp8545/AyurPulse/mobile-app
MEDVEDA_PAYMENT_PROVIDER=disabled eas build \
  --platform android --profile production \
  --non-interactive --freeze-credentials
```

**Not executed.** Installed CLI help confirms these flags; `--freeze-credentials` prevents credential updates in non-interactive mode. Existing auto-increment is a future build effect. No auto-submit flag, local build or alternate profile is included. After that build, retain build/source/config hashes, actual version/toolchain/dependency graph, merged manifest, mapping, full-payload signature verification, 16 KB/native evidence and physical-device disabled-purchase acceptance. Building is not publication approval.

## 7. Exact task-attributable file inventory

Only two pre-existing files changed:

1. `mobile-app/scripts/nonplay-test-isolation-selftest.cjs` — one Auth mock replacement; assertions unchanged.
2. `mobile-app/scripts/inspect-android-bundle.py` — retained-required Billing, explicit permission/config validation and evidence scope/hash.

New functional file: `mobile-app/scripts/android-bundle-validator-selftest.py`.

New report: `docs/audit/MEDVEDA_ANDROID_RELEASE_BLOCKER_FIX_2026-11-11.md`.

New evidence is exclusively under `docs/audit/evidence/android-blocker-fix-20261111/`: initial hash/Git snapshots, runners, individual check results/logs, config/introspection outputs, local/EAS/dependency/Billing status, SQL results, final preservation and exact path/hash manifest. [artifact-manifest.json](evidence/android-blocker-fix-20261111/artifact-manifest.json) enumerates **every** new file, including ignored logs, and both changed pre-existing files. [preservation.json](evidence/android-blocker-fix-20261111/preservation.json) compares all 2,137 baseline files; prior reports/evidence and every other baseline file remain unchanged, none deleted. Generated-native files were excluded from baseline hashing and were neither regenerated nor edited.

**Final decision: NO-GO now for the requested release-ready AAB build.** Verification defects are resolved; the remaining immediate owner input is genuine Firebase/FCM, followed by separate build authorization. Once these are checked, **GO for one separately authorized payment-disabled EAS build for native verification**, with binary/device acceptance still required afterward. No payment activation, deployment, Play approval or publication follows from this report.
