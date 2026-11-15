-- Phase C: new Play grants must use the purchased order's immutable scope,
-- even if the catalog changes before receipt verification. No historical DML.
-- Requires billing_settlement_recovery and the existing order snapshot columns.
begin;
create or replace function public.play_purchase_entitlement_from_order()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare o public.orders%rowtype;
begin
  if new.order_id is null then return new; end if;
  select * into o from public.orders where id=new.order_id;
  if not found or o.provider<>'play' then return new; end if;
  if new.user_id is distinct from o.user_id or new.product_id is distinct from o.product_id
    or new.amount is distinct from o.amount or o.course_id is null
    or o.scope not in ('chapter','subject','year','bundle') or o.scope is null
    or (o.scope='chapter' and o.chapter_id is null)
    or (o.scope='subject' and o.subject_id is null)
    or (o.scope='year' and o.year_id is null)
    or (o.scope='bundle' and (coalesce(cardinality(o.year_ids),0)=0 or array_position(o.year_ids,null) is not null)) then
    raise exception 'Play purchase does not match order entitlement';
  end if;
  new.scope:=o.scope; new.chapter_id:=o.chapter_id; new.subject_id:=o.subject_id;
  new.year_id:=o.year_id; new.year_ids:=o.year_ids; new.course_id:=o.course_id;
  return new;
end $$;
revoke all on function public.play_purchase_entitlement_from_order() from public,anon,authenticated;
drop trigger if exists purchases_play_order_snapshot on public.purchases;
create trigger purchases_play_order_snapshot before insert on public.purchases
for each row execute function public.play_purchase_entitlement_from_order();

create or replace function public.play_entitlement_committed(p_order_id text,p_token text)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select exists(select 1 from public.orders o
   join public.payments m on m.order_id=o.id and m.purchase_token=p_token
   join public.purchases p on p.order_id=o.id
   where o.id=p_order_id and p_token is not null and p_token<>''
     and o.provider='play' and o.status='paid' and o.purchase_token=p_token
     and o.user_id is not null and o.product_id is not null and o.amount>0
     and o.play_sku is not null and o.course_id is not null
     and o.scope in ('chapter','subject','year','bundle')
     and case o.scope when 'chapter' then o.chapter_id is not null
       when 'subject' then o.subject_id is not null when 'year' then o.year_id is not null
       when 'bundle' then coalesce(cardinality(o.year_ids),0)>0 and array_position(o.year_ids,null) is null else false end
     and m.provider='play' and m.play_sku=o.play_sku and m.status='success'
     and m.user_id=o.user_id and m.product_id=o.product_id and m.amount=o.amount
     and p.status='success' and p.user_id=o.user_id and p.product_id=o.product_id and p.amount=o.amount
     and row(p.scope,p.chapter_id,p.subject_id,p.year_id,p.year_ids,p.course_id)
       is not distinct from row(o.scope,o.chapter_id,o.subject_id,o.year_id,o.year_ids,o.course_id));
$$;
revoke all on function public.play_entitlement_committed(text,text) from public,anon,authenticated;
grant execute on function public.play_entitlement_committed(text,text) to service_role;
commit;
