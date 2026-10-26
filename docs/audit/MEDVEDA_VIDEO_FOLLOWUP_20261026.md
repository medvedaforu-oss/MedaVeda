# Video-opening follow-up and free MCQs — 26 October 2026

Branch: `audit-fix-1`. Videos and MCQs are free; only PDF Notes are paid. No database, RLS, Edge Function, paid Notes, referral/wallet, settlement, or payment-provider changes were made. Existing recovery/website/package edits remain unstaged.

## What the evidence establishes

The user supplied `https://youtu.be/WDejVw7vLKE?si=AkGMGz8VPp0MLbcm`, version **1.2.1**, and confirmed **the card reacts, then “could not open the link” appears**.

1. The exact URL normalizes successfully in the **previous committed parser** to `https://www.youtube.com/watch?v=WDejVw7vLKE`. The share parameter is not the cause for this supplied plain URL. It is now an explicit regression fixture in `video-link-selftest.cjs`.
2. `git show cd554e3:mobile-app/src/screens/videos/VideosScreen.tsx` contains `Alert.alert("Error", "Could not open the link.")` in BOTH the false `canOpenURL` branch and the catch branch. It passes the stored URL directly to those APIs.
3. The first audit's handler (`d67cfc5`, retained through `66320e0`) does **not** contain that error. Its titles/messages are “Video unavailable”, “Couldn't open video” and “Browser unavailable”, with retry/browser actions. The old phrase remains in unrelated WebLink, SideDrawer and Contact handlers, but none is used by the current VideoCard path.
4. Therefore the reported video-screen error **strongly indicates an installed JavaScript/build mismatch: the phone is executing the older video handler**, or an uninspected alternate installed path. This explains why a local code fix did not change the observed behavior. Version 1.2.1 alone does not identify the installed versionCode, OTA update ID, channel, runtime or commit. This is an inference from the user's reported wording and source history, not an inspection of the phone.
5. **The underlying Android failure is still unconfirmed.** The legacy message conflates `canOpenURL=false` and exceptions from either API. It cannot prove missing package visibility, missing browser, malformed stored data or a launch exception. Do not label any of these the proven native root cause. The new stage diagnostics are designed to separate them.

Environment evidence: ADB was run with the necessary local access and returned an empty attached-device list. The public-key, read-only Supabase query for three active rows failed DNS resolution even outside the restricted sandbox. No live row or RLS result was obtained. The browsing tool also could not fetch the supplied YouTube URL, so provider-side playability remains unverified. No live tokens or service-role credentials were used.

## Tap and data trace

Actual path:

`VideoFormModal` → `useVideos.createVideo/editVideo` → admin `videoService.addVideo/updateVideo` → `toSnakeCase` → `videos.youtube_url` → mobile `getVideosBySubject` → `toCamelCase` → `fetchVideosBySubject` sorting → `VideosScreen.FlatList.renderItem` → `VideoCard.TouchableOpacity.onPress` → `openVideo(item.youtubeUrl)`.

* VideoCard is a plain TouchableOpacity, not AnimatedPressable. FadeSlideIn, Shimmer and gesture-handler wrappers are not in this path. Its children are passive View/Text nodes; there is no disabled prop or touch-blocking overlay. `locked={false}` is passed, with no purchase/auth guard in the tap handler. Native touch delivery is supported by the user's report of card feedback plus an error, and the new mocked UI test verifies actual component callback wiring; it does not simulate Android touch dispatch.
* SearchBar is a sibling containing a TextInput. FlatList previously omitted `keyboardShouldPersistTaps`, so the first tap while the keyboard is open can dismiss the keyboard instead of invoking a row. Added `keyboardShouldPersistTaps="handled"`. This is a separate touch issue, **not an explanation for a tap that already produces an error**.
* Admin validation uses `new URL(value.trim())`, but passes the original form object to the service. The service strips UI-only fields and converts keys, not values. It saves `youtubeUrl` to **the correct column `youtube_url`**, without trimming or encoding it. Mobile mapping preserves its exact value. A new test exercises both actual services over an in-memory transport and compares the saved/read value. This is explicitly synthetic evidence, not a production-row comparison.
* Validation is looser than a video-ID parser (e.g. any nonempty `v` is accepted) and the admin rejects playlist-only URLs. No admin/backend mutations were added; the app tolerates imported legacy values. Report invalid content back to the admin using Copy link.
* The repository requests active subject rows with joined subject/year titles. A visible card is evidence that metadata reached that installed screen; it does not establish the exact value of `youtube_url`. The baseline schema declares it NOT NULL, but missing/empty malformed values are still handled defensively in the opener.

New development trace sequence (`[video-open-v2]`):

`fetch.start` → `row.received` (raw snake-case and mapped camel-case values) → `fetch.resolved` → `card.press-in` → `card.press` → `open.enter` → `parse.result` (sanitized URL, normalized URL and ID) → `native.attempt/resolved/rejected` → `https.attempt/resolved/rejected` → `browser.attempt/resolved/rejected` → `open.failed`.

Full URL values and native errors are development-only JSON log details. Release Sentry breadcrumbs contain **stage names only**. `open.failed`, `parse.invalid`, and `fetch.failed` emit a sanitized warning event so retained breadcrumbs can be inspected; Sentry must be configured in the build. Diagnostic failures themselves are caught. A resolved launch promise means Android accepted the launch, not that YouTube played the video. No `canOpenURL` call is made.

## Opening implementation and Android configuration

One implementation, `openVideo(url)`, lives in `utils/videoLink.ts`; `openVideoLink` remains a compatibility alias. No auth or purchase dependency exists in it.

1. Pure parser in `videoUrl.ts` trims whitespace/newlines, removes zero-width/bidi formatting characters, removes wrapping straight/curly quotes, and decodes whole encoded links up to a bounded depth. It avoids decoding reserved characters inside signed query values.
2. Supports watch links with extra parameters, youtu.be `?si=`, mobile/music hosts, shorts/live/embed/privacy-enhanced links, legacy `/v/` and `/e/`, IDs, protocol-relative/scheme-less links and encoded IDs. Extracts only a valid 11-character video ID. Keeps timestamp and playlist context. Playlist-only/videoseries links use a canonical playlist web URL because no individual video ID exists. Drive/Vimeo HTTPS paths and query tokens are preserved. Custom schemes/credentials/malformed values are not dispatched.
3. Android video IDs try `vnd.youtube://<id>` first, then canonical HTTPS through React Native Linking. No package-visibility precheck gates either operation. Non-Android callers start with HTTPS.
4. On HTTPS rejection, automatically tries the already-installed `expo-web-browser`. A `locked` browser result counts as a failure; dismiss/cancel after presentation does not. On total failure, show a clear error with Retry and Copy link. Clipboard failure is caught. Invalid values can be copied for support but are not opened.

No iframe/WebView is used for video playback. YouTube embed errors 150/153, iframe referrer, originWhitelist, JavaScriptEnabled and autoplay settings are not involved in this path. No embedded player dependency was added; external playback uses the existing browser/clipboard packages and avoids increasing the dependency surface.

`expo config --type introspect --json` was executed and its relevant manifest output saved in evidence. This verifies **locally generated configuration, not the installed APK**:

* package `in.medveda.app`, custom scheme `medveda`, MainActivity `singleTask`;
* HTTPS VIEW+BROWSABLE query already present, plus HTTP, UPI and mailto queries;
* no explicit `com.google.android.youtube` package query or `vnd.youtube` query;
* those extra queries are not required for our direct `startActivity`/openURL path, because we do not ask Android whether YouTube is installed. The existing HTTPS query supports the browser resolver used by expo-web-browser. No speculative manifest change was made;
* outbound links do not need incoming YouTube host intent filters; claiming those hosts in MedVeda would be incorrect;
* cleartext remains disabled; opener produces HTTPS links;
* Hermes is the default Expo engine. R8/shrinking remains opt-in under `ANDROID_SHRINK=1`, not enabled for ordinary production. No evidence supports a stripping bug. React Native Linking is used consistently; no expo-linking mismatch was found.

Expo EAS uses remote version codes; production and internal-testing use distinct channels. App config derives the Android runtime as `1.2.1-play` for the default provider. A local commit does not install or publish an update. Validate versionCode, channel and update ID on the phone before judging the new handler. A newly installed/current test build should show the new messages and trace stages, never the legacy video error.

References consulted: [Expo 57 reference](https://docs.expo.dev/versions/v57.0.0/) and installed React Native/Expo browser native sources. No live build was created on EAS, installed, submitted or published.

## Anonymous access: separate approval needed

The opener works without a session when given a URL. **End-to-end logged-out catalog browsing is not implemented**, because the existing app routes signed-out users to Login and the server is not an anonymous video catalog:

* video SELECT policies are authenticated/course-scoped with published-parent restrictions;
* `user_can_access_video` requires a signed-in, nonblocked profile; `get-video-url` returns 401 without a user and enforces its RPC;
* the current VideosScreen reads the table directly rather than calling that Edge Function.

The user's “logged in or not” requirement cannot be fulfilled securely by a frontend URL-opening change alone. For approval, separately review narrowly scoped anonymous SELECT on **published video metadata/URLs and necessary course/year/subject metadata**, or a dedicated public video catalog endpoint, plus a guest navigation entry. Preserve draft/private content and all note/purchase policies. Do not weaken the shared `has_content_access` helper or expose a service-role key. No such server change was made.

## Free-MCQ inventory and cleanup

A repository-wide text inventory is saved at `evidence/video-followup-20261026/mcq-copy-inventory.json`, with file/line/full matched text (207 matches at scan time). It covers app, admin, website and original/root website, Play listing/docs, SQL and Edge Function references. Generated dependency/build folders and old evidence archives were excluded. These are candidate mentions, not 207 defects.

| Location | Finding | Action |
| --- | --- | --- |
| `mobile-app/src/components/TestCard.tsx` | Dormant locked branch rendered “Premium - Purchase required to unlock”, lock icon and disabled download affordance | Removed the premium/lock presentation; cards always show FREE; preserved optional legacy props for caller compatibility |
| `screens/quiz/TestListScreen.tsx` | Screen already says MCQ Tests - Free and passes `locked=false`, but `free=false` suppressed row badge | Uses `free=true`; no purchase logic added |
| `services/searchService.ts`, `components/search/SearchResultRow.tsx`, `hooks/useGlobalSearch.ts` | Quiz results free, locks only on notes, product prices only on products; quiz route does not buy | Unchanged |
| `screens/details/ChapterDetailsScreen.tsx`, `types/product.ts`, admin `types/product.ts`/`types/quiz.ts` | Existing separation: Notes paid, videos/MCQs free | Unchanged |
| `components/UnlockOptionsPanel.tsx` | Stale comment mentions Videos/Quiz, but actual callers are Notes/ChapterDetails | Listed only; no purchase implementation changes |
| `website/_src/faq.mjs`, `_src/pages/{index,features,download,terms,how-it-works}.html`, generated site | Already describes free MCQs and paid PDF Notes | No misleading paid-MCQ copy found; unchanged |
| Root `index.html`, `terms.html`, original website | Free quiz wording; some mentions require registration | Unchanged; registration is distinct from a price gate |
| `docs/PLAY_LISTING_DRAFT.md`, `mobile-app/PLAY_STORE_SUBMISSION.md` | No MCQ price/purchase instruction found; listing advertises free MCQ practice | Unchanged |
| Earlier audit C1 and paid-MCQ backend proposal | Based on superseded product decision | Marked closed/withdrawn in the original audit report |
| `docs/security/review-20261020/{REPORT.md,proposed-database-fixes.sql,proposed-quiz-submission.sql,reproduce.sql,verify-proposed-fixes.sql}` | Historical paid-quiz entitlement proposal and fixtures | Listed as superseded product assumption; **do not deploy the paid-MCQ proposal**. Existing untracked historical files left untouched |
| `supabase/functions/get-video-url`, quiz migrations/RPCs | Authentication, publication, answer-key protection and course restrictions remain; current MCQ UI has no price gate | No Edge Function/schema/RLS edits. Answer-key protection and per-user grading must remain even for free quizzes |

No `grantPurchase.ts` exists. Current Razorpay grants use `_shared/settle.ts` and settlement RPCs; Play has its separate verification/settlement path. None was edited. No Notes, referral discount, wallet, order or payment file was changed.

## Validation and files

Both mobile `tsc --noEmit` and admin typecheck, repository lint, all mobile and admin selftests, independent server mock suites, website link checks and tracked secret scan were run after each fix. Expanded baseline exposed three unavailable-database harness failures; after-fix comparison found **zero new failures**. These were not silently counted as passes:

* `content-url-publication-selftest.cjs` requires a disposable migrated `TEMPLATE_DB`;
* `play-cron-config-selftest.cjs` and `ucb-cron-config-selftest.cjs` cannot create their scratch PostgreSQL database;
* full `supabase/tests/run-all.sh` stops at database creation, so SQL/concurrency suites remain unverified here.

Deno unit/API/PDF/hash suites: 14 tests passed. All five Deno selftest scripts also passed (payment backlog/gate, Play offers, Razorpay environment/refunds). Android production-mode Hermes export succeeded and emitted a 9.1 MB bytecode bundle. The expanded runner finished with 50 passed checks and three unchanged database-environment failures; all 21 mobile scripts and seven admin scripts passed. Results are recorded in evidence. The Android export is a bundle/compiler check, not a native APK launch test.

Video commit `a8459a4` changed:

* `mobile-app/src/utils/{videoLink.ts,videoUrl.ts,videoDiagnostics.ts}`
* `mobile-app/src/components/VideoCard.tsx`
* `mobile-app/src/screens/videos/VideosScreen.tsx`
* `mobile-app/src/repositories/videosRepository.ts`
* `mobile-app/scripts/{video-link-selftest.cjs,video-tap-selftest.cjs,video-data-selftest.cjs}`

Separate MCQ commit `40f31ea` changes only `mobile-app/src/components/TestCard.tsx` and `mobile-app/src/screens/quiz/TestListScreen.tsx`. Report/evidence updates are committed separately. Existing user modifications are not included.

## Manual Android checklist

- [ ] Install a build/update known to contain `a8459a4` and the MCQ cleanup. Record package, versionName, versionCode, EAS channel, runtime and update ID. VersionName 1.2.1 alone is insufficient. Do not use the `medveda-staging` recovery configuration as a production replacement.
- [ ] Use the supplied `https://youtu.be/WDejVw7vLKE?si=AkGMGz8VPp0MLbcm` and canonical `https://www.youtube.com/watch?v=WDejVw7vLKE`.
- [ ] Also test `https://m.youtube.com/watch?v=WDejVw7vLKE`, shorts/embed/live equivalents when the content supports them, trailing space/newline, wrapped quotes, a whole URL-encoded link, and a real playlist link.
- [ ] For each, test **Wi-Fi and mobile data**, both **with YouTube installed and with YouTube disabled/uninstalled**. With YouTube absent, HTTPS/browser must open. Confirm returning with Android Back leaves the list usable.
- [ ] Type in video search so the keyboard is open, then tap a result once. Verify press-in and press stages. Test after clearing search and after rapid subject switching.
- [ ] In development inspect `adb logcat -s ReactNativeJS` for `[video-open-v2]`; compare `row.received.raw` to the admin's `youtube_url`, then `card.press.raw`, normalized URL and each attempted target. Do not paste unrelated auth/session logs. In release inspect the sanitized Sentry stage breadcrumbs and build identity.
- [ ] If the phone still says **“Could not open the link”**, verify the installed bundle/alternate screen before changing the parser again. If `native.rejected` occurs, expect HTTPS; if HTTPS rejects, expect browser. `*.resolved` only confirms OS handoff—check actual playback separately.
- [ ] Offline: a browser may launch but display its own network error; reconnect and retry. A successfully resolved external intent cannot report downstream playback failure back to the app.
- [ ] With no usable browser/YouTube, verify final Retry and Copy link; paste the canonical link elsewhere. Missing/invalid URL shows a safe message and copies the original value for support when available.
- [ ] Logged-in nonbuyer: videos and MCQs open without purchase; quiz rows/search results show free. Logged-out URL helper has no auth check; guest catalog remains blocked pending the approved work above.
- [ ] MCQ start, submit, score, offline download/remove; paid Notes still locked for nonbuyers. Existing buyers retain Notes access. Run Play purchase/restore and authorized Razorpay/UPI recovery, referral/wallet regression checks before release.
