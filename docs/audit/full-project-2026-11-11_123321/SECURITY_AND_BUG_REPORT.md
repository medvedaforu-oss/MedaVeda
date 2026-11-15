# SECURITY AND BUG REPORT

Audit date: 2026-11-11 UTC. Scope: current working tree, including pre-existing uncommitted changes. **Audit only; no deployment authorization.**

**No CRITICAL exploitable vulnerability was independently demonstrated. That is not a clean bill of health.** HIGH findings below block launch. All reproductions use synthetic data and never attack or mutate production. The current deployed release is separately behind the reviewed local financial guards.

## Confirmed defects

### AUD-001 — HIGH — Current workspace acknowledges unresolved financial reversals

Location: [supabase/functions/_shared/settle.ts:239](/home/ganeshp8545/AyurPulse/supabase/functions/_shared/settle.ts:239).

- Reproduction: Invoke actual helper with authenticated synthetic provider refund/dispute and RPC result `{status:unknown_payment}`.
- Expected: Keep the event/job retryable until the reversal resolves.
- Actual/root cause: Returns `ok:true`; webhook can acknowledge and worker can finish unresolved work. The separate compatible candidate returns 503.
- Impact: Unresolved refunds/disputes can stop receiving provider retries; durable inbox helps only if a worker actually revisits it.
- Recommended fix: Ship an independently reviewed complete candidate closure; reconcile workspace with fail-closed result classification in a separate change.
- Required regression: Assert unknown/null/unrecognized refund and dispute outcomes produce retryable failure across helper, webhook and worker.
- Evidence: [unknown-reversal-reproduction.log](evidence/unknown-reversal-reproduction.log).

### AUD-002 — HIGH — Targeted notification becomes globally readable

Location: [supabase/functions/send-push-notification/index.ts:94](/home/ganeshp8545/AyurPulse/supabase/functions/send-push-notification/index.ts:94).

- Reproduction: Invoke actual handler with synthetic admin aal2 and one targetUserIds entry; capture inserted notification. Inspect active-row read policy.
- Expected: Only intended recipients read a targeted message.
- Actual/root cause: Push tokens are filtered, but the inserted notification is active and carries no recipient boundary.
- Impact: Potential disclosure if an admin uses the exposed targeted API for private/payment-related messages. Current admin composer sends broadcasts, so it does not itself demonstrate a real disclosure.
- Recommended fix: Use recipient-scoped notification rows and RLS, or explicitly reject targeted requests until supported.
- Required regression: Read targeted message as recipient, another authenticated user and anonymous role; only recipient/admin should succeed.
- Evidence: [targeted-notification-reproduction.log](evidence/targeted-notification-reproduction.log).

### AUD-003 — MEDIUM — Admin analytics truncates orders at server row cap

Location: [admin-panel/src/services/analyticsService.ts:28](/home/ganeshp8545/AyurPulse/admin-panel/src/services/analyticsService.ts:28).

- Reproduction: Run actual service against bounded API mock: 1,001 paid INR 1 orders, first response limited to 1,000.
- Expected: Report 1,001 orders and INR 1,001 revenue.
- Actual/root cause: One unpaginated read reports 1,000 and INR 1,000. No stable ordering or continuation.
- Impact: Incorrect financial dashboard totals/top products above configured API limit; production threshold not stress-tested.
- Recommended fix: Prefer audited server aggregate RPC or correct complete pagination with deterministic ordering.
- Required regression: More than one page, mixed paid/refunded rows, course filter, exact totals and stable top product ties.
- Evidence: [admin-defect-reproduction.log](evidence/admin-defect-reproduction.log).

### AUD-004 — MEDIUM — Admin order menu offers forbidden status mutations

Location: [admin-panel/src/components/OrdersTable.tsx:79](/home/ganeshp8545/AyurPulse/admin-panel/src/components/OrdersTable.tsx:79).

- Reproduction: Choose Paid, Refunded or Pending as a change on a different-status order. Trace updateOrderStatus to admin_set_order_status.
- Expected: Offer permitted actions, report provider-owned statuses as read-only.
- Actual/root cause: RPC explicitly permits only cancelled/failed on an unpaid unsettled order; menu offers created/paid/refunded and omits cancelled.
- Impact: Misleading nonfunctional controls; backend appropriately rejects escalation, so this is not a payment bypass.
- Recommended fix: Model server states/actions separately and expose only allowed unpaid cancel/fail operations.
- Required regression: Menu actions by current state/provider; rejected mutation surfaces useful error; no direct paid/refunded write.
- Evidence: [admin-defect-reproduction.log](evidence/admin-defect-reproduction.log).

### AUD-005 — LOW — Admin duplicate imports fail mandatory CI lint

Location: [admin-panel/src/components/RouteErrorBoundary.tsx:2](/home/ganeshp8545/AyurPulse/admin-panel/src/components/RouteErrorBoundary.tsx:2).

- Reproduction: Run npm run lint --prefix tooling. Also inspect admin-panel/src/hooks/useDashboard.ts:5.
- Expected: CI lint succeeds.
- Actual/root cause: Two no-duplicate-imports errors; build/type checking still pass.
- Impact: Quality CI job blocks a clean release.
- Recommended fix: Consolidate type/value imports according to existing ESLint configuration in a separately authorized fix.
- Required regression: Run configured lint; no additional unit test needed.
- Evidence: [lint.log](evidence/lint.log).

### AUD-006 — MEDIUM — Original atomic C wrapper hash comparison rejects matching baseline

Location: [docs/audit/production-execution-20261111/03-phase-c-atomic.sql:34](/home/ganeshp8545/AyurPulse/docs/audit/production-execution-20261111/03-phase-c-atomic.sql:34).

- Reproduction: Reconstruct 126 pinned function preimages and execute preserved wrapper with synthetic evidence references in disposable DB.
- Expected: Matching baseline passes drift checks.
- Actual/root cause: Reports pinned function drift: accounts_share_network because trailing newline is compared differently.
- Impact: Original reviewed wrapper cannot be used as supplied; safety gate fails closed and transaction rolls back.
- Recommended fix: Review/re-pin separately corrected derivative; preserve original reviewed package.
- Required regression: Matching baseline succeeds; whitespace/significant definition drift rejected; exact ledger/body identity retained.
- Evidence: [atomic-rehearsal.log](evidence/atomic-rehearsal.log).

### AUD-007 — MEDIUM — Original atomic C wrapper has invalid FOREACH syntax

Location: [docs/audit/production-execution-20261111/03-phase-c-atomic.sql:169](/home/ganeshp8545/AyurPulse/docs/audit/production-execution-20261111/03-phase-c-atomic.sql:169).

- Reproduction: After only hash normalization in disposable copy, execute wrapper; second occurrence at line 1283.
- Expected: Preservation loop executes inside atomic transaction.
- Actual/root cause: Syntax error at [ because IN ARRAY needs an array expression (ARRAY[...]).
- Impact: Original release wrapper is unusable; no production partial commit observed or attempted.
- Recommended fix: Review/re-pin candidate with only two extra ARRAY keywords plus approved hash correction.
- Required regression: Parse/execution acceptance plus injected rollback after C1/C2/C3/C4.
- Evidence: [atomic-rehearsal.log](evidence/atomic-rehearsal.log).

### AUD-008 — MEDIUM — Play malformed-body test has incomplete mocks

Location: [supabase/tests/play-body-selftest.cjs:9](/home/ganeshp8545/AyurPulse/supabase/tests/play-body-selftest.cjs:9).

- Reproduction: Run node supabase/tests/play-body-selftest.cjs.
- Expected: Exercise handler request validation.
- Actual/root cause: Harness aborts on unexpected import ../_shared/notesChoiceGate.ts before assertions.
- Impact: Loss of independent malformed-body regression coverage; does not prove the handler itself fails.
- Recommended fix: Update only the fixture imports/mocks in a separate change and retain fail-before-write assertions.
- Required regression: Null/array/scalar/malformed JSON rejected before RPC/provider work.
- Evidence: [supabase-tests-play-body-selftest.log](evidence/supabase-tests-play-body-selftest.log).

### AUD-009 — MEDIUM — Legacy SQL expectations disagree with new ownership guard

Location: [supabase/tests/batch1_checks.sql:372](/home/ganeshp8545/AyurPulse/supabase/tests/batch1_checks.sql:372).

- Reproduction: Run complete all-migration test suite. O4 and O7 fixtures reach new successful ownership guard.
- Expected: Tests recognize the new enforced contract and independently exercise intended uniqueness/NOT NULL behavior.
- Actual/root cause: Both reject with Successful purchase ownership already exists, while assertions require substrings duplicate/null.
- Impact: Database CI fails; rejection is fail-closed, not evidence that duplicate purchases are allowed. O7 does not reach its intended constraint.
- Recommended fix: Give each test independent valid fixtures; assert SQLSTATE/contract for the intended invariant. Do not disable the new guard.
- Required regression: Both old constraints and new guard tested independently on final schema.
- Evidence: [all-database-supported-socket.log](evidence/all-database-supported-socket.log).

### AUD-010 — MEDIUM — Mobile dependency tree contains moderate advisories

Location: [mobile-app/package-lock.json:1](/home/ganeshp8545/AyurPulse/mobile-app/package-lock.json:1).

- Reproduction: Run npm audit --prefix mobile-app --omit=dev --json against current advisory service.
- Expected: Accepted risk assessment/remediation for actual reachable vulnerabilities.
- Actual/root cause: Five moderate package findings, zero high/critical; admin production dependency audit reports zero.
- Impact: Attribution includes glob/minimatch tooling chain and direct expo/blob-util nodes; advisory presence is not proof of remote mobile exploit.
- Recommended fix: Review individual advisory paths and supported Expo-compatible patches. Do not apply npm suggested downgrade/force blindly.
- Required regression: Re-audit and rerun builds/native/PDF/download checks after a reviewed dependency change.
- Evidence: [mobile-app-dependency-audit.json](evidence/mobile-app-dependency-audit.json).

## Confirmed production gaps and data anomalies

Fresh read-only `production-readonly.json` shows 66 ledger versions, no `razorpay_entitlement_committed` RPC, and deployed verifier/webhook bundles without the commitment call. This is a **HIGH deployment/financial acceptance gap** relative to the audited candidate; a pending-code fix does not protect production. Bundle feature-string inspection is structural evidence, not a remotely executed exploit. The new handler/proof deployment must be delivered as an approved compatible unit.

Aggregate production inspection found **2 successful purchases on non-paid orders** and **1 duplicate-success owner/product group**. Root cause, provider capture legitimacy and correct accounting are UNKNOWN. Preserve records and access; inspect provider evidence privately before an approved forward repair. These are confirmed inconsistencies, not proof of fraud or permission to replay/delete financial history.

## Security controls verified within scope

Actual local HMAC code rejects forged and malformed signatures; raw webhook bodies are authenticated before parsing; owner recovery authenticates with Auth.getUser; server-set prices and immutable order snapshots prevent client repricing; service-only financial RPC grants, ownership checks and RLS/SQL regression suites deny tested cross-user access. Final keyed ownership guard and settlement/token locks pass independent-session tests. Admin reads/writes require server membership and configured MFA; no service-role token or private key was found by the scoped current-file pattern scan (1,084 files). Public Supabase publishable keys are not service secrets.

Source inspection covers SECURITY DEFINER search paths/owners/ACLs, payment/content policies, trusted upload validation/quarantine, bounded provider requests, idempotence and recovery boundaries. Fresh production metadata records relevant financial policies/grants/functions without exposing private user records or secrets. RLS enabled alone does not prove all policies correct; service-role intentionally bypasses it and therefore requires handler authentication.

## Suspected risks / unresolved verification (not confirmed exploits)

- Complete secret history/rotation, high-entropy credentials, private dependency archives and every generated artifact were not comprehensively scanned. Prior evidence documents a historical test-key incident; rotation status remains unknown.
- API-body size ceilings, rate-limit trusted-IP behavior and high-concurrency provider outages need hosted tests. CORS is not an authorization control.
- Real managed Auth JWT/gateway behavior, MFA enrollment/refresh, password hook/config and Storage object ACL acceptance remain untested.
- Large PDF worker runtime, capacity, IAM, backlog alerting and malicious file corpus/device rendering require operational tests. Trusted structural validation is not proof of malware-free PDFs.
- Push success counts HTTP-accepted messages without proving per-ticket/device receipt; delivery, credentials and dead-token handling need controlled device tests. Do not claim delivery based solely on HTTP 200.
- Seven-day offline entitlement grace permits delayed revocation while offline; obtain explicit policy acceptance.
- Remaining unpaginated list surfaces (referrals, notification/catalog diagnostic reads) may truncate at volume; analytics truncation alone was reproduced here.
- Debug signing in ignored generated Gradle is unsuitable for direct local store submission; EAS remote signing is a distinct path and was not freshly verified.

No source/test code, auth gate, RLS policy, approved SQL or financial data was changed by this audit.
