-- AUD-012: forward-only function changes. No historical data rewrite.
-- Apply before the batch's webhook/verifier bundles. Existing clients remain compatible.
begin;
create or replace function public.reverse_refunded_capture(p_payment_id text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare c public.payment_captures%rowtype; o public.orders%rowtype; v_uid uuid; v_chargeback boolean;
begin
  select * into c from public.payment_captures where payment_id=p_payment_id;
  if not found then raise exception 'verified capture required'; end if;
  -- Same wallet -> order -> capture lock order as settlement; no capture lock
  -- may be taken first, even when this RPC races a capture retry.
  select user_id into v_uid from public.orders where razorpay_order_id=c.razorpay_order_id;
  if v_uid is not null then
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_uid::text,0));
  end if;
  select * into o from public.orders where razorpay_order_id=c.razorpay_order_id for update;
  if found and o.provider='razorpay' and round(o.amount*100)::bigint=c.amount_paise
      and (o.razorpay_payment_id is null or o.razorpay_payment_id=p_payment_id) then
    update public.orders set razorpay_payment_id=p_payment_id
      where id=o.id and razorpay_payment_id is null;
    select exists(select 1 from public.purchases where order_id=o.id and status='chargeback')
      or exists(select 1 from public.provider_events e
        where e.payment_id=p_payment_id and e.blocks_entitlement
          and e.event_type='payment.dispute.lost' and e.status in ('pending','applied')) into v_chargeback;
    perform public.reverse_payment(p_payment_id,
      case when v_chargeback then 'chargeback' else 'refunded' end,not v_chargeback);
    -- reverse_payment historically only transitions paid orders. A refunded
    -- capture received before settlement must also be terminal without a grant.
    update public.orders set status='refunded',updated_at=now() where id=o.id and status<>'refunded';
  end if;
  update public.payment_captures set status='reversed',failure_reason='provider_already_refunded'
    where payment_id=p_payment_id;
end $$;
revoke all on function public.reverse_refunded_capture(text) from public,anon,authenticated;
grant execute on function public.reverse_refunded_capture(text) to service_role;

-- Publish a compensation and its capture disposition atomically, under the
-- same locks used by settlement. A stale Edge lookup cannot refund a grant.
create or replace function public.queue_capture_compensation(p_payment_id text)
returns text language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare c public.payment_captures%rowtype; o public.orders%rowtype; v_uid uuid; v_reason text;
begin
  select * into c from public.payment_captures where payment_id=p_payment_id;
  if not found then raise exception 'verified capture required'; end if;
  select user_id into v_uid from public.orders where razorpay_order_id=c.razorpay_order_id;
  if v_uid is not null then
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_uid::text,0));
  end if;
  select * into o from public.orders where razorpay_order_id=c.razorpay_order_id for update;
  select * into c from public.payment_captures where payment_id=p_payment_id for update;
  if c.status='reversed' then return 'reversed'; end if;
  if c.status='compensated' then return 'compensated'; end if;
  if c.status='compensation_pending' then return 'queued'; end if;
  if c.status<>'captured' then return 'retry'; end if;
  -- Newly attached or changed order requires a fresh full settlement check.
  if o.id is not null and round(o.amount*100)::bigint=c.amount_paise then return 'retry'; end if;
  v_reason:=case when o.id is null then 'unknown_order' else 'amount_mismatch' end;
  insert into public.payment_compensations(payment_id,order_id,amount_paise,reason,refund_request_id)
    values(p_payment_id,o.id,c.amount_paise,v_reason,'medveda_comp_' || md5(p_payment_id))
    on conflict(payment_id) do nothing;
  update public.payment_captures set status='compensation_pending',failure_reason=v_reason
    where payment_id=p_payment_id;
  return 'queued';
end $$;
revoke all on function public.queue_capture_compensation(text) from public,anon,authenticated;
grant execute on function public.queue_capture_compensation(text) to service_role;

create or replace function public.settle_razorpay_payment(
  p_event_id text,p_razorpay_order_id text,p_razorpay_payment_id text,
  p_amount_paise bigint,p_paid_at timestamptz default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_capture public.payment_captures%rowtype;
  v_reason text; v_reversal boolean; v_error text; v_uid uuid; v_chargeback boolean;
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
    if v_reversal then
      -- Linkage is already locked above. Revoke an existing purchase as well
      -- as preventing a new grant; lost disputes never restore buyer wallet.
      select exists(select 1 from public.purchases where order_id=v_order.id and status='chargeback')
        or exists(select 1 from public.provider_events e
          where e.payment_id=p_razorpay_payment_id and e.blocks_entitlement
            and e.event_type='payment.dispute.lost' and e.status in ('pending','applied')) into v_chargeback;
      perform public.reverse_payment(p_razorpay_payment_id,
        case when v_chargeback then 'chargeback' else 'refunded' end,not v_chargeback);
    end if;
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
create or replace function public.user_can_access_note(p_user uuid, p_note_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user is not null
    and exists (select 1 from public.profiles pr
      where pr.id = p_user and not coalesce(pr.blocked, false))
    and exists (
      select 1 from public.notes n
      join public.chapters c on c.id = n.chapter_id
      where n.id = p_note_id and n.active
        and public.content_is_published(n.course_id, n.year_id, c.subject_id, n.chapter_id)
        and (
          (n.is_free_preview and exists (select 1 from public.profiles pr
            where pr.id = p_user and pr.course_id = n.course_id))
          or (not public.admin_mfa_required()
            and exists (select 1 from public.admins a where a.id = p_user))
          or exists (
            select 1 from public.purchases p
            where p.user_id = p_user and p.status = 'success'
              -- Refunded historical orders cannot grant a paid URL even if a
              -- missed event left the purchase row marked successful.
              and not exists (
                select 1 from public.orders o
                left join public.payment_captures pc on pc.payment_id=o.razorpay_payment_id
                where o.id=p.order_id and (o.status='refunded' or pc.status in ('reversed','compensated'))
              )
              and p.course_id = c.course_id
              and ((p.scope = 'chapter' and p.chapter_id = c.id)
                or (p.scope = 'subject' and p.subject_id = c.subject_id)
                or (p.scope = 'year' and p.year_id = c.year_id)
                or (p.scope = 'bundle' and c.year_id = any(p.year_ids)))
          )
        )
    );
$$;
revoke all on function public.user_can_access_note(uuid,text) from public,anon,authenticated;
grant execute on function public.user_can_access_note(uuid,text) to service_role;
commit;
