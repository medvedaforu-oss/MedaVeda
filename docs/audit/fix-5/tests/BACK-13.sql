\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5@example.invalid');
update public.referral_settings set credit_expiry_days=30 where id=true;
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,available_at,expires_at)
values('f5100000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000001','credit','pending',20,'admin_adjustment',now()-interval '50 days',now()-interval '40 days',now()-interval '10 days');
-- Changing the live setting must not change this earned credit's 30-day duration.
update public.referral_settings set credit_expiry_days=1 where id=true;
select public.release_due_wallet_credits('f5000000-0000-0000-0000-000000000001');
do $$ begin
 assert (select available=20 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'BACK-13: held credit expired before actual availability';
 assert (select expires_at=now()-interval '10 days' from public.wallet_ledger where id='f5100000-0000-0000-0000-000000000001'),'historical stamp was rewritten';
 assert (select effective_expires_at=now()+interval '30 days' from public.wallet_credit_policy where credit_id='f5100000-0000-0000-0000-000000000001'),'earned duration must survive settings change';
end $$;
\echo PASS BACK-13 duration snapshot, delayed release and immutable stamp
rollback;
