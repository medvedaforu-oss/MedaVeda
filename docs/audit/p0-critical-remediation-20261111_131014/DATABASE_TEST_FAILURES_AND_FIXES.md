# Database failures and fixes

Date: 2026-11-11 UTC. P0 only. Local synthetic PostgreSQL/provider evidence; no production/staging connection, deployment, financial transaction, credential change, worker/schedule activation, Android build upload or payment activation. Existing approved artifacts and financial history were preserved. **Local verification is not production protection or acceptance.**


The latest full applicable local runner **passes**: `bash supabase/tests/run-all.sh`, exit **0**, 38 direct SQL suite groups plus edge, concurrency, legacy migration and HMAC harnesses. `evidence/database-acceptance.json` records command/exit/time; `.log` records all suite summaries. Every migration builds from the retained stub, chronological SQL and synthetic seed. This is PostgreSQL 17.11 with local Auth/Storage/cron stubs, not managed Supabase acceptance.

## Failure classification and disposition

| Failure / exact assertion | Classification and root cause | Correction and independent verification |
|---|---|---|
| Initial run exit 1, batch1 O4/O7: `Successful purchase ownership already exists`; 2 FAIL,76 PASS | Test fixture/expectation defect. O4 matches obsolete wording; O7 collides with existing success before NOT NULL validation | O4 requires duplicate rejection and SQLSTATE 23505. O7 uses independently unowned product and requires NOT NULL/23502. No trigger/RLS disabled. Final batch1 0 FAIL,78 PASS |
| Nine non-Play Deno tests: `Disposable localhost test database required` | Environment/tooling guard supports only literal /tmp, not explicit nested Unix socket | Adapter accepts bounded /tmp socket paths and tight scratch database names; never accepts remote host. All nine tests execute and pass |
| Notes concurrency Python line 3 AssertionError | Same local socket allowlist mismatch | Permit explicit /tmp/ socket; retain scratch name and two-session assertions; full suite passes |
| Webhook initially reported PASS after later nonzero crash | Runner defect: counted PASS markers but ignored child exit | Require exit 0 and zero FAIL markers, plus positive tests; incomplete harness now fails. Missing tools fail rather than silently skip |
| Real webhook fixture attempts chargeback→success and refunded→paid reset | Schema incompatibility/test fixture defect: MV005 correctly rejects terminal transition | Create a new legitimate synthetic order/payment for full-refund case, preserving chargeback history. Final real webhook harness 25 checks PASS |
| Early partial-refund/won-dispute recovery fails `Razorpay entitlement not committed` | **Real SQL contract defect**: C2 permits verified nonblocking facts, final C3 rejects all pending reversal facts, rolling back settlement | Add forward D migration; independently reproduce on old C3 (`classified-before.log`), apply twice with unchanged history, pass regression and actual webhook→SQL recovery |
| Legacy Play migration runner exit 3: missing `public.quote_my_order_legacy(text,boolean)` in November 4 SQL | Migration-order/dependency defect in curated harness: deliberately skips October 14 prerequisite migrations | Restore full local migration chain, retain all legacy preservation assertions; independent rerun exit 0 and integrated final suite passes |
| Play malformed-body harness unexpected notesChoiceGate import | Incomplete test mocks, no demonstrated handler bypass | Add explicit synthetic enabled gate/closure mocks; malformed/null/array/scalar JSON still rejects before mutation; check passes |
| Standalone mv005-history check without socket/fixture fails guard | Invalid invocation/environment defect, not a product regression | Run through run-mv006-local.py with its real historical fixture; full test executes and passes. Initial failure retained |
| Original C wrapper matching preimage rejected, then FOREACH parse error | SQL wrapper identity/syntax defects, already corrected separately | Exact unmodified/hash-only reproductions roll back; separately corrected wrapper passes. Original files unchanged |
| First new loader-path attempts fail ENOENT | New evidence-harness path defect | Correct relative injected roots; preserve path-error logs; repeat original-source reproductions to actual expected assertions and pinned-package tests to PASS |

The former referral P10/H5 variation did not reproduce in repeated full current-chain runs; historical referral/concurrency fixtures also pass. No query/order/authorization rule was changed to suppress it. No failed assertion was removed or skipped. Additional initial/final logs remain available rather than overwritten with a green-only narrative.

## Contract verification

A/C exact wrappers test 66→69→73, function/ledger drift rejection, ledger source identity, four forced rollback points, failed index creation, lock timeouts, interrupted precommit client, observer visibility, known-success retry refusal and all-public-table preservation. New D separately tests 73→74, missing gates, forced failure after function and ledger, exact source insertion on commit, unchanged public rows and retry refusal. Missing/unknown commit outcomes are never assumed applied.

MV003–MV006 cover transactional rollback, provider/order uniqueness, advisory-lock order, READ COMMITTED freshness, same-order conflict coalescing, restoration races and historic access. Final RLS/grants/search paths/definer ACLs are inventoried in `p0-final-functions.json`, `atomic/final-acls.json`, `atomic/final-triggers.json`. D replaces only one function, preserving its fixed path/service-only grants.

Discovery covers 140 test/support files in `test-discovery.json`. Retired `tests/legacy/` suites are not applicable current-schema acceptance. Production read-only diagnostics, hosted quiz/PDF probes and staging/upload scripts are operator/external procedures, not isolated regression suites; they were not executed or counted as passed. Historical seed/verify and batch3b/referral race tests ran on their intended synthetic pre-migration schemas. No staging endpoint was contacted.
