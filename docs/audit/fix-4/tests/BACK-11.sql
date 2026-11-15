\set ON_ERROR_STOP on
begin;
-- All rows below are disposable synthetic test fixtures, never hosted reads.
insert into auth.users(id,email) values('f4000000-0000-0000-0000-000000000001','fix4a@example.invalid'),('f4000000-0000-0000-0000-000000000002','fix4b@example.invalid');
-- Wallet replay: earlier credit partially spent, expired, unrelated new credit,
-- referenced reversal, refund restoration and delayed hold availability.
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,available_at,expires_at)
values('f4100000-0000-0000-0000-000000000001','f4000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment',now()-interval '40 days',now()-interval '40 days',now()-interval '10 days');
-- Append a historical debit via a transaction-local clock fixture: validate allocation
-- using its historical created_at; current guard correctly denies expired spending.
alter table public.wallet_ledger disable trigger wallet_ledger_03_no_overdraw;
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at)
values('f4100000-0000-0000-0000-000000000002','f4000000-0000-0000-0000-000000000001','debit','available',40,'order_payment',now()-interval '35 days');
alter table public.wallet_ledger enable trigger wallet_ledger_03_no_overdraw;
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source)
values('f4100000-0000-0000-0000-000000000003','f4000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment');
do $$ begin assert (select available=100 from public.wallet_balance_of('f4000000-0000-0000-0000-000000000001')),'expired spend consumed future credit';end $$;
do $$ begin
 begin insert into public.wallet_ledger(user_id,entry_type,status,amount,source,reverses_id)
values('f4000000-0000-0000-0000-000000000001','reversal','available',100,'admin_adjustment','f4100000-0000-0000-0000-000000000001'); raise exception 'expired reversal admitted'; exception when check_violation then null;end;
end $$;
do $$ begin assert (select available=100 from public.wallet_balance_of('f4000000-0000-0000-0000-000000000001')),'expired reversal consumed unrelated credit';end $$;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('f4000000-0000-0000-0000-000000000001','credit','available',40,'order_refund');
do $$ begin assert (select available=140 from public.wallet_balance_of('f4000000-0000-0000-0000-000000000001')),'refund restoration failed';end $$;
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,available_at,expires_at)
values('f4100000-0000-0000-0000-000000000004','f4000000-0000-0000-0000-000000000001','credit','pending',20,'admin_adjustment',now()-interval '50 days',now()-interval '40 days',now()-interval '10 days');
update public.wallet_ledger set status='available' where id='f4100000-0000-0000-0000-000000000004';
do $$ begin
 assert (select available=160 from public.wallet_balance_of('f4000000-0000-0000-0000-000000000001')),'held credit expired before first availability';
 assert (select duration=interval '30 days' and first_available_at=now() from public.wallet_credit_terms where credit_id='f4100000-0000-0000-0000-000000000004'),'hold duration not captured';
end $$;
\echo PASS BACK-11/13 partial spend, expire, new credit, reversal, refund restoration, delayed hold

rollback;
