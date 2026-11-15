# MedVeda Android native release readiness — 2026-11-11

**Final decision: NO-GO today for certifying and creating the requested production-compatible, disabled-payment AAB.** The existing production EAS profile and remote signing metadata are usable, but Firebase/FCM setup is absent, the unmodified regression run has one failing test fixture, and the retained artifact inspector has an obsolete Billing-permission rejection. Native compilation of the current source remains unverified. These findings do not establish that Gradle would fail to compile the application.

**Exact next actionable step:** the owner supplies the genuine Firebase Android configuration for `in.medveda.app` and arranges the matching production FCM v1 credential through the existing EAS workflow. Do not generate substitute project data or rotate signing credentials. Review the two verification corrections below, rerun checks, then obtain separate approval for one production-profile cloud build. No backend rollout or payment activation is a prerequisite to reviewing that disabled-payment build.

Scope: `/home/ganeshp8545/AyurPulse/mobile-app`, Android package `in.medveda.app`; November 11, 2026 UTC. This audit added documentation/evidence only. No existing source, test, profile, native file, dependency, lockfile, payment setting, price, website or admin file was edited. No SDK was installed, native folder regenerated, build requested, AAB submitted, transaction created, staging accessed, or Supabase/backend deployment/database operation performed. Only public documentation and authenticated **read-only Expo/EAS metadata** were contacted. Existing uncommitted work is preserved.

## 1. Evidence and prior reports

Primary inputs: [production deployment preflight](MEDVEDA_PRODUCTION_DEPLOYMENT_PREFLIGHT_2026-11-11.md), [Phase B compatibility](MEDVEDA_PHASE_B_EDGE_COMPATIBILITY_2026-11-11.md), [Phase C readiness](MEDVEDA_PHASE_C_LOCAL_READINESS_2026-11-11.md), [Android toolchain audit](MEDVEDA_ANDROID_IDE_TOOLCHAIN_2026-11-10.md), [closed-testing artifact review](MEDVEDA_CLOSED_TESTING_2026-11-08.md), original production audit and MV001/MV003–MV012 reports. The [prior-report inventory](evidence/android-native-20261111/prior-report-inventory.json) records all 34 existing top-level audit Markdown reports, hashes and section inventories. No separate MV002 implementation report exists; its pricing decision remains unchanged.

Earlier production schema, migration, function and financial observations are **inherited evidence**, not fresh production verification. Phase A/B/C packages remain local candidates, with their documented dependencies and delivery restrictions. Packaging mobile fixes does not deploy MV003–MV006 backend fixes or establish Google enrollment, accepted reporting, or live settlement. MV007's full Billing removal remains blocked; its safe subset retains required integration and disables standalone sales. Historical ₹1/₹2/₹5 fixtures are retained.

The old `mobile-app/build/closed-testing-1.2.2-13/MedVeda-1.2.2-13.aab` exists. It predates the current changes and cannot certify this source. No new APK/AAB was produced here.

LOCAL PASS below means the named deterministic/local inspection succeeded. REMOTE METADATA VERIFIED means only the specified EAS metadata was read. Native, device, provider and Play Console acceptance remain NOT VERIFIED.

## 2. Native configuration audit

| Area | Current finding | Readiness / limitation |
| --- | --- | --- |
| Identity | MedVeda; slug `ayurpulse`; owner `ganeshp0305`; version `1.2.2`; Android package/namespace `in.medveda.app`; scheme `medveda` | Public config, introspection, generated Gradle and remote EAS profile agree. No identity change. |
| Framework | Expo `57.0.32`, React Native `0.86.3`, React `19.2.3` | Installed versions equal lockfile; Expo's installed recommended dependency map agrees. |
| Production profile | `environment=production`, `distribution=store`, `buildType=app-bundle`, `credentialsSource=remote`, channel `production` | Fresh `eas config` succeeds. Production provider is explicitly `disabled`. No custom Gradle command bypasses release AAB generation. |
| Versioning | `cli.appVersionSource=remote`, `autoIncrement=true`; remote Android versionCode **13** | Fresh read-only version query succeeds. A future build would ordinarily increment to 14, absent concurrent changes. Highest code across Play uploads is owner-unverified. Local generated `versionCode 1` is a template value, not the cloud build's final code. |
| Native generation | `mobile-app/android` exists locally and is Git-ignored; no `.easignore` override found | EAS is expected to generate Android from app config in its upload. Local generated files are supporting evidence, not proof of the future archive/prebuild. Preserve the ignored folder; do not overwrite it. |
| Architecture | Hermes and New Architecture enabled; configured ABIs `armeabi-v7a,arm64-v8a,x86,x86_64` | Native compilation, ABI completeness, JNI loading and 16 KB ELF/ZIP alignment of the new bundle remain unverified. |
| SDK | RN version catalog: min API **24**, compile/target API **36**, build tools **36.0.0**, NDK **27.1.12297006** | These are declared framework inputs, corroborated by the earlier host-configuration audit. The current final merged/binary values need artifact verification. |
| Gradle | App wrapper **9.3.1**, byte-identical to installed Expo template | Cached Gradle starts successfully on JDK 21 with temporary user home. Do not substitute dependency-library wrappers. |
| AGP / Kotlin | Host catalogs: AGP **8.12.0**, KGP **2.1.20**; KSP expected **2.1.20-2.0.1** from framework mapping/prior host evidence | Complete resolved build classpaths remain unverified. Gradle's embedded Kotlin **2.2.21** is distinct from KGP. |
| JDK | OpenJDK/javac **21.0.12.1** available | Gradle version check explicitly used this installed JDK. Native module Java/Kotlin bytecode targets may still be 17. |
| Shrinking | `expo-build-properties` enables R8 and resource shrinking; `withAndroidRelease.js` selects `proguard-android-optimize.txt` | Release self-test PASS. Narrow Pdfium JNI rules retained; mapping and manifest-merger log requested in EAS artifacts. Actual R8 output/reflection safety remains unverified. |
| OTA | Android runtime **`1.2.2-disabled-notes-choice-v1`**; production channel; update URL points to existing EAS project | Keep this identity. Root `appVersion` policy is overridden by Android's explicit runtime. `code-signing/certificate.pem` absent; OTA code signing is not configured. Android upload signing is separate and present. No update was published. |

Plugin inventory: datetime picker, notifications, secure store, splash screen, status bar, web browser, SQLite, font, local Android intent-query plugin, build-properties, local release plugin and optional Sentry plugin. All resolve during Expo configuration/introspection. Sentry is conditional on upload credentials; production EAS environment metadata is empty, so cloud Sentry upload setup is not established. No plugin or enrollment flag was enabled.

The `expo-iap` config plugin is deliberately conditional on `provider=play` and absent for this production disabled profile. **That does not exclude the installed Expo native module.** Fresh Android Expo autolinking resolves `expo.modules.iap.ExpoIapModule`; RN autolinking resolves WebView, PDF and BlobUtil. Do not remove dependencies or add redundant direct Billing dependencies merely because the plugin is absent.

Compatibility caution: [AGP 8.12 documents API 36 support, minimum Gradle 8.13 and JDK 17](https://developer.android.com/build/releases/agp-8-12-0-release-notes). [KGP 2.1.20's fully supported matrix ends at Gradle 8.12.1 / AGP 8.7.2](https://kotlinlang.org/docs/gradle-configure-project.html). The framework-shipped combination therefore cannot be described as fully matrix-supported. No new failure was reproduced from that mismatch and no toolchain migration is justified by this audit. Preserve the Expo template versions and obtain actual release compilation evidence. [Gradle's Java compatibility matrix](https://docs.gradle.org/current/userguide/compatibility.html) supports the selected Java runtime.

## 3. Permissions and security configuration

App declarations request INTERNET and POST_NOTIFICATIONS. Generated main manifest also has VIBRATE, `allowBackup=false`, cleartext disabled, exported launcher/deep-link activity, unspecified orientation, resizable activity and `adjustResize`. Query intents retain HTTPS/HTTP/UPI/mailto handling. The HTTP query does not enable cleartext traffic.

Removal directives block SYSTEM_ALERT_WINDOW, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, READ_MEDIA_IMAGES and DOWNLOAD_WITHOUT_NOTIFICATION. Library manifests introduce additional permissions: Billing contributes `com.android.vending.BILLING`; notifications contributes RECEIVE_BOOT_COMPLETED; BlobUtil contributes WAKE_LOCK/ACCESS_NETWORK_STATE/ACCESS_WIFI_STATE; screen capture contributes DETECT_SCREEN_CAPTURE. This is a source inventory, **not an exhaustive final merged permission list**. Verify the final manifest and removal directives after Gradle merging. No camera, microphone or broad media access should be introduced without a reviewed feature need.

Important verification discrepancy: `android-release-selftest.cjs` checks that the generated **main** manifest lacks BILLING. That check passes and does not inspect library merging. A correct final bundle may retain BILLING through the installed IAP library, even though no purchases are allowed. Permission presence is not evidence of enabled sales.

## 4. Google Play Billing dependency status

**Retained; declared chain verified; resolved minified release graph and execution NOT VERIFIED.**

`expo-iap@3.4.4` declares the default Play artifact `io.github.hyochan.openiap:openiap-google:1.3.26`. Its exact retained Maven POM declares `com.android.billingclient:billing-ktx:8.3.0` and Kotlin stdlib 2.2.0. The installed native Gradle file, version file, Kotlin sources and library manifest match all Phase C pinned hashes; retained Maven POM/source archive hashes also match. [Current input verification](evidence/android-native-20261111/billing-inputs.json), [Phase C upstream source/POM evidence](evidence/phase-c-20261111/native-inputs.json).

The wrapper uses the legacy Expo compatibility Gradle helper, which is still present in installed `expo-modules-core`. It inherits host SDK values, targets JVM 17 and passes `-Xskip-metadata-version-check`. Wildcard Expo/RN peer dependencies permit installation but do not certify native compatibility. In particular, Kotlin metadata/stdlib resolution, Gradle APIs and R8 behavior still require compilation.

Retained native code provides choice listener/token/product forwarding and Play-selected processing; Phase C source inspection identified reflective `enableUserChoiceBilling`, whose failure is logged. A compiled dependency graph and future separately authorized native choice acceptance must verify that path. No enrollment, genuine token, reporting or Play policy approval is inferred from dependency presence. Production `disabled` configuration does not broaden Play restoration; existing server-owned successful Notes remain readable through their normal entitlement path.

After an approved build, retain `:app:dependencies --configuration releaseRuntimeClasspath` and `:app:dependencyInsight --dependency billing --configuration releaseRuntimeClasspath`, merged manifest and mapping from an SDK-equipped build environment. Confirm the actually selected Billing version, library permission, absence of duplicate incompatible Billing artifacts, and preservation of required native APIs. These tasks were not run on this SDK-incomplete Chromebook.

## 5. Razorpay library status

**Preserved; no direct native Razorpay SDK is installed.** The app uses `react-native-webview@13.16.1` and Razorpay's HTTPS `checkout.js`, with the existing server order/verification flow. WebView matches the Expo 57 recommended version and its installed/locked version. Its New Architecture implementation and native autolinking are present. The dependency's fallback AGP declaration is not proof that the host uses a separate AGP 7 build.

Checkout HTML retains context-safe escaping, callback nonce and bridge handling; production navigation, service and checkout guards prevent new checkout. Payment-request/poll/verdict/summary/provider/routing, checkout security/HTML, Notes-choice and production-disabled checks pass. ₹1/₹2/₹5 server-authoritative synthetic fixtures pass without price changes. No checkout CDN was loaded, native WebView executed, Razorpay order created or payment made.

No JavaScript peer/declaration conflict between retained IAP and WebView was found. This is not proof of absence of native/Kotlin/R8 conflict; that conclusion needs the actual release build and device.

## 6. Build environment and EAS cloud readiness

| Input | Observation |
| --- | --- |
| RAM | 6.4 GiB total, approximately 1.3–1.4 GiB available during inspection; no swap |
| Disk | 36 GiB filesystem, approximately 6.4 GiB available; 83% used |
| Temporary storage | `/tmp` is RAM-backed tmpfs, not extra persistent disk capacity |
| Java / Node / npm | JDK 21.0.12.1 / Node 22.23.1 / npm 10.9.8 |
| Android SDK | ANDROID_HOME and ANDROID_SDK_ROOT point to absent `/home/ganeshp8545/Android`; `/usr/lib/android-sdk` has platform-tools only |
| Missing SDK pieces | No usable API platform, build-tools, SDK manager or NDK at those SDK roots; ADB alone cannot compile |
| Gradle | No system Gradle command; app wrapper and cached Gradle 9.3.1 available |
| EAS CLI | Installed 24.14.0, satisfies `>=12.0.0`; update notice observed, no update installed |
| EAS authorization | Fresh account check confirms `ganeshp0305`, Owner; linked project `@ganeshp0305/ayurpulse`, ID `2d642c70-8ec1-4d7b-a388-2f2f99e8a8df` |
| EAS production environment | Project and account production variable metadata both empty; profile supplies Supabase public inputs and disabled provider |

**Local compilation: BLOCKED by missing SDK and unsuitable available resources.** No large SDK installation was attempted or proposed for immediate execution. Any future local SDK installation requires a new disk/RAM assessment and owner approval. No native prebuild/assemble/bundle, emulator, Metro production export or Gradle dependency download was run.

**EAS cloud: existing profile/access/signing metadata ready; production acceptance conditional.** A cloud worker supplies its own SDK/NDK/JDK; local SDK absence does not prevent a cloud build request. Worker image selection and complete current-source compilation remain unverified; the profile does not pin an image or Node version. Do not change those settings speculatively. [Expo's Android build lifecycle](https://docs.expo.dev/build-reference/android-builds/) describes prebuild, credential injection and `:app:bundleRelease` for this path.

Initial sandbox Expo API attempts failed DNS. Read-only network retries succeeded. Python's direct HTTP transport received Cloudflare HTTP 403; the same metadata query succeeded using the installed EAS transport. No automatic approval rejection remains outstanding. No build or credential mutation was used as a probe.

## 7. Firebase and signing

**Firebase/FCM: missing; inherited production release gap freshly confirmed.** Local `mobile-app/google-services.json` is absent. Resolved production config has no `android.googleServicesFile`. Both project/account production environment metadata are empty, so no production `GOOGLE_SERVICES_JSON` file variable exists. EAS reports no FCM v1 service-account credential for this package. The app config already supports a genuine local file or that EAS file variable; no code change is needed simply to accept it. [Expo file-environment guidance](https://docs.expo.dev/eas/environment-variables/) explains the cloud input mechanism.

Missing Firebase is **not proven to prevent compilation** because configuration is optional. It prevents claiming configured Android remote push and complete production feature readiness. Push registration catches errors, so a startup crash was not demonstrated. Owner must supply the correct package-specific Firebase config and matching FCM v1 credentials and later prove registration/delivery on a physical device. Those owner configuration actions were not executed. See [versioned notifications documentation](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

**Android signing: existing remote credential metadata verified.** One default non-legacy JKS build credential exists for `in.medveda.app`, last updated October 15, 2026. Certificate SHA-256:

`8C:95:98:E4:EA:07:22:BC:D6:F2:69:0B:10:60:B0:01:D9:FF:F6:19:F7:C1:8B:4B:3B:B5:B0:92:A4:CB:F3:00`

It matches the earlier v13 AAB signature evidence. No keystore, password, alias, key bytes or environment values were requested by the metadata query. Actual new signing is not yet exercised; owner must compare the upload certificate with Play Console when release review is authorized. The generated local `build.gradle` signs release with the debug template keystore; **do not use an unconfigured local `bundleRelease` as a production signed build**. EAS injects its existing remote signing configuration. Missing Play submission service-account files do not block build-only signing and must not be created for this task.

Evidence: [EAS metadata](evidence/android-native-20261111/eas-remote-metadata.json), [resolved production config](evidence/android-native-20261111/eas-production-config.json), [access/version observations](evidence/android-native-20261111/eas-access.json).

## 8. Fresh local verification

**86 unmodified checks: 85 PASS, 1 FAIL.** [Complete commands, exit codes and logs](evidence/android-native-20261111/check-results.json); [credential-free runner](evidence/android-native-20261111/run-checks.py).

| Check group | Result |
| --- | --- |
| Mobile Node suites | **64/65 PASS**; Auth/recovery/deep link, course/year races, free video routes, Notes/PDF/offline ownership, Store/retry, purchases/history, accessibility, MV004/MV007–MV012, payment guards, notifications and other existing regression suites |
| Backend deterministic Node suites | **17/17 PASS**; Play/choice/gates/reporting, Razorpay security/recovery, settlement, ownership restoration and worker harnesses; reporting restricted to `--production-only` |
| TypeScript | PASS: `node mobile-app/node_modules/typescript/bin/tsc --noEmit -p mobile-app/tsconfig.json` |
| Installed dependency tree | PASS: `npm ls --depth=0 --offline --ignore-scripts`; root lock declarations match package.json; sampled installed native versions equal lock |
| Expo dependency compatibility | PASS: installed `expo install --check`, offline; CLI warns offline validation is less reliable |
| Expo public configuration | PASS under explicit production/Android/disabled environment |
| Expo plugin introspection | PASS without regenerating native files; this is not Gradle merging/building |
| Android release and disabled-provider tests | PASS, including hostile provider configuration rejection and no checkout/order initiation in production harness |
| Native linking | PASS for Android Expo IAP discovery and RN WebView/PDF/BlobUtil discovery |
| Native input hashes | PASS: all Phase C pinned wrapper/POM/source hashes unchanged |
| Gradle/JDK startup | PASS: cached 9.3.1 `--offline --version`, temporary user home, explicit JDK 21 |
| `git diff --check` | PASS during suite and after report preparation |

The original `nonplay-test-isolation-selftest.cjs` fails at line 54 with `TypeError: getCurrentUser is not a function`. Its payment-service mock supplies `'./authState': {}`, while current `recoverPayment` evaluates `getCurrentUser()` as its default third argument before entering the isolated-test branch. The real Auth module exports that function; this is a test-harness mismatch, not an observed production crash. [Original failure](evidence/android-native-20261111/check-23.log).

A diagnostic execution with **only an in-memory mock replacement** (`getCurrentUser: () => uid ? {id: uid} : null`) passes all five existing suite groups. No test expectation, source file or application behavior was changed, and this diagnostic does **not** turn the original run into an all-green run. [Diagnostic log](evidence/android-native-20261111/nonplay-fixture-diagnostic.log). The reviewable correction is to update that one Auth mock and rerun the original suite; it remains outstanding to preserve all pre-existing files in this inspection task.

No standalone `expo-doctor` package was installed/cached at the inspected project/npm executable-cache locations. It was not downloaded; Expo config/introspection, SDK dependency validation and npm consistency checks were run instead. Full online doctor/registry vulnerability audit is not claimed. The closed-testing aggregate was not rerun because its individual suites were included; staging-target self-tests/configurations were excluded. Tests used fake HTTP/Auth/native adapters and synthetic prices; no hosted payment or production database test ran. Earlier real-PostgreSQL Phase B/C results are inherited, not rerun here.

## 9. Exact blockers and unresolved acceptance

| Item | Classification | Exact required action |
| --- | --- | --- |
| No usable local SDK | Local compilation blocker | Prefer approved EAS cloud build. Do not install a large SDK on this Chromebook without separate resource review/approval. |
| Missing Firebase file and FCM v1 credential | Production feature/release blocker; not proven compile failure | Owner supplies genuine package-specific inputs through existing EAS configuration and later validates push. |
| One stale isolated-test Auth mock | Regression verification blocker; not a proven native error | Review the single mock correction above; rerun the unchanged test expectations and retain clean results. |
| Obsolete final-bundle validator | Artifact acceptance tooling blocker | `mobile-app/scripts/inspect-android-bundle.py` currently asserts final BILLING permission is **absent** whenever `--manifest` is supplied. Review/update that expectation for the retained IAP design before using the tool. Do not remove Billing to satisfy this legacy assertion. |
| No current compiled dependency graph or AAB | Native correctness NOT VERIFIED | After separate build approval, compile once on EAS; retain dependency/manifest/R8/signature/ABI evidence for that exact binary. |
| Device behavior | Production acceptance NOT VERIFIED | Execute the checklist below on the exact approved artifact with separately authorized accounts/operations. |
| Backend/Google/provider readiness | Payment activation remains blocked | Follow Phase A/B/C owner review separately; do not deploy anything to build the disabled mobile candidate. |

The old artifact inspector can report dependency metadata/mapping without a manifest argument, but that omits its manifest assertions and is **not a workaround for final acceptance**. The earlier Billing-free v13 bundle and its validator were produced for an older source state. Keep their historical evidence unchanged.

Inherited broader release gates also remain open where documented, including offline paid-PDF encryption, managed hosted Auth/Storage behavior, privacy/operational acceptance and device performance. This audit does not certify or silently waive them. See [release gates](../RELEASE_GATES.md); its older alternate-environment instructions do not authorize staging access here.

## 10. Manual owner actions and safe next build command

1. Supply the actual Firebase Android file for **`in.medveda.app`**, through the supported local file or production EAS file-variable path; configure the matching FCM v1 service-account credential without changing payment or Android signing credentials. Verify its Firebase package/project before building. Re-resolve production config; local secret-file variables may be unavailable to CLI resolution, so also verify the worker's resolved file input.
2. Review the isolated-test Auth mock and final-artifact Billing-permission expectation corrections. Preserve all existing application fixes, prices and required native integration. Rerun their affected checks; no backend change is needed for either correction.
3. Review the exact mobile source snapshot to be packaged, including untracked plugins, release rules and service/test files. Confirm the EAS archive includes required source/assets and excludes secrets. Do not reset/stash/clean the dirty workspace. No upload archive was created by this task.
4. Confirm existing upload certificate and version-code expectations. Keep remote signing, package, `production` channel/runtime and provider unchanged. No version-set or credential-generate command is authorized by this report.
5. Obtain **separate explicit owner approval** for one cloud build. Current inspection authorization does not cover starting it.

Only after these prerequisites and that separate approval:

```sh
cd /home/ganeshp8545/AyurPulse/mobile-app
MEDVEDA_PAYMENT_PROVIDER=disabled eas build \
  --platform android --profile production \
  --non-interactive --freeze-credentials
```

The installed CLI supports `--freeze-credentials`; it prevents credential updates in non-interactive mode. The command intentionally starts only a build, with no auto-submit option. It was **not executed**. Profile auto-increment is an existing future build effect; no version was changed by this audit. Do not use `alpha-payment-validation`, non-Play, staging, preview or internal-testing as a substitute for the approved production profile.

After the approved build: record build ID, source hashes, SHA-256, versionCode and build-tool versions; validate bundle structure with bundletool; inspect the final manifest for identity/runtime/permissions/target SDK and disabled provider; check dependency resolution, 16 KB native-library alignment and R8 mapping; verify every signed payload using the existing Java signature verifier and compare the signer above. Retain mapping with the exact AAB. Install device-specific APKs generated from the AAB in an authorized acceptance environment; an AAB cannot be installed directly. No Play upload is required for this build-only review. Device APK signing must be recorded; a sideload must not be presented as Play-delivered Billing acceptance.

## 11. Exact real-device acceptance checklist — planned, not executed

Record binary SHA-256/build ID/versionCode/runtime/channel/signature, device model/ABI/API, WebView version, network, font scale and result for every case. Use at least a physical API 36 device and a lower supported API device; include a small screen, large fonts, rotation and available 16 KB-page hardware. Never uninstall an owner's daily-use application or overwrite offline content without their acceptance plan. Use separately authorized QA accounts with pre-existing entitlements; do not create an order, change a purchase record, invoke recovery workers or enable a provider.

| Area | Exact steps and pass criteria |
| --- | --- |
| Startup | Cold launch, warm resume, force-stop/relaunch and launch offline. Splash terminates; no native module/JNI crash, endless spinner or navigation loop; errors remain retryable. Check portrait/landscape and background/resume. |
| Login/signup | With separately approved QA Auth operations: empty/invalid input, correct login, invalid password, timeout/offline, session expiry, recovery deep link and duplicate taps. Clear feedback, one submit, correct destination, no session leakage. Signup creates an Auth record and is **not authorized by this audit**; schedule it only under a separate QA scope. |
| Course/year | Select, confirm, restart and reauthenticate; cancel/change selection and switch quickly during loading. Correct user/course/year persist; stale responses never overwrite the new context. Saving profiles needs separate QA authorization. |
| Free videos | Browse year → subject → chapter → video; open free video with/without external player; go back and rotate. No paywall/order/checkout; unavailable link or offline state has clear feedback. |
| Notes browsing | Browse valid and empty chapters; trigger timeout/offline then Retry; change course/year during load. Complete loading/error/empty states; no partial response treated as a definitive empty catalog. |
| Existing purchased Notes | Account A with an existing successful purchase sees its covered Notes and opens the authorized PDF online; cover chapter/subject/year/course scopes available in the approved fixture inventory. Buy Now remains disabled. Do not create or force entitlements for testing. |
| Store and Retry | Load normally; enter offline before load and during refresh; restore network and Retry; rapid taps/back/focus transitions. One effective refresh, useful error, no permanent spinner, stale state labeled appropriately. |
| My Purchases ordering | Compare pre-existing rows with known timestamps: newest first, equal dates deterministic, missing/invalid dates last. Preserve separate historical rows; verify local timezone display and refresh. |
| Account switching | Open A's Notes/history/PDF/download; log out and sign in as B while requests are pending, then switch back. A's data/access must never appear as B's; invalidate old callbacks and cached ownership. PDF authorization remains server-owned. |
| Offline/online | Disconnect/reconnect during login/catalog/PDF; background/resume and repeat Retry. No false purchase success; no stale ownership presented as current. Existing offline Notes obey owner/account/license/clock checks; an uncached paid PDF never becomes public. Offline encryption gate remains separately open. |
| Accessibility/TalkBack | Traverse Store/cards/options/errors/Retry/disabled actions with TalkBack; verify labels, roles, disabled state, focus order and loading announcements. Test 200% font/display scaling, dark theme, contrast and touch targets; no clipped price/status/action. Check Chapter Details overflow explicitly. |
| Permissions | Fresh install: deny notifications, then allow via Settings; app remains usable in both cases. No broad storage/media/overlay/camera/mic prompt. Verify final permission list against reviewed library manifest. After Firebase setup, separately approved push registration/delivery and tap routing must target the current account only. |
| Disabled Buy Now | Check Store, Notes options, cards, search, My Purchases, deep links and restored navigation routes. No order summary/checkout, Razorpay WebView/CDN, Billing purchase sheet or external payment link opens. No create-order endpoint is called; repeated taps and background/restore do not bypass the guard. Use nonsecret device/network diagnostics; do not exercise financial endpoints as probes. |
| PDF authorization/viewer | Authorized existing owner loads/rotates/zooms/pages/resumes PDF; expired URL retries via protected authorization. Wrong user, no entitlement, expired session and denied URL fail closed. No public URL or bearer-token logging; offline cached documents cannot cross accounts. Run large-PDF/low-memory and network interruption cases. |
| Restart | Restart while list/PDF requests are pending, while offline, and after session expiry. Correct account/course/year restore; no historical checkout route starts a new payment. Existing purchases reappear from authorized server history. |
| Reinstall/upgrade | With explicit device-data-loss approval, test upgrade from the owner's approved previous version, then uninstall/reinstall separately. After sign-in, historical purchases are fetched again; another user's local downloads/session do not survive. Document intended offline-download loss. No new purchase or native receipt purchase flow is needed. |
| Push/read permissions distinction | Token registration, marking notifications read and profile/Auth saves may write server records. They are future separately approved QA operations, not read-only inspection authorized in this task. |

Exclude all payment authorizations/captures, test charges, refunds, Google genuine-token/reporting tests, native choice launch, enrollment changes and provider flag changes until the payment release has its own approval. Existing purchased Notes acceptance must not be replaced with a new payment. Stop and record a defect on any gate bypass, cross-account content leak or unauthorized write.

## 12. Exact files changed and final decision

Pre-existing files changed/deleted by this task: **none**. The initial snapshot covers **1,564 pre-existing repository and generated-native input files**. [Preservation results](evidence/android-native-20261111/preservation.json) compare their hashes; [exact new-file manifest](evidence/android-native-20261111/artifact-manifest.json) enumerates this report and every new evidence file with SHA-256 (excluding the manifest's self-hash). Website/admin, earlier reports, migrations/functions, application source, profiles, native files and lockfiles remain unchanged.

New work consists only of this report and `docs/audit/evidence/android-native-20261111/`: initial hashes/Git inventory, prior-report inventory, environment/dependency/Billing observations, Expo public/introspection/autolinking outputs, EAS access/config/metadata, Gradle startup log, credential-free check runner/results/logs, metadata-only EAS collector, diagnostic log and final preservation/manifests. Temporary Gradle/version/config inspection files are under `/tmp`; no private signing material was downloaded.

**GO:** review the existing disabled-payment production profile, retained native integrations, available signing metadata and local fixes. **NO-GO now:** claim a verified production-compatible current-source AAB, initiate the unapproved cloud build, publish/submit, deploy backend artifacts or activate purchases. Missing Firebase and verification gaps need resolution; actual compilation and exact-binary/device acceptance then remain required. The next owner action is to provide genuine Firebase/FCM inputs, followed by the verification corrections and separately approved cloud build above.
