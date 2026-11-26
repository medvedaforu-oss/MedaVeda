# Question Paper executor remediation plan

Goal: prove a supported pinned CLI execution path and atomic schema/ledger writes locally.
Scope: only the new Question Paper migration and its audit evidence; no remote access,
staging, history repairs, historical edits, commits, pushes or deployment.

- [x] Record file/index baseline and exact original SQL checksum.
- [x] Reproduce the ledger failure using official Supabase CLI 3.2.0 and 85 local ledger rows; retain the 2.75.0 history rejection.
- [x] Rehearse a temporary candidate without BEGIN/COMMIT; retain the edit only after atomicity passes.
- [x] Test success, SQL/ledger failure, precommit and postcommit loss, duplicate skip,
      unchanged historical ledger, unchanged existing schema/data and one pending migration.
- [x] Run all 17 module commands, module SQL security/CASCADE checks and all 40 SQL suites
      against original and candidate; report existing failures without editing them.
- [x] Verify all unrelated file states/index and write GO/NO-GO evidence report.

Execution is inline. The rehearsal harness accepts no database URL/project and can only
create a disposable PostgreSQL 17.12 cluster. Historical files in its temporary package
must be byte-identical; they satisfy version comparison and must never execute.
Any ambiguous executor result stops that attempt; there is no retry loop. A dropped
success response must be reported as unresolved by the client even if an independent
local observer proves commit. Production remains outside this task.

Ruling: package byte-identical historical files to satisfy supported history comparison; only the Question Paper SQL executes.
Ruling: select official CLI 3.2.0 after 2.75.0 also failed on mixed-length version ordering. No historical renaming/repair.
Result: local remediation GO; production NO-GO. 17/17 commands PASS; 39/40 SQL suites on both artifacts; unchanged account_deletion_checks failure.
