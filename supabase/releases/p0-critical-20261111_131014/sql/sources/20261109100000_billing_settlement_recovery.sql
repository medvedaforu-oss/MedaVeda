-- Forward-only billing correctness/recovery. No remote application is authorized.
-- Requires the retained November snapshot and Notes choice migrations.
begin;
alter table public.provider_events add column if not exists blocks_entitlement boolean;
alter table public.orders add column if not exists external_report_test_purchase boolean;
-- Opaque tokens may be 4096 characters; a direct btree key can exceed the
-- PostgreSQL index tuple limit. Retain uniqueness with a fixed-width digest.
create unique index if not exists orders_external_token_digest_unique
  on public.orders(extensions.digest(external_transaction_token,'sha256'))
  where external_transaction_token is not null;
drop index if exists public.orders_external_token_unique;
-- Read-only proof used both inside settlement and by Edge after commit.
-- No historical rows/prices are rewritten; legacy entitlements remain intact.
create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.razorpay_payment_id=p_payment_id
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and o.provider='razorpay' and o.status='paid'
     and o.razorpay_payment_id=p_payment_id and o.user_id is not null
     and m.status='success' and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
     and not exists(select 1 from public.provider_events e where e.payment_id=p_payment_id
       and e.status='pending' and e.blocks_entitlement is distinct from false
       and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
         'payment.dispute.action_required','payment.dispute.lost'))
     and p.status='success' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.razorpay_entitlement_committed(text,text) to service_role;

create or replace function public.settle_razorpay_payment(
  p_event_id text,p_razorpay_order_id text,p_razorpay_payment_id text,
  p_amount_paise bigint,p_paid_at timestamptz default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_capture public.payment_captures%rowtype;
  v_reason text; v_reversal boolean; v_error text; v_uid uuid;
begin
  -- Match creation, refund and legacy settlement lock order: user, then order.
  select user_id into v_uid from public.orders where razorpay_order_id=p_razorpay_order_id;
  if v_uid is not null then
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_uid::text,0));
  end if;
  select * into v_order from public.orders where razorpay_order_id=p_razorpay_order_id for update;
  if not found then raise exception 'Razorpay order is not linked'; end if;
  if round(v_order.amount*100)::bigint<>p_amount_paise then raise exception 'capture amount mismatch'; end if;
  perform public.record_payment_capture(p_razorpay_payment_id,p_razorpay_order_id,p_amount_paise,null);
  select * into v_capture from public.payment_captures where payment_id=p_razorpay_payment_id for update;
  if v_capture.status in ('compensation_pending','compensated') then
    update public.provider_events set status='applied'
      where event_id=p_event_id and event_type='payment.captured';
    return;
  end if;
  if v_order.razorpay_payment_id is not null and v_order.razorpay_payment_id<>p_razorpay_payment_id then
    insert into public.payment_compensations(payment_id,order_id,amount_paise,reason,refund_request_id)
      values(p_razorpay_payment_id,v_order.id,p_amount_paise,'additional_capture',
        'medveda_comp_' || md5(p_razorpay_payment_id)) on conflict(payment_id) do nothing;
    update public.payment_captures set status='compensation_pending',failure_reason='additional_capture'
      where payment_id=p_razorpay_payment_id;
    update public.provider_events set status='applied' where event_id=p_event_id and event_type='payment.captured';
    return;
  end if;
  -- Link the verified capture so an earlier reversal inbox can be reconciled
  -- even while entitlement is held. This does not mark the order paid.
  update public.orders set razorpay_payment_id=p_razorpay_payment_id
    where id=v_order.id and razorpay_payment_id is null;
  -- A successful capture replay must not become stale merely because time passed.
  -- Reversals still take precedence and never restore access.
  if v_capture.status='granted' and v_order.status='paid' then
    update public.provider_events set status='applied'
      where event_id=p_event_id and event_type='payment.captured';
    return;
  end if;
  -- Unknown reversal facts and open disputes HOLD settlement. A later won
  -- dispute clears the hold; an authenticated full refund/lost dispute reverses.
  -- Never infer a full refund from a refund.processed event alone.
  if v_order.status<>'refunded' and v_capture.status<>'reversed' and exists(
    select 1 from public.provider_events e where e.payment_id=p_razorpay_payment_id
      and e.status in ('pending','applied')
      and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
        'payment.dispute.action_required','payment.dispute.lost')
      and (e.blocks_entitlement is null or (e.blocks_entitlement and
        e.event_type in ('payment.dispute.created','payment.dispute.under_review','payment.dispute.action_required')))) then
    return;
  end if;
  select v_order.status='refunded' or v_capture.status='reversed' or exists(
    select 1 from public.provider_events e where e.payment_id=p_razorpay_payment_id
      and e.blocks_entitlement and e.status in ('pending','applied')
      and e.event_type in ('refund.processed','payment.dispute.lost')) into v_reversal;
  if v_reversal then v_reason:='reversal_received';
  elsif v_order.user_id is null then v_reason:='account_deleted';
  elsif v_order.scope is null or v_order.scope not in ('chapter','subject','year','bundle')
      or (v_order.scope='chapter' and v_order.chapter_id is null)
      or (v_order.scope='subject' and v_order.subject_id is null)
      or (v_order.scope='year' and v_order.year_id is null)
      or (v_order.scope='bundle' and coalesce(array_length(v_order.year_ids,1),0)=0)
      or v_order.course_id is null then v_reason:='missing_entitlement_snapshot';
  elsif v_order.referral_discount>0 and (v_order.status in ('cancelled','failed')
      or (v_order.expires_at is not null and coalesce(p_paid_at,now())>v_order.expires_at)) then
    v_reason:='stale_discount';
  elsif v_order.referral_discount>0 and not exists(select 1 from public.first_discount_reservations
      where order_id=v_order.id and user_id=v_order.user_id) then v_reason:='discount_reused';
  elsif exists(select 1 from public.purchases where user_id=v_order.user_id
      and product_id=v_order.product_id and status='success' and order_id is distinct from v_order.id) then
    v_reason:='already_owned';
  elsif v_order.amount<>v_order.list_price-v_order.referral_discount-v_order.wallet_amount then
    v_reason:='underpriced_order';
  end if;
  if v_reason is null then
    begin
      perform public.settle_razorpay_payment_legacy(p_event_id,p_razorpay_order_id,
        p_razorpay_payment_id,p_amount_paise,p_paid_at);
    exception when others then
      v_error:=sqlerrm;
      if v_error like 'wallet shortfall:%' then v_reason:='wallet_shortfall';
      else raise; end if;
    end;
  end if;
  if v_reason is not null then
    update public.orders set status=case when v_reversal then 'refunded' else 'paid' end,
      razorpay_payment_id=p_razorpay_payment_id, updated_at=now(),
      payment_completed_at=coalesce(payment_completed_at,clock_timestamp())
      where id=v_order.id and status<>'refunded';
    insert into public.payment_compensations(payment_id,order_id,amount_paise,reason,refund_request_id)
      select p_razorpay_payment_id,v_order.id,p_amount_paise,v_reason,
        'medveda_comp_' || md5(p_razorpay_payment_id)
      where not v_reversal on conflict(payment_id) do nothing;
    update public.payment_captures set status=case when v_reversal then 'reversed' else 'compensation_pending' end,
      failure_reason=v_reason where payment_id=p_razorpay_payment_id;
  else
    if not public.razorpay_entitlement_committed(v_order.id,p_razorpay_payment_id) then
      raise exception 'Razorpay entitlement not committed';
    end if;
    update public.payment_captures set status='granted' where payment_id=p_razorpay_payment_id;
  end if;
  update public.orders set payment_provider_time=coalesce(payment_provider_time,v_capture.provider_time),
    payment_received_at=coalesce(payment_received_at,v_capture.received_at),
    payment_completed_at=coalesce(payment_completed_at,clock_timestamp()),
    payment_time_fallback=(v_capture.provider_time is null)
    where id=v_order.id;
  update public.provider_events set status='applied'
    where event_id=p_event_id and event_type='payment.captured';
end $$;
revoke all on function public.settle_razorpay_payment(text,text,text,bigint,timestamptz) from public,anon,authenticated;
grant execute on function public.settle_razorpay_payment(text,text,text,bigint,timestamptz) to service_role;


create or replace function public.attach_ucb_external_token(p_user_id uuid,p_order_id text,p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  if p_token is null or length(p_token)<10 or length(p_token)>4096 or p_token ~ '[[:space:][:cntrl:]]' then
    return jsonb_build_object('ok',false,'code','invalid_token'); end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text,0));
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.user_id is distinct from p_user_id or o.provider<>'play' or o.purchase_token is not null or o.play_sku is null then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_choice_bound_order_id is not null then
    if exists(select 1 from public.orders where id=o.external_choice_bound_order_id
      and user_id=p_user_id and product_id=o.product_id and provider='razorpay' and external_transaction_token=p_token) then
      return jsonb_build_object('ok',true); end if;
    return jsonb_build_object('ok',false,'code','token_already_attached');
  end if;
  if o.status<>'created' or o.expires_at is null or o.expires_at<=now() then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_transaction_token is not null and o.external_transaction_token<>p_token then
    return jsonb_build_object('ok',false,'code','token_already_attached'); end if;
  if exists(select 1 from public.orders where external_transaction_token=p_token and id<>p_order_id) then
    return jsonb_build_object('ok',false,'code','token_already_attached'); end if;
  update public.orders set external_transaction_token=p_token where id=p_order_id and external_transaction_token is null;
  return jsonb_build_object('ok',true);
exception when unique_violation then
  return jsonb_build_object('ok',false,'code','token_already_attached');
end $$;
revoke all on function public.attach_ucb_external_token(uuid,text,text) from public,anon,authenticated;
grant execute on function public.attach_ucb_external_token(uuid,text,text) to service_role;
create or replace function public.enqueue_payment_jobs() returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reports',o.id,coalesce(o.ucb_transaction_time,o.payment_provider_time,o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.external_transaction_token is not null
    and o.external_report_status in ('pending','failed')
    and (o.ucb_transaction_time is not null or o.status in ('paid','refunded'))
  on conflict(kind,target_id) do update set deadline_at=excluded.deadline_at;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'refunds',r.refund_id,r.refund_time+interval '24 hours'
  from public.ucb_external_refunds r where r.status in ('pending','failed','processing')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'consume',o.id,coalesce(o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.provider='play' and o.status='paid'
    and o.play_consumption_status in ('pending','failed')
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reconcile',o.id,coalesce(o.play_last_checked_at,o.created_at)+interval '2 hours'
  from public.orders o where o.provider='play' and o.status='paid' and o.purchase_token is not null
    and (o.play_last_checked_at is null or o.play_last_checked_at<now()-interval '2 hours')
  on conflict(kind,target_id) do update set status='pending', next_attempt_at=now(),
    deadline_at=excluded.deadline_at, attempts=0, lease_id=null, lease_until=null
    where public.payment_jobs.status='done';
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'compensate',c.payment_id,c.created_at+interval '24 hours'
  from public.payment_compensations c where c.status in ('pending','processing')
  on conflict(kind,target_id) do nothing;
  -- Captures survive an Edge/SQL outage even if no webhook is delivered again.
  -- Reuse the existing events schedule; these targets cannot collide with provider event IDs.
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'events','capture:' || c.payment_id,c.received_at+interval '24 hours'
  from public.payment_captures c where c.status='captured'
  on conflict(kind,target_id) do nothing;
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'events',e.event_id,e.received_at+interval '24 hours'
  from public.provider_events e where e.status='pending' and e.payment_id is not null
    and (e.event_type in ('payment.captured','payment.authorized') or
      (exists(select 1 from public.orders o where o.razorpay_payment_id=e.payment_id)
    and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
      'payment.dispute.action_required','payment.dispute.won','payment.dispute.lost','payment.dispute.closed')))
  on conflict(kind,target_id) do nothing;
end $$;
revoke all on function public.enqueue_payment_jobs() from public,anon,authenticated;
grant execute on function public.enqueue_payment_jobs() to service_role;


-- A paid order is an accounting fact, not by itself a Notes entitlement.
create or replace function public.play_entitlement_committed(p_order_id text,p_token text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.purchase_token=p_token
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and o.provider='play' and o.status='paid' and o.purchase_token=p_token
     and o.user_id is not null and m.status='success' and m.user_id=o.user_id
     and m.product_id=o.product_id and m.amount=o.amount
     and p.status='success' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.play_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.play_entitlement_committed(text,text) to service_role;

create or replace function public.get_my_play_fulfillment(p_order_id text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id=p_order_id and user_id=auth.uid() and provider='play';
  if not found then return jsonb_build_object('success',false,'pending',true); end if;
  if o.status='refunded' then
    return jsonb_build_object('success',false,'pending',false,'message','This payment was refunded.'); end if;
  if exists(select 1 from public.purchases where order_id=o.id and status='duplicate') then
    return jsonb_build_object('success',false,'pending',false,'message','This product was already owned; contact support for a refund.'); end if;
  if public.play_entitlement_committed(o.id,o.purchase_token) then
    return jsonb_build_object('success',true,'internalOrderId',o.id,'amount',o.amount); end if;
  return jsonb_build_object('success',false,'pending',true);
end $$;
revoke all on function public.get_my_play_fulfillment(text) from public,anon;
grant execute on function public.get_my_play_fulfillment(text) to authenticated,service_role;

commit;
