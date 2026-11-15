# Android build GO / NO-GO

Date: 2026-11-11 UTC. Scope: local Android/Firebase/EAS preflight only. No cloud/native build, deployment, Console change, secret creation/upload, payment, production mutation or Play submission was performed. Existing P0/P1/P2 work is preserved.

**Current decision: NO-GO for starting the requested genuine Firebase-enabled EAS cloud AAB.** The preflight has no demonstrated new source defect within its local scope. Genuine-client input and remote EAS signing/environment/version evidence are incomplete, Doctor/advisory checks are blocked, and separate cloud-build authorization has not been given.

| Owner question | Answer and evidence |
|---|---|
| 1. Is Android source ready for a genuine build? | Conditionally ready as a local candidate: TypeScript, config/introspection, schema/autolinking and regressions pass. Native compilation is unproven; required genuine inputs and external checks remain. |
| 2. Is Firebase configured correctly? | Not established. Integration/validation code is present, but no genuine local client file/reference or owner-approved project mapping exists. Remote setup is unknown. |
| 3. Which genuine Firebase/FCM inputs are missing? | Locally: owner-approved Firebase ID/sender/app ID and authentic `in.medveda.app` google-services.json. Separately: confirmation of existing matching FCM v1 credential selected in Expo, API/IAM and client-key restrictions; remote absence is not proven. |
| 4. Are EAS production settings valid? | Yes structurally: installed CLI schema and profile resolution pass; AAB/store/production environment+channel/remote signing+version/autoincrement/disabled provider. Remote variables, cloud image and runtime effects remain unverified. |
| 5. Is signing ready? | Unknown. Only debug keystore is present locally and generated release Gradle uses debug signing. Intended EAS remote upload key/certificate must be verified against the existing app. |
| 6. Is payment-disabled configuration verified? | Yes locally: resolved provider disabled, production target/standard distribution, false enrollment flags and isolated runtime; hostile-provider/runtime/UI/service regression tests and validator negative tests pass. Exact compiled artifact remains to be tested. No payment was activated. |
| 7. Are native dependencies and permissions consistent? | Consistent at source/autolinking level, including retained IAP/Billing and Notifications/Firebase Messaging. Merged artifact graph, permissions, R8/ABI/16 KB are future checks. |
| 8. Which checks passed or failed? | 91/93 recorded commands pass; two infrastructure-blocked commands exit 1 (uncached offline Doctor; DNS failure for npm audit). EAS schema and 16 config assertions also pass. No assertion failure in completed functional tests. See TEST_RESULTS.md. |
| 9. What must the owner do next? | Complete MISSING_OWNER_INPUTS.md: genuine identity/client, private production file-var review, upload signer, version baseline, Doctor/advisories; verify FCM v1 separately. Review source/archive and request build-only approval. |
| 10. Can an authorized EAS cloud AAB build begin? | Not on current evidence. After build blockers are satisfied and separate authorization is recorded, the documented production command is appropriate. FCM v1 upload is a delivery gate rather than a Gradle requirement; explicitly defer push acceptance if it is not yet configured. |

Local safety checks passing do not authorize migrations, function deployment, payment activation, production traffic, credential generation, Console changes or Play upload. Existing P0 financial/recovery/backend release gates remain in force; a payment-disabled compilation need not resolve merchant/payment-activation gates. No protected release package was replaced.

Evidence: `evidence/results.json`, `additional-results.json`, `eas-schema.json`, `resolved-config-assertions.json`, `input-presence.json`, `preservation.json`. Source/config interpretation is bounded to this exact workspace snapshot and local tools; do not infer remote acceptance from it.
