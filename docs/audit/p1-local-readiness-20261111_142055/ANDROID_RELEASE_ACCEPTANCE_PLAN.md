# Future payment-disabled Android release acceptance plan

Date: 2026-11-11 UTC. **Procedure only. No build, upload, publish, deployment or activation authorization.** The application is unbuilt. Owner must approve each external action separately after reviewing concrete inputs.

## 1. Freeze and approve the exact source

Review `evidence/mobile-source-inventory.json` (322 files), `source-package.json`, `dependency-inventory.json`, initial/final Git status, `task-change-inventory.json` and `FILE_CHANGE_INVENTORY.md`. The mobile source tar is a local review artifact with exact file hashes, not a native AAB. All required untracked plugins/rules/services/tests/assets must be included. Preserve the dirty working tree; never use reset/clean/stash as preparation.

Verify the tar hash and all per-file hashes. Accept the exact current mobile source, dependency lock, build config, payment guards, data-safety statements and expected backend dependencies. If any source/input changes after acceptance, refresh the inventory and rerun affected checks before building. Build from an isolated approved source copy with the same paths/config; retain its Git commit plus dirty-file hashes. Do not infer source identity from commit 54c33cbb alone.

Use a credential-free archive allowlist. Exclude dotenv files, service-account/private keys, signing credentials, database dumps, .aws/.codex/.agents metadata, node_modules, generated android/ios and prior audit archives. The genuine Android Firebase client file is a separately reviewed worker input, not the FCM service-account key. Do not upload the whole repository indiscriminately merely because some files are gitignored.

## 2. Required owner inputs before requesting a build

| Input | Required acceptance |
|---|---|
| Firebase Android client | Original intended Firebase project file, exactly in.medveda.app, matching project number/app ID/API metadata; no staging/test package; validate with `mobile-app/scripts/firebase-config.cjs`. Structural acceptance is not provenance. |
| EAS file handling | Production project-scoped `GOOGLE_SERVICES_JSON` file variable, or explicitly approved ignored local client file actually included by build input handling. An outside local path alone does not provision a cloud worker. Record worker-resolved file existence/package without printing contents. |
| FCM v1 | Matching approved server credential/API/IAM configured privately for Expo push; never put it into the client JSON, EXPO_PUBLIC or source archive. Earlier remote absence is inherited, not freshly queried. No upload authorized here. |
| Android upload signing | Refresh current existing upload certificate metadata; compare to approved Play upload certificate. Inherited fingerprint: `8C:95:98:E4:EA:07:22:BC:D6:F2:69:0B:10:60:B0:01:D9:FF:F6:19:F7:C1:8B:4B:3B:B5:B0:92:A4:CB:F3:00`. Confirm privately; do not download key material into audit. |
| Version | Version name 1.2.2 currently. EAS remote version source/autoIncrement true; refresh highest Play-uploaded code and remote version before build. Historical code 13 is not a current guarantee. Future code must be strictly greater than the accepted highest code. |
| Worker/toolchain | Accept compatible EAS image/Node/JDK/Gradle/AGP/Kotlin/NDK and cache policy; retain actual versions. Current profile does not prove a future worker image or resolved dependencies. No speculative downgrade/forced dependency update. |
| Production config | Package in.medveda.app; production environment/channel; standard production target; disabled provider; UCB flags explicitly false; runtime 1.2.2-disabled-notes-choice-v1; intended backend URL/publishable key; no staging/test distribution overrides. |
| Signing/OTA/Sentry | Decide OTA certificate policy and mapping upload requirements. Optional Sentry credentials are build-only, never public config. Map exact binary to R8/source maps. No OTA update or credential generation is implied. |
| Backend/operations | Identify accepted deployed Auth/Storage/read access dependencies for existing Notes. Do not deploy A/B/C/D or run financial recovery as a build prerequisite probe. All P0 finance/recovery/production gates remain separate. |

No production Firebase project/app registration, API enablement, key creation/rotation, Console change or credential upload is authorized by this document. Owner must supply genuine inputs through an explicitly approved workflow.

## 3. Local preflight and separate cloud-build gate

Rerun mobile noEmit, final affected tests, dependency consistency, Expo production public config/introspection, bundle-validator fixtures and whitespace. Use explicit production environment, `EXPO_NO_DOTENV=1`, no staged/private endpoints and offline tooling where appropriate. Confirm source inventory still matches. Inspect native autolinking for IAP/PDF/BlobUtil/WebView. Keep Billing permission; do not remove expo-iap to satisfy any tool.

Owner approval must name exact source/archive/config/dependency digests, Firebase input reference, signing certificate, expected version-code floor, build profile/channel, one-build cost/resource scope and acceptance reviewer. Approval to build is not approval to upload, publish, transact or activate.

Only after that separate approval, from the approved source copy:

```sh
cd /home/ganeshp8545/AyurPulse/mobile-app
MEDVEDA_PAYMENT_PROVIDER=disabled eas build \
  --platform android --profile production \
  --non-interactive --freeze-credentials
```

**NOT EXECUTED.** No auto-submit option. Existing autoIncrement can change remote version metadata during the future build, which owner must accept. Do not substitute alpha, non-Play, staging or preview profiles. An SDK-equipped local build would require its own approved resource/signing scope; generated debug release signing is unsuitable for submission.

Retain EAS build ID/log/source/config hashes, resolved Firebase package, exact tool versions, actual versionCode/versionName, channel/runtime, dependency graph, merged manifest/report, R8 mapping and final AAB SHA-256. Fail the build review on source/input drift or missing evidence; compilation alone is not acceptance.

## 4. Inspect the exact future AAB

Use owner-reviewed installed tools in an isolated artifact directory. The names below are placeholders for files from the same build, not existing current artifacts.

```sh
java -jar /approved-tools/bundletool.jar validate --bundle=/approved-artifacts/current.aab
java -jar /approved-tools/bundletool.jar dump manifest \
  --bundle=/approved-artifacts/current.aab --module=base \
  > /approved-artifacts/current-manifest.xml
python3 mobile-app/scripts/inspect-android-bundle.py /approved-artifacts/current.aab \
  --manifest /approved-artifacts/current-manifest.xml \
  --release-config /approved-artifacts/current-worker-expo-config.json \
  --output /approved-artifacts/current-inspection.json \
  --mapping-dir /approved-artifacts/current-mapping \
  --expect-optimized --min-version-code OWNER_ACCEPTED_HIGHEST_CODE
java mobile-app/scripts/VerifyAndroidBundleSignature.java /approved-artifacts/current.aab
```

Replace OWNER_ACCEPTED_HIGHEST_CODE with the independently observed integer; do not literally run that placeholder. The Java verifier reads every signed payload and requires one signer/no unsigned payload/no duplicate ZIP entries. Compare its signer with the owner-approved upload certificate; JAR signature validity alone does not establish certificate trust.

Inspector must require Billing, reject unexpected permissions, and bind disabled production config/runtime to the exact build. Review INTERNET/notifications/network/wake/boot/badges/biometrics/install-referrer and receiver-isolation library permissions against the approved inventory. No overlay/broad storage/media/camera/microphone may slip through. Check applicationId, SDK levels, adaptive/resizable activity, soft-input resize, deep-link filters, release debug/cleartext/backup settings and notification metadata. The config/manifest inspector does not establish compiled runtime payment behavior or Play policy approval.

On the corresponding build workspace, retain `:app:dependencies --configuration releaseRuntimeClasspath` and `:app:dependencyInsight --configuration releaseRuntimeClasspath --dependency com.android.billingclient`. Confirm actual Billing 8.3.0 or explicitly reviewed compatible resolved version, and retained native user-choice APIs. Do not treat declared POM as actual resolution.

Inspect every packaged ABI/native library. Use bundletool `dump config` to verify page alignment configuration, Android's ELF LOAD-alignment procedure/readelf for each .so, and `zipalign -c -P 16 -v 4` on generated APKs. Use bundletool to generate device APKs only under accepted local signing/test scope; the AAB itself is not installable. Verify complete arm64 native-library availability, other declared supported ABIs, R8 mapping and PDFium/JNI/WebView/BlobUtil startup. Run on real 16 KB hardware and confirm `adb shell getconf PAGE_SIZE` is 16384. Do not infer 16 KB readiness from a successful ZIP check or library name.

See [Android page-size acceptance](https://developer.android.com/guide/practices/page-sizes). Current artifact inspection/ELF/device steps are **NOT VERIFIED**.

## 5. Physical-device acceptance matrix

Every result records source/build/AAB hashes, installed APK signer/version, device/API/ABI/page size, WebView version, network, locale/font scale, test account authorization, UTC time, expected/actual and reviewer. Use isolated QA device/accounts and separately authorized Auth/profile/push writes. Existing owner device uninstall/data loss needs explicit acceptance. No new financial checkout/recovery-worker call is a read-only test.

| Coverage | Required actions and pass criteria |
|---|---|
| Devices | Actual minimum supported API from final manifest; current API 36+ compatible device; arm64 physical device; 16 KB device; small display, 200% font/display scale, rotation, TalkBack. Record unsupported combinations rather than fabricating PASS. |
| Startup/resume | Cold/warm/offline launch, force-stop, background/resume, transient maintenance/update error; no endless spinner/crash; channel/reminder failure remains optional. |
| Auth/course | Authorized login/logout/refresh/recovery links, slow network/timeout/duplicate tap, A→B→A during loads and course/year changes; no old account/profile/download state. |
| Educational content | Free videos/quiz/search and course navigation work with payments disabled. |
| Store/Notes/history | Loading/empty/error/retry, stable history order, refresh/resume and pre-existing legitimate entitlement; no stale ownership. |
| PDF/download | Authorized server URL; wrong owner/no entitlement/expired session denied; expiry retry, offline owner/license/grace policy, large PDF/low memory/rotation/process death; no private URL/token logging. |
| Payments disabled | Store/cards/search/Notes/options/history/deep links/restored navigation cannot open new order/checkout/native purchase sheet/Razorpay CDN. Instrument no create-order request. Existing entitlement access preserved. Genuine recovery calls require separate financial write scope, even while new sales are off. |
| Notifications | Missing/denied permission; later enable; registration/refresh/account switch/logout; duplicate, stale targeted payload, foreground/background/killed taps; matching FCM credential and final receipt/device evidence. OS background message body must remain non-sensitive broadcast content. |
| Accessibility | TalkBack names/roles/focus/loading/error announcements, distinct Notes open/download actions, disabled semantics, touch targets/contrast and no clipping at large fonts. Automated JSX checks alone insufficient. |
| Upgrade/reinstall | Separately approved upgrade from prior binary and data-loss-approved reinstall; reauthenticate and restore existing server purchases without new charge; no foreign cached PDF/download. |

Native user choice, Play country/version eligibility, genuine Play/Razorpay purchase/refund/dispute/reporting acceptance need a separate future financial test authorization after their program/backend gates. They are excluded from this disabled-payment device scope.

## 6. Google Play Console and final approval

Before any separately authorized upload: owner confirms package ownership, upload certificate/Play App Signing, version-code monotonicity, target SDK/device requirements, resolved Billing declaration and policy/program context, data safety/permissions/privacy/support details, test access, rollout/track and exact accepted binary. Keep native Billing despite disabled sales. Retain 16 KB/R8/permission evidence and pre-launch/device reports. A read-only checklist does not authorize a Console change or upload.

Require independent release review, security/backend compatibility, existing Notes/privacy/device acceptance and monitoring/on-call readiness. Distinguish mechanical binary build approval from production deployment/publication and paid activation. Finance reconciliation/full recovery/P0 release-package/window gates stay OPEN. If new critical regression appears, stop the candidate, isolate/fix/retest locally, and report P0 impact; do not bypass a guard to finish the release.

Final owner decision must identify unresolved exceptions and exact permitted action. No implicit next step follows this plan. Production remains NO-GO; P2 not started.
