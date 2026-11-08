-- Forward-only payment correctness fix. No historical purchases are rewritten.
-- Existing order fields already contain the authorized entitlement snapshot.
begin;

create function public.orders_entitlement_immutable()
returns trigger language plpgsql set search_path=public as $$
begin
  if row(new.scope,new.chapter_id,new.subject_id,new.year_id,new.year_ids,new.course_id)
     is distinct from row(old.scope,old.chapter_id,old.subject_id,old.year_id,old.year_ids,old.course_id) then
    raise exception 'orders entitlement snapshot is immutable' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function public.orders_entitlement_immutable() from public,anon,authenticated;
create trigger orders_02_entitlement_immutable before update on public.orders
  for each row execute function public.orders_entitlement_immutable();

-- Catalog/course validation belongs to order creation. Revalidating it on an
-- update rejects legitimate delayed captures after a product moves course.
create or replace function public.orders_derive_course()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_course_id text;
begin
  if auth.uid() is not null and new.status='paid'
     and (tg_op='INSERT' or old.status is distinct from 'paid')
     and not public.am_i_admin() then
    raise exception 'Orders can only be marked paid by the payment system';
  end if;
  if tg_op='UPDATE' then return new; end if;
  select course_id into v_course_id from public.products where id=new.product_id;
  if v_course_id is null then raise exception 'Unknown product_id % on orders',new.product_id; end if;
  if new.course_id is null then new.course_id:=v_course_id;
  elsif new.course_id is distinct from v_course_id then
    raise exception 'orders.course_id (%) does not match product course (%)',new.course_id,v_course_id;
  end if;
  return new;
end $$;

-- Defense in depth for every service-side Razorpay purchase insertion.
create function public.razorpay_purchase_entitlement_from_order()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;
begin
  if new.order_id is null then return new; end if;
  select * into v_order from public.orders where id=new.order_id;
  if not found or v_order.provider<>'razorpay' then return new; end if;
  if new.user_id is distinct from v_order.user_id
     or new.product_id is distinct from v_order.product_id
     or new.amount is distinct from v_order.amount
     or v_order.scope is null or v_order.scope not in ('chapter','subject','year','bundle') then
    raise exception 'Razorpay purchase does not match order entitlement';
  end if;
  new.scope:=v_order.scope;
  new.chapter_id:=v_order.chapter_id;
  new.subject_id:=v_order.subject_id;
  new.year_id:=v_order.year_id;
  new.year_ids:=v_order.year_ids;
  new.course_id:=v_order.course_id;
  return new;
end $$;
revoke all on function public.razorpay_purchase_entitlement_from_order() from public,anon,authenticated;
create trigger purchases_razorpay_order_snapshot before insert on public.purchases
  for each row execute function public.razorpay_purchase_entitlement_from_order();

-- Creation already serializes by user and cancels older unpaid checkouts.
-- Atomically transfer an abandoned reservation instead of consuming the offer.
-- Settled referral/purchase markers remain permanent, including after refunds.
create or replace function public.orders_reserve_first_discount()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.referral_discount>0 and new.referral_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || new.user_id::text,0));
    insert into public.first_discount_reservations(user_id,referral_id,order_id)
    values(new.user_id,new.referral_id,new.id)
    on conflict(user_id) do update set referral_id=excluded.referral_id,
      order_id=excluded.order_id,created_at=now()
    where exists(select 1 from public.orders o
      where o.id=first_discount_reservations.order_id
        and (o.status in ('failed','cancelled') or o.expires_at<=now()
          or (o.status='paid' and exists(select 1 from public.payment_captures c
            where c.order_id=o.id and c.status in ('compensation_pending','compensated','reversed')))))
      and not exists(select 1 from public.purchases p
        where p.user_id=new.user_id and p.status='success')
      and not exists(select 1 from public.referrals r where r.referred_id=new.user_id
        and (r.discount_order_id is not null or r.first_order_id is not null));
    if not exists(select 1 from public.first_discount_reservations
      where user_id=new.user_id and order_id=new.id) then
      new.amount:=new.amount+new.referral_discount;
      new.referral_discount:=0;
      new.referral_id:=null;
    end if;
  end if;
  return new;
end $$;

-- A quote describes the replacement checkout, which cancels any prior unpaid
-- attempt. Eligibility is still derived from purchases, identity and referral.
create or replace function public.quote_my_order(p_product_id text,p_use_wallet boolean default false)
returns jsonb language sql security definer set search_path=public as $$
  select public.quote_my_order_legacy(p_product_id,p_use_wallet);
$$;
revoke all on function public.quote_my_order(text,boolean) from public,anon;
grant execute on function public.quote_my_order(text,boolean) to authenticated,service_role;

-- Reissue the retained internal implementation with entitlement fields read
-- from v_order rather than v_product. Pricing/accounting body is preserved.
create or replace function public.settle_razorpay_payment_legacy(
  p_event_id text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount_paise bigint,
  p_paid_at timestamptz default null   -- when the customer started the payment (Razorpay payment.created_at)
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_existing_payment_order_id text;
  v_set public.referral_settings%rowtype;
  v_ref public.referrals%rowtype;
  v_balance numeric(10, 2);
  v_debit numeric(10, 2) := 0;
  v_stale boolean;
  v_first boolean;                 -- first settlement of this order (not a replay)
  v_debited boolean := false;
  v_discount_owner text;
  v_discount_dup boolean := false;
  v_owned_purchase text;           -- an existing successful purchase of the same product
  v_base jsonb;
  v_other_reserved numeric(10,2);
begin
  if p_event_id is null or p_razorpay_order_id is null or p_razorpay_payment_id is null
    or p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'invalid Razorpay settlement parameters';
  end if;

  select user_id into v_uid from public.orders where razorpay_order_id = p_razorpay_order_id;
  if v_uid is not null then
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_uid::text, 0));
  end if;

  -- Row lock serialises a webhook retry with the client verification path.
  select * into v_order
  from public.orders
  where razorpay_order_id = p_razorpay_order_id
  for update;

  if not found then
    raise exception 'Razorpay order % is not linked to an internal order', p_razorpay_order_id;
  end if;
  if round(v_order.amount * 100)::bigint <> p_amount_paise then
    raise exception 'Razorpay amount does not match order amount';
  end if;

  select order_id into v_existing_payment_order_id
  from public.payments
  where razorpay_payment_id = p_razorpay_payment_id;
  if found and v_existing_payment_order_id <> v_order.id then
    raise exception 'Razorpay payment is already linked to another order';
  end if;

  -- Account deleted while the payment was in flight: keep the accounting row,
  -- grant nothing, debit nothing, reward nothing (refund manually).
  if v_order.user_id is null then
    insert into public.payments (
      order_id, user_id, product_id, amount, razorpay_order_id,
      razorpay_payment_id, status, verified_at
    ) values (
      v_order.id, null, v_order.product_id, v_order.amount,
      p_razorpay_order_id, p_razorpay_payment_id, 'success', now()
    ) on conflict (razorpay_payment_id) do nothing;

    update public.orders
    set status = 'paid', razorpay_payment_id = p_razorpay_payment_id, updated_at = now(),
        payment_completed_at = case when external_transaction_token is not null
          then coalesce(payment_completed_at, clock_timestamp()) else payment_completed_at end
    where id = v_order.id and status <> 'refunded';

    insert into public.razorpay_webhook_events(event_id, razorpay_payment_id, event_type)
    values (p_event_id, p_razorpay_payment_id, 'payment.captured')
    on conflict (event_id) do nothing;

    raise warning 'grant_razorpay_payment: payment % for order % arrived after the account was deleted; no access granted - refund manually', p_razorpay_payment_id, v_order.id;
    return;
  end if;

  select * into v_product from public.products where id = v_order.product_id;
  if not found then
    raise exception 'Order % references unknown product %', v_order.id, v_order.product_id;
  end if;

  v_first := v_order.status not in ('paid', 'refunded');

  -- A cancelled/expired checkout may have released its reservation. Never
  -- grant a captured payment unless the whole wallet discount can be debited.
  if v_first and v_order.wallet_amount > 0 then
    perform public.release_due_wallet_credits(v_order.user_id);
    select available into v_balance from public.wallet_balance_of(v_order.user_id);
    select coalesce(sum(r.amount),0) into v_other_reserved
      from public.wallet_order_reservations r join public.orders o on o.id=r.order_id
      where r.user_id=v_order.user_id and r.order_id<>v_order.id
        and o.status='created' and r.expires_at>now();
    if coalesce(v_balance,0)-v_other_reserved < v_order.wallet_amount then
      raise exception 'wallet shortfall: captured payment requires manual refund or compensation';
    end if;
  end if;

  -- ---- Friend discount is usable ONCE per referral -------------------------
  -- The first discounted order to settle claims referrals.discount_order_id; any
  -- other discounted order is a second use of the same discount. Serialised per
  -- user by the wallet advisory lock above; replays of the winner see their own
  -- id and pass. A second use is still granted (the customer paid what checkout
  -- charged) but gets no referrer credit, and is flagged below.
  if v_order.referral_discount > 0 and v_order.referral_id is not null then
    update public.referrals set discount_order_id = v_order.id
     where id = v_order.referral_id and discount_order_id is null;
    select discount_order_id into v_discount_owner from public.referrals where id = v_order.referral_id;
    v_discount_dup := found and v_discount_owner is not null and v_discount_owner <> v_order.id;
  end if;

  insert into public.payments (
    order_id, user_id, product_id, amount, razorpay_order_id,
    razorpay_payment_id, status, verified_at
  ) values (
    v_order.id, v_order.user_id, v_order.product_id, v_order.amount,
    p_razorpay_order_id, p_razorpay_payment_id, 'success', now()
  ) on conflict (razorpay_payment_id) do nothing;

  -- ---- Already owns this product? -----------------------------------------
  select id into v_owned_purchase from public.purchases
   where user_id = v_order.user_id and product_id = v_product.id
     and status = 'success' and order_id is distinct from v_order.id
   limit 1;

  insert into public.purchases (
    user_id, order_id, product_id, product_title, scope, chapter_id,
    subject_id, year_id, year_ids, course_id, amount, status, razorpay_order_id
  ) values (
    v_order.user_id, v_order.id, v_product.id, coalesce(v_product.title, 'Your content'),
    v_order.scope, v_order.chapter_id, v_order.subject_id, v_order.year_id,
    v_order.year_ids, v_order.course_id, v_order.amount,
    case when v_owned_purchase is null then 'success' else 'duplicate' end,
    p_razorpay_order_id
  ) on conflict (order_id) do nothing;

  update public.orders
  set status = 'paid', razorpay_payment_id = p_razorpay_payment_id,
      course_id = v_order.course_id, updated_at = now(),
      payment_completed_at = case when external_transaction_token is not null
        then coalesce(payment_completed_at, clock_timestamp()) else payment_completed_at end
  where id = v_order.id and status <> 'refunded';

  -- Remember who bought (hashed email / phone) so a deleted-and-recreated account is not
  -- treated as a first-time buyer. Never removed on refund or account deletion.
  if v_owned_purchase is null then
    perform public.record_purchase_identity(v_order.user_id);
  end if;

  -- ---- Stale order? -------------------------------------------------------
  -- v_order is the row as it was BEFORE this settlement flipped it to 'paid'.
  -- Replays see 'paid' and rely on the flag written the first time.
  v_stale := exists (select 1 from public.order_review_flags
                      where order_id = v_order.id and reason = 'stale_order_paid')
          or v_order.status in ('cancelled', 'failed')
          or (v_order.status = 'created' and v_order.expires_at is not null
              and coalesce(p_paid_at, now()) > v_order.expires_at);

  -- ---- Wallet debit: ALWAYS, on the first settlement, clamped ---------------
  if v_first and v_order.wallet_amount > 0
     and not exists (select 1 from public.wallet_ledger
                      where order_id = v_order.id and entry_type = 'debit' and source = 'order_payment') then
    perform public.release_due_wallet_credits(v_order.user_id);
    select available into v_balance from public.wallet_balance_of(v_order.user_id);
    v_debit := v_order.wallet_amount;
    if v_debit > 0 then
      insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
      values (v_order.user_id, 'debit', 'available', v_debit, 'order_payment', v_order.id, 'Wallet used at checkout')
      on conflict (order_id) where entry_type = 'debit' and source = 'order_payment' do nothing;
      v_debited := true;
    end if;
  end if;

  -- ---- Review flags (one per order and reason; replays add nothing) ---------
  v_base := jsonb_build_object(
    'product_id', v_product.id,
    'product_title', v_product.title,
    'amount_paid', v_order.amount,
    'list_price', v_order.list_price,
    'razorpay_order_id', p_razorpay_order_id,
    'razorpay_payment_id', p_razorpay_payment_id);

  if v_first and v_order.wallet_amount > 0 and v_debit < v_order.wallet_amount then
    insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
    values (v_order.id, v_order.user_id, 'wallet_shortfall', v_order.wallet_amount, v_order.referral_discount,
            v_base || jsonb_build_object(
              'wallet_amount_applied', v_order.wallet_amount,
              'wallet_debited', v_debit,
              'shortfall', v_order.wallet_amount - v_debit,
              'access_granted', true,
              'recommended_action',
                format('Checkout applied Rs %s of wallet balance but only Rs %s was still available, so Rs %s of the discount was not paid for. Access was granted. Decide whether to accept it or refund payment %s in Razorpay (a full refund revokes the access).',
                       v_order.wallet_amount, v_debit, v_order.wallet_amount - v_debit, p_razorpay_payment_id)))
    on conflict (order_id, reason) where order_id is not null do nothing;
    raise warning 'settle_razorpay_payment: order % wanted % wallet credit but only % was available',
      v_order.id, v_order.wallet_amount, v_debit;
  end if;

  if v_stale and (v_order.wallet_amount > 0 or v_order.referral_discount > 0) then
    insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
    values (v_order.id, v_order.user_id, 'stale_order_paid', v_order.wallet_amount, v_order.referral_discount,
            v_base || jsonb_build_object(
              'order_status', v_order.status, 'expires_at', v_order.expires_at, 'paid_at', p_paid_at,
              'wallet_debited', (select coalesce(sum(amount), 0) from public.wallet_ledger
                                  where order_id = v_order.id and entry_type = 'debit' and source = 'order_payment'),
              'access_granted', true,
              'recommended_action',
                'This payment arrived for a checkout that was already cancelled or had expired. Access was granted and the wallet amount was debited as normal. No action needed unless the amount looks wrong.'))
    on conflict (order_id, reason) where order_id is not null do nothing;
    raise warning 'settle_razorpay_payment: order % was % / expired when payment % arrived; flagged for review',
      v_order.id, v_order.status, p_razorpay_payment_id;
  end if;

  if v_discount_dup then
    insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
    values (v_order.id, v_order.user_id, 'discount_reused', v_order.wallet_amount, v_order.referral_discount,
            v_base || jsonb_build_object(
              'discount_first_order_id', v_discount_owner,
              'discount_not_owed', v_order.referral_discount,
              'order_status', v_order.status,
              'access_granted', true,
              'referrer_credited', false,
              'recommended_action',
                format('Access was granted. This student already used their one friend discount on order %s, so this order was under-charged by Rs %s (paid Rs %s instead of Rs %s). To reverse it, issue a FULL refund of payment %s in the Razorpay dashboard: the refund webhook then revokes the access and gives back any wallet amount used, and the student can buy again at full price. Do nothing to keep the sale as it is.',
                       v_discount_owner, v_order.referral_discount, v_order.amount,
                       v_order.amount + v_order.referral_discount, p_razorpay_payment_id)))
    on conflict (order_id, reason) where order_id is not null do nothing;
    raise warning 'settle_razorpay_payment: order % reuses the friend discount already used by order %; access granted, no referrer credit, flagged for review',
      v_order.id, v_discount_owner;
  end if;

  if v_owned_purchase is not null then
    insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
    values (v_order.id, v_order.user_id, 'duplicate_purchase', v_order.wallet_amount, v_order.referral_discount,
            v_base || jsonb_build_object(
              'existing_purchase_id', v_owned_purchase,
              'access_granted', false,
              'recommended_action',
                format('The student already owned "%s" and paid for it again (Rs %s). The new purchase is stored as ''duplicate'' and adds no access. Refund payment %s in the Razorpay dashboard.',
                       v_product.title, v_order.amount, p_razorpay_payment_id)))
    on conflict (order_id, reason) where order_id is not null do nothing;
    raise warning 'settle_razorpay_payment: order % is a duplicate purchase of product %; flagged for refund', v_order.id, v_product.id;
  end if;

  -- ---- Referrer credit ----------------------------------------------------
  -- Only the friend's FIRST successful purchase counts, and only once.
  select * into v_ref from public.referrals where referred_id = v_order.user_id for update;
  if found and not v_discount_dup and v_ref.first_order_id is null and v_ref.status in ('pending', 'qualified')
     and v_owned_purchase is null
     and not exists (select 1 from public.purchases
                      where user_id = v_order.user_id and order_id <> v_order.id and status = 'success') then
    select * into v_set from public.referral_settings where id = true;

    -- Batch 3 / F5: no credit unless BOTH sides have a verified mobile number at the
    -- moment of the purchase (a number changed after applying the code loses its
    -- verification). The referral is consumed: this was the friend's first purchase.
    if v_set.require_verified_phone
       and not (coalesce((select mobile_verified from public.profiles where id = v_order.user_id), false)
            and coalesce((select mobile_verified from public.profiles where id = v_ref.referrer_id), false)) then
      update public.referrals
         set first_order_id = v_order.id, status = 'rejected', reject_reason = 'phone_not_verified_at_purchase'
       where id = v_ref.id;
      raise warning 'settle_razorpay_payment: no referrer credit for order %: a mobile number was not verified', v_order.id;
      v_ref.status := 'rejected';
    elsif public.has_prior_purchase_identity(v_order.user_id) then
      -- Same email / phone already bought under another (maybe deleted) account.
      update public.referrals
         set first_order_id = v_order.id, status = 'rejected', reject_reason = 'returning_customer'
       where id = v_ref.id;
      raise warning 'settle_razorpay_payment: no referrer credit for order %: the buyer is a returning customer', v_order.id;
      v_ref.status := 'rejected';
    else
      update public.referrals
         set first_order_id = v_order.id, status = 'qualified', qualified_at = coalesce(qualified_at, now())
       where id = v_ref.id;
    end if;

    if v_ref.status <> 'rejected' and v_set.enabled and v_set.referrer_credit_amount > 0
       and exists (select 1 from public.profiles where id = v_ref.referrer_id and not blocked) then
      insert into public.wallet_ledger (
        user_id, entry_type, status, amount, source, referral_id, order_id,
        available_at, expires_at, note
      ) values (
        v_ref.referrer_id, 'credit', 'pending', v_set.referrer_credit_amount::numeric(10, 2),
        'referral_reward', v_ref.id, v_order.id,
        now() + make_interval(days => v_set.credit_hold_days),
        case when v_set.credit_expiry_days is null then null
             else now() + make_interval(days => v_set.credit_hold_days + v_set.credit_expiry_days) end,
        'Friend''s first purchase'
      ) on conflict (referral_id) where entry_type = 'credit' and source = 'referral_reward' do nothing;
    end if;
  end if;

  insert into public.razorpay_webhook_events(event_id, razorpay_payment_id, event_type)
  values (p_event_id, p_razorpay_payment_id, 'payment.captured')
  on conflict (event_id) do nothing;
end;
$$;


revoke all on function public.settle_razorpay_payment_legacy(text,text,text,bigint,timestamptz) from public,anon,authenticated,service_role;

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
  if v_capture.status in ('compensation_pending','compensated') then return; end if;
  select v_order.status='refunded' or v_capture.status='reversed' or exists(select 1 from public.provider_events where payment_id=p_razorpay_payment_id
    and event_type in ('refund.processed','payment.dispute.created','payment.dispute.under_review',
      'payment.dispute.action_required','payment.dispute.lost') and status in ('pending','applied')) into v_reversal;
  -- A successful capture replay must not become stale merely because time passed.
  -- Reversals still take precedence and never restore access.
  if v_capture.status='granted' and v_order.status='paid' and not v_reversal then
    update public.provider_events set status='applied'
      where event_id=p_event_id and event_type='payment.captured';
    return;
  end if;
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


commit;
