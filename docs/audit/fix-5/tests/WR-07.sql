\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5-reject-owner@example.invalid'),('f5000000-0000-0000-0000-000000000002','fix5-reject-friend@example.invalid');
insert into public.admins(id,email) values('f5000000-0000-0000-0000-000000000001','fix5-reject-owner@example.invalid');
insert into public.referrals(id,referrer_id,referred_id,code_used,status) values('f5200000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000002','REJECT','rewarded');
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,referral_id) values('f5000000-0000-0000-0000-000000000001','credit','available',50,'referral_reward','f5200000-0000-0000-0000-000000000001');
select set_config('request.jwt.claims','{"sub":"f5000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
do $$ declare r jsonb;begin
 r:=public.admin_reject_referral('f5200000-0000-0000-0000-000000000001','Synthetic');
 assert (r->>'credit_already_released')::boolean and not (r->>'credit_cancelled')::boolean,'released rejection outcome missing';
 assert (select available=50 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'rejection unexpectedly removed released money';
end $$;
\echo PASS WR07 SQL preserves released money and explicitly reports it
rollback;
