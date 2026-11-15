-- Review-only query for production xbvenkfmesugrbjuufyw. No identifiers returned.
-- Run only via a separately authorized read-only connection; no provider calls.
BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout='15s';
select jsonb_build_object(
  'section_0',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select status,count(*) from public.orders group by status order by status) r),
  'section_1',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select count(*) filter(where pu.status='success') as successful_purchases,count(*) filter(where pu.status='success' and o.status<>'paid') as successful_nonpaid,count(*) filter(where pu.status='success' and o.status='failed') as successful_failed from public.purchases pu left join public.orders o on o.id=pu.order_id) r),
  'section_2',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select count(*) as successful_payments from public.payments where status='success') r),
  'section_3',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (with affected as (select o.*,pu.status purchase_status,pu.user_id purchase_user,pu.product_id purchase_product,pu.amount purchase_amount,pu.razorpay_order_id purchase_provider_order,pu.scope purchase_scope,pu.course_id purchase_course,pu.chapter_id purchase_chapter,pu.subject_id purchase_subject,pu.year_id purchase_year,pu.year_ids purchase_years,pu.created_at purchase_created from public.orders o join public.purchases pu on pu.order_id=o.id where o.status='failed' and pu.status='success')
select row_number() over(order by a.id) as case_number,a.status as order_status,a.purchase_status,
(select count(*) from public.payments p where p.order_id=a.id and p.status='success') as successful_payment_count,
exists(select 1 from public.payments p where p.order_id=a.id and p.status='success' and p.user_id=a.user_id and p.product_id=a.product_id and p.amount=a.amount and p.razorpay_order_id=a.razorpay_order_id and p.razorpay_payment_id=a.razorpay_payment_id and p.provider='razorpay') as exact_payment_match,
(a.purchase_user=a.user_id and a.purchase_product=a.product_id and a.purchase_amount=a.amount and a.purchase_provider_order=a.razorpay_order_id) as exact_purchase_match,
(row(a.purchase_scope,a.purchase_course,a.purchase_chapter,a.purchase_subject,a.purchase_year,a.purchase_years) is not distinct from row(a.scope,a.course_id,a.chapter_id,a.subject_id,a.year_id,a.year_ids)) as exact_scope_match,
(a.razorpay_order_id is not null and a.razorpay_payment_id is not null) as provider_references_available,
(a.payment_completed_at is not null) as completion_timestamp_available,(a.updated_at>a.purchase_created) as order_updated_after_purchase,
(select count(*) from public.payment_captures c where c.order_id=a.id or c.payment_id=a.razorpay_payment_id) as capture_count,
(select count(*) from public.payment_compensations c where c.order_id=a.id or c.payment_id=a.razorpay_payment_id) as compensation_count,
(select count(*) from public.provider_events e where e.razorpay_order_id=a.razorpay_order_id or e.payment_id=a.razorpay_payment_id) as inbox_count,
(select count(*) from public.razorpay_webhook_events e where e.razorpay_payment_id=a.razorpay_payment_id) as legacy_event_count,
(select count(*) from public.provider_events e where e.payment_id=a.razorpay_payment_id and (e.event_type='refund.processed' or e.event_type like 'payment.dispute.%')) as reversal_event_count,
exists(select 1 from public.profiles p where p.id=a.user_id and not coalesce(p.blocked,false)) as account_unblocked
from affected a order by a.id) r),
  'section_4',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select table_name from information_schema.tables where table_schema='public' and (table_name like '%audit%' or table_name like '%histor%' or table_name like '%refund%')) r),
  'section_5',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select p.proname,md5(pg_get_functiondef(p.oid)) as definition_md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('settle_razorpay_payment','settle_razorpay_payment_legacy','reverse_payment','handle_payment_refund','handle_payment_dispute','record_payment_capture')) r)) as evidence;
ROLLBACK;

-- Additional minimized reversal/history evidence (separate result set in psql).
BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout='15s';
select jsonb_build_object('cases',(select jsonb_agg(to_jsonb(r)) from (
 select row_number() over(order by o.id) as case_number,
 (select jsonb_agg(distinct e.event_type) from public.razorpay_webhook_events e where e.razorpay_payment_id=o.razorpay_payment_id) as legacy_event_types,
 (select count(*) from public.ucb_external_refunds r where r.order_id=o.id) as external_refund_rows,
 (select bool_and(o.updated_at>p.verified_at) from public.payments p where p.order_id=o.id and p.status='success') as order_updated_after_payment_verification
 from public.orders o join public.purchases pu on pu.order_id=o.id where o.status='failed' and pu.status='success'
 ) r)) as evidence;
ROLLBACK;
