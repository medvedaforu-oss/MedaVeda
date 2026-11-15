\set ON_ERROR_STOP on
insert into auth.users(id,email) values('f5700000-0000-0000-0000-000000000001','fix5-legacy@example.invalid');
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,created_at,available_at,expires_at) values
('f5710000-0000-0000-0000-000000000001','f5700000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment',now()-interval '40 days',now()-interval '40 days',now()-interval '10 days'),
('f5710000-0000-0000-0000-000000000002','f5700000-0000-0000-0000-000000000001','credit','pending',20,'admin_adjustment',now()-interval '50 days',now()-interval '40 days',now()-interval '10 days');
alter table public.wallet_ledger disable trigger wallet_ledger_03_no_overdraw;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,created_at) values('f5700000-0000-0000-0000-000000000001','debit','available',40,'order_payment',now()-interval '35 days');
alter table public.wallet_ledger enable trigger wallet_ledger_03_no_overdraw;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source) values('f5700000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment');
create table public.fix5_legacy_snapshot as select id,to_jsonb(l)-'status'-'status_changed_at' fact from public.wallet_ledger l where user_id='f5700000-0000-0000-0000-000000000001';
grant insert,select on public.fix5_legacy_snapshot to service_role;
