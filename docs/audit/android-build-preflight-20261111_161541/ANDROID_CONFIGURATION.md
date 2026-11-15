# Android configuration and native consistency

Date: 2026-11-11 UTC. Scope: local Android/Firebase/EAS preflight only. No cloud/native build, deployment, Console change, secret creation/upload, payment, production mutation or Play submission was performed. Existing P0/P1/P2 work is preserved.

| Area | Observed configuration | Assessment |
|---|---|---|
| Sources | `mobile-app/app.json`, dynamic `app.config.js`, `eas.json` | Production resolution and introspection pass |
| Identity | MedVeda; slug `ayurpulse`; owner `ganeshp0305`; Android `in.medveda.app`; scheme `medveda` | Consistent locally; owner must confirm EAS access |
| EAS project | `2d642c70-8ec1-4d7b-a388-2f2f99e8a8df` | Update URL uses same UUID; this is not the Firebase project ID |
| Version | app/package `1.2.2` | Remote Android versionCode, autoIncrement true; latest used Play code unknown |
| Runtime | `1.2.2-disabled-notes-choice-v1` | Separates this Android binary from enabled-payment runtimes |
| Toolchain | Node 22.23.1, npm 10.9.8, Java 21.0.12.1, EAS CLI 24.14.0 | Local tooling available; installed CLI satisfies `>=12.0.0` |
| Framework | Expo 57.0.32, React Native 0.86.3, React 19.2.3 | Installed top-level graph and Expo offline compatibility check pass |
| Android defaults | RN catalog minSdk 24, target/compile 36, build-tools 36.0.0, NDK 27.1.12297006, AGP 8.12.0 | Source defaults only; exact cloud graph remains to be compiled/inspected |
| Release | R8 minify and resource shrink true; optimize ProGuard template; narrow Pdfium JNI rules | Preserved; mapping/manifest-merger artifacts requested |
| Security/layout | cleartext false, backup false, unspecified orientation, resizable true, adjustResize | Production introspection assertions pass |
| OTA | Updates enabled, correct project URL/runtime; no local code-signing certificate | OTA code signing is not configured locally; separate owner policy gate, not Android keystore signing |
| Sentry | Optional plugin activates only when SENTRY_AUTH_TOKEN exists; requires SENTRY_ORG and SENTRY_PROJECT | No relevant process variables here; remote values unknown; optional for build |

`mobile-app/android/` exists but is ignored. There is no `.easignore`; EAS normally follows Git ignore rules. The local generated `app/build.gradle` has versionCode 1 and release signingConfig.debug, with only the stock debug keystore present. Neither proves a release-ready signer or remote version. Do not distribute a locally compiled template artifact. Intended EAS store builds use remote credentials and inject signing/version after native generation. Verify the actual upload archive excludes generated android/ios; do not force-add them. Untracked remediation source and plugins must be included in the reviewed build snapshot.

Permissions are layered: app.json explicitly requests INTERNET and POST_NOTIFICATIONS, and removes SYSTEM_ALERT_WINDOW, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, READ_MEDIA_IMAGES and DOWNLOAD_WITHOUT_NOTIFICATION. Introspection adds VIBRATE and removal directives. It is not the merged library manifest. Retain `com.android.vending.BILLING`; it is provided by the retained native IAP dependency and required by the validator. Its absence from the app manifest or from the disabled-provider plugin list is not permission to remove it.

Android autolinking confirms `expo-iap` 3.4.4 and `expo-notifications` 57.0.25. The IAP Gradle file resolves OpenIAP Google 1.3.26. Expo Notifications declares Firebase Messaging 25.0.1. PDF/BlobUtil/WebView, Reanimated/Worklets, secure storage, SQLite, Updates and screen capture dependencies remain unchanged. No additional React Native Firebase package or standalone Firebase JS SDK is required for this existing Expo-token architecture.

The exact allowlist in `mobile-app/scripts/inspect-android-bundle.py` covers Billing, notification/network/wake/boot/screen-capture, reviewed vendor badges, biometric/install-referrer and the app-scoped AndroidX receiver permission. It uses exact names and catches sdk-qualified permission declarations. Every new merged permission requires review. Actual Maven resolution, merged manifest, native ABI/linking, R8/JNI behavior and 16 KB support remain artifact/device gates; npm/autolinking checks cannot establish them.

Reference: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Android build process](https://docs.expo.dev/build-reference/android-builds/), [remote versioning](https://docs.expo.dev/build-reference/app-versions/). SDK defaults above come from the installed RN catalog, not an assumption about the cloud image.
