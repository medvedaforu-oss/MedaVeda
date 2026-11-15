-- Synthetic disposable database only. Retains all financial rows via rollback.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('d9500000-0000-4000-8000-000000000001','p0-reversal@example.invalid');
update public.profiles set course_id='bams' where id='d9500000-0000-4000-8000-000000000001';
do $$
declare j jsonb; oid text; flag boolean;
begin
  j:=public.create_priced_order('d9500000-0000-4000-8000-000000000001','seed_product',false);
  assert j->>'ok'='true'; oid:=j->>'order_id';
  update public.orders set razorpay_order_id='order_P0Reversal' where id=oid;
  insert into public.provider_events(event_id,event_type,payment_id,payload_hash,status,blocks_entitlement)
    values('evt_p0_partial','refund.processed','pay_P0Reversal',repeat('a',64),'pending',false);
  perform public.settle_razorpay_payment('evt_p0_capture','order_P0Reversal','pay_P0Reversal',4900,now());
  assert public.razorpay_entitlement_committed(oid,'pay_P0Reversal'), 'verified partial refund must not deadlock exact commitment';
  assert public.user_can_access_note('d9500000-0000-4000-8000-000000000001','seed_note');
  for flag in select unnest(array[true,null]::boolean[]) loop
    update public.provider_events set blocks_entitlement=flag where event_id='evt_p0_partial';
    assert not public.razorpay_entitlement_committed(oid,'pay_P0Reversal'), 'unknown/blocking reversal proved commitment';
  end loop;
  update public.provider_events set blocks_entitlement=false,status='parked' where event_id='evt_p0_partial';
  assert not public.razorpay_entitlement_committed(oid,'pay_P0Reversal'), 'parked reversal proved commitment';
  update public.provider_events set status='applied' where event_id='evt_p0_partial';
  insert into public.provider_events(event_id,event_type,payment_id,provider_object_id,payload_hash,status,blocks_entitlement)
    values('evt_p0_won','payment.dispute.created','pay_P0Reversal','disp_P0Reversal',repeat('b',64),'pending',false);
  assert public.razorpay_entitlement_committed(oid,'pay_P0Reversal'), 'provider-confirmed won dispute cannot recover';
  perform public.handle_payment_dispute('pay_P0Reversal','opened');
  assert not public.razorpay_entitlement_committed(oid,'pay_P0Reversal');
  perform public.handle_payment_dispute('pay_P0Reversal','won');
  assert public.razorpay_entitlement_committed(oid,'pay_P0Reversal');
  perform public.handle_payment_refund('pay_P0Reversal',true);
  assert not public.razorpay_entitlement_committed(oid,'pay_P0Reversal');
  assert not public.user_can_access_note('d9500000-0000-4000-8000-000000000001','seed_note');
  raise notice 'PASS classified reversal recovery; unknown/blocking/parked denial; dispute restoration; full refund denial';
end $$;
rollback;
