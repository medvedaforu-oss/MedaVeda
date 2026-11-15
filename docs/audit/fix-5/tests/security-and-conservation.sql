\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5more@example.invalid');
insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('f5000000-0000-0000-0000-000000000001','credit','available',1.01,'admin_adjustment');
do $$ begin
 begin insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('f5000000-0000-0000-0000-000000000001','debit','available',1.02,'order_payment'); raise exception 'overdraw accepted'; exception when check_violation then null;end;
 begin insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('f5000000-0000-0000-0000-000000000001','credit','available',0,'admin_adjustment'); raise exception 'zero accepted'; exception when check_violation then null;end;
 begin insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('f5000000-0000-0000-0000-000000000001','credit','available',-1,'admin_adjustment'); raise exception 'negative accepted'; exception when check_violation then null;end;
 assert not has_function_privilege('authenticated','public.expire_due_wallet_credits(uuid)','execute'),'authenticated internal expiry access';
 assert not has_function_privilege('anon','public.wallet_balance_of(uuid)','execute'),'anonymous wallet access';
 assert not has_table_privilege('authenticated','public.wallet_credit_consumption','insert'),'journal client write access';
end $$;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('f5000000-0000-0000-0000-000000000001','debit','available',1.01,'order_payment');
do $$ begin
 assert (select available=0 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'paise conservation failed';
 assert (select sum(a.amount)=1.01 from public.wallet_credit_consumption a join public.wallet_ledger l on l.id=a.entry_id where l.user_id='f5000000-0000-0000-0000-000000000001'),'journal sum mismatch';
end $$;
\echo PASS overdraw, amount bounds, paise and internal ACLs
rollback;
