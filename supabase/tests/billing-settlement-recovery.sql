-- Isolated synthetic SQL boundary tests. No real payment or entitlement.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('d9500000-0000-4000-8000-000000000001','billing-recovery@example.invalid');
update public.profiles set course_id='bams' where id='d9500000-0000-4000-8000-000000000001';
insert into public.products(id,title,scope,price,chapter_id,course_id,active,product_type)
 values('recovery_notes','Recovery','chapter',49,'seed_c','bams',true,'notes');
insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,
 provider,status,razorpay_order_id,expires_at) values
 ('recovery_order','d9500000-0000-4000-8000-000000000001','recovery_notes','chapter','seed_c','bams',49,49,
 'razorpay','created','order_recovery',now()+interval '30 minutes');

do $$ begin
 -- Crash after capture persistence, before SQL grant: durable worker rediscovers it.
 perform public.record_payment_capture('pay_recovery','order_recovery',4900,null);
 assert not public.razorpay_entitlement_committed('recovery_order','pay_recovery');
 perform public.enqueue_payment_jobs();
 assert exists(select 1 from public.payment_jobs where kind='events' and target_id='capture:pay_recovery' and status='pending');
 perform public.settle_razorpay_payment('evt_recovery_1','order_recovery','pay_recovery',4900,now());
 assert public.razorpay_entitlement_committed('recovery_order','pay_recovery');
 perform public.settle_razorpay_payment('evt_recovery_2','order_recovery','pay_recovery',4900,now());
 assert (select count(*)=1 from public.purchases where order_id='recovery_order');
 assert (select count(*)=1 from public.payments where order_id='recovery_order');
 -- A second captured payment cannot replace the valid first charge/entitlement.
 perform public.settle_razorpay_payment('evt_recovery_extra','order_recovery','pay_recovery_extra',4900,now());
 assert (select razorpay_payment_id='pay_recovery' and status='paid' from public.orders where id='recovery_order');
 assert (select reason='additional_capture' from public.payment_compensations where payment_id='pay_recovery_extra');
 assert not public.razorpay_entitlement_committed('recovery_order','pay_recovery_extra');
 assert public.razorpay_entitlement_committed('recovery_order','pay_recovery');
 -- Applied partial-refund/dispute events must not revoke an existing grant on replay.
 perform public.record_provider_event('evt_recovery_partial','refund.processed','order_recovery','pay_recovery','rfnd_recovery',repeat('a',64),now());
 update public.provider_events set status='applied' where event_id='evt_recovery_partial';
 perform public.settle_razorpay_payment('evt_recovery_3','order_recovery','pay_recovery',4900,now());
 assert public.razorpay_entitlement_committed('recovery_order','pay_recovery');
 assert (select status='granted' from public.payment_captures where payment_id='pay_recovery');
 -- A paid/capture marker with a missing entitlement can never prove fulfillment.
 update public.purchases set status='disputed' where order_id='recovery_order';
 assert not public.razorpay_entitlement_committed('recovery_order','pay_recovery');
 raise notice 'PASS capture crash recovery, committed entitlement proof, replay, additional-capture compensation, partial-refund replay and disputed denial';
end $$;

-- Authorization-only jobs and inbox retries survive without a paid order.
insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,
 provider,play_sku,status,expires_at,external_transaction_token,ucb_transaction_time,external_report_status)
values('recovery_choice','d9500000-0000-4000-8000-000000000001','recovery_notes','chapter','seed_c','bams',49,49,
 'razorpay','fixture_sku','created',now()+interval '30 minutes','fixture_recovery_token',now()-interval '1 hour','failed');
select public.record_provider_event('evt_recovery_authorized','payment.authorized','order_authorized','pay_authorized',null,repeat('b',64),null);
select public.enqueue_payment_jobs();
do $$ begin
 assert exists(select 1 from public.payment_jobs where kind='reports' and target_id='recovery_choice');
 assert exists(select 1 from public.payment_jobs where kind='events' and target_id='evt_recovery_authorized');
 assert not exists(select 1 from public.purchases where order_id='recovery_choice');
 raise notice 'PASS authorization-only failed reports and pending authorization inbox are queued without granting access';
end $$;

-- A legacy/void settlement implementation that silently does nothing must not
-- advance the capture marker. The inner grant and ledger changes roll back.
create or replace function public.settle_razorpay_payment_legacy(p_event_id text,p_razorpay_order_id text,p_razorpay_payment_id text,p_amount_paise bigint,p_paid_at timestamptz default null)
returns void language plpgsql as $$ begin return; end $$;
insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,provider,status,razorpay_order_id)
values('recovery_noop','d9500000-0000-4000-8000-000000000001','seed_product','chapter','seed_c','bams',49,49,'razorpay','created','order_noop');
do $$ begin
 begin
  perform public.settle_razorpay_payment('evt_noop','order_noop','pay_noop',4900,now());
  raise exception 'FAIL no-op grant accepted';
 exception when raise_exception then
  if sqlerrm<>'Razorpay entitlement not committed' then raise; end if;
 end;
 assert not public.razorpay_entitlement_committed('recovery_noop','pay_noop');
 assert not exists(select 1 from public.payment_captures where payment_id='pay_noop' and status='granted');
 raise notice 'PASS void/no-op settlement cannot mark capture granted';
end $$;

-- Bounded opaque token storage must support the handler's 4096-char contract.
insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,provider,status,play_sku,expires_at)
values('recovery_long_token','d9500000-0000-4000-8000-000000000001','recovery_notes','chapter','seed_c','bams',49,49,'play','created','fixture_sku',now()+interval '30 minutes'),
 ('recovery_no_expiry','d9500000-0000-4000-8000-000000000001','recovery_notes','chapter','seed_c','bams',49,49,'play','created','fixture_sku',null),
 ('recovery_token_reuse','d9500000-0000-4000-8000-000000000001','recovery_notes','chapter','seed_c','bams',49,49,'play','created','fixture_sku',now()+interval '30 minutes');
do $$ declare t text; j jsonb; begin
 select string_agg(md5(random()::text),'') into t from generate_series(1,120);
 j:=public.attach_ucb_external_token('d9500000-0000-4000-8000-000000000001','recovery_long_token',t);
 assert j->>'ok'='true';
 j:=public.attach_ucb_external_token('d9500000-0000-4000-8000-000000000001','recovery_token_reuse',t);
 assert j->>'ok'='false';
 j:=public.attach_ucb_external_token('d9500000-0000-4000-8000-000000000001','recovery_no_expiry','fixture_no_expiry_token');
 assert j->>'ok'='false';
 raise notice 'PASS long opaque token, global reuse denial and null-expiry rejection';
end $$;

-- Paid Play restore must prove the purchase, not trust orders.status.
insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,provider,status,play_sku,purchase_token)
values('recovery_play','d9500000-0000-4000-8000-000000000001','recovery_notes','chapter','seed_c','bams',49,49,'play','paid','fixture_sku','fixture_recovery_play_token');
select set_config('request.jwt.claim.sub','d9500000-0000-4000-8000-000000000001',true);
do $$ begin
 assert not public.play_entitlement_committed('recovery_play','fixture_recovery_play_token');
 assert public.get_my_play_fulfillment('recovery_play')->>'success'='false';
end $$;
insert into public.payments(order_id,user_id,product_id,amount,provider,purchase_token,play_sku,status)
values('recovery_play','d9500000-0000-4000-8000-000000000001','recovery_notes',49,'play','fixture_recovery_play_token','fixture_sku','success');
insert into public.purchases(user_id,order_id,product_id,amount,status)
values('d9500000-0000-4000-8000-000000000001','recovery_play','recovery_notes',49,'success');
do $$ begin
 assert public.play_entitlement_committed('recovery_play','fixture_recovery_play_token');
 assert public.get_my_play_fulfillment('recovery_play')->>'success'='true';
 perform set_config('request.jwt.claim.sub','5eed0000-0000-0000-0000-00000000000a',true);
 assert public.get_my_play_fulfillment('recovery_play')->>'success'='false';
 assert not has_function_privilege('authenticated','public.razorpay_entitlement_committed(text,text)','EXECUTE');
 assert not has_function_privilege('authenticated','public.play_entitlement_committed(text,text)','EXECUTE');
 assert not has_function_privilege('anon','public.get_my_play_fulfillment(text)','EXECUTE');
 raise notice 'PASS Play fulfillment proof, account-bound restore and least-privilege RPC access';
end $$;
rollback;
