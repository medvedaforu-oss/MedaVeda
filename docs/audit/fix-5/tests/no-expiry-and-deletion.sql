\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5more@example.invalid');
update public.referral_settings set credit_expiry_days=null where id=true;
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,available_at)
values('f5100000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000001','credit','pending',100,'admin_adjustment',now()-interval '1 day');
select public.release_due_wallet_credits('f5000000-0000-0000-0000-000000000001');
select public.expire_due_wallet_credits('f5000000-0000-0000-0000-000000000001');
do $$ begin
 assert (select available=100 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'no-expiry value lost';
 assert (select effective_expires_at is null from public.wallet_credit_policy where credit_id='f5100000-0000-0000-0000-000000000001'),'no-expiry deadline invented';
end $$;
select public.erase_user_data('f5000000-0000-0000-0000-000000000001');
do $$ begin
 assert (select user_id is null and amount=100 from public.wallet_ledger where id='f5100000-0000-0000-0000-000000000001'),'deletion must anonymize but retain credit';
 assert not exists(select 1 from public.wallet_order_reservations where user_id='f5000000-0000-0000-0000-000000000001'),'deletion left reservation';
end $$;
\echo PASS no-expiry release and account deletion with balance
rollback;
