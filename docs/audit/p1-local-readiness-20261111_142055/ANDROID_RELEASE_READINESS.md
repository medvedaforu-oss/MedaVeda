# Android release engineering

Date: 2026-11-11 UTC. P1 local only. Synthetic accounts/payments and isolated PostgreSQL; no production/staging calls, financial APIs, deployment, payment activation, cloud/native build, credentials upload or publication. Production purchases remain disabled. Local verification is not production acceptance.

**Static/local checks pass; native compilation and exact binary acceptance are NOT VERIFIED.**

| Input | Current evidence / status |
|---|---|
| Expo / React Native / React | Installed and locked: Expo 57.0.32, RN 0.86.3, React 19.2.3; root declarations equal lockfile; npm tree and offline Expo compatibility check pass. Offline compatibility cannot replace registry/real native acceptance. |
| TypeScript | Mobile TypeScript 6 noEmit passes; admin application typecheck also passes. |
| Identity | Production config: `in.medveda.app`, name MedVeda, version 1.2.2, scheme `medveda`. |
| Environment | Resolved only explicit production EAS env, Android, `EXPO_NO_DOTENV=1`, telemetry off/offline; no live backend read. Provider disabled; standard production target; both UCB approval flags false. |
| Profiles | Production AAB, EAS production environment, `production` channel, remote version source, autoIncrement true. Internal/shrink profiles also reject enabled provider overrides. Alternate profiles were not used as build substitutes. |
| Runtime | Android `1.2.2-disabled-notes-choice-v1`; iOS/root appVersion policy remains separate. Native payment/runtime identities preserved. |
| Version code | Remote source; highest uploaded/remote current code **NOT VERIFIED**. Earlier artifact/metadata code 13 is inherited only. Generated local template code 1 is not release version evidence. Owner must refresh highest code before build. |
| Signing | Earlier default remote JKS metadata/fingerprint retained; no new credentials query/download/change. Generated native release uses debug signing template and must not be directly submitted. EAS signing injection remains future acceptance. |
| Plugins | Notifications, secure store, splash, screen/status UI, SQLite, font, WebBrowser, datetimepicker, Android queries, release Gradle and optional Sentry plugins resolve/introspect. Firebase path now validates supplied structure and exact resolved package. |
| Native Billing | expo-iap 3.4.4 retained and autolinked. OpenIAP Google 1.3.26; retained POM declares billing-ktx 8.3.0, Kotlin stdlib 2.2.0. Five installed IAP inputs match previous hashes. Actual Gradle resolution is **NOT VERIFIED**. |
| Gradle/Kotlin | Generated source/build-properties inspected; installed RN/Expo version catalogs drive actual toolchain. No dependency download or Gradle native task performed. Future worker must retain actual AGP/Gradle/JDK/Kotlin/NDK versions and dependencyInsight. |
| R8 | Minification/resource shrinking enabled; optimize ProGuard template; narrow PDFium JNI rules; mapping/log artifacts requested by profiles. Real R8/JNI/reflection behavior unverified. |
| Hermes / architecture | Generated configuration enables Hermes and new architecture; requested ABI list arm64-v8a, armeabi-v7a, x86, x86_64. Actual emitted ABIs remain unverified. |
| 16 KB | ELF LOAD alignment, APK ZIP alignment and 16 KB device execution **NOT VERIFIED** without current artifact. No inference from Expo/RN version alone. |
| Permissions | Explicit INTERNET/POST_NOTIFICATIONS; overlay/broad storage/media blocked. Native IAP BILLING must remain. Notifications/biometric/network/install-referrer/badge permissions require final merged-manifest review using the inspector allowlist. Introspection is not Gradle library manifest merging. |
| Deep links | `medveda://reset-password` limited linking; deep-link/auth/route-validation tests pass. Untrusted notifications cannot navigate directly to PDF/payment routes. App Links/domain verification is not configured or claimed. |
| Notification/update config | Expo Notifications retained; Firebase missing; update URL/channel/runtime inspected. Optional OTA signing certificate absent/present only by actual owner file; no certificate invented and no update published. |

`evidence/expo-public.json`, `expo-introspect.json`, `autolinking.json`, `dependency-inventory.json`, `billing-inputs.json`, `local-native-inputs.json` and static logs retain the inspected inputs. Public config has publishable backend values, not private service credentials. No dotenv file was bundled by verification.

The already-corrected bundle validator requires retained Billing and disabled production config together. Eleven validator test methods (including parameterized denials) pass. It is a fixture-tested inspection tool, not proof of an installable AAB or native Billing execution. Follow the acceptance plan to bind it to a future exact signed binary.

The local SDK roots are absent, or `/usr/lib/android-sdk` has no platforms/build-tools. No large SDK install, prebuild/native regeneration, native build, emulator or EAS build was attempted. The source review package is deliberately labeled **unbuilt**.

References read before implementation: [Expo 57](https://docs.expo.dev/versions/v57.0.0/), [versioned Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [EAS environment variables](https://docs.expo.dev/eas/environment-variables/), [Android 16 KB guidance](https://developer.android.com/guide/practices/page-sizes). The Android guidance requires inspecting native libraries and testing a 16 KB environment; source version labels are insufficient.
