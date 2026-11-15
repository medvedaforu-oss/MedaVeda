# MedVeda fix 3 — 14 November 2026

RELEASE_MODE = **free-only**. This is a working-tree source/local-database report, not a deployed or installed-binary certification. **Two findings remain BLOCKED:** MOB-02 paid offline plaintext/policy enforcement and CFG-02 dependency advisories. Design and external qualification gates remain explicit. No commits, pushes, deployment, production writes, provider requests, cron activation, real messages or real account deletions occurred.

Safety copies: [tracked pre-work patch](fix-3/pre-work.patch) and [pre-work status](fix-3/pre-work-status.txt). Preserve these locally; review before staging because they contain owner-authored work. They are not a complete backup of untracked files. Temporary private snapshots were lost across interruptions; durable evidence remains.

Ownership and execution: [docs/audit/fix-3/WORKFLOW.md](fix-3/WORKFLOW.md). Child agents had no execution tools: independent contracts/semantic review were supplied, while root executed source/test operations. This limitation and rejected corrections are recorded in [docs/audit/fix-3/reviews/independent-review.md](fix-3/reviews/independent-review.md). No independent full-file source-execution certification is claimed.

## Summary table

Files include both new fix-3 deltas and earlier owner/uncommitted fixes reverified here; per-finding text distinguishes them. DESIGN ONLY rows link analysis, not fabricated test logs.

ID | status | files changed / reverified | before-log | after-log
---|---|---|---|---
| BACK-01 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql` | [before / analysis](fix-3/baseline-sql-final.log) | [after / analysis](fix-3/final-sql.log) |
| BACK-02 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/functions/razorpay-webhook/index.ts`<br>`supabase/functions/_shared/settle.ts` | [before / analysis](fix-3/before/BACK-02.log) | [after / analysis](fix-3/after/BACK-02.log) |
| BACK-03 | DESIGN ONLY | `docs/audit/fix-3/backend-runbook.md` | [before / analysis](fix-3/backend-runbook.md) | [after / analysis](fix-3/backend-runbook.md) |
| BACK-04 | DESIGN ONLY | `docs/audit/fix-3/backend-runbook.md` | [before / analysis](fix-3/backend-runbook.md) | [after / analysis](fix-3/backend-runbook.md) |
| BACK-05 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/functions/send-push-notification/index.ts` | [before / analysis](fix-3/before/BACK-05.log) | [after / analysis](fix-3/after/BACK-05.log) |
| BACK-06 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/functions/send-push-notification/index.ts`<br>`docs/audit/fix-3/backend-runbook.md` | [before / analysis](fix-3/before/BACK-06.log) | [after / analysis](fix-3/after/BACK-06.log) |
| BACK-07 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/functions/create-play-order/index.ts`<br>`supabase/functions/verify-play-purchase/index.ts` | [before / analysis](fix-3/before/BACK-07.log) | [after / analysis](fix-3/after/BACK-07.log) |
| BACK-08 | DESIGN ONLY | `docs/audit/fix-3/retention-runbook.sql` | [before / analysis](fix-3/retention-runbook.sql) | [after / analysis](fix-3/retention-runbook.sql) |
| BACK-09 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/functions/_shared/paymentQueueFix3.ts`<br>`supabase/functions/report-external-transaction/index.fix3.ts` | [before / analysis](fix-3/before/BACK-09.log) | [after / analysis](fix-3/after/BACK-09.log) |
| BACK-10 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/migrations/20261114040000_fix3_content_push_and_delete_guards.sql` | [before / analysis](fix-3/before/BACK-10.log) | [after / analysis](fix-3/after/BACK-10.log) |
| BACK-11 | DESIGN ONLY | `docs/audit/fix-3/wallet-expiry-design.md` | [before / analysis](fix-3/wallet-expiry-design.md) | [after / analysis](fix-3/wallet-expiry-design.md) |
| BACK-12 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/migrations/20261114040100_fix3_flag_resolution_row_count.sql` | [before / analysis](fix-3/before/BACK-12.log) | [after / analysis](fix-3/after/BACK-12.log) |
| BACK-13 | DESIGN ONLY | `docs/audit/fix-3/wallet-expiry-design.md` | [before / analysis](fix-3/wallet-expiry-design.md) | [after / analysis](fix-3/wallet-expiry-design.md) |
| BACK-14 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/checks/ucb_postdeploy_checks.fix3.sql` | [before / analysis](fix-3/before/BACK-14.log) | [after / analysis](fix-3/after/BACK-14.log) |
| BACK-15 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/migrations/20261114040000_fix3_content_push_and_delete_guards.sql` | [before / analysis](fix-3/before/BACK-15.log) | [after / analysis](fix-3/after/BACK-15.log) |
| BACK-16 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/functions/verify-payment/index.ts` | [before / analysis](fix-3/before/BACK-16.log) | [after / analysis](fix-3/after/BACK-16.log) |
| BACK-17 | FIXED - DEVICE/STAGING TEST PENDING | `supabase/migrations/20261114040000_fix3_content_push_and_delete_guards.sql` | [before / analysis](fix-3/before/BACK-17.log) | [after / analysis](fix-3/after/BACK-17.log) |
| MOB-01 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/navigation/AppNavigator.tsx` | [before / analysis](fix-3/before/MOB-01.log) | [after / analysis](fix-3/after/MOB-01.log) |
| MOB-02 | BLOCKED | `mobile-app/src/utils/downloadManager.ts`<br>`mobile-app/src/services/secureNotesService.ts`<br>`mobile-app/src/services/offlineNoteAccess.ts` | [before / analysis](fix-3/before/MOB-02.log) | [after / analysis](fix-3/after/MOB-02-unresolved.log) |
| MOB-03 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/config/paymentProvider.ts` | [before / analysis](fix-3/before/MOB-03.log) | [after / analysis](fix-3/after/MOB-03.log) |
| MOB-04 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/services/playBillingService.ts`<br>`mobile-app/src/screens/payment/OrderSummaryScreen.tsx` | [before / analysis](fix-3/before/MOB-04.log) | [after / analysis](fix-3/after/MOB-04.log) |
| MOB-05 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/App.tsx` | [before / analysis](fix-3/before/MOB-05.log) | [after / analysis](fix-3/after/MOB-05.log) |
| MOB-06 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/screens/auth/ResetPasswordScreen.tsx`<br>`mobile-app/src/features/auth/deepLinkStore.ts`<br>`mobile-app/src/features/auth/recoveryFlow.js`<br>`mobile-app/src/features/auth/recoveryFlow.d.ts` | [before / analysis](fix-3/before/MOB-06.log) | [after / analysis](fix-3/after/MOB-06.log) |
| MOB-07 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/app.config.js`<br>`mobile-app/src/navigation/AppNavigator.tsx`<br>`mobile-app/src/features/auth/deepLinkStore.ts`<br>`docs/audit/fix-3/mobile-designs.md` | [before / analysis](fix-3/before/MOB-07.log) | [after / analysis](fix-3/after/MOB-07.log) |
| MOB-08 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/services/studyReminderService.ts`<br>`docs/audit/fix-3/mobile-designs.md` | [before / analysis](fix-3/before/MOB-08.log) | [after / analysis](fix-3/after/MOB-08.log) |
| MOB-09 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/services/quizAttempts.ts`<br>`mobile-app/src/services/syncEngine.ts` | [before / analysis](fix-3/before/MOB-09.log) | [after / analysis](fix-3/after/MOB-09.log) |
| MOB-10 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/services/pushNotifications.ts`<br>`mobile-app/src/services/authState.ts` | [before / analysis](fix-3/before/MOB-10.log) | [after / analysis](fix-3/after/MOB-10.log) |
| MOB-11 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/utils/downloadManager.ts` | [before / analysis](fix-3/before/MOB-11.log) | [after / analysis](fix-3/after/MOB-11.log) |
| MOB-12 | DESIGN ONLY | `mobile-app/src/config/secureSessionStorage.ts`<br>`docs/audit/fix-3/mobile-designs.md` | [before / analysis](fix-3/mobile-designs.md) | [after / analysis](fix-3/mobile-designs.md) |
| MOB-13 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/services/authState.ts`<br>`mobile-app/src/utils/downloadManager.ts` | [before / analysis](fix-3/before/MOB-13.log) | [after / analysis](fix-3/after/MOB-13.log) |
| MOB-14 | DESIGN ONLY | `mobile-app/src/services/syncEngine.ts`<br>`docs/audit/fix-3/mobile-designs.md` | [before / analysis](fix-3/before/MOB-14.log) | [after / analysis](fix-3/after/MOB-14.log) |
| MOB-15 | FIXED - VERIFIED (automated) | `mobile-app/src/services/searchService.ts`<br>`mobile-app/src/hooks/useGlobalSearch.ts`<br>`mobile-app/src/components/search/SearchResultRow.tsx` | [before / analysis](fix-3/before/MOB-15.log) | [after / analysis](fix-3/after/MOB-15.log) |
| MOB-16 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/components/ProgressRing.tsx` | [before / analysis](fix-3/before/MOB-16.log) | [after / analysis](fix-3/after/MOB-16.log) |
| MOB-17 | FIXED - VERIFIED (automated) | `mobile-app/src/hooks/useQuizStats.ts` | [before / analysis](fix-3/before/MOB-17-bound.log) | [after / analysis](fix-3/after/MOB-17-bound.log) |
| MOB-18 | FIXED - VERIFIED (automated) | `mobile-app/src/screens/payment/OrderSummaryScreen.tsx` | [before / analysis](fix-3/before/MOB-18.log) | [after / analysis](fix-3/after/MOB-18.log) |
| MOB-19 | FIXED - VERIFIED (automated) | `mobile-app/src/hooks/useNetworkStatus.ts` | [before / analysis](fix-3/before/MOB-19.log) | [after / analysis](fix-3/after/MOB-19.log) |
| MOB-20 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/src/screens/auth/ResetPasswordScreen.tsx` | [before / analysis](fix-3/before/MOB-20.log) | [after / analysis](fix-3/after/MOB-20.log) |
| ADM-01 | FIXED - VERIFIED (automated) | `admin-panel/src/components/ProductFormModal.tsx`<br>`admin-panel/src/services/productService.ts`<br>`admin-panel/src/types/product.ts` | [before / analysis](fix-3/before/ADM-01.log) | [after / analysis](fix-3/after/ADM-01.log) |
| ADM-02 | FIXED - VERIFIED (automated) | `admin-panel/src/components/CourseFormModal.tsx`<br>`admin-panel/src/components/YearFormModal.tsx`<br>`admin-panel/src/components/SubjectFormModal.tsx`<br>`admin-panel/src/components/ChapterFormModal.tsx` | [before / analysis](fix-3/before/ADM-02.log) | [after / analysis](fix-3/after/ADM-02.log) |
| ADM-03 | DESIGN ONLY | `admin-panel/src/pages/Notifications.tsx`<br>`admin-panel/src/services/notificationService.ts` | [before / analysis](fix-3/before/ADM-03.log) | [after / analysis](fix-3/after/ADM-03.log) |
| ADM-04 | FIXED - VERIFIED (automated) | `admin-panel/src/services/playBillingSyncService.ts` | [before / analysis](fix-3/before/ADM-04.log) | [after / analysis](fix-3/after/ADM-04.log) |
| ADM-05 | FIXED - VERIFIED (automated) | `admin-panel/src/hooks/useNotes.ts`<br>`admin-panel/src/hooks/useVideos.ts`<br>`admin-panel/src/hooks/useQuiz.ts`<br>`admin-panel/src/pages/Notes.tsx` | [before / analysis](fix-3/before/ADM-05.log) | [after / analysis](fix-3/after/ADM-05.log) |
| ADM-06 | FIXED - DEVICE/STAGING TEST PENDING | `admin-panel/src/pages/Referrals.tsx`<br>`admin-panel/src/pages/ReviewFlags.tsx`<br>`admin-panel/src/pages/Dashboard.tsx` | [before / analysis](fix-3/before/ADM-06.log) | [after / analysis](fix-3/after/ADM-06.log) |
| ADM-07 | FIXED - VERIFIED (automated) | `admin-panel/src/hooks/useReferrals.ts`<br>`admin-panel/src/pages/Referrals.tsx` | [before / analysis](fix-3/before/ADM-07.log) | [after / analysis](fix-3/after/ADM-07.log) |
| ADM-08 | DESIGN ONLY | `admin-panel/src/utils/filters.ts` | [before / analysis](fix-3/before/ADM-08.log) | [after / analysis](fix-3/after/ADM-08.log) |
| ADM-09 | FIXED - VERIFIED (automated) | `admin-panel/src/services/referralService.ts` | [before / analysis](fix-3/before/ADM-09.log) | [after / analysis](fix-3/after/ADM-09.log) |
| WEB-01 | FIXED - VERIFIED (automated) | `reset-password.html`<br>`github-original-website/reset-password.html` | [before / analysis](fix-3/before/WEB-01.log) | [after / analysis](fix-3/after/WEB-01.log) |
| WEB-02 | FIXED - DEVICE/STAGING TEST PENDING | `reset-password.html`<br>`github-original-website/reset-password.html` | [before / analysis](fix-3/before/WEB-02.log) | [after / analysis](fix-3/after/WEB-02.log) |
| WEB-03 | FIXED - VERIFIED (automated) | `website/_src/pages/index.html`<br>`website/_src/pages/download.html`<br>`website/_src/pages/features.html`<br>`website/_src/pages/how-it-works.html`<br>`website/_src/faq.mjs`<br>`website/assets/js/recovery-flow.js`<br>`website/index.html`<br>`website/download.html`<br>`website/features.html`<br>`website/how-it-works.html`<br>`website/faq.html` | [before / analysis](fix-3/before/WEB-03.log) | [after / analysis](fix-3/after/WEB-03.log) |
| WEB-04 | FIXED - VERIFIED (automated) | `privacy.html`<br>`refunds.html`<br>`terms.html`<br>`index.html`<br>`github-original-website/privacy.html`<br>`github-original-website/refunds.html`<br>`github-original-website/terms.html`<br>`github-original-website/index.html` | [before / analysis](fix-3/before/WEB-04.log) | [after / analysis](fix-3/after/WEB-04.log) |
| CFG-01 | FIXED - DEVICE/STAGING TEST PENDING | `mobile-app/package.json`<br>`mobile-app/package-lock.json` | [before / analysis](fix-3/baseline-expo-doctor-direct.log) | [after / analysis](fix-3/final-expo-doctor.log) |
| CFG-02 | BLOCKED | `mobile-app/package.json`<br>`mobile-app/package-lock.json`<br>`tooling/package.json`<br>`tooling/package-lock.json` | [before / analysis](mobile-fix-2/after/CFG-02.log) | [after / analysis](fix-3/final-mobile-app-npm-audit.log) |
| QA-01 | FIXED - VERIFIED (automated) | `supabase/tests/fix3-run-all.sh`<br>`supabase/tests/fix3-audit-batch1-local.py`<br>`supabase/tests/fix3-account_deletion_checks.sql` | [before / analysis](fix-3/baseline-sql-final.log) | [after / analysis](fix-3/final-sql.log) |

## Per finding: root cause, change, proof and residual risk

### BACK-01 — FIXED - DEVICE/STAGING TEST PENDING

Pending 20261112104610 already couples reverse_payment and paid-PDF disposition. No duplicate migration. Local current-schema replay/refund tests; no deployment.

Evidence: [before / analysis](fix-3/baseline-sql-final.log); [after / analysis](fix-3/final-sql.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-02 — FIXED - DEVICE/STAGING TEST PENDING

Canonical webhook/helper already persist verified inbox before acting, reject conflicting hashes and retry unknown reversal/capture evidence except proven terminal disposition. Existing source reverified; deployed gap remains.

Evidence: [before / analysis](fix-3/before/BACK-02.log); [after / analysis](fix-3/after/BACK-02.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-03 — DESIGN ONLY

Recovery jobs remain disabled/missing in earlier live metadata. Complete future sequence and monitoring prepared; no schedule enabled.

Evidence: [before / analysis](fix-3/backend-runbook.md); [after / analysis](fix-3/backend-runbook.md). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-04 — DESIGN ONLY

Missing deployed UCB choice/attach/report routes require qualification as one revision. Complete route/JWT/cron runbook only; purchases remain disabled.

Evidence: [before / analysis](fix-3/backend-runbook.md); [after / analysis](fix-3/backend-runbook.md). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-05 — FIXED - DEVICE/STAGING TEST PENDING

Canonical source rejects every present targetUserIds value before broadcast persistence/token reads. Synthetic tests confirm no targeted text inserted. Deployment not performed.

Evidence: [before / analysis](fix-3/before/BACK-05.log); [after / analysis](fix-3/after/BACK-05.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-06 — FIXED - DEVICE/STAGING TEST PENDING

Canonical push handler already verifies same-token admin/AAL and fails closed on missing/error/invalid MFA policy. Runbook: deploy guards, enroll every admin, owner approves flag. No flag changed.

Evidence: [before / analysis](fix-3/before/BACK-06.log); [after / analysis](fix-3/after/BACK-06.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-07 — FIXED - DEVICE/STAGING TEST PENDING

Both canonical Play handlers already return 400 for null/array/primitive/malformed JSON before rate-limit/order/provider work. Local handler tests pass; deployment pending.

Evidence: [before / analysis](fix-3/before/BACK-07.log); [after / analysis](fix-3/after/BACK-07.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-08 — DESIGN ONLY

Retention purge exists but scheduler is an owner gate. Fully commented reviewed schedule/rollback and cutoff tests prepared; nothing scheduled or purged.

Evidence: [before / analysis](fix-3/retention-runbook.sql); [after / analysis](fix-3/retention-runbook.sql). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-09 — FIXED - DEVICE/STAGING TEST PENDING

New-file candidate supplies invocation deadline/remaining-start-budget checks to queue and void loops. Deferred leased jobs are never marked successful. Unit/Deno checks pass. In-flight calls are not forcibly cancelled; worst-case provider paths need staging qualification. Canonical backend files unchanged.

Evidence: [before / analysis](fix-3/before/BACK-09.log); [after / analysis](fix-3/after/BACK-09.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-10 — FIXED - DEVICE/STAGING TEST PENDING

New migration puts a nonblocked-profile gate outside both student branches of has_content_access; admin branch preserved. Explicit blocked=true denied, null remains unblocked as before. Normal/blocked own-course and purchase/admin SQL assertions pass.

Evidence: [before / analysis](fix-3/before/BACK-10.log); [after / analysis](fix-3/after/BACK-10.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-11 — DESIGN ONLY

No positive expiry configured in repository migrations/seed. Live settings not queried. Per-credit allocation/replay design retained; do not enable expiry until balance/trigger/pricing share allocation authority. No immutable ledger edits.

Evidence: [before / analysis](fix-3/wallet-expiry-design.md); [after / analysis](fix-3/wallet-expiry-design.md). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-12 — FIXED - DEVICE/STAGING TEST PENDING

New migration captures UPDATE ROW_COUNT immediately, before set_config. One resolve succeeds; missing/repeated flag fails. Auth/admin rule preserved.

Evidence: [before / analysis](fix-3/before/BACK-12.log); [after / analysis](fix-3/after/BACK-12.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-13 — DESIGN ONLY

Expiry not configured by repository seed/migrations; live policy unknown. Actual-availability/duration snapshot and hold/replay policy documented without editing historical timestamps.

Evidence: [before / analysis](fix-3/wallet-expiry-design.md); [after / analysis](fix-3/wallet-expiry-design.md). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-14 — FIXED - DEVICE/STAGING TEST PENDING

New-file readiness SQL recognizes generated notes_price_revision SKUs only with active, ready, freshly verified INR/India evidence. Same synthetic predicate rejects old script and passes candidate. Does not prove provider readiness.

Evidence: [before / analysis](fix-3/before/BACK-14.log); [after / analysis](fix-3/after/BACK-14.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-15 — FIXED - DEVICE/STAGING TEST PENDING

New migration serializes per target user, evicts deterministic oldest before inserting, preserves refresh and direct cap. Authenticated 11th/refresh/direct-cap and two actual concurrent RPC sessions pass. Privileged direct-update lock ordering remains staging check.

Evidence: [before / analysis](fix-3/before/BACK-15.log); [after / analysis](fix-3/after/BACK-15.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-16 — FIXED - DEVICE/STAGING TEST PENDING

Existing recovery handler verifies JWT and owned order; wrong owner/missing have identical responses; signed callback HMAC precedes lookup. Synthetic current-source tests pass; deployed acceptance pending.

Evidence: [before / analysis](fix-3/before/BACK-16.log); [after / analysis](fix-3/after/BACK-16.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### BACK-17 — FIXED - DEVICE/STAGING TEST PENDING

Current mobile source has no delete_my_account RPC call; it invokes delete-account Edge route. New migration revokes PUBLIC/anon/authenticated EXECUTE without deleting anyone. Local effective privilege assertions pass. Older external client compatibility needs owner confirmation before rollout.

Evidence: [before / analysis](fix-3/before/BACK-17.log); [after / analysis](fix-3/after/BACK-17.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-01 — FIXED - DEVICE/STAGING TEST PENDING

Stable recovery navigation group survives session import; existing fix reverified. Mounted native flows pending.

Evidence: [before / analysis](fix-3/before/MOB-01.log); [after / analysis](fix-3/after/MOB-01.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-02 — BLOCKED

Paid historical owners can still persist plaintext PDFs. Attempted offline-purpose guard failed broad resume verification twice (redundant URL issuance; revoked-resume error propagation). Owner two-failure cap applied; only session guard changes reverted. Final unresolved test remains red. Free-only paid-note offline policy is NOT enforced. This is a release blocker.

Evidence: [before / analysis](fix-3/before/MOB-02.log); [after / analysis](fix-3/after/MOB-02-unresolved.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-03 — FIXED - DEVICE/STAGING TEST PENDING

Historical restore remains independent of disabled new sales; existing provider guards reverified. Provider/device acceptance pending.

Evidence: [before / analysis](fix-3/before/MOB-03.log); [after / analysis](fix-3/after/MOB-03.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-04 — FIXED - DEVICE/STAGING TEST PENDING

Existing 30-second uncertain-outcome and owner-lifetime safeguards reverified; lost/late native callbacks pending.

Evidence: [before / analysis](fix-3/before/MOB-04.log); [after / analysis](fix-3/after/MOB-04.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-05 — FIXED - DEVICE/STAGING TEST PENDING

Gesture root encloses app; existing source regression passes; installed swipe acceptance pending.

Evidence: [before / analysis](fix-3/before/MOB-05.log); [after / analysis](fix-3/after/MOB-05.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-06 — FIXED - DEVICE/STAGING TEST PENDING

Fresh recovery controller revisions and stale-continuation fencing reverified; real mounted recovery pending.

Evidence: [before / analysis](fix-3/before/MOB-06.log); [after / analysis](fix-3/after/MOB-06.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-07 — FIXED - DEVICE/STAGING TEST PENDING

Existing build-specific scheme consistency reverified; exact hosted bridge and Auth allowlist steps documented but not performed.

Evidence: [before / analysis](fix-3/before/MOB-07.log); [after / analysis](fix-3/after/MOB-07.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-08 — FIXED - DEVICE/STAGING TEST PENDING

Foreground category muting reverified; background server preference contract documented as design only.

Evidence: [before / analysis](fix-3/before/MOB-08.log); [after / analysis](fix-3/after/MOB-08.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-09 — FIXED - DEVICE/STAGING TEST PENDING

Existing local result/outbox transaction reverified; actual SQLite crash/rollback acceptance pending.

Evidence: [before / analysis](fix-3/before/MOB-09.log); [after / analysis](fix-3/after/MOB-09.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-10 — FIXED - DEVICE/STAGING TEST PENDING

Existing failed-signout push-suppression rollback and owner epoch fencing reverified; device token behavior pending.

Evidence: [before / analysis](fix-3/before/MOB-10.log); [after / analysis](fix-3/after/MOB-10.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-11 — FIXED - DEVICE/STAGING TEST PENDING

Existing serialized pause/cancel, owned-path validation and cleanup retry reverified; native file measurements pending.

Evidence: [before / analysis](fix-3/before/MOB-11.log); [after / analysis](fix-3/after/MOB-11.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-12 — DESIGN ONLY

SDK57 native AES-GCM candidate, strict v3 envelope/AAD/publication and authenticated legacy/v2 migration documented. No crypto dependency/code added.

Evidence: [before / analysis](fix-3/mobile-designs.md); [after / analysis](fix-3/mobile-designs.md). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-13 — FIXED - DEVICE/STAGING TEST PENDING

Existing serialized offline-owner/epoch fencing reverified. Real account-switch file admission pending.

Evidence: [before / analysis](fix-3/before/MOB-13.log); [after / analysis](fix-3/after/MOB-13.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-14 — DESIGN ONLY

No server progress/watch-history table or agreed progress/reset/revision contract exists in migrations. Keep client dispatch disabled and rows retained; monotonic owner-bound RPC migration/test contract documented. No fabricated executable schema.

Evidence: [before / analysis](fix-3/before/MOB-14.log); [after / analysis](fix-3/after/MOB-14.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-15 — FIXED - VERIFIED (automated)

Existing preview/free and completed-download badge logic reverified; no new source change.

Evidence: [before / analysis](fix-3/before/MOB-15.log); [after / analysis](fix-3/after/MOB-15.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-16 — FIXED - DEVICE/STAGING TEST PENDING

Existing continuous percentage ring geometry reverified; native raster/animation pending.

Evidence: [before / analysis](fix-3/before/MOB-16.log); [after / analysis](fix-3/after/MOB-16.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-17 — FIXED - VERIFIED (automated)

New explicit 5,000-attempt bound stops large history before page scan. Exact totals preserved within bound; over-bound returns error, never capped lifetime totals. Existing lifecycle/601-row tests and new bound test pass. Server aggregate remains design only.

Evidence: [before / analysis](fix-3/before/MOB-17-bound.log); [after / analysis](fix-3/after/MOB-17-bound.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-18 — FIXED - VERIFIED (automated)

Existing already-owned My Purchases action reverified without weakening disabled-sales guards.

Evidence: [before / analysis](fix-3/before/MOB-18.log); [after / analysis](fix-3/after/MOB-18.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-19 — FIXED - VERIFIED (automated)

Existing unknown reachability handling reverified; explicit offline still offline.

Evidence: [before / analysis](fix-3/before/MOB-19.log); [after / analysis](fix-3/after/MOB-19.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### MOB-20 — FIXED - DEVICE/STAGING TEST PENDING

Existing keyboard-safe recovery scroll/support-link fallback reverified; small-device/large-text acceptance pending.

Evidence: [before / analysis](fix-3/before/MOB-20.log); [after / analysis](fix-3/after/MOB-20.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### ADM-01 — FIXED - VERIFIED (automated)

Blank/zero MRP sentinel serializes null rather than omitted undefined; omitted unrelated fields remain omitted. Real service payload tests pass.

Evidence: [before / analysis](fix-3/before/ADM-01.log); [after / analysis](fix-3/after/ADM-01.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### ADM-02 — FIXED - VERIFIED (automated)

Synchronous save refs and Modal close guard in all four forms; editor lifetime guards stale results; mounted guard clears saving after prop replacement. Real duplicate-submit/close tests pass. Initial Year fixture missing icon corrected and original-snapshot Course red evidence retained.

Evidence: [before / analysis](fix-3/before/ADM-02.log); [after / analysis](fix-3/after/ADM-02.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### ADM-03 — DESIGN ONLY

Client synchronous send guard and request UUID retained across ambiguous retry; preparation errors release guard; unknown dispatch outcome requires explicit feed reconciliation/duplicate warning. Server uniqueness/delivery idempotency is DESIGN ONLY and remains unresolved.

Evidence: [before / analysis](fix-3/before/ADM-03.log); [after / analysis](fix-3/after/ADM-03.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### ADM-04 — FIXED - VERIFIED (automated)

Billing-status view paginated by unique product_id; actual service fixture returns all 1,001 rows rather than capped 500.

Evidence: [before / analysis](fix-3/before/ADM-04.log); [after / analysis](fix-3/after/ADM-04.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### ADM-05 — FIXED - VERIFIED (automated)

Ordinary Retry uses load-specific errors; explicit successful mutation refresh retains truthful success/failure wording; upload uses refreshAfterMutation.

Evidence: [before / analysis](fix-3/before/ADM-05.log); [after / analysis](fix-3/after/ADM-05.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### ADM-06 — FIXED - DEVICE/STAGING TEST PENDING

Retry actions added for referral/review/dashboard errors; review empty state suppressed on error. UI-source checks plus compiler/lint; full browser interaction pending.

Evidence: [before / analysis](fix-3/before/ADM-06.log); [after / analysis](fix-3/after/ADM-06.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### ADM-07 — FIXED - VERIFIED (automated)

Settings bootstrap/save request guard separated from status list reload; pre-save invalidation, dirty revision and confirmed payload snapshot preserve edits. Hook filter test passes; browser deferred-save acceptance pending.

Evidence: [before / analysis](fix-3/before/ADM-07.log); [after / analysis](fix-3/after/ADM-07.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### ADM-08 — DESIGN ONLY

Client deduplicates IDs and rejects nonadvancing/full-page loops with hard bound. This cannot repair offset omissions under concurrent mutations. Server snapshot aggregate/keyset contract remains DESIGN ONLY; no financial completeness claim.

Evidence: [before / analysis](fix-3/before/ADM-08.log); [after / analysis](fix-3/after/ADM-08.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### ADM-09 — FIXED - VERIFIED (automated)

Settings update requires returned id via select(id).single(); zero-row singular error propagates; no financial singleton upsert.

Evidence: [before / analysis](fix-3/before/ADM-09.log); [after / analysis](fix-3/after/ADM-09.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### WEB-01 — FIXED - VERIFIED (automated)

Both legacy URL-to-innerHTML sinks replaced by DOM construction and textContent. Same VM tests fail four assertions before and pass after. No live exposure claim or hosted deployment.

Evidence: [before / analysis](fix-3/before/WEB-01.log); [after / analysis](fix-3/after/WEB-01.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### WEB-02 — FIXED - DEVICE/STAGING TEST PENDING

Fragment scrubbed synchronously; credentials stay in closure rather than anchors/DOM, fixed medveda scheme and explicit tap only. VM plus exact token handoff test pass; fragment-only bridge, real OS/browser handoff pending.

Evidence: [before / analysis](fix-3/before/WEB-02.log); [after / analysis](fix-3/after/WEB-02.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### WEB-03 — FIXED - VERIFIED (automated)

Disabled-sales copy reconciled in source and generated pages; canonical generator synchronized shared mobile recovery controller. Recovery now 26/26; 17-page link validator passes. No unsupported claim that note downloads are disabled.

Evidence: [before / analysis](fix-3/before/WEB-03.log); [after / analysis](fix-3/after/WEB-03.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### WEB-04 — FIXED - VERIFIED (automated)

Legacy legal bodies point to current fixed canonical policies, removing false Mumbai/limited-processor/deletion/refund claims; legacy landing FAQ directs to current privacy policy. Canonical Seoul/retention source facts preserved, not independently recertified.

Evidence: [before / analysis](fix-3/before/WEB-04.log); [after / analysis](fix-3/after/WEB-04.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### CFG-01 — FIXED - DEVICE/STAGING TEST PENDING

Existing compatible Expo57 patches reverified by Doctor; no app.config/eas/provider flag edits. Rebuilt binary still needs device acceptance.

Evidence: [before / analysis](fix-3/baseline-expo-doctor-direct.log); [after / analysis](fix-3/final-expo-doctor.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### CFG-02 — BLOCKED

Full fresh audits: mobile 3 moderate, tooling 9 moderate, admin zero. Compatible patch parents still require vulnerable minimatch10; no safe patch found. No force audit fix, major override, downgrade or lockfile edit.

Evidence: [before / analysis](mobile-fix-2/after/CFG-02.log); [after / analysis](fix-3/final-mobile-app-npm-audit.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

### QA-01 — FIXED - VERIFIED (automated)

Additive current-schema full-suite runner preserves historical files, normalizes only exact ACL entry ordering and updates only retired-RPC expectation in a new deletion test. All suites pass with new runner. Canonical historical wrappers remain historical and must not be reported passing.

Evidence: [before / analysis](fix-3/baseline-sql-final.log); [after / analysis](fix-3/final-sql.log). All automated claims are local. External staging/device/provider steps below remain unperformed.

## Ready-to-review / proposed commit groups

**Do not execute these commands automatically.** No staging or commit was performed. Paths marked **mixed** were already dirty/untracked in the pre-work inventory, so adding the whole file includes owner changes. These commands intentionally preserve those changes for owner review; they do not imply isolated commits. Some files span findings and should be staged only once. Blocked MOB-02 source was restored; its failing test/design is evidence, not a fix.

### WEB-01/02 legacy bridge

Files: `reset-password.html`, `github-original-website/reset-password.html`, `docs/audit/fix-3/tests/web-recovery.cjs` **mixed**.

```bash
git add -- reset-password.html github-original-website/reset-password.html docs/audit/fix-3/tests/web-recovery.cjs
```

### WEB-03/04 policy + recovery parity

Files: `website/_src/pages/index.html`, `website/_src/pages/download.html`, `website/_src/pages/features.html`, `website/_src/pages/how-it-works.html`, `website/_src/faq.mjs`, `website/assets/js/recovery-flow.js`, `website/index.html`, `website/download.html`, `website/features.html`, `website/how-it-works.html`, `website/faq.html`, `privacy.html`, `refunds.html`, `terms.html`, `index.html`, `github-original-website/privacy.html`, `github-original-website/refunds.html`, `github-original-website/terms.html`, `github-original-website/index.html`, `website/sitemap.xml`.

```bash
git add -- website/_src/pages/index.html website/_src/pages/download.html website/_src/pages/features.html website/_src/pages/how-it-works.html website/_src/faq.mjs website/assets/js/recovery-flow.js website/index.html website/download.html website/features.html website/how-it-works.html website/faq.html privacy.html refunds.html terms.html index.html github-original-website/privacy.html github-original-website/refunds.html github-original-website/terms.html github-original-website/index.html website/sitemap.xml
```

### Admin client repairs ADM-01 through ADM-09

Files: `admin-panel/src/components/ProductFormModal.tsx` **mixed**, `admin-panel/src/services/productService.ts`, `admin-panel/src/types/product.ts`, `admin-panel/src/components/CourseFormModal.tsx` **mixed**, `admin-panel/src/components/YearFormModal.tsx` **mixed**, `admin-panel/src/components/SubjectFormModal.tsx` **mixed**, `admin-panel/src/components/ChapterFormModal.tsx` **mixed**, `admin-panel/src/pages/Notifications.tsx` **mixed**, `admin-panel/src/services/notificationService.ts`, `admin-panel/src/services/playBillingSyncService.ts`, `admin-panel/src/hooks/useNotes.ts`, `admin-panel/src/hooks/useVideos.ts`, `admin-panel/src/hooks/useQuiz.ts`, `admin-panel/src/pages/Notes.tsx` **mixed**, `admin-panel/src/pages/Referrals.tsx` **mixed**, `admin-panel/src/pages/ReviewFlags.tsx` **mixed**, `admin-panel/src/pages/Dashboard.tsx`, `admin-panel/src/hooks/useReferrals.ts`, `admin-panel/src/utils/filters.ts`, `admin-panel/src/services/referralService.ts` **mixed**, `docs/audit/fix-3/tests/admin-contracts.cjs` **mixed**.

```bash
git add -- admin-panel/src/components/ProductFormModal.tsx admin-panel/src/services/productService.ts admin-panel/src/types/product.ts admin-panel/src/components/CourseFormModal.tsx admin-panel/src/components/YearFormModal.tsx admin-panel/src/components/SubjectFormModal.tsx admin-panel/src/components/ChapterFormModal.tsx admin-panel/src/pages/Notifications.tsx admin-panel/src/services/notificationService.ts admin-panel/src/services/playBillingSyncService.ts admin-panel/src/hooks/useNotes.ts admin-panel/src/hooks/useVideos.ts admin-panel/src/hooks/useQuiz.ts admin-panel/src/pages/Notes.tsx admin-panel/src/pages/Referrals.tsx admin-panel/src/pages/ReviewFlags.tsx admin-panel/src/pages/Dashboard.tsx admin-panel/src/hooks/useReferrals.ts admin-panel/src/utils/filters.ts admin-panel/src/services/referralService.ts docs/audit/fix-3/tests/admin-contracts.cjs
```

### Backend guard migrations BACK-10/12/15/17

Files: `supabase/migrations/20261114040000_fix3_content_push_and_delete_guards.sql`, `supabase/migrations/20261114040100_fix3_flag_resolution_row_count.sql`, `docs/audit/fix-3/tests/BACK-10.sql` **mixed**, `docs/audit/fix-3/tests/BACK-12.sql` **mixed**, `docs/audit/fix-3/tests/BACK-15.sql` **mixed**, `docs/audit/fix-3/tests/BACK-17.sql` **mixed**, `docs/audit/fix-3/tests/BACK-15-concurrency.py` **mixed**, `docs/audit/fix-3/tests/build-local.py` **mixed**, `docs/audit/fix-3/tests/run-sql-findings.py` **mixed**.

```bash
git add -- supabase/migrations/20261114040000_fix3_content_push_and_delete_guards.sql supabase/migrations/20261114040100_fix3_flag_resolution_row_count.sql docs/audit/fix-3/tests/BACK-10.sql docs/audit/fix-3/tests/BACK-12.sql docs/audit/fix-3/tests/BACK-15.sql docs/audit/fix-3/tests/BACK-17.sql docs/audit/fix-3/tests/BACK-15-concurrency.py docs/audit/fix-3/tests/build-local.py docs/audit/fix-3/tests/run-sql-findings.py
```

### BACK-09/14 new-file deployment candidates

Files: `supabase/functions/_shared/paymentQueueFix3.ts`, `supabase/functions/report-external-transaction/index.fix3.ts`, `supabase/checks/ucb_postdeploy_checks.fix3.sql`, `docs/audit/fix-3/tests/BACK-09.cjs` **mixed**, `docs/audit/fix-3/tests/BACK-14.py` **mixed**.

```bash
git add -- supabase/functions/_shared/paymentQueueFix3.ts supabase/functions/report-external-transaction/index.fix3.ts supabase/checks/ucb_postdeploy_checks.fix3.sql docs/audit/fix-3/tests/BACK-09.cjs docs/audit/fix-3/tests/BACK-14.py
```

### QA-01 additive current-schema qualification

Files: `supabase/tests/fix3-run-all.sh`, `supabase/tests/fix3-audit-batch1-local.py`, `supabase/tests/fix3-account_deletion_checks.sql`.

```bash
git add -- supabase/tests/fix3-run-all.sh supabase/tests/fix3-audit-batch1-local.py supabase/tests/fix3-account_deletion_checks.sql
```

### MOB-17 bounded lifetime scan

Files: `mobile-app/src/hooks/useQuizStats.ts` **mixed**, `docs/audit/fix-3/tests/MOB-17-bound.cjs` **mixed**.

```bash
git add -- mobile-app/src/hooks/useQuizStats.ts docs/audit/fix-3/tests/MOB-17-bound.cjs
```

### Existing owner payment/auth guard fixes — review with migration dependencies

Files: `supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql` **mixed**, `supabase/functions/razorpay-webhook/index.ts` **mixed**, `supabase/functions/_shared/settle.ts` **mixed**, `supabase/functions/send-push-notification/index.ts` **mixed**, `supabase/functions/create-play-order/index.ts` **mixed**, `supabase/functions/verify-play-purchase/index.ts` **mixed**, `supabase/functions/verify-payment/index.ts` **mixed**.

```bash
git add -- supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql supabase/functions/razorpay-webhook/index.ts supabase/functions/_shared/settle.ts supabase/functions/send-push-notification/index.ts supabase/functions/create-play-order/index.ts supabase/functions/verify-play-purchase/index.ts supabase/functions/verify-payment/index.ts
```

### Existing mobile fixes reverified — include overlapping prerequisites once

Files: `mobile-app/src/navigation/AppNavigator.tsx` **mixed**, `mobile-app/src/config/paymentProvider.ts` **mixed**, `mobile-app/src/services/playBillingService.ts` **mixed**, `mobile-app/src/screens/payment/OrderSummaryScreen.tsx` **mixed**, `mobile-app/App.tsx` **mixed**, `mobile-app/src/screens/auth/ResetPasswordScreen.tsx`, `mobile-app/src/features/auth/deepLinkStore.ts`, `mobile-app/src/features/auth/recoveryFlow.js`, `mobile-app/src/features/auth/recoveryFlow.d.ts`, `mobile-app/app.config.js` **mixed**, `mobile-app/src/services/studyReminderService.ts` **mixed**, `mobile-app/src/services/quizAttempts.ts`, `mobile-app/src/services/syncEngine.ts` **mixed**, `mobile-app/src/services/pushNotifications.ts` **mixed**, `mobile-app/src/services/authState.ts` **mixed**, `mobile-app/src/utils/downloadManager.ts` **mixed**, `mobile-app/src/services/searchService.ts`, `mobile-app/src/hooks/useGlobalSearch.ts` **mixed**, `mobile-app/src/components/search/SearchResultRow.tsx`, `mobile-app/src/components/ProgressRing.tsx`, `mobile-app/src/hooks/useNetworkStatus.ts`, `mobile-app/package.json` **mixed**, `mobile-app/package-lock.json` **mixed**.

```bash
git add -- mobile-app/src/navigation/AppNavigator.tsx mobile-app/src/config/paymentProvider.ts mobile-app/src/services/playBillingService.ts mobile-app/src/screens/payment/OrderSummaryScreen.tsx mobile-app/App.tsx mobile-app/src/screens/auth/ResetPasswordScreen.tsx mobile-app/src/features/auth/deepLinkStore.ts mobile-app/src/features/auth/recoveryFlow.js mobile-app/src/features/auth/recoveryFlow.d.ts mobile-app/app.config.js mobile-app/src/services/studyReminderService.ts mobile-app/src/services/quizAttempts.ts mobile-app/src/services/syncEngine.ts mobile-app/src/services/pushNotifications.ts mobile-app/src/services/authState.ts mobile-app/src/utils/downloadManager.ts mobile-app/src/services/searchService.ts mobile-app/src/hooks/useGlobalSearch.ts mobile-app/src/components/search/SearchResultRow.tsx mobile-app/src/components/ProgressRing.tsx mobile-app/src/hooks/useNetworkStatus.ts mobile-app/package.json mobile-app/package-lock.json
```

### Fix-3 report and runbooks

Files: `docs/audit/MEDVEDA_FIX_3_2026-11-14.md`, `docs/audit/fix-3/WORKFLOW.md` **mixed**, `docs/audit/fix-3/backend-runbook.md` **mixed**, `docs/audit/fix-3/mobile-designs.md` **mixed**, `docs/audit/fix-3/wallet-expiry-design.md` **mixed**, `docs/audit/fix-3/retention-runbook.sql` **mixed**, `docs/audit/fix-3/reviews/independent-review.md` **mixed**, `docs/audit/fix-3/findings.json` **mixed**.

```bash
git add -- docs/audit/MEDVEDA_FIX_3_2026-11-14.md docs/audit/fix-3/WORKFLOW.md docs/audit/fix-3/backend-runbook.md docs/audit/fix-3/mobile-designs.md docs/audit/fix-3/wallet-expiry-design.md docs/audit/fix-3/retention-runbook.sql docs/audit/fix-3/reviews/independent-review.md docs/audit/fix-3/findings.json
```

### Local audit evidence and reproducible runners (review; safety patch excluded)

Files: `docs/audit/fix-3/WORKFLOW.md` **mixed**, `docs/audit/fix-3/admin-batch-eslint.log` **mixed**, `docs/audit/fix-3/admin-batch-tsc.log` **mixed**, `docs/audit/fix-3/after/ADM-01.log` **mixed**, `docs/audit/fix-3/after/ADM-02-fixture-corrected.log` **mixed**, `docs/audit/fix-3/after/ADM-02.log` **mixed**, `docs/audit/fix-3/after/ADM-03.log` **mixed**, `docs/audit/fix-3/after/ADM-04.log` **mixed**, `docs/audit/fix-3/after/ADM-05.log` **mixed**, `docs/audit/fix-3/after/ADM-06.log` **mixed**, `docs/audit/fix-3/after/ADM-07.log` **mixed**, `docs/audit/fix-3/after/ADM-08.log` **mixed**, `docs/audit/fix-3/after/ADM-09.log` **mixed**, `docs/audit/fix-3/after/BACK-02.log` **mixed**, `docs/audit/fix-3/after/BACK-05.log` **mixed**, `docs/audit/fix-3/after/BACK-06.log` **mixed**, `docs/audit/fix-3/after/BACK-07.log` **mixed**, `docs/audit/fix-3/after/BACK-09-deno.log` **mixed**, `docs/audit/fix-3/after/BACK-09.log` **mixed**, `docs/audit/fix-3/after/BACK-10.log` **mixed**, `docs/audit/fix-3/after/BACK-12.log` **mixed**, `docs/audit/fix-3/after/BACK-14.log` **mixed**, `docs/audit/fix-3/after/BACK-15-concurrency.log` **mixed**, `docs/audit/fix-3/after/BACK-15.log` **mixed**, `docs/audit/fix-3/after/BACK-16.log` **mixed**, `docs/audit/fix-3/after/BACK-17.log` **mixed**, `docs/audit/fix-3/after/MOB-01.log` **mixed**, `docs/audit/fix-3/after/MOB-02-unresolved.log` **mixed**, `docs/audit/fix-3/after/MOB-02.log` **mixed**, `docs/audit/fix-3/after/MOB-03.log` **mixed**, `docs/audit/fix-3/after/MOB-04-service.log` **mixed**, `docs/audit/fix-3/after/MOB-04.log` **mixed**, `docs/audit/fix-3/after/MOB-05.log` **mixed**, `docs/audit/fix-3/after/MOB-06.log` **mixed**, `docs/audit/fix-3/after/MOB-07.log` **mixed**, `docs/audit/fix-3/after/MOB-08.log` **mixed**, `docs/audit/fix-3/after/MOB-09.log` **mixed**, `docs/audit/fix-3/after/MOB-10.log` **mixed**, `docs/audit/fix-3/after/MOB-11.log` **mixed**, `docs/audit/fix-3/after/MOB-13.log` **mixed**, `docs/audit/fix-3/after/MOB-14-backoff.log` **mixed**, `docs/audit/fix-3/after/MOB-14.log` **mixed**, `docs/audit/fix-3/after/MOB-15.log` **mixed**, `docs/audit/fix-3/after/MOB-16.log` **mixed**, `docs/audit/fix-3/after/MOB-17-bound.log` **mixed**, `docs/audit/fix-3/after/MOB-17.log` **mixed**, `docs/audit/fix-3/after/MOB-18.log` **mixed**, `docs/audit/fix-3/after/MOB-19.log` **mixed**, `docs/audit/fix-3/after/MOB-20.log` **mixed**, `docs/audit/fix-3/after/WEB-01.log` **mixed**, `docs/audit/fix-3/after/WEB-02-handoff.log` **mixed**, `docs/audit/fix-3/after/WEB-02.log` **mixed**, `docs/audit/fix-3/after/WEB-03.log` **mixed**, `docs/audit/fix-3/after/WEB-04.log` **mixed**, `docs/audit/fix-3/after/closed-testing-rerun.log` **mixed**, `docs/audit/fix-3/after/closed-testing-restored.log` **mixed**, `docs/audit/fix-3/after/offline-download-rerun.log` **mixed**, `docs/audit/fix-3/after/offline-download-restored.log` **mixed**, `docs/audit/fix-3/after/recovery-parity.log` **mixed**, `docs/audit/fix-3/after/sql-build.log` **mixed**, `docs/audit/fix-3/backend-runbook.md` **mixed**, `docs/audit/fix-3/baseline-admin-node-tsc.log` **mixed**, `docs/audit/fix-3/baseline-admin-tests.log` **mixed**, `docs/audit/fix-3/baseline-admin-tsc.log` **mixed**, `docs/audit/fix-3/baseline-deno-check.log` **mixed**, `docs/audit/fix-3/baseline-deno-unit.log` **mixed**, `docs/audit/fix-3/baseline-eslint.log` **mixed**, `docs/audit/fix-3/baseline-expo-doctor-direct.log` **mixed**, `docs/audit/fix-3/baseline-expo-doctor.log` **mixed**, `docs/audit/fix-3/baseline-mobile-tsc.log` **mixed**, `docs/audit/fix-3/baseline-password-recovery.log` **mixed**, `docs/audit/fix-3/baseline-results.json` **mixed**, `docs/audit/fix-3/baseline-sql-final.log` **mixed**, `docs/audit/fix-3/baseline-sql-local.log` **mixed**, `docs/audit/fix-3/baseline-sql.log` **mixed**, `docs/audit/fix-3/baseline.log` **mixed**, `docs/audit/fix-3/before/ADM-01.log` **mixed**, `docs/audit/fix-3/before/ADM-02-fixture-corrected.log` **mixed**, `docs/audit/fix-3/before/ADM-02.log` **mixed**, `docs/audit/fix-3/before/ADM-03.log` **mixed**, `docs/audit/fix-3/before/ADM-04.log` **mixed**, `docs/audit/fix-3/before/ADM-05.log` **mixed**, `docs/audit/fix-3/before/ADM-06.log` **mixed**, `docs/audit/fix-3/before/ADM-07.log` **mixed**, `docs/audit/fix-3/before/ADM-08.log` **mixed**, `docs/audit/fix-3/before/ADM-09.log` **mixed**, `docs/audit/fix-3/before/BACK-02.log` **mixed**, `docs/audit/fix-3/before/BACK-05.log` **mixed**, `docs/audit/fix-3/before/BACK-06.log` **mixed**, `docs/audit/fix-3/before/BACK-07.log` **mixed**, `docs/audit/fix-3/before/BACK-09.log` **mixed**, `docs/audit/fix-3/before/BACK-10.log` **mixed**, `docs/audit/fix-3/before/BACK-12.log` **mixed**, `docs/audit/fix-3/before/BACK-14.log` **mixed**, `docs/audit/fix-3/before/BACK-15.log` **mixed**, `docs/audit/fix-3/before/BACK-16.log` **mixed**, `docs/audit/fix-3/before/BACK-17.log` **mixed**, `docs/audit/fix-3/before/MOB-01.log` **mixed**, `docs/audit/fix-3/before/MOB-02.log` **mixed**, `docs/audit/fix-3/before/MOB-03.log` **mixed**, `docs/audit/fix-3/before/MOB-04-service.log` **mixed**, `docs/audit/fix-3/before/MOB-04.log` **mixed**, `docs/audit/fix-3/before/MOB-05.log` **mixed**, `docs/audit/fix-3/before/MOB-06.log` **mixed**, `docs/audit/fix-3/before/MOB-07.log` **mixed**, `docs/audit/fix-3/before/MOB-08.log` **mixed**, `docs/audit/fix-3/before/MOB-09.log` **mixed**, `docs/audit/fix-3/before/MOB-10.log` **mixed**, `docs/audit/fix-3/before/MOB-11.log` **mixed**, `docs/audit/fix-3/before/MOB-13.log` **mixed**, `docs/audit/fix-3/before/MOB-14-backoff.log` **mixed**, `docs/audit/fix-3/before/MOB-14.log` **mixed**, `docs/audit/fix-3/before/MOB-15.log` **mixed**, `docs/audit/fix-3/before/MOB-16.log` **mixed**, `docs/audit/fix-3/before/MOB-17-bound.log` **mixed**, `docs/audit/fix-3/before/MOB-17.log` **mixed**, `docs/audit/fix-3/before/MOB-18.log` **mixed**, `docs/audit/fix-3/before/MOB-19.log` **mixed**, `docs/audit/fix-3/before/MOB-20.log` **mixed**, `docs/audit/fix-3/before/WEB-01.log` **mixed**, `docs/audit/fix-3/before/WEB-02.log` **mixed**, `docs/audit/fix-3/before/WEB-03.log` **mixed**, `docs/audit/fix-3/before/WEB-04.log` **mixed**, `docs/audit/fix-3/before/sql-build.log` **mixed**, `docs/audit/fix-3/check-dependencies.py` **mixed**, `docs/audit/fix-3/dependency-parent-eslint.log` **mixed**, `docs/audit/fix-3/dependency-parent-expo.log` **mixed**, `docs/audit/fix-3/dependency-parent-fingerprint.log` **mixed**, `docs/audit/fix-3/dependency-parent-typescript-eslint.log` **mixed**, `docs/audit/fix-3/dependency-results.json` **mixed**, `docs/audit/fix-3/final-admin-node-tsc.log` **mixed**, `docs/audit/fix-3/final-admin-panel-npm-audit.log` **mixed**, `docs/audit/fix-3/final-admin-tests.log` **mixed**, `docs/audit/fix-3/final-admin-tsc.log` **mixed**, `docs/audit/fix-3/final-deno-check.log` **mixed**, `docs/audit/fix-3/final-deno-unit.log` **mixed**, `docs/audit/fix-3/final-diff-check.log` **mixed**, `docs/audit/fix-3/final-eslint.log` **mixed**, `docs/audit/fix-3/final-expo-doctor.log` **mixed**, `docs/audit/fix-3/final-mobile-app-npm-audit.log` **mixed**, `docs/audit/fix-3/final-mobile-reconciled-results.json` **mixed**, `docs/audit/fix-3/final-mobile-suite-progress.log` **mixed**, `docs/audit/fix-3/final-mobile-test-results.json` **mixed**, `docs/audit/fix-3/final-mobile-tests.log` **mixed**, `docs/audit/fix-3/final-mobile-tsc.log` **mixed**, `docs/audit/fix-3/final-password-recovery.log` **mixed**, `docs/audit/fix-3/final-results.json` **mixed**, `docs/audit/fix-3/final-sql.exit` **mixed**, `docs/audit/fix-3/final-sql.log` **mixed**, `docs/audit/fix-3/final-tooling-npm-audit.log` **mixed**, `docs/audit/fix-3/final-verification.md` **mixed**, `docs/audit/fix-3/final-website-auth.log` **mixed**, `docs/audit/fix-3/final-website-links.log` **mixed**, `docs/audit/fix-3/findings.json` **mixed**, `docs/audit/fix-3/local-postgres-init.log` **mixed**, `docs/audit/fix-3/mobile-designs.md` **mixed**, `docs/audit/fix-3/protected-source-check.json` **mixed**, `docs/audit/fix-3/regression-baseline-results.json` **mixed**, `docs/audit/fix-3/regression-baseline.py` **mixed**, `docs/audit/fix-3/report-link-check.json` **mixed**, `docs/audit/fix-3/retention-runbook.sql` **mixed**, `docs/audit/fix-3/reviews/independent-review.md` **mixed**, `docs/audit/fix-3/run-baseline.py` **mixed**, `docs/audit/fix-3/run-final.py` **mixed**, `docs/audit/fix-3/run-local-suite.sh` **mixed**, `docs/audit/fix-3/run-mobile-suite.py` **mixed**, `docs/audit/fix-3/tests/BACK-09.cjs` **mixed**, `docs/audit/fix-3/tests/BACK-10.sql` **mixed**, `docs/audit/fix-3/tests/BACK-12.sql` **mixed**, `docs/audit/fix-3/tests/BACK-14.py` **mixed**, `docs/audit/fix-3/tests/BACK-15-concurrency.py` **mixed**, `docs/audit/fix-3/tests/BACK-15.sql` **mixed**, `docs/audit/fix-3/tests/BACK-17.sql` **mixed**, `docs/audit/fix-3/tests/MOB-02-offline.cjs` **mixed**, `docs/audit/fix-3/tests/MOB-17-bound.cjs` **mixed**, `docs/audit/fix-3/tests/admin-contracts.cjs` **mixed**, `docs/audit/fix-3/tests/build-local.py` **mixed**, `docs/audit/fix-3/tests/run-sql-findings.py` **mixed**, `docs/audit/fix-3/tests/web-recovery.cjs` **mixed**, `docs/audit/fix-3/tests/website-policy.cjs` **mixed**, `docs/audit/fix-3/verification-limits.md` **mixed**, `docs/audit/fix-3/wallet-expiry-design.md` **mixed**, `docs/audit/fix-3/website-build.log` **mixed**, `docs/audit/fix-3/website-links.log` **mixed**, `docs/audit/fix-3/write-report.py` **mixed**.

```bash
git add -- docs/audit/fix-3/WORKFLOW.md docs/audit/fix-3/admin-batch-eslint.log docs/audit/fix-3/admin-batch-tsc.log docs/audit/fix-3/after/ADM-01.log docs/audit/fix-3/after/ADM-02-fixture-corrected.log docs/audit/fix-3/after/ADM-02.log docs/audit/fix-3/after/ADM-03.log docs/audit/fix-3/after/ADM-04.log docs/audit/fix-3/after/ADM-05.log docs/audit/fix-3/after/ADM-06.log docs/audit/fix-3/after/ADM-07.log docs/audit/fix-3/after/ADM-08.log docs/audit/fix-3/after/ADM-09.log docs/audit/fix-3/after/BACK-02.log docs/audit/fix-3/after/BACK-05.log docs/audit/fix-3/after/BACK-06.log docs/audit/fix-3/after/BACK-07.log docs/audit/fix-3/after/BACK-09-deno.log docs/audit/fix-3/after/BACK-09.log docs/audit/fix-3/after/BACK-10.log docs/audit/fix-3/after/BACK-12.log docs/audit/fix-3/after/BACK-14.log docs/audit/fix-3/after/BACK-15-concurrency.log docs/audit/fix-3/after/BACK-15.log docs/audit/fix-3/after/BACK-16.log docs/audit/fix-3/after/BACK-17.log docs/audit/fix-3/after/MOB-01.log docs/audit/fix-3/after/MOB-02-unresolved.log docs/audit/fix-3/after/MOB-02.log docs/audit/fix-3/after/MOB-03.log docs/audit/fix-3/after/MOB-04-service.log docs/audit/fix-3/after/MOB-04.log docs/audit/fix-3/after/MOB-05.log docs/audit/fix-3/after/MOB-06.log docs/audit/fix-3/after/MOB-07.log docs/audit/fix-3/after/MOB-08.log docs/audit/fix-3/after/MOB-09.log docs/audit/fix-3/after/MOB-10.log docs/audit/fix-3/after/MOB-11.log docs/audit/fix-3/after/MOB-13.log docs/audit/fix-3/after/MOB-14-backoff.log docs/audit/fix-3/after/MOB-14.log docs/audit/fix-3/after/MOB-15.log docs/audit/fix-3/after/MOB-16.log docs/audit/fix-3/after/MOB-17-bound.log docs/audit/fix-3/after/MOB-17.log docs/audit/fix-3/after/MOB-18.log docs/audit/fix-3/after/MOB-19.log docs/audit/fix-3/after/MOB-20.log docs/audit/fix-3/after/WEB-01.log docs/audit/fix-3/after/WEB-02-handoff.log docs/audit/fix-3/after/WEB-02.log docs/audit/fix-3/after/WEB-03.log docs/audit/fix-3/after/WEB-04.log docs/audit/fix-3/after/closed-testing-rerun.log docs/audit/fix-3/after/closed-testing-restored.log docs/audit/fix-3/after/offline-download-rerun.log docs/audit/fix-3/after/offline-download-restored.log docs/audit/fix-3/after/recovery-parity.log docs/audit/fix-3/after/sql-build.log docs/audit/fix-3/backend-runbook.md docs/audit/fix-3/baseline-admin-node-tsc.log docs/audit/fix-3/baseline-admin-tests.log docs/audit/fix-3/baseline-admin-tsc.log docs/audit/fix-3/baseline-deno-check.log docs/audit/fix-3/baseline-deno-unit.log docs/audit/fix-3/baseline-eslint.log docs/audit/fix-3/baseline-expo-doctor-direct.log docs/audit/fix-3/baseline-expo-doctor.log docs/audit/fix-3/baseline-mobile-tsc.log docs/audit/fix-3/baseline-password-recovery.log docs/audit/fix-3/baseline-results.json docs/audit/fix-3/baseline-sql-final.log docs/audit/fix-3/baseline-sql-local.log docs/audit/fix-3/baseline-sql.log docs/audit/fix-3/baseline.log docs/audit/fix-3/before/ADM-01.log docs/audit/fix-3/before/ADM-02-fixture-corrected.log docs/audit/fix-3/before/ADM-02.log docs/audit/fix-3/before/ADM-03.log docs/audit/fix-3/before/ADM-04.log docs/audit/fix-3/before/ADM-05.log docs/audit/fix-3/before/ADM-06.log docs/audit/fix-3/before/ADM-07.log docs/audit/fix-3/before/ADM-08.log docs/audit/fix-3/before/ADM-09.log docs/audit/fix-3/before/BACK-02.log docs/audit/fix-3/before/BACK-05.log docs/audit/fix-3/before/BACK-06.log docs/audit/fix-3/before/BACK-07.log docs/audit/fix-3/before/BACK-09.log docs/audit/fix-3/before/BACK-10.log docs/audit/fix-3/before/BACK-12.log docs/audit/fix-3/before/BACK-14.log docs/audit/fix-3/before/BACK-15.log docs/audit/fix-3/before/BACK-16.log docs/audit/fix-3/before/BACK-17.log docs/audit/fix-3/before/MOB-01.log docs/audit/fix-3/before/MOB-02.log docs/audit/fix-3/before/MOB-03.log docs/audit/fix-3/before/MOB-04-service.log docs/audit/fix-3/before/MOB-04.log docs/audit/fix-3/before/MOB-05.log docs/audit/fix-3/before/MOB-06.log docs/audit/fix-3/before/MOB-07.log docs/audit/fix-3/before/MOB-08.log docs/audit/fix-3/before/MOB-09.log docs/audit/fix-3/before/MOB-10.log docs/audit/fix-3/before/MOB-11.log docs/audit/fix-3/before/MOB-13.log docs/audit/fix-3/before/MOB-14-backoff.log docs/audit/fix-3/before/MOB-14.log docs/audit/fix-3/before/MOB-15.log docs/audit/fix-3/before/MOB-16.log docs/audit/fix-3/before/MOB-17-bound.log docs/audit/fix-3/before/MOB-17.log docs/audit/fix-3/before/MOB-18.log docs/audit/fix-3/before/MOB-19.log docs/audit/fix-3/before/MOB-20.log docs/audit/fix-3/before/WEB-01.log docs/audit/fix-3/before/WEB-02.log docs/audit/fix-3/before/WEB-03.log docs/audit/fix-3/before/WEB-04.log docs/audit/fix-3/before/sql-build.log docs/audit/fix-3/check-dependencies.py docs/audit/fix-3/dependency-parent-eslint.log docs/audit/fix-3/dependency-parent-expo.log docs/audit/fix-3/dependency-parent-fingerprint.log docs/audit/fix-3/dependency-parent-typescript-eslint.log docs/audit/fix-3/dependency-results.json docs/audit/fix-3/final-admin-node-tsc.log docs/audit/fix-3/final-admin-panel-npm-audit.log docs/audit/fix-3/final-admin-tests.log docs/audit/fix-3/final-admin-tsc.log docs/audit/fix-3/final-deno-check.log docs/audit/fix-3/final-deno-unit.log docs/audit/fix-3/final-diff-check.log docs/audit/fix-3/final-eslint.log docs/audit/fix-3/final-expo-doctor.log docs/audit/fix-3/final-mobile-app-npm-audit.log docs/audit/fix-3/final-mobile-reconciled-results.json docs/audit/fix-3/final-mobile-suite-progress.log docs/audit/fix-3/final-mobile-test-results.json docs/audit/fix-3/final-mobile-tests.log docs/audit/fix-3/final-mobile-tsc.log docs/audit/fix-3/final-password-recovery.log docs/audit/fix-3/final-results.json docs/audit/fix-3/final-sql.exit docs/audit/fix-3/final-sql.log docs/audit/fix-3/final-tooling-npm-audit.log docs/audit/fix-3/final-verification.md docs/audit/fix-3/final-website-auth.log docs/audit/fix-3/final-website-links.log docs/audit/fix-3/findings.json docs/audit/fix-3/local-postgres-init.log docs/audit/fix-3/mobile-designs.md docs/audit/fix-3/protected-source-check.json docs/audit/fix-3/regression-baseline-results.json docs/audit/fix-3/regression-baseline.py docs/audit/fix-3/report-link-check.json docs/audit/fix-3/retention-runbook.sql docs/audit/fix-3/reviews/independent-review.md docs/audit/fix-3/run-baseline.py docs/audit/fix-3/run-final.py docs/audit/fix-3/run-local-suite.sh docs/audit/fix-3/run-mobile-suite.py docs/audit/fix-3/tests/BACK-09.cjs docs/audit/fix-3/tests/BACK-10.sql docs/audit/fix-3/tests/BACK-12.sql docs/audit/fix-3/tests/BACK-14.py docs/audit/fix-3/tests/BACK-15-concurrency.py docs/audit/fix-3/tests/BACK-15.sql docs/audit/fix-3/tests/BACK-17.sql docs/audit/fix-3/tests/MOB-02-offline.cjs docs/audit/fix-3/tests/MOB-17-bound.cjs docs/audit/fix-3/tests/admin-contracts.cjs docs/audit/fix-3/tests/build-local.py docs/audit/fix-3/tests/run-sql-findings.py docs/audit/fix-3/tests/web-recovery.cjs docs/audit/fix-3/tests/website-policy.cjs docs/audit/fix-3/verification-limits.md docs/audit/fix-3/wallet-expiry-design.md docs/audit/fix-3/website-build.log docs/audit/fix-3/website-links.log docs/audit/fix-3/write-report.py
```

Remaining raw evidence/test paths are inventoried explicitly in [docs/audit/fix-3/artifact-inventory.txt](fix-3/artifact-inventory.txt). Review each before staging; safety copies and local database artifacts are excluded from proposed groups. No broad git add is proposed.

## Staging/deploy runbook — nothing deployed

The complete dependency/JWT/function/cron/MFA sequence, per-step rollback, Play403 checklist and monitoring queries are in [docs/audit/fix-3/backend-runbook.md](fix-3/backend-runbook.md). Retention schedule remains entirely commented in [docs/audit/fix-3/retention-runbook.sql](fix-3/retention-runbook.sql). Purchases and jobs stay disabled in this free-only task.

## Device and staging checklists

Exact mobile steps and fixed production/staging bridge/allowlist procedure: [docs/audit/fix-3/mobile-designs.md](fix-3/mobile-designs.md). Backend/payment staging cases: [docs/audit/fix-3/backend-runbook.md](fix-3/backend-runbook.md). These are unperformed acceptance steps, not passing results.

## Owner decisions needed

- Release blocker MOB-02: approve a new reviewed offline-note guard attempt or leave paid-note offline paths unavailable by a separately verified mechanism; do not claim the current tree enforces the intended v1 policy. Full vault remains design only.
- Blocked-user browsing scope: safe default now denies all student has_content_access branches, including free videos; admin exception is preserved. Confirm product scope beyond protected PDFs.
- Confirm live credit expiry is not enabled; approve allocation/hold policy before enabling it. Repository defaults are null, live data was not read.
- Confirm external old clients no longer require delete_my_account before production EXECUTE revocation; current repository mobile uses the Edge handler.
- Progress units, content revision/reset semantics and “furthest” wording before designing executable schema/wiring MOB-14.
- Background preference persistence and public-feed versus recipient-delivery semantics.
- Server broadcast idempotency and snapshot analytics remain design only; client UUID/dedup does not close those server guarantees.
- Exact hosted bridge aliases/build schemes/Auth allowlist and native acceptance.
- Admin factor/recovery enrollment and explicit approval of MFA flag, cron/retention rollout and any future paid release. No approvals are inferred by these documents.

## Final raw results

See [docs/audit/fix-3/final-verification.md](fix-3/final-verification.md) for current raw outcomes, including original failures and supplemental reruns. Do not replace an interrupted or red run with a claim of success.

## Counts by status

- FIXED - VERIFIED (automated): **14**
- FIXED - DEVICE/STAGING TEST PENDING: **28**
- NOT REPRODUCED: **0**
- BLOCKED: **2**
- DESIGN ONLY: **9**
- OWNER DECISION NEEDED: **0**

Total: **53** audit IDs. Play403 and B03 are runbook/alias gates, not extra counted findings.

NO COMMITS WERE MADE. NOTHING WAS PUSHED. NOTHING WAS DEPLOYED.
