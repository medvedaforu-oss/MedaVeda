-- PROPOSED ONLY. Owner recovery approval and identity/drift checks REQUIRED.
-- Never execute this during the safety review. No automatic retries.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='15s';
SET LOCAL idle_in_transaction_session_timeout='15s';
DO $preconditions$
BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'approved postgres migration role required'; END IF;
 IF nullif(current_setting('medveda.phase_a_owner_approval',true),'') IS NULL THEN
   RAISE EXCEPTION 'separate owner approval reference required';
 END IF;
END $preconditions$;
-- Ledger first, then fixed table order. Bounded ACCESS EXCLUSIVE blocks reads too.
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.orders IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.purchases IN ACCESS EXCLUSIVE MODE;
DO $baseline$
BEGIN
 IF (SELECT array_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations)
    IS DISTINCT FROM ARRAY['20260701000000','20260718','20260721','20260801','20260801150000','20260919120000','20260919130000','20260920120000','20260920130000','20260920140000','20260921120000','20260921130000','20260922100000','20260923100000','20260924100000','20260924110000','20260924120000','20260924130000','20260924140000','20260924150000','20260925100000','20260925110000','20260925120000','20260925130000','20260925140000','20260926100000','20260926110000','20260926120000','20260926130000','20260927100000','20260927110000','20260927120000','20260927130000','20260928100000','20260928110000','20260929100000','20260930100000','20260930110000','20261001100000','20261012100000','20261012110000','20261012120000','20261013090000','20261013100000','20261013110000','20261014100000','20261014110000','20261015100000','20261015120000','20261016090000','20261016100000','20261018100000','20261018110000','20261018120000','20261018130000','20261019150000','20261019151000','20261020100000','20261020101000','20261020102000','20261020103000','20261020104000','20261020105000','20261020110000','20261104100000','20261104110000']::text[] THEN RAISE EXCEPTION 'migration baseline drift'; END IF;
 IF EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
 ('razorpay_entitlement_committed','guard_razorpay_order_transition','guard_purchase_success_ownership')) THEN
   RAISE EXCEPTION 'unexpected existing Phase A function; stop, no replacement approval';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname IN ('orders_03_razorpay_transition','purchases_zz_success_ownership')
 AND tgrelid IN ('public.orders'::regclass,'public.purchases'::regclass)) THEN
   RAISE EXCEPTION 'unexpected existing Phase A trigger';
 END IF;
END $baseline$;

-- Exact reviewed source SHA-256 82ae7f73d32c44b0fa627b3d1f33777ce7a2d41f0aef6c25826704ac8898dc0b
-- MV003: additive proof for the production void settlement contract.
-- Standalone on production through 20261104110000; no billing-choice/recovery
-- migrations, capture backfill, entitlement repair or financial writes required.

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


INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261110100000','mv003_razorpay_entitlement_commitment',ARRAY['-- MV003: additive proof for the production void settlement contract.
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
    where o.id=p_order_id and p_payment_id is not null and p_payment_id<>''''
      and o.provider=''razorpay'' and o.status=''paid''
      and o.razorpay_payment_id=p_payment_id
      and o.razorpay_order_id is not null and o.razorpay_order_id<>''''
      and o.user_id is not null and o.product_id is not null
      and o.amount>0 and o.course_id is not null
      and o.scope in (''chapter'',''subject'',''year'',''bundle'')
      and case o.scope
        when ''chapter'' then o.chapter_id is not null
        when ''subject'' then o.subject_id is not null
        when ''year'' then o.year_id is not null
        when ''bundle'' then coalesce(cardinality(o.year_ids),0)>0
          and array_position(o.year_ids,null) is null
        else false end
      and m.provider=''razorpay'' and m.status=''success''
      and m.razorpay_payment_id=p_payment_id and m.razorpay_order_id=o.razorpay_order_id
      and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
      and p.status=''success'' and p.user_id=o.user_id
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
          or c.status not in (''captured'',''granted'')))
      -- Even parked compensation is unresolved; no compensation state grants.
      and not exists (select 1 from public.payment_compensations c where c.payment_id=p_payment_id)
      -- On the production contract pending/parked reversal facts cannot yet be
      -- classified as partial refund or resolved dispute. Fail closed for retry.
      -- Applied refunds/disputes are reflected in the durable purchase state;
      -- blocking all applied events would reject partial refunds and disputes won.
      and not exists (select 1 from public.provider_events e
        where e.payment_id=p_payment_id and e.status in (''pending'',''parked'')
          and e.event_type in (''refund.processed'',''payment.dispute.created'',
            ''payment.dispute.under_review'',''payment.dispute.action_required'',''payment.dispute.lost''))
  );
$$;
revoke all on function public.razorpay_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.razorpay_entitlement_committed(text,text) to service_role;
commit;
']::text[]);

-- Exact reviewed source SHA-256 f266859f080e200cffad9ae17b833faa4ac9302d78ed4d641c6c750564984730
-- Prevention only: no historical financial DML or entitlement reader changes.


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



INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261110120000','mv005_razorpay_order_transitions',ARRAY['-- Prevention only: no historical financial DML or entitlement reader changes.
begin;

create or replace function public.guard_razorpay_order_transition()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if old.provider <> ''razorpay'' or new.status is not distinct from old.status then
    return new;
  end if;

  -- UPDATE holds the order row lock. A writer waiting behind settlement sees
  -- the committed paid version, including under READ COMMITTED rechecking.
  -- No role/admin bypass: privileged error handlers must obey this too.
  if (old.status = ''refunded'' and new.status <> ''refunded'')
     or (old.status = ''paid'' and new.status not in (''paid'', ''refunded''))
     or (new.status in (''created'', ''pending'', ''failed'', ''cancelled'') and exists (
       select 1 from public.payment_captures c
       where c.razorpay_order_id = old.razorpay_order_id
     )) then
    raise exception ''Razorpay order transition conflicts with captured or terminal state''
      using errcode = ''23514'';
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
']::text[]);

-- Exact reviewed source SHA-256 6c6e8704a424e1c0689dcbd3bd8c6ac5bf92ea48e76b2ff0c7cbdd6721609e4c
-- Prevention only. Preserve existing successes, legacy NULL keys and financial
-- history. Do not remove the historical partial-index exception here.


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



INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261110130000','mv006_purchase_ownership_guard',ARRAY['-- Prevention only. Preserve existing successes, legacy NULL keys and financial
-- history. Do not remove the historical partial-index exception here.
begin;

create or replace function public.guard_purchase_success_ownership()
returns trigger
language plpgsql volatile security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.status <> ''success'' then return new; end if;

  -- Metadata writes on existing ownership (including the historical duplicate)
  -- are not a new grant. Refund/reversal transitions never enter this branch.
  if tg_op = ''UPDATE'' then
    if old.status = ''success''
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
  if current_setting(''transaction_isolation'') <> ''read committed'' then
    raise exception ''Purchase ownership grant requires read committed isolation''
      using errcode = ''40001'';
  end if;

  -- Same lock namespace/order as create, settle, refund and dispute routines.
  -- This VOLATILE trigger''s SELECT takes a fresh READ COMMITTED snapshot after
  -- acquiring the lock, including when another transaction just committed.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(''wallet:'' || new.user_id::text, 0));
  if exists (
    select 1 from public.purchases p
    where p.user_id = new.user_id and p.product_id = new.product_id
      and p.status = ''success''
      and (tg_op = ''INSERT'' or p.id is distinct from old.id)
      -- Same-order insert replays cannot add a row: the unchanged unique
      -- order index enforces that even under concurrent ON CONFLICT writes.
      -- Keep this check AFTER the lock, so concurrent replays see the winner.
      and (tg_op <> ''INSERT'' or new.order_id is null
           or p.order_id is distinct from new.order_id)
  ) then
    -- No silent conversion, compensation, deletion or historical repair here.
    -- The caller''s complete transaction rolls back on a conflicting grant.
    raise exception ''Successful purchase ownership already exists''
      using errcode = ''23505'';
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
']::text[]);
COMMIT;
