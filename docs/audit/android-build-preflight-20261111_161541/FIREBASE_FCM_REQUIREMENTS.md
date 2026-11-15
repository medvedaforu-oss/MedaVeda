# Firebase client and FCM v1 requirements

Date: 2026-11-11 UTC. Scope: local Android/Firebase/EAS preflight only. No cloud/native build, deployment, Console change, secret creation/upload, payment, production mutation or Play submission was performed. Existing P0/P1/P2 work is preserved.

**No genuine Android Firebase client configuration is available in this workspace.** `mobile-app/google-services.json` is absent; GOOGLE_SERVICES_JSON is unset in this process; resolved production config contains no android.googleServicesFile. No client JSON was found in the native source tree. Remote EAS variables and uploaded credentials were not inspected. Their absence remotely is not established.

The expected Firebase project ID, project number/sender ID and Android Firebase app ID are unknown. The owner must identify the existing intended project and confirm its Android application is exactly `in.medveda.app` (case-sensitive). Neither the EAS UUID nor either backend project reference establishes Firebase identity.

| Input | Consumer | Required mapping | Status |
|---|---|---|---|
| Genuine `google-services.json` | Native Google Services plugin / Firebase Messaging client | One matching Android client for `in.medveda.app`; correct owner-approved project | Missing locally |
| FCM v1 Google service-account JSON | Expo Push Service service credentials for this app identifier | Authorized to send for the same Firebase sender/project | Remote upload/validity unknown; never embed in app |
| Android upload keystore | EAS native signing | Expected upload certificate for existing Play application | Remote status unknown; unrelated to FCM service account |
| Play submission service account | EAS Submit only, `./google-play-service-account.json` | Play API access if a later upload is authorized | Absent locally; not required to compile an AAB |
| Expo push access token | Backend only if Expo enhanced push security is enabled | Correct Expo project | Policy/status not inspected; never EXPO_PUBLIC |

Expected Android client fields, with no invented values: `configuration_version` = string `1`; `project_info.project_id` = owner-approved Firebase ID; `project_info.project_number` = numeric string sender ID; exactly one `client[].client_info.android_client_info.package_name` matching `in.medveda.app`; matching `client_info.mobilesdk_app_id` starting `1:<project_number>:android:`; a nonempty `client[].api_key[].current_key`. Console downloads may have additional OAuth/storage fields. Do not handcraft or use a web Firebase config or service-account JSON in place of this file.

`app.config.js` prioritizes GOOGLE_SERVICES_JSON (a path), then the local `./google-services.json` if present. `scripts/firebase-config.cjs` checks readable JSON, project metadata, one package match, app ID prefix and key metadata. Wrong package/project-number-to-app-ID, duplicate clients and malformed/missing files are tested. It does **not** pin an owner-approved project ID, verify Google provenance, API-key validity/restrictions or cloud IAM. A well-formed fabricated file could satisfy structural checks; only the authentic owner download plus Console comparison establishes the intended project. The config allows complete absence, so successful Expo introspection alone is not Firebase readiness.

The app calls Expo `getExpoPushTokenAsync` with the EAS project UUID. Expo Notifications supplies the native Firebase Messaging dependency. Channel creation precedes Android notification permission; login/account-generation/refresh/logout guards and navigation regression tests pass. No genuine token was requested or sent. FCM v1 server credentials are required for delivery through Expo, not to compile client resources.

A service-account credential normally has `type: service_account`, `project_id`, `client_email`, `private_key_id`, `private_key` and `token_uri`. These fields identify a server credential, not an Android client file. Check them only within approved private tooling; never print them or reuse the Android API key as a server credential. A syntactically valid key does not establish validity, revocation state or IAM authorization.

Owner verification: Firebase Cloud Messaging API enabled for the target project; existing approved service account authorized for FCM sends (Expo documents Firebase Cloud Messaging API Admin); valid key uploaded/selected under Expo project → Credentials → Android `in.medveda.app` → FCM V1 service account key. Prefer the same Firebase project for client and service account. If cross-project sending is intentionally used, require explicit target-project IAM evidence rather than assuming matching credentials. Do not grant broad Owner/Editor merely to pass setup.

Client API restrictions must allow Firebase Installations and FCM Registration. If Android certificate restrictions are used, include the appropriate certificate for the installation channel: Play-distributed APKs use the Play app-signing certificate; locally installed test APKs use their own signing certificate. A restricted key bound only to the upload key can fail after Play signs the install. A service-account private key belongs only in the server credential store, never Expo extra, assets, EXPO_PUBLIC variables, Git or reports.

Owner steps and commands are in MISSING_OWNER_INPUTS.md. If no matching Firebase app/account/API access exists, record that as a blocker; any creation, IAM/API change or credential generation requires a separately authorized owner operation. Nothing was changed here.

After a later authorized build, separately approve QA accounts/device writes before token registration and delivery testing. Verify permission denial/grant, token refresh, foreground/background/killed delivery/taps, logout/A→B→A, tickets and final receipts, dead-token cleanup and credential-failure alerting. Do not send private targeted content: existing server safety keeps broadcasts non-sensitive. No receipt worker/schedule was enabled.

Sources: [Firebase Android setup](https://firebase.google.com/docs/android/setup), [Google Services mapping](https://firebase.google.com/docs/android/google-services-plugin-and-file), [Expo FCM v1 setup](https://docs.expo.dev/push-notifications/fcm-credentials/), [Expo ticket/receipt errors](https://docs.expo.dev/push-notifications/sending-notifications/).
