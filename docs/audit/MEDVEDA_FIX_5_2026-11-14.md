# MedVeda Fix 5 — 14 November 2026

RELEASE_MODE = **free-only**. This is a source and disposable-local-database handoff. No staging, device, provider or production acceptance was performed. No live user/payment/wallet rows were read. The prior single-value expiry read of 30 days is owner-supplied context, not a new production query.

The final canonical SQL suite reports **ALL SUITES PASSED, exit 0**. All 34 targeted commands pass, including unchanged Fix-4 SQL probes, legacy replay and real concurrent sessions. Source checks also pass. Direct DB expiry `0` acceptance remains **BLOCKED** by unchanged K4; the admin accepts blank/0 and saves canonical DB `NULL`.

Safety snapshots: [pre-work patch](fix-5/pre-work.patch), [pre-work status](fix-5/pre-work-status.txt). These preserve tracked diffs/status, not untracked-file contents. The dirty tree is intentional. No preexisting invariant test or applied migration was edited by this task; [tracked-diff comparison](fix-5/after/protected-and-invariant-check.json) also confirms provider/build/config diffs match the initial snapshot. Whole-file staging can include earlier owner changes: review those before using the commands below.

## Findings

| ID | Severity | Final status | What changed / conclusion | Before → after proof |
|---|---|---|---|---|
| BACK-11 | Medium | FIXED - STAGING TEST PENDING | Explicit expiry debits only the unspent remainder; balance and trigger use signed ledger facts. Fully spent expired credits cannot consume future deposits. | [before](fix-5/before/BACK-11.log) → [after](fix-5/after/BACK-11.log); [partial](fix-5/after/BACK-11-partial.log), [FIFO](fix-5/after/FIFO.log) |
| BACK-13 | Medium | FIXED - STAGING TEST PENDING | New pending credits capture duration at earning; actual first availability starts their clock. Legacy credits keep stamped dates. | [before](fix-5/before/BACK-13.log) → [after](fix-5/after/BACK-13.log); [held before](fix-5/before/held-release-expiry.log) → [held/approval/expiry after](fix-5/after/held-release-expiry.log) |
| WR-01 | High | FIXED - STAGING TEST PENDING | Manual admin reversal is bounded by the selected credit's remainder, not unrelated global funds. Provider clawback intentionally retains the existing F8 policy described below. | [before](fix-5/before/WR-01.log) → [after](fix-5/after/WR-01.log) |
| WR-02 | Medium | FIXED - VERIFIED (automated) | Referral list uses actual ledger status; elapsed nominal hold cannot label a still-held reward “credited.” | [before](fix-5/before/WR-02.log) → [after](fix-5/after/WR-02.log) |
| WR-03 | Medium | FIXED - VERIFIED (automated) | Expiry field validation, error and no-expiry label; blank/0 normalizes to NULL. Existing `.select("id").single()` zero-row protection retained and exercised. | [before](fix-5/before/WR-03-admin.log) → [admin tests](fix-5/after/admin-tests.log); [DB boundary](fix-5/after/DB-NULL.log) |
| WR-04 | High | NOT REPRODUCED | Original proposed admin/release lock cycle was not reproduced on the pre-Fix-5 schema. Owner-first locks were nevertheless coordinated across new release/admin/erasure paths. An intermediate-Fix-5 erasure regression was reproduced and corrected; this is not evidence of a prior deployed deletion bug. | [scope](fix-5/wallet-bug-findings.md); [intermediate regression](fix-5/before/deletion-concurrency.log) → [final](fix-5/after/deletion-concurrency.log) |
| WR-05 | High | FIXED - STAGING TEST PENDING | Reciprocal-referral refunds reproduced an actual old-schema advisory-lock deadlock. Capture/refund/Play paths acquire affected owners in sorted order before rows. | [before](fix-5/before/WR-05.log) → [after](fix-5/after/WR-05.log) |
| WR-06 | Medium | FIXED - VERIFIED (automated) | Integer-maximum expiry overflowed earning arithmetic. Existing minimum plus new maximum-only CHECK restricts positive settings to 36,500 days; admin matches; no existing setting is clamped. | [before](fix-5/before/WR-06.log) → [after](fix-5/after/WR-06.log); [actual max-duration settlement](fix-5/after/expiry-boundaries.log) |
| WR-07 | Medium | FIXED - STAGING TEST PENDING | Rejection service/hook propagate the released-credit result; UI explicitly warns that rejecting a released referral leaves its credit in the wallet. Unknown RPC outcomes fail visibly. No automatic reversal or new reversal UI. | [before](fix-5/before/WR-07-admin.log) → [service tests](fix-5/after/admin-tests.log), [SQL contract](fix-5/after/WR-07.log) |
| REQ-DB-0 | Constraint conflict | BLOCKED | Direct SQL `credit_expiry_days=0` acceptance contradicts unchanged `referral_limits_checks` K4, which requires rejection with the existing CHECK diagnostic. NULL works. Unblocks only with explicit owner authorization to change that invariant; no such test change was made. | [requested raw-zero probe](fix-5/before/WR-03.log), [preserved rejection / NULL acceptance](fix-5/after/DB-NULL.log), [K4 final full pass](fix-5/after/full-sql-accepted.log) |
| LEGACY-POLICY | Policy | OWNER ACTION REQUIRED | Default is retain stamped legacy dates, including already-held credits. A separately gated optional policy file is prepared but unexecuted and not test-certified. | [legacy proof](fix-5/after/legacy-backfill.log), [optional file](fix-5/optional/20261114090100_legacy_availability_policy.OWNER_REVIEW.sql) |

Root causes, original locations and concrete scenarios: [finding register](fix-5/wallet-bug-findings.md). Full scope: [database map](fix-5/wallet-referral-map.md), [migration inventory](fix-5/migration-inventory.md), [client/backend map](fix-5/wallet-client-map.md), [hunt coverage and limits](fix-5/hunt-coverage.md). Same-device abuse across unrelated verified identities/networks is not proven impossible; no universal anti-farming claim is made.

## Design and invariant compliance

[The design and amendment history](fix-5/wallet-design.md) was written before the migration. R first rejected it, then approved amendments before implementation. The selected design differs from the quarantined Fix-4 candidate: **the authoritative balance is the signed ledger sum**, and provider reversals record actual recovered money, never nominal loss.

`available = posted credits − posted debits − posted reversals − posted expiry facts`.

Expiry maintenance uses the clock to append due facts; the balance formula has no time-dependent credit filter. Consumption facts allocate deterministic earliest-expiry credits first. A unique expiry target and owner lock prevent double expiry. New credit duration snapshots are independent of later settings; first availability sets effective expiry. Immutable legacy ledger stamps are untouched.

Buyer refunds create one **new no-expiry credit** equal to the original wallet debit; they never reopen original credit consumption. Lost disputes do not restore buyer wallet funds. Existing provider clawback policy is preserved: an **unexpired released referral reward** may be recovered from the referrer's current available funds, original remainder first then FIFO, capped by reward and available balance. This is required by F8; C5 requires only actual recovered money in the ledger. Expired/held rewards cannot recover unrelated funds. Zero/partial recovery has a durable review flag and replay guard. Manual admin reversal is stricter: selected-credit remainder only.

| Existing invariant | Final compliance / evidence |
|---|---|
| BACK-11 full spend and partial remainder | New credit100 remains spendable100; only unspent remainder expires once |
| FIFO across finite/no-expiry credits | Earliest expiry consumed first; no-expiry last; deterministic ties; [probe](fix-5/after/FIFO.log) |
| batch1 C3/C4 | Full unspent reversal once, replay no second reversal |
| batch1 C5/C6 | Credit50 − spend30 − actual reversal20 = raw ledger sum0; unrecovered30 flagged; replay unchanged |
| phase2 F8 | Existing provider recovery preserved under both controlled credit tie orders; [one](fix-5/after/provider-clawback.log), [other](fix-5/after/provider-clawback-reverse-tie.log) |
| Refund restoration, partial refund and chargeback | Unique order restore, original debit untouched; partial ignored; lost dispute never restores; full suite unchanged |
| Pending/network/dispute holds | No release before approval; actual approval/release starts new credit duration; real clock expiry once |
| Admin held/expired/spent/duplicate reversal | Original checks retained, original remaining bound added; batch1 L cases pass |
| Overdraw/negative/zero/paise | Same signed balance in helper/guard; positive amounts and exact numeric arithmetic; [probe](fix-5/after/security-and-conservation.log) |
| Append-only ledger and consumption | No deletes/truncate/monetary edits; expiry target immutable; new journal immutable; [security](fix-5/after/expiry-security.log) |
| K4 and other settings limits | Raw0 remains rejected by original minimum CHECK; NULL accepted; new CHECK adds maximum only |
| RLS/Auth/MFA/grants/FK indexes | Existing gates unchanged; new helpers restricted; no client write policies added; invoker metadata view; full grant/MFA/FK suites pass |
| Reservation/discount/payment concurrency | All existing runners unchanged; additional three-session settle+expiry+refund conserves balance60, expiry60 once and restore40 once |
| Deletion/anonymization | Ledger IDs/facts retained, user references null; coordinated owner locks prevent new erasure/reversal cycle |
| Older transaction sees new deposit | New allocations use committed lots present at insertion; only historical replay uses timestamp ordering; [before](fix-5/before/new-credit-concurrency.log) → [after](fix-5/after/new-credit-concurrency.log) |
| Legacy history | Backfill writes derived facts only; protected original fields compare unchanged; held legacy expiry retains its stamped deadline |
| Disabled sales/referral-off/access ownership | Billing flags untouched, existing sales/referral-off/entitlement guard tests pass |

[Expanded assertion-by-assertion compliance](fix-5/invariant-compliance.md) complements the complete test inventory. The final full suite uses the existing canonical runner, whose retired `tests/legacy/` suites remain excluded; no retired-suite pass is claimed.

Discovery children had no filesystem/execution tools. Root performed source operations and tests; R independently reviewed supplied design/source excerpts and reported results. [Review record](fix-5/design-review.md) is **not independent full-file execution certification**. No staged/device/production result is inferred.

## Owner steps

1. **Aggregate preflight, owner-run only.** Review [owner-preflight.sql](fix-5/owner-preflight.sql), then run it read-only against the intended environment. It returns counts only: unsafe settings, expiry exposure, held credits past expiry, negative signed histories and chronology anomalies. Exposure counts are not exact loss estimates. This SQL was written for you and was not run by this agent. Review any unsafe settings/history counts before rollout; backfill aborts atomically on unallocatable history rather than rewriting it.
2. **Staging before any production decision.** Review the entire dirty tree and validate against an isolated staging history copy. Apply `20261114090000_fix5_wallet_expiry_facts.sql` first; matching functions next if their bundles need deployment; admin/mobile last. Fix 5 itself changes SQL RPC implementations, not Edge source. Keep `new_orders_enabled=false` and billing flags unchanged. Do not activate cron. No deployment is authorized or performed by this handoff.
3. **Set/verify no expiry.** In admin → Referrals → Credit expiry, leave blank or enter 0, save, reload. The service sends NULL; DB accepts NULL. Owner verification: `select credit_expiry_days is null as no_expiry from public.referral_settings where id=true;` expects true. A missing/denied singleton save must error. Positive values must be whole days 1–36,500. This affects newly earned credits; it does not erase old dates or restore already-lost historical spendability by itself.
4. **Legacy decision.** Default decision in this implementation is **KEEP STAMPED DATES**. Do not run the [optional legacy policy file](fix-5/optional/20261114090100_legacy_availability_policy.OWNER_REVIEW.sql) as part of normal rollout. If you choose availability-based policy for legacy credits, review and rehearse that file separately before wallet reads materialize legacy expiry. It requires an explicit approval setting, alters derived policy only, and aborts if legacy expiry facts already exist. It may also extend provider clawback eligibility. Already-posted expiry requires a separate reviewed compensating-credit policy; never delete/rewrite ledger facts. The optional file was not executed, even locally.
5. **Staging script and expected output.** Follow [staging-acceptance.md](fix-5/staging-acceptance.md). Against an owner-configured isolated staging scratch service only: `psql service=medveda_staging_scratch -X -v ON_ERROR_STOP=1 -v FIX5_STAGING_ACCEPTANCE=1 -f docs/audit/fix-5/staging-wallet-smoke.sql`. Expect 19 PASS markers/rollbacks and exit0. Then qualify actual Auth/API, disabled-sales denial, admin saves/rejection warnings, mobile no-expiry/positive-expiry/expired-only display and old-client compatibility. Review custom hosted terms URLs separately. No provider payment/refund/message is needed. Record project/build/device identity and actual results.
6. **Rollback.** Admin/mobile can revert their UI while retaining the additive wallet response. Do not restore the old time-filter balance function after expiry facts exist: that would double-deduct expiry. Database recovery should be a reviewed forward migration; never remove immutable expiry/consumption facts. Take a staging backup before rehearsal. Migration validation failures roll back atomically. Stop rollout on ambiguous legacy chronology, unexpected backfill duration or any failed invariant.

## Raw final results

| Check | Result | Raw evidence |
|---|---|---|
| Mobile TypeScript / full ESLint | PASS; fresh mobile tsc and focused lint also passed after expired-only display correction | [tsc](fix-5/after/mobile-tsc.log), [full lint](fix-5/after/mobile-eslint.log), [focused lint](fix-5/after/expired-ui-eslint.log) |
| Admin app/node TypeScript | PASS, exit0 | [app](fix-5/after/admin-tsc.log), [node](fix-5/after/admin-node-tsc.log) |
| Admin tests and existing referral batch | PASS, including expiry boundaries, real-service fake-transport singleton/normalization/rejection cases | [tests](fix-5/after/admin-tests.log), [referral batch](fix-5/after/admin-referral-tests.log) |
| Deno cached check + unit | PASS; 46 passed, 0 failed | [check](fix-5/after/deno-check.log), [unit](fix-5/after/deno-unit.log) |
| FULL canonical SQL + handler suites | ALL SUITES PASSED, observed exit0; 44 PASS suite/category lines; C5/F8/K4 unchanged | [full raw](fix-5/after/full-sql-accepted.log) |
| Targeted wallet/Fix-4/concurrency/legacy commands | 34 commands, all exit0, final maximum-only CHECK source | [results](fix-5/after/target-results.json), [progress](fix-5/after/target-progress-final.log) |
| Unchanged Fix-4 concurrency addition | PASS, observed exit0; duplicate request/snapshot/double-debit assertions unchanged | [raw](fix-5/after/fix4-concurrency.log) |
| Real concurrent sessions | Reciprocal refunds, settle+expiry+refund, erasure/admin, old transaction/new deposit all PASS | [WR-05](fix-5/after/WR-05.log), [3 sessions](fix-5/after/concurrency.log), [erasure](fix-5/after/deletion-concurrency.log), [deposit](fix-5/after/new-credit-concurrency.log) |
| Hold/approval/actual expiry | PASS, synthetic real-clock boundary with no ledger timestamp rewrite | [raw](fix-5/after/held-release-expiry.log) |
| Password recovery | 26/26 tests plus 24 pattern checks PASS | [raw](fix-5/after/password-recovery.log) |
| Website links | 17 pages, no problems | [raw](fix-5/after/website-links.log) |
| Rendered mobile terms and expired-only wallet | PASS for null/0/30 terms; expired-only balance remains visible with program disabled | [terms](fix-5/after/wallet-terms.log), [expired-only](fix-5/after/mobile-wallet-expired-ui-selftest.log) |
| Protected flags and preexisting tracked SQL diffs | Match pre-work snapshot | [comparison](fix-5/after/protected-and-invariant-check.json) |

[Final result metadata](fix-5/after/final-results.json), [source command results](fix-5/after/source-results.json). Interrupted final-run logs are incomplete, not accepted passes. Earlier failed diagnostic/policy attempts remain evidence; only `full-sql-accepted.log` is the final canonical full result. The first unsynchronized deposit-race attempt is explicitly labelled; the synchronized before/after test reproduced and corrected the actual timestamp issue.

## Ready to commit groups — owner review commands, NOT executed

Review whole-file diffs first: several paths also contain earlier intentional owner changes. No commit is authorized. These commands exclude raw logs, patches, status snapshots, result JSON, local databases and the quarantined Fix-4 candidate.

Backend schema and invariant probes:

```bash
git add -- supabase/migrations/20261114090000_fix5_wallet_expiry_facts.sql docs/audit/fix-5/tests/BACK-11.sql docs/audit/fix-5/tests/BACK-11-partial.sql docs/audit/fix-5/tests/BACK-13.sql docs/audit/fix-5/tests/WR-01.sql docs/audit/fix-5/tests/WR-02.sql docs/audit/fix-5/tests/WR-06.sql docs/audit/fix-5/tests/WR-07.sql docs/audit/fix-5/tests/DB-NULL.sql docs/audit/fix-5/tests/FIFO.sql docs/audit/fix-5/tests/refund-before-expiry.sql docs/audit/fix-5/tests/refund-after-expiry.sql docs/audit/fix-5/tests/no-expiry-and-deletion.sql docs/audit/fix-5/tests/security-and-conservation.sql docs/audit/fix-5/tests/expiry-security.sql docs/audit/fix-5/tests/provider-clawback.sql docs/audit/fix-5/tests/provider-clawback-reverse-tie.sql docs/audit/fix-5/tests/provider-zero-replay.sql docs/audit/fix-5/tests/expiry-boundaries.sql docs/audit/fix-5/tests/get-wallet-expiry.sql docs/audit/fix-5/tests/legacy-before.sql docs/audit/fix-5/tests/legacy-after.sql docs/audit/fix-5/tests/concurrency.py docs/audit/fix-5/tests/deletion-concurrency.py docs/audit/fix-5/tests/new-credit-concurrency.py docs/audit/fix-5/tests/held-release-expiry.py docs/audit/fix-5/tests/run-targeted.py
```

Admin settings and honest rejection feedback:

```bash
git add -- admin-panel/package.json admin-panel/src/utils/referralLimits.ts admin-panel/src/services/referralService.ts admin-panel/src/hooks/useReferrals.ts admin-panel/src/pages/Referrals.tsx admin-panel/scripts/wallet-expiry-selftest.mjs admin-panel/scripts/wallet-settings-save-selftest.cjs admin-panel/scripts/wallet-rejection-selftest.cjs
```

Mobile terms and expiry visibility:

```bash
git add -- mobile-app/src/types/referral.ts mobile-app/src/screens/referral/ReferralScreen.tsx mobile-app/src/screens/referral/ReferralTermsScreen.tsx mobile-app/scripts/wallet-terms-selftest.cjs mobile-app/scripts/wallet-expired-ui-selftest.cjs docs/audit/fix-5/tests/mobile-policy.cjs
```

Audit/runbooks and local verification code:

```bash
git add -- docs/audit/MEDVEDA_FIX_5_2026-11-14.md docs/audit/fix-5/wallet-referral-map.md docs/audit/fix-5/migration-inventory.md docs/audit/fix-5/wallet-client-map.md docs/audit/fix-5/wallet-bug-findings.md docs/audit/fix-5/wallet-design.md docs/audit/fix-5/design-review.md docs/audit/fix-5/adversarial-review.md docs/audit/fix-5/invariant-compliance.md docs/audit/fix-5/hunt-coverage.md docs/audit/fix-5/owner-preflight.sql docs/audit/fix-5/staging-acceptance.md docs/audit/fix-5/staging-wallet-smoke.sql docs/audit/fix-5/run-final-checks.py docs/audit/fix-5/tests/run-baseline.sh
```

The optional legacy policy file is **owner-review-only**, excluded from the release staging groups above. The intentionally incompatible raw-zero probe `fix-5/tests/WR-03.sql` is retained as local failed-requirement evidence, excluded from accepted test/release groups. Never stage `docs/audit/**/*.log`, patches/status/result metadata, `/tmp` artifacts, `.env`, credentials or `fix-4/candidates/20261114050100_fix4_wallet_credit_allocations.BLOCKED.sql`.

## Counts and residual risk

- FIXED - VERIFIED (automated): **3**
- FIXED - STAGING TEST PENDING: **5**
- NOT REPRODUCED: **1**
- BLOCKED: **1**
- OWNER ACTION REQUIRED: **1**

Total **11** tracked finding/request/policy rows: nine BACK/WR findings plus the raw-zero conflict and legacy policy decision. Local proof does not certify a production release. Remaining risks: legacy replay chronology/volume may require owner review and can intentionally abort; no affected live-balance counts were read; staging/device/deployed-version behavior is unverified; optional legacy policy is unexecuted; arbitrary device-farming prevention and all possible concurrency schedules are not proven. No historical ledger rows were rewritten and no sales/billing flag was enabled.

NO COMMITS WERE MADE. NOTHING WAS PUSHED. NOTHING WAS DEPLOYED.
