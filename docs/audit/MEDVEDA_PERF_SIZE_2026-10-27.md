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
