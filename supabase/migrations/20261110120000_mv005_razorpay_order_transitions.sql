-- Prevention only: no historical financial DML or entitlement reader changes.
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
