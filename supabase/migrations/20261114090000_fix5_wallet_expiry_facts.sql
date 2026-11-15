-- Fix 5: expiry is an append-only monetary fact, never a time filter on balance.
-- New migration only. No existing wallet ledger row is rewritten.
begin;

do $$ begin
 if exists(select 1 from public.referral_settings where credit_expiry_days is not null and credit_expiry_days not between 1 and 36500) then
  raise exception 'credit_expiry_days must be NULL (no expiry) or 1..36500 days; review existing settings before applying Fix 5';
 end if;
end $$;
alter table public.referral_settings add constraint referral_settings_expiry_duration_safe
 -- The existing other_ranges CHECK owns the >0 diagnostic (unchanged K4).
 check(credit_expiry_days is null or credit_expiry_days<=36500);

alter table public.wallet_ledger drop constraint wallet_ledger_entry_type_check;
alter table public.wallet_ledger add constraint wallet_ledger_entry_type_check
 check(entry_type in ('credit','debit','reversal','expiry'));
alter table public.wallet_ledger add column expiry_credit_id uuid references public.wallet_ledger(id);
create unique index wallet_ledger_one_expiry_per_credit on public.wallet_ledger(expiry_credit_id)
 where entry_type='expiry';
create index wallet_ledger_expiry_credit_idx on public.wallet_ledger(expiry_credit_id);
alter table public.wallet_ledger add constraint wallet_expiry_target_check
 check((entry_type='expiry' and expiry_credit_id is not null and status='available')
    or (entry_type<>'expiry' and expiry_credit_id is null));

create table public.wallet_credit_policy (
 credit_id uuid primary key references public.wallet_ledger(id),
 legacy boolean not null,
 duration interval check(duration is null or duration>=interval '0'),
 first_available_at timestamptz,
 effective_expires_at timestamptz
);
create table public.wallet_credit_consumption (
 entry_id uuid not null references public.wallet_ledger(id),
 credit_id uuid not null references public.wallet_ledger(id),
 amount numeric(10,2) not null check(amount>0),
 primary key(entry_id,credit_id),
 check(entry_id<>credit_id)
);
create index wallet_credit_consumption_credit_idx on public.wallet_credit_consumption(credit_id);
alter table public.wallet_credit_policy enable row level security;
alter table public.wallet_credit_consumption enable row level security;
revoke all on public.wallet_credit_policy,public.wallet_credit_consumption from public,anon,authenticated,service_role;
grant select,insert on public.wallet_credit_policy,public.wallet_credit_consumption to service_role;

create function public.wallet_credit_remainder(p_credit uuid)
returns numeric language sql stable security definer set search_path=public as $$
 select greatest(0,c.amount-coalesce((select sum(a.amount) from public.wallet_credit_consumption a where a.credit_id=c.id),0))
 from public.wallet_ledger c where c.id=p_credit and c.entry_type='credit'
$$;
revoke all on function public.wallet_credit_remainder(uuid) from public,anon,authenticated;
grant execute on function public.wallet_credit_remainder(uuid) to service_role;

-- Restricted metadata compatibility for the unchanged Fix 4 observer probes.
create view public.wallet_credit_terms with (security_invoker=true) as
 select credit_id,duration,first_available_at from public.wallet_credit_policy;
revoke all on public.wallet_credit_terms from public,anon,authenticated;
grant select on public.wallet_credit_terms to service_role;

-- Existing provider clawback policy (phase2 F8): an unexpired released reward
-- can be recovered from other available money. Source text alone is insufficient.
create function public.wallet_provider_clawback_allowed(p_user uuid,p_order text,p_original uuid,p_source text)
returns boolean language sql stable security definer set search_path=public as $$
 select p_source='order_refund' and exists(
  select 1 from public.wallet_ledger c
  join public.wallet_credit_policy p on p.credit_id=c.id
  join public.orders o on o.id=c.order_id
  where c.id=p_original and c.user_id=p_user and c.order_id=p_order
   and c.entry_type='credit' and c.source='referral_reward' and c.status='available'
   and o.status='refunded' and (p.effective_expires_at is null or p.effective_expires_at>now())
   and not exists(select 1 from public.referrals r where r.id=c.referral_id and r.status='rejected'))
$$;
revoke all on function public.wallet_provider_clawback_allowed(uuid,text,uuid,text) from public,anon,authenticated,service_role;

create function public.wallet_provider_recovery_limit(p_credit uuid)
returns numeric language plpgsql security definer set search_path=public as $$
declare c public.wallet_ledger%rowtype; bal numeric;
begin
 select * into strict c from public.wallet_ledger where id=p_credit;
 perform public.expire_due_wallet_credits(c.user_id);
 if public.wallet_provider_clawback_allowed(c.user_id,c.order_id,c.id,'order_refund') then
  select available into bal from public.wallet_balance_of(c.user_id);
  return least(c.amount,bal);
 end if;
 return public.wallet_credit_remainder(c.id);
end $$;
revoke all on function public.wallet_provider_recovery_limit(uuid) from public,anon,authenticated,service_role;

-- Capacity and ownership checks are enforced even on internal writes.
create function public.wallet_consumption_guard()
returns trigger language plpgsql security definer set search_path=public as $$
declare e public.wallet_ledger%rowtype; c public.wallet_ledger%rowtype; used numeric;
begin
 if tg_op<>'INSERT' then raise exception 'wallet consumption is append-only' using errcode='42501'; end if;
 select * into strict e from public.wallet_ledger where id=new.entry_id;
 select * into strict c from public.wallet_ledger where id=new.credit_id;
 if e.user_id is distinct from c.user_id or c.entry_type<>'credit' or c.status<>'available'
   or e.status<>'available' or e.entry_type not in('debit','reversal','expiry') then
  raise exception 'invalid wallet consumption owner or type' using errcode='23514';
 end if;
 if e.user_id is not null then perform pg_advisory_xact_lock(hashtextextended('wallet:'||e.user_id::text,0)); end if;
 if e.entry_type='expiry' and e.expiry_credit_id<>c.id then
  raise exception 'expiry must consume only its own credit' using errcode='23514';
 end if;
 if public.wallet_credit_remainder(c.id)<new.amount then
  raise exception 'credit consumption exceeds original credit' using errcode='23514';
 end if;
 select coalesce(sum(amount),0) into used from public.wallet_credit_consumption where entry_id=e.id;
 if used+new.amount>e.amount then raise exception 'consumption exceeds ledger entry' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function public.wallet_consumption_guard() from public,anon,authenticated,service_role;
create trigger wallet_consumption_guard before insert or update or delete on public.wallet_credit_consumption
 for each row execute function public.wallet_consumption_guard();
create trigger wallet_consumption_no_truncate before truncate on public.wallet_credit_consumption
 for each statement execute function public.wallet_ledger_no_truncate();

insert into public.wallet_credit_policy(credit_id,legacy,duration,first_available_at,effective_expires_at)
 select id,true,case when expires_at is null then null else greatest(interval '0',expires_at-coalesce(available_at,created_at)) end,
 case when status='available' then coalesce(status_changed_at,available_at,created_at) end,expires_at
 from public.wallet_ledger where entry_type='credit';

-- This allocator records MONEY, not nominal reversal facts. It never changes balance.
create function public.wallet_journal_entry(p_entry uuid,p_legacy_replay boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare e public.wallet_ledger%rowtype; c record; needed numeric; take numeric;
begin
 select * into strict e from public.wallet_ledger where id=p_entry;
 if e.user_id is null or e.status<>'available' or e.entry_type='credit' then return; end if;
 perform pg_advisory_xact_lock(hashtextextended('wallet:'||e.user_id::text,0));
 select e.amount-coalesce(sum(amount),0) into needed from public.wallet_credit_consumption where entry_id=e.id;
 if needed=0 then return; end if;
 for c in
  select l.id,public.wallet_credit_remainder(l.id) remaining
  from public.wallet_ledger l join public.wallet_credit_policy p on p.credit_id=l.id
  where l.user_id=e.user_id and l.entry_type='credit' and l.status='available'
   -- New entries consume the committed lots present at insertion, even when
   -- their transaction began before a concurrent deposit. Only replay uses event timestamps.
   and (not p_legacy_replay or l.created_at<=e.created_at)
   and (e.entry_type<>'expiry' or l.id=e.expiry_credit_id)
   and (e.entry_type<>'reversal' or p_legacy_replay or l.id=e.reverses_id
    or public.wallet_provider_clawback_allowed(e.user_id,e.order_id,e.reverses_id,e.source))
   and (e.entry_type='expiry' or p.effective_expires_at is null or p.effective_expires_at>e.created_at)
  order by case when e.entry_type='reversal' and l.id=e.reverses_id then 0 else 1 end,
   p.effective_expires_at asc nulls last,l.created_at,l.id
 loop
  take:=least(needed,c.remaining);
  if take>0 then
   insert into public.wallet_credit_consumption(entry_id,credit_id,amount) values(e.id,c.id,take);
   needed:=needed-take;
  end if;
  exit when needed=0;
 end loop;
 if needed<>0 then raise exception 'wallet journal incomplete for entry %, unallocated %',e.id,needed using errcode='23514'; end if;
end $$;
revoke all on function public.wallet_journal_entry(uuid,boolean) from public,anon,authenticated,service_role;

do $$ declare e record; begin
 for e in select id from public.wallet_ledger where user_id is not null and status='available' and entry_type in('debit','reversal') order by created_at,id
 loop perform public.wallet_journal_entry(e.id,true); end loop;
end $$;

create function public.wallet_policy_guard()
returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='INSERT' then
  if new.legacy or not exists(select 1 from public.wallet_ledger where id=new.credit_id and entry_type='credit') then
   raise exception 'invalid wallet policy snapshot' using errcode='23514';
  end if;
  return new;
 end if;
 if tg_op='UPDATE' and not old.legacy and old.first_available_at is null
  and new.credit_id=old.credit_id and new.legacy=old.legacy and new.duration is not distinct from old.duration
  and new.first_available_at is not null
  and new.effective_expires_at is not distinct from new.first_available_at+new.duration then return new; end if;
 raise exception 'wallet policy snapshot is immutable' using errcode='42501';
end $$;
revoke all on function public.wallet_policy_guard() from public,anon,authenticated,service_role;
create trigger wallet_policy_guard before insert or update or delete on public.wallet_credit_policy
 for each row execute function public.wallet_policy_guard();
create trigger wallet_policy_no_truncate before truncate on public.wallet_credit_policy
 for each statement execute function public.wallet_ledger_no_truncate();

create function public.wallet_owner_lock()
returns trigger language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin
 uid:=case when tg_op='UPDATE' then old.user_id else new.user_id end;
 if uid is not null then perform pg_advisory_xact_lock(hashtextextended('wallet:'||uid::text,0)); end if;
 if tg_op='UPDATE' and new.expiry_credit_id is distinct from old.expiry_credit_id then
  raise exception 'wallet expiry target is immutable' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.wallet_owner_lock() from public,anon,authenticated,service_role;
create trigger wallet_ledger_02_owner_lock before insert or update on public.wallet_ledger
 for each row execute function public.wallet_owner_lock();

create function public.wallet_journal_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.entry_type='credit' then
  if tg_op='INSERT' then
   insert into public.wallet_credit_policy(credit_id,legacy,duration,first_available_at,effective_expires_at)
   values(new.id,false,
    case when new.expires_at is null then null else greatest(interval '0',new.expires_at-coalesce(new.available_at,new.created_at)) end,
    case when new.status='available' then new.created_at end,
    case when new.status='available' then new.expires_at end);
  elsif old.status='pending' and new.status='available' then
   update public.wallet_credit_policy set first_available_at=now(),effective_expires_at=now()+duration
    where credit_id=new.id and not legacy and first_available_at is null;
  end if;
 elsif tg_op='INSERT' then perform public.wallet_journal_entry(new.id); end if;
 return new;
end $$;
revoke all on function public.wallet_journal_trigger() from public,anon,authenticated,service_role;
create trigger wallet_ledger_90_journal after insert or update of status on public.wallet_ledger
 for each row execute function public.wallet_journal_trigger();

create function public.expire_due_wallet_credits(p_user uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare c record; rem numeric; n integer:=0; previous_trust text;
begin
 if p_user is null then return 0; end if;
 perform pg_advisory_xact_lock(hashtextextended('wallet:'||p_user::text,0));
 previous_trust:=current_setting('app.trusted_order_write',true);
 perform set_config('app.trusted_order_write','true',true);
 for c in select l.id from public.wallet_ledger l join public.wallet_credit_policy p on p.credit_id=l.id
  where l.user_id=p_user and l.entry_type='credit' and l.status='available'
   and p.effective_expires_at<=now()
   and not exists(select 1 from public.wallet_ledger x where x.entry_type='expiry' and x.expiry_credit_id=l.id)
  order by p.effective_expires_at,l.created_at,l.id
 loop
  rem:=public.wallet_credit_remainder(c.id);
  if rem>0 then
   insert into public.wallet_ledger(user_id,entry_type,status,amount,source,expiry_credit_id,note)
    values(p_user,'expiry','available',rem,'admin_adjustment',c.id,'Unspent credit expired');
   n:=n+1;
  end if;
 end loop;
 perform set_config('app.trusted_order_write',coalesce(previous_trust,'false'),true);
 return n;
end $$;
revoke all on function public.expire_due_wallet_credits(uuid) from public,anon,authenticated;
grant execute on function public.expire_due_wallet_credits(uuid) to service_role;

create or replace function public.wallet_balance_of(p_user uuid)
returns table(available numeric,pending numeric,total_earned numeric,next_available_at timestamptz)
language plpgsql volatile security definer set search_path=public as $$
begin
 perform public.expire_due_wallet_credits(p_user);
 return query select
  coalesce(sum(case when entry_type='credit' then amount else -amount end) filter(where status='available'),0)::numeric(10,2),
  coalesce(sum(amount) filter(where entry_type='credit' and status='pending'),0)::numeric(10,2),
  coalesce(sum(amount) filter(where entry_type='credit' and status in('pending','available') and source='referral_reward'),0)::numeric(10,2),
  min(available_at) filter(where entry_type='credit' and status='pending')
 from public.wallet_ledger where user_id=p_user;
end $$;
revoke all on function public.wallet_balance_of(uuid) from public,anon,authenticated;
grant execute on function public.wallet_balance_of(uuid) to service_role;

create or replace function public.wallet_ledger_no_overdraw()
returns trigger language plpgsql security definer set search_path=public as $$
declare bal numeric; c public.wallet_ledger%rowtype; rem numeric;
begin
 if new.user_id is null or new.status<>'available' or new.entry_type='credit' then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('wallet:'||new.user_id::text,0));
 if new.entry_type='expiry' then
  select * into c from public.wallet_ledger where id=new.expiry_credit_id;
  rem:=public.wallet_credit_remainder(c.id);
  if c.user_id is distinct from new.user_id or c.status<>'available' or c.entry_type<>'credit'
   or rem is null or new.amount<>rem or not exists(select 1 from public.wallet_credit_policy p where p.credit_id=c.id and p.effective_expires_at<=now()) then
   raise exception 'invalid expiry remainder' using errcode='23514';
  end if;
 else
  perform public.expire_due_wallet_credits(new.user_id);
  if new.entry_type='reversal' then
   select * into c from public.wallet_ledger where id=new.reverses_id;
   if c.user_id is distinct from new.user_id or c.entry_type<>'credit' or c.status<>'available'
    or c.amount<new.amount
    or (not public.wallet_provider_clawback_allowed(new.user_id,new.order_id,new.reverses_id,new.source)
       and coalesce(public.wallet_credit_remainder(c.id),0)<new.amount) then
    raise exception 'wallet reversal would overdraw original credit remainder' using errcode='23514';
   end if;
  end if;
 end if;
 select coalesce(sum(case when entry_type='credit' then amount else -amount end),0) into bal
 from public.wallet_ledger where user_id=new.user_id and status='available';
 if bal<new.amount then raise exception 'wallet_ledger: a % of % would overdraw the wallet (available %)',new.entry_type,new.amount,bal using errcode='23514'; end if;
 return new;
end $$;

-- No expiry remains NULL at the DB boundary. Raw zero is rejected by unchanged
-- referral_limits_checks K4; the admin client normalizes blank/0 to NULL.
-- Prelock every wallet owner touched by a payment, in the same order for capture/refund.
create function public.wallet_lock_order_parties(p_order text)
returns void language plpgsql security definer set search_path=public as $$
declare u uuid;
begin
 for u in select uid from (
  select user_id uid from public.orders where id=p_order
  union select r.referrer_id from public.referrals r join public.orders o on o.user_id=r.referred_id where o.id=p_order
  union select user_id from public.wallet_ledger where order_id=p_order and entry_type='credit' and source='referral_reward'
 ) parties where uid is not null order by uid
 loop perform pg_advisory_xact_lock(hashtextextended('wallet:'||u::text,0)); end loop;
end $$;
revoke all on function public.wallet_lock_order_parties(text) from public,anon,authenticated,service_role;

create or replace function public.release_due_wallet_credits(p_user uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  n integer;
  v_owner uuid;
begin
  for v_owner in select distinct user_id from public.wallet_ledger
   where user_id is not null and entry_type='credit' and status='pending'
    and (p_user is null or user_id=p_user) order by user_id
  loop perform pg_advisory_xact_lock(hashtextextended('wallet:'||v_owner::text,0)); end loop;
  -- Called from get_my_wallet() under the student's role: tell the
  -- block_client_writes backstop this write is ours (transaction-local).
  perform set_config('app.trusted_order_write', 'true', true);

  -- Anti-farming: a credit whose referrer and friend have logged in from the same IP address is
  -- HELD for an admin (never granted automatically, never denied automatically: classmates on the
  -- same Wi-Fi or mobile network share an IP too). One flag per friend order; once an admin resolves
  -- it (admin_resolve_order_flag) the credit releases, or they reject the referral (admin_reject_referral).
  insert into public.order_review_flags (order_id, user_id, reason, wallet_amount, referral_discount, details)
  select l.order_id, l.user_id, 'referral_shared_network', 0, 0,
         jsonb_build_object(
           'referrer_id', l.user_id, 'friend_id', o.user_id, 'credit_ledger_id', l.id, 'credit_amount', l.amount,
           'signal', 'the two accounts have logged in from the same IP address',
           'caveat', 'college / hostel Wi-Fi and mobile-carrier networks share one IP between many people, so this can be two genuine classmates',
           'recommended_action',
             'Decide whether these are two accounts of the same person. If they are NOT, resolve this flag and the credit releases on the next run. If they ARE, reject the referral (admin_reject_referral) - that cancels the credit.')
    from public.wallet_ledger l
    join public.orders o on o.id = l.order_id
   where l.entry_type = 'credit' and l.source = 'referral_reward' and l.status = 'pending'
     and l.available_at <= now() and l.user_id is not null and o.user_id is not null
     and (p_user is null or l.user_id = p_user)
     and public.accounts_share_network(l.user_id, o.user_id)
  on conflict (order_id, reason) where order_id is not null do nothing;

  with due as (
    update public.wallet_ledger l
       set status = 'available'
     where l.entry_type = 'credit'
       and l.status = 'pending'
       and l.available_at <= now()
       and (p_user is null or l.user_id = p_user)
       -- a credit earned by a payment that is being disputed stays held
       and not exists (select 1 from public.purchases pu
                        where pu.order_id = l.order_id and pu.status = 'disputed')
       -- ... nor while a shared-network review is open
       and not exists (select 1 from public.order_review_flags f
                        where f.order_id = l.order_id and f.reason = 'referral_shared_network' and f.resolved_at is null)
    returning l.id, l.referral_id
  )
  select array_agg(id), count(*) into v_ids, n from due;

  update public.referrals r
     set status = 'rewarded', rewarded_at = now()
   where r.status = 'qualified'
     and exists (
       select 1 from public.wallet_ledger l
        where l.referral_id = r.id and l.source = 'referral_reward'
          and l.entry_type = 'credit' and l.status = 'available'
     );

  perform set_config('app.trusted_order_write', 'false', true);
  return coalesce(n, 0);
end;
$$;

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
  select * into v_row from public.wallet_ledger where id=p_ledger_id;
  if v_row.user_id is not null then
   perform pg_advisory_xact_lock(hashtextextended('wallet:'||v_row.user_id::text,0));
   perform public.expire_due_wallet_credits(v_row.user_id);
  end if;
  select * into v_row from public.wallet_ledger where id=p_ledger_id for update;
  if not found or v_row.entry_type <> 'credit' or v_row.status <> 'available' then
    raise exception 'Only an available credit can be reversed';
  end if;
  if v_row.user_id is null then
    raise exception 'This credit belongs to a deleted account';
  end if;
  if exists(select 1 from public.wallet_credit_policy where credit_id=v_row.id and effective_expires_at<=now()) then
    raise exception 'This credit has already expired';
  end if;
  if exists (select 1 from public.wallet_ledger where entry_type = 'reversal' and reverses_id = v_row.id) then
    raise exception 'This credit was already reversed';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_row.user_id::text, 0));
  select public.wallet_credit_remainder(v_row.id) into v_avail;
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
  perform public.wallet_lock_order_parties((select id from public.orders where razorpay_payment_id = p_razorpay_payment_id));
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

  elsif exists(select 1 from public.order_review_flags where order_id=v_order.id
      and reason='referral_credit_unrecovered') then
    v_status := jsonb_build_object('status','already_reversed','ledger_id',v_credit.id);

  elsif v_credit.user_id is null then
    v_status := jsonb_build_object('status', 'referrer_gone', 'ledger_id', v_credit.id);

  elsif exists(select 1 from public.wallet_credit_policy where credit_id=v_credit.id and effective_expires_at<=now()) then
    v_status := jsonb_build_object('status', 'credit_expired', 'ledger_id', v_credit.id);

  else
    -- Released ('available'): reverse it with a ledger row, but never by more
    -- than the referrer still has (the ledger refuses to overdraw). What cannot
    -- be recovered is flagged for a manual decision.
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_credit.user_id::text, 0));
    perform public.expire_due_wallet_credits(v_credit.user_id);
    select public.wallet_provider_recovery_limit(v_credit.id) into v_avail;
    v_reversed := least(v_credit.amount, coalesce(v_avail, 0));
    if v_reversed > 0 then
      perform set_config('app.trusted_order_write', 'true', true);
      insert into public.wallet_ledger (user_id, entry_type, status, amount, source, reverses_id, referral_id, order_id, note)
      values (v_credit.user_id, 'reversal', 'available', v_reversed, 'order_refund', v_credit.id, v_credit.referral_id, v_order.id,
              'Friend''s payment was reversed')
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

create or replace function public.reverse_play_payment(p_purchase_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_order public.orders%rowtype;
  v_credit public.wallet_ledger%rowtype;
  v_restored numeric(10, 2) := 0;
  v_revoked integer := 0;
  v_avail numeric(10, 2);
  v_reversed numeric(10, 2);
  v_status jsonb;
begin
  perform public.wallet_lock_order_parties((select id from public.orders where purchase_token = p_purchase_token and provider = 'play'));
  -- Same lock order as settle_play_purchase (wallet lock, THEN the order row)
  -- so a refund cannot deadlock with a replayed capture event.
  select user_id into v_uid from public.orders where purchase_token = p_purchase_token and provider = 'play';
  if v_uid is not null then
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_uid::text, 0));
  end if;

  select * into v_order from public.orders where purchase_token = p_purchase_token and provider = 'play' for update;
  if not found then return jsonb_build_object('status', 'unknown_payment'); end if;

  -- ---- Take the access back ----------------------------------------------
  update public.orders set status = 'refunded', updated_at = now()
   where id = v_order.id and status = 'paid';

  update public.purchases set status = 'refunded'
   where order_id = v_order.id and status not in ('refunded', 'chargeback');
  get diagnostics v_revoked = row_count;

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

  elsif exists(select 1 from public.order_review_flags where order_id=v_order.id
      and reason='referral_credit_unrecovered') then
    v_status := jsonb_build_object('status','already_reversed','ledger_id',v_credit.id);

  elsif v_credit.user_id is null then
    v_status := jsonb_build_object('status', 'referrer_gone', 'ledger_id', v_credit.id);

  elsif exists(select 1 from public.wallet_credit_policy where credit_id=v_credit.id and effective_expires_at<=now()) then
    v_status := jsonb_build_object('status', 'credit_expired', 'ledger_id', v_credit.id);

  else
    -- Released ('available'): reverse it with a ledger row, but never by more
    -- than the referrer still has (the ledger refuses to overdraw). What cannot
    -- be recovered is flagged for a manual decision.
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || v_credit.user_id::text, 0));
    perform public.expire_due_wallet_credits(v_credit.user_id);
    select public.wallet_provider_recovery_limit(v_credit.id) into v_avail;
    v_reversed := least(v_credit.amount, coalesce(v_avail, 0));
    if v_reversed > 0 then
      perform set_config('app.trusted_order_write', 'true', true);
      insert into public.wallet_ledger (user_id, entry_type, status, amount, source, reverses_id, referral_id, order_id, note)
      values (v_credit.user_id, 'reversal', 'available', v_reversed, 'order_refund', v_credit.id, v_credit.referral_id, v_order.id,
              'Friend''s payment was reversed')
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
                'order_id', v_order.id,
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

create or replace function public.admin_reject_referral(p_referral_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit public.wallet_ledger%rowtype;
  v_cancelled boolean := false;
  v_owner uuid;
begin
  if not public.am_i_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select referrer_id into v_owner from public.referrals where id=p_referral_id;
  if v_owner is not null then perform pg_advisory_xact_lock(hashtextextended('wallet:'||v_owner::text,0)); end if;
  update public.referrals
     set status = 'rejected', reject_reason = left(coalesce(nullif(trim(p_reason), ''), 'rejected by admin'), 500)
   where id = p_referral_id and status <> 'rejected';
  if not found then
    raise exception 'Referral not found or already rejected';
  end if;
  select * into v_credit from public.wallet_ledger
   where referral_id = p_referral_id and entry_type = 'credit' and source = 'referral_reward' for update;
  if found and v_credit.status = 'pending' then
    perform set_config('app.trusted_order_write', 'true', true);
    update public.wallet_ledger set status = 'cancelled' where id = v_credit.id;
    perform set_config('app.trusted_order_write', 'false', true);
    v_cancelled := true;
  end if;
  return jsonb_build_object('credit_cancelled', v_cancelled,
                            'credit_already_released', found and v_credit.status = 'available');
end;
$$;

create or replace function public.settle_razorpay_payment(
  p_event_id text,p_razorpay_order_id text,p_razorpay_payment_id text,
  p_amount_paise bigint,p_paid_at timestamptz default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_capture public.payment_captures%rowtype;
  v_reason text; v_reversal boolean; v_error text; v_uid uuid; v_chargeback boolean;
begin
  perform public.wallet_lock_order_parties((select id from public.orders where razorpay_order_id=p_razorpay_order_id));
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

create or replace function public.settle_play_purchase(
  p_user_id uuid,p_order_id text,p_product_id text,p_play_sku text,p_purchase_token text,p_paid_at timestamptz
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_product public.products%rowtype;
  v_other_order text; v_owned_purchase text;
  v_ref public.referrals%rowtype; v_set public.referral_settings%rowtype;
begin
  perform public.wallet_lock_order_parties((select id from public.orders where id=p_order_id));
  if p_purchase_token is null or length(p_purchase_token)<10 or length(p_purchase_token)>4096
     or p_paid_at is null then raise exception 'Invalid Play settlement inputs'; end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user_id::text,0));
  select * into v_order from public.orders where id=p_order_id for update;
  if not found or v_order.user_id is distinct from p_user_id or v_order.product_id is distinct from p_product_id
     or v_order.provider<>'play' or v_order.play_sku is distinct from p_play_sku
     or v_order.external_transaction_token is not null or v_order.external_choice_bound_order_id is not null then
    raise exception 'Play order ownership or product mismatch';
  end if;
  if v_order.status='paid' then
    if v_order.purchase_token=p_purchase_token then
      return jsonb_build_object('ok',true,'already_settled',true,'amount',v_order.amount,
        'duplicate',exists(select 1 from public.purchases
          where order_id=v_order.id and status='duplicate'));
    end if;
    raise exception 'Play order already paid with different token';
  end if;
  -- A pending Play purchase can complete after the local checkout timer; once
  -- Google binds its token to this order, charging the user must still unlock it.
  if v_order.status not in ('created','cancelled') then
    raise exception 'Play order unavailable';
  end if;
  select order_id into v_other_order from public.payments where purchase_token=p_purchase_token;
  if found and v_other_order<>p_order_id then raise exception 'Play token already used for another order'; end if;
  select * into v_product from public.products where id=v_order.product_id;
  if not found then raise exception 'Play product unavailable'; end if;
  if not exists(select 1 from public.play_price_tiers where play_sku=v_order.play_sku and price_inr=v_order.amount)
     or v_order.list_price is distinct from v_order.amount or v_order.wallet_amount<>0
     or v_order.referral_discount<>0 then raise exception 'Play order price mismatch'; end if;

  insert into public.payments(order_id,user_id,product_id,amount,provider,purchase_token,play_sku,status,verified_at)
  values(v_order.id,v_order.user_id,v_order.product_id,v_order.amount,'play',p_purchase_token,v_order.play_sku,'success',now());
  select id into v_owned_purchase from public.purchases
   where user_id=v_order.user_id and product_id=v_product.id and status='success' and order_id is distinct from v_order.id limit 1;
  insert into public.purchases(user_id,order_id,product_id,product_title,scope,chapter_id,subject_id,year_id,
    year_ids,course_id,amount,status)
  values(v_order.user_id,v_order.id,v_product.id,coalesce(v_product.title,'Your content'),v_product.scope,
    v_product.chapter_id,v_product.subject_id,v_product.year_id,v_product.year_ids,v_product.course_id,
    v_order.amount,case when v_owned_purchase is null then 'success' else 'duplicate' end);
  update public.orders set status='paid',purchase_token=p_purchase_token,play_consumption_status='pending',
    payment_completed_at=p_paid_at,updated_at=now() where id=v_order.id;
  if v_owned_purchase is null then perform public.record_purchase_identity(v_order.user_id); end if;

  -- Mirror the referral section of settle_razorpay_payment exactly: a duplicate
  -- paid product is not a first purchase and never earns another credit.
  select * into v_ref from public.referrals where referred_id=v_order.user_id for update;
  if found and v_ref.first_order_id is null and v_ref.status in ('pending','qualified')
     and v_owned_purchase is null
     and not exists(select 1 from public.purchases where user_id=v_order.user_id
                    and order_id<>v_order.id and status='success') then
    select * into v_set from public.referral_settings where id=true;
    if v_set.require_verified_phone
       and not (coalesce((select mobile_verified from public.profiles where id=v_order.user_id),false)
            and coalesce((select mobile_verified from public.profiles where id=v_ref.referrer_id),false)) then
      update public.referrals set first_order_id=v_order.id,status='rejected',
        reject_reason='phone_not_verified_at_purchase' where id=v_ref.id;
      v_ref.status:='rejected';
    elsif public.has_prior_purchase_identity(v_order.user_id) then
      update public.referrals set first_order_id=v_order.id,status='rejected',
        reject_reason='returning_customer' where id=v_ref.id;
      v_ref.status:='rejected';
    else
      update public.referrals set first_order_id=v_order.id,status='qualified',
        qualified_at=coalesce(qualified_at,now()) where id=v_ref.id;
    end if;
    if v_ref.status<>'rejected' and v_set.enabled and v_set.referrer_credit_amount>0
       and exists(select 1 from public.profiles where id=v_ref.referrer_id and not blocked) then
      insert into public.wallet_ledger(user_id,entry_type,status,amount,source,referral_id,order_id,
        available_at,expires_at,note)
      values(v_ref.referrer_id,'credit','pending',v_set.referrer_credit_amount::numeric(10,2),
        'referral_reward',v_ref.id,v_order.id,
        now()+make_interval(days=>v_set.credit_hold_days),
        case when v_set.credit_expiry_days is null then null
          else now()+make_interval(days=>v_set.credit_hold_days+v_set.credit_expiry_days) end,
        'Friend''s first purchase')
      on conflict (referral_id) where entry_type='credit' and source='referral_reward' do nothing;
    end if;
  end if;
  return jsonb_build_object('ok',true,'already_settled',false,'amount',v_order.amount,
    'duplicate',v_owned_purchase is not null);
end; $$;

create or replace function public.reverse_refunded_capture(p_payment_id text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare c public.payment_captures%rowtype; o public.orders%rowtype; v_uid uuid; v_chargeback boolean;
begin
  perform public.wallet_lock_order_parties((select id from public.orders where razorpay_order_id=(select razorpay_order_id from public.payment_captures where payment_id=p_payment_id)));
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

create or replace function public.get_my_referral_list()
returns table (
  id uuid,
  friend_name text,
  joined_at timestamptz,
  status text,
  amount numeric,
  available_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id,
    case
      when nullif(trim(coalesce(p.name, '')), '') is null then 'A friend'
      else initcap(split_part(trim(p.name), ' ', 1))
           || case when array_length(regexp_split_to_array(trim(p.name), '\s+'), 1) > 1
                   then ' ' || upper(left((regexp_split_to_array(trim(p.name), '\s+'))
                                          [array_length(regexp_split_to_array(trim(p.name), '\s+'), 1)], 1)) || '.'
                   else '' end
    end as friend_name,
    r.created_at as joined_at,
    case
      when r.status = 'rejected' or l.status = 'cancelled' or rev.id is not null then 'cancelled'
      when l.id is null then 'joined'
      when l.status = 'available' then 'credited'
      else 'purchased_pending'
    end as status,
    l.amount,
    case when l.status = 'pending' then l.available_at end as available_at
  from public.referrals r
  left join public.profiles p on p.id = r.referred_id
  left join public.wallet_ledger l
         on l.referral_id = r.id and l.source = 'referral_reward' and l.entry_type = 'credit'
  left join public.wallet_ledger rev
         on rev.reverses_id = l.id and rev.entry_type = 'reversal'
  where r.referrer_id = auth.uid()
  order by r.created_at desc;
$$;

-- Account deletion follows the same owner-before-ledger-row lock order.
create or replace function public.erase_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counts jsonb := '{}'::jsonb;
  n bigint;
  v_owner uuid;
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;

  -- Admin accounts are referenced by admins.id (no cascade); refuse.
  if exists (select 1 from public.admins where id = p_user_id) then
    return jsonb_build_object('status', 'admin_blocked');
  end if;

  -- Lock owners before FK anonymization acquires ledger rows. This also covers
  -- credits owned by the other participant whose referral FK will be cleared.
  for v_owner in select uid from (
   select p_user_id uid
   union select referrer_id from public.referrals where referrer_id=p_user_id or referred_id=p_user_id
   union select l.user_id from public.wallet_ledger l join public.referrals r on r.id=l.referral_id
    where r.referrer_id=p_user_id or r.referred_id=p_user_id
  ) owners where uid is not null order by uid
  loop perform pg_advisory_xact_lock(hashtextextended('wallet:'||v_owner::text,0)); end loop;

  delete from public.analytics_events where user_id = p_user_id;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('analytics_events', n);
  delete from public.quiz_scores where user_id = p_user_id;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('quiz_scores', n);
  delete from public.push_tokens where user_id = p_user_id;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('push_tokens', n);
  delete from public.payment_sessions where user_id = p_user_id;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('payment_sessions', n);
  delete from public.purchases where user_id = p_user_id;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('purchases', n);
  delete from public.referrals where referrer_id = p_user_id or referred_id = p_user_id;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('referrals', n);

  -- Retained for tax/accounting: anonymise instead of delete.
  update public.payments set user_id = null where user_id = p_user_id;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('payments_anonymised', n);
  update public.orders set user_id = null where user_id = p_user_id;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('orders_anonymised', n);

  delete from public.profiles where id = p_user_id;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('profiles', n);

  return jsonb_build_object('status', 'erased', 'counts', v_counts);
end;
$$;

-- Compatible additional output: released clients ignore the expired total.
-- Recreate only this RPC because PostgreSQL cannot append an OUT column in place.
drop function public.get_my_wallet();
create function public.get_my_wallet()
returns table(available numeric,pending numeric,total_earned numeric,next_available_at timestamptz,expired numeric)
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'not authenticated' using errcode='42501'; end if;
 perform public.release_due_wallet_credits(auth.uid());
 -- Materialize before SELECT so its expiry aggregate uses a fresh statement snapshot.
 perform public.expire_due_wallet_credits(auth.uid());
 return query select b.available,b.pending,b.total_earned,b.next_available_at,
  (select coalesce(sum(l.amount),0) from public.wallet_ledger l where l.user_id=auth.uid() and l.entry_type='expiry')
 from public.wallet_balance_of(auth.uid()) b;
end $$;
revoke all on function public.get_my_wallet() from public,anon;
grant execute on function public.get_my_wallet() to authenticated;

-- Fixed existing grants are preserved by CREATE OR REPLACE; explicitly pin new helpers.
revoke all on function public.wallet_ledger_no_overdraw() from public,anon,authenticated,service_role;
revoke all on function public.release_due_wallet_credits(uuid) from public,anon,authenticated;
grant execute on function public.release_due_wallet_credits(uuid) to service_role;
commit;
