# Exact P1 file change inventory

Date: 2026-11-11 UTC. Initial baseline captured before editing: 3,375 files and complete Git porcelain-v2 status (including individual untracked files). HEAD was `54c33cbbc0c9c21eaa66f8bf2be285bd2e46e1f8`, main, already dirty. Existing uncommitted/untracked remediation was preserved; HEAD diff alone cannot attribute changes to this task.

**25 pre-existing files modified, 7 implementation/test files added, no pre-existing file deleted. 2,490 earlier docs/release/migration files remain byte-identical.** See [task change hashes](evidence/task-change-inventory.json), [preservation](evidence/preservation.json), [initial hashes](evidence/initial-hashes.json) and initial/final Git status.

| Existing path | Task change |
|---|---|
| `mobile-app/app.config.js` | Validate supplied Firebase client file against resolved Android package. |
| `.github/workflows/ci.yml` | Add P1 Firebase/push/router/catalog/bundle and admin financial UI checks without replacing existing jobs. |
| `mobile-app/scripts/auth-state-race-selftest.cjs` | Extend regression or model new cancellation/logger/deferred Auth hook accurately; retain all original assertions. |
| `mobile-app/scripts/navigation-lazy-selftest.cjs` | Extend regression or model new cancellation/logger/deferred Auth hook accurately; retain all original assertions. |
| `mobile-app/scripts/notification-routing-selftest.cjs` | Extend regression or model new cancellation/logger/deferred Auth hook accurately; retain all original assertions. |
| `mobile-app/scripts/offline-owner-selftest.cjs` | Extend regression or model new cancellation/logger/deferred Auth hook accurately; retain all original assertions. |
| `mobile-app/scripts/notes-billing-choice-selftest.cjs` | Extend regression or model new cancellation/logger/deferred Auth hook accurately; retain all original assertions. |
| `mobile-app/scripts/mv008-ownership-selftest.cjs` | Extend regression or model new cancellation/logger/deferred Auth hook accurately; retain all original assertions. |
| `mobile-app/src/hooks/useNotificationRouting.ts` | Invalidate old account immediately and track user ID through readiness. |
| `mobile-app/src/navigation/AppNavigator.tsx` | Await notification channel then catch optional reminder restoration failure. |
| `mobile-app/src/services/studyReminderService.ts` | Use foreground broadcast/dedup presentation gate. |
| `mobile-app/src/services/authState.ts` | Synchronous push invalidation, deferred session-dependent registration/retry; pin delayed logout to initiating user. |
| `mobile-app/src/services/notificationRouting.ts` | Reject targeted payloads; clear prior-account pending routes; bounded foreground dedup gate. |
| `mobile-app/src/services/pushNotifications.ts` | Owner generation, pinned bearer/serialized writes, logout cancellation, native token refresh, foreground retry, channel ordering. |
| `mobile-app/src/services/playBillingService.ts` | Recheck account after attempt persistence/read and constrain initiating order user. |
| `mobile-app/src/screens/payment/OrderSummaryScreen.tsx` | Pin alternative choice/token/order/navigation to initiating account. |
| `supabase/functions/send-push-notification/index.ts` | Count accepted tickets, diagnose rejection, remove explicit dead tokens, stop send on feed insert error; P0 targeting guard retained. |
| `admin-panel/src/components/OrderFilter.tsx` | Represent created/pending/cancelled distinctly. |
| `admin-panel/src/components/OrdersTable.tsx` | Expose only unpaid fail/cancel; provider status read-only; accessible action label. |
| `admin-panel/src/components/RouteErrorBoundary.tsx` | Consolidate duplicate React imports for CI lint. |
| `admin-panel/src/hooks/useDashboard.ts` | Consolidate duplicate dashboard-service imports for CI lint. |
| `admin-panel/src/pages/Notifications.tsx` | Report accepted/rejected tickets, not device delivery. |
| `admin-panel/src/services/analyticsService.ts` | Read every order page with stable ID ordering and deterministic top-product ties. |
| `admin-panel/src/services/orderService.ts` | Reject unsupported client status actions before RPC; server authorization unchanged. |
| `admin-panel/src/types/order.ts` | Include existing pending/cancelled server states. |

| New implementation/test path | Purpose |
|---|---|
| `mobile-app/scripts/push-lifecycle-selftest.cjs` | Synthetic registration/logout/refresh/foreground/account race coverage. |
| `mobile-app/scripts/firebase-config.cjs` | Firebase client input validator, no generated credentials. |
| `mobile-app/scripts/firebase-config-selftest.cjs` | Missing/malformed/package/project/app-ID/EAS path fixtures. |
| `mobile-app/scripts/play-catalog-contract-selftest.cjs` | SKU/INR/standard-offer/price/enrollment/native-unavailable fixtures. |
| `mobile-app/scripts/notification-account-hook-selftest.cjs` | Real routing hook account transition/readiness regression. |
| `admin-panel/scripts/p1-financial-ui-selftest.cjs` | Actual analytics pagination and order action constraints. |
| `supabase/tests/p1-push-delivery-selftest.cjs` | Actual send handler ticket/error/dead-token/persistence fixtures. |

All other new artifacts are inside this unique P1 audit directory: fourteen requested Markdown deliverables; initial/final hashes and Git state; exact source archive/inventory/dependency/production config inputs; reproducible local runners; before/failure/final logs and JSON results; preservation and final artifact manifest. `evidence/final-artifact-manifest.json` hashes every new audit artifact except itself to avoid a recursive self-hash. Some logs/archive files are Git-ignored; retain the complete directory.

The source tar includes 322 reviewed mobile source/config/test/asset files. `evidence/source-package.json` pins its SHA-256; each member is verified against current source and `mobile-source-inventory.json`. The seven new files and modified existing files were not silently committed/staged/reset. No package version, dependency lock, EAS profile, catalog, migration, settlement/reporting helper or frozen backend release source was changed by P1 (the working tree already contained earlier changes to some of those files).

Workspace send-push-notification now differs from its frozen P0 archive because of P1 ticket handling. The archive remains unchanged and retains its P0 targeting rejection. Any future backend delivery requires a new separately named/pinned/reviewed closure; do not deploy the workspace wholesale or rewrite the P0 manifest.

Temporary work is limited to synthetic /tmp PostgreSQL, local web exports and short preparation scripts. No genuine Firebase/FCM/service-account/signing input was collected; no production/staging record/settings/worker/backend changed. No P2 work or destructive Git command occurred.
