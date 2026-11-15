# ANDROID AND FRONTEND AUDIT

Audit date: 2026-11-11 UTC. Scope: current working tree, including pre-existing uncommitted changes. **Audit only; no deployment authorization.**

**Frontend release: FAIL. Android release: BLOCKED. Admin release: FAIL.** Compilation success and local mocks establish useful subsets, not full deployed or device acceptance.

## Fresh build and static checks

| Check | Result | Boundary |
|---|---|---|
| Mobile TypeScript noEmit | PASS | Current working tree copied into isolated snapshot |
| Admin tsc + Vite production build | PASS | Generated snapshot output; no Vercel deployment |
| Admin test script | PASS | PDF/upload/mutation/pagination/diagnostic fixtures |
| Website generator + internal links | PASS | Static output; no live-browser accessibility/SEO certification |
| Expo mobile web export | PASS | AppEntry about 5.1 MB emitted; no measured loading SLA or runtime browser journey |
| All Edge entrypoints + PDF worker Deno check | PASS | Cached dependencies, compile/type checks |
| Deno validation/catalog tests | PASS | 28 passed, 0 failed; mocked external transport |
| Configured ESLint | FAIL | Two duplicate imports in admin; AUD-005 |
| Android Gradle bundleRelease | BLOCKED | Default wrapper cache read-only; temporary Gradle home lacks distribution and network denied before native compilation |
| Device/native instrumentation | BLOCKED | No accepted release build/device/provider fixture |

Exact commands, exit codes and logs are in [test execution](evidence/TEST_EXECUTION.md). Failed commands remain recorded even where later supported-environment reruns passed. Build outputs were generated in /tmp; build tools could also write ignored caches under the shared node_modules. No SDK installation, prebuild regeneration, cloud build or app publication occurred.

## Consumer frontend

`AppNavigator.tsx` uses validated routes/lazy screens, session/course state, maintenance/update gates and recovery navigation. Screens have implemented data repositories, loading/error/empty states; isolated regressions exercise list failure behavior, latest-response wins, timeout/cancellation, owner/context isolation, search, auth submit handling, store catalog, unlock options, purchases and PDF lifecycle. These are test-scoped passes. Complete interactive navigation, every responsive breakpoint, keyboard/screen-reader behavior, browser console and memory profiling were not performed.

Current production app payment provider is explicitly disabled in [mobile-app/eas.json:51](/home/ganeshp8545/AyurPulse/mobile-app/eas.json:51). App config rejects production profile overrides to paid providers; package/runtime checks prevent standard Android from using isolated non-Play checkout. Therefore inaccessible Buy Now in this profile is intentional gating. It is not evidence that purchases have been launched successfully. Existing owned content reads remain separate from permission to begin a new sale.

Notes/PDF uses server-authorized short-lived URLs; native reader refresh/retry/foreground lifecycle is tested through mocks. Actual large/complex PDF render, download interruption, Android process death, screenshot handling, low memory and offline storage recovery need device tests. Offline SQLite is deliberately unsupported on web. Web reader uses browser iframe, with fewer native lifecycle controls; expired signed URLs and account switching need browser acceptance.

Support form opens mailto and requires an installed mail client and final user Send action ([mobile-app/src/screens/contact/ContactScreen.tsx:42](/home/ganeshp8545/AyurPulse/mobile-app/src/screens/contact/ContactScreen.tsx:42)). There is no backend mail delivery service. Videos are free content through authorized URL resolution, not Notes payment entitlements. Quiz questions hide answer keys and score through server submission; offline attempts wait for synchronization/verification rather than inventing a trusted local score.

## Android build / store readiness

Technology is Expo 57.0.32, React Native 0.86.3, React 19.2.3, TypeScript 6.0.x, Hermes/New Architecture. Config retains `in.medveda.app`, MedVeda branding, version 1.2.2 and disabled-payment runtime. Generated Android source exists but is Git-ignored; it is supporting evidence, not a release artifact identity. Local Gradle `release` uses template debug signing. Do not submit a direct local build from that configuration. The EAS remote credential path must be checked on its own; prior reports of remote signing metadata were not reproduced here.

SDK-equipped compilation and final artifact checks remain absent: release dependency resolution, minification/resource shrinking, mapping upload, merged permissions, signing/cert identity, target SDK, supported ABIs, 16 KB native alignment, device smoke and Play versionCode acceptance. The attempted wrapper stopped before compiling. No claim that native source is unbuildable follows from that failure.

The `expo-iap` dependency remains installed even when its config plugin is omitted for disabled production. Billing permission in a final merged artifact does not prove sales enabled. The locally declared retained billing chain and prior native artifacts do not establish the resolved graph of a new release. Google's Billing 7 extension ended November 1, 2026; this release needs supported Billing 8+ and genuine program acceptance. [Current official timeline](https://developer.android.com/google/play/billing/deprecation-faq).

Local Firebase Android config and OTA signing certificate were absent in the inspected source snapshot. Remote file/env credentials may exist elsewhere and are UNKNOWN. Genuine FCM registration/delivery and OTA integrity must be accepted in the intended build. Optional Sentry is enabled only when DSN exists ([mobile-app/src/config/sentry.ts:31](/home/ganeshp8545/AyurPulse/mobile-app/src/config/sentry.ts:31)); a source import does not prove crash delivery/alerting. Existing old AAB artifacts predate this working tree and cannot certify it.

## Admin dashboard

Login/MFA/membership gating and route protection are implemented; content CRUD connects to RLS-controlled Supabase data. Notes use trusted upload plus atomic attachment; large files require quarantine validation worker. Product pricing/publishing, users, orders, referrals/settings/audit, review flags, analytics, notifications and Play diagnostics all have concrete service wiring. Admin helper tests/build pass. Hosted create/edit/upload/readback and mobile propagation were not exercised because they require writes.

Confirmed broken behavior: order menu offers forbidden Paid/Refunded/Pending writes (AUD-004); analytics omits subsequent result pages (AUD-003). CI lint fails (AUD-005). Targeted API notifications violate recipient isolation (AUD-002). Server rejects unauthorized admin financial status escalation correctly; the misleading UI does not imply an authorization bypass.

## Website

The generated website has marketing/course/about/download/FAQ/contact/legal/delete-account guidance and auth recovery/confirmation pages. It is not an implemented website checkout/catalog/library application. Root legacy HTML and generated website duplicates need a documented hosting source; actual Vercel routing/deployment identity is UNKNOWN. Static link/build acceptance does not verify live account confirmation, reset emails, external links, app-store availability, accessibility or visual layout. Those remain acceptance work.
