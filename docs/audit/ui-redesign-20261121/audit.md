# MedVeda visual audit — 2026-11-21

Scope: mobile app only. Snapshot taken before step 1. Preserve all routes, props, queries, auth, payments, models, and pre-existing working changes. This delivery covers the audit and shared foundation; subsequent screen migrations remain separate steps.

## Screens (45 platform implementations)

- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.native.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.web.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperSessionsScreen.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperSubjectsScreen.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperYearsScreen.tsx`
- `mobile-app/src/screens/about/AboutScreen.tsx`
- `mobile-app/src/screens/auth/ForgotPasswordScreen.tsx`
- `mobile-app/src/screens/auth/LoginScreen.tsx`
- `mobile-app/src/screens/auth/RegisterScreen.tsx`
- `mobile-app/src/screens/auth/ResetPasswordScreen.tsx`
- `mobile-app/src/screens/auth/SplashScreen.tsx`
- `mobile-app/src/screens/chapters/ChaptersScreen.tsx`
- `mobile-app/src/screens/contact/ContactScreen.tsx`
- `mobile-app/src/screens/details/ChapterDetailsScreen.tsx`
- `mobile-app/src/screens/downloads/DownloadsScreen.tsx`
- `mobile-app/src/screens/home/HomeScreen.tsx`
- `mobile-app/src/screens/maintenance/MaintenanceScreen.tsx`
- `mobile-app/src/screens/notes/NotesScreen.tsx`
- `mobile-app/src/screens/notifications/NotificationPreferencesScreen.tsx`
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
- `mobile-app/src/screens/profile/ProfileScreen.tsx`
- `mobile-app/src/screens/purchases/MyPurchasesScreen.tsx`
- `mobile-app/src/screens/quiz/QuizScreen.tsx`
- `mobile-app/src/screens/quiz/TestListScreen.tsx`
- `mobile-app/src/screens/referral/ReferralScreen.tsx`
- `mobile-app/src/screens/referral/ReferralTermsScreen.tsx`
- `mobile-app/src/screens/reminder/StudyReminderScreen.tsx`
- `mobile-app/src/screens/search/SearchScreen.tsx`
- `mobile-app/src/screens/settings/SettingsScreen.tsx`
- `mobile-app/src/screens/store/StoreScreen.tsx`
- `mobile-app/src/screens/subjects/SubjectsScreen.tsx`
- `mobile-app/src/screens/terms/TermsScreen.tsx`
- `mobile-app/src/screens/update/UpdateRequiredScreen.tsx`
- `mobile-app/src/screens/videos/VideosScreen.tsx`
- `mobile-app/src/screens/years/YearsScreen.tsx`

## Reusable components (51 files)

- `mobile-app/src/components/BottomNav.tsx`
- `mobile-app/src/components/BrandLogo.tsx`
- `mobile-app/src/components/ChapterCard.tsx`
- `mobile-app/src/components/ConfirmationDialog.tsx`
- `mobile-app/src/components/ContinueLearningCard.tsx`
- `mobile-app/src/components/CustomButton.tsx`
- `mobile-app/src/components/CustomInput.tsx`
- `mobile-app/src/components/DailyQuoteCard.tsx`
- `mobile-app/src/components/EmptyState.tsx`
- `mobile-app/src/components/ErrorBoundary.tsx`
- `mobile-app/src/components/ErrorState.tsx`
- `mobile-app/src/components/FeatureCard.tsx`
- `mobile-app/src/components/FilterChip.tsx`
- `mobile-app/src/components/GradientBackground.tsx`
- `mobile-app/src/components/HomeHeader.tsx`
- `mobile-app/src/components/LoadError.tsx`
- `mobile-app/src/components/MiniChapterCard.tsx`
- `mobile-app/src/components/NoteCard.tsx`
- `mobile-app/src/components/NotificationBell.tsx`
- `mobile-app/src/components/NotificationRow.tsx`
- `mobile-app/src/components/OptionCard.tsx`
- `mobile-app/src/components/ProductCard.tsx`
- `mobile-app/src/components/ProductPosterCard.tsx`
- `mobile-app/src/components/ProfileAvatar.tsx`
- `mobile-app/src/components/ProfileMenuCard.tsx`
- `mobile-app/src/components/ProgressBar.tsx`
- `mobile-app/src/components/ProgressRing.tsx`
- `mobile-app/src/components/PurchaseOwnershipStatus.tsx`
- `mobile-app/src/components/SearchBar.tsx`
- `mobile-app/src/components/SectionHeader.tsx`
- `mobile-app/src/components/SettingsItem.tsx`
- `mobile-app/src/components/SideDrawer.tsx`
- `mobile-app/src/components/Skeleton.tsx`
- `mobile-app/src/components/StaggerItem.tsx`
- `mobile-app/src/components/StatCard.tsx`
- `mobile-app/src/components/StreakBadge.tsx`
- `mobile-app/src/components/StudentProfileCard.tsx`
- `mobile-app/src/components/SubjectCard.tsx`
- `mobile-app/src/components/TestCard.tsx`
- `mobile-app/src/components/UnlockOptionsPanel.tsx`
- `mobile-app/src/components/VideoCard.tsx`
- `mobile-app/src/components/WebLink.tsx`
- `mobile-app/src/components/YearCard.tsx`
- `mobile-app/src/components/motion/AnimatedPressable.tsx`
- `mobile-app/src/components/motion/FadeSlideIn.tsx`
- `mobile-app/src/components/motion/SuccessBurst.tsx`
- `mobile-app/src/components/search/HighlightedText.tsx`
- `mobile-app/src/components/search/RecentSearchesRow.tsx`
- `mobile-app/src/components/search/SearchEmptyState.tsx`
- `mobile-app/src/components/search/SearchFiltersSheet.tsx`
- `mobile-app/src/components/search/SearchResultRow.tsx`

Additional feature-local UI: `features/question-papers/PaperLayout.tsx` exports PaperLayout, PaperCard, PaperButton, PaperEmpty, PaperOffline, and paperStyles; `PaperReaderToolbar.tsx` supplies reader actions.

## Duplication and visual inconsistencies

- SubjectCard: emoji, copper left border, 20px padding; PaperCard: vector tile, subtitle, 18px radius, minimum 80px. Same subject-selection purpose with unrelated styling.
- ChapterCard, YearCard, OptionCard, FeatureCard, NoteCard, VideoCard, TestCard, MiniChapterCard, ProductCard/ProductPosterCard each implement their own card anatomy.
- SettingsItem, ProfileMenuCard, NotificationRow, search/SearchResultRow duplicate leading icon/text/trailing-action patterns.
- SearchBar uses an emoji, 54px input, 18px side padding, raised shadow; paper screens do not share it.
- EmptyState, ErrorState, LoadError, PaperEmpty and inline list states use different spacing and icon treatments.
- Native stack headers coexist with HomeHeader and paper intro headings. App safe-area provider already exists; shared ScreenHeader must be used inside an inset-aware screen, not add duplicate insets.
- BottomNav is inline stack navigation; Notes has a negative 34px margin and a 92px halo. Preserve its route keys when migrating.
- StudentProfileCard has a 56px avatar, 72px progress ring, single-line course/name/email and decorative gradients/glows.
- Existing theme is imported widely: keep legacy token names while aligning values. Primary text on the new copper fill must be dark for contrast.
- expo-font, @expo/vector-icons and Reanimated already installed. Use Ionicons consistently for new primitives; system font avoids new dependencies and retains multilingual glyph support. Bundled Inter/Jakarta can be a later explicit dependency choice.
- No new persistence, paper search queries, recently-viewed model or share/download behavior belongs in the shared foundation.

## Hardcoded style inventory

Counts cover TSX under src, exclude tokens, assets and non-TSX utilities. Values representing illustrations, layout ratios or third-party brand colors need individual review rather than mechanical replacement.

### Colors

- `mobile-app/src/components/ConfirmationDialog.tsx` — 92: rgba(0,0,0,0.55)
- `mobile-app/src/components/ContinueLearningCard.tsx` — 82: rgba(255,255,255,0.14); 107: rgba(255,255,255,0.65)
- `mobile-app/src/components/HomeHeader.tsx` — 167: rgba(255,255,255,0.12); 203: rgba(255,255,255,0.12); 217: rgba(255,255,255,0.12)
- `mobile-app/src/components/NotificationBell.tsx` — 40: rgba(255,255,255,0.12)
- `mobile-app/src/components/SideDrawer.tsx` — 214: #E1306C; 220: #FF0000; 225: #29A9EA; 230: #25D366; 291: rgba(0,0,0,0.55)
- `mobile-app/src/components/StreakBadge.tsx` — 49: rgba(226,112,61,0.16)
- `mobile-app/src/components/StudentProfileCard.tsx` — 119: rgba(255,255,255,0.3)
- `mobile-app/src/components/UnlockOptionsPanel.tsx` — 180: rgba(0,0,0,0.5)
- `mobile-app/src/components/YearCard.tsx` — 39: #FFFFFF
- `mobile-app/src/components/motion/SuccessBurst.tsx` — 31: #FFD166, #EF476F, #06D6A0; 111: #fff
- `mobile-app/src/components/search/SearchFiltersSheet.tsx` — 163: rgba(0,0,0,0.55)
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.web.tsx` — 19: #fff; 20: #241C17
- `mobile-app/src/screens/contact/ContactScreen.tsx` — 220: #E1306C; 226: #FF0000; 231: #29A9EA; 236: #25D366
- `mobile-app/src/screens/downloads/DownloadsScreen.tsx` — 300: #FFF3CD; 340: #fff
- `mobile-app/src/screens/home/HomeScreen.tsx` — 584: rgba(0,0,0,0.35)
- `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx` — 508: #E2703D; 515: #100C0A; 541: rgba(16, 12, 10, 0.85)
- `mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx` — 161: #8C3A22; 162: #fff; 177: #8C3A22; 185: #100C0A; 186: #100C0A; 188: rgba(0,0,0,0.65); 190: #fff
- `mobile-app/src/screens/pdf/PdfViewerScreen.web.tsx` — 67: #fff
- `mobile-app/src/screens/quiz/QuizScreen.tsx` — 401: #000
- `mobile-app/src/screens/search/SearchScreen.tsx` — 385: rgba(0,0,0,0.35)
- `mobile-app/src/screens/store/StoreScreen.tsx` — 237: rgba(0,0,0,0.35)

### Font sizes

- `mobile-app/src/components/BottomNav.tsx` — 174: 17; 241: 20
- `mobile-app/src/components/ChapterCard.tsx` — 71: 20; 82: 24
- `mobile-app/src/components/ContinueLearningCard.tsx` — 88: 20; 94: 10; 111: 26
- `mobile-app/src/components/CustomButton.tsx` — 58: 18
- `mobile-app/src/components/CustomInput.tsx` — 64: 16; 71: 13
- `mobile-app/src/components/DailyQuoteCard.tsx` — 32: 34
- `mobile-app/src/components/EmptyState.tsx` — 35: 50
- `mobile-app/src/components/ErrorBoundary.tsx` — 74: 20; 82: 14; 97: 15
- `mobile-app/src/components/ErrorState.tsx` — 58: 55; 63: 18
- `mobile-app/src/components/FeatureCard.tsx` — 55: 22; 66: 26
- `mobile-app/src/components/HomeHeader.tsx` — 174: 18; 210: 18; 224: 18
- `mobile-app/src/components/MiniChapterCard.tsx` — 43: 22
- `mobile-app/src/components/NoteCard.tsx` — 179: 28; 208: 10; 241: 14
- `mobile-app/src/components/NotificationBell.tsx` — 45: 18; 60: 9
- `mobile-app/src/components/NotificationRow.tsx` — 86: 16; 128: 18
- `mobile-app/src/components/OptionCard.tsx` — 92: 17
- `mobile-app/src/components/ProductCard.tsx` — 99: 11
- `mobile-app/src/components/ProductPosterCard.tsx` — 138: 40
- `mobile-app/src/components/ProfileAvatar.tsx` — 44: 42; 50: 24
- `mobile-app/src/components/ProfileMenuCard.tsx` — 66: 26; 71: 18; 77: 28
- `mobile-app/src/components/ProgressRing.tsx` — 121: 9
- `mobile-app/src/components/SearchBar.tsx` — 117: 16; 121: 14; 130: 15
- `mobile-app/src/components/SettingsItem.tsx` — 73: 22; 85: 22
- `mobile-app/src/components/SideDrawer.tsx` — 333: 24; 357: 20
- `mobile-app/src/components/StatCard.tsx` — 67: 16
- `mobile-app/src/components/StreakBadge.tsx` — 56: 13
- `mobile-app/src/components/StudentProfileCard.tsx` — 123: 22
- `mobile-app/src/components/SubjectCard.tsx` — 61: 26
- `mobile-app/src/components/TestCard.tsx` — 106: 30; 129: 10; 156: 18
- `mobile-app/src/components/VideoCard.tsx` — 80: 22
- `mobile-app/src/components/YearCard.tsx` — 95: 24; 115: 28
- `mobile-app/src/components/motion/SuccessBurst.tsx` — 112: 34
- `mobile-app/src/components/search/RecentSearchesRow.tsx` — 107: 12; 125: 15
- `mobile-app/src/components/search/SearchEmptyState.tsx` — 57: 44
- `mobile-app/src/components/search/SearchResultRow.tsx` — 86: 18; 112: 12; 144: 20
- `mobile-app/src/features/question-papers/PaperLayout.tsx` — 10: 24; 11: 14; 13: 16; 16: 14; 17: 14; 20: 12; 22: 12; 23: 11; 52: 13
- `mobile-app/src/screens/about/AboutScreen.tsx` — 139: 70
- `mobile-app/src/screens/auth/ForgotPasswordScreen.tsx` — 40: 60, 28, 17
- `mobile-app/src/screens/auth/LoginScreen.tsx` — 375: 34; 459: 18; 466: 16
- `mobile-app/src/screens/auth/RegisterScreen.tsx` — 123: 28; 129: 12; 132: 17
- `mobile-app/src/screens/auth/ResetPasswordScreen.tsx` — 264: 60; 269: 28; 311: 17
- `mobile-app/src/screens/auth/SplashScreen.tsx` — 101: 18
- `mobile-app/src/screens/chapters/ChaptersScreen.tsx` — 163: 16
- `mobile-app/src/screens/contact/ContactScreen.tsx` — 304: 16; 311: 13
- `mobile-app/src/screens/downloads/DownloadsScreen.tsx` — 353: 28; 381: 15
- `mobile-app/src/screens/home/HomeScreen.tsx` — 553: 26; 570: 26; 577: 15
- `mobile-app/src/screens/maintenance/MaintenanceScreen.tsx` — 24: 26; 25: 16
- `mobile-app/src/screens/notifications/NotificationsScreen.tsx` — 155: 17
- `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx` — 516: 12
- `mobile-app/src/screens/payment/PaymentFailedScreen.tsx` — 277: 52
- `mobile-app/src/screens/payment/PaymentSuccessScreen.tsx` — 152: 52
- `mobile-app/src/screens/profile/ChangePasswordScreen.tsx` — 180: 28; 192: 18; 218: 18
- `mobile-app/src/screens/profile/EditProfileScreen.tsx` — 170: 28; 182: 18; 201: 18
- `mobile-app/src/screens/profile/ProfileScreen.tsx` — 241: 16
- `mobile-app/src/screens/quiz/QuizScreen.tsx` — 406: 60; 526: 44
- `mobile-app/src/screens/referral/ReferralScreen.tsx` — 300: 32; 319: 34
- `mobile-app/src/screens/search/SearchScreen.tsx` — 254: 30; 276: 18; 360: 44
- `mobile-app/src/screens/subjects/SubjectsScreen.tsx` — 137: 16
- `mobile-app/src/screens/update/UpdateRequiredScreen.tsx` — 43: 26; 49: 16
- `mobile-app/src/screens/years/YearsScreen.tsx` — 129: 16

### Spacing

- `mobile-app/src/components/BottomNav.tsx` — 153: 8; 154: 22; 179: 2
- `mobile-app/src/components/ConfirmationDialog.tsx` — 113: 8
- `mobile-app/src/components/ContinueLearningCard.tsx` — 98: 2; 108: 2
- `mobile-app/src/components/CustomButton.tsx` — 45: 12
- `mobile-app/src/components/CustomInput.tsx` — 53: 18
- `mobile-app/src/components/DailyQuoteCard.tsx` — 46: 8
- `mobile-app/src/components/EmptyState.tsx` — 30: 60
- `mobile-app/src/components/ErrorBoundary.tsx` — 70: 32; 77: 8; 85: 24; 90: 24; 91: 12
- `mobile-app/src/components/ErrorState.tsx` — 53: 70; 72: 25; 74: 25; 75: 12
- `mobile-app/src/components/FeatureCard.tsx` — 38: 8
- `mobile-app/src/components/FilterChip.tsx` — 34: 8
- `mobile-app/src/components/MiniChapterCard.tsx` — 44: 8; 55: 4
- `mobile-app/src/components/NoteCard.tsx` — 189: 8; 202: 8; 203: 2; 228: 6; 230: 12; 231: 8
- `mobile-app/src/components/NotificationBell.tsx` — 54: 3
- `mobile-app/src/components/NotificationRow.tsx` — 87: 2; 95: 6; 116: 2; 134: 2
- `mobile-app/src/components/OptionCard.tsx` — 85: 18
- `mobile-app/src/components/ProductCard.tsx` — 95: 3; 96: 6; 110: 4; 116: 14; 117: 8
- `mobile-app/src/components/ProductPosterCard.tsx` — 147: 4; 156: 8; 161: 2; 168: 6; 179: 2; 194: 1; 199: 10; 200: 8; 203: 8
- `mobile-app/src/components/ProfileAvatar.tsx` — 29: 25
- `mobile-app/src/components/ProfileMenuCard.tsx` — 50: 18; 51: 14
- `mobile-app/src/components/ProgressBar.tsx` — 31: 25
- `mobile-app/src/components/ProgressRing.tsx` — 123: 1
- `mobile-app/src/components/SearchBar.tsx` — 89: 18; 124: 2
- `mobile-app/src/components/SectionHeader.tsx` — 45: 8
- `mobile-app/src/components/SideDrawer.tsx` — 311: 60; 392: 6
- `mobile-app/src/components/Skeleton.tsx` — 68: 12; 69: 8; 88: 12; 107: 12
- `mobile-app/src/components/StatCard.tsx` — 51: 18; 52: 16; 80: 2
- `mobile-app/src/components/StreakBadge.tsx` — 51: 10; 52: 4; 57: 4; 63: 3
- `mobile-app/src/components/StudentProfileCard.tsx` — 144: 2; 149: 2; 155: 10; 156: 8
- `mobile-app/src/components/TestCard.tsx` — 120: 8; 123: 8; 124: 2
- `mobile-app/src/components/UnlockOptionsPanel.tsx` — 159: 2; 167: 16
- `mobile-app/src/components/YearCard.tsx` — 111: 2
- `mobile-app/src/components/search/RecentSearchesRow.tsx` — 104: 8; 108: 6; 117: 8
- `mobile-app/src/components/search/SearchEmptyState.tsx` — 51: 50; 52: 60; 82: 10
- `mobile-app/src/components/search/SearchFiltersSheet.tsx` — 224: 14
- `mobile-app/src/components/search/SearchResultRow.tsx` — 102: 2; 113: 6; 119: 8; 120: 3; 123: 4; 140: 4; 146: 2
- `mobile-app/src/features/question-papers/PaperLayout.tsx` — 9: 20, 32; 12: 16, 10, 14; 15: 14, 10, 8; 18: 40, 20, 12; 20: 10; 21: 6, 22; 22: 12, 4; 23: 2; 24: 12, 16, 10; 25: 2; 26: 16, 10, 8; 27: 12; 51: 4
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.web.tsx` — 20: 24
- `mobile-app/src/screens/about/AboutScreen.tsx` — 134: 60; 135: 50; 178: 40
- `mobile-app/src/screens/auth/ForgotPasswordScreen.tsx` — 40: 25, 16
- `mobile-app/src/screens/auth/LoginScreen.tsx` — 366: 25; 386: 40; 441: 25; 446: 16; 463: 25
- `mobile-app/src/screens/auth/RegisterScreen.tsx` — 121: 25; 127: 4; 130: 16
- `mobile-app/src/screens/auth/ResetPasswordScreen.tsx` — 259: 25; 298: 16
- `mobile-app/src/screens/auth/SplashScreen.tsx` — 85: 40
- `mobile-app/src/screens/chapters/ChaptersScreen.tsx` — 151: 4; 156: 4; 160: 50
- `mobile-app/src/screens/contact/ContactScreen.tsx` — 274: 60; 275: 50; 285: 6; 292: 18; 349: 6
- `mobile-app/src/screens/details/ChapterDetailsScreen.tsx` — 141: 6
- `mobile-app/src/screens/downloads/DownloadsScreen.tsx` — 297: 60; 314: 6; 315: 6; 329: 2; 333: 6; 353: 14; 356: 3; 358: 6, 8; 369: 4; 376: 6
- `mobile-app/src/screens/home/HomeScreen.tsx` — 566: 2
- `mobile-app/src/screens/notes/NotesScreen.tsx` — 258: 6
- `mobile-app/src/screens/notifications/NotificationPreferencesScreen.tsx` — 75: 60; 76: 40; 86: 6; 113: 3
- `mobile-app/src/screens/notifications/NotificationsScreen.tsx` — 126: 60; 142: 6; 158: 40
- `mobile-app/src/screens/onboarding/SelectCourseYearScreen.tsx` — 222: 60; 232: 4
- `mobile-app/src/screens/payment/OrderSummaryScreen.tsx` — 282: 60; 285: 4; 297: 2; 305: 6
- `mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx` — 509: 6
- `mobile-app/src/screens/payment/PaymentFailedScreen.tsx` — 308: 4; 329: 16; 346: 16
- `mobile-app/src/screens/payment/PaymentSuccessScreen.tsx` — 203: 16; 220: 16
- `mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx` — 186: 12; 189: 14, 6
- `mobile-app/src/screens/pdf/PdfViewerScreen.web.tsx` — 68: 12
- `mobile-app/src/screens/privacy/PrivacyScreen.tsx` — 167: 60; 168: 40
- `mobile-app/src/screens/profile/ChangePasswordScreen.tsx` — 191: 16; 193: 8; 200: 12; 201: 4; 206: 16; 208: 12
- `mobile-app/src/screens/profile/EditProfileScreen.tsx` — 181: 16; 190: 16
- `mobile-app/src/screens/profile/ProfileScreen.tsx` — 233: 60; 234: 40; 239: 25; 247: 25; 253: 4; 260: 25
- `mobile-app/src/screens/purchases/MyPurchasesScreen.tsx` — 154: 60; 166: 6; 171: 40; 205: 4
- `mobile-app/src/screens/quiz/QuizScreen.tsx` — 261: 6; 410: 8; 450: 6; 476: 16; 486: 16; 498: 16
- `mobile-app/src/screens/quiz/TestListScreen.tsx` — 132: 6
- `mobile-app/src/screens/referral/ReferralScreen.tsx` — 274: 60; 286: 6; 319: 4; 325: 2; 368: 2; 371: 2
- `mobile-app/src/screens/referral/ReferralTermsScreen.tsx` — 82: 60
- `mobile-app/src/screens/reminder/StudyReminderScreen.tsx` — 233: 60; 249: 6; 292: 2; 296: 14; 297: 8; 308: 14
- `mobile-app/src/screens/search/SearchScreen.tsx` — 182: 8; 236: 56; 261: 0; 294: 8; 312: 10; 354: 70
- `mobile-app/src/screens/settings/SettingsScreen.tsx` — 210: 60; 211: 40
- `mobile-app/src/screens/store/StoreScreen.tsx` — 191: 60; 201: 6; 215: 14; 216: 7
- `mobile-app/src/screens/subjects/SubjectsScreen.tsx` — 131: 4; 134: 50
- `mobile-app/src/screens/terms/TermsScreen.tsx` — 163: 60; 164: 40
- `mobile-app/src/screens/videos/VideosScreen.tsx` — 132: 6
- `mobile-app/src/screens/years/YearsScreen.tsx` — 107: 4; 117: 4; 126: 50

### Radii

- `mobile-app/src/components/BottomNav.tsx` — 166: 16; 193: 46
- `mobile-app/src/components/CustomButton.tsx` — 46: 12
- `mobile-app/src/components/CustomInput.tsx` — 59: 12
- `mobile-app/src/components/ErrorBoundary.tsx` — 92: 10
- `mobile-app/src/components/ErrorState.tsx` — 76: 10
- `mobile-app/src/components/FilterChip.tsx` — 35: 20
- `mobile-app/src/components/HomeHeader.tsx` — 166: 20; 181: 18; 188: 18; 195: 18; 202: 22; 216: 22
- `mobile-app/src/components/LoadError.tsx` — 24: 8
- `mobile-app/src/components/NotificationBell.tsx` — 39: 22; 53: 8
- `mobile-app/src/components/NotificationRow.tsx` — 93: 4
- `mobile-app/src/components/ProductCard.tsx` — 93: 20; 118: 30
- `mobile-app/src/components/ProfileAvatar.tsx` — 35: 50
- `mobile-app/src/components/ProgressBar.tsx` — 29: 20
- `mobile-app/src/components/SearchBar.tsx` — 109: 15
- `mobile-app/src/components/SectionHeader.tsx` — 43: 2
- `mobile-app/src/components/SideDrawer.tsx` — 388: 24
- `mobile-app/src/components/StatCard.tsx` — 60: 12
- `mobile-app/src/components/StreakBadge.tsx` — 50: 999
- `mobile-app/src/components/StudentProfileCard.tsx` — 104: 28; 118: 9
- `mobile-app/src/components/TestCard.tsx` — 148: 20
- `mobile-app/src/components/UnlockOptionsPanel.tsx` — 169: 30
- `mobile-app/src/components/YearCard.tsx` — 90: 15
- `mobile-app/src/components/motion/SuccessBurst.tsx` — 105: 36; 119: 4
- `mobile-app/src/components/search/RecentSearchesRow.tsx` — 120: 8
- `mobile-app/src/components/search/SearchFiltersSheet.tsx` — 179: 2
- `mobile-app/src/features/question-papers/PaperLayout.tsx` — 12: 18; 14: 12; 15: 12
- `mobile-app/src/screens/auth/RegisterScreen.tsx` — 128: 2
- `mobile-app/src/screens/contact/ContactScreen.tsx` — 345: 20
- `mobile-app/src/screens/downloads/DownloadsScreen.tsx` — 362: 3; 366: 3; 375: 24
- `mobile-app/src/screens/notifications/NotificationsScreen.tsx` — 147: 20
- `mobile-app/src/screens/payment/PaymentFailedScreen.tsx` — 269: 48
- `mobile-app/src/screens/payment/PaymentSuccessScreen.tsx` — 144: 48
- `mobile-app/src/screens/pdf/PdfViewerScreen.native.tsx` — 189: 20
- `mobile-app/src/screens/quiz/QuizScreen.tsx` — 411: 30
- `mobile-app/src/screens/referral/ReferralScreen.tsx` — 348: 13
- `mobile-app/src/screens/reminder/StudyReminderScreen.tsx` — 298: 20
- `mobile-app/src/screens/search/SearchScreen.tsx` — 285: 4

## Migration sequence

1. Theme + shared primitives; adapt existing search, section, empty, filter and subject/chapter wrappers without changing public props.
2. Question Papers library, sessions and native/web reader. Reconcile the requested library shortcut with existing route contracts; preserve route registration and access/download hooks.
3. Home/profile/continue-learning, academic years, quick actions and inline bottom tabs.
4. Remaining study, downloads/purchases/profile, settings/search/notifications, auth and payment UI.

## Manual acceptance checklist

For each migrated screen: 360px and large phone width, largest system text, long Marathi/English names, dark-mode contrast, VoiceOver/TalkBack labels, reduced motion, safe areas, keyboard, tab clearance, empty/loading/error/offline states. Exercise existing callbacks and back navigation. Reader: native and web; purchased/locked/downloaded content; retry and permission failures. Payment/auth tests remain regression checks, never part of the visual redesign.
