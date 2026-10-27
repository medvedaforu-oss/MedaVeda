# MedVeda readiness code fixes — 27 October 2026

Branch: `audit-fix-1`. Starting revision: `5460921157ba4f8d03a2c1987e43153eb873d634`,
plus all pre-existing working changes. Those changes were validated and committed
first in four named commits; the clean implementation base was `2b8819b`.
The requested report is the October 26 audit at
`MEDVEDA_PRODUCTION_READINESS_2026-10-26.md` (the filename in the pasted request
omitted the date separators).

The requested code work is complete and local regression checks pass. This is
not a production GO: billing, encryption, hosted authorization/operations,
native/device qualification and owner actions remain subject to the original
audit gates. No database/schema/RLS change, SQL execution, Edge deployment,
Supabase/Console setting, real provider transaction or EAS upload/build was made.

## Changes and tests by task

| Task | Implementation and files | Validation |
| --- | --- | --- |
| B11 notification taps | `services/notificationRouting.ts`, `pushNotifications.ts`, `hooks/useNotificationRouting.ts`, `navigation/AppNavigator.tsx`. One response subscription after navigation/auth resolution; cleanup; last response for cold start; race/deduplication protection; in-process target through login/onboarding/recovery; safe screen/parameter allowlist and fallback. Payment/PDF URL/ownership/quiz-answer payloads are not forwarded. Years requires a real mode; Chapters permits notes mode only. | New `notification-routing-selftest.cjs`: foreground/background/killed launch, invalid payloads/types/modes, login/onboarding gate, duplicate response, stale launch/live race and unmount cleanup. |
| B12 errors vs empty | `hooks/useLoadResource.ts`, `components/LoadError.tsx`; Years/Subjects/Chapters/TestList/ChapterDetails/Notes screens. Persistent error/offline message and Retry; successful reload clears it; route changes cancel older results and reset old data. `localCache.ts` and the three catalog services report failed fallback reads. Cached empty results show an error; nonempty saved rows remain usable under an error banner. Notes fetch no longer uses a one-time alert. | New `load-resource-selftest.cjs`: failure vs genuine empty success, retry clearing, stale completion, readiness, offline UI and real cache-fallback signaling for empty/nonempty/missing cache. |
| B17 visible placeholders | Removed unavailable Facebook actions from ContactScreen and SideDrawer. Other Coming Soon/TODO/lorem matches were checked; remaining placeholder matches are normal input hints or comments/internal values. | Complete local suite; contact/social actions remain in the manual checklist. |
| B13 dependencies | Four runtime imports now pin Supabase JS **2.118.0**, the exact version resolved by a cached-only check before editing. `supabase/deno.json` freezes `deno.lock`, including transitive npm integrity values and existing pdf-lib 1.17.1. The diagnostic test mock follows the pinned boundary. | All 19 functions plus PDF worker pass `deno check --cached-only --config supabase/deno.json`; no download/deployment. [Toolchain/lock notes](EDGE_DEPENDENCIES_20261026.md). |
| B14 diagnostic/deletion code | Explicit `verify_jwt=false` for matrix, whose handler still verifies Auth/admin/unconditional AAL2. Diagnostics retained and inventoried. Deletion alone gets hashed-key limits: 20/IP and 3/verified account per 15 minutes, fail closed, Retry-After 900. Existing disposable deletion harness adapter/copy instructions now include the limiter. | New `delete-account-rate-limit-selftest.cjs`: denial before destructive work, exact limits/fail-closed flags, caller binding, partial-failure retry and already-deleted behavior. Existing authorization/redaction tests pass. Disposable DB harness syntax checked only; not executed. [Retirement inventory](DIAGNOSTICS_RETIREMENT_20261026.md). |
| B10 monitoring code | `metro.config.js` uses installed Sentry Expo config/Debug IDs and keeps SQLite WASM. Stable wrapper plugin invokes supported Sentry Expo integration only when an upload token exists; private token is never a plugin prop. EAS production environment explicit; release distribution matches native build code. | New `sentry-config-selftest.cjs`: no-token no-op, configured upload plugin, missing slug failure and token exclusion. Android export passes. [Exact EAS/event steps](../../SENTRY_SETUP.md). Real native upload/symbolication/alert delivery is unverified. |
| B09/B04 wording | App inventory in `constants/privacyInventory.ts` and PrivacyScreen, website privacy/deletion templates and generated pages now cover actual source categories/providers. Sentry has no tracing/replay; intended Resend configuration is identified as unverified. Deletion steps and local cleanup limitations are precise. Identity cutoff is 180 days from first purchase, not reset by deletion; unconfirmed cleanup is disclosed. | Existing identity-retention source/model test now verifies cutoff and honest cleanup wording; website rebuild/link check and TypeScript pass. No retention operation executed. [Exact owner SQL and consent gap](PRIVACY_OWNER_ACTIONS_20261026.md). |
| B16 search | `searchService.ts`, `useGlobalSearch.ts`, new search-only catalog repository/paginator. First nonempty search builds; opening may reuse only a saved/warm index. Fifteen-minute per-account/course cache, in-flight sharing, force refresh and stale-account/course protection. Seven catalog sources use unique-ID pages of 250 and explicit 10,000-row/type memory guard. Normal browse/payment repositories were not changed. | New `search-cache-selftest.cjs`, `search-pagination-selftest.cjs`, `search-lazy-hook-selftest.cjs`. Nine logical sources preserved; later pages remain searchable and quiz questions/answer keys are excluded. Numbers below. |
| B16 lists/assets | Home/Notes/Videos/Chapters/Store retain keys, use bounded initial/window/batch budgets and memoized render callbacks. Notes preview-set/filter are memoized. Store subject row has its own component for valid Hook usage. No getItemLayout added for variable-height cards. Source PNGs remain byte-for-byte unchanged. | Complete local suite, actual video screen/card/opener test updated for memoized callback and legacy free-content flags. Render budgets and asset measurements below. Device frame/memory/scroll qualification remains manual. |
| Housekeeping/free content | Removed only nine unreferenced component/helper files, pager capture and generated bytecode. Compatibility/platform/payment candidates and dependencies retained with reasons. VideoCard no longer renders a paid/lock state even for legacy locked=true; TestCard stays FREE. Old paid-MCQ proposals explicitly superseded in historical review README/report. | Extended `video-tap-selftest.cjs` exercises legacy locked=true video/MCQ rendering. Full type/lint/test/build checks pass after removals. [Full removed/retained/branding inventory](HOUSEKEEPING_20261027.md). |

All script paths above are under `mobile-app/scripts/` except the deletion test,
which is under `supabase/tests/`. Privacy inventory includes Supabase account,
study/referral/payment records, quiz selections and analytics/search terms,
Expo/FCM/APNs push tokens, Sentry diagnostics, intended Resend mail delivery,
Google Play, applicable Razorpay/legacy channels, identity hashes/account ID,
hashed limiter keys/provider metadata, support, website and local storage.

## Measurements

The search fixture uses 550 rows for each of nine sources: **4,950 results** and
**1,276,683 serialized index bytes** before and after. These are controlled local
source-read counts, excluding independent ownership/download hooks; they are not
device network latency measurements.

| Search scenario | Before | After |
| --- | ---: | ---: |
| Empty Search open: index source reads | 9 | 0 |
| First search: cumulative reads | 9 | 9 |
| Reopen after 3 minutes: cumulative reads | 18 | 9 |
| Force refresh after that: cumulative reads | 27 | 18 |
| Two concurrent cold builds: reads | 18 | 9 |
| Warm index lifetime | 2 minutes | 15 minutes |
| Heavy catalog reads | Unpaged; chapters requested at most 2,000 | 250 rows/page; explicit 10,000-row/type error guard |

Paginator fixture: **2,601 unique chapter rows**, **11 requests**, **maximum 250
rows/response**, including the last row. Beyond the memory bound the index fails
explicitly instead of silently truncating. Purchases/notification service reads
keep their existing contracts; this is pagination of the seven catalog scans,
not a replacement for backend search at arbitrarily large scale.

React Native's installed defaults were initial **10**, batch **10**, window **21**.
All nine requested FlatLists already had stable identity keys. Configured budgets:

| Lists | Initial before → after | Batch before → after | Window before → after |
| --- | --- | --- | --- |
| Four Home horizontal strips | 10 → 3 each | 10 → 3 | 21 → 5 |
| Notes, Videos, Chapters | 10 → 6 each | 10 → 6 | 21 → 7 |
| Store year rows | 10 → 3 | 10 → 3 | 21 → 7 |
| Store subject strip | 10 → 3 | 10 → 3 | 21 → 5 |

These are measured source/default render budgets, not observed allocations or
frame-rate gains. Ownership/download updates still legitimately invalidate
callbacks; no callback was frozen across changing access/progress state.

Combined Android Hermes export: **9,091,334 → 8,218,572 bytes**, a reduction of
**872,762 bytes (9.6%)**. This compares the same local export procedure with
existing dependencies and dotenv disabled. It is not an AAB/APK/installed-size
measurement. Timings vary with shared CPU and warm caches and are not claimed
as startup or device speed improvements.

No source image savings are claimed. Icon: 978,337 bytes at 1254×1254; adaptive:
1,459,751 at 1024×1024; splash: 1,678,819 at 941×1672; favicon: 813,005 at
1254×1254; header logo: 91,027 at 1200×280. Before=after for each. See the asset
table and reference decisions in the housekeeping report.

## Regression results and reproduction

Fresh initial checks ran before committing existing work. Per-fix checkpoints
reran mobile/admin TypeScript, lint and the complete local Node/Deno suite;
builds were also rerun for Sentry integration and the final candidate. Temporary
compiler, JSX and test-mock/old-wording assertions encountered during development
were corrected and rerun; no failing check was waived or accepted as baseline.

| Check | Fresh starting baseline | Final candidate |
| --- | --- | --- |
| Mobile tsc --noEmit | PASS | PASS |
| Admin app/node tsc --noEmit | PASS | PASS |
| Lint | PASS | PASS |
| Android JS/Hermes export | PASS | PASS |
| Admin production bundle | PASS | PASS |
| Node local test files | 45 PASS | 52 PASS |
| Deno entrypoint type checks | 20 PASS | 20 PASS, frozen/cached |
| Deno unit cases | 40 PASS | 40 PASS |
| Deno standalone local scripts | 5 PASS | 5 PASS |
| Website internal links | 17 pages PASS | 17 pages PASS |
| Bounded secret pattern scan, including decompressed archives | No matches | No matches |

Reproduce from the repository root with installed dependencies/cache (or invoke the runner by absolute path from elsewhere):

```sh
python3 scripts/check-readiness-local.py --full --output /tmp/medveda-readiness-review
```

The runner removes service credentials from test environments, disables Expo
dotenv loading, requires cached Deno dependencies, and puts output in `/tmp`.
Commands, individual results, exclusions and final logs are retained in
[evidence/readiness-code-fixes-20261027](evidence/readiness-code-fixes-20261027).
The secret scan is pattern-bounded, not a complete credential/history audit.

**Not executed:** hosted SQL/RLS/Storage, migrations, run-all/concurrency DB
scripts, the three DB-writing Node self-tests (content URL, Play cron, UCB cron),
hosted quiz/upload harnesses, provider smoke/real payments, native Gradle/EAS
builds, emulator/device actions, SMTP/push delivery, account deletion or Sentry
upload/events. Historical review fixtures are not current release tests. This
preserves the user's no-database/no-provider-change boundary rather than treating
those checks as passing. Local mocks/export cannot certify the Android flows.

## Owner actions and intentionally unchanged work

1. **EAS/Sentry:** set the four environment variables in
   [SENTRY_SETUP.md](../../SENTRY_SETUP.md), use a new internal native build,
   confirm upload task success, sanitized source-line event and alert delivery.
   No token was added to this repository. Update uploads need the documented
   separate source-map upload step.
2. **Supabase identity retention:** source scheduling is still commented out.
   Use the exact prerequisite/grant/cutoff/job/run-history SQL in
   [PRIVACY_OWNER_ACTIONS](PRIVACY_OWNER_ACTIONS_20261026.md). Approve cadence and
   lag, validate synthetic staging rows, then deliberately run/schedule/monitor
   cleanup. No SQL was run here. Resolve under-18 audience/parental-consent
   requirements: no age or verified parental-consent flow exists in source.
3. **Supabase deployment:** separately review/publish the local diagnostic
   gateway/deletion limiter changes when authorized. Keep diagnostics until the
   investigation closes, then follow the retirement inventory. Verify live
   forwarding-header trust, rate-limit RPC, grants and handler behavior. Review
   previously prepared staging source hashes again before creating a new bundle.
4. **Existing release gates:** the original audit still requires coordinated
   migration/RPC/client rollout, admin MFA, backup restore, SMTP/FCM setup,
   operational monitoring, actual retention settings, signed native artifact and
   Console/Data safety/audience review. No Console declarations were changed.
5. **Android:** execute the updated
   [manual checklist](ANDROID_READINESS_FIXES_CHECKLIST_20261027.md) for auth/OTP/
   lockout/recovery, YouTube, free MCQ/offline sync, notes, search, notification
   states, deletion and Sentry, alongside the broader existing release checklist.

Google Play/Razorpay purchase paths, settlement/grants, create-play-order,
verify-play-purchase, payment workers/catalog sync, referral/wallet logic,
offline PDF encryption and migrations/RLS were deliberately unchanged. The only
shared Edge dependency edit was the requested version pin; the standalone PDF
worker received only that import pin. Notes preview/download/purchase decisions
were preserved while adding requested fetch errors/render memoization. No Play
403 diagnosis was declared resolved and no paid-notes release gate was closed.

## Commits

The following list is filled from the completed source commits. The final
evidence/report commit follows them in Git history.

- `17712fa` fix(auth): preserve password recovery and MFA handoff work
- `aedb40d` chore(staging): preserve isolated staging preparation
- `4cd2702` docs(audit): preserve production readiness reports and evidence
- `2b8819b` chore: preserve pre-existing pager help capture
- `4439eb9` fix(notifications): route taps after auth and navigation readiness
- `a28ed2f` fix(content): distinguish failed loads from empty lists with retry
- `4733134` fix(contact): hide unavailable Facebook actions
- `c45c673` build(edge): freeze cached Supabase dependencies at 2.118.0
- `6f570ca` fix(edge): govern diagnostics and throttle account deletion
- `00f00b9` build(monitoring): wire optional EAS Sentry source map uploads
- `4fb5c89` docs(privacy): align inventory deletion and retention disclosures
- `43df890` perf(search): lazily reuse scoped indexes and page catalog reads
- `eb4b122` perf(lists): bound render windows and memoize list callbacks
- `17cc80d` fix(notifications): enforce screen-specific mode parameters
- `f85a06b` fix(content): retire remaining paid-video wording and quiz proposals
- `564dcdf` fix(content): surface failed cached refreshes without hiding saved lists
- `b1e3cea` docs(privacy): describe local cleanup and owner grant checks precisely
- `3231748` test(deletion): keep disposable harness compatible with rate limits
- `e5ef035` chore: remove confirmed dead helpers and generated captures
- `7328384` test: add reproducible local readiness regression runner
