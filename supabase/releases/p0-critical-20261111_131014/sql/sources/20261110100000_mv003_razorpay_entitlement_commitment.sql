-- MV003: additive proof for the production void settlement contract.
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
