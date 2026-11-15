# Android build preflight — owner handoff

Date: 2026-11-11 UTC. Scope: local Android/Firebase/EAS preflight only. No cloud/native build, deployment, Console change, secret creation/upload, payment, production mutation or Play submission was performed. Existing P0/P1/P2 work is preserved.

**Decision: NO-GO now for the requested genuine Firebase-enabled, payment-disabled AAB.** Local source checks pass within the recorded scope; genuine Android Firebase input and remote signing/version/environment verification remain outstanding. FCM v1 server credentials are a separate delivery gate, not a Gradle compilation dependency.

Read [BUILD_GO_NO_GO.md](BUILD_GO_NO_GO.md) for the ten answers and [MISSING_OWNER_INPUTS.md](MISSING_OWNER_INPUTS.md) for secure owner steps. Configuration and evidence:

- [ANDROID_CONFIGURATION.md](ANDROID_CONFIGURATION.md)
- [FIREBASE_FCM_REQUIREMENTS.md](FIREBASE_FCM_REQUIREMENTS.md)
- [EAS_BUILD_PREFLIGHT.md](EAS_BUILD_PREFLIGHT.md)
- [TEST_RESULTS.md](TEST_RESULTS.md)
- [AAB_VALIDATION_PLAN.md](AAB_VALIDATION_PLAN.md)
- `evidence/results.json`, `additional-results.json`, `eas-schema.json`, `resolved-config-assertions.json`, `input-presence.json`, `preservation.json`, `audit-inputs.sha256` and individual logs.

No application/config/dependency fixes were made during this audit. The repository was already dirty with verified remediation; no checkout/reset/clean/stage/commit was performed. Presence and preservation hashes were recorded without printing credential values or querying remote credential stores. Saved Expo/EAS evidence redacts the public backend key. These redacted preflight configs must not be used as the provenance snapshot of a future build.

Owner sequence: obtain the authentic client file and Firebase identity; privately verify production EAS variables, upload signing and version; complete Doctor/advisory checks on a network-capable host; review source/archive; request separate build-only authorization; then use the command in EAS_BUILD_PREFLIGHT.md. Notification delivery and release acceptance remain separate from permission to compile.
