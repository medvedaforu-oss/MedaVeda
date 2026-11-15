\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5more@example.invalid');
-- Deliberately insert long-lived/no-expiry before earlier expiry.
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,expires_at)
values('f5100000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment',now()-interval '10 days',now()+interval '10 days'),
('f5100000-0000-0000-0000-000000000002','f5000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment',now()-interval '10 days',null),
('f5100000-0000-0000-0000-000000000003','f5000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment',now()-interval '10 days',now()-interval '1 day');
alter table public.wallet_ledger disable trigger wallet_ledger_03_no_overdraw;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,created_at)
values('f5000000-0000-0000-0000-000000000001','debit','available',150,'order_payment',now()-interval '5 days');
alter table public.wallet_ledger enable trigger wallet_ledger_03_no_overdraw;
do $$ begin
 assert (select available=150 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'FIFO: old spending must consume early expiry before later expiry';
 assert public.wallet_credit_remainder('f5100000-0000-0000-0000-000000000003')=0,'FIFO early lot not consumed';
 assert public.wallet_credit_remainder('f5100000-0000-0000-0000-000000000001')=50,'FIFO long lot wrong';
 assert public.wallet_credit_remainder('f5100000-0000-0000-0000-000000000002')=100,'FIFO no-expiry consumed first';
end $$;
\echo PASS FIFO earliest expiry then no-expiry
rollback;
