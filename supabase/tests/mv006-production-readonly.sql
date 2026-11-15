-- Only production xbvenkfmesugrbjuufyw. Aggregates/booleans; no financial identifiers.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='15s';
WITH groups AS (
 select user_id,product_id,count(*) n from public.purchases
 where status='success' and user_id is not null and product_id is not null
 group by user_id,product_id having count(*)>1
), affected AS (
 select pu.* from public.purchases pu join groups g using(user_id,product_id) where pu.status='success'
)
select jsonb_build_object(
 'latest_migration',(select max(version) from supabase_migrations.schema_migrations),
 'duplicate_groups',(select count(*) from groups),
 'affected_successes',(select count(*) from affected),
 'exception_rows_in_group',(select count(*) from affected a where a.id=substring((select pg_get_expr(indpred,indrelid) from pg_index where indexrelid='public.purchases_one_success_per_product'::regclass) from 'id <> ''([^'']+)''')),
 'affected_distinct_orders',(select count(distinct order_id) from affected),
 'affected_distinct_provider_payments',(select count(distinct o.razorpay_payment_id) from affected a join public.orders o on o.id=a.order_id),
 'duplicate_purchase_orders',(select count(*) from (select order_id from public.purchases where order_id is not null group by order_id having count(*)>1) t),
 'duplicate_payment_refs',(select count(*) from (select razorpay_payment_id from public.payments where razorpay_payment_id is not null group by razorpay_payment_id having count(*)>1) t),
 'null_product_successes',(select count(*) from public.purchases where status='success' and product_id is null),
 'purchase_indexes',(select jsonb_agg(jsonb_build_object('name',i.relname,'unique',x.indisunique,'valid',x.indisvalid,'predicate',regexp_replace(pg_get_expr(x.indpred,x.indrelid),'[0-9a-f]{8}-[0-9a-f-]{27}','<historical-exception>','g'))) from pg_index x join pg_class i on i.oid=x.indexrelid where x.indrelid='public.purchases'::regclass),
 'purchase_triggers',(select jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid))) from pg_trigger t where t.tgrelid='public.purchases'::regclass and not t.tgisinternal),
 'purchase_constraints',(select jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid))) from pg_constraint where conrelid='public.purchases'::regclass),
 'function_hashes',(select jsonb_agg(jsonb_build_object('name',p.proname,'md5',md5(pg_get_functiondef(p.oid)))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('settle_razorpay_payment','settle_razorpay_payment_legacy','create_priced_order','quote_my_order','handle_payment_refund','handle_payment_dispute','user_can_access_note','user_can_access_note_with_aal')),
 'cases',(select jsonb_agg(to_jsonb(r)) from (
 select row_number() over(order by a.id) as case_number,a.status as purchase_status,o.status as order_status,
 (a.user_id=o.user_id and a.product_id=o.product_id and a.amount=o.amount and a.razorpay_order_id=o.razorpay_order_id) as purchase_order_match,
 (row(a.scope,a.course_id,a.chapter_id,a.subject_id,a.year_id,a.year_ids) is not distinct from row(o.scope,o.course_id,o.chapter_id,o.subject_id,o.year_id,o.year_ids)) as scope_snapshot_match,
 exists(select 1 from public.payments p where p.order_id=o.id and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount and p.razorpay_order_id=o.razorpay_order_id and p.razorpay_payment_id=o.razorpay_payment_id and p.status='success' and p.provider='razorpay') as exact_success_payment,
 (o.razorpay_payment_id is not null and o.razorpay_order_id is not null) as provider_refs_available,
 (select count(*) from public.payment_captures c where c.order_id=o.id or c.payment_id=o.razorpay_payment_id) as capture_count,
 (select count(*) from public.payment_compensations c where c.order_id=o.id or c.payment_id=o.razorpay_payment_id) as compensation_count,
 (select count(*) from public.provider_events e where e.payment_id=o.razorpay_payment_id and (e.event_type='refund.processed' or e.event_type like 'payment.dispute.%')) as reversal_events,
 (select count(*) from public.ucb_external_refunds r where r.order_id=o.id) as external_refund_count,
 (select jsonb_agg(distinct e.event_type) from public.razorpay_webhook_events e where e.razorpay_payment_id=o.razorpay_payment_id) as legacy_event_types
 from affected a left join public.orders o on o.id=a.order_id
 ) r)
) as evidence;
ROLLBACK;
