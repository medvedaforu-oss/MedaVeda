# MedVeda Android performance and size — 27 October 2026

Branch `perf-size-1`, created from clean `audit-fix-1` at `99c91a4`.
Baseline captured before any application change. All bytes below are decimal.
Evidence: [before size/dependencies/asset inventory](evidence/perf-size-20261027/size-before.json),
[before screen probe](evidence/perf-size-20261027/screens-before.json),
[baseline regressions](evidence/perf-size-20261027/checks-before.json).

## Measurement boundary

There is no production AAB/APK in the workspace, home artifact inventory or `/tmp`.
The installed Android SDK has platform-tools only: no platforms/build-tools,
NDK or emulator. `adb devices -l` succeeded outside the socket-restricted sandbox
and returned no devices. Java and cached Gradle components alone cannot build
this native release. No cloud build, production upload, signing credential access
or provider operation was performed. AAB, universal/per-ABI APK, Play download,
DEX/resources/native `.so` and installed-size results are **unavailable**; historical
artifact reports are not measurements of this revision. Native shrink-test size,
16 KB qualification, startup/TTI, frame rate and memory need the release/device pass.

Canonical measurement: existing `check-readiness-local.py --full` Android
production Hermes export, dotenv disabled, same installed dependencies, without
source maps. Separately exported with `--source-maps --max-workers 2` to attribute
source bytes to packages. Source-map export changes Hermes debug metadata/size;
its HBC size is **not** mixed into the canonical comparison. The analyzer counts
UTF-8 `sourcesContent`, not a package's contribution to compressed Hermes/APK size.

`scripts/mobile-perf-probe.cjs` executes real screen Hooks/services/repositories
against fake Supabase, SQLite, AsyncStorage and native UI. Four years, one chapter,
one preview note, one video, one notification, no purchases/products/quiz attempts,
known signed-in account/course, no pending downloads/outbox. Every scenario uses
an isolated module cache. Requests are awaited Supabase boundary calls, not packets;
SQL counts are API invocations (a multi-statement exec counts once). Protected
auth/session/referral/push/Play entrypoints are opaque mocks and excluded from
request totals. Home/Notes/Videos/Chapters components and the Search Hook are
counted by a deterministic batched Hook scheduler, **not React Profiler/device
render counts**. Child rows are not rendered. Notes/Search include two connection
PRAGMAs because each fixture opens its own DB; in an already initialized app these
two calls are absent. Startup first-install fixture includes four migration calls
and legacy quiz cleanup; migrated fixture skips those. No real database is used.

## Baseline

| Metric | Before |
| --- | ---: |
| Hermes bundle, canonical export | 8,218,571 B |
| Exported assets | 6,612,254 B |
| PNG assets | 2,535,414 B |
| Icon fonts | 4,076,840 B; 19 files |
| All exported assets | 39 files |
| Source images (five PNGs) | 5,020,939 B |
| App launch probe | 2 requests; 7 SQLite calls (12 first install) |
| Home probe | 17 requests; 0 SQLite calls; 3 scheduled renders |
| Notes probe | 1 request; 4 SQLite calls; 2 scheduled renders |
| Videos probe | 1 request; 0 SQLite calls; 2 scheduled renders |
| Chapters probe | 3 requests; 0 SQLite calls; 2 scheduled renders |
| Search opening / after first query | 2 / 11 cumulative requests; 6 SQLite calls; 6 scheduled Hook renders |
| Cold start / TTI / scroll FPS | Unavailable: no device |

The launch requests are maintenance RPC and app-config read. Play restore and push
registration invocations are separately recorded, with auth internals excluded.
Home's 17 include 2 years reads, 4 year-product reads, 2 chapters reads, 3 purchase
reads, 3 notification reads, 2 quiz-stat reads and 1 analytics insert. Purchase
reads include mount/focus refresh and remain a protected freshness boundary.
Chapters includes 1 catalog and 2 purchase reads. Empty Search still refreshes
ownership twice on mount/focus; first query adds seven paged catalog sources,
purchases and notifications. Existing search-cache tests separately cover 4,950
rows, a 15-minute scoped cache, concurrent builds, refresh and account changes.

### Top 15 items available to inspect

Full native ZIP ranking is unavailable. These are the largest canonical export
items (HBC plus assets); detailed paths/hashes are in `size-before.json`:

| Item | Bytes |
| --- | ---: |
| Hermes HBC | 8,218,571 |
| Adaptive foreground PNG | 1,459,751 |
| MaterialCommunityIcons.ttf | 1,307,660 |
| App icon PNG | 978,337 |
| FontAwesome6_Solid.ttf | 423,676 |
| Ionicons.ttf | 389,724 |
| MaterialIcons.ttf | 356,840 |
| Fontisto.ttf | 313,528 |
| FontAwesome6_Brands.ttf | 209,376 |
| FontAwesome5_Solid.ttf | 202,744 |
| FontAwesome.ttf | 165,548 |
| FontAwesome5_Brands.ttf | 134,040 |
| AntDesign.ttf | 130,484 |
| Header logo PNG | 91,027 |
| Octicons.ttf | 69,436 |

Source-map analyzer's largest sources: Sentry core 3,915,425 B, React Native
2,116,436 B, Reanimated 932,995 B, application 732,962 B, Sentry RN 422,446 B,
Supabase auth 422,198 B. These are source attribution, not removable byte estimates.
Crash monitoring, auth and animation dependencies cannot be removed safely on
size alone. The inventory lists every direct dependency's installed version and
whether it has Android/Expo native code. React Navigation, Supabase, form/Yup,
AES and SHA packages are JS; RN/Expo, PDF/blob, WebView, IAP, Sentry, gesture,
screens, safe-area, Reanimated/worklets, AsyncStorage/NetInfo/date picker bring
native code directly or via their dependencies.

### Source media over 100 KB

| File | Bytes | Dimensions | Use |
| --- | ---: | --- | --- |
| assets/adaptive-icon.png | 1,459,751 | 1024×1024 RGBA | app.json Android adaptive foreground; export asset |
| assets/icon.png | 978,337 | 1254×1254 RGB | app.json app icon and splash plugin; export asset |
| assets/splash.png | 1,678,819 | 941×1672 RGB | No active reference; not exported |
| assets/favicon.png | 813,005 | 1254×1254 RGB | No active reference; not exported |

Header logo is 91,027 B, 1200×280, rendered at 172×40; below the threshold.
No source font/audio/video files. Dependency fonts over the threshold and their
actual export usage are listed in the inventory above. Expo icon recommendation
is 1024×1024; the existing 1254px icon is square but exceeds that recommendation.
Changing dimensions/resampling affects pixels and is deferred for visual approval.

### Dependency checks

[Expo Doctor](evidence/perf-size-20261027/expo-doctor-before.txt), pinned 1.21.5:
20/21 checks pass. Existing mismatch: expo 57.0.29 vs ~57.0.31 and notifications
57.0.23 vs ~57.0.24. No automatic upgrades or ignored checks added.
[Depcheck](evidence/perf-size-20261027/depcheck-before.json), pinned 1.4.7:
all unused candidates require manual evaluation. Build-properties and splash are
config plugins; system-ui is Expo native config; updates is the existing OTA
runtime; screens is native-stack's required native dependency; worklets is required
by Reanimated. Babel core and TypeScript are build/test tools. The flagged
`@expo/config-plugins` import is resolved through Expo's installed dependency tree;
adding an explicit dependency is housekeeping, not a demonstrated size reduction.
No installed Firebase/Firestore SDK is a direct app dependency; old comments are
not evidence of an SDK to uninstall. No package removal is justified yet.

## Cold-start sequence and constraints

1. Metro entry evaluates App and its eager imports. Navigator initializes Sentry
   and imports every registered screen, including PDF, quiz, store, search and
   checkout modules. Supabase creates its secure session client, starts restore,
   authState registers auth listeners/blocked checks/offline-owner claims/push.
   Notifications install their foreground handler. No React Query provider exists;
   no custom font load or JS splash `preventAutoHideAsync`/hold exists. Used vector
   icon components lazily load their fonts. No separate analytics flush/index
   prefetch/explicit OTA check exists; expo-updates native launch policy applies.
2. App mounts SafeAreaProvider, force-update and maintenance hooks concurrently.
   Both have 6-second failure bounds; maintenance deliberately gates navigation.
   App initializes SQLite/WAL/FKs, CREATEs tables/indexes, checks migrations,
   **awaits legacy answer-key quiz cleanup**, recovers downloads, starts sync, sets
   ready, then requests push registration. Sync and payment restore preserve their
   existing lifecycle/ordering. They must not be changed under this request's
   protected-logic boundary.
3. Navigation mounts only once readiness/maintenance/update gates allow it;
   notification routing waits for auth/navigation readiness, screenshot prevention
   attaches, reminder channel/restore run. Splash screen reads session and launch
   URL in parallel and enforces its existing 1,200ms branding dwell; then loads
   course/year profile before choosing Home/onboarding. Password recovery link
   precedence is part of auth behavior and remains unchanged.
4. Home independently loads sections, quiz stats, ownership/purchases, notices,
   unread badge, analytics and pending referral. Focus re-reads ownership/unread
   and local activity. Course-ready effect separately requests years twice for
   years and year products; product reads are already parallel. Recommendations
   wait for years, while visible sections show existing skeletons independently.

The supplied rule to retain identical behavior takes precedence over aggressively
shortening maintenance/auth/splash/download-cleanup gates. Opportunities and final
results are recorded below as each isolated optimization is validated.

## Completed optimizations and file safety

| Commit | Files | Change and safety evidence |
| --- | --- | --- |
| `ec230f2` | This report, baseline JSON, `scripts/measure-mobile-size.py`, `scripts/mobile-perf-probe.cjs` | Record measurements before app changes. Tools are read-only/offline and never enter the shipped app. ZIP analyzer optionally inventories an actual future AAB/APK, including every `.so`, DEX, resources/assets and largest 15 entries. |
| `9cb6dd1` | `src/components/SideDrawer.tsx`, `src/screens/contact/ContactScreen.tsx`, `src/screens/auth/LoginScreen.tsx` | Three mechanical default imports from `@expo/vector-icons/FontAwesome` or `/Ionicons` replace barrel imports. Same component exports, glyph maps, names, font bytes, sizes/colors and JSX. **Login is the sole protected auth file touched: import path only.** Password/recovery/policy tests and full suite pass. [Used glyphs verified](evidence/perf-size-20261027/glyph-check.json); export contains exactly the two used fonts. No glyph subsetting or icon replacement. |
| `e41ec01` | `assets/adaptive-icon.png`, `icon.png`, `splash.png`, `favicon.png` | PNG deflate/filter optimization with Pillow 11.1.0. Decoded pixels, mode, dimensions and metadata compared equal before writing; no resampling, palette quantization, WebP conversion or native config change. [Pixel hashes and sizes](evidence/perf-size-20261027/lossless-png.json). Header logo was already as small under the same lossless method and remains byte-identical. |
| `dba7ffa` | `src/navigation/AppNavigator.tsx`, `scripts/navigation-lazy-selftest.cjs` | Replace 30 non-startup screen imports with literal, synchronous `getComponent` loaders. All routes still ship in the installed bundle and work offline. Seven auth/recovery/Home/onboarding screens and Sentry remain eager. Existing route names/options/provider gates, native platform file resolution and ErrorBoundary stay intact. Tests check every registered loader, repeated component identity, injected load failure and the existing boundary's error/retry contract. Native opening/transition timing still needs device checks. |
| `15c9888` | `src/services/yearsService.ts`, `scripts/years-inflight-selftest.cjs` | Share overlapping live catalog reads by account/course. No completed-response cache or stale-time policy. Each caller retains its own existing offline fallback callback. Tests cover ordering, fresh subsequent reads, account/course isolation, rejection cleanup and per-caller fallback banners. |
| `abe405c` | `src/services/notificationsService.ts`, new `scripts/notification-inflight-selftest.cjs`, existing `notification-reads-selftest.cjs` | Share overlapping raw notification-row reads by account. Preferences/read IDs/archive IDs remain per-call; no entitlement or payment query is cached. Tests cover all of those filters, fresh later reads, account switch, backend errors, thrown network errors and retry. Existing preference test only gains the new auth mock/timer globals. |
| `6dd8a37` | Both read services and their three tests | Limit sharing to one second; settle clears the timer. A permanently stalled read cannot prevent reopening/retrying with a fresh request. Late settlement of an older request cannot delete a newer pending entry. No request cancellation, new UI deadline, or changed failure result. Deterministic timer/race tests pass. |

All application paths in this table are under `mobile-app/`. No billing,
checkout, settlement/grant, referral/wallet, auth/OTP/lockout, sync/outbox,
download integrity, Edge Function, database/RLS or native dependency logic changed.
Navigator registration for those screens changes only module evaluation timing;
their screen implementations are untouched. New account reads use the existing
`getCurrentUser` accessor without changing session restore or auth listeners.

### PNG before/after

| PNG | Before B | After B | Saved B | Android export use |
| --- | ---: | ---: | ---: | --- |
| adaptive-icon | 1,459,751 | 1,348,665 | 111,086 | Yes |
| icon | 978,337 | 884,914 | 93,423 | Yes |
| splash | 1,678,819 | 1,584,329 | 94,490 | No active reference |
| favicon | 813,005 | 731,411 | 81,594 | No active reference |
| header logo | 91,027 | 91,027 | 0 | Yes |

Source savings: **380,593 B**; active exported PNG savings: **204,509 B**.
Native resource processing may recompress icon/splash resources, so this is not
a claim of an equal APK-size gain. Unreferenced splash/favicon were not falsely
counted as removed Android payload.

## After measurements using the same methods

[After size/analyzer/inventory](evidence/perf-size-20261027/size-after.json),
[after probes](evidence/perf-size-20261027/screens-after.json),
[before navigation](evidence/perf-size-20261027/navigation-before.txt),
[after navigation](evidence/perf-size-20261027/navigation-after.txt).

| Metric | Before | After | Result |
| --- | ---: | ---: | --- |
| AAB | Unavailable | Unavailable | No release artifact/toolchain |
| Universal APK | Unavailable | Unavailable | Same limitation |
| arm64-v8a APK / split set | Unavailable | Unavailable | Same limitation |
| armeabi-v7a APK / split set | Unavailable | Unavailable | ABI support must be verified from final artifact |
| x86 APK / split set | Unavailable | Unavailable | ABI support must be verified from final artifact |
| x86_64 APK / split set | Unavailable | Unavailable | Same limitation |
| Estimated Play compressed download | Unavailable | Unavailable | Requires AAB → APK set → `get-size total` |
| Installed app/code/data/cache size | Unavailable | Unavailable | Requires matching release installs on device |
| Native `.so`, DEX, resources | Unavailable | Unavailable | Cannot infer from JS export |
| Hermes HBC, no source maps | 8,218,571 B | 7,904,292 B | **−314,279 B (3.8%)** |
| Exported assets | 6,612,254 B | 2,886,177 B | **−3,726,077 B (56.4%)** |
| Exported icon fonts | 4,076,840 B / 19 | 555,272 B / 2 | −3,521,568 B; same two used families retained |
| Exported PNGs | 2,535,414 B | 2,330,905 B | −204,509 B |
| HBC + exported assets (raw) | 14,830,825 B | 10,790,469 B | **−4,040,356 B (27.2%)**; not AAB/download/install size |
| Source PNG total | 5,020,939 B | 4,640,346 B | −380,593 B |
| Eager screen module imports | 37 | 7 | 30 deferred; route registration alone does not evaluate them |
| Play / Razorpay registered routes | 35 / 36 | 35 / 36 | Unchanged; 28 / 29 active routes lazy |
| App-root fixture requests / SQL / renders | 2 / 7 / 2 | 2 / 7 / 2 | No reduction claimed; first-install SQL 12 both |
| Home fixture requests / SQL / renders | 17 / 0 / 3 | 14 / 0 / 3 | 3 fewer overlapping requests; renders unchanged |
| Notes fixture requests / SQL / renders | 1 / 4 / 2 | 1 / 4 / 2 | Unchanged |
| Videos fixture requests / SQL / renders | 1 / 0 / 2 | 1 / 0 / 2 | Unchanged |
| Chapters fixture requests / SQL / renders | 3 / 0 / 2 | 3 / 0 / 2 | Unchanged |
| Search open / first-query cumulative requests | 2 / 11 | 2 / 11 | Existing lazy index behavior retained |
| Search fixture SQL / scheduled Hook renders | 6 / 6 | 6 / 6 | Unchanged |
| Cold start, real TTI, React Profiler commits, list FPS/memory | Unavailable | Unavailable | No device; no invented improvement |

The icon-only checkpoint HBC was 7,900,680 B. Lazy registration/request safety
adds a small amount of code; those commits optimize evaluation/network work,
not total bytecode size. Both analysis exports retain all deferred screen source
modules. Source attribution still identifies Sentry/RN/Reanimated as large; none
was removed. Every exported asset is ranked with source names/hashes in the
before/after JSON. No native largest-15 list is claimed without a native ZIP.

## Evaluated and intentionally unchanged

- **Startup scheduling:** database migrations/legacy answer-key cleanup must
  finish before screens can open files. Sync, auth-state push registration,
  session restoration, Play restore and referral application cross protected
  lifecycle boundaries. Their ordering and all App initialization code remain
  unchanged. Deferring reminders/analytics alone has no demonstrated device
  benefit here; no timing policy or notification behavior was changed.
- **Splash/gates:** the existing 1,200ms dwell, session/profile/deep-link routing,
  maintenance gate and force-update behavior are retained. Removing the dwell
  would change visible behavior; bypassing a maintenance check would change a
  safety gate. No network-dependent gate was silently removed for a better number.
- **Metro/Hermes:** Hermes HBC export is verified. Installed Expo 57 Metro default
  `getTransformOptions` sets `inlineRequires: false`; project Sentry config does
  not override it. Global inline requires are **not enabled**. Turning them on
  could reorder side-effect modules (Sentry/polyfills/auth/notifications). The
  narrow literal `getComponent` loaders are effective in the registration probe
  without changing global module initialization. No React.lazy/Suspense loading
  screen, async chunk fetch or new loading UI was introduced.
- **Network/caching:** no React Query dependency/provider exists. Adding one or
  persistent stale-while-revalidate cache would alter refresh/error semantics
  without device evidence. Existing search index is already lazy, per-account/
  course, 15-minute, deduplicated and paginated (250/page, 10,000 rows/type cap).
  Purchase/entitlement reads still execute live on mount/focus; they are excluded
  from request-sharing changes. No payment URL, access decision or signed URL
  receives a new cache. Visible list APIs/order/columns/pagination remain intact.
- **Lists/renders:** Home's 3/5/3 initial/window/batch and Notes/Videos/Chapters'
  6/7/6 budgets, stable keys and prior callbacks remain. No real row churn/FPS
  evidence justifies more memo wrappers, changed clipping, fixed-height layouts
  or animation changes. Mock render counts are unchanged. No thumbnail-image
  pipeline was found; adding expo-image would add native code for the static
  header logo without a demonstrated gain.
- **SQLite/storage:** no local schema/index/sync write or JSON format changed.
  WAL/migrations/cleanup are required initialization. The fixture's small known
  SQL count is not a query-plan or realistic large-device profile; new indexes
  and batching were not guessed. All protected download/sync logic is untouched.
- **Dependencies/plugins:** no dependency/lockfile was changed. Depcheck's native
  runtime/build candidates were confirmed required, including native-stack
  screens, Reanimated worklets, native UI configuration and OTA. FCM is a real
  transitive Firebase Messaging dependency of notifications, not a removable old
  Firestore client. All app.json plugins have a current role (date picker,
  notifications, SecureStore, splash, status bar, browser, SQLite, IAP, YouTube
  queries, fonts; build-properties and optional Sentry are injected dynamically).
- **API/16 KB/ABI:** SDK/RN/native package versions, Android build configuration,
  page-size handling, permissions and all build profiles are unchanged. Expo 57
  targets API 36; this is source/toolchain continuity, not a current signed
  manifest/ELF certification. Production and internal-testing profiles already
  build AABs. Play optimizes APK delivery per device; removing x86 libraries from
  a universal APK would not represent the same saving for arm64 Play users.
  [Expo SDK version reference](https://docs.expo.dev/versions/v57.0.0/),
  [Play bundle delivery](https://support.google.com/googleplay/android-developer/answer/9844279?hl=en).
- **OTA:** installed expo-updates `loader/Loader.kt` deduplicates assets by key,
  finds existing DB entries, and skips network loading when the local asset file
  exists. Native defaults are automatic checking with zero launch wait. No
  repeated manual OTA/asset fetch is present in app JS. Asset identities for the
  two retained fonts/header/navigation images remain unchanged; compressed
  icon/adaptive PNGs change identity once, and unused fonts disappear from the
  export. This confirms source-level reuse, **not a live traffic measurement**.
  No update/runtime/signing/cache policy was changed or OTA published. Run the
  device reuse check in the checklist using [Expo update logs](https://docs.expo.dev/versions/v57.0.0/sdk/updates/).

### R8 shrink-test evaluation (off in production)

`ANDROID_SHRINK=1` is still opt-in, used by the existing `shrink-test` APK profile.
Production stays off. Native `shrink-test` could not be built in this environment,
so **size gain is unmeasured** and no shrunk release is approved. `extraProguardRules`
currently keeps Sentry, barteksc/pdfium's old package and blob-util. The installed
PDF viewer also uses `org.wonday.pdf` and **`io.legere.pdfiumandroid`**; the old
`com.shockwave.pdfium` rule alone does not certify the current viewer.

For a separately reviewed trial, inspect merged generated/consumer rules and
R8 warnings/mapping first. Conservative supplemental keeps to evaluate in that
trial are below; these have **not been installed or qualified** and are not a
claim that the current native binary needs every wildcard. Broad keeps trade
some shrinking gain for reflection/JNI safety.

```proguard
-keep class expo.modules.iap.** { *; }
-keep class dev.hyo.openiap.** { *; }
-keep class com.android.billingclient.** { *; }
-keep class io.sentry.** { *; }
-keep class org.wonday.pdf.** { *; }
-keep class com.github.barteksc.pdfviewer.** { *; }
-keep class io.legere.pdfiumandroid.** { *; }
-keep class com.ReactNativeBlobUtil.** { *; }
-keep class expo.modules.sqlite.** { *; }
-keep class expo.modules.notifications.** { *; }
-keep class com.google.firebase.messaging.** { *; }
-keep class com.reactnativecommunity.webview.** { *; }
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
```

Expo modules/ReactAndroid/Reanimated/worklets ship additional annotation/module/
JNI rules; retain their generated consumer rules. ReactAndroid's existing rules
keep `com.facebook.jni` for Hermes. Inspect the actual OpenIAP/Billing/FCM/Sentry
AAR consumer rules too; Maven AARs are not available here. Supabase is JavaScript,
so R8 has no Supabase Java classes to keep; its Hermes code/session logic stays
outside R8. Shrink-test must exercise Play restore/purchase callbacks, Sentry
symbolication, PDF/blob access, SQLite migrations, notifications/FCM cold taps,
WebView bridge, Hermes startup and every critical flow in the linked checklist.
[Expo build properties](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/).

### Items needing owner approval/evidence

| Candidate | Expected gain | Reason held |
| --- | --- | --- |
| Production R8/resource shrinking | Unknown until same-config shrunk/unshrunk native builds | No shrink-test build/device pass; keep-rule/reflection/JNI/native bridge risk |
| arm64 + armeabi-v7a only for direct APK distribution | Unknown until per-ABI native `.so`/APK totals exist; no equivalent arm64 Play saving | Drops x86/x86_64 support; verify 32-bit support in actual RN/dependency artifacts first |
| Resample 1254px app icon to recommended 1024px; resize header to rendered density | Exact lossless compression gain exhausted; resized byte saving unmeasured; lower decoded pixel memory possible | Changes source pixels; needs visual/native icon approval |
| Shorten/remove 1,200ms branding dwell | At most 1,200ms of the intentional dwell; total gain overlaps session work | Visible timing/auth-recovery behavior would change |
| Defer protected sync/push/auth/Play/referral work; combine config checks | Device gain unknown | Lifecycle/session ordering risks cannot be ruled out by local mocks; protected logic and server changes excluded |
| Global inlineRequires, more list clipping/memo/animation changes, persistent browse cache | Gain unknown without profiling | Side effects, stale data, clipping and UX behavior risks |
| Patch upgrades flagged by Doctor | No size/speed gain established | Separate dependency/native regression qualification; not silently included |
| Remove `DETECT_SCREEN_CAPTURE` or other manifest-derived permissions | Negligible byte gain | No JS screenshot-listener caller found, but merged native manifest/device capture behavior unverified |

Permissions reviewed in dependency source: INTERNET, POST_NOTIFICATIONS,
ACCESS_NETWORK_STATE/ACCESS_WIFI_STATE (NetInfo/updates/blob), BILLING,
RECEIVE_BOOT_COMPLETED (reminders), WAKE_LOCK (blob/native downloads), and
DETECT_SCREEN_CAPTURE (screen-capture). Existing blocklist already excludes old
external-storage/media reads/writes and DOWNLOAD_WITHOUT_NOTIFICATION. The merged
artifact may add other transitive permissions. None was removed speculatively;
native manifest inspection is required before calling this the final permission list.

## Regression protection

[Per-commit results](evidence/perf-size-20261027/commit-checks.json) record the
full required suite **after every baseline/optimization/follow-up commit**.
[Final code suite](evidence/perf-size-20261027/checks-after.json) retains commands,
timings and explicit exclusions. Baseline: 52 Node files; final: 55. Every code
checkpoint passes mobile/admin TypeScript, lint, production Android export,
admin build, all discovered local Node tests, 20 frozen/cached Deno entrypoints,
40 Deno unit cases, five Deno standalone local scripts, 17 website page link
checks and the bounded secret scan (including decompressed tracked archives).
No new failures were accepted. Expo Doctor remains **20/21**, with exactly the
two baseline patch mismatches; depcheck findings are unchanged. These external
audits are reported separately rather than hidden in the passing local suite.

Required hosted SQL/RLS/concurrency/provider tests were not executed: the local
runner explicitly excludes DB-writing harnesses, hosted upload/quiz scripts,
real payments, deployments and live deletion. Node/Deno mocks do not certify
native billing, PDF, notifications, offline behavior or store readiness.

| Critical flow | Automated/source evidence; remaining device gate |
| --- | --- |
| Login/register/OTP/lockout | Auth implementations stay unchanged; Login import is mechanical; password-policy/recovery tests pass; OTP/lockout delivery/timers need device/provider pass |
| Forgot/reset password | Existing deep-link/recovery/MFA tests pass; auth screens remain eager; real email cold/warm handoff pending |
| YouTube | Existing actual screen/card/opener, URL/parser and free-video tests pass; installed-app/browser tap pending |
| Free MCQ/offline queue | Existing quiz Hook/outbox concurrency/local offline tests pass; quiz loader contract passes; native airplane-mode/reconnect pending |
| Notes preview/download/purchase UI | Existing owner/download/purchase/lifecycle/access tests pass; no access/integrity code change; native licensed device flow pending |
| PDF | Literal native-platform module remains in export and loader test; actual rendering/JNI/16 KB pending |
| Search | Existing lazy/cache/pagination tests and unchanged first-query probe pass; real input latency/large-catalog memory pending |
| Notifications + tap routing | Existing routing/last-response race tests plus new read/mute/archive/freshness tests pass; FCM and killed-app navigation pending |
| Account deletion | Existing local authorization/rate-limit/retry tests pass; Edge untouched; synthetic end-to-end deletion pending |
| Maintenance/force-update | Existing readiness gate/timeout/resume tests pass; App/hooks untouched; real flag toggles pending |
| Logout/account switch | Existing offline-owner/purchase/search scope tests plus years/notice account isolation pass; native file/token cleanup pending |

Full manual checklist, including cold start, Home/list/PDF/search, low-end/slow
network, airplane mode and R8 qualification:
[Android regression and performance checklist](MEDVEDA_PERF_ANDROID_CHECKLIST_2026-10-27.md).

## Reproduce local measurements

Run from the repository root with the existing installed dependencies/Deno cache:

```sh
python3 scripts/check-readiness-local.py --full --output /tmp/medveda-perf-review
node scripts/mobile-perf-probe.cjs > /tmp/medveda-perf-review/screens.json
python3 scripts/measure-mobile-size.py \
  --export-dir /tmp/medveda-perf-review/android-export \
  --output /tmp/medveda-perf-review/size.json
```

For source attribution only, from `mobile-app`, using the same installed toolchain:

```sh
EXPO_NO_DOTENV=1 CI=1 node node_modules/expo/bin/cli export \
  --platform android --source-maps --max-workers 2 \
  --output-dir /tmp/medveda-perf-analysis
```

Pass that export's `.hbc.map` to `measure-mobile-size.py --source-map PATH` while
keeping `--export-dir` pointed at the canonical no-map export. Audit tools were
`npm exec --package=expo-doctor@1.21.5 -- expo-doctor` and
`npm exec --package=depcheck@1.4.7 -- depcheck --json`, run in `mobile-app`, dotenv
disabled, temporary npm cache. Their nonzero findings are documented above.

## Build release artifacts and verify native size

These are owner instructions, not actions performed here. Keep the baseline and
candidate build toolchain, EAS profile/environment, signing, minify/ABI settings
and dependencies identical; record revision/versionCode and CLI versions. For a
clean release builder with Node, JDK, Android API 36 build tools/SDK/NDK and the
owner's existing EAS configuration/credentials, run in `mobile-app`:

```sh
npm ci
npx eas-cli --version
npx eas-cli build --platform android --profile production
```

Download that exact completed build's AAB to `artifacts/medveda-after.aab`
outside the repository. To use the same EAS build pipeline on an equipped local
Linux/macOS builder instead, append `--local --output /absolute/path/medveda-after.aab`.
Local builds still need Expo authentication and local equivalents of secret
build variables. For a **separate trial only**, use
`npx eas-cli build --platform android --profile shrink-test`. It produces an APK;
production config remains unshrunk. [Expo local-build prerequisites](https://docs.expo.dev/build-reference/local-builds/),
[APK profiles](https://docs.expo.dev/build-reference/apk/).

Use a pinned bundletool JAR downloaded from its official release and record its
checksum/version. In the artifact directory (repeat with `before` for `99c91a4`):

```sh
sha256sum medveda-after.aab
stat -c '%s %n' medveda-after.aab
java -jar bundletool.jar validate --bundle=medveda-after.aab
java -jar bundletool.jar build-apks --bundle=medveda-after.aab --output=after.apks
java -jar bundletool.jar build-apks --bundle=medveda-after.aab \
  --output=after-universal.apks --mode=universal
unzip -p after-universal.apks universal.apk > after-universal.apk
stat -c '%s %n' after-universal.apk
java -jar bundletool.jar get-size total --apks=after.apks --dimensions=ALL
```

For installable comparisons supply your intended signing keystore/alias via
bundletool's `--ks`/`--ks-key-alias` and password-file options; default/debug-signed
APK sets are useful for byte analysis but do not qualify Play purchases. Test
actual licensed purchases through Play's internal track. Do not put passwords
in shell history. `get-size` estimates compressed delivery, not installed bytes;
Play's estimate can differ. [Official bundletool options](https://developer.android.com/tools/bundletool).

Create fixed density/locale/API device specs and extract each supported ABI set
without changing shipping architecture configuration:

```sh
python3 - <<'PY'
import json
from pathlib import Path
for abi in ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64']:
    Path(abi + '.json').write_text(json.dumps({
        'supportedAbis': [abi], 'supportedLocales': ['en'],
        'screenDensity': 420, 'sdkVersion': 36,
    }))
PY
for abi in arm64-v8a armeabi-v7a x86 x86_64; do
  java -jar bundletool.jar extract-apks --apks=after.apks \
    --device-spec="$abi.json" --output-dir="after-$abi"
  java -jar bundletool.jar get-size total --apks=after.apks --device-spec="$abi.json"
done
python3 - <<'PY'
from pathlib import Path
for abi in ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64']:
    files = list(Path('after-' + abi).rglob('*.apk'))
    print(abi, [(str(p), p.stat().st_size) for p in files],
          'split-set bytes', sum(p.stat().st_size for p in files))
PY
```

If an ABI is unsupported, record bundletool's result as unsupported, not zero
bytes. A per-device delivery is often several APKs: report each APK and their
sum, not just the ABI library split. Universal APK is a different artifact.
For actual-device delivery also use `get-device-spec --output=device.json` and
the resulting spec for `extract-apks`/`get-size` on both builds.

Run the repository ZIP breakdown tool against the AAB and universal APK (adjust
the export path if reviewing in a separate checkout):

```sh
python3 scripts/measure-mobile-size.py \
  --export-dir /tmp/medveda-perf-review/android-export \
  --artifact /absolute/path/medveda-after.aab --output /tmp/after-aab-size.json
python3 scripts/measure-mobile-size.py \
  --export-dir /tmp/medveda-perf-review/android-export \
  --artifact /absolute/path/after-universal.apk --output /tmp/after-apk-size.json
```

The `nativeArtifact` object provides `.so` paths per ABI/library, raw/ZIP bytes,
DEX/resources/assets/Hermes categories and largest 15 entries. Cross-check using
Android Studio **Build → Analyze APK**, confirm non-debuggable manifest/API 36,
and run the official ELF/ZIP alignment checks, e.g.
`zipalign -c -P 16 -v 4 after-universal.apk` and bundletool
`dump config --bundle=medveda-after.aab` alignment settings. Launch on a 16 KB
device/emulator; ZIP alignment alone does not prove every ELF is compatible.
[Android 16 KB validation](https://developer.android.com/guide/practices/page-sizes).

On a dedicated test device, install both candidates in equivalent clean/upgrade
states, record Android Settings → Apps → MedVeda → Storage code/app/data/cache
sizes before and after first launch, and after downloading the same note.
Downloaded PDFs, SQLite, cache and optimized native/code files must be separated
from APK bytes. Capture paths with `adb shell pm path in.medveda.app` and app
metadata with `adb shell dumpsys package in.medveda.app`; do not use the sum of
uncompressed ZIP entries as an installed-size estimate. Launch timing commands:

```sh
adb shell am force-stop in.medveda.app
adb shell am start -W -n in.medveda.app/.MainActivity
adb shell getconf PAGE_SIZE
```

Confirm the activity from the final manifest if it differs. Repeat as specified
in the checklist; `am start -W` is not TTI. Real JS/network/SQL/React commit/frame
measurements require local profiling/instrumentation on that release candidate,
with private payloads excluded from saved traces.

### Play Console

Upload the approved, tested AAB to an internal test release and select that
versionCode in **Test and release → Latest releases and bundles → All app
versions / App bundle explorer**. In **Downloads**, obtain the signed universal
and device-specific APKs; **Delivery** shows generated splits and conditions.
Compare identical reference devices for baseline/candidate, download/install
breakdowns, supported ABIs and native compatibility warnings. Console labels can
vary during UI rollouts. [Google's current version/bundle procedure](https://support.google.com/googleplay/android-developer/answer/9844279?hl=en).

After production data exists, use **Monitor and improve → Android vitals → App
size** for reference-device download size, range/history and DEX/resources/assets/
native/other breakdown. Use the same device configuration; raw AAB size is not
the user download size. Also review startup, crashes/ANRs and pre-launch reports
for the exact release; this performance patch does not close the earlier
production-readiness release gates. [Google's size reporting procedure](https://support.google.com/googleplay/android-developer/answer/9859372?hl=en).
