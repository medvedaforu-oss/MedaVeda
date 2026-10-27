# Housekeeping and asset inventory — 27 October 2026

All pre-existing work was committed first. The original removed files remain
recoverable from Git history; none was silently discarded before that snapshot.

## Removed after reference checks

Static relative-import resolution and repository text searches found no runtime
callers for these components/helpers:

- `mobile-app/src/components/{AdminCard,FloatingSearchBar,GreetingBanner,Loading,LockCard,PurchaseRow,SimpleListItem}.tsx`
- `mobile-app/src/components/motion/Shimmer.tsx`
- `mobile-app/src/utils/search.ts`

The search-screen comment now points to the actual HomeHeader entry. Also removed
the pre-existing `tatus` pager-help capture and the generated
`docs/audit/evidence/play-403-single-job-20261019/__pycache__/control.cpython-313.pyc`.
The associated Python source and all other investigation evidence remain.

## Retained, with reasons

| Candidate | Reason retained |
| --- | --- |
| `features/auth/ResetPasswordScreen.tsx` | Compatibility re-export of the active reset screen, documented by the existing recovery work. |
| `screens/pdf/PdfViewerScreen.web.tsx` | Metro platform-specific implementation; a static import scan does not establish deadness. |
| `screens/notifications/NotificationPreferencesScreen.tsx` | Unregistered screen candidate; notification preferences themselves are active. Listed for a later product/navigation decision. |
| `types/index.ts`, `types/download.ts` | Exported type/legacy contracts with no direct runtime cost. |
| `screens/payment/indiaAdministrativeAreas.ts` | Payment-related legacy candidate; payment implementation was excluded from this task. |
| Root HTML files and `github-original-website/` | Old duplicate website copies; current deployment docs use `website/`, but independent consumers/hosting were not established. Old root/original reset pages still contain `ayurpulse://` links. Do not deploy them as the current recovery site. |
| Native icon/adaptive icon and other source PNGs | No resizing/re-encoding or native asset-path change without a qualified visual/native artifact comparison. Sizes below are unchanged. |
| Runtime dependencies | No Firebase dependency/import remains. Apparent unused packages such as React DOM/web, Metro runtime, gesture handler and worklets have framework/peer/build roles. No dependency was removed on a text-search inference alone. |

## Branding, free content and historical assumptions

No user-facing “AyurPulse”, Coming Soon, TODO or lorem copy was found in current
mobile screens or `website/` content after cleanup. The old Android-ID rejection
regex, internal npm names, directory name and Expo slug remain intentionally;
renaming an Expo/native identity can affect builds and updates.

The remaining Firebase/Firestore references under mobile source are explanatory
comments and compatibility notes, not active SDK calls. No Firebase/Firestore
package import or dependency was found. They are listed rather than treated as
a reason to remove working Supabase services or timestamp compatibility.

VideoCard now ignores the legacy locked prop and contains no paid-video message
or lock artwork. TestCard already always renders FREE regardless of legacy
locked/free props. Active video/MCQ screens, search ownership, navigation and
the current website describe free videos/MCQs; purchase panels concern Notes.
The old paid-MCQ proposal in `docs/security/review-20261020` is explicitly marked
superseded in its README/report. Original SQL fixtures and historical audit text
remain unchanged as evidence; they are not current product requirements.

## PNG inventory (before = after)

| File under mobile-app/assets | Dimensions | Before bytes | After bytes | Current reference |
| --- | --- | ---: | ---: | --- |
| icon.png | 1254×1254 | 978,337 | 978,337 | App icon and splash plugin image |
| adaptive-icon.png | 1024×1024 | 1,459,751 | 1,459,751 | Android adaptive foreground |
| splash.png | 941×1672 | 1,678,819 | 1,678,819 | Legacy candidate; current splash plugin uses icon.png |
| favicon.png | 1254×1254 | 813,005 | 813,005 | Legacy web candidate; bundling/other consumers need review |
| branding/medveda-header-logo.png | 1200×280 | 91,027 | 91,027 | Active in-app branding |

Oversized assets are reported without claiming an unverified visual equivalence.
No asset optimization saving is claimed. Native binary/device appearance still
needs the owner’s release checklist; JS export does not validate launcher/splash
rendering on Android.
