# Home hierarchy and centered web frame

2026-11-22. Visual/layout changes only; no dependencies, commits or pushes.

## Changes

- `mobile-app/App.tsx` wraps all existing root content in `AppFrame`. Native `AppFrame.tsx` is a fragment, preserving the existing native view hierarchy. `AppFrame.web.tsx` adds the only web frame rule: above 560px, 480px maximum width, centered, with the theme background outside it. Tokens: `SIZE.appMax`, `SIZE.wideWeb`. Headers, navigation content, auth and bottom tabs inherit the frame.
- RN Web Modal portals attach to document.body. The same root stylesheet constrains their fixed `aria-modal` viewport, including nested dialogs, without individual modal/screen edits. Narrow web retains full width.
- Profile: subtle accent avatar fill, stronger name, existing course/year secondary line, quiet positive streak inline after it loads. No completion ring: the existing percentage prop represents quiz score, not learning completion.
- Continue learning: elevated surface, 12px radius/padding, small accent play icon, real chapter title and existing subject/year context. Hidden without a recent chapter. No progress bar: recent activity has no completion data. Its loading placeholder matches the new default height.
- Academic years: existing ListRow and IconTile, neutral 40px ordinal tiles, existing chevron, 60px minimum rows, quiet “Academic years” label. No subject counts: the Year data has none. Actual year titles, IDs and actions are preserved. Labels wrap as needed.
- Home retains 16px horizontal padding and 24px section gaps. No filler, emojis, gradients or glows added.

## Verification

Passed on final source:

- Strict TypeScript: `cd mobile-app && ./node_modules/.bin/tsc --noEmit --strict` (exit 0; sandbox emitted an incidental user-bus warning).
- Changed-file ESLint: `./tooling/node_modules/.bin/eslint` over App.tsx, both AppFrame files, StudentProfileCard, ContinueLearningCard, HomeScreen and theme/layout (exit 0).
- Relevant existing selftests: ui-foundation, accessibility, list-states, question-papers-ui, question-papers-step2, question-papers-web-preview, navigation-lazy, audit-icon-controls. The first seven ran from mobile-app; audit-icon-controls ran from the repository root. Sandbox spawning initially hit EPERM; authorized rerun passed. An initial icon-controls invocation used the wrong cwd; the root invocation passed.
- Web export: `cd mobile-app && EXPO_OFFLINE=1 ./node_modules/.bin/expo export --platform web --max-workers 2 --output-dir /tmp/medveda-home-fix-web-final` (exit 0, 2,524 modules).
- Baseline comparison: Home imports, hooks, loaders, effects, refresh and chapter-navigation callback bodies are byte-identical to `/tmp/medveda-home-fix-before/mobile-app/src/screens/home/HomeScreen.tsx`. Existing dirty-checkout work preserved.
- Final diff whitespace check passed.

## Screen re-checks

Static review confirmed Question Papers, Home, Profile, auth and navigation headers sit below the root frame; tabs use flex sizing. The drawer is capped at 300px and confirmation dialogs at 380px, fitting the 480px modal viewport. This is source review, not rendered verification. No local browser was available and localhost:8081 was not listening; no screenshots, live authenticated states or native device checks are claimed.

Re-check at 1920px (expected centered 480px frame), 561px, 560px and 360px, plus long text/large font sizes:

- Home: header, profile/streak, with/without recent chapter, years and all bottom tabs.
- Question Papers: years, subjects, sessions and web PDF preview; header/back and final list actions.
- Profile/Edit Profile; Notes/Store, Purchases and Downloads tabs; nested screens and scroll clearance.
- Login, Register, Forgot/Reset Password, splash and course/year selection; keyboard and form scrolling.
- Drawer and nested logout confirmation; other confirmations and filter sheets; backdrop dismissal and Escape, including resizing while open.
- Maintenance/update gates and existing checkout/reader overlays for visual containment only.
- Android/iOS smoke check: root layout should retain its existing behavior because the native wrapper adds no view.
