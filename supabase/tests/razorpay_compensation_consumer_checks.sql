begin;
select set_config('app.trusted_order_write','true',true);
insert into public.payment_captures(payment_id,razorpay_order_id,amount_paise,status,failure_reason)
 values ('pay_worker_fixture','order_worker_fixture',4900,'compensation_pending','unknown_order'),
 ('pay_worker_old','order_worker_old',4900,'compensation_pending','unknown_order');
insert into public.payment_compensations(payment_id,amount_paise,reason,refund_request_id,created_at)
 values ('pay_worker_fixture',4900,'unknown_order','medveda_comp_'||md5('pay_worker_fixture'),now()),
 ('pay_worker_old',4900,'unknown_order','medveda_comp_'||md5('pay_worker_old'),now()-interval '1 year');
do $$ declare job jsonb; ready jsonb; result boolean;
begin
 job:=public.claim_razorpay_compensation(now()-interval '1 hour');
 assert job->>'payment_id'='pay_worker_fixture','claim failed or historical record selected';
 assert public.claim_razorpay_compensation(now()-interval '1 hour') is null,'concurrent active lease reclaimed';
 ready:=public.prepare_razorpay_compensation('pay_worker_fixture',(job->>'worker_lease_id')::uuid,false);
 assert ready->>'razorpay_order_id'='order_worker_fixture';
 assert public.prepare_razorpay_compensation('pay_worker_fixture',gen_random_uuid(),true) is null,'wrong lease accepted';
 assert public.prepare_razorpay_compensation('pay_worker_fixture',(job->>'worker_lease_id')::uuid,true) is not null;
 assert public.prepare_razorpay_compensation('pay_worker_fixture',(job->>'worker_lease_id')::uuid,true) is null,'duplicate dispatch accepted';
 result:=public.finish_razorpay_compensation('pay_worker_fixture',(job->>'worker_lease_id')::uuid,null);
 assert result;
 update public.payment_compensations set next_attempt_at=now() where payment_id='pay_worker_fixture';
 job:=public.claim_razorpay_compensation(now()-interval '1 hour');
 assert public.prepare_razorpay_compensation('pay_worker_fixture',(job->>'worker_lease_id')::uuid,false) is not null,'ambiguous attempt not reconcilable';
 assert public.prepare_razorpay_compensation('pay_worker_fixture',(job->>'worker_lease_id')::uuid,true) is null,'retry reset durable dispatch fence';
 assert public.finish_razorpay_compensation('pay_worker_fixture',(job->>'worker_lease_id')::uuid,'rfnd_fixture');
 assert (select status='refunded' and provider_refund_id='rfnd_fixture' from public.payment_compensations where payment_id='pay_worker_fixture');
 assert (select status='compensated' from public.payment_captures where payment_id='pay_worker_fixture');
 assert public.claim_razorpay_compensation(now()-interval '1 hour') is null,'completed compensation reclaimed';
 assert not public.finish_razorpay_compensation('pay_worker_fixture',gen_random_uuid(),'rfnd_other');
end $$;
-- The original purchase must survive compensation of a second capture.
insert into auth.users(id,email) values('003b0000-0000-4000-8000-000000000001','compensation@example.invalid');
do $$ declare order_id text; j jsonb; old_lease uuid; before_rows text;
begin
 select public.create_priced_order('003b0000-0000-4000-8000-000000000001','seed_product',false)->>'order_id' into order_id;
 assert order_id is not null;
 update public.orders set razorpay_order_id='order_worker_owned' where id=order_id;
 perform public.settle_razorpay_payment('event_original','order_worker_owned','pay_worker_original',4900,now());
 assert public.razorpay_entitlement_committed(order_id,'pay_worker_original');
 perform public.settle_razorpay_payment('event_second','order_worker_owned','pay_worker_additional',4900,now());
 j:=public.claim_razorpay_compensation(now()-interval '1 hour');
 assert j->>'payment_id'='pay_worker_additional';old_lease:=(j->>'worker_lease_id')::uuid;
 assert public.prepare_razorpay_compensation('pay_worker_additional',old_lease,false) is not null;
 -- Unknown disputes and UCB-linked orders are never dispatched by this worker.
 insert into public.provider_events(event_id,event_type,payment_id,payload_hash)
 values('worker_dispute','payment.dispute.created','pay_worker_additional',repeat('a',64));
 assert public.prepare_razorpay_compensation('pay_worker_additional',old_lease,true) is null;
 delete from public.provider_events where event_id='worker_dispute';
 update public.payment_compensations set lease_until=now()-interval '1 second' where payment_id='pay_worker_additional';
 assert public.prepare_razorpay_compensation('pay_worker_additional',old_lease,true) is null,'expired lease allowed dispatch';
 j:=public.claim_razorpay_compensation(now()-interval '1 hour');
 assert (j->>'worker_lease_id')::uuid<>old_lease;
 assert not public.finish_razorpay_compensation('pay_worker_additional',old_lease,'rfnd_stale');
 select md5(string_agg(to_jsonb(p)::text,'' order by p.id)) into before_rows from public.purchases p;
 assert public.prepare_razorpay_compensation('pay_worker_additional',(j->>'worker_lease_id')::uuid,true) is not null;
 assert public.finish_razorpay_compensation('pay_worker_additional',(j->>'worker_lease_id')::uuid,'rfnd_second');
 assert before_rows=(select md5(string_agg(to_jsonb(p)::text,'' order by p.id)) from public.purchases p),'original purchases changed';
 assert public.razorpay_entitlement_committed(order_id,'pay_worker_original'),'original purchase lost';
 -- Even contradictory server-side queue facts cannot refund a successful grant.
 insert into public.payment_compensations(payment_id,order_id,amount_paise,reason,refund_request_id)
 values('pay_worker_original',order_id,4900,'wallet_shortfall','medveda_comp_'||md5('pay_worker_original'));
 update public.payment_captures set status='compensation_pending',failure_reason='wallet_shortfall' where payment_id='pay_worker_original';
 j:=public.claim_razorpay_compensation(now()-interval '1 hour');
 assert public.prepare_razorpay_compensation('pay_worker_original',(j->>'worker_lease_id')::uuid,true) is null,'committed payment refunded';
 update public.payment_compensations set attempts=12,lease_until=now()-interval '1 second' where payment_id='pay_worker_original';
 perform public.claim_razorpay_compensation(now()-interval '1 hour');
 assert (select status='parked' from public.payment_compensations where payment_id='pay_worker_original'),'crash at retry limit not parked';
end $$;
set local role authenticated;
do $$begin
 assert not has_function_privilege(current_user,'public.claim_razorpay_compensation(timestamptz)','execute');
 assert not has_function_privilege(current_user,'public.prepare_razorpay_compensation(text,uuid,boolean)','execute');
 assert not has_function_privilege(current_user,'public.finish_razorpay_compensation(text,uuid,text)','execute');
 assert not has_table_privilege(current_user,'public.payment_compensations','select');
end $$;
set local role anon;
do $$begin
 assert not has_function_privilege(current_user,'public.claim_razorpay_compensation(timestamptz)','execute');
 assert not has_function_privilege(current_user,'public.prepare_razorpay_compensation(text,uuid,boolean)','execute');
 assert not has_function_privilege(current_user,'public.finish_razorpay_compensation(text,uuid,text)','execute');
end $$;
rollback;
select 'PASS compensation lease, cutoff, dispatch fence, ambiguous retry, durable completion and role denial';
