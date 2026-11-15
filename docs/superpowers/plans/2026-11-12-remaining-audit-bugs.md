# Remaining MedVeda audit fixes implementation plan

**Goal:** Correct AUD-001–008, 011, 013, 015–020 locally, preserving Batch 1.
**Architecture:** Keep current services and native vault boundaries. Use behavioral fault-injection regressions and disposable PostgreSQL. Extend deployment candidates separately from immutable Batch 1 artifacts.
**Tech stack:** Expo 57, React Native, React, Deno, PostgreSQL, Kotlin/JCA.
**Spec:** docs/audit/MEDVEDA_COMPLETE_PRODUCTION_READINESS_AUDIT_2026-11-12.md and user instructions.

## Constraints
No deployments, production migrations, payments/refunds/notifications, secret/settings changes, existing data deletion, backup work or unrelated refactoring. Native acceptance requires devices; incomplete encryption stays disabled.

## Review focus
Storage failure at publication; stale auth callbacks; initial/refresh request failure; missing MFA settings; unpublished ancestors versus existing payment recovery.

## Execution
- [x] Reproduce session key/blob corruption and navigation stack retention; implement serialized versioned publication and account-scoped navigation; test restart, failure, signout and owner changes.
- [x] Reproduce backend deployment-candidate recovery/MFA/ticket defects; create separate candidates preserving Batch 1 payment helpers; test auth before lookup/limiting and side-effect denial.
- [x] Reproduce unpublished checkout in PostgreSQL; guard admission in create_priced_order for all product scopes and preserve existing-order settlement. Apply/reapply every migration locally and test ancestry cases.
- [x] Reproduce reminder SDK trigger/rejection, preference overlap, terms rejection/null, accessibility names, settings failed baseline, malformed login and verification false success. Add focused behavioral tests before corresponding edits; run existing suites.
- [x] Inspect native vault gaps and reproduce plaintext download path. Implement only host-testable secure streaming coordination using existing vault architecture; keep activation blocked until complete native tooling/device acceptance. Preserve existing downloads.
- [x] Run mobile/admin/backend/database/website/security checks, review scoped diffs, record exact files/results/blockers in requested report.

Execution is inline in the existing authorized dirty workspace; baseline copies and initial status are captured under /tmp and evidence. No commits or worktree changes are needed to preserve existing work.

Native activation and AUD-008 acceptance remain BLOCKED. Only the dormant host-tested acquisition coordinator was implemented; no downloads/viewers were switched. Final report records remaining gates.
