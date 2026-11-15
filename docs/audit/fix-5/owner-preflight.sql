-- OWNER RUN ONLY. Read-only aggregate counts, no user/payment/wallet rows returned.
-- Safe before Fix 5; do not call wallet_balance_of here (Fix 5 makes it mutating).
begin read only;
select count(*) as settings_outside_safe_expiry_range from public.referral_settings
 where credit_expiry_days is not null and credit_expiry_days not between 1 and 36500;
select count(*) as no_expiry_settings_rows from public.referral_settings where id=true and credit_expiry_days is null;
select count(*) as expired_available_credits from public.wallet_ledger
 where entry_type='credit' and status='available' and expires_at<=now();
select count(*) as pending_credits_past_stamped_expiry from public.wallet_ledger
 where entry_type='credit' and status='pending' and expires_at<=now();
select count(*) as users_with_expired_credits_and_spending from (
 select distinct c.user_id from public.wallet_ledger c
 where c.user_id is not null and c.entry_type='credit' and c.status='available' and c.expires_at<=now()
 and exists(select 1 from public.wallet_ledger d where d.user_id=c.user_id and d.status='available' and d.entry_type in('debit','reversal'))
) exposed;
-- This is an exposure count, not an exact loss or allocation reconstruction.
select count(*) as negative_raw_signed_wallets from (
 select user_id from public.wallet_ledger where user_id is not null and status='available'
 group by user_id having sum(case when entry_type='credit' then amount else -amount end)<0
) inconsistent;
select count(*) as historical_movements_without_an_earlier_credit from public.wallet_ledger d
 where d.user_id is not null and d.status='available' and d.entry_type in('debit','reversal')
 and not exists(select 1 from public.wallet_ledger c where c.user_id=d.user_id and c.entry_type='credit'
  and c.status='available' and c.created_at<=d.created_at);
-- Settings bounds/negative history/chronology counts must be reviewed before rollout.
-- Same-transaction and cross-transaction timestamps can make exact legacy order ambiguous.
commit;
