# Android regression and performance checklist — 27 October 2026

For `perf-size-1`; [measurements and build/size procedure](MEDVEDA_PERF_SIZE_2026-10-27.md).
**All device checkboxes are pending.** Native runtime acceptance is still pending.
Cloud production before/after builds and matching shrink/control builds completed;
sizes, API 36, signatures and static 16 KB checks pass in the
[native artifact report](MEDVEDA_NATIVE_SIZE_2026-10-27.md). Device checks below
remain separate from those completed static checks.
Record revision, AAB SHA-256, versionCode, signing fingerprint, device model/ABI,
Android version/page size, network, clean/upgrade install and account type.
Compare with a build of `99c91a4` using the same dependencies/profile/toolchain.

## Identical behavior and UI

- [ ] Clean launch and upgrade: same icon/adaptive icon/splash, branding/colors,
  password eye icons, drawer/contact social glyphs, font scaling and layout.
  First open of every deferred screen works without blank frames, missing native
  modules or missing glyphs. Open each screen again and verify retained state/back.
- [ ] Login/register, email/mobile OTP, wrong password, lockout expiry, resend,
  existing/nonexistent account behavior and onboarding course/year selection.
- [ ] Forgot/reset password: cold/warm email deep link, expired/used link, password
  policy, MFA handoff, recovery precedence over Splash/Home, Android back.
- [ ] Home: every year/product strip, recommendation/latest/recent sections,
  ownership display, unread bell and pull-to-refresh; empty/error/offline states.
- [ ] YouTube video open with/without YouTube installed; keyboard-visible tap,
  malformed/legacy video URLs, free video cards and Android back.
- [ ] Free MCQ: list, question/review/result, online and offline practice,
  queued attempt, reconnect and kill/relaunch; exactly one server verification,
  no answer keys in downloaded content or search. Quiz screen now loads on demand.
- [ ] Notes: preview flag and legacy first-preview fallback, locked purchase UI,
  every purchase scope, notes search, order, download/progress/pause/resume/retry,
  storage full, interrupted process and corrupt file. Existing integrity/access
  checks must still deny unauthorized or expired access.
- [ ] PDF: first/repeated online preview, owned download/local open, large PDF,
  page controls/zoom, offline expiry/rollback, refund/block/revocation and screenshot
  protection. Test native viewer separately on 16 KB Android.
- [ ] Store/checkout/referral/settings: first navigation, repeated navigation,
  Android back, existing state, prices, all normal buttons. Use Play internal-track
  license testers for success/cancel/failure/pending/restore/duplicate callback;
  compare server verification/grants exactly. This patch changes only navigator
  import timing for these screens; their business logic is unchanged.
- [ ] Search: empty cold open, first query, typing/debounce, filters, every result
  type, opening/failed opening, saved offline index, explicit refresh, 15-minute
  reuse, more than one catalog page, course change and account switch.
- [ ] Notifications: permission accepted/denied/revoked; foreground, background
  and killed-app taps; route/parameter validation, initial-response/live race,
  deduplication, unauthenticated tap through login. Mute a category, mark read,
  archive, return Home and verify list/badge agree. Test reminder scheduling/reboot.
- [ ] Notification/year reads under stalled networking: reopen or retry after
  one second; a new request can start. Resolve the older request late while the
  newer request remains pending. No stale paid access may appear.
- [ ] Maintenance on/off, offline/timeout/retry, force-update required/not required
  and store URL; resume checks and fail-open/last-confirmed semantics remain.
- [ ] Logout/account switch: no previous student's files, entitlement display,
  profile or search index leaks; new account's years/notifications use new reads.
- [ ] Delete a synthetic account through the existing app procedure; repeat after
  an interrupted deletion and inspect Auth/device/server cleanup as separately
  authorized. No real student account should be used for this test.

## Performance

- [ ] **Cold start:** use the same signed release configuration, device and
  account, with fixed network/cache conditions. Force-stop before each of at
  least 10 launches; record `ThisTime`/`TotalTime`/`WaitTime`, median and p90. Compare
  signed-out and restored-session startup, clean DB and migrated DB separately.
  Measure first meaningful screen and the first successful tap separately:
  `am start -W` is activity launch timing, not application TTI.
- [ ] **Home load:** record time to interactive header and each visible section,
  aggregate request/SQLite counts, and whether returning from another screen
  refreshes appropriately. The fixture prediction is 17 → 14 Home requests;
  auth/Play/push/native OTA traffic must be counted separately on device.
- [ ] **Notes list scroll:** realistic long catalog and many download rows;
  fast fling both directions, slow drag, keyboard/filtering, progress updates,
  no blank/clipped rows, stable keys, unchanged tap targets. Measure frame times,
  dropped frames and memory using Android Studio/Perfetto or React Profiler.
- [ ] **Videos/Chapters/Search lists:** repeat first and warm opens, scroll and
  filter while ownership/download state changes; measure screen/row commits.
  Existing list budgets were retained; no FPS/render improvement is certified.
- [ ] **PDF open:** first deferred-module load versus warm reopen, small/large
  PDF, online signed URL versus local file; record latency and peak memory.
- [ ] **Search:** cold index build, warm query, rapid typing, pagination and
  memory cap, clear query, offline reopen and refresh failure. Separate index
  reads from ownership/download refreshes and actual input-to-result latency.
- [ ] **Low-end / slow network:** low-memory arm64 phone, any supported 32-bit
  device, current high-end device, tablet; throttle latency/bandwidth and simulate
  stalled responses. Existing skeletons/errors/retry remain usable; no new
  infinite spinner or frozen navigation. Do not change animation behavior.
- [ ] **Airplane mode:** cold/warm launch, cached catalog/search, downloaded PDF,
  free quiz practice/outbox, expired paid access denial, reconnect/recovery.
- [ ] **OTA:** install candidate, apply an authorized unchanged-asset test update,
  restart twice; count asset downloads/log asset IDs. Unchanged fonts/header and
  navigation assets should reuse local files. Changed compressed icon/adaptive
  assets legitimately receive new hashes once. No production OTA was published.
- [ ] **Size/install:** record raw AAB, universal APK, all supported ABI split
  sets, bundletool compressed download range and Play size breakdown. Measure
  clean app data/cache separately from code/native installation and downloaded
  notes after first launch; never equate ZIP-uncompressed bytes with install size.

## Extra gate for any R8 trial

- [x] Run the existing `shrink-test` profile and matching unshrunk control.
  Both builds passed; APK reduction is 9,806,464 B (7.3%). Production stays off.
  Build IDs/checksums/native symbols are retained in the native report.
- [ ] Inspect merged consumer keep rules and missing-class warnings for
  Billing/OpenIAP, Sentry, PDF/pdfium/blob-util, SQLite/Expo modules, FCM/
  notifications, WebView JavaScript interfaces and Hermes/JNI.
- [ ] Repeat all behavior checks above on the shrunk binary, including real
  native PDF, licensed Play restore, push tap cold start, SQLite migrations,
  offline quiz/outbox, logout/account switch and symbolicated crash handling.
- [x] Static ELF/ZIP 16 KB, API 36 and APK signing checks pass; measured shrink
  gain recorded. These checks do not establish runtime behavior.
- [ ] Launch on a 16 KB device/emulator and complete all shrunk-binary flows.
  Enable production shrinking only after that evidence and owner approval.
