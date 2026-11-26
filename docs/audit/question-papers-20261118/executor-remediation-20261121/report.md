# Question Paper executor blocker remediation — 2026-11-21

**GO for this local remediation and the rehearsed executor/package combination. NO-GO for production execution.** Only the new Question Paper migration was changed: two transaction statements removed. The pinned supported CLI now executes this one pending migration and records its exact version atomically in the local fault tests. One unchanged baseline SQL suite still fails; hosted/runtime/device and recovery acceptance remain open. No production or staging connection, migration, history repair, deployment, commit or push occurred. Production project `xbvenkfmesugrbjuufyw` was never passed to any tool.

## Root causes and supported executor

1. A one-file package omits the 85 versions present in the ledger. CLI 2.75.0 rejects missing local versions before executing SQL; `--include-all` concerns unapplied local migrations and does not bypass missing historical files. The previous [one-file rehearsal](../executor-verification-20261121/report.md) retains that proof.
2. Including the exact historical files exposed a second 2.75.0 defect: full filenames sort `20260801150000_…` before `20260801_…`, whereas ledger versions sort `20260801` first. The merge falsely reports that version missing. [Fresh local rejection](cli-2.75-history-rejection.log). This is the vendor's documented [version-ordering bug and fix](https://github.com/supabase/cli/pull/6038).
3. An explicit SQL `COMMIT` ends the module transaction before the CLI inserts the migration-ledger row. CLI 3.2.0 recognizes authored transaction control and runs that file sequentially, preserving the same unsafe boundary. The original file again produced both module tables and bucket, **zero target ledger rows**, after injected ledger failure. [Original red test](original-atomicity-red.log), [observed database state](original-results.json).

Selected executor: official **Supabase CLI 3.2.0**, Linux amd64, [released November 16, 2026](https://github.com/supabase/cli/releases/tag/v3.2.0), using the supported `migration up` command and explicit connection target. Help was inspected before use. The local harness invokes `migration up --remote=postgresql://postgres@127.0.0.1:<disposable-port>/<disposable-database>?sslmode=disable --workdir=<temporary-package> --yes`. Here `--remote` is CLI syntax for an explicit URL; every actual endpoint is literal loopback. There is no hosted project link or token.

The package contains a minimal config with seed disabled and no vault secrets, **85 byte-identical historical migration files plus the single candidate**. The historical files satisfy the CLI's version comparison; they are skipped. They are neither renamed nor edited, and no placeholders, alternate ledger, history repair or bespoke migration executor is used. This changes the package from physical one-file isolation to **one pending migration** under the supported history-aware workflow. Only `20261118172019_question_papers.sql` is printed as applying. Historical hashes are in [candidate-results.json](candidate-results.json).

The [pinned command handler](https://github.com/supabase/cli/blob/v3.2.0/apps/cli/src/commands/migration/up/up.handler.ts) sorts by migration version and applies only pending paths. The [pinned migration implementation](https://github.com/supabase/cli/blob/v3.2.0/apps/cli/src/command-internal/migration-apply.ts) adds the ledger INSERT to the final batch. The [driver](https://github.com/supabase/cli/blob/v3.2.0/apps/cli/src/command-internal/db-connection.sql-pg.layer.ts) sends its extended-query operations with one final Sync, returns errors and does not replay a submitted batch. All remaining statements in this specific migration are transactional; there is no nontransactional directive or pipeline-incompatible operation to split that batch. Removing BEGIN/COMMIT is proven safe for this exact artifact/executor combination, not a general guarantee for arbitrary SQL or runners.

The [ledger implementation](https://github.com/supabase/cli/blob/v3.2.0/apps/cli/src/command-internal/migration-history.ts) probes for `version`, `name`, and `statements` and skips ledger setup DDL when provisioned. Rehearsal uses that existing three-column ledger shape. An absent/partial/different ledger would need a fresh review; this task does not authorize provisioning or changing production resources.

## Exact product edit and hashes

`supabase/migrations/20261118172019_question_papers.sql`: delete only standalone `begin;` and `commit;`. All 28 remaining parsed statements are unchanged, including CASCADE, policies, privileges, functions and private bucket settings. Version **20261118172019** and name **question_papers** are unchanged. No historical or protected-module implementation was edited.

| Artifact | SHA-256 |
| --- | --- |
| Original migration | `6811f8573487c4d0e4f55716a7cbb1051f2ac2d0f8189165178a585b54ce9359` |
| Updated migration | `b1f68f73136b296abc74d61129836808143c1a218ee0cef2603e08e6ca07771f` |
| Official 3.2.0 archive | `fb88b175a817563505be02c60872060bcb8d5c869a1aa5656eaeb085d4a2f1e4` |
| Extracted CLI executable | `0ed73393ce16dc967c1cafe824929bd97c8d11de0a5bc41e174710858860d1fe` |

Archive checksum matched the official release checksum file. No repository dependency was installed or changed. The ledger stores version/name/parsed statements, not this file checksum; artifact verification remains necessary.

## Local atomicity and isolation evidence

[rehearse.py](rehearse.py) accepts only a CLI path and original/candidate mode; it has no project, credential or database-URL input. It uses a temporary empty HOME and credential-free allowlisted environment. All databases were disposable **PostgreSQL 17.12 (Debian 17.12-1.pgdg13+1)**. The candidate must match the working-tree migration byte-for-byte. Six databases each start with the cached 85-version/name inventory from November 19. Their original historical rows, including NULL synthetic statement arrays, are identical before/after every attempt; this is a simulated ledger, not a fresh production inventory.

| Candidate scenario | CLI exit | Module tables/bucket | Target ledger |
| --- | --- | --- | --- |
| Success | 0 | Both tables and private bucket present | One exact version/name, 28 statements |
| Duplicate attempt after confirmed success | 0 | Preserved; no migration reapplied | Still one |
| SQL failure near end: bucket collision | 1 | Both new tables rolled back; fixture bucket preserved | Absent |
| Ledger insertion trigger raises exception | 1 | Both tables and module bucket rolled back | Absent |
| Connection terminated at DDL barrier | 1 | Rolled back | Absent |
| Connection terminated inside ledger insertion | 1 | Rolled back | Absent |
| Responses suppressed; connection closed after server's final ReadyForQuery | 1 | Both tables and private bucket committed | One |

Faults use observed server barriers, not arbitrary delays. The proxy forwards requests unmodified, suppresses replies starting at the batch's bucket INSERT response, drains the final ReadyForQuery and closes the socket. Independent observer queries prove the committed state after this client error. No second invocation follows that ambiguous attempt. The duplicate test is against an independently confirmed successful database, not a retry of an ambiguous outcome.

**No schema-only commit occurs on candidate ledger insertion failure.** Module presence and ledger presence agree in all six databases. Existing schema, ACL/RLS settings, functions, policies, nonmodule buckets, payment sentinel data and ledger table definition are fingerprinted around each attempt. The 85 existing ledger rows are unchanged. All CLI applying messages name only the reviewed migration. The minimal executor fixture does not contain the full historical application schema; success would not be possible if its historical SQL were replayed indiscriminately.

A connection error remains ambiguous. **Stop on every executor error, disable job/operator retries, and preserve the result as unresolved.** Ignore the CLI's generic suggestion to rerun with debug until an independent read-only reconciliation establishes the final session, exact ledger statements and complete object definitions. A committed result must not be replayed. An unreadable/mismatched result stays NO-GO. No history repair, automatic cleanup or recovery write is implemented or authorized here.

## Security and module verification

`python3 scripts/question-papers-verify.py`: **17/17 PASS on the original and 17/17 PASS on the edited candidate**. Commands and exit codes match. Raw output is retained in [original-module-results.json](original-module-results.json) and [candidate-module-results.json](candidate-module-results.json).

| Command | Original | Candidate |
| --- | --- | --- |
| `python3 scripts/question-papers-scope-check.py` | PASS | PASS |
| `node admin-panel/scripts/question-papers-selftest.cjs` | PASS | PASS |
| `node admin-panel/scripts/question-papers-ui-selftest.cjs` | PASS | PASS |
| `node admin-panel/scripts/question-papers-form-selftest.cjs` | PASS | PASS |
| `node mobile-app/scripts/question-papers-selftest.cjs` | PASS | PASS |
| `node mobile-app/scripts/question-papers-ui-selftest.cjs` | PASS | PASS |
| `node mobile-app/scripts/question-papers-download-selftest.cjs` | PASS | PASS |
| `node mobile-app/scripts/question-papers-lifecycle-selftest.cjs` | PASS | PASS |
| `node mobile-app/scripts/question-papers-web-preview-selftest.cjs` | PASS | PASS |
| `node mobile-app/scripts/navigation-lazy-selftest.cjs` | PASS | PASS |
| `node mobile-app/scripts/audit-navigation-selftest.cjs` | PASS | PASS |
| `node mobile-app/scripts/pdf-lifecycle-selftest.cjs` | PASS | PASS |
| `node mobile-app/scripts/pdf-remote-retry-selftest.cjs` | PASS | PASS |
| `node supabase/tests/question-paper-access-selftest.cjs` | PASS | PASS |
| `npm test --prefix admin-panel` | PASS | PASS |
| `node mobile-app/node_modules/typescript/bin/tsc -p mobile-app/tsconfig.json --noEmit --pretty false` | PASS | PASS |
| `node admin-panel/node_modules/typescript/bin/tsc -p admin-panel/tsconfig.app.json --noEmit --pretty false` | PASS | PASS |

`python3 supabase/tests/question-papers-local.py --regression`: **PASS, exit 0** after the edit. [Full output](module-sql.log) verifies anonymous metadata privilege and PDF-read denial, private bucket, a student seeing published papers with **no purchase**, draft/inactive/unpublished denial, existing MFA enforcement, subject deletion for empty/published/draft cases, retention of private PDF objects/receipts, unchanged unrelated rows and definitions/grants/policies/functions/buckets, duplicate-save race with exactly one winner, overlapping Admin edits and stale-write rejection. Five existing SQL regression suites also pass. No protected security implementation changed.

## All 40 SQL suites and original comparison

[regressions.py](regressions.py) reconstructs the unchanged historical schema **only as test-fixture construction in disposable databases**, then tests the exact original/candidate SQL, separately from the executor package. The executor fault rehearsal itself never runs historical SQL. This distinction is essential: no already-applied historical migration is replayed against an existing environment. The suite names, order and pass/fail rules are taken from the three SQL loops in the unchanged `supabase/tests/run-all.sh`; all 40 run after the product edit. [Detailed outputs](sql-results.json), [comparison log](sql-comparison.log).

**Original 39/40 PASS; candidate 39/40 PASS. All 40 per-suite exit/result pairs are identical.** Both also pass separate Question Paper authorization/CASCADE checks, and both preserve the historical schema/security fingerprint. The unchanged failing suite is `account_deletion_checks`: `FAIL delete_my_account wrapper missing or exposed to anon`. Its legacy signed-in wrapper expectation conflicts with the existing revocation. Its psql exit is 0, but the printed FAIL is correctly classified as failure. No change was made to that suite or implementation.

The older subject-delete report recorded 38/40 including `low_grants_checks`. This fresh exact starting artifact instead yields **0 FAIL, 19 PASS** for `low_grants_checks` on both versions. This session did not repair a baseline failure; current original-hash evidence is authoritative for this comparison. The broad runner's extra Edge Function/payment/concurrency harness section was not rerun as a whole. The requested 40 SQL suites, 17 module commands and dedicated module SQL/concurrency harness were run; this is not a claim that full `run-all.sh` passed.

| SQL suite | Original | Candidate |
| --- | --- | --- |
| `play_catalog_queue_regression_checks` | PASS | PASS |
| `play_catalog_failure_access_checks` | PASS | PASS |
| `play_duplicate_settlement_checks` | PASS | PASS |
| `f7_checks` | PASS | PASS |
| `f8_checks` | PASS | PASS |
| `batch1_checks` | PASS | PASS |
| `batch3_checks` | PASS | PASS |
| `batch3b_checks` | PASS | PASS |
| `phase2_referral_wallet_checks` | PASS | PASS |
| `referral_limits_checks` | PASS | PASS |
| `referral_off_wallet_checks` | PASS | PASS |
| `high_phone_and_notes_checks` | PASS | PASS |
| `medium_db_checks` | PASS | PASS |
| `low_grants_checks` | PASS | PASS |
| `admin_mfa_checks` | PASS | PASS |
| `ucb_checks` | PASS | PASS |
| `verified_content_checks` | PASS | PASS |
| `account_deletion_checks` | **FAIL** | **FAIL** |
| `critical_fixes_checks` | PASS | PASS |
| `app_config_checks` | PASS | PASS |
| `null_year_fallback_checks` | PASS | PASS |
| `course_wide_browsing_checks` | PASS | PASS |
| `course_year_profile_checks` | PASS | PASS |
| `readiness_validation` | PASS | PASS |
| `content_publication_checks` | PASS | PASS |
| `quiz_answer_and_admin_mfa_checks` | PASS | PASS |
| `payment_queue_checks` | PASS | PASS |
| `referral_switch_off_paths` | PASS | PASS |
| `play_catalog_sync_checks` | PASS | PASS |
| `play_payment_pg_checks` | PASS | PASS |
| `play_entitlement_snapshot_checks` | PASS | PASS |
| `razorpay_snapshot_retry_checks` | PASS | PASS |
| `notes-choice-checkout` | PASS | PASS |
| `billing-settlement-recovery` | PASS | PASS |
| `nonplay-test-isolation` | PASS | PASS |
| `phase-c-contracts` | PASS | PASS |
| `phase-c-play-duplicates` | PASS | PASS |
| `p0-classified-reversal` | PASS | PASS |
| `fk-index-coverage` | PASS | PASS |
| `audit-checkout-publication` | PASS | PASS |

## File inventory, preservation and review

The exact session-created/modified file list and SHA-256 hashes are in [change-manifest.json](change-manifest.json). Product edit: the one new migration above. Other additions: this audit evidence directory and `docs/superpowers/plans/2026-11-21-question-paper-executor-remediation.md`. No pre-existing audit document or test harness was edited.

[preservation.json](preservation.json) compares all 3,158 starting file states, with only the new migration permitted to differ, and checks the Git index hash. Pre-existing deletions stay deleted; unrelated edits remain byte-identical. The original SQL is retained as evidence in [original.sql](original.sql). A read-only independent review found no blocking defects and confirmed the two-line scope, pinned transaction mechanism, fault outcomes and result counts. Its conclusion is limited to local fixtures.

Initial sandbox socket restrictions required execution with local-socket access; no automatic approval rejection remained. Public release/source downloads were the only external setup accesses. No credentials were printed or included in this package. Temporary clusters were stopped and removed.

## Remaining blockers and recommendation

- **The two local executor blockers are remediated** for the pinned CLI 3.2.0 history-aware package and exact updated checksum. A physical one-file package is still incompatible with a populated history; use the tested supported history-aware comparison, not a bypass.
- The unchanged account deletion SQL suite remains red. No unrelated baseline failure was modified. A green full regression/release claim is not available.
- No actual production prerequisites, ledger shape/current contents, connection route/pooler, event triggers or permissions were inspected in this task. Hosted Storage HTTP, gateway/runtime, browser/native device acceptance and prior backup/restore/recovery gates remain unverified. Existing historical filename/name discrepancies remain unchanged.
- No concurrency lock for simultaneous migration operators is demonstrated. A future operation needs one operator/job and no automatic retry. Successful duplicate skipping does not provide concurrent-executor serialization or checksum validation.
- A lost acknowledgement can leave a successful commit despite CLI failure. Automatic retry is unsafe; ambiguous results require read-only reconciliation and separate authorization for any corrective write.

**GO: retain the minimal local edit and its reproducible evidence. NO-GO: production migration/deployment.** No production execution was performed or requested for approval. Work stops after this report.

Reproduce locally with PostgreSQL 17.12 and the verified CLI binary:

```bash
python3 docs/audit/question-papers-20261118/executor-remediation-20261121/rehearse.py /tmp/qp-cli-3.2.0/supabase candidate
python3 docs/audit/question-papers-20261118/executor-remediation-20261121/regressions.py
python3 scripts/question-papers-verify.py
python3 supabase/tests/question-papers-local.py --regression
```

Original mode intentionally fails its atomicity assertion after recording the split state. These are local rehearsal/test tools, not a production runner.
