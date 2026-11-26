# Standalone Play integration — 2026-11-23

Authority: user's implementation specification. Work directly in the existing app; preserve all pre-existing edits. No native compilation, commits, deployment, migrations, credential replacement or build submission.

1. Reuse the isolated recovered lifecycle factory and offer selector. Remove UCB APIs entirely. Add an app adapter with account epochs, durable attempts and server-only entitlement verification/consumption. Test standalone initialization, ownership, duplicate events, cancellation, pending, retries and process death using synthetic native/HTTP ports.
2. Route only the exact Play testing distribution/profile/runtime to Play. Keep existing Razorpay configuration and checkout behavior. Use a separate Play summary with Google's price; preserve current Razorpay summary. Reconcile on launch/resume and My Purchases.
3. Prepare a separate standalone test-order endpoint based on existing create-play-order with a default-off server gate and authenticated tester UUID allowlist. Reuse current verification/settlement unchanged. Do not enable UCB gates or alter existing server files.
4. Pin recovered expo-iap 3.4.4 only. Isolate native inclusion to Play builds. Add store AAB test profile, remote existing credentials, no auto increment/submission, preview environment, unique OTA runtime/channel and disabled OTA updates. Exclude generated artifacts and secrets from upload.
5. Run focused lifecycle, routing, backend and TypeScript checks. Inspect EAS auth/credential metadata and Firebase without printing secrets. Record concrete remaining gates and license-test cases before requesting any deployment or build authorization.

Review focus: stale account epochs, pending receipt retention, response truthiness, accidental Razorpay routing, inherited EAS env and duplicate entitlement/consumption.

Ruling: user's explicit implementation instruction supersedes skill design-approval, worktree, commit and full-suite defaults. No extra checkout is created given storage limits and existing edits.
