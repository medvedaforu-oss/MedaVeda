# EAS production build preflight

Date: 2026-11-11 UTC. Scope: local Android/Firebase/EAS preflight only. No cloud/native build, deployment, Console change, secret creation/upload, payment, production mutation or Play submission was performed. Existing P0/P1/P2 work is preserved.

The installed EAS CLI 24.14.0 parser accepted eas.json and resolved all nine Android profiles (`evidence/eas-schema.json`). Production resolves to `credentialsSource: remote`, `distribution: store`, environment/channel `production`, `buildType: app-bundle`, autoIncrement true and remote appVersionSource. No custom Gradle command bypass or development client is selected. Mapping/release and manifest-merger outputs are retained. The CLI reports a newer version is available; no upgrade was attempted. Use a vetted CLI and rerun these checks if changing versions.

Production env in `mobile-app/eas.json` contains only the existing public backend URL/publishable key and MEDVEDA_PAYMENT_PROVIDER=disabled. The public key is a client identifier, not a server credential; no value is repeated in this report. GOOGLE_SERVICES_JSON is read dynamically, not declared inline. Secret file variables are materialized on the EAS worker, and secret values are unavailable to local EAS config resolution. This explains why local absence does not disprove remote setup. A local GOOGLE_SERVICES_JSON reference must point to a readable genuine file or config resolution fails. Do not set it to raw JSON.

Remote project/account variable names, scopes, values and visibility remain unverified. In the private EAS dashboard, check production values and inherited account variables without exporting/printing them. Check GOOGLE_SERVICES_JSON type=file, production, correct project; verify MEDVEDA_BUILD_TARGET is absent or production, MEDVEDA_DISTRIBUTION absent or standard, enrollment/acceptance flags absent or false, and no screenshot-block bypass. No private backend/payment/FCM service-account material may enter client config. Payment-enabled production profiles throw, but auxiliary flags are additionally checked by the bundle validator; a valid eas.json schema does not guarantee safe remote overrides.

`internal-testing` is another payment-disabled AAB, but uses preview environment/channel and target same-project. It is not the production acceptance configuration. `shrink-test` produces an APK. The other staging/alpha/non-Play profiles are outside this build; staging keys remain placeholders and alpha deliberately fails until its separate approvals. Do not substitute these profiles to bypass blockers.

Safe owner checks after obtaining genuine input, from the mobile directory:

```bash
cd /home/ganeshp8545/AyurPulse/mobile-app
eas whoami
eas project:info
eas build:version:get --platform android --profile production
node node_modules/typescript/bin/tsc --noEmit
npm ls --depth=0 --offline --ignore-scripts
node node_modules/expo/bin/cli install --check
npx expo-doctor
npm audit --omit=dev --audit-level=high
```

Run network-dependent checks on an approved network-capable workstation. Do not run `expo install --fix` or `npm audit fix` automatically. Review advisories against retained fixes. EAS account/project/version reads do not authorize credential changes. Privately inspect signing using `eas credentials --platform android` → production; do not choose generation/replacement/download options during read-only verification. Existing-app builds require the accepted upload key; do not replace it because the local workspace lacks a keystore. Verify highest-ever-used Play versionCode and remote next code is strictly greater. Any remote version correction is an owner change requiring separate scope.

Do not run prebuild in this workspace or build with its ignored debug-signing Android template. Before upload, inspect the reviewed EAS source archive for all remediation/plugins, lockfile, assets and rules; ensure ignored generated native folders, env files, machine credentials and protected backend delivery artifacts are not inadvertently included in the mobile app archive. No archive upload was performed. Cloud image is not pinned; require SDK 57 support and record the exact selected image/JDK/SDK/NDK in future build logs.

**Future build command — NOT executed; requires separate build-only authorization and satisfied blockers:**

```bash
cd /home/ganeshp8545/AyurPulse/mobile-app
eas build --platform android --profile production --non-interactive
```

Use no `--auto-submit`, `eas submit`, `eas update`, `--local`, payment flags or alternate profile. Non-interactive mode prevents interactive credential provisioning; preconfigure credentials privately first. The authorized cloud build may consume quota and increment remote versionCode; authorization must cover those effects. Preserve the exact reviewed source hashes, production environment/config snapshot, genuine-client hash privately, CLI version, build ID, selected image, signer fingerprint and AAB digest. Run AAB_VALIDATION_PLAN.md after artifact download. A completed build is not authorization for Play upload or runtime writes.

Sources: [EAS configuration](https://docs.expo.dev/eas/json/), [environment visibility](https://docs.expo.dev/eas/environment-variables/usage/), [Android build lifecycle/signing injection](https://docs.expo.dev/build-reference/android-builds/), [remote versions](https://docs.expo.dev/build-reference/app-versions/).
