\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('f5000000-0000-0000-0000-000000000001','fix5more@example.invalid');
insert into public.orders(id,user_id,product_id,scope,chapter_id,subject_id,year_id,year_ids,course_id,provider,amount,list_price,wallet_amount,status,razorpay_order_id,razorpay_payment_id)
select 'fix5-refund','f5000000-0000-0000-0000-000000000001',id,scope,chapter_id,subject_id,year_id,year_ids,course_id,'razorpay',1,101,100,'paid','order_fix5_refund','pay_fix5_refund' from public.products where id='seed_product';
-- Use a real catalog snapshot; fallback for repositories with a different seed product ID.
insert into public.orders(id,user_id,product_id,scope,chapter_id,subject_id,year_id,year_ids,course_id,provider,amount,list_price,wallet_amount,status,razorpay_order_id,razorpay_payment_id)
select 'fix5-refund','f5000000-0000-0000-0000-000000000001',id,scope,chapter_id,subject_id,year_id,year_ids,course_id,'razorpay',1,101,100,'paid','order_fix5_refund','pay_fix5_refund' from public.products where not exists(select 1 from public.orders where id='fix5-refund') limit 1;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,created_at,expires_at)
values('f5000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment',now()-interval '40 days',now()+interval '10 days');
alter table public.wallet_ledger disable trigger wallet_ledger_03_no_overdraw;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,order_id,created_at)
values('f5000000-0000-0000-0000-000000000001','debit','available',100,'order_payment','fix5-refund',now()-interval '35 days');
alter table public.wallet_ledger enable trigger wallet_ledger_03_no_overdraw;
select public.handle_payment_refund('pay_fix5_refund',true);
do $$ begin
 assert (select available=100 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'refund-before-expiry: restored value lost';
 assert (select count(*)=1 and bool_and(expires_at is null) from public.wallet_ledger where order_id='fix5-refund' and source='order_refund'),'refund must be unique new no-expiry credit';
end $$;
select public.handle_payment_refund('pay_fix5_refund',true);
do $$ begin assert (select available=100 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'refund replay duplicated money'; end $$;
\echo PASS refund-before-expiry and restore replay
rollback;
