# Password recovery MFA fix — local verification

Status: PASS for local implementation and automated checks; ready for staging testing.

The recovery flow imports the recovery session, reads its assurance level, lists existing verified TOTP factors when MFA is required, and uses `challengeAndVerify` on the same client. It confirms AAL2 after verification and rechecks assurance before password mutation. Accounts without MFA retain the password reset flow. No factor is enrolled, replaced, or removed.

A server `insufficient_aal` response forces a fresh challenge even if cached claims report AAL2; that requirement survives network failures. Session expiry blocks further password submissions. Missing/unsupported factors direct users to support. Invalid codes, rate limits, and network failures use fixed messages selected by structured codes. Synchronous submission guards exist in the controller and both UIs. OTPs clear after each attempt; password fields and recovery-link references clear at terminal states. No auth payloads are logged. Successful updates sign out; if sign-out fails, a separate cleanup action retries sign-out without repeating the password update.

## Files changed

- `mobile-app/src/features/auth/recoveryFlow.js` — shared recovery controller (canonical source).
- `mobile-app/src/features/auth/recoveryFlow.d.ts` — typed controller interface.
- `mobile-app/src/features/auth/authService.ts` — recovery factory; sanitized recovery-link errors.
- `mobile-app/src/screens/auth/ResetPasswordScreen.tsx` — MFA, retry, help, and cleanup UI; no reset error logging.
- `mobile-app/src/features/auth/ResetPasswordScreen.tsx` — legacy path re-exports the active screen.
- `mobile-app/scripts/password-recovery.test.cjs` — controller, website/mobile interaction, and SDK tests.
- `mobile-app/package.json` — `test:password-recovery` command.
- `website/assets/js/recovery-flow.js` — generated copy of the shared controller.
- `website/assets/js/reset-password.js` — website controller integration and submission guards.
- `website/assets/js/auth-common.js` — MFA and cleanup display states.
- `website/_src/pages/reset-password.html` — MFA form, factor selection, support, and retry UI.
- `website/reset-password.html` — generated reset page.
- `website/assets/css/site.css` — matching MFA field styles.
- `website/scripts/build.mjs` — copies the canonical controller into website assets.
- `website/README.md` — source/build/test instructions.
- `docs/security/PASSWORD_RECOVERY_MFA.md` — this report.

## Verification

- PASS: `npm --prefix mobile-app run test:password-recovery` — 26 recovery tests and 24 password-pattern checks; matching password policies and existing server-policy declarations also pass.
- PASS: `cd mobile-app && node node_modules/typescript/bin/tsc --noEmit`.
- PASS: focused ESLint on changed mobile TypeScript files.
- PASS: `node website/scripts/build.mjs` — 17 pages generated. Unrelated sitemap date churn was discarded.
- PASS: `node website/scripts/check-links.mjs` — 17 pages checked.
- PASS: JavaScript syntax checks and `git diff --check`.
- PASS: offline Android release export using Expo/Metro/Hermes; output in `/tmp/medveda-mfa-android-export`.

Tests cover MFA and non-MFA recovery, valid/invalid/malformed TOTP, verification without an AAL upgrade, missing factors, expired/revoked sessions, assurance downgrade, `insufficient_aal`, network/rate-limit failures, duplicate submissions, policy errors, successful password change, and sign-out retry. Actual website/mobile UI code is exercised with deterministic adapters. The installed Supabase SDK is exercised with intercepted HTTP responses to verify refresh of an expired access token and use of the MFA-upgraded JWT for `PUT /auth/v1/user`.

## Staging validation still required

No live Supabase verification, email delivery test, deployment, or native signed APK/AAB build was performed. The Android check is a production JavaScript/Hermes bundle export. Browser DOM and mobile native UI interactions were simulated, so real browser/device accessibility, keyboard behavior, and email/deep-link handoffs still need staging checks.

Use staging accounts with and without verified TOTP. Check correct/wrong codes, lost-factor help, expired email links, expired/revoked recovery sessions, slow/offline retries, successful sign-out, and login with the new password. Unsupported factors intentionally fail closed with a support message. The website's pinned SDK version is unchanged; its actual CDN-loaded behavior must also be exercised in staging.

No MFA setting, service-role credential, database RLS, Supabase Auth configuration, environment file, or production deployment was changed.
