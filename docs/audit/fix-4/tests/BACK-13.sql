\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f4000000-0000-0000-0000-000000000001','fix4hold@example.invalid');
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,available_at,expires_at)
values('f4100000-0000-0000-0000-000000000004','f4000000-0000-0000-0000-000000000001','credit','pending',20,'admin_adjustment',now()-interval '50 days',now()-interval '40 days',now()-interval '10 days');
update public.wallet_ledger set status='available' where id='f4100000-0000-0000-0000-000000000004';
do $$ begin
 assert (select available=20 from public.wallet_balance_of('f4000000-0000-0000-0000-000000000001')),'BACK-13 held credit expired before first availability';
end $$;
rollback;
