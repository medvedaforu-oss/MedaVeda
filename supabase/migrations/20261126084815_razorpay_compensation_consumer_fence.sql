-- MV-003 only. Owner applies after recovery prerequisites; no scheduler activation,
-- historical backfill, financial row rewrite, or existing RPC replacement.
begin;
set local lock_timeout='5s';
alter table public.payment_compensations
  add column if not exists worker_lease_id uuid,
  add column if not exists refund_dispatched_at timestamptz;

create or replace function public.claim_razorpay_compensation(p_after timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.payment_compensations;
begin
  if p_after is null or p_after>now() then raise exception 'Explicit activation cutoff required'; end if;
  update public.payment_compensations q set status='parked',worker_lease_id=null,lease_until=null,
    last_error='Retry limit reached; manual reconciliation required'
    where q.created_at>=p_after and q.status='processing' and q.lease_until<now() and q.attempts>=12;
  select q.* into c from public.payment_compensations q
    join public.payment_captures p on p.payment_id=q.payment_id
    where q.created_at>=p_after and p.received_at>=p_after and q.next_attempt_at<=now()
      and q.attempts<12 and (q.status='pending' or (q.status='processing' and q.lease_until<now()))
    order by q.created_at,q.payment_id for update of q skip locked limit 1;
  if not found then return null; end if;
  update public.payment_compensations set status='processing',worker_lease_id=gen_random_uuid(),
    lease_until=now()+interval '3 minutes',attempts=attempts+1
    where payment_id=c.payment_id returning * into c;
  return to_jsonb(c);
end $$;

create or replace function public.prepare_razorpay_compensation(p_payment_id text,p_lease_id uuid,p_dispatch boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.payment_captures; q public.payment_compensations; o public.orders;
begin
  -- Preserve settlement/reversal ordering: wallet parties -> order -> capture -> compensation.
  perform public.wallet_lock_order_parties((select id from public.orders where razorpay_order_id=
    (select razorpay_order_id from public.payment_captures where payment_id=p_payment_id)));
  select * into o from public.orders where razorpay_order_id=
    (select razorpay_order_id from public.payment_captures where payment_id=p_payment_id) for update;
  select * into c from public.payment_captures where payment_id=p_payment_id for update;
  select * into q from public.payment_compensations where payment_id=p_payment_id for update;
  if q.payment_id is null or q.worker_lease_id is distinct from p_lease_id or p_lease_id is null
      or q.status<>'processing' or q.lease_until<=now() or q.lease_until is null
      or c.status not in ('compensation_pending','reversed')
      or q.order_id is distinct from o.id or c.order_id is distinct from o.id
      or q.amount_paise<>c.amount_paise or (q.reason is distinct from c.failure_reason and c.status<>'reversed')
      or q.refund_request_id<>'medveda_comp_'||md5(p_payment_id)
      or q.reason not in ('unknown_order','amount_mismatch','additional_capture','account_deleted',
        'missing_entitlement_snapshot','stale_discount','discount_reused','already_owned','underpriced_order','wallet_shortfall')
      or (o.id is not null and (o.provider<>'razorpay' or o.external_transaction_token is not null
        or o.external_choice_bound_order_id is not null))
      or exists(select 1 from public.payments m where m.razorpay_payment_id=p_payment_id and m.status='success')
      or ((o.razorpay_payment_id is null or o.razorpay_payment_id=p_payment_id) and exists(select 1 from public.purchases p where p.order_id=o.id and p.status='success'))
      or exists(select 1 from public.provider_events e where e.payment_id=p_payment_id
        and e.event_type like 'payment.dispute.%') then return null; end if;
  if p_dispatch then
    if q.refund_dispatched_at is not null or q.provider_refund_id is not null or c.status<>'compensation_pending'
        or exists(select 1 from public.provider_events e where e.payment_id=p_payment_id and e.event_type='refund.processed')
      then return null; end if;
    update public.payment_compensations set refund_dispatched_at=clock_timestamp() where payment_id=p_payment_id;
  end if;
  return jsonb_build_object('payment_id',q.payment_id,'razorpay_order_id',c.razorpay_order_id,
    'amount_paise',q.amount_paise,'refund_request_id',q.refund_request_id,'provider_refund_id',q.provider_refund_id);
end $$;

create or replace function public.finish_razorpay_compensation(p_payment_id text,p_lease_id uuid,p_refund_id text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_refund_id is not null then
    if p_refund_id !~ '^rfnd_[a-zA-Z0-9]+$' or
        public.prepare_razorpay_compensation(p_payment_id,p_lease_id,false) is null then return false; end if;
    -- Existing reversal handles wallet/referral accounting and preserves an
    -- original purchase when this is an additional capture. No Google reporting.
    perform public.reverse_refunded_capture(p_payment_id);
    update public.payment_captures set status='compensated' where payment_id=p_payment_id;
    update public.payment_compensations set status='refunded',provider_refund_id=p_refund_id,
      worker_lease_id=null,lease_until=null,last_error=null where payment_id=p_payment_id;
    -- Retire only an already-existing legacy compensation job, without enqueueing other phases.
    update public.payment_jobs set status='done',lease_id=null,lease_until=null,last_error=null
      where kind='compensate' and target_id=p_payment_id;
    return true;
  end if;
  update public.payment_compensations set status=case when attempts>=12 then 'parked' else 'pending' end,
    worker_lease_id=null,lease_until=null,last_error='Compensation recovery requires retry or reconciliation',
    next_attempt_at=now()+make_interval(secs=>least(3600,60*power(2,least(attempts-1,6)))::integer)
    where payment_id=p_payment_id and worker_lease_id=p_lease_id and p_lease_id is not null and status='processing';
  return found;
end $$;
revoke all on function public.claim_razorpay_compensation(timestamptz),
  public.prepare_razorpay_compensation(text,uuid,boolean),public.finish_razorpay_compensation(text,uuid,text)
  from public,anon,authenticated;
grant execute on function public.claim_razorpay_compensation(timestamptz),
  public.prepare_razorpay_compensation(text,uuid,boolean),public.finish_razorpay_compensation(text,uuid,text) to service_role;
commit;
