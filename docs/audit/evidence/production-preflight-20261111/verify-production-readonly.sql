-- Metadata and minimized aggregates only. Never execute financial/access RPCs.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='15s';
SELECT current_user AS inspection_role,current_setting('transaction_read_only') AS read_only;
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,
 pg_get_function_result(p.oid) AS result,pg_get_userbyid(p.proowner) AS owner,
 p.prosecdef,p.proconfig,p.proacl,
 md5(pg_get_functiondef(p.oid)) AS definition_hash
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('razorpay_entitlement_committed','guard_razorpay_order_transition',
 'guard_purchase_success_ownership','settle_razorpay_payment','settle_play_purchase',
 'prepare_notes_choice_checkout','record_notes_choice_authorization',
 'play_entitlement_committed','get_my_play_fulfillment',
 'user_can_access_note','user_can_access_note_with_aal') ORDER BY p.proname;
SELECT c.relname AS table_name,t.tgname,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE c.oid IN ('public.orders'::regclass,'public.purchases'::regclass)
AND NOT t.tgisinternal ORDER BY c.relname,t.tgname;
SELECT count(*) AS success_on_nonpaid FROM public.purchases p
JOIN public.orders o ON o.id=p.order_id WHERE p.status='success' AND o.status<>'paid';
SELECT count(*) AS duplicate_success_groups FROM
 (SELECT user_id,product_id FROM public.purchases WHERE status='success'
 GROUP BY user_id,product_id HAVING count(*)>1) d;
SELECT price,count(*) FROM public.products WHERE active GROUP BY price ORDER BY price;
ROLLBACK;
