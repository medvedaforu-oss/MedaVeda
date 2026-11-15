# REMAINING WORK PRIORITY CHECKLIST

Audit date: 2026-11-11 UTC. Scope: current working tree, including pre-existing uncommitted changes. **Audit only; no deployment authorization.**

**Keep production sales disabled and preserve existing financial history until the mandatory gates below are accepted.** This is a remediation plan, not approval to perform changes.

## P0 — Critical production blockers

- [ ] Resolve targeted notification recipient isolation (AUD-002); verify database reads as recipient, foreign user, anonymous and admin.
- [ ] Resolve unknown refund/dispute acknowledgement (AUD-001) across complete verifier/webhook/reporting-worker closures. Preserve durable retry and fail-closed commitment semantics.
- [ ] Independently review/re-pin the corrected C wrapper and four-function upgrade in a new manifest/runbook. Original artifacts must stay immutable. Exclude isolated test installer and future ownership index unless separately reviewed.
- [ ] Confirm current deployment/ledger/owners/ACLs/RLS/indexes/triggers/config immediately before any future operation. Production currently lacks new proof RPC/handler path.
- [ ] Obtain current complete recovery evidence: application + managed Auth + Storage metadata and object bytes + config/secret recovery, tested compatible restore, RPO/RTO and provider reconciliation after restore.
- [ ] Privately reconcile two success-on-nonpaid purchases and one duplicate-success group against provider facts. Preserve history/access; approve any forward repair separately.
- [ ] Approve bounded operational window with operator, independent observer, incident owner, ingress and ALL financial worker quiescence. Include active `release-wallet-credits`; client Buy Now gates do not stop cron.
- [ ] Accept exact post-check and unknown-commit decision procedure before execution. No blind reruns or financial rollback.

## P1 — High-priority functional/security acceptance

- [ ] Repair duplicate import lint failures (AUD-005), admin forbidden status choices (AUD-004), analytics truncation (AUD-003), stale Play mock (AUD-008) and final-schema SQL fixtures (AUD-009) in separately authorized changes.
- [ ] Investigate referral SQL variation: first broad run passed, supported-socket rerun failed P10/H5 with `joined` values. Determine fixture/query-order contamination versus real referral-list defect; do not waive failed assertions.
- [ ] Rerun CI gates and relevant regressions with supported local fixtures; retain exact commands and failures as well as successful reruns.
- [ ] Deliver required A → B → atomic C → compatible Edge sequence only under separate authorization and accepted recovery/drift/drain gates. Validate ledger 66→69→73 and exact source/function/config contracts before resume.
- [ ] Accept hosted Auth (signup/email/password reset/MFA/token refresh/recovery) and private Storage authorization/object delivery with controlled accounts; no production test writes are implied by this report.
- [ ] Verify provider account ownership, KYC, correct APP_ENV/live mode, webhook URL/events/rotation/retry history and required server gates privately. Never publish credentials or use a real charge merely to infer configuration.
- [ ] For paid Play distribution, obtain completed India onboarding/per-app opt-in, active SKU/offer evidence, genuine native choice/token issuance, exact report/time/tax acceptance, Play payment/consumption/reversal acceptance and operational reporting deadline controls.
- [ ] Build exact current disabled-payment native release in an SDK-equipped environment; verify remote signing/versionCode/runtime, merged permissions, resolved Billing 8+ graph, R8 mapping, ABIs/16 KB alignment and privacy/config accuracy.
- [ ] Run real-device startup/login/course/search/Notes/PDF/download/offline/quiz/purchases/restart/network-loss/accessibility flows. Separately accept controlled payment/recovery/replay/reversal journeys before paid activation.
- [ ] Demonstrate large-PDF validator deployment/IAM/lease recovery and FCM/Expo registration/delivery. Test actual alerts, not only HTTP responses.

## P2 — Medium-priority bugs and operational improvements

- [ ] Review five moderate dependency findings with supported version constraints; avoid blind `npm audit fix --force` or Expo downgrade.
- [ ] Measure API/list behavior beyond one page for referrals/notifications/catalog diagnostics; review indexed query plans with realistic data.
- [ ] Establish queue-age/deadline/parked/capture-without-entitlement/compensation/void-cursor alerts, scheduler heartbeat, independent alert transport and operator response drills.
- [ ] Confirm Sentry DSN/release/mapping delivery, PII scrubbing and actual crash notification; approve OTA code-signing policy.
- [ ] Accept seven-day offline grace and reversal policy; verify no cross-account downloaded-content access and native process-death cleanup.
- [ ] Audit browser runtime/accessibility/responsiveness and measure web bundle loading/memory. Current web bundle export is about 5.1 MB; no performance SLA has been demonstrated.
- [ ] Verify admin content create/edit/publish/delete and small/large PDF upload propagate to consumer app under RLS without stale ownership/catalog presentation.
- [ ] Decide whether support needs server mail delivery; current handoff requires user's email app. Document website as marketing/auth surface unless commerce is intentionally added.

## P3 — Low-priority cleanup and polish

- [ ] Document the hosting source among root HTML, original website and generated website; remove ambiguity only through a reviewed change.
- [ ] Keep generated/native/local evidence distinct from versioned release artifacts, and identify complete working-tree release hashes.
- [ ] Improve action labels, status descriptions, empty/error messages and external-email handoff text; complete manual screen-reader/layout review.
- [ ] Consolidate obsolete comments/test paths and ensure all new safeguards/tests are explicitly exercised in CI.

## Safest order and completion rule

Preserve evidence/history → repair and test P0 code defects → accept full recovery → freeze/review exact release identity → resolve CI and required native/managed/provider acceptance → refresh production drift → separately authorize bounded controlled delivery with traffic/workers drained → validate exact contracts/history → separately approve resume/activation only after all required policy/provider/monitoring gates pass.

A successful synthetic test cannot replace managed restore or genuine provider/native acceptance. A healthy deployment cannot replace financial correctness. No production GO is justified until mandatory security, financial, recovery and deployment gates have complete accepted evidence.
