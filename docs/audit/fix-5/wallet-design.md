# Wallet explicit expiry design and implementation plan

Goal: fix BACK-11/13 without modifying historical ledger rows or weakening C5, refund, overdraw, append-only, sales, auth or ownership guarantees. Free-only; no live operations.

## Alternatives and decision

1. Existing time-filtered face-value balance: cannot preserve spent credits on expiry; rejected.
2. Fix-4 derived allocation-only balance with nominal provider reversal: quarantined; fails C5 raw signed ledger sum. Do not reuse.
3. **Explicit expiry monetary facts (selected):** maintain an append-only per-entry consumption journal, but the authoritative balance remains the signed ledger sum. Expiry inserts only unspent monetary remainder. Provider/admin reversal amounts are actual recovered money, never nominal lost face value. No live time filter in balance or trigger. This is the requested primary design; simpler recomputation-only FIFO would need replay on every read and cannot pin ordering of same-transaction events reliably.

## Monetary and lifecycle rules

- New internal tables: credit policy snapshots and immutable entry-to-credit consumption facts. No mutable balance column. All internal table RLS enabled, no client grants/policies.
- Snapshot for NEW pending credits is original `expires_at - available_at`; producers already stamp it from earning-time settings. Actual first pending→available transition stores first availability and effective expiry=that time+duration. Initially available credits keep explicitly supplied expiry. No-expiry duration is null.
- Existing credits are marked legacy in the snapshot backfill and keep original stamped expires_at even when released late. No historical date/status/amount rewrite. Optional separately reviewed legacy-policy adjustment may change derived policy only; never apply automatically.
- Historical debit/reversal replay creates journal facts only. Debit FIFO is earliest effective expiry, then creation/id; replay events ordered created_at/id. All credits at an identical timestamp are eligible, with stable credit ordering. Validate replay completeness; fail migration atomically rather than manufacture money.
- New debit BEFORE trigger locks owner, expires due remainder, checks exact signed balance. AFTER journal allocates FIFO. New reversal consumes only referenced credit remainder. Legacy reversal replay first consumes original and then FIFO for historical global-clawback semantics; future reversals cannot consume unrelated credits.
- Expiry function is service-only SECURITY DEFINER, fixed public search_path, per-user wallet advisory lock. Unique expiry-per-credit index and matching consumption protect replay. Fully spent credits need no zero-valued expiry row (amount>0 preserved). All monetary entries remain append-only.
- Refund restores a NEW available `order_refund` credit with NO expiry, consistent with existing refund behaviour. Original consumption remains spent. Refund before/after old expiry never resurrects old credits; unique order restore index preserves exactly-once. Chargeback/lost dispute never restores buyer wallet.
- get_my_wallet, quote, reservation, settlement call expiry through release/balance authority; helper becomes VOLATILE to support lazy maintenance then returns signed sum. Trigger uses same signed sum after maintenance. Admin and provider recovery use original remaining amount.
- Lock ordering: acquire affected wallet owners deterministically before order/referral/credit rows where two parties are involved. Release uses owner wallet lock before credit status updates; admin reverse uses owner lookup, wallet lock, then target row recheck. No new cron activation.
- No expiry setting canonical DB value is null; admin accepts blank/0 and saves null. DB zero input will be normalized by a BEFORE trigger to null, preserving existing CHECK and settlement null semantics. Invalid negative/fraction/nonfinite inputs rejected with field message.
- get_my_referral_list must respect actual ledger status, never infer release from nominal available_at. Mobile uses held/review wording and shows expired total if API supplies it; policy applies to newly earned credits, old dates retained.

## Invariant-by-invariant compliance plan (before migration)

The complete test/assertion inventory is in wallet-referral-map.md. Every listed test remains unchanged.

| Existing suite/invariant | Design obligation |
|---|---|
| batch1 C3/C4 | Full unspent reversal once; exact recovered ledger amount |
| batch1 C5/C6 | credit50-debit30-reversal20=0 raw signed sum, unrecovered30 flag; no nominal50 fact |
| batch1 C7/dispute hold/win/loss | Pending/disputed held; won restores access only; lost never buyer restore |
| batch1 refund restoration/idempotency | New no-expiry restore credit once; transaction failure rolls back all effects |
| batch1 L1-L7/admin/overdraw | Expired/held/spent reversals denied; same helper/trigger amount; original remainder bound |
| phase2_referral_wallet_checks | Own JWT reads, reward once, exact pricing caps, immutable ledger, row write denial |
| referral_limits_checks | Existing CHECKs retained; zero normalized to null before checks; invalid values denied |
| referral_off_wallet_checks / referral_switch_off_paths | Program off still no spending; display existing money |
| batch3/batch3b/identity/phone suites | Same phone, signup window, block, first-purchase, network-review gates preserved |
| wallet-concurrency/discount-concurrency/payment-concurrency | Shared advisory lock; reservations and once-only unique indexes preserved |
| Play/refund/settlement/snapshot suites | Same price/provider/entitlement checks; capped original-credit recovery |
| fix3-account_deletion / phase2 deletion | FK anonymization retained; journal references ledger IDs only; no customer identity columns |
| low_grants/admin_mfa/FK-index/append-only | Fixed search_path; internal helpers service-only, authenticated owner/admin endpoints preserved; FK indexes; journal immutable |
| all other canonical SQL/handler suites | Run full fix3-run-all.sh unchanged, plus fix4 and new fix5 scenarios |

## Execution order and gates

- [x] Preserve dirty diff/status; source maps and candidate failure reviewed.
- [ ] Agent R reviews this design and root approves before product code.
- [ ] V: add and execute new failing cases, record before logs; preserve existing tests.
- [ ] S: new timestamped migration after 20261114050400; local only.
- [ ] A/M: expiry validation/no-expiry normalization and truthful held/policy text with tests.
- [ ] Full SQL + concurrency + TypeScript/lint/admin/Deno/recovery/link checks.
- [ ] R adversarial review and final report with all pending gaps and owner steps.

No commit step is authorized. No user confirmation required: user explicitly delegated design approval to orchestrator + R.

## R gate amendments (first review rejected; no product code existed)

1. Legacy flag is permanent: even a pending legacy credit keeps its stamped expiry on eventual release. New pending credits alone use actual availability plus captured interval.
2. Operation time is transaction `now()` (matches existing order/ledger writers). Expiry boundary is `effective_expires_at <= now()`. New movement allocations use insertion sequence; legacy replay uses created_at/id and credits present at that time, with finite-expiry/created/id FIFO. Backdated future production entries are not a supported service write. Replay is deterministic and fails if incomplete.
3. Journal checks enforce positive pairing, unique consumer/credit, credit/type/owner consistency, per-credit capacity, exact parent allocation sum. Expiry references only original target. Internal tables have immutability triggers, RLS and no client grants. First-availability snapshot may transition null→timestamp once through internal trigger only.
4. Expiry insertion skips lazy-expiry recursion; it validates referenced remainder then creates exactly that allocation. Normal debit trigger excludes NEW from persisted balance and compares balance >= NEW.amount. AFTER trigger allocates NEW. No double subtraction.
5. Provider zero/partial recovery has durable existing `referral_credit_unrecovered` order/reason flag and rejected referral. Replays return without recovery if that marker exists. Positive recovery uses unique reversal key. Admin spent/expired/held requests fail without mutation; no successful zero operation is claimed.
6. Release locks user before updating statuses; null sweep iterates owners sorted. Admin reverse/reject and provider settlement/refund obtain the same wallet locks before row locks. Existing service writes enter journal/transition triggers, authenticated direct writes remain denied.
7. Backfill is one transaction; abort on inconsistent/unallocatable history. Preflight counts identify suspect histories for owner review, not correction. Historical journal may preserve old global reversal policy; future original-credit bounds do not retroactively reinterpret those facts.
8. Refund keeps unique order/source restore index; amount=original debit, never original credit face; no journal restoration of consumed old value. Lost dispute false restore retained.
9. Outer settlement/refund wrappers prelock buyer and referrer wallet IDs in UUID order before existing nested row locks. Admin reject discovers owners without lock, locks them, rechecks rows. No global lock. Direct status writes acquire owner lock in BEFORE transition trigger; production callers must enter wrappers before row updates. Account deletion concurrency remains a specific staging qualification risk if its independent auth row locks interact.
10. Internal balance, expiry, remaining and lock helpers revoked from public/anon/authenticated; service only. get_my_wallet uses auth.uid; quote wrapper retains auth/owner check. No broad write policies introduced; no WITH CHECK needed without client write policies.

Agent V supplied test review calls out same-transaction clock fixtures and the need for real two-session execution. Existing SQL suites remain byte-for-byte unchanged. New historical fixtures disable only the existing overdraw trigger while inserting a pre-expiry synthetic debit; separate runtime concurrency tests must exercise ordinary triggers without disabling any. This fixture convention is inherited from the prior reproductions and is disclosed, not production verification.

## Approved provider policy amendment after full-suite F8 failure

The unchanged phase2_referral_wallet_checks F8 requires the unexpired referral reward to be clawed back from current wallet funds, even when its original credit was consumed. C5 still requires only actually recovered money to enter the ledger. Thus provider clawback preserves the existing policy: recover min(original reward, current signed available balance), original remainder first then other eligible FIFO credits. Manual admin reversal stays original-remainder-only. Expired/pending originals never recover unrelated funds. This is different from refund restoration of a buyer debit, which remains a new no-expiry credit. Exact source, owner, original reward and same refunded order are checked server-side; arbitrary source labels do not authorize the exception. Positive recovery has a unique reversal key; zero/partial recovery has a durable unique unrecovered flag and replay guard.

Agent R approved this amendment based on supplied evidence, requiring controlled tests for both same-timestamp credit orderings, C5, held/expired originals and replay after deposits. The prior full-suite revised log was interrupted before its final exit; its F8 failure is valid failure evidence, not a completed suite.

No-expiry boundary amendment: admin blank/0 normalizes to canonical DB NULL. Raw SQL 0 acceptance is BLOCKED by unchanged referral_limits_checks K4; DB CHECK and K4 remain unchanged. New tables grant service-role INSERT/SELECT as required by unchanged f8 P3, with mutation/capacity/type/ownership backstops. No client grants.

## Existing CHECK diagnostic preservation

Final full-suite K4 caught the newly added min/max CHECK intercepting raw zero before the existing `referral_settings_other_ranges` CHECK. The final design leaves the existing minimum and its diagnostic authoritative; the new `referral_settings_expiry_duration_safe` CHECK adds ONLY the upper bound <=36,500. Their intersection remains NULL or 1..36,500. No valid/invalid domain is weakened and no test/assertion is changed.

The restricted `security_invoker=true` wallet_credit_terms view projects policy metadata for unchanged Fix 4 observer probes; clients have no SELECT grant. It does not determine balance or adopt the failed nominal-reversal design.
