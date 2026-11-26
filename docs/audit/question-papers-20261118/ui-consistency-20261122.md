# Mobile UI consistency — 2026-11-22

## Scope and implementation plan

Presentation and proven cleanup only. Preserve the current dirty workspace; no commits, dependencies, backend changes, database mutations, release builds or deployment. An initial 3,188-state baseline and tracked patch were recorded in `/tmp`; those two files were lost across the first interruption. Preservation is therefore assessed from the recorded edit inventory, tracked diffs and unchanged-source comparisons, rather than claiming a final whole-tree comparison against that missing baseline.

Inspection: all mobile screen/component/theme/navigation files inventoried; all Question Paper source and test files reviewed. Existing conventions: dark warm palette, 20-point gutters, 15-point content top inset, 18-point card radius, 16-point card titles, native stack headers for study routes. Root App owns left/right/bottom safe areas; native navigation owns study status-bar/back handling. BottomNav is in normal flow, with an unnecessary extra fixed 22-point bottom pad. HomeHeader separately owns its top inset. Legacy utility/profile screens use fixed top padding; no unrelated header rewrite planned.

- [x] Share existing study layout values (20-point gutters, 15-point top, responsive 840-point maximum) across the main study lists and Question Papers; standardize native study header typography/alignment.
- [x] Compact Question Paper cards, section headings, loading/empty/error states and toolbar. Remove repeated navigation title/instructions, keep download/share/retry actions, zoom and all hooks/services unchanged. Let native header show reader context. Root safe areas remain sole bottom owner.
- [x] Consolidate redesign UI assertions into the existing UI suite, retain all distinct assertions and security/functional suites. Check all script references.
- [x] Run TypeScript, targeted/relevant regressions, web export and lint; review the exact task inventory. Visual/SQL checks and the lost initial whole-tree baseline are reported as limitations.

Design choice: reuse existing theme and native headers. A separate header/design system or broad screen rewrite would conflict with scope. Work in the supplied checkout because the module and other existing edits are uncommitted. No changes to services, hooks, route destinations/params, signed URL expiry, Notes/payment/authorization logic or platform compatibility.

## Test audit

UI-only checks use the existing lightweight harness; they do not prove actual Android/browser rendering.

29/29 targeted regression commands passed (full results read from the completed runner).

| Command | Result |
| --- | --- |
| `node mobile-app/scripts/question-papers-selftest.cjs` | PASS |
| `node mobile-app/scripts/question-papers-ui-selftest.cjs` | PASS |
| `node mobile-app/scripts/question-papers-download-selftest.cjs` | PASS |
| `node mobile-app/scripts/question-papers-lifecycle-selftest.cjs` | PASS |
| `node mobile-app/scripts/question-papers-web-preview-selftest.cjs` | PASS |
| `node mobile-app/scripts/navigation-lazy-selftest.cjs` | PASS |
| `node mobile-app/scripts/audit-navigation-selftest.cjs` | PASS |
| `node mobile-app/scripts/route-validation-selftest.cjs` | PASS |
| `node mobile-app/scripts/list-states-selftest.cjs` | PASS |
| `node mobile-app/scripts/load-resource-selftest.cjs` | PASS |
| `node mobile-app/scripts/notes-open-selftest.cjs` | PASS |
| `node mobile-app/scripts/notes-entitlement-selftest.cjs` | PASS |
| `node mobile-app/scripts/pdf-lifecycle-selftest.cjs` | PASS |
| `node mobile-app/scripts/pdf-remote-retry-selftest.cjs` | PASS |
| `node mobile-app/scripts/download-actions-selftest.cjs` | PASS |
| `node mobile-app/scripts/offline-download-selftest.cjs` | PASS |
| `node mobile-app/scripts/quiz-hooks-selftest.cjs` | PASS |
| `node mobile-app/scripts/quiz-input-selftest.cjs` | PASS |
| `node mobile-app/scripts/quiz-editing-selftest.cjs` | PASS |
| `node mobile-app/scripts/accessibility-selftest.cjs` | PASS |
| `node mobile-app/scripts/audit-icon-controls-selftest.cjs` | PASS |
| `node mobile-app/scripts/startup-availability-selftest.cjs` | PASS |
| `node mobile-app/scripts/years-inflight-selftest.cjs` | PASS |
| `node mobile-app/scripts/course-state-race-selftest.cjs` | PASS |
| `node mobile-app/scripts/auth-state-race-selftest.cjs` | PASS |
| `node admin-panel/scripts/question-papers-selftest.cjs` | PASS |
| `node admin-panel/scripts/question-papers-ui-selftest.cjs` | PASS |
| `node admin-panel/scripts/question-papers-form-selftest.cjs` | PASS |
| `node supabase/tests/question-paper-access-selftest.cjs` | PASS |

Full mobile source lint: FAIL — `tooling/node_modules/.bin/eslint mobile-app/src`
```text

/home/ganeshp8545/AyurPulse/mobile-app/src/features/question-papers/usePaperResource.ts
  26:6  error  React Hook useCallback has an unnecessary dependency: 'revision'. Either exclude it or remove the dependency array  react-hooks/exhaustive-deps

✖ 1 problem (1 error, 0 warnings)

```

Web TypeScript: PASS — web module suffix resolution


Native TypeScript: PASS — `node mobile-app/node_modules/typescript/bin/tsc -p mobile-app/tsconfig.json --noEmit --pretty false`


Protected-source comparison: 772 existing source/config files compared to earlier pre-revert backup tree `2c84aab797f7e29f602c228395b189397252c571`; 2 differences. Covers backend/admin, services/hooks/auth/utilities/config/types, Question Paper logic, App.tsx and dependency/config files. This is an earlier backup comparison, not the missing start-of-task whole-tree baseline.
mobile-app/App.tsx
mobile-app/src/services/studyReminderService.ts

Lint on all 17 edited TS/TSX files: PASS


Expo web export: PASS — `CI=1 EXPO_NO_TELEMETRY=1 node node_modules/expo/bin/cli export --platform web --max-workers 2 --output-dir /tmp/medveda-ui-web-export-20261122` (cwd mobile-app)
```text
env: load .env
env: export EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_SUPABASE_URL
Starting Metro Bundler

Web Bundled 15378ms node_modules/expo/AppEntry.js (2577 modules)

› Assets (34):
assets/adaptive-icon.786ed8b976479bb9363460db8aa984ee.png (1.3MB)
assets/branding/medveda-header-logo.a59ee9ae840dcad94d9621c3e9105189.png (91KB)
assets/icon.228bf4966f71aab020c2819ffb8b878b.png (885KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.3f78af31cca60105799838a1a7a59fbd.ttf (130KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Entypo.31b5ffea3daddc69dd01a1f3d6cf63c5.ttf (66KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/EvilIcons.140c53a7643ea949007aa9a282153849.ttf (13KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf (56KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.b06871f281fee6b241d60582ae9369b9.ttf (166KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.3b89dd103490708d19a95adcae52210e.ttf (134KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.1f77739ca9ff2188b539c36f30ffa2be.ttf (34KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.605ed7926cf39a2ad5ec2d1f9d391d3d.ttf (203KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Brands.56c8d80832e37783f12c05db7c8849e2.ttf (209KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Regular.370dd5af19f8364907b6e2c41f45dbbf.ttf (68KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Solid.adec7d6f310bc577f05e8fe06a5daccf.ttf (424KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Fontisto.b49ae8ab2dbccb02c4d11caaacf09eab.ttf (314KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Foundation.e20945d7c929279ef7a6f1db184a4470.ttf (57KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf (390KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.6e435534bd35da5fef04168860a9b8fa.ttf (1.3MB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.4e85bc9ebe07e0340c9c4fc2f6c38908.ttf (357KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Octicons.871378c6eab492a3e689a9385dc45a12.ttf (69KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/SimpleLineIcons.d2285965fe34b05465047401b8595dd0.ttf (54KB)
node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Zocial.1681f34aaca71b8dfb70756bca331eb2.ttf (26KB)
node_modules/@react-navigation/elements/lib/module/assets/back-icon-mask.0a328cd9c1afd0afe8e3b1ec5165b1b4.png (653B)
node_modules/@react-navigation/elements/lib/module/assets/back-icon.35ba0eaec5a4f5ed12ca16fabeae451d.png (207B)
node_modules/@react-navigation/elements/lib/module/assets/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55.png (4 variations | 425B)
node_modules/@react-navigation/elements/lib/module/assets/close-icon.808e1b1b9b53114ec2838071a7e6daa7.png (4 variations | 235B)
node_modules/@react-navigation/elements/lib/module/assets/search-icon.286d67d3f74808a60a78d3ebf1a5fb57.png (928B)
node_modules/expo-sqlite/web/wa-sqlite/wa-sqlite.7ca566fbbc2ec2a172c5aefa63a20f4b.wasm (621KB)

› web bundles (3):
_expo/static/js/web/AppEntry-246bd84dca1b7ead010cc4306328c3c9.js (5.5MB)
_expo/static/js/web/nonplayTestService-af13eda63b3841dfff0f9e2aaf41bcc1.js (5.4KB)
_expo/static/js/web/worker-abd50e974f91e6f87a2e22b547e26ce7.js (133KB)

› Files (2):
index.html (1.2KB)
metadata.json (49B)

Exported: /tmp/medveda-ui-web-export-20261122
```

## Changes delivered

- Existing native study headers now share left alignment, 18-point semibold/bold token styling, no shadow and the native minimal back-button presentation. Navigation destinations, parameters and native back behavior are unchanged. The reader displays its existing route title in that header rather than repeating it in the content toolbar.
- Main study content and Question Paper lists share 20-point gutters, 15-point top padding and an 840-point maximum width. Existing study titles, searches, lists, loaders and controls keep their behavior. SubjectCard titles now flex beside the chevron so long names can wrap.
- BottomNav keeps its existing normal-flow positioning and all five destinations. Reduced its fixed bottom padding from 22 to 10; the existing root SafeAreaView continues to provide the bottom/side safe areas. No double safe-area inset was added. Native header/status-bar management and HomeHeader's own top inset remain intact.
- Question Paper cards use token-based padding/gaps and a compact 72-point minimum row height, with unconstrained text wrapping. Academic years, year context, subject context and exam-session headings have a clear hierarchy. Removed repeated per-row instructions and the duplicate Question Papers heading. Empty/error/loading panels are compact; successful lists show no Refresh/Retry buttons, while failed loads retain Retry. There was no existing Question Paper pull-to-refresh control; other study lists retain theirs.
- Reader toolbar keeps download, share, busy/disabled states, error Retry and status announcements; secondary share styling makes download easier to identify. Removed the unused optional custom Back prop/branch (no screen called it), retaining the native Back button. Reduced toolbar and page-counter padding; native PDF rendering, page events, min/max zoom, double-tap zoom and error callbacks are untouched. Web fallback text is now readable on the white PDF surface.
- No active UI assets were proven unused; none were removed. Services, hooks, downloader implementations, platform compatibility handling and backend code were left untouched.

## Exact task file inventory

Modified presentation source (17 files):

- `mobile-app/src/components/BottomNav.tsx`
- `mobile-app/src/components/SubjectCard.tsx`
- `mobile-app/src/navigation/AppNavigator.tsx`
- `mobile-app/src/theme/spacing.ts`
- `mobile-app/src/screens/years/YearsScreen.tsx`
- `mobile-app/src/screens/subjects/SubjectsScreen.tsx`
- `mobile-app/src/screens/chapters/ChaptersScreen.tsx`
- `mobile-app/src/screens/details/ChapterDetailsScreen.tsx`
- `mobile-app/src/screens/notes/NotesScreen.tsx`
- `mobile-app/src/screens/quiz/TestListScreen.tsx`
- `mobile-app/src/screens/videos/VideosScreen.tsx`
- `mobile-app/src/features/question-papers/PaperLayout.tsx`
- `mobile-app/src/features/question-papers/PaperReaderToolbar.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperYearsScreen.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperSubjectsScreen.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperSessionsScreen.tsx`
- `mobile-app/src/features/question-papers/screens/QuestionPaperPdfScreen.web.tsx`

Modified tests (3 files):

- `mobile-app/scripts/question-papers-ui-selftest.cjs`: one consolidated presentation suite, including existing state/navigation/share/download/security assertions. Added small checks for content width, shrinkable text, successful-list button absence and single reader title/back ownership.
- `mobile-app/scripts/audit-navigation-selftest.cjs`: supplies the typography import and verifies shared paper-header options and route-based reader title; existing auth/history assertions remain.
- `mobile-app/scripts/navigation-lazy-selftest.cjs`: supplies the new typography import to its isolated harness; existing lazy-loading/provider/error-boundary assertions remain.

Removed: `mobile-app/scripts/question-papers-redesign-selftest.cjs`. Its distinct loading/error/offline, subject navigation, disabled action, download/retry/share and stale-link assertions were moved into the retained UI suite. The optional custom Back callback test became obsolete when the unused prop was removed; native header/back ownership is checked instead. No security assertion was removed or weakened. Live source/scripts/config had no references to the removed filename; historical reports are unchanged.

Added: this audit report only. Pre-existing unrelated modifications/deletions, including the rest of the Question Paper module, were preserved; Git status against HEAD also includes those earlier changes and is not this task's inventory.

## Retained Question Paper test classifications

| Suite | Classification and reason retained |
| --- | --- |
| Mobile `question-papers-selftest.cjs` | Essential security/functional: authenticated reads, free published-only access, pagination/grouping, authorized signing, input validation and owner changes. |
| Mobile `question-papers-ui-selftest.cjs` | Essential UI plus security: Home entry, exact navigation, request/account invalidation, loading/empty/offline/error, Retry and reader actions/stale-share protection. |
| Mobile `question-papers-lifecycle-selftest.cjs` | Essential security/functional/UI: background/foreground invalidation, expiry recovery, account changes, detached viewer callbacks and source-bound native page counts. |
| Mobile `question-papers-download-selftest.cjs` | Essential security/functional: Android/iOS/web export, HTTP expiry, account/course cancellation, MIME/byte/size checks and cleanup. |
| Mobile `question-papers-web-preview-selftest.cjs` | Essential functional/security: controlled preview HTTP errors, interruption, stale responses and Blob cleanup; distinct from downloading. |
| Admin `question-papers-selftest.cjs` | Essential security/functional: metadata validation, scoped listing, signing, upload/replace/publication/delete, revision conflicts and failure preservation. |
| Admin `question-papers-ui-selftest.cjs` | Essential UI/functional: preview/edit integration and stale-preview prevention. |
| Admin `question-papers-form-selftest.cjs` | Essential UI/functional: replacement validation must finish before save and selected-PDF preview. |
| `supabase/tests/question-paper-access-selftest.cjs` | Essential security: authenticated visibility, 120-second signing cap, admin-only byte validation and receipts. Mocked in-process execution only. |
| `supabase/tests/question-papers-local.py`, `question_papers_checks.sql`, `question_papers_subject_delete_checks.sql` | Essential security/functional/integration: RLS, private Storage, course/subject scope, published/draft visibility, admin/student boundaries and concurrency. Retained unchanged. Execution BLOCKED by this task's absolute no-database-mutations restriction; the local harness creates and writes a disposable database. |
| `scripts/question-papers-verify.py` | Retained check orchestrator, not duplicate behavior coverage. Its old scope-check companion is tied to the November 18 additive-only baseline and cannot establish preservation for today's already-dirty checkout. Neither script nor CI was disabled or changed. |

## Limits and preservation

Android visual/PDF rendering testing: **BLOCKED**. `adb devices` could not start its sandbox listener (`Operation not permitted`). No APK/AAB build was attempted.

Browser visual/PDF embedding testing: **BLOCKED**. No Chromium executable or Playwright/Puppeteer package was available. Web export and mocked preview/download tests do not substitute for browser rendering, zoom, file-save dialogs or accessibility validation.

Database integration tests: **BLOCKED** by the explicit no-database-mutations restriction, including disposable database writes. No hosted backend, production data, payment, deployment or migration operation was performed.

Full-source lint has one existing `react-hooks/exhaustive-deps` error at `usePaperResource.ts:26` for `revision`. That hook was not edited; removing its retry-generation dependency is outside presentation scope. Do not treat this task as a fully green lint run.

Behavior preservation is supported by the 29 passing targeted checks, TypeScript checks, review of presentation-only edits and protected-source comparisons. It is not a claim of 100% runtime proof. Initial temporary baseline loss limits whole-tree byte comparison. Legacy utility/profile fixed top paddings remain for a separately scoped consistency pass; no broad unrelated header rewrite was made. Final review was an author review, with no independent reviewer or device/browser session.

No commits, pushes, dependencies, backend/schema/Edge Function/payment changes, production deployments or release builds were made.

## Final verification summary

| Check | Result |
| --- | --- |
| Native and explicit web-resolution TypeScript | PASS |
| Targeted regression commands | PASS, 29/29 |
| All 17 edited TS/TSX files lint | PASS |
| Complete mobile-source lint | FAIL: one existing hook dependency diagnostic, as recorded above |
| Expo web export | PASS, exit 0; three bundles, index.html and metadata.json under `/tmp/medveda-ui-web-export-20261122` |
| Edited tracked-file whitespace check | PASS |
| Removed-script live-reference scan | PASS; no live references |
| Android visual acceptance | BLOCKED: ADB sandbox listener |
| Browser visual/PDF embedding acceptance | BLOCKED: browser/automation unavailable |
| SQL/RLS integration execution | BLOCKED: no-database-mutations restriction |

The protected-source comparison checked 772 existing files: 770 match the earlier pre-revert backup tree. The two differences, `mobile-app/App.tsx` and `mobile-app/src/services/studyReminderService.ts`, both match current HEAD exactly (`git diff --exit-code HEAD -- ...`, exit 0); those were existing revert differences, not edits made here. In particular, Question Paper hooks/services/downloaders, backend/admin, dependency files and payment/security source matched the backup comparison. This supports preservation of the protected implementation without claiming that the missing initial whole-tree baseline was recovered.

Author review: checked native header/back ownership, existing safe-area ownership, constrained list widths, wrapping subject/card text, toolbar actions/error visibility, PDF callback/zoom preservation, test consolidation and references. No additional product changes were made after the passing regression run. The complete app's legacy custom utility/profile headers remain outside this focused study-flow cleanup, so application-wide visual perfection is not claimed.
