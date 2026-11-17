-- Real server aggregation, not a mock of the old client paginator.
-- All fixtures and the MFA switch are local and rolled back.
begin;
insert into public.courses(id,name,code) values ('ci_analytics','CI analytics','CI_ANALYTICS');
insert into public.years(id,title,course_id) values ('ci_analytics_year','Year','ci_analytics');
insert into public.products(id,title,scope,price,active,year_id,course_id,product_type)
values ('ci_analytics_product','CI notes','year',1,true,'ci_analytics_year','ci_analytics','notes');
insert into auth.users(id,email) values
 ('acab0000-0000-4000-8000-000000000001','ci-analytics-admin@example.test'),
 ('acab0000-0000-4000-8000-000000000002','ci-analytics-buyer@example.test');
insert into public.admins(id,email) values ('acab0000-0000-4000-8000-000000000001','ci-analytics-admin@example.test');
insert into public.orders(id,user_id,product_id,scope,year_id,course_id,amount,status)
select 'ci-analytics-'||i,'acab0000-0000-4000-8000-000000000002','ci_analytics_product','year','ci_analytics_year','ci_analytics',
 case when i=1001 then 0.10 when i=1002 then 0.20 else 1 end,'paid'
from generate_series(1,1002) i;
insert into public.orders(id,user_id,product_id,scope,year_id,course_id,amount,status)
select 'ci-analytics-'||s,'acab0000-0000-4000-8000-000000000002','ci_analytics_product','year','ci_analytics_year','ci_analytics',99,s
from unnest(array['created','failed','refunded']) s;
update public.admin_settings set require_mfa=true;
select set_config('request.jwt.claim.sub','acab0000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"acab0000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.get_admin_analytics('ci_analytics');
 assert (r->>'totalOrders')::int=1005,'all orders beyond row cap included';
 assert (r->>'paidOrders')::int=1002,'paid count';
 assert (r->>'pendingOrders')::int=1 and (r->>'failedOrders')::int=1 and (r->>'refundedOrders')::int=1,'nonpaid status counts';
 assert (r->>'totalRevenue')::numeric=1000.30,'exact paise; nonpaid excluded';
 assert (r->'topProducts'->0->>'revenue')::numeric=1000.30,'exact product revenue';
 assert (r->'topProducts'->0->>'orders')::int=1002,'product order count';
 assert (r->'topProducts'->0->>'productId')='ci_analytics_product','course-scoped product';
 r:=public.get_admin_analytics('ci_analytics_empty');
 assert (r->>'totalOrders')::int=0 and (r->>'totalRevenue')::numeric=0 and r->'topProducts'='[]'::jsonb,'empty course excludes other courses';
 assert public.get_admin_analytics(null)=public.get_admin_analytics(''),'unfiltered null/empty equivalent';
 raise notice 'PASS analytics complete snapshot >1000 orders, exact paise, paid-only revenue, course filter and empty course';
end $$;
-- Same admin, insufficient MFA: deny rather than returning an empty snapshot.
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
do $$ begin
 begin perform public.get_admin_analytics(); raise exception 'admin without MFA read analytics';
 exception when insufficient_privilege then null; end;
end $$;
-- A student cannot gain admin access from an aal2 claim.
select set_config('request.jwt.claim.sub','acab0000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
do $$ begin
 begin perform public.get_admin_analytics(); raise exception 'student read analytics';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.get_admin_analytics(); raise exception 'anon read analytics';
 exception when insufficient_privilege then null; end;
 raise notice 'PASS analytics rejects anon, student and admin without required MFA';
end $$;
reset role;
rollback;
