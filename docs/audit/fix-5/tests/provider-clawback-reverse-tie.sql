\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('f5000000-0000-0000-0000-000000000001','fix5-claw-owner@example.invalid'),
 ('f5000000-0000-0000-0000-000000000002','fix5-claw-friend@example.invalid');
insert into public.orders(id,user_id,product_id,scope,chapter_id,subject_id,year_id,year_ids,course_id,provider,amount,list_price,status,razorpay_order_id,razorpay_payment_id)
select 'fix5-claw','f5000000-0000-0000-0000-000000000002',id,scope,chapter_id,subject_id,year_id,year_ids,course_id,'razorpay',price,price,'paid','order_fix5_claw','pay_fix5_claw' from public.products where id='seed_product';
-- Guaranteed top-up-first tie ordering, exposing F8 independent of random UUIDs.
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source,order_id)
values('f5100000-0000-0000-0000-0000000000ff','f5000000-0000-0000-0000-000000000001','credit','available',50,'referral_reward','fix5-claw');
insert into public.wallet_ledger(id,user_id,entry_type,status,amount,source)
values('f5100000-0000-0000-0000-000000000099','f5000000-0000-0000-0000-000000000001','credit','available',950,'admin_adjustment');
insert into public.wallet_ledger(user_id,entry_type,status,amount,source)
values('f5000000-0000-0000-0000-000000000001','debit','available',500,'order_payment');
do $$ declare r jsonb; begin
 r:=public.handle_payment_refund('pay_fix5_claw',true);
 assert (r->>'reversed')::numeric=50,'F8: unexpired spent provider reward must recover 50 from current funds';
 assert (select available=450 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'provider actual recovery amount wrong';
end $$;
insert into public.wallet_ledger(user_id,entry_type,status,amount,source)
values('f5000000-0000-0000-0000-000000000001','credit','available',100,'admin_adjustment');
select public.handle_payment_refund('pay_fix5_claw',true);
do $$ begin
 assert (select available=550 from public.wallet_balance_of('f5000000-0000-0000-0000-000000000001')),'provider replay recovered later deposit twice';
 assert (select count(*)=1 and sum(amount)=50 from public.wallet_ledger where entry_type='reversal' and order_id='fix5-claw'),'duplicate provider recovery';
end $$;
\echo PASS F8 monetary provider clawback, spent original and replay after deposit
rollback;
