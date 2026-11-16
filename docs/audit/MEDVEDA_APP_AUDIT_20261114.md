# MedVeda mobile app audit — requested snapshot 2026-11-14

Execution resumed on **15 November 2026 UTC**. Scope: `mobile-app/` plus only its Supabase functions/SQL, build tooling and public recovery/legal contracts. No independent admin-panel or website audit. Requested filename retained. Evidence below comes from commands run during this audit; prior reports are context, not fresh verification.

## 1. Executive summary

**NO-GO for production approval.** Local source checks do not certify deployed access controls or an installed Android release. New paid sales are intentionally disabled. A free-only release still needs the account-cleanup decision, deployed access-control checks, signed binary inspection and real-device acceptance. No release gate was enabled.

| Critical | High | Medium | Low | Info | Total |
|---:|---:|---:|---:|---:|---:|
| 0 | 5 | 9 | 5 | 3 | 22 |

Counts include explicitly marked verification gaps and product limitations, not only reproduced defects. **Deleted: 0; application fixes: 0; dependencies removed/upgraded: 0.** All findings remain open or require manual checks. The snapshot preserves earlier passes; it is not a commit of new audit fixes.

Top 10 release risks, in order:

- **MV-A01** — Logout cleanup does not erase all user-local data.

- **MV-A02** — Deployed authorization, storage and settlement controls are unverified.

- **MV-A03** — Signed Android artifact and device acceptance are unverified.

- **MV-A04** — New paid sales are deliberately disabled; billing qualification remains pending.

- **MV-A05** — Requested seven-day paid-offline policy is not implemented in this release.

- **MV-A06** — Session ciphertext has no authentication tag.

- **MV-A07** — Configured recovery scheme differs from the requested intentional ayurpulse scheme.

- **MV-A08** — One moderate advisory affects three npm dependency nodes.

- **MV-A09** — OTA code signing is conditional, not enforced by the local config.

- **MV-A11** — 180-day identity purge is source-defined; live enforcement is unverified.

## 2. Environment and baseline vs after

- Original branch: `mobile-fix-2`; original HEAD: `1f12bb3abf9c4faf2755c4796c56416a46c53853`.
- Initial worktree was dirty (500 porcelain entries retained at resume). Existing edits, additions and deletions across the repository were preserved in the user-requested whole-tree snapshot.
- Local branch: `audit-5`; snapshot HEAD: `56ef326c41f492b2395bfa94e8f2376c72f2861d` (`chore: snapshot before audit-5`). No remote push.
- The interrupted branch operation left an empty `.git/index.lock`; it was removed before the snapshot completed. Repository metadata writes needed sandbox escalation.
- Node: `v22.23.1`; npm: `10.9.8`; package manager npm (`package-lock.json`).
- Installed Expo `57.0.33`, React Native `0.86.3`, React `19.2.3`, TypeScript `6.0.3`; app `1.2.2`.
- `rg` is unavailable (`/bin/bash: rg: command not found`). Used Git inventory, Python searches, grep and AST-capable installed tooling.
- Exactly one new repo report is produced. Scratch evidence/tool caches are ephemeral under `/tmp/medveda-audit-5/`; durable command excerpts and results are embedded below. Earlier scratch files were lost across an interruption; final verification was restarted and is reported separately.

Commands run from `mobile-app/` unless otherwise stated. A timeout is not a pass. Early interrupted exports and sandbox test-spawn failures were retained and superseded only where a completed rerun exists. No source change occurred between baseline and final checks. Final proof: `git diff --exit-code HEAD -- mobile-app supabase tooling eslint.config.mjs` returned exit 0 and no output; `git status --porcelain=v1` showed only the requested untracked report.

| Check | Exact baseline command | Baseline | After / final |
|---|---|---|---|
| TypeScript | npx --no-install tsc --noEmit | PASS; exit 0 | PASS; exit 0; no diagnostics |
| Mobile lint | ../tooling/node_modules/.bin/eslint App.tsx src | PASS; exit 0; no diagnostics | PASS; exit 0; no diagnostics |
| Configured tests | npm run test:password-recovery | PASS; 26 recovery tests, 24 password-policy checks | PASS; exit 0; 26 recovery tests and 24 policy checks |
| Supplemental suites | node --experimental-strip-types <each listed suite> | See completed suite register below | 101/101 suite files passed again; local mocks/fixtures |
| Expo Doctor | npx --yes expo-doctor | Running 21 checks on your project... 21/21 checks passed. No issues detected! | PASS; exit 0; 21/21 checks |
| SDK package check | CI=1 npx --no-install expo install --check | Exit 0; local bundledNativeModules map; offline reliability warning | PASS; exit 0; offline map only, not fresh remote validation |
| Android export | CI=1 EXPO_OFFLINE=1 EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=https://audit.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=audit-placeholder timeout 360 node node_modules/expo/bin/cli export --platform android --max-workers 2 --source-maps --output-dir /tmp/medveda-audit-5/baseline-export | Completed export observed in command output: 6.4 MB HBC and 17 MB map; earlier scratch exit/artifact lost | PASS; confirmation exit 0; bundle and source map emitted; exact artifacts below |
| Dependency vulnerabilities | npm audit --json --cache /tmp/medveda-audit-5/npm-cache | Exit 1; 3 moderate affected nodes; 0 high/critical | Exit 1; 3 moderate affected nodes; 0 high/critical |

The Android export substitutes dummy public Supabase values and disables dotenv; it does not contact a backend or certify a production environment. The first normal export and the offline `--no-bytecode --max-workers 1` diagnostic retry timed out (exit 124). No AAB was built; AAB size comparison is **UNVERIFIED**.

<details><summary>Doctor output</summary>


```text
Running 21 checks on your project...
21/21 checks passed. No issues detected!
```

</details>


<details><summary>Compatibility output</summary>


```text
env: load .env
env: export EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_SUPABASE_URL
Networking has been disabled
Unable to reach well-known versions endpoint. Using local dependency map expo/bundledNativeModules.json for version validation
Dependency validation is unreliable in offline-mode
Dependencies are up to date
```

</details>


<details><summary>Android export retained output</summary>


```text
Starting Metro Bundler

Android Bundled 38960ms node_modules/expo/AppEntry.js (2880 modules)

› Assets (22):
assets/adaptive-icon.png (1.3MB)
assets/branding/medveda-header-logo.png (91KB)
assets/icon.png (885KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf (166KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf (390KB)
node_modules/@react-navigation/elements/lib/module/assets/back-icon-mask.png (653B)
node_modules/@react-navigation/elements/lib/module/assets/back-icon.png (4 variations | 152B)
node_modules/@react-navigation/elements/lib/module/assets/clear-icon.png (4 variations | 425B)
node_modules/@react-navigation/elements/lib/module/assets/close-icon.png (4 variations | 235B)
node_modules/@react-navigation/elements/lib/module/assets/search-icon.png (4 variations | 599B)

› android bundles (2):
_expo/static/js/android/AppEntry-0c79e485fc74c491ef43c4ce4f32fc63.hbc (6.4MB)
_expo/static/js/android/AppEntry-0c79e485fc74c491ef43c4ce4f32fc63.hbc.map (17MB)

› Files (1):
metadata.json (1.5KB)

Exported: /tmp/medveda-audit-5/baseline-export
```

</details>


<details><summary>Local reproduction output</summary>


```text
SESSION_TAMPER: ciphertext-only bit flip accepted; Alice -> Mlice; no key read by attacker; no JWT forgery demonstrated
STREAK_TIMEZONE: 2026-11-15 at 2026-11-16 00:30 Asia/Kolkata; expected local day 2026-11-16
```

</details>


### Completed supplemental command register

Each row ran `node --experimental-strip-types <file>` from repo root (wrapper: `timeout 60` on reruns). These are existing host tests; they do not substitute for native, payment-provider or hosted SQL verification. The configured recovery command also exercises the shared website recovery controller because the mobile recovery flow depends on that bridge.

| Suite file | Retained exit |
|---|---:|
| `mobile-app/__tests__/MOB-01.cjs` | 0 |
| `mobile-app/__tests__/MOB-03.cjs` | 0 |
| `mobile-app/__tests__/MOB-04-service.cjs` | 0 |
| `mobile-app/__tests__/MOB-04.cjs` | 0 |
| `mobile-app/__tests__/MOB-05.cjs` | 0 |
| `mobile-app/__tests__/MOB-06.cjs` | 0 |
| `mobile-app/__tests__/MOB-07.cjs` | 0 |
| `mobile-app/__tests__/MOB-08.cjs` | 0 |
| `mobile-app/__tests__/MOB-09.cjs` | 0 |
| `mobile-app/__tests__/MOB-10.cjs` | 0 |
| `mobile-app/__tests__/MOB-11.cjs` | 0 |
| `mobile-app/__tests__/MOB-13.cjs` | 0 |
| `mobile-app/__tests__/MOB-14-backoff.cjs` | 0 |
| `mobile-app/__tests__/MOB-14.cjs` | 0 |
| `mobile-app/__tests__/MOB-15.cjs` | 0 |
| `mobile-app/__tests__/MOB-16.cjs` | 0 |
| `mobile-app/__tests__/MOB-17.cjs` | 0 |
| `mobile-app/__tests__/MOB-18.cjs` | 0 |
| `mobile-app/__tests__/MOB-19.cjs` | 0 |
| `mobile-app/__tests__/MOB-20.cjs` | 0 |
| `mobile-app/scripts/accessibility-selftest.cjs` | 0 |
| `mobile-app/scripts/android-release-selftest.cjs` | 0 |
| `mobile-app/scripts/android-vault-preflight-selftest.cjs` | 0 |
| `mobile-app/scripts/audit-firebase-profile-selftest.cjs` | 0 |
| `mobile-app/scripts/audit-icon-controls-selftest.cjs` | 0 |
| `mobile-app/scripts/audit-navigation-selftest.cjs` | 0 |
| `mobile-app/scripts/audit-reminder-service-selftest.cjs` | 0 |
| `mobile-app/scripts/auth-recovery-selftest.cjs` | 0 |
| `mobile-app/scripts/auth-state-race-selftest.cjs` | 0 |
| `mobile-app/scripts/checkout-html-selftest.mjs` | 0 |
| `mobile-app/scripts/checkout-security-selftest.cjs` | 0 |
| `mobile-app/scripts/course-state-race-selftest.cjs` | 0 |
| `mobile-app/scripts/course-year-confirmation-selftest.cjs` | 0 |
| `mobile-app/scripts/course-year-picker-race-selftest.cjs` | 0 |
| `mobile-app/scripts/course-year-selection-selftest.cjs` | 0 |
| `mobile-app/scripts/deep-link-selftest.cjs` | 0 |
| `mobile-app/scripts/download-actions-selftest.cjs` | 0 |
| `mobile-app/scripts/firebase-config-selftest.cjs` | 0 |
| `mobile-app/scripts/list-states-selftest.cjs` | 0 |
| `mobile-app/scripts/load-resource-selftest.cjs` | 0 |
| `mobile-app/scripts/login-network-selftest.cjs` | 0 |
| `mobile-app/scripts/login-submit-selftest.cjs` | 0 |
| `mobile-app/scripts/mv004-recovery-selftest.cjs` | 0 |
| `mobile-app/scripts/mv007-billing-boundary-selftest.cjs` | 0 |
| `mobile-app/scripts/mv008-ownership-selftest.cjs` | 0 |
| `mobile-app/scripts/mv009-store-selftest.cjs` | 0 |
| `mobile-app/scripts/mv010-options-selftest.cjs` | 0 |
| `mobile-app/scripts/mv011-accessibility-selftest.cjs` | 0 |
| `mobile-app/scripts/mv012-history-selftest.cjs` | 0 |
| `mobile-app/scripts/navigation-lazy-selftest.cjs` | 0 |
| `mobile-app/scripts/nonplay-test-isolation-selftest.cjs` | 0 |
| `mobile-app/scripts/notes-billing-choice-selftest.cjs` | 0 |
| `mobile-app/scripts/notes-entitlement-selftest.cjs` | 0 |
| `mobile-app/scripts/notes-open-selftest.cjs` | 0 |
| `mobile-app/scripts/notification-account-hook-selftest.cjs` | 0 |
| `mobile-app/scripts/notification-inflight-selftest.cjs` | 0 |
| `mobile-app/scripts/notification-preferences-selftest.cjs` | 0 |
| `mobile-app/scripts/notification-reads-selftest.cjs` | 0 |
| `mobile-app/scripts/notification-routing-selftest.cjs` | 0 |
| `mobile-app/scripts/offline-download-selftest.cjs` | 0 |
| `mobile-app/scripts/offline-license-storage-selftest.cjs` | 0 |
| `mobile-app/scripts/offline-owner-selftest.cjs` | 0 |
| `mobile-app/scripts/p2-registration-selftest.cjs` | 0 |
| `mobile-app/scripts/password-policy-selftest.mjs` | 0 |
| `mobile-app/scripts/payment-poll-selftest.cjs` | 0 |
| `mobile-app/scripts/payment-provider-selftest.cjs` | 0 |
| `mobile-app/scripts/payment-request-selftest.cjs` | 0 |
| `mobile-app/scripts/payment-routing-selftest.cjs` | 0 |
| `mobile-app/scripts/payment-success-owner-selftest.cjs` | 0 |
| `mobile-app/scripts/payment-summary-selftest.cjs` | 0 |
| `mobile-app/scripts/payment-verdict-selftest.cjs` | 0 |
| `mobile-app/scripts/pdf-lifecycle-selftest.cjs` | 0 |
| `mobile-app/scripts/pdf-remote-retry-selftest.cjs` | 0 |
| `mobile-app/scripts/play-catalog-contract-selftest.cjs` | 0 |
| `mobile-app/scripts/profile-save-selftest.cjs` | 0 |
| `mobile-app/scripts/purchases-selftest.cjs` | 0 |
| `mobile-app/scripts/purchases-unavailable-ui-selftest.cjs` | 0 |
| `mobile-app/scripts/push-lifecycle-selftest.cjs` | 0 |
| `mobile-app/scripts/quiz-editing-selftest.cjs` | 0 |
| `mobile-app/scripts/quiz-hooks-selftest.cjs` | 0 |
| `mobile-app/scripts/quiz-input-selftest.cjs` | 0 |
| `mobile-app/scripts/razorpay-internal-test-selftest.cjs` | 0 |
| `mobile-app/scripts/razorpay-live-testing-selftest.cjs` | 0 |
| `mobile-app/scripts/readiness-selftest.cjs` | 0 |
| `mobile-app/scripts/release-payments-disabled-selftest.cjs` | 0 |
| `mobile-app/scripts/remaining-audit-selftest.cjs` | 0 |
| `mobile-app/scripts/route-validation-selftest.cjs` | 0 |
| `mobile-app/scripts/same-project-build-selftest.cjs` | 0 |
| `mobile-app/scripts/search-cache-selftest.cjs` | 0 |
| `mobile-app/scripts/search-lazy-hook-selftest.cjs` | 0 |
| `mobile-app/scripts/search-pagination-selftest.cjs` | 0 |
| `mobile-app/scripts/sentry-config-selftest.cjs` | 0 |
| `mobile-app/scripts/staging-build-selftest.cjs` | 0 |
| `mobile-app/scripts/startup-availability-selftest.cjs` | 0 |
| `mobile-app/scripts/sync-concurrency-selftest.cjs` | 0 |
| `mobile-app/scripts/video-data-selftest.cjs` | 0 |
| `mobile-app/scripts/video-link-selftest.cjs` | 0 |
| `mobile-app/scripts/video-tap-selftest.cjs` | 0 |
| `mobile-app/scripts/wallet-expired-ui-selftest.cjs` | 0 |
| `mobile-app/scripts/wallet-terms-selftest.cjs` | 0 |
| `mobile-app/scripts/years-inflight-selftest.cjs` | 0 |

<details><summary>Representative retained final suite output</summary>


```text
$ node --experimental-strip-types mobile-app/__tests__/MOB-16.cjs
PASS MOB-16.cjs
$ node --experimental-strip-types mobile-app/__tests__/MOB-17.cjs
PASS MOB-17 cap
PASS MOB-17 aba
PASS MOB-17 unmount
PASS MOB-17 refresh
PASS MOB-17 pageError
PASS MOB-17 countMismatch
PASS MOB-17 shortScan
PASS MOB-17.cjs
$ node --experimental-strip-types mobile-app/__tests__/MOB-18.cjs
PASS MOB-18.cjs
$ node --experimental-strip-types mobile-app/__tests__/MOB-19.cjs
PASS MOB-19.cjs
$ node --experimental-strip-types mobile-app/__tests__/MOB-20.cjs
DEVICE TEST PENDING: landscape, small viewport, large text and open keyboard
PASS MOB-20.cjs
```

</details>


### Final verification evidence retained in this report

Final commands from repo root: `node mobile-app/node_modules/typescript/bin/tsc -p mobile-app/tsconfig.json --noEmit`; `node tooling/node_modules/eslint/bin/eslint.js mobile-app/App.tsx mobile-app/src`; `npm run test:password-recovery --prefix mobile-app`. Each returned exit 0. Doctor: `CI=1 EXPO_NO_DOTENV=1 npm exec --yes --cache /tmp/medveda-audit-5/npm-cache -- expo-doctor`, exit 0. Compatibility check used `CI=1 EXPO_OFFLINE=1 EXPO_NO_DOTENV=1 npx --no-install expo install --check`, exit 0 with offline validation warning. Final npm audit returned exit 1 with the same three moderate nodes.

The 101 recorded supplemental commands were each rerun as `node --experimental-strip-types <file>`, from repo root with a 60-second per-file bound and process spawning enabled. The completed result register contained 101 entries, 101 exit 0, no failures. This does not cover real device/provider/hosted execution.

<details><summary>Final Doctor output</summary>

```text
Running 21 checks on your project...
21/21 checks passed. No issues detected!
```

</details>

<details><summary>Final compatibility output</summary>

```text
Dependency validation is unreliable in offline-mode
Dependencies are up to date
```

</details>

<details><summary>Final recovery summary</summary>

```text
type: 'test'
  ...
1..26
# tests 26
# suites 0
# pass 26
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1480.719261
PASS server min length 8
PASS server requires lower+upper+digit+symbol
PASS mobile and website patterns identical
24 pattern checks, 0 FAIL
```

</details>

Final export command used the section-2 public dummy config and `/tmp/medveda-audit-5/after-export` output directory. Its retained output ended with:

```text
node_modules/@react-navigation/elements/lib/module/assets/clear-icon.png (4 variations | 425B)
node_modules/@react-navigation/elements/lib/module/assets/close-icon.png (4 variations | 235B)
node_modules/@react-navigation/elements/lib/module/assets/search-icon.png (4 variations | 599B)

› android bundles (2):
_expo/static/js/android/AppEntry-f0225b43f026e1618ea1772d0b336809.hbc (6.4MB)
_expo/static/js/android/AppEntry-f0225b43f026e1618ea1772d0b336809.hbc.map (17MB)

› Files (1):
metadata.json (1.5KB)

Exported: /tmp/medveda-audit-5/after-export
```

The first final export emitted artifacts before its process exit was lost across interruption. A subsequent uninterrupted confirmation used the same command with `timeout 90` and `--output-dir /tmp/medveda-audit-5/after-export-confirm`; it returned **exit 0**. Exact retained command output:

```text
› android bundles (2):
_expo/static/js/android/AppEntry-f0225b43f026e1618ea1772d0b336809.hbc (6.4MB)
_expo/static/js/android/AppEntry-f0225b43f026e1618ea1772d0b336809.hbc.map (17MB)

› Files (1):
metadata.json (1.5KB)

Exported: /tmp/medveda-audit-5/after-export-confirm
EXPORT_EXIT=0
```

Artifact inspection below used Python `stat`, SHA-256 over bytes, and JSON parsing of the first final export map’s `sources` array:

```json
[
  {
    "file": "_expo/static/js/android/AppEntry-f0225b43f026e1618ea1772d0b336809.hbc",
    "bytes": 6428280,
    "sha256": "edef45db363aa323517b6054a47c18ef9894b547d4882d390efbd14597ddab3e"
  },
  {
    "file": "_expo/static/js/android/AppEntry-f0225b43f026e1618ea1772d0b336809.hbc.map",
    "bytes": 16966175,
    "sha256": "1da0f2a56747aa43a6486bdb326bee1119c63539ef9e427cbabad7b1c2c8601a",
    "sourceCount": 2866,
    "advisoryPathMatches": []
  },
  {
    "file": "metadata.json",
    "bytes": 1538,
    "sha256": "b514ef462239014c22027587f6581aed31c1c6b4f22c5386a011888b9e5c97fe"
  }
]
```

`advisoryPathMatches` tested `node_modules/minimatch/` and `node_modules/@expo/fingerprint/` in all map source paths. Neither appeared. This supports exclusion from this JS export; it does not prove exclusion from native binaries or authorize a residual-risk acceptance. The earlier baseline output rounded bundle/map to 6.4 MB/17 MB; exact baseline artifacts were lost, so no byte-exact size/hash delta is claimed. Bundle filenames differed; source/config/dependency Git diff remained empty. No AAB was measured.

### Additional host-check results

| Command from repo root | Retained result | Scope |
|---|---|---|
| `node mobile-app/scripts/verify-signature-selftest.js` | exit 0 | 4 synthetic HMAC checks; this legacy helper does not prove deployed Edge functions |
| `python3 mobile-app/scripts/android-bundle-validator-selftest.py` | exit 0 | 11 synthetic inspector tests; does not inspect a real signed MedVeda AAB |
| `timeout 60 python3 mobile-app/modules/medveda-offline-vault/tests/run-host-tests.py` | exit 0 | Host Kotlin/JCA/codec qualification only; not Android Keystore/device testing |

<details><summary>signature retained output</summary>

```text
OK: A correctly generated signature is accepted
OK: A tampered signature is rejected
OK: Signature generated with the wrong secret is rejected
OK: Signature is rejected if the order id doesn't match

If all four checks say OK, the signature logic used in
verifyPayment.ts and webhook.ts is correct.
```

</details>

<details><summary>validator retained output</summary>

```text
test_enabled_or_unspecified_provider_fails (__main__.ValidatorTests.test_enabled_or_unspecified_provider_fails) ... ok
test_expo_wrapped_config_passes (__main__.ValidatorTests.test_expo_wrapped_config_passes) ... ok
test_missing_config_fails (__main__.ValidatorTests.test_missing_config_fails) ... ok
test_missing_required_billing_fails (__main__.ValidatorTests.test_missing_required_billing_fails) ... ok
test_nonproduction_or_purchase_acceptance_flags_fail (__main__.ValidatorTests.test_nonproduction_or_purchase_acceptance_flags_fail) ... ok
test_required_billing_and_disabled_config_pass (__main__.ValidatorTests.test_required_billing_and_disabled_config_pass) ... ok
test_reviewed_library_permissions_pass (__main__.ValidatorTests.test_reviewed_library_permissions_pass) ... ok
test_sdk_qualified_unexpected_permission_fails (__main__.ValidatorTests.test_sdk_qualified_unexpected_permission_fails) ... ok
test_unexpected_permissions_fail (__main__.ValidatorTests.test_unexpected_permissions_fail) ... ok
test_wrong_package_fails (__main__.ValidatorTests.test_wrong_package_fails) ... ok
test_wrong_runtime_fails (__main__.ValidatorTests.test_wrong_runtime_fails) ... ok

----------------------------------------------------------------------
Ran 11 tests in 2.054s

OK
```

</details>

<details><summary>vault-host retained output</summary>

```text
PASS A to B to A permits only the active owner's independently keyed files
PASS revocation at durable-file boundary prevents publication and old ticket reuse
PASS fsync and publication failures retain only ciphertext and cannot report success
PASS existing target is never clobbered by atomic publication
PASS symlink roots and source entries cannot escape vault
PASS new vault root parent must be durably flushed before creation reports success
PASS threaded revocation serializes after admitted commit and denies subsequent work
HOST_DIAGNOSTIC sizeMiB=1 sealAndVerifyMs=70
HOST_DIAGNOSTIC sizeMiB=10 sealAndVerifyMs=497
HOST_DIAGNOSTIC sizeMiB=50 sealAndVerifyMs=1031
HOST_DIAGNOSTIC sizeMiB=100 sealAndVerifyMs=1541
PASS stream 1 10 50 100 MiB under 48 MiB host heap without plaintext spooling
22 focused foundation tests passed; no Android/iOS/device acceptance claimed
PASS independent Node AES-GCM codec authenticates Kotlin output
PASS restart authenticates committed/orphan ciphertext and ignores partials
PASS forced JVM halt after file: prior final unchanged; ciphertext only
PASS restart authenticates committed/orphan ciphertext and ignores partials
PASS forced JVM halt after link: prior final unchanged; ciphertext only
PASS restart authenticates committed/orphan ciphertext and ignores partials
PASS forced JVM halt after directory: prior final unchanged; ciphertext only
PASS restart authenticates committed/orphan ciphertext and ignores partials
PASS forced JVM halt after cleanup: prior final unchanged; ciphertext only
```

</details>

The first direct invocation of `reference-codec.cjs` without its required mode/work-directory arguments failed with ERR_INVALID_ARG_TYPE (exit 1). It is a helper for the host runner, not an independently runnable test. That invocation is not counted as a production failure or test pass.

## 3. App map

```text
mobile-app/
├── package.json → node_modules/expo/AppEntry.js → App.tsx (actual configured entry)
├── index.ts                         Alternate registerRootComponent wrapper; keep as entry candidate
├── App.tsx                          SQLite initialization, legacy cleanup, sync/push startup, maintenance/update gates
├── src/navigation/                  React Navigation native stack; auth-owned groups, lazy screen loaders, recovery linking
├── src/screens/                     Auth/onboarding, course→year→subject→chapter, notes/PDF/video/quiz, store/payments,
│                                    purchases/downloads, search, profile/referrals/settings, notifications/reminder, legal
├── src/components/                  Shared cards, inputs, feedback, drawers; motion/ animations and search/ widgets
├── src/hooks/                       Resource loading, account purchases, search, quiz stats, downloads/network, release gates
├── src/features/auth/               Identifier login, OTP/reset bridge/controller, lockout, auth fetch deadlines
├── src/services/                    Auth/course state singletons, payment/billing recovery, catalog/search, sync, push/reminder
├── src/repositories/                Supabase table/RPC mapping; catalog pagination and owner purchase/order reads
├── src/config/                      Supabase client, encrypted-session adapter, SQLite schema/migrations, Sentry/provider gates
├── src/utils/                       Download manager, caches/history/streaks, video normalization, text matching, logging
├── src/constants/                   Legal links/contact details and source privacy inventory
├── src/types/                       Entity/navigation/offline contracts plus barrel re-exports
├── src/validation/                  Yup auth/contact schemas and shared password policy
├── src/theme/                       Color/font/spacing/typography/motion tokens
├── assets/                          Icons, images and fonts; config wildcard includes assets
├── modules/medveda-offline-vault/    Local native vault module, codec and native qualification tests; not proven unused
├── plugins/                         Android queries/release mods and conditional Sentry build plugin
├── scripts/, __tests__/             Local regression/release checks and host harnesses
├── app.json, app.config.js          Base Expo config plus distribution/runtime/provider/FCM/signing decisions
├── eas.json                         Build environments/channels, free-only production and isolated payment-test profiles
├── metro.config.js, babel.config.js Bundling/Sentry integration and Expo Babel setup
└── release-rules.pro                Native shrinker keep rules; generated Android/iOS are ignored
supabase/functions/, migrations/     Reviewed only where called by mobile or enforcing its content/payment/auth contracts
tooling/, eslint.config.mjs          Existing shared lint tooling; this audit targets mobile source only
```

No expo-router file-based route system is configured. `app.json` contains app config; `package.json.main` controls entry. No Redux/Zustand/React Context store was found in the inspected source inventory; account/course state use module singletons and subscriptions.

### Registered screen inventory

`Splash`, `Login`, `Register`, `ForgotPassword`, `ResetPassword`, `Home`, `SelectCourseYear`, `Years`, `Subjects`, `Chapters`, `ChapterDetails`, `Store`, `Notes`, `Videos`, `QuizTests`, `Quiz`, `Profile`, `EditProfile`, `Referral`, `ReferralTerms`, `ChangePassword`, `MyPurchases`, `Downloads`, `PdfViewer`, `Search`, `Settings`, `StudyReminder`, `Notifications`, `NotificationPreferences`, `PaymentSuccess`, `PaymentFailed`, `OrderSummary`, `PaymentCheckout`, `About`, `Contact`, `Privacy`, `Terms`.

`UpdateRequiredScreen` and `MaintenanceScreen` are rendered directly by App, not stack routes. PDF has `.native.tsx`/`.web.tsx` platform variants. Routes gated by provider/account state remain reachable features and are not dead code.

### Direct backend contract inventory

| Kind | Contract | Client evidence |
|---|---|---|
| from | `analytics_events` | `mobile-app/src/services/analyticsService.ts:29` |
| from | `app_config` | `mobile-app/src/services/appConfigService.ts:52` |
| from | `chapters` | `mobile-app/src/repositories/chaptersRepository.ts:24`; `mobile-app/src/repositories/chaptersRepository.ts:40`; `mobile-app/src/repositories/chaptersRepository.ts:48` |
| from | `courses` | `mobile-app/src/repositories/coursesRepository.ts:9` |
| from | `notes` | `mobile-app/src/repositories/notesRepository.ts:12`; `mobile-app/src/services/secureNotesService.ts:20` |
| from | `notifications` | `mobile-app/src/services/notificationsService.ts:36` |
| from | `orders` | `mobile-app/src/repositories/ordersRepository.ts:6`; `mobile-app/src/repositories/ordersRepository.ts:13`; `mobile-app/src/screens/payment/PaymentSuccessScreen.tsx:56` |
| from | `products` | `mobile-app/src/repositories/productsRepository.ts:36`; `mobile-app/src/repositories/productsRepository.ts:48`; `mobile-app/src/repositories/productsRepository.ts:60` |
| from | `profiles` | `mobile-app/src/repositories/usersRepository.ts:22`; `mobile-app/src/repositories/usersRepository.ts:39`; `mobile-app/src/services/authState.ts:163` |
| from | `purchases` | `mobile-app/src/repositories/purchasesRepository.ts:6`; `mobile-app/src/screens/payment/PaymentSuccessScreen.tsx:59` |
| from | `push_tokens` | `mobile-app/src/services/pushNotifications.ts:152` |
| from | `quiz_scores` | `mobile-app/src/hooks/useQuizStats.ts:47`; `mobile-app/src/hooks/useQuizStats.ts:67` |
| from | `quiz_tests` | `mobile-app/src/repositories/quizRepository.ts:27` |
| from | `referral_settings` | `mobile-app/src/repositories/referralsRepository.ts:16` |
| from | `subjects` | `mobile-app/src/repositories/subjectsRepository.ts:7` |
| from | `verified_quiz_attempts` | `mobile-app/src/hooks/useQuizStats.ts:58`; `mobile-app/src/hooks/useQuizStats.ts:63`; `mobile-app/src/hooks/useQuizStats.ts:85` |
| from | `videos` | `mobile-app/src/repositories/videosRepository.ts:8`; `mobile-app/src/repositories/videosRepository.ts:32` |
| from | `years` | `mobile-app/src/repositories/yearsRepository.ts:8` |
| invoke | `delete-account` | `mobile-app/src/services/usersService.ts:94` |
| invoke | `get-note-url` | `mobile-app/src/services/secureNotesService.ts:46` |
| invoke | `login-with-mobile` | `mobile-app/src/features/auth/authService.ts:34` |
| invoke | `request-password-reset-by-mobile` | `mobile-app/src/features/auth/authService.ts:72` |
| rpc | `apply_referral_code` | `mobile-app/src/repositories/referralsRepository.ts:35` |
| rpc | `change_my_phone` | `mobile-app/src/services/usersService.ts:67` |
| rpc | `get_maintenance_mode` | `mobile-app/src/services/maintenanceService.ts:18` |
| rpc | `get_my_play_fulfillment` | `mobile-app/src/services/playBillingService.ts:529` |
| rpc | `get_my_referral_list` | `mobile-app/src/repositories/referralsRepository.ts:48` |
| rpc | `get_my_referrals` | `mobile-app/src/repositories/referralsRepository.ts:29` |
| rpc | `get_my_verified_quiz_stats` | `mobile-app/src/hooks/useQuizStats.ts:41` |
| rpc | `get_my_wallet` | `mobile-app/src/repositories/referralsRepository.ts:41` |
| rpc | `get_public_quiz_tests` | `mobile-app/src/repositories/quizRepository.ts:6`; `mobile-app/src/repositories/quizRepository.ts:43` |
| rpc | `quote_my_order` | `mobile-app/src/repositories/referralsRepository.ts:55` |
| rpc | `register_push_token` | `mobile-app/src/services/pushNotifications.ts:111` |
| rpc | `set_my_course_year` | `mobile-app/src/services/usersService.ts:54` |
| rpc | `submit_quiz_attempt` | `mobile-app/src/services/syncEngine.ts:145` |

Additional fetch-based Edge contracts: `create-order`, `create-order-play-choice`, `create-order-nonplay-test`, `verify-payment`, `create-play-order`, `verify-play-purchase`, `attach-external-token`, and the isolated non-Play test catalog/note/verification routes. Their names are constructed in paymentService/playBillingService/nonplayTestService; literal invoke scanning alone is insufficient. Search repository dynamically calls `.from(table)` for the seven catalog tables.

### Environment inventory (names only)

| Variable | Evidence / role |
|---|---|
| `AUDIT_BASELINE` | test/harness selector; `mobile-app/scripts/audit-icon-controls-selftest.cjs:3`; `mobile-app/scripts/audit-navigation-selftest.cjs:7` |
| `EAS_BUILD_PLATFORM` | build/distribution or builder-only setting; `mobile-app/app.config.js:39`; `mobile-app/scripts/payment-provider-selftest.cjs:12` |
| `EAS_BUILD_PROFILE` | build/distribution or builder-only setting; `mobile-app/app.config.js:29`; `mobile-app/app.config.js:38` |
| `EXPO_PUBLIC_DISABLE_SCREENSHOT_BLOCK` | public client/bundle value; `mobile-app/src/hooks/usePreventScreenshot.ts:28` |
| `EXPO_PUBLIC_SENTRY_DSN` | public client/bundle value; `mobile-app/src/config/sentry.ts:15` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | public client/bundle value; `mobile-app/src/config/supabase.ts:22` |
| `EXPO_PUBLIC_SUPABASE_URL` | public client/bundle value; `mobile-app/src/config/paymentProvider.ts:20`; `mobile-app/src/config/paymentProvider.ts:27` |
| `GOOGLE_SERVICES_JSON` | build/distribution or builder-only setting; `mobile-app/app.config.js:85`; `mobile-app/scripts/audit-firebase-profile-selftest.cjs:4` |
| `MEDVEDA_BUILD_TARGET` | build/distribution or builder-only setting; `mobile-app/app.config.js:50`; `mobile-app/app.config.js:51` |
| `MEDVEDA_DISTRIBUTION` | build/distribution or builder-only setting; `mobile-app/app.config.js:34`; `mobile-app/app.config.js:35` |
| `MEDVEDA_INDIA_UCB_ENROLLED` | build/distribution or builder-only setting; `mobile-app/app.config.js:44` |
| `MEDVEDA_MOBILE_ROOT` | test/harness selector; `mobile-app/scripts/navigation-lazy-selftest.cjs:5` |
| `MEDVEDA_NONPLAY_TEST_ENVIRONMENT` | build/distribution or builder-only setting; `mobile-app/app.config.js:48` |
| `MEDVEDA_PAYMENT_PROVIDER` | build/distribution or builder-only setting; `mobile-app/app.config.js:22`; `mobile-app/scripts/payment-provider-selftest.cjs:11` |
| `MEDVEDA_TEST_DOWNLOAD_SOURCE` | test/harness selector; `mobile-app/scripts/offline-download-selftest.cjs:73` |
| `MEDVEDA_TEST_OWNER_SOURCE` | test/harness selector; `mobile-app/scripts/offline-owner-selftest.cjs:17` |
| `MEDVEDA_TEST_QUIZ_SOURCE` | test/harness selector; `mobile-app/scripts/quiz-hooks-selftest.cjs:40` |
| `MEDVEDA_UCB_TEST_ACCEPTED` | build/distribution or builder-only setting; `mobile-app/app.config.js:45` |
| `MEDVEDA_WEB_EVIDENCE` | test/harness selector; `mobile-app/scripts/startup-web-smoke.cjs:76` |
| `MEDVEDA_WEB_TEST_URL` | test/harness selector; `mobile-app/scripts/startup-web-smoke.cjs:6` |
| `MOB17_CASE` | test/harness selector; `mobile-app/__tests__/MOB-17.cjs:32` |
| `MOBILE_FIX_ROOT` | test/harness selector; `mobile-app/__tests__/audit-harness.cjs:6` |
| `PLAYWRIGHT_MODULE` | test/harness selector; `mobile-app/scripts/startup-web-smoke.cjs:5` |
| `SENTRY_AUTH_TOKEN` | build/distribution or builder-only setting; `mobile-app/plugins/withOptionalSentry.cjs:5` |
| `SENTRY_ORG` | build/distribution or builder-only setting; `mobile-app/plugins/withOptionalSentry.cjs:6` |
| `SENTRY_PROJECT` | build/distribution or builder-only setting; `mobile-app/plugins/withOptionalSentry.cjs:6` |

Also checked EAS declared variables: `ANDROID_SHRINK` is set in the shrink-test profile but current release config enables shrinking unconditionally; no production consumer was established. No env value was changed. The Supabase publishable/anon key and project URL are public configuration, not service-role secrets. `SENTRY_AUTH_TOKEN` is builder-only and is not an EXPO_PUBLIC variable.

## 4. Findings table

| ID | Severity | Category | File:line | Evidence | Impact | Fix | Status |
|---|---|---|---|---|---|---|---|
| MV-A01 | High | Privacy / logout | `mobile-app/src/utils/downloadManager.ts:472` | **Logout cleanup does not erase all user-local data**; `getDb().runSync(&#96;DELETE FROM downloads;&#96;);` | clearAllDownloads deletes only downloads. Quiz answers/outbox and device-wide search/activity/streak data survive logout/account deletion. This violates the requested all-user-data cleanup; retained outbox payloads contain user_id. Cross-account disclosure through a particular UI still needs device testing. | Design one account-lifetime cleanup operation covering owner-scoped SQLite, AsyncStorage, licenses and in-memory state; preserve or explicitly discard pending work with a defined product policy. Test logout/account switch during IO. Auth/offline boundary change: no automatic patch. | Open |
| MV-A02 | High | Hosted access / payment security | `supabase/functions/get-note-url/index.ts:43` | **Deployed authorization, storage and settlement controls are unverified**; `const { data: allowed, error: accessErr } = await supabaseAdmin.rpc("user_can_access_note_with_aal", {` | Source calls an entitlement RPC before signing a 120-second URL; this does not establish deployed bucket privacy, current RLS/ACLs, RPC versions or webhook/reversal behavior. Release cannot rely on source comments. | Run the owner/other-user/anon API and storage matrix in section 5 against an identified isolated target, compare deployed function/migration versions, then review production metadata read-only. | Needs manual check |
| MV-A03 | High | Release / Android | `mobile-app/eas.json:45` | **Signed Android artifact and device acceptance are unverified**; `"buildType": "app-bundle"` | No signed APK/AAB was built or installed in this audit. Target SDK, merged manifest, ABIs, release signing, R8 output, size, low-memory behavior and runtime-only failures are unverified. JS export is a separate gate. | Build the reviewed free-only profile, inspect the exact signed AAB and run section 10 on physical Android devices; retain hashes and Play internal-track results. | Needs manual check |
| MV-A04 | High | Billing readiness | `mobile-app/app.config.js:31` | **New paid sales are deliberately disabled; billing qualification remains pending**; `throw new Error("Production Play profiles require disabled payments pending policy verification. Direct Razorpay checkout requires the isolated non-Play test profile.");` | Production/internal profiles reject enabled providers. This is a safety gate, not a checkout bug. A release promising new purchases is not ready; Play country/program enrollment, native choice UX and provider reporting cannot be established here. | Keep gates disabled for a free-only release. Qualify program/account eligibility and all native/provider paths before a separately reviewed payment rollout; do not enable flags as an audit fix. | Needs manual check |
| MV-A05 | High | Offline product contract | `mobile-app/src/services/secureNotesService.ts:10` | **Requested seven-day paid-offline policy is not implemented in this release**; `export const PAID_NOTES_OFFLINE_ALLOWED = false;` | Paid notes are online-only. The seven-day SecureStore grace record applies to downloaded free previews; it must not be reported as paid-offline support. Legacy paid download cleanup requires device verification. | Resolve the product-contract discrepancy explicitly. If paid offline is required, commission the deferred native encryption/license/migration work and refund/expiry tests. Do not flip this constant or restore plaintext paid downloads. | Open |
| MV-A06 | Medium | Session cryptography | `mobile-app/src/config/secureSessionStorage.ts:93` | **Session ciphertext has no authentication tag**; `const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));` | Actual adapter probe accepted a ciphertext-only bit flip changing Alice to Mlice. Requires ability to modify local AsyncStorage; no JWT forgery or server-privilege escalation was demonstrated. A fresh key per generation avoids same-key counter reuse but does not authenticate ciphertext. | Use reviewed authenticated encryption (for example AES-GCM) with versioned migration, rejection of tampered envelopes and rollback/key-cleanup tests. This changes auth storage and is not a small local patch. | Open |
| MV-A07 | Medium | Deep-link contract | `mobile-app/app.json:9` | **Configured recovery scheme differs from the requested intentional ayurpulse scheme**; `"scheme": "medveda",` | app.json uses medveda and deepLinkStore allowlists medveda variants, excluding ayurpulse. Existing ayurpulse recovery links are rejected. in.medveda.app is correct and intentional. | Confirm installed-manifest and hosted bridge contract on old/new binaries. If ayurpulse compatibility is required, plan an explicit native/link migration. Do not rename identifiers automatically. | Open |
| MV-A08 | Medium | Supply chain | `mobile-app/package-lock.json:6183` | **One moderate advisory affects three npm dependency nodes**; `"node_modules/minimatch": {` | Fresh npm audit reports minimatch globparts-amplification DoS through @expo/fingerprint and expo: 3 moderate nodes, 0 high/critical. The final JS map excludes minimatch/fingerprint paths; native artifact exclusion remains unverified. Audit counts are not three independent exploits. | Track GHSA-g3hv-75wg-m249 and a compatible upstream fix. Do not apply npm audit fix --force (it proposes Expo 52.0.49). Bound build inputs/resources and obtain explicit residual-risk acceptance after bundle review. | Open |
| MV-A09 | Medium | OTA / release | `mobile-app/app.config.js:106` | **OTA code signing is conditional, not enforced by the local config**; `if (fs.existsSync(cert)) {` | Local code-signing/certificate.pem is absent. The signing block is skipped locally; a remote EAS build may differ. Channel/runtime isolation exists, but no installed certificate/channel signature test was performed. | Inspect final release manifest and EAS certificate setup. Require signed updates if this is the release policy; test unsigned/wrong-runtime rejection, retain signing keys outside the repo. | Needs manual check |
| MV-A10 | Medium | Privacy / analytics | `mobile-app/src/services/analyticsService.ts:29` | **Analytics collection has no consent/opt-out gate in logEvent**; `const { error } = await supabase.from("analytics_events").insert({` | The service inserts event name, params and current account ID whenever called. Source scan found no analytics consent control. This establishes collection behavior, not a legal conclusion about whether consent is required. | Reconcile actual event payloads and search terms with privacy/Data Safety declarations; choose and implement a consent/opt-out contract if required. Verify network payloads on the release build. | Open |
| MV-A11 | Medium | Identity retention | `supabase/migrations/20261114050400_fix4_identity_retention_schedule.sql:7` | **180-day identity purge is source-defined; live enforcement is unverified**; `delete from public.first_purchase_identities where first_purchase_at <= now()-interval '180 days';` | Migration deletes identities at first_purchase_at <= now()-180 days and may schedule cron. No hosted job state or successful executions were inspected. The source comment is not proof of deployment or retention compliance. | Owner reviews the deployment manifest and reads cron job active/name/schedule plus safe aggregate run metadata; verify a synthetic expired identity is removed in isolation. Do not activate a scheduler in this audit. | Needs manual check |
| MV-A12 | Medium | Notification product limitation | `mobile-app/src/utils/notificationPreferences.ts:12` | **Category mutes are device-local and do not control background delivery**; `const STORAGE_KEY = "medveda:notifications:preferences";` | Preferences are AsyncStorage values read by the feed/foreground handler. The screen now explicitly discloses that closed/background delivery is uncontrolled. This is a known limitation, not evidence that the disclosed behavior is broken. | Test foreground/background/killed delivery separately. If account-wide background mutes are required, implement owner-scoped server preferences/filtering under a separately approved schema and migration design. | Open |
| MV-A13 | Medium | Performance / feed | `mobile-app/src/services/notificationsService.ts:39` | **Notification feed read has no client page or limit**; `.order("created_at", { ascending: false });` | readNotificationRows selects every active notification and maps/filters locally. Large histories increase transfer/JS work; server row caps can truncate the feed. Exact hosted cap and latency are unverified. | Add stable cursor pagination with explicit page sizes and matching badge semantics; benchmark a synthetic large feed on low-end Android. | Open |
| MV-A21 | Medium | Auth / rate limits | `mobile-app/src/features/auth/loginLockout.ts:62` | **Client lockout is device-local; shared server enforcement is unverified**; `return &#96;login-lockout-${safe}&#96;;` | SecureStore counters improve per-device behavior but cannot establish account-wide resistance to clearing app data, alternate email/mobile identifiers or multiple devices. Auth backend and Edge limiter settings were not inspected live. | Test attempts against email and mobile login/OTP/reset from two devices and direct API in an isolated environment. Verify server retry windows and CAPTCHA/abuse controls; retain generic errors. | Needs manual check |
| MV-A14 | Low | Date / timezone | `mobile-app/src/utils/streakTracker.ts:24` | **Study streak uses UTC dates rather than the device day**; `return new Date().toISOString().slice(0, 10);` | Actual module probe at 2026-11-16 00:30 Asia/Kolkata persisted 2026-11-15. yesterdayKey mixes local setDate with UTC formatting. Local midnight study streaks therefore change on UTC boundaries. | Choose an explicit local-day policy; derive today/yesterday with consistent local calendar components and add India/DST/timezone-change cases. Not auto-fixed: not a critical bug or security issue. | Open |
| MV-A15 | Low | Type safety | `mobile-app/src/navigation/AppNavigator.tsx:39` | **Navigation and API boundaries retain explicit any types**; `declare const require: (path: string) => { default: import("react").ComponentType<any> };` | Navigator deferred components and many useRoute/useNavigation calls bypass the declared RootStackParamList. Passing tsc does not validate these boundaries. Existing runtime route wrappers reduce, but do not eliminate, this risk. | Type the navigator/screens against RootStackParamList and parse unknown API/storage values. Replace unsafe boundaries incrementally; do not mechanically replace all any. | Open |
| MV-A16 | Low | Brand / stale documentation | `mobile-app/package.json:2` | **AyurPulse/Firebase/Firestore references remain**; `"name": "ayurpulse-mobile",` | Full mobile reference inventory is in section 7. Some Firebase references are required FCM configuration, while comments/docs still describe the former backend and package/slug keep legacy branding. Package in.medveda.app and the user-declared ayurpulse scheme are excluded from rename recommendations. | Update student-visible/stale documentation references after checking context. Retain actual FCM APIs/config and historical evidence; do not remove Firebase solely by keyword or change identifiers. | Open |
| MV-A17 | Low | Offline / scale | `mobile-app/src/services/syncEngine.ts:67` | **Outbox fetches all owner rows before selecting a 50-item batch**; `&#96;SELECT * FROM sync_queue WHERE synced_at IS NULL` | getPendingItems loads every JSON-valid pending row for the current owner, then applies retry and batch limits in JS. Corrupt JSON is excluded before rowToQueueItem, so its invalid-JSON repair branch cannot observe those rows. No large-queue benchmark or repair UI was verified. | Use bounded cursor scans that preserve retry fairness and add explicit corrupt-row diagnostics/repair. Keep durable failed rows; do not delete them as cleanup. | Open |
| MV-A18 | Low | Dependency declaration | `mobile-app/plugins/withAndroidQueries.js:1` | **Config plugin directly imports a transitive-only package**; `const { withAndroidManifest } = require("@expo/config-plugins");` | Knip/depcheck report @expo/config-plugins unlisted; withAndroidQueries imports it directly. Current installation resolves it through Expo; no build failure is claimed. | Prefer Expo's documented expo/config-plugins re-export or declare a compatible direct dependency after SDK documentation verification; do not remove required native query configuration. | Open |
| MV-A19 | Info | Import graph | `mobile-app/src/services/authState.ts:54` | **Six circular import paths are reported by Madge**; `const { clearAllDownloads } = await import("../utils/downloadManager");` | See exact paths in section 7. Lazy imports intentionally break some evaluation cycles, and notification type-only edges are not runtime cycles. Static cycles alone do not establish a crash. | Keep modules; profile cold startup and account transitions. Refactor shared ownership contracts only with lifecycle regression coverage. | Needs manual check |
| MV-A20 | Info | Dead-code candidates | `mobile-app/src/types/index.ts:7` | **Unused-code output contains framework/test false positives**; `export * from "./course";` | Knip lists 113 files, 46 exports, 15 exported types and one duplicate-export group; its config loader also errors and does not resolve PdfViewerScreen platform files. No candidate passed every deletion gate. | Keep all candidates until full repo/native/runtime reference and batch build checks pass. Re-export barrels, native modules, tests and config plugins are not safe deletions from this tool output. | Needs manual check |
| MV-A22 | Info | Audit tooling | `mobile-app/app.config.js:21` | **Knip config evaluation is incomplete**; `module.exports = ({ config }) => {` | Knip reports Firebase Android client configuration must contain exactly one client for undefined. Doctor succeeds, so this tool invocation failure is not proof that Expo config itself is broken. | Provide tool-only Expo-aware entries/config evaluation and native-platform resolution, then rerun candidate analysis; do not alter production Firebase config to make Knip pass. | Open |

## 5. Security review

### C1. Secrets, history and supply chain

```json
{
  "current": [],
  "history": [],
  "files": 426,
  "history_commits": 83,
  "history_exit": 0
}
```

Commands: tracked mobile inventory via `git ls-files mobile-app`; history stream via `git log --all --format=COMMIT:%H -p -- mobile-app`. The scanner tracked added-line file/commit/line metadata, decoded candidate JWT payload roles, and tested PEM private-key markers plus assigned Razorpay/webhook/service-role secret literals. No matches were found for those patterns. This is a bounded pattern scan, not certification that arbitrary secrets never existed. Ignored `.env`, local signing keystore, FCM and service-account files were not printed or committed. No whole-repo/admin secret-history audit was claimed. A Razorpay key ID is public client configuration; key_secret/webhook secret must remain server-only.

Lockfile inspection: 668 package entries; 0 HTTPS-resolved entries missing integrity. Install-script markers: `node_modules/@sentry/cli`. Sentry CLI is expected build tooling; its marker alone is not malicious evidence. No install script was edited.

<details><summary>Fresh npm audit output</summary>


```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "@expo/fingerprint": {
      "name": "@expo/fingerprint",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        "minimatch"
      ],
      "effects": [
        "expo"
      ],
      "range": ">=0.11.12-canary-20250303-4dba60e",
      "nodes": [
        "node_modules/@expo/fingerprint"
      ],
      "fixAvailable": {
        "name": "expo",
        "version": "52.0.49",
        "isSemVerMajor": true
      }
    },
    "expo": {
      "name": "expo",
      "severity": "moderate",
      "isDirect": true,
      "via": [
        "@expo/fingerprint"
      ],
      "effects": [],
      "range": ">=53.0.0-canary-20241211-61c49bd",
      "nodes": [
        "node_modules/expo"
      ],
      "fixAvailable": {
        "name": "expo",
        "version": "52.0.49",
        "isSemVerMajor": true
      }
    },
    "minimatch": {
      "name": "minimatch",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        {
          "source": 1244623,
          "name": "minimatch",
          "dependency": "minimatch",
          "title": "minimatch has potential denial of service via globparts amplification",
          "url": "https://github.com/advisories/GHSA-g3hv-75wg-m249",
          "severity": "moderate",
          "cwe": [
            "CWE-405"
          ],
          "cvss": {
            "score": 0,
            "vectorString": null
          },
          "range": ">=7.0.0 <11.0.1"
        }
      ],
      "effects": [
        "@expo/fingerprint"
      ],
      "range": "7.0.0 - 11.0.0",
      "nodes": [
        "node_modules/minimatch"
      ],
      "fixAvailable": {
        "name": "expo",
        "version": "52.0.49",
        "isSemVerMajor": true
      }
    }
  },
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 3,
      "high": 0,
      "critical": 0,
      "total": 3
    },
    "dependencies": {
      "prod": 639,
      "dev": 1,
      "optional": 19,
      "peer": 9,
      "peerOptional": 0,
      "total": 667
    }
  }
}
npm notice
npm notice New major version of npm available! 10.9.8 -> 12.2.2
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.2
npm notice To update run: npm install -g npm@12.2.2
npm notice
```

</details>


Advisory source: [GitHub GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). The registry result establishes the reported advisory, not runtime exploitability. Package-age/abandonment/malicious-maintainer provenance and remote signing of every transitive artifact are **UNVERIFIED**; review registry metadata, upstream maintenance and resolved integrity before any upgrade. No forced SDK downgrade was applied.

### C2. Razorpay / Play authority and replay

- `mobile-app/src/services/paymentService.ts:114` — `// Only the product id and the "use my referral balance" flag are sent - never`

- `mobile-app/src/services/paymentService.ts:148` — `assertVerifyUrl(body.verifyUrl);`

- `supabase/functions/verify-payment/index.ts:96` — `if (!(await verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature })))`

- `supabase/functions/verify-payment/index.ts:104` — `if (recover) orderQuery.eq("user_id", recoveryUser!.id);`

- `supabase/functions/verify-payment/index.ts:124` — `if (order.razorpay_order_id !== razorpayOrderId) {`

- `mobile-app/src/services/playBillingService.ts:274` — `if (purchase.obfuscatedAccountIdAndroid !== accountHash) return null;`

Source callback verification requires HMAC before order lookup; unsigned recovery requires a verified user and owner-filtered order lookup. Both feed shared settlement. The client sends product ID/useWallet, not an authoritative amount. Its callback fields are not entitlement grants. Purchases are read from the repository; no mobile direct purchase INSERT was found in the inspected call inventory. Paid status alone is not accepted by the success UI: it also reads entitlement records.

**UNVERIFIED — needs manual check:** deployed key mode/secret handling, provider amount/currency/capture validation, concurrent webhook/client/worker settlement, reversal and wallet math, Google token ownership/consumption, reporting deadlines, account/program eligibility, and existing order recovery on real providers. In an isolated target: create one order; tamper amount/product/wallet/buyer state and another user ID; replay callback/webhook twice and concurrently; test captured/pending/failed/refund/dispute transitions; assert one intended purchase and correct ledger facts, no negative/double discount, and no foreign-owner status disclosure. Use synthetic provider accounts and test transactions. Do not activate paid production sales.

Source proof of server-side price/capture/signature checks (deployed behavior remains UNVERIFIED):

```text
supabase/functions/_shared/createOrderHandler.ts:52: const useWallet = body.useWallet === true; // anything else = false; no amounts are ever read from the body
supabase/functions/_shared/createOrderHandler.ts:103: const { data: priced, error: pricedErr } = await supabaseAdmin.rpc("create_priced_order", {
supabase/functions/_shared/createOrderHandler.ts:123: const amountPaise = Math.round(Number(priced.amount) * 100);
supabase/functions/_shared/settle.ts:34: if (payment.currency !== "INR") return { ok: false, status: 400, reason: "currency mismatch" };
supabase/functions/_shared/settle.ts:38: if (rzpOrder.amount !== payment.amount || rzpOrder.currency !== "INR") {
supabase/functions/_shared/settle.ts:76: const expectedPaise = order ? Math.round(Number(order.amount) * 100) : null;
supabase/functions/_shared/settle.ts:116: const { error } = await supabaseAdmin.rpc("settle_razorpay_payment", {
supabase/functions/_shared/settle.ts:229: const originalPaise = Math.round(Number(order.amount) * 100);
supabase/functions/_shared/settle.ts:317: const amountPaise = Math.round(Number(order.amount) * 100);
supabase/functions/razorpay-webhook/index.ts:120: const rawBody = await request.text();
supabase/functions/razorpay-webhook/index.ts:122: if (!(await signatureIsValid(rawBody, signature))) {
```

### C3. Paid storage, cached content and offline access

- `supabase/functions/get-note-url/index.ts:13` — `const TTL_SECONDS = 120;`

- `supabase/functions/get-note-url/index.ts:52` — `if (allowed !== true) return jsonResponse({ error: "This note isn't available to you." }, 403);`

- `mobile-app/src/services/offlineNoteAccess.ts:8` — `if (getDownload(noteId)?.isFreePreview !== true) return false;`

- `mobile-app/src/services/offlineNoteVerification.ts:6` — `export const OFFLINE_NOTE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;`

- `mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx:168` — `trustAllCerts={false} enablePaging={false} horizontal={false} fitPolicy={0} spacing={8}`

- `mobile-app/src/utils/downloadManager.ts:230` — `if (!/^[a-zA-Z0-9_-]+$/.test(request.id)) throw new Error("Invalid download identifier");`

- `mobile-app/src/utils/downloadManager.ts:282` — `if (header !== "JVBERi0=") throw new Error("Downloaded file is not a PDF. Please retry.");`

Notes transfers obtain a fresh signed URL, validate identifier/destination, require successful complete HTTP/PDF bytes and bind callbacks to owner/epoch. Resume restarts notes rather than stitching a new URL to stale bytes. Licenses use SecureStore plus owner/note binding and a rollback/expiry check. These are source safeguards and local harness coverage; actual filesystem extraction/corruption/storage-full behavior remains manual. Online renderer cache=false does not prove native temporary bytes are immediately erased.

**UNVERIFIED — needs manual check:** query deployed notes bucket privacy and policies; anon/free/unrelated owner must fail direct object access; authorized signed URL must expire, unauthorized URL creation must fail; refund/expiry/block must deny fresh signing. Test an already-issued URL within its 120-second lifetime (bounded revocation lag). On device: legacy paid downloads must be removed/denied; paid offline must remain denied under this release; free preview works within seven days, fails after expiry/clock rollback, and recovers after one fresh online check. Inspect app-private cache after viewer close/logout/account deletion; test no account can reopen another account’s bytes. Do not enable plaintext paid offline as remediation.

### C4. Supabase table/RPC/Edge authorization

All directly accessed tables below have an ENABLE RLS statement in local migration source. These are source locations, not assertions about deployed state or the final effective policy after all migrations.

| Table | Source RLS statement | Expected boundary / hosted verification |
|---|---|---|
| `analytics_events` | `supabase/migrations/20260701000000_baseline_live_schema.sql:610: alter table public.analytics_events enable row level security;` | owner reads/writes or server-only mutation; UNVERIFIED live |
| `app_config` | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1625: alter table public.app_config enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |
| `chapters` | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1021: alter table public.chapters enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |
| `courses` | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:982: alter table public.courses enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |
| `notes` | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1030: alter table public.notes enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |
| `notifications` | `supabase/migrations/20260701000000_baseline_live_schema.sql:614: alter table public.notifications enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |
| `orders` | `supabase/migrations/20260924110000_critical2_orders_server_only.sql:50: alter table public.orders enable row level security;` | owner reads/writes or server-only mutation; UNVERIFIED live |
| `products` | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1064: alter table public.products enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |
| `profiles` | `supabase/migrations/20260701000000_baseline_live_schema.sql:619: alter table public.profiles enable row level security;` | owner reads/writes or server-only mutation; UNVERIFIED live |
| `purchases` | `supabase/migrations/20260924100000_critical1_lock_settlement_functions.sql:88: alter table public.purchases enable row level security;` | owner reads/writes or server-only mutation; UNVERIFIED live |
| `push_tokens` | `supabase/migrations/20260701000000_baseline_live_schema.sql:621: alter table public.push_tokens enable row level security;` | owner reads/writes or server-only mutation; UNVERIFIED live |
| `quiz_scores` | `supabase/migrations/20260701000000_baseline_live_schema.sql:622: alter table public.quiz_scores enable row level security;` | owner reads/writes or server-only mutation; UNVERIFIED live |
| `quiz_tests` | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1048: alter table public.quiz_tests enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |
| `referral_settings` | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1262: alter table public.referral_settings enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |
| `subjects` | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1012: alter table public.subjects enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |
| `verified_quiz_attempts` | `supabase/migrations/20261018100000_verified_quiz_attempts.sql:39: alter table public.verified_quiz_attempts enable row level security;` | owner reads/writes or server-only mutation; UNVERIFIED live |
| `videos` | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1039: alter table public.videos enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |
| `years` | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:994: alter table public.years enable row level security;` | published catalog/config/feed reads; privileged writes; UNVERIFIED live |

Related server-only relations (wallet/referral ledger, identity-retention records, settings and order queues) are dependencies of mobile RPCs, not extra directly writable client APIs. An RLS-enabled table can still have unsafe grants/policies. Inspect effective grants and function ownership/search_path, SECURITY DEFINER ACLs, view security_invoker, ownership USING/WITH CHECK, and storage policies in the target. Test anon, owner, second authenticated user and admin separately. Confirm am_i_admin cannot be supplied or modified by client metadata. Do not infer authorization from hidden routes or client `.eq(user_id)` filters.

<details><summary>Local Edge gateway flags</summary>


```text
supabase/config.toml:19: [functions.create-order]
supabase/config.toml:20: verify_jwt = true
supabase/config.toml:23: [functions.create-order-play-choice]
supabase/config.toml:24: verify_jwt = true
supabase/config.toml:27: [functions.create-order-nonplay-test]
supabase/config.toml:28: verify_jwt = true
supabase/config.toml:30: [functions.verify-payment-nonplay-test]
supabase/config.toml:31: verify_jwt = true
supabase/config.toml:33: [functions.nonplay-test-catalog]
supabase/config.toml:34: verify_jwt = true
supabase/config.toml:36: [functions.get-note-url-nonplay-test]
supabase/config.toml:37: verify_jwt = true
supabase/config.toml:40: [functions.razorpay-webhook-nonplay-test]
supabase/config.toml:41: verify_jwt = false
supabase/config.toml:43: [functions.create-play-order]
supabase/config.toml:44: verify_jwt = true
supabase/config.toml:46: [functions.verify-play-purchase]
supabase/config.toml:47: verify_jwt = true
supabase/config.toml:50: [functions.sync-play-catalog]
supabase/config.toml:51: verify_jwt = false
supabase/config.toml:54: [functions.diagnose-play-service-account]
supabase/config.toml:55: verify_jwt = false
supabase/config.toml:58: [functions.diagnose-play-pricing]
supabase/config.toml:59: verify_jwt = true
supabase/config.toml:63: [functions.diagnose-play-matrix]
supabase/config.toml:64: verify_jwt = false
supabase/config.toml:66: [functions.attach-external-token]
supabase/config.toml:67: verify_jwt = true
supabase/config.toml:70: [functions.report-external-transaction]
supabase/config.toml:71: verify_jwt = false
supabase/config.toml:75: [functions.play-payment-worker]
supabase/config.toml:76: verify_jwt = false
supabase/config.toml:78: [functions.get-note-url]
supabase/config.toml:79: verify_jwt = true
supabase/config.toml:82: [functions.upload-note-pdf]
supabase/config.toml:83: verify_jwt = false
supabase/config.toml:85: [functions.get-video-url]
supabase/config.toml:86: verify_jwt = true
supabase/config.toml:90: [functions.verify-payment]
supabase/config.toml:91: verify_jwt = false
supabase/config.toml:95: [functions.razorpay-webhook]
supabase/config.toml:96: verify_jwt = false
supabase/config.toml:102: [functions.send-push-notification]
supabase/config.toml:103: verify_jwt = false
supabase/config.toml:109: [functions.delete-account]
supabase/config.toml:110: verify_jwt = true
supabase/config.toml:117: [functions.login-with-mobile]
supabase/config.toml:118: verify_jwt = false
supabase/config.toml:120: [functions.request-password-reset-by-mobile]
supabase/config.toml:121: verify_jwt = false
```

</details>


`verify-payment` and `razorpay-webhook` intentionally allow JWT-free signed provider callbacks; they require in-function HMAC checks, and unsigned payment recovery requires Auth.getUser. Login/reset are public but must rate-limit and use generic answers. delete-account/get-note-url are gateway-protected and have their own verified-user checks. Verify the deployed gateway behavior with the project’s actual signing/public-key setup; config comments are not runtime evidence. No SQL/RLS/gateway setting was changed.

### C5. Authentication, lockout and logout

- `mobile-app/src/features/auth/authService.ts:107` — `// shouldCreateUser: false - OTP login is only for people who already have`

- `mobile-app/src/config/supabase.ts:33` — `storage: secureSessionStorage,`

- `mobile-app/src/config/supabase.ts:56` — `supabase.auth.startAutoRefresh();`

- `mobile-app/src/services/authState.ts:110` — `const { error } = await supabase.auth.signOut();`

- `mobile-app/src/services/authState.ts:123` — `await cleanupOfflineStorage();`

- `mobile-app/src/config/database.ts:159` — `DELETE FROM sync_queue;`

Configured recovery tests pass locally, including MFA assurance checks, duplicate submission, retry and Supabase SDK fixtures. Native sessions use SecureStore-held per-generation AES keys and encrypted AsyncStorage; web fallback is plaintext dev storage. Auth refresh is managed on AppState transitions. Client lockout is explicitly device-local. Session mutation/ciphertext tampering was reproduced in MV-A06; this did not bypass server JWT verification.

MV-A01 proof chain: performSignOut → cleanupOfflineStorage → purgeOfflineContent → clearAllDownloads; that function deletes downloads, while resetDatabase (which deletes other SQLite tables) is only a candidate unused export. Course-change cleanup clears some device history, but an auth-user change only resets in-memory course state; it does not call that course-change cleanup. Account deletion invokes performSignOut after the server reports success, so its local residue has the same boundary.

**UNVERIFIED — needs manual check:** server-wide lockout/OTP/reset quotas and password settings, refresh after suspension, session revocation on password change/deletion, backup/restore and full post-logout cleanup. Reproduce MV-A01 with account A search/quiz/streak data, logout, then B sign-in without clearing app data; inspect only this test device’s private store and check visible history. Verify old A JWT on sensitive operations after deletion; deleting an auth user is not assumed to invalidate every already-issued JWT instantly.

### C6. Links, WebViews and injection

- `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx:143` — `event.nativeEvent.url !== "about:blank") return;`

- `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx:153` — `message.callbackNonce !== callbackNonce) return;`

- `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx:485` — `originWhitelist={CHECKOUT_ORIGIN_WHITELIST}`

- `mobile-app/src/features/auth/deepLinkStore.ts:8` — `const allowedSchemes = ["medveda", "medveda-staging", "medveda-razorpay-test"];`

- `mobile-app/src/utils/downloadManager.ts:64` — `function ownsFile(uri: unknown, contentType: DownloadItem["contentType"]): uri is string {`

Checkout builds local escaped HTML, binds callback messages to a random nonce/order and sends them to server verification. Checkout navigation uses allowed web/app-link helpers; inspect their exact host/scheme list during provider qualification. SQLite user values use positional parameters in inspected writes; fixed SQL schema strings are not user concatenation. Download-path checks reject traversal for notes; arbitrary URL inputs are not assumed safe merely because HTTPS is used. Recovery tokens are retained only in the recovery-link store and cleared by the controller; raw tokens must not appear in logs.

**UNVERIFIED — needs manual check:** custom-scheme hijack on another installed app, old ayurpulse links, hostile incoming routes/intents, real UPI intents/browser fallback and WebView renderer death. Test malformed params, wrong origin, wrong nonce and foreign order callbacks without starting a real payment. Confirm server HMAC rejects tampered callbacks even if JS bridge checks are bypassed.

### C7. Privacy, diagnostics, account deletion and retention

- `mobile-app/src/config/sentry.ts:37` — `sendDefaultPii: false,`

- `mobile-app/src/config/sentry.ts:39` — `tracesSampleRate: 0,`

- `mobile-app/src/config/sentry.ts:54` — `delete event.request;`

- `mobile-app/src/utils/logger.ts:14` — `if (__DEV__) {`

- `mobile-app/src/services/usersService.ts:108` — `if (data?.ok !== true &#124;&#124; (data.status !== "deleted" && data.status !== "already_deleted")) {`

- `supabase/functions/delete-account/index.ts:8` — `// - public.erase_user_data() removes/anonymises all data in one transaction`

- `supabase/functions/delete-account/index.ts:73` — `const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);`

No raw runtime console logging outside the development logger/video-diagnostics guard was established by the scoped scan; test-script logging is retained. Sentry removes user/request/extra fields, console/navigation breadcrumbs and common identifier strings. This is risk reduction, not proof all arbitrary exception/context values are anonymous. Analytics sends user-linked events without an in-service opt-out gate (MV-A10). The source privacy inventory lists these data classes; no Play Console Data Safety form was inspected.

**UNVERIFIED — needs manual check:** submit synthetic errors/events and inspect outgoing payloads for tokens, signed URLs, email/mobile/search strings; reconcile actual collection/sharing/retention and SDK behavior with the owner’s submitted Data Safety form. Run account deletion in isolation and verify database/Auth/storage/provider cleanup, retained order linkage and local stores. Inspect aggregate 180-day purge job outcomes without retrieving real identity hashes. No real account was deleted in this audit.

### C8. Native and release hygiene / Play compliance

- `mobile-app/app.json:23` — `"allowBackup": false,`

- `mobile-app/app.config.js:97` — `usesCleartextTraffic: false,`

- `mobile-app/app.config.js:98` — `enableMinifyInReleaseBuilds: true,`

- `mobile-app/app.config.js:67` — `runtimeVersion: razorpayLiveTesting ? &#96;${next.version}-razorpay-live-testing&#96; : razorpayTest ? &#96;${next.version}-razorpay-internal-test&#96; : playValidation ? &#96;${next.version}-play-alpha-validation&#96; : &#96;${next.version}-${paymentProvider}-notes-choice-v1&#96;,`

- `mobile-app/plugins/withOptionalSentry.cjs:5` — `if (!process.env.SENTRY_AUTH_TOKEN) return config;`

The source requests INTERNET/POST_NOTIFICATIONS and blocks listed legacy storage/overlay permissions. Generated native manifests can add permissions/components; source config alone does not prove the merged result. R8/resource shrinking and source-map upload are configured, but upload requires builder variables. Native target SDK, debug flags, component export exposure, signing lineage, 64-bit ABIs, binary exclusion of tooling advisories and compressed download size require inspection of the exact release AAB.

Public URL checks returned HTTP 200 for [privacy](https://www.medveda.in/privacy-policy), [account deletion](https://www.medveda.in/delete-account), [password reset](https://www.medveda.in/reset-password), and [verification](https://www.medveda.in/account-verified). HTTP reachability does not prove a deletion request or browser-to-native handoff succeeds. Official policy references were reachable: [Google Play Payments](https://support.google.com/googleplay/android-developer/answer/9858738) and [alternative billing in India](https://support.google.com/googleplay/android-developer/answer/13327111). Eligibility and account enrollment remain owner-specific manual checks; this audit makes no compliance approval. The Supabase changelog returned HTTP 200; Expo v57 documentation access returned HTTP 403, so no SDK behavior change was implemented from unverified documentation.

<details><summary>Public URL command results</summary>


```json
[
  {
    "url": "https://supabase.com/changelog.md",
    "status": 200,
    "final": "https://supabase.com/changelog.md",
    "bytes": 104644
  },
  {
    "url": "https://docs.expo.dev/versions/v57.0.0/",
    "error": "HTTP Error 403: Forbidden"
  },
  {
    "url": "https://support.google.com/googleplay/android-developer/answer/9858738",
    "status": 200,
    "final": "https://support.google.com/googleplay/android-developer/answer/9858738",
    "bytes": 1646184
  },
  {
    "url": "https://support.google.com/googleplay/android-developer/answer/13327111",
    "status": 200,
    "final": "https://support.google.com/googleplay/android-developer/answer/13327111",
    "bytes": 1678274
  },
  {
    "url": "https://www.medveda.in/privacy-policy",
    "status": 200,
    "final": "https://www.medveda.in/privacy-policy",
    "bytes": 18202
  },
  {
    "url": "https://www.medveda.in/delete-account",
    "status": 200,
    "final": "https://www.medveda.in/delete-account",
    "bytes": 8124
  },
  {
    "url": "https://www.medveda.in/reset-password",
    "status": 200,
    "final": "https://www.medveda.in/reset-password",
    "bytes": 11336
  },
  {
    "url": "https://www.medveda.in/account-verified",
    "status": 200,
    "final": "https://www.medveda.in/account-verified",
    "bytes": 8942
  }
]
```

</details>


## 6. Bugs and reproduction evidence

| Finding | Reproduction / code proof | Expected result after a future fix |
|---|---|---|
| MV-A01 | A completes an offline quiz, searches, visits a chapter; logout/delete account; inspect SQLite and medveda history keys. clearAllDownloads only DELETEs downloads; local quiz tables lack an owner column and getLocalQuizAttempts filters only quiz ID. | Defined account-scoped cleanup, no foreign-account history, explicit treatment of pending work. |
| MV-A05 | Open paid Notes and tap offline download with payment gates unchanged. secureNotesService rejects paid offline and the viewer only admits free-preview downloads. | Either explicitly approved online-only product contract or a separately qualified encrypted seven-day paid-offline implementation. |
| MV-A06 | Load actual secureSessionStorage with in-memory AsyncStorage/SecureStore, save a synthetic session, XOR one ciphertext byte at the known name offset, then call actual getItem. Probe output: Alice → Mlice accepted. | Authenticated envelope rejects tampering before parsing; no server JWT bypass inferred. |
| MV-A07 | Send ayurpulse://reset-password#type=recovery… to the installed app/bridge; compare native scheme and deepLinkStore allowlist. | Intentional scheme compatibility documented and device-tested; invalid URLs do not mutate auth. |
| MV-A14 | Load actual streakTracker with fixed instant 2026-11-15T19:00:00Z, Android device timezone Asia/Kolkata, then recordActivityToday. Stored key is 2026-11-15 although local date is Nov 16. | Streak increments once per selected calendar-day policy. |
| MV-A13 / MV-A17 | Seed isolated large feed/outbox and profile query volume/heap. Code reads all rows before local filtering/batching. | Bounded memory/transfer and stable pagination/retry fairness. |

<details><summary>Critical logout data-path source proof</summary>


```text
mobile-app/src/services/authState.ts:53:     // Loaded lazily: downloadManager pulls in course state, which imports this module.
mobile-app/src/services/authState.ts:54:     const { clearAllDownloads } = await import("../utils/downloadManager");
mobile-app/src/services/authState.ts:55:     await clearAllDownloads();
mobile-app/src/services/authState.ts:56:     return true;
mobile-app/src/services/authState.ts:57:   } catch (err) {
mobile-app/src/services/authState.ts:58:     logDebug("purgeOfflineContent failed:", err);
mobile-app/src/services/authState.ts:59:     return false;
mobile-app/src/services/authState.ts:60:   }
mobile-app/src/services/authState.ts:61: }
mobile-app/src/services/authState.ts:62: 
mobile-app/src/services/authState.ts:63: function claimOfflineStorage(user: User): Promise<void> {
mobile-app/src/services/authState.ts:64:   const epoch = authEpoch;
mobile-app/src/services/authState.ts:65:   const current = () => epoch === authEpoch && currentUser?.id === user.id;
mobile-app/src/services/authState.ts:66:   return serializeOwnership(async () => {
mobile-app/src/services/authState.ts:67:     try {
mobile-app/src/services/authState.ts:68:       if (!current()) return;
mobile-app/src/services/authState.ts:69:       const owner = await AsyncStorage.getItem(OFFLINE_OWNER_KEY);
mobile-app/src/services/authState.ts:70:       if (!current()) return;
mobile-app/src/services/authState.ts:71:       if (owner && owner !== user.id) {
mobile-app/src/services/authState.ts:72:         if (!current() || !await purgeOfflineContent() || !current()) return;
mobile-app/src/services/authState.ts:73:       }
mobile-app/src/services/authState.ts:74:       if (!current()) return;
mobile-app/src/services/authState.ts:75:       if (owner !== user.id) await AsyncStorage.setItem(OFFLINE_OWNER_KEY, user.id);
mobile-app/src/services/authState.ts:76:       if (current()) {
mobile-app/src/services/authState.ts:77:         const { cleanupPaidNoteDownloads } = await import("../utils/downloadManager");
mobile-app/src/services/authState.ts:78:         await cleanupPaidNoteDownloads(user.id, epoch);
mobile-app/src/services/authState.ts:79:       }
mobile-app/src/services/authState.ts:80:       if (current()) offlineReadyEpoch = epoch;
mobile-app/src/services/authState.ts:81:     } catch {
mobile-app/src/services/authState.ts:82:       // Admission stays closed until a later successful claim.
mobile-app/src/services/authState.ts:83:     }
mobile-app/src/services/authState.ts:84:   });
mobile-app/src/services/authState.ts:85: }
mobile-app/src/services/authState.ts:86: function cleanupOfflineStorage(): Promise<void> {
mobile-app/src/services/authState.ts:87:   const epoch = authEpoch;
mobile-app/src/services/authState.ts:88:   return serializeOwnership(async () => {
mobile-app/src/services/authState.ts:89:     const current = () => epoch === authEpoch && currentUser === null;
mobile-app/src/services/authState.ts:90:     if (!current() || !await purgeOfflineContent() || !current()) return;
mobile-app/src/services/authState.ts:91:     await AsyncStorage.removeItem(OFFLINE_OWNER_KEY).catch(() => {});
mobile-app/src/services/authState.ts:92:   });
mobile-app/src/services/authState.ts:93: }
mobile-app/src/services/authState.ts:94: 
mobile-app/src/services/authState.ts:95: /**
mobile-app/src/services/authState.ts:96:  * The one way the app signs a student out: stops pushes to this device for them, ends the
mobile-app/src/services/authState.ts:97:  * session, then deletes the offline copies of paid content.
mobile-app/src/services/authState.ts:98:  */
mobile-app/src/services/authState.ts:99: export async function performSignOut(): Promise<void> {
mobile-app/src/services/authState.ts:100:   const initiatingUserId = currentUser?.id;
mobile-app/src/services/authState.ts:101:   const initiatingEpoch = authEpoch;
mobile-app/src/services/authState.ts:102:   let logoutHandle: Awaited<ReturnType<typeof unregisterCurrentDeviceToken>> | undefined;
mobile-app/src/services/authState.ts:103:   try {
mobile-app/src/services/authState.ts:104:     logoutHandle = await unregisterCurrentDeviceToken(); // needs the session, so before signOut
mobile-app/src/services/authState.ts:105:   } catch {

mobile-app/src/utils/downloadManager.ts:453:     localUri: null,
mobile-app/src/utils/downloadManager.ts:454:   } as DownloadItem); // signal removal; UI filters by re-querying getAllDownloads()
mobile-app/src/utils/downloadManager.ts:455: }
mobile-app/src/utils/downloadManager.ts:456: 
mobile-app/src/utils/downloadManager.ts:457: export async function clearAllDownloads(): Promise<void> {
mobile-app/src/utils/downloadManager.ts:458:   if (!OFFLINE_DB_SUPPORTED) return;
mobile-app/src/utils/downloadManager.ts:459:   if (clearing) return clearing;
mobile-app/src/utils/downloadManager.ts:460:   storageGeneration++;
mobile-app/src/utils/downloadManager.ts:461:   operations.clear();
mobile-app/src/utils/downloadManager.ts:462:   pausedOperations.clear();
mobile-app/src/utils/downloadManager.ts:463:   const transfers = [...activeResumables.values()];
mobile-app/src/utils/downloadManager.ts:464:   activeResumables.clear();
mobile-app/src/utils/downloadManager.ts:465:   clearing = (async () => {
mobile-app/src/utils/downloadManager.ts:466:     await Promise.allSettled(transfers.map((transfer) => transfer.cancelAsync()));
mobile-app/src/utils/downloadManager.ts:467:     await clearAllNoteVerifications();
mobile-app/src/utils/downloadManager.ts:468:     await Promise.allSettled([...controlOperations.values()]);
mobile-app/src/utils/downloadManager.ts:469:     const keys = await AsyncStorage.getAllKeys();
mobile-app/src/utils/downloadManager.ts:470:     await FileSystem.deleteAsync(ROOT_DIR, { idempotent: true });
mobile-app/src/utils/downloadManager.ts:471:     await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(RESUME_STATE_PREFIX)));
mobile-app/src/utils/downloadManager.ts:472:     getDb().runSync(`DELETE FROM downloads;`);
mobile-app/src/utils/downloadManager.ts:473:   })();
mobile-app/src/utils/downloadManager.ts:474:   try { await clearing; } finally { clearing = null; }
mobile-app/src/utils/downloadManager.ts:475: }
mobile-app/src/utils/downloadManager.ts:476: 
mobile-app/src/utils/downloadManager.ts:477: /**

mobile-app/src/services/quizAttempts.ts:64: export function getLocalQuizAttempts(quizId?: string) {
mobile-app/src/services/quizAttempts.ts:65:   if (!OFFLINE_DB_SUPPORTED) return [];
mobile-app/src/services/quizAttempts.ts:66:   const db = getDb();
mobile-app/src/services/quizAttempts.ts:67:   const rows = quizId
mobile-app/src/services/quizAttempts.ts:68:     ? db.getAllSync(
mobile-app/src/services/quizAttempts.ts:69:         `SELECT * FROM quiz_attempts_local WHERE quiz_id = ? ORDER BY taken_at DESC;`,
mobile-app/src/services/quizAttempts.ts:70:         [quizId]
mobile-app/src/services/quizAttempts.ts:71:       )
mobile-app/src/services/quizAttempts.ts:72:     : db.getAllSync(`SELECT * FROM quiz_attempts_local ORDER BY taken_at DESC;`);
mobile-app/src/services/quizAttempts.ts:73: 
mobile-app/src/services/quizAttempts.ts:74:   return rows.map((row: any) => {
mobile-app/src/services/quizAttempts.ts:75:     let answers: (number | null)[] = [];
mobile-app/src/services/quizAttempts.ts:76:     try {
mobile-app/src/services/quizAttempts.ts:77:       answers = JSON.parse(row.answers_json) as (number | null)[];
mobile-app/src/services/quizAttempts.ts:78:     } catch {

mobile-app/src/utils/recentSearches.ts:7: // show up on a second device.
mobile-app/src/utils/recentSearches.ts:8: 
mobile-app/src/utils/recentSearches.ts:9: const STORAGE_KEY = "medveda:recentSearches";
mobile-app/src/utils/recentSearches.ts:10: const MAX_ENTRIES = 12;
mobile-app/src/utils/recentSearches.ts:11: 
mobile-app/src/utils/recentSearches.ts:12: export interface RecentSearchEntry {
mobile-app/src/utils/recentSearches.ts:13:   query: string;
mobile-app/src/utils/recentSearches.ts:14:   searchedAt: number; // epoch ms
mobile-app/src/utils/recentSearches.ts:15: }
mobile-app/src/utils/recentSearches.ts:16: 
mobile-app/src/utils/recentSearches.ts:17: export async function getRecentSearches(): Promise<RecentSearchEntry[]> {
mobile-app/src/utils/recentSearches.ts:18:   try {
mobile-app/src/utils/recentSearches.ts:19:     const raw = await AsyncStorage.getItem(STORAGE_KEY);
mobile-app/src/utils/recentSearches.ts:20:     if (!raw) return [];
mobile-app/src/utils/recentSearches.ts:21:     const parsed = JSON.parse(raw);
mobile-app/src/utils/recentSearches.ts:22:     return Array.isArray(parsed) ? parsed : [];
mobile-app/src/utils/recentSearches.ts:23:   } catch (error) {
mobile-app/src/utils/recentSearches.ts:24:     logDebug("getRecentSearches failed:", error);
mobile-app/src/utils/recentSearches.ts:25:     return [];
mobile-app/src/utils/recentSearches.ts:26:   }
```

</details>


Reviewed risk areas without a new confirmed defect: owner/epoch guards in auth/download/payment recovery; quiz answer submission through server-scored RPC; PDF retry obtains a fresh entitlement URL; notification response subscriptions remove listeners; sync engine stops NetInfo/timer; video normalization supports canonical watch/embed/shorts/live/playlist forms and HTTPS fallbacks. Existing host suites cover many of these. No device success is inferred. Memory leaks, low-memory UPI app-switch behavior, native renderer lifecycle, full-disk migration recovery and real notification delivery remain checklist items.

## 7. Dead-code report

### 7a. Deleted

**None.** No candidate passed the complete Phase 3 reference/framework/runtime/peer/plugin proof plus passing per-batch export. No cleanup batch or cleanup commit exists. Nothing was removed on suspicion.

### 7b. Kept with reason

| Candidate group | Decision / evidence |
|---|---|
| All registered screens and App gates | KEEP — actual native-stack registrations/direct App imports. Payment-disabled routes remain intentional recovery/future distribution features. |
| PdfViewerScreen.native.tsx / .web.tsx | KEEP — Metro platform resolution; Knip unresolved import is a static-tool false positive. |
| src/types/index.ts | KEEP — intentional export barrel; Phase 3 explicitly protects re-export entry files. |
| modules/medveda-offline-vault | KEEP — local native module/autolinking and pending encryption qualification; absence of JS import alone is insufficient. |
| plugins/*, index.ts, app.config.js, metro/babel config, release-rules.pro, .d.ts | KEEP — framework/build/side-effect/type-entry candidates need platform-aware reference proof. |
| scripts/* and __tests__/* | KEEP — independently invokable test/release tools; host regression runs prove many are active despite Knip listing them unused. |
| Assets and duplicate-byte images | KEEP — app.json icon/adaptive/splash references plus assetBundlePatterns **/*; dynamic/native packaging and intended image roles must be checked. |
| Firebase/FCM configuration helpers | KEEP — real push build contract; obsolete backend comments are a separate branding/docs issue. |

### 7c. Needs manual confirmation / tool candidate registers

Exact invocations: `npx --yes knip --no-progress`; `npx --yes ts-prune`; `npx --yes depcheck --json`; `npx --yes madge --circular --extensions ts,tsx src` (temporary npm cache used for downloads). Knip candidates are incomplete because config evaluation errors; ts-prune usage annotations and dynamic/platform imports require manual review. ESLint mobile no-unused-vars/no-unreachable rules passed. No unreachable-after-return/throw diagnostic was produced by that rule set.

<details><summary>Knip full candidate register (not deletion permission)</summary>


```text
ERROR: Error loading app.config.js (Firebase Android client configuration must contain exactly one client for undefined.)
ERROR: Please fix or visit https://knip.dev/reference/known-issues
Unused files (113)
__tests__/audit-harness.cjs                            
__tests__/MOB-01.cjs                                   
__tests__/MOB-03.cjs                                   
__tests__/MOB-04-service.cjs                           
__tests__/MOB-04.cjs                                   
__tests__/MOB-05.cjs                                   
__tests__/MOB-06.cjs                                   
__tests__/MOB-07.cjs                                   
__tests__/MOB-08.cjs                                   
__tests__/MOB-09.cjs                                   
__tests__/MOB-10.cjs                                   
__tests__/MOB-11.cjs                                   
__tests__/MOB-13.cjs                                   
__tests__/MOB-14-backoff.cjs                           
__tests__/MOB-14.cjs                                   
__tests__/MOB-15.cjs                                   
__tests__/MOB-16.cjs                                   
__tests__/MOB-17.cjs                                   
__tests__/MOB-18.cjs                                   
__tests__/MOB-19.cjs                                   
__tests__/MOB-20.cjs                                   
__tests__/payment-harness.cjs                          
__tests__/reset-harness.cjs                            
modules/medveda-offline-vault/index.ts                 
modules/medveda-offline-vault/tests/reference-codec.cjs
plugins/withAndroidRelease.js                          
plugins/withOptionalSentry.cjs                         
scripts/accessibility-selftest.cjs                     
scripts/android-release-selftest.cjs                   
scripts/android-vault-preflight-selftest.cjs           
scripts/android-vault-preflight.cjs                    
scripts/audit-firebase-profile-selftest.cjs            
scripts/audit-icon-controls-selftest.cjs               
scripts/audit-navigation-selftest.cjs                  
scripts/audit-reminder-service-selftest.cjs            
scripts/auth-recovery-selftest.cjs                     
scripts/auth-state-race-selftest.cjs                   
scripts/checkout-html-selftest.mjs                     
scripts/checkout-security-selftest.cjs                 
scripts/closed-testing-selftest.cjs                    
scripts/course-state-race-selftest.cjs                 
scripts/course-year-confirmation-selftest.cjs          
scripts/course-year-picker-race-selftest.cjs           
scripts/course-year-selection-selftest.cjs             
scripts/deep-link-selftest.cjs                         
scripts/download-actions-selftest.cjs                  
scripts/firebase-config-selftest.cjs                   
scripts/list-states-selftest.cjs                       
scripts/load-resource-selftest.cjs                     
scripts/login-network-selftest.cjs                     
scripts/login-submit-selftest.cjs                      
scripts/mv004-recovery-selftest.cjs                    
scripts/mv007-billing-boundary-selftest.cjs            
scripts/mv008-ownership-selftest.cjs                   
scripts/mv009-store-selftest.cjs                       
scripts/mv010-options-selftest.cjs                     
scripts/mv011-accessibility-selftest.cjs               
scripts/mv012-history-selftest.cjs                     
scripts/navigation-lazy-selftest.cjs                   
scripts/nonplay-test-isolation-selftest.cjs            
scripts/notes-billing-choice-selftest.cjs              
scripts/notes-entitlement-selftest.cjs                 
scripts/notes-open-selftest.cjs                        
scripts/notification-account-hook-selftest.cjs         
scripts/notification-inflight-selftest.cjs             
scripts/notification-preferences-selftest.cjs          
scripts/notification-reads-selftest.cjs                
scripts/notification-routing-selftest.cjs              
scripts/offline-download-selftest.cjs                  
scripts/offline-license-storage-selftest.cjs           
scripts/offline-owner-selftest.cjs                     
scripts/p2-registration-selftest.cjs                   
scripts/payment-poll-selftest.cjs                      
scripts/payment-provider-selftest.cjs                  
scripts/payment-request-selftest.cjs                   
scripts/payment-routing-selftest.cjs                   
scripts/payment-success-owner-selftest.cjs             
scripts/payment-summary-selftest.cjs                   
scripts/payment-verdict-selftest.cjs                   
scripts/pdf-lifecycle-selftest.cjs                     
scripts/pdf-remote-retry-selftest.cjs                  
scripts/play-catalog-contract-selftest.cjs             
scripts/profile-save-selftest.cjs                      
scripts/purchases-selftest.cjs                         
scripts/purchases-unavailable-ui-selftest.cjs          
scripts/push-lifecycle-selftest.cjs                    
scripts/quiz-editing-selftest.cjs                      
scripts/quiz-hooks-selftest.cjs                        
scripts/quiz-input-selftest.cjs                        
scripts/razorpay-internal-test-selftest.cjs            
scripts/razorpay-live-testing-selftest.cjs             
scripts/readiness-selftest.cjs                         
scripts/release-payments-disabled-selftest.cjs         
scripts/remaining-audit-selftest.cjs                   
scripts/route-validation-selftest.cjs                  
scripts/same-project-build-selftest.cjs                
scripts/search-cache-selftest.cjs                      
scripts/search-lazy-hook-selftest.cjs                  
scripts/search-pagination-selftest.cjs                 
scripts/sentry-config-selftest.cjs                     
scripts/staging-build-selftest.cjs                     
scripts/startup-availability-selftest.cjs              
scripts/startup-web-smoke.cjs                          
scripts/sync-concurrency-selftest.cjs                  
scripts/ui-harness.cjs                                 
scripts/verify-signature-selftest.js                   
scripts/video-data-selftest.cjs                        
scripts/video-link-selftest.cjs                        
scripts/video-tap-selftest.cjs                         
scripts/wallet-expired-ui-selftest.cjs                 
scripts/wallet-terms-selftest.cjs                      
scripts/years-inflight-selftest.cjs                    
src/types/index.ts                                     
Unused dependencies (1)
expo-build-properties  package.json:28:6
Unlisted dependencies (1)
@expo/config-plugins  plugins/withAndroidQueries.js:1:9
Unresolved imports (1)
../screens/pdf/PdfViewerScreen  src/navigation/AppNavigator.tsx:58:34
Unused exports (46)
resetDatabase                                      function  src/config/database.ts:155:17               
PASSWORD_RESET_REDIRECT_URL                                  src/features/auth/authService.ts:25:14      
EMAIL_VERIFY_REDIRECT_URL                                    src/features/auth/authService.ts:28:14      
sendEmailOtp                                       function  src/features/auth/authService.ts:114:23     
verifyEmailOtp                                     function  src/features/auth/authService.ts:121:23     
BUY_OPTIONS_TIMEOUT_MS                                       src/hooks/useBuyOptions.ts:6:14             
buyOptionsErrorMessage                             function  src/hooks/useBuyOptions.ts:10:17            
PURCHASE_TIMEOUT_MS                                          src/hooks/usePurchaseResource.ts:7:14       
STORE_TIMEOUT_MS                                             src/hooks/useStoreCatalog.ts:6:14           
storeErrorMessage                                  function  src/hooks/useStoreCatalog.ts:14:17          
getOrderById                                       function  src/repositories/ordersRepository.ts:5:23   
getAllActiveQuizTestsLite                          function  src/repositories/quizRepository.ts:23:23    
SEARCH_PAGE_SIZE                                             src/repositories/searchPagination.ts:1:14   
getAllActiveVideos                                 function  src/repositories/videosRepository.ts:30:23  
logEvent                                           function  src/services/analyticsService.ts:27:23      
DEFAULT_STORE_URL                                            src/services/appConfigService.ts:13:14      
onBlockedSignOut                                   function  src/services/authState.ts:156:17            
isBroadcastNotification                            function  src/services/notificationRouting.ts:15:17   
notificationTarget                                 function  src/services/notificationRouting.ts:34:17   
OFFLINE_NOTE_GRACE_MS                                        src/services/offlineNoteVerification.ts:6:14
OFFLINE_NOTE_VERIFICATION_PREFIX                             src/services/offlineNoteVerification.ts:8:14
obfuscatedPlayId                                   function  src/services/playBillingService.ts:104:17   
verifyPlayPurchase                                 function  src/services/playBillingService.ts:165:23   
ensurePlayBilling                                  function  src/services/playBillingService.ts:355:23   
fetchProductsByChapter                                       src/services/productsService.ts:12:27       
fetchBundleProducts                                          src/services/productsService.ts:15:24       
fetchAllProducts                                             src/services/productsService.ts:16:27       
fetchMyReferrals                                             src/services/referralsService.ts:27:21      
REFERRAL_CODE_PATTERN                                        src/services/referralsService.ts:57:14      
normalizeReferralCode                              function  src/services/referralsService.ts:59:17      
isValidReferralCodeFormat                          function  src/services/referralsService.ts:63:17      
applyReferralCode                                  function  src/services/referralsService.ts:67:23      
ONLINE_ONLY_MESSAGE                                          src/services/secureNotesService.ts:11:14    
queueForSync                                       function  src/services/syncEngine.ts:55:17            
getPendingSyncCount                                function  src/services/syncEngine.ts:211:17           
AccessibilityInfo                                            src/theme/motion.ts:56:10                   
LINE_HEIGHT                                                  src/theme/typography.ts:32:14               
markStaleIfVersionChanged         downloadManager  function  src/utils/downloadManager.ts:503:17         
isDownloaded                      downloadManager  function  src/utils/downloadManager.ts:627:17         
writeCache                                         function  src/utils/localCache.ts:25:23               
getStreak                                          function  src/utils/streakTracker.ts:65:23            
normalize                                          function  src/utils/textMatch.ts:16:17                
normalizeVideoUrl                                            src/utils/videoLink.ts:7:10                 
openVideoLink                                                src/utils/videoLink.ts:75:14                
normalizeVideoUrl                                  function  src/utils/videoUrl.ts:63:17                 
REFERRAL_CODE_PATTERN                                        src/validation/registerSchema.ts:14:14      
Unused exported types (15)
AnalyticsEventName      type       src/services/analyticsService.ts:7:13   
AnalyticsEvent          interface  src/services/analyticsService.ts:18:18  
PlayBillingEvent        type       src/services/playBillingService.ts:74:13
QuizTestQuestion        type       src/services/quizService.ts:3:25        
ReferralHistoryItem     type       src/services/referralsService.ts:17:3   
UserRole                type       src/services/usersService.ts:6:28       
DownloadContentType     type       src/types/offline.ts:3:13               
DownloadStatus          type       src/types/offline.ts:5:13               
QuizTestQuestion        interface  src/types/quiz.ts:5:18                  
ReferralRewardType      type       src/types/referral.ts:3:13              
ReferralQualifyOn       type       src/types/referral.ts:4:13              
ReferralStatus          type       src/types/referral.ts:27:13             
UserRole                type       src/types/user.ts:16:13                 
PasswordStrengthLevel   type       src/utils/passwordStrength.ts:9:13      
PasswordStrengthChecks  interface  src/utils/passwordStrength.ts:11:18     
Duplicate exports (1)
openVideo|openVideoLink  src/utils/videoLink.ts
Configuration hints (1)
. (root)  Create knip.json configuration file, and add entry and/or refine project files (113 unused files)
npm notice
npm notice New major version of npm available! 10.9.8 -> 12.2.2
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.2
npm notice To update run: npm install -g npm@12.2.2
npm notice
```

</details>


<details><summary>ts-prune full output (not deletion permission)</summary>


```text
modules/medveda-offline-vault/index.ts:15 - nativeVaultControl
modules/medveda-offline-vault/index.ts:3 - VaultCapabilities (used in module)
src/config/database.ts:155 - resetDatabase
src/config/paymentProvider.ts:5 - PaymentProvider (used in module)
src/hooks/useBuyOptions.ts:10 - buyOptionsErrorMessage (used in module)
src/hooks/useBuyOptions.ts:6 - BUY_OPTIONS_TIMEOUT_MS (used in module)
src/hooks/usePurchaseResource.ts:7 - PURCHASE_TIMEOUT_MS (used in module)
src/hooks/useStoreCatalog.ts:14 - storeErrorMessage (used in module)
src/hooks/useStoreCatalog.ts:6 - STORE_TIMEOUT_MS (used in module)
src/repositories/ordersRepository.ts:5 - getOrderById
src/repositories/quizRepository.ts:23 - getAllActiveQuizTestsLite
src/repositories/searchPagination.ts:1 - SEARCH_PAGE_SIZE (used in module)
src/repositories/searchPagination.ts:3 - SearchPage (used in module)
src/repositories/videosRepository.ts:30 - getAllActiveVideos
src/services/analyticsService.ts:27 - logEvent (used in module)
src/services/analyticsService.ts:7 - AnalyticsEventName (used in module)
src/services/analyticsService.ts:18 - AnalyticsEvent (used in module)
src/services/appConfigService.ts:13 - DEFAULT_STORE_URL (used in module)
src/services/authState.ts:156 - onBlockedSignOut
src/services/notificationRouting.ts:15 - isBroadcastNotification (used in module)
src/services/notificationRouting.ts:34 - notificationTarget (used in module)
src/services/offlineNoteVerification.ts:6 - OFFLINE_NOTE_GRACE_MS (used in module)
src/services/offlineNoteVerification.ts:8 - OFFLINE_NOTE_VERIFICATION_PREFIX (used in module)
src/services/ordersService.ts:4 - Order (used in module)
src/services/ordersService.ts:4 - OrderStatus (used in module)
src/services/playBillingService.ts:104 - obfuscatedPlayId (used in module)
src/services/playBillingService.ts:165 - verifyPlayPurchase (used in module)
src/services/playBillingService.ts:355 - ensurePlayBilling (used in module)
src/services/playBillingService.ts:50 - PlayOrder (used in module)
src/services/playBillingService.ts:65 - PlayVerifyResult (used in module)
src/services/playBillingService.ts:74 - PlayBillingEvent (used in module)
src/services/playBillingService.ts:481 - PlayRestoreSummary (used in module)
src/services/playOfferSelection.ts:1 - StandardPlayOffer (used in module)
src/services/productsService.ts:12 - fetchProductsByChapter
src/services/productsService.ts:15 - fetchBundleProducts
src/services/productsService.ts:16 - fetchAllProducts
src/services/purchasesService.ts:6 - OwnedScope (used in module)
src/services/purchasesService.ts:6 - MyPurchase (used in module)
src/services/pushNotifications.ts:127 - PushLogoutHandle (used in module)
src/services/quizAttempts.ts:10 - QuizAttemptInput (used in module)
src/services/quizService.ts:3 - QuizTestQuestion
src/services/referralsService.ts:59 - normalizeReferralCode (used in module)
src/services/referralsService.ts:63 - isValidReferralCodeFormat
src/services/referralsService.ts:67 - applyReferralCode (used in module)
src/services/referralsService.ts:17 - ReferralHistoryItem
src/services/referralsService.ts:18 - ApplyReferralCodeResult (used in module)
src/services/referralsService.ts:27 - fetchMyReferrals
src/services/referralsService.ts:57 - REFERRAL_CODE_PATTERN (used in module)
src/services/secureNotesService.ts:11 - ONLINE_ONLY_MESSAGE (used in module)
src/services/studyReminderService.ts:21 - StudyReminderSettings (used in module)
src/services/syncEngine.ts:55 - queueForSync
src/services/syncEngine.ts:211 - getPendingSyncCount
src/services/usersService.ts:6 - UserRole
src/services/usersService.ts:61 - ChangePhoneResult (used in module)
src/theme/motion.ts:56 - AccessibilityInfo
src/theme/typography.ts:32 - LINE_HEIGHT
src/types/index.ts:6 - Course
src/types/index.ts:2 - Year
src/types/index.ts:2 - Subject
src/types/index.ts:6 - Chapter
src/types/index.ts:7 - ProductScope
src/types/index.ts:9 - Product
src/types/index.ts:2 - Note
src/types/index.ts:6 - Video
src/types/index.ts:5 - QuizTestQuestion
src/types/index.ts:10 - QuizTest
src/types/index.ts:21 - OrderStatus
src/types/index.ts:23 - Order
src/types/index.ts:7 - OwnedScope
src/types/index.ts:22 - MyPurchase
src/types/index.ts:16 - UserRole
src/types/index.ts:18 - UserProfile
src/types/index.ts:3 - ReferralRewardType
src/types/index.ts:4 - ReferralQualifyOn
src/types/index.ts:6 - ReferralSettings
src/types/index.ts:27 - ReferralStatus
src/types/index.ts:32 - ReferralHistoryItem
src/types/index.ts:45 - ApplyReferralCodeResult
src/types/index.ts:61 - WalletSummary
src/types/index.ts:70 - ReferralListStatus
src/types/index.ts:72 - ReferralListItem
src/types/index.ts:83 - OrderQuote
src/types/offline.ts:3 - DownloadContentType (used in module)
src/types/offline.ts:5 - DownloadStatus (used in module)
src/utils/dailyQuote.ts:1 - AyurvedicQuote (used in module)
src/utils/localCache.ts:25 - writeCache (used in module)
src/utils/passwordStrength.ts:9 - PasswordStrengthLevel (used in module)
src/utils/passwordStrength.ts:11 - PasswordStrengthChecks (used in module)
src/utils/passwordStrength.ts:19 - PasswordStrengthResult (used in module)
src/utils/pendingReferral.ts:10 - PendingReferral (used in module)
src/utils/streakTracker.ts:65 - getStreak
src/utils/textMatch.ts:16 - normalize (used in module)
src/utils/videoLink.ts:7 - normalizeVideoUrl
src/utils/videoLink.ts:75 - openVideoLink
src/utils/videoUrl.ts:28 - ParsedVideoUrl (used in module)
src/validation/registerSchema.ts:14 - REFERRAL_CODE_PATTERN (used in module)
src/features/auth/authService.ts:114 - sendEmailOtp
src/features/auth/authService.ts:121 - verifyEmailOtp
src/features/auth/authService.ts:25 - PASSWORD_RESET_REDIRECT_URL (used in module)
src/features/auth/authService.ts:28 - EMAIL_VERIFY_REDIRECT_URL (used in module)
src/screens/about/AboutScreen.tsx:16 - default
src/screens/chapters/ChaptersScreen.tsx:167 - default
src/screens/contact/ContactScreen.tsx:51 - default
src/screens/details/ChapterDetailsScreen.tsx:147 - default
src/screens/downloads/DownloadsScreen.tsx:43 - default
src/screens/notes/NotesScreen.tsx:263 - default
src/screens/notifications/NotificationPreferencesScreen.tsx:20 - default
src/screens/notifications/NotificationsScreen.tsx:29 - default
src/screens/payment/OrderSummaryScreen.tsx:38 - default
src/screens/payment/PaymentCheckoutScreen.tsx:35 - default
src/screens/payment/PaymentFailedScreen.tsx:37 - default
src/screens/payment/PaymentSuccessScreen.tsx:17 - default
src/screens/pdf/PdfViewerScreen.native.tsx:15 - default
src/screens/pdf/PdfViewerScreen.native.tsx:23 - PdfViewerSession (used in module)
src/screens/pdf/PdfViewerScreen.web.tsx:9 - default
src/screens/privacy/PrivacyScreen.tsx:16 - default
src/screens/profile/ChangePasswordScreen.tsx:25 - default
src/screens/profile/EditProfileScreen.tsx:25 - default
src/screens/profile/ProfileScreen.tsx:29 - default
src/screens/purchases/MyPurchasesScreen.tsx:63 - default
src/screens/quiz/QuizScreen.tsx:45 - default
src/screens/quiz/TestListScreen.tsx:137 - default
src/screens/referral/ReferralScreen.tsx:60 - default
src/screens/referral/ReferralTermsScreen.tsx:14 - default
src/screens/reminder/StudyReminderScreen.tsx:36 - default
src/screens/search/SearchScreen.tsx:37 - default
src/screens/settings/SettingsScreen.tsx:23 - default
src/screens/store/StoreScreen.tsx:40 - default
src/screens/subjects/SubjectsScreen.tsx:141 - default
src/screens/terms/TermsScreen.tsx:14 - default
src/screens/videos/VideosScreen.tsx:137 - default
src/screens/years/YearsScreen.tsx:133 - default
```

</details>


<details><summary>Madge circular-path output</summary>


```text
- Finding files
Processed 219 files (17.4s) 

✖ Found 6 circular dependencies!

1) services/authState.ts > utils/downloadManager.ts
2) services/authState.ts > utils/downloadManager.ts > services/courseState.ts
3) services/authState.ts > utils/downloadManager.ts > services/courseState.ts > services/usersService.ts
4) services/authState.ts > utils/downloadManager.ts > services/secureNotesService.ts > services/nonplayTestService.ts > services/paymentService.ts
5) services/nonplayTestService.ts > services/paymentService.ts
6) services/notificationsService.ts > utils/notificationPreferences.ts
```

</details>


<details><summary>depcheck candidate summary</summary>


```json
{
  "dependencies": [
    "expo-build-properties",
    "expo-splash-screen",
    "expo-system-ui",
    "react-native-screens",
    "react-native-worklets"
  ],
  "devDependencies": [
    "@babel/core"
  ],
  "missing": {
    "@expo/config-plugins": [
      "/home/ganeshp8545/AyurPulse/mobile-app/plugins/withAndroidQueries.js"
    ]
  }
}
```

</details>


### Candidate discovery beyond tool output

<details><summary>Tracked empty/build/archive/backup-name candidates</summary>


```json
{
  "empty": [
    "mobile-app/modules/medveda-offline-vault/android/.gradle/9.7.1/gc.properties",
    "mobile-app/modules/medveda-offline-vault/android/.gradle/vcs-1/gc.properties"
  ],
  "archiveOrBackupNames": [],
  "duplicateBytes": [
    [
      "mobile-app/modules/medveda-offline-vault/android/.gradle/9.7.1/gc.properties",
      "mobile-app/modules/medveda-offline-vault/android/.gradle/vcs-1/gc.properties"
    ]
  ]
}
```

</details>


Only tracked mobile files were considered for committed-artifact findings. Ignored build output and local keystores were preserved and are not cleanup authorization. Test files, v2 format names and fixture mock data are not dead code solely by name. A successful dependency install/build does not prove a feature flag or runtime asset is unused.

### Complete mobile brand/remnant reference inventory

Discovery: case-insensitive `ayurpulse|firebase|firestore` over tracked mobile text files. This includes filenames, documentation, test expectations, historical comments and actual FCM requirements. Each occurrence is a candidate under MV-A16, with the intentional package/scheme exception preserved. The private project-directory name is not student-facing branding.

| File:line | Exact reference | Disposition |
|---|---|---|
| `mobile-app/DATA_SAFETY_AUDIT.md:130` | `&#124; Device or other IDs — **Android device ID / advertising ID** &#124; No collection evidence found. **UNSURE whether any transitive Expo/Sentry/Google component automatically collects an identifier**, because that is not inferable from source alone; Sentry is disabled in checked-in production configuration. &#124; N/A. &#124; N/A. &#124; N/A. &#124; No code references to Advertising ID, &#96;getAndroidId&#96;, IMEI, MAC address, or Google/Firebase Analytics; direct dependency list has no Firebase Analytics/Ads SDK. &#124;` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/PLAY_STORE_SUBMISSION.md:40` | `## 4. Push notifications: Firebase configuration` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/PLAY_STORE_SUBMISSION.md:42` | `Download &#96;google-services.json&#96; from Firebase Console for Android package` | KEEP technical FCM reference; review wording |
| `mobile-app/app.config.js:5` | `//    Firebase Console -> Project settings -> Your apps -> Android &#96;in.medveda.app&#96;.` | KEEP technical FCM reference; review wording |
| `mobile-app/app.config.js:85` | `const googleServicesFile = process.env.GOOGLE_SERVICES_JSON &#124;&#124; (razorpayTest ? "./firebase-test/google-services.json" : fs.existsSync(local) ? "./google-services.json" : undefined);` | KEEP technical FCM reference; review wording |
| `mobile-app/app.config.js:87` | `require("./scripts/firebase-config.cjs").validateFirebaseConfig(` | KEEP technical FCM reference; review wording |
| `mobile-app/app.json:4` | `"slug": "ayurpulse",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/initial-environment.json:14` | `"/home/ganeshp8545/AyurPulse/mobile-app",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/initial-environment.json:46` | `"output": "  PID COMMAND         PATH\n  297 containerd      /run...\n  443 ld-linux-x86-64 /run/user/1000/wayland-0.lock\n  374 dockerd         /...\n  374 dockerd         /...\n  374 dockerd         /...\n 5567 codex           /home/ganeshp8545/.codex/tmp/arg0-linux/codex-arg0ykL6sF/.lock\n 5599 codex           /home/ganeshp8545/.codex/logs_2.sqlite\n 5599 codex           /home/ganeshp8545/.codex/logs_2.sqlite-shm\n 5599 codex           /home/ganeshp8545/.codex/goals_1.sqlite\n 5599 codex           /home/ganeshp8545/.codex/goals_1.sqlite-shm\n 5567 codex           /home/ganeshp8545/.codex/memories_1.sqlite\n 5567 codex           /home/ganeshp8545/.codex/memories_1.sqlite-shm\n 5599 codex  ` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/initial-environment.json:52` | `"/home/ganeshp8545/AyurPulse/mobile-app/android/.gradle-sdk-private"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/initial-environment.json:55` | `"output": "1.8G\t/home/ganeshp8545/AyurPulse/mobile-app/android/.gradle-sdk-private\n"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/initial-environment.json:63` | `"output": "{\n  \"profile\": \"razorpay-live-testing\",\n  \"distribution\": \"internal\",\n  \"artifact\": \"apk\",\n  \"package\": \"in.medveda.app\",\n  \"channel\": \"razorpay-live-testing\",\n  \"environment\": \"production\",\n  \"paymentProvider\": \"razorpay\",\n  \"sdkRoot\": \"/home/ganeshp8545/Android\",\n  \"sdkPackages\": [\n    {\n      \"name\": \"cmdline-tools\",\n      \"present\": true\n    },\n    {\n      \"name\": \"platform-tools\",\n      \"present\": true\n    },\n    {\n      \"name\": \"platforms;android-36\",\n      \"present\": true\n    },\n    {\n      \"name\": \"build-tools;36.0.0\",\n      \"present\": true\n    },\n    {\n      \"name\": \"ndk;27.1.12297006\` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/initial-hashes.json:92` | `"scripts/audit-firebase-profile-selftest.cjs": "a51c29c17568d7278dced1a69cde137a176f15a98b9ac5a25651abefe4c1fdc8",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/initial-hashes.json:108` | `"scripts/firebase-config-selftest.cjs": "3c2bd6facd50e02d8bc7ad9de06d8bc885a30fb9a0c16a5fe0b4fd122dd8031b",` | KEEP technical FCM reference; review wording |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/initial-hashes.json:109` | `"scripts/firebase-config.cjs": "2dc08f23cc983692cde8a7be45936f2f90dd2a29d0a13557f1edd7ed746486d9",` | KEEP technical FCM reference; review wording |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/offline-process.json:8` | `"/home/ganeshp8545/AyurPulse/mobile-app/android/.gradle-sdk-project",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/offline-process.json:17` | `"cwd": "/home/ganeshp8545/AyurPulse/mobile-app/android"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/offline-result.json:7` | `"/home/ganeshp8545/AyurPulse/mobile-app/android/.gradle-sdk-project",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/online-jdk17-process.json:8` | `"/home/ganeshp8545/AyurPulse/mobile-app/android/.gradle-sdk-project",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/online-jdk17-process.json:20` | `"cwd": "/home/ganeshp8545/AyurPulse/mobile-app/android"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/online-process.json:8` | `"/home/ganeshp8545/AyurPulse/mobile-app/android/.gradle-sdk-project",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/online-process.json:20` | `"cwd": "/home/ganeshp8545/AyurPulse/mobile-app/android"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/online-result.json:7` | `"/home/ganeshp8545/AyurPulse/mobile-app/android/.gradle-sdk-project",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/sandbox-offline-process.json:8` | `"/home/ganeshp8545/AyurPulse/mobile-app/android/.gradle-sdk-project",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/sandbox-offline-process.json:17` | `"cwd": "/home/ganeshp8545/AyurPulse/mobile-app/android"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/docs/audit/evidence/gradle-unblock-20261113/sandbox-offline-result.json:7` | `"/home/ganeshp8545/AyurPulse/mobile-app/android/.gradle-sdk-project",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/modules/medveda-offline-vault/PHASE1B.md:122` | `payment/Firebase/signing/financial operation is part of this increment.` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/package-lock.json:2` | `"name": "ayurpulse-mobile",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/package-lock.json:8` | `"name": "ayurpulse-mobile",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/package.json:2` | `"name": "ayurpulse-mobile",` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/android-vault-preflight.cjs:4` | `const { validateFirebaseConfig } = require('./firebase-config.cjs');` | KEEP technical FCM reference; review wording |
| `mobile-app/scripts/android-vault-preflight.cjs:28` | `const firebaseFile = values.GOOGLE_SERVICES_JSON &#124;&#124; path.join(root, 'google-services.json');` | KEEP technical FCM reference; review wording |
| `mobile-app/scripts/android-vault-preflight.cjs:29` | `let firebase = 'MISSING';` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/android-vault-preflight.cjs:30` | `if (fs.existsSync(firebaseFile)) {` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/android-vault-preflight.cjs:31` | `validateFirebaseConfig(firebaseFile, 'in.medveda.app');` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/android-vault-preflight.cjs:32` | `firebase = values.GOOGLE_SERVICES_JSON ? 'EXPLICIT_FILE_VALIDATED_LOCALLY' : 'LOCAL_FALLBACK_VALIDATED_CLOUD_DELIVERY_UNVERIFIED';` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/android-vault-preflight.cjs:41` | `firebase, cloudEnvironment: 'UNVERIFIED', signing: 'UNVERIFIED_NO_CREDENTIAL_READ',` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/android-vault-preflight.cjs:53` | `} catch { console.error('Android preflight rejected build inputs. Check profile environment, SDK and genuine Firebase input.'); process.exitCode = 1; }` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/audit-firebase-profile-selftest.cjs:5` | `const configured=configure({config:structuredClone(base)});assert.equal(configured.android.package,'in.medveda.razorpaytest');assert.equal(configured.android.googleServicesFile,'./firebase-test/google-services.json');` | KEEP technical FCM reference; review wording |
| `mobile-app/scripts/audit-firebase-profile-selftest.cjs:7` | `process.env.GOOGLE_SERVICES_JSON=path.join(os.tmpdir(),'missing-medveda-firebase.json');assert.throws(()=>configure({config:structuredClone(base)}),/readable Firebase/);` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/audit-firebase-profile-selftest.cjs:8` | `console.log('PASS AUD-018 isolated profile selects genuine matching test Firebase input; bad explicit input rejects');` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config-selftest.cjs:3` | `const {validateFirebaseConfig} = require('./firebase-config.cjs');` | KEEP technical FCM reference; review wording |
| `mobile-app/scripts/firebase-config-selftest.cjs:6` | `const dir = fs.mkdtempSync(path.join(os.tmpdir(),'medveda-firebase-fixture-'));` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config-selftest.cjs:24` | `assert.throws(()=>configure({config:base}),/readable Firebase/);` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config-selftest.cjs:25` | `fs.writeFileSync(file,'not json');assert.throws(()=>configure({config:base}),/readable Firebase/);` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config-selftest.cjs:27` | `const c=structuredClone(fixture);mutate(c);fs.writeFileSync(file,JSON.stringify(c));assert.throws(()=>configure({config:base}),/Firebase Android client/);` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config-selftest.cjs:32` | `// Supplying the EAS file must change only the Firebase path, including when a` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config-selftest.cjs:38` | `assert.equal(validateFirebaseConfig(file,'in.medveda.app').projectId,'synthetic-project');` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config-selftest.cjs:39` | `console.log('PASS production config with/without secret, EAS file path, unchanged release settings, and invalid Firebase input rejection');` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config.cjs:4` | `function validateFirebaseConfig(file, packageName) {` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config.cjs:7` | `catch { throw new Error('GOOGLE_SERVICES_JSON must reference a readable Firebase Android client JSON file.'); }` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config.cjs:11` | `throw new Error('Firebase Android client configuration has invalid project metadata.');` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config.cjs:15` | `if (clients.length !== 1) throw new Error(&#96;Firebase Android client configuration must contain exactly one client for ${packageName}.&#96;);` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config.cjs:20` | `throw new Error('Firebase Android client configuration is missing matching app ID or API-key metadata.');` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/firebase-config.cjs:24` | `module.exports = { validateFirebaseConfig };` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/payment-provider-selftest.cjs:26` | `assert.equal(app.slug, "ayurpulse");` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/razorpay-live-testing-selftest.cjs:64` | `console.log('PASS dedicated live APK; exact build guards; native channel/runtime isolate Play; existing Firebase/package retained');` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/readiness-selftest.cjs:58` | `for (const id of ['com.medveda.app', 'com.ayurpulse.app', 'in.medveda.app', 'custom.app']) {` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/staging-build-selftest.cjs:54` | `const localFirebase = path.resolve(__dirname, '../google-services.json');` | KEEP technical FCM reference; review wording |
| `mobile-app/scripts/staging-build-selftest.cjs:59` | `require: name => name === 'fs' ? { ...fs, existsSync: file => path.resolve(file) === localFirebase ? productionFilePresent : fs.existsSync(file) }` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/scripts/verify-signature-selftest.js:5` | `* This does NOT call Razorpay or Firebase. It only proves that the` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/repositories/usersRepository.ts:6` | `// primary key is the Supabase auth user's uuid - same role Firebase's` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/services/appConfigService.ts:62` | `!/^https:\/\/play\.google\.com\/store\/apps\/details\?(?:[^#]*&)?id=com\.(medveda&#124;ayurpulse)\.app(?:&&#124;$)/.test(rawUrl)` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/services/authState.ts:1` | `// Supabase doesn't expose a synchronous "auth.currentUser" like Firebase` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/services/authState.ts:208` | `// Firebase's User had &#96;.displayName&#96;; Supabase stores that in` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/services/chaptersService.ts:18` | `// Sorted client-side (instead of Firestore orderBy) so this query` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/services/notesService.ts:8` | `// Sorted client-side (instead of Firestore orderBy) so this query` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/services/notificationsService.ts:81` | `// Read state is purely local (per-device) - unchanged from the Firebase` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/services/quizService.ts:8` | `// Sorted client-side (instead of Firestore orderBy) so this query` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/services/subjectsService.ts:10` | `// Sorted client-side (instead of Firestore orderBy) so this query` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/services/videosService.ts:8` | `// Sorted client-side (instead of Firestore orderBy) so this query` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/services/yearsService.ts:36` | `// Sorted client-side (instead of Firestore orderBy) so this query` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/types/chapter.ts:1` | `// Firestore collection: "chapters"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/types/note.ts:1` | `// Firestore collection: "notes"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/types/product.ts:1` | `// Firestore collection: "products"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/types/product.ts:21` | `// the admin panel / Firestore doc whenever a discount should be shown.` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/types/purchase.ts:3` | `// Firestore collection: "purchases"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/types/purchase.ts:4` | `// Written ONLY by the verify-payment Firebase Cloud Function. Each purchase` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/types/quiz.ts:1` | `// Firestore collection: "quizTests"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/types/subject.ts:1` | `// Firestore collection: "subjects"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/types/video.ts:1` | `// Firestore collection: "videos"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/types/year.ts:1` | `// Firestore collection: "years"` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/utils/caseConvert.ts:2` | `// (unchanged from the Firestore version) so the rest of the app - hooks,` | Review stale text/legacy identifier; do not auto-rename |
| `mobile-app/src/utils/recentActivity.ts:6` | `// intentionally NOT stored in Firestore - it's per-device, no backend` | Review stale text/legacy identifier; do not auto-rename |

### TODO/debug/comment candidates

The following production-source matches require context; comments are not automatically dead code. Test console output is intentional and was excluded from this condensed list. No blocks were deleted.

| File:line | Exact match |
|---|---|
| `mobile-app/src/utils/logger.ts:3` | `// SECURITY FIX: plain console.log/console.error calls run in production` |
| `mobile-app/src/utils/logger.ts:15` | `console.log(...args);` |

### 7d. Dependencies removed / kept / upgraded

**Removed: none. Upgraded: none.** Current manifest/lockfiles remain unchanged. Every direct package was considered against imports, framework plugins, peer/native requirements and dependency-use outputs; dependency-tool suggestions alone are insufficient.

| Candidate | Decision and proof |
|---|---|
| expo-build-properties | KEEP — app.config.js adds it as a config plugin |
| expo-splash-screen | KEEP — app.json plugin controls native splash |
| expo-system-ui | KEEP pending native/theme/plugin qualification; no removal proof |
| react-native-screens | KEEP — native-stack peer/native integration |
| react-native-worklets | KEEP — Reanimated native/peer dependency |
| @babel/core | KEEP — Expo Babel build toolchain |
| @expo/config-plugins | Not removed; directly used but transitive-only declaration is MV-A18 |
| aes-js, expo-secure-store, react-native-get-random-values | KEEP — current native session-storage and license runtime |
| expo-iap | KEEP — retained receipt recovery/isolated validation even while new purchases are disabled |
| minimatch / Expo chain | KEEP version pending compatible advisory remediation; no forced major downgrade |

### 7e. Size saved

| Deleted files | Removed LOC | Saved bytes / MB | Bundle/AAB delta |
|---:|---:|---:|---|
| 0 | 0 | 0 / 0 MB | No source/dependency reduction; export size recorded only if a completed bundle exists. AAB unmeasured. |

```json
{
  "finalConfirmation": {
    "files": 25,
    "bytes": 26282170,
    "exit": 0
  },
  "baseline": {
    "earlyRetainedFolderBytes": 26282776,
    "exactCompletedArtifactsAvailable": false
  },
  "savings": {
    "deletedFiles": 0,
    "removedLOC": 0,
    "bytes": 0
  },
  "aab": "UNVERIFIED"
}
```

## 8. Fixes applied / commits

| Commit | Purpose |
|---|---|
| `56ef326c41f492b2395bfa94e8f2376c72f2861d` | `chore: snapshot before audit-5` — preserves all pre-existing changes as explicitly requested. Not a new audit remediation. |

No application fix commits. The reproduced changes would affect auth ownership/storage, offline product architecture or noncritical behavior; they do not qualify for the user’s small/local/critical-or-security auto-fix rule. Payment architecture, billing, SQL/RLS, native encryption, identifiers and env/secrets were left unchanged. The report is left as the sole new file for local review; no additional fix or cleanup commit exists.

## 9. Not done / blocked

- No real Android device, emulator installation, signed native build, Play Console or payment-provider dashboard qualification. Native tests/target SDK/ABIs/signing/AAB size are UNVERIFIED.
- No hosted Supabase project was queried or changed; no migrations/deployments, job activation, real payments/refunds, pushes, account deletions, email/OTP requests or financial RPCs were executed. Effective live RLS/storage/cron/auth settings are UNVERIFIED.
- No fully reproduced end-to-end exploit is claimed from the static/manual gaps. The concrete session-tamper and date probes use synthetic in-memory fixtures.
- No exhaustive proof of secret absence or package provenance; current/history bounded patterns and registry advisory data are reported accurately.
- No unused candidate has complete framework/native/runtime reference proof and a validated deletion batch.
- Expo versioned docs returned 403. Existing config was audited; no new SDK integration was written.
- Earlier interrupted/timed-out exports are recorded in section 2. The uninterrupted final Android export confirmation returned exit 0; native AAB/device gates remain open.

## 10. Real Android manual test checklist

Use an isolated hosted target with synthetic A/B accounts and test-provider credentials. Test a low-memory Android device and a recent supported Android device. Record binary SHA-256, version/build/runtime/channel, device/OS, account role, start/end times and outcome for each step. Separate standard free-only and explicitly approved payment-validation binaries.

1. [ ] **Install / launch:** Install the exact signed free-only build from internal distribution. Cold-start offline and online, retry failed SQLite preparation, rotate/resize, open keyboard fields and background/resume. Verify correct MedVeda name/icon/status bars, no crash or infinite loader; inspect merged permissions/backup/debug/export settings.

2. [ ] **Login and lockout:** Use A email/password and mobile/password; tap submit twice. Try 5 invalid attempts, restart, verify 5-minute lock; after expiry try 3 failures and verify 15-minute stage. Repeat from B device and direct API, clear app data, vary normalized email/mobile; record whether server limits remain effective. No genuine user accounts.

3. [ ] **OTP / registration:** Register synthetic new email/mobile, verify duplicate/invalid shapes and password policy. Request OTP for existing and nonexistent account, hit resend twice/rate limit, use wrong/expired code and verify shouldCreateUser:false does not create an account. Check generic errors and email delivery.

4. [ ] **Forgot password / links:** From Gmail in-app browser and external Chrome, test cold/warm app reset bridge, expired/reused link, fragment errors and verified-TOTP MFA. Test the requested ayurpulse scheme and actual medveda manifest variants. Wrong-scheme/path/unrelated links must not import a session; verify a successful reset does not repeat mutation on cleanup retry.

5. [ ] **Free-only purchase gate:** In production-profile binary, inspect Store/Notes/search/deep links and verify no new paid checkout can start. Verify existing purchases/history/recovery still work and no disabled-provider route silently falls back to another provider.

6. [ ] **Razorpay UPI (separate approved test build):** Create one synthetic test order; double-tap pay, use a test UPI flow, switch apps, hold background long enough for renderer/process loss, return/back/cancel, drop network before callback. Do not pay again after pending. Verify recovery against same account, one entitlement, correct amount/currency and no cross-owner recovery. Repeat callback/webhook safely in test backend.

7. [ ] **Play Billing / choice (separate approved validation build):** Install through appropriate Play testing track with licensed tester and eligible country/account. Validate product/offer/INR amount, mandatory choice sheet, Play and alternative selection, pending/cancel, process death, duplicate receipt/replay, restoration and foreign-account rejection. Verify server grant then consumption/reporting and refund/revocation. Keep production payments disabled until owner-specific eligibility passes.

8. [ ] **Paid notes access:** As free A, try locked note and guessed direct object URL; as entitled A, obtain fresh URL and render; as B reuse order/note params and fail fresh signing. Refund/expire/block in isolation and verify new opens fail; confirm already-signed URL’s bounded 120-second behavior. Verify screenshots/recents protection on actual Android.

9. [ ] **Offline / downloads / expiry:** Under this release, paid offline must be denied; do not mark seven-day paid support passed. Download free preview, airplane mode, resume/retry/cancel/double tap, kill/relaunch mid-transfer, corrupt/truncate PDF, fill storage. Test within and beyond 7 days and clock rollback with isolated fixture-controlled time. Reconnect to reverify. Confirm legacy paid files denied/cleaned and no path traversal/partial HTML becomes a completed PDF.

10. [ ] **Video / PDF:** Open canonical watch, youtu.be, embed, shorts/live/playlist and malformed URLs with YouTube installed/uninstalled and browser disabled. Verify fallback/copy feedback. PDF: expired URL then retry, page changes, rotate/background/resume, renderer errors, empty file and rapid A→B switch; no old-content frame remains.

11. [ ] **Quiz / search / sync:** Play/submit answers online and offline; timer/background/resume, stale revision, corrupted answers and rapid submit. Reconnect and verify one server-scored attempt, no client-score trust, retry fairness and no cross-owner submission after logout. Search large catalog, change course during query, rapid clear, offline fallback and stale cache. Check streak around local midnight.

12. [ ] **Notifications / reminders:** Grant/deny/revoke OS permission; check one owner token after A→B switch. Send typed synthetic notification with category conflicts; mute category and compare feed/foreground/background/killed behavior against disclosed limitations. Tap cold/warm notification, malformed/foreign routes and duplicates. Schedule/change/cancel reminder; reboot and cross DST/timezone change.

13. [ ] **Logout / account deletion:** Seed A quiz/outbox/history/notes/licenses/pending referral; logout online/offline while download/sync runs, sign in B and inspect all A residue. This is currently an open finding. On synthetic deletion, verify server success before local signout, retry partial failure, inspect Auth/database/storage/push/identity-retention behavior, and verify old JWT access. Record retained legal/accounting data without copying real PII.

14. [ ] **OTA / release telemetry:** Apply correct signed update to matching runtime/channel, reject unsigned/wrong-runtime update, rollback and resume existing session. Send synthetic crash, verify correct release/source-map symbolication and scrubbed payload; confirm screenshot-build flag is absent in production and no payment test code can activate through channel mismatch.

## 11. Ordered release checklist / recommended next steps

1. [ ] Review all findings and choose the actual release contract: free-only/paid online-only versus the requested seven-day paid-offline behavior. Keep new paid sales disabled.

2. [ ] Resolve account-local data cleanup and define retention of unsynced attempts; implement ownership-safe cleanup and migration tests before shared-device acceptance.

3. [ ] Approve authenticated session-encryption migration and rollback behavior, then qualify it on installed native builds; do not label CTR-only encryption tamper-proof.

4. [ ] Confirm intentional package/scheme and old installed deep-link compatibility; review the hosted reset bridge allowlist with current native manifests.

5. [ ] On an identified isolated target, verify effective RLS, storage privacy, RPC ownership/ACLs and deployed Edge auth/signature/rate-limit behavior. Rehearse deletion/refund/revocation without real user/provider effects.

6. [ ] Verify owner-approved migration/deployment order and 180-day retention scheduler evidence. Do not blanket-push migrations or activate cron from source comments.

7. [ ] Complete Android export and artifact/source-map inspection, resolve or explicitly accept the moderate build-tool advisory with evidence, and rerun full mobile checks on the reviewed HEAD.

8. [ ] Build/sign the exact reviewed free-only AAB; inspect target SDK/64-bit/manifest/permissions/backup/debug/R8/signing/channel/runtime and measure compressed Play download size. Confirm Sentry upload and OTA-signing policy.

9. [ ] Execute section 10 on real devices, retaining failures and exact binary hashes. Treat payment qualification as a separate program/provider release gate.

10. [ ] Compare final SDK/network data inventory with submitted Data Safety/privacy/deletion declarations; verify support/legal URLs and deletion-request fulfillment.

11. [ ] Owner reviews residual risks and internal-track results before production approval. Keep audit-5 local for review; do not push or publish automatically.
