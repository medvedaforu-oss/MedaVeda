-- Synthetic local contracts only. Roll back every fixture.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('cc110000-0000-4000-8000-000000000001','phase-c@example.invalid');
update public.profiles set course_id='bams' where id='cc110000-0000-4000-8000-000000000001';
insert into public.products(id,title,scope,price,chapter_id,course_id,active,product_type)
values('phase_c_notes','Phase C Notes','chapter',5,'seed_c','bams',true,'notes');
insert into public.orders(id,user_id,product_id,scope,chapter_id,course_id,amount,list_price,provider,play_sku,status,expires_at)
values('phase_c_expired','cc110000-0000-4000-8000-000000000001','phase_c_notes','chapter','seed_c','bams',5,5,'play','synthetic_sku','created',now()-interval '1 second');
set local role service_role;
set local request.jwt.claim.role='service_role';
do $$ declare j jsonb; lease uuid; other_lease uuid; begin
 j:=public.attach_ucb_external_token('cc110000-0000-4000-8000-000000000001','phase_c_expired','synthetic_expired_choice_token');
 assert j->>'ok'='false','expired token reservation accepted';
 assert not exists(select 1 from public.purchases where product_id='phase_c_notes');
 assert exists(select 1 from pg_index i join pg_class c on c.oid=i.indexrelid
   where c.relname='orders_external_token_digest_unique' and i.indisunique and i.indisvalid);
 assert to_regclass('public.orders_external_token_unique') is null;
 assert exists(select 1 from pg_index i join pg_class c on c.oid=i.indexrelid
   where c.relname='orders_external_id_unique' and i.indisunique and i.indisvalid);
 assert (select relrowsecurity from pg_class where oid='public.notes_choice_checkouts'::regclass);
 assert not has_table_privilege('authenticated','public.notes_choice_checkouts','SELECT');
 assert not has_table_privilege('anon','public.payment_jobs','INSERT');
 assert has_function_privilege('service_role','public.prepare_notes_choice_checkout(uuid,text,text,boolean,text)','EXECUTE');
 assert not has_function_privilege('authenticated','public.record_notes_choice_authorization(text,timestamptz)','EXECUTE');
 insert into public.payment_jobs(kind,target_id,deadline_at) values('reports','phase_c_queue',now()+interval '24 hours');
 select lease_id into lease from public.claim_payment_jobs('reports',40) where target_id='phase_c_queue';
 assert lease is not null;
 assert not exists(select 1 from public.claim_payment_jobs('reports',40) where target_id='phase_c_queue');
 assert public.finish_payment_job('reports','phase_c_queue',gen_random_uuid(),true,null)='lease_lost';
 assert public.finish_payment_job('reports','phase_c_queue',lease,false,'synthetic outage')='pending';
 assert (select attempts=1 and next_attempt_at=now()+interval '60 seconds' and deadline_at=now()+interval '24 hours'
   from public.payment_jobs where target_id='phase_c_queue');
 update public.payment_jobs set next_attempt_at=now() where target_id='phase_c_queue';
 select lease_id into other_lease from public.claim_payment_jobs('reports',40) where target_id='phase_c_queue';
 assert other_lease<>lease;
 assert public.finish_payment_job('reports','phase_c_queue',lease,true,null)='lease_lost';
 assert public.finish_payment_job('reports','phase_c_queue',other_lease,true,null)='done';
 assert not exists(select 1 from public.claim_payment_jobs('reports',40) where target_id='phase_c_queue');
 raise notice 'PASS expired reservation, token digest/external-ID uniqueness, RLS/service ACLs, one lease, stable deadline/backoff, stale-finisher denial and done-job idempotency';
end $$;
reset role;
-- The exact create_play_order -> provider selection -> settlement contracts.
insert into public.products(id,title,scope,price,chapter_id,course_id,active,product_type)
values('phase_c_play','Play Notes','chapter',5,'seed_c','bams',true,'notes'),
 ('phase_c_alt','Alternative Notes','chapter',5,'seed_c','bams',true,'notes');
update public.notes set is_free_preview=false,active=true where id='seed_note';
insert into public.play_price_tiers(price_inr,play_sku,active,purchase_option_id,currency_code,region_code,verified_at)
 values(5,'phase_c_synthetic_sku',true,'buy','INR','IN',now());
insert into public.play_price_sync(price_inr,status,candidate_sku,purchase_option_id)
 values(5,'ready','phase_c_synthetic_sku','buy')
 on conflict(price_inr) do update set status='ready',candidate_sku=excluded.candidate_sku;
set local role service_role;
set local request.jwt.claim.role='service_role';
do $$ declare j jsonb; k jsonb; oid text; alt text; begin
 j:=public.create_play_order('cc110000-0000-4000-8000-000000000001','phase_c_play');
 assert j->>'ok'='true',j::text;oid:=j->>'order_id';
 assert (select amount=5 and course_id='bams' and scope='chapter' and chapter_id='seed_c'
  and play_sku='phase_c_synthetic_sku' and play_purchase_option_id='buy' from public.orders where id=oid);
 -- Simulate a catalog edit after native launch, before receipt verification.
 update public.products set scope='subject',chapter_id=null,subject_id='seed_s' where id='phase_c_play';
 j:=public.settle_play_purchase('cc110000-0000-4000-8000-000000000001',oid,'phase_c_play','phase_c_synthetic_sku','synthetic_phase_c_play_token',now());
 assert j->>'ok'='true';assert public.play_entitlement_committed(oid,'synthetic_phase_c_play_token');
 assert (select scope='chapter' and chapter_id='seed_c' and subject_id is null from public.purchases where order_id=oid);
 j:=public.settle_play_purchase('cc110000-0000-4000-8000-000000000001',oid,'phase_c_play','phase_c_synthetic_sku','synthetic_phase_c_play_token',now());
 assert j->>'already_settled'='true';
 assert (select count(*)=1 from public.purchases where order_id=oid);
 perform public.reverse_play_payment('synthetic_phase_c_play_token');
 assert not public.play_entitlement_committed(oid,'synthetic_phase_c_play_token');
 j:=public.create_play_order('cc110000-0000-4000-8000-000000000001','phase_c_alt');
 assert j->>'ok'='true',j::text;oid:=j->>'order_id';
 j:=public.attach_ucb_external_token('cc110000-0000-4000-8000-000000000001',oid,'synthetic_phase_c_external_token');
 assert j->>'ok'='true';
 j:=public.prepare_notes_choice_checkout('cc110000-0000-4000-8000-000000000001',oid,'phase_c_alt',false,'KERALA');
 assert j->>'ok'='true',j::text;alt:=j->>'order_id';
 begin
  perform public.settle_play_purchase('cc110000-0000-4000-8000-000000000001',oid,'phase_c_alt','phase_c_synthetic_sku','synthetic_forbidden_play_token',now());
  raise exception 'FAIL alternative choice allowed Play settlement';
 exception when others then
  if sqlerrm<>'Play order ownership or product mismatch' then raise;end if;
 end;
 assert not exists(select 1 from public.purchases where order_id=alt);
 update public.orders set razorpay_order_id='order_PhaseCService' where id=alt;
 perform public.record_notes_choice_authorization(alt,now());
 perform public.settle_razorpay_payment('event_PhaseCService','order_PhaseCService','pay_PhaseCService',500,now());
 assert public.razorpay_entitlement_committed(alt,'pay_PhaseCService');
 assert public.user_can_access_note('cc110000-0000-4000-8000-000000000001','seed_note');
 raise notice 'PASS real service-role create Play order/verified SKU-option price, catalog drift immutable grant, replay/refund, alternative selection excludes Play, Razorpay exact commitment and Notes unlock';
end $$;
rollback;
