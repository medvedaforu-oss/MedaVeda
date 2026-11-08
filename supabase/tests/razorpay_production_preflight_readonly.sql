-- Execute ONLY after Management API identity confirms MedVeda / xbvenkfmesugrbjuufyw.
-- Aggregates and definitions contain no payment credentials. Save backup output privately.
begin transaction read only;
set local statement_timeout='15s';
select version from supabase_migrations.schema_migrations order by version;
select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef,p.proconfig,p.proacl,
 md5(pg_get_functiondef(p.oid)) as definition_hash
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('orders_derive_course','orders_reserve_first_discount','quote_my_order','quote_my_order_legacy',
  'create_priced_order','create_priced_order_legacy','settle_razorpay_payment','settle_razorpay_payment_legacy',
  'reverse_payment','handle_payment_refund','settle_play_purchase','reverse_play_payment');
select tgrelid::regclass,tgname,pg_get_triggerdef(oid) from pg_trigger
where tgrelid in ('public.orders'::regclass,'public.purchases'::regclass) and not tgisinternal;
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in
 ('orders','purchases','payments','first_discount_reservations','payment_captures','wallet_ledger');
select table_name,column_name,data_type,is_nullable from information_schema.columns
where table_schema='public' and table_name in
 ('orders','purchases','first_discount_reservations','payment_captures') order by 1,2;
select key,value from public.app_config where key in
 ('require_ucb_for_razorpay','min_app_version','play_package_name');
select provider,status,count(*) as orders from public.orders group by 1,2;
select status,count(*) as purchases from public.purchases group by 1;
select provider,status,count(*) as payments from public.payments group by 1,2;
select status,count(*),min(received_at) from public.payment_captures group by 1;
select status,count(*),min(created_at) from public.payment_compensations group by 1;
select status,count(*),min(received_at) from public.provider_events group by 1;
select count(*) as incomplete_open_razorpay_snapshots from public.orders
where provider='razorpay' and status in ('created','failed','cancelled','pending') and
 (scope is null or scope not in ('chapter','subject','year','bundle') or course_id is null
  or (scope='chapter' and chapter_id is null) or (scope='subject' and subject_id is null)
  or (scope='year' and year_id is null)
  or (scope='bundle' and coalesce(array_length(year_ids,1),0)=0));
select count(*) as historical_purchase_snapshot_mismatches from public.purchases p join public.orders o on o.id=p.order_id
where p.status='success' and o.scope is not null and
 row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
 is distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id);
select count(*) as abandoned_discount_reservations from public.first_discount_reservations r
join public.orders o on o.id=r.order_id where o.status in ('failed','cancelled')
and not exists(select 1 from public.purchases p where p.order_id=o.id and p.status='success');
select provider,play_consumption_status,count(*) from public.orders
where provider='play' and (status in ('created','pending') or (status='paid' and play_consumption_status is distinct from 'consumed'))
group by 1,2;
select jobid,jobname,active from cron.job order by jobid;
commit;
-- Do not output cron.command, Vault values, Auth rows, tokens, signed URLs or key values.
