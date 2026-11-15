\set ON_ERROR_STOP on
begin;
-- Real reversal accounting through the new fallback and through legacy markers.
insert into auth.users(id,email) values
 ('ab120000-0000-4000-8000-000000000001','batch-refund@example.invalid'),
 ('ab120000-0000-4000-8000-000000000002','batch-referrer@example.invalid'),
 ('ab120000-0000-4000-8000-000000000003','batch-chargeback@example.invalid'),
 ('ab120000-0000-4000-8000-000000000004','batch-marker@example.invalid'),
 ('ab120000-0000-4000-8000-000000000005','batch-stale-access@example.invalid');
update public.profiles set course_id='bams' where id::text like 'ab120000-%';
update public.referral_settings set enabled=true,require_verified_phone=false,
 friend_discount_percent=10,friend_discount_max=100,referrer_credit_amount=5,
 credit_hold_days=7,wallet_max_percent=50,apply_window_days=2 where id=true;
insert into public.referrals(referrer_id,referred_id,code_used,status) values
 ('ab120000-0000-4000-8000-000000000002','ab120000-0000-4000-8000-000000000001','X','pending');
select set_config('app.trusted_order_write','true',true);
insert into public.wallet_ledger(user_id,entry_type,status,amount,source,note) values
 ('ab120000-0000-4000-8000-000000000001','credit','available',10,'admin_adjustment','synthetic'),
 ('ab120000-0000-4000-8000-000000000003','credit','available',10,'admin_adjustment','synthetic');
select set_config('app.trusted_order_write','false',true);
do $$
declare j jsonb; o public.orders%rowtype; before_balance numeric;
begin
 j:=public.create_priced_order('ab120000-0000-4000-8000-000000000001','seed_product',true);
 assert j->>'ok'='true',j::text;
 update public.orders set razorpay_order_id='order_BatchRefund' where id=j->>'order_id';
 select * into o from public.orders where id=j->>'order_id';
 assert o.wallet_amount>0;
 perform public.settle_razorpay_payment('evt_b1_refund','order_BatchRefund','pay_BatchRefund',round(o.amount*100)::bigint,now());
 assert public.user_can_access_note(o.user_id,'seed_note');
 assert exists(select 1 from public.wallet_ledger where order_id=o.id and source='referral_reward' and status='pending');
end $$;
-- Failure at the final marker write must roll back purchase/wallet/referral changes.
create function pg_temp.reject_reversed_marker() returns trigger language plpgsql as $$
begin if new.status='reversed' then raise exception 'injected marker failure'; end if; return new; end $$;
create trigger audit_batch1_fail before update on public.payment_captures
 for each row execute function pg_temp.reject_reversed_marker();
do $$
begin
 begin
  perform public.reverse_refunded_capture('pay_BatchRefund');
  raise exception 'expected injected failure';
 exception when others then assert sqlerrm='injected marker failure',sqlerrm; end;
 assert public.user_can_access_note('ab120000-0000-4000-8000-000000000001','seed_note');
 assert not exists(select 1 from public.wallet_ledger where source='order_refund' and order_id=(select id from public.orders where razorpay_payment_id='pay_BatchRefund'));
end $$;
drop trigger audit_batch1_fail on public.payment_captures;
select public.reverse_refunded_capture('pay_BatchRefund');
select public.reverse_refunded_capture('pay_BatchRefund');
do $$
declare o public.orders%rowtype;
begin
 select * into o from public.orders where razorpay_payment_id='pay_BatchRefund';
 assert o.status='refunded';
 assert not public.user_can_access_note(o.user_id,'seed_note');
 assert (select status='refunded' from public.purchases where order_id=o.id);
 assert (select status='reversed' from public.payment_captures where payment_id='pay_BatchRefund');
 assert (select count(*)=1 and sum(amount)=o.wallet_amount from public.wallet_ledger where order_id=o.id and source='order_refund' and entry_type='credit');
 assert (select status='cancelled' from public.wallet_ledger where order_id=o.id and source='referral_reward');
 assert not public.razorpay_entitlement_committed(o.id,'pay_BatchRefund');
end $$;
-- An old reversed marker on a successful purchase must also revoke via settlement.
do $$
declare j jsonb; o public.orders%rowtype;
begin
 j:=public.create_priced_order('ab120000-0000-4000-8000-000000000004','seed_product',false);
 assert j->>'ok'='true';
 update public.orders set razorpay_order_id='order_BatchMarker' where id=j->>'order_id';
 select * into o from public.orders where id=j->>'order_id';
 perform public.settle_razorpay_payment('evt_b1_marker','order_BatchMarker','pay_BatchMarker',round(o.amount*100)::bigint,now());
 update public.payment_captures set status='reversed' where payment_id='pay_BatchMarker';
 perform public.settle_razorpay_payment('evt_b1_marker_retry','order_BatchMarker','pay_BatchMarker',round(o.amount*100)::bigint,now());
 assert not public.user_can_access_note(o.user_id,'seed_note');
end $$;
-- Classified lost dispute uses chargeback semantics, including zero wallet restoration.
do $$
declare j jsonb; o public.orders%rowtype;
begin
 j:=public.create_priced_order('ab120000-0000-4000-8000-000000000003','seed_product',true);
 assert j->>'ok'='true';
 update public.orders set razorpay_order_id='order_BatchLost' where id=j->>'order_id';
 select * into o from public.orders where id=j->>'order_id';
 perform public.settle_razorpay_payment('evt_b1_lost','order_BatchLost','pay_BatchLost',round(o.amount*100)::bigint,now());
 perform public.record_provider_event('evt_b1_lost_fact','payment.dispute.lost','order_BatchLost','pay_BatchLost','disp_BatchLost',repeat('a',64),null);
 update public.provider_events set blocks_entitlement=true where event_id='evt_b1_lost_fact';
 -- Existing capture marker needs reversal processing rather than an early grant replay.
 update public.payment_captures set status='reversed' where payment_id='pay_BatchLost';
 perform public.settle_razorpay_payment('evt_b1_lost_replay','order_BatchLost','pay_BatchLost',round(o.amount*100)::bigint,now());
 assert (select status='chargeback' from public.purchases where order_id=o.id);
 assert not exists(select 1 from public.wallet_ledger where order_id=o.id and source='order_refund' and entry_type='credit');
 assert not public.user_can_access_note(o.user_id,'seed_note');
end $$;
do $$
begin
 assert not has_function_privilege('anon','public.reverse_refunded_capture(text)','execute');
 assert not has_function_privilege('authenticated','public.reverse_refunded_capture(text)','execute');
 assert has_function_privilege('service_role','public.reverse_refunded_capture(text)','execute');
end $$;
-- Historical inconsistent rows are denied immediately, without financial backfill.
do $$
declare j jsonb; o public.orders%rowtype;
begin
 j:=public.create_priced_order('ab120000-0000-4000-8000-000000000005','seed_product',false);
 assert j->>'ok'='true';
 update public.orders set razorpay_order_id='order_BatchStaleAccess' where id=j->>'order_id';
 select * into o from public.orders where id=j->>'order_id';
 perform public.settle_razorpay_payment('evt_b1_stale','order_BatchStaleAccess','pay_BatchStaleAccess',round(o.amount*100)::bigint,now());
 assert public.user_can_access_note(o.user_id,'seed_note');
 update public.orders set status='refunded' where id=o.id;
 assert (select status='success' from public.purchases where order_id=o.id);
 assert not public.user_can_access_note(o.user_id,'seed_note'), 'refunded order still grants signing access';
end $$;
rollback;
\echo PASS batch refund SQL: atomic failure rollback, wallet restored once, referral cancelled, legacy marker revoked, lost dispute no wallet restoration, service-only ACL
