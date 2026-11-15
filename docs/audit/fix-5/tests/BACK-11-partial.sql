\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5@example.invalid');
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,available_at,expires_at)
values('f5100000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment',now()-interval '40 days',now()-interval '40 days',now()-interval '10 days');
-- Historical fixture only: simulate spending BEFORE expiry. Existing invariant suites are untouched.
alter table public.wallet_ledger disable trigger wallet_ledger_03_no_overdraw;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,created_at)
values('f5000000-0000-0000-0000-000000000001','debit','available',40,'order_payment',now()-interval '35 days');
alter table public.wallet_ledger enable trigger wallet_ledger_03_no_overdraw;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source)
values('f5000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment');
do $$ begin
 assert (select available=100 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'BACK-11-partial: expired spending consumed future money';
end $$;
select public.expire_due_wallet_credits('f5000000-0000-0000-0000-000000000001');
select public.expire_due_wallet_credits('f5000000-0000-0000-0000-000000000001');
do $$ begin
 assert (select coalesce(sum(amount),0)=60 from public.wallet_ledger where user_id='f5000000-0000-0000-0000-000000000001' and entry_type='expiry'),'expiry must equal only unspent remainder once';
 assert (select available=100 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'replay changed balance';
end $$;
\echo PASS BACK-11-partial and expiry replay
rollback;
