\set ON_ERROR_STOP on
select public.release_due_wallet_credits('f5700000-0000-0000-0000-000000000001');
do $$ begin
 assert (select available=100 from public.wallet_balance_of('f5700000-0000-0000-0000-000000000001')),'legacy replay incorrect';
 assert not exists(select 1 from public.fix5_legacy_snapshot s join public.wallet_ledger l using(id) where s.fact is distinct from to_jsonb(l)-'status'-'status_changed_at'-'expiry_credit_id'),'legacy historical monetary or time fields changed';
 assert (select legacy and effective_expires_at<now() from public.wallet_credit_policy where credit_id='f5710000-0000-0000-0000-000000000002'),'legacy held credit dates must remain original';
 assert (select sum(amount)=80 from public.wallet_ledger where user_id='f5700000-0000-0000-0000-000000000001' and entry_type='expiry'),'legacy unspent60 plus held20 should expire, not spent40';
end $$;
\echo PASS legacy history replay, immutable stamps, existing held deadlines retained
