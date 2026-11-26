# MedVeda study UI polish — 2026-11-23

UI dimensions, spacing and alignment only. Existing uncommitted work was retained. No commit, push, deployment, APK/AAB build, database mutation, dependency installation or backend/configuration edit was performed.

## Exact files changed in this task

Paths are relative to `mobile-app/src/`. Files already modified before this task were edited in place without reverting their existing work.

1. `theme/spacing.ts`
2. `components/SubjectCard.tsx`
3. `components/ChapterCard.tsx`
4. `components/NoteCard.tsx`
5. `components/VideoCard.tsx`
6. `components/TestCard.tsx`
7. `components/OptionCard.tsx`
8. `screens/subjects/SubjectsScreen.tsx`
9. `screens/chapters/ChaptersScreen.tsx`
10. `screens/notes/NotesScreen.tsx`
11. `screens/videos/VideosScreen.tsx`
12. `screens/quiz/TestListScreen.tsx`
13. `screens/quiz/QuizScreen.tsx`
14. `screens/store/StoreScreen.tsx`

Documentation added: `docs/audit/study-ui-polish-20261123.md` (this report).

## Gutters and dimensions

Before values below refer to the working tree inspected at the start of this task, rather than Git HEAD, which predates other uncommitted UI changes.

| Area | Before | After |
| --- | --- | --- |
| Shared screen gutter | 16 dp per side | 12 dp per side |
| Home | 16 dp per side | 12 dp through its existing token |
| Years, Subjects, Chapters, Chapter Details, PDF Notes, Video Lectures, MCQ test list | 16 dp per side | 12 dp through existing STUDY_LAYOUT |
| Question Papers lists and reader toolbar | 16 dp per side | 12 dp through existing tokens |
| MCQ question and result screens | 20 dp per side | 12 dp per side |
| Store | 16 dp per side | 12 dp; existing 16 dp vertical inset and 60 dp top inset retained |
| Shared study layout vertical inset | 15 dp top / 16 dp bottom | 15 dp top / 15 dp bottom |
| Subject minimum height | 68 dp | 64 dp; can grow with text |
| Chapter minimum height | 68 dp | 64 dp; can grow with text |
| Subject vertical padding | 15 dp | 10 dp |
| Note and video vertical padding | 15 dp | 10 dp |
| Test card padding | 20 dp all sides | 15 dp horizontal / 10 dp vertical |
| Note/video/test card spacing | 15 dp | 10 dp |
| Note/video/chapter/test icon-to-title gap | 15 dp | 10 dp |
| Test download control | 40 × 40 dp | 48 × 48 dp |
| MCQ option padding | 18 dp all sides | 15 dp horizontal / 10 dp vertical; minimum height 48 dp |
| MCQ option spacing | 15 dp | 10 dp |
| MCQ question card padding | 20 dp | 15 dp |
| MCQ result card padding | 30 dp | 15 dp |
| Quiz action padding | 16 dp all sides | 10 dp; minimum height 48 dp |
| Subject/chapter list top padding | 15 dp | 10 dp |
| Subject/chapter empty-list top spacing | 50 dp | 30 dp |
| Notes/video/test subtitle bottom spacing | 20 dp | 15 dp |

Equal side gutters, the existing 840 dp reading-width cap, safe-area ownership, navigation headers and bottom navigation are retained. Home horizontal carousels retain their existing scroll configuration and card widths. Only callers already using the shared screen/layout token inherit its narrower gutter; this is not a replacement of every 16 dp value.

## PDF Notes

Subject and chapter cards are more compact. Chapter titles have an explicit flexible text area and space before the arrow. PDF cards use smaller vertical padding and gaps; titles, descriptions and status lines can wrap instead of being truncated. The open area and download/remove action remain separate controls, with wrapping when the row has insufficient space and a 48 dp minimum download-action height. Loading spinners receive a consistent vertical inset. Existing search, ownership, preview, download/remove and unlock actions retain their callbacks and conditions.

The native PDF reader and web iframe already use the full available content area. They were inspected and left intact: no document-rendering, signing, security, caching or reader changes were necessary to widen the lists.

## Video Lectures

The existing icon-based lesson rows now have consistent 10 dp vertical padding and inter-card spacing, a 68 dp minimum height, a smaller icon-to-title gap and an explicitly shrinkable text column. Headers and loading insets match the other study lists.

This implementation opens videos through the existing external-video utility. It has no in-app thumbnail, chapter grouping, progress indicator or player controls to restyle. Those features were not introduced; all video callbacks and opening behavior remain unchanged.

## MCQ Test

Test-list cards use the same compact padding/spacing as video cards. Titles and FREE badges can wrap, and the download action is 48 dp square. Quiz options retain unrestricted text wrapping and now have 48 dp minimum heights. The timer uses a compact wrapping label/value row. Question/result cards and navigation actions use smaller padding, and Previous/Next can wrap with a consistent 10 dp gap and flexible 120 dp bases. Existing quiz and result ScrollViews retain bottom content padding and scroll behavior.

No question loading, answer selection, timer, navigation, submission, scoring or persistence code was changed.

## Validation

- PASS: final `tsc --noEmit` completed with exit 0.
- PASS: all 14 targeted existing regression scripts: notes-entitlement, notes-open, pdf-lifecycle, pdf-remote-retry, download-actions, video-data, video-link, video-tap, quiz-editing, quiz-hooks, quiz-input, accessibility, list-states, question-papers-ui.
- PASS: `git diff --check` on all 14 edited source files.
- PASS: TypeScript AST comparison of those files against HEAD after excluding layout properties, presentation JSX attributes, and the pre-existing shared-layout import. Non-layout code, labels, colours, fonts, radii and animation definitions match. The initial task-source reads and incremental edits were also reviewed because HEAD includes earlier uncommitted spacing work.
- PASS: actual SubjectCard, ChapterCard, NoteCard (free/locked/downloaded/downloading), VideoCard, TestCard, OptionCard through QuizScreen, completed quiz result, PaperCard, EmptyState, ErrorState and LoadError rendered to HTML using installed React Native Web at 100%, 150% and 200% text sizes. Services/navigation and animation execution were stubbed in temporary fixtures; production source was not changed for the fixtures. This checks renderability, not final Android geometry.
- PASS: final `CI=1 ./node_modules/.bin/expo export --platform web --output-dir /tmp/medveda-study-polish-20261123/web-export` completed with exit 0 after the final source edits (2,577 modules, 34 assets, three web bundles). Local export only; no deployment.
- BLOCKED: browser viewport measurements at 320, 360, 393, 412 and 480 dp. The existing local Electron runtime crashed with exit 139 during graphics initialization, including a headless-backend retry. No claim of measured overflow-free layout, screenshots, button collision checks or viewport visual signoff is made.
- BLOCKED: actual Android visual, accessibility font scaling, reader/player, safe-area and footer validation. `adb devices` returned an empty device list. No device or emulator was available.

Existing React Native Web shadow/pointerEvents deprecation warnings and Node colour-environment warnings appeared during rendering/export. They do not indicate a failed regression. No production dependency was changed to address them.

## Functional preservation and remaining signoff

Source comparison and the targeted passing regression scripts support that the existing behavior is preserved. This is not a live-backend, playback, purchase, offline-device or full application functional certification. Android visual signoff and measured responsive geometry remain outstanding; all five requested widths and large Android font settings still require a working browser/device environment. No functionality or visual-identity changes are claimed beyond the layout adjustments listed above.
