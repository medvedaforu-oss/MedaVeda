# Test results and reproducibility

Date: 2026-11-11 UTC. P0 only. Local synthetic PostgreSQL/provider evidence; no production/staging connection, deployment, financial transaction, credential change, worker/schedule activation, Android build upload or payment activation. Existing approved artifacts and financial history were preserved. **Local verification is not production protection or acceptance.**


| Check | Command (from root unless specified) | Exit | Evidence | Scope/result |
|---|---|---|---|---|
| Full initial runner | `python3 evidence/run-initial.py` | 1 | [evidence/database-initial.log](evidence/database-initial.log) | O4/O7; socket compatibility; later partial harness output |
| Intermediate complete runner | `python3 evidence/run-database.py` | 1 | [evidence/database-rerun.log](evidence/database-rerun.log) | Exposed webhook terminal fixture and final-C recovery failure |
| Final complete applicable DB runner | `python3 evidence/run-database-acceptance.py` | 0 | [evidence/database-acceptance.log](evidence/database-acceptance.log) | 38 direct SQL groups; harnesses/concurrency/legacy migration; 25 webhook checks |
| Production-baseline MV003–MV006 | `python3 supabase/tests/run-mv006-local.py` | 0 | [evidence/mv003-006.log](evidence/mv003-006.log) | Baseline/fixed transitions, ownership, history, rollback, HMAC and SQL |
| Original/corrected A/C rehearsal | `python3 evidence/run-atomic.py` | 0 | [evidence/atomic.log](evidence/atomic.log) | 43 groups, 66→69→73, 126 preimages, drift/interruption/rollback/concurrency |
| New proof independent reproduction/fix | `python3 evidence/run-proof.py` | 0 | [evidence/proof.log](evidence/proof.log) | Old C3 refusal reproduced; D twice; history preserved; exact proof tests |
| New D ledger and pinned handlers | `python3 evidence/run-forward-ledger.py` | 0 | [evidence/forward-ledger.log](evidence/forward-ledger.log) | 73→74; exact source; rollback/refusal; actual pinned handler/SQL |
| P0 focused checks | `python3 evidence/run-checks-final.py` | 0 | [evidence/p0-final-check-results.json](evidence/p0-final-check-results.json) | 36 commands: 34 Node checks, mobile TypeScript, whitespace |
| Latest workspace/package regressions | `see p0-targeted-final-results.json` | 0 | [evidence/p0-targeted-final-results.json](evidence/p0-targeted-final-results.json) | Four runs with final helper/webhook/notification tests |
| Archive/type checks | `python3 evidence/validate-archives.py` | 0 | [evidence/archive-validation.json](evidence/archive-validation.json) | 22 extracted archives; source/archive/closure/JWT/lock/Deno checks |
| Additional Deno security/PDF tests | `deno test --cached-only --allow-env (four listed files)` | 0 | [evidence/additional-deno.log](evidence/additional-deno.log) | 21 passed, 0 failed |
| Historical backfill/referral concurrency | `python3 evidence/run-additional-sql.py` | Mixed initial | [evidence/additional-sql-results.json](evidence/additional-sql-results.json) | Three historical suites pass; curated Play runner first exit3 |
| Legacy Play independent corrected rerun | `bash supabase/tests/play_catalog_migration_legacy_selftest.sh` | 0 | [evidence/play-legacy-migration-final.log](evidence/play-legacy-migration-final.log) | Complete dependency chain and every existing assertion pass; included in final full suite |
| Frontend build | `node node_modules/expo/bin/cli export --platform web --output-dir /tmp/medveda-p0-web-dist` | 0 | [evidence/mobile-web-build.json](evidence/mobile-web-build.json) | Payments-disabled production source snapshot; dotenv/network service inputs excluded |
| Scoped package credential-pattern scan | `node scripts/scan-secrets.mjs --stdin` | 0 | [evidence/release-secret-scan.json](evidence/release-secret-scan.json) | Package files/source archives; no scoped findings; not full secret history audit |

All database runs use only `/tmp/medveda-p0-pg/socket`, port 55491, postgres, PostgreSQL 17.11 with TCP disabled. Run scripts explicitly allowlist PATH/local PG settings and omit hosted credentials; initial cluster start required sandbox escalation for Unix sockets, which was accepted. No automatic approval rejection occurred. Tools/environment failures remain in their original logs. Exact scripts here retain environment/commands/timeouts; package tests use relative injected paths required by the existing loader.

`p0-final-check-results.json`, `before-results.json`, `additional-deno.json`, `additional-sql-results.json`, `archive-validation.json` and individual run JSON files provide exact commands/exit codes. Initial standalone MV005 history invocation failed because it requires the fixture/socket supplied by run-mv006-local.py; the correctly invoked test passes there. Initial malformed-body mock and new loader-path failures were corrected and retained in logs, not counted as successful assertions. Before-source tests deliberately fail on the real defect and are expected negative evidence, not remaining failures.

Final complete suite: exit 0, **zero failing applicable suites, no skipped applicable test counted as passed**. The direct SQL groups plus independent historical/concurrency tests are the acceptance boundary. Retired suites under `tests/legacy/`, operator-only read-only diagnostics, hosted/staging/upload probes, native builds and genuine provider transactions are excluded with reasons in the database review; they are not PASS. The local provider-mode unit suite prints synthetic staging labels but performs no staging connection or credential load.

The main SQL runner previously ignored webhook exit status; it now requires actual successful completion. Batch1 retains SQLSTATE 23505/23502 checks. The runner fails on missing required tools and refuses nonlocal database hosts. The added final C/Play/profile/private-Storage/P0 SQL suites execute rather than being omitted.

Passed group/marker counts overlap. Neither 43 groups, 38 direct SQL suites, 25 webhook checks, 21 Deno tests nor any historical 228/163 markers establish end-to-end production acceptance. PostgreSQL roles/functions/triggers/transactions are real locally; Auth/Storage/cron services and payment/Google HTTP transports remain stubbed or synthetic. No managed Auth/Storage restore, genuine payment, live unlock, device acceptance, deployed schema cache or independent operational alert delivery was verified.
