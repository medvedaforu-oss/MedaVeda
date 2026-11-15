\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5@example.invalid');
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000002','fix5friend@example.invalid');
insert into public.referrals(id,referrer_id,referred_id,code_used,status)
values('f5200000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000002','SYNTHETIC','qualified');
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,referral_id,available_at)
values('f5000000-0000-0000-0000-000000000001','credit','pending',20,'referral_reward','f5200000-0000-0000-0000-000000000001',now()-interval '1 day');
select set_config('request.jwt.claims','{"sub":"f5000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$ begin
 assert (select status='purchased_pending' from public.get_my_referral_list() where id='f5200000-0000-0000-0000-000000000001'),'WR-02 pending overdue credit falsely labelled credited';
end $$;
\echo PASS WR-02 actual status authority
rollback;
