-- Prevention only. Preserve existing successes, legacy NULL keys and financial
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
