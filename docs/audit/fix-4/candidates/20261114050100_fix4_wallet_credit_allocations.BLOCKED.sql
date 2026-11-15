-- Live expiry is configured (30 days). Derived allocations preserve immutable ledger rows.
-- Abort atomically if a historical debit cannot be replayed; owner reviews before rollout.
begin;
create table public.wallet_credit_terms (
 credit_id uuid primary key references public.wallet_ledger(id),
 duration interval check (duration is null or duration >= interval '0'),
 first_available_at timestamptz
);
create table public.wallet_credit_allocations (
 consumer_id uuid not null references public.wallet_ledger(id),
 credit_id uuid not null references public.wallet_ledger(id),
 amount numeric(10,2) not null check(amount > 0),
 primary key(consumer_id,credit_id)
);
create index wallet_credit_allocations_credit_idx on public.wallet_credit_allocations(credit_id);
alter table public.wallet_credit_terms enable row level security;
alter table public.wallet_credit_allocations enable row level security;
revoke all on public.wallet_credit_terms, public.wallet_credit_allocations from public,anon,authenticated;
grant select on public.wallet_credit_terms, public.wallet_credit_allocations to service_role;
insert into public.wallet_credit_terms(credit_id,duration,first_available_at)
 select id, case when expires_at is null then null else greatest(interval '0',expires_at-coalesce(available_at,created_at)) end,
 case when status='available' then coalesce(status_changed_at,available_at,created_at) end
 from public.wallet_ledger where entry_type='credit';

create function public.wallet_credit_remaining(p_user uuid, p_at timestamptz)
returns table(credit_id uuid, remaining numeric, effective_expiry timestamptz, first_available_at timestamptz)
language sql stable security definer set search_path=public as $$
 select l.id, greatest(0,l.amount-coalesce(a.used,0)), t.first_available_at+t.duration, t.first_available_at
 from public.wallet_ledger l join public.wallet_credit_terms t on t.credit_id=l.id
 left join lateral (select sum(amount) used from public.wallet_credit_allocations where credit_id=l.id) a on true
 where l.user_id=p_user and l.entry_type='credit' and l.status='available'
 and t.first_available_at<=p_at and (t.duration is null or t.first_available_at+t.duration>p_at)
$$;
revoke all on function public.wallet_credit_remaining(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.wallet_credit_remaining(uuid,timestamptz) to service_role;

create function public.allocate_wallet_entry(p_entry uuid)
returns void language plpgsql security definer set search_path=public as $$
declare e public.wallet_ledger%rowtype; c record; needed numeric; take numeric;
begin
 select * into strict e from public.wallet_ledger where id=p_entry;
 if e.user_id is null or e.status<>'available' or e.entry_type not in ('debit','reversal') then return; end if;
 perform pg_advisory_xact_lock(hashtextextended('wallet:'||e.user_id::text,0));
 select e.amount-coalesce(sum(amount),0) into needed from public.wallet_credit_allocations where consumer_id=e.id;
 if needed<=0 then return; end if;
 -- Reversals consume only the referenced credit's remaining value. Already spent
 -- or expired value must never be deducted from a later unrelated credit again.
 for c in select * from public.wallet_credit_remaining(e.user_id,e.created_at)
   where remaining>0 and (e.entry_type='debit' or credit_id=e.reverses_id)
   order by effective_expiry asc nulls last, first_available_at, credit_id
 loop
  take:=least(needed,c.remaining);
  insert into public.wallet_credit_allocations(consumer_id,credit_id,amount) values(e.id,c.credit_id,take)
   on conflict(consumer_id,credit_id) do nothing;
  needed:=needed-take;
  exit when needed<=0;
 end loop;
 if needed>0 and e.entry_type='debit' then
  raise exception 'Wallet allocation replay incomplete; review historical ledger before rollout' using errcode='23514';
 end if;
end $$;
revoke all on function public.allocate_wallet_entry(uuid) from public,anon,authenticated,service_role;
-- Replay in deterministic order without rewriting ledger history.
do $$ declare e record; begin
 for e in select id from public.wallet_ledger where entry_type in ('debit','reversal') and status='available' order by created_at,id
 loop perform public.allocate_wallet_entry(e.id); end loop;
end $$;

create function public.wallet_allocation_journal()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.user_id is not null then
  perform pg_advisory_xact_lock(hashtextextended('wallet:'||new.user_id::text,0));
 end if;
 if new.entry_type='credit' then
  if tg_op='INSERT' then
   insert into public.wallet_credit_terms(credit_id,duration,first_available_at)
    values(new.id,case when new.expires_at is null then null else greatest(interval '0',new.expires_at-coalesce(new.available_at,new.created_at)) end,
      case when new.status='available' then new.created_at end);
  elsif old.status='pending' and new.status='available' then
   update public.wallet_credit_terms set first_available_at=now() where credit_id=new.id and first_available_at is null;
  end if;
 elsif tg_op='INSERT' then perform public.allocate_wallet_entry(new.id);
 end if;
 return new;
end $$;
revoke all on function public.wallet_allocation_journal() from public,anon,authenticated,service_role;
create trigger wallet_ledger_90_allocations after insert or update of status on public.wallet_ledger
 for each row execute function public.wallet_allocation_journal();

create or replace function public.wallet_balance_of(p_user uuid)
returns table(available numeric,pending numeric,total_earned numeric,next_available_at timestamptz)
language sql stable security definer set search_path=public as $$
 select (select coalesce(sum(remaining),0)::numeric(10,2) from public.wallet_credit_remaining(p_user,now())),
 coalesce(sum(amount) filter(where entry_type='credit' and status='pending'),0)::numeric(10,2),
 coalesce(sum(amount) filter(where entry_type='credit' and status in('pending','available') and source='referral_reward'),0)::numeric(10,2),
 min(available_at) filter(where entry_type='credit' and status='pending')
 from public.wallet_ledger where user_id=p_user
$$;
revoke all on function public.wallet_balance_of(uuid) from public,anon,authenticated;
grant execute on function public.wallet_balance_of(uuid) to service_role;

create or replace function public.wallet_ledger_no_overdraw()
returns trigger language plpgsql security definer set search_path=public as $$
declare balance numeric;
begin
 if new.user_id is null or new.entry_type not in('debit','reversal') or new.status<>'available' then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('wallet:'||new.user_id::text,0));
 if new.entry_type='reversal' then
  if not exists(select 1 from public.wallet_ledger where id=new.reverses_id and entry_type='credit' and user_id=new.user_id and amount>=new.amount) then
   raise exception 'Reversal must reference the original owner credit' using errcode='23514';
  end if;
  -- A provider reversal records the nominal fact separately from money recovered.
  -- It is bound to the original credit and refunded order, and allocation below
  -- can consume only that original credit, never unrelated future credit.
  if new.source='order_refund' and exists(
    select 1 from public.wallet_ledger c join public.orders o on o.id=c.order_id
    where c.id=new.reverses_id and c.order_id=new.order_id and o.status='refunded'
  ) then return new; end if;
  select remaining into balance from public.wallet_credit_remaining(new.user_id,now()) where credit_id=new.reverses_id;
  if coalesce(balance,0)<new.amount then raise exception 'Wallet reversal would overdraw original credit' using errcode='23514'; end if;
  return new;
 end if;
 select available into balance from public.wallet_balance_of(new.user_id);
 if balance<new.amount then raise exception 'Wallet debit would overdraw available credit' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function public.wallet_ledger_no_overdraw() from public,anon,authenticated;
create or replace function public.admin_reverse_wallet_credit(p_ledger_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.wallet_ledger%rowtype;
  v_avail numeric(10, 2);
  v_amt numeric(10, 2);
begin
  if not public.am_i_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into v_row from public.wallet_ledger where id = p_ledger_id for update;
  if not found or v_row.entry_type <> 'credit' or v_row.status <> 'available' then
    raise exception 'Only an available credit can be reversed';
  end if;
  if v_row.user_id is null then
    raise exception 'This credit belongs to a deleted account';
  end if;
  if exists(select 1 from public.wallet_credit_terms where credit_id=v_row.id and duration is not null and first_available_at+duration<=now()) then
    raise exception 'This credit has already expired';
  end if;
  if exists (select 1 from public.wallet_ledger where entry_type = 'reversal' and reverses_id = v_row.id) then
    raise exception 'This credit was already reversed';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_row.user_id::text, 0));
  select remaining into v_avail from public.wallet_credit_remaining(v_row.user_id,now()) where credit_id=v_row.id;
  v_amt := least(v_row.amount, coalesce(v_avail, 0));
  if v_amt <= 0 then
    raise exception 'Nothing left to reverse: the student has already spent this credit';
  end if;

  perform set_config('app.trusted_order_write', 'true', true);
  insert into public.wallet_ledger (user_id, entry_type, status, amount, source, reverses_id, referral_id, note)
  values (v_row.user_id, 'reversal', 'available', v_amt, 'admin_adjustment', v_row.id, v_row.referral_id,
          left(coalesce(p_note, 'admin reversal')
               || case when v_amt < v_row.amount then ' (partial: ' || v_amt || ' of ' || v_row.amount || ' was still available)' else '' end, 500));
  perform set_config('app.trusted_order_write', 'false', true);
end;
$$;
revoke all on function public.admin_reverse_wallet_credit(uuid, text) from public, anon;
grant execute on function public.admin_reverse_wallet_credit(uuid, text) to authenticated;
create or replace function public.reverse_payment(
  p_razorpay_payment_id text,
  p_purchase_status text,      -- 'refunded' | 'chargeback'
  p_restore_wallet boolean     -- give the student's own wallet amount back?
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_order public.orders%rowtype;
  v_credit public.wallet_ledger%rowtype;
  v_debit public.wallet_ledger%rowtype;
  v_restored numeric(10, 2) := 0;
  v_revoked integer := 0;
  v_rows integer := 0;
  v_avail numeric(10, 2);
  v_reversed numeric(10, 2);
  v_status jsonb;
begin
  if p_purchase_status not in ('refunded', 'chargeback') then
    raise exception 'reverse_payment: bad purchase status %', p_purchase_status;
  end if;

  -- Same lock order as settle_razorpay_payment (wallet lock, THEN the order row)
  -- so a refund cannot deadlock with a replayed capture event.
  select user_id into v_uid from public.orders where razorpay_payment_id = p_razorpay_payment_id;
  if v_uid is not null then
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_uid::text, 0));
  end if;

  select * into v_order from public.orders where razorpay_payment_id = p_razorpay_payment_id for update;
  if not found then return jsonb_build_object('status', 'unknown_payment'); end if;

  -- ---- Take the access back ----------------------------------------------
  update public.orders set status = 'refunded', updated_at = now()
   where id = v_order.id and status = 'paid';

  update public.purchases set status = p_purchase_status
   where order_id = v_order.id and status not in ('refunded', 'chargeback');
  get diagnostics v_revoked = row_count;

  -- ---- Give the wallet amount this order used back to the student ---------
  if p_restore_wallet then
    select * into v_debit from public.wallet_ledger
     where order_id = v_order.id and entry_type = 'debit' and source = 'order_payment';
    if found and v_debit.user_id is not null then
      perform set_config('app.trusted_order_write', 'true', true);
      insert into public.wallet_ledger (user_id, entry_type, status, amount, source, order_id, note)
      values (v_debit.user_id, 'credit', 'available', v_debit.amount, 'order_refund', v_order.id,
              'Wallet amount restored after refund')
      on conflict (order_id) where entry_type = 'credit' and source = 'order_refund' do nothing;
      get diagnostics v_rows = row_count;   -- 1 on first insert, 0 on replay
      perform set_config('app.trusted_order_write', 'false', true);
      v_restored := case when v_rows > 0 then v_debit.amount else 0 end;
    end if;
  end if;

  -- ---- The referrer's credit for this friend's purchase --------------------
  -- Looked up by the ledger row's own order_id, NOT through referrals: the
  -- referrals row is deleted when the friend deletes their account.
  select * into v_credit from public.wallet_ledger
   where order_id = v_order.id and entry_type = 'credit' and source = 'referral_reward'
   for update;

  if not found then
    v_status := jsonb_build_object('status', 'no_referral_credit');

  elsif v_credit.status = 'cancelled' then
    v_status := jsonb_build_object('status', 'already_cancelled');

  elsif v_credit.status = 'pending' then
    -- Still held (even if the hold has technically run out but the release job
    -- has not run yet): cancel it.
    perform set_config('app.trusted_order_write', 'true', true);
    update public.wallet_ledger set status = 'cancelled' where id = v_credit.id;
    perform set_config('app.trusted_order_write', 'false', true);
    update public.referrals
       set status = 'rejected', reject_reason = 'friend_payment_reversed'
     where id = v_credit.referral_id and status <> 'rejected';
    v_status := jsonb_build_object('status', 'credit_cancelled', 'amount', v_credit.amount);

  elsif exists (select 1 from public.wallet_ledger
                 where entry_type = 'reversal' and reverses_id = v_credit.id) then
    v_status := jsonb_build_object('status', 'already_reversed', 'ledger_id', v_credit.id);

  elsif v_credit.user_id is null then
    v_status := jsonb_build_object('status', 'referrer_gone', 'ledger_id', v_credit.id);

  elsif exists(select 1 from public.wallet_credit_terms where credit_id=v_credit.id and duration is not null and first_available_at+duration<=now()) then
    v_status := jsonb_build_object('status', 'credit_expired', 'ledger_id', v_credit.id);

  else
    -- Released ('available'): reverse it with a ledger row, but never by more
    -- than the referrer still has (the ledger refuses to overdraw). What cannot
    -- be recovered is flagged for a manual decision.
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_credit.user_id::text, 0));
    select remaining into v_avail from public.wallet_credit_remaining(v_credit.user_id,now()) where credit_id=v_credit.id;
    v_reversed := least(v_credit.amount, coalesce(v_avail, 0));
    if v_credit.amount > 0 then
      perform set_config('app.trusted_order_write', 'true', true);
      insert into public.wallet_ledger (user_id, entry_type, status, amount, source, reverses_id, referral_id, order_id, note)
      values (v_credit.user_id, 'reversal', 'available', v_credit.amount, 'order_refund', v_credit.id, v_credit.referral_id, v_order.id,
              'Provider reversal fact; original-credit allocations record recovered value')
      on conflict (reverses_id) where entry_type = 'reversal' do nothing;
      perform set_config('app.trusted_order_write', 'false', true);
    end if;
    update public.referrals
       set status = 'rejected', reject_reason = 'friend_payment_reversed'
     where id = v_credit.referral_id and status <> 'rejected';
    if v_reversed < v_credit.amount then
      insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
      values (v_order.id, v_credit.user_id, 'referral_credit_unrecovered', 0, 0,
              jsonb_build_object(
                'credit_ledger_id', v_credit.id,
                'credit_amount', v_credit.amount,
                'reversed', v_reversed,
                'unrecovered', v_credit.amount - v_reversed,
                'razorpay_payment_id', p_razorpay_payment_id,
                'recommended_action',
                  'The friend''s payment was reversed but the referrer had already spent part of the credit. '
                  || 'Only what was still in their wallet was taken back; decide whether to recover the rest.'))
      on conflict (order_id, reason) where order_id is not null do nothing;
    end if;
    v_status := jsonb_build_object('status', 'credit_reversed', 'ledger_id', v_credit.id,
                                   'amount', v_credit.amount, 'reversed', v_reversed);
  end if;

  return v_status || jsonb_build_object('wallet_restored', v_restored, 'purchases_revoked', v_revoked);
end;
$$;

revoke all on function public.reverse_payment(text, text, boolean) from public, anon, authenticated;
grant execute on function public.reverse_payment(text, text, boolean) to service_role;

commit;
