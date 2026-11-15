-- Separate P0 forward candidate; independently approve after C reaches 73.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='15s';
SET LOCAL idle_in_transaction_session_timeout='15s';
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;
DO $gate$ DECLARE k text; BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'approved postgres operator required'; END IF;
 FOREACH k IN ARRAY ARRAY['medveda.p0_review_approval','medveda.recovery_evidence','medveda.quiescence_evidence','medveda.window_approval','medveda.drift_approval'] LOOP
  IF nullif(current_setting(k,true),'') IS NULL THEN RAISE EXCEPTION 'missing P0 approval/recovery/quiescence evidence: %',k; END IF;
 END LOOP;
 IF (SELECT array_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations)
 IS DISTINCT FROM ARRAY['20260701000000','20260718','20260721','20260801','20260801150000','20260919120000','20260919130000','20260920120000','20260920130000','20260920140000','20260921120000','20260921130000','20260922100000','20260923100000','20260924100000','20260924110000','20260924120000','20260924130000','20260924140000','20260924150000','20260925100000','20260925110000','20260925120000','20260925130000','20260925140000','20260926100000','20260926110000','20260926120000','20260926130000','20260927100000','20260927110000','20260927120000','20260927130000','20260928100000','20260928110000','20260929100000','20260930100000','20260930110000','20261001100000','20261012100000','20261012110000','20261012120000','20261013090000','20261013100000','20261013110000','20261014100000','20261014110000','20261015100000','20261015120000','20261016090000','20261016100000','20261018100000','20261018110000','20261018120000','20261018130000','20261019150000','20261019151000','20261020100000','20261020101000','20261020102000','20261020103000','20261020104000','20261020105000','20261020110000','20261104100000','20261104110000','20261108100000','20261109100000','20261110100000','20261110120000','20261110130000','20261111100000','20261111110000']::text[] THEN RAISE EXCEPTION 'P0 requires exact 73-version C ledger'; END IF;
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.razorpay_entitlement_committed(text,text)'::regprocedure)
 <> '49b01fbcc7a5e71bd527366fd342a6e9' THEN RAISE EXCEPTION 'P0 commitment preimage drift'; END IF;
 IF (SELECT pg_get_userbyid(proowner)='postgres' AND prosecdef AND provolatile='s' AND proconfig=ARRAY['search_path=pg_catalog, public, pg_temp']::text[] FROM pg_proc WHERE oid='public.razorpay_entitlement_committed(text,text)'::regprocedure) IS DISTINCT FROM true THEN RAISE EXCEPTION 'P0 proof security preimage drift'; END IF;
 IF (SELECT statements FROM supabase_migrations.schema_migrations WHERE version='20261108100000') IS DISTINCT FROM ARRAY[$p0_preimage$-- Notes-only UCB checkout. Apply after the November pricing/reservation migration.
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
$p0_preimage$]::text[] THEN RAISE EXCEPTION 'P0 exact predecessor ledger source drift: 20261108100000'; END IF;
 IF (SELECT statements FROM supabase_migrations.schema_migrations WHERE version='20261109100000') IS DISTINCT FROM ARRAY[$p0_preimage$-- Forward-only billing correctness/recovery. No remote application is authorized.
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
$p0_preimage$]::text[] THEN RAISE EXCEPTION 'P0 exact predecessor ledger source drift: 20261109100000'; END IF;
 IF (SELECT statements FROM supabase_migrations.schema_migrations WHERE version='20261110100000') IS DISTINCT FROM ARRAY[$p0_preimage$-- MV003: additive proof for the production void settlement contract.
-- Standalone on production through 20261104110000; no billing-choice/recovery
-- migrations, capture backfill, entitlement repair or financial writes required.
begin;
create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.orders o
    join public.payments m on m.order_id=o.id
    join public.purchases p on p.order_id=o.id
    where o.id=p_order_id and p_payment_id is not null and p_payment_id<>''
      and o.provider='razorpay' and o.status='paid'
      and o.razorpay_payment_id=p_payment_id
      and o.razorpay_order_id is not null and o.razorpay_order_id<>''
      and o.user_id is not null and o.product_id is not null
      and o.amount>0 and o.course_id is not null
      and o.scope in ('chapter','subject','year','bundle')
      and case o.scope
        when 'chapter' then o.chapter_id is not null
        when 'subject' then o.subject_id is not null
        when 'year' then o.year_id is not null
        when 'bundle' then coalesce(cardinality(o.year_ids),0)>0
          and array_position(o.year_ids,null) is null
        else false end
      and m.provider='razorpay' and m.status='success'
      and m.razorpay_payment_id=p_payment_id and m.razorpay_order_id=o.razorpay_order_id
      and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
      and p.status='success' and p.user_id=o.user_id
      and p.product_id=o.product_id and p.amount=o.amount
      and p.razorpay_order_id=o.razorpay_order_id
      and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
        is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id)
      -- Absence is allowed for historical purchases. An existing capture must
      -- match exactly and must not be awaiting or have completed reversal.
      and not exists (select 1 from public.payment_captures c
        where c.payment_id=p_payment_id and (
          c.order_id is distinct from o.id or c.razorpay_order_id is distinct from o.razorpay_order_id
          or c.amount_paise is distinct from round(o.amount*100)::bigint
          or c.status not in ('captured','granted')))
      -- Even parked compensation is unresolved; no compensation state grants.
      and not exists (select 1 from public.payment_compensations c where c.payment_id=p_payment_id)
      -- On the production contract pending/parked reversal facts cannot yet be
      -- classified as partial refund or resolved dispute. Fail closed for retry.
      -- Applied refunds/disputes are reflected in the durable purchase state;
      -- blocking all applied events would reject partial refunds and disputes won.
      and not exists (select 1 from public.provider_events e
        where e.payment_id=p_payment_id and e.status in ('pending','parked')
          and e.event_type in ('refund.processed','payment.dispute.created',
            'payment.dispute.under_review','payment.dispute.action_required','payment.dispute.lost'))
  );
$$;
revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.razorpay_entitlement_committed(text,text) to service_role;
commit;
$p0_preimage$]::text[] THEN RAISE EXCEPTION 'P0 exact predecessor ledger source drift: 20261110100000'; END IF;
 IF (SELECT statements FROM supabase_migrations.schema_migrations WHERE version='20261110120000') IS DISTINCT FROM ARRAY[$p0_preimage$-- Prevention only: no historical financial DML or entitlement reader changes.
begin;

create or replace function public.guard_razorpay_order_transition()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if old.provider <> 'razorpay' or new.status is not distinct from old.status then
    return new;
  end if;

  -- UPDATE holds the order row lock. A writer waiting behind settlement sees
  -- the committed paid version, including under READ COMMITTED rechecking.
  -- No role/admin bypass: privileged error handlers must obey this too.
  if (old.status = 'refunded' and new.status <> 'refunded')
     or (old.status = 'paid' and new.status not in ('paid', 'refunded'))
     or (new.status in ('created', 'pending', 'failed', 'cancelled') and exists (
       select 1 from public.payment_captures c
       where c.razorpay_order_id = old.razorpay_order_id
     )) then
    raise exception 'Razorpay order transition conflicts with captured or terminal state'
      using errcode = '23514';
  end if;
  -- Unpaid failures can still settle later through the existing verified,
  -- atomic service-only settlement RPC. Full refunds remain paid -> refunded.
  return new;
end;
$$;
revoke all on function public.guard_razorpay_order_transition() from public, anon, authenticated;
drop trigger if exists orders_03_razorpay_transition on public.orders;
create trigger orders_03_razorpay_transition
before update of status on public.orders
for each row execute function public.guard_razorpay_order_transition();

commit;
$p0_preimage$]::text[] THEN RAISE EXCEPTION 'P0 exact predecessor ledger source drift: 20261110120000'; END IF;
 IF (SELECT statements FROM supabase_migrations.schema_migrations WHERE version='20261110130000') IS DISTINCT FROM ARRAY[$p0_preimage$-- Prevention only. Preserve existing successes, legacy NULL keys and financial
-- history. Do not remove the historical partial-index exception here.
begin;

create or replace function public.guard_purchase_success_ownership()
returns trigger
language plpgsql volatile security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.status <> 'success' then return new; end if;

  -- Metadata writes on existing ownership (including the historical duplicate)
  -- are not a new grant. Refund/reversal transitions never enter this branch.
  if tg_op = 'UPDATE' then
    if old.status = 'success'
       and new.user_id is not distinct from old.user_id
       and new.product_id is not distinct from old.product_id then
      return new;
    end if;
  end if;

  -- Legacy purchases can lack product/user identities. Keep their established
  -- scope-based access/restoration semantics; never infer a product from scope.
  -- All current verified settlements supply both keys.
  if new.user_id is null or new.product_id is null then return new; end if;

  -- A transaction-snapshot reader could miss a grant committed while waiting
  -- for the lock. Fail closed rather than accept stale REPEATABLE READ data.
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Purchase ownership grant requires read committed isolation'
      using errcode = '40001';
  end if;

  -- Same lock namespace/order as create, settle, refund and dispute routines.
  -- This VOLATILE trigger's SELECT takes a fresh READ COMMITTED snapshot after
  -- acquiring the lock, including when another transaction just committed.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('wallet:' || new.user_id::text, 0));
  if exists (
    select 1 from public.purchases p
    where p.user_id = new.user_id and p.product_id = new.product_id
      and p.status = 'success'
      and (tg_op = 'INSERT' or p.id is distinct from old.id)
      -- Same-order insert replays cannot add a row: the unchanged unique
      -- order index enforces that even under concurrent ON CONFLICT writes.
      -- Keep this check AFTER the lock, so concurrent replays see the winner.
      and (tg_op <> 'INSERT' or new.order_id is null
           or p.order_id is distinct from new.order_id)
  ) then
    -- No silent conversion, compensation, deletion or historical repair here.
    -- The caller's complete transaction rolls back on a conflicting grant.
    raise exception 'Successful purchase ownership already exists'
      using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_purchase_success_ownership() from public, anon, authenticated;
drop trigger if exists purchases_zz_success_ownership on public.purchases;
create trigger purchases_zz_success_ownership
before insert or update on public.purchases
for each row execute function public.guard_purchase_success_ownership();

commit;
$p0_preimage$]::text[] THEN RAISE EXCEPTION 'P0 exact predecessor ledger source drift: 20261110130000'; END IF;
 IF (SELECT statements FROM supabase_migrations.schema_migrations WHERE version='20261111100000') IS DISTINCT FROM ARRAY[$p0_preimage$-- Phase C final override: MUST follow Notes choice, settlement recovery and A1/A2/A3.
-- Recovery replaces this RPC with weaker proof; restore every strong MV003
-- predicate without editing the frozen Phase A/B artifacts or financial rows.
-- Deliberately conservative for pending/parked reversals, including classified
-- partial refunds until their durable application. No capture backfill required.
begin;
create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.orders o
    join public.payments m on m.order_id=o.id
    join public.purchases p on p.order_id=o.id
    where o.id=p_order_id and p_payment_id is not null and p_payment_id<>''
      and o.provider='razorpay' and o.status='paid'
      and o.razorpay_payment_id=p_payment_id
      and o.razorpay_order_id is not null and o.razorpay_order_id<>''
      and o.user_id is not null and o.product_id is not null
      and o.amount>0 and o.course_id is not null
      and o.scope in ('chapter','subject','year','bundle')
      and case o.scope
        when 'chapter' then o.chapter_id is not null
        when 'subject' then o.subject_id is not null
        when 'year' then o.year_id is not null
        when 'bundle' then coalesce(cardinality(o.year_ids),0)>0
          and array_position(o.year_ids,null) is null
        else false end
      and m.provider='razorpay' and m.status='success'
      and m.razorpay_payment_id=p_payment_id and m.razorpay_order_id=o.razorpay_order_id
      and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
      and p.status='success' and p.user_id=o.user_id
      and p.product_id=o.product_id and p.amount=o.amount
      and p.razorpay_order_id=o.razorpay_order_id
      and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
        is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id)
      -- Absence is allowed for historical purchases. An existing capture must
      -- match exactly and must not be awaiting or have completed reversal.
      and not exists (select 1 from public.payment_captures c
        where c.payment_id=p_payment_id and (
          c.order_id is distinct from o.id or c.razorpay_order_id is distinct from o.razorpay_order_id
          or c.amount_paise is distinct from round(o.amount*100)::bigint
          or c.status not in ('captured','granted')))
      -- Even parked compensation is unresolved; no compensation state grants.
      and not exists (select 1 from public.payment_compensations c where c.payment_id=p_payment_id)
      -- On the production contract pending/parked reversal facts cannot yet be
      -- classified as partial refund or resolved dispute. Fail closed for retry.
      -- Applied refunds/disputes are reflected in the durable purchase state;
      -- blocking all applied events would reject partial refunds and disputes won.
      and not exists (select 1 from public.provider_events e
        where e.payment_id=p_payment_id and e.status in ('pending','parked')
          and e.event_type in ('refund.processed','payment.dispute.created',
            'payment.dispute.under_review','payment.dispute.action_required','payment.dispute.lost'))
  );
$$;
revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.razorpay_entitlement_committed(text,text) to service_role;
commit;
$p0_preimage$]::text[] THEN RAISE EXCEPTION 'P0 exact predecessor ledger source drift: 20261111100000'; END IF;
 IF (SELECT statements FROM supabase_migrations.schema_migrations WHERE version='20261111110000') IS DISTINCT FROM ARRAY[$p0_preimage$-- Phase C: new Play grants must use the purchased order's immutable scope,
-- even if the catalog changes before receipt verification. No historical DML.
-- Requires billing_settlement_recovery and the existing order snapshot columns.
begin;
create or replace function public.play_purchase_entitlement_from_order()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare o public.orders%rowtype;
begin
  if new.order_id is null then return new; end if;
  select * into o from public.orders where id=new.order_id;
  if not found or o.provider<>'play' then return new; end if;
  if new.user_id is distinct from o.user_id or new.product_id is distinct from o.product_id
    or new.amount is distinct from o.amount or o.course_id is null
    or o.scope not in ('chapter','subject','year','bundle') or o.scope is null
    or (o.scope='chapter' and o.chapter_id is null)
    or (o.scope='subject' and o.subject_id is null)
    or (o.scope='year' and o.year_id is null)
    or (o.scope='bundle' and (coalesce(cardinality(o.year_ids),0)=0 or array_position(o.year_ids,null) is not null)) then
    raise exception 'Play purchase does not match order entitlement';
  end if;
  new.scope:=o.scope; new.chapter_id:=o.chapter_id; new.subject_id:=o.subject_id;
  new.year_id:=o.year_id; new.year_ids:=o.year_ids; new.course_id:=o.course_id;
  return new;
end $$;
revoke all on function public.play_purchase_entitlement_from_order() from public,anon,authenticated;
drop trigger if exists purchases_play_order_snapshot on public.purchases;
create trigger purchases_play_order_snapshot before insert on public.purchases
for each row execute function public.play_purchase_entitlement_from_order();

create or replace function public.play_entitlement_committed(p_order_id text,p_token text)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.purchase_token=p_token
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and p_token is not null and p_token<>''
     and o.provider='play' and o.status='paid' and o.purchase_token=p_token
     and o.user_id is not null and o.product_id is not null and o.amount>0
     and o.play_sku is not null and o.course_id is not null
     and o.scope in ('chapter','subject','year','bundle')
     and case o.scope when 'chapter' then o.chapter_id is not null
       when 'subject' then o.subject_id is not null when 'year' then o.year_id is not null
       when 'bundle' then coalesce(cardinality(o.year_ids),0)>0 and array_position(o.year_ids,null) is null else false end
     and m.provider='play' and m.play_sku=o.play_sku and m.status='success'
     and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
     and p.status='success' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.play_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.play_entitlement_committed(text,text) to service_role;
commit;
$p0_preimage$]::text[] THEN RAISE EXCEPTION 'P0 exact predecessor ledger source drift: 20261111110000'; END IF;
END $gate$;

create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.orders o
    join public.payments m on m.order_id=o.id
    join public.purchases p on p.order_id=o.id
    where o.id=p_order_id and p_payment_id is not null and p_payment_id<>''
      and o.provider='razorpay' and o.status='paid'
      and o.razorpay_payment_id=p_payment_id
      and o.razorpay_order_id is not null and o.razorpay_order_id<>''
      and o.user_id is not null and o.product_id is not null
      and o.amount>0 and o.course_id is not null
      and o.scope in ('chapter','subject','year','bundle')
      and case o.scope
        when 'chapter' then o.chapter_id is not null
        when 'subject' then o.subject_id is not null
        when 'year' then o.year_id is not null
        when 'bundle' then coalesce(cardinality(o.year_ids),0)>0
          and array_position(o.year_ids,null) is null
        else false end
      and m.provider='razorpay' and m.status='success'
      and m.razorpay_payment_id=p_payment_id and m.razorpay_order_id=o.razorpay_order_id
      and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
      and p.status='success' and p.user_id=o.user_id
      and p.product_id=o.product_id and p.amount=o.amount
      and p.razorpay_order_id=o.razorpay_order_id
      and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
        is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id)
      -- Absence is allowed for historical purchases. An existing capture must
      -- match exactly and must not be awaiting or have completed reversal.
      and not exists (select 1 from public.payment_captures c
        where c.payment_id=p_payment_id and (
          c.order_id is distinct from o.id or c.razorpay_order_id is distinct from o.razorpay_order_id
          or c.amount_paise is distinct from round(o.amount*100)::bigint
          or c.status not in ('captured','granted')))
      -- Even parked compensation is unresolved; no compensation state grants.
      and not exists (select 1 from public.payment_compensations c where c.payment_id=p_payment_id)
      -- C recovery classifies provider facts before linking/settlement. A
      -- verified partial refund or won dispute may still await inbox application
      -- when the exact purchase transaction checks this proof. Unclassified,
      -- blocking and parked reversals continue to deny commitment.
      and not exists (select 1 from public.provider_events e
        where e.payment_id=p_payment_id and e.status in ('pending','parked')
          and (e.status='parked' or e.blocks_entitlement is distinct from false)
          and e.event_type in ('refund.processed','payment.dispute.created',
            'payment.dispute.under_review','payment.dispute.action_required','payment.dispute.lost'))
  );
$$;
revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.razorpay_entitlement_committed(text,text) to service_role;

INSERT INTO supabase_migrations.schema_migrations(version,statements,name) VALUES ('20261111120000',ARRAY[$p0_source$-- P0 forward-only candidate. Requires complete atomic C1-C4 first.
-- Preserve every exact MV003 identity/snapshot/capture/compensation predicate.
-- No financial/history DML. Only service-role provider classification can clear
-- a pending reversal hold; parked and unknown facts still fail closed.
begin;
create or replace function public.razorpay_entitlement_committed(p_order_id text,p_payment_id text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.orders o
    join public.payments m on m.order_id=o.id
    join public.purchases p on p.order_id=o.id
    where o.id=p_order_id and p_payment_id is not null and p_payment_id<>''
      and o.provider='razorpay' and o.status='paid'
      and o.razorpay_payment_id=p_payment_id
      and o.razorpay_order_id is not null and o.razorpay_order_id<>''
      and o.user_id is not null and o.product_id is not null
      and o.amount>0 and o.course_id is not null
      and o.scope in ('chapter','subject','year','bundle')
      and case o.scope
        when 'chapter' then o.chapter_id is not null
        when 'subject' then o.subject_id is not null
        when 'year' then o.year_id is not null
        when 'bundle' then coalesce(cardinality(o.year_ids),0)>0
          and array_position(o.year_ids,null) is null
        else false end
      and m.provider='razorpay' and m.status='success'
      and m.razorpay_payment_id=p_payment_id and m.razorpay_order_id=o.razorpay_order_id
      and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
      and p.status='success' and p.user_id=o.user_id
      and p.product_id=o.product_id and p.amount=o.amount
      and p.razorpay_order_id=o.razorpay_order_id
      and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
        is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id)
      -- Absence is allowed for historical purchases. An existing capture must
      -- match exactly and must not be awaiting or have completed reversal.
      and not exists (select 1 from public.payment_captures c
        where c.payment_id=p_payment_id and (
          c.order_id is distinct from o.id or c.razorpay_order_id is distinct from o.razorpay_order_id
          or c.amount_paise is distinct from round(o.amount*100)::bigint
          or c.status not in ('captured','granted')))
      -- Even parked compensation is unresolved; no compensation state grants.
      and not exists (select 1 from public.payment_compensations c where c.payment_id=p_payment_id)
      -- C recovery classifies provider facts before linking/settlement. A
      -- verified partial refund or won dispute may still await inbox application
      -- when the exact purchase transaction checks this proof. Unclassified,
      -- blocking and parked reversals continue to deny commitment.
      and not exists (select 1 from public.provider_events e
        where e.payment_id=p_payment_id and e.status in ('pending','parked')
          and (e.status='parked' or e.blocks_entitlement is distinct from false)
          and e.event_type in ('refund.processed','payment.dispute.created',
            'payment.dispute.under_review','payment.dispute.action_required','payment.dispute.lost'))
  );
$$;
revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.razorpay_entitlement_committed(text,text) to service_role;
commit;
$p0_source$],'p0_classified_reversal_commitment');
DO $post$ BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.razorpay_entitlement_committed(text,text)'::regprocedure)
 <> 'c213bcd1e3f131e1f730c96789e97296' THEN RAISE EXCEPTION 'P0 final proof mismatch'; END IF;
 IF has_function_privilege('anon','public.razorpay_entitlement_committed(text,text)','execute')
 OR has_function_privilege('authenticated','public.razorpay_entitlement_committed(text,text)','execute')
 OR NOT has_function_privilege('service_role','public.razorpay_entitlement_committed(text,text)','execute')
 THEN RAISE EXCEPTION 'P0 proof ACL mismatch'; END IF;
END $post$;
COMMIT;
