# Missing owner inputs and secure setup sequence

Date: 2026-11-11 UTC. Scope: local Android/Firebase/EAS preflight only. No cloud/native build, deployment, Console change, secret creation/upload, payment, production mutation or Play submission was performed. Existing P0/P1/P2 work is preserved.

| Priority/input | What the owner must supply or attest | Blocking scope |
|---|---|---|
| Firebase identity | Intended existing Firebase project ID, project number/sender and Android app ID; package `in.medveda.app` | Genuine client mapping; currently unknown |
| Original Android client JSON | Authentic matching download in secure local storage and production EAS GOOGLE_SERVICES_JSON file variable | Requested Firebase-enabled build; definitely unavailable locally |
| EAS access/environment | Access to `ganeshp0305/ayurpulse`, UUID `2d642c70-8ec1-4d7b-a388-2f2f99e8a8df`; private production-variable review | Cloud build; remote state unknown |
| Android upload signing | Existing accepted remote upload key and certificate fingerprint; appropriate recovery custody | Signed build; remote state unknown |
| Version baseline | Highest versionCode ever used for `in.medveda.app`, current remote version and next increment | Prevent version collision; unknown |
| FCM v1 server setup | Approved existing service account/key selected in Expo for this package; matching sender, API/IAM/restriction confirmation | Push delivery; not a compile dependency; remote state unknown |
| Network checks | Fresh Expo Doctor and dependency advisory results/accepted dispositions | Close preflight verification gaps |
| Build authorization | Separate approval for exact source/profile, cloud job/quota and version increment | No build may start in this session |

The Play submission service-account file, merchant credentials, payment/catalog activation and production migrations are not inputs for this build. OTA signing and Sentry credentials are optional features with separate owner policy decisions. Do not create any credential merely to satisfy this audit.

1. Privately open the existing Firebase project → Project settings → General → Your apps → Android. Confirm exact `in.medveda.app`, intended project ID and sender/project number, and Android app ID. Download the existing authentic `google-services.json` to `/secure/medveda/google-services.json` (example absolute path; substitute the actual secure path). Do not paste it into chat. If the app does not exist, stop and obtain separate authorization for Console registration. No Console changes are part of this handoff.

2. Validate structure locally without outputting the file or its values:

```bash
cd /home/ganeshp8545/AyurPulse/mobile-app
GOOGLE_SERVICES_JSON=/secure/medveda/google-services.json node -e 'require("./scripts/firebase-config.cjs").validateFirebaseConfig(process.env.GOOGLE_SERVICES_JSON,"in.medveda.app"); console.log("PASS: Firebase client structure and package")'
```

Privately compare the project identity with the owner-approved Console project; structure alone cannot attest authenticity. No local copy in the repository is necessary. If using `mobile-app/google-services.json`, it is already gitignored, but local presence alone does not send it to EAS.

3. In the EAS dashboard first inspect the production project-scoped variable metadata. If the correct file is already installed, retain it. If missing/wrong, the **owner**, under separately authorized configuration scope, may upload the existing client file using this supported installed-CLI command (sets/updates remote state; not run here):

```bash
cd /home/ganeshp8545/AyurPulse/mobile-app
eas env:set --environment production --scope project --name GOOGLE_SERVICES_JSON --type file --visibility secret --value /secure/medveda/google-services.json
```

The value is a path, not file contents. Do not enable shell tracing or use env export/list commands that reveal values. This command stores an existing client configuration; it is not service-account key generation. EAS materializes it as a path on the worker. Do not reuse a preview/development variable by assumption. [EAS variables](https://docs.expo.dev/eas/environment-variables/manage/).

4. Privately verify upload signing in Expo → project Credentials → Android `in.medveda.app`, or run `eas credentials --platform android` and select production. Confirm its public certificate fingerprint against Play Console → App integrity → upload certificate, and retain the separate Play app-signing certificate identity. Never send keystore/passwords to this chat or put them in eas.json. If no accepted key exists, stop: secure provisioning/recovery is a separately authorized owner step. The local debug key is unsuitable. [Expo credentials](https://docs.expo.dev/app-signing/app-credentials/).

5. Verify version baseline with `eas build:version:get --platform android --profile production` and existing Play records. `autoIncrement` is valid but cannot correct an unknown historical baseline automatically. If behind, obtain approval before using `eas build:version:set` to set the current baseline; never reset to local template code 1.

6. Independently inspect FCM v1 setup in the same Firebase project (Project settings → Cloud Messaging; API status) and Google Cloud IAM. Reuse an existing approved credential from secure owner custody. To select/upload it in Expo, the owner can use `eas credentials --platform android` → production → Google Service Account → Manage Google Service Account Key for Push Notifications (FCM V1) → select existing key or upload the approved existing key. Do not choose Google Play submission credentials. If a key/account/role/API is missing, stop and authorize its provisioning separately; no private-key-generation command is included. Keep service-account JSON outside the repository and app archive. [Official FCM v1 steps](https://docs.expo.dev/push-notifications/fcm-credentials/).

7. Rerun the safe checks in EAS_BUILD_PREFLIGHT.md and the payment/validator regressions. Review production flags and the exact source archive. Once inputs/signing/version/checks are accepted, request explicit build-only approval and run only the documented production command. FCM delivery/device QA may follow under its own authorization; do not confuse successful compilation with notification readiness or production readiness.
