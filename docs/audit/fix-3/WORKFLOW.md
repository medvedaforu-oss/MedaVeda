# Fix 3 execution and file ownership

Release mode: **free-only**, owner instruction of 2026-11-14. No commits, pushes, deployment, provider operations, hosted writes, cron activation, billing flag changes or .env access.

The owner's work-package specification is the approved implementation plan. Apply the supplied smallest-fix designs against current code; preserve dirty-tree work. No extra design approval is needed for authorized repairs. Work in this tree, as requested; no checkout or worktree replacement.

Phase 0 safety files: pre-work.patch and pre-work-status.txt. The patch covers tracked differences only; preexisting untracked source is inventoried by status and must also be preserved.

## Ownership (exclusive; cross-scope changes go through root)

- Root orchestrator: this workflow, baseline/final runners and evidence, final report, integration. No source edits in another active owner's scope.
- V independent verifier: **new tests only**, docs/audit/fix-3/tests/, before/after logs, verifier notes. Existing tests remain untouched. Reproduce each finding before owner modifies it; source-already-fixed cases retain genuine passing baseline and report deployment pending rather than manufacture failures.
- R adversarial reviewer: read-only source; docs/audit/fix-3/reviews/ only.
- S3: website/, root reset-password.html/privacy.html/refunds.html/terms.html/index.html and github-original-website equivalents; admin-panel/. Wait for V's corresponding before evidence before source edits. WEB-01/02 first.
- S1: **new** supabase migrations containing payments/refund/flag fixes, **new** backend function source/candidates for settlement/webhook/verification/body guards; docs/audit/fix-3/S1.md. Never edit existing migrations.
- S2: **new** supabase migrations containing content/push/deletion/progress/statistics changes, **new** backend source/candidates for push MFA, queue budget and readiness checks; docs/audit/fix-3/S2.md and commented retention runbook.
- M: mobile-app/ only (except tests owned by V), docs/audit/fix-3/M.md. Coordinate exact progress/statistics RPC interface via root with S2. Existing build/provider flags untouched.
- P: docs/audit/fix-3/payment-gates.md only, analysis/runbook only.

Four concurrent slots require waves: V + S3 first (root integrates); then S1/S2 with V; M and P as slots free; R reviews each completed batch and final combined changes. Roles may reuse idle agent slots with explicit follow-up tasks.

## Backend new-files-only boundary

Absolute safety rule 2 controls existing backend source: do not overwrite existing supabase function/check/test files. Where a handler fix is already present, independently test the canonical current source. For new handler fixes, use new candidate source files with a documented deployment overlay and test the actual candidate. New migrations must be later than 20261112150427 (and ordered after each newly created migration). Do not duplicate pending 20261112104610. Nothing is deployed. Report operational findings DEVICE/STAGING TEST PENDING until qualified deployment; distinguish candidate verification from canonical verification.

## Gates

V records before -> owner repairs -> V same test after -> batch type/lint/suite -> R reviews; two failed fix verifications -> BLOCKED with exact reason. No artificial failing logs for source fixes that predate this session. Native, staging and provider acceptance remains pending. Print per-finding progress. Final inventory groups explicit paths and flags overlap with pre-work status.
