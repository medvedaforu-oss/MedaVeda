-- Independent read-only observer only. Never invoke settlement, proof, or payment functions.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='15s';
SELECT jsonb_build_object(
 'role',current_user,'read_only',current_setting('transaction_read_only'),
 'versions',(SELECT jsonb_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations),
 'phase_a_functions',(SELECT jsonb_agg(jsonb_build_object('name',proname,'args',pg_get_function_identity_arguments(oid),'result',pg_get_function_result(oid),'definition_md5',md5(pg_get_functiondef(oid)),'acl',proacl::text,'config',proconfig,'volatility',provolatile,'security_definer',prosecdef,'owner',pg_get_userbyid(proowner))) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('razorpay_entitlement_committed','guard_razorpay_order_transition','guard_purchase_success_ownership')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('table',tgrelid::regclass::text,'name',tgname,'enabled',tgenabled,'definition',pg_get_triggerdef(oid)) ORDER BY tgrelid,tgname) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.orders'::regclass,'public.purchases'::regclass)),
 'totals',jsonb_build_object('orders',(SELECT count(*) FROM public.orders),'payments',(SELECT count(*) FROM public.payments),'purchases',(SELECT count(*) FROM public.purchases),'success_payments',(SELECT count(*) FROM public.payments WHERE status='success'),'success_purchases',(SELECT count(*) FROM public.purchases WHERE status='success'),'success_nonpaid',(SELECT count(*) FROM public.purchases p JOIN public.orders o ON o.id=p.order_id WHERE p.status='success' AND o.status<>'paid'),'success_failed',(SELECT count(*) FROM public.purchases p JOIN public.orders o ON o.id=p.order_id WHERE p.status='success' AND o.status='failed'),'paid_missing_success',(SELECT count(*) FROM public.orders o WHERE o.status='paid' AND NOT EXISTS (SELECT 1 FROM public.purchases p WHERE p.order_id=o.id AND p.status='success')),'owner_mismatch',(SELECT count(*) FROM public.purchases p JOIN public.orders o ON o.id=p.order_id WHERE p.status='success' AND p.user_id IS DISTINCT FROM o.user_id),'duplicate_groups',(SELECT count(*) FROM (SELECT user_id,product_id FROM public.purchases WHERE status='success' GROUP BY user_id,product_id HAVING count(*)>1) s)),
 'prices',(SELECT jsonb_agg(x) FROM (SELECT price,count(*) FROM public.products WHERE active GROUP BY price ORDER BY price) x),
 'client_create_public',(SELECT jsonb_object_agg(r,has_schema_privilege(r,'public','CREATE')) FROM unnest(array['anon','authenticated']) r)
) AS evidence;
ROLLBACK;
