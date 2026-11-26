# Step 4 — remaining mobile UI migration

2026-11-22. Implements the accepted Step 2 Question Papers / Step 3 Home visual language across the remaining 37 audited screen implementations. Subjects and Chapters receive residual surrounding-copy cleanup. Existing dirty-checkout changes are preserved. No commit or push.

## Scope and result

The audit contains 45 screen implementations. Five Question Papers implementations plus Home, Subjects and Chapters account for the eight already migrated implementations. This step covers the remaining 37, grouped below in implementation order. Authenticator OTP and quiz results are states within existing screens; wallet is within Referral and OrderSummary; there are no invented routes.

1. Purchases and Downloads: shared plain rows, real dates/amounts/download progress, quiet storage summary and existing filters and deletion controls. Downloads open and control actions are siblings; progress/pause/failure/completed states remain explicit. Category storage dashboard removed; actual total storage remains.
2. Profile and Settings: existing menu wrappers delegate to ListRow, neutral 44px avatar, real account details, plain quiz statistics, hairline preferences, compact reminder rows and 48px form fields. Logout/delete use danger styling and retain their confirmation/busy behavior.
3. Study materials: ChapterDetails feature entries, notes, videos and tests use shared rows. Notes show one of Free/Unlocked/Locked; actual downloaded/progress state remains separate operational information. Videos/MCQs remain free regardless of legacy locked props. Results preserve verified/pending/rejected/stale/legacy scoring. Native/web note readers retain entitlement and fresh-link checks, real native page events and platform-specific retry behavior.
4. Search and Notifications: shared compact results, neutral type/access text, plain recent-search rows, quiet filters, one-line empty messages, row skeletons, wrapping notification copy and existing swipe archive. Category preference and archive behavior remain intact.
5. Auth: 48px fields, quiet strength length/text, inline validation and compact lockout. Login/register/forgot/reset/recovery/MFA/OTP and splash preserve handlers, guards and navigation. Marketing taglines and oversized auth logos removed; splash retains a small existing brand asset.
6. Payment/purchases/referrals: Store's subject poster carousel becomes vertical rows, with separate Buy actions. Order summary, wallet, referral history, checkout loading and success/failure/pending presentation use tokens. Pending has a neutral spinner and “Confirming your payment”; genuine failure has a danger vector icon. Payment routes do not receive a generic header Back action that could bypass existing checkout recovery/back handling.
7. Remaining: informational/legal/contact pages, course/year choices, Years, maintenance/update, drawer, dialogs, fallback errors, loaders and compatibility components. Headerless stack screens receive the established ScreenHeader through native header presentation; existing study stack headers use that same primitive. Tabs retain their in-flow BottomNav and actual bottom inset; non-tab screens own the appropriate bottom/side safe areas. PDF/checkout wrapper components do not double-apply insets.

## Behavior boundary evidence

Comparison is against `/tmp/medveda-step4-before/src`, captured before this task, because HEAD predates accepted redesign work.

- `src/hooks`, `src/features` (including Question Papers), `src/types`, `src/config`, `src/validation`: byte-identical to the task baseline. Dependency manifest is unchanged. Home is byte-identical.
- PaymentCheckout, PaymentFailed, OrderSummary, PaymentSuccess, Login, Register and ResetPassword: non-JSX function statements compare unchanged after ignoring whitespace and removed presentation-only safe-inset reads. Checkout bridge JavaScript from its script tag onward is byte-identical.
- Query/auth/navigation call expressions are unchanged. The broad expression matcher also matches `Array.from`; the only flagged differences were decorative array/particle/skeleton generation in Skeleton, SuccessBurst and Search. Those are presentation changes.
- The only service edit is the scheduled reminder's displayed title: remove the emoji/exclamation mark. Scheduling logic is untouched. Search metadata/models are untouched.
- Checkout template changes are CSS tokens, removing its leaf decoration, and the existing Razorpay theme color using the shared primary token. Escaping, option construction, payment/bridge callbacks and recovery are preserved.
- No Supabase query, auth policy, schema, model, payment-provider config, webhook, bridge protocol, route registration/name/params, checkout request or recovery polling change. No new dependencies, admin-panel or website edits.

## Before / after

Layout definitions at normal text scale, not device measurements. All heights below are minima/content estimates; long text deliberately increases height. Content groups count meaningful visible units, not React wrappers.

| Surface | Before | After | Visible groups per item before → after |
| --- | --- | --- | --- |
| Purchases | Content-sized bordered card, 12px padding + 12px inter-card margin; 20px screen inset; hardcoded 60px top | Shared row minimum 56px; 8px vertical / 0px extra horizontal padding; 16px screen inset; actual top safe area + 56px minimum header | 6 → 6 when all real fields exist: title, amount, scope, status, order ID, date; no duplicated screen subtitle or status emoji. Missing date omitted. Transaction detail legitimately exceeds a single-line row height. |
| Downloads | Content-sized card, 20px padding + 12px item margin; 28px emoji; 48px controls with extra gaps; 20px screen inset | Shared row minimum 56px; 8px vertical / 0px extra horizontal; 16px screen inset; 44px sibling controls. A title plus two 16px metadata lines is about 70px before wrapping. | 5 → 4 for completed item: title, subject/chapter context, actual size/date/downloaded state, delete action; leading emoji removed |
| Profile menu | 18px vertical/horizontal padding + 14px item margin; emoji/title/arrow; 20px screen inset | Shared 56px minimum; 8px vertical / 0px extra horizontal; hairline; 16px screen inset | 3 → 2: title, chevron |
| Settings menu | 20px padding + 12px margin; individual bordered/shadow card; 20px screen inset | Shared 56px minimum; 8px vertical / 0px extra horizontal; hairline; 16px screen inset | 3 → 2: title, chevron; destructive title uses danger |
| Login | Input height was content/padding-dependent; 25px screen inset; logo/title/tagline before form | Input minimum 48px; 12px horizontal/vertical padding; 16px screen inset; quiet heading, real safe-area edges; password toggle minimum 44px | Intro 3 → 1; input retains its value/placeholder and password toggle; lockout/validation shown only when applicable |

## Removed

- Purchases' “Your order & payment history” subtitle and status emojis; empty-state explanatory paragraph.
- Downloads' repeated in-body heading, three-block storage dashboard (Notes/Quizzes/Failed), colored offline box, item emoji, rounded action tiles, oversized empty explanation and local filter-chip styling. Actual total bytes/count, filter choices, offline access restriction information and all controls remain.
- Profile/settings menu emojis, individual bordered card wrappers, shadows and per-row margins; large copper avatar/glow; boxed/colorful stat tiles; duplicate fallback account placeholder. Existing real account details and quiz statistics remain.
- Study-material leading emoji tiles, separate FREE badge, “Premium content”, “Tap to open”, “Tap to Watch Video”, “Tap to Start Test”, repeated free lecture/test subtitles, duplicate Study Notes subtitle, chapter hub's repeated emoji access sentence. One real access indicator replaces these.
- Quiz trophy/book decoration, celebration particles, oversized result-card shadow and redundant progress label/helper sentence. Timer, navigation and score verification remain.
- Search emoji/type tiles, stacked access badges, decorative welcome icon and explanatory welcome paragraph, repeating section emoji, recent-search clock/close text glyphs and pill shells. Search history clearing/removal remains.
- Notifications' repeated subtitle, type emoji, archive emoji, read-opacity fading that weakened contrast, boxed rows and long empty-state copy.
- Auth marketing taglines, login/register logos, forgot/reset lock/key emojis, large centered form hero layout, colorful password-strength segments. Real recovery guidance/lockout/strength/validation remain.
- Store's placeholder covers, academic-year colors, cover emojis, Owned pills, discount-percentage decoration and horizontal subject carousel; genuine price/MRP and ownership remain. Payment success exclamation mark, pending hourglass and failure emoji are replaced by restrained states. Referral hero fill/boxed sections and copied checkmark are removed.
- About's decorative book, Mission/Vision/feature-list filler; repeated in-body legal/contact/referral headings; social brand-color icon buttons replaced with named neutral actions retaining their URLs; drawer menu emoji/colored avatar/decorative motion; Years helper paragraphs/repeated heading; reminder's redundant subtitle/“Tap to change”.
- Delayed/staggered decorative entrances, notification bounce, streak pop, success burst; unused local StyleSheet entries. Shared press feedback and functional loading/progress remain and honor reduced motion.

## Consistency scan

Whole `src` TS/TSX scan:

- Hardcoded hex / rgb / rgba colors outside `src/theme`: **0**. Shared backdrop/overlay colors live in theme; checkout CSS interpolates theme tokens. HTML entity escaping remains unchanged.
- Emoji in displayed TSX strings and checkout template: **0**. `©` in About is a copyright symbol, not decorative emoji.
- Raw emoji metadata remains in **12 entries** in `src/types/search.ts` and `src/services/searchService.ts` (nine type icons and three discovery-section icons). They are no longer rendered: result/filter/section presentation uses labels. Kept to obey the no-model/data/service-change boundary. No service metadata icon is used as UI text in the migrated consumers. Scheduled reminder title has no emoji.
- Shared row/card wrappers (YearCard, FeatureCard, SettingsItem, ProfileMenuCard, ProductCard, MiniChapterCard, NoteCard, VideoCard, TestCard, SearchResultRow) delegate to ListRow. Remaining local `row`/`card` names are layout-only: download sibling controls/progress, notification swipe content, referral history columns, reminder switch/time arrangement, price summary lines and modal dialog shell. They use semantic tokens/hairlines and do not recreate bordered content cards.
- Compatibility foundation components GridCard/CompactCard and the unused gradient utility remain exported to preserve prior prop contracts. No migrated content uses decorative gradients. SuccessBurst retains its signature and renders no decoration; Home does not mount DailyQuoteCard. Structural `flex`, zero edges, percentages, line counts and aspect ratios remain literal where they describe layout rather than spacing tokens.
- Native reader content and payment WebView retain their functional full-size layouts. PDF title intentionally remains managed by the established native stack header; page count comes only from native events. No fake metadata added.

## Verification

- Expo SDK 57 versioned docs read before implementation: https://docs.expo.dev/versions/v57.0.0/.
- Strict TypeScript: `./node_modules/.bin/tsc --noEmit` — exit 0.
- ESLint: repository tooling binary on all changed TS/TSX source files — exit 0.
- `git diff --check` on this task's changed source — exit 0 after trailing whitespace cleanup.
- Relevant selftests: 38 scripts pass, including 26 password-recovery cases, 24 purchase-history cases, ownership races, polling, payment verdicts, price summary, unavailable purchases, real checkout guard behavior, quiz input/editing/hooks, search, notifications, accessibility, list states and navigation. Password-policy selftest also passes (24 pattern checks). This is a targeted set, not a full-suite claim.
- Presentation test adapters explicitly allow only shared UI/native-safe-area imports and render the actual shared row/button/header primitives; domain mocks/assertions remain. Updated obsolete assertions cover skeletons instead of spinners, sentence-case/emoji-free labels, omitted missing dates, safe-area frames and contextual controls. A navigation regression assertion ensures checkout's generic header cannot expose Back and bypass recovery.
- Web export: `EXPO_OFFLINE=1 ./node_modules/.bin/expo export --platform web --max-workers 2 --output-dir /tmp/medveda-step4-web-delivery` — exit 0; index.html, metadata and three bundles. Bundling proves build compatibility, not visual/device behavior.
- Independent read-only review found generic payment header Back bypass, duplicate checkout/PDF insets, lost contextual Buy labels and radio checked semantics. All corrected and relevant checks rerun.

Logs: `/tmp/medveda-step4-tsc-final.log`, `/tmp/medveda-step4-eslint-final.log`, `/tmp/medveda-step4-test-summary.txt`, `/tmp/medveda-step4-test-*.log`, `/tmp/medveda-step4-password-policy.log`, `/tmp/medveda-step4-boundaries.log`, `/tmp/medveda-step4-web-delivery.log`, `/tmp/medveda-step4-diff-check.log`, `/tmp/medveda-step4-consistency.log`.

### Existing findings kept separate

- `usePaperResource.ts:26`: unnecessary `revision` dependency lint error reproduced; file unchanged.
- Android vault preflight still expects disabled while configuration uses razorpay; unchanged.
- Firebase config test has the same pre-existing provider expectation mismatch; unchanged.
- Course/year selection test retains its pre-existing onboarding theme/layout mock failure; no attempt to fix this harness beyond required migration checks.
- `mv011-accessibility-selftest` retains its pre-existing `react-native` mock/old accent assertion limitation; unchanged.
- Step 3's unrelated interrupted/time-limited broad-suite checks are not claimed passing. No device, emulator, browser screenshot, live auth/backend, real payment or full-suite validation performed.

## Manual checklist — every migrated screen, not run

For **each** screen below: test 360px and large widths; short and long English/Marathi text; largest text setting; TalkBack/VoiceOver focus order, full titles and control names; reduced motion; notches/status bar/gesture and three-button navigation insets; short windows/keyboard; scroll to the last action. Confirm text wraps, icons do not duplicate announcements, buttons have at least 44px targets and no tab overlap. Loading content can grow when real long data arrives; no fixed row clipping is expected. Existing Step 1 primary/secondary-on-dark contrast applies; inspect all error/disabled states on device.

| Screen implementation | Flow/state checks |
| --- | --- |
| Purchases | Empty/loading/error/Retry; focus/foreground refresh; multiple purchases/statuses; real amounts/IDs/dates; missing date omitted; long ID selectable; account switch clears old history; final row above tabs. |
| Downloads | Empty/loading/pull refresh; All/Notes/Quizzes filters; real total bytes/count; offline completed quiz/free-preview access versus paid-note internet restriction; queued/downloading/paused/failed/completed; progress; independent pause/resume/retry/cancel; delete Cancel/Confirm; Clear all Cancel/Confirm; final row and controls above tabs. |
| Profile | Actual name/email/course/year/mobile; missing fields omitted; real quiz statistics/legacy note; every menu destination; referral gate on/off; share; logout Cancel/Confirm; final action above tabs. |
| EditProfile | Name/mobile values, invalid phone, save disabled/busy and success/failure; keyboard scroll; long account details; unchanged partial-save messaging. |
| ChangePassword | Current/new/confirm fields; policy/mismatch/current-password errors; duplicate taps/busy; success and network failure; keyboard/inline error visibility. |
| Settings | All existing rows and external destinations; logout Cancel/Confirm; deletion Cancel/Confirm, busy dismiss prevention and server failure; danger labels. |
| NotificationPreferences | Category load, disabled while loading/saving, toggle persistence, failure restoration, mute/unmute feed filtering; scope explanation retained; long category text. |
| StudyReminder | Load/error/Retry; supported/unsupported; permission denial/Open Settings; enable/disable; changing time; cancel/done picker; offline existing device schedule; saving control state. |
| ChapterDetails | Long chapter name; ownership loading/error; Notes Locked/Unlocked; free videos/quiz paths; existing Android purchase options; slow ownership refresh. |
| Notes | Search/load/empty/error; Free/Unlocked/Locked exactly once; real description; paid online-only text; opening busy; download progress/remove; offline preview expiry/revocation; locked purchase options; long titles. |
| Videos | Subject/title search/loading/no results/error/Retry; actual URL opener; press and keyboard forwarding; legacy locked prop cannot block free video. |
| TestList | Loading/empty/error/Retry; actual question count/free/downloaded; open and sibling download/remove; save busy; offline persisted quiz; long title. |
| Quiz + results | Online/offline input; malformed/missing quiz recovery; option selection, edit/Previous/Next/timer/Submit once; immutable answers; restart/back; score pending/verified/rejected/stale/legacy; scroll results and buttons at large text; radio checked announcement. |
| PdfViewer native | Remote/local file entitlement; expired/revoked preview; paid online-only; missing/corrupt PDF; loading and timeout; fresh-link Retry; background/foreground/account change; page events and page count; bottom inset applied once. |
| PdfViewer web | Actual iframe, invalid URL/error, fresh-link reload/busy, account switch invalidation; no fabricated page count; keyboard/screen reader reload action. |
| Search | New account empty, recent searches/remove/clear, discovery sections, typing/clearing, no results; filters/reset/years/subjects/pricing/downloaded/sort; keyboard; offline saved results/error/Retry; locked/free/owned/downloaded/product unavailable states; open results; separate purchase overlay and return. |
| Notifications | Load/error/Retry/empty; read/unread; long title/body; notification preferences icon; swipe archive and failure; account switch/inflight response guards; focus refresh. |
| Login | Identifier/password validation; show/hide 44px button; login busy/double taps; lockout count/timer and disabled login; network rejection; forgot/register links; keyboard scroll and real safe area once. |
| Register | All fields; policy/confirmation; quiet strength segments/text; optional referral; disabled/busy/double tap; verification email response; rejected network/account-neutral error; existing-login link. |
| ForgotPassword | Email/mobile validation; loading; same account-neutral response for missing account/delivery failure; back-to-login; keyboard and inline errors. |
| ResetPassword + OTP | Recovery checking/expired/blocked/ready/MFA/cleanup/done; six-digit OTP; factor choice, invalid code/retry; disabled duplicate taps; password/confirm errors; sign-out retry never repeats mutation; support and login links; foreground/deep-link change. |
| Splash | Existing session/no session, recovery launch link, course/year gate; loading/error/Retry; long recovery error; actual next destination. |
| Store | Year/subject catalog, loading/retry/stale/empty/error; vertical subject rows; open versus Buy; actual price/MRP, owned and unavailable states; contextual accessible buy names; repeated taps; final row above tabs. |
| OrderSummary | Existing Android/provider guards, missing ID/owned/error; quote refresh; actual prices/discount/wallet amounts; wallet on/off eligibility; loading/duplicate Pay guard; pending confirmation disables re-pay; footer safe area. |
| PaymentCheckout | Test/live indicator; valid/invalid params; Razorpay loading; UPI/app handoff; verification overlay; hardware Back/cancel/timeout/WebView termination; background/resume; no generic header Back bypass; one bottom inset; unchanged callback/recovery results. |
| PaymentFailed — confirming | Neutral spinner and “Confirming your payment”; real order/payment refs; network delay, background/focus polling, account mismatch/sign-in guidance, recovery to success, bounded expiry; purchases/support actions; never show failure styling or encourage duplicate pay while uncertain. |
| PaymentFailed — genuine failure/terminal/legacy | Danger failure icon and genuine failed reason; terminal/refund details and guidance; Try again versus Purchases behavior; legacy Play order guidance; support; no polling after terminal verdict. |
| PaymentSuccess | Checking; server-confirmed title/amount/ID only; forged params/missing/wrong-owner/unconfirmed order; account switch; timeout; Purchases and Continue learning resets. |
| Referral + wallet | Program enabled/disabled with/without history/balance; actual referral code, Copy/Share; real rewards/holds/expiry/terms; pending/available/earned; long friend names; error/Retry; no placeholder claim of a real balance. |
| ReferralTerms | Loading/error/Retry/unavailable; actual program-dependent terms/limits and full legal wrapping; return navigation. |
| About | Version/factual description, legal/company/grievance contacts and links; long legal strings; no filler hero. |
| Contact | Existing validated form, multiline message, opening mail app/error, support/grievance details, external legal links, Instagram/YouTube/Telegram/WhatsApp named actions and exact destinations. |
| Privacy | Every existing legal section/link; long paragraphs and Marathi text; scroll/safe return; content preserved. |
| Terms | Every existing legal section/link; long paragraphs; scroll/safe return; content preserved. |
| SelectCourseYear | Initial/change modes; courses/years loading/error/empty; actual text choices; selected checked radio; save/retry/disabled; course switch resets year through existing behavior; confirmation/cancel; last choice above footer. |
| Maintenance | Retry checking/disabled, long message, all controls visible at large text/short height. |
| UpdateRequired | Store URL success/failure; mandatory update message/action, large text and safe edges. |
| Years | Mode label, loading/error/empty/refresh, real stable year IDs, long title wrapping and unchanged Subjects params. |
| Subjects (residual cleanup) | Mode title/search/empty/skeleton; notes versus video/quiz branching, existing params; long subject text. |
| Chapters (residual cleanup) | Loading/search/empty/error/refresh, long title, real lock/ownership state and unchanged chapter navigation. |

Additional shared surfaces:

- [ ] Drawer: open/close/backdrop/Android Back; profile name, all menu routes including Question papers; social/share actions; logout dialog; safe top/bottom; reduced-motion opening and closing.
- [ ] Confirmation dialogs: delete download/clear all/logout/delete account, Cancel/outside/Back behavior, busy disables dismissal, long body/button labels and screen-reader modal focus.
- [ ] Search filter sheet: actual bottom safe inset, short/long lists, scroll and last apply action above bottom inset, selected chips, clear/apply/dismiss, reduced motion.
- [ ] Existing native alerts/toast-like copied state/download feedback: concise emoji-free copy, real results, destructive cancellation and failed external-app openings. No new toast system introduced.
- [ ] Skeletons: correct list/loading state, static under reduced motion, screen-reader busy labels, no card borders/glows; reconnection and empty state transitions.
- [ ] ErrorBoundary: existing Marathi fallback text, Retry working, error log remains safe; no extra navigation behavior.

## Changed files

Source (relative to mobile-app):

- `src/components/ConfirmationDialog.tsx`
- `src/components/DailyQuoteCard.tsx`
- `src/components/EmptyState.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/ErrorState.tsx`
- `src/components/FeatureCard.tsx`
- `src/components/NotificationRow.tsx`
- `src/components/ProductCard.tsx`
- `src/components/ProfileAvatar.tsx`
- `src/components/ProfileMenuCard.tsx`
- `src/components/ProgressBar.tsx`
- `src/components/SettingsItem.tsx`
- `src/components/Skeleton.tsx`
- `src/components/StaggerItem.tsx`
- `src/components/StatCard.tsx`
- `src/components/WebLink.tsx`
- `src/components/YearCard.tsx`
- `src/components/MiniChapterCard.tsx`
- `src/components/NotificationBell.tsx`
- `src/components/OptionCard.tsx`
- `src/components/ProgressRing.tsx`
- `src/components/StreakBadge.tsx`
- `src/components/CustomInput.tsx`
- `src/components/LoadError.tsx`
- `src/components/NoteCard.tsx`
- `src/components/ProductPosterCard.tsx`
- `src/components/SideDrawer.tsx`
- `src/components/TestCard.tsx`
- `src/components/UnlockOptionsPanel.tsx`
- `src/components/VideoCard.tsx`
- `src/components/IconButton.tsx`
- `src/components/PrimaryButton.tsx`
- `src/components/ListRow.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/services/studyReminderService.ts`
- `src/theme/colors.ts`
- `src/theme/layout.ts`
- `src/screens/about/AboutScreen.tsx`
- `src/screens/auth/RegisterScreen.tsx`
- `src/screens/auth/SplashScreen.tsx`
- `src/screens/auth/ForgotPasswordScreen.tsx`
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/auth/ResetPasswordScreen.tsx`
- `src/screens/chapters/ChaptersScreen.tsx`
- `src/screens/contact/ContactScreen.tsx`
- `src/screens/details/ChapterDetailsScreen.tsx`
- `src/screens/downloads/DownloadsScreen.tsx`
- `src/screens/notes/NotesScreen.tsx`
- `src/screens/notifications/NotificationPreferencesScreen.tsx`
- `src/screens/notifications/NotificationsScreen.tsx`
- `src/screens/onboarding/SelectCourseYearScreen.tsx`
- `src/screens/payment/PaymentSuccessScreen.tsx`
- `src/screens/payment/checkoutHtmlTemplate.ts`
- `src/screens/payment/OrderSummaryScreen.tsx`
- `src/screens/payment/PaymentCheckoutScreen.tsx`
- `src/screens/payment/PaymentFailedScreen.tsx`
- `src/screens/pdf/PdfViewerScreen.web.tsx`
- `src/screens/pdf/PdfViewerScreen.native.tsx`
- `src/screens/privacy/PrivacyScreen.tsx`
- `src/screens/profile/ChangePasswordScreen.tsx`
- `src/screens/profile/ProfileScreen.tsx`
- `src/screens/profile/EditProfileScreen.tsx`
- `src/screens/purchases/MyPurchasesScreen.tsx`
- `src/screens/quiz/QuizScreen.tsx`
- `src/screens/quiz/TestListScreen.tsx`
- `src/screens/referral/ReferralTermsScreen.tsx`
- `src/screens/referral/ReferralScreen.tsx`
- `src/screens/reminder/StudyReminderScreen.tsx`
- `src/screens/search/SearchScreen.tsx`
- `src/screens/settings/SettingsScreen.tsx`
- `src/screens/store/StoreScreen.tsx`
- `src/screens/subjects/SubjectsScreen.tsx`
- `src/screens/terms/TermsScreen.tsx`
- `src/screens/update/UpdateRequiredScreen.tsx`
- `src/screens/videos/VideosScreen.tsx`
- `src/screens/years/YearsScreen.tsx`
- `src/screens/maintenance/MaintenanceScreen.tsx`
- `src/components/motion/FadeSlideIn.tsx`
- `src/components/motion/SuccessBurst.tsx`
- `src/components/search/HighlightedText.tsx`
- `src/components/search/RecentSearchesRow.tsx`
- `src/components/search/SearchEmptyState.tsx`
- `src/components/search/SearchFiltersSheet.tsx`
- `src/components/search/SearchResultRow.tsx`

Test support/updated assertions (relative to mobile-app):

- `scripts/ui-presentation-mocks.cjs`
- `scripts/ui-harness.cjs`
- `scripts/purchases-unavailable-ui-selftest.cjs`
- `scripts/video-tap-selftest.cjs`
- `scripts/quiz-hooks-selftest.cjs`
- `scripts/quiz-input-selftest.cjs`
- `scripts/quiz-editing-selftest.cjs`
- `scripts/list-states-selftest.cjs`
- `scripts/notification-preferences-selftest.cjs`
- `scripts/password-recovery.test.cjs`
- `scripts/payment-routing-selftest.cjs`
- `scripts/payment-success-owner-selftest.cjs`
- `scripts/mv004-recovery-selftest.cjs`
- `scripts/mv012-history-selftest.cjs`
- `scripts/razorpay-internal-test-selftest.cjs`
- `scripts/navigation-lazy-selftest.cjs`
- `scripts/audit-icon-controls-selftest.cjs`

Plan: `mobile-app/docs/superpowers/plans/2026-11-22-ui-step4.md`. Verification: `docs/audit/ui-redesign-20261121/step-4-verification.md`.
