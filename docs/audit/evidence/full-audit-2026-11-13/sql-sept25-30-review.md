# SQL migrations 25–30 September — full-body read-only review

Fully read all 18 migrations, 228,828 bytes, every function/body/DDL/policy/trigger/grant and migration comment. No function-body dedup/skipping was used: similar reissued definitions were read in full. File ledger: `sql-sept25-30-reviewed.txt`. No application/schema/live data changes. Parent owns disposable PostgreSQL execution and live evidence; this report does not claim runtime reproductions unless linked by parent.

Later override handling was coordinated with backend auditor: original pricing/settlement functions are heavily superseded by October wallet reservations, November snapshot settlement/choice/recovery/commit/reversal migrations. Historical unsafe settlement/current-product snapshots/stale-wallet shortcuts are not newly reported as current vulnerabilities. The following wallet/flag/push functions survive unchanged; verified by global definition-name scan and backend independent review.

## BACK-11 — Medium — Expiring spent credits consume future wallet balance again

Current definitions: `supabase/migrations/20260925110000_phase2_wallet_ledger.sql:190` wallet_balance_of (sole definition), particularly :199–201:

```sql
sum(amount) filter (where entry_type='credit' and status='available'
  and (expires_at is null or expires_at>now()))
- sum(amount) filter (where entry_type in ('debit','reversal') and status='available')
```

`20260926130000_batch1_hygiene.sql:180–182` wallet_ledger_no_overdraw repeats the same arithmetic; this trigger also has no later replacement. Service-only balance helper is called by authenticated get_my_wallet and service pricing/settlement.

Root cause: credits expire out of the positive sum, but debits that already spent those credits stay forever in the negative sum. No debit-to-credit allocation or remainder accounting exists. Synthetic sequence: credit100→spend100→that credit expires→new nonexpired credit100. Expected new balance100; current helper returns greatest(0,100−100)=0. Trigger then refuses spending the valid new credit as overdraw. Reversed expiring credits have the same double-deduction shape. This is under-crediting/loss of spendability, not overdraw or demonstrated theft. Requires an expiring credit policy; live credit_expiry_days and affected balances are UNVERIFIED in this sub-review. Parent requested synthetic PG17 reproduction; no production mutation needed.

Proposed diff/design, not applied:

```diff
- activeCreditSum - allTimeDebitAndReversalSum
+ sum(activeCreditRemaindersAfterDeterministicConsumptionAndReversalAllocation)
```

Make display, pricing, reservation validation and no-overdraw trigger share one authoritative per-credit allocation computation. Preserve immutable ledger/history and existing idempotency. Do not fix by dropping all historical debits or subtracting expired original face value again; only unspent remainders should expire. Requires reviewed allocation/replay/migration policy, tests before/after expiry with partial spend, reversal, refund restoration, concurrent checkout and new credits.

## BACK-12 — Medium — Flag resolution reports success even if no row was resolved

Current sole definition `20260925120000_phase2_orders_pricing_and_settlement.sql:274`, lines :285–289:

```sql
update public.order_review_flags ... where id=p_flag_id and resolved_at is null;
perform set_config('app.trusted_order_write','false',true);
if not found then raise exception 'Flag not found or already resolved'; end if;
```

Root cause: PERFORM set_config returns one row and overwrites PL/pgSQL FOUND=true after the UPDATE. Nonexistent/already-resolved ID always passes the intended missing-row check. Admin authorization remains enforced; this is false mutation confirmation and operational review integrity, not unauthorized resolution. No later replacement (backend confirmed).

Proposed precise diff:

```diff
+ declare v_rows integer;
  update public.order_review_flags ... where id=p_flag_id and resolved_at is null;
+ get diagnostics v_rows = row_count;
  perform set_config('app.trusted_order_write','false',true);
- if not found then raise exception 'Flag not found or already resolved'; end if;
+ if v_rows=0 then raise exception 'Flag not found or already resolved'; end if;
```

Synthetic local tests: authorized admin resolves one flag once; repeat/nonexistent must return controlled failure, original audit actor/timestamp unchanged. AAL1/unauthorized denied by final am_i_admin policy.

## BACK-13 — Medium conditional expiry policy — Manual hold can expire a reward before first availability

Current release definition `20260927130000_batch3b_antifarming.sql:698` (last definition). It leaves a shared-network reward pending while an unresolved flag exists (:739–744), then changes only status to available (:734). Wallet append-only trigger fixes available_at/expires_at immutable at `20260925110000_phase2_wallet_ledger.sql:82–83`; status change stamps status_changed_at.

Earning side `20260927130000_batch3b_antifarming.sql:682–686` sets expires_at to earning-time + hold-days + credit-expiry-days. Later Razorpay legacy body still uses this formula (`20261104100000_razorpay_snapshot_discount_retry.sql:399–402`); backend confirms final Play credit creation also retains it. Therefore this is not merely superseded September code.

Root cause: scheduled release time is treated as actual first availability even though dispute/shared-network holds postpone release. If configured expiry is7 days and review lasts14 after nominal release, reward appears pending/held, is approved, becomes status available and is immediately excluded by expires_at<=now. Mobile ReferralTermsScreen says expiry after it becomes available; the held credit was never spendable. Expiry configuration/live affected records and exact intended product policy UNVERIFIED. Current defaults permit null/no expiry; no claim of observed customer loss.

Proposed diff/design if policy is expiry after actual availability:

```diff
- effectiveExpiry = original expires_at
+ effectiveExpiry = actual status_changed_at + captured(expiryDuration)
```

Derive captured duration from original expires_at−available_at where valid, or store a reviewed duration snapshot for future rows. Centralize effective expiry in balance, no-overdraw, reversal and read UI; do not silently mutate immutable historical columns or use changing current settings retroactively. Alternatively explicitly approve/disclose expiry while held. Test approval just before/after original expiry, dispute hold/win, canceled reward, settings changes and refund.

## BACK-15 — Medium — Eleventh new device fails before push registration can evict old token

Sole current definitions `20260930100000_medium_db_hardening.sql:135` push_tokens_cap and :157 register_push_token. BEFORE INSERT trigger at :138–141:

```sql
if current_setting('role',true) in ('anon','authenticated')
  and not exists (... expo_push_token=new.expo_push_token)
  and (select count(*) ... user_id=new.user_id)>=10
then raise exception 'Too many registered devices'; end if;
```

RPC :172 inserts/upserts first; only afterwards :178 deletes rows outside newest10. SECURITY DEFINER changes current_user but current_setting('role') remains authenticated, so trigger applies to authenticated RPC callers.

Root cause: intended keep-newest10 cleanup is unreachable for the eleventh brand-new token; BEFORE INSERT raises before cleanup. Transferring an already-existing token takes a different branch and can reach cleanup, but does not fix a new device. Mobile registration catches error and returns null, no user-facing device-management action. No later override (global scan/backend confirmation). Actual count/device registration UNVERIFIED.

Proposed diff/design:

```diff
+ serialize register_push_token by user advisory lock
+ in trusted RPC, remove only oldest owned excess token(s) before inserting brand-new token
  insert ... on conflict ...;
  keep newest10 deterministically (timestamp,id)
```

Retain trigger cap for direct writes, account-bound takeover, rate limiting and rollback atomicity. Decide whether product intends hard10 refusal or automatic oldest eviction; if refusal is deliberate, provide device-management/error UI and remove misleading keep-newest behavior claim. Test10 existing + new11th via actual authenticated-role RPC; expect final count10/new token present/oldest gone under eviction policy, concurrent calls bounded, existing token refresh does not delete itself.

## Full-file review inventory and override notes

| Migration | Reviewed behavior/current disposition |
|---|---|
| 20260925100000 phase2 config/product type | Adds product_type enum-like check, reward/wallet/expiry/window/checkout fields, aggregate range constraint, first_order unique and self-check. Later tighter named settings checks replace range; no unexpected grant. |
| 20260925110000 wallet ledger | Immutable ledger/FKs, one referral-credit/order-debit/refund/reversal indexes, append-only/delete/truncate/client-write triggers, own/admin read RLS and restricted helpers; balance flaw BACK11. get_my_wallet auth-bound. get_my_referral_list masked first/last initial; future-held status deserves UI interpretation, no new authorization defect established. Optional cron sweep catches setup errors; actual job state parent scope. |
| 20260925120000 pricing/settlement | Breakdown check/immutability, per-user locks, server-side quote/create, review flags, admin resolve BACK12, settlement/wrapper/refund/referral/rejection functions and privilege/self-checks. Product snapshot/stale wallet/refund weaknesses in original bodies superseded; not current findings. |
| 20260925130000 debug removal | Enumerates/drops all public.debug_whoami overloads; read-only helper exposure retired. |
| 20260925140000 discount once | Discount-order pointer + expanded review reasons; old duplicate-discount grant behavior later superseded, not reported as live exploit. |
| 20260926100000 refund/dispute | Closed purchase statuses; reverse_payment locks buyer before order, revokes purchase/restores wallet/reverses pending/released referral, flags shortfall, lost/open/won dispute flow; later wrapper/capture reversal policy must be assessed at final backend. Shared-network/expiry behavior retained into later release definition. |
| 20260926110000 settle flags | First-settlement wallet debit even stale/discount-duplicate, duplicate purchases do not grant, review reasons/account-deletion/replay/refund handling; later snapshot/compensation replacement parent scope. |
| 20260926120000 block owned | Pricing/quote already_owned, one-success index with explicit preexisting-row exemption. Historical exact UUID/payment comments not reproduced. Later settlement guards remain parent scope; mobile already-owned response regression separately MOB18. |
| 20260926130000 hygiene | Temporary validation helper, analytics ownership/size bounds, protected profile/admin bypass/email sync/phone verification reset, quiz constraints/email guard, order/FKs/index cleanup, no-overdraw BACK11 and admin reversal clamp. Profile logic subsequently reissued phone guard; no arbitrary direct client write established. |
| 20260927100000 legacy admin policies | Adds missing am_i_admin settings twin before drops; removes email/is_admin policies, guards dependency removal, drops is_admin. Current am_i_admin/MFA definition parent scope. |
| 20260927110000 excess grants | Removes TRUNCATE/REFERENCES/TRIGGER client grants and anonymous DML except analytics; alters postgres defaults, explicitly catches expected hosted supabase_admin permission limitation. No unsupported claim that all future creators are covered. |
| 20260927120000 referral hardening | Optional verified-phone gates default false, rate limit10/hr, cap under referrer lock, cryptographic rejection-sampled31-character code generator, exact lookup/check, removes student raw referral policy, masked compatibility RPC; settlement verification logic subsequently anti-farming/replaced. Phone verification disabled is explicit product decision, not guessed defect. |
| 20260927130000 anti-farming | Retained hashed identity table/server-only helpers/backfill, normalized email/phone (hashes personal data), fail-open shared-IP signal, revised pricing/apply/settlement/release with admin-held credit. Identity retention now has later policy/purge changes parent scope. BACK13 release timing; exact bodies read all775 lines. |
| 20260928100000 settings limits/audit | Named numeric bounds and remaining fields; refuses invalid existing settings, per-change old/new-only audit trigger with actor/email, admin-only read and client write revoked. Operational retention parent scope. |
| 20260928110000 wallet program off | Guard prior migration; wallet disabled in create/quote when program disabled, retains existing balances/priced orders; later quote/create replacements checked by backend. |
| 20260929100000 phone/storage | Protected direct phone/normalized-phone changes, rate-limited change_my_phone neutral collision response, verification reset/clearing; exact active-note storage suffix replacing unsafe substring. Storage policy subsequently service-only, so old direct-preview gap not current finding. |
| 20260930100000 medium hardening | Pinned search paths, trigger EXECUTE revokes, authenticated-only helpers, auth.uid scalar-subquery policy rewrite, redundant policy drops, FK indexes, quiz/analytics bounds, token-format/cap/register BACK15 and auth-confirmed phone trigger. No claim of SMS live configuration. |
| 20260930110000 grant tightening | Removes client writes unused by admin/app; anon SELECT allowlist, signed-in-only note policy to avoid anon permission-error reads. Later storage/server-write restrictions supersede. |

## Validation boundary

Backend auditor independently confirmed no later replacement for wallet_balance_of, no_overdraw, admin_resolve_order_flag, push_tokens_cap/register_push_token; release_due_wallet_credits last is September27. Parent can attach safe local PG reproductions. No live users, private token/identity rows, cron command credentials or secrets were selected, no refund/provider action performed. Conditional business-policy findings are not evidence of currently affected users. Historical grant/RLS fixes are reviewed against later overrides rather than presumed deployment parity.
