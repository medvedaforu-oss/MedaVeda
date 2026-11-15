# MedVeda Fix 6 — 14 November 2026

RELEASE_MODE = **free-only**. **NO-GO for release approval**: local changes are implemented, but full SQL completion, Android bundle exclusion, staging deployment, real-device acceptance, MFA rollout, Play Console review and signed residual-risk acceptance remain open. This report does not certify a deployed service or installed binary.

The owner's A1–A5 approvals define scope. The owner subsequently authorized Fix 5 **only in a disposable local synthetic SQL test database** for the full suite. Hosted/staging/production execution, optional legacy policy and quarantined SQL remain prohibited. No production connection, deployment, cron activation, real payment/refund/push/email/deletion or native release build occurred. New purchases remain disabled; no persisted sales/billing flag was changed.

Safety records: [pre-phase2.patch](fix-6/pre-phase2.patch), [pre-phase2-status.txt](fix-6/pre-phase2-status.txt), and [implementation plan](fix-6/phase2-plan.md). Whole-file diffs include earlier intentional owner work. Do not mistake these groups for isolated commits. The audit source snapshots contain local before evidence and are excluded from release staging.

## Item register

| Item | Final status | What changed / remaining boundary | Before / after evidence |
|---|---|---|---|
| A1 / MOB-12 | OWNER APPROVAL REQUIRED (deferred by owner) | V2 storage and mobile dependencies unchanged. v1.1 AES-GCM migration/rollback decision written. | [Phase 1 reproduction](fix-6/crypto-readonly-probe.txt), [decision](fix-6/MOB-12-decision.md) |
| A2 / MOB-08 payload contract | FIXED - DEVICE/STAGING TEST PENDING | Sender supplies validated top-level category in outgoing data.type; caller conflicts are overwritten. Real composer/service/sender/foreground host chain is covered. Hosted/device delivery is unperformed. | [original red](fix-6/phase2/before/notification-contract-corrected.log), [saved-source reproduction](fix-6/phase2/after/notification-saved-baseline.log), [focused results](fix-6/phase2/after/focused-final-results.json) |
| A2 / preference wording | FIXED - DEVICE/STAGING TEST PENDING | Screen explicitly limits toggles to feed/foreground and states that background/closed delivery is uncontrolled. Host wording assertion added. | [before](fix-6/phase2/before/notification-contract-corrected.log), [after](fix-6/phase2/after/notification-contract-final.log) |
| A2 / background preferences | OWNER APPROVAL REQUIRED (v1.1) | No server preference/token/topic schema added. Decisions remain explicit; unknown/announcement/quiz foreground behavior is unchanged. | [contract/deferred decisions](fix-6/MOB-08-server-preferences-v1.1.md) |
| A3 / ESLint parent update | FIXED - VERIFIED (automated) | Tooling ESLint 10.13.0→10.15.0, config-array 0.23.5→0.23.6; fixed nested minimatch11. Full lint has no diagnostics; checked effective configurations have no differences. Residual chain remains. | [baseline lint](fix-6/phase2/before/tooling-lint.log), [install](fix-6/phase2/after/tooling-install-online.log), [lint](fix-6/phase2/after/tooling-lint.log), [version delta](fix-6/phase2/after/dependency-version-delta.json) |
| A3 / mobile advisories and signature | OWNER ACTION REQUIRED | Fresh audit: mobile 3 moderate, tooling 7 moderate, admin 0. Risk acceptance is unsigned. Android export was interrupted before complete maps/results; exclusion is INCONCLUSIVE. | [audits](fix-6/phase2/after/mobile-app-audit.json), [tooling](fix-6/phase2/after/tooling-audit.json), [admin](fix-6/phase2/after/admin-panel-audit.json), [export log](fix-6/phase2/after/android-export.log) |
| A4 / isolated new-order switch | FIXED - DEVICE/STAGING TEST PENDING | Shared gate after authentication, before eligibility/rate-limit RPCs, body/order/provider work. False/missing/error/exception deny with stable 403 sales_disabled. Hosted metadata was not inspected. | [red](fix-6/phase2/before/nonplay-sales-gate.log), [green](fix-6/phase2/after/nonplay-sales-gate.log), [final](fix-6/phase2/after/nonplay-sales-gate-final.log) |
| A5 / scheduling inventory | FIXED - VERIFIED (automated) | New read-only scanner prints migration filenames and line numbers; test flags 20261114050400 from repo and another cwd. No SQL is executed. | [red](fix-6/phase2/before/scheduling-scanner.log), [green](fix-6/phase2/after/scheduling-scanner.log) |
| A5 / wallet rollout | OWNER ACTION REQUIRED | No migration/financial policy change. Fix 5 excluded from free-only v1, retained locally for synthetic suite and later isolated history rehearsal. | [Phase 1 wallet review](fix-6/phase1-findings.md), manifest and gates below |
| Full SQL verification | BLOCKED (interrupted before retained final exit; an uninterrupted disposable local run with final result unblocks it) | Canonical suites reached the Edge harnesses and batch refund integration passed in retained output, but this is **not ALL SUITES PASSED**. | [full raw log](fix-6/phase2/after/full-sql.log), [earlier interrupted log](fix-6/phase2/after/full-sql-interrupted.log), [SQL safety inventory](fix-6/phase2/after/sql-safety-inventory.json) |
| Legacy analytics host fixtures | BLOCKED (mocks lack the current analytics RPC; a separately scoped fixture update preserving assertions and fresh passes unblocks them) | p2-quality and p1-financial-ui fail on supabase.rpc is not a function; analytics production source was not changed by Fix 6. Tests were retained. | [quality](fix-6/phase2/after/p2-quality-selftest.log), [financial UI](fix-6/phase2/after/p1-financial-ui-selftest.log) |

## Changes and implementation boundaries

Notification root cause: the composer emits top-level type, while the foreground handler reads data.type. The sender previously passed empty data for ordinary composer requests. The regression mounts the actual admin composer with the existing host harness, invokes the actual admin service and sender with fake transport/DB, then passes the resulting Expo payload to the actual foreground handler. The saved pre-change sender reproduces missing data.type and a presented muted offer; final sender suppresses it.

`supabase/functions/send-push-notification/index.ts` now constructs `pushData={...data,type}`. **Overwrite** is the selected conflicting-category behavior. Existing payload validation, targetUserIds rejection, same-token admin/AAL checks, rate limits and requestId reservation remain. The original caller data remains in the reservation's payload identity, so ordinary existing request IDs return their recorded result without another provider send/feed row. The new outgoing data is checked against the 1,024-byte bound including category overhead. Consequently a formerly near-limit request whose canonical outgoing data exceeds that bound is rejected; clients should keep data below the bound. No price, consent or category-default policy changed.

Tests cover conflicting type overwrite, retained screen data, default announcement/quiz and unknown/missing foreground categories, broadcast-only rejection before reservation/feed publication, replay without another send, a saved legacy replay record, final pushed data size and honest rendered preference wording. Unknown **top-level sender** types remain rejected by its existing allowed-type validation; unknown incoming foreground categories continue to present.

The screen now says: “Choose what you see in the in-app feed and hear about while the app is open. These toggles do not control background or closed-app delivery.” Device-local scope, public feed access and OS notification behavior remain unchanged. No actual delivery is inferred from the synthetic transport.

`_shared/nonplayTestHandlers.ts` uses `newOrdersEnabled(db)` after verified authentication and before permitted() eligibility RPCs, which may rate-limit, and before body parsing. Only create opts into this new gate; historical verification/recovery keeps existing independent guards. False, missing row, query error and thrown read all fail closed with `sales_disabled`. Method/auth checks retain precedence. New tests inject fake DB/provider only; no configured URL is contacted.

The existing nonplay integration **assertions/test file are unchanged**. Its local `TestDatabase` adapter supplies an explicit synthetic enabled setting for enabled-checkout fixtures; it does not read or change persisted purchase_settings. Deny behavior is exercised separately against fake false/missing/error settings. The integration suite's final full-run result remains pending due interruption. Do not describe that particular DB integration as freshly passed.

[Protected-file verification](fix-6/phase2/after/protected-check.json) found zero hash changes across 94 protected files, including all canonical migrations, secureSessionStorage, mobile/admin manifests and lockfiles, and provider/build configuration. [Tracked-delta review](fix-6/phase2/after/phase-delta-review.json) found no changed tracked diff sections outside the approved paths. Untracked handler/adapter edits have exact before copies in the safety evidence; these checks do not claim a complete content backup of every original untracked file.

`mobile-app/scripts/ui-harness.cjs` now supplies standard TextEncoder/TextDecoder globals to its VM. The sender already used TextEncoder for explicit data; canonical category validation now exercises it on ordinary requests too. Initial existing push tests failed because their VM omitted that Deno standard global. Adding it corrects the environment without changing assertions or disabling tests. Existing push policy/delivery/broadcast tests then passed. Initial failed logs remain evidence.

The scanner `supabase/scripts/list-scheduling-migrations.sh` uses read-only grep for cron.schedule / pg_cron / net.http_post, with filename/line number. It resolves the repo relative to the script, includes comments for owner review and propagates read errors. It neither proves a match executes nor changes scheduler state.

## Dependency and encryption decisions

Only `tooling/package.json`, `tooling/package-lock.json` and tooling/node_modules were updated by the dependency install. Exact owner-approved command from tooling:

```bash
npm install --save-exact eslint@10.15.0 --cache /tmp/medveda-fix6-npm-cache
```

Initial sandbox attempt failed EAI_AGAIN; the public-registry rerun succeeded. No audit fix, overrides or major upgrade ran. Installed change summary: added 3 packages, changed 2; ESLint 10.15.0, config-array 0.23.6, nested minimatch11.0.8 and nonrecursive-glob-match1.1.0. Root minimatch10.2.6 remains for typescript-eslint. Mobile/admin manifests, lockfiles and installed dependencies were outside the write scope. The protected snapshot records their pre-work hashes/metadata.

Effective ESLint configuration comparisons for mobile/App.tsx and admin Notifications have **empty differences**, including rules. Both full-lint runs produced no diagnostics. There is no dedicated tooling test script beyond lint; the discovered readiness/remaining-audit runners invoke the same canonical ESLint command. No rule was silenced. The unrelated analytics fixture failures existed independently of this tooling change: those production analytics files are unchanged in this phase; they use the current RPC while the old fixture supplies only table reads. They are reported rather than silently repaired outside approval.

Current audit counts are affected packages, not independent advisories. Mobile: Expo57.0.33→fingerprint0.20.16→minimatch10.2.6, three moderate affected nodes. Tooling: remaining typescript-eslint/estree minimatch10 chain, seven moderate nodes; ESLint/config-array are no longer affected nodes. Admin: zero. The Phase 1 compatible-parent investigation found no fixed mobile fingerprint/estree update in the permitted ranges. Mobile CFG-02 remains OWNER ACTION REQUIRED.

MOB-12 is **deferred by owner to v1.1**, not fixed or accepted as cryptographically authenticated. [The decision](fix-6/MOB-12-decision.md) covers storage-write attacker assumptions, recommended Expo AES-GCM, server-authenticated legacy migration, offline deferral, fail-closed tag mismatch, old-reader rollback and possible re-login. The future install command is text only. Secure session source/envelope and mobile dependencies were not changed.

### Unsigned residual-risk acceptance — updated to real evidence

> For the MedVeda free-only release, I accept GHSA-g3hv-75wg-m249 only in the reviewed build/lint paths, conditional on retained Android source-map/artifact evidence excluding affected runtime code. Tooling ESLint was updated to 10.15.0 with unchanged checked effective rule configurations and clean full lint; current audits retain 3 moderate affected mobile nodes and 7 tooling nodes, with admin 0. The Expo fingerprint and typescript-eslint minimatch10 paths remain unresolved. Builds use reviewed sources/controlled patterns and bounded resources; untrusted pattern input is excluded. Re-run all three audits before release and after updates. Acceptance expires at the next dependency review, changed runtime reachability or a higher-severity advisory. Owner/date/artifact/evidence: __________________.

**Unsigned; not accepted. Android export exclusion is INCONCLUSIVE.** No source map result may be substituted with a package-path inference. Sign only after the missing evidence is retained and reviewed.

## Exact verification and raw results

Commands and exits for the source batch are in [source-results.json](fix-6/phase2/after/source-results.json); [runner](fix-6/run-phase2-checks.py) uses a credential-free environment and EXPO_NO_DOTENV=1. Retained initial environment failures/corrected reruns are distinguished below. A final retry started near an interruption may be incomplete; only logs with a final exit or an explicitly completed command support a pass.

| Check / exact command from repo root | Retained outcome | Evidence |
|---|---|---|
| `node mobile-app/node_modules/typescript/bin/tsc -p mobile-app/tsconfig.json --noEmit --incremental false` | exit0 | [mobile tsc](fix-6/phase2/after/mobile-tsc.log) |
| `npm run lint --prefix tooling` | clean full mobile/admin lint; effective config differences empty; final exit recorded separately | [lint](fix-6/phase2/after/tooling-lint.log), [final exit](fix-6/phase2/after/tooling-lint-final-result.json), [mobile config diff](fix-6/phase2/after/eslint-mobile-config-diff.json), [admin config diff](fix-6/phase2/after/eslint-admin-config-diff.json) |
| `node admin-panel/node_modules/typescript/bin/tsc -p admin-panel/tsconfig.app.json --noEmit --incremental false` | exit0 | [admin tsc](fix-6/phase2/after/admin-tsc.log) |
| same command with `tsconfig.node.json` | exit0 | [admin node tsc](fix-6/phase2/after/admin-node-tsc.log) |
| `npm test --prefix admin-panel` | exit0 | [admin tests](fix-6/phase2/after/admin-tests.log) |
| `deno check --cached-only --config supabase/deno.json` with all canonical Edge index.ts, validator worker, Fix3 deadline candidate/helper | exit0; expanded arguments in results/runner | [Deno check](fix-6/phase2/after/deno-check.log) |
| `deno test --cached-only --config supabase/deno.json --allow-read --allow-env` with the 11 explicit unit files in runner | **46 passed, 0 failed**, exit0 | [Deno units](fix-6/phase2/after/deno-unit.log) |
| `PGHOST=<fresh /tmp socket> PGPORT=55436 PGUSER=postgres bash supabase/tests/fix3-run-all.sh` | **INCOMPLETE**; no final exit/all-suite marker retained | [full SQL](fix-6/phase2/after/full-sql.log), [local wrapper](fix-6/run-local-sql.py) |
| `npm run test:password-recovery --prefix mobile-app` | exit0; 26 recovery tests and 24 policy checks | [recovery](fix-6/phase2/after/password-recovery.log) |
| `node website/scripts/check-links.mjs` | exit0; 17 pages, no problems | [website](fix-6/phase2/after/website-links.log) |
| per-project `npm audit --json --cache /tmp/medveda-fix6-npm-cache` | reports retrieved: mobile3/tooling7 moderate; admin0. Vulnerabilities are not clean audit exits. | [mobile](fix-6/phase2/after/mobile-app-audit.json), [tooling](fix-6/phase2/after/tooling-audit.json), [admin](fix-6/phase2/after/admin-panel-audit.json) |
| per-project `npm ls minimatch glob --all` | trees retained; fixed nested tooling minimatch11 and remaining minimatch10 visible | [mobile](fix-6/phase2/after/mobile-app-tree.txt), [tooling](fix-6/phase2/after/tooling-tree.txt), [admin](fix-6/phase2/after/admin-panel-tree.txt) |
| `node docs/audit/fix-6/tests/notification-contract.cjs` | focused host cases pass; baseline snapshot reproduces bug | [final](fix-6/phase2/after/notification-contract-final.log), [baseline](fix-6/phase2/after/notification-saved-baseline.log) |
| `node docs/audit/fix-6/tests/nonplay-sales-gate.cjs` | false/missing/error/throw, zero downstream work, method/auth and fake-enabled cases pass | [final](fix-6/phase2/after/nonplay-sales-gate-final.log) |
| `node docs/audit/fix-6/tests/scheduling-scanner.cjs` | root/other-cwd scheduling inventory passes | [final](fix-6/phase2/after/scheduling-scanner-final.log) |
| original p0-notification/p1-push-delivery/audit-push-policy scripts | pass after standard VM global correction; assertions unchanged | [broadcast](fix-6/phase2/after/p0-notification-selftest-harness-corrected.log), [delivery](fix-6/phase2/after/p1-push-delivery-selftest-harness-corrected.log), [AAL](fix-6/phase2/after/audit-push-policy-selftest-harness-corrected.log) |
| original mobile notification preferences/routing/push lifecycle/MOB-08/nonplay-isolation scripts | exit0 in source batch | [source results](fix-6/phase2/after/source-results.json) |
| `node mobile-app/scripts/closed-testing-selftest.cjs` | sandbox first failed spawning children; permitted rerun **30/30 passed** | [completed rerun](fix-6/phase2/after/closed-testing-escalated.log) |
| `node scripts/p2-quality-selftest.cjs` | 11 passed, 1 stale analytics mock failure | [raw](fix-6/phase2/after/p2-quality-selftest.log) |
| `node admin-panel/scripts/p1-financial-ui-selftest.cjs` | fails stale analytics mock before remaining cases; no complete pass | [raw](fix-6/phase2/after/p1-financial-ui-selftest.log) |

The first notification regression run had an incomplete theme fixture; the corrected pre-fix run retained actual failing payload/conflict/size/wording assertions. The added legacy replay fixture initially compared different VM object prototypes; it now compares both values across the real JSON transport boundary, retaining exact payload assertions. Final notification results are six passing cases. Existing push tests initially failed on missing VM TextEncoder; corrected passes are separate logs. No failed or interrupted output is counted as a pass. No broad claim that every repository test passes is made.

The full SQL command was initially rejected by automatic approval review because of concern about optional/quarantined migrations. A read-only inventory proved all **85** runner migration files are canonical, with no symlink/overlap with the two prohibited files; test scripts have no references to those prohibited paths. The same requested command was subsequently approved. It did run on synthetic local data, including owner-authorized Fix 5, and never against a hosted target. Its eventual interruption leaves completion open. Re-run `python3 docs/audit/fix-6/run-local-sql.py` in an uninterrupted local environment; it creates a fresh no-TCP server, runs the unchanged full suite and retains final exit/stop output. This is the required unblock, not permission to skip assertions.

### Android JS-only export

The attempt used a new /tmp mobile copy excluding `.env*`, `.git`, generated native directories and Expo state, with a **copy** of installed dependencies so Metro could not write original mobile node_modules. Credential-free environment: EXPO_NO_DOTENV=1, EXPO_OFFLINE=1, CI=1. Exact command:

```bash
node node_modules/expo/bin/cli export --platform android --output-dir /tmp/medveda-fix6-android-export --source-maps
```

Raw log stops at “Starting Metro Bundler”; repeated session interruptions destroyed temporary state before a final export exit/map inventory. **INCONCLUSIVE — affected packages are not verified excluded.** This was not a native build. [Export-copy source hashes](fix-6/phase2/export-copy.json) retain the earlier copy inventory; they do not prove a successful export. [The durable runner](fix-6/run-export-evidence.py) performs the prescribed nested-section source-map inspection immediately after export, hashes/archives maps into audit evidence, and writes classification/exit. It has a 420-second timeout; interrupted attempts do not establish a timeout exit either. An uninterrupted successful run and retained maps are required before signing CFG-02.

## Remaining bugs and owner gates

- **MOB-12:** unauthenticated CTR remains; needs local storage-write attacker capability. Owner selected v1.1 deferral, not a cryptographic fix. Key loss/locked-storage and old-reader logout risks remain as documented.
- **MOB-08:** background/killed delivery has no preference authority on the sender. Local preferences are device-wide rather than account-scoped; no-row/default/conflict/product decisions remain. Foreground protection requires deployment of the matching sender. Already submitted alerts cannot reliably be recalled.
- **CFG-02:** minimatch10 remains in fingerprint/typescript-eslint; runtime exclusion and risk signature are missing. No compatible mobile remediation has been verified.
- **BACK-03/04:** all local new-order creation paths now use the switch, but deployed bundle/configuration parity is not established by source tests. Workers and purchases remain disabled. Historical recovery/provider qualification remains separately gated.
- **Wallet/Fix 5:** free-only v1 explicitly excludes it. Deployed historical expiry/hold/reversal risks cannot be declared fixed by local migration source. Exposure was not measured through live rows. Keep legacy dates and financial policy unchanged; direct DB zero remains rejected, canonical no-expiry value is NULL.
- **Verification:** full canonical SQL and export lack completion evidence; legacy analytics host fixtures still fail. No test was weakened/deleted to manufacture a pass.
- **Device/native:** paid offline cleanup, unknown-metadata files/PDF residue, navigation/recovery lifecycle, SQLite crash durability and real OS rendering/gestures remain unperformed device gates from Fix 4.

Owner actions still required: approve/rehearse v1 staging deployment; execute device acceptance; inventory hosted reset bridges/redirect allowlists; enroll/recover every admin and roll out MFA only after guards; review free-only Play Console/listing/app-access/data-safety requirements; provide artifact-bound bundle evidence and sign the residual dependency acceptance. Server preference/encryption redesigns are v1.1 approvals. Retention scheduling and future wallet policy/staging/production work are separate approvals, not incidental v1 tasks.

## Owner's explicit free-only v1 deploy manifest

Apply **individually**, only if absent in the target's recorded migration history, in this exact order. Never use a blanket push. These are future owner steps, **not executed here**. Confirm isolated staging identity, backup/restore route, compatible preexisting schema, release revision and `new_orders_enabled=false` before starting.

| Order / migration | Per-step staging verification | Rollback / stop condition |
|---|---|---|
| 1. `20261112104610_audit_batch1_refund_revocation.sql` | Synthetic reversal-before/after-capture, duplicate refund, PDF denial after reversal, service-only helper grants. | Stop affected handlers/workers; preserve inbox/ledger/capture facts; reviewed forward correction. |
| 2. `20261112150427_audit_checkout_publication_guard.sql` | Unpublished content cannot be priced/granted; normal published/free content remains accessible under scope. | Keep sales false; forward correction; never restore an unguarded grant path. |
| 3. `20261114040000_fix3_content_push_and_delete_guards.sql` | Blocked-user branches deny, own/admin gates remain; 11th token/concurrent registration cap; deprecated delete RPC effective EXECUTE denied. No real deletion/push needed. | Disable affected entrypoint and correct forward; do not reopen broad grants. Confirm old-client compatibility first. |
| 4. `20261114040100_fix3_flag_resolution_row_count.sql` | First resolve returns accurate outcome; missing/repeated resolve is not success; admin/AAL denied where required. | Preserve audit history; correct forward. |
| 5. `20261114050000_fix4_new_sales_disabled.sql` | Singleton value false; missing/error fail closed; every guarded creator returns 403 sales_disabled with zero order/provider work in staging mocks. | Keep false; restore only a qualified guarded handler, never old unguarded routes. |
| 6. `20261114050200_fix4_notification_requests.sql` | Duplicate request ID creates one public broadcast row; changed payload conflicts; provider-unknown result never blindly resends; targeted requests denied before persistence. | Disable admin sending; retain reservation/feed results; forward correction. |
| 7. `20261114050300_fix4_snapshot_rpcs.sql` | Student aggregate owner-only, admin snapshot requires configured AAL; concurrent insert snapshot, foreign-owner denial, missing-RPC compatibility behavior. | Disable affected UI or correct forward; no broad fallback grants. |

After schema, deploy the compatible guarded Edge/shared bundles and then matching admin/mobile clients as one reviewed revision. Include the Fix 6 sender and isolated-order handler; keep the isolated test lane independently disabled. Guarded verification/webhook/content/deletion deployment follows the Fix 3 runbook dependencies/JWT matrix. No historical recovery schedule or provider test is authorized by this manifest. Validate metadata without secret-bearing cron commands, credentials or live customer/payment rows.

**EXCLUDED from free-only v1:**

- `20261114050400_fix4_identity_retention_schedule.sql`: executes cron.schedule when pg_cron exists. Approval comments are not execution gates.
- `20261114090000_fix5_wallet_expiry_facts.sql`: wallet backfill and volatile/lazy-writing balance behavior; isolated staging history rehearsal only before a later paid release, with separate owner authorization.
- `docs/audit/fix-5/optional/*OWNER_REVIEW.sql`: legacy financial policy, not approved or executed.
- `docs/audit/fix-4/candidates/*BLOCKED.sql`: quarantined failed candidate, never release code.

`fix3-run-all.sh` builds **every canonical migration**. Excluded files therefore stay in place locally for the explicitly authorized synthetic full suite; they are excluded from v1 at git-add/release-manifest time with explicit pathspec exclusions below. A local synthetic full-suite pass, if later completed, will not authorize deploying Fix 5 or retention.

### Wallet owner steps — plan only

1. In the future approved admin workflow, leave Referrals credit expiry **blank**, canonical **NULL/no expiry**; 0 in the existing UI normalizes to NULL. No setting was changed here; read-only source review does not imply the live setting is NULL.
2. Review `docs/audit/fix-5/owner-preflight.sql` first. Owner-run aggregates identify unsafe settings, expired/pending exposure and replay/negative-history anomalies. Do not use now-mutating wallet_balance_of/get_my_wallet as “read-only” production diagnostics after Fix 5.
3. Before any paid-release wallet decision, rehearse on a separately approved isolated history copy, preserving immutable ledger fields. Review grants/search paths, lock ordering, backfill aborts/runtime/locks, C5/F8/K4, full suite/concurrency and the expected 19 smoke markers. Do not bypass an abort by changing history/assertions.
4. Retain stamped legacy dates. The optional policy can extend expiry and provider clawback and cannot erase posted expiry; it remains unexecuted.
5. Rollback is **forward-only** after monetary expiry facts exist. Do not restore old time-filter arithmetic or delete immutable facts. Take/verify an isolated backup before rehearsal. **No production wallet rollout accompanies free-only v1.**

## Android real-device checklist — every step unperformed

Record exact build/source digest, package/versionCode, device/OS, date, steps and evidence. Host tests cannot complete these items. No native release build was performed or authorized.

- [ ] **UNPERFORMED — MOB-01:** mounted navigation survives signed-out and A→B recovery session import; protected routes reset without destroying reset controller.
- [ ] **UNPERFORMED — MOB-02:** new/resume/retry paid offline acquisition denied, paid completed/partial bytes cleaned, free files preserved; unknown metadata handled deliberately; inspect native PDF/blob-util temp/cache residue and storage-full retry.
- [ ] **UNPERFORMED — MOB-05:** populated notification swipe/archive works under gesture root in actual installed build.
- [ ] **UNPERFORMED — MOB-06:** fresh reset link replaces mounted expired/slow recovery; stale import/update/signout cannot clear newer flow; MFA and cleanup exercised.
- [ ] **UNPERFORMED — MOB-09:** injected SQLite outbox failure rolls back result+queue; kill/restart near commit then reconnect yields exactly one authorized verified attempt.
- [ ] **UNPERFORMED — MOB-11:** pause/cancel overlap deletes only valid app-owned partial path; failed deletion preserves retry metadata; measure actual files.
- [ ] **UNPERFORMED — MOB-13:** delayed purge/read/write and signout cleanup across A→B→A cannot claim/purge new owner's files; transfer admission waits for current owner.
- [ ] **UNPERFORMED — MOB-16:** 0/1/25/50/51/75/100% ring geometry/raster/animation, interrupted animation and background/resume.
- [ ] **UNPERFORMED — MOB-20:** small screen, landscape, large text and keyboard scroll allow reset/MFA submit; unavailable support handoff shows fallback.
- [ ] **UNPERFORMED — notification foreground:** separately authorized synthetic admin Offer using deployed sender is muted while open; unmuted offer and announcement/quiz present. Check feed filtering and honest wording. Background/closed alerts are not promised muted.
- [ ] **UNPERFORMED — recovery links:** production/staging exact fixed-scheme bridges/allowlists; Gmail in-app browser/Chrome cold/warm, signed-out/A→B, expired/used/new link, MFA/network/cleanup failures. Never log fragments/tokens.
- [ ] **UNPERFORMED — free-only flags:** installed app cannot initiate purchases; historical restore is separately qualified without enabling sales or jobs; no real provider operation is part of this checklist execution without separate approval.

## Release verdict and external gates

**NO-GO for declaring the free-only release ready.** Local approved fixes do not close missing execution/device/deployment evidence. Internal gates: finish uninterrupted full SQL and map inspection; resolve/review the two stale analytics test harness failures without weakening assertions; review complete dirty-tree/release staging scope.

External gates are: **(1)** owner staging deployment/acceptance of the seven-migration v1 manifest plus matching functions/clients, **(2)** actual Android device tests/build identity, **(3)** guarded MFA enrollment/recovery/rollout, **(4)** free-only Play Console/listing/app-access/policy review of the exact artifact, **(5)** owner-signed residual dependency-risk acceptance after bundle evidence. Paid UCB enrollment/catalog/payment/recovery-worker activation is **not** a free-only enablement requirement; purchases/jobs stay disabled. Retention and production wallet rollout remain excluded, separately authorized future work. Encryption and server preferences are explicit v1.1 deferrals, not silently closed findings.

## Ready-to-commit groups — owner review commands only

These commands were **not run**. Review whole-file diffs first; earlier intentional edits are included. Only the named release paths are candidates. Never use git add -A. Exclusions are repeated explicitly to prevent accidental retention/wallet/optional/quarantined/artifact staging. Already-staged content must be reviewed separately; exclusions do not remove items previously staged by someone else.

Notification payload, honest wording and regression/harness support:

```bash
git add -- supabase/functions/send-push-notification/index.ts mobile-app/src/screens/notifications/NotificationPreferencesScreen.tsx mobile-app/scripts/ui-harness.cjs docs/audit/fix-6/tests/notification-contract.cjs ':!supabase/migrations/20261114050400*' ':!supabase/migrations/20261114090000*' ':!docs/audit/**/*.log' ':!**/*.patch' ':!**/optional/**' ':!**/candidates/**' ':!**/.env*' ':!**/*secret*' ':!**/local-db/**' ':!**/pgdata/**' ':!**/*.map*'
```

Isolated-order safety gate, explicit synthetic adapter and regressions:

```bash
git add -- supabase/functions/_shared/nonplayTestHandlers.ts supabase/tests/support/nonplay_test_db.ts docs/audit/fix-6/tests/nonplay-sales-gate.cjs ':!supabase/migrations/20261114050400*' ':!supabase/migrations/20261114090000*' ':!docs/audit/**/*.log' ':!**/*.patch' ':!**/optional/**' ':!**/candidates/**' ':!**/.env*' ':!**/*secret*' ':!**/local-db/**' ':!**/pgdata/**'
```

Tooling-only dependency update:

```bash
git add -- tooling/package.json tooling/package-lock.json ':!**/node_modules/**' ':!supabase/migrations/20261114050400*' ':!supabase/migrations/20261114090000*' ':!docs/audit/**/*.log' ':!**/*.patch' ':!**/optional/**' ':!**/candidates/**' ':!**/.env*' ':!**/*secret*' ':!**/local-db/**' ':!**/pgdata/**'
```

Read-only scheduling inventory and handoff documentation/runners:

```bash
git add -- supabase/scripts/list-scheduling-migrations.sh docs/audit/fix-6/tests/scheduling-scanner.cjs docs/audit/fix-6/MOB-12-decision.md docs/audit/fix-6/MOB-08-server-preferences-v1.1.md docs/audit/fix-6/phase2-plan.md docs/audit/fix-6/run-phase2-checks.py docs/audit/fix-6/run-export-evidence.py docs/audit/fix-6/run-local-sql.py docs/audit/MEDVEDA_FIX_6_2026-11-14.md ':!supabase/migrations/20261114050400*' ':!supabase/migrations/20261114090000*' ':!docs/audit/**/*.log' ':!**/*.patch' ':!**/optional/**' ':!**/candidates/**' ':!**/.env*' ':!**/*secret*' ':!**/local-db/**' ':!**/pgdata/**' ':!docs/audit/fix-6/phase2/**' ':!**/*.map*'
```

Explicit v1 schema group only, after review of preexisting dirty work:

```bash
git add -- supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql supabase/migrations/20261112150427_audit_checkout_publication_guard.sql supabase/migrations/20261114040000_fix3_content_push_and_delete_guards.sql supabase/migrations/20261114040100_fix3_flag_resolution_row_count.sql supabase/migrations/20261114050000_fix4_new_sales_disabled.sql supabase/migrations/20261114050200_fix4_notification_requests.sql supabase/migrations/20261114050300_fix4_snapshot_rpcs.sql ':!supabase/migrations/20261114050400*' ':!supabase/migrations/20261114090000*' ':!docs/audit/**/*.log' ':!**/*.patch' ':!**/optional/**' ':!**/candidates/**' ':!**/.env*' ':!**/*secret*' ':!**/local-db/**' ':!**/pgdata/**'
```

Keep all raw audit JSON/config snapshots, source before copies, status inventories, logs, patches, source maps/archives, temporary exports, local DB/socket/data files, credentials, signing material and node_modules out of release staging. The final seven-schema manifest differs deliberately from Phase 1's earlier potential wallet rollout list; **this owner-approved v1 manifest is authoritative**.

NO COMMITS WERE MADE. NOTHING WAS PUSHED. NOTHING WAS DEPLOYED.
