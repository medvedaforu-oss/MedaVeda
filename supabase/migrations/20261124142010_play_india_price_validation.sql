-- Local candidate only. Requires 20261124064112_admin_catalog_readiness_and_revisions.
-- No backfill, product/order/purchase UPDATE, queue replay or cron changes.
begin;

-- Single India paid-price policy for the existing INR-only catalog architecture.
-- Reviewed Google public supported-locations price tables: 2022/02 and 2026/01,
-- captured 2026-11-24 in docs/audit/google-play-catalog-20261124/
-- google-public-india-price-range.json. Worker version allowlist stays unchanged.
-- Review this policy and the worker version allowlist together when Google changes
-- regions versions. Conversion HTTP 200 never establishes catalog acceptance.
-- NULL means a supported PAID price. Free products bypass this in Admin readiness
-- and never enter the paid catalog. No price is rounded or rewritten.
create or replace function public.play_price_validation(p_price numeric)
returns text language sql immutable security invoker set search_path='' as $$
  select case when p_price between 4.00 and 84000.00 and p_price=trunc(p_price,2)
    then null::text
    else 'Google Play India paid prices must be INR 4.00 to INR 84,000.00 with at most two decimal places. Choose a supported price explicitly; free products and Razorpay prices are unchanged.' end;
$$;
revoke all on function public.play_price_validation(numeric) from public,anon,authenticated;
grant execute on function public.play_price_validation(numeric) to authenticated,service_role;

-- Existing claim, retry, stale requeue, finish and create_play_order all consume
-- this eligibility helper. Historical purchases/settlement do not consume it.
create or replace function public.play_notes_product_eligible(p public.products)
returns boolean language sql stable security definer set search_path=public as $$
  select p.active and public.play_price_validation(p.price) is null and p.course_id is not null
    and ((p.scope in ('chapter','subject','year') and p.product_type='notes')
      or (p.scope='bundle' and p.product_type='notes_bundle'
        and cardinality(p.year_ids) between 2 and 3))
    and exists (
      select 1 from public.notes n join public.chapters c on c.id=n.chapter_id
        join public.subjects s on s.id=c.subject_id join public.years y on y.id=s.year_id
      where n.active and not n.is_free_preview and nullif(btrim(n.pdf_url),'') is not null
        and c.active and s.active and y.active
        and c.course_id=p.course_id and s.course_id=p.course_id and y.course_id=p.course_id
        and ((p.scope='chapter' and c.id=p.chapter_id)
          or (p.scope='subject' and c.subject_id=p.subject_id)
          or (p.scope='year' and c.year_id=p.year_id)
          or (p.scope='bundle' and c.year_id=any(p.year_ids)))
    )
    and (p.scope<>'bundle' or (
      select count(distinct c.year_id) from public.notes n
        join public.chapters c on c.id=n.chapter_id
        join public.subjects s on s.id=c.subject_id join public.years y on y.id=s.year_id
      where n.active and not n.is_free_preview and nullif(btrim(n.pdf_url),'') is not null
        and c.active and s.active and y.active
        and c.course_id=p.course_id and s.course_id=p.course_id and y.course_id=p.course_id
        and c.year_id=any(p.year_ids)
    )=cardinality(p.year_ids));
$$;
revoke all on function public.play_notes_product_eligible(public.products) from public,anon,authenticated;
grant execute on function public.play_notes_product_eligible(public.products) to service_role,authenticated;

create or replace function public.play_price_has_eligible_product(p_price numeric)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.products p where p.price=p_price
    and public.play_notes_product_eligible(p));
$$;
revoke all on function public.play_price_has_eligible_product(numeric) from public,anon,authenticated;
grant execute on function public.play_price_has_eligible_product(numeric) to service_role;

create or replace function public.queue_play_price_sync(p_price numeric)
returns void language plpgsql security definer set search_path=public as $$
declare v_sku text;
begin
  if public.play_price_validation(p_price) is not null then return; end if;
  select play_sku into v_sku from public.play_price_tiers
    where price_inr=p_price and active order by created_at desc limit 1;
  if v_sku is null then
    v_sku := 'notes_' || replace(p_price::numeric(10,2)::text, '.', '_') || '_v_' || replace(gen_random_uuid()::text, '-', '');
  end if;
  -- Product/PDF edits only ensure that a job exists. They must not revoke an
  -- active lease, bypass backoff, or retry a terminal authorization failure.
  -- Existing ready tiers are rechecked by requeue_stale_play_price_sync;
  -- failed jobs require the explicit, admin-authorized retry RPC.
  insert into public.play_price_sync(price_inr,candidate_sku)
    values(p_price,v_sku) on conflict(price_inr) do nothing;
  if found then
    insert into public.play_price_sync_logs(price_inr,play_sku,event)
      values(p_price,v_sku,'queued');
  end if;
end; $$;
revoke all on function public.queue_play_price_sync(numeric) from public,anon,authenticated;

create or replace view public.admin_play_billing_status with (security_invoker=true) as
select p.id as product_id,p.title,p.price,p.active as catalog_active,
  case when not p.active then 'catalog_inactive'
       when p.price=0 then 'free'
       when public.play_price_validation(p.price) is not null then 'unsupported_price'
       when not public.play_notes_product_eligible(p) then 'not_billable_notes'
       when s.status='ready' and t.active and t.verified_at>now()-interval '24 hours'
         and t.price_inr=p.price and t.currency_code='INR' and t.region_code='IN'
         and t.purchase_option_id=s.purchase_option_id then 'ready'
       when s.status='ready' and not t.active then 'tier_inactive'
       when s.status='ready' then 'stale'
       else coalesce(s.status,'pending') end as billing_status,
  t.play_sku,t.purchase_option_id,t.price_inr as synced_price,t.currency_code,
  s.last_synced_at,
  case when p.price>0 and public.play_price_validation(p.price) is not null then public.play_price_validation(p.price)
       when s.last_error is null then null
       when s.last_error ~* '403|permission|access denied' then
         'Google Play catalog access denied. Review package and service account permissions.'
       when s.last_error ~* '401|unauthenticated|credential|configuration' then
         'Google Play catalog authentication needs administrator review.'
       when s.last_error ~* '429|quota|rate limit' then
         'Google Play catalog request limit reached. A later recheck is required.'
       else 'Catalog verification failed. Review the server diagnostics before retrying.' end as last_error,
  s.attempts,p.revision as product_revision
from public.products p
left join public.play_price_sync s on s.price_inr=p.price
left join public.play_price_tiers t on t.play_sku=s.candidate_sku
where public.am_i_admin();
revoke all on public.admin_play_billing_status from public,anon,authenticated;
grant select on public.admin_play_billing_status to authenticated;
commit;
