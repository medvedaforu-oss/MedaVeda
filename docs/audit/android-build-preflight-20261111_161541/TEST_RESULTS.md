# Android preflight test results

Date: 2026-11-11 UTC. Scope: local Android/Firebase/EAS preflight only. No cloud/native build, deployment, Console change, secret creation/upload, payment, production mutation or Play submission was performed. Existing P0/P1/P2 work is preserved.

91/93 recorded commands passed; two commands are infrastructure-blocked with nonzero exits. EAS schema resolution and explicit resolved-config assertions are additional successful checks. No genuine native build was attempted.

| Command | cwd | Exit | Result |
|---|---|---|---|
| `node mobile-app/node_modules/typescript/bin/tsc --noEmit -p mobile-app/tsconfig.json` | `.` | 0 | PASS |
| `npm ls --depth=0 --offline --ignore-scripts` | `mobile-app` | 0 | PASS |
| `node node_modules/expo/bin/cli install --check` | `mobile-app` | 0 | PASS |
| `node node_modules/expo/bin/cli config --type public --json` | `mobile-app` | 0 | PASS |
| `node node_modules/expo/bin/cli config --type introspect --json` | `mobile-app` | 0 | PASS |
| `npm exec --offline --yes --package=expo-doctor -- expo-doctor` | `mobile-app` | 1 | BLOCKED: package not cached |
| `eas --version` | `.` | 0 | PASS |
| `eas env:create --help` | `.` | 0 | PASS |
| `eas build --help` | `.` | 0 | PASS |
| `eas build:version:get --help` | `.` | 0 | PASS |
| `python3 mobile-app/scripts/android-bundle-validator-selftest.py` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/accessibility-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/android-release-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/auth-recovery-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/auth-state-race-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/checkout-html-selftest.mjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/checkout-security-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/course-state-race-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/course-year-confirmation-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/course-year-picker-race-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/course-year-selection-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/deep-link-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/download-actions-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/firebase-config-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/list-states-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/load-resource-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/login-network-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/login-submit-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv004-recovery-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv007-billing-boundary-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv008-ownership-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv009-store-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv010-options-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv011-accessibility-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/mv012-history-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/navigation-lazy-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/nonplay-test-isolation-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notes-billing-choice-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notes-entitlement-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notes-open-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notification-account-hook-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notification-inflight-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notification-preferences-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notification-reads-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/notification-routing-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/offline-download-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/offline-owner-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/p2-registration-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/password-policy-selftest.mjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/password-recovery.test.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-poll-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-provider-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-request-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-routing-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-success-owner-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-summary-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/payment-verdict-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/pdf-lifecycle-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/pdf-remote-retry-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/play-catalog-contract-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/profile-save-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/purchases-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/purchases-unavailable-ui-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/push-lifecycle-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/quiz-editing-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/quiz-hooks-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/quiz-input-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/razorpay-internal-test-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/readiness-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/release-payments-disabled-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/route-validation-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/same-project-build-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/search-cache-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/search-lazy-hook-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/search-pagination-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/sentry-config-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/staging-build-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/startup-availability-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/sync-concurrency-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/verify-signature-selftest.js` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/video-data-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/video-link-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/video-tap-selftest.cjs` | `.` | 0 | PASS |
| `node --experimental-strip-types mobile-app/scripts/years-inflight-selftest.cjs` | `.` | 0 | PASS |
| `node scripts/p2-quality-selftest.cjs` | `.` | 0 | PASS |
| `node scripts/p2-performance-selftest.cjs` | `.` | 0 | PASS |
| `node scripts/p2-admin-labels-selftest.cjs` | `.` | 0 | PASS |
| `npm run lint --prefix tooling` | `.` | 0 | PASS |
| `git diff --check` | `.` | 0 | PASS |
| `npm audit --omit=dev --json` | `mobile-app` | 1 | BLOCKED: registry DNS unavailable |
| `node node_modules/expo-modules-autolinking/bin/expo-modules-autolinking.js resolve --platform android --json` | `mobile-app` | 0 | PASS |
| `node supabase/tests/p1-push-delivery-selftest.cjs` | `.` | 0 | PASS |
| `node supabase/tests/p0-notification-selftest.cjs` | `.` | 0 | PASS |

The offline Expo dependency check reports dependencies up to date and explicitly warns that offline validation is unreliable. npm ls verifies the installed tree, not a fresh clean install. `npm audit` returned EAI_AGAIN and supplied no current advisory result; do not count it as clean. Offline expo-doctor returned ENOTCACHED and never executed Doctor. Owner reruns are required on a network-capable host.

The 11 Python validator tests exercise actual inspector subprocess rejection of unexpected and sdk-qualified permissions, missing Billing, enabled/unspecified providers, missing config, wrong package/runtime/distribution/target/enrollment flags, plus valid and Expo-wrapped configurations. Fixtures are synthetic ZIP/XML/config only, not native artifacts. Firebase tests likewise use synthetic metadata only and never manufacture a substitute genuine client file.

Production `expo config --type introspect --json` ran with the production eas.json environment, EAS_BUILD_PROFILE=production, EAS_BUILD_PLATFORM=android and dotenv disabled. It evaluates config plugins without running native prebuild/Gradle. The resulting manifest is pre-merge. Sixteen explicit assertions pass, including the deliberate observation that Firebase input is absent (a blocker, not successful Firebase acceptance). EAS CLI 24.14.0 read/validated/resolved all nine profiles using its installed @expo/eas-json library; no EAS job or credential endpoint was called.

Additional Android autolinking passes and includes IAP/Notifications; mocked push ticket/admin/broadcast checks pass with no remote sends. All individual mobile selftests were run, along with password recovery and P2 quality/performance/admin-label regressions. The closed-testing aggregator was not rerun because it repeats already executed child tests. Existing browser/device and database results were preserved rather than rerun; no database or financial test harness that performs writes was executed. No admin/website bundle build or mobile JS/native export was run under the no-build restriction.

Logs and JSON live in evidence/. Commands marked PASS prove only their stated scope. Native Maven compatibility, actual SDK availability on the worker, signing certificate, versionCode history, client authenticity/FCM delivery, 16 KB/R8/PDF and complete device behavior are NOT VERIFIED.
