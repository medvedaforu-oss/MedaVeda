\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5-security@example.invalid');
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,expires_at)
values('f5100000-0000-0000-0000-000000000001','f5000000-0000-0000-0000-000000000001','credit','available',20,'admin_adjustment',now()-interval '2 days',now()-interval '1 day');
select public.expire_due_wallet_credits('f5000000-0000-0000-0000-000000000001');
do $$ begin
 begin update public.wallet_ledger set expiry_credit_id=null where entry_type='expiry' and user_id='f5000000-0000-0000-0000-000000000001';raise exception 'expiry target mutable';exception when insufficient_privilege then null;end;
 begin update public.wallet_credit_consumption set amount=1 where credit_id='f5100000-0000-0000-0000-000000000001';raise exception 'journal mutable';exception when insufficient_privilege then null;end;
 assert not has_table_privilege('authenticated','public.wallet_credit_terms','select'),'metadata view exposed';
 assert not has_table_privilege('anon','public.wallet_credit_policy','select'),'snapshot exposed';
 assert not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in('wallet_credit_remainder','wallet_provider_clawback_allowed','wallet_provider_recovery_limit','wallet_journal_entry','expire_due_wallet_credits','wallet_lock_order_parties')
   and (has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('anon',p.oid,'execute'))),'internal definer exposed';
 assert not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in('wallet_credit_remainder','wallet_provider_clawback_allowed','wallet_provider_recovery_limit','wallet_journal_entry','expire_due_wallet_credits','wallet_lock_order_parties')
   and not ('search_path=public'=any(p.proconfig))),'internal helper search_path missing';
end $$;
select set_config('request.jwt.claims','{"sub":"f5000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare r record;begin
 select * into r from public.get_my_wallet();assert r.available=0 and r.expired=20,'authenticated owner projection incorrect';
 begin perform public.expire_due_wallet_credits('f5000000-0000-0000-0000-000000000001');raise exception 'authenticated internal expiry allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
\echo PASS expiry target/journal immutability, definer ACL/search_path and real authenticated owner read
rollback;
