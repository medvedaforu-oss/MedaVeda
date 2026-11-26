-- Local remediation: review/deploy separately with the matching Admin client.
begin;

-- Constant default avoids updating every existing product or queueing catalog work.
alter table public.products add column revision integer not null default 1 check (revision > 0);
create function public.products_advance_revision()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then new.revision := 1;
  else new.revision := old.revision+1; end if;
  return new;
end $$;
revoke all on function public.products_advance_revision() from public,anon,authenticated;
create trigger products_advance_revision before insert or update on public.products
  for each row execute function public.products_advance_revision();

-- The authenticated edit boundary always matches the opened revision. Existing
-- service-role/cascade writers also bump it, invalidating already-open forms.
-- Insert/delete keep the existing Admin RLS policies; orders/purchases are untouched.
revoke update on public.products from public,anon,authenticated;
create function public.products_update(p_id text,p_revision integer,p_changes jsonb)
returns setof public.products language plpgsql security definer set search_path='' as $$
declare saved public.products; edited public.products;
begin
  if auth.uid() is null or not public.am_i_admin() then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if p_revision is null or p_revision<=0 then
    raise exception 'Conflict: product revision missing. Reload before retrying.' using errcode='40001';
  end if;
  if p_changes is null or jsonb_typeof(p_changes)<>'object' then
    raise exception 'Product changes must be an object' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_object_keys(p_changes) k where k not in (
    'title','description','scope','product_type','price','original_price','thumbnail',
    'chapter_id','subject_id','year_id','year_ids','active','course_id')) then
    raise exception 'Unsupported product field' using errcode='22023';
  end if;
  select * into saved from public.products p
    where p.id=p_id and p.revision=p_revision for update;
  if not found then
    raise exception 'Conflict: product changed or deleted. Reload before retrying.' using errcode='40001';
  end if;
  edited := jsonb_populate_record(saved,p_changes);
  return query update public.products p set title=edited.title,description=edited.description,
    scope=edited.scope,product_type=edited.product_type,price=edited.price,
    original_price=edited.original_price,thumbnail=edited.thumbnail,
    chapter_id=edited.chapter_id,subject_id=edited.subject_id,year_id=edited.year_id,
    year_ids=edited.year_ids,active=edited.active,course_id=edited.course_id
    where p.id=p_id and p.revision=p_revision returning p.*;
end $$;
revoke all on function public.products_update(text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.products_update(text,integer,jsonb) to authenticated;

-- Same read-only invoker view and Admin RLS. A published item is not necessarily
-- purchasable: exact price/currency/region/BUY option and fresh readback are required.
-- Keep its column names/types for consumers while replacing raw failure text.
create or replace view public.admin_play_billing_status with (security_invoker=true) as
select p.id as product_id,p.title,p.price,p.active as catalog_active,
  case when not p.active then 'catalog_inactive'
       when p.price=0 then 'free'
       when not public.play_notes_product_eligible(p) then 'not_billable_notes'
       when s.status='ready' and t.active and t.verified_at>now()-interval '24 hours'
         and t.price_inr=p.price and t.currency_code='INR' and t.region_code='IN'
         and t.purchase_option_id=s.purchase_option_id then 'ready'
       when s.status='ready' and not t.active then 'tier_inactive'
       when s.status='ready' then 'stale'
       else coalesce(s.status,'pending') end as billing_status,
  t.play_sku,t.purchase_option_id,t.price_inr as synced_price,t.currency_code,
  s.last_synced_at,
  case when s.last_error is null then null
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
