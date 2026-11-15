\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5@example.invalid');
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source)
values('f5100000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment');
insert into public.wallet_ledger(user_id,entry_type,status,amount,source)
values('f5000000-0000-0000-0000-000000000001','debit','available',100,'order_payment'),
('f5000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment');
-- Admin JWT with an actual admin row; MFA flag unchanged.
insert into public.admins(id,email) values('f5000000-0000-0000-0000-000000000001','fix5@example.invalid');
select set_config('request.jwt.claims','{"sub":"f5000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
do $$ begin
 begin
  perform public.admin_reverse_wallet_credit('f5100000-0000-0000-0000-000000000001','test spent original');
  raise exception 'WR-01: spent original reversal consumed unrelated new credit';
 exception when others then
  if sqlerrm not like 'Nothing left to reverse:%' then raise; end if;
 end;
 assert (select available=100 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'WR-01 unrelated money lost';
end $$;
\echo PASS WR-01 original-credit bound
rollback;
