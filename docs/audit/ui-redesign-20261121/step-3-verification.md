# Step 3 — Home and bottom tabs

2026-11-22. Scope: Home presentation, its shared header/profile/continue components, the bottom tab bar, and moving the existing Question Papers entry into the existing menu. Step 4 is not started. Existing dirty-checkout work was preserved; no dependency, Supabase, auth, payment, route registration, route parameter or data-model edits.

## Result and data boundaries

Home contains only profile summary, optional continue-learning row, and academic years, in that order. Screen padding is 16px and section gaps are 24px. Years use Step 2's memoized plain ListRow with stable database IDs and a 56px minimum height; actual titles and navigation params are preserved. No year colors or invented counts.

The profile has a neutral 44px initial avatar, wrapping name and course/year, and a plain positive streak from the existing local activity tracker after it loads. The decorative initial does not scale; the actual name/course/streak do. Email and package count are omitted. The previous ring represented average quiz score, not learning completion, so it is omitted rather than presented as course progress. The existing activity entry has no chapter progress value, so no progress bar is drawn. Existing component prop contracts remain compatible.

Continue learning uses the shared plain row, chapter title and one short subject/year context string. Text can wrap for long names and large fonts. It is absent when there is no stored chapter. Its accessible name explicitly says “Continue learning”. Loading uses Step 1 skeletons sized to the default rows/summary; optional content can disappear once absence is known, and long data can legitimately expand rows.

HomeHeader now uses ScreenHeader with an optional leadingAction extension, matching the accepted background/typography. Menu, Search, Notifications and Settings remain functional, with 44px targets. The real unread notification count remains in the bell's accessible name. The existing Question Papers shortcut was moved into SideDrawer as a shared plain row so removing Quick Access does not strand Step 2. Other drawer content remains outside this redesign.

The five existing destinations remain Home, MyPurchases, Store (labelled Notes), Downloads and Profile. All five have the same icon/label treatment and equal flex width. Only the selected icon/label uses copper. Labels have no line cap or fixed text height and can wrap. The bar reserves its actual height in normal flow, has a surface background and hairline top border, and adds the real bottom safe-area inset. Shared press feedback respects system reduced motion.

All original Home loaders, fetch arguments, effects, refresh behavior and chapter-navigation callback bodies are byte-identical to the immediate pre-Step-3 snapshot. Fetches for sections whose UI was removed intentionally remain: removing those calls would exceed the visual-only boundary. No services/hooks were changed.

## Before / after

Values below describe layout definitions at default text scale, not device measurements. Old components lacked explicit text line heights, so content-dependent estimates are identified. Wrapping and large text increase height deliberately.

| Item | Before | After | Visible content groups before → after |
| --- | --- | --- | --- |
| Profile summary | At least 98px: 72px ring + 24px padding + 2px border; often taller with email/course/package/streak text | 72px minimum; 44px avatar and 8px vertical padding; about 27% below the old minimum | 7 → up to 4: avatar, name, course, real positive streak |
| Continue learning | About 76–80px, plus 20px bottom margin; 48px play tile + 24px padding, three text lines | 56px minimum; 58px with default title/context line heights, no outer card margin | 5 → 3: chapter, context, chevron |
| Academic year row | 78px minimum: 52px icon + 24px padding + 2px border; plus 12px bottom margin | 56px minimum; no per-row margin | 4 → 2: real title, chevron |
| Bottom tab bar | At least 79px in normal flow: 48px tab + 30px padding + 1px border; raised center halo extends above it | About 56px + hairline + actual bottom inset; grows with scaled labels | 2 → 2 per tab: vector icon, label; Notes has equal size |

“Content groups” counts meaningful displayed units, not React layout wrappers; ring/streak each count as one group. Decorative layers are listed separately below.

## Removed

- Home Quick Access heading and its four feature tiles (Question Papers moved to the menu; PDF Notes, Video Lectures and MCQ Test shortcuts removed).
- Buy Notes, Latest Updates, Recommended For You, Recently Viewed, Purchased Packages and Notifications sections, their See all actions, their carousels, loading/empty copy and cards; Browse Notes store banner and its subtitle; daily quote.
- Profile email, package count/icon, graduation emoji, quiz-score ring/percentage/“progress” label, card gradient, border/shadow/glow, avatar sheen and copper avatar fill.
- Continue-learning play emoji and icon container, uppercase eyebrow, copper surface/glow and entrance spring/fade.
- Academic-year emoji icons, tinted badges, glow dots, per-year chevron colors, “Tap to explore subjects”, individual bordered card shells and staggered entrances.
- Header gradient, logo image, emoji/text-glyph controls, tinted circular button backgrounds and entrance animation; visual unread badge (real count retained in accessibility label).
- Tab emojis, selected pill backgrounds, raised shadow, hexagon triangles/middle, 92px halo, negative margin, center glow and spring bounce. Fixed 22px bottom padding replaced with the safe-area inset.
- Home's purchase-ownership status banner and purchasing overlay, which related to removed purchase content. Purchase hooks/refresh behavior remain intact.

## Changed files

- `mobile-app/src/screens/home/HomeScreen.tsx`
- `mobile-app/src/components/StudentProfileCard.tsx`
- `mobile-app/src/components/ContinueLearningCard.tsx`
- `mobile-app/src/components/HomeHeader.tsx`
- `mobile-app/src/components/BottomNav.tsx`
- `mobile-app/src/components/ScreenHeader.tsx` — optional leading action, existing callers unchanged.
- `mobile-app/src/components/SideDrawer.tsx` — existing Question Papers action relocated here.
- `mobile-app/src/theme/layout.ts` — shared profile-summary and tab-bar sizes.
- `mobile-app/scripts/question-papers-ui-selftest.cjs` — replace obsolete exact-Home/Quick-Access source assertion with the relocated menu entry assertion; retain resource/account/session-to-PDF tests.
- `docs/superpowers/plans/2026-11-22-home-tabs-step3.md`
- `docs/audit/ui-redesign-20261121/step-3-verification.md`

## Verification

- Strict TypeScript: `cd mobile-app && ./node_modules/.bin/tsc --noEmit` (also rerun with `-p mobile-app/tsconfig.json` from root) — exit 0, final source.
- ESLint on the eight changed TS/TSX files listed above — exit 0, final source. The changed CJS test is outside the repository's configured lint targets.
- Existing targeted selftests passed: `ui-foundation`, `accessibility`, `list-states`, `question-papers`, `question-papers-ui`, `question-papers-redesign`, `question-papers-lifecycle`, `question-papers-download`, `question-papers-web-preview`, `question-papers-step2`, `navigation-lazy`, `audit-navigation`, `audit-icon-controls`, `purchases-unavailable-ui`. The old Question Papers test initially asserted exact preservation of Home Quick Access; that obsolete source assertion was updated for the relocated menu entry, and its retained behavioral assertions pass. List-states initially timed out during concurrent heavy checks; a separate rerun passed.
- `git diff --check` over changed tracked source — exit 0.
- Web export: an initial export passed (2,529 modules), but inspection found it had bundled the earlier 80px summary token before final edits. The final rerun `cd mobile-app && EXPO_OFFLINE=1 ./node_modules/.bin/expo export --platform web --max-workers 2 --output-dir /tmp/medveda-step3-web-final-current` passed, exit 0. Bundle inspection confirms the final 72px token and relocated Question papers menu entry. Artifacts include index.html, metadata and three JS bundles. Log: `/tmp/medveda-step3-web-current.log`. This proves bundling, not rendering.

### The two known findings — intentionally unchanged

1. `usePaperResource.ts:26`: isolated ESLint reproduces the unnecessary `revision` dependency finding, exit 1. That file was not edited.
2. `android-vault-preflight-selftest.cjs:29`: configured provider is `razorpay`, assertion expects `disabled`. Reproduced; no payment configuration or assertion was changed.

### Additional existing check limitations

An interrupted broad CJS/MJS/JS mobile selftest attempt recorded 12 passes, 3 failures and 6 timeouts before interruption. No full-suite pass is claimed. Its recorded failures were the known Android vault mismatch, `firebase-config-selftest.cjs:20` (same `razorpay` versus `disabled` expectation), and `course-year-selection-selftest.cjs` (`Unexpected import ../../theme/layout` in its existing onboarding-screen mocks). No referenced configuration or onboarding files were edited.

The additional targeted `mv011-accessibility-selftest.cjs` fails on `Unexpected import react-native` while its existing mocks load typography; it also contains an old accent-color assertion. Typography/colors and that test are unchanged. These unrelated harness/configuration findings were left for their own work.

The broad attempt timed out on `closed-testing`, `course-state-race`, `course-year-confirmation`, `list-states`, `load-resource` and `login-network`; list-states subsequently passed as noted above. Remaining timed-out checks are not reported as passing. Logs: `/tmp/medveda-step3-selftests.log`, `/tmp/medveda-step3-selftests-summary.txt`, `/tmp/medveda-step3-targeted.log`, `/tmp/medveda-step3-list-states-final.log`, `/tmp/medveda-step3-paper-ui-final.log`, `/tmp/medveda-step3-tsc-final.log`, `/tmp/medveda-step3-eslint-final.log`, `/tmp/medveda-step3-known-lint.log`.

Static independent review: no remaining important findings after restoring the Question Papers entry. Exact comparison of Home's loader/effect/refresh/chapter callback region against `/tmp/medveda-step3-before/HomeScreen.tsx` passed. This comparison is against this task's baseline, not HEAD, because HEAD predates accepted work.

No device, emulator, screenshot, TalkBack/VoiceOver or live-backend checks are claimed. Shared primary/secondary text and selected copper are used on dark backgrounds; Step 1 measured secondary text on surface at 6.69:1. The 360px layout is reasoned from constraints: 16px insets leave 328px for full-width year rows; tabs receive 72px each before their internal padding. With three normal short year titles, all years fit a typical 360px phone viewport. Short viewports and large text remain scrollable rather than clipped. This is not a measured no-scroll guarantee at every screen height.

## Manual checklist — not yet run

- [ ] At 360px and large phone widths, verify profile/name/course, optional chapter context and all three real year rows. Try long English and Marathi names; no clipped glyphs or horizontal overflow.
- [ ] Largest text size: name/course/streak and chapter/year rows wrap, header grows, all five tab labels remain readable and targets remain at least 44px.
- [ ] Offline/slow connection: profile/year skeletons, real error copy and pull-to-refresh; previously stored continue activity; no fabricated offline access/progress. Reconnect and refresh.
- [ ] New account with no stored chapter: Continue learning disappears; real chapter returns after reading. Existing ChapterDetails params remain correct.
- [ ] Real positive streak shown only after loading; no quiz score presented as course completion; absent course data produces no placeholder course.
- [ ] Menu opens/closes, Question papers opens Step 2, Search/Notifications/Settings work; real unread count announced. Check Android hardware Back.
- [ ] Screen reader: screen and section headings, full profile/course, continue chapter/context, year actions, selected tab, unread count, loading states and menu entry; decorative avatar/icon does not duplicate the name.
- [ ] Reduced motion: quiet shared press feedback, static skeleton under reduced motion, no profile/continue/year/header/tab entrance or bounce.
- [ ] Home: final year row scrolls completely above the bar, including gesture-navigation and three-button-navigation insets.
- [ ] Purchases: final history/empty/error content remains above the bar; large tab labels grow without overlay.
- [ ] Notes (Store): final catalog/locked/owned card and buy controls stay above the bar; unchanged purchase/loading overlay behavior.
- [ ] Downloads: final download row and pause/resume/retry/delete controls stay above the bar, including empty/error/loading states.
- [ ] Profile: final settings/logout action scrolls completely above the bar.
- [ ] Locked and unlocked chapters/Notes retain existing access and purchase behavior; Home year/continue actions do not imply ownership. Question Papers access denial/unpublished behavior remains unchanged.

Static clearance audit: all five screens place BottomNav after a flexing ScrollView/FlatList/container, not absolutely over content. Home has 24px content-bottom padding; Purchases, Notes and Downloads have existing 32px content-bottom padding; Profile has existing 40px. No Step 4 screen styling was edited.

Stop after Step 3 for user review.
