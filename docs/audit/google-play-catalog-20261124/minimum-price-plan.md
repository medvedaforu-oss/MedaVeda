# Google Play minimum pricing implementation plan

2026-11-24 UTC. User's six-task specification is the authority. Local work only;
no commits, hosted writes, deployment, provisioning, activation or native builds.
Work in this checkout to preserve the existing uncommitted remediation state.

Design: retain the price-shared catalog and revision-based Admin architecture.
One SQL validation function owns the reviewed India INR range (4 through 84,000,
two decimal places; reviewed regions versions 2022/02 and 2026/01). Reuse it in
Notes eligibility, direct queue reservation, Admin readiness and the catalog
worker before any Google request. Free products bypass paid validation in
readiness. Preserve Razorpay inputs and historical order/purchase snapshots.
Admin renders a fixed safe unsupported-price summary without duplicating limits.
Supported price eligibility does not mean Google acceptance or checkout readiness.

Alternatives: frontend-only validation leaves server provisioning unprotected;
duplicating numeric limits across clients drifts. Use the existing server policy
boundary and an additive unapplied migration; do not rewrite applied history.

- [x] Capture focused read-only inventory and existing diagnostic limitations.
- [x] Add failing SQL/worker/Admin regressions for rejected prices and supported
  prices, queue/retry/finish guards, shared tiers, revisions and preservation.
- [x] Add the validation migration and worker/Admin integration; prove RED/GREEN
  against disposable local PostgreSQL and mock Google transports.
- [x] Run focused catalog/payment/entitlement/security regressions and Admin build.
- [x] Replace the INR 1 retry proposal with exactly one supported-price attempt
  plan, list all mutations and retain HOLD pending explicit owner approval.
- [x] Freeze a new source/dependency/Admin candidate without overwriting the old
  candidate; verify all manifest hashes and archive checksum; report limits.

Review focus: missing validation RPC fails closed; old failed jobs stay intact;
no rounding; free and Razorpay behavior unchanged; unsupported prices cannot be
claimed/requeued/finalized; fresh exact Google readback still required; readiness
uses the product revision and cannot imply Google acceptance from publication.

User's explicit execution and no-commit restrictions supersede skill workflow
prompts/commits. All hosted inspection uses plain SELECTs with aggregate counts.

Completion evidence: minimum-price-report.md; live Google reads and all hosted mutations remain explicitly pending. Independent review found no implementation blocker; matching-lease test coverage was strengthened and passed. New archive verified 304 files; previous archive retained unchanged.
