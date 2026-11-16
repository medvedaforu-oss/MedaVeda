# Isolated Razorpay gate verification — 2026-11-16

Local security regressions passed. No deployment or payment activation was performed or authorized. Final disabled-gate deployment readiness remains conditional on checking the target's schema/RPC contracts and disabled configuration; those hosted checks are outside this local-only verification.

## Scope and evidence

No hosted database connection, remote write, hosted migration, Edge deployment, secret inspection, APK build or real provider request was used. Provider/Auth values are synthetic fixtures. Deno handler tests have no network permission and use cached dependencies. PostgreSQL ran in a newly initialized cluster with an empty TCP listen address and a private Unix socket under `/tmp`. Cluster identity and the absence of application databases were asserted before fixture initialization. Fixture databases were dropped and the server stopped after testing.

Evidence directory: `docs/audit/evidence/nonplay-verification-20261116/`.

- `results.json`: exit codes and elapsed times for 51 individual mobile suites, 14 database-free Edge suites, five Deno programs, the 17-test gate suite, and both type checks. Initial cluster setup entries belong to an interrupted earlier database attempt, not a completed database verification.
- `database-results.json`: final PostgreSQL SQL/handler suite exits and successful server shutdown.
- `database-identity-final.json`: verified fresh cluster identity, private socket, disabled TCP and initial database inventory. This identifies a disposable fixture, not the production project.
- `mobile-aggregate.log`: successful `30/30 closed-testing suites passed` run, exit 0 outside the sandbox's Node child-spawn restriction.
- `nonplay-local.log`: completed repeatability subprogram, including `conflict_cases: 32`; its parent was interrupted before handler verification. It is not counted as a complete `run-nonplay-test-local.py` pass.
- Named `.log` files contain individual test output. Logs are local generated artifacts ignored by the repository's existing log rule; JSON verdicts and this report provide the reviewable record.
- `changed-files.txt`: complete working-tree file inventory plus generated evidence paths, including pre-existing work.

## Four failing Edge suites

These scripts are suite names; their prerequisite failures occurred before any named behavioral assertion executed.

| Exact file / suite | Original error and root cause | Classification / payment-gate causation | Resolution and current result |
| --- | --- | --- | --- |
| `supabase/tests/phase-b-handlers-selftest.cjs` | `AssertionError [ERR_ASSERTION]` at `assert.ok(process.env.PGHOST?.startsWith('/tmp/'))`; the direct invocation lacked the required local fixture socket/database. It also requires `PGDATABASE` matching `^mv003_[0-9a-f]+$`. | Environment prerequisite; not caused by the isolated gate. This suite loads retained Phase B functions. | Initialized a separate synthetic baseline with MV003/MV005/MV006 SQL, supplied a verified private socket and disposable database. PASS, exit 0. |
| `supabase/tests/b-to-c-handlers-selftest.cjs` | Same `PGHOST` prerequisite assertion; also requires a `mv003_` database with Notes choice/recovery contracts. | Environment prerequisite; not caused by the isolated gate. | Separate fixture with the baseline, MV003/MV005/MV006, Notes choice, recovery and final commitment SQL. PASS, exit 0. |
| `supabase/tests/audit-batch1-selftest.cjs` | `AssertionError [ERR_ASSERTION]: local host required`; its fixture requires an explicit local socket and `WH_DB` matching `^audit_batch1_`. | Environment prerequisite; not caused by the isolated gate. | New fixture with the repository migration chain and seed. Ran the exact suite directly, without unrelated archived-metadata assertions in wrapper runners. PASS, exit 0; `0 failing batch regression groups`. |
| `supabase/tests/phase-c-gates-selftest.cjs` | `AssertionError [ERR_ASSERTION]: Unexpected import ../_shared/newOrderGate.ts`. The production entrypoint already imports that helper, but the test's explicit module map omitted it. Reproduced before editing. | Test fixture defect; not introduced by the isolated handler change. | Load the real shared helper and supply a settings-read fixture. Preserve existing policy/Auth denials and add production-sales false/error cases; creation refuses with `sales_disabled`, while existing token attachment retains its prior behavior. PASS, exit 0. |

No additional production source defect was demonstrated. Production payment authorization was not relaxed to make a fixture pass.

## Eight timed-out mobile checks

Every historical timeout was exit 124 after the external 30-second deadline. Except for the reported Notes PASS line, no assertion failure or application exception was recorded. The exact historical reason the processes exceeded that deadline cannot be recovered from those verdicts. Do not describe CPU, memory, timers or the new gate as a proven cause. The environment/resource category is provisional for those historical timeouts; no deterministic source/test defect reproduced. All eight passed without source edits under a single sequential runner with a 120-second per-script limit, and then passed within the complete aggregate.

All paths below are under `mobile-app/scripts/`.

| Exact script | Exact test names / output identifying the check | Individual rerun |
| --- | --- | --- |
| `auth-recovery-selftest.cjs` | `startup rejection/error → visible retry → onboarding; auth transport timeout/caller cancellation; content transport unchanged` | PASS, 0.87 s |
| `login-network-selftest.cjs` | `slow login single flight, network/503/429 do not count as bad passwords, wrong credentials count, retry succeeds, late unmounted login cannot redirect` | PASS, 0.42 s |
| `auth-state-race-selftest.cjs` | `late initial session and blocked-account response cannot replace/sign out a newer account` | PASS, 0.42 s |
| `deep-link-selftest.cjs` | `Cold/warm link ordering, delayed initial read, cleanup and rejection passed` | PASS, 0.37 s |
| `course-state-race-selftest.cjs` | `save fetches a new profile and ignores a pre-save response arriving after it`; `pre-save success cannot publish state or clear the pending post-save read`; `pre-save error cannot publish state or clear the pending post-save read` | PASS, 3 tests, 0.42 s |
| `course-year-selection-selftest.cjs` | `course/year visibly select, save accepts 204, and state survives reload`; `204 with zero profile rows stays on the picker and can retry after server repair`; `204 with unchanged year stays on the picker and retry navigates only after confirmation` | PASS, 3 tests, 0.92 s |
| `course-year-confirmation-selftest.cjs` | `save rejects 204 followed by missing profile, even with matching cached state`; `save rejects 204 followed by missing year, even with matching cached state`; `save rejects 204 followed by wrong year, even with matching cached state`; `save rejects 204 followed by wrong course, even with matching cached state`; `verification read failure cannot use a matching cached choice as proof of save` | PASS, 5 tests, 7.65 s |
| `notes-entitlement-selftest.cjs` | `paid note local restriction, authorized opening/reopening with fresh links, and authoritative server denial despite a stale unlocked route` | PASS, 0.52 s |

Payment-gate causation: none demonstrated for any of these eight. These UI/Auth/course fixtures passed unchanged, and the isolated Edge gate is not exercised by them. The 7-second confirmation retry path is expected fixture behavior, not a payment-gate regression.

The aggregate's distinct error was reproduced: `spawnSync /usr/local/bin/node EPERM`, including all 30 attempted children in the sandbox rerun. This is an execution-environment restriction on synchronous child spawning. Running the same aggregate with only `PATH` inherited, outside that restriction, returned exit 0 and 30/30. No test assertions or security checks were removed.

## PostgreSQL environment and safe reproduction

Existing `run-nonplay-test-local.py` and repeatability helpers already create/drop uniquely named disposable databases, build Supabase stubs and apply repository SQL locally. The earlier interpretation that fixture migrations were entirely prohibited was too restrictive: this request prohibits migrations on hosted Supabase and explicitly permits verified disposable local fixtures.

Available prerequisites were PostgreSQL/pg_dump 18.7, Python 3, Node 22.23.1, Deno and cached dependencies, plus installed mobile TypeScript dependencies. Docker was not needed. Initial disk checks showed about 9.4 GiB free in the workspace and 3.0 GiB in `/tmp`; neither blocked testing.

The sandbox initially refused PostgreSQL's socket with `could not bind Unix address ... Operation not permitted`. Authorized elevated local execution resolved it. One automatic permission review timed out before execution; its permitted retry succeeded. This was not a policy rejection. There is no outstanding permission request.

From the repository root:

```sh
python3 supabase/tests/verify-nonplay-regressions-local.py
node mobile-app/scripts/closed-testing-selftest.cjs
deno test --cached-only supabase/tests/nonplay-create-gate-test.ts
```

The first command requires `pg_config`, `initdb`, `pg_ctl`, `psql`, Node, Deno and the existing cached dependencies. Run as a non-root OS user. It discovers the PostgreSQL binary directory, creates its own fresh cluster/private socket, ignores inherited PostgreSQL/service/payment credentials, verifies identity, initializes synthetic fixtures, runs suites sequentially, drops only its own database names and stops its server. It accepts no hosted database target. Its trust-authenticated socket is inside a private temporary directory; TCP is disabled. The temporary data directory is left stopped for inspection and may be removed after reviewing results. If a restricted environment rejects sockets or Node spawning, grant only this local execution capability; do not substitute a hosted Supabase URL.

## Security results

| Requirement | Verified result |
| --- | --- |
| Production shared gate remains disabled | Actual helper refuses false/errored settings in Phase C. Real PostgreSQL `purchase_settings.new_orders_enabled=false` is required before the isolated purchase test and included in its before/after fingerprint. Hosted state was not queried or changed. |
| Dedicated gate fails closed | 17 actual-handler tests pass. Missing, false, empty, malformed, whitespace/case variants and unavailable reads refuse before body/database/provider work. |
| Authorized isolated orders with production sales disabled | Real handler + PostgreSQL integration passes with the false production fixture; the isolated adapter rejects every non-isolated table/RPC access. |
| Recovery and refunds while creation is disabled | PostgreSQL test `dedicated create gate OFF preserves owned verification, recovery and refund processing` passes for missing/false/malformed values; refund replay revokes once and stale capture cannot regrant. |
| Wrong owner/signature/payment/amount/currency/provider bindings | Actual isolated handler/provider/HMAC tests and PostgreSQL rejection tests pass; entitlement count remains zero. Historical Phase B/B-to-C rejection regressions also pass. |
| Webhook replay | Identical valid delivery is acknowledged idempotently with no new provider read or duplicate entitlement; conflicting reuse of the event ID is rejected 409; forged webhook signatures are rejected 401. A blanket rejection of legitimate identical retries is neither implemented nor required for security. |
| Financial isolation | SQL and handler fingerprints of production-lane fixture orders, payments, purchases, products, wallet, referrals, discount reservations, provider inbox/captures remain unchanged; handler fingerprint also covers the production sales setting. No production database was touched. |
| RLS/storage/service privilege isolation | Real local SQL verifies forced RLS, no client table grants, service-only RPCs and restrictive private-bucket policy, including denial despite a permissive probe policy. |
| Concurrency and ambiguous provider responses | One provider CREATE under concurrent requests; receipt recovery after a lost response; concurrent callback/webhook settlement grants once. |

## Complete results and limits

- PASS: 17 gate tests; 10 real-PostgreSQL isolated handler tests; isolated SQL security/isolation script; 32 repeatability conflict cases plus its replay/concurrent-install/RLS/rollback checks.
- PASS: all 17 requested broader Edge suites (14 database-free suites and the three individually initialized PostgreSQL suites).
- PASS: five Deno regression programs; 51 distinct mobile scripts, including every previously timed-out script; mobile aggregate 30/30 (overlapping those scripts, not 30 additional distinct suites).
- PASS: mobile TypeScript check; Deno check for all five isolated entrypoints and the integration test; final whitespace validation.
- Historical failures resolved: four Edge suite invocations and the aggregate execution restriction. Eight historical timeouts no longer reproduce; their underlying historical resource bottleneck remains unproven.
- INTERRUPTED, not counted as a full pass: the earlier complete orchestration and `run-nonplay-test-local.py` parent after its successful repeatability child. Separate final suites supply SQL/handler completion evidence.
- NOT RUN / outside local-only scope: hosted schema/ACL/configuration confirmation, actual Razorpay test-account HTTP/webhook delivery, deployed runtime/PostgREST behavior, real storage signed URLs, installed APK checkout and device behavior. No payment activation or deployment readiness is inferred from synthetic HTTP.

The five entrypoints are `create-order-nonplay-test`, `verify-payment-nonplay-test`, `razorpay-webhook-nonplay-test`, `nonplay-test-catalog`, and `get-note-url-nonplay-test`. Their local regression/type verification is green. **Final disabled-gate deployment approval is withheld** until the target's existing schema/RPC/security contracts and disabled settings are separately verified. Preserve production `new_orders_enabled=false`, isolated database `enabled=false`, and absent/false isolated checkout/create environment gates during any separately authorized disabled deployment. Actual provider/device acceptance is a later activation requirement.

## Changed files

Verification edits in this continuation:

1. `supabase/tests/phase-c-gates-selftest.cjs`: repair missing helper fixture; add false/error production gate coverage.
2. `supabase/tests/nonplay-test-integration.ts`: require actual production sales false and fingerprint the setting during synthetic purchase verification.
3. `supabase/tests/run-nonplay-test-local.py`: initialize the existing disabled production-setting fixture locally and use cached-only Deno dependencies.
4. `supabase/tests/verify-nonplay-regressions-local.py`: repeatable private-cluster runner for SQL and individually initialized historical suites.
5. This report, a follow-up link in `docs/audit/NONPLAY_CREATE_GATE_FIX_20261116.md`, and the evidence JSON/inventory files.

Inherited gate changes remain in `supabase/functions/_shared/nonplayTestHandlers.ts`, `supabase/tests/support/nonplay_test_db.ts`, `supabase/tests/nonplay-create-gate-test.ts`, `scripts/nonplay-test-secrets.example.env` and `docs/audit/NONPLAY_CREATE_GATE_FIX_20261116.md`, plus the earlier integration-test additions. Pre-existing mobile changes/report and `MEDVEDA_APP_AUDIT_20261114.md` remain intact. See `changed-files.txt` for every exact path. No migration file or production handler was edited by this verification.

## Safe rollback

No hosted rollback is needed: nothing was deployed, activated or written remotely. Preserve the existing production data/configuration.

For local rollback, save/review the scoped diff and reverse only this continuation's test/runner/report hunks; remove the newly added runner/evidence if unwanted. The integration test contains inherited edits, so restoring the whole file would discard earlier work. Preserve unrelated mobile/audit changes. Do not use a repository-wide reset or clean.

If a later separately approved disabled deployment needs rollback, restore the five previously captured function artifacts only; if they were previously absent, remove only those five newly deployed endpoints after reviewing outstanding test attempts. Leave production endpoints/schema/data untouched. Keep the dedicated create gate false. If any synthetic attempts exist, preserve the existing verification/refund handlers and required broader test configuration until those attempts are reconciled; disabling all isolated handlers would also stop recovery/refund processing. Do not drop financial tables or reverse migrations to roll back a function-only release, and never enable the production switch to recover isolated checkout.
