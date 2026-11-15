\set ON_ERROR_STOP on
begin;
-- All rows below are disposable synthetic test fixtures, never hosted reads.
insert into auth.users(id,email) values('f4000000-0000-0000-0000-000000000001','fix4a@example.invalid'),('f4000000-0000-0000-0000-000000000002','fix4b@example.invalid');
insert into public.admins(id,email) values('f4000000-0000-0000-0000-000000000002','fix4b@example.invalid');
select set_config('request.jwt.claim.sub','f4000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ declare snapshot jsonb;begin snapshot:=public.get_admin_analytics('bams');assert snapshot ? 'totalOrders','snapshot missing totals';end $$;
reset role;
rollback;
\echo PASS ADM-08 authorized snapshot RPC
