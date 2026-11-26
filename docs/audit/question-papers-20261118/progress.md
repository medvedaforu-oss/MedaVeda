# SDD ledger — plan: docs/superpowers/plans/2026-11-18-question-papers.md

User approved the isolated design with ten mandatory conditions. The user conditions are authoritative.
Pre-flight: backend table fields are shared by Admin and student services; both use snake_case row types. Catalog IDs are text, new paper IDs UUID. No entitlement dependency.
Ruling: use approved dirty audit-5 checkout in place; preserve every original state except five minimal additions. No worktree/.gitignore/package changes.
Ruling: failed/ambiguous metadata save retains new orphan object instead of deleting a possibly attached object; private orphan objects remain Admin-only. Old objects are retained on replacement/deletion.

Task 1: SQL RED missing table, then GREEN authorization/lifecycle plus five existing SQL suites. Local Unix socket requires sandbox escalation; disposable /tmp cluster only. CLI isolated in /tmp generated 20261118172019 migration.
Task 2: service tests GREEN; preview test caught state reset, fixed and GREEN.
Ruling: student screen components live under feature-local screens/ to match the existing lazy-screen loader convention and unchanged regression harness; module services/hooks stay outside screens/. No extra existing files edited.
Ruling: anon SELECT grant on the new table is required by Storage policy subquery privilege checks, even for unrelated buckets; zero anon RLS policies expose zero rows. Regression verifies anonymous thumbnails remain accessible.

Task 1: complete. New local migration, lifecycle/authorization tests, actual duplicate race, and schema/security/bucket snapshots pass. Five existing SQL regressions pass. Test fixture grants on storage are rolled back and are absent from the product migration.
Task 2: complete. Admin CRUD, publish/unpublish, search/filter/pagination, PDF preview/upload/replacement/delete integration and three harnesses pass. Replacement waits for asynchronous validation. Rapid repeated preview clicks preserve the first request.
Task 3: complete. Free student flow, platform PDF previews/downloads, account/scope invalidation and three harnesses pass. Exact Home comparison proves original Year Cards/items/callbacks unchanged. Existing route/PDF regressions pass.
Task 4: complete. Read-only independent review confirmed the preservation limit and found two P2 issues. Both reproduced RED and fixed GREEN (SQL boundary whitespace normalization, web HTTP download failure handling); reviewer confirmed no outstanding findings. Final test report carries real-device/hosted limitations.
Ruling on review's declined items: retained previous/orphan private objects and short-lived issued capabilities follow the approved design; downloaded copies cannot be revoked. Existing course security and Admin identity handling remain authoritative. Live push updates are unnecessary because focus/reload/signing recheck access. Real-device and hosted behavior remain explicitly unverified.
Ruling: leave all module work uncommitted in the approved checkout; no integration/merge/push/deployment or production migration is authorized. Existing branch and user changes are preserved.
