# Step 1 — shared UI foundation

Completed 2026-11-21. Scope: the requested audit, theme and reusable components. Screen-by-screen migration remains steps 2–4. Existing Supabase queries, auth, payments, routes, models and data hooks were not edited by this step. Existing worktree changes were preserved.

## Delivered

- Warm-dark semantic palette, academic-year tints, copper gradient stops, 4/8/12/16/20/24/32 spacing, card/tile/pill radii, system typography, soft shadows, layout/opacity and motion tokens. Legacy exports remain available.
- ScreenHeader, ListRow/CompactCard, GridCard, Icon/IconTile, IconButton, PrimaryButton/SecondaryButton, Badge, Chip/SegmentedControl and presentational OfflineBanner.
- Updated SearchBar, SectionHeader, EmptyState, Skeleton, SubjectCard, ChapterCard, FilterChip and CustomButton. Existing public props are retained; chapterNumber is an optional future migration prop.
- Shared press feedback is 0.98 scale plus opacity over 100ms, with OS reduced-motion support. Skeleton shimmer is static when reduced motion is enabled. Titles can wrap and rows expand with larger text.
- Icon set: installed Ionicons. No dependencies added. The system font is used intentionally for native scaling and Indian-language fallback; no Inter/Jakarta font package or startup font-loading change was introduced.
- OfflineBanner is presentational: screens must supply real connectivity/cache state and accurate copy. It does not assert that Question Papers has an in-app offline cache.

## Changed files

- `docs/audit/ui-redesign-20261121/audit.md`
- `docs/audit/ui-redesign-20261121/step-1-verification.md`
- `docs/superpowers/plans/2026-11-21-ui-foundation.md`
- `mobile-app/scripts/accessibility-selftest.cjs`
- `mobile-app/scripts/ui-foundation-selftest.cjs`
- `mobile-app/src/components/Badge.tsx`
- `mobile-app/src/components/ChapterCard.tsx`
- `mobile-app/src/components/Chip.tsx`
- `mobile-app/src/components/CompactCard.tsx`
- `mobile-app/src/components/CustomButton.tsx`
- `mobile-app/src/components/EmptyState.tsx`
- `mobile-app/src/components/FilterChip.tsx`
- `mobile-app/src/components/GridCard.tsx`
- `mobile-app/src/components/Icon.tsx`
- `mobile-app/src/components/IconButton.tsx`
- `mobile-app/src/components/IconTile.tsx`
- `mobile-app/src/components/ListRow.tsx`
- `mobile-app/src/components/OfflineBanner.tsx`
- `mobile-app/src/components/PrimaryButton.tsx`
- `mobile-app/src/components/ScreenHeader.tsx`
- `mobile-app/src/components/SearchBar.tsx`
- `mobile-app/src/components/SecondaryButton.tsx`
- `mobile-app/src/components/SectionHeader.tsx`
- `mobile-app/src/components/SegmentedControl.tsx`
- `mobile-app/src/components/Skeleton.tsx`
- `mobile-app/src/components/SubjectCard.tsx`
- `mobile-app/src/components/motion/AnimatedPressable.tsx`
- `mobile-app/src/theme/colors.ts`
- `mobile-app/src/theme/index.ts`
- `mobile-app/src/theme/layout.ts`
- `mobile-app/src/theme/motion.ts`
- `mobile-app/src/theme/radius.ts`
- `mobile-app/src/theme/shadows.ts`
- `mobile-app/src/theme/spacing.ts`
- `mobile-app/src/theme/typography.ts`

## Verification evidence

All completed successfully on this working tree:

- `cd mobile-app && ./node_modules/.bin/tsc --noEmit` — strict compiler, exit 0.
- Targeted ESLint across the theme, added primitives, changed wrappers and AnimatedPressable — exit 0.
- `node mobile-app/scripts/ui-foundation-selftest.cjs` — clearing/editability, explicit clear callback, stable segment values, disabled/busy state, multilingual accessibility labels, action forwarding.
- Existing selftests: `accessibility`, `list-states`, `question-papers-redesign`, `question-papers-ui`, `question-papers-lifecycle`, `question-papers-download`, `audit-icon-controls` — all PASS.
- `EXPO_OFFLINE=1 ./node_modules/.bin/expo export --platform web --output-dir /tmp/medveda-ui-web-final` — 2,587 modules bundled, exit 0. This proves bundling, not browser/device rendering.
- `git diff --check` over changed source and existing test file — no whitespace errors.
- Calculated WCAG contrast: primary text/background 16.94:1; secondary text/surface 6.69:1; dark button label/copper 6.76:1. These apply to the named token pairs, not every legacy screen color combination.

The accessibility selftest's import mocks were extended for the new layout/typography imports; its existing assertions remain intact. Android export was interrupted and is not reported as passing. No device, emulator, browser screenshot, payment, auth or live-backend validation was performed.

## Before / after (layout definitions, not device measurements)

| Element | Before | Foundation |
| --- | --- | --- |
| Chapter row | 44px icon + 15px vertical padding each side + border ≈ 76px | 64px minimum; 40px tile; 8px vertical / 12px horizontal padding |
| Subject row | Content-dependent; 20px padding; emoji + left border | Shared 64px minimum row; 8px vertical / 12px horizontal padding |
| Search | 54px input + border ≈ 56px | 44px input/touch controls + border ≈ 46px |
| New grid tile | No shared grid primitive | 104px minimum; 12px padding; grows with text |
| Cards | Common radius 18px; raised/glow shadows | 12px card / 10px tile; soft shadow |
| Offline | Feature-specific block | New 32px minimum inline banner; screen integration pending |
| Header | Mixed implementations | New 56px minimum header; screen integration pending |

## Manual checks for this step

- [ ] Choose Subject: long English/Marathi names, filtering, selecting notes/videos/quiz routes.
- [ ] Choose Chapter: locked and unlocked rows remain tappable and preserve existing ownership/navigation; long titles wrap.
- [ ] Search fields on Home, Subjects, Chapters, Store and Search: keyboard, typing, clear, submit, explicit clear callbacks and read-only appearance.
- [ ] Existing forms using CustomButton: enabled/disabled appearance, multiline labels and unchanged submission.
- [ ] Section actions, filters, empty states and skeletons wherever currently used.
- [ ] Home, Downloads, Purchases, Profile, Settings, Notifications, payment/auth screens and Question Papers: spot-check global palette/spacing/radius changes, especially legacy copper-filled controls whose labels are not yet migrated to semantic textOnPrimary.
- [ ] Repeat on 360px and large phone widths, largest text size, TalkBack/VoiceOver, reduced motion, slow loading and offline.
- [ ] Inspect safe-area/header and tab clearance on hardware during each subsequent screen migration.

## Remaining milestones and constraints

2. Question Papers layout and native/web reader; 3. Home and tabs; 4. remaining screens. New shared controls are available but not all are placed in screens yet. No numbered chapter badges are shown until a screen supplies chapterNumber. New GridCard dimensions do not represent a completed academic-year grid migration.

The current Paper model has no size/count/cache metadata and the paper download flow saves outside an in-app catalog. Recently viewed tracking, reliable paper counts and in-app offline availability cannot be invented by a visual-only refactor. Reuse existing capabilities where available and clearly distinguish these from future behavior work. Haptics are not added: expo-haptics is absent and the dependency boundary needs to be resolved before that later polish step.
