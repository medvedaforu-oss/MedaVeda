-- AUDIT ONLY. Disposable local migrated database; synthetic inputs; transaction rolled back.
-- Calls SQL settlement with simulated verified-capture inputs. Does not prove provider checkout.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('d9000000-0000-4000-8000-000000000001','audit-scope@example.invalid'),
 ('d9000000-0000-4000-8000-000000000002','audit-referrer@example.invalid'),
 ('d9000000-0000-4000-8000-000000000003','audit-retry@example.invalid');
update public.profiles set course_id='bams' where id::text like 'd9000000-%';
insert into public.chapters(id,title,subject_id) values ('audit_other_chapter','Audit other','seed_s');
insert into public.products(id,title,scope,price,chapter_id,course_id,active,product_type) values
 ('audit_scope_product','Audit scope','chapter',500,'seed_c','bams',true,'notes'),
 ('audit_retry_product','Audit retry','chapter',500,'seed_c','bams',true,'notes');
create temporary table audit_orders(kind text,id text);
insert into audit_orders select 'scope',public.create_priced_order('d9000000-0000-4000-8000-000000000001','audit_scope_product',false)->>'order_id';
update public.orders set razorpay_order_id='order_audit_scope' where id=(select id from audit_orders where kind='scope');
update public.products set chapter_id='audit_other_chapter' where id='audit_scope_product';
select public.settle_razorpay_payment('evt_audit_scope','order_audit_scope','pay_audit_scope',50000,now());
select 'FAIL Razorpay entitlement uses changed catalog scope' as finding,o.chapter_id as ordered_chapter,p.chapter_id as granted_chapter,p.status
 from public.orders o join public.purchases p on p.order_id=o.id where o.id=(select id from audit_orders where kind='scope');
update public.referral_settings set enabled=true,friend_discount_percent=10,friend_discount_max=100,require_verified_phone=false where id=true;
insert into public.referrals(referrer_id,referred_id,code_used,status)
 values ('d9000000-0000-4000-8000-000000000002','d9000000-0000-4000-8000-000000000003','AUDIT','pending');
insert into audit_orders select 'retry1',public.create_priced_order('d9000000-0000-4000-8000-000000000003','audit_retry_product',false)->>'order_id';
-- Mirrors create-order's provider creation failure cleanup.
update public.orders set status='failed' where id=(select id from audit_orders where kind='retry1');
insert into audit_orders select 'retry2',public.create_priced_order('d9000000-0000-4000-8000-000000000003','audit_retry_product',false)->>'order_id';
select 'FAIL failed unpaid attempt consumes first-discount reservation' as finding,a.kind,o.referral_discount,o.amount,o.status,
 (select count(*) from public.purchases where user_id=o.user_id) as buyer_purchases
 from audit_orders a join public.orders o on o.id=a.id where a.kind like 'retry%' order by a.kind;
rollback;
