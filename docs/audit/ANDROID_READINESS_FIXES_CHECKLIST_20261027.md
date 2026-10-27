# Android regression checklist — readiness fixes, 27 October 2026

Manual tests below have **not** been executed by this coding pass. Record device,
Android version, app version/versionCode, source revision, account/course and
UTC time. Use synthetic accounts and an explicitly approved environment. Keep
tokens, passwords, personal data and purchase receipts out of shared evidence.
Use the actual release/internal build, including a low-memory phone and a tablet.

## Authentication and recovery

- [ ] Cold launch with and without a saved session; verify Login/Home/onboarding
  routing and maintenance/update gates, with no unexpected sign-out.
- [ ] Register, email verification/OTP, existing/nonexistent-account OTP, email
  and mobile login; wrong-password lockout, expiry and successful recovery.
- [ ] Forgot/reset from warm app, killed app and website bridge; expired/used
  link, invalid token, MFA challenge where applicable, retry and URL cleanup.
- [ ] Sign out/re-login and switch accounts/courses; no previous user's search
  history/index, ownership or downloaded content becomes accessible.

## Notification routing

- [ ] Tap a valid Home/Notifications notification while foregrounded, then from
  background. Exactly one navigation occurs for one response.
- [ ] Terminate the process, open via a notification, and verify the launch
  response waits for Splash/auth/onboarding and then opens its destination.
- [ ] While signed out, tap a notification; Login remains visible. Complete
  login/onboarding and verify the pending destination opens afterwards.
- [ ] During password recovery, a notification must not dismiss the reset flow;
  verify the pending destination after normal authenticated navigation resumes.
- [ ] Try unknown screen, missing parameters, wrong parameter types, missing
  Years mode, invalid Chapters mode and arbitrary payment/PDF URL targets.
  Expect Notifications/Home fallback, no crash and no payment/access bypass.
- [ ] Verify valid Years modes and subject/chapter/video/quiz routes using real
  fixture IDs. Content authorization must still respect course/publication.
- [ ] Leave/re-enter navigation via a gate; verify listener cleanup and absence
  of duplicate navigation. Revoked notification permission must not break launch.

## Lists, offline errors and retry

- [ ] For Years, Subjects, Chapters, MCQ Tests, Notes and chapter options, induce
  a failed first fetch: persistent error and Retry, no misleading empty result.
- [ ] Go offline with no cache and with a cached empty list. Expect an offline
  error/retry state in both cases.
- [ ] Go offline with nonempty saved Years/Subjects/Chapters. Saved rows remain
  usable and the failed refresh has an error/retry message above the list.
- [ ] Reconnect and Retry. A successful response clears the error; a genuinely
  empty successful response uses the original empty UI.
- [ ] Change route/course while a slow request is pending; old data/error/loading
  completion must not overwrite the new route.
- [ ] Scroll Home, Notes, Videos, Chapters and Store quickly in both directions;
  verify rows load without lasting blanks, clipped text or broken horizontal
  swipes. Repeat with large font settings, TalkBack and slow/low-memory device.
- [ ] Check Notes progress/opening/downloading buttons during progress updates;
  correct item/action/state must survive search filtering and list recycling.

## Free video/MCQ, notes and search

- [ ] As a nonbuyer, open videos through subject, chapter hub and search, with
  and without YouTube installed. Check malformed-link handling and first tap
  while the keyboard is visible. No lock/premium/purchase message for videos.
- [ ] As a nonbuyer, start/finish a free MCQ, download/remove it, complete it
  offline and reconnect; verify pending sync and server-verified scoring.
  No paid-MCQ gate or correct-answer leakage is introduced.
- [ ] Notes preview, unowned-note denial, existing owned-note read/download,
  purchase UI and downloaded-note open/remove remain unchanged. Include failed
  signed URL, interrupted download, expiry, logout and account-switch cases.
- [ ] Complete separately approved provider purchase/restore/refund regression
  tests under the existing release checklist; this pass did not change or
  qualify billing, settlement, grants, referrals/wallet or PDF encryption.
- [ ] Open Search without typing: show welcome/recent/cached discovery without
  a nine-source index build. First query builds; further typing reuses it.
- [ ] Reopen after three minutes, pull to refresh, search offline with saved
  results, and switch account/course. Verify correct ownership flags and routes.
- [ ] Exercise a fixture catalog above 2,000 rows and items in later pages;
  no missing/duplicated entries. Above the 10,000-row/type guard, expect a safe
  error rather than a silent partial index or crash.

## Contact, deletion, privacy and monitoring

- [ ] Contact and drawer show only real social options; no Facebook Coming Soon
  action. Email/WhatsApp/other configured links open correctly.
- [ ] Privacy and current hosted privacy/deletion pages match the source
  inventory, cutoff wording, child-consent caveat and actual deletion steps.
  Confirm hosting serves `website/`, not the old duplicate root HTML files.
- [ ] Delete a synthetic account, including a partial-failure/retry scenario.
  Verify denial after the account/IP limits, Retry-After behavior and recovery
  after 15 minutes. Confirm other users and provider/webhook flows are unaffected.
- [ ] Verify actual Auth/data/download cleanup and retained financial/identity
  exceptions. Clear app storage to inspect removal of remaining local copies.
- [ ] Build without SENTRY_AUTH_TOKEN: no upload hook/token requirement. Build
  with the configured EAS environment: verify map upload and a sanitized event
  resolving to the correct source line/release/distribution, then alert receipt.
- [ ] Inspect launcher icon/adaptive icon/splash on the final native artifact.
  Source PNGs were deliberately left unchanged.

Retain the broader [release checklist](../../REAL_DEVICE_RELEASE_TEST_CHECKLIST.md)
and [October 26 readiness audit](MEDVEDA_PRODUCTION_READINESS_2026-10-26.md) for
native signing, 16 KB, hosted authorization, backups, providers and Console gates.
