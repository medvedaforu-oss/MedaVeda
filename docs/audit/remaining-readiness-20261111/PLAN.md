# Remaining local readiness verification

Goal: finish safe local preparation using the existing P0/P1/P2 baseline. User instruction is the specification and authorizes direct local execution.

- [x] Read latest P0/P1/P2 and Android evidence; preserve existing artifacts and source hashes.
- [x] Inventory every migration, verify frozen release identities, and examine current schema/security/constraint/index contracts.
- [x] Run clean replay and existing-data staged upgrade on a fresh PostgreSQL 17 cluster with TCP disabled and synthetic data only.
- [x] Reproduce any failure before a minimal correction and regression test; no speculative implementation changes.
- [x] Run applicable local type/lint/unit/integration/Edge/database/security/dependency/Expo checks, recording blocked commands honestly.
- [x] Publish consolidated unresolved-only register and five-category gap analysis with exact references, validation limits, and NO-GO.

Constraints: no production connections/writes, deployment/publication, real transactions, signing or Firebase/FCM changes. Payments disabled and ₹1/₹2/₹5 preserved. No historical reconciliation inferred from synthetic data. Existing frozen packages are review evidence, not permission to execute remotely.

Review focus: migrations overwritten by later routines; financial owner/idempotency and refund races; function ACL/search-path and RLS bypass; legacy-data upgrade versus clean replay; mock success versus genuine provider/native acceptance. Existing dedicated regressions exercise these boundaries; missing evidence stays open.

## Verified index correction

Ruling: work in the supplied dirty workspace and preserve its baseline hashes; an isolated clean checkout would omit the prior uncommitted fixes this task must validate. User explicitly authorizes direct safe local corrections and continuous execution.

Design: add seven nonunique all-row B-tree indexes on notes.chapter_id, purchases.user_id, quiz_tests.subject_id, videos.subject_id, wallet_ledger.referral_id/order_id/reverses_id. Existing active/status/source partial indexes cannot serve the demonstrated unqualified FK lookups. Two initial candidates (referrals.first_order_id and order_review_flags.order_id) already have sufficient non-null coverage and need no duplicate index. No financial DML or unique-index exception removal. Keep frozen release packages unchanged; the additive migration needs separate eventual review/delivery.

- [x] Add supabase/tests/fk-index-coverage.sql; reproduce seven missing index paths before implementation.
- [x] Generate a corrective migration with the temporary CLI and add seven plain indexes in one bounded transaction.
- [x] Apply to seeded existing data; require seven indexed plans, unchanged public-row fingerprints and identical functions/grants/RLS/policies.
- [x] Wire the SQL regression into supabase/tests/run-all.sh and repeat full clean replay/integration/concurrency after the change.
- [x] Record index-build lock/capacity/rollback limitations and migration-source hash; do not append it to the frozen 74-version package.

## Verified dependency correction

Full (including dev) npm audit exposed high findings in admin Vite6.4.3 and source-map-js1.2.1 hidden by the existing omit-dev CI check. Apply compatible dependency updates with lifecycle scripts disabled, preserve root dependency declarations unless a change is needed, inspect exact lockfile delta, run full advisory audit and admin build/tests, and include dev dependencies in the admin CI high-severity gate. Mobile5 and tooling9 moderate findings stay explicit because npm suggests unsupported major/downgrade changes, pending compatibility work.
