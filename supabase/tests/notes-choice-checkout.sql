-- Synthetic captures at the service-only boundary; NOT a provider/device payment.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('d9300000-0000-4000-8000-000000000001','choice-buyer@example.invalid'),
 ('d9300000-0000-4000-8000-000000000002','choice-stranger@example.invalid'),
 ('d9300000-0000-4000-8000-000000000003','choice-referrer@example.invalid');
update public.profiles set course_id='bams' where id::text like 'd9300000-%';
update public.referral_settings set enabled=true,friend_discount_percent=10,
 friend_discount_max=100,require_verified_phone=false,wallet_max_percent=50 where id=true;
insert into public.referrals(referrer_id,referred_id,code_used,status) values
 ('d9300000-0000-4000-8000-000000000003','d9300000-0000-4000-8000-000000000001','FIX','pending');
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,note) values
 ('d9300000-0000-4000-8000-000000000001','credit','available',100,'admin_adjustment','fixture');
insert into public.products(id,title,scope,price,chapter_id,course_id,active,product_type)
 values('choice_notes','Notes','chapter',500,'seed_c','bams',true,'notes');
insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,
 provider,play_sku,status,expires_at)
 values('d9300000-0000-4000-8000-000000000010','d9300000-0000-4000-8000-000000000001',
 'choice_notes','chapter','seed_c','bams',500,500,'play','fixture_sku','created',now()+interval '30 minutes');

do $$ declare j jsonb; k jsonb; oid text; begin
 j:=public.prepare_notes_choice_checkout('d9300000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000010','choice_notes',true,'KERALA');
 assert j->>'ok'='false','missing token accepted';
 perform public.attach_ucb_external_token('d9300000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000010','fixture_choice_token');
 j:=public.prepare_notes_choice_checkout('d9300000-0000-4000-8000-000000000002','d9300000-0000-4000-8000-000000000010','choice_notes',true,'KERALA');
 assert j->>'ok'='false','foreign account accepted';
 j:=public.prepare_notes_choice_checkout('d9300000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000010','seed_product',true,'KERALA');
 assert j->>'ok'='false','wrong product accepted';
 j:=public.prepare_notes_choice_checkout('d9300000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000010','choice_notes',true,'KERALA');
 assert j->>'ok'='true' and j->>'claimed'='true',j::text;
 oid:=j->>'order_id';
 assert (select amount=350 and list_price=500 and referral_discount=50 and wallet_amount=100
   and tax_pre_amount+tax_amount=amount and external_transaction_token='fixture_choice_token'
   and tax_region_code='IN' and tax_administrative_area='KERALA' from public.orders where id=oid);
 assert (select external_transaction_token is null and external_choice_bound_order_id=oid
   and status='cancelled' from public.orders where id='d9300000-0000-4000-8000-000000000010');
 k:=public.prepare_notes_choice_checkout('d9300000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000010','choice_notes',true,'KERALA');
 assert k->>'ok'='true' and k->>'claimed'='false' and k->>'order_id'=oid;
 assert (select count(*)=1 from public.notes_choice_checkouts);
 k:=public.prepare_notes_choice_checkout('d9300000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000010','choice_notes',false,'KERALA');
 assert k->>'ok'='false','wallet selection changed after reservation';
 k:=public.attach_ucb_external_token('d9300000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000010','fixture_choice_token');
 assert k->>'ok'='true','attachment retry failed after transfer';
 k:=public.attach_ucb_external_token('d9300000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000010','different_choice_token');
 assert k->>'ok'='false','choice token replaced';
 assert not exists(select 1 from public.purchases where order_id=oid),'unpaid access granted';
 update public.orders set razorpay_order_id='order_choice_fixture' where id=oid;
 -- Authorization reporting queue exists even before a capture. No grant/debit.
 perform public.record_notes_choice_authorization(oid,now()-interval '1 minute');
 perform public.record_notes_choice_authorization(oid,now());
 assert (select count(*)=1 from public.payment_jobs where kind='reports' and target_id=oid);
 assert (select deadline_at=now()+interval '23 hours 59 minutes' from public.payment_jobs where kind='reports' and target_id=oid);
 assert not exists(select 1 from public.purchases where order_id=oid);
 assert not exists(select 1 from public.wallet_ledger where order_id=oid and entry_type='debit');
 perform public.settle_razorpay_payment('evt_choice_1','order_choice_fixture','pay_choice_fixture',35000,now());
 perform public.settle_razorpay_payment('evt_choice_2','order_choice_fixture','pay_choice_fixture',35000,now());
 assert (select count(*)=1 from public.purchases where order_id=oid and status='success'
   and user_id='d9300000-0000-4000-8000-000000000001' and product_id='choice_notes' and chapter_id='seed_c');
 assert (select count(*)=1 from public.payments where order_id=oid);
 perform public.enqueue_payment_jobs();
 assert (select deadline_at=now()+interval '23 hours 59 minutes' from public.payment_jobs where kind='reports' and target_id=oid),'capture extended authorization deadline';
 assert (select count(*)=1 and sum(amount)=100 from public.wallet_ledger where order_id=oid and entry_type='debit');
 assert exists(select 1 from public.purchases where id='seed_purchase' and status='success'),'previously owned Notes changed';
 raise notice 'PASS token/account/product binding, authoritative discounts/wallet/tax, one reserved order, stable reporting deadline, no access before capture, one entitlement/debit after repeated capture, historical Notes preserved';
end $$;
set local role authenticated;
do $$ begin
 assert not has_function_privilege('authenticated','public.prepare_notes_choice_checkout(uuid,text,text,boolean,text)','EXECUTE');
 assert not has_table_privilege('authenticated','public.notes_choice_checkouts','INSERT');
end $$;
rollback;
