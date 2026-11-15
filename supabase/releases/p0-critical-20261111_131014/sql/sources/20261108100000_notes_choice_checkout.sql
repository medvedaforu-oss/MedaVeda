-- Notes-only UCB checkout. Apply after the November pricing/reservation migration.
-- No client writes. A choice reserves exactly one priced order BEFORE contacting
-- Razorpay. Ambiguous provider creation is never retried as a new provider order.
begin;
create table public.notes_choice_checkouts (
  choice_id text primary key references public.orders(id),
  order_id text not null unique references public.orders(id),
  use_wallet boolean not null,
  buyer_state text not null,
  state text not null default 'creating' check(state in ('creating','ready','unknown')),
  created_at timestamptz not null default now()
);
alter table public.notes_choice_checkouts enable row level security;
revoke all on public.notes_choice_checkouts from public,anon,authenticated;
grant all on public.notes_choice_checkouts to service_role;

create or replace function public.prepare_notes_choice_checkout(
  p_user_id uuid,p_choice_id text,p_product_id text,p_use_wallet boolean,p_buyer_state text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.orders%rowtype; a public.notes_choice_checkouts%rowtype;
  o public.orders%rowtype; p public.products%rowtype; priced jsonb;
begin
  if p_buyer_state is null or p_buyer_state <> all(array['ANDAMAN AND NICOBAR ISLANDS','ANDHRA PRADESH','ARUNACHAL PRADESH','ASSAM','BIHAR','CHANDIGARH','CHHATTISGARH','DADRA AND NAGAR HAVELI','DADRA AND NAGAR HAVELI AND DAMAN AND DIU','DAMAN AND DIU','DELHI','GOA','GUJARAT','HARYANA','HIMACHAL PRADESH','JAMMU AND KASHMIR','JHARKHAND','KARNATAKA','KERALA','LADAKH','LAKSHADWEEP','MADHYA PRADESH','MAHARASHTRA','MANIPUR','MEGHALAYA','MIZORAM','NAGALAND','ODISHA','PUDUCHERRY','PUNJAB','RAJASTHAN','SIKKIM','TAMIL NADU','TELANGANA','TRIPURA','UTTAR PRADESH','UTTARAKHAND','WEST BENGAL']) then return jsonb_build_object('ok',false,'code','buyer_state_invalid'); end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text,0));
  select * into c from public.orders where id=p_choice_id for update;
  if not found or c.user_id is distinct from p_user_id or c.product_id is distinct from p_product_id
      or c.provider<>'play' or c.purchase_token is not null or c.play_sku is null then
    return jsonb_build_object('ok',false,'code','choice_unavailable');
  end if;
  if not exists(select 1 from public.profiles where id=p_user_id and not blocked) then
    return jsonb_build_object('ok',false,'code','account_unavailable');
  end if;
  select * into p from public.products where id=p_product_id and active;
  if not found or ((p.scope='bundle' and p.product_type='notes_bundle')
      or (p.scope in ('chapter','subject','year') and p.product_type='notes')) is not true then
    return jsonb_build_object('ok',false,'code','notes_unavailable');
  end if;
  select * into a from public.notes_choice_checkouts where choice_id=p_choice_id;
  if found then
    if a.use_wallet is distinct from p_use_wallet or a.buyer_state is distinct from p_buyer_state then
      return jsonb_build_object('ok',false,'code','choice_parameters_changed');
    end if;
    select * into o from public.orders where id=a.order_id;
    if o.user_id is distinct from p_user_id or o.product_id is distinct from p_product_id
        or o.status<>'created' or o.expires_at<=now() then
      return jsonb_build_object('ok',false,'code','checkout_expired');
    end if;
    return jsonb_build_object('ok',true,'claimed',false,'order_id',o.id,'state',a.state);
  end if;
  if c.status<>'created' or c.external_transaction_token is null
      or c.external_choice_bound_order_id is not null or c.expires_at is null or c.expires_at<=now() then
    return jsonb_build_object('ok',false,'code','choice_expired');
  end if;
  -- Same authoritative pricing, friend discount and wallet reservations as web.
  priced:=public.create_priced_order(p_user_id,p_product_id,p_use_wallet);
  if not coalesce((priced->>'ok')::boolean,false) then return priced; end if;
  select * into o from public.orders where id=priced->>'order_id' for update;
  if o.provider<>'razorpay' or o.user_id is distinct from p_user_id
      or o.product_id is distinct from p_product_id or o.tax_pre_amount is null
      or o.tax_amount is null or o.gst_rate_percent is null
      or o.tax_pre_amount+o.tax_amount<>o.amount then raise exception 'Invalid priced Notes order'; end if;
  -- Explicitly cancel even if the pricing implementation changes in the future.
  update public.orders set status='cancelled' where id=c.id and status='created';
  update public.orders set external_transaction_token=null,external_choice_bound_order_id=o.id where id=c.id;
  update public.orders set external_transaction_token=c.external_transaction_token,
    external_transaction_id='medveda_' || replace(o.id,'-',''),external_report_status='pending',
    play_sku=c.play_sku,tax_region_code='IN',tax_administrative_area=p_buyer_state where id=o.id;
  insert into public.notes_choice_checkouts(choice_id,order_id,use_wallet,buyer_state)
    values(c.id,o.id,p_use_wallet,p_buyer_state);
  return jsonb_build_object('ok',true,'claimed',true,'state','creating','order_id',o.id);
end $$;
revoke all on function public.prepare_notes_choice_checkout(uuid,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.prepare_notes_choice_checkout(uuid,text,text,boolean,text) to service_role;

-- Attachment retries are valid after the token was transferred to its one
-- Razorpay order. Never move it to a second order or accept a different token.
create or replace function public.attach_ucb_external_token(p_user_id uuid,p_order_id text,p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  if p_token is null or length(p_token)<10 or length(p_token)>4096 then
    return jsonb_build_object('ok',false,'code','invalid_token'); end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text,0));
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.user_id is distinct from p_user_id or o.provider<>'play' or o.purchase_token is not null then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_choice_bound_order_id is not null then
    if exists(select 1 from public.orders where id=o.external_choice_bound_order_id
      and user_id=p_user_id and product_id=o.product_id and provider='razorpay' and external_transaction_token=p_token) then
      return jsonb_build_object('ok',true); end if;
    return jsonb_build_object('ok',false,'code','token_already_attached');
  end if;
  if o.status<>'created' or o.expires_at<now() then
    return jsonb_build_object('ok',false,'code','order_unavailable'); end if;
  if o.external_transaction_token is not null and o.external_transaction_token<>p_token then
    return jsonb_build_object('ok',false,'code','token_already_attached'); end if;
  update public.orders set external_transaction_token=p_token where id=p_order_id and external_transaction_token is null;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.attach_ucb_external_token(uuid,text,text) from public,anon,authenticated;
grant execute on function public.attach_ucb_external_token(uuid,text,text) to service_role;
-- Authorisation queues reporting without granting access. The immutable provider
-- payment creation time is shared by authorized/captured deliveries so retries
-- cannot change Google's transaction timestamp. Existing website orders skip it.
alter table public.orders add column if not exists ucb_transaction_time timestamptz;
create or replace function public.record_notes_choice_authorization(
  p_order_id text,p_provider_time timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.provider<>'razorpay' or o.external_transaction_token is null then return; end if;
  if p_provider_time is null or p_provider_time>now()+interval '5 minutes' then
    raise exception 'Invalid provider authorisation time'; end if;
  update public.orders set ucb_transaction_time=coalesce(ucb_transaction_time,p_provider_time)
    where id=o.id;
  insert into public.payment_jobs(kind,target_id,deadline_at)
    values('reports',o.id,coalesce(o.ucb_transaction_time,p_provider_time)+interval '24 hours')
    on conflict(kind,target_id) do nothing;
end $$;
revoke all on function public.record_notes_choice_authorization(text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_notes_choice_authorization(text,timestamptz) to service_role;
create or replace function public.enqueue_payment_jobs() returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'reports',o.id,coalesce(o.ucb_transaction_time,o.payment_provider_time,o.payment_completed_at,o.created_at)+interval '24 hours'
  from public.orders o where o.external_transaction_token is not null
    and o.external_report_status in ('pending','failed') and o.status in ('paid','refunded')
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
  insert into public.payment_jobs(kind,target_id,deadline_at)
  select 'events',e.event_id,e.received_at+interval '24 hours'
  from public.provider_events e where e.status='pending' and e.payment_id is not null
    and exists(select 1 from public.orders o where o.razorpay_payment_id=e.payment_id)
    and e.event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
      'payment.dispute.action_required','payment.dispute.won','payment.dispute.lost','payment.dispute.closed')
  on conflict(kind,target_id) do nothing;
end $$;
revoke all on function public.enqueue_payment_jobs() from public,anon,authenticated;
grant execute on function public.enqueue_payment_jobs() to service_role;

commit;
