# Complete local verification and limits

Date: 2026-11-11 UTC. P1 local only. Synthetic accounts/payments and isolated PostgreSQL; no production/staging calls, financial APIs, deployment, payment activation, cloud/native build, credentials upload or publication. Production purchases remain disabled. Local verification is not production acceptance.

**Final applicable local verification passes. Native/device/provider acceptance is NOT VERIFIED.**

| Group | Result / evidence |
|---|---|
| Final effective lightweight set | **101/101 command results PASS**, `evidence/final-check-results.json`. Original broad result: 98/99; stale MV008 push mock corrected and affected tests rerun. Final set merges unchanged passing checks with explicit final affected results, not a fabricated single all-green run. |
| Final affected rerun | **16/16 PASS**, `final-affected-results.json`: Auth/offline/MV008, push/router/hook, catalog/choice, Firebase, navigation, admin financial UI, push/P0 handler, mobile TypeScript, lint, whitespace. |
| Additional static/build/Edge set | **33/33 PASS**, `static-results.json`: Expo public/introspection/autolinking, payments-disabled web export, existing admin npm tests/admin noEmit, all 25 Edge entrypoints + PDF worker cached Deno checks, Deno security/catalog tests (19 passed). |
| Dependency checks | npm offline tree, root package/lock equality, installed Expo compatibility; 671 lock entries inventoried. No install or forced upgrade. |
| Bundle-validator fixtures | Eleven unittest methods plus denial subcases PASS in lightweight set; synthetic ZIP/XML/config only. |
| Full database runner | Exit **0**, `database.log` contains ALL SUITES PASSED: 38 direct SQL groups plus actual-handler local SQL/provider mocks, concurrency, legacy Play migration, HMAC and 25 webhook checks. |
| MV003–MV006 production-baseline fixture | Exit **0**, `mv003-006.log`; baseline defects reproduced and fixed behavior/history/security/concurrency verified. |
| Phase B | Final exit **0**, `phase-b-rerun.json` / `phase-b.log`, 228 overlapping PASS markers; exact local socket adaptation only for historical helper. |
| Phase C | Exit **0**, `database-results.json` / `phase-c.log`, 163 overlapping PASS markers; evidence writes redirected to P1, original prior inventories preserved. |
| Additional final CI regressions | **6/6 PASS**, `additional-final-results.json`: retained signature formula and remaining admin Auth/list/request/settings/batch regressions. |
| Final-source web export | Exit **0**, `final-web-build.json` / `.log`; rebuilt after final Auth/router edits, exact source inventory pinned. |
| P0 frozen checksum integrity | **38/38** entries PASS, `p0-package-checksums.json`; all 322 source archive members also checked against current source hashes. |
| P0 preservation | All earlier audit/report/release/migration bytes unchanged; no prior file deleted. Current P0 notification/reversal and final-schema proof tests PASS. |
| Scoped source scan | Source archive allowlist scanned with repository secret scanner; exit 0. Pattern scan is not full secret-history/credential-rotation certification. |

The complete database suite executes current migration 74's proof on the full local chain. Exact 66→69→73→74 wrapper rehearsal is retained P0 evidence, not relabeled as a fresh P1 exact-wrapper run. No financial SQL changed in P1; actual baseline A/B/C and final all-migration regressions were freshly run.

Failure ledger:

1. Initial extra standalone Phase B/history/B-to-C harness calls failed their explicit fixture guards. They need the PostgreSQL setup supplied by Phase B/atomic runners, not a standalone Node invocation. Original failures retained in `initial-checks/`; Phase B runner executes its intended cases. No assertion was removed to make them pass.
2. PostgreSQL startup/socket access was sandbox-blocked; approved local escalation started only the new /tmp cluster with TCP disabled. Initdb default user lacked the expected postgres role; role created only there. Setup-failure logs retained. No automatic review rejection occurred.
3. Phase B historical extra helper only allowed an older socket prefix. Evidence-only copy allows exactly the new P1 socket, retains every ACL/lock/rollback assertion and passes. Frozen previous helper is unchanged.
4. Before-fix push registration returns a token after A→B; before-fix Play storage race launches one extra native request; before-fix admin analytics truncates; before-fix push delivery overcounts rejected tickets. Reproductions retained in `*-before.log`.
5. New test setup needed ES-module-shaped Constants, the new Auth cancellation hook, deferred-timer completion, and an explicit synthetic process/env in the catalog fixture. These are harness fixes; assertions remain. The intermediate MV008 failure and final rerun are retained. New navigation logger mock models the added caught promise path.

Reproduction scripts in evidence use explicit env allowlists, offline Expo/no dotenv/telemetry, cached Deno checks, and only `/tmp/medveda-p1-pg/socket`, port 55493, PostgreSQL 17.11. Provider/Auth/FCM/Google transports are synthetic; no genuine financial or device token API was contacted. Phase B/C use actual PostgreSQL roles/triggers/RLS/transactions with stubbed managed services. Counts overlap and are not production transaction counts.

Excluded/not PASS: native Gradle compilation, online dependency advisory audit/uncached doctor installation, device/emulator/browser runtime acceptance, genuine provider/native choice/reporting, hosted Auth/Storage, staging/operator/live diagnostics and publication. The staging config-only fixture was excluded from this task's selected set; no staging service was contacted. Retired SQL suites and production read-only diagnostics were not substituted for current-schema acceptance. Actual WebView/background/reinstall/FCM behavior remains on the acceptance matrix.

Safe entrypoints: `python3 evidence/run-checks.py`, `python3 evidence/run-final-affected.py`, `python3 evidence/run-static.py`; the database runner requires the isolated cluster and its explicitly allowed socket. Do not run earlier P0 orchestration scripts in place: many write their original evidence paths. P1 copied only required adapters and preserved all earlier outputs. Rerunning an evidence writer replaces that writer's own P1 logs; preserve the original run if repeating later.

The disposable cluster was stopped after verifying TCP disabled/no other clients. The webhook harness retained its own synthetic `ap_wh`; initial cleanup refused it, then a narrowly allowlisted cleanup removed only that database and stopped the P1 cluster. See `local-database-cleanup.json` and `cleanup-first-attempt.txt`. No other environment was touched.
