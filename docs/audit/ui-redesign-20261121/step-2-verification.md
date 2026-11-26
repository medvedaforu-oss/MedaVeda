# Step 2 — Question Papers UI

2026-11-21. Implements the accepted restrained design brief. Home/tabs are outside this step.

## Result

The library shows a compact year selector and that year's subjects directly. It defaults to the student's actual current year, or the first available year when the current one is unavailable. All four existing route names and parameter contracts remain registered, including the direct subject route. Native stack headers are hidden for these four routes only; the shared ScreenHeader supplies the sole title/back control inside the top safe area.

Subjects use plain rows, optional search at 12 or more subjects, and no subtitle or leading icon. Papers use neutral, nonsticky year labels and one row per paper. Row tap opens the same viewer route; a sibling 44px download action mounts the existing guarded download hook only after the explicit tap. Long titles wrap and rows grow with text. Paper IDs remain list keys; rows are memoized and lists virtualized.

The reader has one single-line title with back/download/share controls, a neutral spinner, short errors with Retry, and a native page count based only on actual viewer events. Web has no invented page count. Sharing uses the current signed PDF link where platform sharing is supported; it is disabled in unsupported browsers. No file-sharing dependency was added.

## Data and behavior boundaries

The service, types, resource/PDF/preview hooks and native/web download implementations match the pre-Step-2 snapshot hashes. Dependency manifests, navigation types and Home also match. The only navigator changes in this step are header presentation options for the four existing paper routes. No Supabase query, auth, payment, schema or storage change was made.

Subjects do not expose paper counts. Downloads export files to the selected device folder, the iOS export menu or browser downloads; they do not supply an app-owned saved-state catalog. Counts, sizes, downloaded checks and lock states are therefore omitted. Free published-paper access remains unchanged. Download results report real outcomes from the existing hook, without claiming in-app offline availability.

## Before / after

Layout definitions at normal text size; hardware measurements are pending. Heights are minimums, never fixed clipping limits.

| Element | Before | After |
| --- | --- | --- |
| Subject row | 80px minimum; typically ~82px | 56px minimum, grows with title |
| Paper row | 80px minimum; typically ~106px with three text lines | 56px minimum; ~60px for two title lines |
| Screen inset | 20px | 16px |
| Row inset | 16px on every side inside bordered card | 8px vertical; 0px extra horizontal inside screen inset |
| Section separation | Repeated month/year labels | 24px before plain year label, 8px after |
| Subject elements | 4: icon, title, subtitle, chevron | 2: title, chevron |
| Paper elements | 6: icon, PDF badge, title, subtitle, helper link, chevron | 2: title, download action |
| Search | ~46px after Step 1 | 44px, only for long subject lists |

Removed: in-page headings repeating the header, breadcrumbs, description paragraphs, “Always free”, “Browse exam sessions”, “Explore subjects and past papers”, “View paper · Download in reader”, repeated subject/year metadata in paper rows, PDF badges, icon tiles, per-item borders/radii, the block offline banner, duplicate reader toolbar title/subtitle, and loading/empty-state filler sentences. There are no emoji, gradients, colorful item tints, glows or decorative/looping animations in this flow. The spinner is functional loading feedback.

## Changed source files

- `mobile-app/src/components/Chip.tsx`
- `mobile-app/src/components/EmptyState.tsx`
- `mobile-app/src/components/IconButton.tsx`
- `mobile-app/src/components/ListRow.tsx`
- `mobile-app/src/components/ScreenHeader.tsx`
- `mobile-app/src/components/SearchBar.tsx`
- `mobile-app/src/components/SegmentedControl.tsx`
- `mobile-app/src/features/question-papers/PaperDownload.tsx`
- `mobile-app/src/features/question-papers/PaperLayout.tsx`
- `mobile-app/src/features/question-papers/PaperReaderToolbar.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.native.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.web.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperSessionsScreen.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperSubjectsScreen.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperYearsScreen.tsx`
- `mobile-app/src/navigation/AppNavigator.tsx`
- `mobile-app/src/theme/layout.ts`

Tests updated: `ui-foundation-selftest.cjs`, `question-papers-redesign-selftest.cjs`, `question-papers-ui-selftest.cjs`, `question-papers-lifecycle-selftest.cjs`. Added: `question-papers-step2-selftest.cjs`. Existing lifecycle, stale-account, published-only and platform download assertions were retained; view-specific assertions were adapted to the new shared header/virtualized lists.

## Verification

- Strict TypeScript: `cd mobile-app && ./node_modules/.bin/tsc --noEmit` — PASS, exit 0.
- ESLint on all Step-2 changed source files — PASS, exit 0.
- A wider scan of the entire feature also reports a pre-existing `react-hooks/exhaustive-deps` finding at `usePaperResource.ts:26` for the `revision` dependency. That hook is byte-identical to the baseline; revision drives retries and was not removed to silence lint.
- Question Papers service, UI, redesign, lifecycle, web-preview, platform-download and Step-2 selftests — PASS.
- Shared-foundation, accessibility, list-state, lazy-navigation, auth-navigation and icon-control selftests — PASS. An initial auth-navigation run used the mobile subdirectory incorrectly; rerunning from repository root passed.
- Protected-file SHA-256 comparison — PASS. Home, core paper hooks/services/types/downloads and dependency manifests remain unchanged.
- Web export: `cd mobile-app && EXPO_OFFLINE=1 ./node_modules/.bin/expo export --platform web --output-dir /tmp/medveda-step2-web-final` — PASS, exit 0; 2,538 modules bundled, output contains `index.html`, metadata and three JS bundles. This proves bundling, not visual/device rendering.
- A broader mobile selftest sweep was interrupted; it is not reported as a passing full suite. `android-vault-preflight-selftest.cjs:29` failed because the working configuration reports `razorpay` while the assertion expects `disabled`. This step does not edit payment configuration. The partial broad-run log is `/tmp/medveda-step2-selftests.log`. No full-suite pass is claimed.

No emulator/device/browser visual checks are claimed. The 360px layout was reviewed from constraints: 16px screen insets, flexible title column, sibling 44px actions; body titles wrap without a line cap. At large font scale rows/header grow; the viewer title intentionally ellipsizes with the full accessibility name retained. Text and quiet icons use the theme's primary/secondary text colors; the Step-1 secondary-on-surface contrast is 6.69:1. No accent is used except the active year state.

## Manual flow checklist

- [ ] Library opens directly to the actual profile year; switch 1st/2nd/3rd and confirm subjects; changing course does not reveal the previous scope.
- [ ] Direct Subjects route and back navigation still work with existing params; reader back returns to the same subject/year.
- [ ] Short lists omit search. At 12+ subjects, test typing, clear, Marathi/English search, no matches and keyboard dismissal.
- [ ] Subject and paper titles at 360px and large widths; long Marathi/English titles; largest font scale. Rows wrap without clipping and actions remain at least 44px.
- [ ] Papers from multiple sessions share one plain year heading; the session remains visible without repeating that year.
- [ ] Tap paper opens PDF; tap download exports once without triggering navigation. Test success, double tap, cancel, storage permission denial, interruption, Retry and dismiss.
- [ ] Offline icon is in the header with the accessible name “Offline”. No banner is added. Test offline on library, papers and reader, then reconnect and Retry.
- [ ] Downloaded files remain readable through the existing external device/browser download location offline. No in-app “downloaded” check is claimed.
- [ ] Locked/unpublished/unavailable paper: verify existing access denial and short Retry state; never fabricate a lock or expose unpublished data.
- [ ] Native PDF loading, viewer failure, expired-link Retry, actual page events and source change resetting the page indicator; web validated-object preview and unsupported-browser fallback.
- [ ] Download/share header controls stay reachable at 360px and large text. Native/platform share opens the actual current link; unsupported browsers expose a disabled share action; cancellation causes no error alert.
- [ ] Screen reader: one screen title, back, full subject/session/year labels, separately focusable download action, selected year, loading/error/offline announcements, real page label.
- [ ] Safe-area/status-bar and bottom insets; Android hardware Back; reduced-motion press feedback; no decorative animation.

Step 3 (Home/tabs) is not started. Await user review after this step.
