# MedVeda polish 1 — code-level verification

2026-11-22. Reviewed the audit and Step 1–4 verification reports, theme, shared components and all 45 migrated screen implementations. Findings were shown in chat before edits; the final state-inset finding was also shown before its edit. Visual/layout/accessibility presentation only. No device, emulator, browser rendering, TalkBack or live-backend pass is claimed. No commit or push.

## Findings and fixes

Severity describes impact inferred from code, not measured device behavior. Paths below are relative to `mobile-app/src`.

| ID | Severity | Screen / file | Root cause | Fix / regression scope |
| --- | --- | --- | --- | --- |
| F1 | High | Quiz / `screens/quiz/QuizScreen.tsx` | Screen-specific: the same light `buttonText` is used on copper primary actions. | Use `COLORS.textOnPrimary` for Go back, Next/Submit and Restart; Previous/Back to Tests retain their separate secondary style. Calculated contrast improves from 2.51:1 to 6.76:1. Quiz input, editing and hook selftests pass. |
| F2 | High | Question Papers / `features/question-papers/PaperLayout.tsx`, both `QuestionPaperPdfScreen` implementations | Feature frame: outer screens own only the top safe inset. Content/status/page count can reach bottom navigation; side cutouts are unprotected. | Outer library/direct-subject/session frame and both reader frames own all four edges. Embedded Subjects keeps `edges=[]`, avoiding a second inset. Seven Question Papers scripts pass. |
| F3 | Medium | Home / `screens/home/HomeScreen.tsx` | Screen-specific: content does not own left/right safe insets. | Add side-only SafeAreaView. HomeHeader continues to own the top and BottomNav owns the bottom. Home loading/data/callbacks unchanged. |
| F4 | Medium | Logout/delete/clear confirmations / `components/ConfirmationDialog.tsx` | Shared: centered unscrollable modal can exceed a short viewport with long download names or scaled text. | Safe-area frame plus scrolling viewport; keep centered short content and allow tall content to scroll. Wrap/constrain action buttons with a token gap and at least 44px targets. Existing busy, outside-tap, card-tap and Back handlers retained. Applies to Settings, Profile, Downloads and drawer confirmations. |
| F5 | Medium | Search filters, year segments, shared actions / `components/Chip.tsx`, `FilterChip.tsx`, `PrimaryButton.tsx` | Shared: intrinsic-width controls have no parent-width cap. | Cap at parent width and allow chip label shrink/wrapping; preserve explicit narrower caller overrides, minimum targets and callbacks. Reviewed SegmentedControl, Downloads filters, search empty/recent states, product Buy, Paper Retry and drawer/contact social buttons. Foundation and interaction scripts pass; layout still needs hardware inspection. |
| F6 | Medium | Change course/year / `screens/onboarding/SelectCourseYearScreen.tsx` | Screen-specific: Cancel is a pressable Text without a 44px target/button semantics. | TouchableOpacity with `SIZE.touch`, role and name, forwarding the identical goBack callback. No selection/save logic change. Existing course/year harness limitation remains below. |
| F7 | Medium | Login, ForgotPassword, ResetPassword/MFA, ChangePassword, EditProfile | Screen-specific submit controls replace visible labels with spinners without persistent accessible names. | Add fixed accessible names and disabled/busy state using existing flags. Login/Send reset email/Verify code/Update password/Save handlers and guards unchanged. Recovery and profile-save tests pass. |
| F8 | Medium | Reminder / `screens/reminder/StudyReminderScreen.tsx` | Screen-specific: nonshrinking time column and negative notice margin. | Let the time column shrink/wrap; remove the negative top offset on unsupported-state notice. No scheduling/permission/picker behavior change. |
| F9 | Low | Store / `screens/store/StoreScreen.tsx` | Screen-specific: empty subtitle still reserves text/margins; owned label has a decorative checkmark. | Render availability text only for the existing disabled-provider condition; remove checkmark while retaining real ownership copy. Purchase conditions/price/navigation unchanged; unavailable-purchase tests pass. |
| F10 | Low | Drawer, filter sheet, active local styles / theme + listed source files | Shared/local token bypasses: 20px side padding, numeric control sizes/borders/durations/opacity/tracking. | Drawer/sheet horizontal inset is 16px. Use existing size/border/motion tokens, standard disabled opacity, and TYPE.section for filter headings. Name existing message-input (130px), update-art (88px), skeleton/muted opacity and referral-code tracking values in theme, preserving those dimensions. Drawer reduced-motion zero-duration branches remain. |
| F11 | Medium | Downloads / `screens/downloads/DownloadsScreen.tsx` | Screen-specific: storage summary and Clear all share a nonwrapping row. | Allow row wrapping and summary shrink. Actual counts/bytes and deletion behavior unchanged. |
| F12 | Medium | Checkout / `screens/payment/PaymentCheckoutScreen.tsx` | Screen-specific: absolute test-mode banner overlays WebView content and can grow with font scaling. | Place the same banner in normal flow, reserving its actual height. Test-mode predicate, WebView callbacks, verification/recovery and checkout HTML unchanged. Checkout/payment regression scripts pass. |
| F13 | Medium | Notifications, note reader native/web, crash fallback | Screen-specific state frames: Notifications loading/error and reader error copy have no 16px inset; shared crash fallback uses 32px and lacks explicit retry target/role. | Add 16px state-only wrappers/styles, retaining full-size document content; use 16px and `SIZE.touch`/button semantics in ErrorBoundary. No error/retry behavior change. Notification race scripts pass. Native-reader PDF harness failures predate this pass. |

## Complete screen review coverage

For every row below, inspected typography/spacing/row/header definitions, flexible text and touch targets, safe-area and scroll/tab structure, state branches, decoration and motion. “No additional clear defect” means static inspection found no further justified change; it is not a rendering guarantee. Native/backend state behavior is outside this review.

| Implementation under `src` | Review result |
| --- | --- |
| features/question-papers/screens/QuestionPaperYearsScreen.tsx | F2 via outer PaperLayout; shared segmented controls via F5. Actual profile-year selection untouched. |
| features/question-papers/screens/QuestionPaperSubjectsScreen.tsx | F2 via shared frame; embedded frame stays inset-free. Subject titles wrap; thresholded search retained. |
| features/question-papers/screens/QuestionPaperSessionsScreen.tsx | F2 via shared frame; sibling 44px download, flexible plain row and real year sections retained. |
| features/question-papers/screens/QuestionPaperPdfScreen.native.tsx | F2; full-size PDF and real page count retained. Intentional one-line reader header retained. |
| features/question-papers/screens/QuestionPaperPdfScreen.web.tsx | F2; preview object, fallback and full title accessibility retained. |
| screens/home/HomeScreen.tsx | F3. Profile/continue/year content scrolls in a flex body above in-flow tabs. |
| screens/purchases/MyPurchasesScreen.tsx | No additional clear defect. Real amounts/status/order/date, flexible plain rows and in-flow tabs retained. |
| screens/downloads/DownloadsScreen.tsx | F4/F5/F11. Sibling open/download controls and progress remain; final list has scroll padding above tabs. |
| screens/profile/ProfileScreen.tsx | F4 via dialog; wrapping profile fields, stats/menu and in-flow tabs retained. |
| screens/store/StoreScreen.tsx | F5/F9/F10. Vertical catalog and sibling Buy remain; in-flow tab reservation retained. |
| screens/profile/EditProfileScreen.tsx | F7/F10; expanding form inputs and scroll-bottom padding retained. |
| screens/profile/ChangePasswordScreen.tsx | F7/F10; password inputs/validation/submission unchanged. |
| screens/settings/SettingsScreen.tsx | F4 via dialog. Shared plain rows, bottom/side safe frame and scroll padding retained. |
| screens/notifications/NotificationPreferencesScreen.tsx | No additional clear defect. Shared flexible text column and named switches retained. |
| screens/reminder/StudyReminderScreen.tsx | F8/F10; scrollable settings and real saving/unsupported/error branches retained. |
| screens/details/ChapterDetailsScreen.tsx | No additional clear defect. Shared feature rows, purchase panel and safe scroll frame retained. |
| screens/chapters/ChaptersScreen.tsx | No additional clear defect; card variant is a subjective decision below. Real ownership/search/states retained. |
| screens/subjects/SubjectsScreen.tsx | No additional clear defect; card variant is deferred below. Flexible title/search/list retained. |
| screens/years/YearsScreen.tsx | No additional clear defect. Shared plain year rows, actual titles, existing mode context retained. |
| screens/notes/NotesScreen.tsx | Shared purchase controls benefit from F5/F10. Flexible note text, real access/download state and safe list retained. |
| screens/videos/VideosScreen.tsx | No additional clear defect. Plain wrapping rows, real search/errors and keyboard forwarding retained. |
| screens/quiz/TestListScreen.tsx | No additional clear defect. Flexible row plus separately named download/remove action retained. |
| screens/quiz/QuizScreen.tsx | F1/F10. Quiz/result scroll branches and flexible options retained; duplicate result presentation deferred below. |
| screens/pdf/PdfViewerScreen.native.tsx | F13 on errors; full-size document/page count and bottom inset ownership retained. |
| screens/pdf/PdfViewerScreen.web.tsx | F10/F13; named reload action, iframe and safe frame retained. |
| screens/search/SearchScreen.tsx | F5/F10 via shared filters/actions. Flexible result rows, safe frame and real offline/error states retained. |
| screens/notifications/NotificationsScreen.tsx | F13 on loading/error; in-list 16px content inset and wrapping NotificationRow retained. |
| screens/auth/LoginScreen.tsx | F7/F10. Scrollable form, expanding inputs, named 44px password toggle retained. |
| screens/auth/RegisterScreen.tsx | F10. Scrollable fields, quiet strength segments and real validation retained. |
| screens/auth/ForgotPasswordScreen.tsx | F7/F10. Expanding field and safe scroll frame retained. |
| screens/auth/ResetPasswordScreen.tsx | F7/F10. Recovery/MFA/OTP/error phases, expanding inputs and keyboard frame retained. |
| screens/auth/SplashScreen.tsx | No additional clear defect. Existing small brand, loading/error/Retry retained. |
| screens/payment/OrderSummaryScreen.tsx | F10 only. Wrapping real-price lines, named wallet toggle, footer/safe frame retained. |
| screens/payment/PaymentCheckoutScreen.tsx | F10/F12. WebView/verification overlay/safe frame retained; generic Back remains absent. |
| screens/payment/PaymentFailedScreen.tsx | F10 only. Neutral confirming versus genuine terminal/failure branches remain scrollable and unchanged. |
| screens/payment/PaymentSuccessScreen.tsx | F10 only. Wrapping server-confirmed details and scrollable actions retained. |
| screens/referral/ReferralScreen.tsx | F10 tracking token only. Real code/wallet/history, wrapping explanation and safe scroll frame retained. |
| screens/referral/ReferralTermsScreen.tsx | No additional clear defect. Actual terms, retry/loading and safe scroll frame retained. |
| screens/about/AboutScreen.tsx | No additional clear defect. Factual/legal content and 44px WebLink retained. |
| screens/contact/ContactScreen.tsx | F5/F10 via shared actions and input tokens. Multiline field, keyboard frame and legal/social destinations retained. |
| screens/privacy/PrivacyScreen.tsx | F10 border token only. All legal text/inventory/links and safe scrolling retained. |
| screens/terms/TermsScreen.tsx | No additional clear defect. Full legal text/links and safe scrolling retained. |
| screens/onboarding/SelectCourseYearScreen.tsx | F6. Existing scroll body, footer, selection/error states retained. |
| screens/maintenance/MaintenanceScreen.tsx | No additional clear defect. Safe scrollable message and Retry retained. |
| screens/update/UpdateRequiredScreen.tsx | F10 art-size token only. Existing 88px art, safe scrolling and update action retained. |

All five tab screens put BottomNav after flexing scroll/list content; the bar remains in normal flow and owns its measured height plus bottom inset. Other study/account/payment screens use their existing native custom header for top/side safety and their own bottom/side frame. Search, Notifications and auth/gate screens own their full safe frame. The Question Papers side/bottom omission and Home side omission are fixed as listed. No absolute tab overlays were found.

Shared state components reviewed: EmptyState, ErrorState/LoadError, PurchaseOwnershipStatus, Skeleton, OfflineBanner, native reader states, dialogs, drawer and search filters. Existing real-state copy remains; no connectivity/cache state or data was invented.

## Subjective items — unchanged, for owner decision

- SubjectCard and ChapterCard still use the bordered 64px ListRow/card variant, whereas Question Papers and most Step 4 content use 56px plain rows. This is a deliberate-looking Step 1 compatibility choice, not proven broken; no global radius/height restyle made.
- Quiz results repeat the outcome in the title, score-verification text and PASS/FAIL/PENDING badge. Whether to remove that extra summary is editorial; no scoring/status information removed.
- Notification titles/body use 13px/12px legacy font aliases; legal/auth headings use a mix of FONT and TYPE aliases. They resolve to theme values; no speculative type-scale migration made.
- Referral and order-summary emphasis derives 17px/11px sizes from existing font tokens. Normalizing those to other type roles would change hierarchy; left unchanged.
- Actual large-font widths of purchase amounts/referral status columns, pinned drawer social footer and onboarding/order footers require hardware checks before changing their composition. No line caps, font-scaling caps or forced ellipses were added to body text.
- Unmounted compatibility components remain: GradientBackground (including its -1px strip seam), ProgressRing (92px/10px defaults and 900ms animation without reduced-motion guard), GridCard, DailyQuoteCard, and the unused year-color palette. No migrated screen mounts ProgressRing or GradientBackground. Their cleanup/reintroduction is outside this pass. This report does not claim every exported compatibility component meets reduced-motion requirements.

## Search metadata inventory — unchanged

These are the 12 entries noted in Step 4. Labels below identify the glyphs by Unicode to avoid rendering decorative icons in this report. No entries were deleted, no metadata types changed, and no service code edited. Search result rows, filter chips and section headers render labels/text rather than these icon properties.

| File | Entry | Stored glyph |
| --- | --- | --- |
| types/search.ts | SECTION_META.year | Calendar, U+1F4C5 |
| types/search.ts | SECTION_META.subject | Open book, U+1F4D6 |
| types/search.ts | SECTION_META.chapter | Open file folder, U+1F4C2 |
| types/search.ts | SECTION_META.note | Page facing up, U+1F4C4 |
| types/search.ts | SECTION_META.video | Movie camera, U+1F3A5 |
| types/search.ts | SECTION_META.quiz | Memo, U+1F4DD |
| types/search.ts | SECTION_META.product | Shopping bags, U+1F6CD U+FE0F |
| types/search.ts | SECTION_META.purchase | Check mark button, U+2705 |
| types/search.ts | SECTION_META.notification | Bell, U+1F514 |
| services/searchService.ts | Recently Viewed section | Four o'clock, U+1F553 |
| services/searchService.ts | Recommended For You section | Sparkles, U+2728 |
| services/searchService.ts | Recently Added section | NEW button, U+1F195 |

## Token, motion and contrast scan

- Active presentation literals found and fixed: 48px minima, 1px borders, Contact's 130px message minimum/fallback radius, Update's 88px logo, drawer's 260/220ms durations, filter-heading 0.5 tracking, referral-code 4 tracking, raw disabled/muted/highlight opacity. Existing global dimensions remain except explicit 16px inset/44px minimum corrections. Form/button widths and height remain content-driven.
- Structural values remain literal: flex/zero edges, percentages, line counts, relative dimensions/aspect ratios, illustration crop geometry and platform behavior. This is not a mechanical replacement of every number with a token.
- Primary/secondary text on the dark palette remain unchanged. The concrete incorrect light-on-copper Quiz label pairing is fixed. Semantic error/success colors remain for actual states; no new decorative accent added. Disabled controls now use the shared disabled opacity; disabled-state perceptual appearance still needs hardware inspection.
- AnimatedPressable uses ReduceMotion.System; Skeleton suppresses its moving layer under reduced motion; drawer retains its zero-duration reduced-motion branches and now uses fast duration tokens. FadeSlideIn/StaggerItem/SuccessBurst remain non-animating compatibility wrappers. Functional ActivityIndicator/PDF loading and gesture-driven notification Swipeable behavior remain. No new animation added.

## Verification

Read the repository-required [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) before editing. Workspace is read-only by default; filesystem changes and export/log writes were executed through approved escalation. Existing working changes were preserved using a pre-polish source snapshot, rather than comparing accepted redesign work against older HEAD.

- Strict TypeScript: `cd mobile-app && node node_modules/typescript/bin/tsc --noEmit` — exit 0 on final source; tsconfig has strict enabled.
- Changed-file ESLint: `node tooling/node_modules/eslint/bin/eslint.js <all 38 changed TS/TSX source paths>` — exit 0.
- `git diff --check -- mobile-app/src` — exit 0.
- Final relevant selftests: **34 pass, 2 pre-existing harness failures**, listed below. No test scripts/assertions were edited. No full-suite pass is claimed.
- Web: `cd mobile-app && EXPO_OFFLINE=1 node node_modules/expo/bin/cli export --platform web --max-workers 2 --output-dir /tmp/medveda-polish1-web-final` — exit 0, 2,523 modules, index.html, metadata, 3 JS bundles and assets. The NO_COLOR/FORCE_COLOR environment warning is non-fatal. Export proves bundling, not rendering.
- Boundary verification: 25 changed screen ASTs match the pre-polish source after excluding imports, JSX presentation and StyleSheet declarations. This is a non-presentation-code check, not proof of every event interaction. All 30 service, 17 hook, 16 type, 5 config and 6 validation files are byte-identical; AppNavigator and checkoutHtmlTemplate are byte-identical. No new dependencies, query/auth/payment logic, routes/params or models changed.
- Snapshot: `/tmp/medveda-polish1-before/src`; exact change inventory: `/tmp/medveda-polish1-before/changed.json`. Final check logs: `/tmp/medveda-polish1-checks/{typescript,eslint,web-export}.log`, per-script logs and `summary.json`. Final export: `/tmp/medveda-polish1-web-final`.

Passing scripts (each under `mobile-app/scripts`, `-selftest.cjs` unless specified):

- `ui-foundation-selftest.cjs`
- `accessibility-selftest.cjs`
- `list-states-selftest.cjs`
- `audit-icon-controls-selftest.cjs`
- `navigation-lazy-selftest.cjs`
- `audit-navigation-selftest.cjs`
- `question-papers-selftest.cjs`
- `question-papers-ui-selftest.cjs`
- `question-papers-redesign-selftest.cjs`
- `question-papers-lifecycle-selftest.cjs`
- `question-papers-download-selftest.cjs`
- `question-papers-web-preview-selftest.cjs`
- `question-papers-step2-selftest.cjs`
- `quiz-input-selftest.cjs`
- `quiz-editing-selftest.cjs`
- `quiz-hooks-selftest.cjs`
- `notification-preferences-selftest.cjs`
- `purchases-unavailable-ui-selftest.cjs`
- `profile-save-selftest.cjs`
- `payment-routing-selftest.cjs`
- `payment-summary-selftest.cjs`
- `payment-success-owner-selftest.cjs`
- `payment-poll-selftest.cjs`
- `payment-verdict-selftest.cjs`
- `razorpay-internal-test-selftest.cjs`
- `razorpay-live-testing-selftest.cjs`
- `search-cache-selftest.cjs`
- `search-pagination-selftest.cjs`
- `search-lazy-hook-selftest.cjs`
- `wallet-expired-ui-selftest.cjs`
- `wallet-terms-selftest.cjs`
- `password-recovery.test.cjs`
- `notification-inflight-selftest.cjs`
- `notification-account-hook-selftest.cjs`

### Pre-existing findings kept separate

- `pdf-lifecycle-selftest.cjs` and `pdf-remote-retry-selftest.cjs`: exit 1, `Unexpected import ../../theme/colors` from their VM mocks while loading the existing native reader. Both were rerun against the complete pre-polish source snapshot by redirecting source reads in memory; both reproduce the identical failure. No test/harness workaround or assertion change made.
- Previously documented `features/question-papers/usePaperResource.ts:26` unnecessary revision dependency lint finding remains. File unchanged; it is outside this pass's changed-file lint run.
- Previously documented Android vault/Firebase configuration tests expect provider `disabled` while working configuration uses `razorpay`. No configuration/test fix or payment-provider change made; these tests were not rerun as part of this targeted set.
- Previously documented course/year-selection mock failure and mv011 accessibility mock/old-accent limitations remain outside this pass. No attempt to repair them; no assertion of their passing.
- Earlier documented interrupted/time-limited broad suites are not claimed passing. Real auth, purchases, downloading, native rendering, large-font layout, TalkBack and device reduced-motion behavior remain unverified here.

## Changed files

38 source files, plus this report. Paths are relative to the repository root:

- `mobile-app/src/components/Chip.tsx`
- `mobile-app/src/components/ConfirmationDialog.tsx`
- `mobile-app/src/components/CustomInput.tsx`
- `mobile-app/src/components/ErrorBoundary.tsx`
- `mobile-app/src/components/FilterChip.tsx`
- `mobile-app/src/components/PrimaryButton.tsx`
- `mobile-app/src/components/SideDrawer.tsx`
- `mobile-app/src/components/Skeleton.tsx`
- `mobile-app/src/components/UnlockOptionsPanel.tsx`
- `mobile-app/src/components/search/SearchFiltersSheet.tsx`
- `mobile-app/src/features/question-papers/PaperLayout.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.native.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.web.tsx`
- `mobile-app/src/screens/auth/ForgotPasswordScreen.tsx`
- `mobile-app/src/screens/auth/LoginScreen.tsx`
- `mobile-app/src/screens/auth/RegisterScreen.tsx`
- `mobile-app/src/screens/auth/ResetPasswordScreen.tsx`
- `mobile-app/src/screens/contact/ContactScreen.tsx`
- `mobile-app/src/screens/downloads/DownloadsScreen.tsx`
- `mobile-app/src/screens/home/HomeScreen.tsx`
- `mobile-app/src/screens/notifications/NotificationsScreen.tsx`
- `mobile-app/src/screens/onboarding/SelectCourseYearScreen.tsx`
- `mobile-app/src/screens/payment/OrderSummaryScreen.tsx`
- `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx`
- `mobile-app/src/screens/payment/PaymentFailedScreen.tsx`
- `mobile-app/src/screens/payment/PaymentSuccessScreen.tsx`
- `mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx`
- `mobile-app/src/screens/pdf/PdfViewerScreen.web.tsx`
- `mobile-app/src/screens/privacy/PrivacyScreen.tsx`
- `mobile-app/src/screens/profile/ChangePasswordScreen.tsx`
- `mobile-app/src/screens/profile/EditProfileScreen.tsx`
- `mobile-app/src/screens/quiz/QuizScreen.tsx`
- `mobile-app/src/screens/referral/ReferralScreen.tsx`
- `mobile-app/src/screens/reminder/StudyReminderScreen.tsx`
- `mobile-app/src/screens/store/StoreScreen.tsx`
- `mobile-app/src/screens/update/UpdateRequiredScreen.tsx`
- `mobile-app/src/theme/layout.ts`
- `mobile-app/src/theme/typography.ts`
- `docs/audit/ui-redesign-20261121/polish-1-verification.md`

## Real-device retest — not performed

1. At 360px width and largest text, use long Marathi/English titles: filters/year chips, Buy/Retry/social actions, Downloads summary and reminder time. Confirm wrapping, readable glyphs and at least 44px targets.
2. Check all five tabs and nested screens with gesture and three-button navigation. Scroll to the final action. Inspect Home side cutouts, Question Papers library/download status and native reader page footer; verify no duplicate insets.
3. Open logout/delete/clear confirmations with a long downloaded title on a short viewport and largest text. Scroll to both actions; verify Cancel, outside tap, Android Back and busy dismissal guards.
4. Inspect Quiz Next/Submit/Restart contrast; use TalkBack during login/reset/MFA/profile saving and verify persistent button names and busy/disabled state. Check course/year Cancel.
5. Inspect Notifications loading/error, reader invalid/expired-link errors, offline states and Retry. Exercise PDF rendering separately; the two known VM harness failures do not validate it.
6. With reduced motion enabled, open/close the drawer, press shared controls and wait on skeletons. In the existing test checkout flow, confirm the test banner reserves space above WebView content and no checkout controls are covered; use existing recovery/back flow. No real payment is required for visual acceptance.

Stop after this polish pass. Subjective items and search metadata remain for owner decision.
